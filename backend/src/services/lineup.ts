/**
 * Match line-ups: who starts and who's on the bench. Clubs play 5, 7, 9 or
 * 11-a-side depending on the age group, with a club default and a per-match
 * override. The line-up also tells us who played, for Man of the Match.
 */
export const TEAM_SIZES = [5, 7, 9, 11] as const;
export const MAX_SUBS = 12;

type DB = { DB: D1Database };

export interface LineupPlayer { playerId: string; name: string; number: number | null; position: string | null }
export interface Lineup { teamSize: number; starters: LineupPlayer[]; subs: LineupPlayer[]; clubDefaultTeamSize: number }

export function isTeamSize(value: unknown): value is (typeof TEAM_SIZES)[number] {
  return typeof value === "number" && (TEAM_SIZES as readonly number[]).includes(value);
}

export async function getLineup(env: DB, tenantId: string, fixtureId: string): Promise<Lineup> {
  const [sizes, rows] = await Promise.all([
    env.DB.prepare(
      `SELECT f.team_size, t.default_team_size FROM fixtures f JOIN tenants t ON t.id = f.tenant_id WHERE f.tenant_id = ? AND f.id = ?`,
    ).bind(tenantId, fixtureId).first<{ team_size: number | null; default_team_size: number | null }>(),
    env.DB.prepare(
      `SELECT l.player_id, l.role, s.name, s.number, s.position
       FROM match_lineups l JOIN squad s ON s.id = l.player_id AND s.tenant_id = l.tenant_id
       WHERE l.tenant_id = ? AND l.fixture_id = ? ORDER BY l.role DESC, l.sort`,
    ).bind(tenantId, fixtureId).all<{ player_id: string; role: string; name: string; number: number | null; position: string | null }>(),
  ]);
  const clubDefault = sizes?.default_team_size ?? 11;
  const toPlayer = (r: { player_id: string; name: string; number: number | null; position: string | null }): LineupPlayer =>
    ({ playerId: r.player_id, name: r.name, number: r.number, position: r.position });
  const all = rows.results || [];
  return {
    teamSize: sizes?.team_size ?? clubDefault,
    clubDefaultTeamSize: clubDefault,
    starters: all.filter((r) => r.role === "starter").map(toPlayer),
    subs: all.filter((r) => r.role === "sub").map(toPlayer),
  };
}

/** Why a line-up can't be saved, or null if it's fine. */
export function lineupProblem(teamSize: unknown, starters: string[], subs: string[]): string | null {
  if (!isTeamSize(teamSize)) return "Choose 5, 7, 9 or 11-a-side.";
  if (starters.length !== teamSize) return `Pick ${teamSize} starting players (you've picked ${starters.length}).`;
  if (subs.length > MAX_SUBS) return `Pick up to ${MAX_SUBS} subs.`;
  const all = [...starters, ...subs];
  if (new Set(all).size !== all.length) return "A player can only be picked once.";
  return null;
}

export async function saveLineup(env: DB, tenantId: string, fixtureId: string, teamSize: number, starters: string[], subs: string[], makeClubDefault: boolean): Promise<void> {
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM match_lineups WHERE tenant_id = ? AND fixture_id = ?`).bind(tenantId, fixtureId),
    ...starters.map((id, i) => env.DB.prepare(
      `INSERT INTO match_lineups (tenant_id, fixture_id, player_id, role, sort, updated_at) VALUES (?, ?, ?, 'starter', ?, ?)`,
    ).bind(tenantId, fixtureId, id, i, now)),
    ...subs.map((id, i) => env.DB.prepare(
      `INSERT INTO match_lineups (tenant_id, fixture_id, player_id, role, sort, updated_at) VALUES (?, ?, ?, 'sub', ?, ?)`,
    ).bind(tenantId, fixtureId, id, i, now)),
    env.DB.prepare(`UPDATE fixtures SET team_size = ? WHERE tenant_id = ? AND id = ?`).bind(teamSize, tenantId, fixtureId),
    ...(makeClubDefault ? [env.DB.prepare(`UPDATE tenants SET default_team_size = ? WHERE id = ?`).bind(teamSize, tenantId)] : []),
  ]);
}

/**
 * Everyone who played: the starting line-up plus subs who came on during the
 * match. Empty when no line-up was set.
 */
export async function playersWhoPlayed(env: DB, tenantId: string, fixtureId: string): Promise<string[]> {
  const [starters, subsOn] = await Promise.all([
    env.DB.prepare(`SELECT player_id FROM match_lineups WHERE tenant_id = ? AND fixture_id = ? AND role = 'starter' ORDER BY sort`)
      .bind(tenantId, fixtureId).all<{ player_id: string }>(),
    env.DB.prepare(
      `SELECT player_id FROM live_match_events WHERE tenant_id = ? AND fixture_id = ? AND type = 'sub' AND deleted_at IS NULL AND player_id IS NOT NULL
       ORDER BY COALESCE(occurred_at, created_at)`,
    ).bind(tenantId, fixtureId).all<{ player_id: string }>(),
  ]);
  const ids = (starters.results || []).map((r) => r.player_id);
  if (!ids.length) return [];
  for (const r of subsOn.results || []) if (!ids.includes(r.player_id)) ids.push(r.player_id);
  return ids;
}
