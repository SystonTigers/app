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
} as const;
export type ClubRole = keyof typeof CLUB_ROLES;

const ADMIN_ROLES = ["owner", "tenant_admin", "admin"];

export interface ClubMember {
  id: string;
  name: string;
  email: string;
  role: ClubRole | "owner";
  roles: string[];
  joinedAt: number | null;
  lastLoginAt: number | null;
  linkedPlayers: number;
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
  if (roles.includes("owner")) return "owner";
  if (roles.some((r) => ADMIN_ROLES.includes(r))) return "admin";
  if (roles.includes("manager")) return "manager";
  if (roles.includes("coach")) return "coach";
  if (roles.includes("player")) return "player";
  return "parent";
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
    try {
      const p = JSON.parse(r.profile || "{}") as { name?: unknown; firstName?: unknown; lastName?: unknown };
      name = typeof p.name === "string" && p.name.trim() ? p.name.trim() : [p.firstName, p.lastName].filter((x) => typeof x === "string" && x).join(" ");
    } catch { /* no profile */ }
    const roles = parseRoles(r.roles);
    return {
      id: r.id, email: r.email, name: name || r.email.split("@")[0], roles, role: roleLabel(roles),
      joinedAt: r.joined, lastLoginAt: r.last_login, linkedPlayers: r.linked ?? 0,
    };
  });
}

/** Change a member's role. Returns the updated member. */
export async function setMemberRole(env: Env, claims: TenantClaims, memberId: string, role: string): Promise<ClubMember> {
  if (!isClubAdmin(claims)) throw new ClubMemberError(403, "Only the club's admins can change roles.");
  if (!(role in CLUB_ROLES)) throw new ClubMemberError(400, "Choose admin, manager, coach, player or parent.");
  if (memberId === claims.userId || memberId === claims.sub) throw new ClubMemberError(400, "You can't change your own role.");
  const row = await env.DB.prepare(`SELECT roles FROM auth_users WHERE id = ? AND tenant_id = ?`).bind(memberId, claims.tenantId).first<{ roles: string }>();
  if (!row) throw new ClubMemberError(404, "That person isn't in your club.");
  const current = parseRoles(row.roles);
  if (current.includes("owner")) throw new ClubMemberError(400, "The club owner's role can't be changed.");
  const next = [...CLUB_ROLES[role as ClubRole]];
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
