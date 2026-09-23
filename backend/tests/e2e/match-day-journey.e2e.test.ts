import { describe, it, expect } from "vitest";
import { call, registerAdmin, registerMember } from "./helpers";

/**
 * E2E: Match day - fixtures, result and Man of the Match voting.
 * Staff create the fixture and run the vote; parents/players vote once each.
 */
describe("E2E: Match Day Journey", () => {
  it("staff add a fixture, members see it, MOTM vote runs end to end", async () => {
    const admin = await registerAdmin("coach");
    const parent = await registerMember("parent");

    // Staff create a fixture from the Manage Fixtures screen
    const created = await call("/api/v1/admin/fixtures", {
      token: admin.token,
      body: { opponent: "Rovers FC", date: "2099-09-27", time: "10:30", venue: "Home Ground", competition: "League", homeAway: "home" },
    });
    expect(created.status).toBe(200);
    const fixtureId = created.data.id as string;
    expect(fixtureId).toBeTruthy();

    // Parents see it in upcoming fixtures and the full list
    const upcoming = await call("/api/v1/fixtures/upcoming", { token: parent.token });
    expect(upcoming.status).toBe(200);
    expect(upcoming.data.some((f: any) => f.id === fixtureId && f.opponent === "Rovers FC")).toBe(true);

    const list = await call("/api/v1/fixtures", { token: parent.token });
    expect(list.data.data.find((f: any) => f.id === fixtureId)).toMatchObject({ homeAway: "home", time: "10:30" });

    // Parents can't create fixtures
    const denied = await call("/api/v1/admin/fixtures", {
      token: parent.token,
      body: { opponent: "Nope", date: "2099-10-01" },
    });
    expect(denied.status).toBe(403);

    // Voting isn't open yet
    const early = await call(`/api/v1/matches/${fixtureId}/motm/vote`, { token: parent.token, body: { candidateId: "player-1" } });
    expect(early.status).toBe(400);

    // Only staff can open voting
    const parentOpen = await call(`/api/v1/admin/matches/${fixtureId}/motm/open`, { token: parent.token, body: {} });
    expect(parentOpen.status).toBe(403);
    const open = await call(`/api/v1/admin/matches/${fixtureId}/motm/open`, { token: admin.token, body: {} });
    expect(open.status).toBe(200);

    // Parent votes, then changes their mind: still one vote
    expect((await call(`/api/v1/matches/${fixtureId}/motm/vote`, { token: parent.token, body: { candidateId: "player-1" } })).status).toBe(200);
    expect((await call(`/api/v1/matches/${fixtureId}/motm/vote`, { token: parent.token, body: { candidateId: "player-2" } })).status).toBe(200);
    // Coach votes too
    expect((await call(`/api/v1/matches/${fixtureId}/motm/vote`, { token: admin.token, body: { candidateId: "player-2" } })).status).toBe(200);

    const results = await call(`/api/v1/motm/${fixtureId}/results`, { token: parent.token });
    expect(results.status).toBe(200);
    expect(results.data.data.totalVotes).toBe(2);
    expect(results.data.data.results[0]).toMatchObject({ player_id: "player-2", vote_count: 2 });

    // Close voting: no more votes
    expect((await call(`/api/v1/admin/matches/${fixtureId}/motm/close`, { token: admin.token, body: {} })).status).toBe(200);
    const late = await call(`/api/v1/matches/${fixtureId}/motm/vote`, { token: parent.token, body: { candidateId: "player-1" } });
    expect(late.status).toBe(400);
  });

  it("records a result and builds the league table", async () => {
    const admin = await registerAdmin("results");
    const parent = await registerMember("results-parent");

    const result = await call("/api/v1/results", {
      token: admin.token,
      body: { date: "2025-09-20", opponent: "United", ourScore: 3, theirScore: 1, venue: "Away", competition: "League" },
    });
    expect(result.status).toBe(200);

    const results = await call("/api/v1/results", { token: parent.token });
    expect(results.data.data.find((r: any) => r.opponent === "United")).toMatchObject({ homeScore: 3, awayScore: 1, result: "win", points: 3 });

    const calc = await call("/api/v1/table/auto-calculate", { token: admin.token, body: {} });
    expect(calc.status).toBe(200);

    const table = await call("/api/v1/table", { token: parent.token });
    expect(table.status).toBe(200);
    expect(table.data.data.length).toBeGreaterThanOrEqual(2);
    expect(table.data.data.find((row: any) => row.team_name === "United")).toMatchObject({ played: 1, lost: 1, points: 0 });
  });

  it("requires sign-in for match operations", async () => {
    expect((await call("/api/v1/matches/any/motm/vote", { body: { candidateId: "x" } })).status).toBe(401);
    expect((await call("/api/v1/fixtures/upcoming")).status).toBe(401);
    expect((await call("/api/v1/admin/fixtures", { body: { opponent: "x", date: "2099-01-01" } })).status).toBe(401);
  });
});
