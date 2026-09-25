/**
 * Journey: scheduled club posts. On a Monday evening the club's week of
 * fixtures, a 3-days-to-go countdown, a postponement, a birthday and the
 * league table are queued once each (running the scheduler again changes
 * nothing). On Sunday evening the week's results go out.
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { call, registerAdmin } from "./helpers";
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
});
