/**
 * Players' cut-out photos: a see-through PNG of just the player, made on the
 * coach's phone (background removed there) or uploaded ready-made. Goal,
 * player of the week, birthday and other post graphics draw it standing in
 * the design, and only when the player's family said yes to photos
 * (graphicPhotoSql in services/consent.ts). Stored in R2 under
 * `players/<club>/<player>/cutout-<time>.png`; `squad.cutout_url` points at it.
 */
import { deleteMedia, keyFromMediaUrl, mediaUrl, putMedia, type MediaEnv } from "./media";

type Env = MediaEnv & { DB: D1Database };

export const MAX_CUTOUT_BYTES = 4 * 1024 * 1024;

export class CutoutError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

export interface CutoutPlayer {
  playerId: string;
  name: string;
  number: number | null;
  /** The cut-out, or null if they haven't got one */
  cutoutUrl: string | null;
  /** Their ordinary photo (headshot or squad photo), a starting point for making one */
  photoUrl: string | null;
  /** true yes, false no, null not asked: graphics only use the cut-out on a yes */
  photoConsent: boolean | null;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** A PNG whose pixels can be see-through (colour type 4 or 6 in its header), so it's a real cut-out. */
export function isTransparentPng(bytes: Uint8Array): boolean {
  if (bytes.length < 26) return false;
  if (!PNG_SIGNATURE.every((b, i) => bytes[i] === b)) return false;
  // The first chunk must be IHDR; its colour type is the 10th byte of its data
  const ihdr = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
  return ihdr === "IHDR" && (bytes[25] === 4 || bytes[25] === 6);
}

/** Check an uploaded cut-out, throwing CutoutError with a message staff can act on. */
export function checkCutout(bytes: Uint8Array): void {
  if (!bytes.length) throw new CutoutError(400, "NO_IMAGE", "No picture was sent.");
  if (bytes.length > MAX_CUTOUT_BYTES) throw new CutoutError(413, "TOO_LARGE", "That picture is too big (4 MB at most).");
  if (!isTransparentPng(bytes)) {
    throw new CutoutError(400, "NOT_A_CUTOUT", "That isn't a cut-out. Use a PNG with the background removed, or make one in the app.");
  }
}

/** Every player in the squad with their cut-out (staff screen). */
export async function listCutouts(env: Env, tenantId: string): Promise<CutoutPlayer[]> {
  const { results } = await env.DB.prepare(
    `SELECT id, name, number, cutout_url, COALESCE(headshot_url, photo_url) AS photo, photo_consent
       FROM squad WHERE tenant_id = ?
      ORDER BY number IS NULL, number, name`,
  ).bind(tenantId).all<{ id: string; name: string; number: number | null; cutout_url: string | null; photo: string | null; photo_consent: number | null }>();
  return (results || []).map((r) => ({
    playerId: r.id,
    name: r.name,
    number: typeof r.number === "number" ? r.number : null,
    cutoutUrl: r.cutout_url,
    photoUrl: r.photo,
    photoConsent: r.photo_consent === 1 ? true : r.photo_consent === 0 ? false : null,
  }));
}

async function currentCutout(env: Env, tenantId: string, playerId: string): Promise<{ cutout_url: string | null }> {
  const row = await env.DB.prepare(`SELECT cutout_url FROM squad WHERE tenant_id = ? AND id = ?`)
    .bind(tenantId, playerId).first<{ cutout_url: string | null }>();
  if (!row) throw new CutoutError(404, "NOT_FOUND", "That player isn't in the squad.");
  return row;
}

/** Remove the old file; a missing or foreign one is ignored (the row is what matters). */
async function dropFile(env: Env, url: string | null): Promise<void> {
  const key = url ? keyFromMediaUrl(env, url) : null;
  if (!key || !key.startsWith("players/")) return;
  try {
    await deleteMedia(env, key);
  } catch (err) {
    console.warn(JSON.stringify({ level: "warn", msg: "cutout_delete_failed", key, error: err instanceof Error ? err.message : String(err) }));
  }
}

/** Save a player's cut-out (replacing any earlier one) and return its URL. */
export async function saveCutout(env: Env, requestUrl: string, tenantId: string, playerId: string, bytes: Uint8Array): Promise<string> {
  checkCutout(bytes);
  const before = await currentCutout(env, tenantId, playerId);
  const key = `players/${tenantId}/${playerId}/cutout-${Date.now()}.png`;
  await putMedia(env, key, bytes.slice().buffer as ArrayBuffer, "image/png");
  const url = mediaUrl(env, requestUrl, key);
  await env.DB.prepare(`UPDATE squad SET cutout_url = ? WHERE tenant_id = ? AND id = ?`).bind(url, tenantId, playerId).run();
  await dropFile(env, before.cutout_url);
  return url;
}

/** Take a player's cut-out away (graphics go back to their ordinary photo). */
export async function removeCutout(env: Env, tenantId: string, playerId: string): Promise<void> {
  const before = await currentCutout(env, tenantId, playerId);
  await env.DB.prepare(`UPDATE squad SET cutout_url = NULL WHERE tenant_id = ? AND id = ?`).bind(tenantId, playerId).run();
  await dropFile(env, before.cutout_url);
}
