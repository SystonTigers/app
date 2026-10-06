/**
 * Everyone with an account at a club, and changing what they can do there.
 * Staff see the list; only the club's admins (owner, tenant_admin) change roles.
 * A role change ends that person's current sessions, so the new role applies
 * as soon as they sign in again.
 */
import type { TenantClaims } from "./auth";
import { hasAnyRole } from "./auth";
import { revokeUserTokensIssuedBefore } from "./jwtRevocation";

type Env = { DB: D1Database; KV_IDEMP?: KVNamespace };

/** Roles a club admin can give, and the account roles each one means. */
export const CLUB_ROLES = {
  admin: ["tenant_admin"],
  manager: ["manager"],
  coach: ["coach"],
  player: ["tenant_member", "player"],
  parent: ["tenant_member"],
  supporter: ["tenant_member", "supporter"],
} as const;
export type ClubRole = keyof typeof CLUB_ROLES;

const ADMIN_ROLES = ["owner", "tenant_admin", "admin"];

export interface ClubMember {
  id: string;
  name: string;
  email: string;
  role: ClubRole | "owner" | "pending";
  roles: string[];
  joinedAt: number | null;
  lastLoginAt: number | null;
  linkedPlayers: number;
  /** Set when they asked to be a coach at sign-up and an admin hasn't decided yet */
  requestedRole: "coach" | null;
  /** Waiting for approval: what they signed up as */
  joinAs: SignUpAs | null;
}

/** What people can sign themselves up as. */
export type SignUpAs = "parent" | "player" | "supporter" | "coach";

/** The role an account has while it waits for staff to approve it. */
export const PENDING_ROLE = "pending";

/** True for an account that signed itself up and hasn't been approved yet. */
export function isPendingRoles(roles: string[]): boolean {
  return roles.length > 0 && roles.every((r) => r === PENDING_ROLE);
}

export class ClubMemberError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function parseRoles(raw: string | null): string[] {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return raw ? [raw] : [];
  }
}

/** The one role label to show for a set of account roles. */
export function roleLabel(roles: string[]): ClubMember["role"] {
  if (isPendingRoles(roles)) return "pending";
  if (roles.includes("owner")) return "owner";
  if (roles.some((r) => ADMIN_ROLES.includes(r))) return "admin";
  if (roles.includes("manager")) return "manager";
  if (roles.includes("coach")) return "coach";
  if (roles.includes("player")) return "player";
  if (roles.includes("supporter")) return "supporter";
  return "parent";
}

/**
 * What someone signing themselves up gets: nothing until a member of staff
 * approves them (or they use a code from the coach for their child). Nobody
 * can make themselves staff: asking to be a coach makes them a supporter with
 * a request when they're approved.
 */
export function rolesForSignUp(requested: unknown): { roles: string[]; joinAs: SignUpAs } {
  const joinAs: SignUpAs = requested === "player" || requested === "supporter" || requested === "coach" ? requested : "parent";
  return { roles: [PENDING_ROLE], joinAs };
}

/** The roles an approved sign-up gets, and whether a coach request is left for an admin. */
export function rolesWhenApproved(joinAs: unknown): { roles: string[]; requestedRole: "coach" | null } {
  if (joinAs === "player") return { roles: [...CLUB_ROLES.player], requestedRole: null };
  if (joinAs === "supporter") return { roles: [...CLUB_ROLES.supporter], requestedRole: null };
  if (joinAs === "coach") return { roles: [...CLUB_ROLES.supporter], requestedRole: "coach" };
  return { roles: [...CLUB_ROLES.parent], requestedRole: null };
}

export function isClubAdmin(claims: Pick<TenantClaims, "roles">): boolean {
  return hasAnyRole(claims, ADMIN_ROLES);
}

const msSql = (col: string) => `(CASE WHEN ${col} > 100000000000 THEN ${col} ELSE ${col} * 1000 END)`;

export async function listClubMembers(env: Env, tenantId: string): Promise<ClubMember[]> {
  const { results } = await env.DB.prepare(
    `SELECT u.id, u.email, u.roles, u.profile, ${msSql("u.created_at")} AS joined, ${msSql("u.last_login_at")} AS last_login,
            (SELECT COUNT(*) FROM auth_user_players l WHERE l.user_id = u.id AND l.tenant_id = u.tenant_id) AS linked
     FROM auth_users u WHERE u.tenant_id = ? ORDER BY u.created_at LIMIT 2000`,
  ).bind(tenantId).all<{ id: string; email: string; roles: string; profile: string | null; joined: number | null; last_login: number | null; linked: number }>();
  return (results ?? []).map((r) => {
    let name = "";
    let asked: unknown = null;
    let joinAs: unknown = null;
    try {
      const p = JSON.parse(r.profile || "{}") as { name?: unknown; firstName?: unknown; lastName?: unknown; pendingRole?: unknown; joinAs?: unknown };
      name = typeof p.name === "string" && p.name.trim() ? p.name.trim() : [p.firstName, p.lastName].filter((x) => typeof x === "string" && x).join(" ");
      asked = p.pendingRole;
      joinAs = p.joinAs;
    } catch { /* no profile */ }
    const roles = parseRoles(r.roles);
    const role = roleLabel(roles);
    return {
      id: r.id, email: r.email, name: name || r.email.split("@")[0], roles, role,
      joinedAt: r.joined, lastLoginAt: r.last_login, linkedPlayers: r.linked ?? 0,
      requestedRole: asked === "coach" && (role === "supporter" || role === "parent" || role === "player") ? "coach" : null,
      joinAs: role === "pending" ? (joinAs === "player" || joinAs === "supporter" || joinAs === "coach" ? joinAs : "parent") : null,
    };
  });
}

/** Change a member's role. Returns the updated member. */
export async function setMemberRole(env: Env, claims: TenantClaims, memberId: string, role: string): Promise<ClubMember> {
  if (!isClubAdmin(claims)) throw new ClubMemberError(403, "Only the club's admins can change roles.");
  if (!(role in CLUB_ROLES)) throw new ClubMemberError(400, "Choose admin, manager, coach, player, parent or supporter.");
  if (memberId === claims.userId || memberId === claims.sub) throw new ClubMemberError(400, "You can't change your own role.");
  const row = await env.DB.prepare(`SELECT roles, profile FROM auth_users WHERE id = ? AND tenant_id = ?`).bind(memberId, claims.tenantId).first<{ roles: string; profile: string | null }>();
  if (!row) throw new ClubMemberError(404, "That person isn't in your club.");
  const current = parseRoles(row.roles);
  if (current.includes("owner")) throw new ClubMemberError(400, "The club owner's role can't be changed.");
  const next = [...CLUB_ROLES[role as ClubRole]];
  // An admin choosing a role answers any coach request made at sign-up
  const profile = (() => { try { return JSON.parse(row.profile || "{}") as Record<string, unknown>; } catch { return {}; } })();
  if ("pendingRole" in profile) {
    delete profile.pendingRole;
    await env.DB.prepare(`UPDATE auth_users SET profile = ? WHERE id = ? AND tenant_id = ?`).bind(JSON.stringify(profile), memberId, claims.tenantId).run();
  }
  if (JSON.stringify(current) !== JSON.stringify(next)) {
    await env.DB.prepare(`UPDATE auth_users SET roles = ?, updated_at = ? WHERE id = ? AND tenant_id = ?`)
      .bind(JSON.stringify(next), Date.now(), memberId, claims.tenantId).run();
    await revokeUserTokensIssuedBefore(env as never, claims.tenantId, memberId);
    console.log(JSON.stringify({ level: "info", msg: "club_role_changed", tenantId: claims.tenantId, memberId, role, by: claims.userId ?? claims.sub }));
  }
  const member = (await listClubMembers(env, claims.tenantId)).find((m) => m.id === memberId);
  if (!member) throw new ClubMemberError(404, "That person isn't in your club.");
  return member;
}

/**
 * Approve someone waiting to join (any member of staff). They get the role
 * they signed up as (a coach request stays for an admin to decide), and the
 * app picks up their new access the next time it checks
 * (GET /api/v1/membership).
 */
export async function approveMember(env: Env, claims: TenantClaims, memberId: string): Promise<ClubMember> {
  const row = await env.DB.prepare(`SELECT roles, profile FROM auth_users WHERE id = ? AND tenant_id = ?`).bind(memberId, claims.tenantId).first<{ roles: string; profile: string | null }>();
  if (!row) throw new ClubMemberError(404, "That person isn't in your club.");
  if (!isPendingRoles(parseRoles(row.roles))) throw new ClubMemberError(409, "They've already been let in.");
  const profile = (() => { try { return JSON.parse(row.profile || "{}") as Record<string, unknown>; } catch { return {}; } })();
  const { roles, requestedRole } = rolesWhenApproved(profile.joinAs);
  if (requestedRole) profile.pendingRole = requestedRole;
  profile.approvedAt = new Date().toISOString();
  profile.approvedBy = claims.userId ?? claims.sub ?? null;
  await env.DB.prepare(`UPDATE auth_users SET roles = ?, profile = ?, updated_at = ? WHERE id = ? AND tenant_id = ? AND roles = ?`)
    .bind(JSON.stringify(roles), JSON.stringify(profile), Date.now(), memberId, claims.tenantId, row.roles).run();
  console.log(JSON.stringify({ level: "info", msg: "club_member_approved", tenantId: claims.tenantId, memberId, by: claims.userId ?? claims.sub }));
  const member = (await listClubMembers(env, claims.tenantId)).find((m) => m.id === memberId);
  if (!member) throw new ClubMemberError(404, "That person isn't in your club.");
  return member;
}

/** Turn down someone waiting to join: their account at this club is removed. */
export async function declineMember(env: Env, claims: TenantClaims, memberId: string): Promise<void> {
  const row = await env.DB.prepare(`SELECT roles FROM auth_users WHERE id = ? AND tenant_id = ?`).bind(memberId, claims.tenantId).first<{ roles: string }>();
  if (!row) throw new ClubMemberError(404, "That person isn't in your club.");
  if (!isPendingRoles(parseRoles(row.roles))) throw new ClubMemberError(409, "Only people waiting to join can be turned down here.");
  await env.DB.prepare(`DELETE FROM auth_users WHERE id = ? AND tenant_id = ? AND roles = ?`).bind(memberId, claims.tenantId, row.roles).run();
  await revokeUserTokensIssuedBefore(env as never, claims.tenantId, memberId);
  console.log(JSON.stringify({ level: "info", msg: "club_member_declined", tenantId: claims.tenantId, memberId, by: claims.userId ?? claims.sub }));
}

/**
 * Someone waiting used a code from the coach for their child (or themselves):
 * the code proves they belong, so they're let in straight away as what they
 * signed up as (a player stays a player; anyone else becomes a parent).
 * Returns their new roles, or null if they weren't waiting.
 */
export async function admitWithCode(env: Env, tenantId: string, userId: string): Promise<string[] | null> {
  const row = await env.DB.prepare(`SELECT roles, profile FROM auth_users WHERE id = ? AND tenant_id = ?`).bind(userId, tenantId).first<{ roles: string; profile: string | null }>();
  if (!row || !isPendingRoles(parseRoles(row.roles))) return null;
  const profile = (() => { try { return JSON.parse(row.profile || "{}") as Record<string, unknown>; } catch { return {}; } })();
  const { roles, requestedRole } = rolesWhenApproved(profile.joinAs === "player" ? "player" : profile.joinAs === "coach" ? "coach" : "parent");
  if (requestedRole) profile.pendingRole = requestedRole;
  profile.approvedAt = new Date().toISOString();
  profile.approvedBy = "code";
  await env.DB.prepare(`UPDATE auth_users SET roles = ?, profile = ?, updated_at = ? WHERE id = ? AND tenant_id = ? AND roles = ?`)
    .bind(JSON.stringify(roles), JSON.stringify(profile), Date.now(), userId, tenantId, row.roles).run();
  console.log(JSON.stringify({ level: "info", msg: "club_member_admitted_with_code", tenantId, memberId: userId }));
  return roles;
}
