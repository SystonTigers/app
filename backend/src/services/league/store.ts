/**
 * Saving pasted league results/tables and rebuilding the club's table in
 * league_standings (which the website, app and table graphic read).
 */
import type { ParsedResult, ParsedTableRow } from "./parse";
import { guessOurTeam, matchLeagueTeam, rankStandings, tableFromResults, teamKey, type MatchResult, type StandingRow } from "./table";

type Stmt = {
  bind(...values: unknown[]): Stmt;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results?: T[] }>;
  run(): Promise<unknown>;
};
export type LeagueDb = { prepare(sql: string): Stmt; batch(statements: Stmt[]): Promise<unknown> };

export type LeagueMode = "results" | "table";

export interface LeagueSettings {
  competition: string;
  ourTeam: string | null;
  seasonStart: string;
  mode: LeagueMode;
}

/** 1 August of the season we're in (UK seasons run August to May). */
export function defaultSeasonStart(today = new Date()): string {
  const y = today.getUTCMonth() >= 6 ? today.getUTCFullYear() : today.getUTCFullYear() - 1;
  return `${y}-08-01`;
}

export async function loadLeagueSettings(db: LeagueDb, tenantId: string, today = new Date()): Promise<LeagueSettings> {
  const row = await db.prepare(`SELECT competition, our_team, season_start, mode FROM league_settings WHERE tenant_id = ?`)
    .bind(tenantId).first<{ competition: string; our_team: string | null; season_start: string | null; mode: string }>();
  return {
    competition: row?.competition || "League",
    ourTeam: row?.our_team || null,
    seasonStart: row?.season_start || defaultSeasonStart(today),
    mode: row?.mode === "table" ? "table" : "results",
  };
}

export async function saveLeagueSettings(db: LeagueDb, tenantId: string, s: LeagueSettings): Promise<void> {
  await db.prepare(
    `INSERT INTO league_settings (tenant_id, competition, our_team, season_start, mode, updated_at)
     VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
     ON CONFLICT(tenant_id) DO UPDATE SET competition = excluded.competition, our_team = excluded.our_team,
       season_start = excluded.season_start, mode = excluded.mode, updated_at = excluded.updated_at`,
  ).bind(tenantId, s.competition, s.ourTeam, s.seasonStart, s.mode).run();
}

/** Save pasted results; ones already saved are left alone. Returns how many were new. */
export async function saveLeagueResults(db: LeagueDb, tenantId: string, competition: string, results: ParsedResult[]): Promise<number> {
  const before = await countResults(db, tenantId, competition);
  const statements = results.map((r) => db.prepare(
    `INSERT INTO league_results (tenant_id, competition, match_date, home_team, away_team, home_key, away_key, home_score, away_score, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'paste')
     ON CONFLICT(tenant_id, competition, match_date, home_key, away_key) DO UPDATE SET
       home_score = excluded.home_score, away_score = excluded.away_score, home_team = excluded.home_team, away_team = excluded.away_team`,
  ).bind(tenantId, competition, r.date, r.home, r.away, teamKey(r.home), teamKey(r.away), r.homeScore, r.awayScore));
  for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
  return (await countResults(db, tenantId, competition)) - before;
}

async function countResults(db: LeagueDb, tenantId: string, competition: string): Promise<number> {
  const row = await db.prepare(`SELECT COUNT(*) AS n FROM league_results WHERE tenant_id = ? AND competition = ?`).bind(tenantId, competition).first<{ n: number }>();
  return Number(row?.n ?? 0);
}

/** Every team name in the saved results. */
export async function leagueTeams(db: LeagueDb, tenantId: string, s: LeagueSettings): Promise<string[]> {
  const { results } = await db.prepare(
    `SELECT home_team AS team FROM league_results WHERE tenant_id = ? AND competition = ? AND match_date >= ?
     UNION SELECT away_team FROM league_results WHERE tenant_id = ? AND competition = ? AND match_date >= ?`,
  ).bind(tenantId, s.competition, s.seasonStart, tenantId, s.competition, s.seasonStart).all<{ team: string }>();
  const byKey = new Map<string, string>();
  for (const r of results ?? []) if (!byKey.has(teamKey(r.team))) byKey.set(teamKey(r.team), r.team);
  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}

/**
 * The season's results: pasted ones, plus our league games from Match Centre
 * or manual entry on days the paste doesn't cover yet.
 */
export async function seasonResults(db: LeagueDb, tenantId: string, s: LeagueSettings, clubName: string): Promise<{ results: MatchResult[]; ourTeam: string }> {
  const { results: pasted } = await db.prepare(
    `SELECT match_date, home_team, away_team, home_score, away_score FROM league_results
     WHERE tenant_id = ? AND competition = ? AND match_date >= ? ORDER BY match_date`,
  ).bind(tenantId, s.competition, s.seasonStart).all<{ match_date: string; home_team: string; away_team: string; home_score: number; away_score: number }>();
  const results: MatchResult[] = (pasted ?? []).map((r) => ({
    date: r.match_date, home: r.home_team, away: r.away_team, homeScore: Number(r.home_score), awayScore: Number(r.away_score),
  }));
  const teams = [...new Set(results.flatMap((r) => [r.home, r.away]))];
  const ourTeam = s.ourTeam || guessOurTeam(teams, clubName) || clubName;
  const ourKey = teamKey(ourTeam);
  const ourDates = new Set(results.filter((r) => teamKey(r.home) === ourKey || teamKey(r.away) === ourKey).map((r) => r.date));

  const { results: ours } = await db.prepare(
    `SELECT match_date, opponent, our_score, their_score FROM team_results
     WHERE tenant_id = ? AND substr(match_date, 1, 10) >= ? AND (LOWER(competition) = 'league' OR LOWER(competition) = LOWER(?))`,
  ).bind(tenantId, s.seasonStart, s.competition).all<{ match_date: string; opponent: string; our_score: number; their_score: number }>();
  for (const r of ours ?? []) {
    const date = r.match_date.slice(0, 10);
    if (ourDates.has(date)) continue;
    results.push({ date, home: ourTeam, away: matchLeagueTeam(r.opponent, teams) ?? r.opponent, homeScore: Number(r.our_score), awayScore: Number(r.their_score) });
  }
  return { results, ourTeam };
}

async function writeStandings(db: LeagueDb, tenantId: string, competition: string, rows: StandingRow[]): Promise<void> {
  const statements = [db.prepare(`DELETE FROM league_standings WHERE tenant_id = ?`).bind(tenantId)];
  for (const r of rows) {
    statements.push(db.prepare(
      `INSERT INTO league_standings (tenant_id, competition, team_name, played, won, drawn, lost, points, goals_for, goals_against, goal_difference, position, last_updated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    ).bind(tenantId, competition, r.team, r.played, r.won, r.drawn, r.lost, r.points, r.goalsFor, r.goalsAgainst, r.goalDifference, r.position));
  }
  await db.batch(statements);
}

/**
 * Rebuild the club's table from the season's results. Does nothing for a club
 * using a pasted table, or one that hasn't pasted any league results.
 */
export async function rebuildLeagueTable(db: LeagueDb, tenantId: string, clubName: string): Promise<StandingRow[] | null> {
  const s = await loadLeagueSettings(db, tenantId);
  if (s.mode !== "results") return null;
  if ((await countResults(db, tenantId, s.competition)) === 0) return null;
  const { results } = await seasonResults(db, tenantId, s, clubName);
  const table = tableFromResults(results);
  await writeStandings(db, tenantId, s.competition, table);
  return table;
}

/** Save a pasted table, re-sorted by points, goal difference and goals scored. */
export async function saveLeagueTable(db: LeagueDb, tenantId: string, competition: string, rows: ParsedTableRow[]): Promise<StandingRow[]> {
  const table = rankStandings(rows);
  await writeStandings(db, tenantId, competition, table);
  return table;
}

/**
 * After one of our results changes (full time, undo, manual entry): rebuild the
 * league table if the club works it out from results. Never throws.
 */
export async function refreshLeagueTable(env: { DB: unknown }, tenantId: string): Promise<void> {
  try {
    const db = env.DB as LeagueDb;
    const club = await db.prepare(`SELECT name FROM tenants WHERE id = ?`).bind(tenantId).first<{ name: string | null }>();
    await rebuildLeagueTable(db, tenantId, club?.name || "");
  } catch (err) {
    console.error(JSON.stringify({ level: "error", msg: "league_table_refresh_failed", tenantId, error: err instanceof Error ? err.message : String(err) }));
  }
}
