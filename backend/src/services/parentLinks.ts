/**
 * Linking a parent's account to their child. Staff create an invite code for
 * a player and share it with the family; a parent enters it (or opens the
 * link) in the app. Only a hash of the code is stored, codes are long enough
 * that guessing isn't practical, and each works for 30 days and a few uses.
 */
import { hasAnyRole, STAFF_ROLES, type TenantClaims } from "./auth";

type DB = { DB: D1Database };

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I
export const INVITE_DAYS = 30;
export const INVITE_MAX_USES = 4;

export class ParentLinkError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

/** "K7QM-3XRD": 8 characters, about 40 bits. */
export function newInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const chars = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4)}`;
}

/** Codes are typed by hand: ignore case, spaces and dashes. */
export function normaliseCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function hashCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normaliseCode(code)));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Staff: a fresh invite for this player (any earlier one stops working). */
export async function createInvite(env: DB, claims: TenantClaims, playerId: string, now = Date.now()): Promise<{ code: string; expiresAt: number; playerName: string }> {
  const player = await env.DB.prepare(`SELECT name FROM squad WHERE tenant_id = ? AND id = ?`).bind(claims.tenantId, playerId).first<{ name: string }>();
  if (!player) throw new ParentLinkError(404, "NOT_FOUND", "Player not found.");
  const code = newInviteCode();
  const expiresAt = now + INVITE_DAYS * 86_400_000;
  await env.DB.batch([
    env.DB.prepare(`UPDATE parent_invites SET revoked_at = ? WHERE tenant_id = ? AND player_id = ? AND revoked_at IS NULL`).bind(now, claims.tenantId, playerId),
    env.DB.prepare(`INSERT INTO parent_invites (id, tenant_id, player_id, code_hash, created_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), claims.tenantId, playerId, await hashCode(code), claims.userId ?? null, now, expiresAt),
  ]);
  console.log(JSON.stringify({ level: "info", msg: "parent_invite_created", tenantId: claims.tenantId, playerId }));
  return { code, expiresAt, playerName: player.name };
}

/** A parent enters the code: their account is linked to the child. */
export async function redeemInvite(env: DB, claims: TenantClaims, code: string, now = Date.now()): Promise<{ playerId: string; name: string; alreadyLinked: boolean }> {
  if (!claims.userId) throw new ParentLinkError(401, "UNAUTHORIZED", "Please log in again.");
  if (normaliseCode(code).length !== 8) throw new ParentLinkError(400, "VALIDATION", "The code is 8 letters and numbers, like K7QM-3XRD.");
  const invite = await env.DB.prepare(
    `SELECT i.id, i.player_id, i.expires_at, i.uses, i.revoked_at, s.name FROM parent_invites i
     JOIN squad s ON s.id = i.player_id AND s.tenant_id = i.tenant_id
     WHERE i.code_hash = ? AND i.tenant_id = ?`,
  ).bind(await hashCode(code), claims.tenantId).first<{ id: string; player_id: string; expires_at: number; uses: number; revoked_at: number | null; name: string }>();
  const fail = (message: string) => new ParentLinkError(404, "INVALID_CODE", message);
  if (!invite) throw fail("That code didn't work. Check it with the manager.");
  if (invite.revoked_at || invite.expires_at < now) throw fail("That code has expired. Ask the manager for a new one.");

  const existing = await env.DB.prepare(`SELECT 1 AS hit FROM auth_user_players WHERE user_id = ? AND player_id = ? AND tenant_id = ?`).bind(claims.userId, invite.player_id, claims.tenantId).first();
  if (existing) return { playerId: invite.player_id, name: invite.name, alreadyLinked: true };
  if (invite.uses >= INVITE_MAX_USES) throw fail("That code has been used too many times. Ask the manager for a new one.");

  await env.DB.batch([
    env.DB.prepare(`INSERT OR IGNORE INTO auth_user_players (user_id, player_id, tenant_id, created_at) VALUES (?, ?, ?, ?)`)
      .bind(claims.userId, invite.player_id, claims.tenantId, Math.floor(now / 1000)),
    env.DB.prepare(`UPDATE parent_invites SET uses = uses + 1 WHERE id = ? AND tenant_id = ?`).bind(invite.id, claims.tenantId),
  ]);
  console.log(JSON.stringify({ level: "info", msg: "parent_linked", tenantId: claims.tenantId, playerId: invite.player_id }));
  return { playerId: invite.player_id, name: invite.name, alreadyLinked: false };
}

export interface LinkedParent { userId: string; email: string; linkedAt: number | null }

/** Staff: the accounts linked to a player (to spot a wrong link). */
export async function linkedParents(env: DB, tenantId: string, playerId: string): Promise<LinkedParent[]> {
  const { results } = await env.DB.prepare(
    `SELECT l.user_id, u.email, l.created_at FROM auth_user_players l
     JOIN auth_users u ON u.id = l.user_id
     WHERE l.tenant_id = ? AND l.player_id = ? ORDER BY l.created_at`,
  ).bind(tenantId, playerId).all<{ user_id: string; email: string; created_at: number | null }>();
  return (results ?? []).map((r) => ({ userId: r.user_id, email: r.email, linkedAt: r.created_at }));
}

/** Staff: remove a link (e.g. the wrong parent used the code). */
export async function unlinkParent(env: DB, tenantId: string, playerId: string, userId: string): Promise<boolean> {
  const res = await env.DB.prepare(`DELETE FROM auth_user_players WHERE tenant_id = ? AND player_id = ? AND user_id = ?`).bind(tenantId, playerId, userId).run();
  const removed = (res.meta?.changes ?? 0) > 0;
  if (removed) console.log(JSON.stringify({ level: "info", msg: "parent_unlinked", tenantId, playerId }));
  return removed;
}

export const isStaffClaims = (claims: TenantClaims) => hasAnyRole(claims, STAFF_ROLES);
