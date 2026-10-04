/**
 * Goal of the Month: staff nominate goals from a month, members vote once,
 * staff close the vote and the winner is posted.
 *
 *   GET  /api/v1/gotm[?votingId=]        members: the open vote (or the given one) and recent winners
 *   GET  /api/v1/gotm/goals?month=       staff: the month's goals to nominate (YYYY-MM)
 *   POST /api/v1/gotm/start              staff: open a vote { month: "YYYY-MM", goals: [...] }
 *   POST /api/v1/gotm/vote               members: { votingId, candidateId }, one vote each
 *   POST /api/v1/gotm/close              staff: { votingId }, queues the winner post
 */
import { json } from "../services/util";
import { requireStaff, requireTenantJWT, type TenantClaims } from "../services/auth";
import { readMonth, readNewVote } from "../services/gotm/rules";
import { castVote, closeVote, loadVotes, monthGoals, openVote, voterId, winnerFacts } from "../services/gotm/store";
import { gotmWinnerPost } from "../services/social/clubPosts";
import { queueClubPost } from "../services/social/jobs";
import type { SocialEnv } from "../services/social/club";

type Env = SocialEnv;

function fail(corsHdrs: Headers, status: number, code: string, message: string): Response {
  return json({ success: false, error: { code, message } }, status, corsHdrs);
}

async function who(req: Request, env: Env, corsHdrs: Headers, staff: boolean): Promise<TenantClaims | Response> {
  try {
    return staff ? await requireStaff(req, env) : await requireTenantJWT(req, env);
  } catch (err) {
    const status = err instanceof Response ? err.status : 401;
    return status === 403 ? fail(corsHdrs, 403, "FORBIDDEN", "Only club staff can run Goal of the Month.") : fail(corsHdrs, 401, "UNAUTHORIZED", "Please log in again.");
  }
}

async function body(req: Request): Promise<Record<string, unknown>> {
  const parsed = await req.json().catch(() => null);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
}

function log(outcome: string, tenant: string, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ event: "gotm", outcome, tenant, ...extra }));
}

export async function handleGetGOTMVoting(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await who(req, env, corsHdrs, false);
  if (claims instanceof Response) return claims;
  const votingId = new URL(req.url).searchParams.get("votingId");
  return json({ success: true, data: await loadVotes(env, claims, votingId && votingId.length <= 100 ? votingId : null) }, 200, corsHdrs);
}

export async function handleGOTMGoals(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await who(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  const when = readMonth(new URL(req.url).searchParams.get("month"), null);
  if (!when) return fail(corsHdrs, 400, "VALIDATION", "Choose a month (YYYY-MM).");
  return json({ success: true, data: { goals: await monthGoals(env, claims.tenantId, when.month, when.year) } }, 200, corsHdrs);
}

export async function handleStartGOTMVoting(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await who(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  const vote = readNewVote(await body(req));
  if (typeof vote === "string") return fail(corsHdrs, 400, "VALIDATION", vote);
  const opened = await openVote(env, claims.tenantId, vote);
  if ("problem" in opened) return fail(corsHdrs, 409, "NOT_NOW", opened.problem);
  log("opened", claims.tenantId, { votingId: opened.id, goals: vote.goals.length });
  return json({ success: true, data: { votingId: opened.id } }, 201, corsHdrs);
}

export async function handleCastGOTMVote(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await who(req, env, corsHdrs, false);
  if (claims instanceof Response) return claims;
  const b = await body(req);
  const votingId = typeof b.votingId === "string" ? b.votingId : "";
  const candidateId = typeof b.candidateId === "string" ? b.candidateId : "";
  const voter = voterId(claims);
  if (!votingId || !candidateId || !voter) return fail(corsHdrs, 400, "VALIDATION", "Choose a goal to vote for.");
  const outcome = await castVote(env, claims.tenantId, voter, votingId, candidateId);
  if (outcome === "not_found") return fail(corsHdrs, 404, "NOT_FOUND", "That vote has gone. Pull down to refresh.");
  if (outcome === "closed") return fail(corsHdrs, 409, "CLOSED", "Voting has closed.");
  if (outcome === "already_voted") return fail(corsHdrs, 409, "ALREADY_VOTED", "You've already voted this month.");
  return json({ success: true, data: await loadVotes(env, claims, votingId) }, 200, corsHdrs);
}

export async function handleCloseGOTMVoting(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await who(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  const votingId = (await body(req)).votingId;
  if (typeof votingId !== "string" || !votingId) return fail(corsHdrs, 400, "VALIDATION", "Choose the vote to close.");
  const closed = await closeVote(env, claims.tenantId, votingId);
  if (!closed) return fail(corsHdrs, 404, "NOT_FOUND", "That vote has gone. Refresh the page.");

  const facts = await winnerFacts(env, claims.tenantId, closed.winners);
  let posted = false;
  if (facts.length) {
    // One post per vote (source id), so closing twice never posts twice
    const job = await queueClubPost(env, {
      tenantId: claims.tenantId, kind: "gotm", sourceId: `gotm:${votingId}`,
      build: (club, policy) => gotmWinnerPost(club.brand, policy, facts, closed.label, closed.winners[0].votes),
    });
    posted = !!job;
  }
  if (closed.justClosed) log("closed", claims.tenantId, { votingId, winners: facts.length, posted });
  return json({
    success: true,
    data: { winners: facts.map((f) => ({ name: f.name, detail: f.detail })), votes: closed.winners[0]?.votes ?? 0, posted },
  }, 200, corsHdrs);
}
