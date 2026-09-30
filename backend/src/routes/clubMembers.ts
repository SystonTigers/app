/**
 * The club's people (staff only):
 *   GET /api/v1/club/members                  everyone with an account at the club
 *   PUT /api/v1/club/members/:id/role {role}  club admins: admin | manager | coach | player | parent
 */
import { json } from "../services/util";
import { requireStaff } from "../services/auth";
import { ClubMemberError, isClubAdmin, listClubMembers, setMemberRole } from "../services/clubMembers";

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
