/**
 * Journey: the manager fills in a match report on the website with the
 * starting line-up, a substitution, goals and a red card. The result, league
 * points and player stats (appearances for starters and the sub) all update.
 */
import { describe, it, expect } from "vitest";
import { call, registerAdmin, registerMember } from "./helpers";

describe("Match report journey", () => {
  it("saves a report with subs and counts appearances and cards", async () => {
    const coach = await registerAdmin("report-coach");
    const parent = await registerMember("report-parent");
    const add = async (name: string) => (await call("/api/v1/admin/squad", { token: coach.token, body: { name } })).data.playerId as string;
    const [a, b, c] = [await add("Rep Alpha"), await add("Rep Bravo"), await add("Rep Charlie")];
    const fixtureId = (await call("/api/v1/admin/fixtures", {
      token: coach.token,
      body: { opponent: "Report Rovers", date: "2026-09-20", time: "10:30", venue: "Home", homeAway: "home" },
    })).data.id as string;

    const save = (body: unknown, token = coach.token) => call(`/api/v1/matches/${fixtureId}/report`, { token, body });
    const events = [
      { playerId: a, eventType: "goal", minute: 12 },
      { playerId: a, eventType: "goal", minute: 40 },
      { playerId: b, eventType: "red_card", minute: 60 },
      { playerId: b, eventType: "sub_off", minute: 55, relatedPlayerId: c },
      { playerId: c, eventType: "sub_on", minute: 55, relatedPlayerId: b },
    ];
    expect((await save({ homeScore: 2, awayScore: 1, events }, parent.token)).status).toBe(403);
    expect((await save({ homeScore: null, awayScore: 1, events })).status).toBe(400);
    expect((await save({ homeScore: 2, awayScore: 1, events: [{ playerId: "someone-else", eventType: "goal" }] })).status).toBe(400);

    const ok = await save({ homeScore: 2, awayScore: 1, events, lineup: { starters: [a, b], subs: [c] } });
    expect(ok.status).toBe(200);

    const results = (await call("/api/v1/results?season=all", { token: parent.token })).data.data as any[];
    expect(results.find((r) => r.opponent === "Report Rovers")).toMatchObject({ homeScore: 2, awayScore: 1, result: "win", scorers: "Rep Alpha 2" });

    const stats = (await call("/api/v1/stats/players", { token: parent.token })).data.data as any[];
    const of = (id: string) => stats.find((p) => p.id === id);
    expect(of(a)).toMatchObject({ goals: 2, appearances: 1 });
    expect(of(b)).toMatchObject({ redCards: 1, appearances: 1 });
    expect(of(c)).toMatchObject({ appearances: 1 });

    // Saving again replaces (no double counting)
    await save({ homeScore: 2, awayScore: 1, events, lineup: { starters: [a, b], subs: [c] } });
    const again = (await call("/api/v1/stats/players", { token: parent.token })).data.data as any[];
    expect(again.find((p) => p.id === a)).toMatchObject({ goals: 2, appearances: 1 });
  });
});
