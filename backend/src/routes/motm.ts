/**
 * Man of the Match voting.
 *
 * Staff:   open a vote with 2-15 nominees and a closing time, see the tally,
 *          close it (stores the winner and adds the award to player stats).
 * Members: see open votes, vote for one nominee (can change until it closes),
 *          see the result once voting has closed.
 * Public:  the latest winner is on the club page (see routes/public.ts).
 */
import { json } from "../services/util";
import { requireStaff, requireTenantJWT, hasAnyRole, STAFF_ROLES, type TenantClaims } from "../services/auth";
import {
  closeExpiredSessions,
  closeSession,
  findMatch,
  getNominees,
  getSession,
  getTally,
  isVotingOpen,
  parseWinnerIds,
  playerNames,
  type MotmSessionRow,
} from "../services/motm";

const MIN_NOMINEES = 2;
const MAX_NOMINEES = 15;
const DEFAULT_VOTING_HOURS = 48;

type Env = { DB: D1Database; [key: string]: unknown };

function fail(corsHdrs: Headers, status: number, code: string, message: string): Response {
  return json({ success: false, error: { code, message } }, status, corsHdrs);
}

/** Resolve the caller or return the 401/403 response to send. */
async function authenticate(req: Request, env: Env, corsHdrs: Headers, staff: boolean): Promise<TenantClaims | Response> {
  try {
    return staff ? await requireStaff(req, env) : await requireTenantJWT(req, env);
  } catch (err) {
    const status = err instanceof Response ? err.status : 401;
    return status === 403
      ? fail(corsHdrs, 403, "FORBIDDEN", staff ? "Only club staff can run Man of the Match votes." : "You don't have access to this club.")
      : fail(corsHdrs, 401, "UNAUTHORIZED", "Please log in again.");
  }
}

function internalError(corsHdrs: Headers, where: string, err: unknown): Response {
  console.error(JSON.stringify({ level: "error", msg: "motm_error", where, error: err instanceof Error ? err.message : String(err) }));
  return fail(corsHdrs, 500, "INTERNAL", "Something went wrong with Man of the Match. Please try again.");
}

function toIso(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

function nomineeIds(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const ids = raw
    .map((n) => (typeof n === "string" ? n : n && typeof n === "object" ? (n as Record<string, unknown>).playerId ?? (n as Record<string, unknown>).candidateId : null))
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  return [...new Set(ids)];
}

/** Everything a member needs to show one vote. Live counts only for staff or after closing. */
async function describeVote(env: Env, claims: TenantClaims, session: MotmSessionRow) {
  const isStaff = hasAnyRole(claims, STAFF_ROLES);
  const [match, nominees, userVote] = await Promise.all([
    findMatch(env, claims.tenantId, session.match_id),
    getNominees(env, claims.tenantId, session.match_id),
    claims.userId
      ? env.DB.prepare(`SELECT player_id FROM motm_votes WHERE tenant_id = ? AND match_id = ? AND user_id = ?`)
          .bind(claims.tenantId, session.match_id, claims.userId).first<{ player_id: string }>()
      : Promise.resolve(null),
  ]);
  const closed = session.status === "closed";
  const tally = closed || isStaff ? await getTally(env, claims.tenantId, session.match_id) : null;
  const winnerIds = parseWinnerIds(session.winner_player_ids);
  return {
    matchId: session.match_id,
    match,
    status: session.status,
    votingOpen: isVotingOpen(session),
    opensAt: session.voting_start_at,
    closesAt: session.voting_end_at,
    nominees,
    userVote: userVote?.player_id ?? null,
    winners: closed ? nominees.filter((n) => winnerIds.includes(n.playerId)) : [],
    results: tally,
    totalVotes: tally ? tally.reduce((sum, r) => sum + r.vote_count, 0) : null,
  };
}

/** GET /api/v1/motm/open - votes members can take part in, plus the last few winners. */
export async function handleListOpenVotes(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await authenticate(req, env, corsHdrs, false);
  if (claims instanceof Response) return claims;
  try {
    await closeExpiredSessions(env, claims.tenantId);
    const { results } = await env.DB.prepare(
      `SELECT * FROM motm_sessions WHERE tenant_id = ? AND status IN ('active', 'closed')
       ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, COALESCE(closed_at, voting_start_at) DESC LIMIT 20`,
    ).bind(claims.tenantId).all<MotmSessionRow>();
    const sessions = results || [];
    const open = sessions.filter((s) => isVotingOpen(s));
    const recent = sessions.filter((s) => s.status === "closed" && parseWinnerIds(s.winner_player_ids).length > 0).slice(0, 3);
    const [openVotes, recentWinners] = await Promise.all([
      Promise.all(open.map((s) => describeVote(env, claims, s))),
      Promise.all(recent.map((s) => describeVote(env, claims, s))),
    ]);
    return json({ success: true, data: { open: openVotes, recent: recentWinners } }, 200, corsHdrs);
  } catch (err) {
    return internalError(corsHdrs, "list_open", err);
  }
}

/** GET /api/v1/motm/:matchId - one vote. */
export async function handleInitVote(req: Request, env: Env, corsHdrs: Headers, matchId: string): Promise<Response> {
  const claims = await authenticate(req, env, corsHdrs, false);
  if (claims instanceof Response) return claims;
  try {
    await closeExpiredSessions(env, claims.tenantId);
    const session = await getSession(env, claims.tenantId, matchId);
    if (!session) {
      const match = await findMatch(env, claims.tenantId, matchId);
      if (!match) return fail(corsHdrs, 404, "NOT_FOUND", "Match not found.");
      return json({ success: true, data: { matchId, match, status: "draft", votingOpen: false, nominees: [], userVote: null, winners: [], results: null, totalVotes: null } }, 200, corsHdrs);
    }
    return json({ success: true, data: await describeVote(env, claims, session) }, 200, corsHdrs);
  } catch (err) {
    return internalError(corsHdrs, "get_vote", err);
  }
}

/** POST /api/v1/matches/:matchId/motm/vote { candidateId } */
export async function handleCastVote(req: Request, env: Env, corsHdrs: Headers, matchId: string): Promise<Response> {
  const claims = await authenticate(req, env, corsHdrs, false);
  if (claims instanceof Response) return claims;
  if (!claims.userId) return fail(corsHdrs, 401, "UNAUTHORIZED", "Sign in to vote.");
  try {
    const body = (await req.json().catch(() => ({}))) as { candidateId?: unknown; playerId?: unknown };
    const candidateId = typeof body.candidateId === "string" ? body.candidateId : typeof body.playerId === "string" ? body.playerId : "";
    if (!candidateId) return fail(corsHdrs, 400, "VALIDATION", "Choose a player to vote for.");

    const session = await getSession(env, claims.tenantId, matchId);
    if (!session || session.status === "draft") return fail(corsHdrs, 400, "VOTING_NOT_OPEN", "Voting isn't open for this match.");
    if (!isVotingOpen(session)) {
      if (session.status === "active" && session.voting_end_at && Date.parse(session.voting_end_at) <= Date.now()) {
        await closeSession(env, claims.tenantId, matchId);
      }
      const notStarted = session.status === "active" && session.voting_start_at && Date.parse(session.voting_start_at) > Date.now();
      return notStarted
        ? fail(corsHdrs, 400, "VOTING_NOT_OPEN", "Voting hasn't started yet.")
        : fail(corsHdrs, 400, "VOTING_CLOSED", "Voting has closed for this match.");
    }

    const nominee = await env.DB.prepare(`SELECT 1 AS ok FROM motm_nominees WHERE tenant_id = ? AND match_id = ? AND player_id = ?`)
      .bind(claims.tenantId, matchId, candidateId).first();
    if (!nominee) return fail(corsHdrs, 400, "NOT_A_NOMINEE", "That player isn't one of the nominees.");

    await env.DB.prepare(
      `INSERT INTO motm_votes (id, tenant_id, match_id, player_id, user_id, voted_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(match_id, user_id) DO UPDATE SET player_id = excluded.player_id, voted_at = excluded.voted_at`,
    ).bind(crypto.randomUUID(), claims.tenantId, matchId, candidateId, claims.userId, Date.now()).run();

    return json({ success: true, data: { matchId, userVote: candidateId } }, 200, corsHdrs);
  } catch (err) {
    return internalError(corsHdrs, "cast_vote", err);
  }
}

/** GET /api/v1/motm/:matchId/results - members see it once voting has closed; staff any time. */
export async function handleGetResults(req: Request, env: Env, corsHdrs: Headers, matchId: string): Promise<Response> {
  const claims = await authenticate(req, env, corsHdrs, false);
  if (claims instanceof Response) return claims;
  try {
    await closeExpiredSessions(env, claims.tenantId);
    const session = await getSession(env, claims.tenantId, matchId);
    if (!session) return fail(corsHdrs, 404, "NOT_FOUND", "There's no Man of the Match vote for this match.");
    if (session.status !== "closed" && !hasAnyRole(claims, STAFF_ROLES)) {
      return fail(corsHdrs, 403, "RESULTS_HIDDEN", "Results are shown when voting closes.");
    }
    const results = await getTally(env, claims.tenantId, matchId);
    const winnerIds = session.status === "closed" ? parseWinnerIds(session.winner_player_ids) : [];
    return json({
      success: true,
      data: { status: session.status, results, totalVotes: results.reduce((sum, r) => sum + r.vote_count, 0), winners: winnerIds },
    }, 200, corsHdrs);
  } catch (err) {
    return internalError(corsHdrs, "results", err);
  }
}

/**
 * POST /api/v1/admin/matches/:matchId/motm/open
 * { nominees: string[], votingWindow?: { start?, end? }, status?: 'active'|'draft', autoPostEnabled? }
 * Nominees can be left out to keep the ones already chosen (e.g. activating a draft).
 */
export async function handleOpenVoting(req: Request, env: Env, corsHdrs: Headers, matchId: string): Promise<Response> {
  const claims = await authenticate(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  try {
    const body = (await req.json().catch(() => ({}))) as {
      nominees?: unknown;
      votingWindow?: { start?: unknown; end?: unknown };
      status?: unknown;
      autoPostEnabled?: unknown;
    };
    const match = await findMatch(env, claims.tenantId, matchId);
    if (!match) return fail(corsHdrs, 404, "NOT_FOUND", "Match not found.");

    const status = body.status === "draft" ? "draft" : "active";
    const start = toIso(body.votingWindow?.start) ?? new Date().toISOString();
    const end = toIso(body.votingWindow?.end) ?? new Date(Date.parse(start) + DEFAULT_VOTING_HOURS * 3600_000).toISOString();
    if (Date.parse(end) <= Date.parse(start)) {
      return fail(corsHdrs, 400, "VALIDATION", "Voting must close after it opens.");
    }

    let ids = nomineeIds(body.nominees);
    if (ids !== null) {
      if (ids.length > MAX_NOMINEES) return fail(corsHdrs, 400, "VALIDATION", `Pick up to ${MAX_NOMINEES} nominees.`);
      if (ids.length) {
        const found = await playerNames(env, claims.tenantId, ids);
        if (found.size !== ids.length) return fail(corsHdrs, 400, "VALIDATION", "Some nominees aren't in your squad.");
      }
    } else {
      ids = (await getNominees(env, claims.tenantId, matchId)).map((n) => n.playerId);
    }
    if (status === "active" && ids.length < MIN_NOMINEES) {
      return fail(corsHdrs, 400, "VALIDATION", `Pick at least ${MIN_NOMINEES} nominees before opening the vote.`);
    }

    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO motm_sessions (match_id, tenant_id, status, voting_start_at, voting_end_at, auto_post, winner_player_ids, closed_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?)
         ON CONFLICT(match_id) DO UPDATE SET
           status = excluded.status, voting_start_at = excluded.voting_start_at, voting_end_at = excluded.voting_end_at,
           auto_post = excluded.auto_post, winner_player_ids = NULL, closed_at = NULL, updated_at = excluded.updated_at
         WHERE motm_sessions.tenant_id = excluded.tenant_id`,
      ).bind(matchId, claims.tenantId, status, start, end, body.autoPostEnabled === false ? 0 : 1, now),
      env.DB.prepare(`DELETE FROM motm_nominees WHERE tenant_id = ? AND match_id = ?`).bind(claims.tenantId, matchId),
      ...ids.map((playerId) =>
        env.DB.prepare(`INSERT INTO motm_nominees (tenant_id, match_id, player_id) VALUES (?, ?, ?)`).bind(claims.tenantId, matchId, playerId),
      ),
    ]);

    // Another club can't take over this match id
    const session = await getSession(env, claims.tenantId, matchId);
    if (!session) return fail(corsHdrs, 409, "CONFLICT", "This match can't be used for a vote.");

    return json({ success: true, data: await describeVote(env, claims, session) }, 200, corsHdrs);
  } catch (err) {
    return internalError(corsHdrs, "open", err);
  }
}

/** POST /api/v1/admin/matches/:matchId/motm/close - stores the winner(s). Safe to repeat. */
export async function handleCloseVoting(req: Request, env: Env, corsHdrs: Headers, matchId: string): Promise<Response> {
  const claims = await authenticate(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  try {
    const session = await getSession(env, claims.tenantId, matchId);
    if (!session) return fail(corsHdrs, 404, "NOT_FOUND", "There's no Man of the Match vote for this match.");
    const winnerIds = session.status === "closed" ? parseWinnerIds(session.winner_player_ids) : await closeSession(env, claims.tenantId, matchId);
    const names = await playerNames(env, claims.tenantId, winnerIds);
    return json({ success: true, data: { winners: winnerIds.map((id) => names.get(id)).filter(Boolean) } }, 200, corsHdrs);
  } catch (err) {
    return internalError(corsHdrs, "close", err);
  }
}

/** GET /api/v1/admin/matches/:matchId/motm/tally */
export async function handleGetTally(req: Request, env: Env, corsHdrs: Headers, matchId: string): Promise<Response> {
  const claims = await authenticate(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  return handleGetResults(req, env, corsHdrs, matchId);
}

/** GET /api/v1/admin/motm/sessions - every vote for the club with match, counts and winners. */
export async function handleListMotmSessions(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await authenticate(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  try {
    await closeExpiredSessions(env, claims.tenantId);
    const { results } = await env.DB.prepare(
      `SELECT s.*,
         (SELECT COUNT(*) FROM motm_votes v WHERE v.tenant_id = s.tenant_id AND v.match_id = s.match_id) AS vote_count,
         (SELECT COUNT(*) FROM motm_nominees n WHERE n.tenant_id = s.tenant_id AND n.match_id = s.match_id) AS nominee_count
       FROM motm_sessions s WHERE s.tenant_id = ? ORDER BY s.created_at DESC LIMIT 50`,
    ).bind(claims.tenantId).all<MotmSessionRow & { vote_count: number; nominee_count: number }>();
    const sessions = results || [];
    const allWinnerIds = [...new Set(sessions.flatMap((s) => parseWinnerIds(s.winner_player_ids)))];
    const [names, matches] = await Promise.all([
      playerNames(env, claims.tenantId, allWinnerIds),
      Promise.all(sessions.map((s) => findMatch(env, claims.tenantId, s.match_id))),
    ]);
    const data = sessions.map((s, i) => ({
      ...s,
      opponent: matches[i]?.opponent ?? null,
      date: matches[i]?.date ?? null,
      votingOpen: isVotingOpen(s),
      winners: parseWinnerIds(s.winner_player_ids).map((id) => names.get(id)?.name).filter(Boolean),
    }));
    return json({ success: true, data }, 200, corsHdrs);
  } catch (err) {
    return internalError(corsHdrs, "list_sessions", err);
  }
}
