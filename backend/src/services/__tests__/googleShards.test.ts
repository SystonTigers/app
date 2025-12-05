import { describe, it, expect, beforeEach, vi } from "vitest";
import { pickShardForTenant, type Shard } from "../googleShards";

// Mock tenantConfig module
vi.mock("../tenantConfig", () => ({
  getTenantConfig: vi.fn(),
}));

describe("Google Shards Service", () => {
  let mockEnv: any;
  let getTenantConfigMock: any;

  beforeEach(async () => {
    mockEnv = {};

    // Get the mocked function
    const { getTenantConfig } = await import("../tenantConfig");
    getTenantConfigMock = getTenantConfig as any;

    vi.clearAllMocks();
  });

  describe("pickShardForTenant", () => {
    describe("Priority 1: BYO-Google (tenant config)", () => {
      it("should return tenant-specific YouTube credentials from config", async () => {
        getTenantConfigMock.mockResolvedValue({
          creds: {
            yt: {
              client_id: "tenant-specific-client-id",
              client_secret: "tenant-specific-secret",
            },
          },
        });

        const result = await pickShardForTenant(mockEnv, "demo");

        expect(result.client_id).toBe("tenant-specific-client-id");
        expect(result.client_secret).toBe("tenant-specific-secret");
      });

      it("should prioritize tenant config over shards list", async () => {
        getTenantConfigMock.mockResolvedValue({
          creds: {
            yt: {
              client_id: "byo-client-id",
              client_secret: "byo-secret",
            },
          },
        });

        mockEnv.YT_SHARDS_JSON = JSON.stringify([
          { client_id: "shard1", client_secret: "secret1" },
          { client_id: "shard2", client_secret: "secret2" },
        ]);

        const result = await pickShardForTenant(mockEnv, "demo");

        // Should use BYO, not shards
        expect(result.client_id).toBe("byo-client-id");
      });

      it("should prioritize tenant config over default env vars", async () => {
        getTenantConfigMock.mockResolvedValue({
          creds: {
            yt: {
              client_id: "byo-client-id",
              client_secret: "byo-secret",
            },
          },
        });

        mockEnv.YT_CLIENT_ID = "default-client-id";
        mockEnv.YT_CLIENT_SECRET = "default-secret";

        const result = await pickShardForTenant(mockEnv, "demo");

        // Should use BYO, not default
        expect(result.client_id).toBe("byo-client-id");
      });
    });

    describe("Priority 2: Shards list", () => {
      it("should select shard from list using hash", async () => {
        getTenantConfigMock.mockResolvedValue(null);

        const shards: Shard[] = [
          { client_id: "shard1", client_secret: "secret1" },
          { client_id: "shard2", client_secret: "secret2" },
          { client_id: "shard3", client_secret: "secret3" },
        ];

        mockEnv.YT_SHARDS_JSON = JSON.stringify(shards);

        const result = await pickShardForTenant(mockEnv, "demo");

        // Should be one of the shards
        const clientIds = shards.map((s) => s.client_id);
        expect(clientIds).toContain(result.client_id);
      });

      it("should consistently map same tenant to same shard", async () => {
        getTenantConfigMock.mockResolvedValue(null);

        const shards: Shard[] = [
          { client_id: "shard1", client_secret: "secret1" },
          { client_id: "shard2", client_secret: "secret2" },
          { client_id: "shard3", client_secret: "secret3" },
        ];

        mockEnv.YT_SHARDS_JSON = JSON.stringify(shards);

        // Call multiple times for same tenant
        const result1 = await pickShardForTenant(mockEnv, "demo");
        const result2 = await pickShardForTenant(mockEnv, "demo");
        const result3 = await pickShardForTenant(mockEnv, "demo");

        // Should always get same shard
        expect(result1.client_id).toBe(result2.client_id);
        expect(result2.client_id).toBe(result3.client_id);
      });

      it("should distribute different tenants across shards", async () => {
        getTenantConfigMock.mockResolvedValue(null);

        const shards: Shard[] = [
          { client_id: "shard1", client_secret: "secret1" },
          { client_id: "shard2", client_secret: "secret2" },
          { client_id: "shard3", client_secret: "secret3" },
        ];

        mockEnv.YT_SHARDS_JSON = JSON.stringify(shards);

        const tenants = [
          "tenant1",
          "tenant2",
          "tenant3",
          "tenant4",
          "tenant5",
          "tenant6",
          "tenant7",
          "tenant8",
          "tenant9",
        ];
        const results = await Promise.all(
          tenants.map((t) => pickShardForTenant(mockEnv, t))
        );

        // Should use multiple shards (not all same)
        const uniqueShards = new Set(results.map((r) => r.client_id));
        expect(uniqueShards.size).toBeGreaterThan(1);
      });

      it("should handle single shard in list", async () => {
        getTenantConfigMock.mockResolvedValue(null);

        mockEnv.YT_SHARDS_JSON = JSON.stringify([
          { client_id: "only-shard", client_secret: "only-secret" },
        ]);

        const result = await pickShardForTenant(mockEnv, "demo");

        expect(result.client_id).toBe("only-shard");
      });

      it("should prioritize shards over default env vars", async () => {
        getTenantConfigMock.mockResolvedValue(null);

        mockEnv.YT_SHARDS_JSON = JSON.stringify([
          { client_id: "shard1", client_secret: "secret1" },
        ]);
        mockEnv.YT_CLIENT_ID = "default-client-id";
        mockEnv.YT_CLIENT_SECRET = "default-secret";

        const result = await pickShardForTenant(mockEnv, "demo");

        // Should use shard, not default
        expect(result.client_id).toBe("shard1");
      });

      it("should handle invalid YT_SHARDS_JSON gracefully", async () => {
        getTenantConfigMock.mockResolvedValue(null);

        mockEnv.YT_SHARDS_JSON = "invalid json {{{";
        mockEnv.YT_CLIENT_ID = "default-client-id";
        mockEnv.YT_CLIENT_SECRET = "default-secret";

        const result = await pickShardForTenant(mockEnv, "demo");

        // Should fall back to default
        expect(result.client_id).toBe("default-client-id");
      });

      it("should handle empty shards list", async () => {
        getTenantConfigMock.mockResolvedValue(null);

        mockEnv.YT_SHARDS_JSON = JSON.stringify([]);
        mockEnv.YT_CLIENT_ID = "default-client-id";
        mockEnv.YT_CLIENT_SECRET = "default-secret";

        const result = await pickShardForTenant(mockEnv, "demo");

        // Should fall back to default
        expect(result.client_id).toBe("default-client-id");
      });
    });

    describe("Priority 3: Default env vars", () => {
      it("should use default env vars when no config or shards", async () => {
        getTenantConfigMock.mockResolvedValue(null);

        mockEnv.YT_CLIENT_ID = "default-client-id";
        mockEnv.YT_CLIENT_SECRET = "default-secret";

        const result = await pickShardForTenant(mockEnv, "demo");

        expect(result.client_id).toBe("default-client-id");
        expect(result.client_secret).toBe("default-secret");
      });

      it("should return same default for all tenants", async () => {
        getTenantConfigMock.mockResolvedValue(null);

        mockEnv.YT_CLIENT_ID = "default-client-id";
        mockEnv.YT_CLIENT_SECRET = "default-secret";

        const result1 = await pickShardForTenant(mockEnv, "tenant1");
        const result2 = await pickShardForTenant(mockEnv, "tenant2");
        const result3 = await pickShardForTenant(mockEnv, "tenant3");

        expect(result1.client_id).toBe(result2.client_id);
        expect(result2.client_id).toBe(result3.client_id);
      });
    });

    describe("Error handling", () => {
      it("should throw error when no config available", async () => {
        getTenantConfigMock.mockResolvedValue(null);

        // No BYO, no shards, no default
        mockEnv = {};

        await expect(pickShardForTenant(mockEnv, "demo")).rejects.toThrow(
          "No YouTube OAuth configuration available"
        );
      });

      it("should throw error when only client_id is set", async () => {
        getTenantConfigMock.mockResolvedValue(null);

        mockEnv.YT_CLIENT_ID = "client-id-only";
        // Missing YT_CLIENT_SECRET

        await expect(pickShardForTenant(mockEnv, "demo")).rejects.toThrow(
          "No YouTube OAuth configuration available"
        );
      });

      it("should throw error when only client_secret is set", async () => {
        getTenantConfigMock.mockResolvedValue(null);

        mockEnv.YT_CLIENT_SECRET = "secret-only";
        // Missing YT_CLIENT_ID

        await expect(pickShardForTenant(mockEnv, "demo")).rejects.toThrow(
          "No YouTube OAuth configuration available"
        );
      });

      it("should handle tenant config with incomplete yt creds", async () => {
        getTenantConfigMock.mockResolvedValue({
          creds: {
            yt: {
              client_id: "only-client-id",
              // Missing client_secret
            },
          },
        });

        mockEnv.YT_CLIENT_ID = "default-client-id";
        mockEnv.YT_CLIENT_SECRET = "default-secret";

        const result = await pickShardForTenant(mockEnv, "demo");

        // Should fall back to default
        expect(result.client_id).toBe("default-client-id");
      });
    });

    describe("Edge Cases", () => {
      it("should handle tenant with special characters", async () => {
        getTenantConfigMock.mockResolvedValue(null);

        const shards: Shard[] = [
          { client_id: "shard1", client_secret: "secret1" },
          { client_id: "shard2", client_secret: "secret2" },
        ];

        mockEnv.YT_SHARDS_JSON = JSON.stringify(shards);

        const result = await pickShardForTenant(
          mockEnv,
          "tenant-with-special_chars.123"
        );

        expect(result.client_id).toBeDefined();
        expect(["shard1", "shard2"]).toContain(result.client_id);
      });

      it("should handle very long tenant names", async () => {
        getTenantConfigMock.mockResolvedValue(null);

        const shards: Shard[] = [
          { client_id: "shard1", client_secret: "secret1" },
        ];

        mockEnv.YT_SHARDS_JSON = JSON.stringify(shards);

        const longTenant = "a".repeat(1000);
        const result = await pickShardForTenant(mockEnv, longTenant);

        expect(result.client_id).toBe("shard1");
      });

      it("should handle Unicode tenant names", async () => {
        getTenantConfigMock.mockResolvedValue(null);

        const shards: Shard[] = [
          { client_id: "shard1", client_secret: "secret1" },
          { client_id: "shard2", client_secret: "secret2" },
        ];

        mockEnv.YT_SHARDS_JSON = JSON.stringify(shards);

        const result1 = await pickShardForTenant(mockEnv, "テナント");
        const result2 = await pickShardForTenant(mockEnv, "租户");

        // Should work with Unicode
        expect(result1.client_id).toBeDefined();
        expect(result2.client_id).toBeDefined();
      });

      it("should handle large shard lists", async () => {
        getTenantConfigMock.mockResolvedValue(null);

        // Create 100 shards
        const shards: Shard[] = Array.from({ length: 100 }, (_, i) => ({
          client_id: `shard${i}`,
          client_secret: `secret${i}`,
        }));

        mockEnv.YT_SHARDS_JSON = JSON.stringify(shards);

        // Test multiple tenants
        const tenants = Array.from({ length: 50 }, (_, i) => `tenant${i}`);
        const results = await Promise.all(
          tenants.map((t) => pickShardForTenant(mockEnv, t))
        );

        // All should have valid shards
        results.forEach((result) => {
          expect(result.client_id).toMatch(/^shard\d+$/);
        });

        // Should use multiple shards
        const uniqueShards = new Set(results.map((r) => r.client_id));
        expect(uniqueShards.size).toBeGreaterThan(5);
      });
    });
  });
});
