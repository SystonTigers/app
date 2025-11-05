import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  requireJWT,
  requireAdmin,
  requireTenantAdminOrPlatform,
  hasRole,
} from "../auth";
import { issueTenantMemberJWT, issueTenantAdminJWT } from "../jwt";
import type { Claims } from "../jwt";

describe("Auth Service", () => {
  let mockEnv: any;
  let mockKV: Map<string, string>;

  beforeEach(() => {
    // Create mock environment
    mockKV = new Map();
    mockEnv = {
      JWT_SECRET: "test-secret-key-at-least-32-characters-long",
      JWT_ISSUER: "test-issuer",
      JWT_AUDIENCE: "syston-mobile",
      KV_IDEMP: {
        get: async (key: string, type?: string) => {
          const value = mockKV.get(key);
          if (!value) return null;
          if (type === "json") return JSON.parse(value);
          return value;
        },
        put: async (key: string, value: string) => {
          mockKV.set(key, value);
        },
        delete: async (key: string) => {
          mockKV.delete(key);
        },
      },
    };
  });

  describe("requireJWT", () => {
    it("accepts valid Bearer token", async () => {
      const token = await issueTenantMemberJWT(mockEnv, {
        tenant_id: "tenant-123",
        user_id: "user-456",
        roles: ["tenant_member"],
      });

      const req = new Request("https://example.com/api/test", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const claims = await requireJWT(req, mockEnv);

      expect(claims).toBeTruthy();
      expect(claims.sub).toBe("user-456");
      expect(claims.tenantId).toBe("tenant-123");
    });

    it("rejects request without Authorization header", async () => {
      const req = new Request("https://example.com/api/test");

      await expect(requireJWT(req, mockEnv)).rejects.toThrow();
    });

    it("rejects request with invalid token format", async () => {
      const req = new Request("https://example.com/api/test", {
        headers: {
          Authorization: "NotBearer token123",
        },
      });

      await expect(requireJWT(req, mockEnv)).rejects.toThrow();
    });

    it("rejects request with empty Bearer token", async () => {
      const req = new Request("https://example.com/api/test", {
        headers: {
          Authorization: "Bearer ",
        },
      });

      await expect(requireJWT(req, mockEnv)).rejects.toThrow();
    });

    it("rejects invalid JWT", async () => {
      const req = new Request("https://example.com/api/test", {
        headers: {
          Authorization: "Bearer invalid.jwt.token",
        },
      });

      await expect(requireJWT(req, mockEnv)).rejects.toThrow();
    });

    it("rejects JWT with wrong secret", async () => {
      const wrongEnv = {
        ...mockEnv,
        JWT_SECRET: "different-secret-key-for-testing-purposes",
      };

      const token = await issueTenantMemberJWT(wrongEnv, {
        tenant_id: "tenant-123",
        user_id: "user-456",
        roles: ["tenant_member"],
      });

      const req = new Request("https://example.com/api/test", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      await expect(requireJWT(req, mockEnv)).rejects.toThrow();
    });

    it("rejects revoked token", async () => {
      const token = await issueTenantMemberJWT(mockEnv, {
        tenant_id: "tenant-123",
        user_id: "user-456",
        roles: ["tenant_member"],
      });

      // Mark token as revoked using correct revocation key format
      // Revocation checks user-level: jwt:revoked:user:{tenantId}:{userId}
      mockKV.set("jwt:revoked:user:tenant-123:user-456", JSON.stringify({
        tenantId: "tenant-123",
        userId: "user-456",
        revokedAt: Date.now(),
        reason: "test",
      }));

      const req = new Request("https://example.com/api/test", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      await expect(requireJWT(req, mockEnv)).rejects.toThrow();
    });

    it("extracts all JWT claims correctly", async () => {
      const token = await issueTenantMemberJWT(mockEnv, {
        tenant_id: "tenant-789",
        user_id: "user-123",
        roles: ["tenant_member", "coach"],
      });

      const req = new Request("https://example.com/api/test", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const claims = await requireJWT(req, mockEnv);

      expect(claims.sub).toBe("user-123");
      expect(claims.tenantId).toBe("tenant-789");
      expect(claims.roles).toContain("tenant_member");
      expect(claims.roles).toContain("coach");
      expect(claims.iss).toBe("test-issuer");
    });
  });

  describe("requireAdmin", () => {
    it("accepts valid admin Bearer token", async () => {
      const token = await issueTenantAdminJWT(mockEnv, {
        tenant_id: "tenant-123",
        ttlMinutes: 60,
      });

      const req = new Request("https://example.com/admin/test", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const claims = await requireAdmin(req, mockEnv);

      expect(claims).toBeTruthy();
      expect(claims.tenantId).toBe("tenant-123");
      expect(claims.roles).toContain("admin");
    });

    it("accepts valid admin from owner_session cookie", async () => {
      const token = await issueTenantAdminJWT(mockEnv, {
        tenant_id: "tenant-123",
        ttlMinutes: 60,
      });

      const req = new Request("https://example.com/admin/test", {
        headers: {
          Cookie: `owner_session=${token}`,
        },
      });

      const claims = await requireAdmin(req, mockEnv);

      expect(claims).toBeTruthy();
      expect(claims.roles).toContain("admin");
    });

    it("accepts valid admin from cookie with other cookies", async () => {
      const token = await issueTenantAdminJWT(mockEnv, {
        tenant_id: "tenant-123",
        ttlMinutes: 60,
      });

      const req = new Request("https://example.com/admin/test", {
        headers: {
          Cookie: `other_cookie=value; owner_session=${token}; another=test`,
        },
      });

      const claims = await requireAdmin(req, mockEnv);

      expect(claims).toBeTruthy();
    });

    it("prefers Bearer token over cookie when both present", async () => {
      const bearerToken = await issueTenantAdminJWT(mockEnv, {
        tenant_id: "tenant-bearer",
        ttlMinutes: 60,
      });

      const cookieToken = await issueTenantAdminJWT(mockEnv, {
        tenant_id: "tenant-cookie",
        ttlMinutes: 60,
      });

      const req = new Request("https://example.com/admin/test", {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          Cookie: `owner_session=${cookieToken}`,
        },
      });

      const claims = await requireAdmin(req, mockEnv);

      expect(claims.tenantId).toBe("tenant-bearer");
    });

    it("rejects request without credentials", async () => {
      const req = new Request("https://example.com/admin/test");

      await expect(requireAdmin(req, mockEnv)).rejects.toThrow();
    });

    it("rejects member JWT for admin endpoint", async () => {
      const memberToken = await issueTenantMemberJWT(mockEnv, {
        tenant_id: "tenant-123",
        user_id: "user-456",
        roles: ["tenant_member"],
      });

      const req = new Request("https://example.com/admin/test", {
        headers: {
          Authorization: `Bearer ${memberToken}`,
        },
      });

      await expect(requireAdmin(req, mockEnv)).rejects.toThrow();
    });

    it("rejects invalid JWT in cookie", async () => {
      const req = new Request("https://example.com/admin/test", {
        headers: {
          Cookie: "owner_session=invalid.jwt.token",
        },
      });

      await expect(requireAdmin(req, mockEnv)).rejects.toThrow();
    });

    it("rejects revoked admin token", async () => {
      const token = await issueTenantAdminJWT(mockEnv, {
        tenant_id: "tenant-123",
        ttlMinutes: 60,
      });

      // Mark as revoked using tenant-level revocation key
      mockKV.set("jwt:revoked:tenant:tenant-123", JSON.stringify({
        tenantId: "tenant-123",
        revokedAt: Date.now(),
        reason: "test",
      }));

      const req = new Request("https://example.com/admin/test", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      await expect(requireAdmin(req, mockEnv)).rejects.toThrow();
    });
  });

  describe("requireTenantAdminOrPlatform", () => {
    it("accepts platform admin", async () => {
      const token = await issueTenantAdminJWT(mockEnv, {
        tenant_id: "system",
        ttlMinutes: 60,
      });

      const req = new Request("https://example.com/admin/tenant/tenant-123", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await requireTenantAdminOrPlatform(
        req,
        mockEnv,
        "tenant-123"
      );

      expect(result.scope).toBe("platform_admin");
      expect(result.claims).toBeTruthy();
    });

    it("accepts tenant admin for their own tenant", async () => {
      const token = await issueTenantMemberJWT(mockEnv, {
        tenant_id: "tenant-123",
        user_id: "admin-user",
        roles: ["tenant_admin", "admin"],
      });

      const req = new Request("https://example.com/admin/tenant/tenant-123", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await requireTenantAdminOrPlatform(
        req,
        mockEnv,
        "tenant-123"
      );

      expect(result.scope).toBe("tenant_admin");
      expect(result.claims.tenantId).toBe("tenant-123");
    });

    it("accepts owner role for their tenant", async () => {
      const token = await issueTenantMemberJWT(mockEnv, {
        tenant_id: "tenant-123",
        user_id: "owner-user",
        roles: ["owner"],
      });

      const req = new Request("https://example.com/admin/tenant/tenant-123", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await requireTenantAdminOrPlatform(
        req,
        mockEnv,
        "tenant-123"
      );

      expect(result.scope).toBe("tenant_admin");
    });

    it("rejects tenant admin accessing different tenant", async () => {
      const token = await issueTenantMemberJWT(mockEnv, {
        tenant_id: "tenant-123",
        user_id: "admin-user",
        roles: ["tenant_admin", "admin"],
      });

      const req = new Request("https://example.com/admin/tenant/tenant-456", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      await expect(
        requireTenantAdminOrPlatform(req, mockEnv, "tenant-456")
      ).rejects.toThrow();
    });

    it("rejects regular member even for their own tenant", async () => {
      const token = await issueTenantMemberJWT(mockEnv, {
        tenant_id: "tenant-123",
        user_id: "user-456",
        roles: ["tenant_member"],
      });

      const req = new Request("https://example.com/admin/tenant/tenant-123", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      await expect(
        requireTenantAdminOrPlatform(req, mockEnv, "tenant-123")
      ).rejects.toThrow();
    });

    it("rejects when no credentials provided", async () => {
      const req = new Request("https://example.com/admin/tenant/tenant-123");

      await expect(
        requireTenantAdminOrPlatform(req, mockEnv, "tenant-123")
      ).rejects.toThrow();
    });
  });

  describe("hasRole", () => {
    it("returns true when user has role in roles array", () => {
      const user: Claims = {
        iss: "test",
        sub: "user-123",
        roles: ["admin", "coach"],
        tenantId: "tenant-123",
      };

      expect(hasRole(user, "admin")).toBe(true);
      expect(hasRole(user, "coach")).toBe(true);
    });

    it("returns false when user does not have role", () => {
      const user: Claims = {
        iss: "test",
        sub: "user-123",
        roles: ["member"],
        tenantId: "tenant-123",
      };

      expect(hasRole(user, "admin")).toBe(false);
      expect(hasRole(user, "coach")).toBe(false);
    });

    it("handles single role string", () => {
      const user = {
        sub: "user-123",
        role: "admin",
      };

      expect(hasRole(user, "admin")).toBe(true);
      expect(hasRole(user, "member")).toBe(false);
    });

    it("returns false when no roles present", () => {
      const user = {
        sub: "user-123",
      };

      expect(hasRole(user, "admin")).toBe(false);
    });

    it("returns false for empty roles array", () => {
      const user: Claims = {
        iss: "test",
        sub: "user-123",
        roles: [],
        tenantId: "tenant-123",
      };

      expect(hasRole(user, "admin")).toBe(false);
    });

    it("is case sensitive", () => {
      const user: Claims = {
        iss: "test",
        sub: "user-123",
        roles: ["Admin"],
        tenantId: "tenant-123",
      };

      expect(hasRole(user, "Admin")).toBe(true);
      expect(hasRole(user, "admin")).toBe(false);
    });
  });

  describe("Authorization Error Responses", () => {
    it("returns 401 for missing Bearer token in requireJWT", async () => {
      const req = new Request("https://example.com/api/test");

      try {
        await requireJWT(req, mockEnv);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(Response);
        const response = error as Response;
        expect(response.status).toBe(401);
      }
    });

    it("returns 401 for missing admin credentials", async () => {
      const req = new Request("https://example.com/admin/test");

      try {
        await requireAdmin(req, mockEnv);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(Response);
        const response = error as Response;
        // getToken() throws 401 when no credentials found
        expect(response.status).toBe(401);
      }
    });

    it("returns 403 for tenant mismatch in requireTenantAdminOrPlatform", async () => {
      const token = await issueTenantMemberJWT(mockEnv, {
        tenant_id: "tenant-123",
        user_id: "admin-user",
        roles: ["tenant_admin"],
      });

      const req = new Request("https://example.com/admin/tenant/tenant-456", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      try {
        await requireTenantAdminOrPlatform(req, mockEnv, "tenant-456");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(Response);
        const response = error as Response;
        expect(response.status).toBe(403);
      }
    });
  });
});
