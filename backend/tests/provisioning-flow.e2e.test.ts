import { describe, it, expect, beforeEach, vi } from "vitest";
import type { ExecutionContext } from "@cloudflare/workers-types";
import worker from "../src/index";
import { generateServiceJWT } from "../src/services/jwt";

// Mock GAS service
import * as gasService from "../src/services/gas";
vi.mock("../src/services/gas");

class MemoryKV {
  private store = new Map<string, string>();

  async get(key: string, type?: string): Promise<any> {
    const value = this.store.get(key);
    if (!value) return null;
    if (type === "json") return JSON.parse(value);
    return value;
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

class MemoryDB {
  private tables = new Map<string, Map<string, any>>();

  constructor() {
    this.tables.set("tenants", new Map());
  }

  prepare(query: string) {
    return {
      bind: (...params: any[]) => ({
        first: async () => {
          if (query.includes("SELECT") && query.includes("FROM tenants")) {
            const tenants = this.tables.get("tenants")!;
            const tenantId = params[0];
            return tenants.get(tenantId) || null;
          }
          return null;
        },
        all: async () => {
          if (query.includes("FROM tenants")) {
            const tenants = this.tables.get("tenants")!;
            return { results: Array.from(tenants.values()) };
          }
          return { results: [] };
        },
        run: async () => {
          if (query.includes("INSERT INTO tenants") || query.includes("UPDATE tenants")) {
            // Store tenant data
            const tenantId = params.find((p: any) => typeof p === "string" && p.includes("-"));
            if (tenantId) {
              const tenants = this.tables.get("tenants")!;
              tenants.set(tenantId, {
                id: tenantId,
                name: "Test Club",
                plan: "starter",
                status: "active",
              });
            }
          }
          return { success: true };
        },
      }),
    };
  }
}

function createExecutionContext(): ExecutionContext {
  return {
    waitUntil: () => {},
    passThroughOnException: () => {},
  } as ExecutionContext;
}

function createEnv() {
  const kv = new MemoryKV();
  const db = new MemoryDB();

  const mockProvisioner = {
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
      return new Response(JSON.stringify({ success: false }), { status: 404 });
    }),
  };

  return {
    API_VERSION: "v1",
    JWT_SECRET: "e2e-test-secret-key-at-least-32-characters-long",
    JWT_ISSUER: "e2e-test-issuer",
    JWT_AUDIENCE: "syston-mobile",
    SETUP_URL: "https://setup.test",
    ADMIN_CONSOLE_URL: "https://admin.test",
    YT_REDIRECT_URL: "https://example.com/yt",
    KV_IDEMP: kv,
    DB: db,
    PROVISIONER: {
      idFromName: vi.fn(() => "provisioner-id"),
      get: vi.fn(() => mockProvisioner),
    },
    POST_QUEUE: { send: async () => {} },
    DLQ: { send: async () => {} },
    TenantRateLimiter: { idFromName: () => ({}) },
    VotingRoom: { idFromName: () => ({}) },
    ChatRoom: { idFromName: () => ({}) },
    MatchRoom: { idFromName: () => ({}) },
    GeoFenceManager: { idFromName: () => ({}) },
    R2_MEDIA: { put: async () => {}, get: async () => null },
  } as Record<string, any>;
}

describe("Tenant Provisioning E2E Flow", () => {
  let env: any;
  let ctx: ExecutionContext;

  beforeEach(() => {
    env = createEnv();
    ctx = createExecutionContext();
    vi.clearAllMocks();

    // Mock GAS service
    vi.mocked(gasService.gasCall).mockResolvedValue({
      ok: true,
      spreadsheetId: "test-spreadsheet-id",
      report: { status: "success", checks: 10 },
    });
  });

  it("completes full tenant provisioning workflow", async () => {
    // Step 1: Provision tenant via GAS endpoint
    const provisionRequest = new Request("https://example.com/api/tenants", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        teamName: "E2E Test Club",
        tenantId: "e2e-test-club",
        primary: "#FF0000",
        secondary: "#0000FF",
        badgeUrl: "https://example.com/badge.png",
        contactEmail: "test@example.com",
      }),
    });

    const provisionResponse = await worker.fetch(provisionRequest, env, ctx);
    expect(provisionResponse.status).toBe(200);
    const provisionData: any = await provisionResponse.json();
    expect(provisionData.success).toBe(true);
    expect(provisionData.spreadsheetId).toBe("test-spreadsheet-id");
    expect(provisionData.status).toBe("READY");

    // Verify GAS was called
    expect(gasService.gasCall).toHaveBeenCalledWith(
      env,
      "provision",
      expect.objectContaining({
        teamName: "E2E Test Club",
        tenantId: "e2e-test-club",
      })
    );

    // Step 2: Verify tenant setup
    const verifyRequest = new Request(
      "https://example.com/api/tenants/e2e-test-club/verify",
      {
        method: "POST",
      }
    );

    const verifyResponse = await worker.fetch(verifyRequest, env, ctx);
    expect(verifyResponse.status).toBe(200);
    const verifyData: any = await verifyResponse.json();
    expect(verifyData.success).toBe(true);
    expect(verifyData.ok).toBe(true);
    expect(verifyData.report.status).toBe("success");

    // Verify GAS verify was called
    expect(gasService.gasCall).toHaveBeenCalledWith(env, "verify", {
      spreadsheetId: "test-spreadsheet-id",
    });
  });

  it("handles provisioning with service JWT authentication", async () => {
    // Generate service JWT
    const serviceToken = await generateServiceJWT(env, 30);

    // Step 1: Queue provisioning via internal endpoint
    const queueRequest = new Request(
      "https://example.com/internal/provision/queue",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${serviceToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ tenantId: "service-test-tenant" }),
      }
    );

    const queueResponse = await worker.fetch(queueRequest, env, ctx);
    expect(queueResponse.status).toBe(200);
    const queueData: any = await queueResponse.json();
    expect(queueData.success).toBe(true);

    // Verify provisioner was called
    const mockProvisioner = env.PROVISIONER.get();
    expect(mockProvisioner.fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining("/queue"),
      })
    );

    // Step 2: Check provisioning status
    const statusRequest = new Request(
      "https://example.com/api/v1/tenants/service-test-tenant/provision-status",
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${serviceToken}`,
        },
      }
    );

    const statusResponse = await worker.fetch(statusRequest, env, ctx);
    expect(statusResponse.status).toBe(200);
    const statusData: any = await statusResponse.json();
    expect(statusData.success).toBe(true);
    expect(statusData.data.status).toBeDefined();
  });

  it("enforces idempotency for duplicate provisioning requests", async () => {
    // Mock tenant already exists and is READY
    vi.mocked(gasService.gasCall).mockResolvedValueOnce({
      ok: true,
      spreadsheetId: "existing-spreadsheet",
      report: { status: "success" },
    });

    // First provisioning request
    const request1 = new Request("https://example.com/api/tenants", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        teamName: "Idempotent Test",
        tenantId: "idempotent-test",
        primary: "#FF0000",
        secondary: "#0000FF",
        badgeUrl: "https://example.com/badge.png",
        contactEmail: "test@example.com",
      }),
    });

    const response1 = await worker.fetch(request1, env, ctx);
    expect(response1.status).toBe(200);
    const data1: any = await response1.json();
    expect(data1.success).toBe(true);

    // Second provisioning request (duplicate)
    const request2 = new Request("https://example.com/api/tenants", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        teamName: "Idempotent Test",
        tenantId: "idempotent-test",
        primary: "#FF0000",
        secondary: "#0000FF",
        badgeUrl: "https://example.com/badge.png",
        contactEmail: "test@example.com",
      }),
    });

    const response2 = await worker.fetch(request2, env, ctx);
    expect(response2.status).toBe(200);
    const data2: any = await response2.json();
    expect(data2.success).toBe(true);

    // GAS should only be called once (idempotent)
    expect(gasService.gasCall).toHaveBeenCalledTimes(1);
  });

  it("handles provisioning failures gracefully", async () => {
    // Mock GAS failure
    vi.mocked(gasService.gasCall).mockRejectedValueOnce(
      new Error("GAS provisioning failed")
    );

    const provisionRequest = new Request("https://example.com/api/tenants", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        teamName: "Failure Test",
        tenantId: "failure-test",
        primary: "#FF0000",
        secondary: "#0000FF",
        badgeUrl: "https://example.com/badge.png",
        contactEmail: "test@example.com",
      }),
    });

    const provisionResponse = await worker.fetch(provisionRequest, env, ctx);
    expect(provisionResponse.status).toBe(502);
    const provisionData: any = await provisionResponse.json();
    expect(provisionData.success).toBe(false);
    expect(provisionData.status).toBe("ERROR");
    expect(provisionData.error).toContain("GAS provisioning failed");
  });

  it("validates tenant data before provisioning", async () => {
    // Missing required fields
    const invalidRequest = new Request("https://example.com/api/tenants", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        teamName: "Test",
        // Missing tenantId and other required fields
      }),
    });

    const response = await worker.fetch(invalidRequest, env, ctx);
    expect(response.status).toBe(400);
    const data: any = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe("invalid_request");
    expect(data.issues).toBeDefined();
  });
});
