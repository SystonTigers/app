/**
 * The club's own league table, sorted by points, goal difference and goals scored.
 *
 *   GET    /api/v1/club/league          club staff: settings, the league's teams, our table
 *   POST   /api/v1/club/league/paste    club staff: { text } results or a table copied from the league's website
 *   PUT    /api/v1/club/league          club admins: { competition?, ourTeam?, seasonStart? }
 *   DELETE /api/v1/club/league/results  club admins: forget pasted results (start again)
 *   GET    /api/v1/league/snapshot       members: our row, the teams around us and, during a
 *                                        league game, the table as it stands (services/league/snapshot.ts)
 */
import { json } from "../services/util";
import { hasAnyRole, requireStaff, requireTenantJWT, type TenantClaims } from "../services/auth";
import { leagueSnapshot } from "../services/league/snapshot";
import { logJSON } from "../lib/log";
import { parseLeaguePaste } from "../services/league/parse";
import {
  leagueTeams, loadLeagueSettings, rebuildLeagueTable, saveLeagueResults, saveLeagueSettings, saveLeagueTable, seasonResults,
  type LeagueDb, type LeagueSettings,
} from "../services/league/store";

type Env = { DB: D1Database; [key: string]: unknown };

const ADMIN_ROLES = ["owner", "tenant_admin", "admin", "platform_admin"] as const;
const MAX_PASTE = 300_000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function fail(corsHdrs: Headers, status: number, code: string, message: string): Response {
  return json({ success: false, error: { code, message } }, status, corsHdrs);
}

async function staff(req: Request, env: Env, corsHdrs: Headers, adminOnly: boolean): Promise<TenantClaims | Response> {
  try {
    const claims = await requireStaff(req, env);
    if (adminOnly && !hasAnyRole(claims, ADMIN_ROLES)) return fail(corsHdrs, 403, "FORBIDDEN", "Only the club's owner or admins can change this.");
    return claims;
  } catch (err) {
    const status = err instanceof Response ? err.status : 401;
    return status === 403 ? fail(corsHdrs, 403, "FORBIDDEN", "Only club staff can do this.") : fail(corsHdrs, 401, "UNAUTHORIZED", "Please log in again.");
  }
}

async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function clubName(db: LeagueDb, tenantId: string): Promise<string> {
  const row = await db.prepare(`SELECT name FROM tenants WHERE id = ?`).bind(tenantId).first<{ name: string | null }>();
  return row?.name || "";
}

async function overview(db: LeagueDb, tenantId: string) {
  const settings = await loadLeagueSettings(db, tenantId);
  const teams = settings.mode === "results" ? await leagueTeams(db, tenantId, settings) : [];
  const { ourTeam } = settings.mode === "results" ? await seasonResults(db, tenantId, settings, await clubName(db, tenantId)) : { ourTeam: settings.ourTeam };
  const counted = await db.prepare(`SELECT COUNT(*) AS n FROM league_results WHERE tenant_id = ? AND competition = ? AND match_date >= ?`)
    .bind(tenantId, settings.competition, settings.seasonStart).first<{ n: number }>();
  const { results } = await db.prepare(
    `SELECT position, team_name, played, won, drawn, lost, goals_for, goals_against, goal_difference, points
     FROM league_standings WHERE tenant_id = ? ORDER BY COALESCE(position, 999), points DESC`,
  ).bind(tenantId).all<Record<string, unknown>>();
  return {
    settings: { ...settings, ourTeam: settings.ourTeam, detectedTeam: ourTeam },
    teams,
    resultsSaved: Number(counted?.n ?? 0),
    table: (results ?? []).map((r) => ({
      position: Number(r.position ?? 0), team: String(r.team_name), played: Number(r.played ?? 0), won: Number(r.won ?? 0),
      drawn: Number(r.drawn ?? 0), lost: Number(r.lost ?? 0),
      goalsFor: r.goals_for === null ? null : Number(r.goals_for), goalsAgainst: r.goals_against === null ? null : Number(r.goals_against),
      goalDifference: Number(r.goal_difference ?? 0), points: Number(r.points ?? 0),
    })),
  };
}

export async function handleGetLeague(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await staff(req, env, corsHdrs, false);
  if (claims instanceof Response) return claims;
  return json({ success: true, data: await overview(env.DB as unknown as LeagueDb, claims.tenantId) }, 200, corsHdrs);
}

export async function handlePasteLeague(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await staff(req, env, corsHdrs, false);
  if (claims instanceof Response) return claims;
  const body = await readJson(req);
  const text = typeof body?.text === "string" ? body.text : "";
  if (!text.trim()) return fail(corsHdrs, 400, "EMPTY", "Paste the results or the table first.");
  if (text.length > MAX_PASTE) return fail(corsHdrs, 413, "TOO_LONG", "That's too much text. Copy just the results or the table.");

  const db = env.DB as unknown as LeagueDb;
  const parsed = parseLeaguePaste(text);
  const settings = await loadLeagueSettings(db, claims.tenantId);
  if (parsed.kind === "none") {
    return fail(corsHdrs, 422, "NOTHING_FOUND", "We couldn't find any results or a table in that. Copy the whole results page (or the table) and paste it again.");
  }
  if (parsed.kind === "table") {
    await saveLeagueSettings(db, claims.tenantId, { ...settings, mode: "table" });
    await saveLeagueTable(db, claims.tenantId, settings.competition, parsed.rows);
    logJSON({ level: "info", msg: "league_table_pasted", tenantId: claims.tenantId, teams: parsed.rows.length });
    return json({ success: true, data: { kind: "table", rowsFound: parsed.rows.length, ...(await overview(db, claims.tenantId)) } }, 200, corsHdrs);
  }
  const inSeason = parsed.results.filter((r) => r.date >= settings.seasonStart);
  const added = await saveLeagueResults(db, claims.tenantId, settings.competition, inSeason);
  await saveLeagueSettings(db, claims.tenantId, { ...settings, mode: "results" });
  await rebuildLeagueTable(db, claims.tenantId, await clubName(db, claims.tenantId));
  logJSON({ level: "info", msg: "league_results_pasted", tenantId: claims.tenantId, found: parsed.results.length, added });
  return json({
    success: true,
    data: {
      kind: "results", found: parsed.results.length, added, skipped: parsed.skipped, olderThanSeason: parsed.results.length - inSeason.length,
      ...(await overview(db, claims.tenantId)),
    },
  }, 200, corsHdrs);
}

export async function handleSetLeague(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await staff(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  const body = await readJson(req);
  if (!body) return fail(corsHdrs, 400, "INVALID_BODY", "Couldn't read that request.");
  const db = env.DB as unknown as LeagueDb;
  const current = await loadLeagueSettings(db, claims.tenantId);
  const next: LeagueSettings = { ...current };
  if ("competition" in body) {
    const value = typeof body.competition === "string" ? body.competition.trim() : "";
    if (!value || value.length > 80) return fail(corsHdrs, 400, "INVALID_COMPETITION", "Give the league a name (up to 80 characters).");
    next.competition = value;
  }
  if ("ourTeam" in body) {
    const value = typeof body.ourTeam === "string" ? body.ourTeam.trim() : "";
    if (value.length > 80) return fail(corsHdrs, 400, "INVALID_TEAM", "That team name is too long.");
    next.ourTeam = value || null;
  }
  if ("seasonStart" in body) {
    if (typeof body.seasonStart !== "string" || !DATE.test(body.seasonStart)) return fail(corsHdrs, 400, "INVALID_DATE", "The season start needs to be a date.");
    next.seasonStart = body.seasonStart;
  }
  if (next.competition !== current.competition) {
    // Keep the pasted results with the league they belong to
    await db.prepare(`UPDATE league_results SET competition = ? WHERE tenant_id = ? AND competition = ?`).bind(next.competition, claims.tenantId, current.competition).run();
  }
  await saveLeagueSettings(db, claims.tenantId, next);
  if (next.mode === "results") await rebuildLeagueTable(db, claims.tenantId, await clubName(db, claims.tenantId));
  else await db.prepare(`UPDATE league_standings SET competition = ? WHERE tenant_id = ?`).bind(next.competition, claims.tenantId).run();
  return json({ success: true, data: await overview(db, claims.tenantId) }, 200, corsHdrs);
}

export async function handleClearLeagueResults(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await staff(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  const db = env.DB as unknown as LeagueDb;
  await db.batch([
    db.prepare(`DELETE FROM league_results WHERE tenant_id = ?`).bind(claims.tenantId),
    db.prepare(`DELETE FROM league_standings WHERE tenant_id = ?`).bind(claims.tenantId),
  ]);
  const settings = await loadLeagueSettings(db, claims.tenantId);
  await saveLeagueSettings(db, claims.tenantId, { ...settings, mode: "results" });
  return json({ success: true, data: await overview(db, claims.tenantId) }, 200, corsHdrs);
}

/** Members: the league at a glance, and "as it stands" while one of our league games is on. */
export async function handleLeagueSnapshot(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  let claims: TenantClaims;
  try {
    claims = await requireTenantJWT(req, env);
  } catch {
    return fail(corsHdrs, 401, "UNAUTHORIZED", "Please log in again.");
  }
  try {
    const data = await leagueSnapshot(env, claims.tenantId);
    return json({ success: true, data }, 200, corsHdrs);
  } catch (err) {
    logJSON({ level: "error", msg: "league_snapshot_failed", tenantId: claims.tenantId, error: err instanceof Error ? err.message : String(err) });
    return fail(corsHdrs, 500, "INTERNAL", "The league table couldn't load. Please try again.");
  }
}
