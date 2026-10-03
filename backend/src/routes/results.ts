/**
 * The club's results, season by season.
 *
 *   GET    /api/v1/results/seasons       seasons to look back at (newest first) and which is current
 *   GET    /api/v1/results?season=        (in content.ts) results, optionally for one season
 *   POST   /api/v1/results                staff: add a result (any date, so past seasons too)
 *   PUT    /api/v1/results/:id            staff: change a result
 *
 * Scorers: `scorerIds` (squad ids, one per goal) and `ownGoals` save goals that
 * count in player stats (services/resultGoals.ts) and write `scorers` from
 * them. A plain `scorers` text is still accepted but counts for nothing.
 * Results recorded in Match Centre keep the scorers from there.
 *   DELETE /api/v1/results/:id            (in content.ts) staff: remove one
 *
 * Scores set the result and league points; the league table is rebuilt after
 * every change.
 */
import { json } from "../services/util";
import { requireStaff, requireTenantJWT } from "../services/auth";
import { outcomeFromScores } from "../services/results";
import { refreshLeagueTable } from "../services/league/store";
import { seasonOptions } from "../services/seasons/range";
import { lockedResultIds, readGoalPicks, replaceResultGoals, scorersText, squadNames, type GoalPicks } from "../services/resultGoals";

type Env = { DB: D1Database; [key: string]: unknown };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const COMPETITIONS = ["League", "Cup", "Friendly"];

function fail(corsHdrs: Headers, status: number, code: string, message: string): Response {
  return json({ success: false, error: { code, message } }, status, corsHdrs);
}

async function staffTenant(req: Request, env: Env, corsHdrs: Headers): Promise<string | Response> {
  try {
    return (await requireStaff(req, env)).tenantId;
  } catch (err) {
    const status = err instanceof Response ? err.status : 401;
    return status === 403 ? fail(corsHdrs, 403, "FORBIDDEN", "Only club staff can change results.") : fail(corsHdrs, 401, "UNAUTHORIZED", "Please log in again.");
  }
}

interface ResultInput { date: string; opponent: string; ourScore: number; theirScore: number; venue: string | null; competition: string; scorers: string | null }

/** Check a result from the app or website; partial for updates. */
export function parseResult(body: Record<string, unknown>, partial: boolean): Partial<ResultInput> | string {
  const out: Partial<ResultInput> = {};
  if (body.date !== undefined || !partial) {
    const date = typeof body.date === "string" ? body.date.trim().slice(0, 10) : "";
    if (!DATE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return "Enter the match date as YYYY-MM-DD.";
    if (date > new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)) return "A result can't be in the future.";
    out.date = date;
  }
  if (body.opponent !== undefined || !partial) {
    const opponent = typeof body.opponent === "string" ? body.opponent.trim().replace(/\s+/g, " ") : "";
    if (!opponent || opponent.length > 80) return "Enter who you played.";
    out.opponent = opponent;
  }
  for (const [key, field] of [["ourScore", "ourScore"], ["theirScore", "theirScore"]] as const) {
    if (body[key] === undefined && partial) continue;
    const n = Number(body[key]);
    if (!Number.isInteger(n) || n < 0 || n > 99) return "Scores must be whole numbers from 0 to 99.";
    out[field] = n;
  }
  if (body.venue !== undefined) out.venue = typeof body.venue === "string" && body.venue.trim() ? body.venue.trim().slice(0, 120) : null;
  if (body.competition !== undefined || !partial) {
    const c = typeof body.competition === "string" ? body.competition.trim() : "";
    out.competition = COMPETITIONS.find((x) => x.toLowerCase() === c.toLowerCase()) ?? (c ? c.slice(0, 80) : "League");
  }
  if (body.scorers !== undefined) out.scorers = typeof body.scorers === "string" && body.scorers.trim() ? body.scorers.trim().slice(0, 500) : null;
  return out;
}

/** Picks checked against the score and the squad: the scorers text, or a response explaining the problem. */
async function checkPicks(env: Env, tenantId: string, picks: GoalPicks, ourScore: number, corsHdrs: Headers): Promise<string | null | Response> {
  if (picks.scorerIds.length + picks.ownGoals > ourScore) {
    return fail(corsHdrs, 400, "VALIDATION", `You've picked more scorers than goals (${ourScore}).`);
  }
  const names = await squadNames(env, tenantId, picks.scorerIds);
  if ("unknown" in names) return fail(corsHdrs, 400, "VALIDATION", "One of the scorers isn't in the squad any more. Pick them again.");
  return scorersText(picks, names);
}

export async function handleResultSeasons(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  let tenantId: string;
  try {
    tenantId = (await requireTenantJWT(req, env)).tenantId;
  } catch {
    return fail(corsHdrs, 401, "UNAUTHORIZED", "Please log in again.");
  }
  const options = await seasonOptions(env, tenantId);
  return json({ success: true, data: options }, 200, corsHdrs);
}

export async function handleAddResult(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const tenantId = await staffTenant(req, env, corsHdrs);
  if (tenantId instanceof Response) return tenantId;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return fail(corsHdrs, 400, "INVALID_BODY", "Couldn't read that result.");
  const r = parseResult(body, false);
  if (typeof r === "string") return fail(corsHdrs, 400, "VALIDATION", r);
  const picks = readGoalPicks(body);
  if (typeof picks === "string") return fail(corsHdrs, 400, "VALIDATION", picks);
  if (picks) {
    const text = await checkPicks(env, tenantId, picks, r.ourScore!, corsHdrs);
    if (text instanceof Response) return text;
    r.scorers = text;
  }
  const { result, points } = outcomeFromScores(r.ourScore!, r.theirScore!);
  const existing = await env.DB.prepare(`SELECT id FROM team_results WHERE tenant_id = ? AND match_date = ? AND lower(opponent) = lower(?)`)
    .bind(tenantId, r.date, r.opponent).first<{ id: number }>();
  if (existing) return fail(corsHdrs, 409, "DUPLICATE", "There's already a result against them on that date. Edit that one instead.");
  const inserted = await env.DB.prepare(
    `INSERT INTO team_results (tenant_id, match_date, opponent, venue, competition, our_score, their_score, result, points, scorers, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual')`,
  ).bind(tenantId, r.date, r.opponent, r.venue ?? "TBC", r.competition ?? "League", r.ourScore, r.theirScore, result, points, r.scorers ?? null).run();
  const newId = Number(inserted.meta?.last_row_id);
  if (picks && newId) await replaceResultGoals(env, tenantId, { id: newId, fixture_id: null }, picks);
  await refreshLeagueTable(env as never, tenantId);
  return json({ success: true, id: inserted.meta?.last_row_id ?? null, data: { id: inserted.meta?.last_row_id ?? null, result, points } }, 200, corsHdrs);
}

export async function handleEditResult(req: Request, env: Env, corsHdrs: Headers, id: string): Promise<Response> {
  const tenantId = await staffTenant(req, env, corsHdrs);
  if (tenantId instanceof Response) return tenantId;
  const row = await env.DB.prepare(`SELECT id, our_score, their_score, fixture_id FROM team_results WHERE id = ? AND tenant_id = ?`)
    .bind(id, tenantId).first<{ id: number; our_score: number; their_score: number; fixture_id: string | null }>();
  if (!row) return fail(corsHdrs, 404, "NOT_FOUND", "That result isn't there any more.");
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return fail(corsHdrs, 400, "INVALID_BODY", "Couldn't read that result.");
  const r = parseResult(body, true);
  if (typeof r === "string") return fail(corsHdrs, 400, "VALIDATION", r);
  const picks = readGoalPicks(body);
  if (typeof picks === "string") return fail(corsHdrs, 400, "VALIDATION", picks);
  if (picks) {
    if ((await lockedResultIds(env, tenantId, [row])).has(row.id)) {
      return fail(corsHdrs, 409, "FROM_MATCH_CENTRE", "This match's scorers come from Match Centre. Change them there.");
    }
    const text = await checkPicks(env, tenantId, picks, r.ourScore ?? row.our_score, corsHdrs);
    if (text instanceof Response) return text;
    r.scorers = text;
  }
  const sets: string[] = [];
  const binds: unknown[] = [];
  const set = (col: string, v: unknown) => { sets.push(`${col} = ?`); binds.push(v); };
  if (r.date !== undefined) set("match_date", r.date);
  if (r.opponent !== undefined) set("opponent", r.opponent);
  if (r.venue !== undefined) set("venue", r.venue ?? "TBC");
  if (r.competition !== undefined) set("competition", r.competition);
  if (r.scorers !== undefined) set("scorers", r.scorers);
  if (r.ourScore !== undefined || r.theirScore !== undefined) {
    const ours = r.ourScore ?? row.our_score;
    const theirs = r.theirScore ?? row.their_score;
    const { result, points } = outcomeFromScores(ours, theirs);
    set("our_score", ours);
    set("their_score", theirs);
    set("result", result);
    set("points", points);
  }
  if (!sets.length) return fail(corsHdrs, 400, "VALIDATION", "Nothing to change.");
  try {
    await env.DB.prepare(`UPDATE team_results SET ${sets.join(", ")} WHERE id = ? AND tenant_id = ?`).bind(...binds, id, tenantId).run();
  } catch (err) {
    if (String(err).includes("UNIQUE")) return fail(corsHdrs, 409, "DUPLICATE", "There's already a result against them on that date.");
    throw err;
  }
  if (picks) await replaceResultGoals(env, tenantId, row, picks);
  await refreshLeagueTable(env as never, tenantId);
  return json({ success: true }, 200, corsHdrs);
}
