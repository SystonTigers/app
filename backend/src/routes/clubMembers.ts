/**
 * The club's people (staff only):
 *   GET /api/v1/club/members                  everyone with an account at the club
 *   PUT /api/v1/club/members/:id/role {role}  club admins: admin | manager | coach | player | parent
 *   POST /api/v1/club/members/:id/approve      any staff: let a waiting sign-up in
 *   POST /api/v1/club/members/:id/decline      any staff: turn a waiting sign-up down
 *   GET /api/v1/membership                     me: waiting or in (with a new sign-in once let in)
 */
import { json } from "../services/util";
import { requireStaff, requireTenantJWT } from "../services/auth";
import { issueTenantAdminJWT, issueTenantMemberJWT } from "../services/jwt";
import { approveMember, ClubMemberError, declineMember, isClubAdmin, isPendingRoles, listClubMembers, setMemberRole } from "../services/clubMembers";

type Env = { DB: D1Database; KV_IDEMP?: KVNamespace; [key: string]: unknown };

const fail = (corsHdrs: Headers, status: number, code: string, message: string) => json({ success: false, error: { code, message } }, status, corsHdrs);

export async function handleListClubMembers(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await requireStaff(req, env);
  const members = await listClubMembers(env, claims.tenantId);
  return json({ success: true, data: { members, canChangeRoles: isClubAdmin(claims), me: claims.sub } }, 200, corsHdrs);
}

export async function handleSetMemberRole(req: Request, env: Env, corsHdrs: Headers, memberId: string): Promise<Response> {
  const claims = await requireStaff(req, env);
  const body = (await req.json().catch(() => null)) as { role?: unknown } | null;
  try {
    const member = await setMemberRole(env, claims, memberId, typeof body?.role === "string" ? body.role : "");
    return json({ success: true, data: member }, 200, corsHdrs);
  } catch (err) {
    if (err instanceof ClubMemberError) return fail(corsHdrs, err.status, err.status === 403 ? "FORBIDDEN" : "VALIDATION", err.message);
    throw err;
  }
}

function memberError(err: unknown, corsHdrs: Headers): Response {
  if (err instanceof ClubMemberError) return fail(corsHdrs, err.status, err.status === 403 ? "FORBIDDEN" : err.status === 404 ? "NOT_FOUND" : "VALIDATION", err.message);
  throw err;
}

export async function handleApproveMember(req: Request, env: Env, corsHdrs: Headers, memberId: string): Promise<Response> {
  const claims = await requireStaff(req, env);
  try {
    return json({ success: true, data: await approveMember(env, claims, memberId) }, 200, corsHdrs);
  } catch (err) {
    return memberError(err, corsHdrs);
  }
}

export async function handleDeclineMember(req: Request, env: Env, corsHdrs: Headers, memberId: string): Promise<Response> {
  const claims = await requireStaff(req, env);
  try {
    await declineMember(env, claims, memberId);
    return json({ success: true }, 200, corsHdrs);
  } catch (err) {
    return memberError(err, corsHdrs);
  }
}

const SESSION_TTL_MINUTES = 60 * 24 * 30;

/**
 * Am I in yet? Reads the account (not the token), so the app finds out as
 * soon as staff approve; once in, it gets a new sign-in with the new access.
 */
export async function handleMembership(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  let claims;
  try {
    claims = await requireTenantJWT(req, env);
  } catch {
    return fail(corsHdrs, 401, "UNAUTHORIZED", "Please log in again.");
  }
  const row = await env.DB.prepare(`SELECT roles FROM auth_users WHERE id = ? AND tenant_id = ?`).bind(claims.userId ?? "", claims.tenantId).first<{ roles: string }>();
  if (!row) return fail(corsHdrs, 404, "NOT_MEMBER", "Your request to join wasn't accepted. You can sign up again or ask the club.");
  const roles = (() => { try { const r = JSON.parse(row.roles); return Array.isArray(r) ? r.map(String) : []; } catch { return []; } })();
  if (isPendingRoles(roles)) return json({ success: true, data: { status: "pending" } }, 200, corsHdrs);
  const tokenWasPending = isPendingRoles(claims.roles);
  const token = !tokenWasPending ? null : roles.includes("tenant_admin")
    ? await issueTenantAdminJWT(env, { tenant_id: claims.tenantId, user_id: claims.userId!, ttlMinutes: SESSION_TTL_MINUTES })
    : await issueTenantMemberJWT(env, { tenant_id: claims.tenantId, user_id: claims.userId!, roles, ttlMinutes: SESSION_TTL_MINUTES });
  return json({ success: true, data: { status: "member", roles, ...(token ? { token } : {}) } }, 200, corsHdrs);
}
