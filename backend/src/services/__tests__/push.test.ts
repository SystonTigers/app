import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  sendFcm,
  registerDevice,
  getUserTokens,
  sendToUser,
  sendToMany,
} from "../push";

describe("Push Notification Service", () => {
  let mockEnv: any;
  let mockKV: Map<string, string>;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    // Create a simple in-memory KV store mock
    mockKV = new Map();
    mockEnv = {
      FCM_SERVER_KEY: "test-fcm-server-key",
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

    // Save original fetch
    originalFetch = global.fetch;

    // Mock successful FCM response by default
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: 1, failure: 0 }),
      text: async () => "OK",
    });
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("sendFcm", () => {
    it("sends notification to FCM with correct headers", async () => {
      const tokens = ["token1", "token2"];
      const payload = {
        notification: {
          title: "Test",
          body: "Test message",
        },
      };

      await sendFcm(mockEnv, tokens, payload);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://fcm.googleapis.com/fcm/send",
        expect.objectContaining({
          method: "POST",
          headers: {
            "content-type": "application/json",
            "authorization": "key=test-fcm-server-key",
          },
        })
      );
    });

    it("sends correct payload to FCM", async () => {
      const tokens = ["token1"];
      const payload = {
        notification: {
          title: "Test Title",
          body: "Test Body",
        },
        data: {
          customKey: "customValue",
        },
      };

      await sendFcm(mockEnv, tokens, payload);

      const callArgs = (global.fetch as any).mock.calls[0][1];
      const sentBody = JSON.parse(callArgs.body);

      expect(sentBody).toEqual({
        registration_ids: ["token1"],
        notification: {
          title: "Test Title",
          body: "Test Body",
        },
        data: {
          customKey: "customValue",
        },
      });
    });

    it("sends only notification when no data provided", async () => {
      const tokens = ["token1"];
      const payload = {
        notification: {
          title: "Test",
          body: "Message",
        },
      };

      await sendFcm(mockEnv, tokens, payload);

      const callArgs = (global.fetch as any).mock.calls[0][1];
      const sentBody = JSON.parse(callArgs.body);

      expect(sentBody.notification).toBeDefined();
      expect(sentBody.data).toBeUndefined();
    });

    it("sends only data when no notification provided", async () => {
      const tokens = ["token1"];
      const payload = {
        data: {
          key: "value",
        },
      };

      await sendFcm(mockEnv, tokens, payload);

      const callArgs = (global.fetch as any).mock.calls[0][1];
      const sentBody = JSON.parse(callArgs.body);

      expect(sentBody.data).toBeDefined();
      expect(sentBody.notification).toBeUndefined();
    });

    it("throws error when FCM_SERVER_KEY is missing", async () => {
      const envWithoutKey = { ...mockEnv, FCM_SERVER_KEY: undefined };

      await expect(
        sendFcm(envWithoutKey, ["token1"], { notification: {} })
      ).rejects.toThrow("FCM_SERVER_KEY missing");
    });

    it("throws error when FCM returns error", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      });

      await expect(
        sendFcm(mockEnv, ["token1"], { notification: {} })
      ).rejects.toThrow("FCM error 401: Unauthorized");
    });

    it("returns FCM response on success", async () => {
      const mockResponse = {
        success: 2,
        failure: 0,
        results: [{ message_id: "123" }, { message_id: "456" }],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await sendFcm(mockEnv, ["token1", "token2"], {
        notification: {},
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe("registerDevice", () => {
    it("registers a new device token", async () => {
      await registerDevice(
        mockEnv,
        "tenant-123",
        "user-1",
        "ios",
        "device-token-1"
      );

      const tokens = await getUserTokens(mockEnv, "tenant-123", "user-1");
      expect(tokens).toContain("device-token-1");
    });

    it("registers multiple devices for same user", async () => {
      await registerDevice(
        mockEnv,
        "tenant-123",
        "user-1",
        "ios",
        "ios-token"
      );
      await registerDevice(
        mockEnv,
        "tenant-123",
        "user-1",
        "android",
        "android-token"
      );

      const tokens = await getUserTokens(mockEnv, "tenant-123", "user-1");
      expect(tokens).toHaveLength(2);
      expect(tokens).toContain("ios-token");
      expect(tokens).toContain("android-token");
    });

    it("updates token when re-registering same platform", async () => {
      await registerDevice(
        mockEnv,
        "tenant-123",
        "user-1",
        "ios",
        "old-token"
      );
      await registerDevice(
        mockEnv,
        "tenant-123",
        "user-1",
        "ios",
        "new-token"
      );

      const tokens = await getUserTokens(mockEnv, "tenant-123", "user-1");
      expect(tokens).toHaveLength(1);
      expect(tokens).toContain("new-token");
      expect(tokens).not.toContain("old-token");
    });

    it("maintains tokens for different platforms when updating", async () => {
      await registerDevice(
        mockEnv,
        "tenant-123",
        "user-1",
        "ios",
        "ios-token"
      );
      await registerDevice(
        mockEnv,
        "tenant-123",
        "user-1",
        "android",
        "android-token-1"
      );
      await registerDevice(
        mockEnv,
        "tenant-123",
        "user-1",
        "android",
        "android-token-2"
      );

      const tokens = await getUserTokens(mockEnv, "tenant-123", "user-1");
      expect(tokens).toHaveLength(2);
      expect(tokens).toContain("ios-token");
      expect(tokens).toContain("android-token-2");
      expect(tokens).not.toContain("android-token-1");
    });

    it("enforces tenant isolation", async () => {
      await registerDevice(
        mockEnv,
        "tenant-123",
        "user-1",
        "ios",
        "token-123"
      );

      // Try to get tokens from different tenant
      const tokens = await getUserTokens(mockEnv, "tenant-456", "user-1");
      expect(tokens).toHaveLength(0);
    });
  });

  describe("getUserTokens", () => {
    it("returns empty array for user with no devices", async () => {
      const tokens = await getUserTokens(mockEnv, "tenant-123", "user-1");
      expect(tokens).toEqual([]);
    });

    it("returns all registered tokens for a user", async () => {
      await registerDevice(
        mockEnv,
        "tenant-123",
        "user-1",
        "ios",
        "ios-token"
      );
      await registerDevice(
        mockEnv,
        "tenant-123",
        "user-1",
        "android",
        "android-token"
      );
      await registerDevice(
        mockEnv,
        "tenant-123",
        "user-1",
        "web",
        "web-token"
      );

      const tokens = await getUserTokens(mockEnv, "tenant-123", "user-1");
      expect(tokens).toHaveLength(3);
      expect(tokens).toContain("ios-token");
      expect(tokens).toContain("android-token");
      expect(tokens).toContain("web-token");
    });

    it("returns only current tokens after updates", async () => {
      await registerDevice(
        mockEnv,
        "tenant-123",
        "user-1",
        "ios",
        "old-token"
      );
      await registerDevice(
        mockEnv,
        "tenant-123",
        "user-1",
        "ios",
        "new-token"
      );

      const tokens = await getUserTokens(mockEnv, "tenant-123", "user-1");
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toBe("new-token");
    });
  });

  describe("sendToUser", () => {
    it("sends notification to all user devices", async () => {
      await registerDevice(
        mockEnv,
        "tenant-123",
        "user-1",
        "ios",
        "ios-token"
      );
      await registerDevice(
        mockEnv,
        "tenant-123",
        "user-1",
        "android",
        "android-token"
      );

      const payload = {
        notification: {
          title: "Test",
          body: "Message",
        },
      };

      await sendToUser(mockEnv, "tenant-123", "user-1", payload);

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as any).mock.calls[0][1];
      const sentBody = JSON.parse(callArgs.body);

      expect(sentBody.registration_ids).toHaveLength(2);
      expect(sentBody.registration_ids).toContain("ios-token");
      expect(sentBody.registration_ids).toContain("android-token");
    });

    it("returns sent:0 when user has no devices", async () => {
      const payload = {
        notification: {
          title: "Test",
          body: "Message",
        },
      };

      const result = await sendToUser(
        mockEnv,
        "tenant-123",
        "user-without-devices",
        payload
      );

      expect(result).toEqual({ sent: 0 });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("sends correct payload to FCM", async () => {
      await registerDevice(
        mockEnv,
        "tenant-123",
        "user-1",
        "ios",
        "token-1"
      );

      const payload = {
        notification: {
          title: "Important",
          body: "Check this out",
        },
        data: {
          type: "event",
          id: "123",
        },
      };

      await sendToUser(mockEnv, "tenant-123", "user-1", payload);

      const callArgs = (global.fetch as any).mock.calls[0][1];
      const sentBody = JSON.parse(callArgs.body);

      expect(sentBody.notification).toEqual(payload.notification);
      expect(sentBody.data).toEqual(payload.data);
    });

    it("enforces tenant isolation", async () => {
      await registerDevice(
        mockEnv,
        "tenant-123",
        "user-1",
        "ios",
        "token-123"
      );

      const payload = { notification: { title: "Test" } };

      // Try to send from different tenant
      const result = await sendToUser(
        mockEnv,
        "tenant-456",
        "user-1",
        payload
      );

      expect(result).toEqual({ sent: 0 });
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("sendToMany", () => {
    it("sends notification to multiple users", async () => {
      await registerDevice(
        mockEnv,
        "tenant-123",
        "user-1",
        "ios",
        "user1-token"
      );
      await registerDevice(
        mockEnv,
        "tenant-123",
        "user-2",
        "android",
        "user2-token"
      );

      const payload = {
        notification: {
          title: "Team Update",
          body: "New announcement",
        },
      };

      await sendToMany(mockEnv, "tenant-123", ["user-1", "user-2"], payload);

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as any).mock.calls[0][1];
      const sentBody = JSON.parse(callArgs.body);

      expect(sentBody.registration_ids).toHaveLength(2);
      expect(sentBody.registration_ids).toContain("user1-token");
      expect(sentBody.registration_ids).toContain("user2-token");
    });

    it("aggregates all tokens from all users", async () => {
      // User 1 has 2 devices
      await registerDevice(
        mockEnv,
        "tenant-123",
        "user-1",
        "ios",
        "user1-ios"
      );
      await registerDevice(
        mockEnv,
        "tenant-123",
        "user-1",
        "android",
        "user1-android"
      );

      // User 2 has 1 device
      await registerDevice(
        mockEnv,
        "tenant-123",
        "user-2",
        "ios",
        "user2-ios"
      );

      const payload = { notification: { title: "Test" } };

      await sendToMany(mockEnv, "tenant-123", ["user-1", "user-2"], payload);

      const callArgs = (global.fetch as any).mock.calls[0][1];
      const sentBody = JSON.parse(callArgs.body);

      expect(sentBody.registration_ids).toHaveLength(3);
      expect(sentBody.registration_ids).toContain("user1-ios");
      expect(sentBody.registration_ids).toContain("user1-android");
      expect(sentBody.registration_ids).toContain("user2-ios");
    });

    it("returns sent:0 when no users have devices", async () => {
      const payload = { notification: { title: "Test" } };

      const result = await sendToMany(
        mockEnv,
        "tenant-123",
        ["user-1", "user-2"],
        payload
      );

      expect(result).toEqual({ sent: 0 });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("sends to available users even if some have no devices", async () => {
      await registerDevice(
        mockEnv,
        "tenant-123",
        "user-1",
        "ios",
        "user1-token"
      );
      // user-2 has no devices

      const payload = { notification: { title: "Test" } };

      await sendToMany(mockEnv, "tenant-123", ["user-1", "user-2"], payload);

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as any).mock.calls[0][1];
      const sentBody = JSON.parse(callArgs.body);

      expect(sentBody.registration_ids).toHaveLength(1);
      expect(sentBody.registration_ids).toContain("user1-token");
    });

    it("handles empty user list", async () => {
      const payload = { notification: { title: "Test" } };

      const result = await sendToMany(mockEnv, "tenant-123", [], payload);

      expect(result).toEqual({ sent: 0 });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("enforces tenant isolation", async () => {
      await registerDevice(
        mockEnv,
        "tenant-123",
        "user-1",
        "ios",
        "token-123"
      );
      await registerDevice(
        mockEnv,
        "tenant-456",
        "user-2",
        "ios",
        "token-456"
      );

      const payload = { notification: { title: "Test" } };

      // Send only to tenant-123 users
      await sendToMany(mockEnv, "tenant-123", ["user-1", "user-2"], payload);

      const callArgs = (global.fetch as any).mock.calls[0][1];
      const sentBody = JSON.parse(callArgs.body);

      // Should only get token from user-1 in tenant-123
      expect(sentBody.registration_ids).toHaveLength(1);
      expect(sentBody.registration_ids).toContain("token-123");
      expect(sentBody.registration_ids).not.toContain("token-456");
    });
  });
});
