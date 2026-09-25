/**
 * Journey: the manager picks a 7-a-side team, posts the team news, runs the
 * match (with times taken from when they tapped), and at full time Man of the
 * Match voting opens with everyone who played nominated. Closing the vote
 * queues the winner announcement.
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { call, registerAdmin, registerMember } from "./helpers";

let seq = 0;
const tap = () => `lineup-${Date.now()}-${++seq}`;

describe("Line-ups and Man of the Match", () => {
  it("picks a 7-a-side team, posts it, and nominates everyone who played for MOTM", async () => {
    const coach = await registerAdmin("lineup-coach");
    const parent = await registerMember("lineup-parent");
    const players: string[] = [];
    for (let i = 1; i <= 10; i++) {
      players.push((await call("/api/v1/admin/squad", { token: coach.token, body: { name: `Player ${String.fromCharCode(64 + i)}ones`, squadNumber: i } })).data.playerId);
    }
    const fixtureId = (await call("/api/v1/admin/fixtures", {
      token: coach.token,
      body: { opponent: "Lineup United", date: "2026-09-28", time: "10:30", venue: "Home Ground", competition: "League", homeAway: "home" },
    })).data.id as string;
    const lineupUrl = `/api/v1/fixtures/${fixtureId}/lineup`;

    // The club plays 11-a-side unless told otherwise
    expect((await call(lineupUrl, { token: parent.token })).data.data).toMatchObject({ teamSize: 11, starters: [], subs: [] });

    // Rules: right number of starters, no repeats, only our players, staff only
    const starters = players.slice(0, 7);
    const subs = players.slice(7, 9);
    const put = (body: unknown, token = coach.token) => call(lineupUrl, { method: "PUT", token, body });
    expect((await put({ teamSize: 7, starters, subs }, parent.token)).status).toBe(403);
    expect((await put({ teamSize: 8, starters, subs })).data.error.message).toMatch(/5, 7, 9 or 11/);
    expect((await put({ teamSize: 7, starters: starters.slice(0, 6), subs })).data.error.message).toMatch(/Pick 7 starting players/);
    expect((await put({ teamSize: 7, starters, subs: [starters[0]] })).data.error.message).toMatch(/only be picked once/);
    expect((await put({ teamSize: 7, starters: [...starters.slice(0, 6), "not-ours"], subs })).status).toBe(400);

    const saved = await put({ teamSize: 7, starters, subs, makeClubDefault: true });
    expect(saved.status).toBe(200);
    expect(saved.data.data.teamSize).toBe(7);
    expect(saved.data.data.starters.map((p: any) => p.playerId)).toEqual(starters);
    expect(saved.data.data.clubDefaultTeamSize).toBe(7);

    // Team news goes out (club app by default; Facebook/Instagram when connected)
    const published = await call(`${lineupUrl}/publish`, { token: coach.token, body: {} });
    expect(published.status).toBe(201);
    expect(published.data.data.newPost.caption).toMatch(/^📋 Team news: here's our starting 7 v Lineup United \(Kick-off 10:30 · Home Ground\)/);
    expect(published.data.data.newPost.graphic.players).toHaveLength(7);

    // Match: times come from when the manager tapped, not when the server heard
    const post = (body: Record<string, unknown>) => call(`/api/v1/fixtures/${fixtureId}/live/events`, { token: coach.token, body: { clientEventId: tap(), ...body } });
    const kickOffAt = Date.now() - 10 * 60_000;
    await post({ type: "kick_off", halfLength: 25, occurredAt: kickOffAt });
    const goal = await post({ type: "goal", playerId: starters[3], occurredAt: kickOffAt + 7 * 60_000 + 5000 });
    expect(goal.data.data.kickedOffAt).toBe(kickOffAt);
    expect(goal.data.data.events[0].minute).toBe(8);
    // A tap time far in the past isn't trusted
    const odd = await post({ type: "note", text: "Rain", occurredAt: Date.now() - 3 * 3600_000 });
    expect(Math.abs(odd.data.data.events[0].createdAt - Date.now())).toBeLessThan(5000);

    // One sub comes on, one doesn't
    await post({ type: "sub", playerId: subs[0], player2Id: starters[6] });
    const ft = await post({ type: "full_time" });
    expect(ft.data.data.motmOpened).toBe(true);

    // Everyone who played is nominated: 7 starters + the sub who came on
    const vote = await call(`/api/v1/motm/${fixtureId}`, { token: parent.token });
    expect(vote.data.data.votingOpen).toBe(true);
    expect(vote.data.data.nominees.map((n: any) => n.playerId).sort()).toEqual([...starters, subs[0]].sort());

    // Parents vote; closing announces the winner
    await call(`/api/v1/matches/${fixtureId}/motm/vote`, { token: parent.token, body: { candidateId: starters[3] } });
    const closed = await call(`/api/v1/admin/matches/${fixtureId}/motm/close`, { token: coach.token, body: {} });
    expect(closed.data.data.winners[0].playerId).toBe(starters[3]);
    expect(closed.data.data.post.caption).toMatch(/^⭐ Man of the Match: Player D\. vs Lineup United/);
    const jobs = await env.DB.prepare(`SELECT COUNT(*) AS c FROM social_jobs WHERE source_type = 'motm' AND source_id = ?`).bind(fixtureId).first<any>();
    expect(jobs.c).toBe(1);
  });

  it("doesn't open a vote at full time without a line-up", async () => {
    const coach = await registerAdmin("lineup-none");
    const fixtureId = (await call("/api/v1/admin/fixtures", {
      token: coach.token,
      body: { opponent: "No Lineup FC", date: "2026-09-29", time: "10:30", venue: "Away", homeAway: "away" },
    })).data.id as string;
    const post = (body: Record<string, unknown>) => call(`/api/v1/fixtures/${fixtureId}/live/events`, { token: coach.token, body: { clientEventId: tap(), ...body } });
    await post({ type: "kick_off" });
    expect((await post({ type: "full_time" })).data.data.motmOpened).toBe(false);
  });
});
