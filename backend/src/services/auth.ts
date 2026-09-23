import { verifyAndNormalize, verifyAdminJWT, requireAdminClaims, type Claims } from "./jwt";
import { isTokenRevoked } from "./jwtRevocation";

/**
 * Helper to extract Bearer token from request
 */
function getBearer(req: Request): string {
  const hdr = req.headers.get("authorization") || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : "";
  if (!token) {throw new Response("Unauthorized", { status: 401 });}
  return token;
}

/**
 * Helper to extract JWT from either Authorization header or owner_session cookie
 */
function getToken(req: Request): string {
  // Try Bearer token first
  const authHdr = req.headers.get("authorization") || "";
  if (authHdr.startsWith("Bearer ")) {
    return authHdr.slice(7);
  }

  // Fall back to cookie
  const cookieHdr = req.headers.get("cookie") || "";
  const match = cookieHdr.match(/(?:^|;\s*)owner_session=([^;]+)/);
  if (match && match[1]) {
    return match[1];
  }

  throw new Response("Unauthorized", { status: 401 });
}

/**
 * Helper to create forbidden response
 */
function forbidden(message?: string): Response {
  const body: { success: false; error: { code: string; message?: string } } = {
    success: false,
    error: { code: "FORBIDDEN" },
  };
  if (message) {
    body.error.message = message;
  }
  return new Response(JSON.stringify(body), {
    status: 403,
    headers: { "content-type": "application/json" }
  });
}

// Records requests whose auth check failed. Many route handlers catch every
// error (including the thrown 401 Response) and return a generic 500; the
// top-level fetch handler uses this to turn those back into a proper 401/403
// so clients can tell "log in again" apart from "server broke".
const authFailures = new WeakMap<Request, 401 | 403>();

/** Status of a failed auth check on this request, if any. */
export function getAuthFailure(req: Request): 401 | 403 | undefined {
  return authFailures.get(req);
}

/**
 * Verify JWT and return normalized claims
 * Includes revocation check
 */
export async function requireJWT(req: Request, env: any): Promise<Claims> {
  try {
    const token = getToken(req);
    const claims = await verifyAndNormalize(token, env);

    // Check if token has been revoked
    const revoked = await isTokenRevoked(env, {
      jti: (claims as any).jti,
      sub: claims.sub || "",
      tenantId: claims.tenantId,
    });

    if (revoked) {
      throw new Response("Unauthorized - Token revoked", { status: 401 });
    }

    return claims;
  } catch (e: any) {
    authFailures.set(req, 401);
    throw new Response("Unauthorized", { status: 401 });
  }
}

/** Claims guaranteed to be scoped to a tenant. */
export type TenantClaims = Claims & { tenantId: string };

/**
 * Like requireJWT, but also rejects tokens that aren't scoped to a tenant.
 * Use for any route that reads or writes tenant data.
 */
export async function requireTenantJWT(req: Request, env: any): Promise<TenantClaims> {
  const claims = await requireJWT(req, env);
  if (!claims.tenantId) {
    authFailures.set(req, 403);
    throw new Response("Forbidden - token has no tenant", { status: 403 });
  }
  return claims as TenantClaims;
}

/** Roles allowed to change club content (fixtures, results, squad, news). */
export const STAFF_ROLES = ["admin", "tenant_admin", "owner", "platform_admin", "manager", "coach"] as const;

/**
 * Tenant-scoped JWT that also has a staff role. Parents/players (tenant_member)
 * get 403 - they can read club content but not change it.
 */
export async function requireStaff(req: Request, env: any): Promise<TenantClaims> {
  const claims = await requireTenantJWT(req, env);
  if (!hasAnyRole(claims, STAFF_ROLES)) {
    authFailures.set(req, 403);
    throw new Response("Forbidden - staff only", { status: 403 });
  }
  return claims;
}

/** True if the claims include any of the given roles. */
export function hasAnyRole(claims: Pick<Claims, "roles">, roles: readonly string[]): boolean {
  return (claims.roles || []).some((r) => roles.includes(r));
}

/**
 * Require admin role with detailed logging
 * Supports both Bearer token (Authorization header) and owner_session cookie
 */
export async function requireAdmin(req: Request, env: any): Promise<Claims> {
  const url = new URL(req.url);
  const token = getToken(req);
  let claims: Claims | undefined;
  try {
    // Admin tokens use 'syston-admin' audience, not the default mobile audience
    claims = await verifyAdminJWT(token, env);
    // sub can be 'admin' or 'admin-user'; don't hard-reject on sub value
    requireAdminClaims(claims);

    // Check if token has been revoked
    const revoked = await isTokenRevoked(env, {
      jti: (claims as any).jti,
      sub: claims.sub || "",
      tenantId: claims.tenantId,
    });

    if (revoked) {
      throw new Error("Token revoked");
    }

    return claims;
  } catch (e: any) {
    throw forbidden();
  }
}

export async function requireTenantAdminOrPlatform(
  req: Request,
  env: any,
  tenantId: string
): Promise<{ claims: Claims; scope: "platform_admin" | "tenant_admin" }> {
  const url = new URL(req.url);
  let adminFailure: Response | null = null;

  try {
    const claims = await requireAdmin(req, env);
    return { claims, scope: "platform_admin" };
  } catch (err) {
    if (err instanceof Response) {
      adminFailure = err;
    } else {
      throw err;
    }
  }

  try {
    const claims = await requireJWT(req, env);
    const allowedRoles = new Set(["admin", "tenant_admin", "owner"]);
    const tenant = claims.tenantId;

    if (!tenant || tenant !== tenantId) {
      throw forbidden("tenant_mismatch");
    }

    const hasAllowed = claims.roles.some((role) => allowedRoles.has(role));
    if (!hasAllowed) {
      throw forbidden("requires tenant_admin role");
    }

    return { claims, scope: "tenant_admin" };
  } catch (err) {
    if (err instanceof Response) {throw err;}
    throw adminFailure ?? forbidden();
  }
}

/**
 * Helper to check if a user has a specific role
 */
export function hasRole(user: Claims | { role?: string; roles?: string[] }, requiredRole: string): boolean {
  if ('roles' in user && Array.isArray(user.roles)) {
    return user.roles.includes(requiredRole);
  }
  if ('role' in user && user.role === requiredRole) {return true;}
  return false;
}
