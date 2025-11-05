import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  handleProvisionQueue,
  handleProvisionStatus,
  handleTenantOverview,
  handleProvisionRetry,
} from "../provisioning";
import { generateServiceJWT, issueTenantAdminJWT } from "../../services/jwt";

describe("Provisioning Routes", () => {
  let mockEnv: any;
  let mockDB: any;
  let mockProvisioner: any;

  beforeEach(() => {
    // Mock database
    mockDB = {
      prepare: vi.fn((query: string) => {
        const mockChain: any = {
          bind: vi.fn(() => mockChain),
          first: vi.fn(async () => null),
          run: vi.fn(async () => ({ success: true })),
        };
        return mockChain;
      }),
    };

    // Mock Provisioner Durable Object
    mockProvisioner = {
      fetch: vi.fn(async (request: Request) => {
        const url = new URL(request.url);
        if (url.pathname === "/queue") {
          return new Response(JSON.stringify({ success: true }));
        }
        if (url.pathname === "/run") {
          return new Response(
            JSON.stringify({
              success: true,
              message: "Provisioning completed",
              state: { status: "completed" },
            })
          );
        }
        if (url.pathname === "/status") {
          return new Response(
            JSON.stringify({
              success: true,
              state: {
                status: "completed",
                currentStep: null,
                checkpoints: {},
              },
            })
          );
        }
        if (url.pathname === "/retry") {
          return new Response(JSON.stringify({ success: true }));
        }
        return new Response(JSON.stringify({ success: false }), { status: 404 });
      }),
    };

    mockEnv = {
      DB: mockDB,
      PROVISIONER: {
        idFromName: vi.fn(() => "provisioner-id"),
        get: vi.fn(() => mockProvisioner),
      },
      JWT_SECRET: "test-secret-key-at-least-32-characters-long",
      JWT_ISSUER: "test-issuer",
      JWT_AUDIENCE: "syston-mobile",
    };
  });

  describe("handleProvisionQueue", () => {
    it("queues provisioning with valid service JWT", async () => {
      // Setup tenant in database
      mockDB.prepare.mockImplementation(() => ({
        bind: () => ({
          first: async () => ({ id: "tenant-123", plan: "starter" }),
        }),
      }));

      const serviceToken = await generateServiceJWT(mockEnv, 30);
      const request = new Request("https://example.com/internal/provision/queue", {
        method: "POST",
        headers: {
          authorization: `Bearer ${serviceToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ tenantId: "tenant-123" }),
      });

      const response = await handleProvisionQueue(request, mockEnv);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(mockProvisioner.fetch).toHaveBeenCalledTimes(2); // queue + run
    });

    it("rejects requests without service JWT", async () => {
      const request = new Request("https://example.com/internal/provision/queue", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ tenantId: "tenant-123" }),
      });

      const response = await handleProvisionQueue(request, mockEnv);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("rejects requests with invalid service JWT", async () => {
      const request = new Request("https://example.com/internal/provision/queue", {
        method: "POST",
        headers: {
          authorization: `Bearer invalid-token`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ tenantId: "tenant-123" }),
      });

      const response = await handleProvisionQueue(request, mockEnv);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error.code).toBe("INVALID_TOKEN");
    });

    it("requires tenantId in request body", async () => {
      const serviceToken = await generateServiceJWT(mockEnv, 30);
      const request = new Request("https://example.com/internal/provision/queue", {
        method: "POST",
        headers: {
          authorization: `Bearer ${serviceToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const response = await handleProvisionQueue(request, mockEnv);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe("MISSING_TENANT_ID");
    });

    it("returns 404 for non-existent tenant", async () => {
      mockDB.prepare.mockImplementation(() => ({
        bind: () => ({
          first: async () => null,
        }),
      }));

      const serviceToken = await generateServiceJWT(mockEnv, 30);
      const request = new Request("https://example.com/internal/provision/queue", {
        method: "POST",
        headers: {
          authorization: `Bearer ${serviceToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ tenantId: "non-existent" }),
      });

      const response = await handleProvisionQueue(request, mockEnv);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error.code).toBe("TENANT_NOT_FOUND");
    });

    it("retries provisioning on failure", async () => {
      mockDB.prepare.mockImplementation(() => ({
        bind: () => ({
          first: async () => ({ id: "tenant-123", plan: "starter" }),
        }),
      }));

      // Mock failure on first attempt, success on second
      let attemptCount = 0;
      mockProvisioner.fetch = vi.fn(async (request: Request) => {
        const url = new URL(request.url);
        if (url.pathname === "/run") {
          attemptCount++;
          if (attemptCount === 1) {
            throw new Error("TIMEOUT");
          }
          return new Response(
            JSON.stringify({
              success: true,
              message: "Provisioning completed",
            })
          );
        }
        return new Response(JSON.stringify({ success: true }));
      });

      const serviceToken = await generateServiceJWT(mockEnv, 30);
      const request = new Request("https://example.com/internal/provision/queue", {
        method: "POST",
        headers: {
          authorization: `Bearer ${serviceToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ tenantId: "tenant-123" }),
      });

      const response = await handleProvisionQueue(request, mockEnv);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("returns error after max retry attempts", async () => {
      mockDB.prepare.mockImplementation(() => ({
        bind: () => ({
          first: async () => ({ id: "tenant-123", plan: "starter" }),
        }),
      }));

      // Mock persistent failure
      mockProvisioner.fetch = vi.fn(async (request: Request) => {
        const url = new URL(request.url);
        if (url.pathname === "/run") {
          throw new Error("TIMEOUT");
        }
        return new Response(JSON.stringify({ success: true }));
      });

      const serviceToken = await generateServiceJWT(mockEnv, 30);
      const request = new Request("https://example.com/internal/provision/queue", {
        method: "POST",
        headers: {
          authorization: `Bearer ${serviceToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ tenantId: "tenant-123" }),
      });

      const response = await handleProvisionQueue(request, mockEnv);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error.code).toBe("PROVISIONING_FAILED");
      expect(data.error.attempts).toBeGreaterThan(1);
    }, 15000); // Increased timeout to 15 seconds for retry logic
  });

  describe("handleProvisionStatus", () => {
    it("returns provisioning status for authorized user", async () => {
      mockDB.prepare.mockImplementation(() => ({
        bind: () => ({
          first: async () => ({
            id: "tenant-123",
            plan: "starter",
            status: "active",
            provisioned_at: Date.now(),
          }),
        }),
      }));

      const adminToken = await issueTenantAdminJWT(mockEnv, {
        tenant_id: "tenant-123",
        ttlMinutes: 60,
      });

      const request = new Request(
        "https://example.com/api/v1/tenants/tenant-123/provision-status",
        {
          headers: {
            authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const response = await handleProvisionStatus(request, mockEnv, "tenant-123");

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.status).toBeDefined();
    });

    it("returns 404 for non-existent tenant", async () => {
      mockDB.prepare.mockImplementation(() => ({
        bind: () => ({
          first: async () => null,
        }),
      }));

      const adminToken = await issueTenantAdminJWT(mockEnv, {
        tenant_id: "tenant-123",
        ttlMinutes: 60,
      });

      const request = new Request(
        "https://example.com/api/v1/tenants/non-existent/provision-status",
        {
          headers: {
            authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const response = await handleProvisionStatus(
        request,
        mockEnv,
        "non-existent"
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error.code).toBe("TENANT_NOT_FOUND");
    });

    it("returns default status when provisioner has no state", async () => {
      mockDB.prepare.mockImplementation(() => ({
        bind: () => ({
          first: async () => ({
            id: "tenant-123",
            plan: "starter",
            status: "active",
            provisioned_at: null,
          }),
        }),
      }));

      mockProvisioner.fetch = vi.fn(async () => {
        return new Response(
          JSON.stringify({
            success: false,
          })
        );
      });

      const adminToken = await issueTenantAdminJWT(mockEnv, {
        tenant_id: "tenant-123",
        ttlMinutes: 60,
      });

      const request = new Request(
        "https://example.com/api/v1/tenants/tenant-123/provision-status",
        {
          headers: {
            authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const response = await handleProvisionStatus(request, mockEnv, "tenant-123");

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.status).toBe("pending");
    });
  });

  describe("handleTenantOverview", () => {
    it("returns tenant overview for authorized admin", async () => {
      mockDB.prepare.mockImplementation(() => ({
        bind: () => ({
          first: async () => ({
            id: "tenant-123",
            slug: "test-club",
            name: "Test Club",
            plan: "starter",
            status: "active",
            posts_count: 42,
            webhooks_validated: 1,
          }),
        }),
      }));

      const adminToken = await issueTenantAdminJWT(mockEnv, {
        tenant_id: "tenant-123",
        ttlMinutes: 60,
      });

      const request = new Request(
        "https://example.com/api/v1/tenants/tenant-123/overview",
        {
          headers: {
            authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const response = await handleTenantOverview(request, mockEnv, "tenant-123");

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.name).toBe("Test Club");
      expect(data.data.posts_count).toBe(42);
    });

    it("returns null data for non-existent tenant", async () => {
      mockDB.prepare.mockImplementation(() => ({
        bind: () => ({
          first: async () => null,
        }),
      }));

      const adminToken = await issueTenantAdminJWT(mockEnv, {
        tenant_id: "tenant-123",
        ttlMinutes: 60,
      });

      const request = new Request(
        "https://example.com/api/v1/tenants/tenant-123/overview",
        {
          headers: {
            authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const response = await handleTenantOverview(request, mockEnv, "tenant-123");

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeNull();
    });
  });

  describe("handleProvisionRetry", () => {
    it("retries provisioning with valid service JWT", async () => {
      mockDB.prepare.mockImplementation(() => ({
        bind: () => ({
          first: async () => ({ id: "tenant-123", plan: "starter" }),
        }),
      }));

      const serviceToken = await generateServiceJWT(mockEnv, 30);
      const request = new Request("https://example.com/internal/provision/retry", {
        method: "POST",
        headers: {
          authorization: `Bearer ${serviceToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ tenantId: "tenant-123" }),
      });

      const response = await handleProvisionRetry(request, mockEnv);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(mockProvisioner.fetch).toHaveBeenCalled();
    });

    it("rejects retry without service JWT", async () => {
      const request = new Request("https://example.com/internal/provision/retry", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ tenantId: "tenant-123" }),
      });

      const response = await handleProvisionRetry(request, mockEnv);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("requires tenantId in request body", async () => {
      const serviceToken = await generateServiceJWT(mockEnv, 30);
      const request = new Request("https://example.com/internal/provision/retry", {
        method: "POST",
        headers: {
          authorization: `Bearer ${serviceToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const response = await handleProvisionRetry(request, mockEnv);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe("MISSING_TENANT_ID");
    });

    it("returns 404 for non-existent tenant", async () => {
      mockDB.prepare.mockImplementation(() => ({
        bind: () => ({
          first: async () => null,
        }),
      }));

      const serviceToken = await generateServiceJWT(mockEnv, 30);
      const request = new Request("https://example.com/internal/provision/retry", {
        method: "POST",
        headers: {
          authorization: `Bearer ${serviceToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ tenantId: "non-existent" }),
      });

      const response = await handleProvisionRetry(request, mockEnv);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error.code).toBe("TENANT_NOT_FOUND");
    });
  });

  describe("Service JWT Security", () => {
    it("only accepts internal audience for service endpoints", async () => {
      // Create a member JWT (wrong audience)
      const memberToken = await issueTenantAdminJWT(mockEnv, {
        tenant_id: "tenant-123",
        ttlMinutes: 60,
      });

      const request = new Request("https://example.com/internal/provision/queue", {
        method: "POST",
        headers: {
          authorization: `Bearer ${memberToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ tenantId: "tenant-123" }),
      });

      const response = await handleProvisionQueue(request, mockEnv);

      expect(response.status).toBe(401);
    });

    it("service JWT has short TTL (30 seconds)", async () => {
      const token = await generateServiceJWT(mockEnv, 30);

      // Decode JWT to verify TTL
      const [, payloadB64] = token.split(".");
      const payload = JSON.parse(Buffer.from(payloadB64, "base64").toString());

      const ttl = payload.exp - payload.iat;
      expect(ttl).toBeLessThanOrEqual(30);
    });
  });
});
