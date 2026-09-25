/**
 * Journey: a manager runs a match from the touchline. Parents follow along in
 * the app and on the public club page. Full time saves the result, the league
 * points and players' goals, assists and cards; mistakes can be undone.
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { call, registerAdmin, registerMember } from "./helpers";

let seq = 0;
const tap = () => `tap-${Date.now()}-${++seq}`;

async function setup(opponent: string) {
  const coach = await registerAdmin("live-coach");
  const parent = await registerMember("live-parent");
  const addPlayer = async (name: string, squadNumber: number) =>
    (await call("/api/v1/admin/squad", { token: coach.token, body: { name, squadNumber, position: "MF" } })).data.playerId as string;
  const striker = await addPlayer("Sam Striker", 9);
  const winger = await addPlayer("Will Winger", 7);
  const sub = await addPlayer("Sid Sub", 14);
  const fixture = await call("/api/v1/admin/fixtures", {
    token: coach.token,
    body: { opponent, date: "2026-09-26", time: "10:00", venue: "Home Ground", competition: "League", homeAway: "home" },
  });
  return { coach, parent, striker, winger, sub, fixtureId: fixture.data.id as string };
}

describe("Live match journey", () => {
  it("runs a match from kick-off to full time", async () => {
    const { coach, parent, striker, winger, sub, fixtureId } = await setup("Live Rovers");
    const post = (body: Record<string, unknown>, token = coach.token) =>
      call(`/api/v1/fixtures/${fixtureId}/live/events`, { token, body: { clientEventId: tap(), ...body } });

    // Nothing before kick-off, and parents can't post
    expect((await post({ type: "goal", playerId: striker })).status).toBe(409);
    expect((await post({ type: "kick_off" }, parent.token)).status).toBe(403);

    const kickOff = await post({ type: "kick_off", halfLength: 30 });
    expect(kickOff.status).toBe(201);
    expect(kickOff.data.data).toMatchObject({ status: "live", period: 1, halfLength: 30, ourScore: 0 });

    // A goal needs a scorer from our squad
    expect((await post({ type: "goal" })).status).toBe(400);
    expect((await post({ type: "goal", playerId: "not-ours" })).status).toBe(400);

    // A retried tap is only counted once
    const same = tap();
    await call(`/api/v1/fixtures/${fixtureId}/live/events`, { token: coach.token, body: { clientEventId: same, type: "goal", playerId: striker, player2Id: winger, minute: 12 } });
    const retry = await call(`/api/v1/fixtures/${fixtureId}/live/events`, { token: coach.token, body: { clientEventId: same, type: "goal", playerId: striker, player2Id: winger, minute: 12 } });
    expect(retry.data.data.ourScore).toBe(1);

    await post({ type: "opp_goal", text: "Their number 10", minute: 20 });
    await post({ type: "yellow", playerId: winger, minute: 25 });
    expect((await post({ type: "second_half" })).status).toBe(409);
    await post({ type: "half_time" });
    await post({ type: "sub", playerId: sub, player2Id: winger });
    await post({ type: "second_half" });
    const mistake = await post({ type: "goal", playerId: sub, minute: 40 });
    const wrongGoal = mistake.data.data.events[0];
    expect(mistake.data.data.ourScore).toBe(2);

    // Undo the goal that wasn't
    const undone = await call(`/api/v1/fixtures/${fixtureId}/live/events/${wrongGoal.id}`, { method: "DELETE", token: coach.token });
    expect(undone.status).toBe(200);
    expect(undone.data.data.ourScore).toBe(1);

    await post({ type: "goal", playerId: striker, minute: 55 });
    await post({ type: "note", text: "Great save from our keeper" });

    // Parents follow along
    const live = await call("/api/v1/live", { token: parent.token });
    const match = live.data.data.find((m: any) => m.fixture.id === fixtureId);
    expect(match).toMatchObject({ status: "live", period: 2, ourScore: 2, theirScore: 1 });
    expect(match.events[0]).toMatchObject({ type: "note", text: "Great save from our keeper" });

    // Public page: score and goals, first name and initial, no staff notes
    const pub = (await call("/public/syston/live")).data.data.find((m: any) => m.opponent === "Live Rovers");
    expect(pub).toMatchObject({ status: "live", ourScore: 2, theirScore: 1 });
    expect(pub.events.some((e: any) => e.type === "note")).toBe(false);
    expect(pub.events.find((e: any) => e.type === "goal").player).toBe("Sam S.");

    // Full time saves the result and stats
    const ft = await post({ type: "full_time" });
    expect(ft.data.data.status).toBe("full_time");
    const result = await env.DB.prepare(`SELECT our_score, their_score, result, points, scorers, source FROM team_results WHERE fixture_id = ?`).bind(fixtureId).first<any>();
    expect(result).toEqual({ our_score: 2, their_score: 1, result: "win", points: 3, scorers: "Sam Striker 2", source: "live" });
    const stats = await env.DB.prepare(`SELECT event_type, COUNT(*) AS c FROM match_events WHERE fixture_id = ? GROUP BY event_type ORDER BY event_type`).bind(fixtureId).all<any>();
    expect(stats.results).toEqual([{ event_type: "assist", c: 1 }, { event_type: "goal", c: 2 }, { event_type: "yellow_card", c: 1 }]);
    const fixtureRow = await env.DB.prepare(`SELECT status, home_score, away_score FROM fixtures WHERE id = ?`).bind(fixtureId).first<any>();
    expect(fixtureRow).toEqual({ status: "completed", home_score: 2, away_score: 1 });

    // After full time: no more updates, and goals are locked until full time is undone
    expect((await post({ type: "goal", playerId: striker })).status).toBe(409);
    const ftEvent = ft.data.data.events[0];
    const lastGoal = ft.data.data.events.find((e: any) => e.type === "goal");
    expect((await call(`/api/v1/fixtures/${fixtureId}/live/events/${lastGoal.id}`, { method: "DELETE", token: coach.token })).status).toBe(409);

    // Undoing full time takes the result back out
    expect((await call(`/api/v1/fixtures/${fixtureId}/live/events/${ftEvent.id}`, { method: "DELETE", token: coach.token })).status).toBe(200);
    expect(await env.DB.prepare(`SELECT COUNT(*) AS c FROM team_results WHERE fixture_id = ?`).bind(fixtureId).first<any>()).toEqual({ c: 0 });
    expect(await env.DB.prepare(`SELECT status FROM fixtures WHERE id = ?`).bind(fixtureId).first<any>()).toEqual({ status: "scheduled" });

    // And calling it again puts it back, once
    await post({ type: "full_time" });
    await post({ type: "full_time" });
    expect(await env.DB.prepare(`SELECT COUNT(*) AS c FROM team_results WHERE fixture_id = ?`).bind(fixtureId).first<any>()).toEqual({ c: 1 });
    expect(await env.DB.prepare(`SELECT COUNT(*) AS c FROM match_events WHERE fixture_id = ? AND event_type = 'goal'`).bind(fixtureId).first<any>()).toEqual({ c: 2 });
  });

  it("keeps each club's matches to itself", async () => {
    const { parent, fixtureId } = await setup("Private Rovers");
    const signup = await call("/api/v1/auth/register-owner", {
      body: { name: "Other", email: `other-${Date.now()}@example.com`, password: "ClubOwnerPass123", clubName: "Other Live FC" },
      headers: { "CF-Connecting-IP": "203.0.113.99" },
    });
    const otherOwner = signup.data.data.token as string;
    expect((await call(`/api/v1/fixtures/${fixtureId}/live`, { token: otherOwner })).status).toBe(404);
    expect((await call(`/api/v1/fixtures/${fixtureId}/live/events`, { token: otherOwner, body: { type: "kick_off", clientEventId: tap() } })).status).toBe(404);
    expect((await call(`/api/v1/fixtures/${fixtureId}/live`, { token: parent.token })).data.data.status).toBe("scheduled");
  });
});
