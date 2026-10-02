/**
 * Journey: the manager adds results from past seasons, fixes a score, and
 * everyone can look back season by season (results and player stats).
 * Families can look but not change anything.
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { call, registerAdmin, registerMember } from "./helpers";

describe("Results and seasons journey", () => {
  it("adds past results and filters by season", async () => {
    const coach = await registerAdmin("results-coach");
    const parent = await registerMember("results-parent");
    const add = (body: Record<string, unknown>, token = coach.token) => call("/api/v1/results", { token, body });

    // Families can't add results, and bad ones are refused with a reason
    expect((await add({ date: "2024-03-02", opponent: "Old Rivals", ourScore: 2, theirScore: 1 }, parent.token)).status).toBe(403);
    expect((await add({ date: "02/03/2024", opponent: "Old Rivals", ourScore: 2, theirScore: 1 })).data.error.message).toMatch(/YYYY-MM-DD/);
    expect((await add({ date: "2024-03-02", opponent: "", ourScore: 2, theirScore: 1 })).status).toBe(400);
    expect((await add({ date: "2024-03-02", opponent: "Old Rivals", ourScore: -1, theirScore: 1 })).status).toBe(400);
    expect((await add({ date: "2099-01-01", opponent: "Old Rivals", ourScore: 1, theirScore: 1 })).data.error.message).toMatch(/future/);

    // Two seasons ago (2023/24) and last season (2024/25)
    const a = await add({ date: "2024-03-02", opponent: "Seasons Old Rivals", ourScore: 2, theirScore: 1, competition: "cup", scorers: "Sam Striker 2" });
    expect(a.status).toBe(200);
    expect(a.data.data).toMatchObject({ result: "win", points: 3 });
    const b = await add({ date: "2024-10-12", opponent: "Seasons Newer FC", ourScore: 0, theirScore: 0 });
    expect(b.data.data).toMatchObject({ result: "draw", points: 1 });
    // The same match twice is refused
    expect((await add({ date: "2024-03-02", opponent: "seasons old rivals", ourScore: 1, theirScore: 0 })).status).toBe(409);

    // Seasons to look back at include both football years
    const seasons = (await call("/api/v1/results/seasons", { token: parent.token })).data.data as any[];
    const ids = seasons.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(["2023-24", "2024-25"]));
    expect(seasons.find((s) => s.id === "2023-24")).toMatchObject({ label: "2023/24", from: "2023-08-01", to: "2024-07-31" });
    expect(seasons.filter((s) => s.current)).toHaveLength(1);

    const inSeason = async (season: string) => ((await call(`/api/v1/results?season=${season}`, { token: parent.token })).data.data as any[])
      .filter((r) => String(r.opponent).startsWith("Seasons ")).map((r) => r.opponent);
    expect(await inSeason("2023-24")).toEqual(["Seasons Old Rivals"]);
    expect(await inSeason("2024-25")).toEqual(["Seasons Newer FC"]);
    expect(await inSeason("all")).toEqual(["Seasons Newer FC", "Seasons Old Rivals"]);

    // Fix a score: the result and points follow
    const id = (await call("/api/v1/results?season=2024-25", { token: coach.token })).data.data.find((r: any) => r.opponent === "Seasons Newer FC").id;
    expect((await call(`/api/v1/results/${id}`, { method: "PUT", token: parent.token, body: { ourScore: 3 } })).status).toBe(403);
    expect((await call(`/api/v1/results/${id}`, { method: "PUT", token: coach.token, body: { ourScore: 3, theirScore: 1 } })).status).toBe(200);
    const row = await env.DB.prepare(`SELECT our_score, their_score, result, points, source FROM team_results WHERE id = ?`).bind(id).first<any>();
    expect(row).toEqual({ our_score: 3, their_score: 1, result: "win", points: 3, source: "manual" });
    expect((await call(`/api/v1/results/999999`, { method: "PUT", token: coach.token, body: { ourScore: 1 } })).status).toBe(404);

    // Player stats by season: a goal in a 2023/24 match only counts that season
    const player = (await call("/api/v1/admin/squad", { token: coach.token, body: { name: "Seasons Scorer", squadNumber: 77 } })).data.playerId as string;
    const oldId = (await call("/api/v1/results?season=2023-24", { token: coach.token })).data.data.find((r: any) => r.opponent === "Seasons Old Rivals").id;
    await env.DB.prepare(`INSERT INTO match_events (id, tenant_id, fixture_id, player_id, event_type, minute, created_at) VALUES ('seasons-goal-1', 'syston', ?, ?, 'goal', 10, ?)`)
      .bind(String(oldId), player, Date.now()).run();
    const goals = async (season: string) => ((await call(`/api/v1/stats/players${season ? `?season=${season}` : ""}`, { token: parent.token })).data.data as any[]).find((p) => p.id === player).goals;
    expect(await goals("2023-24")).toBe(1);
    expect(await goals("2024-25")).toBe(0);
    expect(await goals("")).toBe(1);

    // Removing a result is staff only
    expect((await call(`/api/v1/results/${id}`, { method: "DELETE", token: parent.token })).status).toBe(403);
    expect((await call(`/api/v1/results/${id}`, { method: "DELETE", token: coach.token })).status).toBe(200);
  });
});
