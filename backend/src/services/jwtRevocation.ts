/**
 * JWT Revocation Service
 * Implements token blacklist for compromised or invalidated JWTs
 *
 * Use Cases:
 * - User logout (revoke specific token)
 * - User password change (revoke all user tokens)
 * - Security breach (revoke all tenant tokens)
 * - Account suspension (revoke all user tokens)
 */

import type { Env } from "../types";
import { logJSON } from "../lib/log";

export interface RevocationEntry {
  jti?: string;        // JWT ID (if available)
  sub: string;         // Subject (user ID)
  tenantId?: string;   // Tenant ID
  exp: number;         // Original expiration timestamp
  revokedAt: number;   // When it was revoked
  reason?: string;     // Why it was revoked
}

/**
 * Generate KV key for revocation entry
 */
function revocationKey(identifier: string): string {
  return `jwt:revoked:${identifier}`;
}

/**
 * Generate KV key for user-level revocation (revokes ALL user tokens)
 */
function userRevocationKey(tenantId: string, userId: string): string {
  return `jwt:revoked:user:${tenantId}:${userId}`;
}

/**
 * Generate KV key for tenant-level revocation (revokes ALL tenant tokens)
 */
function tenantRevocationKey(tenantId: string): string {
  return `jwt:revoked:tenant:${tenantId}`;
}

/**
 * Revoke a specific JWT by its unique identifier (jti or sub)
 *
 * @param env - Cloudflare environment bindings
 * @param token - JWT claims to revoke
 * @param reason - Reason for revocation (for logging)
 * @param ttl - How long to keep the revocation entry (default: until token expires)
 */
export async function revokeToken(
  env: Env,
  token: {
    jti?: string;
    sub: string;
    tenantId?: string;
    exp: number;
  },
  reason?: string
): Promise<void> {
  const kv = env.KV_IDEMP;
  if (!kv) {
    logJSON({
      level: "warn",
      msg: "jwt_revocation_kv_missing",
      sub: token.sub,
    });
    return;
  }

  const identifier = token.jti || token.sub;
  const key = revocationKey(identifier);

  const entry: RevocationEntry = {
    jti: token.jti,
    sub: token.sub,
    tenantId: token.tenantId,
    exp: token.exp,
    revokedAt: Date.now(),
    reason,
  };

  // Store until token naturally expires
  const now = Math.floor(Date.now() / 1000);
  const ttl = Math.max(token.exp - now, 60); // At least 60 seconds

  await kv.put(key, JSON.stringify(entry), { expirationTtl: ttl });

  logJSON({
    level: "info",
    msg: "jwt_revoked",
    identifier,
    sub: token.sub,
    tenantId: token.tenantId,
    reason,
  });
}

/**
 * Revoke ALL tokens for a specific user
 * Useful for: password changes, account compromise, user logout from all devices
 *
 * @param env - Cloudflare environment bindings
 * @param tenantId - Tenant ID
 * @param userId - User ID
 * @param reason - Reason for revocation
 * @param ttl - How long to enforce revocation (default: 24 hours)
 */
export async function revokeAllUserTokens(
  env: Env,
  tenantId: string,
  userId: string,
  reason?: string,
  ttl: number = 86400 // 24 hours
): Promise<void> {
  const kv = env.KV_IDEMP;
  if (!kv) {
    logJSON({
      level: "warn",
      msg: "jwt_revocation_kv_missing",
      tenantId,
      userId,
    });
    return;
  }

  const key = userRevocationKey(tenantId, userId);
  const entry = {
    tenantId,
    userId,
    revokedAt: Date.now(),
    reason,
  };

  await kv.put(key, JSON.stringify(entry), { expirationTtl: ttl });

  logJSON({
    level: "info",
    msg: "jwt_revoked_all_user_tokens",
    tenantId,
    userId,
    reason,
    ttl,
  });
}

/**
 * Revoke ALL tokens for a specific tenant
 * Useful for: tenant suspension, security breach, tenant deletion
 *
 * @param env - Cloudflare environment bindings
 * @param tenantId - Tenant ID
 * @param reason - Reason for revocation
 * @param ttl - How long to enforce revocation (default: 7 days)
 */
export async function revokeAllTenantTokens(
  env: Env,
  tenantId: string,
  reason?: string,
  ttl: number = 604800 // 7 days
): Promise<void> {
  const kv = env.KV_IDEMP;
  if (!kv) {
    logJSON({
      level: "warn",
      msg: "jwt_revocation_kv_missing",
      tenantId,
    });
    return;
  }

  const key = tenantRevocationKey(tenantId);
  const entry = {
    tenantId,
    revokedAt: Date.now(),
    reason,
  };

  await kv.put(key, JSON.stringify(entry), { expirationTtl: ttl });

  logJSON({
    level: "info",
    msg: "jwt_revoked_all_tenant_tokens",
    tenantId,
    reason,
    ttl,
  });
}

/**
 * Check if a JWT has been revoked
 * Call this during JWT verification
 *
 * @param env - Cloudflare environment bindings
 * @param claims - JWT claims to check
 * @returns true if token is revoked, false otherwise
 */
export async function isTokenRevoked(
  env: Env,
  claims: {
    jti?: string;
    sub: string;
    tenantId?: string;
  }
): Promise<boolean> {
  const kv = env.KV_IDEMP;
  if (!kv) {
    // If KV is unavailable, allow the request (fail open)
    return false;
  }

  try {
    // Check 1: Specific token revocation
    const identifier = claims.jti || claims.sub;
    const tokenKey = revocationKey(identifier);
    const tokenRevoked = await kv.get(tokenKey);
    if (tokenRevoked) {
      logJSON({
        level: "warn",
        msg: "revoked_token_used",
        identifier,
        sub: claims.sub,
        tenantId: claims.tenantId,
      });
      return true;
    }

    // Check 2: User-level revocation (all user tokens revoked)
    if (claims.tenantId) {
      const userKey = userRevocationKey(claims.tenantId, claims.sub);
      const userRevoked = await kv.get(userKey);
      if (userRevoked) {
        const entry = JSON.parse(userRevoked);
        logJSON({
          level: "warn",
          msg: "revoked_user_token_used",
          sub: claims.sub,
          tenantId: claims.tenantId,
          reason: entry.reason,
        });
        return true;
      }
    }

    // Check 3: Tenant-level revocation (all tenant tokens revoked)
    if (claims.tenantId) {
      const tenantKey = tenantRevocationKey(claims.tenantId);
      const tenantRevoked = await kv.get(tenantKey);
      if (tenantRevoked) {
        const entry = JSON.parse(tenantRevoked);
        logJSON({
          level: "warn",
          msg: "revoked_tenant_token_used",
          tenantId: claims.tenantId,
          reason: entry.reason,
        });
        return true;
      }
    }

    return false;
  } catch (err) {
    logJSON({
      level: "error",
      msg: "jwt_revocation_check_error",
      error: err instanceof Error ? err.message : String(err),
    });
    // Fail open - allow request if revocation check fails
    return false;
  }
}

/**
 * Admin endpoint: List revoked tokens for a tenant (for debugging)
 * Note: This requires scanning KV which can be slow
 */
export async function listRevokedTokens(
  env: Env,
  tenantId: string,
  limit: number = 50
): Promise<RevocationEntry[]> {
  const kv = env.KV_IDEMP;
  if (!kv) {
    return [];
  }

  try {
    const prefix = `jwt:revoked:`;
    const list = await kv.list({ prefix, limit });
    const entries: RevocationEntry[] = [];

    for (const key of list.keys) {
      const data = await kv.get(key.name);
      if (data) {
        const entry = JSON.parse(data);
        if (!tenantId || entry.tenantId === tenantId) {
          entries.push(entry);
        }
      }
    }

    return entries;
  } catch (err) {
    logJSON({
      level: "error",
      msg: "jwt_revocation_list_error",
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}
