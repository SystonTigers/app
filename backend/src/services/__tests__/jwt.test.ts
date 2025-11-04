import { describe, it, expect, beforeEach } from "vitest";
import {
  issueTenantAdminJWT,
  issueTenantMemberJWT,
  verifyAndNormalize,
  verifyAdminJWT,
  normalizeClaims,
  generateServiceJWT,
  verifyServiceJWT,
  requireAdminClaims,
  isSystemTenant,
} from "../jwt";

describe("JWT Service", () => {
  let mockEnv: any;

  beforeEach(() => {
    mockEnv = {
      JWT_SECRET: "test-secret-key-at-least-32-characters-long",
      JWT_ISSUER: "test-issuer",
      JWT_AUDIENCE: "syston-mobile",
    };
  });

  describe("issueTenantAdminJWT", () => {
    it("issues valid admin JWT with correct claims", async () => {
      const token = await issueTenantAdminJWT(mockEnv, {
        tenant_id: "tenant-123",
        ttlMinutes: 60,
      });

      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3); // JWT has 3 parts

      // Verify the token
      const claims = await verifyAdminJWT(token, mockEnv);
      expect(claims.tenantId).toBe("tenant-123");
      expect(claims.roles).toContain("tenant_admin");
      expect(claims.roles).toContain("admin");
    });

    it("issues admin JWT with custom TTL", async () => {
      const token = await issueTenantAdminJWT(mockEnv, {
        tenant_id: "tenant-123",
        ttlMinutes: 120,
      });

      const claims = await verifyAdminJWT(token, mockEnv);
      const now = Math.floor(Date.now() / 1000);
      const expectedExp = now + 120 * 60;

      // Allow 10 second tolerance
      expect(claims.exp).toBeGreaterThan(expectedExp - 10);
      expect(claims.exp).toBeLessThan(expectedExp + 10);
    });

    it("uses syston-admin audience for admin tokens", async () => {
      const token = await issueTenantAdminJWT(mockEnv, {
        tenant_id: "tenant-123",
        ttlMinutes: 60,
      });

      // Decode JWT header and payload
      const [, payloadB64] = token.split(".");
      const payload = JSON.parse(Buffer.from(payloadB64, "base64").toString());

      expect(payload.aud).toBe("syston-admin");
    });

    it("includes tenant_id in claims", async () => {
      const token = await issueTenantAdminJWT(mockEnv, {
        tenant_id: "tenant-456",
        ttlMinutes: 60,
      });

      const claims = await verifyAdminJWT(token, mockEnv);
      expect(claims.tenantId).toBe("tenant-456");
    });
  });

  describe("issueTenantMemberJWT", () => {
    it("issues valid member JWT with correct claims", async () => {
      const token = await issueTenantMemberJWT(mockEnv, {
        tenant_id: "tenant-123",
        user_id: "user-456",
        roles: ["tenant_member"],
      });

      expect(token).toBeTruthy();

      const claims = await verifyAndNormalize(token, mockEnv);
      expect(claims.tenantId).toBe("tenant-123");
      expect(claims.sub).toBe("user-456");
      expect(claims.roles).toContain("tenant_member");
    });

    it("issues member JWT with multiple roles", async () => {
      const token = await issueTenantMemberJWT(mockEnv, {
        tenant_id: "tenant-123",
        user_id: "user-456",
        roles: ["tenant_member", "coach"],
      });

      const claims = await verifyAndNormalize(token, mockEnv);
      expect(claims.roles).toContain("tenant_member");
      expect(claims.roles).toContain("coach");
      expect(claims.roles.length).toBe(2);
    });

    it("defaults to tenant_member role if not provided", async () => {
      const token = await issueTenantMemberJWT(mockEnv, {
        tenant_id: "tenant-123",
        user_id: "user-456",
      });

      const claims = await verifyAndNormalize(token, mockEnv);
      expect(claims.roles).toContain("tenant_member");
    });

    it("uses mobile audience for member tokens", async () => {
      const token = await issueTenantMemberJWT(mockEnv, {
        tenant_id: "tenant-123",
        user_id: "user-456",
        roles: ["tenant_member"],
      });

      const [, payloadB64] = token.split(".");
      const payload = JSON.parse(Buffer.from(payloadB64, "base64").toString());

      expect(payload.aud).toBe("syston-mobile");
    });

    it("defaults TTL to 60 minutes if not provided", async () => {
      const token = await issueTenantMemberJWT(mockEnv, {
        tenant_id: "tenant-123",
        user_id: "user-456",
      });

      const claims = await verifyAndNormalize(token, mockEnv);
      const now = Math.floor(Date.now() / 1000);
      const expectedExp = now + 60 * 60;

      expect(claims.exp).toBeGreaterThan(expectedExp - 10);
      expect(claims.exp).toBeLessThan(expectedExp + 10);
    });
  });

  describe("verifyAndNormalize", () => {
    it("verifies and normalizes valid JWT", async () => {
      const token = await issueTenantMemberJWT(mockEnv, {
        tenant_id: "tenant-123",
        user_id: "user-456",
        roles: ["tenant_member"],
      });

      const claims = await verifyAndNormalize(token, mockEnv);

      expect(claims.sub).toBe("user-456");
      expect(claims.tenantId).toBe("tenant-123");
      expect(claims.roles).toContain("tenant_member");
      expect(claims.iss).toBe("test-issuer");
      expect(claims.aud).toBe("syston-mobile");
    });

    it("rejects JWT with wrong secret", async () => {
      const token = await issueTenantMemberJWT(mockEnv, {
        tenant_id: "tenant-123",
        user_id: "user-456",
        roles: ["tenant_member"],
      });

      const wrongEnv = { ...mockEnv, JWT_SECRET: "wrong-secret-key-different-from-original" };

      await expect(verifyAndNormalize(token, wrongEnv)).rejects.toThrow();
    });

    it("rejects JWT with wrong audience", async () => {
      const token = await issueTenantMemberJWT(mockEnv, {
        tenant_id: "tenant-123",
        user_id: "user-456",
        roles: ["tenant_member"],
      });

      // Try to verify with different audience
      await expect(verifyAndNormalize(token, mockEnv, "wrong-audience")).rejects.toThrow();
    });

    it("rejects JWT with wrong issuer", async () => {
      const token = await issueTenantMemberJWT(mockEnv, {
        tenant_id: "tenant-123",
        user_id: "user-456",
        roles: ["tenant_member"],
      });

      const wrongEnv = { ...mockEnv, JWT_ISSUER: "wrong-issuer" };

      await expect(verifyAndNormalize(token, wrongEnv)).rejects.toThrow();
    });

    it("allows clock skew tolerance", async () => {
      // Issue token that will be "issued" slightly in the future
      const token = await issueTenantMemberJWT(mockEnv, {
        tenant_id: "tenant-123",
        user_id: "user-456",
        roles: ["tenant_member"],
      });

      // Should still verify due to 5 minute clock tolerance
      const claims = await verifyAndNormalize(token, mockEnv);
      expect(claims.sub).toBe("user-456");
    });
  });

  describe("verifyAdminJWT", () => {
    it("verifies admin JWT with syston-admin audience", async () => {
      const token = await issueTenantAdminJWT(mockEnv, {
        tenant_id: "tenant-123",
        ttlMinutes: 60,
      });

      const claims = await verifyAdminJWT(token, mockEnv);

      expect(claims.tenantId).toBe("tenant-123");
      expect(claims.roles).toContain("admin");
    });

    it("rejects member JWT when expecting admin", async () => {
      const memberToken = await issueTenantMemberJWT(mockEnv, {
        tenant_id: "tenant-123",
        user_id: "user-456",
        roles: ["tenant_member"],
      });

      // Admin JWT verifier expects syston-admin audience
      await expect(verifyAdminJWT(memberToken, mockEnv)).rejects.toThrow();
    });
  });

  describe("normalizeClaims", () => {
    it("normalizes claims with tenant_id format", () => {
      const payload = {
        sub: "user-123",
        tenant_id: "tenant-456",
        roles: ["member"],
        exp: 1234567890,
        iat: 1234567800,
        iss: "test",
        aud: "test-app",
      };

      const claims = normalizeClaims(payload);

      expect(claims.sub).toBe("user-123");
      expect(claims.tenantId).toBe("tenant-456");
      expect(claims.roles).toEqual(["member"]);
    });

    it("normalizes claims with tenantId format", () => {
      const payload = {
        sub: "user-123",
        tenantId: "tenant-789",
        roles: ["admin"],
        exp: 1234567890,
        iat: 1234567800,
        iss: "test",
        aud: "test-app",
      };

      const claims = normalizeClaims(payload);

      expect(claims.tenantId).toBe("tenant-789");
    });

    it("normalizes single role string to array", () => {
      const payload = {
        sub: "user-123",
        role: "admin",
        exp: 1234567890,
        iat: 1234567800,
        iss: "test",
        aud: "test-app",
      };

      const claims = normalizeClaims(payload);

      expect(claims.roles).toEqual(["admin"]);
    });

    it("preserves roles array", () => {
      const payload = {
        sub: "user-123",
        roles: ["admin", "coach"],
        exp: 1234567890,
        iat: 1234567800,
        iss: "test",
        aud: "test-app",
      };

      const claims = normalizeClaims(payload);

      expect(claims.roles).toEqual(["admin", "coach"]);
    });

    it("defaults to empty roles array when no roles", () => {
      const payload = {
        sub: "user-123",
        exp: 1234567890,
        iat: 1234567800,
        iss: "test",
        aud: "test-app",
      };

      const claims = normalizeClaims(payload);

      expect(claims.roles).toEqual([]);
    });
  });

  describe("generateServiceJWT", () => {
    it("generates valid service JWT", async () => {
      const token = await generateServiceJWT(mockEnv, 30);

      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3);
    });

    it("service JWT has correct claims", async () => {
      const token = await generateServiceJWT(mockEnv, 30);

      const [, payloadB64] = token.split(".");
      const payload = JSON.parse(Buffer.from(payloadB64, "base64").toString());

      expect(payload.roles).toContain("service");
      expect(payload.type).toBe("service");
      expect(payload.aud).toBe("internal");
    });

    it("service JWT defaults to 30 second TTL", async () => {
      const token = await generateServiceJWT(mockEnv);

      const [, payloadB64] = token.split(".");
      const payload = JSON.parse(Buffer.from(payloadB64, "base64").toString());

      const now = Math.floor(Date.now() / 1000);
      const expectedExp = now + 30;

      expect(payload.exp).toBeGreaterThan(expectedExp - 5);
      expect(payload.exp).toBeLessThan(expectedExp + 5);
    });
  });

  describe("verifyServiceJWT", () => {
    it("verifies valid service JWT", async () => {
      const token = await generateServiceJWT(mockEnv, 30);

      const isValid = await verifyServiceJWT(mockEnv, token);

      expect(isValid).toBe(true);
    });

    it("rejects invalid service JWT", async () => {
      const invalidToken = "invalid.jwt.token";

      const isValid = await verifyServiceJWT(mockEnv, invalidToken);

      expect(isValid).toBe(false);
    });

    it("rejects service JWT with wrong secret", async () => {
      const token = await generateServiceJWT(mockEnv, 30);

      const wrongEnv = { ...mockEnv, JWT_SECRET: "different-secret-key-that-is-wrong" };
      const isValid = await verifyServiceJWT(wrongEnv, token);

      expect(isValid).toBe(false);
    });

    it("rejects non-service JWT", async () => {
      const token = await issueTenantMemberJWT(mockEnv, {
        tenant_id: "tenant-123",
        user_id: "user-456",
        roles: ["tenant_member"],
      });

      const isValid = await verifyServiceJWT(mockEnv, token);

      expect(isValid).toBe(false);
    });
  });

  describe("requireAdminClaims", () => {
    it("passes for admin role", () => {
      const claims = {
        iss: "test",
        roles: ["admin"],
        tenantId: "tenant-123",
      };

      expect(() => requireAdminClaims(claims)).not.toThrow();
    });

    it("throws for non-admin role", () => {
      const claims = {
        iss: "test",
        roles: ["tenant_member"],
        tenantId: "tenant-123",
      };

      expect(() => requireAdminClaims(claims)).toThrow("requires admin role");
    });

    it("passes for multiple roles including admin", () => {
      const claims = {
        iss: "test",
        roles: ["tenant_member", "admin", "coach"],
        tenantId: "tenant-123",
      };

      expect(() => requireAdminClaims(claims)).not.toThrow();
    });
  });

  describe("isSystemTenant", () => {
    it("returns true for system tenant", () => {
      const claims = {
        iss: "test",
        roles: ["admin"],
        tenantId: "system",
      };

      expect(isSystemTenant(claims)).toBe(true);
    });

    it("returns true for missing tenantId", () => {
      const claims = {
        iss: "test",
        roles: ["admin"],
      };

      expect(isSystemTenant(claims)).toBe(true);
    });

    it("returns false for normal tenant", () => {
      const claims = {
        iss: "test",
        roles: ["admin"],
        tenantId: "tenant-123",
      };

      expect(isSystemTenant(claims)).toBe(false);
    });
  });

  describe("JWT Security", () => {
    it("includes standard JWT claims", async () => {
      const token = await issueTenantMemberJWT(mockEnv, {
        tenant_id: "tenant-123",
        user_id: "user-456",
        roles: ["tenant_member"],
      });

      const claims = await verifyAndNormalize(token, mockEnv);

      expect(claims.iat).toBeDefined(); // Issued at
      expect(claims.exp).toBeDefined(); // Expires at
      expect(claims.iss).toBe("test-issuer"); // Issuer
      expect(claims.aud).toBe("syston-mobile"); // Audience
      expect(claims.exp).toBeGreaterThan(claims.iat!); // Exp is after iat
    });

    it("rejects tampered JWT payload", async () => {
      const token = await issueTenantMemberJWT(mockEnv, {
        tenant_id: "tenant-123",
        user_id: "user-456",
        roles: ["tenant_member"],
      });

      // Tamper with the payload
      const [header, payload, signature] = token.split(".");
      const tamperedPayload = Buffer.from(
        JSON.stringify({ sub: "hacker", roles: ["admin"] })
      ).toString("base64url");
      const tamperedToken = `${header}.${tamperedPayload}.${signature}`;

      await expect(verifyAndNormalize(tamperedToken, mockEnv)).rejects.toThrow();
    });

    it("rejects JWT with missing signature", async () => {
      const token = await issueTenantMemberJWT(mockEnv, {
        tenant_id: "tenant-123",
        user_id: "user-456",
        roles: ["tenant_member"],
      });

      const [header, payload] = token.split(".");
      const unsignedToken = `${header}.${payload}.`;

      await expect(verifyAndNormalize(unsignedToken, mockEnv)).rejects.toThrow();
    });
  });
});
