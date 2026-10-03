/**
 * Player pages.
 *
 *   GET /api/v1/players/:id/profile   members: bio, stats per season, photos and goal clips (services/playerProfile)
 *   PUT /api/v1/players/:id/bio       the player themselves: { bio } ("" removes it); staff may only remove it
 *   GET /api/v1/me/players            members: the players linked to my account, and which one is me
 */
import { json } from "../services/util";
import { hasAnyRole, requireTenantJWT, type TenantClaims } from "../services/auth";
import { isStaff } from "../services/playerPrivacy";
import { readBio } from "../services/playerProfile/bio";
import { isThePlayer, playerProfile } from "../services/playerProfile/profile";

type Env = { DB: D1Database; [key: string]: unknown };

function fail(corsHdrs: Headers, status: number, code: string, message: string): Response {
  return json({ success: false, error: { code, message } }, status, corsHdrs);
}

async function member(req: Request, env: Env, corsHdrs: Headers): Promise<TenantClaims | Response> {
  try {
    return await requireTenantJWT(req, env);
  } catch (err) {
    const status = err instanceof Response ? err.status : 401;
    return status === 403 ? fail(corsHdrs, 403, "FORBIDDEN", "You're not a member of this club.") : fail(corsHdrs, 401, "UNAUTHORIZED", "Please log in again.");
  }
}

export async function handleGetPlayerProfile(req: Request, env: Env, corsHdrs: Headers, playerId: string): Promise<Response> {
  const claims = await member(req, env, corsHdrs);
  if (claims instanceof Response) return claims;
  try {
    const profile = await playerProfile(env, claims, playerId);
    if (!profile) return fail(corsHdrs, 404, "NOT_FOUND", "This player isn't in the squad any more.");
    return json({ success: true, data: profile }, 200, corsHdrs);
  } catch (err) {
    console.error(JSON.stringify({ level: "error", msg: "player_profile_failed", tenantId: claims.tenantId, playerId, error: err instanceof Error ? err.message : String(err) }));
    return fail(corsHdrs, 500, "INTERNAL", "This player's page couldn't load. Please try again.");
  }
}

export async function handleSetPlayerBio(req: Request, env: Env, corsHdrs: Headers, playerId: string): Promise<Response> {
  const claims = await member(req, env, corsHdrs);
  if (claims instanceof Response) return claims;
  const exists = await env.DB.prepare(`SELECT 1 AS ok FROM squad WHERE tenant_id = ? AND id = ?`).bind(claims.tenantId, playerId).first();
  if (!exists) return fail(corsHdrs, 404, "NOT_FOUND", "This player isn't in the squad any more.");
  const self = await isThePlayer(env, claims, playerId);
  if (!self && !isStaff(claims)) return fail(corsHdrs, 403, "FORBIDDEN", "Only the player can write their own bio.");

  const body = (await req.json().catch(() => null)) as { bio?: unknown } | null;
  const read = readBio(body?.bio);
  if ("error" in read) return fail(corsHdrs, 400, "VALIDATION", read.error);
  // Staff can take a bio down, but the words are the player's own
  if (!self && read.bio) return fail(corsHdrs, 403, "FORBIDDEN", "Only the player can write their own bio. You can remove it.");

  await env.DB.prepare(`UPDATE squad SET bio = ?, bio_updated_at = ? WHERE tenant_id = ? AND id = ?`)
    .bind(read.bio || null, read.bio ? Date.now() : null, claims.tenantId, playerId).run();
  console.log(JSON.stringify({ event: "player_bio", outcome: read.bio ? "saved" : "removed", by: self ? "player" : "staff", tenant: claims.tenantId, player: playerId }));
  return json({ success: true, data: { bio: read.bio || null } }, 200, corsHdrs);
}

export async function handleMyPlayers(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await member(req, env, corsHdrs);
  if (claims instanceof Response) return claims;
  if (!claims.userId) return json({ success: true, data: [] }, 200, corsHdrs);
  const { results } = await env.DB.prepare(
    `SELECT s.id, s.name, s.bio FROM auth_user_players l JOIN squad s ON s.id = l.player_id AND s.tenant_id = l.tenant_id
     WHERE l.user_id = ? AND l.tenant_id = ? ORDER BY s.name`,
  ).bind(claims.userId, claims.tenantId).all<{ id: string; name: string; bio: string | null }>();
  const player = hasAnyRole(claims, ["player"]);
  return json({
    success: true,
    data: (results ?? []).map((r) => ({ id: r.id, name: r.name, isMe: player, hasBio: !!r.bio?.trim() })),
  }, 200, corsHdrs);
}
