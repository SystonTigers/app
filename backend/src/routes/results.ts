/**
 * The club's results, season by season.
 *
 *   GET    /api/v1/results/seasons       seasons to look back at (newest first) and which is current
 *   GET    /api/v1/results/head-to-head?opponent=   our record against a team (Home's next match card)
 *   POST   /api/v1/results/import         staff: add many past results at once (spreadsheet upload)
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
import { headToHead, opponentWords, type PastMeeting } from "../services/headToHead";
import { parseCsv, parseXlsx, type Sheet } from "../services/resultsImport/sheet";
import { parseSheets } from "../services/resultsImport/rows";
import { applyImport, planImport } from "../services/resultsImport/store";
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

export async function handleHeadToHead(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  let tenantId: string;
  try {
    tenantId = (await requireTenantJWT(req, env)).tenantId;
  } catch {
    return fail(corsHdrs, 401, "UNAUTHORIZED", "Please log in again.");
  }
  const opponent = (new URL(req.url).searchParams.get("opponent") ?? "").trim().slice(0, 120);
  const words = opponentWords(opponent);
  if (!words.length) return fail(corsHdrs, 400, "VALIDATION", "Say which team.");
  // Narrow by the team's most telling word, then match properly in headToHead
  const anchor = [...words].sort((a, b) => b.length - a.length)[0];
  const { results } = await env.DB.prepare(
    `SELECT r.id, r.match_date, r.opponent, r.competition, r.our_score, r.their_score, r.scorers,
            CASE
              WHEN f.id IS NOT NULL AND f.home_team = r.opponent AND IFNULL(f.away_team, '') != r.opponent THEN 'away'
              WHEN f.id IS NOT NULL THEN 'home'
              WHEN lower(r.venue) = 'away' THEN 'away'
              WHEN lower(r.venue) = 'home' THEN 'home'
              ELSE NULL
            END AS home_away
     FROM team_results r LEFT JOIN fixtures f ON f.id = r.fixture_id AND f.tenant_id = r.tenant_id
     WHERE r.tenant_id = ? AND lower(r.opponent) LIKE ?
     ORDER BY r.match_date DESC LIMIT 200`,
  ).bind(tenantId, `%${anchor}%`).all<{ id: number; match_date: string; opponent: string; competition: string | null; our_score: number; their_score: number; scorers: string | null; home_away: "home" | "away" | null }>();
  const rows: PastMeeting[] = (results ?? []).map((r) => ({
    id: r.id,
    date: String(r.match_date).slice(0, 10),
    opponent: r.opponent,
    ourScore: Number(r.our_score),
    theirScore: Number(r.their_score),
    competition: r.competition,
    scorers: r.scorers,
    homeAway: r.home_away,
  }));
  return json({ success: true, data: headToHead(opponent, rows) }, 200, corsHdrs);
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

const MAX_FILE_BYTES = 3_000_000;
const MAX_ROWS = 2000;

/** The uploaded spreadsheet as sheets of text: JSON {fileName, data: base64} or a raw CSV body. */
async function readSpreadsheet(req: Request): Promise<Sheet[] | string> {
  const type = req.headers.get("Content-Type") ?? "";
  if (!type.includes("application/json")) {
    const text = await req.text();
    if (text.length > MAX_FILE_BYTES) return "That file is too big. Split it into a few smaller files.";
    return [{ name: "Sheet1", rows: parseCsv(text) }];
  }
  const body = (await req.json().catch(() => null)) as { fileName?: unknown; data?: unknown } | null;
  if (!body || typeof body.data !== "string" || !body.data) return "Choose a spreadsheet to upload.";
  if (body.data.length > MAX_FILE_BYTES * 1.4) return "That file is too big. Split it into a few smaller files.";
  const name = typeof body.fileName === "string" ? body.fileName.toLowerCase() : "";
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(body.data), (c) => c.charCodeAt(0));
  } catch {
    return "Couldn't read that file. Please try again.";
  }
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (name.endsWith(".xls") && !isZip) return "That's an old Excel file (.xls). Open it in Excel and Save As .xlsx or .csv, then upload it again.";
  if (name.endsWith(".numbers") || name.endsWith(".ods")) return "Save it from your spreadsheet app as .xlsx or .csv, then upload it again.";
  if (isZip) {
    try {
      return await parseXlsx(bytes);
    } catch {
      return "Couldn't open that Excel file. Save it as .xlsx or .csv and try again.";
    }
  }
  return [{ name: "Sheet1", rows: parseCsv(new TextDecoder().decode(bytes)) }];
}

/**
 * POST /api/v1/results/import (staff). Send the spreadsheet with ?preview=1
 * to see what would happen, then again without it to save. Rows already in
 * the app (from Match Centre or added by hand) are never changed.
 */
export async function handleImportResults(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const tenantId = await staffTenant(req, env, corsHdrs);
  if (tenantId instanceof Response) return tenantId;
  const preview = new URL(req.url).searchParams.get("preview") === "1";
  const sheets = await readSpreadsheet(req);
  if (typeof sheets === "string") return fail(corsHdrs, 400, "VALIDATION", sheets);
  if (sheets.reduce((n, s) => n + s.rows.length, 0) > MAX_ROWS) return fail(corsHdrs, 400, "VALIDATION", `That's more than ${MAX_ROWS} rows. Split it into a few smaller files.`);
  const club = await env.DB.prepare(`SELECT name FROM tenants WHERE id = ?`).bind(tenantId).first<{ name: string }>();
  const parsed = parseSheets(sheets, { clubName: club?.name ?? "", today: new Date().toISOString().slice(0, 10) });
  if (!parsed.results.length && !parsed.skipped.length) {
    const why = parsed.ignoredSheets[0]?.reason ?? "It looks empty.";
    return fail(corsHdrs, 400, "NO_RESULTS", `No results found in that file. ${why} It needs columns for the date, who you played and the score.`);
  }
  const plan = await planImport(env, tenantId, parsed);
  if (preview) return json({ success: true, data: plan }, 200, corsHdrs);
  const saved = await applyImport(env, tenantId, plan);
  if (saved.added || saved.updated) await refreshLeagueTable(env as never, tenantId);
  return json({ success: true, data: { ...saved, unchanged: plan.counts.unchanged, exists: plan.counts.exists, skipped: plan.counts.skipped, unmatchedNames: plan.unmatchedNames } }, 200, corsHdrs);
}
