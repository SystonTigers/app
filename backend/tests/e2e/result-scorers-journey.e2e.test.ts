/**
 * Journey: staff add a past result and pick the scorers from the squad (the
 * same player for each of their goals, plus own goals). The goals count in
 * player stats and the scorers line is written for them. Editing replaces
 * them; deleting the result takes them back out. Match Centre results keep
 * their own scorers.
 */
import { describe, it, expect } from "vitest";
import { call, registerAdmin, registerMember } from "./helpers";

let n = 0;
const tap = () => `rs-${Date.now()}-${++n}`;

describe("Scorers picked on results", () => {
  it("count in player stats and follow edits and deletes", async () => {
    const coach = await registerAdmin("rs-coach", "coach");
    const parent = await registerMember("rs-parent");
    const add = async (firstName: string, lastName: string) =>
      (await call("/api/v1/admin/squad", { token: coach.token, body: { firstName, lastName } })).data.playerId as string;
    const pat = await add("Pat", "Scorer");
    const sam = await add("Sam", "Striker");

    const goals = async (id: string) => (await call("/api/v1/stats/players?season=2025-26", { token: parent.token })).data.data.find((p: any) => p.id === id)?.goals ?? 0;
    const base = { date: "2026-03-14", opponent: "Pick Rovers", ourScore: 3, theirScore: 1, competition: "League" };

    expect((await call("/api/v1/results", { token: parent.token, body: { ...base, scorerIds: [pat] } })).status).toBe(403);
    expect((await call("/api/v1/results", { token: coach.token, body: { ...base, scorerIds: [pat, pat, sam, sam] } })).status).toBe(400);
    expect((await call("/api/v1/results", { token: coach.token, body: { ...base, scorerIds: ["not-ours"] } })).status).toBe(400);

    const added = await call("/api/v1/results", { token: coach.token, body: { ...base, scorerIds: [pat, sam, pat] } });
    expect(added.status).toBe(200);
    const id = added.data.id;
    expect(await goals(pat)).toBe(2);
    expect(await goals(sam)).toBe(1);

    const listed = (await call("/api/v1/results?season=2025-26", { token: parent.token })).data.data.find((r: any) => r.id === id);
    expect(listed).toMatchObject({ scorers: "Pat Scorer 2, Sam Striker", scorersFrom: "picked", ownGoals: 0 });
    expect(listed.scorerIds.sort()).toEqual([pat, pat, sam].sort());

    // Edit: one for Sam and an own goal
    expect((await call(`/api/v1/results/${id}`, { method: "PUT", token: coach.token, body: { scorerIds: [sam], ownGoals: 1 } })).status).toBe(200);
    expect(await goals(pat)).toBe(0);
    expect(await goals(sam)).toBe(1);
    const edited = (await call("/api/v1/results?season=2025-26", { token: parent.token })).data.data.find((r: any) => r.id === id);
    expect(edited).toMatchObject({ scorers: "Sam Striker, OG", ownGoals: 1, scorerIds: [sam] });

    // Typed text still saves but counts for nothing
    const typed = await call("/api/v1/results", { token: coach.token, body: { ...base, date: "2026-03-21", scorers: "Pat 3" } });
    expect((await call("/api/v1/results?season=2025-26", { token: parent.token })).data.data.find((r: any) => r.id === typed.data.id)).toMatchObject({ scorersFrom: "typed" });
    expect(await goals(pat)).toBe(0);

    // Delete takes the goals out
    expect((await call(`/api/v1/results/${id}`, { method: "DELETE", token: coach.token })).status).toBe(200);
    expect(await goals(sam)).toBe(0);

    // A Match Centre result keeps its scorers
    const fixtureId = (await call("/api/v1/admin/fixtures", {
      token: coach.token, body: { opponent: "Live Lane", date: "2026-04-04", time: "10:00", venue: "Home", competition: "League", homeAway: "home" },
    })).data.id as string;
    const post = (body: Record<string, unknown>) => call(`/api/v1/fixtures/${fixtureId}/live/events`, { token: coach.token, body: { clientEventId: tap(), ...body } });
    await post({ type: "kick_off" });
    await post({ type: "goal", playerId: pat });
    await post({ type: "full_time" });
    const live = (await call("/api/v1/results?season=2025-26", { token: parent.token })).data.data.find((r: any) => r.fixtureId === fixtureId);
    expect(live.scorersFrom).toBe("match_centre");
    expect((await call(`/api/v1/results/${live.id}`, { method: "PUT", token: coach.token, body: { scorerIds: [sam] } })).status).toBe(409);
    expect(await goals(pat)).toBe(1);
  });
});
