import { describe, it, expect } from "vitest";
import type { ExecutionContext } from "@cloudflare/workers-types";
import worker from "../src/index";

class MemoryKV {
  private store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
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
  return {
    API_VERSION: "v1",
    JWT_SECRET: "integration-secret",
    JWT_ISSUER: "integration-issuer",
    JWT_AUDIENCE: "integration-audience",
    SETUP_URL: "https://setup.test",
    ADMIN_CONSOLE_URL: "https://admin.test",
    YT_REDIRECT_URL: "https://example.com/yt",
    KV_IDEMP: kv,
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

describe("tenant provisioning", () => {
  it("issues admin tokens that can call admin routes", async () => {
    const env = createEnv();
    const ctx = createExecutionContext();

    const signupRequest = new Request("https://example.com/api/v1/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clubName: "Integration Club",
        clubShortName: "integration-club",
        contactEmail: "admin@example.com",
        contactName: "Integration Admin",
      }),
    });

    const signupResponse = await worker.fetch(signupRequest, env, ctx);
    expect(signupResponse.status).toBe(200);
    const signupData = await signupResponse.json();
    expect(signupData.success).toBe(true);
    expect(typeof signupData.data.adminJWT).toBe("string");

    const adminJWT = signupData.data.adminJWT as string;

    const adminRequest = new Request("https://example.com/api/v1/admin/tenant/create", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminJWT}`,
      },
      body: JSON.stringify({ id: "secondary-club" }),
    });

    // Tenant-admin JWTs should NOT be able to call platform-admin routes
    const adminResponse = await worker.fetch(adminRequest, env, ctx);
    expect(adminResponse.status).toBe(403);
  });

  it("allows platform admin JWTs to create tenants", async () => {
    const env = createEnv();
    const ctx = createExecutionContext();

    // Create a platform admin JWT (uses 'syston-admin' audience and "admin" role)
    const platformAdminJWT = await issuePlatformAdminJWT(env, { ttlMinutes: 60 });

    const adminRequest = new Request("https://example.com/api/v1/admin/tenant/create", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${platformAdminJWT}`,
      },
      body: JSON.stringify({ id: "platform-created-tenant" }),
    });

    const adminResponse = await worker.fetch(adminRequest, env, ctx);
    expect(adminResponse.status).toBe(200);
    const adminData = await adminResponse.json();
    expect(adminData.success).toBe(true);
    expect(adminData.data.tenant.id).toBe("platform-created-tenant");
  });
});

// Helper to issue platform admin JWT
async function issuePlatformAdminJWT(env: any, args: { ttlMinutes: number }) {
  const secret = getJwtSecret(env);
  const now = Math.floor(Date.now() / 1000);
  const exp = now + args.ttlMinutes * 60;

  const { SignJWT } = await import("jose");

  const token = await new SignJWT({
    roles: ["admin"],  // Platform admin role
    sub: "platform-admin",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(env.JWT_ISSUER)
    .setAudience("syston-admin")  // Platform admin audience
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(secret);

  return token;
}

function getJwtSecret(env: any): Uint8Array {
  const raw = env.JWT_SECRET || "";
  try {
    return Uint8Array.from(atob(raw), c => c.charCodeAt(0));
  } catch {
    return new TextEncoder().encode(raw);
  }
}
