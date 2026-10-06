/**
 * Linking parents to their children.
 *
 *   POST   /api/v1/players/:id/parent-invite        staff: a new invite code for this player's family
 *   GET    /api/v1/players/:id/parents              staff: accounts linked to the player
 *   DELETE /api/v1/players/:id/parents/:userId      staff: remove a link
 *   POST   /api/v1/link-child                       member: { code } links their account to the child
 */
import { json } from "../services/util";
import { requireStaff, requireTenantJWT, type TenantClaims } from "../services/auth";
import { createInvite, linkedParents, ParentLinkError, redeemInvite, unlinkParent } from "../services/parentLinks";
import { rateLimit } from "../middleware/rateLimit";
import { admitWithCode } from "../services/clubMembers";
import { issueTenantMemberJWT } from "../services/jwt";

type Env = { DB: D1Database; [key: string]: unknown };

function fail(corsHdrs: Headers, status: number, code: string, message: string): Response {
  return json({ success: false, error: { code, message } }, status, corsHdrs);
}

async function auth(req: Request, env: Env, corsHdrs: Headers, staff: boolean): Promise<TenantClaims | Response> {
  try {
    return staff ? await requireStaff(req, env) : await requireTenantJWT(req, env);
  } catch (err) {
    const status = err instanceof Response ? err.status : 401;
    return status === 403 ? fail(corsHdrs, 403, "FORBIDDEN", "Only club staff can do this.") : fail(corsHdrs, 401, "UNAUTHORIZED", "Please log in again.");
  }
}

function handled(corsHdrs: Headers, where: string, err: unknown): Response {
  if (err instanceof ParentLinkError) return fail(corsHdrs, err.status, err.code, err.message);
  console.error(JSON.stringify({ level: "error", msg: "parent_link_error", where, error: err instanceof Error ? err.message : String(err) }));
  return fail(corsHdrs, 500, "INTERNAL", "Something went wrong. Please try again.");
}

export async function handleCreateParentInvite(req: Request, env: Env, corsHdrs: Headers, playerId: string): Promise<Response> {
  const claims = await auth(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  try {
    return json({ success: true, data: await createInvite(env, claims, playerId) }, 200, corsHdrs);
  } catch (err) {
    return handled(corsHdrs, "invite", err);
  }
}

export async function handleListParents(req: Request, env: Env, corsHdrs: Headers, playerId: string): Promise<Response> {
  const claims = await auth(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  try {
    return json({ success: true, data: await linkedParents(env, claims.tenantId, playerId) }, 200, corsHdrs);
  } catch (err) {
    return handled(corsHdrs, "list", err);
  }
}

export async function handleUnlinkParent(req: Request, env: Env, corsHdrs: Headers, playerId: string, userId: string): Promise<Response> {
  const claims = await auth(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  try {
    if (!(await unlinkParent(env, claims.tenantId, playerId, userId))) return fail(corsHdrs, 404, "NOT_FOUND", "That account isn't linked to this player.");
    return json({ success: true, data: await linkedParents(env, claims.tenantId, playerId) }, 200, corsHdrs);
  } catch (err) {
    return handled(corsHdrs, "unlink", err);
  }
}

export async function handleLinkChild(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await auth(req, env, corsHdrs, false);
  if (claims instanceof Response) return claims;
  // Slows down anyone trying to guess codes
  const limited = await rateLimit(req, env as never, { scope: "link-child", limit: 10, windowSeconds: 900, path: "/api/v1/link-child" });
  if (!limited.ok) return fail(corsHdrs, 429, "RATE_LIMITED", "Too many tries. Please wait a few minutes and try again.");
  const body = (await req.json().catch(() => null)) as { code?: unknown } | null;
  if (typeof body?.code !== "string" || !body.code.trim()) return fail(corsHdrs, 400, "VALIDATION", "Enter the code from the manager.");
  try {
    const linked = await redeemInvite(env, claims, body.code);
    // A code from the coach lets someone still waiting to join straight in
    const roles = claims.userId ? await admitWithCode(env, claims.tenantId, claims.userId) : null;
    const token = roles ? await issueTenantMemberJWT(env, { tenant_id: claims.tenantId, user_id: claims.userId!, roles, ttlMinutes: 60 * 24 * 30 }) : null;
    return json({ success: true, data: { ...linked, ...(token ? { letIn: true, token, roles } : {}) } }, 200, corsHdrs);
  } catch (err) {
    return handled(corsHdrs, "redeem", err);
  }
}
