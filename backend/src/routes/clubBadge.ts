/**
 * The club's own badge: shown in the app, on the club pages and on every
 * graphic posted to the club app, Facebook and Instagram.
 *
 *   POST   /api/v1/club/badge   club admins: PNG/JPEG, as the raw body or a form field named "badge"
 *   DELETE /api/v1/club/badge   club admins: back to the club's initials
 *
 * Stored in R2 under badges/<tenant>/_club/ (served publicly by /api/v1/media)
 * and saved as tenant_brand.badge_url. Replacing or removing it deletes the
 * old file. Graphic previews are keyed by the brand, so they redraw by themselves.
 */
import { json } from "../services/util";
import { hasAnyRole, requireStaff, type TenantClaims } from "../services/auth";
import { imageMime } from "../services/graphics/images";
import { readImageUpload } from "../services/imageUpload";
import { deleteMedia, keyFromMediaUrl, mediaUrl, putMedia, type MediaEnv } from "../services/media";

type Env = MediaEnv & { DB: D1Database; [key: string]: unknown };

const ADMIN_ROLES = ["owner", "tenant_admin", "admin", "platform_admin"] as const;
/** Graphics read badges up to 4 MB; keep uploads comfortably under that. */
export const MAX_BADGE_BYTES = 3 * 1024 * 1024;

function fail(corsHdrs: Headers, status: number, code: string, message: string): Response {
  return json({ success: false, error: { code, message } }, status, corsHdrs);
}

async function admin(req: Request, env: Env, corsHdrs: Headers): Promise<TenantClaims | Response> {
  try {
    const claims = await requireStaff(req, env);
    if (!hasAnyRole(claims, ADMIN_ROLES)) return fail(corsHdrs, 403, "FORBIDDEN", "Only the club's owner or admins can change the badge.");
    return claims;
  } catch (err) {
    const status = err instanceof Response ? err.status : 401;
    return status === 403 ? fail(corsHdrs, 403, "FORBIDDEN", "Only club staff can do this.") : fail(corsHdrs, 401, "UNAUTHORIZED", "Please log in again.");
  }
}

function ownKey(env: Env, tenantId: string, url: string | null | undefined): string | null {
  const key = url ? keyFromMediaUrl(env, url) : null;
  return key?.startsWith(`badges/${tenantId}/_club/`) ? key : null;
}

async function setBadgeUrl(env: Env, tenantId: string, url: string | null): Promise<string | null> {
  const previous = await env.DB.prepare(`SELECT badge_url FROM tenant_brand WHERE tenant_id = ?`).bind(tenantId).first<{ badge_url: string | null }>();
  await env.DB.prepare(
    `INSERT INTO tenant_brand (tenant_id, badge_url, created_at, updated_at) VALUES (?, ?, unixepoch(), unixepoch())
     ON CONFLICT(tenant_id) DO UPDATE SET badge_url = excluded.badge_url, updated_at = unixepoch()`,
  ).bind(tenantId, url).run();
  return previous?.badge_url ?? null;
}

export async function handleUploadClubBadge(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await admin(req, env, corsHdrs);
  if (claims instanceof Response) return claims;
  const bytes = await readImageUpload(req, "badge");
  if (!bytes || !bytes.length) return fail(corsHdrs, 400, "VALIDATION", "Choose a picture of your badge first.");
  if (bytes.length > MAX_BADGE_BYTES) return fail(corsHdrs, 413, "TOO_LARGE", "That picture is too big. Please use a PNG or JPG under 3 MB.");
  const mime = imageMime(bytes);
  if (mime !== "image/png" && mime !== "image/jpeg") {
    return fail(corsHdrs, 400, "VALIDATION", "Please upload the badge as a PNG or JPG. A PNG with a see-through background looks best.");
  }
  const key = `badges/${claims.tenantId}/_club/badge-${Date.now()}.${mime === "image/png" ? "png" : "jpg"}`;
  await putMedia(env, key, bytes.slice().buffer as ArrayBuffer, mime);
  const url = mediaUrl(env, req.url, key);
  const previous = await setBadgeUrl(env, claims.tenantId, url);
  const oldKey = ownKey(env, claims.tenantId, previous);
  if (oldKey && oldKey !== key) await deleteMedia(env, oldKey).catch(() => undefined);
  console.log(JSON.stringify({ event: "club_badge", outcome: "uploaded", tenant: claims.tenantId, bytes: bytes.length, mime }));
  return json({ success: true, data: { badgeUrl: url } }, 200, corsHdrs);
}

export async function handleDeleteClubBadge(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await admin(req, env, corsHdrs);
  if (claims instanceof Response) return claims;
  const previous = await setBadgeUrl(env, claims.tenantId, null);
  const oldKey = ownKey(env, claims.tenantId, previous);
  if (oldKey) await deleteMedia(env, oldKey).catch(() => undefined);
  console.log(JSON.stringify({ event: "club_badge", outcome: "removed", tenant: claims.tenantId }));
  return json({ success: true, data: { badgeUrl: null } }, 200, corsHdrs);
}
