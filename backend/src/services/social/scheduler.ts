/**
 * Scheduled club posts, run on the 5-minute cron. Each post has a time window
 * (UK time); the first run inside the window queues it, and its source id
 * (e.g. "fixtures:2026-09-29") stops it being posted twice. If the Worker
 * misses a slot the post still goes out later the same day.
 *
 * Mon 18:00 fixtures · Mon 12:00 table · Mon 19:00 player of the week
 * Sun 19:00 results · 1st 10:00 player of the month · Wed 12:00 quote
 * Thu 18:00 throwback · daily 08:00 birthdays and match day · 18:00 countdown
 * (3 days before) · 19:00 milestones · postponements whenever they happen ·
 * monthly round-ups on the 1st (roundups.ts).
 */
import { normalizeTeamName } from "../opponentBadges";
import { publicPhotoSql } from "../consent";
import { guessOurTeam } from "../league/table";
import { forPosting, type SocialEnv } from "./club";
import {
  birthdayPost, countdownPost, fixturesPost, matchdayPost, milestonePost, playerOfPeriodPost, postponedPost, QUOTES, quotePost,
  resultsPost, tablePost, throwbackPost,
} from "./clubPosts";
import { displayDate, type PostKind } from "./content";
import { queueClubPost } from "./jobs";
import { queueRoundups } from "./roundups";
import { addDays, fixtureFacts, fixturesBetween, monthLabel, person, resultsBetween, topPlayer, ukTime, type UkTime } from "./scheduleData";

export { addDays, ukTime } from "./scheduleData";

const APPEARANCE_MILESTONES = [10, 25, 50, 75, 100, 150, 200, 250, 300];
const GOAL_MILESTONES = [10, 25, 50, 75, 100, 150, 200];

export type Queue = (kind: PostKind, sourceId: string, build: Parameters<typeof queueClubPost>[1]["build"], extra?: { fixtureId?: string; showsPlayers?: boolean }) => Promise<void>;

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
    await queue("postponed", `postponed:${r.id}`, (club) => postponedPost(club.brand, forPosting(club, f)), { fixtureId: r.id });
  }
  if (t.hour >= 8) {
    for (const r of await fixturesBetween(env, tenantId, t.date, t.date, "live")) {
      const ko = r.kick_off_time && /^\d{1,2}:\d{2}/.test(r.kick_off_time) ? r.kick_off_time : null;
      if (ko && `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}` >= ko.padStart(5, "0")) continue; // too late
      const f = await fixtureFacts(env, tenantId, r);
      await queue("matchday", `matchday:${r.id}`, (club) => matchdayPost(club.brand, forPosting(club, f)), { fixtureId: r.id });
    }
    // Birthdays (no age shown)
    const { results: birthdays } = await env.DB.prepare(
      `SELECT id, name, ${publicPhotoSql()} AS photo FROM squad WHERE tenant_id = ? AND dob IS NOT NULL AND substr(dob, 6, 5) = ?`,
    ).bind(tenantId, t.date.slice(5)).all<{ id: string; name: string; photo: string | null }>();
    for (const b of birthdays || []) {
      await queue("birthday", `birthday:${b.id}:${t.date.slice(0, 4)}`, (club, policy) => birthdayPost(club.brand, policy, { name: b.name, photoUrl: b.photo }));
    }
  }
  if (t.hour >= 18) {
    for (const r of await fixturesBetween(env, tenantId, addDays(t.date, 3), addDays(t.date, 3), "live")) {
      const f = await fixtureFacts(env, tenantId, r);
      await queue("countdown", `countdown:${r.id}:3`, (club) => countdownPost(club.brand, forPosting(club, f), 3), { fixtureId: r.id });
    }
  }
  if (t.weekday === 1 && t.hour >= 18) {
    const end = addDays(t.date, 6);
    await queue("fixtures", `fixtures:${t.date}`, async (club) => {
      const rows = await fixturesBetween(env, tenantId, t.date, end, "live");
      if (!rows.length) return null;
      const facts = await Promise.all(rows.map((r) => fixtureFacts(env, tenantId, r)));
      return fixturesPost(club.brand, facts.map((f) => forPosting(club, f)), `${displayDate(t.date)} – ${displayDate(end)}`);
    });
  }
  if (t.weekday === 0 && t.hour >= 19) {
    await queue("results", `results:${t.date}`, async (club) => {
      const facts = await resultsBetween(env, tenantId, addDays(t.date, -6), t.date);
      if (!facts.length) return null;
      return resultsPost(club.brand, facts, "This week");
    });
  }
  if (t.weekday === 1 && t.hour >= 12) {
    await queue("table", `table:${t.date}`, async (club) => {
      const { results } = await env.DB.prepare(
        `SELECT competition, team_name, played, won, drawn, lost, goals_for, goals_against, goal_difference, points, position FROM league_standings
         WHERE tenant_id = ? ORDER BY competition, COALESCE(position, 999), points DESC`,
      ).bind(tenantId).all<{ competition: string; team_name: string; played: number; won: number; drawn: number; lost: number; goals_for: number; goals_against: number; goal_difference: number | null; points: number; position: number | null }>();
      if (!results?.length) return null;
      // Our name in the league ("Syston Town Juniors U18 Tigers") can differ from the club's name
      const league = await env.DB.prepare(`SELECT our_team FROM league_settings WHERE tenant_id = ?`).bind(tenantId).first<{ our_team: string | null }>();
      const leagueName = league?.our_team || guessOurTeam(results.map((r) => r.team_name), club.clubName);
      const ours = normalizeTeamName(leagueName || club.clubName);
      const byComp = new Map<string, typeof results>();
      results.forEach((r) => byComp.set(r.competition, [...(byComp.get(r.competition) ?? []), r]));
      const [competition, rows] = [...byComp].find(([, rs]) => rs.some((r) => normalizeTeamName(r.team_name) === ours)) ?? [...byComp].sort((a, b) => b[1].length - a[1].length)[0];
      if (rows.length < 3) return null;
      return tablePost(club.brand, competition, rows.map((r, i) => ({
        position: r.position ?? i + 1, team: r.team_name, played: Number(r.played), won: Number(r.won), drawn: Number(r.drawn), lost: Number(r.lost),
        goalDifference: r.goal_difference ?? Number(r.goals_for) - Number(r.goals_against), points: Number(r.points), isUs: normalizeTeamName(r.team_name) === ours,
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
      return top ? playerOfPeriodPost(club.brand, policy, "month", top, monthLabel(prev)) : null;
    });
  }
  if (t.hour >= 19) await queueMilestones(env, tenantId, t, now, queue);
  await queueRoundups(env, tenantId, t, now, queue);
  if (t.weekday === 4 && t.hour >= 18) {
    // Only gallery photos staff ticked for Throwback Thursday, from at least six months ago
    await queue("throwback", `throwback:${t.date}`, async (club) => {
      const { results } = await env.DB.prepare(
        `SELECT p.url, p.caption, a.title, COALESCE(a.event_date, p.uploaded_at) AS taken FROM photos p
         LEFT JOIN albums a ON a.id = p.album_id AND a.tenant_id = p.tenant_id
         WHERE p.tenant_id = ? AND p.tags LIKE '%"throwback"%'
           AND substr(COALESCE(a.event_date, p.uploaded_at), 1, 10) <= ? ORDER BY p.id LIMIT 300`,
      ).bind(tenantId, addDays(t.date, -180)).all<{ url: string; caption: string | null; title: string | null; taken: string | null }>();
      if (!results?.length) return null;
      const pick = results[Math.floor(Date.parse(t.date) / 604_800_000) % results.length];
      const month = pick.taken && /^\d{4}-\d{2}/.test(pick.taken) ? monthLabel(pick.taken.slice(0, 7)) : null;
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
