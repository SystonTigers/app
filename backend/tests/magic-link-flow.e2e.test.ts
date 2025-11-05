import { describe, it, expect, beforeEach } from "vitest";
import type { ExecutionContext } from "@cloudflare/workers-types";
import worker from "../src/index";

// Mock email service
import * as emailLib from "../src/lib/email";
import { vi } from "vitest";

vi.mock("../src/lib/email", () => ({
  sendMagicLinkEmail: vi.fn(async () => ({
    success: true,
    messageId: "test-message-id",
  })),
}));

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
    JWT_SECRET: "e2e-test-secret-key-at-least-32-characters-long",
    JWT_ISSUER: "e2e-test-issuer",
    JWT_AUDIENCE: "syston-mobile",
    SETUP_URL: "https://setup.test",
    ADMIN_CONSOLE_URL: "https://admin.test",
    YT_REDIRECT_URL: "https://example.com/yt",
    KV_IDEMP: kv,
    DB: {
      prepare: (query: string) => ({
        bind: (...args: any[]) => ({
          first: async () => ({ name: "Test Club" }),
          all: async () => ({ results: [] }),
          run: async () => ({ success: true }),
        }),
      }),
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

describe("Magic Link Authentication E2E Flow", () => {
  let env: any;
  let ctx: ExecutionContext;

  beforeEach(() => {
    env = createEnv();
    ctx = createExecutionContext();
    vi.clearAllMocks();
  });

  it("completes full magic link authentication flow", async () => {
    // Step 1: Request magic link
    const startRequest = new Request("https://example.com/auth/magic/start", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "user@example.com",
        tenantId: "test-tenant",
      }),
    });

    const startResponse = await worker.fetch(startRequest, env, ctx);
    expect(startResponse.status).toBe(200);
    const startData: any = await startResponse.json();
    expect(startData.success).toBe(true);

    // Verify email was sent
    expect(emailLib.sendMagicLinkEmail).toHaveBeenCalled();

    // Extract magic link token from email mock
    const emailCalls = vi.mocked(emailLib.sendMagicLinkEmail).mock.calls;
    const lastCall = emailCalls[emailCalls.length - 1];
    // sendMagicLinkEmail(email, magicLink, tenantName, env)
    const emailTo = lastCall[0];
    const magicLinkUrl = lastCall[1];

    expect(emailTo).toBe("user@example.com");
    expect(magicLinkUrl).toBeTruthy();

    const url = new URL(magicLinkUrl);
    const magicToken = url.searchParams.get("token");

    expect(magicToken).toBeTruthy();

    // Step 2: Verify magic link token
    const verifyRequest = new Request(
      `https://example.com/auth/magic/verify?token=${magicToken}`,
      {
        method: "GET",
      }
    );

    const verifyResponse = await worker.fetch(verifyRequest, env, ctx);
    expect(verifyResponse.status).toBe(200);
    const verifyData: any = await verifyResponse.json();
    expect(verifyData.success).toBe(true);
    expect(verifyData.tenantId).toBe("test-tenant");

    // Step 3: Verify session cookie was set
    const setCookieHeader = verifyResponse.headers.get("Set-Cookie");
    expect(setCookieHeader).toBeTruthy();
    expect(setCookieHeader).toContain("owner_session=");
    expect(setCookieHeader).toContain("HttpOnly");
    expect(setCookieHeader).toContain("Secure");

    // Extract session token from cookie
    const cookieMatch = setCookieHeader!.match(/owner_session=([^;]+)/);
    expect(cookieMatch).toBeTruthy();
    const sessionToken = cookieMatch![1];

    // Step 4: Use session token to access protected route
    const protectedRequest = new Request(
      "https://example.com/api/v1/tenants/test-tenant/overview",
      {
        method: "GET",
        headers: {
          cookie: `owner_session=${sessionToken}`,
        },
      }
    );

    const protectedResponse = await worker.fetch(protectedRequest, env, ctx);
    expect(protectedResponse.status).toBe(200);
    const protectedData: any = await protectedResponse.json();
    expect(protectedData.success).toBe(true);
  });

  it("rejects expired magic link tokens", async () => {
    // Create an expired magic link token
    const { SignJWT } = await import("jose");
    const now = Math.floor(Date.now() / 1000);
    const expiredToken = await new SignJWT({
      type: "magic_link",
      roles: ["owner", "admin"],
      tenantId: "test-tenant",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer(env.JWT_ISSUER)
      .setAudience("syston-admin")
      .setSubject("user@example.com")
      .setIssuedAt(now - 48 * 3600) // 48 hours ago
      .setExpirationTime(now - 24 * 3600) // Expired 24 hours ago
      .sign(new TextEncoder().encode(env.JWT_SECRET));

    const verifyRequest = new Request(
      `https://example.com/auth/magic/verify?token=${expiredToken}`,
      {
        method: "GET",
      }
    );

    // Should throw error or return error response
    const response = await worker.fetch(verifyRequest, env, ctx);
    // Either status 401/403 or an error was thrown
    expect([401, 403, 500]).toContain(response.status);
  });

  it("handles case-insensitive email addresses", async () => {
    // Request with uppercase email
    const startRequest = new Request("https://example.com/auth/magic/start", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "USER@EXAMPLE.COM",
        tenantId: "test-tenant",
      }),
    });

    const startResponse = await worker.fetch(startRequest, env, ctx);
    expect(startResponse.status).toBe(200);

    // Verify email was normalized to lowercase
    const emailCalls = vi.mocked(emailLib.sendMagicLinkEmail).mock.calls;
    const lastCall = emailCalls[emailCalls.length - 1];
    const emailTo = lastCall[0];

    expect(emailTo).toBe("user@example.com"); // Should be lowercase
  });

  it("defaults to platform tenant when tenant not specified", async () => {
    const startRequest = new Request("https://example.com/auth/magic/start", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "admin@example.com",
        // No tenantId specified
      }),
    });

    const startResponse = await worker.fetch(startRequest, env, ctx);
    expect(startResponse.status).toBe(200);
    const startData: any = await startResponse.json();
    expect(startData.success).toBe(true);

    // Verify email was sent
    expect(emailLib.sendMagicLinkEmail).toHaveBeenCalled();
  });
});
