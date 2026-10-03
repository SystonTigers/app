/**
 * Journey: in Match Centre a player's second yellow sends them off (posted as
 * SECOND YELLOW, and they can't take part after), a sin bin runs for a tenth
 * of the match and can't be doubled up, and at full time the stats count the
 * cards, the sin bin and everyone's minutes from the line-up and subs.
 */
import { describe, it, expect } from "vitest";
import { call, registerAdmin } from "./helpers";

let n = 0;
const tap = () => `disc-${Date.now()}-${++n}`;

describe("Match Centre discipline and minutes", () => {
  it("second yellows, sin bins and minutes played", async () => {
    const coach = await registerAdmin("disc-coach", "coach");
    const add = async (firstName: string) => (await call("/api/v1/admin/squad", { token: coach.token, body: { firstName, lastName: "Disc" } })).data.playerId as string;
    const players = await Promise.all(["Ava", "Bo", "Cal", "Dee", "Eli", "Fin", "Gus", "Hal"].map(add));
    const [ava, bo, , , , , , hal] = players;
    const fixtureId = (await call("/api/v1/admin/fixtures", {
      token: coach.token, body: { opponent: "Card City", date: "2026-09-26", time: "10:00", venue: "Home", competition: "Friendly", homeAway: "home" },
    })).data.id as string;
    expect((await call(`/api/v1/fixtures/${fixtureId}/lineup`, { method: "PUT", token: coach.token, body: { teamSize: 7, starters: players.slice(0, 7), subs: [hal] } })).status).toBe(200);

    const t0 = Date.now() - 12 * 60_000;
    const post = (body: Record<string, unknown>, secs: number) =>
      call(`/api/v1/fixtures/${fixtureId}/live/events`, { token: coach.token, body: { clientEventId: tap(), occurredAt: t0 + secs * 1000, ...body } });
    await post({ type: "kick_off", halfLength: 25 }, 0);

    expect((await post({ type: "sin_bin" }, 30)).status).toBe(400);
    const bin = await post({ type: "sin_bin", playerId: bo }, 60);
    expect(bin.status).toBe(201);
    expect(bin.data.data.events[0]).toMatchObject({ type: "sin_bin", text: "5" });
    expect((await post({ type: "sin_bin", playerId: bo }, 90)).status).toBe(409);

    await post({ type: "yellow", playerId: ava }, 120);
    const second = await post({ type: "yellow", playerId: ava }, 180);
    expect(second.status).toBe(201);
    expect(second.data.data.newPost.graphic.headline).toBe("SECOND YELLOW");
    const after = await post({ type: "goal", playerId: ava }, 200);
    expect(after.status).toBe(409);
    expect(after.data.error.message).toMatch(/sent off/);

    await post({ type: "sub", playerId: hal, player2Id: bo, minute: 10 }, 540);
    await post({ type: "full_time" }, 600);

    const stats = (await call("/api/v1/stats/players", { token: coach.token })).data.data;
    const line = (id: string) => stats.find((p: any) => p.id === id);
    expect(line(ava)).toMatchObject({ yellowCards: 2, redCards: 1 });
    expect(line(bo)).toMatchObject({ sinBins: 1 });
    // Full time came in the 11th minute: Ava went off in the 4th, Bo in the 10th, Hal had the last minute
    expect(line(ava).minutes).toBe(4);
    expect(line(bo).minutes).toBe(10);
    expect(line(hal).minutes).toBe(1);
    expect(line(players[2]).minutes).toBe(11);
  });
});
