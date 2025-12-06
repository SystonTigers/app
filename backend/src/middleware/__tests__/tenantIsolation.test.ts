import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  validateTenantExists,
  extractTenantId,
  validateTenantAccess,
  validateBodyTenantId,
  tenantScopeCondition,
} from "../tenantIsolation";
import type { Claims } from "../../services/jwt";

describe("Tenant Isolation Middleware", () => {
  let mockEnv: any;
  let mockKV: Map<string, string>;

  beforeEach(() => {
    mockKV = new Map();
    mockEnv = {
      KV_IDEMP: {
        get: async (key: string) => mockKV.get(key) || null,
        put: async (key: string, value: string) => mockKV.set(key, value),
      },
      DB: {
        prepare: vi.fn((query: string) => ({
          bind: vi.fn(() => ({
            first: vi.fn(async () => null),
          })),
        })),
      },
    };
  });

  describe("validateTenantExists", () => {
    it("returns true when tenant exists in KV", async () => {
      mockKV.set("tenant:test-tenant", JSON.stringify({ id: "test-tenant" }));
      const exists = await validateTenantExists(mockEnv, "test-tenant");
      expect(exists).toBe(true);
    });

    it("returns true when tenant exists in DB but not KV", async () => {
      mockEnv.DB.prepare.mockReturnValue({
        bind: () => ({
          first: async () => ({ id: "test-tenant" }),
        }),
      });

      const exists = await validateTenantExists(mockEnv, "test-tenant");
      expect(exists).toBe(true);
    });

    it("returns false when tenant does not exist", async () => {
      const exists = await validateTenantExists(mockEnv, "nonexistent");
      expect(exists).toBe(false);
    });

    it("returns false for empty tenant_id", async () => {
      const exists = await validateTenantExists(mockEnv, "");
      expect(exists).toBe(false);
    });

    it("handles DB errors gracefully", async () => {
      mockEnv.DB.prepare.mockReturnValue({
        bind: () => ({
          first: async () => {
            throw new Error("DB error");
          },
        }),
      });

      const exists = await validateTenantExists(mockEnv, "test-tenant");
      expect(exists).toBe(false);
    });
  });

  describe("extractTenantId", () => {
    it("extracts tenant_id from JWT claims (priority 1)", () => {
      const claims: Claims = {
        iss: "test",
        sub: "user-123",
        roles: ["member"],
        tenantId: "jwt-tenant",
      };
      const req = new Request("https://example.com/api?tenant=query-tenant");

      const tenantId = extractTenantId(req, claims);
      expect(tenantId).toBe("jwt-tenant");
    });

    it("extracts tenant from query param when no JWT", () => {
      const req = new Request("https://example.com/api?tenant=query-tenant");

      const tenantId = extractTenantId(req, null);
      expect(tenantId).toBe("query-tenant");
    });

    it("extracts tenant_id from query param (alternate format)", () => {
      const req = new Request("https://example.com/api?tenant_id=query-tenant");

      const tenantId = extractTenantId(req, null);
      expect(tenantId).toBe("query-tenant");
    });

    it("returns null when no tenant_id found", () => {
      const req = new Request("https://example.com/api");

      const tenantId = extractTenantId(req, null);
      expect(tenantId).toBe(null);
    });
  });

  describe("validateTenantAccess", () => {
    it("returns 401 when not authenticated", async () => {
      const response = await validateTenantAccess(mockEnv, null, "test-tenant");

      expect(response).not.toBeNull();
      expect(response?.status).toBe(401);
      const data: any = await response?.json();
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("allows platform_admin to access any tenant", async () => {
      const claims: Claims = {
        iss: "test",
        sub: "admin-user",
        roles: ["platform_admin"],
        tenantId: "admin-tenant",
      };

      const response = await validateTenantAccess(mockEnv, claims, "other-tenant");
      expect(response).toBeNull(); // Access allowed
    });

    it("returns 403 when user tries to access different tenant", async () => {
      const claims: Claims = {
        iss: "test",
        sub: "user-123",
        roles: ["member"],
        tenantId: "my-tenant",
      };

      const response = await validateTenantAccess(mockEnv, claims, "other-tenant");

      expect(response).not.toBeNull();
      expect(response?.status).toBe(403);
      const data: any = await response?.json();
      expect(data.error.code).toBe("FORBIDDEN");
    });

    it("returns 404 when tenant does not exist", async () => {
      const claims: Claims = {
        iss: "test",
        sub: "user-123",
        roles: ["member"],
        tenantId: "nonexistent-tenant",
      };

      const response = await validateTenantAccess(mockEnv, claims, "nonexistent-tenant");

      expect(response).not.toBeNull();
      expect(response?.status).toBe(404);
      const data: any = await response?.json();
      expect(data.error.code).toBe("TENANT_NOT_FOUND");
    });

    it("allows access when user accesses their own tenant", async () => {
      mockKV.set("tenant:my-tenant", JSON.stringify({ id: "my-tenant" }));

      const claims: Claims = {
        iss: "test",
        sub: "user-123",
        roles: ["member"],
        tenantId: "my-tenant",
      };

      const response = await validateTenantAccess(mockEnv, claims, "my-tenant");
      expect(response).toBeNull(); // Access allowed
    });
  });

  describe("validateBodyTenantId", () => {
    it("allows when body tenant_id matches JWT", () => {
      const claims: Claims = {
        iss: "test",
        sub: "user-123",
        roles: ["member"],
        tenantId: "my-tenant",
      };

      const response = validateBodyTenantId(claims, "my-tenant");
      expect(response).toBeNull();
    });

    it("allows when no body tenant_id provided", () => {
      const claims: Claims = {
        iss: "test",
        sub: "user-123",
        roles: ["member"],
        tenantId: "my-tenant",
      };

      const response = validateBodyTenantId(claims, undefined);
      expect(response).toBeNull();
    });

    it("returns 403 when body tenant_id mismatches JWT", () => {
      const claims: Claims = {
        iss: "test",
        sub: "user-123",
        roles: ["member"],
        tenantId: "my-tenant",
      };

      const response = validateBodyTenantId(claims, "other-tenant");

      expect(response).not.toBeNull();
      expect(response?.status).toBe(403);
    });

    it("allows platform_admin to override tenant_id", () => {
      const claims: Claims = {
        iss: "test",
        sub: "admin-user",
        roles: ["platform_admin"],
        tenantId: "admin-tenant",
      };

      const response = validateBodyTenantId(claims, "other-tenant");
      expect(response).toBeNull();
    });
  });

  describe("tenantScopeCondition", () => {
    it("generates valid SQL condition", () => {
      const condition = tenantScopeCondition("test-tenant");
      expect(condition).toBe("tenant_id = 'test-tenant'");
    });

    it("throws on invalid tenant_id format", () => {
      expect(() => tenantScopeCondition("tenant'; DROP TABLE--")).toThrow("Invalid tenant_id format");
    });

    it("allows valid tenant_id formats", () => {
      expect(() => tenantScopeCondition("tenant_123")).not.toThrow();
      expect(() => tenantScopeCondition("tenant-abc")).not.toThrow();
      expect(() => tenantScopeCondition("TenantXYZ")).not.toThrow();
    });
  });
});
