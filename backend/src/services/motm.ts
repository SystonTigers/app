import { loadFixture } from "./liveMatch";
import { getJobBySource, postPerson, queuePost, type JobSummary } from "./social/jobs";

/**
 * Man of the Match: data helpers shared by the MOTM routes and the public
 * club page. Every query is scoped to one club (tenant_id).
 *
 * A vote ("session") is keyed by match id. Staff pick nominees, members vote
 * for one nominee (and can change their mind while voting is open), and
 * closing the vote stores the winner(s). A vote whose closing time has passed
 * is closed the next time anyone looks at it, so a missed "Close" still ends
 * with a winner.
 */

export interface MotmMatch {
  id: string;
  opponent: string;
  date: string;
  ourScore: number | null;
  theirScore: number | null;
}

export interface MotmNominee {
  playerId: string;
  name: string;
  number: number | null;
  photoUrl: string | null;
}

export interface MotmTallyRow {
  player_id: string;
  player_name: string | null;
  vote_count: number;
}

export interface MotmSessionRow {
  match_id: string;
  tenant_id: string;
  status: "draft" | "active" | "closed";
  voting_start_at: string | null;
  voting_end_at: string | null;
  auto_post: number | null;
  winner_player_ids: string | null;
  closed_at: string | null;
  created_at: string | null;
}

type DB = { DB: D1Database };

/** Find a match in fixtures, then recorded results. */
export async function findMatch(env: DB, tenantId: string, matchId: string): Promise<MotmMatch | null> {
  const fixture = await env.DB.prepare(
    `SELECT id, opponent, fixture_date AS date, home_score, away_score FROM fixtures WHERE tenant_id = ? AND id = ?`,
  ).bind(tenantId, matchId).first<{ id: string; opponent: string; date: string; home_score: number | null; away_score: number | null }>();
  if (fixture) {
    return { id: String(fixture.id), opponent: fixture.opponent, date: fixture.date, ourScore: fixture.home_score, theirScore: fixture.away_score };
  }
  const result = await env.DB.prepare(
    `SELECT id, opponent, match_date AS date, our_score, their_score FROM team_results WHERE tenant_id = ? AND id = ?`,
  ).bind(tenantId, matchId).first<{ id: number; opponent: string; date: string; our_score: number; their_score: number }>();
  if (result) {
    return { id: String(result.id), opponent: result.opponent, date: result.date, ourScore: result.our_score, theirScore: result.their_score };
  }
  return null;
}

export async function getSession(env: DB, tenantId: string, matchId: string): Promise<MotmSessionRow | null> {
  return env.DB.prepare(`SELECT * FROM motm_sessions WHERE tenant_id = ? AND match_id = ?`)
    .bind(tenantId, matchId).first<MotmSessionRow>();
}

export async function getNominees(env: DB, tenantId: string, matchId: string): Promise<MotmNominee[]> {
  const { results } = await env.DB.prepare(
    `SELECT n.player_id, s.name, s.number, COALESCE(s.headshot_url, s.photo_url) AS photo_url
     FROM motm_nominees n
     JOIN squad s ON s.id = n.player_id AND s.tenant_id = n.tenant_id
     WHERE n.tenant_id = ? AND n.match_id = ?
     ORDER BY s.number IS NULL, s.number, s.name`,
  ).bind(tenantId, matchId).all<{ player_id: string; name: string; number: number | null; photo_url: string | null }>();
  return (results || []).map((r) => ({ playerId: r.player_id, name: r.name, number: r.number, photoUrl: r.photo_url }));
}

export async function getTally(env: DB, tenantId: string, matchId: string): Promise<MotmTallyRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT v.player_id, s.name AS player_name, COUNT(*) AS vote_count
     FROM motm_votes v
     LEFT JOIN squad s ON s.id = v.player_id AND s.tenant_id = v.tenant_id
     WHERE v.tenant_id = ? AND v.match_id = ?
     GROUP BY v.player_id
     ORDER BY vote_count DESC, player_name`,
  ).bind(tenantId, matchId).all<MotmTallyRow>();
  return results || [];
}

/** Everyone on the top vote count wins (a tie gives joint winners). No votes, no winner. */
export function winnersFrom(tally: MotmTallyRow[]): string[] {
  const top = tally.reduce((max, row) => Math.max(max, row.vote_count), 0);
  return top > 0 ? tally.filter((row) => row.vote_count === top).map((row) => row.player_id) : [];
}

export function parseWinnerIds(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/** True while members can vote: active, started, and not past its closing time. */
export function isVotingOpen(session: Pick<MotmSessionRow, "status" | "voting_start_at" | "voting_end_at">, now = Date.now()): boolean {
  if (session.status !== "active") return false;
  const start = session.voting_start_at ? Date.parse(session.voting_start_at) : NaN;
  const end = session.voting_end_at ? Date.parse(session.voting_end_at) : NaN;
  if (!Number.isNaN(start) && start > now) return false;
  return Number.isNaN(end) || end > now;
}

/**
 * Open (or re-open) a vote with these nominees. Returns false if another club
 * already has a vote on this match id.
 */
export async function openVote(env: DB, tenantId: string, matchId: string, args: {
  nominees: string[]; status: "active" | "draft"; start: string; end: string; autoPost: boolean;
}): Promise<boolean> {
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO motm_sessions (match_id, tenant_id, status, voting_start_at, voting_end_at, auto_post, winner_player_ids, closed_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?)
       ON CONFLICT(match_id) DO UPDATE SET
         status = excluded.status, voting_start_at = excluded.voting_start_at, voting_end_at = excluded.voting_end_at,
         auto_post = excluded.auto_post, winner_player_ids = NULL, closed_at = NULL, updated_at = excluded.updated_at
       WHERE motm_sessions.tenant_id = excluded.tenant_id`,
    ).bind(matchId, tenantId, args.status, args.start, args.end, args.autoPost ? 1 : 0, now),
    env.DB.prepare(`DELETE FROM motm_nominees WHERE tenant_id = ? AND match_id = ?`).bind(tenantId, matchId),
    ...args.nominees.map((playerId) =>
      env.DB.prepare(`INSERT INTO motm_nominees (tenant_id, match_id, player_id) VALUES (?, ?, ?)`).bind(tenantId, matchId, playerId),
    ),
  ]);
  return !!(await getSession(env, tenantId, matchId));
}

/** The automatic post announcing the winner(s), if the club posts MOTM results. */
export async function queueMotmPost(env: DB, tenantId: string, matchId: string, winnerIds: string[]): Promise<JobSummary | null> {
  if (!winnerIds.length) return null;
  const [fixture, match, first, second] = await Promise.all([
    loadFixture(env, tenantId, matchId),
    findMatch(env, tenantId, matchId),
    postPerson(env, tenantId, winnerIds[0], null),
    winnerIds[1] ? postPerson(env, tenantId, winnerIds[1], null) : Promise.resolve(null),
  ]);
  if (!match) return null;
  return queuePost(env, {
    tenantId,
    fixtureId: fixture ? matchId : null,
    sourceType: "motm",
    sourceId: matchId,
    match: {
      opponent: match.opponent,
      homeAway: fixture?.homeAway ?? "home",
      ourScore: match.ourScore ?? 0,
      theirScore: match.theirScore ?? 0,
      competition: fixture?.competition ?? null,
    },
    input: { kind: "motm", minute: null, player: first, player2: second },
  });
}

/**
 * Close a vote and store the winner(s). Safe to run twice: votes can't change
 * once closed, and the MOTM award is only added to player stats once.
 */
export async function closeSession(env: DB, tenantId: string, matchId: string): Promise<string[]> {
  const winners = winnersFrom(await getTally(env, tenantId, matchId));
  const now = new Date().toISOString();
  const statements = [
    env.DB.prepare(
      `UPDATE motm_sessions SET status = 'closed', winner_player_ids = ?, closed_at = COALESCE(closed_at, ?), updated_at = ?
       WHERE tenant_id = ? AND match_id = ?`,
    ).bind(JSON.stringify(winners), now, now, tenantId, matchId),
    // Counts towards "MOM Awards" in player and career stats
    ...winners.map((playerId) =>
      env.DB.prepare(
        `INSERT INTO match_events (id, tenant_id, fixture_id, player_id, event_type, minute, created_at)
         SELECT ?, ?, ?, ?, 'motm', NULL, ?
         WHERE NOT EXISTS (
           SELECT 1 FROM match_events WHERE tenant_id = ? AND fixture_id = ? AND player_id = ? AND event_type = 'motm'
         )`,
      ).bind(crypto.randomUUID(), tenantId, matchId, playerId, Date.now(), tenantId, matchId, playerId),
    ),
  ];
  const alreadyClosed = await env.DB.prepare(`SELECT status FROM motm_sessions WHERE tenant_id = ? AND match_id = ?`)
    .bind(tenantId, matchId).first<{ status: string }>();
  await env.DB.batch(statements);
  // Announce the winner (once). A failed post must not stop the vote closing.
  if (alreadyClosed?.status !== "closed") {
    try {
      await queueMotmPost(env, tenantId, matchId, winners);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", msg: "motm_post_failed", matchId, error: err instanceof Error ? err.message : String(err) }));
    }
  }
  return winners;
}

export { getJobBySource };

/** Close any of this club's votes whose closing time has passed. */
export async function closeExpiredSessions(env: DB, tenantId: string, now = Date.now()): Promise<void> {
  const { results } = await env.DB.prepare(
    `SELECT match_id, status, voting_start_at, voting_end_at FROM motm_sessions
     WHERE tenant_id = ? AND status = 'active' AND voting_end_at IS NOT NULL`,
  ).bind(tenantId).all<Pick<MotmSessionRow, "match_id" | "status" | "voting_start_at" | "voting_end_at">>();
  const expired = (results || []).filter((s) => {
    const end = Date.parse(String(s.voting_end_at));
    return !Number.isNaN(end) && end <= now;
  });
  for (const session of expired) {
    await closeSession(env, tenantId, session.match_id);
  }
}

/** Squad names for a list of player ids (one query). */
export async function playerNames(env: DB, tenantId: string, ids: string[]): Promise<Map<string, MotmNominee>> {
  const map = new Map<string, MotmNominee>();
  if (!ids.length) return map;
  const { results } = await env.DB.prepare(
    `SELECT id, name, number, COALESCE(headshot_url, photo_url) AS photo_url FROM squad
     WHERE tenant_id = ? AND id IN (${ids.map(() => "?").join(",")})`,
  ).bind(tenantId, ...ids).all<{ id: string; name: string; number: number | null; photo_url: string | null }>();
  for (const r of results || []) map.set(r.id, { playerId: r.id, name: r.name, number: r.number, photoUrl: r.photo_url });
  return map;
}
