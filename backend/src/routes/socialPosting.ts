/**
 * Automatic social posting: club settings, connecting Facebook/Instagram,
 * and receiving the graphic the manager's phone draws for each post.
 *
 *   GET    /api/v1/social/settings                 staff
 *   PUT    /api/v1/social/settings                 club admins: { undoWindow?, events? }
 *   POST   /api/v1/social/meta/start               club admins -> { url } to send them to Facebook
 *   GET    /api/v1/social/meta/callback            Facebook sends them back here
 *   POST   /api/v1/social/meta/select              club admins: { key, pageId } when they run several Pages
 *   DELETE /api/v1/social/connections/:platform    club admins
 *   POST   /api/v1/social/jobs/:id/graphic         staff: JPEG body
 */
import { json } from "../services/util";
import { hasAnyRole, requireStaff, type TenantClaims } from "../services/auth";
import { encryptToken } from "../services/social/tokenCrypto";
import { exchangeCode, listPages, loginUrl, metaConfigured, type MetaPage } from "../services/social/meta";
import { isPostKind, POST_KINDS, type EventSettings } from "../services/social/content";
import { attachImage, loadClubSocial, processDueJobs, type SocialEnv } from "../services/social/jobs";
import { getPublicNamePolicy } from "../services/publicNames";

type Env = SocialEnv & { KV_IDEMP: KVNamespace; APP_BASE_URL?: string; FRONTEND_URL?: string; [key: string]: unknown };

const ADMIN_ROLES = ["owner", "tenant_admin", "admin", "platform_admin"] as const;
const MAX_GRAPHIC_BYTES = 3 * 1024 * 1024;

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
    return status === 403
      ? fail(corsHdrs, 403, "FORBIDDEN", "Only club staff can do this.")
      : fail(corsHdrs, 401, "UNAUTHORIZED", "Please log in again.");
  }
}

function callbackUrl(env: Env): string {
  return `${(env.BACKEND_URL || env.WORKER_BASE_URL || "").replace(/\/+$/, "")}/api/v1/social/meta/callback`;
}

async function settingsPage(env: Env, tenantId: string, params: Record<string, string>): Promise<string> {
  const row = await env.DB.prepare(`SELECT slug FROM tenants WHERE id = ?`).bind(tenantId).first<{ slug: string }>();
  const base = (env.APP_BASE_URL || env.FRONTEND_URL || "").replace(/\/+$/, "");
  return `${base}/${row?.slug ?? ""}/admin/settings?${new URLSearchParams(params)}`;
}

export async function handleGetSocialSettings(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await staff(req, env, corsHdrs);
  if (claims instanceof Response) return claims;
  const [club, policy] = await Promise.all([loadClubSocial(env, claims.tenantId), getPublicNamePolicy(env, claims.tenantId)]);
  return json({
    success: true,
    data: {
      nameStyle: policy.style,
      photos: policy.photos,
      undoWindow: club.undoWindow,
      events: club.settings,
      connections: club.connections,
      canConnect: metaConfigured(env) && !!env.SOCIAL_TOKEN_KEY,
    },
  }, 200, corsHdrs);
}

export async function handlePutSocialSettings(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await staff(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  const body = (await req.json().catch(() => ({}))) as { undoWindow?: unknown; events?: unknown };
  if (body.undoWindow !== undefined && typeof body.undoWindow !== "boolean") return fail(corsHdrs, 400, "VALIDATION", "undoWindow must be true or false.");

  let events: Partial<EventSettings> | undefined;
  if (body.events !== undefined) {
    if (!body.events || typeof body.events !== "object") return fail(corsHdrs, 400, "VALIDATION", "events must be an object.");
    events = {};
    for (const [kind, value] of Object.entries(body.events as Record<string, unknown>)) {
      const v = value as { feed?: unknown; social?: unknown };
      if (!isPostKind(kind) || typeof v?.feed !== "boolean" || typeof v?.social !== "boolean") {
        return fail(corsHdrs, 400, "VALIDATION", `Unknown or incomplete setting: ${kind}`);
      }
      events[kind] = { feed: v.feed, social: v.social };
    }
  }

  const club = await loadClubSocial(env, claims.tenantId);
  const merged = { ...club.settings, ...events };
  await env.DB.prepare(`UPDATE tenants SET social_undo_window = ?, social_events = ? WHERE id = ?`).bind(
    (body.undoWindow ?? club.undoWindow) ? 1 : 0,
    JSON.stringify(Object.fromEntries(POST_KINDS.map((k) => [k, merged[k]]))),
    claims.tenantId,
  ).run();
  return handleGetSocialSettings(req, env, corsHdrs);
}

export async function handleStartMetaConnect(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await staff(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  if (!metaConfigured(env) || !env.SOCIAL_TOKEN_KEY) {
    return fail(corsHdrs, 503, "NOT_SET_UP", "Facebook and Instagram posting isn't set up on the server yet.");
  }
  const state = crypto.randomUUID();
  await env.KV_IDEMP.put(`meta_state:${state}`, JSON.stringify({ tenantId: claims.tenantId, userId: claims.userId ?? null }), { expirationTtl: 600 });
  return json({ success: true, data: { url: loginUrl(env, callbackUrl(env), state) } }, 200, corsHdrs);
}

async function saveConnection(env: Env, tenantId: string, userId: string | null, page: MetaPage): Promise<void> {
  const now = Date.now();
  const token = await encryptToken(env.SOCIAL_TOKEN_KEY, page.accessToken);
  const statements = [
    env.DB.prepare(
      `INSERT INTO social_connections (tenant_id, platform, account_id, account_name, access_token_enc, connected_by, created_at)
       VALUES (?, 'facebook', ?, ?, ?, ?, ?)
       ON CONFLICT(tenant_id, platform) DO UPDATE SET account_id = excluded.account_id, account_name = excluded.account_name,
         access_token_enc = excluded.access_token_enc, connected_by = excluded.connected_by, created_at = excluded.created_at`,
    ).bind(tenantId, page.id, page.name, token, userId, now),
    page.instagram
      ? env.DB.prepare(
        `INSERT INTO social_connections (tenant_id, platform, account_id, account_name, access_token_enc, connected_by, created_at)
         VALUES (?, 'instagram', ?, ?, ?, ?, ?)
         ON CONFLICT(tenant_id, platform) DO UPDATE SET account_id = excluded.account_id, account_name = excluded.account_name,
           access_token_enc = excluded.access_token_enc, connected_by = excluded.connected_by, created_at = excluded.created_at`,
      ).bind(tenantId, page.instagram.id, page.instagram.username, token, userId, now)
      : env.DB.prepare(`DELETE FROM social_connections WHERE tenant_id = ? AND platform = 'instagram'`).bind(tenantId),
  ];
  await env.DB.batch(statements);
}

/** Facebook redirects here after the club admin approves (or cancels). */
export async function handleMetaCallback(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const state = url.searchParams.get("state") ?? "";
  const saved = state ? await env.KV_IDEMP.get(`meta_state:${state}`, "json") as { tenantId: string; userId: string | null } | null : null;
  if (!saved) return new Response("This link has expired. Go back to your club settings and click Connect again.", { status: 400 });
  await env.KV_IDEMP.delete(`meta_state:${state}`);

  const back = (params: Record<string, string>) => settingsPage(env, saved.tenantId, params).then((to) => Response.redirect(to, 302));
  const code = url.searchParams.get("code");
  if (!code) return back({ social: "cancelled" });

  try {
    const userToken = await exchangeCode(env, code, callbackUrl(env));
    const pages = await listPages(env, userToken);
    if (!pages.length) return back({ social: "no_pages" });
    if (pages.length === 1) {
      await saveConnection(env, saved.tenantId, saved.userId, pages[0]);
      return back({ social: "connected" });
    }
    // Several Pages: let them choose on the settings page
    const key = crypto.randomUUID();
    await env.KV_IDEMP.put(`meta_pages:${key}`, JSON.stringify({ tenantId: saved.tenantId, userId: saved.userId, pages }), { expirationTtl: 900 });
    return back({ social: "choose", key });
  } catch (err) {
    console.log(JSON.stringify({ event: "meta_connect", outcome: "failed", tenant: saved.tenantId, error: err instanceof Error ? err.message : String(err) }));
    return back({ social: "failed" });
  }
}

/** Page names to choose from (tokens are never sent to the browser). */
export async function handleListMetaChoices(req: Request, env: Env, corsHdrs: Headers, key: string): Promise<Response> {
  const claims = await staff(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  const saved = await env.KV_IDEMP.get(`meta_pages:${key}`, "json") as { tenantId: string; pages: MetaPage[] } | null;
  if (!saved || saved.tenantId !== claims.tenantId) return fail(corsHdrs, 404, "EXPIRED", "That choice has expired. Click Connect again.");
  return json({ success: true, data: saved.pages.map((p) => ({ id: p.id, name: p.name, instagram: p.instagram?.username ?? null })) }, 200, corsHdrs);
}

export async function handleSelectMetaPage(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await staff(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  const body = (await req.json().catch(() => ({}))) as { key?: unknown; pageId?: unknown };
  const saved = typeof body.key === "string"
    ? await env.KV_IDEMP.get(`meta_pages:${body.key}`, "json") as { tenantId: string; userId: string | null; pages: MetaPage[] } | null
    : null;
  if (!saved || saved.tenantId !== claims.tenantId) return fail(corsHdrs, 404, "EXPIRED", "That choice has expired. Click Connect again.");
  const page = saved.pages.find((p) => p.id === body.pageId);
  if (!page) return fail(corsHdrs, 400, "VALIDATION", "Choose one of your Pages.");
  await saveConnection(env, claims.tenantId, saved.userId, page);
  await env.KV_IDEMP.delete(`meta_pages:${body.key as string}`);
  return handleGetSocialSettings(req, env, corsHdrs);
}

export async function handleDisconnectSocial(req: Request, env: Env, corsHdrs: Headers, platform: string): Promise<Response> {
  const claims = await staff(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  // Facebook and Instagram share one connection, so disconnecting removes both
  if (platform !== "facebook" && platform !== "instagram" && platform !== "meta") return fail(corsHdrs, 404, "NOT_FOUND", "Unknown connection.");
  await env.DB.prepare(`DELETE FROM social_connections WHERE tenant_id = ? AND platform IN ('facebook', 'instagram')`).bind(claims.tenantId).run();
  return handleGetSocialSettings(req, env, corsHdrs);
}

/** The phone's rendered graphic (JPEG). If the post is already due it goes out straight away. */
export async function handleUploadGraphic(req: Request, env: Env, corsHdrs: Headers, jobId: string, ctx?: ExecutionContext): Promise<Response> {
  const claims = await staff(req, env, corsHdrs);
  if (claims instanceof Response) return claims;
  const type = req.headers.get("content-type") || "";
  if (!type.startsWith("image/jpeg")) return fail(corsHdrs, 400, "VALIDATION", "Send the graphic as a JPEG.");
  const bytes = await req.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > MAX_GRAPHIC_BYTES) return fail(corsHdrs, 400, "VALIDATION", "The graphic must be under 3 MB.");
  const jpeg = new Uint8Array(bytes);
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) return fail(corsHdrs, 400, "VALIDATION", "That isn't a JPEG image.");

  const job = await attachImage(env, claims.tenantId, jobId, bytes);
  if (!job) return fail(corsHdrs, 404, "NOT_FOUND", "Post not found.");
  if (job.status === "pending" && job.postAfter <= Date.now()) {
    const work = processDueJobs(env, { jobId, tenantId: claims.tenantId });
    if (ctx) ctx.waitUntil(work); else await work;
  }
  return json({ success: true, data: job }, 200, corsHdrs);
}
