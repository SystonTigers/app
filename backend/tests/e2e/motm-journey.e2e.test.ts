/**
 * Journey: Man of the Match. After a match the manager picks nominees and
 * opens the vote; parents vote in the app (and can change their mind); results
 * stay hidden until voting closes; closing stores the winner, adds the award
 * to player stats and shows it on the public club page.
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { call, registerAdmin, registerMember, TENANT } from "./helpers";

async function addPlayer(token: string, name: string, squadNumber: number): Promise<string> {
  const res = await call("/api/v1/admin/squad", { token, body: { name, squadNumber, position: "MF" } });
  expect(res.status).toBe(200);
  return res.data.playerId as string;
}

async function addFixture(token: string, opponent: string): Promise<string> {
  const res = await call("/api/v1/admin/fixtures", {
    token,
    body: { opponent, date: "2099-09-27", time: "10:30", venue: "Home Ground", competition: "League", homeAway: "home" },
  });
  expect(res.status).toBe(200);
  return res.data.id as string;
}

describe("Man of the Match journey", () => {
  it("manager nominates, parents vote, winner shows on the club page", async () => {
    const manager = await registerAdmin("motm-manager");
    const mum = await registerMember("motm-mum");
    const dad = await registerMember("motm-dad");
    const alfie = await addPlayer(manager.token, "Alfie Test", 7);
    const ben = await addPlayer(manager.token, "Ben Test", 9);
    const charlie = await addPlayer(manager.token, "Charlie Test", 4);
    const matchId = await addFixture(manager.token, "Motm Rovers");

    // Nothing open yet
    expect((await call(`/api/v1/matches/${matchId}/motm/vote`, { token: mum.token, body: { candidateId: alfie } })).status).toBe(400);

    // Parents can't open votes; staff need at least two nominees
    expect((await call(`/api/v1/admin/matches/${matchId}/motm/open`, { token: mum.token, body: { nominees: [alfie, ben] } })).status).toBe(403);
    const tooFew = await call(`/api/v1/admin/matches/${matchId}/motm/open`, { token: manager.token, body: { nominees: [alfie] } });
    expect(tooFew.status).toBe(400);
    expect(tooFew.data.error.message).toMatch(/at least 2/);
    const notOurs = await call(`/api/v1/admin/matches/${matchId}/motm/open`, { token: manager.token, body: { nominees: [alfie, "someone-else"] } });
    expect(notOurs.status).toBe(400);

    const open = await call(`/api/v1/admin/matches/${matchId}/motm/open`, { token: manager.token, body: { nominees: [alfie, ben] } });
    expect(open.status).toBe(200);
    expect(open.data.data.nominees.map((n: any) => n.name)).toEqual(["Alfie Test", "Ben Test"]);
    // Closes 48 hours after opening by default
    const hours = (Date.parse(open.data.data.closesAt) - Date.parse(open.data.data.opensAt)) / 3600_000;
    expect(hours).toBe(48);

    // Parents find it in the app
    const list = await call("/api/v1/motm/open", { token: mum.token });
    expect(list.status).toBe(200);
    const vote = list.data.data.open.find((v: any) => v.matchId === matchId);
    expect(vote).toMatchObject({ votingOpen: true, userVote: null, results: null });
    expect(vote.match.opponent).toBe("Motm Rovers");

    // Only nominees can be voted for
    const wrong = await call(`/api/v1/matches/${matchId}/motm/vote`, { token: mum.token, body: { candidateId: charlie } });
    expect(wrong.status).toBe(400);
    expect(wrong.data.error.code).toBe("NOT_A_NOMINEE");

    // Mum changes her mind: still one vote
    expect((await call(`/api/v1/matches/${matchId}/motm/vote`, { token: mum.token, body: { candidateId: alfie } })).status).toBe(200);
    expect((await call(`/api/v1/matches/${matchId}/motm/vote`, { token: mum.token, body: { candidateId: ben } })).status).toBe(200);
    expect((await call(`/api/v1/matches/${matchId}/motm/vote`, { token: dad.token, body: { candidateId: ben } })).status).toBe(200);
    const mine = await call(`/api/v1/motm/${matchId}`, { token: mum.token });
    expect(mine.data.data.userVote).toBe(ben);

    // Results stay hidden from parents until voting closes; staff can see the tally
    expect((await call(`/api/v1/motm/${matchId}/results`, { token: dad.token })).status).toBe(403);
    const tally = await call(`/api/v1/admin/matches/${matchId}/motm/tally`, { token: manager.token });
    expect(tally.data.data.totalVotes).toBe(2);
    expect(tally.data.data.results[0]).toMatchObject({ player_id: ben, player_name: "Ben Test", vote_count: 2 });

    // Close: Ben wins; closing twice is harmless
    const closed = await call(`/api/v1/admin/matches/${matchId}/motm/close`, { token: manager.token, body: {} });
    expect(closed.status).toBe(200);
    expect(closed.data.data.winners.map((w: any) => w.name)).toEqual(["Ben Test"]);
    expect((await call(`/api/v1/admin/matches/${matchId}/motm/close`, { token: manager.token, body: {} })).status).toBe(200);

    // No more votes; parents now see the result
    const late = await call(`/api/v1/matches/${matchId}/motm/vote`, { token: dad.token, body: { candidateId: alfie } });
    expect(late.data.error.code).toBe("VOTING_CLOSED");
    const results = await call(`/api/v1/motm/${matchId}/results`, { token: dad.token });
    expect(results.status).toBe(200);
    expect(results.data.data.winners).toEqual([ben]);

    // The award counts once in player stats
    const awards = await env.DB.prepare(
      `SELECT COUNT(*) AS c FROM match_events WHERE fixture_id = ? AND player_id = ? AND event_type = 'motm'`,
    ).bind(matchId, ben).first<{ c: number }>();
    expect(awards?.c).toBe(1);

    // And the public club page shows the winner
    const page = await call(`/public/${TENANT}/motm/latest`);
    expect(page.status).toBe(200);
    expect(page.data.data.winners[0]).toMatchObject({ name: "Ben Test", number: 9 });
    expect(page.data.data.match.opponent).toBe("Motm Rovers");
  });

  it("closes itself when the closing time passes", async () => {
    const manager = await registerAdmin("motm-auto");
    const parent = await registerMember("motm-auto-parent");
    const a = await addPlayer(manager.token, "Auto One", 1);
    const b = await addPlayer(manager.token, "Auto Two", 2);
    const matchId = await addFixture(manager.token, "Auto Close FC");

    const start = new Date(Date.now() - 60_000).toISOString();
    const end = new Date(Date.now() + 60_000).toISOString();
    expect((await call(`/api/v1/admin/matches/${matchId}/motm/open`, {
      token: manager.token,
      body: { nominees: [a, b], votingWindow: { start, end } },
    })).status).toBe(200);
    expect((await call(`/api/v1/matches/${matchId}/motm/vote`, { token: parent.token, body: { candidateId: a } })).status).toBe(200);

    // Time passes
    await env.DB.prepare(`UPDATE motm_sessions SET voting_end_at = ? WHERE match_id = ?`)
      .bind(new Date(Date.now() - 1000).toISOString(), matchId).run();

    const list = await call("/api/v1/motm/open", { token: parent.token });
    expect(list.data.data.open.some((v: any) => v.matchId === matchId)).toBe(false);
    const recent = list.data.data.recent.find((v: any) => v.matchId === matchId);
    expect(recent.winners.map((w: any) => w.name)).toEqual(["Auto One"]);
  });

  it("rejects a closing time before the opening time", async () => {
    const manager = await registerAdmin("motm-window");
    const a = await addPlayer(manager.token, "Window One", 1);
    const b = await addPlayer(manager.token, "Window Two", 2);
    const matchId = await addFixture(manager.token, "Window FC");
    const res = await call(`/api/v1/admin/matches/${matchId}/motm/open`, {
      token: manager.token,
      body: { nominees: [a, b], votingWindow: { start: "2099-01-02T10:00:00Z", end: "2099-01-01T10:00:00Z" } },
    });
    expect(res.status).toBe(400);
  });
});
