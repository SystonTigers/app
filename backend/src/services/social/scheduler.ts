/**
 * Scheduled club posts, run on the 5-minute cron. Each post has a time window
 * (UK time); the first run inside the window queues it, and its source id
 * (e.g. "fixtures:2026-09-29") stops it being posted twice. If the Worker
 * misses a slot the post still goes out later the same day.
 *
 * Mon 18:00 fixtures · Mon 12:00 table · Mon 19:00 player of the week
 * Sun 19:00 results · 1st 10:00 player of the month · Wed 12:00 quote
 * Thu 18:00 throwback · daily 08:00 birthdays and match day · 18:00 countdown
 * (3 days before) · 19:00 milestones · postponements whenever they happen.
 */
import { opponentBadgeUrl, normalizeTeamName } from "../opponentBadges";
import type { SocialEnv } from "./club";
import {
  birthdayPost, countdownPost, fixturesPost, matchdayPost, milestonePost, playerOfPeriodPost, postponedPost, QUOTES, quotePost,
  resultsPost, tablePost, throwbackPost, type FixtureFacts, type ResultFacts,
} from "./clubPosts";
import { displayDate, type PostKind } from "./content";
import { queueClubPost } from "./jobs";

export interface UkTime { date: string; hour: number; minute: number; weekday: number }

/** The date, hour and weekday (0 = Sunday) in the UK. */
export function ukTime(now: Date): UkTime {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23",
  }).formatToParts(now).map((p) => [p.type, p.value]));
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), minute: Number(parts.minute), weekday };
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const APPEARANCE_MILESTONES = [10, 25, 50, 75, 100, 150, 200, 250, 300];
const GOAL_MILESTONES = [10, 25, 50, 75, 100, 150, 200];

interface FixtureRow { id: string; opponent: string; fixture_date: string; kick_off_time: string | null; venue: string | null; competition: string | null; home_team: string | null; away_team: string | null }

async function fixtureFacts(env: SocialEnv, tenantId: string, r: FixtureRow): Promise<FixtureFacts> {
  return {
    id: r.id, opponent: r.opponent, opponentBadgeUrl: await opponentBadgeUrl(env, tenantId, r.opponent),
    homeAway: r.home_team && r.home_team === r.opponent && r.away_team !== r.opponent ? "away" : "home",
    date: r.fixture_date.slice(0, 10), time: r.kick_off_time, venue: r.venue, competition: r.competition,
  };
}

/**
 * Fixtures in a date range. "postponed" only returns ones changed in the last
 * week, so turning this on doesn't announce old postponements.
 */
async function fixturesBetween(env: SocialEnv, tenantId: string, from: string, to: string, status: "live" | "postponed"): Promise<FixtureRow[]> {
  const filter = status === "postponed"
    ? `status = 'postponed' AND substr(COALESCE(updated_at, ''), 1, 10) >= ?`
    : `COALESCE(status, 'scheduled') NOT IN ('postponed', 'cancelled', 'completed') AND ? = ?`;
  const { results } = await env.DB.prepare(
    `SELECT id, opponent, fixture_date, kick_off_time, venue, competition, home_team, away_team FROM fixtures
     WHERE tenant_id = ? AND substr(fixture_date, 1, 10) BETWEEN ? AND ? AND ${filter} ORDER BY fixture_date, kick_off_time LIMIT 12`,
  ).bind(tenantId, from, to, ...(status === "postponed" ? [addDays(from, -7)] : [1, 1])).all<FixtureRow>();
  return results || [];
}

async function person(env: SocialEnv, tenantId: string, playerId: string): Promise<{ name: string; photoUrl: string | null } | null> {
  const row = await env.DB.prepare(`SELECT name, COALESCE(headshot_url, photo_url) AS photo FROM squad WHERE tenant_id = ? AND id = ?`)
    .bind(tenantId, playerId).first<{ name: string; photo: string | null }>();
  return row ? { name: row.name, photoUrl: row.photo } : null;
}

/** Top player by goals ×5, assists ×3, MOTM ×10 between two times (ms). */
async function topPlayer(env: SocialEnv, tenantId: string, from: number, to: number) {
  const { results } = await env.DB.prepare(
    `SELECT player_id, SUM(event_type = 'goal') AS goals, SUM(event_type = 'assist') AS assists, SUM(event_type = 'motm') AS motm
     FROM match_events WHERE tenant_id = ? AND player_id IS NOT NULL AND created_at >= ? AND created_at < ?
     GROUP BY player_id ORDER BY SUM(event_type = 'goal') * 5 + SUM(event_type = 'assist') * 3 + SUM(event_type = 'motm') * 10 DESC LIMIT 1`,
  ).bind(tenantId, from, to).all<{ player_id: string; goals: number; assists: number; motm: number }>();
  const top = results?.[0];
  if (!top || top.goals * 5 + top.assists * 3 + top.motm * 10 === 0) return null;
  const p = await person(env, tenantId, top.player_id);
  return p ? { ...p, goals: Number(top.goals), assists: Number(top.assists), motm: Number(top.motm), playerId: top.player_id } : null;
}

type Queue = (kind: PostKind, sourceId: string, build: Parameters<typeof queueClubPost>[1]["build"], extra?: { fixtureId?: string; showsPlayers?: boolean }) => Promise<void>;

/** Everything due for one club right now. */
export async function scheduleClub(env: SocialEnv, tenantId: string, now: Date): Promise<number> {
  const t = ukTime(now);
  let queued = 0;
  const queue: Queue = async (kind, sourceId, build, extra = {}) => {
    const job = await queueClubPost(env, { tenantId, kind, sourceId, build, fixtureId: extra.fixtureId, showsPlayers: extra.showsPlayers, now: now.getTime() });
    if (job && job.postAfter >= now.getTime() - 60_000 && job.status === "pending") queued++;
  };

  // Postponements, whenever a fixture in the next month is marked postponed
  for (const r of await fixturesBetween(env, tenantId, t.date, addDays(t.date, 31), "postponed")) {
    const f = await fixtureFacts(env, tenantId, r);
    await queue("postponed", `postponed:${r.id}`, (club) => postponedPost(club.brand, f), { fixtureId: r.id });
  }
  if (t.hour >= 8) {
    for (const r of await fixturesBetween(env, tenantId, t.date, t.date, "live")) {
      const ko = r.kick_off_time && /^\d{1,2}:\d{2}/.test(r.kick_off_time) ? r.kick_off_time : null;
      if (ko && `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}` >= ko.padStart(5, "0")) continue; // too late
      const f = await fixtureFacts(env, tenantId, r);
      await queue("matchday", `matchday:${r.id}`, (club) => matchdayPost(club.brand, f), { fixtureId: r.id });
    }
    // Birthdays (no age shown)
    const { results: birthdays } = await env.DB.prepare(
      `SELECT id, name, COALESCE(headshot_url, photo_url) AS photo FROM squad WHERE tenant_id = ? AND dob IS NOT NULL AND substr(dob, 6, 5) = ?`,
    ).bind(tenantId, t.date.slice(5)).all<{ id: string; name: string; photo: string | null }>();
    for (const b of birthdays || []) {
      await queue("birthday", `birthday:${b.id}:${t.date.slice(0, 4)}`, (club, policy) => birthdayPost(club.brand, policy, { name: b.name, photoUrl: b.photo }));
    }
  }
  if (t.hour >= 18) {
    for (const r of await fixturesBetween(env, tenantId, addDays(t.date, 3), addDays(t.date, 3), "live")) {
      const f = await fixtureFacts(env, tenantId, r);
      await queue("countdown", `countdown:${r.id}:3`, (club) => countdownPost(club.brand, f, 3), { fixtureId: r.id });
    }
  }
  if (t.weekday === 1 && t.hour >= 18) {
    const end = addDays(t.date, 6);
    await queue("fixtures", `fixtures:${t.date}`, async (club) => {
      const rows = await fixturesBetween(env, tenantId, t.date, end, "live");
      if (!rows.length) return null;
      const facts = await Promise.all(rows.map((r) => fixtureFacts(env, tenantId, r)));
      return fixturesPost(club.brand, facts, `${displayDate(t.date)} – ${displayDate(end)}`);
    });
  }
  if (t.weekday === 0 && t.hour >= 19) {
    await queue("results", `results:${t.date}`, async (club) => {
      const { results } = await env.DB.prepare(
        `SELECT r.match_date, r.opponent, r.our_score, r.their_score, r.competition, f.home_team, f.away_team
         FROM team_results r LEFT JOIN fixtures f ON f.id = r.fixture_id AND f.tenant_id = r.tenant_id
         WHERE r.tenant_id = ? AND substr(r.match_date, 1, 10) BETWEEN ? AND ? ORDER BY r.match_date LIMIT 8`,
      ).bind(tenantId, addDays(t.date, -6), t.date).all<{ match_date: string; opponent: string; our_score: number; their_score: number; competition: string | null; home_team: string | null; away_team: string | null }>();
      if (!results?.length) return null;
      const facts: ResultFacts[] = await Promise.all(results.map(async (r) => ({
        date: r.match_date.slice(0, 10), opponent: r.opponent, opponentBadgeUrl: await opponentBadgeUrl(env, tenantId, r.opponent),
        homeAway: (r.home_team && r.home_team === r.opponent && r.away_team !== r.opponent ? "away" : "home") as "home" | "away",
        ourScore: Number(r.our_score), theirScore: Number(r.their_score), competition: r.competition,
      })));
      return resultsPost(club.brand, facts, "This week");
    });
  }
  if (t.weekday === 1 && t.hour >= 12) {
    await queue("table", `table:${t.date}`, async (club) => {
      const { results } = await env.DB.prepare(
        `SELECT competition, team_name, played, won, drawn, lost, goal_difference, points, position FROM league_standings
         WHERE tenant_id = ? ORDER BY competition, COALESCE(position, 999), points DESC`,
      ).bind(tenantId).all<{ competition: string; team_name: string; played: number; won: number; drawn: number; lost: number; goal_difference: number; points: number; position: number | null }>();
      if (!results?.length) return null;
      const ours = normalizeTeamName(club.clubName);
      const byComp = new Map<string, typeof results>();
      results.forEach((r) => byComp.set(r.competition, [...(byComp.get(r.competition) ?? []), r]));
      const [competition, rows] = [...byComp].find(([, rs]) => rs.some((r) => normalizeTeamName(r.team_name) === ours)) ?? [...byComp].sort((a, b) => b[1].length - a[1].length)[0];
      if (rows.length < 3) return null;
      return tablePost(club.brand, competition, rows.map((r, i) => ({
        position: r.position ?? i + 1, team: r.team_name, played: Number(r.played), won: Number(r.won), drawn: Number(r.drawn), lost: Number(r.lost),
        goalDifference: Number(r.goal_difference), points: Number(r.points), isUs: normalizeTeamName(r.team_name) === ours,
      })));
    });
  }
  if (t.weekday === 1 && t.hour >= 19) {
    await queue("player_of_week", `potw:${t.date}`, async (club, policy) => {
      const top = await topPlayer(env, tenantId, now.getTime() - 7 * 86_400_000, now.getTime());
      return top ? playerOfPeriodPost(club.brand, policy, "week", top, "") : null;
    });
  }
  if (t.date.endsWith("-01") && t.hour >= 10) {
    const prev = addDays(t.date, -1).slice(0, 7);
    await queue("player_of_month", `potm:${prev}`, async (club, policy) => {
      const from = Date.parse(`${prev}-01T00:00:00Z`);
      const top = await topPlayer(env, tenantId, from, Date.parse(`${t.date}T00:00:00Z`));
      return top ? playerOfPeriodPost(club.brand, policy, "month", top, `${MONTHS[Number(prev.slice(5, 7)) - 1]} ${prev.slice(0, 4)}`) : null;
    });
  }
  if (t.hour >= 19) await queueMilestones(env, tenantId, t, now, queue);
  if (t.weekday === 4 && t.hour >= 18) {
    await queue("throwback", `throwback:${t.date}`, async (club) => {
      const { results } = await env.DB.prepare(
        `SELECT p.url, p.caption, a.title, COALESCE(a.event_date, p.uploaded_at) AS taken FROM photos p
         LEFT JOIN albums a ON a.id = p.album_id AND a.tenant_id = p.tenant_id
         WHERE p.tenant_id = ? AND substr(COALESCE(a.event_date, p.uploaded_at), 1, 10) <= ? ORDER BY p.id LIMIT 300`,
      ).bind(tenantId, addDays(t.date, -180)).all<{ url: string; caption: string | null; title: string | null; taken: string | null }>();
      if (!results?.length) return null;
      const pick = results[Math.floor(Date.parse(t.date) / 604_800_000) % results.length];
      const month = pick.taken && /^\d{4}-\d{2}/.test(pick.taken) ? `${MONTHS[Number(pick.taken.slice(5, 7)) - 1]} ${pick.taken.slice(0, 4)}` : null;
      return throwbackPost(club.brand, pick.url, [pick.caption || pick.title, month].filter(Boolean).join(", ") || null);
    }, { showsPlayers: true });
  }
  if (t.weekday === 3 && t.hour >= 12) {
    await queue("quote", `quote:${t.date}`, (club) => quotePost(club.brand, QUOTES[Math.floor(Date.parse(t.date) / 604_800_000) % QUOTES.length]));
  }
  return queued;
}

/** Appearance and goal milestones reached in the last week. */
async function queueMilestones(env: SocialEnv, tenantId: string, t: UkTime, now: Date, queue: Queue): Promise<number> {
  const weekAgo = addDays(t.date, -7);
  const [apps, goals] = await Promise.all([
    env.DB.prepare(
      `SELECT ml.player_id, COUNT(DISTINCT ml.fixture_id) AS now_count,
              COUNT(DISTINCT CASE WHEN substr(f.fixture_date, 1, 10) <= ? THEN ml.fixture_id END) AS before_count
       FROM match_lineups ml JOIN fixtures f ON f.id = ml.fixture_id AND f.tenant_id = ml.tenant_id
       WHERE ml.tenant_id = ? AND f.status = 'completed' AND (ml.role = 'starter' OR EXISTS (
         SELECT 1 FROM live_match_events e WHERE e.tenant_id = ml.tenant_id AND e.fixture_id = ml.fixture_id AND e.type = 'sub' AND e.player_id = ml.player_id AND e.deleted_at IS NULL))
       GROUP BY ml.player_id`,
    ).bind(weekAgo, tenantId).all<{ player_id: string; now_count: number; before_count: number }>(),
    env.DB.prepare(
      `SELECT player_id, COUNT(*) AS now_count, SUM(created_at < ?) AS before_count FROM match_events
       WHERE tenant_id = ? AND event_type = 'goal' AND player_id IS NOT NULL GROUP BY player_id`,
    ).bind(now.getTime() - 7 * 86_400_000, tenantId).all<{ player_id: string; now_count: number; before_count: number }>(),
  ]);
  let n = 0;
  const check = async (rows: Array<{ player_id: string; now_count: number; before_count: number }>, marks: number[], stat: "appearances" | "goals") => {
    for (const r of rows) {
      const reached = marks.filter((m) => Number(r.before_count) < m && Number(r.now_count) >= m).pop();
      if (!reached) continue;
      const p = await person(env, tenantId, r.player_id);
      if (!p) continue;
      await queue("milestone", `milestone:${r.player_id}:${stat}:${reached}`, (club, policy) => milestonePost(club.brand, policy, p, reached, stat));
      n++;
    }
  };
  await check(apps.results || [], APPEARANCE_MILESTONES, "appearances");
  await check(goals.results || [], GOAL_MILESTONES, "goals");
  return n;
}

/** Run the schedule for every live club. One club's problem never stops the others. */
export async function runScheduledPosts(env: SocialEnv, now: Date = new Date()): Promise<number> {
  const { results } = await env.DB.prepare(`SELECT id FROM tenants WHERE status IN ('trial', 'active')`).all<{ id: string }>();
  let queued = 0;
  for (const { id } of results || []) {
    try {
      queued += await scheduleClub(env, id, now);
    } catch (err) {
      console.log(JSON.stringify({ event: "scheduled_posts", outcome: "failed", tenant: id, error: err instanceof Error ? err.message : String(err) }));
    }
  }
  if (queued) console.log(JSON.stringify({ event: "scheduled_posts", outcome: "queued", count: queued }));
  return queued;
}
