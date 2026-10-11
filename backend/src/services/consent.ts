/**
 * Photo and video consent for each player, given by a parent in the app (or
 * recorded by staff from a paper form). Without a "yes", a player's photo is
 * never used publicly and staff are warned before posting video of them.
 *
 * Adult teams (tenants.team_type = 'adult') work the other way round: photos
 * and clips are used unless the player has said no themselves (consent left
 * unanswered counts as yes). photoAllowedSql/videoAllowedSql carry both rules.
 */
import { hasAnyRole, STAFF_ROLES, type TenantClaims } from "./auth";
import { linkedPlayerIds } from "./playerPrivacy";

type DB = { DB: D1Database };

/** SQL: true when this squad row's club is an adult team (no alias = the query's `squad` table). */
function adultTeamSql(a: string): string {
  return `EXISTS (SELECT 1 FROM tenants consent_t WHERE consent_t.id = ${a || "squad."}tenant_id AND consent_t.team_type = 'adult')`;
}

/** SQL condition: this player's photo may be used (juniors: a yes; adults: anything but a no). */
export function photoAllowedSql(alias = ""): string {
  const a = alias ? `${alias}.` : "";
  return `(${a}photo_consent = 1 OR (${a}photo_consent IS NULL AND ${adultTeamSql(a)}))`;
}

/** SQL condition: video of this player may be used (same rules as photos). */
export function videoAllowedSql(alias = ""): string {
  const a = alias ? `${alias}.` : "";
  return `(${a}video_consent = 1 OR (${a}video_consent IS NULL AND ${adultTeamSql(a)}))`;
}

/** The same rule in code: a 1/0/null answer, for a junior or adult team. */
export function consentAllows(answer: number | null | undefined, adult: boolean): boolean {
  return answer === 1 || ((answer === null || answer === undefined) && adult);
}

/** SQL for a player's photo only when it may be used (use in anything public). */
export function publicPhotoSql(alias = ""): string {
  const a = alias ? `${alias}.` : "";
  return `CASE WHEN ${photoAllowedSql(alias)} THEN COALESCE(${a}headshot_url, ${a}photo_url) END`;
}

/** Like publicPhotoSql(), preferring the player's cut-out (see services/playerCutouts.ts): for post graphics. */
export function graphicPhotoSql(alias = ""): string {
  const a = alias ? `${alias}.` : "";
  return `CASE WHEN ${photoAllowedSql(alias)} THEN COALESCE(${a}cutout_url, ${a}headshot_url, ${a}photo_url) END`;
}

/** true = yes, false = no, null = not asked yet */
export type ConsentAnswer = boolean | null;

export interface PlayerConsent {
  playerId: string;
  name: string;
  number: number | null;
  photos: ConsentAnswer;
  video: ConsentAnswer;
  /** Who answered: a parent, the player (adult teams), or staff from a paper form */
  source: "parent" | "player" | "staff" | null;
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
  source: r.consent_source === "parent" || r.consent_source === "player" || r.consent_source === "staff" ? r.consent_source : null,
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
    throw new ConsentError(403, "FORBIDDEN", "Only this player (or their parent) or club staff can change this.");
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
  // Adult players answer for themselves
  const source = staff ? "staff" : hasAnyRole(claims, ["player"]) ? "player" : "parent";
  await env.DB.prepare(
    `UPDATE squad SET ${sets.join(", ")}, consent_source = ?, consent_updated_by = ?, consent_updated_at = ? WHERE tenant_id = ? AND id = ?`,
  ).bind(...binds, source, claims.userId ?? null, now, claims.tenantId, playerId).run();
  const updated = await env.DB.prepare(
    `SELECT id, name, number, photo_consent, video_consent, consent_source, consent_updated_at FROM squad WHERE tenant_id = ? AND id = ?`,
  ).bind(claims.tenantId, playerId).first<ConsentRow>();
  console.log(JSON.stringify({ level: "info", msg: "media_consent_changed", tenantId: claims.tenantId, playerId, by: source }));
  return toRow(updated!);
}

/** Of these players, the ones whose video can't be used (juniors: no "yes"; adults: said no), by id → name. */
export async function withoutVideoConsent(env: DB, tenantId: string, playerIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(playerIds.filter(Boolean))];
  const out = new Map<string, string>();
  if (!ids.length) return out;
  const { results } = await env.DB.prepare(
    `SELECT id, name FROM squad WHERE tenant_id = ? AND id IN (${ids.map(() => "?").join(",")}) AND NOT ${videoAllowedSql()}`,
  ).bind(tenantId, ...ids).all<{ id: string; name: string }>();
  for (const r of results ?? []) out.set(r.id, r.name);
  return out;
}
