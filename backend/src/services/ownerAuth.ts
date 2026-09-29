/**
 * Platform owner sign-in for the owner panel. Owners are in platform_owners
 * (created by scripts/create-owner.mjs, never through the API). A successful
 * sign-in gets a short-lived admin token (audience syston-admin, roles admin +
 * platform_owner) that the website keeps in an HttpOnly cookie.
 */
import { SignJWT } from "jose";
import { requireAdmin } from "./auth";
import { revokeToken } from "./jwtRevocation";
import type { Claims } from "./jwt";

export const OWNER_SESSION_HOURS = 12;
const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8.QhGl6jAnKxLhfVlBrO1aVcgsDD6i"; // keeps timing the same for unknown emails

export class OwnerAuthError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

function secretKey(env: { JWT_SECRET?: string }): Uint8Array {
  const raw = env.JWT_SECRET || "";
  try {
    return Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  } catch {
    return new TextEncoder().encode(raw);
  }
}

/** Check the email and password; returns a session token. */
export async function ownerLogin(env: { DB: D1Database; JWT_SECRET?: string; JWT_ISSUER?: string }, email: string, password: string, now = Date.now()): Promise<{ token: string; email: string; expiresAt: number }> {
  const clean = email.trim().toLowerCase();
  const owner = await env.DB.prepare(`SELECT id, email, password_hash FROM platform_owners WHERE email = ?`).bind(clean).first<{ id: string; email: string; password_hash: string }>();
  const bcrypt = await import("bcryptjs");
  const ok = await bcrypt.compare(password, owner?.password_hash ?? DUMMY_HASH);
  if (!owner || !ok) {
    console.warn(JSON.stringify({ level: "warn", msg: "owner_login_failed" }));
    throw new OwnerAuthError(401, "INVALID_LOGIN", "That email and password don't match.");
  }
  const iat = Math.floor(now / 1000);
  const exp = iat + OWNER_SESSION_HOURS * 3600;
  const token = await new SignJWT({ roles: ["admin", "platform_owner"], email: owner.email, tenant_id: "platform" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(owner.id)
    .setJti(crypto.randomUUID())
    .setIssuer(env.JWT_ISSUER ?? "")
    .setAudience("syston-admin")
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(secretKey(env));
  await env.DB.prepare(`UPDATE platform_owners SET last_login_at = ? WHERE id = ?`).bind(now, owner.id).run();
  console.log(JSON.stringify({ level: "info", msg: "owner_login", ownerId: owner.id }));
  return { token, email: owner.email, expiresAt: exp * 1000 };
}

/** A signed-in platform owner (not just any admin token). */
export async function requireOwner(req: Request, env: unknown): Promise<Claims> {
  const claims = await requireAdmin(req, env);
  if (!claims.roles.includes("platform_owner") || !claims.userId) throw new OwnerAuthError(403, "FORBIDDEN", "Only platform owners can do this.");
  return claims;
}

/** Sign out: the token stops working straight away. */
export async function ownerLogout(env: unknown, claims: Claims): Promise<void> {
  await revokeToken(env as never, { jti: claims.jti, sub: claims.sub ?? "", exp: claims.exp ?? Math.floor(Date.now() / 1000) + OWNER_SESSION_HOURS * 3600 }, "owner_logout");
}
