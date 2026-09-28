/**
 * Journey: goals and assists recorded in Match Centre show up in the app's
 * player stats (with names), the public squad stats the website ranks top
 * scorers from, and the league table shows real goal difference.
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { call, registerAdmin, registerMember } from "./helpers";

let seq = 0;
const tap = () => `stats-${Date.now()}-${++seq}`;

describe("Player stats", () => {
  it("counts goals and assists from Match Centre for the app and the website", async () => {
    const coach = await registerAdmin("stats-coach");
    const parent = await registerMember("stats-parent");
    const add = async (name: string, n: number) => (await call("/api/v1/admin/squad", { token: coach.token, body: { name, squadNumber: n } })).data.playerId as string;
    const striker = await add("Stats Striker", 90);
    const winger = await add("Stats Winger", 91);
    const fixtureId = (await call("/api/v1/admin/fixtures", {
      token: coach.token, body: { opponent: "Stats Rovers", date: "2026-09-20", time: "10:00", venue: "Home Ground", competition: "League", homeAway: "home" },
    })).data.id as string;
    const post = (body: Record<string, unknown>) => call(`/api/v1/fixtures/${fixtureId}/live/events`, { token: coach.token, body: { clientEventId: tap(), ...body } });
    await post({ type: "kick_off" });
    await post({ type: "goal", playerId: striker, player2Id: winger, minute: 10 });
    await post({ type: "goal", playerId: striker, minute: 30 });
    await post({ type: "goal", playerId: winger, player2Id: striker, minute: 40 });
    await post({ type: "full_time" });

    // The app's Stats screen: every squad player with names and counts
    expect((await call("/api/v1/stats/players")).status).toBe(401);
    const stats = await call("/api/v1/stats/players", { token: parent.token });
    expect(stats.status).toBe(200);
    const byName = Object.fromEntries(stats.data.data.map((p: any) => [p.name, p]));
    expect(byName["Stats Striker"]).toMatchObject({ number: 90, goals: 2, assists: 1, appearances: 1 });
    expect(byName["Stats Winger"]).toMatchObject({ number: 91, goals: 1, assists: 1 });

    // The website ranks top scorers from the public squad stats (names in the club's style)
    const squad = await call("/public/syston/squad");
    const strikerPublic = squad.data.data.find((p: any) => p.id === striker);
    expect(strikerPublic).toMatchObject({ name: "Stats S.", stats: { goals: 2, assists: 1 } });
  });

  it("shows goal difference in the league table", async () => {
    const coach = await registerAdmin("table-coach");
    const saved = await call("/api/v1/table", {
      token: coach.token,
      body: [
        { position: 1, team: "GD United", played: 3, won: 3, drawn: 0, lost: 0, goalsFor: 9, goalsAgainst: 2, points: 9, competition: "GD League" },
        { position: 2, team: "GD Town", played: 3, won: 0, drawn: 0, lost: 3, goalsFor: 2, goalsAgainst: 9, points: 0, competition: "GD League" },
      ],
    });
    expect(saved.status).toBeLessThan(300);
    const row = await env.DB.prepare(`SELECT goal_difference FROM league_standings WHERE tenant_id = 'syston' AND team_name = 'GD United'`).first<any>();
    expect(row.goal_difference).toBe(7);
    const table = await call("/public/syston/table");
    expect(table.data.data.find((r: any) => r.team === "GD Town").goalDifference).toBe(-7);
  });
});
