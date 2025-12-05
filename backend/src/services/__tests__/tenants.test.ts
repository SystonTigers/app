import { describe, it, expect, beforeEach } from "vitest";
import { putTenant, getTenant, type Tenant } from "../tenants";

/**
 * Tenants Service Tests
 *
 * Tests tenant management functions including storing and retrieving tenants.
 */
describe("Tenants Service", () => {
  let mockEnv: any;
  let mockKV: Map<string, string>;

  beforeEach(() => {
    // Create fresh mock environment for each test
    mockKV = new Map();

    mockEnv = {
      TENANTS: {
        get: async (key: string) => mockKV.get(key) || null,
        put: async (key: string, value: string) => {
          mockKV.set(key, value);
        },
      },
    };
  });

  describe("putTenant()", () => {
    it("successfully stores a new tenant", async () => {
      const tenant: Tenant = {
        tenantId: "syston",
        teamName: "Syston RFC",
        primary: "#FF0000",
        secondary: "#0000FF",
        badgeUrl: "https://example.com/badge.png",
        contactEmail: "contact@syston.com",
        status: "READY",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      };

      const result = await putTenant(mockEnv, tenant);

      expect(result.tenantId).toBe("syston");
      expect(result.teamName).toBe("Syston RFC");
      expect(result.status).toBe("READY");
      expect(result.createdAt).toBe("2025-01-01T00:00:00.000Z");
      expect(result.updatedAt).toBeTruthy();

      // Verify it was stored in KV
      const stored = mockKV.get("tenant:syston");
      expect(stored).toBeTruthy();
    });

    it("updates the updatedAt timestamp", async () => {
      const tenant: Tenant = {
        tenantId: "test",
        teamName: "Test Team",
        primary: "#000000",
        secondary: "#FFFFFF",
        badgeUrl: "https://example.com/badge.png",
        contactEmail: "test@example.com",
        status: "READY",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      };

      const result = await putTenant(mockEnv, tenant);

      // updatedAt should be updated to current time
      expect(result.updatedAt).not.toBe("2025-01-01T00:00:00.000Z");
      const updatedDate = new Date(result.updatedAt);
      expect(updatedDate.getTime()).toBeGreaterThan(new Date("2025-01-01T00:00:00.000Z").getTime());
    });

    it("sets createdAt if not provided", async () => {
      const tenant = {
        tenantId: "new",
        teamName: "New Team",
        primary: "#000000",
        secondary: "#FFFFFF",
        badgeUrl: "https://example.com/badge.png",
        contactEmail: "new@example.com",
        status: "PROVISIONING" as const,
        createdAt: undefined as any,
        updatedAt: undefined as any,
      };

      const result = await putTenant(mockEnv, tenant);

      expect(result.createdAt).toBeTruthy();
      const createdDate = new Date(result.createdAt);
      expect(createdDate.getTime()).toBeGreaterThan(0);
    });

    it("preserves existing createdAt timestamp", async () => {
      const originalCreatedAt = "2024-01-01T00:00:00.000Z";
      const tenant: Tenant = {
        tenantId: "existing",
        teamName: "Existing Team",
        primary: "#000000",
        secondary: "#FFFFFF",
        badgeUrl: "https://example.com/badge.png",
        contactEmail: "existing@example.com",
        status: "READY",
        createdAt: originalCreatedAt,
        updatedAt: originalCreatedAt,
      };

      const result = await putTenant(mockEnv, tenant);

      expect(result.createdAt).toBe(originalCreatedAt);
    });

    it("stores optional fields correctly", async () => {
      const tenant: Tenant = {
        tenantId: "full",
        teamName: "Full Team",
        primary: "#123456",
        secondary: "#ABCDEF",
        badgeUrl: "https://example.com/badge.png",
        contactEmail: "full@example.com",
        makeWebhookUrl: "https://hook.example.com/webhook",
        youtubeChannelId: "UCxxxxxxxx",
        spreadsheetId: "1234567890abcdef",
        status: "READY",
        validatorReport: { valid: true, errors: [] },
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      };

      const result = await putTenant(mockEnv, tenant);

      expect(result.makeWebhookUrl).toBe("https://hook.example.com/webhook");
      expect(result.youtubeChannelId).toBe("UCxxxxxxxx");
      expect(result.spreadsheetId).toBe("1234567890abcdef");
      expect(result.validatorReport).toEqual({ valid: true, errors: [] });
    });

    it("handles all status types", async () => {
      const statuses: Array<"PROVISIONING" | "READY" | "ERROR"> = ["PROVISIONING", "READY", "ERROR"];

      for (const status of statuses) {
        const tenant: Tenant = {
          tenantId: `tenant-${status}`,
          teamName: `Team ${status}`,
          primary: "#000000",
          secondary: "#FFFFFF",
          badgeUrl: "https://example.com/badge.png",
          contactEmail: `${status}@example.com`,
          status,
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        };

        const result = await putTenant(mockEnv, tenant);
        expect(result.status).toBe(status);
      }
    });

    it("overwrites existing tenant with same ID", async () => {
      const original: Tenant = {
        tenantId: "overwrite",
        teamName: "Original Team",
        primary: "#000000",
        secondary: "#FFFFFF",
        badgeUrl: "https://example.com/badge1.png",
        contactEmail: "original@example.com",
        status: "PROVISIONING",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      };

      await putTenant(mockEnv, original);

      const updated: Tenant = {
        tenantId: "overwrite",
        teamName: "Updated Team",
        primary: "#111111",
        secondary: "#EEEEEE",
        badgeUrl: "https://example.com/badge2.png",
        contactEmail: "updated@example.com",
        status: "READY",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      };

      const result = await putTenant(mockEnv, updated);

      expect(result.teamName).toBe("Updated Team");
      expect(result.status).toBe("READY");
      expect(result.contactEmail).toBe("updated@example.com");
    });

    it("stores tenant with special characters in fields", async () => {
      const tenant: Tenant = {
        tenantId: "special",
        teamName: "Team with 'quotes' & <tags>",
        primary: "#FF0000",
        secondary: "#0000FF",
        badgeUrl: "https://example.com/badge.png?param=value&other=test",
        contactEmail: "test+tag@example.com",
        status: "READY",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      };

      const result = await putTenant(mockEnv, tenant);

      expect(result.teamName).toBe("Team with 'quotes' & <tags>");
      expect(result.contactEmail).toBe("test+tag@example.com");
    });
  });

  describe("getTenant()", () => {
    it("retrieves an existing tenant", async () => {
      const tenant: Tenant = {
        tenantId: "retrieve",
        teamName: "Retrieve Team",
        primary: "#123456",
        secondary: "#ABCDEF",
        badgeUrl: "https://example.com/badge.png",
        contactEmail: "retrieve@example.com",
        status: "READY",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-02T00:00:00.000Z",
      };

      await putTenant(mockEnv, tenant);
      const result = await getTenant(mockEnv, "retrieve");

      expect(result).not.toBeNull();
      expect(result?.tenantId).toBe("retrieve");
      expect(result?.teamName).toBe("Retrieve Team");
      expect(result?.primary).toBe("#123456");
      expect(result?.secondary).toBe("#ABCDEF");
      expect(result?.status).toBe("READY");
    });

    it("returns null for non-existent tenant", async () => {
      const result = await getTenant(mockEnv, "nonexistent");

      expect(result).toBeNull();
    });

    it("retrieves tenant with all optional fields", async () => {
      const tenant: Tenant = {
        tenantId: "complete",
        teamName: "Complete Team",
        primary: "#000000",
        secondary: "#FFFFFF",
        badgeUrl: "https://example.com/badge.png",
        contactEmail: "complete@example.com",
        makeWebhookUrl: "https://hook.example.com/webhook",
        youtubeChannelId: "UCxxxxxxxx",
        spreadsheetId: "1234567890abcdef",
        status: "READY",
        validatorReport: { valid: true },
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-02T00:00:00.000Z",
      };

      await putTenant(mockEnv, tenant);
      const result = await getTenant(mockEnv, "complete");

      expect(result?.makeWebhookUrl).toBe("https://hook.example.com/webhook");
      expect(result?.youtubeChannelId).toBe("UCxxxxxxxx");
      expect(result?.spreadsheetId).toBe("1234567890abcdef");
      expect(result?.validatorReport).toEqual({ valid: true });
    });

    it("handles malformed JSON gracefully", async () => {
      // Manually insert invalid JSON
      mockKV.set("tenant:malformed", "{ invalid json }");

      const result = await getTenant(mockEnv, "malformed");

      expect(result).toBeNull();
    });

    it("handles empty string in KV", async () => {
      mockKV.set("tenant:empty", "");

      const result = await getTenant(mockEnv, "empty");

      expect(result).toBeNull();
    });

    it("retrieves multiple different tenants correctly", async () => {
      const tenant1: Tenant = {
        tenantId: "tenant1",
        teamName: "Team 1",
        primary: "#111111",
        secondary: "#222222",
        badgeUrl: "https://example.com/1.png",
        contactEmail: "team1@example.com",
        status: "READY",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      };

      const tenant2: Tenant = {
        tenantId: "tenant2",
        teamName: "Team 2",
        primary: "#333333",
        secondary: "#444444",
        badgeUrl: "https://example.com/2.png",
        contactEmail: "team2@example.com",
        status: "PROVISIONING",
        createdAt: "2025-01-02T00:00:00.000Z",
        updatedAt: "2025-01-02T00:00:00.000Z",
      };

      await putTenant(mockEnv, tenant1);
      await putTenant(mockEnv, tenant2);

      const result1 = await getTenant(mockEnv, "tenant1");
      const result2 = await getTenant(mockEnv, "tenant2");

      expect(result1?.teamName).toBe("Team 1");
      expect(result1?.status).toBe("READY");
      expect(result2?.teamName).toBe("Team 2");
      expect(result2?.status).toBe("PROVISIONING");
    });
  });

  describe("Edge Cases & Integration", () => {
    it("handles tenant ID with special characters", async () => {
      const tenant: Tenant = {
        tenantId: "tenant-with-dashes_and_underscores",
        teamName: "Special ID Team",
        primary: "#000000",
        secondary: "#FFFFFF",
        badgeUrl: "https://example.com/badge.png",
        contactEmail: "special@example.com",
        status: "READY",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      };

      await putTenant(mockEnv, tenant);
      const result = await getTenant(mockEnv, "tenant-with-dashes_and_underscores");

      expect(result).not.toBeNull();
      expect(result?.tenantId).toBe("tenant-with-dashes_and_underscores");
    });

    it("handles very long field values", async () => {
      const longString = "a".repeat(1000);
      const tenant: Tenant = {
        tenantId: "long",
        teamName: longString,
        primary: "#000000",
        secondary: "#FFFFFF",
        badgeUrl: "https://example.com/" + "a".repeat(500) + ".png",
        contactEmail: longString + "@example.com",
        status: "READY",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      };

      const result = await putTenant(mockEnv, tenant);

      expect(result.teamName).toBe(longString);
      expect(result.contactEmail).toBe(longString + "@example.com");
    });

    it("preserves complex validatorReport object", async () => {
      const complexReport = {
        valid: false,
        errors: [
          { field: "spreadsheetId", message: "Invalid ID" },
          { field: "youtubeChannelId", message: "Not found" },
        ],
        warnings: ["Badge URL is slow"],
        timestamp: "2025-01-01T00:00:00.000Z",
        nested: {
          deep: {
            value: 123,
          },
        },
      };

      const tenant: Tenant = {
        tenantId: "complex",
        teamName: "Complex Team",
        primary: "#000000",
        secondary: "#FFFFFF",
        badgeUrl: "https://example.com/badge.png",
        contactEmail: "complex@example.com",
        status: "ERROR",
        validatorReport: complexReport,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      };

      await putTenant(mockEnv, tenant);
      const result = await getTenant(mockEnv, "complex");

      expect(result?.validatorReport).toEqual(complexReport);
      expect((result?.validatorReport as any).errors).toHaveLength(2);
      expect((result?.validatorReport as any).nested.deep.value).toBe(123);
    });
  });
});
