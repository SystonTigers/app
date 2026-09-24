/**
 * Who can see what about a player.
 *
 * Club staff see full player records. A parent or player sees the full record
 * only for players linked to their own account (auth_user_players). Everyone
 * else in the club sees the team-sheet fields: no date of birth, emergency
 * contacts, parent email or login code.
 */
import { hasAnyRole, STAFF_ROLES, type TenantClaims } from "./auth";

const TEAM_SHEET_FIELDS = [
  "id",
  "tenant_id",
  "name",
  "number",
  "squad_number",
  "position",
  "role",
  "photo_url",
  "headshot_url",
  "bio",
  "joined_at",
  "signed_date",
  "previous_club",
  "created_at",
] as const;

type PlayerRow = Record<string, unknown>;

export function isStaff(claims: Pick<TenantClaims, "roles">): boolean {
  return hasAnyRole(claims, STAFF_ROLES);
}

/** Ids of players linked to this account (a parent's children, or the player themself). */
export async function linkedPlayerIds(env: { DB: D1Database }, claims: TenantClaims): Promise<Set<string>> {
  if (!claims.userId) return new Set();
  const { results } = await env.DB.prepare(`SELECT player_id FROM auth_user_players WHERE user_id = ? AND tenant_id = ?`)
    .bind(claims.userId, claims.tenantId).all<{ player_id: string }>();
  return new Set((results || []).map((r) => r.player_id));
}

/** Keep only the team-sheet fields. */
export function teamSheetView(row: PlayerRow): PlayerRow {
  const out: PlayerRow = {};
  for (const key of TEAM_SHEET_FIELDS) {
    if (key in row) out[key] = row[key];
  }
  return out;
}

/** Full record for staff or linked accounts, team-sheet view for everyone else. */
export async function playersForViewer(env: { DB: D1Database }, claims: TenantClaims, rows: PlayerRow[]): Promise<PlayerRow[]> {
  if (isStaff(claims)) return rows;
  const linked = await linkedPlayerIds(env, claims);
  return rows.map((row) => (linked.has(String(row.id)) ? row : teamSheetView(row)));
}

/** Staff, or a parent/player linked to this player. */
export async function canSeeFullPlayer(env: { DB: D1Database }, claims: TenantClaims, playerId: string): Promise<boolean> {
  if (isStaff(claims)) return true;
  return (await linkedPlayerIds(env, claims)).has(playerId);
}
