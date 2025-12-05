import { describe, it, expect, beforeEach, vi } from "vitest";
import { provisionTenant, type ProvisioningRequest } from "../provisioning";

/**
 * Provisioning Service Tests
 *
 * Tests automated tenant provisioning including tenant creation,
 * JWT issuance, and setup token generation.
 */
describe("Provisioning Service", () => {
  let mockEnv: any;
  let mockKV: Map<string, string>;

  beforeEach(() => {
    // Create fresh mock environment for each test
    mockKV = new Map();

    mockEnv = {
      KV_IDEMP: {
        get: async (key: string, type?: string) => {
          const value = mockKV.get(key);
          if (!value) return null;
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
      JWT_SECRET: "test-secret-key-at-least-32-characters-long",
      JWT_ISSUER: "test-issuer",
      JWT_AUDIENCE: "syston-admin",
      SETUP_URL: "https://setup.example.com",
      ADMIN_CONSOLE_URL: "https://admin.example.com",
    };
  });

  describe("provisionTenant()", () => {
    it("successfully provisions a new tenant with minimal fields", async () => {
      const request: ProvisioningRequest = {
        clubName: "Syston RFC",
        clubShortName: "syston",
        contactEmail: "admin@syston.com",
        contactName: "John Doe",
      };

      const result = await provisionTenant(mockEnv, request);

      expect(result.success).toBe(true);
      expect(result.tenant).toBeDefined();
      expect(result.tenant?.id).toBe("syston");
      expect(result.tenant?.name).toBe("Syston RFC");
      expect(result.tenant?.adminJWT).toBeTruthy();
      expect(result.tenant?.automationJWT).toBeTruthy();
      expect(result.tenant?.setupUrl).toContain("https://setup.example.com");
      expect(result.tenant?.adminConsoleUrl).toBe("https://admin.example.com");
      expect(result.error).toBeUndefined();
    });

    it("provisions tenant with all optional fields", async () => {
      const request: ProvisioningRequest = {
        clubName: "Kingsthorpe RFC",
        clubShortName: "kingsthorpe",
        contactEmail: "admin@kingsthorpe.com",
        contactName: "Jane Smith",
        locale: "en-US",
        timezone: "America/New_York",
        plan: "enterprise",
        makeWebhookUrl: "https://hook.make.com/webhook123",
      };

      const result = await provisionTenant(mockEnv, request);

      expect(result.success).toBe(true);
      expect(result.tenant?.id).toBe("kingsthorpe");

      // Verify tenant config was stored
      const storedConfig = mockKV.get("tenant:kingsthorpe");
      expect(storedConfig).toBeTruthy();
      const config = JSON.parse(storedConfig!);
      expect(config.locale).toBe("en-US");
      expect(config.tz).toBe("America/New_York");
      expect(config.metadata.plan).toBe("enterprise");
      expect(config.makeWebhookUrl).toBe("https://hook.make.com/webhook123");
    });

    it("defaults locale to en-GB if not provided", async () => {
      const request: ProvisioningRequest = {
        clubName: "Test Club",
        clubShortName: "testclub",
        contactEmail: "test@example.com",
        contactName: "Test User",
      };

      await provisionTenant(mockEnv, request);

      const storedConfig = mockKV.get("tenant:testclub");
      const config = JSON.parse(storedConfig!);
      expect(config.locale).toBe("en-GB");
    });

    it("defaults timezone to Europe/London if not provided", async () => {
      const request: ProvisioningRequest = {
        clubName: "Test Club",
        clubShortName: "testclub",
        contactEmail: "test@example.com",
        contactName: "Test User",
      };

      await provisionTenant(mockEnv, request);

      const storedConfig = mockKV.get("tenant:testclub");
      const config = JSON.parse(storedConfig!);
      expect(config.tz).toBe("Europe/London");
    });

    it("defaults plan to free if not provided", async () => {
      const request: ProvisioningRequest = {
        clubName: "Test Club",
        clubShortName: "testclub",
        contactEmail: "test@example.com",
        contactName: "Test User",
      };

      await provisionTenant(mockEnv, request);

      const storedConfig = mockKV.get("tenant:testclub");
      const config = JSON.parse(storedConfig!);
      expect(config.metadata.plan).toBe("free");
    });

    it("sanitizes tenant ID to lowercase alphanumeric with hyphens", async () => {
      const request: ProvisioningRequest = {
        clubName: "Test Club",
        clubShortName: "Test Club@2024!",
        contactEmail: "test@example.com",
        contactName: "Test User",
      };

      const result = await provisionTenant(mockEnv, request);

      expect(result.success).toBe(true);
      expect(result.tenant?.id).toBe("test-club-2024");
    });

    it("truncates tenant ID to 32 characters", async () => {
      const request: ProvisioningRequest = {
        clubName: "Very Long Club Name",
        clubShortName: "a".repeat(50),
        contactEmail: "test@example.com",
        contactName: "Test User",
      };

      const result = await provisionTenant(mockEnv, request);

      expect(result.success).toBe(true);
      expect(result.tenant?.id).toHaveLength(32);
    });

    it("returns error if tenant already exists", async () => {
      // Create tenant first time
      const request: ProvisioningRequest = {
        clubName: "Existing Club",
        clubShortName: "existing",
        contactEmail: "admin@existing.com",
        contactName: "Admin User",
      };

      await provisionTenant(mockEnv, request);

      // Try to create again
      const result = await provisionTenant(mockEnv, request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("TENANT_EXISTS");
      expect(result.error?.message).toContain("existing");
      expect(result.tenant).toBeUndefined();
    });

    it("generates admin and automation JWTs", async () => {
      const request: ProvisioningRequest = {
        clubName: "Test Club",
        clubShortName: "testclub",
        contactEmail: "test@example.com",
        contactName: "Test User",
      };

      const result = await provisionTenant(mockEnv, request);

      expect(result.tenant?.adminJWT).toBeTruthy();
      expect(result.tenant?.automationJWT).toBeTruthy();
      // Both JWTs should be valid JWT format
      expect(result.tenant?.adminJWT).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
      expect(result.tenant?.automationJWT).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
    });

    it("generates setup URL with token", async () => {
      const request: ProvisioningRequest = {
        clubName: "Test Club",
        clubShortName: "testclub",
        contactEmail: "test@example.com",
        contactName: "Test User",
      };

      const result = await provisionTenant(mockEnv, request);

      expect(result.tenant?.setupUrl).toContain("https://setup.example.com?token=");
      expect(result.tenant?.setupUrl).toMatch(/token=[a-f0-9-]{36}/); // UUID pattern
    });

    it("stores setup token in KV with tenant ID", async () => {
      const request: ProvisioningRequest = {
        clubName: "Test Club",
        clubShortName: "testclub",
        contactEmail: "test@example.com",
        contactName: "Test User",
      };

      await provisionTenant(mockEnv, request);

      // Find setup token in KV
      const setupTokenKeys = Array.from(mockKV.keys()).filter((k) => k.startsWith("setup-token:"));
      expect(setupTokenKeys).toHaveLength(1);

      const tokenData = JSON.parse(mockKV.get(setupTokenKeys[0])!);
      expect(tokenData.tenantId).toBe("testclub");
      expect(tokenData.expiresAt).toBeTruthy();
    });

    it("sets enterprise flags for enterprise plan", async () => {
      const request: ProvisioningRequest = {
        clubName: "Enterprise Club",
        clubShortName: "enterprise",
        contactEmail: "admin@enterprise.com",
        contactName: "Admin User",
        plan: "enterprise",
      };

      await provisionTenant(mockEnv, request);

      const storedConfig = mockKV.get("tenant:enterprise");
      const config = JSON.parse(storedConfig!);
      expect(config.flags.use_make).toBe(false);
      expect(config.flags.direct_yt).toBe(true);
      expect(config.flags.direct_fb).toBe(true);
      expect(config.flags.direct_ig).toBe(true);
    });

    it("sets managed flags for managed plan", async () => {
      const request: ProvisioningRequest = {
        clubName: "Managed Club",
        clubShortName: "managed",
        contactEmail: "admin@managed.com",
        contactName: "Admin User",
        plan: "managed",
      };

      await provisionTenant(mockEnv, request);

      const storedConfig = mockKV.get("tenant:managed");
      const config = JSON.parse(storedConfig!);
      expect(config.flags.use_make).toBe(false);
      expect(config.flags.direct_yt).toBe(true);
    });

    it("sets free plan flags for free plan", async () => {
      const request: ProvisioningRequest = {
        clubName: "Free Club",
        clubShortName: "free",
        contactEmail: "admin@free.com",
        contactName: "Admin User",
        plan: "free",
      };

      await provisionTenant(mockEnv, request);

      const storedConfig = mockKV.get("tenant:free");
      const config = JSON.parse(storedConfig!);
      expect(config.flags.use_make).toBe(true);
      expect(config.flags.direct_yt).toBe(false);
    });

    it("stores tenant metadata in config", async () => {
      const request: ProvisioningRequest = {
        clubName: "Test Club",
        clubShortName: "testclub",
        contactEmail: "test@example.com",
        contactName: "John Doe",
        plan: "managed",
      };

      await provisionTenant(mockEnv, request);

      const storedConfig = mockKV.get("tenant:testclub");
      const config = JSON.parse(storedConfig!);
      expect(config.metadata.contactEmail).toBe("test@example.com");
      expect(config.metadata.contactName).toBe("John Doe");
      expect(config.metadata.plan).toBe("managed");
      expect(config.metadata.provisionedBy).toBe("automated");
      expect(config.metadata.createdAt).toBeTruthy();
    });

    it("returns appsScript as null when auto-deploy not enabled", async () => {
      const request: ProvisioningRequest = {
        clubName: "Test Club",
        clubShortName: "testclub",
        contactEmail: "test@example.com",
        contactName: "Test User",
      };

      const result = await provisionTenant(mockEnv, request);

      expect(result.tenant?.appsScript).toBeNull();
    });

    it("handles errors gracefully and returns error result", async () => {
      // Create an env that will cause an error
      const brokenEnv = {
        ...mockEnv,
        KV_IDEMP: {
          get: async () => {
            throw new Error("KV unavailable");
          },
        },
      };

      const request: ProvisioningRequest = {
        clubName: "Test Club",
        clubShortName: "testclub",
        contactEmail: "test@example.com",
        contactName: "Test User",
      };

      const result = await provisionTenant(brokenEnv, request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("PROVISIONING_FAILED");
      expect(result.error?.message).toBeTruthy();
      expect(result.tenant).toBeUndefined();
    });

    it("handles special characters in club name", async () => {
      const request: ProvisioningRequest = {
        clubName: "Club with 'quotes' & <tags>",
        clubShortName: "special",
        contactEmail: "test@example.com",
        contactName: "Test User",
      };

      const result = await provisionTenant(mockEnv, request);

      expect(result.success).toBe(true);
      expect(result.tenant?.name).toBe("Club with 'quotes' & <tags>");
    });

    it("handles Unicode characters in contact name", async () => {
      const request: ProvisioningRequest = {
        clubName: "Test Club",
        clubShortName: "testclub",
        contactEmail: "test@example.com",
        contactName: "José García",
      };

      const result = await provisionTenant(mockEnv, request);

      expect(result.success).toBe(true);

      const storedConfig = mockKV.get("tenant:testclub");
      const config = JSON.parse(storedConfig!);
      expect(config.metadata.contactName).toBe("José García");
    });
  });

  describe("Edge Cases & Integration", () => {
    it("provisions multiple tenants successfully", async () => {
      const tenant1 = await provisionTenant(mockEnv, {
        clubName: "Club 1",
        clubShortName: "club1",
        contactEmail: "admin1@example.com",
        contactName: "Admin 1",
      });

      const tenant2 = await provisionTenant(mockEnv, {
        clubName: "Club 2",
        clubShortName: "club2",
        contactEmail: "admin2@example.com",
        contactName: "Admin 2",
      });

      expect(tenant1.success).toBe(true);
      expect(tenant2.success).toBe(true);
      expect(tenant1.tenant?.id).toBe("club1");
      expect(tenant2.tenant?.id).toBe("club2");
      expect(mockKV.size).toBeGreaterThanOrEqual(4); // 2 tenant configs + 2 setup tokens
    });

    it("sanitizes complex tenant IDs correctly", async () => {
      const testCases = [
        { input: "Test@Club#2024!", expected: "test-club-2024" },
        { input: "UPPERCASE", expected: "uppercase" },
        { input: "with spaces", expected: "with-spaces" },
        { input: "multiple---hyphens", expected: "multiple---hyphens" },
        { input: "---leading-trailing---", expected: "leading-trailing" },
      ];

      for (const testCase of testCases) {
        mockKV.clear(); // Clear between tests

        const result = await provisionTenant(mockEnv, {
          clubName: "Test",
          clubShortName: testCase.input,
          contactEmail: "test@example.com",
          contactName: "Test",
        });

        expect(result.tenant?.id).toBe(testCase.expected);
      }
    });

    it("handles different plan types correctly", async () => {
      const plans: Array<"free" | "managed" | "enterprise"> = ["free", "managed", "enterprise"];

      for (const plan of plans) {
        mockKV.clear();

        const result = await provisionTenant(mockEnv, {
          clubName: `${plan} Club`,
          clubShortName: `${plan}-club`,
          contactEmail: `admin@${plan}.com`,
          contactName: "Admin",
          plan,
        });

        expect(result.success).toBe(true);

        const storedConfig = mockKV.get(`tenant:${plan}-club`);
        const config = JSON.parse(storedConfig!);
        expect(config.metadata.plan).toBe(plan);
      }
    });
  });
});
