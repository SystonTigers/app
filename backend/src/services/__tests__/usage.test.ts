import { describe, it, expect, beforeEach, vi } from "vitest";
import { allowed, increment, getUsage } from "../usage";

/**
 * Usage Service Tests
 *
 * Tests usage tracking and quota management including checking quotas,
 * incrementing usage, and retrieving usage statistics.
 */
describe("Usage Service", () => {
  let mockEnv: any;
  let mockKV: Map<string, string>;
  let mockDB: any;

  // Helper to get current month key format
  const getCurrentMonthKey = (tenant: string) => {
    const d = new Date();
    return `usage:${tenant}:${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  };

  // Helper to parse Response JSON
  const parseResponse = async (response: Response) => {
    const text = await response.text();
    return JSON.parse(text);
  };

  beforeEach(() => {
    // Create fresh mock environment for each test
    mockKV = new Map();

    // Mock D1 database
    mockDB = {
      prepare: (query: string) => {
        return {
          bind: (tenant: string) => {
            return {
              first: async () => {
                // Simulate different tenants having different usage caps
                if (tenant === "enterprise") {
                  return { usage_cap: 10000 };
                } else if (tenant === "premium") {
                  return { usage_cap: 5000 };
                }
                // Return null for tenants without custom caps
                return null;
              },
            };
          },
        };
      },
    };

    mockEnv = {
      KV: {
        get: async (key: string) => {
          return mockKV.get(key) || null;
        },
        put: async (key: string, value: string, options?: any) => {
          mockKV.set(key, value);
        },
      },
      DB: mockDB,
    };
  });

  describe("allowed()", () => {
    it("allows usage when under cap", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/usage/allowed",
      };

      // Set usage to 100 (under 1000 cap)
      const key = getCurrentMonthKey("syston");
      mockKV.set(key, "100");

      const response = await allowed(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.allowed).toBe(true);
      expect(data.used).toBe(100);
      expect(data.cap).toBe(1000);
      expect(data.remaining).toBe(900);
    });

    it("denies usage when at cap", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/usage/allowed",
      };

      const key = getCurrentMonthKey("syston");
      mockKV.set(key, "1000");

      const response = await allowed(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.allowed).toBe(false);
      expect(data.used).toBe(1000);
      expect(data.cap).toBe(1000);
      expect(data.remaining).toBe(0);
    });

    it("denies usage when over cap", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/usage/allowed",
      };

      const key = getCurrentMonthKey("syston");
      mockKV.set(key, "1500");

      const response = await allowed(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.allowed).toBe(false);
      expect(data.used).toBe(1500);
      expect(data.remaining).toBe(0);
    });

    it("allows usage when no previous usage exists", async () => {
      const mockReq = {
        tenant: "newuser",
        url: "https://api.example.com/usage/allowed",
      };

      const response = await allowed(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.allowed).toBe(true);
      expect(data.used).toBe(0);
      expect(data.cap).toBe(1000);
      expect(data.remaining).toBe(1000);
    });

    it("handles usage at cap boundary", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/usage/allowed",
      };

      const key = getCurrentMonthKey("syston");
      mockKV.set(key, "999");

      const response = await allowed(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.allowed).toBe(true);
      expect(data.used).toBe(999);
      expect(data.remaining).toBe(1);
    });

    it("returns JSON response with correct content-type", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/usage/allowed",
      };

      const response = await allowed(mockReq, mockEnv);

      expect(response.headers.get("content-type")).toBe("application/json");
    });

    it("handles different tenants independently", async () => {
      const tenant1Key = getCurrentMonthKey("tenant1");
      const tenant2Key = getCurrentMonthKey("tenant2");

      mockKV.set(tenant1Key, "100");
      mockKV.set(tenant2Key, "500");

      const response1 = await allowed({ tenant: "tenant1" }, mockEnv);
      const response2 = await allowed({ tenant: "tenant2" }, mockEnv);

      const data1 = await parseResponse(response1);
      const data2 = await parseResponse(response2);

      expect(data1.used).toBe(100);
      expect(data2.used).toBe(500);
    });
  });

  describe("increment()", () => {
    it("increments usage from 0 to 1", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/usage/increment",
      };

      const response = await increment(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.used).toBe(1);

      const key = getCurrentMonthKey("syston");
      expect(mockKV.get(key)).toBe("1");
    });

    it("increments existing usage", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/usage/increment",
      };

      const key = getCurrentMonthKey("syston");
      mockKV.set(key, "50");

      const response = await increment(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.used).toBe(51);
      expect(mockKV.get(key)).toBe("51");
    });

    it("increments multiple times", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/usage/increment",
      };

      await increment(mockReq, mockEnv);
      await increment(mockReq, mockEnv);
      const response = await increment(mockReq, mockEnv);

      const data = await parseResponse(response);
      expect(data.used).toBe(3);
    });

    it("stores value in KV with correct key format", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/usage/increment",
      };

      await increment(mockReq, mockEnv);

      const key = getCurrentMonthKey("syston");
      expect(mockKV.has(key)).toBe(true);
    });

    it("returns JSON response with correct content-type", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/usage/increment",
      };

      const response = await increment(mockReq, mockEnv);

      expect(response.headers.get("content-type")).toBe("application/json");
    });

    it("handles different tenants independently", async () => {
      const mockReq1 = { tenant: "tenant1" };
      const mockReq2 = { tenant: "tenant2" };

      await increment(mockReq1, mockEnv);
      await increment(mockReq1, mockEnv);
      await increment(mockReq2, mockEnv);

      const key1 = getCurrentMonthKey("tenant1");
      const key2 = getCurrentMonthKey("tenant2");

      expect(mockKV.get(key1)).toBe("2");
      expect(mockKV.get(key2)).toBe("1");
    });

    it("can increment beyond cap limit", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/usage/increment",
      };

      const key = getCurrentMonthKey("syston");
      mockKV.set(key, "1500");

      const response = await increment(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.used).toBe(1501);
    });
  });

  describe("getUsage()", () => {
    it("gets current month usage without query parameter", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/usage",
      };

      const key = getCurrentMonthKey("syston");
      mockKV.set(key, "250");

      const response = await getUsage(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.used).toBe(250);
      expect(data.cap).toBe(1000);
      expect(data.remaining).toBe(750);
      expect(data.percentage).toBeCloseTo(25, 1);
    });

    it("gets usage for specific month", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/usage?month=2024-06",
      };

      mockKV.set("usage:syston:2024-06", "500");

      const response = await getUsage(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.month).toBe("2024-06");
      expect(data.used).toBe(500);
      expect(data.percentage).toBeCloseTo(50, 1);
    });

    it("returns zero usage when no data exists", async () => {
      const mockReq = {
        tenant: "newuser",
        url: "https://api.example.com/usage",
      };

      const response = await getUsage(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.used).toBe(0);
      expect(data.remaining).toBe(1000);
      expect(data.percentage).toBe(0);
    });

    it("uses custom usage cap from database for enterprise tenant", async () => {
      const mockReq = {
        tenant: "enterprise",
        url: "https://api.example.com/usage",
      };

      const key = getCurrentMonthKey("enterprise");
      mockKV.set(key, "2000");

      const response = await getUsage(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.cap).toBe(10000);
      expect(data.remaining).toBe(8000);
      expect(data.percentage).toBeCloseTo(20, 1);
    });

    it("uses custom usage cap from database for premium tenant", async () => {
      const mockReq = {
        tenant: "premium",
        url: "https://api.example.com/usage",
      };

      const key = getCurrentMonthKey("premium");
      mockKV.set(key, "3000");

      const response = await getUsage(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.cap).toBe(5000);
      expect(data.remaining).toBe(2000);
      expect(data.percentage).toBeCloseTo(60, 1);
    });

    it("defaults to 1000 cap when tenant not in database", async () => {
      const mockReq = {
        tenant: "basic",
        url: "https://api.example.com/usage",
      };

      const response = await getUsage(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.cap).toBe(1000);
    });

    it("calculates percentage correctly", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/usage",
      };

      const key = getCurrentMonthKey("syston");
      mockKV.set(key, "750");

      const response = await getUsage(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.percentage).toBeCloseTo(75, 1);
    });

    it("caps percentage at 100 when over limit", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/usage",
      };

      const key = getCurrentMonthKey("syston");
      mockKV.set(key, "1500");

      const response = await getUsage(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.percentage).toBe(100);
      expect(data.remaining).toBe(0);
    });

    it("returns JSON response with correct content-type", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/usage",
      };

      const response = await getUsage(mockReq, mockEnv);

      expect(response.headers.get("content-type")).toBe("application/json");
    });

    it("includes month in response", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/usage",
      };

      const response = await getUsage(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.month).toBeTruthy();
      expect(data.month).toMatch(/^\d{4}-\d{2}$/);
    });

    it("returns remaining of 0 when at cap", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/usage",
      };

      const key = getCurrentMonthKey("syston");
      mockKV.set(key, "1000");

      const response = await getUsage(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.remaining).toBe(0);
    });
  });

  describe("Edge Cases & Integration", () => {
    it("handles complete usage workflow", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/usage",
      };

      // Check initial allowed
      let allowedResp = await allowed(mockReq, mockEnv);
      let allowedData = await parseResponse(allowedResp);
      expect(allowedData.allowed).toBe(true);
      expect(allowedData.used).toBe(0);

      // Increment usage
      await increment(mockReq, mockEnv);
      await increment(mockReq, mockEnv);

      // Check allowed again
      allowedResp = await allowed(mockReq, mockEnv);
      allowedData = await parseResponse(allowedResp);
      expect(allowedData.allowed).toBe(true);
      expect(allowedData.used).toBe(2);

      // Get usage stats
      const usageResp = await getUsage(mockReq, mockEnv);
      const usageData = await parseResponse(usageResp);
      expect(usageData.used).toBe(2);
      expect(usageData.percentage).toBeCloseTo(0.2, 1);
    });

    it("handles reaching quota limit", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/usage",
      };

      const key = getCurrentMonthKey("syston");
      mockKV.set(key, "998");

      // Increment to 999
      await increment(mockReq, mockEnv);
      let allowedResp = await allowed(mockReq, mockEnv);
      let allowedData = await parseResponse(allowedResp);
      expect(allowedData.allowed).toBe(true);

      // Increment to 1000
      await increment(mockReq, mockEnv);
      allowedResp = await allowed(mockReq, mockEnv);
      allowedData = await parseResponse(allowedResp);
      expect(allowedData.allowed).toBe(false);
    });

    it("handles multiple tenants with different usage patterns", async () => {
      const tenant1 = { tenant: "tenant1", url: "https://api.example.com/usage" };
      const tenant2 = { tenant: "tenant2", url: "https://api.example.com/usage" };

      // Tenant 1: Low usage
      await increment(tenant1, mockEnv);
      await increment(tenant1, mockEnv);

      // Tenant 2: High usage
      for (let i = 0; i < 50; i++) {
        await increment(tenant2, mockEnv);
      }

      const usage1 = await getUsage(tenant1, mockEnv);
      const usage2 = await getUsage(tenant2, mockEnv);

      const data1 = await parseResponse(usage1);
      const data2 = await parseResponse(usage2);

      expect(data1.used).toBe(2);
      expect(data2.used).toBe(50);
      expect(data1.percentage).toBeCloseTo(0.2, 1);
      expect(data2.percentage).toBeCloseTo(5, 1);
    });

    it("handles querying historical months", async () => {
      const mockReq = {
        tenant: "syston",
        url: "https://api.example.com/usage?month=2024-01",
      };

      mockKV.set("usage:syston:2024-01", "800");

      const response = await getUsage(mockReq, mockEnv);
      const data = await parseResponse(response);

      expect(data.month).toBe("2024-01");
      expect(data.used).toBe(800);
    });

    it("handles enterprise tenant with high usage", async () => {
      const mockReq = {
        tenant: "enterprise",
        url: "https://api.example.com/usage",
      };

      const key = getCurrentMonthKey("enterprise");
      mockKV.set(key, "5000");

      // getUsage() uses DB to get custom cap
      const usageResp = await getUsage(mockReq, mockEnv);
      const usageData = await parseResponse(usageResp);

      expect(usageData.cap).toBe(10000);
      expect(usageData.remaining).toBe(5000);

      // allowed() uses hardcoded cap of 1000, so enterprise with 5000 usage is over limit
      const allowedResp = await allowed(mockReq, mockEnv);
      const allowedData = await parseResponse(allowedResp);

      expect(allowedData.allowed).toBe(false);
      expect(allowedData.cap).toBe(1000);
      expect(allowedData.used).toBe(5000);
    });
  });
});
