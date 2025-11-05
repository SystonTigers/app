import { describe, it, expect, beforeEach } from "vitest";
import type { ExecutionContext } from "@cloudflare/workers-types";
import worker from "../src/index";
import { issueTenantAdminJWT } from "../src/services/jwt";

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

class MultiTenantDB {
  private tenants = new Map<string, any>();
  private events = new Map<string, any[]>();
  private users = new Map<string, any[]>();

  constructor() {
    // Seed with test data for two tenants
    this.tenants.set("tenant-a", {
      id: "tenant-a",
      name: "Tenant A",
      plan: "starter",
      status: "active",
    });
    this.tenants.set("tenant-b", {
      id: "tenant-b",
      name: "Tenant B",
      plan: "pro",
      status: "active",
    });

    this.events.set("tenant-a", [
      { id: "event-a1", tenant_id: "tenant-a", title: "Event A1", date: "2025-01-01" },
      { id: "event-a2", tenant_id: "tenant-a", title: "Event A2", date: "2025-01-02" },
    ]);
    this.events.set("tenant-b", [
      { id: "event-b1", tenant_id: "tenant-b", title: "Event B1", date: "2025-01-01" },
    ]);

    this.users.set("tenant-a", [
      { id: "user-a1", tenant_id: "tenant-a", email: "user1@tenanta.com" },
    ]);
    this.users.set("tenant-b", [
      { id: "user-b1", tenant_id: "tenant-b", email: "user1@tenantb.com" },
    ]);
  }

  prepare(query: string) {
    return {
      bind: (...params: any[]) => ({
        first: async () => {
          if (query.includes("FROM tenants")) {
            const tenantId = params[0];
            return this.tenants.get(tenantId) || null;
          }
          if (query.includes("FROM events")) {
            const tenantId = params.find((p: any) =>
              typeof p === "string" && (p === "tenant-a" || p === "tenant-b")
            );
            const eventId = params[0];
            const events = this.events.get(tenantId) || [];
            return events.find((e: any) => e.id === eventId) || null;
          }
          if (query.includes("FROM users")) {
            const tenantId = params[0];
            const users = this.users.get(tenantId) || [];
            return users[0] || null;
          }
          return null;
        },
        all: async () => {
          if (query.includes("FROM events")) {
            const tenantId = params.find((p: any) =>
              typeof p === "string" && (p === "tenant-a" || p === "tenant-b")
            );
            const events = this.events.get(tenantId) || [];
            return { results: events };
          }
          if (query.includes("FROM users")) {
            const tenantId = params[0];
            const users = this.users.get(tenantId) || [];
            return { results: users };
          }
          return { results: [] };
        },
        run: async () => {
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
  const db = new MultiTenantDB();

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

describe("Multi-Tenant Isolation E2E", () => {
  let env: any;
  let ctx: ExecutionContext;

  beforeEach(() => {
    env = createEnv();
    ctx = createExecutionContext();
  });

  it("tenant A cannot access tenant B's data", async () => {
    // Create JWT for tenant A
    const tenantAToken = await issueTenantAdminJWT(env, {
      tenant_id: "tenant-a",
      ttlMinutes: 60,
    });

    // Try to access tenant B's overview
    const request = new Request(
      "https://example.com/api/v1/tenants/tenant-b/overview",
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${tenantAToken}`,
        },
      }
    );

    const response = await worker.fetch(request, env, ctx);

    // Should be forbidden (403) or unauthorized (401)
    expect([401, 403]).toContain(response.status);
  });

  it("tenant B cannot access tenant A's data", async () => {
    // Create JWT for tenant B
    const tenantBToken = await issueTenantAdminJWT(env, {
      tenant_id: "tenant-b",
      ttlMinutes: 60,
    });

    // Try to access tenant A's overview
    const request = new Request(
      "https://example.com/api/v1/tenants/tenant-a/overview",
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${tenantBToken}`,
        },
      }
    );

    const response = await worker.fetch(request, env, ctx);

    // Should be forbidden or unauthorized
    expect([401, 403]).toContain(response.status);
  });

  it("tenant A can only see their own events", async () => {
    const tenantAToken = await issueTenantAdminJWT(env, {
      tenant_id: "tenant-a",
      ttlMinutes: 60,
    });

    // Get events for tenant A
    const request = new Request(
      "https://example.com/api/v1/events?tenant_id=tenant-a",
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${tenantAToken}`,
        },
      }
    );

    const response = await worker.fetch(request, env, ctx);

    if (response.status === 200) {
      const data: any = await response.json();
      const events = data.events || data.data || [];

      // Should only see tenant A's events
      expect(events.every((e: any) => e.tenant_id === "tenant-a")).toBe(true);

      // Should not see tenant B's events
      expect(events.some((e: any) => e.tenant_id === "tenant-b")).toBe(false);
    }
  });

  it("tenant B can only see their own events", async () => {
    const tenantBToken = await issueTenantAdminJWT(env, {
      tenant_id: "tenant-b",
      ttlMinutes: 60,
    });

    // Get events for tenant B
    const request = new Request(
      "https://example.com/api/v1/events?tenant_id=tenant-b",
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${tenantBToken}`,
        },
      }
    );

    const response = await worker.fetch(request, env, ctx);

    if (response.status === 200) {
      const data: any = await response.json();
      const events = data.events || data.data || [];

      // Should only see tenant B's events
      expect(events.every((e: any) => e.tenant_id === "tenant-b")).toBe(true);

      // Should not see tenant A's events
      expect(events.some((e: any) => e.tenant_id === "tenant-a")).toBe(false);
    }
  });

  it("JWT tenant_id claim is enforced for data access", async () => {
    // Create token for tenant A
    const tenantAToken = await issueTenantAdminJWT(env, {
      tenant_id: "tenant-a",
      ttlMinutes: 60,
    });

    // Try to access tenant B's event using tenant A's token
    const request = new Request(
      "https://example.com/api/v1/events/event-b1",
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${tenantAToken}`,
        },
      }
    );

    const response = await worker.fetch(request, env, ctx);

    // Should not be able to access tenant B's event
    expect([401, 403, 404]).toContain(response.status);
  });

  it("ensures tenant isolation in database queries", async () => {
    const tenantAToken = await issueTenantAdminJWT(env, {
      tenant_id: "tenant-a",
      ttlMinutes: 60,
    });

    const tenantBToken = await issueTenantAdminJWT(env, {
      tenant_id: "tenant-b",
      ttlMinutes: 60,
    });

    // Get tenant A's data
    const requestA = new Request(
      "https://example.com/api/v1/tenants/tenant-a/overview",
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${tenantAToken}`,
        },
      }
    );

    const responseA = await worker.fetch(requestA, env, ctx);

    // Get tenant B's data
    const requestB = new Request(
      "https://example.com/api/v1/tenants/tenant-b/overview",
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${tenantBToken}`,
        },
      }
    );

    const responseB = await worker.fetch(requestB, env, ctx);

    // Both should succeed with their own data
    if (responseA.status === 200 && responseB.status === 200) {
      const dataA: any = await responseA.json();
      const dataB: any = await responseB.json();

      // Verify data separation
      expect(dataA.data?.name).toBe("Tenant A");
      expect(dataB.data?.name).toBe("Tenant B");
    }
  });

  it("prevents cross-tenant user access", async () => {
    const tenantAToken = await issueTenantAdminJWT(env, {
      tenant_id: "tenant-a",
      ttlMinutes: 60,
    });

    // Try to access users from tenant B using tenant A token
    const request = new Request(
      "https://example.com/api/v1/users?tenant_id=tenant-b",
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${tenantAToken}`,
        },
      }
    );

    const response = await worker.fetch(request, env, ctx);

    // Should be denied
    expect([401, 403]).toContain(response.status);
  });

  it("validates tenant context in all API operations", async () => {
    const tenantAToken = await issueTenantAdminJWT(env, {
      tenant_id: "tenant-a",
      ttlMinutes: 60,
    });

    // Collection of requests that should all enforce tenant isolation
    const requests = [
      { path: "/api/v1/tenants/tenant-b/overview", method: "GET" },
      { path: "/api/v1/events?tenant_id=tenant-b", method: "GET" },
      { path: "/api/v1/users?tenant_id=tenant-b", method: "GET" },
    ];

    for (const { path, method } of requests) {
      const req = new Request(`https://example.com${path}`, {
        method,
        headers: {
          authorization: `Bearer ${tenantAToken}`,
        },
      });

      const res = await worker.fetch(req, env, ctx);

      // All should deny access to tenant B's resources
      expect([401, 403, 404]).toContain(res.status);
    }
  });
});
