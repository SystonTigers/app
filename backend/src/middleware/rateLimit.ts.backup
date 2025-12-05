import { logJSON } from "../lib/log";
import type { Env } from "../types";

export interface RateLimitOptions {
  scope?: string;
  limit?: number;
  windowSeconds?: number;
  requestId?: string;
  path?: string;
  tenantId?: string; // For per-tenant rate limiting
  tenantLimit?: number; // Optional tenant-specific limit
  tenantWindow?: number; // Optional tenant-specific window
}

export interface RateLimitResult {
  ok: boolean;
  remaining?: number;
  limit?: number;
  retryAfter?: number;
}

const DEFAULT_LIMIT = 60;
const DEFAULT_WINDOW = 60;
const DEFAULT_SCOPE = "global";

// Tenant-specific rate limits (can be configured per plan)
export const TENANT_RATE_LIMITS = {
  STARTER: {
    limit: 500,  // 500 requests per minute
    window: 60,
  },
  PRO: {
    limit: 2000, // 2000 requests per minute
    window: 60,
  },
  ENTERPRISE: {
    limit: 10000, // 10000 requests per minute
    window: 60,
  },
};

export async function rateLimit(
  request: Request,
  env: Env,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const environment = env.ENVIRONMENT || env.NODE_ENV || "development";
  if (environment !== "production") {
    return { ok: true };
  }

  const kv = env.RATE_LIMIT_KV;
  if (!kv) {
    return { ok: true };
  }

  const limit = options.limit ?? DEFAULT_LIMIT;
  const windowSeconds = options.windowSeconds ?? DEFAULT_WINDOW;
  const scope = options.scope ?? DEFAULT_SCOPE;
  const requestId = options.requestId;
  const path = options.path || new URL(request.url).pathname;

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const key = `rl:${scope}:${ip}`;

  try {
    // Check IP-based rate limit
    const stored = await kv.get(key);
    let remaining = stored ? Number.parseInt(stored, 10) : limit;
    if (!Number.isFinite(remaining)) {
      remaining = limit;
    }

    if (remaining <= 0) {
      const retryAfter = windowSeconds;
      logJSON({
        level: "warn",
        msg: "rate_limited_ip",
        path,
        requestId,
        ip,
        status: 429
      });
      return { ok: false, remaining: 0, limit, retryAfter };
    }

    // Check per-tenant rate limit if tenantId provided
    if (options.tenantId) {
      const tenantLimit = options.tenantLimit ?? 1000; // Default 1000 requests per tenant
      const tenantWindow = options.tenantWindow ?? 60; // Default 60 seconds
      const tenantKey = `rl:tenant:${options.tenantId}:${scope}`;

      const tenantStored = await kv.get(tenantKey);
      let tenantRemaining = tenantStored ? Number.parseInt(tenantStored, 10) : tenantLimit;
      if (!Number.isFinite(tenantRemaining)) {
        tenantRemaining = tenantLimit;
      }

      if (tenantRemaining <= 0) {
        logJSON({
          level: "warn",
          msg: "rate_limited_tenant",
          path,
          requestId,
          tenantId: options.tenantId,
          status: 429
        });
        return { ok: false, remaining: 0, limit: tenantLimit, retryAfter: tenantWindow };
      }

      // Decrement tenant counter
      const nextTenantRemaining = tenantRemaining - 1;
      await kv.put(tenantKey, String(nextTenantRemaining), { expirationTtl: tenantWindow });
    }

    // Decrement IP counter
    const nextRemaining = remaining - 1;
    await kv.put(key, String(nextRemaining), { expirationTtl: windowSeconds });
    return { ok: true, remaining: nextRemaining, limit };
  } catch (err: unknown) {
    logJSON({
      level: "error",
      msg: "rate_limit_error",
      status: 500,
      path,
      requestId
    });
    return { ok: true };
  }
}

/**
 * Apply rate limiting with tenant awareness from JWT claims
 * Use this helper when you have JWT claims available
 *
 * @example
 * ```typescript
 * const claims = await requireJWT(req, env);
 * const rateLimitResult = await rateLimitWithTenant(req, env, claims, {
 *   scope: 'api',
 *   limit: 60,
 *   tenantLimit: 1000
 * });
 * if (!rateLimitResult.ok) {
 *   return json({ error: 'Rate limited' }, 429, corsHdrs);
 * }
 * ```
 */
export async function rateLimitWithTenant(
  request: Request,
  env: Env,
  claims: { tenantId?: string },
  options: Omit<RateLimitOptions, 'tenantId'> = {}
): Promise<RateLimitResult> {
  return rateLimit(request, env, {
    ...options,
    tenantId: claims.tenantId,
  });
}
