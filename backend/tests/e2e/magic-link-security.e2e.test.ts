/**
 * Owner-console magic links grant platform-admin access, so only emails on
 * PLATFORM_ADMIN_EMAILS may use them.
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { SignJWT } from "jose";
import worker from "../../src/index";

const ctx = { waitUntil: () => {}, passThroughOnException: () => {}, props: {} } as unknown as ExecutionContext;
const adminEnv = { ...env, PLATFORM_ADMIN_EMAILS: "boss@example.com" } as typeof env;

async function magicToken(email: string, type = "magic_link") {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ type, roles: ["owner", "admin"], tenantId: "platform" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer((env as any).JWT_ISSUER || "syston.app")
    .setAudience("syston-admin")
    .setSubject(email)
    .setIssuedAt(now)
    .setExpirationTime(now + 600)
    .sign(new TextEncoder().encode((env as any).JWT_SECRET));
}

const verify = (token: string, e = adminEnv) =>
  worker.fetch(new Request(`https://example.com/api/v1/magic/verify?token=${token}`, { method: "POST" }), e, ctx);

describe("Owner console magic links", () => {
  it("gives the same reply whether or not the email is an admin", async () => {
    const send = (email: string) =>
      worker.fetch(new Request("https://example.com/api/v1/magic/start", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }),
      }), adminEnv, ctx);
    const stranger = await send("stranger@example.com");
    const boss = await send("boss@example.com");
    expect(stranger.status).toBe(200);
    expect(boss.status).toBe(200);
    expect(await stranger.json()).toEqual(await boss.json());
  });

  it("refuses a link for an email that isn't on the admin list", async () => {
    const res = await verify(await magicToken("stranger@example.com"));
    expect(res.status).toBe(401);
  });

  it("refuses other token types dressed up as a link", async () => {
    const res = await verify(await magicToken("boss@example.com", "session"));
    expect(res.status).toBe(401);
  });

  it("refuses garbage instead of crashing", async () => {
    const res = await verify("not-a-token");
    expect(res.status).toBe(401);
  });

  it("signs in an admin whose link is genuine", async () => {
    const res = await verify(await magicToken("boss@example.com"));
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toMatch(/owner_session=/);
  });
});
