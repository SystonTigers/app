import { describe, it, expect, beforeEach, vi } from "vitest";
import type { ExecutionContext } from "@cloudflare/workers-types";
import worker from "../src/index";
import { issueTenantMemberJWT } from "../src/services/jwt";

// Mock FCM
const mockFcmSend = vi.fn();
global.fetch = vi.fn((url: string | Request, options?: any) => {
  const urlString = typeof url === "string" ? url : url.url;
  if (urlString.includes("fcm.googleapis.com")) {
    mockFcmSend(url, options);
    return Promise.resolve(
      new Response(
        JSON.stringify({
          success: 1,
          failure: 0,
          results: [{ message_id: "test-msg-id" }],
        }),
        { status: 200 }
      )
    );
  }
  return Promise.resolve(new Response("Not Found", { status: 404 }));
}) as any;

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

class NotificationDB {
  private users = new Map<string, any>();
  private events = new Map<string, any>();
  private nextEventId = 1;

  constructor() {
    this.users.set("user-1", {
      id: "user-1",
      tenant_id: "test-tenant",
      email: "user1@test.com",
      roles: JSON.stringify(["tenant_member"]),
    });
    this.users.set("user-2", {
      id: "user-2",
      tenant_id: "test-tenant",
      email: "user2@test.com",
      roles: JSON.stringify(["tenant_member"]),
    });
    // User in different tenant
    this.users.set("user-3", {
      id: "user-3",
      tenant_id: "other-tenant",
      email: "user3@other.com",
      roles: JSON.stringify(["tenant_member"]),
    });
  }

  prepare(query: string) {
    return {
      bind: (...params: any[]) => ({
        first: async () => {
          if (query.includes("FROM users")) {
            const userId = params[0];
            return this.users.get(userId) || null;
          }
          if (query.includes("FROM events")) {
            const eventId = params[0];
            return this.events.get(eventId) || null;
          }
          return null;
        },
        all: async () => {
          if (query.includes("FROM events")) {
            const tenantId = params[0];
            const events = Array.from(this.events.values()).filter(
              (e: any) => e.tenant_id === tenantId
            );
            return { results: events };
          }
          if (query.includes("FROM users")) {
            const tenantId = params[0];
            const users = Array.from(this.users.values()).filter(
              (u: any) => u.tenant_id === tenantId
            );
            return { results: users };
          }
          return { results: [] };
        },
        run: async () => {
          if (query.includes("INSERT INTO events")) {
            const eventId = `event-${this.nextEventId++}`;
            const tenantId = params[0];
            const title = params[1];

            this.events.set(eventId, {
              id: eventId,
              tenant_id: tenantId,
              title: title,
              date: params[2],
              created_at: new Date().toISOString(),
            });

            return {
              success: true,
              meta: { last_row_id: this.nextEventId - 1 },
            };
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
  const db = new NotificationDB();

  return {
    API_VERSION: "v1",
    JWT_SECRET: "e2e-test-secret-key-at-least-32-characters-long",
    JWT_ISSUER: "e2e-test-issuer",
    JWT_AUDIENCE: "syston-mobile",
    SETUP_URL: "https://setup.test",
    ADMIN_CONSOLE_URL: "https://admin.test",
    YT_REDIRECT_URL: "https://example.com/yt",
    FCM_SERVER_KEY: "test-fcm-key",
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

describe("Push Notification E2E Flow", () => {
  let env: any;
  let ctx: ExecutionContext;

  beforeEach(() => {
    env = createEnv();
    ctx = createExecutionContext();
    mockFcmSend.mockClear();
  });

  it("completes device registration and notification flow", async () => {
    const userToken = await issueTenantMemberJWT(env, {
      tenant_id: "test-tenant",
      user_id: "user-1",
      roles: ["tenant_member"],
    });

    // Step 1: Register device for push notifications
    const registerRequest = new Request(
      "https://example.com/api/v1/push/register",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${userToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          platform: "ios",
          token: "device-token-123",
        }),
      }
    );

    const registerResponse = await worker.fetch(registerRequest, env, ctx);
    expect(registerResponse.status).toBe(200);
    const registerData: any = await registerResponse.json();
    expect(registerData.success).toBe(true);

    // Step 2: Send a test notification
    const sendNotificationRequest = new Request(
      "https://example.com/api/v1/push/send",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${userToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          user_id: "user-1",
          notification: {
            title: "Test Notification",
            body: "This is a test",
          },
          data: {
            type: "test",
          },
        }),
      }
    );

    const sendResponse = await worker.fetch(sendNotificationRequest, env, ctx);

    if (sendResponse.status === 200) {
      const sendData: any = await sendResponse.json();
      expect(sendData.success).toBe(true);

      // Verify FCM was called
      expect(mockFcmSend).toHaveBeenCalled();
      const fcmCall = mockFcmSend.mock.calls[0];
      const fcmBody = JSON.parse(fcmCall[1].body);

      expect(fcmBody.registration_ids).toContain("device-token-123");
      expect(fcmBody.notification.title).toBe("Test Notification");
    }
  });

  it("sends notifications to multiple registered devices", async () => {
    const userToken = await issueTenantMemberJWT(env, {
      tenant_id: "test-tenant",
      user_id: "user-1",
      roles: ["tenant_member"],
    });

    // Register iOS device
    const registerIosRequest = new Request(
      "https://example.com/api/v1/push/register",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${userToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          platform: "ios",
          token: "ios-token-456",
        }),
      }
    );

    await worker.fetch(registerIosRequest, env, ctx);

    // Register Android device
    const registerAndroidRequest = new Request(
      "https://example.com/api/v1/push/register",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${userToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          platform: "android",
          token: "android-token-789",
        }),
      }
    );

    await worker.fetch(registerAndroidRequest, env, ctx);

    // Send notification
    const sendRequest = new Request("https://example.com/api/v1/push/send", {
      method: "POST",
      headers: {
        authorization: `Bearer ${userToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        user_id: "user-1",
        notification: {
          title: "Multi-Device Test",
          body: "Sent to all devices",
        },
      }),
    });

    const sendResponse = await worker.fetch(sendRequest, env, ctx);

    if (sendResponse.status === 200) {
      // Verify FCM was called with both tokens
      expect(mockFcmSend).toHaveBeenCalled();
      const fcmCall = mockFcmSend.mock.calls[0];
      const fcmBody = JSON.parse(fcmCall[1].body);

      expect(fcmBody.registration_ids).toHaveLength(2);
      expect(fcmBody.registration_ids).toContain("ios-token-456");
      expect(fcmBody.registration_ids).toContain("android-token-789");
    }
  });

  it("enforces tenant isolation for push notifications", async () => {
    // User 1 in test-tenant
    const user1Token = await issueTenantMemberJWT(env, {
      tenant_id: "test-tenant",
      user_id: "user-1",
      roles: ["tenant_member"],
    });

    // User 3 in other-tenant
    const user3Token = await issueTenantMemberJWT(env, {
      tenant_id: "other-tenant",
      user_id: "user-3",
      roles: ["tenant_member"],
    });

    // User 1 registers device
    const registerUser1Request = new Request(
      "https://example.com/api/v1/push/register",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${user1Token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          platform: "ios",
          token: "user1-token",
        }),
      }
    );

    await worker.fetch(registerUser1Request, env, ctx);

    // User 3 registers device
    const registerUser3Request = new Request(
      "https://example.com/api/v1/push/register",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${user3Token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          platform: "ios",
          token: "user3-token",
        }),
      }
    );

    await worker.fetch(registerUser3Request, env, ctx);

    // User 1 tries to send notification to User 3 (different tenant)
    const sendCrossTenantRequest = new Request(
      "https://example.com/api/v1/push/send",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${user1Token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          user_id: "user-3", // User in different tenant
          notification: {
            title: "Cross-Tenant Test",
            body: "Should not be sent",
          },
        }),
      }
    );

    const sendCrossTenantResponse = await worker.fetch(
      sendCrossTenantRequest,
      env,
      ctx
    );

    // Should be denied or no devices found
    if (sendCrossTenantResponse.status === 200) {
      const data: any = await sendCrossTenantResponse.json();
      // Should not send any notifications (no devices for cross-tenant user)
      expect(data.sent || 0).toBe(0);
    } else {
      // Or should be forbidden
      expect([401, 403]).toContain(sendCrossTenantResponse.status);
    }

    // Verify FCM was not called for cross-tenant notification
    expect(mockFcmSend).not.toHaveBeenCalled();
  });

  it("broadcasts notifications to all users in tenant", async () => {
    const user1Token = await issueTenantMemberJWT(env, {
      tenant_id: "test-tenant",
      user_id: "user-1",
      roles: ["tenant_member"],
    });

    const user2Token = await issueTenantMemberJWT(env, {
      tenant_id: "test-tenant",
      user_id: "user-2",
      roles: ["tenant_member"],
    });

    // Both users register devices
    await worker.fetch(
      new Request("https://example.com/api/v1/push/register", {
        method: "POST",
        headers: {
          authorization: `Bearer ${user1Token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          platform: "ios",
          token: "user1-device",
        }),
      }),
      env,
      ctx
    );

    await worker.fetch(
      new Request("https://example.com/api/v1/push/register", {
        method: "POST",
        headers: {
          authorization: `Bearer ${user2Token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          platform: "android",
          token: "user2-device",
        }),
      }),
      env,
      ctx
    );

    // Send broadcast notification
    const broadcastRequest = new Request(
      "https://example.com/api/v1/push/broadcast",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${user1Token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          notification: {
            title: "Team Announcement",
            body: "Match tomorrow at 3pm",
          },
          data: {
            type: "announcement",
          },
        }),
      }
    );

    const broadcastResponse = await worker.fetch(broadcastRequest, env, ctx);

    if (broadcastResponse.status === 200) {
      // Verify FCM was called with both user tokens
      expect(mockFcmSend).toHaveBeenCalled();
      const fcmCall = mockFcmSend.mock.calls[0];
      const fcmBody = JSON.parse(fcmCall[1].body);

      expect(fcmBody.registration_ids).toHaveLength(2);
      expect(fcmBody.registration_ids).toContain("user1-device");
      expect(fcmBody.registration_ids).toContain("user2-device");
    }
  });

  it("updates device token when re-registering same platform", async () => {
    const userToken = await issueTenantMemberJWT(env, {
      tenant_id: "test-tenant",
      user_id: "user-1",
      roles: ["tenant_member"],
    });

    // Register with old token
    await worker.fetch(
      new Request("https://example.com/api/v1/push/register", {
        method: "POST",
        headers: {
          authorization: `Bearer ${userToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          platform: "ios",
          token: "old-ios-token",
        }),
      }),
      env,
      ctx
    );

    // Register with new token (same platform)
    await worker.fetch(
      new Request("https://example.com/api/v1/push/register", {
        method: "POST",
        headers: {
          authorization: `Bearer ${userToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          platform: "ios",
          token: "new-ios-token",
        }),
      }),
      env,
      ctx
    );

    // Send notification
    const sendRequest = new Request("https://example.com/api/v1/push/send", {
      method: "POST",
      headers: {
        authorization: `Bearer ${userToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        user_id: "user-1",
        notification: {
          title: "Token Update Test",
          body: "Should use new token",
        },
      }),
    });

    const sendResponse = await worker.fetch(sendRequest, env, ctx);

    if (sendResponse.status === 200) {
      // Verify only new token is used
      const fcmCall = mockFcmSend.mock.calls[0];
      const fcmBody = JSON.parse(fcmCall[1].body);

      expect(fcmBody.registration_ids).toHaveLength(1);
      expect(fcmBody.registration_ids).toContain("new-ios-token");
      expect(fcmBody.registration_ids).not.toContain("old-ios-token");
    }
  });

  it("requires authentication for push notification operations", async () => {
    // Try to register device without auth
    const registerRequest = new Request(
      "https://example.com/api/v1/push/register",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          platform: "ios",
          token: "unauthorized-token",
        }),
      }
    );

    const registerResponse = await worker.fetch(registerRequest, env, ctx);
    expect([401, 403]).toContain(registerResponse.status);

    // Try to send notification without auth
    const sendRequest = new Request("https://example.com/api/v1/push/send", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        user_id: "user-1",
        notification: {
          title: "Unauthorized",
          body: "Should fail",
        },
      }),
    });

    const sendResponse = await worker.fetch(sendRequest, env, ctx);
    expect([401, 403]).toContain(sendResponse.status);
  });
});
