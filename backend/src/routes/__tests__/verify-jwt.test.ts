import { describe, it, expect } from "vitest";
import { SignJWT } from "jose";
import { verifyJWT } from "../auth";

const SECRET = "unit-test-secret-at-least-32-characters";
const env = { JWT_SECRET: SECRET };

const b64url = (obj: unknown) =>
  btoa(JSON.stringify(obj)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

async function sign(payload: Record<string, unknown>, key: Uint8Array, expSeconds = 3600) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt(now).setExpirationTime(now + expSeconds).sign(key);
}

describe("verifyJWT", () => {
  it("accepts a token signed with the plain-text secret", async () => {
    const token = await sign({ sub: "u1", tenant_id: "t1" }, new TextEncoder().encode(SECRET));
    expect(await verifyJWT(env, token)).toMatchObject({ sub: "u1", tenant_id: "t1" });
  });

  it("accepts a token signed with the base64-decoded secret (services/jwt style)", async () => {
    const b64Secret = btoa("another-secret-value-for-testing-123");
    const key = Uint8Array.from(atob(b64Secret), (c) => c.charCodeAt(0));
    const token = await sign({ sub: "u2" }, key);
    expect(await verifyJWT({ JWT_SECRET: b64Secret }, token)).toMatchObject({ sub: "u2" });
  });

  it("rejects a forged token with no valid signature", async () => {
    const forged = `${b64url({ alg: "HS256" })}.${b64url({ sub: "attacker", tenant_id: "syston", roles: ["tenant_admin"] })}.bogus`;
    expect(await verifyJWT(env, forged)).toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await sign({ sub: "u3" }, new TextEncoder().encode("some-other-secret-entirely-000000"));
    expect(await verifyJWT(env, token)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const token = await sign({ sub: "u4" }, new TextEncoder().encode(SECRET), -60);
    expect(await verifyJWT(env, token)).toBeNull();
  });

  it("rejects when no secret is configured", async () => {
    const token = await sign({ sub: "u5" }, new TextEncoder().encode(SECRET));
    expect(await verifyJWT({}, token)).toBeNull();
  });
});
