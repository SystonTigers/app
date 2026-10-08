/**
 * Journey: availability. A parent linked to their child sees the coming
 * match, training session and club event and says whether the child can
 * make each one (with a note for the coaches). Other parents can't answer for
 * them or see the squad. Staff see the squad's totals and each player's
 * answer, answer for a child themselves, and see it in the line-up. Families
 * who haven't answered get one reminder two days before, and a coach can
 * send one more.
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { call, registerAdmin, registerMember } from "./helpers";
import { sendAvailabilityReminders } from "../../src/services/availability/reminders";
import { ukDate } from "../../src/services/availability/rules";

describe("Availability", () => {
  it("families answer for their children; coaches see the squad and remind", async () => {
    const coach = await registerAdmin("avail-coach", "coach");
    const parent = await registerMember("avail-parent");
    const other = await registerMember("avail-other");
    const add = async (name: string, number: number) => (await call("/api/v1/admin/squad", { token: coach.token, body: { name, squadNumber: number } })).data.playerId as string;
    const ava = await add("Ava Available", 7);
    const ben = await add("Ben Busy", 8);

    const now = new Date();
    const soon = ukDate(now, 1);
    const later = ukDate(now, 10);
    const past = ukDate(now, -3);
    const tag = crypto.randomUUID().slice(0, 8);
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO fixtures (id, tenant_id, fixture_date, kick_off_time, opponent, venue, competition, status, home_team, away_team) VALUES (?, 'syston', ?, '10:30', 'Avail Owls', 'Memorial Park', 'League', 'scheduled', 'Syston Tigers', 'Avail Owls')`).bind(`av-m-${tag}`, soon),
      env.DB.prepare(`INSERT INTO fixtures (id, tenant_id, fixture_date, kick_off_time, opponent, venue, competition, status, home_team, away_team) VALUES (?, 'syston', ?, '14:00', 'Avail Hawks', 'Away ground', 'Cup', 'scheduled', 'Avail Hawks', 'Syston Tigers')`).bind(`av-a-${tag}`, later),
      env.DB.prepare(`INSERT INTO fixtures (id, tenant_id, fixture_date, kick_off_time, opponent, status, home_team, away_team) VALUES (?, 'syston', ?, '10:30', 'Avail Called Off', 'cancelled', 'Syston Tigers', 'Avail Called Off')`).bind(`av-c-${tag}`, soon),
      env.DB.prepare(`INSERT INTO fixtures (id, tenant_id, fixture_date, kick_off_time, opponent, status, home_team, away_team) VALUES (?, 'syston', ?, '10:30', 'Avail Gone', 'scheduled', 'Syston Tigers', 'Avail Gone')`).bind(`av-p-${tag}`, past),
      env.DB.prepare(`INSERT INTO calendar_events (id, tenant_id, title, event_type, start_time, location, created_at) VALUES (?, 'syston', 'Presentation night', 'social', ?, 'Club house', ?)`).bind(`av-e-${tag}`, `${later}T19:00`, Date.now()),
    ]);
    const training = (await call("/api/v1/training/sessions", { token: coach.token, body: { date: soon, time: "18:30", location: "Main pitch", focus: "Passing" } })).data.id as string;

    // Link the parent to Ava
    const code = (await call(`/api/v1/players/${ava}/parent-invite`, { method: "POST", token: coach.token, body: {} })).data.data.code;
    expect((await call("/api/v1/link-child", { token: parent.token, body: { code } })).status).toBe(200);

    const mine = (await call("/api/v1/availability", { token: parent.token })).data.data;
    expect(mine.staff).toBe(false);
    expect(mine.children).toEqual([{ playerId: ava, name: "Ava Available" }]);
    const items = mine.items.filter((i: any) => i.id.includes(tag) || i.id === training);
    // Called off and past matches aren't listed; soonest first
    expect(items.map((i: any) => i.id)).toEqual(expect.arrayContaining([`av-m-${tag}`, training, `av-a-${tag}`, `av-e-${tag}`]));
    expect(items.map((i: any) => i.id)).not.toContain(`av-c-${tag}`);
    expect(items.map((i: any) => i.id)).not.toContain(`av-p-${tag}`);
    const match = items.find((i: any) => i.id === `av-m-${tag}`);
    expect(match).toMatchObject({ type: "match", title: "v Avail Owls", date: soon, time: "10:30", place: "Memorial Park", homeAway: "home", children: [{ playerId: ava, status: null }] });
    expect(match.counts).toBeUndefined();
    expect(items.find((i: any) => i.id === `av-a-${tag}`)).toMatchObject({ title: "Cup: v Avail Hawks", homeAway: "away" });
    expect(items.find((i: any) => i.id === training)).toMatchObject({ type: "training", title: "Training: Passing", time: "18:30" });
    expect(items.find((i: any) => i.id === `av-e-${tag}`)).toMatchObject({ type: "event", title: "Presentation night", time: "19:00" });

    const answer = (token: string, type: string, id: string, player: string, body: unknown) =>
      call(`/api/v1/availability/${type}/${id}/players/${player}`, { method: "PUT", token, body });

    // The family answers, with a note for the coaches
    expect((await answer(parent.token, "match", `av-m-${tag}`, ava, { status: "yes" })).data.data).toMatchObject({ status: "yes", note: null });
    expect((await answer(parent.token, "training", training, ava, { status: "no", note: "  Dentist   appointment " })).data.data).toMatchObject({ status: "no", note: "Dentist appointment" });
    expect((await answer(parent.token, "event", `av-e-${tag}`, ava, { status: "maybe" })).status).toBe(200);
    // Changing an answer, and checking what's sent
    expect((await answer(parent.token, "match", `av-m-${tag}`, ava, { status: "maybe" })).data.data.status).toBe("maybe");
    expect((await answer(parent.token, "match", `av-m-${tag}`, ava, { status: "perhaps" })).status).toBe(400);
    expect((await answer(parent.token, "lunch", `av-m-${tag}`, ava, { status: "yes" })).status).toBe(404);
    expect((await answer(parent.token, "match", `av-c-${tag}`, ava, { status: "yes" })).status).toBe(404);
    expect((await answer(parent.token, "match", `av-p-${tag}`, ava, { status: "yes" })).status).toBe(409);
    // Not their child; another parent can't answer for Ava; nobody sees the squad but staff
    expect((await answer(parent.token, "match", `av-m-${tag}`, ben, { status: "yes" })).status).toBe(403);
    expect((await answer(other.token, "match", `av-m-${tag}`, ava, { status: "no" })).status).toBe(403);
    expect((await call(`/api/v1/availability/match/av-m-${tag}`, { token: parent.token })).status).toBe(403);
    expect((await call(`/api/v1/availability/match/av-m-${tag}/remind`, { method: "POST", token: parent.token })).status).toBe(403);

    // Staff: totals for each item, then the squad for one
    const staffView = (await call("/api/v1/availability", { token: coach.token })).data.data;
    expect(staffView.staff).toBe(true);
    const counts = staffView.items.find((i: any) => i.id === training).counts;
    expect(counts.no).toBe(1);
    expect(counts.waiting).toBeGreaterThanOrEqual(1);
    // The coach answers for Ben (his dad texted)
    expect((await answer(coach.token, "match", `av-m-${tag}`, ben, { status: "no", note: "On holiday" })).status).toBe(200);
    const squad = (await call(`/api/v1/availability/match/av-m-${tag}`, { token: coach.token })).data.data;
    expect(squad.item).toMatchObject({ type: "match", title: "v Avail Owls" });
    expect(squad.players.find((p: any) => p.playerId === ava)).toMatchObject({ status: "maybe", byStaff: false, linkedFamilies: 1 });
    expect(squad.players.find((p: any) => p.playerId === ben)).toMatchObject({ status: "no", note: "On holiday", byStaff: true, linkedFamilies: 0 });

    // The line-up shows staff who's available; families don't get that
    const lineup = (await call(`/api/v1/fixtures/av-m-${tag}/lineup`, { token: coach.token })).data.data;
    expect(lineup.availability).toMatchObject({ [ava]: "maybe", [ben]: "no" });
    expect((await call(`/api/v1/fixtures/av-m-${tag}/lineup`, { token: parent.token })).data.data.availability).toBeUndefined();

    // Clearing an answer
    expect((await answer(parent.token, "event", `av-e-${tag}`, ava, { status: null })).data.data.status).toBeNull();

    // Reminders: Ava's match and training are answered, so nothing is due for her family...
    await env.DB.prepare(`INSERT INTO devices (id, user_id, tenant_id, token, platform, created_at) VALUES (?, ?, 'syston', ?, 'web', ?)`)
      .bind(crypto.randomUUID(), parent.userId, `test-device-${parent.userId}`, Date.now()).run();
    const noon = new Date(`${ukDate(now)}T11:00:00Z`);
    const sentFor = async () => (await env.DB.prepare(`SELECT item_id FROM availability_reminders WHERE user_id = ? AND kind = 'auto' ORDER BY item_id`).bind(parent.userId).all<any>()).results.map((r: any) => r.item_id);
    await sendAvailabilityReminders(env as any, noon);
    expect((await sentFor()).filter((id: string) => id.includes(tag) || id === training)).toEqual([]);
    // ...until the match answer is cleared: then one reminder, at most once, and not at night
    await answer(parent.token, "match", `av-m-${tag}`, ava, { status: null });
    expect(await sendAvailabilityReminders(env as any, new Date(`${ukDate(now)}T22:30:00Z`))).toBe(0);
    await sendAvailabilityReminders(env as any, noon);
    expect(await sentFor()).toContain(`av-m-${tag}`);
    // The event ten days away isn't due yet
    expect(await sentFor()).not.toContain(`av-e-${tag}`);
    const before = (await sentFor()).length;
    await sendAvailabilityReminders(env as any, new Date(noon.getTime() + 5 * 60_000));
    expect((await sentFor()).length).toBe(before);

    // A coach's reminder: once, then "recently" until later
    const nudge = await call(`/api/v1/availability/match/av-m-${tag}/remind`, { method: "POST", token: coach.token });
    expect(nudge.status).toBe(200);
    expect(nudge.data.data.families).toBeGreaterThanOrEqual(1);
    const again = await call(`/api/v1/availability/match/av-m-${tag}/remind`, { method: "POST", token: coach.token });
    expect(again.status).toBe(429);
    expect(again.data.error.code).toBe("RECENTLY_REMINDED");
  });
});
