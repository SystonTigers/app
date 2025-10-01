import { jwtVerify } from "jose";

/**
 * Verify HS256 JWT using Web Crypto (jose). Cloudflare Workers compatible.
 */
export async function requireJWT(req: Request, env: any): Promise<{ sub: string; tenantId: string; role?: string; roles?: string[] }> {
  const hdr = req.headers.get("authorization") || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : "";
  if (!token) throw new Response("Unauthorized", { status: 401 });

  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE
    });

    return {
      sub: String(payload.sub || ""),
      tenantId: String((payload as any).tenantId || (payload as any).tenant_id || ""),
      role: (payload as any).role ? String((payload as any).role) : undefined,
      roles: Array.isArray((payload as any).roles) ? (payload as any).roles : undefined
    };
  } catch {
    throw new Response("Unauthorized", { status: 401 });
  }
}

/**
 * Helper to check if a user has a specific role
 */
export function hasRole(user: { role?: string; roles?: string[] }, requiredRole: string): boolean {
  if (user.role === requiredRole) return true;
  if (user.roles?.includes(requiredRole)) return true;
  return false;
}
