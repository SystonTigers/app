import { SignJWT } from "jose";

export async function issueTenantAdminJWT(env: any, args: { tenant_id: string; ttlMinutes: number }) {
  const secret = new TextEncoder().encode(env.JWT_SECRET as string);
  const now = Math.floor(Date.now() / 1000);
  const exp = now + args.ttlMinutes * 60;

  const token = await new SignJWT({
    roles: ["tenant_admin"],
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
