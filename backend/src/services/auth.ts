import { verifyAndNormalize, requireAdminClaims, type Claims } from "./jwt";

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
 * Helper to create forbidden response
 */
function forbidden(): Response {
  return new Response(JSON.stringify({ success: false, error: { code: "FORBIDDEN" } }), {
    status: 403,
    headers: { "content-type": "application/json" }
  });
}

/**
 * Verify JWT and return normalized claims
 */
export async function requireJWT(req: Request, env: any): Promise<Claims> {
  const token = getBearer(req);
  try {
    return await verifyAndNormalize(token, env);
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
 */
export async function requireAdmin(req: Request, env: any): Promise<Claims> {
  const token = getBearer(req);
  let claims: Claims | undefined;
  try {
    claims = await verifyAndNormalize(token, env);
    // sub can be 'admin' or 'admin-user'; don't hard-reject on sub value
    requireAdminClaims(claims);
    // Optional: If you enforce system tenant for platform admin:
    // if (!isSystemTenant(claims)) throw new Error("admin must be system tenant");
    return claims;
  } catch (e: any) {
    // Add VERY CLEAR logging (but do not print full token)
    console.warn("AUTH_FAIL", {
      path: new URL(req.url).pathname,
      reason: e?.message || String(e),
      hdrPrefix: (req.headers.get("authorization") || "").slice(0, 16),
      claims, // safe: just decoded payload
    });
    throw forbidden();
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
