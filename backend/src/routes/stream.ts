/**
 * Connecting the club's YouTube channel so live streams show in the app
 * automatically (read-only access: we only look for what's live).
 *
 *   GET    /api/v1/stream/settings           staff: { youtube: { connected, channelName, needsReconnect }, canConnect }
 *   POST   /api/v1/stream/youtube/start      club admins -> { url } to send them to Google
 *   GET    /api/v1/stream/youtube/callback   Google sends them back here
 *   DELETE /api/v1/stream/youtube            club admins
 */
import { json } from "../services/util";
import { hasAnyRole, requireStaff, type TenantClaims } from "../services/auth";
import { encryptToken } from "../services/social/tokenCrypto";
import { consentUrl, exchangeCode, myChannel, youtubeConfigured } from "../services/stream/youtube";
import { reconnectKey, type StreamEnv } from "../services/stream/detect";

type Env = StreamEnv & { BACKEND_URL?: string; WORKER_BASE_URL?: string; APP_BASE_URL?: string; FRONTEND_URL?: string; [key: string]: unknown };

const ADMIN_ROLES = ["owner", "tenant_admin", "admin", "platform_admin"] as const;

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
  return `${(env.BACKEND_URL || env.WORKER_BASE_URL || "").replace(/\/+$/, "")}/api/v1/stream/youtube/callback`;
}

async function settingsPage(env: Env, tenantId: string, result: string): Promise<string> {
  const row = await env.DB.prepare(`SELECT slug FROM tenants WHERE id = ?`).bind(tenantId).first<{ slug: string }>();
  const base = (env.APP_BASE_URL || env.FRONTEND_URL || "").replace(/\/+$/, "");
  return `${base}/${row?.slug ?? ""}/admin/settings?${new URLSearchParams({ youtube: result })}`;
}

export async function handleGetStreamSettings(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await staff(req, env, corsHdrs);
  if (claims instanceof Response) return claims;
  const conn = await env.DB.prepare(`SELECT account_name FROM social_connections WHERE tenant_id = ? AND platform = 'youtube'`)
    .bind(claims.tenantId).first<{ account_name: string | null }>();
  const needsReconnect = conn ? !!(await env.KV_IDEMP.get(reconnectKey(claims.tenantId))) : false;
  return json({
    success: true,
    data: { youtube: { connected: !!conn, channelName: conn?.account_name ?? null, needsReconnect }, canConnect: youtubeConfigured(env) },
  }, 200, corsHdrs);
}

export async function handleStartYouTubeConnect(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await staff(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  if (!youtubeConfigured(env)) return fail(corsHdrs, 503, "NOT_SET_UP", "Connecting YouTube isn't set up on the server yet.");
  const state = crypto.randomUUID();
  await env.KV_IDEMP.put(`yt_state:${state}`, JSON.stringify({ tenantId: claims.tenantId, userId: claims.userId ?? null }), { expirationTtl: 600 });
  return json({ success: true, data: { url: consentUrl(env, callbackUrl(env), state) } }, 200, corsHdrs);
}

/** Google redirects here after the club admin approves (or cancels). */
export async function handleYouTubeCallback(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const state = url.searchParams.get("state") ?? "";
  const saved = state ? (await env.KV_IDEMP.get(`yt_state:${state}`, "json")) as { tenantId: string; userId: string | null } | null : null;
  if (!saved) return new Response("This link has expired. Go back to your club settings and click Connect YouTube again.", { status: 400 });
  await env.KV_IDEMP.delete(`yt_state:${state}`);

  const back = async (result: string) => Response.redirect(await settingsPage(env, saved.tenantId, result), 302);
  const code = url.searchParams.get("code");
  if (!code) return back("cancelled");

  try {
    const { refreshToken, accessToken } = await exchangeCode(env, code, callbackUrl(env));
    const channel = await myChannel(accessToken);
    if (!channel) return back("no_channel");
    await env.DB.prepare(
      `INSERT INTO social_connections (tenant_id, platform, account_id, account_name, access_token_enc, connected_by, created_at)
       VALUES (?, 'youtube', ?, ?, ?, ?, ?)
       ON CONFLICT(tenant_id, platform) DO UPDATE SET account_id = excluded.account_id, account_name = excluded.account_name,
         access_token_enc = excluded.access_token_enc, connected_by = excluded.connected_by, created_at = excluded.created_at`,
    ).bind(saved.tenantId, channel.id, channel.title, await encryptToken(env.SOCIAL_TOKEN_KEY, refreshToken), saved.userId, Date.now()).run();
    await env.KV_IDEMP.delete(reconnectKey(saved.tenantId));
    await env.KV_IDEMP.delete(`yt_access:${saved.tenantId}`);
    console.log(JSON.stringify({ event: "youtube_connect", outcome: "connected", tenant: saved.tenantId }));
    return back("connected");
  } catch (err) {
    console.log(JSON.stringify({ event: "youtube_connect", outcome: "failed", tenant: saved.tenantId, error: err instanceof Error ? err.message : String(err) }));
    return back("failed");
  }
}

export async function handleDisconnectYouTube(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await staff(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  await env.DB.prepare(`DELETE FROM social_connections WHERE tenant_id = ? AND platform = 'youtube'`).bind(claims.tenantId).run();
  await env.KV_IDEMP.delete(`yt_access:${claims.tenantId}`);
  await env.KV_IDEMP.delete(reconnectKey(claims.tenantId));
  return handleGetStreamSettings(req, env, corsHdrs);
}
