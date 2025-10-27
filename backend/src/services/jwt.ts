import { SignJWT, jwtVerify } from "jose";

// Claim types for normalization
export type RawClaims = {
  iss?: string; aud?: string; sub?: string;
  roles?: string[]; role?: string;
  tenantId?: string; tenant_id?: string; tenant?: string;
  iat?: number; exp?: number;
};

export type Claims = {
  iss: string;
  aud?: string;
  sub?: string;
  roles: string[];
  tenantId?: string;
  iat?: number;
  exp?: number;
};

// Normalize claims to handle both old and new formats
export function normalizeClaims(c: RawClaims): Claims {
  const roles = Array.isArray(c.roles)
    ? c.roles
    : (typeof c.role === "string" ? [c.role] : []);

  const tenantId = c.tenantId ?? (c as any).tenant_id ?? c.tenant;

  return {
    iss: c.iss ?? "",
    aud: c.aud,
    sub: c.sub,
    roles,
    tenantId,
    iat: c.iat,
    exp: c.exp,
  };
}

// Helper to get JWT secret as key
function getJwtSecret(env: any): Uint8Array {
  const raw = env.JWT_SECRET || "";
  // Try base64 first, fallback to plain text
  try {
    return Uint8Array.from(atob(raw), c => c.charCodeAt(0));
  } catch {
    return new TextEncoder().encode(raw);
  }
}

// Verify and normalize JWT claims
export async function verifyAndNormalize(token: string, env: any): Promise<Claims> {
  const secret = getJwtSecret(env);
  const { payload } = await jwtVerify(token, secret, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    clockTolerance: 300, // 5 minutes skew
  });
  return normalizeClaims(payload as RawClaims);
}

// Helper to require admin claims
export function requireAdminClaims(claims: Claims) {
  if (!claims.roles.includes("admin")) {
    throw new Error("requires admin role");
  }
}

// Helper to check if system tenant
export function isSystemTenant(claims: Claims) {
  return !claims.tenantId || claims.tenantId === "system";
}

export async function issueTenantAdminJWT(env: any, args: { tenant_id: string; ttlMinutes: number }) {
  const secret = getJwtSecret(env);
  const now = Math.floor(Date.now() / 1000);
  const exp = now + args.ttlMinutes * 60;

  const token = await new SignJWT({
    roles: ["admin", "tenant_admin"],
    tenant_id: args.tenant_id,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(secret);

  return token;
}

export async function issueTenantMemberJWT(env: any, args: { tenant_id: string; user_id: string; roles?: string[]; ttlMinutes?: number }) {
  const secret = getJwtSecret(env);
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (args.ttlMinutes ?? 60) * 60;
  const roles = Array.isArray(args.roles) && args.roles.length ? args.roles : ["tenant_member"];

  const token = await new SignJWT({
    sub: args.user_id,
    roles,
    tenant_id: args.tenant_id,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(secret);

  return token;
}
