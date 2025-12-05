import { SignJWT, jwtVerify } from "jose";

// Minimum secret length for security (256 bits = 32 bytes)
const MIN_SECRET_LENGTH = 32;

/**
 * Error thrown when JWT secret is missing or invalid
 */
export class JWTSecretError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JWTSecretError";
  }
}

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
  userId?: string;
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

/**
 * Get JWT secret as key with validation
 * Throws JWTSecretError if secret is missing or too short
 */
function getJwtSecret(env: any): Uint8Array {
  const raw = env.JWT_SECRET;

  // Fail fast if secret is missing or empty
  if (!raw || typeof raw !== "string" || raw.trim() === "") {
    throw new JWTSecretError(
      "JWT_SECRET is not configured. Set it using: wrangler secret put JWT_SECRET"
    );
  }

  // Try base64 first, fallback to plain text
  let secret: Uint8Array;
  try {
    secret = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
  } catch {
    secret = new TextEncoder().encode(raw);
  }

  // Validate minimum length for security
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new JWTSecretError(
      `JWT_SECRET is too short (${secret.length} bytes). Minimum required: ${MIN_SECRET_LENGTH} bytes (256 bits)`
    );
  }

  return secret;
}

// Verify and normalize JWT claims
export async function verifyAndNormalize(token: string, env: any, audience?: string): Promise<Claims> {
  const secret = getJwtSecret(env);
  const { payload } = await jwtVerify(token, secret, {
    issuer: env.JWT_ISSUER,
    audience: audience || env.JWT_AUDIENCE,
    clockTolerance: 300, // 5 minutes skew
  });
  return normalizeClaims(payload as RawClaims);
}

// Verify admin JWT (uses syston-admin audience)
export async function verifyAdminJWT(token: string, env: any): Promise<Claims> {
  return verifyAndNormalize(token, env, 'syston-admin');
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
    roles: ["tenant_admin", "owner"],  // Tenant admin only, NOT platform admin
    tenant_id: args.tenant_id,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE) // Use mobile audience since not platform admin
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(secret);

  return token;
}

export async function issuePlatformAdminJWT(env: any, args: { tenant_id: string; ttlMinutes: number }) {
  const secret = getJwtSecret(env);
  const now = Math.floor(Date.now() / 1000);
  const exp = now + args.ttlMinutes * 60;

  const token = await new SignJWT({
    roles: ["admin", "owner"],
    tenant_id: args.tenant_id,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(env.JWT_ISSUER)
    .setAudience("syston-admin") // Platform admin audience
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

// Generate short-lived service JWT for internal API calls
export async function generateServiceJWT(env: any, ttlSeconds = 30): Promise<string> {
  const secret = getJwtSecret(env);
  const now = Math.floor(Date.now() / 1000);
  const exp = now + ttlSeconds;

  const token = await new SignJWT({
    roles: ["service"],
    type: "service",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(env.JWT_ISSUER || "syston.app")
    .setAudience("internal")
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(secret);

  return token;
}

// Verify service JWT
export async function verifyServiceJWT(env: any, token: string): Promise<boolean> {
  try {
    const secret = getJwtSecret(env);
    const { payload } = await jwtVerify(token, secret, {
      issuer: env.JWT_ISSUER || "syston.app",
      audience: "internal",
      clockTolerance: 10, // 10 seconds skew
    });

    const claims = normalizeClaims(payload as RawClaims);
    return claims.roles.includes("service");
  } catch (error) {
    return false;
  }
}
