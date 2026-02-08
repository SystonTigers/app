import { describe, it, expect, beforeEach } from "vitest";
import { createInvite, getInvite, consumeInvite, type Invite } from "../invites";

/**
 * Invites Service Tests
 *
 * Tests invitation system including creation, retrieval, and consumption.
 */
describe("Invites Service", () => {
  let mockEnv: any;
  let mockKV: Map<string, string>;

  beforeEach(() => {
    // Create fresh mock environment for each test
    mockKV = new Map();

    mockEnv = {
      KV_IDEMP: {
        get: async (key: string, type?: string) => {
          const value = mockKV.get(key);
          if (!value) {return null;}
          if (type === "json") {
            try {
              return JSON.parse(value);
            } catch {
              return null;
            }
          }
          return value;
        },
        put: async (key: string, value: string) => {
          mockKV.set(key, value);
        },
      },
      SETUP_URL: "https://setup.example.com",
    };
  });

  describe("createInvite()", () => {
    it("successfully creates an invite with club_admin role", async () => {
      const result = await createInvite(mockEnv, {
        tenant: "syston",
        role: "club_admin",
        createdBy: "admin-user-123",
      });

      expect(result.ok).toBe(true);
      expect(result.token).toBeTruthy();
      expect(result.token).toHaveLength(24); // nanoid(24)
      expect(result.inviteUrl).toContain("https://setup.example.com/join?token=");
      expect(result.invite.tenantId).toBe("syston");
      expect(result.invite.role).toBe("club_admin");
      expect(result.invite.createdBy).toBe("admin-user-123");
      expect(result.invite.used).toBe(0);
      expect(result.invite.maxUses).toBe(50); // default
    });

    it("creates invite with team_manager role (normalized)", async () => {
      const result = await createInvite(mockEnv, {
        tenant: "syston",
        teamId: "u15",
        role: "team_manager",
        createdBy: "admin-user-123",
      });

      expect(result.ok).toBe(true);
      expect(result.invite.role).toBe("team_manager:u15");
      expect(result.invite.teamId).toBe("u15");
    });

    it("creates invite with coach role (normalized)", async () => {
      const result = await createInvite(mockEnv, {
        tenant: "syston",
        teamId: "u16",
        role: "coach",
        createdBy: "admin-user-123",
      });

      expect(result.ok).toBe(true);
      expect(result.invite.role).toBe("coach:u16");
      expect(result.invite.teamId).toBe("u16");
    });

    it("creates invite with parent role", async () => {
      const result = await createInvite(mockEnv, {
        tenant: "syston",
        role: "parent",
        createdBy: "admin-user-123",
      });

      expect(result.ok).toBe(true);
      expect(result.invite.role).toBe("parent");
    });

    it("creates invite with player role", async () => {
      const result = await createInvite(mockEnv, {
        tenant: "syston",
        role: "player",
        createdBy: "admin-user-123",
      });

      expect(result.ok).toBe(true);
      expect(result.invite.role).toBe("player");
    });

    it("creates invite with volunteer role", async () => {
      const result = await createInvite(mockEnv, {
        tenant: "syston",
        role: "volunteer",
        createdBy: "admin-user-123",
      });

      expect(result.ok).toBe(true);
      expect(result.invite.role).toBe("volunteer");
    });

    it("defaults maxUses to 50 if not provided", async () => {
      const result = await createInvite(mockEnv, {
        tenant: "syston",
        role: "club_admin",
        createdBy: "admin-user-123",
      });

      expect(result.invite.maxUses).toBe(50);
    });

    it("accepts custom maxUses", async () => {
      const result = await createInvite(mockEnv, {
        tenant: "syston",
        role: "club_admin",
        maxUses: 10,
        createdBy: "admin-user-123",
      });

      expect(result.invite.maxUses).toBe(10);
    });

    it("enforces minimum maxUses of 1", async () => {
      const result = await createInvite(mockEnv, {
        tenant: "syston",
        role: "club_admin",
        maxUses: 0,
        createdBy: "admin-user-123",
      });

      expect(result.invite.maxUses).toBe(1);
    });

    it("defaults TTL to 7 days", async () => {
      const before = Date.now();
      const result = await createInvite(mockEnv, {
        tenant: "syston",
        role: "club_admin",
        createdBy: "admin-user-123",
      });
      const after = Date.now();

      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      expect(result.invite.exp).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
      expect(result.invite.exp).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
    });

    it("accepts custom TTL in minutes", async () => {
      const before = Date.now();
      const result = await createInvite(mockEnv, {
        tenant: "syston",
        role: "club_admin",
        ttl_minutes: 60, // 1 hour
        createdBy: "admin-user-123",
      });
      const after = Date.now();

      const oneHourMs = 60 * 60 * 1000;
      expect(result.invite.exp).toBeGreaterThanOrEqual(before + oneHourMs - 1000);
      expect(result.invite.exp).toBeLessThanOrEqual(after + oneHourMs + 1000);
    });

    it("sets createdAt timestamp", async () => {
      const before = Date.now();
      const result = await createInvite(mockEnv, {
        tenant: "syston",
        role: "club_admin",
        createdBy: "admin-user-123",
      });
      const after = Date.now();

      expect(result.invite.createdAt).toBeGreaterThanOrEqual(before);
      expect(result.invite.createdAt).toBeLessThanOrEqual(after);
    });

    it("stores invite in KV", async () => {
      const result = await createInvite(mockEnv, {
        tenant: "syston",
        role: "club_admin",
        createdBy: "admin-user-123",
      });

      const stored = mockKV.get(`invites/${result.token}`);
      expect(stored).toBeTruthy();
      const invite = JSON.parse(stored!);
      expect(invite.token).toBe(result.token);
    });

    it("generates proper invite URL with encoded token", async () => {
      const result = await createInvite(mockEnv, {
        tenant: "syston",
        role: "club_admin",
        createdBy: "admin-user-123",
      });

      expect(result.inviteUrl).toBe(`https://setup.example.com/join?token=${result.token}`);
    });

    it("throws error when tenant is missing", async () => {
      await expect(
        createInvite(mockEnv, {
          tenant: "",
          role: "club_admin",
          createdBy: "admin-user-123",
        })
      ).rejects.toThrow();
    });

    it("throws error when role is missing", async () => {
      await expect(
        createInvite(mockEnv, {
          tenant: "syston",
          role: "" as any,
          createdBy: "admin-user-123",
        })
      ).rejects.toThrow();
    });

    it("throws error when team_manager role missing teamId", async () => {
      await expect(
        createInvite(mockEnv, {
          tenant: "syston",
          role: "team_manager",
          createdBy: "admin-user-123",
        })
      ).rejects.toThrow();
    });

    it("throws error when coach role missing teamId", async () => {
      await expect(
        createInvite(mockEnv, {
          tenant: "syston",
          role: "coach",
          createdBy: "admin-user-123",
        })
      ).rejects.toThrow();
    });
  });

  describe("getInvite()", () => {
    it("retrieves an existing invite", async () => {
      const created = await createInvite(mockEnv, {
        tenant: "syston",
        role: "club_admin",
        createdBy: "admin-user-123",
      });

      const retrieved = await getInvite(mockEnv, created.token);

      expect(retrieved.token).toBe(created.token);
      expect(retrieved.tenantId).toBe("syston");
      expect(retrieved.role).toBe("club_admin");
    });

    it("throws error for non-existent invite", async () => {
      await expect(getInvite(mockEnv, "nonexistent-token")).rejects.toThrow("invite not found");
    });
  });

  describe("consumeInvite()", () => {
    it("successfully consumes an invite", async () => {
      const created = await createInvite(mockEnv, {
        tenant: "syston",
        role: "club_admin",
        maxUses: 5,
        createdBy: "admin-user-123",
      });

      const consumed = await consumeInvite(mockEnv, created.token);

      expect(consumed.used).toBe(1);
      expect(consumed.token).toBe(created.token);
    });

    it("increments used count on each consumption", async () => {
      const created = await createInvite(mockEnv, {
        tenant: "syston",
        role: "club_admin",
        maxUses: 5,
        createdBy: "admin-user-123",
      });

      await consumeInvite(mockEnv, created.token);
      const second = await consumeInvite(mockEnv, created.token);
      const third = await consumeInvite(mockEnv, created.token);

      expect(second.used).toBe(2);
      expect(third.used).toBe(3);
    });

    it("allows consumption up to maxUses", async () => {
      const created = await createInvite(mockEnv, {
        tenant: "syston",
        role: "club_admin",
        maxUses: 3,
        createdBy: "admin-user-123",
      });

      await consumeInvite(mockEnv, created.token);
      await consumeInvite(mockEnv, created.token);
      const third = await consumeInvite(mockEnv, created.token);

      expect(third.used).toBe(3);
      expect(third.maxUses).toBe(3);
    });

    it("throws error when invite is fully used", async () => {
      const created = await createInvite(mockEnv, {
        tenant: "syston",
        role: "club_admin",
        maxUses: 2,
        createdBy: "admin-user-123",
      });

      await consumeInvite(mockEnv, created.token);
      await consumeInvite(mockEnv, created.token);

      await expect(consumeInvite(mockEnv, created.token)).rejects.toThrow("token fully used");
    });

    it("throws error for non-existent token", async () => {
      await expect(consumeInvite(mockEnv, "nonexistent-token")).rejects.toThrow("invalid token");
    });

    it("throws error for expired invite", async () => {
      const created = await createInvite(mockEnv, {
        tenant: "syston",
        role: "club_admin",
        ttl_minutes: 1,
        createdBy: "admin-user-123",
      });

      // Manually expire the invite
      const stored = JSON.parse(mockKV.get(`invites/${created.token}`)!);
      stored.exp = Date.now() - 1000; // 1 second ago
      mockKV.set(`invites/${created.token}`, JSON.stringify(stored));

      await expect(consumeInvite(mockEnv, created.token)).rejects.toThrow("token expired");
    });
  });

  describe("Edge Cases & Integration", () => {
    it("creates multiple invites with unique tokens", async () => {
      const invite1 = await createInvite(mockEnv, {
        tenant: "syston",
        role: "club_admin",
        createdBy: "admin-user-123",
      });

      const invite2 = await createInvite(mockEnv, {
        tenant: "syston",
        role: "parent",
        createdBy: "admin-user-123",
      });

      expect(invite1.token).not.toBe(invite2.token);
    });

    it("handles different roles for same tenant", async () => {
      const admin = await createInvite(mockEnv, {
        tenant: "syston",
        role: "club_admin",
        createdBy: "admin-user-123",
      });

      const parent = await createInvite(mockEnv, {
        tenant: "syston",
        role: "parent",
        createdBy: "admin-user-123",
      });

      const coach = await createInvite(mockEnv, {
        tenant: "syston",
        teamId: "u15",
        role: "coach",
        createdBy: "admin-user-123",
      });

      expect(admin.invite.role).toBe("club_admin");
      expect(parent.invite.role).toBe("parent");
      expect(coach.invite.role).toBe("coach:u15");
    });

    it("preserves invite data through get and consume", async () => {
      const created = await createInvite(mockEnv, {
        tenant: "syston",
        teamId: "u15",
        role: "team_manager",
        maxUses: 5,
        createdBy: "admin-user-123",
      });

      const retrieved = await getInvite(mockEnv, created.token);
      const consumed = await consumeInvite(mockEnv, created.token);

      expect(retrieved.tenantId).toBe("syston");
      expect(retrieved.teamId).toBe("u15");
      expect(retrieved.role).toBe("team_manager:u15");
      expect(consumed.tenantId).toBe("syston");
      expect(consumed.used).toBe(1);
    });

    it("handles SETUP_URL without trailing slash", async () => {
      mockEnv.SETUP_URL = "https://setup.example.com/";

      const result = await createInvite(mockEnv, {
        tenant: "syston",
        role: "club_admin",
        createdBy: "admin-user-123",
      });

      expect(result.inviteUrl).toBe(`https://setup.example.com/join?token=${result.token}`);
    });
  });
});
