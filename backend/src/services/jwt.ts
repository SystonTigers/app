
import { SignJWT, jwtVerify } from "jose";
import { parseEnv } from "../config";

type AppEnv = ReturnType<typeof parseEnv>;

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

function getJwtSecret(config: AppEnv): Uint8Array {
  const raw = config.JWT_SECRET;
  try {
    return Uint8Array.from(atob(raw), c => c.charCodeAt(0));
  } catch {
    return new TextEncoder().encode(raw);
  }
}

export async function verifyAndNormalize(token: string, config: AppEnv, audience?: string): Promise<Claims> {
  const secret = getJwtSecret(config);
  const { payload } = await jwtVerify(token, secret, {
    issuer: config.JWT_ISSUER,
    audience: audience || config.JWT_AUDIENCE,
    clockTolerance: 300,
  });
  return normalizeClaims(payload as RawClaims);
}

export async function verifyAdminJWT(token: string, config: AppEnv): Promise<Claims> {
  return verifyAndNormalize(token, config, 'syston-admin');
}

export function requireAdminClaims(claims: Claims) {
  if (!claims.roles.includes("admin")) {
    throw new Error("requires admin role");
  }
}

export function isSystemTenant(claims: Claims) {
  return !claims.tenantId || claims.tenantId === "system";
}

export async function issueTenantAdminJWT(config: AppEnv, args: { tenant_id: string; ttlMinutes: number }) {
  const secret = getJwtSecret(config);
  const now = Math.floor(Date.now() / 1000);
  const exp = now + args.ttlMinutes * 60;

  const token = await new SignJWT({
    roles: ["tenant_admin", "owner"],
    tenant_id: args.tenant_id,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(config.JWT_ISSUER)
    .setAudience(config.JWT_AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(secret);

  return token;
}

export async function issueTenantMemberJWT(config: AppEnv, args: { tenant_id: string; user_id: string; roles?: string[]; ttlMinutes?: number }) {
  const secret = getJwtSecret(config);
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (args.ttlMinutes ?? 60) * 60;
  const roles = Array.isArray(args.roles) && args.roles.length ? args.roles : ["tenant_member"];

  const token = await new SignJWT({
    sub: args.user_id,
    roles,
    tenant_id: args.tenant_id,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(config.JWT_ISSUER)
    .setAudience(config.JWT_AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(secret);

  return token;
}

export async function generateServiceJWT(config: AppEnv, ttlSeconds = 30): Promise<string> {
  const secret = getJwtSecret(config);
  const now = Math.floor(Date.now() / 1000);
  const exp = now + ttlSeconds;

  const token = await new SignJWT({
    roles: ["service"],
    type: "service",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(config.JWT_ISSUER)
    .setAudience("internal")
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(secret);

  return token;
}

export async function verifyServiceJWT(config: AppEnv, token: string): Promise<boolean> {
  try {
    const secret = getJwtSecret(config);
    const { payload } = await jwtVerify(token, secret, {
      issuer: config.JWT_ISSUER,
      audience: "internal",
      clockTolerance: 10,
    });

    const claims = normalizeClaims(payload as RawClaims);
    return claims.roles.includes("service");
  } catch (error) {
    console.error('[Service JWT] Verification failed:', error);
    return false;
  }
}
