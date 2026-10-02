/**
 * Stats staff enter by hand, per player and season: past seasons before the
 * club used Match Centre, or games that weren't run through it. They are added
 * on top of what Match Centre records (GET /api/v1/stats/players).
 *
 *   GET /api/v1/players/:id/season-stats          members: each season with any hand-entered numbers
 *   PUT /api/v1/players/:id/season-stats/:season  staff: set the numbers (all zero removes the entry)
 */
import { json } from "../services/util";
import { requireStaff, requireTenantJWT } from "../services/auth";
import { seasonOptions, resolveSeason } from "../services/seasons/range";
import { logJSON } from "../lib/log";

type Env = { DB: D1Database; [key: string]: unknown };

export const STAT_FIELDS = ["appearances", "goals", "assists", "yellowCards", "redCards", "motm"] as const;
export type StatField = (typeof STAT_FIELDS)[number];
export type StatNumbers = Record<StatField, number>;

const COLUMN: Record<StatField, string> = {
  appearances: "appearances",
  goals: "goals",
  assists: "assists",
  yellowCards: "yellow_cards",
  redCards: "red_cards",
  motm: "motm",
};

function fail(corsHdrs: Headers, status: number, code: string, message: string): Response {
  return json({ success: false, error: { code, message } }, status, corsHdrs);
}

/** Whole numbers 0–999 for each stat; missing ones count as 0. */
export function parseStatNumbers(body: unknown): StatNumbers | string {
  if (!body || typeof body !== "object") return "Send the stats as JSON.";
  const out = {} as StatNumbers;
  for (const field of STAT_FIELDS) {
    const raw = (body as Record<string, unknown>)[field];
    const n = raw === undefined || raw === null || raw === "" ? 0 : Number(raw);
    if (!Number.isInteger(n) || n < 0 || n > 999) return "Stats must be whole numbers from 0 to 999.";
    out[field] = n;
  }
  return out;
}

function fromRow(row: Record<string, unknown> | undefined): StatNumbers | null {
  if (!row) return null;
  const out = {} as StatNumbers;
  for (const field of STAT_FIELDS) out[field] = Number(row[COLUMN[field]]) || 0;
  return out;
}

async function playerExists(env: Env, tenantId: string, playerId: string): Promise<boolean> {
  return !!(await env.DB.prepare("SELECT 1 AS ok FROM squad WHERE id = ? AND tenant_id = ?").bind(playerId, tenantId).first());
}

export async function handleGetPlayerSeasonStats(req: Request, env: Env, corsHdrs: Headers, playerId: string): Promise<Response> {
  let tenantId: string;
  try {
    tenantId = (await requireTenantJWT(req, env)).tenantId;
  } catch {
    return fail(corsHdrs, 401, "UNAUTHORIZED", "Please log in again.");
  }
  if (!(await playerExists(env, tenantId, playerId))) return fail(corsHdrs, 404, "NOT_FOUND", "Player not found");
  const [options, rows] = await Promise.all([
    seasonOptions(env, tenantId),
    env.DB.prepare("SELECT * FROM player_stat_entries WHERE tenant_id = ? AND player_id = ?").bind(tenantId, playerId).all<Record<string, unknown>>(),
  ]);
  const byId = new Map((rows.results ?? []).map((r) => [String(r.season_id), r]));
  const data = options.map((o) => ({ id: o.id, label: o.label, current: o.current, entered: fromRow(byId.get(o.id)) }));
  return json({ success: true, data }, 200, corsHdrs);
}

export async function handleSetPlayerSeasonStats(req: Request, env: Env, corsHdrs: Headers, playerId: string, seasonValue: string): Promise<Response> {
  let claims: { tenantId: string; sub?: string };
  try {
    claims = await requireStaff(req, env);
  } catch (err) {
    const status = err instanceof Response ? err.status : 401;
    return status === 403 ? fail(corsHdrs, 403, "FORBIDDEN", "Only club staff can change stats.") : fail(corsHdrs, 401, "UNAUTHORIZED", "Please log in again.");
  }
  const tenantId = claims.tenantId;
  const numbers = parseStatNumbers(await req.json().catch(() => null));
  if (typeof numbers === "string") return fail(corsHdrs, 400, "INVALID", numbers);
  if (!seasonValue || seasonValue === "all") return fail(corsHdrs, 400, "INVALID", "Choose a season.");
  if (!(await playerExists(env, tenantId, playerId))) return fail(corsHdrs, 404, "NOT_FOUND", "Player not found");
  const season = await resolveSeason(env, tenantId, seasonValue);
  if (!season || season.id !== seasonValue) return fail(corsHdrs, 400, "INVALID", "That season wasn't found.");

  const empty = STAT_FIELDS.every((f) => numbers[f] === 0);
  if (empty) {
    await env.DB.prepare("DELETE FROM player_stat_entries WHERE tenant_id = ? AND player_id = ? AND season_id = ?").bind(tenantId, playerId, season.id).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO player_stat_entries (tenant_id, player_id, season_id, season_from, appearances, goals, assists, yellow_cards, red_cards, motm, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(tenant_id, player_id, season_id) DO UPDATE SET
         season_from = excluded.season_from, appearances = excluded.appearances, goals = excluded.goals,
         assists = excluded.assists, yellow_cards = excluded.yellow_cards, red_cards = excluded.red_cards,
         motm = excluded.motm, updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
    ).bind(
      tenantId, playerId, season.id, season.from, numbers.appearances, numbers.goals, numbers.assists,
      numbers.yellowCards, numbers.redCards, numbers.motm, claims.sub ?? null, Date.now(),
    ).run();
  }
  logJSON({ level: "info", msg: "player_season_stats_set", tenant: tenantId, player: playerId, season: season.id, cleared: empty });
  return json({ success: true, data: { season: { id: season.id, label: season.label }, entered: empty ? null : numbers } }, 200, corsHdrs);
}
