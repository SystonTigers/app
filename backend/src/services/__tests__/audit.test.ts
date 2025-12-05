import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  logRoleChange,
  getRoleChangeHistory,
  getAuditStats,
  cleanupAuditEntries,
} from "../audit";
import type { Env } from "../../env";

describe("Audit Service", () => {
  let mockEnv: Env;
  let mockKV: Map<string, string>;

  beforeEach(() => {
    mockKV = new Map();

    mockEnv = {
      KV: {
        get: vi.fn(async (key: string, type?: string) => {
          const value = mockKV.get(key);
          if (!value) return null;
          return type === "json" ? JSON.parse(value) : value;
        }),
        put: vi.fn(async (key: string, value: string) => {
          mockKV.set(key, value);
        }),
        delete: vi.fn(async (key: string) => {
          mockKV.delete(key);
        }),
      },
    } as any;

    vi.clearAllMocks();
  });

  describe("logRoleChange", () => {
    it("should log role change with all required fields", async () => {
      const headersMap = new Map([
        ["x-user-id", "admin_456"],
        ["x-user-name", "Admin User"],
        ["cf-connecting-ip", "192.168.1.1"],
        ["user-agent", "Mozilla/5.0"],
      ]);

      const req = {
        tenant: "demo",
        json: {
          userId: "user_123",
          userName: "John Doe",
          oldRole: "member",
          newRole: "admin",
          reason: "Promoted to admin",
        },
        headers: {
          get: (key: string) => headersMap.get(key) || null,
        },
      };

      const response = await logRoleChange(req, mockEnv);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.auditId).toBeTruthy();

      // Verify stored in KV
      const auditKeys = Array.from(mockKV.keys()).filter((k) =>
        k.startsWith("audit:role-change:demo:")
      );
      expect(auditKeys.length).toBeGreaterThan(0);
    });

    it("should return error when userId is missing", async () => {
      const req = {
        tenant: "demo",
        json: {
          oldRole: "member",
          newRole: "admin",
        },
        headers: new Map(),
      };
      req.headers.get = () => null;

      const response = await logRoleChange(req, mockEnv);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain("userId");
    });

    it("should return error when oldRole is missing", async () => {
      const req = {
        tenant: "demo",
        json: {
          userId: "user_123",
          newRole: "admin",
        },
        headers: new Map(),
      };
      req.headers.get = () => null;

      const response = await logRoleChange(req, mockEnv);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain("oldRole");
    });

    it("should return error when newRole is missing", async () => {
      const req = {
        tenant: "demo",
        json: {
          userId: "user_123",
          oldRole: "member",
        },
        headers: new Map(),
      };
      req.headers.get = () => null;

      const response = await logRoleChange(req, mockEnv);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain("newRole");
    });

    it("should use default userName when not provided", async () => {
      const req = {
        tenant: "demo",
        json: {
          userId: "user_123",
          oldRole: "member",
          newRole: "admin",
        },
        headers: {
          get: () => null,
        },
      };

      const response = await logRoleChange(req, mockEnv);
      const data = await response.json();

      const key = `audit:role-change:demo:${data.auditId}`;
      const entry = JSON.parse(mockKV.get(key)!);

      expect(entry.userName).toBe("Unknown");
    });

    it("should use system as default changedBy", async () => {
      const req = {
        tenant: "demo",
        json: {
          userId: "user_123",
          oldRole: "member",
          newRole: "admin",
        },
        headers: {
          get: () => null,
        },
      };

      const response = await logRoleChange(req, mockEnv);
      const data = await response.json();

      const key = `audit:role-change:demo:${data.auditId}`;
      const entry = JSON.parse(mockKV.get(key)!);

      expect(entry.changedBy).toBe("system");
      expect(entry.changedByName).toBe("System");
    });

    it("should capture IP address from cf-connecting-ip header", async () => {
      const headersMap = new Map([["cf-connecting-ip", "203.0.113.42"]]);

      const req = {
        tenant: "demo",
        json: {
          userId: "user_123",
          oldRole: "member",
          newRole: "admin",
        },
        headers: {
          get: (key: string) => headersMap.get(key) || null,
        },
      };

      const response = await logRoleChange(req, mockEnv);
      const data = await response.json();

      const key = `audit:role-change:demo:${data.auditId}`;
      const entry = JSON.parse(mockKV.get(key)!);

      expect(entry.ipAddress).toBe("203.0.113.42");
    });

    it("should capture user agent", async () => {
      const headersMap = new Map([["user-agent", "Chrome/120.0"]]);

      const req = {
        tenant: "demo",
        json: {
          userId: "user_123",
          oldRole: "member",
          newRole: "admin",
        },
        headers: {
          get: (key: string) => headersMap.get(key) || null,
        },
      };

      const response = await logRoleChange(req, mockEnv);
      const data = await response.json();

      const key = `audit:role-change:demo:${data.auditId}`;
      const entry = JSON.parse(mockKV.get(key)!);

      expect(entry.userAgent).toBe("Chrome/120.0");
    });

    it("should add entry to index", async () => {
      const req = {
        tenant: "demo",
        json: {
          userId: "user_123",
          oldRole: "member",
          newRole: "admin",
        },
        headers: {
          get: () => null,
        },
      };

      await logRoleChange(req, mockEnv);

      const indexKey = "audit:role-change:demo:index";
      const index = JSON.parse(mockKV.get(indexKey)!);

      expect(index).toHaveLength(1);
    });

    it("should limit index to 1000 entries", async () => {
      // Pre-populate index with 1000 entries
      const existingIndex = Array.from({ length: 1000 }, (_, i) => `id_${i}`);
      mockKV.set(
        "audit:role-change:demo:index",
        JSON.stringify(existingIndex)
      );

      const req = {
        tenant: "demo",
        json: {
          userId: "user_123",
          oldRole: "member",
          newRole: "admin",
        },
        headers: {
          get: () => null,
        },
      };

      await logRoleChange(req, mockEnv);

      const indexKey = "audit:role-change:demo:index";
      const index = JSON.parse(mockKV.get(indexKey)!);

      expect(index).toHaveLength(1000);
      expect(index[1000]).toBeUndefined();
    });

    it("should isolate audit logs by tenant", async () => {
      const req1 = {
        tenant: "tenant1",
        json: {
          userId: "user_1",
          oldRole: "member",
          newRole: "admin",
        },
        headers: new Map(),
      };
      req1.headers.get = () => null;

      const req2 = {
        tenant: "tenant2",
        json: {
          userId: "user_2",
          oldRole: "guest",
          newRole: "member",
        },
        headers: new Map(),
      };
      req2.headers.get = () => null;

      await logRoleChange(req1, mockEnv);
      await logRoleChange(req2, mockEnv);

      const index1 = JSON.parse(
        mockKV.get("audit:role-change:tenant1:index")!
      );
      const index2 = JSON.parse(
        mockKV.get("audit:role-change:tenant2:index")!
      );

      expect(index1).toHaveLength(1);
      expect(index2).toHaveLength(1);
    });
  });

  describe("getRoleChangeHistory", () => {
    beforeEach(async () => {
      // Create some test audit entries
      const entries = [
        { id: "entry_1", userId: "user_1", timestamp: Date.now() - 1000 },
        { id: "entry_2", userId: "user_2", timestamp: Date.now() - 2000 },
        { id: "entry_3", userId: "user_1", timestamp: Date.now() - 3000 },
      ];

      const index = entries.map((e) => e.id);
      mockKV.set("audit:role-change:demo:index", JSON.stringify(index));

      for (const entry of entries) {
        mockKV.set(
          `audit:role-change:demo:${entry.id}`,
          JSON.stringify(entry)
        );
      }
    });

    it("should return audit history with default limit", async () => {
      const req = {
        tenant: "demo",
        url: "https://example.com/audit/history",
      };

      const response = await getRoleChangeHistory(req, mockEnv);
      const data = await response.json();

      expect(data.entries).toHaveLength(3);
      expect(data.total).toBe(3);
      expect(data.limit).toBe(50);
      expect(data.offset).toBe(0);
    });

    it("should support pagination with limit", async () => {
      const req = {
        tenant: "demo",
        url: "https://example.com/audit/history?limit=2",
      };

      const response = await getRoleChangeHistory(req, mockEnv);
      const data = await response.json();

      expect(data.entries).toHaveLength(2);
      expect(data.limit).toBe(2);
    });

    it("should support pagination with offset", async () => {
      const req = {
        tenant: "demo",
        url: "https://example.com/audit/history?offset=2",
      };

      const response = await getRoleChangeHistory(req, mockEnv);
      const data = await response.json();

      expect(data.entries).toHaveLength(1);
      expect(data.offset).toBe(2);
    });

    it("should filter by userId", async () => {
      const req = {
        tenant: "demo",
        url: "https://example.com/audit/history?userId=user_1",
      };

      const response = await getRoleChangeHistory(req, mockEnv);
      const data = await response.json();

      expect(data.entries).toHaveLength(2);
      expect(data.entries.every((e: any) => e.userId === "user_1")).toBe(true);
    });

    it("should return empty array when no entries exist", async () => {
      mockKV.delete("audit:role-change:demo:index");

      const req = {
        tenant: "demo",
        url: "https://example.com/audit/history",
      };

      const response = await getRoleChangeHistory(req, mockEnv);
      const data = await response.json();

      expect(data.entries).toEqual([]);
      expect(data.total).toBe(0);
    });

    it("should handle missing entries gracefully", async () => {
      // Index has IDs but entries are missing
      mockKV.set(
        "audit:role-change:demo:index",
        JSON.stringify(["missing_1", "missing_2"])
      );

      const req = {
        tenant: "demo",
        url: "https://example.com/audit/history",
      };

      const response = await getRoleChangeHistory(req, mockEnv);
      const data = await response.json();

      expect(data.entries).toEqual([]);
    });
  });

  describe("getAuditStats", () => {
    it("should return stats for different time periods", async () => {
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;

      const entries = [
        { id: "recent_1", timestamp: now - 1000 }, // < 24h
        { id: "recent_2", timestamp: now - day / 2 }, // < 24h
        { id: "week_1", timestamp: now - 3 * day }, // < 7d
        { id: "month_1", timestamp: now - 15 * day }, // < 30d
      ];

      const index = entries.map((e) => e.id);
      mockKV.set("audit:role-change:demo:index", JSON.stringify(index));

      for (const entry of entries) {
        mockKV.set(
          `audit:role-change:demo:${entry.id}`,
          JSON.stringify(entry)
        );
      }

      const req = { tenant: "demo" };
      const response = await getAuditStats(req, mockEnv);
      const data = await response.json();

      expect(data.totalRoleChanges).toBe(4);
      expect(data.last24Hours).toBe(2);
      expect(data.last7Days).toBe(3);
      expect(data.last30Days).toBe(4);
    });

    it("should return zeros when no entries exist", async () => {
      const req = { tenant: "demo" };
      const response = await getAuditStats(req, mockEnv);
      const data = await response.json();

      expect(data.totalRoleChanges).toBe(0);
      expect(data.last24Hours).toBe(0);
      expect(data.last7Days).toBe(0);
      expect(data.last30Days).toBe(0);
    });

    it("should only check last 100 entries", async () => {
      const index = Array.from({ length: 150 }, (_, i) => `entry_${i}`);
      mockKV.set("audit:role-change:demo:index", JSON.stringify(index));

      // Mock only first 100 entries
      for (let i = 0; i < 100; i++) {
        mockKV.set(
          `audit:role-change:demo:entry_${i}`,
          JSON.stringify({ id: `entry_${i}`, timestamp: Date.now() })
        );
      }

      const req = { tenant: "demo" };
      const response = await getAuditStats(req, mockEnv);
      const data = await response.json();

      expect(data.totalRoleChanges).toBe(150);
      expect(data.last24Hours).toBeLessThanOrEqual(100);
    });
  });

  describe("cleanupAuditEntries", () => {
    it("should delete entries older than 90 days", async () => {
      const now = Date.now();
      const maxAge = 90 * 24 * 60 * 60 * 1000;

      const entries = [
        { id: "old_1", timestamp: now - maxAge - 1000 }, // Too old
        { id: "old_2", timestamp: now - maxAge - 2000 }, // Too old
        { id: "recent", timestamp: now - 1000 }, // Recent
      ];

      const index = entries.map((e) => e.id);
      mockKV.set("audit:role-change:demo:index", JSON.stringify(index));

      for (const entry of entries) {
        mockKV.set(
          `audit:role-change:demo:${entry.id}`,
          JSON.stringify(entry)
        );
      }

      const result = await cleanupAuditEntries(mockEnv, "demo");

      expect(result.deleted).toBe(2);

      // Verify old entries deleted
      expect(mockKV.has("audit:role-change:demo:old_1")).toBe(false);
      expect(mockKV.has("audit:role-change:demo:old_2")).toBe(false);

      // Verify recent entry still exists
      expect(mockKV.has("audit:role-change:demo:recent")).toBe(true);
    });

    it("should update index after cleanup", async () => {
      const now = Date.now();
      const maxAge = 90 * 24 * 60 * 60 * 1000;

      const entries = [
        { id: "old", timestamp: now - maxAge - 1000 },
        { id: "recent", timestamp: now - 1000 },
      ];

      const index = entries.map((e) => e.id);
      mockKV.set("audit:role-change:demo:index", JSON.stringify(index));

      for (const entry of entries) {
        mockKV.set(
          `audit:role-change:demo:${entry.id}`,
          JSON.stringify(entry)
        );
      }

      await cleanupAuditEntries(mockEnv, "demo");

      const updatedIndex = JSON.parse(
        mockKV.get("audit:role-change:demo:index")!
      );

      expect(updatedIndex).toHaveLength(1);
      expect(updatedIndex).toContain("recent");
      expect(updatedIndex).not.toContain("old");
    });

    it("should return 0 when no entries exist", async () => {
      const result = await cleanupAuditEntries(mockEnv, "demo");

      expect(result.deleted).toBe(0);
    });

    it("should handle empty index", async () => {
      mockKV.set("audit:role-change:demo:index", JSON.stringify([]));

      const result = await cleanupAuditEntries(mockEnv, "demo");

      expect(result.deleted).toBe(0);
    });

    it("should not delete entries within 90 days", async () => {
      const now = Date.now();
      const maxAge = 90 * 24 * 60 * 60 * 1000;

      const entries = [
        { id: "day_89", timestamp: now - (maxAge - 24 * 60 * 60 * 1000) },
        { id: "day_45", timestamp: now - 45 * 24 * 60 * 60 * 1000 },
        { id: "day_1", timestamp: now - 24 * 60 * 60 * 1000 },
      ];

      const index = entries.map((e) => e.id);
      mockKV.set("audit:role-change:demo:index", JSON.stringify(index));

      for (const entry of entries) {
        mockKV.set(
          `audit:role-change:demo:${entry.id}`,
          JSON.stringify(entry)
        );
      }

      const result = await cleanupAuditEntries(mockEnv, "demo");

      expect(result.deleted).toBe(0);

      // All entries should still exist
      entries.forEach((entry) => {
        expect(mockKV.has(`audit:role-change:demo:${entry.id}`)).toBe(true);
      });
    });
  });
});
