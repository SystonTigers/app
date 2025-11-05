import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getAdminStats,
  listTenants,
  getTenant,
  updateTenant,
  deactivateTenant,
  deleteTenant,
  listPromoCodes,
  createPromoCode,
  deactivatePromoCode,
  listUsers,
} from "../admin";
import { issueTenantAdminJWT } from "../../services/jwt";

describe("Admin Routes", () => {
  let mockEnv: any;
  let mockDB: any;
  let corsHdrs: Headers;
  const requestId = "test-request-id";

  beforeEach(() => {
    // Mock database with full capabilities
    mockDB = {
      prepare: vi.fn((query: string) => {
        return {
          bind: vi.fn((...params: any[]) => {
            return {
              all: vi.fn(async () => ({ results: [] })),
              first: vi.fn(async () => null),
              run: vi.fn(async () => ({ success: true })),
            };
          }),
          all: vi.fn(async () => ({ results: [] })),
          first: vi.fn(async () => null),
          run: vi.fn(async () => ({ success: true })),
        };
      }),
      batch: vi.fn(async () => []),
    };

    mockEnv = {
      DB: mockDB,
      JWT_SECRET: "test-secret-key-at-least-32-characters-long",
      JWT_ISSUER: "test-issuer",
      JWT_AUDIENCE: "syston-mobile",
    };

    corsHdrs = new Headers();
  });

  async function createAdminRequest(
    method: string,
    path: string,
    body?: any
  ): Promise<Request> {
    const token = await issueTenantAdminJWT(mockEnv, {
      tenant_id: "test-tenant",
      ttlMinutes: 60,
    });

    const url = new URL(path, "https://example.com");

    return new Request(url.toString(), {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  describe("getAdminStats", () => {
    it("returns dashboard statistics", async () => {
      mockDB.prepare.mockImplementation((query: string) => {
        const mockChain: any = {
          bind: vi.fn(() => mockChain),
          all: vi.fn(async () => {
            if (query.includes("GROUP BY status")) {
              return {
                results: [
                  { status: "trial", count: 5 },
                  { status: "active", count: 10 },
                ],
              };
            }
            if (query.includes("GROUP BY plan")) {
              return {
                results: [
                  { plan: "starter", count: 8 },
                  { plan: "pro", count: 7 },
                ],
              };
            }
            return { results: [] };
          }),
          first: vi.fn(async () => {
            if (query.includes("created_at >= ?")) {
              return { count: 3 };
            }
            if (query.includes("SUM(action_count)")) {
              return { total: 1500 };
            }
            return null;
          }),
        };
        return mockChain;
      });

      const req = await createAdminRequest("GET", "/api/v1/admin/stats");
      const res = await getAdminStats(req, mockEnv, requestId, corsHdrs);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.stats).toBeDefined();
      expect(data.stats.byStatus).toHaveLength(2);
      expect(data.stats.byPlan).toHaveLength(2);
      expect(data.stats.recentSignups).toBe(3);
      expect(data.stats.monthlyUsage).toBe(1500);
    });

    it("requires admin authentication", async () => {
      const req = new Request("https://example.com/api/v1/admin/stats", {
        method: "GET",
      });

      try {
        await getAdminStats(req, mockEnv, requestId, corsHdrs);
        // Should not reach here
        expect(true).toBe(false);
      } catch (res) {
        expect(res instanceof Response).toBe(true);
        expect((res as Response).status).toBeGreaterThanOrEqual(401);
      }
    });
  });

  describe("listTenants", () => {
    it("lists all tenants with pagination", async () => {
      mockDB.prepare.mockImplementation((query: string) => {
        const mockChain: any = {
          bind: vi.fn(() => mockChain),
          all: vi.fn(async () => ({
            results: [
              {
                id: "tenant-1",
                slug: "tenant-1",
                name: "Tenant 1",
                status: "active",
                plan: "starter",
              },
              {
                id: "tenant-2",
                slug: "tenant-2",
                name: "Tenant 2",
                status: "trial",
                plan: "pro",
              },
            ],
          })),
          first: vi.fn(async () => ({ total: 2 })),
        };
        return mockChain;
      });

      const req = await createAdminRequest(
        "GET",
        "/api/v1/admin/tenants?limit=50&offset=0"
      );
      const res = await listTenants(req, mockEnv, requestId, corsHdrs);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.tenants).toHaveLength(2);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.total).toBe(2);
      expect(data.pagination.hasMore).toBe(false);
    });

    it("filters tenants by status", async () => {
      const req = await createAdminRequest(
        "GET",
        "/api/v1/admin/tenants?status=active"
      );
      const res = await listTenants(req, mockEnv, requestId, corsHdrs);

      expect(res.status).toBe(200);
      expect(mockDB.prepare).toHaveBeenCalledWith(
        expect.stringContaining("AND status = ?")
      );
    });

    it("filters tenants by plan", async () => {
      const req = await createAdminRequest(
        "GET",
        "/api/v1/admin/tenants?plan=pro"
      );
      const res = await listTenants(req, mockEnv, requestId, corsHdrs);

      expect(res.status).toBe(200);
      expect(mockDB.prepare).toHaveBeenCalledWith(
        expect.stringContaining("AND plan = ?")
      );
    });
  });

  describe("getTenant", () => {
    it("returns tenant details with usage history", async () => {
      mockDB.prepare.mockImplementation((query: string) => {
        const mockChain: any = {
          bind: vi.fn(() => mockChain),
          first: vi.fn(async () => {
            if (query.includes("FROM tenants t")) {
              return {
                id: "tenant-1",
                slug: "tenant-1",
                name: "Test Tenant",
                status: "active",
                plan: "pro",
              };
            }
            if (query.includes("usage_counters")) {
              return { action_count: 100 };
            }
            return null;
          }),
        };
        return mockChain;
      });

      const req = await createAdminRequest(
        "GET",
        "/api/v1/admin/tenants/tenant-1"
      );
      const res = await getTenant(req, mockEnv, requestId, corsHdrs, "tenant-1");

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.tenant).toBeDefined();
      expect(data.tenant.id).toBe("tenant-1");
      expect(data.tenant.usageHistory).toBeDefined();
      expect(data.tenant.usageHistory).toHaveLength(6); // 6 months
    });

    it("returns 404 for non-existent tenant", async () => {
      mockDB.prepare.mockImplementation(() => ({
        bind: () => ({
          first: async () => null,
        }),
      }));

      const req = await createAdminRequest(
        "GET",
        "/api/v1/admin/tenants/non-existent"
      );
      const res = await getTenant(
        req,
        mockEnv,
        requestId,
        corsHdrs,
        "non-existent"
      );

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("NOT_FOUND");
    });
  });

  describe("updateTenant", () => {
    it("updates tenant status", async () => {
      const req = await createAdminRequest(
        "PATCH",
        "/api/v1/admin/tenants/tenant-1",
        {
          status: "active",
        }
      );
      const res = await updateTenant(
        req,
        mockEnv,
        requestId,
        corsHdrs,
        "tenant-1"
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockDB.prepare).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE tenants SET")
      );
    });

    it("updates tenant plan", async () => {
      const req = await createAdminRequest(
        "PATCH",
        "/api/v1/admin/tenants/tenant-1",
        {
          plan: "pro",
        }
      );
      const res = await updateTenant(
        req,
        mockEnv,
        requestId,
        corsHdrs,
        "tenant-1"
      );

      expect(res.status).toBe(200);
    });

    it("updates comped flag", async () => {
      const req = await createAdminRequest(
        "PATCH",
        "/api/v1/admin/tenants/tenant-1",
        {
          comped: true,
        }
      );
      const res = await updateTenant(
        req,
        mockEnv,
        requestId,
        corsHdrs,
        "tenant-1"
      );

      expect(res.status).toBe(200);
    });

    it("rejects invalid status", async () => {
      const req = await createAdminRequest(
        "PATCH",
        "/api/v1/admin/tenants/tenant-1",
        {
          status: "invalid-status",
        }
      );
      const res = await updateTenant(
        req,
        mockEnv,
        requestId,
        corsHdrs,
        "tenant-1"
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("INVALID_REQUEST");
    });

    it("returns error when no fields to update", async () => {
      const req = await createAdminRequest(
        "PATCH",
        "/api/v1/admin/tenants/tenant-1",
        {}
      );
      const res = await updateTenant(
        req,
        mockEnv,
        requestId,
        corsHdrs,
        "tenant-1"
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("NO_UPDATES");
    });
  });

  describe("deactivateTenant", () => {
    it("deactivates a tenant", async () => {
      mockDB.prepare.mockImplementation((query: string) => {
        const mockChain: any = {
          bind: vi.fn(() => mockChain),
          first: vi.fn(async () => ({ slug: "test-tenant" })),
          run: vi.fn(async () => ({ success: true })),
        };
        return mockChain;
      });

      const req = await createAdminRequest(
        "POST",
        "/api/v1/admin/tenants/tenant-1/deactivate"
      );
      const res = await deactivateTenant(
        req,
        mockEnv,
        requestId,
        corsHdrs,
        "tenant-1"
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it("protects syston tenant from deactivation", async () => {
      mockDB.prepare.mockImplementation(() => ({
        bind: () => ({
          first: async () => ({ slug: "syston-town-tigers" }),
        }),
      }));

      const req = await createAdminRequest(
        "POST",
        "/api/v1/admin/tenants/syston/deactivate"
      );
      const res = await deactivateTenant(
        req,
        mockEnv,
        requestId,
        corsHdrs,
        "syston"
      );

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error.code).toBe("PROTECTED_TENANT");
    });

    it("returns 404 for non-existent tenant", async () => {
      mockDB.prepare.mockImplementation(() => ({
        bind: () => ({
          first: async () => null,
        }),
      }));

      const req = await createAdminRequest(
        "POST",
        "/api/v1/admin/tenants/non-existent/deactivate"
      );
      const res = await deactivateTenant(
        req,
        mockEnv,
        requestId,
        corsHdrs,
        "non-existent"
      );

      expect(res.status).toBe(404);
    });
  });

  describe("deleteTenant", () => {
    it("deletes a tenant and related data", async () => {
      mockDB.prepare.mockImplementation((query: string) => {
        const mockChain: any = {
          bind: vi.fn(() => mockChain),
          first: vi.fn(async () => ({ slug: "test-tenant" })),
        };
        return mockChain;
      });

      const req = await createAdminRequest(
        "DELETE",
        "/api/v1/admin/tenants/tenant-1"
      );
      const res = await deleteTenant(
        req,
        mockEnv,
        requestId,
        corsHdrs,
        "tenant-1"
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockDB.batch).toHaveBeenCalled();
    });

    it("protects syston tenant from deletion", async () => {
      mockDB.prepare.mockImplementation(() => ({
        bind: () => ({
          first: async () => ({ slug: "syston-tigers" }),
        }),
      }));

      const req = await createAdminRequest(
        "DELETE",
        "/api/v1/admin/tenants/syston"
      );
      const res = await deleteTenant(
        req,
        mockEnv,
        requestId,
        corsHdrs,
        "syston"
      );

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error.code).toBe("PROTECTED_TENANT");
    });
  });

  describe("listPromoCodes", () => {
    it("lists all promo codes", async () => {
      mockDB.prepare.mockImplementation(() => ({
        all: async () => ({
          results: [
            {
              id: "promo-1",
              code: "SAVE20",
              discount_percent: 20,
              max_uses: 100,
              used_count: 5,
            },
            {
              id: "promo-2",
              code: "FIRST50",
              discount_percent: 50,
              max_uses: 50,
              used_count: 10,
            },
          ],
        }),
      }));

      const req = await createAdminRequest("GET", "/api/v1/admin/promo-codes");
      const res = await listPromoCodes(req, mockEnv, requestId, corsHdrs);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.promoCodes).toHaveLength(2);
      expect(data.promoCodes[0].code).toBe("SAVE20");
    });
  });

  describe("createPromoCode", () => {
    it("creates a new promo code", async () => {
      mockDB.prepare.mockImplementation((query: string) => {
        const mockChain: any = {
          bind: vi.fn(() => mockChain),
          first: vi.fn(async () => null), // Code doesn't exist yet
          run: vi.fn(async () => ({ success: true })),
        };
        return mockChain;
      });

      const req = await createAdminRequest("POST", "/api/v1/admin/promo-codes", {
        code: "SAVE30",
        discountPercent: 30,
        maxUses: 100,
      });
      const res = await createPromoCode(req, mockEnv, requestId, corsHdrs);

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.promoCode).toBeDefined();
      expect(data.promoCode.code).toBe("SAVE30");
      expect(data.promoCode.discountPercent).toBe(30);
    });

    it("rejects duplicate promo code", async () => {
      mockDB.prepare.mockImplementation(() => ({
        bind: () => ({
          first: async () => ({ id: "existing-promo" }),
        }),
      }));

      const req = await createAdminRequest("POST", "/api/v1/admin/promo-codes", {
        code: "SAVE20",
        discountPercent: 20,
      });
      const res = await createPromoCode(req, mockEnv, requestId, corsHdrs);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("CODE_EXISTS");
    });

    it("validates promo code format", async () => {
      const req = await createAdminRequest("POST", "/api/v1/admin/promo-codes", {
        code: "invalid-code", // Lowercase not allowed
        discountPercent: 20,
      });
      const res = await createPromoCode(req, mockEnv, requestId, corsHdrs);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("INVALID_REQUEST");
    });

    it("validates discount percent range", async () => {
      const req = await createAdminRequest("POST", "/api/v1/admin/promo-codes", {
        code: "SAVE150",
        discountPercent: 150, // Over 100%
      });
      const res = await createPromoCode(req, mockEnv, requestId, corsHdrs);

      expect(res.status).toBe(400);
    });
  });

  describe("deactivatePromoCode", () => {
    it("deactivates a promo code", async () => {
      mockDB.prepare.mockImplementation((query: string) => {
        const mockChain: any = {
          bind: vi.fn(() => mockChain),
          first: vi.fn(async () => ({ id: "promo-1" })),
          run: vi.fn(async () => ({ success: true })),
        };
        return mockChain;
      });

      const req = await createAdminRequest(
        "POST",
        "/api/v1/admin/promo-codes/SAVE20/deactivate"
      );
      const res = await deactivatePromoCode(
        req,
        mockEnv,
        requestId,
        corsHdrs,
        "SAVE20"
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it("returns 404 for non-existent promo code", async () => {
      mockDB.prepare.mockImplementation(() => ({
        bind: () => ({
          first: async () => null,
        }),
      }));

      const req = await createAdminRequest(
        "POST",
        "/api/v1/admin/promo-codes/NONEXISTENT/deactivate"
      );
      const res = await deactivatePromoCode(
        req,
        mockEnv,
        requestId,
        corsHdrs,
        "NONEXISTENT"
      );

      expect(res.status).toBe(404);
    });
  });

  describe("listUsers", () => {
    it("lists users for a tenant", async () => {
      mockDB.prepare.mockImplementation((query: string) => {
        const mockChain: any = {
          bind: vi.fn(() => mockChain),
          all: vi.fn(async () => ({
            results: [
              {
                id: "user-1",
                tenant_id: "tenant-1",
                email: "user1@example.com",
                roles: '["tenant_member"]',
                profile: '{"name":"User 1"}',
              },
              {
                id: "user-2",
                tenant_id: "tenant-1",
                email: "user2@example.com",
                roles: '["tenant_admin"]',
                profile: null,
              },
            ],
          })),
          first: vi.fn(async () => ({ total: 2 })),
        };
        return mockChain;
      });

      const req = await createAdminRequest(
        "GET",
        "/api/v1/admin/users?tenantId=tenant-1"
      );
      const res = await listUsers(req, mockEnv, requestId, corsHdrs);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.users).toHaveLength(2);
      expect(data.users[0].email).toBe("user1@example.com");
      expect(data.users[0].roles).toEqual(["tenant_member"]);
      expect(data.users[1].roles).toEqual(["tenant_admin"]);
    });

    it("requires tenantId parameter", async () => {
      const req = await createAdminRequest("GET", "/api/v1/admin/users");
      const res = await listUsers(req, mockEnv, requestId, corsHdrs);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("TENANT_REQUIRED");
    });

    it("filters users by role", async () => {
      const req = await createAdminRequest(
        "GET",
        "/api/v1/admin/users?tenantId=tenant-1&role=tenant_admin"
      );
      const res = await listUsers(req, mockEnv, requestId, corsHdrs);

      expect(res.status).toBe(200);
      expect(mockDB.prepare).toHaveBeenCalledWith(
        expect.stringContaining("AND roles LIKE ?")
      );
    });
  });
});
