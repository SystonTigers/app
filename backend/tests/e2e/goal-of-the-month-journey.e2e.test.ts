/**
 * Journey: Goal of the Month. Staff see the month's goals (Match Centre and
 * match reports) and open a vote; members vote once and don't see the counts
 * until it closes; closing names the winner and queues one winner post.
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { call, registerAdmin, registerMember } from "./helpers";

let n = 0;
const tap = () => `gotm-${Date.now()}-${++n}`;

describe("Goal of the Month", () => {
  it("nominates the month's goals, takes one vote each and posts the winner", async () => {
    const coach = await registerAdmin("gotm-coach", "coach");
    const parent = await registerMember("gotm-parent");
    const fan = await registerMember("gotm-fan");
    const add = async (firstName: string) => (await call("/api/v1/admin/squad", { token: coach.token, body: { firstName, lastName: "Striker" } })).data.playerId as string;
    const [ava, bo] = [await add("Ava"), await add("Bo")];

    const fixtureId = (await call("/api/v1/admin/fixtures", {
      token: coach.token, body: { opponent: "Volley Vale", date: "2026-09-12", time: "10:00", venue: "Home", competition: "Friendly", homeAway: "home" },
    })).data.id as string;
    const t0 = Date.now() - 12 * 60_000;
    const post = (body: Record<string, unknown>, secs: number) =>
      call(`/api/v1/fixtures/${fixtureId}/live/events`, { token: coach.token, body: { clientEventId: tap(), occurredAt: t0 + secs * 1000, ...body } });
    await post({ type: "kick_off", halfLength: 25 }, 0);
    await post({ type: "goal", playerId: ava }, 120);
    await post({ type: "goal", playerId: bo }, 400);
    await post({ type: "full_time" }, 600);

    // Members can't see the nominations list or open a vote
    expect((await call("/api/v1/gotm/goals?month=2026-09", { token: parent.token })).status).toBe(403);
    const goals = (await call("/api/v1/gotm/goals?month=2026-09", { token: coach.token })).data.data.goals;
    const mine = goals.filter((g: any) => g.fixtureId === fixtureId);
    expect(mine.map((g: any) => [g.playerName, g.opponent, g.minute])).toEqual([["Ava Striker", "Volley Vale", 3], ["Bo Striker", "Volley Vale", 7]]);
    expect((await call("/api/v1/gotm/goals?month=2026-10", { token: coach.token })).data.data.goals.some((g: any) => g.fixtureId === fixtureId)).toBe(false);

    const nominate = (goals: unknown[]) => call("/api/v1/gotm/start", { token: coach.token, body: { month: "2026-09", goals } });
    expect((await nominate([{ playerId: ava }])).status).toBe(400);
    expect((await nominate([{ playerId: ava }, { playerId: "someone-elses-player" }])).status).toBe(409);
    expect((await call("/api/v1/gotm/start", { token: parent.token, body: { month: "2026-09", goals: [] } })).status).toBe(403);
    const opened = await nominate(mine.map((g: any) => ({ eventId: g.eventId, playerId: g.playerId, fixtureId: g.fixtureId, description: g.playerName === "Bo Striker" ? "Top corner from the edge" : "" })));
    expect(opened.status).toBe(201);
    const votingId = opened.data.data.votingId as string;
    expect((await nominate(mine.map((g: any) => ({ playerId: g.playerId })))).status).toBe(409);

    // What a parent sees: the goals with match, minute and description, no counts yet
    const seen = (await call("/api/v1/gotm", { token: parent.token })).data.data.vote;
    expect(seen).toMatchObject({ id: votingId, label: "September 2026", status: "open", myVote: null, winners: [] });
    expect(seen.candidates.map((c: any) => [c.playerName, c.opponent, c.date, c.minute, c.votes])).toEqual(
      expect.arrayContaining([["Ava Striker", "Volley Vale", "2026-09-12", 3, null], ["Bo Striker", "Volley Vale", "2026-09-12", 7, null]]),
    );
    const boGoal = seen.candidates.find((c: any) => c.playerId === bo);
    expect(boGoal.description).toBe("Top corner from the edge");

    const vote = (token: string, candidateId: string) => call("/api/v1/gotm/vote", { token, body: { votingId, candidateId } });
    const voted = await vote(parent.token, boGoal.id);
    expect(voted.status).toBe(200);
    expect(voted.data.data.vote.myVote).toBe(boGoal.id);
    expect((await vote(parent.token, boGoal.id)).status).toBe(409);
    expect((await vote(fan.token, "not-a-goal")).status).toBe(404);
    expect((await vote(fan.token, boGoal.id)).status).toBe(200);

    // Staff see the running count
    const staffView = (await call("/api/v1/gotm", { token: coach.token })).data.data.vote;
    expect(staffView.candidates.find((c: any) => c.playerId === bo).votes).toBe(2);

    expect((await call("/api/v1/gotm/close", { token: parent.token, body: { votingId } })).status).toBe(403);
    const closed = await call("/api/v1/gotm/close", { token: coach.token, body: { votingId } });
    expect(closed.data.data).toMatchObject({ winners: [{ name: "Bo Striker", detail: "v Volley Vale, 7'" }], votes: 2 });
    expect((await call("/api/v1/gotm/close", { token: coach.token, body: { votingId } })).status).toBe(200);
    const { results: jobs } = await env.DB.prepare(`SELECT kind, caption, graphic FROM social_jobs WHERE source_id = ?`).bind(`gotm:${votingId}`).all<any>();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].caption).toBe("🏆 Goal of the Month for September 2026: Bo S. (v Volley Vale, 7')! Voted for by the club with 2 votes.");
    expect(JSON.parse(jobs[0].graphic)).toMatchObject({ layout: "person", headline: "GOAL OF THE MONTH", playerName: "Bo S.", secondary: "September 2026 · 2 votes" });

    expect((await vote(fan.token, boGoal.id)).status).toBe(409);
    const after = (await call("/api/v1/gotm", { token: fan.token })).data.data;
    expect(after.vote).toBeNull();
    expect(after.past[0]).toMatchObject({ id: votingId, status: "closed", winners: [boGoal.id] });
    expect(after.past[0].candidates.find((c: any) => c.id === boGoal.id).votes).toBe(2);

    // A new vote can open now the last one is closed
    expect((await nominate(mine.map((g: any) => ({ playerId: g.playerId })))).status).toBe(201);
  });
});
