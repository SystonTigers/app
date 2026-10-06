/**
 * Journey: staff run Last Man Standing from the app (Manager zone → Last
 * Man Standing). A round needs every score before it's processed (a missing
 * one would knock out everyone who picked it), and processing twice, or at
 * the same time, only counts once.
 */
import { describe, it, expect } from "vitest";
import { call, registerAdmin, registerMember } from "./helpers";

describe("Last Man Standing admin", () => {
  it("makes a game and a round and processes it once", async () => {
    const coach = await registerAdmin("lms-coach", "coach");
    const parent = await registerMember("lms-parent");

    expect((await call("/api/v1/lms/games", { token: parent.token, body: { name: "Nope" } })).status).toBe(403);
    const game = await call("/api/v1/lms/games", { token: coach.token, body: { name: "Test LMS", sport: "football" } });
    expect(game.status, JSON.stringify(game.data)).toBe(201);
    const gameId = game.data.game.id as string;

    expect((await call(`/api/v1/lms/games/${gameId}/join`, { token: parent.token, body: {} })).status).toBeLessThan(300);
    const round = await call("/api/v1/lms/rounds", { token: coach.token, body: { game_id: gameId, deadline: Date.now() + 3_600_000, fixtures: [{ home: "Reds", away: "Blues" }, { home: "Greens", away: "Whites" }] } });
    expect(round.status, JSON.stringify(round.data)).toBeLessThan(300);
    const detail = await call(`/api/v1/lms/games/${gameId}`, { token: coach.token });
    const r = detail.data.currentRound;
    expect(r.fixtures).toHaveLength(2);

    expect((await call("/api/v1/lms/predictions", { token: parent.token, body: { round_id: r.id, team_picked: "Reds", fixture_id: r.fixtures[0].id } })).status).toBeLessThan(300);

    const half = await call(`/api/v1/lms/rounds/${r.id}/process`, { token: coach.token, body: { fixtures: [{ id: r.fixtures[0].id, homeScore: 2, awayScore: 0 }] } });
    expect(half.status).toBe(400);
    expect(JSON.stringify(half.data), "half").toContain("Greens v Whites");

    const results = { fixtures: [{ id: r.fixtures[0].id, homeScore: 2, awayScore: 0 }, { id: r.fixtures[1].id, homeScore: 1, awayScore: 1 }] };
    const [a, b] = await Promise.all([
      call(`/api/v1/lms/rounds/${r.id}/process`, { token: coach.token, body: results }),
      call(`/api/v1/lms/rounds/${r.id}/process`, { token: coach.token, body: results }),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 400]);

    const after = await call(`/api/v1/lms/games/${gameId}`, { token: coach.token });
    const entry = after.data.standings[0];
    expect(entry.streak).toBe(1);
    expect(entry.status === "alive" || entry.status === "winner").toBe(true);
  });
});
