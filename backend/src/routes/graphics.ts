/**
 * Graphics styles for automatic posts.
 *
 *   GET    /api/v1/social/graphics/preview/:pack/:sample   staff: JPEG preview with the club's colours and badge
 *   POST   /api/v1/social/sponsor-logo                     club admins: PNG/JPEG body
 *   DELETE /api/v1/social/sponsor-logo                     club admins
 *   GET    /api/v1/admin/tenants/:id/graphics              platform owner: packs and which are unlocked
 *   PUT    /api/v1/admin/tenants/:id/graphics/:pack        platform owner: unlock a premium pack
 *   DELETE /api/v1/admin/tenants/:id/graphics/:pack        platform owner: lock it again
 */
import { json } from "../services/util";
import { hasAnyRole, requireAdmin, requireStaff, type TenantClaims } from "../services/auth";
import { loadClubSocial, type SocialEnv } from "../services/social/club";
import { PACKS } from "../services/graphics/packs";
import { sampleGraphics } from "../services/graphics/samples";
import { imageMime } from "../services/graphics/images";
import { deleteMedia, keyFromMediaUrl, mediaUrl, putMedia } from "../services/media";

type Env = SocialEnv & { [key: string]: unknown };

const ADMIN_ROLES = ["owner", "tenant_admin", "admin", "platform_admin"] as const;
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
/** Samples shown in settings (a subset of every layout) */
export const PREVIEW_SAMPLES = ["goal", "fulltime", "lineup", "matchday", "fixtures", "table", "motm", "countdown"] as const;

function fail(corsHdrs: Headers, status: number, code: string, message: string): Response {
  return json({ success: false, error: { code, message } }, status, corsHdrs);
}

async function staff(req: Request, env: Env, corsHdrs: Headers, adminOnly = false): Promise<TenantClaims | Response> {
  try {
    const claims = await requireStaff(req, env);
    if (adminOnly && !hasAnyRole(claims, ADMIN_ROLES)) return fail(corsHdrs, 403, "FORBIDDEN", "Only the club's owner or admins can change this.");
    return claims;
  } catch (err) {
    const status = err instanceof Response ? err.status : 401;
    return status === 403 ? fail(corsHdrs, 403, "FORBIDDEN", "Only club staff can do this.") : fail(corsHdrs, 401, "UNAUTHORIZED", "Please log in again.");
  }
}

async function sha(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** A sample graphic in a pack, drawn with this club's name, colours, badge and sponsor. Cached in R2. */
export async function handleGraphicPreview(req: Request, env: Env, corsHdrs: Headers, packId: string, sample: string): Promise<Response> {
  const claims = await staff(req, env, corsHdrs);
  if (claims instanceof Response) return claims;
  const pack = PACKS.find((p) => p.id === packId);
  const name = sample.replace(/\.jpg$/, "");
  if (!pack || !(PREVIEW_SAMPLES as readonly string[]).includes(name)) return fail(corsHdrs, 404, "NOT_FOUND", "No such preview.");
  const club = await loadClubSocial(env, claims.tenantId);
  const graphic = sampleGraphics({ ...club.brand })[name];
  const key = `social/previews/${claims.tenantId}/${pack.id}-${name}-${await sha(JSON.stringify(club.brand))}.jpg`;
  const headers = new Headers(corsHdrs);
  headers.set("content-type", "image/jpeg");
  headers.set("cache-control", "private, max-age=3600");
  const cached = env.R2_MEDIA ? await env.R2_MEDIA.get(key) : null;
  if (cached) return new Response(cached.body, { headers });
  const { renderGraphic } = await import("../services/graphics/render");
  const jpeg = await renderGraphic(env, pack, graphic);
  if (env.R2_MEDIA) await env.R2_MEDIA.put(key, jpeg, { httpMetadata: { contentType: "image/jpeg" } });
  return new Response(jpeg, { headers });
}

export async function handleUploadSponsorLogo(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await staff(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  const bytes = new Uint8Array(await req.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_LOGO_BYTES) return fail(corsHdrs, 400, "VALIDATION", "The logo must be a PNG or JPG under 2 MB.");
  const mime = imageMime(bytes);
  if (mime !== "image/png" && mime !== "image/jpeg") return fail(corsHdrs, 400, "VALIDATION", "Please upload the logo as a PNG or JPG.");
  const key = `sponsors/${claims.tenantId}/logo-${Date.now()}.${mime === "image/png" ? "png" : "jpg"}`;
  await putMedia(env as never, key, bytes.buffer as ArrayBuffer, mime);
  const previous = await env.DB.prepare(`SELECT sponsor_logo_url FROM tenants WHERE id = ?`).bind(claims.tenantId).first<{ sponsor_logo_url: string | null }>();
  const url = mediaUrl(env as never, req.url, key);
  await env.DB.prepare(`UPDATE tenants SET sponsor_logo_url = ? WHERE id = ?`).bind(url, claims.tenantId).run();
  const oldKey = previous?.sponsor_logo_url ? keyFromMediaUrl(env as never, previous.sponsor_logo_url) : null;
  if (oldKey?.startsWith(`sponsors/${claims.tenantId}/`)) await deleteMedia(env as never, oldKey).catch(() => undefined);
  return json({ success: true, data: { sponsorLogoUrl: url } }, 200, corsHdrs);
}

export async function handleDeleteSponsorLogo(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await staff(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  const row = await env.DB.prepare(`SELECT sponsor_logo_url FROM tenants WHERE id = ?`).bind(claims.tenantId).first<{ sponsor_logo_url: string | null }>();
  await env.DB.prepare(`UPDATE tenants SET sponsor_logo_url = NULL WHERE id = ?`).bind(claims.tenantId).run();
  const key = row?.sponsor_logo_url ? keyFromMediaUrl(env as never, row.sponsor_logo_url) : null;
  if (key?.startsWith(`sponsors/${claims.tenantId}/`)) await deleteMedia(env as never, key).catch(() => undefined);
  return json({ success: true, data: { sponsorLogoUrl: null } }, 200, corsHdrs);
}

async function owner(req: Request, env: Env, corsHdrs: Headers): Promise<{ sub?: string } | Response> {
  try {
    return await requireAdmin(req, env);
  } catch {
    return fail(corsHdrs, 401, "UNAUTHORIZED", "Platform owner login required.");
  }
}

export async function handleGetTenantGraphics(req: Request, env: Env, corsHdrs: Headers, tenantId: string): Promise<Response> {
  const admin = await owner(req, env, corsHdrs);
  if (admin instanceof Response) return admin;
  const { results } = await env.DB.prepare(`SELECT pack_id, source, unlocked_at FROM graphics_unlocks WHERE tenant_id = ?`).bind(tenantId).all<{ pack_id: string; source: string; unlocked_at: number }>();
  const unlocks = new Map((results || []).map((r) => [r.pack_id, r]));
  return json({
    success: true,
    data: PACKS.map((p) => ({ id: p.id, name: p.name, premium: p.premium, unlocked: !p.premium || unlocks.has(p.id), source: unlocks.get(p.id)?.source ?? null })),
  }, 200, corsHdrs);
}

export async function handleSetTenantGraphics(req: Request, env: Env, corsHdrs: Headers, tenantId: string, packId: string, unlock: boolean): Promise<Response> {
  const admin = await owner(req, env, corsHdrs);
  if (admin instanceof Response) return admin;
  const pack = PACKS.find((p) => p.id === packId && p.premium);
  if (!pack) return fail(corsHdrs, 404, "NOT_FOUND", "No such premium style.");
  const tenant = await env.DB.prepare(`SELECT id FROM tenants WHERE id = ?`).bind(tenantId).first();
  if (!tenant) return fail(corsHdrs, 404, "NOT_FOUND", "Club not found.");
  if (unlock) {
    await env.DB.prepare(
      `INSERT INTO graphics_unlocks (tenant_id, pack_id, source, unlocked_by, unlocked_at) VALUES (?, ?, 'owner', ?, ?)
       ON CONFLICT(tenant_id, pack_id) DO NOTHING`,
    ).bind(tenantId, pack.id, admin.sub ?? null, Date.now()).run();
  } else {
    await env.DB.prepare(`DELETE FROM graphics_unlocks WHERE tenant_id = ? AND pack_id = ?`).bind(tenantId, pack.id).run();
  }
  console.log(JSON.stringify({ event: "graphics_unlock", outcome: unlock ? "unlocked" : "locked", tenant: tenantId, pack: pack.id }));
  return handleGetTenantGraphics(req, env, corsHdrs, tenantId);
}
