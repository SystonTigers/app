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

    const adminResponse = await worker.fetch(adminRequest, env, ctx);
    expect(adminResponse.status).toBe(200);
    const adminData = await adminResponse.json();
    expect(adminData.success).toBe(true);
    expect(adminData.data.tenant.id).toBe("secondary-club");
  });
});
