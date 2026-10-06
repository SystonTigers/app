/**
 * Journey: scheduled club posts. On a Monday evening the club's week of
 * fixtures, a 3-days-to-go countdown, a postponement, a birthday and the
 * league table are queued once each (running the scheduler again changes
 * nothing). On Sunday evening the week's results go out. On the 1st, last
 * month's results, the season's top scorers and this month's fixtures.
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { call, registerAdmin, registerMember } from "./helpers";
import { addDays, scheduleClub, ukTime } from "../../src/services/social/scheduler";

const MONDAY_EVENING = new Date("2026-10-05T17:30:00Z"); // 18:30 in the UK (BST)
const SUNDAY_EVENING = new Date("2026-10-11T18:30:00Z"); // 19:30 in the UK

async function jobsFor(prefix: string) {
  const { results } = await env.DB.prepare(`SELECT source_id, kind, caption, targets, graphic FROM social_jobs WHERE tenant_id = 'syston' AND source_type = 'club' AND substr(source_id, 1, ?) = ?`)
    .bind(prefix.length, prefix).all<any>();
  return results;
}

describe("Scheduled club posts", () => {
  it("knows the UK date and time, including summer time", () => {
    expect(ukTime(MONDAY_EVENING)).toEqual({ date: "2026-10-05", hour: 18, minute: 30, weekday: 1 });
    expect(ukTime(new Date("2026-12-01T23:30:00Z"))).toMatchObject({ date: "2026-12-01", hour: 23 });
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
  });

  it("queues the week's posts once, with the right details", async () => {
    const coach = await registerAdmin("sched-coach");
    const fixture = (opponent: string, date: string) => call("/api/v1/admin/fixtures", {
      token: coach.token, body: { opponent, date, time: "10:30", venue: "Sched Park", competition: "Sched League", homeAway: "home" },
    }).then((r) => r.data.id as string);
    const thursday = await fixture("Countdown United", "2026-10-08");
    await fixture("Weekend Wanderers", "2026-10-10");
    const postponed = await fixture("Rained Off Rovers", "2026-10-12");
    await call(`/api/v1/admin/fixtures/${postponed}`, { method: "PUT", token: coach.token, body: { status: "postponed" } });
    // Postponed a while back, so the scheduler doesn't announce it (e.g. when posting is first switched on)
    const oldOff = await fixture("Long Ago Rovers", "2026-10-13");
    await env.DB.prepare(`UPDATE fixtures SET status = 'postponed', updated_at = '2026-09-01T10:00:00Z' WHERE id = ?`).bind(oldOff).run();
    await env.DB.prepare(`UPDATE fixtures SET updated_at = '2026-10-05T09:00:00Z' WHERE id = ?`).bind(postponed).run();

    const birthdayId = (await call("/api/v1/admin/squad", { token: coach.token, body: { name: "Bday Brown", squadNumber: 30, dob: "2014-10-05" } })).data.playerId as string;
    await env.DB.prepare(`UPDATE squad SET dob = '2014-10-05' WHERE id = ?`).bind(birthdayId).run();
    const table = [["Syston Tigers (test)", 3, 9], ["Other Town", 3, 6], ["Third Place FC", 3, 3]];
    for (const [team, played, points] of table) {
      await env.DB.prepare(`INSERT OR REPLACE INTO league_standings (tenant_id, competition, team_name, played, won, drawn, lost, points, goals_for, goals_against, goal_difference, position)
        VALUES ('syston', 'Sched League', ?, ?, 0, 0, 0, ?, 0, 0, 0, NULL)`).bind(team, played, points).run();
    }

    await scheduleClub(env as any, "syston", MONDAY_EVENING);
    await scheduleClub(env as any, "syston", new Date(MONDAY_EVENING.getTime() + 5 * 60_000));

    const fixtures = await jobsFor("fixtures:2026-10-05");
    expect(fixtures).toHaveLength(1);
    expect(fixtures[0].caption).toContain("SAT 10 OCT: Syston Tigers (test) v Weekend Wanderers (10:30, Sched Park)");
    expect(fixtures[0].caption).not.toContain("Rained Off Rovers");
    expect(JSON.parse(fixtures[0].graphic)).toMatchObject({ layout: "list", mode: "fixtures", subtitle: "MON 5 OCT – SUN 11 OCT" });

    const countdown = await jobsFor(`countdown:${thursday}`);
    expect(countdown).toHaveLength(1);
    expect(JSON.parse(countdown[0].graphic)).toMatchObject({ layout: "fixture", countdown: 3, date: "THU 8 OCT", away: { name: "Countdown United" } });

    expect(await jobsFor(`postponed:${oldOff}`)).toHaveLength(0);
    const off = await jobsFor(`postponed:${postponed}`);
    expect(off[0].caption).toBe("⚠️ POSTPONED: Syston Tigers (test) v Rained Off Rovers on MON 12 OCT is off. New date to be confirmed.");

    // Birthdays go to the club app only, and never show an age
    const bday = await jobsFor(`birthday:${birthdayId}:2026`);
    expect(bday).toHaveLength(1);
    expect(JSON.parse(bday[0].targets)).toEqual(["feed"]);
    expect(bday[0].caption).toBe("🎂 Happy birthday Bday B.! Have a brilliant day from everyone at Syston Tigers (test).");
    expect(bday[0].caption).not.toMatch(/\b12\b/);

    const league = await jobsFor("table:2026-10-05");
    expect(league[0].caption).toBe("📈 League table: we're 1st in Sched League with 9 points from 3 games.");
    expect(JSON.parse(league[0].graphic).rows[0]).toMatchObject({ team: "Syston Tigers (test)", isUs: true });

    // Player of the week waits until 19:00
    expect(await jobsFor("potw:2026-10-05")).toHaveLength(0);
  });

  it("posts the week's results on Sunday evening", async () => {
    await env.DB.prepare(`INSERT INTO team_results (tenant_id, match_date, competition, opponent, venue, our_score, their_score, result, points, source)
      VALUES ('syston', '2026-10-10', 'Sched League', 'Weekend Wanderers', 'Sched Park', 4, 2, 'win', 3, 'manual')`).run();
    await scheduleClub(env as any, "syston", SUNDAY_EVENING);
    const results = await jobsFor("results:2026-10-11");
    expect(results).toHaveLength(1);
    expect(results[0].caption).toContain("• Syston Tigers (test) 4–2 Weekend Wanderers ✅");
    expect(JSON.parse(results[0].graphic).rows[0]).toMatchObject({ homeScore: 4, awayScore: 2, outcome: "W" });
  });

  it("posts the monthly round-ups on the 1st, once each", async () => {
    const coach = await registerAdmin("roundup-coach");
    const scorer = (await call("/api/v1/admin/squad", { token: coach.token, body: { name: "Rory Roundup", squadNumber: 31 } })).data.playerId as string;
    const added = await call("/api/v1/results", {
      token: coach.token,
      body: { date: "2026-09-19", opponent: "September Saints", ourScore: 3, theirScore: 1, competition: "Sched League", scorerIds: [scorer, scorer], ownGoals: 1 },
    });
    expect(added.status).toBe(200);
    await call("/api/v1/admin/fixtures", { token: coach.token, body: { opponent: "October Orient", date: "2026-10-24", time: "11:00", venue: "Sched Park", competition: "Sched League", homeAway: "home" } });

    const firstOfMonth = new Date("2026-10-01T16:30:00Z"); // 17:30 in the UK
    await scheduleClub(env as any, "syston", firstOfMonth);
    await scheduleClub(env as any, "syston", new Date(firstOfMonth.getTime() + 5 * 60_000));

    const results = await jobsFor("month_results:2026-09");
    expect(results).toHaveLength(1);
    expect(results[0].caption).toMatch(/^📊 September's results\n/);
    expect(results[0].caption).toContain("Syston Tigers (test) 3–1 September Saints ✅");
    expect(JSON.parse(results[0].graphic)).toMatchObject({ layout: "list", mode: "results", subtitle: "September 2026" });

    const stats = await jobsFor("stats:2026-10");
    expect(stats).toHaveLength(1);
    expect(stats[0].caption).toContain("Rory R.: 2 goals");
    expect(JSON.parse(stats[0].graphic)).toMatchObject({ layout: "leaders", columns: ["GOALS", "ASSISTS", "APPS"] });

    const fixtures = await jobsFor("month_fixtures:2026-10");
    expect(fixtures).toHaveLength(1);
    expect(fixtures[0].caption).toMatch(/^📅 October's fixtures\n/);
    expect(fixtures[0].caption).toContain("October Orient");

    // Not the 1st: nothing more
    await scheduleClub(env as any, "syston", new Date("2026-10-02T16:30:00Z"));
    expect(await jobsFor("month_")).toHaveLength(2);
  });
  it("leaves the ground and kick-off time out of posts when the club asks", async () => {
    const coach = await registerAdmin("sched-private");
    const monday = new Date("2026-11-02T18:30:00Z"); // 18:30 in the UK (GMT)
    const fixture = (opponent: string, date: string) => call("/api/v1/admin/fixtures", {
      token: coach.token, body: { opponent, date, time: "09:45", venue: "Secret Ground", competition: "Sched League", homeAway: "home" },
    }).then((r) => r.data.id as string);
    const thursday = await fixture("Quiet United", "2026-11-05");
    await fixture("Hush Athletic", "2026-11-07");

    const set = await call("/api/v1/social/settings", { method: "PUT", token: coach.token, body: { hideMatchDetails: true } });
    expect(set.status).toBe(200);
    expect(set.data.data.hideMatchDetails).toBe(true);
    expect((await call("/api/v1/social/settings", { method: "PUT", token: coach.token, body: { hideMatchDetails: "yes" } })).status).toBe(400);
    try {
      await scheduleClub(env as any, "syston", monday);
      const week = await jobsFor("fixtures:2026-11-02");
      expect(week[0].caption).toContain("SAT 7 NOV: Syston Tigers (test) v Hush Athletic");
      const countdown = await jobsFor(`countdown:${thursday}`);
      for (const job of [...week, ...countdown]) {
        expect(job.caption).not.toContain("Secret Ground");
        expect(job.caption).not.toContain("09:45");
        expect(job.graphic).not.toContain("Secret Ground");
        expect(job.graphic).not.toContain("09:45");
      }
      expect(JSON.parse(countdown[0].graphic)).toMatchObject({ time: null, venue: null, countdown: 3 });
    } finally {
      await call("/api/v1/social/settings", { method: "PUT", token: coach.token, body: { hideMatchDetails: false } });
    }
  });
  it("keeps posts that say where and when we play off the public club page", async () => {
    const coach = await registerAdmin("sched-feed");
    const parent = await registerMember("sched-feed-parent");
    const now = Date.now();
    const jobs = [["feedjob-matchday", "matchday", "MATCH DAY at Secret Ground"], ["feedjob-goal", "goal", "GOAL! Quiet Q."]];
    for (const [id, kind, caption] of jobs) {
      await env.DB.prepare(`INSERT INTO social_jobs (id, tenant_id, source_type, source_id, kind, caption, graphic, targets, status, post_after, created_at, updated_at)
        VALUES (?, 'syston', 'club', ?, ?, ?, '{}', '["feed"]', 'done', ?, ?, ?)`).bind(id, `test:${id}`, kind, caption, now, now, now).run();
      await env.DB.prepare(`INSERT INTO feed_posts (id, tenant_id, title, content, author, image_url, post_type, created_at, updated_at)
        VALUES (?, 'syston', ?, ?, 'Club', NULL, 'live', ?, ?)`).bind(`social-${id}`, kind, caption, now, now).run();
    }
    const ids = async (token?: string) => ((await call("/public/syston/feed?limit=50", token ? { token } : {})).data.data as any[]).map((p) => p.id);
    expect(await ids()).toContain("social-feedjob-goal");
    expect(await ids()).not.toContain("social-feedjob-matchday");
    expect(await ids(parent.token)).toContain("social-feedjob-matchday");

    // Once the club leaves the details out of posts, the match day post can be public
    await call("/api/v1/social/settings", { method: "PUT", token: coach.token, body: { hideMatchDetails: true } });
    try {
      expect(await ids()).toContain("social-feedjob-matchday");
    } finally {
      await call("/api/v1/social/settings", { method: "PUT", token: coach.token, body: { hideMatchDetails: false } });
    }
  });
});
