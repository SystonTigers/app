/**
 * Photo and video consent for each player, given by a parent in the app (or
 * recorded by staff from a paper form). Without a "yes", a player's photo is
 * never used publicly and staff are warned before posting video of them.
 */
import { hasAnyRole, STAFF_ROLES, type TenantClaims } from "./auth";
import { linkedPlayerIds } from "./playerPrivacy";

type DB = { DB: D1Database };

/** SQL for a player's photo only when their parent said yes (use in anything public). */
export function publicPhotoSql(alias = ""): string {
  const a = alias ? `${alias}.` : "";
  return `CASE WHEN ${a}photo_consent = 1 THEN COALESCE(${a}headshot_url, ${a}photo_url) END`;
}

/** Like publicPhotoSql(), preferring the player's cut-out (see services/playerCutouts.ts): for post graphics. */
export function graphicPhotoSql(alias = ""): string {
  const a = alias ? `${alias}.` : "";
  return `CASE WHEN ${a}photo_consent = 1 THEN COALESCE(${a}cutout_url, ${a}headshot_url, ${a}photo_url) END`;
}

/** true = yes, false = no, null = not asked yet */
export type ConsentAnswer = boolean | null;

export interface PlayerConsent {
  playerId: string;
  name: string;
  number: number | null;
  photos: ConsentAnswer;
  video: ConsentAnswer;
  source: "parent" | "staff" | null;
  updatedAt: number | null;
  /** Staff only: how many accounts are linked to this player */
  linkedParents?: number;
}

interface ConsentRow {
  id: string; name: string; number: number | null;
  photo_consent: number | null; video_consent: number | null;
  consent_source: string | null; consent_updated_at: number | null;
  linked?: number;
}

const answer = (v: number | null): ConsentAnswer => (v === null || v === undefined ? null : v === 1);
const toRow = (r: ConsentRow): PlayerConsent => ({
  playerId: r.id, name: r.name, number: r.number,
  photos: answer(r.photo_consent), video: answer(r.video_consent),
  source: r.consent_source === "parent" || r.consent_source === "staff" ? r.consent_source : null,
  updatedAt: r.consent_updated_at,
  ...(r.linked !== undefined ? { linkedParents: r.linked } : {}),
});

const isStaff = (claims: TenantClaims) => hasAnyRole(claims, STAFF_ROLES);

/** Staff: the whole squad. Parents and players: only the players linked to their account. */
export async function consentForViewer(env: DB, claims: TenantClaims): Promise<{ players: PlayerConsent[]; canEditAll: boolean }> {
  const { results } = await env.DB.prepare(
    `SELECT s.id, s.name, s.number, s.photo_consent, s.video_consent, s.consent_source, s.consent_updated_at,
            (SELECT COUNT(*) FROM auth_user_players l WHERE l.tenant_id = s.tenant_id AND l.player_id = s.id) AS linked
     FROM squad s WHERE s.tenant_id = ? ORDER BY s.number IS NULL, s.number, s.name`,
  ).bind(claims.tenantId).all<ConsentRow>();
  if (isStaff(claims)) return { players: (results ?? []).map(toRow), canEditAll: true };
  const rows = (results ?? []).map(({ linked: _linked, ...r }) => toRow(r));
  const linked = await linkedPlayerIds(env, claims);
  return { players: rows.filter((r) => linked.has(r.playerId)), canEditAll: false };
}

export class ConsentError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

/** Save a parent's (or staff member's) answer. Only the fields given change. */
export async function setConsent(env: DB, claims: TenantClaims, playerId: string, change: { photos?: ConsentAnswer; video?: ConsentAnswer }, now = Date.now()): Promise<PlayerConsent> {
  const staff = isStaff(claims);
  if (!staff && !(await linkedPlayerIds(env, claims)).has(playerId)) {
    throw new ConsentError(403, "FORBIDDEN", "Only this player's parent or club staff can change this.");
  }
  const row = await env.DB.prepare(`SELECT id FROM squad WHERE tenant_id = ? AND id = ?`).bind(claims.tenantId, playerId).first();
  if (!row) throw new ConsentError(404, "NOT_FOUND", "Player not found.");
  const sets: string[] = [];
  const binds: Array<number | string | null> = [];
  for (const [key, column] of [["photos", "photo_consent"], ["video", "video_consent"]] as const) {
    if (!(key in change)) continue;
    const v = change[key];
    if (v !== null && typeof v !== "boolean") throw new ConsentError(400, "VALIDATION", "Answer yes or no.");
    sets.push(`${column} = ?`);
    binds.push(v === null || v === undefined ? null : v ? 1 : 0);
  }
  if (!sets.length) throw new ConsentError(400, "VALIDATION", "Nothing to change.");
  await env.DB.prepare(
    `UPDATE squad SET ${sets.join(", ")}, consent_source = ?, consent_updated_by = ?, consent_updated_at = ? WHERE tenant_id = ? AND id = ?`,
  ).bind(...binds, staff ? "staff" : "parent", claims.userId ?? null, now, claims.tenantId, playerId).run();
  const updated = await env.DB.prepare(
    `SELECT id, name, number, photo_consent, video_consent, consent_source, consent_updated_at FROM squad WHERE tenant_id = ? AND id = ?`,
  ).bind(claims.tenantId, playerId).first<ConsentRow>();
  console.log(JSON.stringify({ level: "info", msg: "media_consent_changed", tenantId: claims.tenantId, playerId, by: staff ? "staff" : "parent" }));
  return toRow(updated!);
}

/** Of these players, the ones without a "yes" for video, by id → name. */
export async function withoutVideoConsent(env: DB, tenantId: string, playerIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(playerIds.filter(Boolean))];
  const out = new Map<string, string>();
  if (!ids.length) return out;
  const { results } = await env.DB.prepare(
    `SELECT id, name FROM squad WHERE tenant_id = ? AND id IN (${ids.map(() => "?").join(",")}) AND COALESCE(video_consent, 0) != 1`,
  ).bind(tenantId, ...ids).all<{ id: string; name: string }>();
  for (const r of results ?? []) out.set(r.id, r.name);
  return out;
}
