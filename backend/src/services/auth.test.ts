import { describe, it, expect } from "vitest";
import { SignJWT } from "jose";
import { hasRole, requireTenantAdminOrPlatform } from "./auth";

const TEST_ENV = {
  JWT_SECRET: "test-secret",
  JWT_ISSUER: "test-issuer",
  JWT_AUDIENCE: "syston-mobile",
};

async function createToken(
  payload: Record<string, unknown>,
  audience = TEST_ENV.JWT_AUDIENCE
): Promise<string> {
  const secret = new TextEncoder().encode(TEST_ENV.JWT_SECRET);
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(TEST_ENV.JWT_ISSUER)
    .setAudience(audience)
    .setIssuedAt(now)
    .setExpirationTime(now + 600)
    .sign(secret);
}

function requestWithToken(token: string): Request {
  return new Request("https://example.com/resource", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

describe("hasRole", () => {
  it("returns true when role is present in roles array", () => {
    const user = { roles: ["viewer", "admin", "tenant_admin"] };
    expect(hasRole(user, "admin")).toBe(true);
    expect(hasRole(user, "tenant_admin")).toBe(true);
  });

  it("returns false when required role is missing", () => {
    const user = { roles: ["viewer"] };
    expect(hasRole(user, "admin")).toBe(false);
  });

  it("handles legacy single role property", () => {
    const user = { role: "admin" };
    expect(hasRole(user, "admin")).toBe(true);
    expect(hasRole(user, "tenant_admin")).toBe(false);
  });
});

describe("requireTenantAdminOrPlatform", () => {
  it("allows platform admin tokens", async () => {
    const token = await createToken(
      { roles: ["admin"], tenant_id: "system" },
      "syston-admin"
    );
    const req = requestWithToken(token);
    const result = await requireTenantAdminOrPlatform(req, TEST_ENV, "tenant-123");
    expect(result.scope).toBe("platform_admin");
    expect(result.claims.roles).toContain("admin");
  });

  it("allows tenant admins for their own tenant", async () => {
    const token = await createToken({ roles: ["tenant_admin"], tenant_id: "tenant-123" });
    const req = requestWithToken(token);
    const result = await requireTenantAdminOrPlatform(req, TEST_ENV, "tenant-123");
    expect(result.scope).toBe("tenant_admin");
    expect(result.claims.tenantId).toBe("tenant-123");
  });

  it("rejects tenant admins for other tenants", async () => {
    const token = await createToken({ roles: ["tenant_admin"], tenant_id: "tenant-xyz" });
    const req = requestWithToken(token);
    await expect(
      requireTenantAdminOrPlatform(req, TEST_ENV, "tenant-123")
    ).rejects.toHaveProperty("status", 403);
  });

  it("rejects members without admin role", async () => {
    const token = await createToken({ roles: ["tenant_member"], tenant_id: "tenant-123" });
    const req = requestWithToken(token);
    await expect(
      requireTenantAdminOrPlatform(req, TEST_ENV, "tenant-123")
    ).rejects.toHaveProperty("status", 403);
  });
});
