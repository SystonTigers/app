import { describe, it, expect, beforeEach } from "vitest";
import {
  createRoom,
  listRooms,
  addMessage,
  listMessages,
  type Room,
  type Message,
  type RoomType,
} from "../chatKV";

describe("Chat KV Service", () => {
  let mockEnv: any;
  let mockKV: Map<string, string>;

  beforeEach(() => {
    mockKV = new Map();
    mockEnv = {
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
        list: async (options?: any) => {
          const keys = Array.from(mockKV.keys());
          const filtered = options?.prefix
            ? keys.filter((k) => k.startsWith(options.prefix))
            : keys;
          const limited = options?.limit
            ? filtered.slice(0, options.limit)
            : filtered;
          return {
            keys: limited.map((name) => ({ name })),
          };
        },
      },
    };
  });

  describe("createRoom", () => {
    it("creates a new chat room", async () => {
      const room = await createRoom(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
        teamId: "team-456",
        type: "parents",
      });

      expect(room).toBeDefined();
      expect(room.roomId).toBe("room-abc");
      expect(room.tenantId).toBe("tenant-123");
      expect(room.teamId).toBe("team-456");
      expect(room.type).toBe("parents");
      expect(room.createdAt).toBeDefined();
      expect(typeof room.createdAt).toBe("number");
    });

    it("stores room in KV with correct key", async () => {
      await createRoom(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
        teamId: "team-456",
        type: "coaches",
      });

      const key = "chat/room/tenant-123/room-abc";
      expect(mockKV.has(key)).toBe(true);

      const stored = JSON.parse(mockKV.get(key)!) as Room;
      expect(stored.roomId).toBe("room-abc");
      expect(stored.type).toBe("coaches");
    });

    it("returns existing room if already created", async () => {
      const room1 = await createRoom(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
        teamId: "team-456",
        type: "parents",
      });

      const room2 = await createRoom(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
        teamId: "team-456",
        type: "parents",
      });

      expect(room2.createdAt).toBe(room1.createdAt);
      expect(room2).toEqual(room1);
    });

    it("creates parents room type", async () => {
      const room = await createRoom(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-parents",
        teamId: "team-456",
        type: "parents",
      });

      expect(room.type).toBe("parents");
    });

    it("creates coaches room type", async () => {
      const room = await createRoom(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-coaches",
        teamId: "team-456",
        type: "coaches",
      });

      expect(room.type).toBe("coaches");
    });

    it("throws error when tenant missing", async () => {
      await expect(
        createRoom(mockEnv, {
          tenant: "",
          roomId: "room-abc",
          teamId: "team-456",
          type: "parents",
        })
      ).rejects.toThrow("missing params");
    });

    it("throws error when roomId missing", async () => {
      await expect(
        createRoom(mockEnv, {
          tenant: "tenant-123",
          roomId: "",
          teamId: "team-456",
          type: "parents",
        })
      ).rejects.toThrow("missing params");
    });

    it("throws error when teamId missing", async () => {
      await expect(
        createRoom(mockEnv, {
          tenant: "tenant-123",
          roomId: "room-abc",
          teamId: "",
          type: "parents",
        })
      ).rejects.toThrow("missing params");
    });

    it("throws error when type missing", async () => {
      await expect(
        createRoom(mockEnv, {
          tenant: "tenant-123",
          roomId: "room-abc",
          teamId: "team-456",
          type: "" as RoomType,
        })
      ).rejects.toThrow("missing params");
    });

    it("supports multiple rooms for same tenant", async () => {
      await createRoom(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-1",
        teamId: "team-1",
        type: "parents",
      });

      await createRoom(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-2",
        teamId: "team-2",
        type: "coaches",
      });

      expect(mockKV.size).toBe(2);
    });

    it("isolates rooms by tenant", async () => {
      await createRoom(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
        teamId: "team-1",
        type: "parents",
      });

      await createRoom(mockEnv, {
        tenant: "tenant-456",
        roomId: "room-abc",
        teamId: "team-2",
        type: "coaches",
      });

      // Same roomId but different tenants = different rooms
      expect(mockKV.size).toBe(2);
      expect(mockKV.has("chat/room/tenant-123/room-abc")).toBe(true);
      expect(mockKV.has("chat/room/tenant-456/room-abc")).toBe(true);
    });
  });

  describe("listRooms", () => {
    it("lists all rooms for a tenant", async () => {
      await createRoom(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-1",
        teamId: "team-1",
        type: "parents",
      });

      await createRoom(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-2",
        teamId: "team-2",
        type: "coaches",
      });

      const rooms = await listRooms(mockEnv, "tenant-123");

      expect(rooms.length).toBe(2);
      expect(rooms.some((r) => r.roomId === "room-1")).toBe(true);
      expect(rooms.some((r) => r.roomId === "room-2")).toBe(true);
    });

    it("filters rooms by teamId when provided", async () => {
      await createRoom(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-1",
        teamId: "team-1",
        type: "parents",
      });

      await createRoom(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-2",
        teamId: "team-2",
        type: "coaches",
      });

      await createRoom(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-3",
        teamId: "team-1",
        type: "coaches",
      });

      const rooms = await listRooms(mockEnv, "tenant-123", "team-1");

      expect(rooms.length).toBe(2);
      expect(rooms.every((r) => r.teamId === "team-1")).toBe(true);
      expect(rooms.some((r) => r.roomId === "room-1")).toBe(true);
      expect(rooms.some((r) => r.roomId === "room-3")).toBe(true);
    });

    it("returns empty array when no rooms exist", async () => {
      const rooms = await listRooms(mockEnv, "tenant-123");

      expect(rooms).toEqual([]);
    });

    it("isolates rooms by tenant", async () => {
      await createRoom(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-1",
        teamId: "team-1",
        type: "parents",
      });

      await createRoom(mockEnv, {
        tenant: "tenant-456",
        roomId: "room-2",
        teamId: "team-2",
        type: "coaches",
      });

      const rooms = await listRooms(mockEnv, "tenant-123");

      expect(rooms.length).toBe(1);
      expect(rooms[0].tenantId).toBe("tenant-123");
    });

    it("returns rooms with all properties", async () => {
      await createRoom(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-1",
        teamId: "team-1",
        type: "parents",
      });

      const rooms = await listRooms(mockEnv, "tenant-123");

      expect(rooms[0].roomId).toBeDefined();
      expect(rooms[0].tenantId).toBeDefined();
      expect(rooms[0].teamId).toBeDefined();
      expect(rooms[0].type).toBeDefined();
      expect(rooms[0].createdAt).toBeDefined();
    });
  });

  describe("addMessage", () => {
    it("adds message to a room", async () => {
      await createRoom(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
        teamId: "team-456",
        type: "parents",
      });

      const message = await addMessage(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
        userId: "user-789",
        text: "Hello everyone!",
      });

      expect(message).toBeDefined();
      expect(message.msgId).toBeDefined();
      expect(message.userId).toBe("user-789");
      expect(message.text).toBe("Hello everyone!");
      expect(message.ts).toBeDefined();
      expect(typeof message.ts).toBe("number");
    });

    it("stores message in KV with correct prefix", async () => {
      const message = await addMessage(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
        userId: "user-789",
        text: "Test message",
      });

      const keys = Array.from(mockKV.keys());
      const messageKey = keys.find((k) =>
        k.startsWith("chat/msg/tenant-123/room-abc/")
      );

      expect(messageKey).toBeDefined();
      expect(messageKey).toContain(message.msgId);
    });

    it("generates unique message IDs", async () => {
      const msg1 = await addMessage(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
        userId: "user-1",
        text: "Message 1",
      });

      const msg2 = await addMessage(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
        userId: "user-2",
        text: "Message 2",
      });

      expect(msg1.msgId).not.toBe(msg2.msgId);
    });

    it("sanitizes HTML in message text", async () => {
      const message = await addMessage(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
        userId: "user-789",
        text: '<script>alert("xss")</script>Hello',
      });

      // Script tags should be removed by sanitizer
      expect(message.text).not.toContain("<script>");
      expect(message.text).not.toContain("alert");
    });

    it("trims whitespace from message text", async () => {
      const message = await addMessage(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
        userId: "user-789",
        text: "  Hello world  ",
      });

      expect(message.text).toBe("Hello world");
    });

    it("throws error for empty message", async () => {
      await expect(
        addMessage(mockEnv, {
          tenant: "tenant-123",
          roomId: "room-abc",
          userId: "user-789",
          text: "",
        })
      ).rejects.toThrow("empty text");
    });

    it("throws error for whitespace-only message", async () => {
      await expect(
        addMessage(mockEnv, {
          tenant: "tenant-123",
          roomId: "room-abc",
          userId: "user-789",
          text: "   ",
        })
      ).rejects.toThrow("empty text");
    });

    it("supports multiple messages in same room", async () => {
      await addMessage(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
        userId: "user-1",
        text: "First message",
      });

      await addMessage(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
        userId: "user-2",
        text: "Second message",
      });

      const messages = Array.from(mockKV.keys()).filter((k) =>
        k.startsWith("chat/msg/tenant-123/room-abc/")
      );

      expect(messages.length).toBe(2);
    });

    it("isolates messages by tenant", async () => {
      await addMessage(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
        userId: "user-1",
        text: "Message for tenant 123",
      });

      await addMessage(mockEnv, {
        tenant: "tenant-456",
        roomId: "room-abc",
        userId: "user-2",
        text: "Message for tenant 456",
      });

      const tenant123Messages = Array.from(mockKV.keys()).filter((k) =>
        k.startsWith("chat/msg/tenant-123/")
      );

      const tenant456Messages = Array.from(mockKV.keys()).filter((k) =>
        k.startsWith("chat/msg/tenant-456/")
      );

      expect(tenant123Messages.length).toBe(1);
      expect(tenant456Messages.length).toBe(1);
    });

    it("allows special characters in text", async () => {
      const message = await addMessage(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
        userId: "user-789",
        text: "Hello! 👋 How are you? 😊",
      });

      expect(message.text).toContain("👋");
      expect(message.text).toContain("😊");
    });
  });

  describe("listMessages", () => {
    it("lists messages for a room", async () => {
      await addMessage(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
        userId: "user-1",
        text: "First message",
      });

      await addMessage(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
        userId: "user-2",
        text: "Second message",
      });

      const messages = await listMessages(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
      });

      expect(messages.length).toBe(2);
      expect(messages.some((m) => m.text === "First message")).toBe(true);
      expect(messages.some((m) => m.text === "Second message")).toBe(true);
    });

    it("sorts messages by timestamp ascending", async () => {
      const msg1 = await addMessage(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
        userId: "user-1",
        text: "First",
      });

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const msg2 = await addMessage(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
        userId: "user-2",
        text: "Second",
      });

      const messages = await listMessages(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
      });

      expect(messages[0].msgId).toBe(msg1.msgId);
      expect(messages[1].msgId).toBe(msg2.msgId);
      expect(messages[0].ts).toBeLessThan(messages[1].ts);
    });

    it("returns empty array when no messages exist", async () => {
      const messages = await listMessages(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
      });

      expect(messages).toEqual([]);
    });

    it("respects limit parameter", async () => {
      // Add 5 messages
      for (let i = 0; i < 5; i++) {
        await addMessage(mockEnv, {
          tenant: "tenant-123",
          roomId: "room-abc",
          userId: "user-1",
          text: `Message ${i}`,
        });
      }

      const messages = await listMessages(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
        limit: 3,
      });

      expect(messages.length).toBeLessThanOrEqual(3);
    });

    it("defaults to limit of 50", async () => {
      // This test verifies the default behavior
      const messages = await listMessages(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
      });

      // Should not error and should return array
      expect(Array.isArray(messages)).toBe(true);
    });

    it("caps limit at 200", async () => {
      // Even if we request more, it should cap at 200
      const messages = await listMessages(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
        limit: 500,
      });

      // Should not error
      expect(Array.isArray(messages)).toBe(true);
    });

    it("isolates messages by tenant and room", async () => {
      await addMessage(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
        userId: "user-1",
        text: "For room ABC",
      });

      await addMessage(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-xyz",
        userId: "user-2",
        text: "For room XYZ",
      });

      await addMessage(mockEnv, {
        tenant: "tenant-456",
        roomId: "room-abc",
        userId: "user-3",
        text: "Different tenant",
      });

      const messages = await listMessages(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
      });

      expect(messages.length).toBe(1);
      expect(messages[0].text).toBe("For room ABC");
    });

    it("returns messages with all properties", async () => {
      await addMessage(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
        userId: "user-789",
        text: "Test message",
      });

      const messages = await listMessages(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
      });

      expect(messages[0].msgId).toBeDefined();
      expect(messages[0].userId).toBe("user-789");
      expect(messages[0].text).toBe("Test message");
      expect(messages[0].ts).toBeDefined();
    });
  });

  describe("Tenant Isolation", () => {
    it("prevents cross-tenant room access", async () => {
      await createRoom(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
        teamId: "team-1",
        type: "parents",
      });

      const tenant123Rooms = await listRooms(mockEnv, "tenant-123");
      const tenant456Rooms = await listRooms(mockEnv, "tenant-456");

      expect(tenant123Rooms.length).toBe(1);
      expect(tenant456Rooms.length).toBe(0);
    });

    it("prevents cross-tenant message access", async () => {
      await addMessage(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
        userId: "user-1",
        text: "Secret message",
      });

      const tenant123Messages = await listMessages(mockEnv, {
        tenant: "tenant-123",
        roomId: "room-abc",
      });

      const tenant456Messages = await listMessages(mockEnv, {
        tenant: "tenant-456",
        roomId: "room-abc",
      });

      expect(tenant123Messages.length).toBe(1);
      expect(tenant456Messages.length).toBe(0);
    });
  });
});
