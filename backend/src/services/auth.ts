import { verifyAndNormalize, verifyAdminJWT, requireAdminClaims, type Claims } from "./jwt";
import { isTokenRevoked } from "./jwtRevocation";

/**
 * Helper to extract Bearer token from request
 */
function getBearer(req: Request): string {
  const hdr = req.headers.get("authorization") || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : "";
  if (!token) throw new Response("Unauthorized", { status: 401 });
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

/**
 * Verify JWT and return normalized claims
 * Includes revocation check
 */
export async function requireJWT(req: Request, env: any): Promise<Claims> {
  const token = getBearer(req);
  try {
    const claims = await verifyAndNormalize(token, env);

    // Check if token has been revoked
    const revoked = await isTokenRevoked(env, {
      jti: (claims as any).jti,
      sub: claims.sub,
      tenantId: claims.tenantId,
    });

    if (revoked) {
      console.warn("JWT_REVOKED", {
        path: new URL(req.url).pathname,
        sub: claims.sub,
        tenantId: claims.tenantId,
      });
      throw new Response("Unauthorized - Token revoked", { status: 401 });
    }

    return claims;
  } catch (e: any) {
    console.warn("JWT_VERIFY_FAIL", {
      path: new URL(req.url).pathname,
      reason: e?.message || String(e),
    });
    throw new Response("Unauthorized", { status: 401 });
  }
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
      sub: claims.sub,
      tenantId: claims.tenantId,
    });

    if (revoked) {
      // Structured log for revoked token
      console.log(JSON.stringify({
        ts: new Date().toISOString(),
        event: "authz_deny",
        route: url.pathname,
        sub: claims.sub,
        aud: claims.aud,
        roles: claims.roles,
        tenantId: claims.tenantId,
        decision: "deny",
        reason: "token_revoked",
      }));
      throw new Error("Token revoked");
    }

    // Success - log authorization grant
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      event: "authz_grant",
      route: url.pathname,
      sub: claims.sub,
      aud: claims.aud,
      roles: claims.roles,
      tenantId: claims.tenantId,
      decision: "grant",
    }));

    return claims;
  } catch (e: any) {
    // Structured log for authorization failure
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      event: "authz_deny",
      route: url.pathname,
      sub: claims?.sub,
      aud: claims?.aud,
      roles: claims?.roles,
      tenantId: claims?.tenantId,
      decision: "deny",
      reason: e?.message || "auth_failed",
      hasAuthHeader: !!req.headers.get("authorization"),
      hasCookie: req.headers.get("cookie")?.includes("owner_session") || false,
    }));
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
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      event: "authz_grant",
      route: url.pathname,
      sub: claims.sub,
      aud: claims.aud,
      roles: claims.roles,
      tenantId: claims.tenantId,
      requestedTenant: tenantId,
      decision: "grant",
      scope: "platform_admin",
    }));
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
      console.log(JSON.stringify({
        ts: new Date().toISOString(),
        event: "authz_deny",
        route: url.pathname,
        sub: claims.sub,
        aud: claims.aud,
        roles: claims.roles,
        tenantId: claims.tenantId,
        requestedTenant: tenantId,
        decision: "deny",
        reason: "tenant_mismatch",
      }));
      throw forbidden("tenant_mismatch");
    }

    const hasAllowed = claims.roles.some((role) => allowedRoles.has(role));
    if (!hasAllowed) {
      console.log(JSON.stringify({
        ts: new Date().toISOString(),
        event: "authz_deny",
        route: url.pathname,
        sub: claims.sub,
        aud: claims.aud,
        roles: claims.roles,
        tenantId: claims.tenantId,
        requestedTenant: tenantId,
        decision: "deny",
        reason: "role_mismatch",
        allowedRoles: Array.from(allowedRoles),
      }));
      throw forbidden("requires tenant_admin role");
    }

    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      event: "authz_grant",
      route: url.pathname,
      sub: claims.sub,
      aud: claims.aud,
      roles: claims.roles,
      tenantId: claims.tenantId,
      requestedTenant: tenantId,
      decision: "grant",
      scope: "tenant_admin",
    }));

    return { claims, scope: "tenant_admin" };
  } catch (err) {
    if (err instanceof Response) throw err;
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
  if ('role' in user && user.role === requiredRole) return true;
  return false;
}
