import { describe, it, expect, beforeEach, vi } from "vitest";
import { Env } from "../../types/env";
import {
  handleSecuritySummary,
  handleSecurityMetrics,
  handleSecurityEvents,
  handleEventTypes,
  handleSecurityExport,
} from "../securityDashboard";
import { issuePlatformAdminJWT } from "../../services/jwt";

// Mock security monitoring service
vi.mock("../../services/securityMonitoring", () => ({
  getSecuritySummary: vi.fn(async () => ({
    totalEvents: 150,
    criticalEvents: 5,
    highSeverityEvents: 20,
    blockedIPs: 3,
    suspiciousActivity: 12,
    lastUpdated: Date.now(),
  })),
  getSecurityMetrics: vi.fn(async (env, hours) => ({
    period: hours || 24,
    events: [
      { timestamp: Date.now() - 3600000, count: 10 },
      { timestamp: Date.now() - 7200000, count: 8 },
    ],
    totalEvents: 18,
    averagePerHour: 0.75,
  })),
  getRecentSecurityEvents: vi.fn(async (env, limit, filters) => {
    const allEvents = [
      {
        id: "event1",
        timestamp: Date.now() - 3600000,
        type: "AUTH_FAILURE",
        severity: "HIGH",
        ip: "192.168.1.100",
        tenantId: "tenant1",
        userId: "user1",
        message: "Failed login attempt",
        metadata: { attempts: 3 },
      },
      {
        id: "event2",
        timestamp: Date.now() - 7200000,
        type: "RATE_LIMIT",
        severity: "MEDIUM",
        ip: "192.168.1.101",
        tenantId: "tenant2",
        message: "Rate limit exceeded",
        metadata: { limit: 100 },
      },
      {
        id: "event3",
        timestamp: Date.now() - 10800000,
        type: "SUSPICIOUS_IP",
        severity: "CRITICAL",
        ip: "10.0.0.50",
        tenantId: "tenant1",
        message: "Suspicious IP blocked",
        metadata: { reason: "blacklisted" },
      },
    ];

    let filtered = allEvents;
    if (filters?.type) {
      filtered = filtered.filter((e) => e.type === filters.type);
    }
    if (filters?.severity) {
      filtered = filtered.filter((e) => e.severity === filters.severity);
    }
    if (filters?.tenantId) {
      filtered = filtered.filter((e) => e.tenantId === filters.tenantId);
    }
    if (filters?.ip) {
      filtered = filtered.filter((e) => e.ip === filters.ip);
    }

    return filtered.slice(0, limit || 50);
  }),
  SecurityEventType: {
    AUTH_FAILURE: "AUTH_FAILURE",
    RATE_LIMIT: "RATE_LIMIT",
    SUSPICIOUS_IP: "SUSPICIOUS_IP",
    INVALID_TOKEN: "INVALID_TOKEN",
  },
  SecuritySeverity: {
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
    CRITICAL: "CRITICAL",
  },
}));

describe("Security Dashboard Routes", () => {
  let env: any;
  let mockDB: any;
  let corsHdrs: Headers;

  beforeEach(() => {
    mockDB = {
      prepare: vi.fn((query: string) => {
        return {
          bind: vi.fn((...params: any[]) => {
            return {
              all: vi.fn(async () => ({ results: [] })),
              first: vi.fn(async () => null),
              run: vi.fn(async () => ({ success: true })),
            };
          }),
          all: vi.fn(async () => ({ results: [] })),
          first: vi.fn(async () => null),
          run: vi.fn(async () => ({ success: true })),
        };
      }),
      batch: vi.fn(async () => []),
    };

    env = {
      DB: mockDB,
      JWT_SECRET: "test-secret-key-at-least-32-characters-long",
      JWT_ISSUER: "test-issuer",
      JWT_AUDIENCE: "syston-mobile",
      ENVIRONMENT: "test",
    } as unknown as Env;
    corsHdrs = new Headers({
      "Access-Control-Allow-Origin": "*",
    });
    vi.clearAllMocks();
  });

  async function createAdminRequest(
    method: string,
    path: string,
    body?: any
  ): Promise<Request> {
    const token = await issuePlatformAdminJWT(env, {
      tenant_id: "test-tenant",
      ttlMinutes: 60,
    });

    const url = new URL(path, "https://example.com");

    return new Request(url.toString(), {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  describe("handleSecuritySummary", () => {
    it("should return security summary for admin", async () => {
      const req = await createAdminRequest(
        "GET",
        "/api/v1/admin/security/summary"
      );

      const response = await handleSecuritySummary(req, env, corsHdrs);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        totalEvents: 150,
        criticalEvents: 5,
        highSeverityEvents: 20,
        blockedIPs: 3,
        suspiciousActivity: 12,
      });
      expect(data.data.lastUpdated).toBeTypeOf("number");
    });

    it("should require admin authentication", async () => {
      const req = new Request("http://localhost/api/v1/admin/security/summary");

      await expect(handleSecuritySummary(req, env, corsHdrs)).rejects.toThrow();
    });
  });

  describe("handleSecurityMetrics", () => {
    it("should return metrics for default 24 hour period", async () => {
      const req = await createAdminRequest(
        "GET",
        "/api/v1/admin/security/metrics"
      );

      const response = await handleSecurityMetrics(req, env, corsHdrs);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.data.period).toBe("24 hours");
      expect(data.data.metrics.events).toHaveLength(2);
      expect(data.data.metrics.totalEvents).toBe(18);
      expect(data.data.metrics.averagePerHour).toBe(0.75);
    });

    it("should accept custom hours parameter", async () => {
      const req = await createAdminRequest(
        "GET",
        "/api/v1/admin/security/metrics?hours=48"
      );

      const response = await handleSecurityMetrics(req, env, corsHdrs);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.data.period).toBe("48 hours");
    });

    it("should cap hours at 168 (7 days)", async () => {
      const req = await createAdminRequest(
        "GET",
        "/api/v1/admin/security/metrics?hours=200"
      );

      const response = await handleSecurityMetrics(req, env, corsHdrs);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.data.period).toBe("168 hours");
    });

    it("should require admin authentication", async () => {
      const req = new Request("http://localhost/api/v1/admin/security/metrics");

      await expect(handleSecurityMetrics(req, env, corsHdrs)).rejects.toThrow();
    });
  });

  describe("handleSecurityEvents", () => {
    it("should return recent security events", async () => {
      const req = await createAdminRequest(
        "GET",
        "/api/v1/admin/security/events"
      );

      const response = await handleSecurityEvents(req, env, corsHdrs);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.events)).toBe(true);
      expect(data.data.events.length).toBeGreaterThan(0);
      expect(data.data.events[0]).toMatchObject({
        id: expect.any(String),
        timestamp: expect.any(Number),
        type: expect.any(String),
        severity: expect.any(String),
        ip: expect.any(String),
        message: expect.any(String),
      });
    });

    it("should filter by event type", async () => {
      const req = await createAdminRequest(
        "GET",
        "/api/v1/admin/security/events?type=AUTH_FAILURE"
      );

      const response = await handleSecurityEvents(req, env, corsHdrs);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.data.events.every((e: any) => e.type === "AUTH_FAILURE")).toBe(
        true
      );
    });

    it("should filter by severity", async () => {
      const req = await createAdminRequest(
        "GET",
        "/api/v1/admin/security/events?severity=CRITICAL"
      );

      const response = await handleSecurityEvents(req, env, corsHdrs);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(
        data.data.events.every((e: any) => e.severity === "CRITICAL")
      ).toBe(true);
    });

    it("should filter by tenantId", async () => {
      const req = await createAdminRequest(
        "GET",
        "/api/v1/admin/security/events?tenantId=tenant1"
      );

      const response = await handleSecurityEvents(req, env, corsHdrs);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(
        data.data.events.every((e: any) => e.tenantId === "tenant1")
      ).toBe(true);
    });

    it("should filter by IP address", async () => {
      const req = await createAdminRequest(
        "GET",
        "/api/v1/admin/security/events?ip=192.168.1.100"
      );

      const response = await handleSecurityEvents(req, env, corsHdrs);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.data.events.every((e: any) => e.ip === "192.168.1.100")).toBe(
        true
      );
    });

    it("should respect limit parameter", async () => {
      const req = await createAdminRequest(
        "GET",
        "/api/v1/admin/security/events?limit=1"
      );

      const response = await handleSecurityEvents(req, env, corsHdrs);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.data.events).toHaveLength(1);
    });

    it("should combine multiple filters", async () => {
      const req = await createAdminRequest(
        "GET",
        "/api/v1/admin/security/events?type=AUTH_FAILURE&tenantId=tenant1"
      );

      const response = await handleSecurityEvents(req, env, corsHdrs);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(
        data.data.events.every(
          (e: any) => e.type === "AUTH_FAILURE" && e.tenantId === "tenant1"
        )
      ).toBe(true);
    });

    it("should require admin authentication", async () => {
      const req = new Request("http://localhost/api/v1/admin/security/events");

      await expect(handleSecurityEvents(req, env, corsHdrs)).rejects.toThrow();
    });
  });

  describe("handleEventTypes", () => {
    it("should return available event types and severities", async () => {
      const req = await createAdminRequest(
        "GET",
        "/api/v1/admin/security/event-types"
      );

      const response = await handleEventTypes(req, env, corsHdrs);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.eventTypes)).toBe(true);
      expect(Array.isArray(data.data.severities)).toBe(true);
      expect(data.data.eventTypes).toContain("AUTH_FAILURE");
      expect(data.data.eventTypes).toContain("RATE_LIMIT");
      expect(data.data.severities).toContain("LOW");
      expect(data.data.severities).toContain("HIGH");
    });

    it("should require admin authentication", async () => {
      const req = new Request(
        "http://localhost/api/v1/admin/security/event-types"
      );

      await expect(handleEventTypes(req, env, corsHdrs)).rejects.toThrow();
    });
  });

  describe("handleSecurityExport", () => {
    it("should export security events as CSV", async () => {
      const req = await createAdminRequest(
        "GET",
        "/api/v1/admin/security/export?format=csv"
      );

      const response = await handleSecurityExport(req, env, corsHdrs);
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("text/csv");
      expect(response.headers.get("Content-Disposition")).toContain(
        "attachment"
      );

      const csv = await response.text();
      expect(csv).toContain("Timestamp");
      expect(csv).toContain("Type");
      expect(csv).toContain("Severity");
    });

    it("should export security events as JSON", async () => {
      const req = await createAdminRequest(
        "GET",
        "/api/v1/admin/security/export?format=json"
      );

      const response = await handleSecurityExport(req, env, corsHdrs);
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("application/json");

      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.events)).toBe(true);
    });

    it("should default to CSV format", async () => {
      const req = await createAdminRequest(
        "GET",
        "/api/v1/admin/security/export"
      );

      const response = await handleSecurityExport(req, env, corsHdrs);
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("text/csv");
    });

    it("should respect hours parameter for export", async () => {
      const req = await createAdminRequest(
        "GET",
        "/api/v1/admin/security/export?format=json&hours=48"
      );

      const response = await handleSecurityExport(req, env, corsHdrs);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.success).toBe(true);
    });

    it("should require admin authentication", async () => {
      const req = new Request("http://localhost/api/v1/admin/security/export");

      await expect(handleSecurityExport(req, env, corsHdrs)).rejects.toThrow();
    });
  });

  describe("Edge Cases and Integration", () => {
    it("should handle empty event results gracefully", async () => {
      const { getRecentSecurityEvents } = await import(
        "../../services/securityMonitoring"
      );
      vi.mocked(getRecentSecurityEvents).mockResolvedValueOnce([]);

      const req = await createAdminRequest(
        "GET",
        "/api/v1/admin/security/events"
      );

      const response = await handleSecurityEvents(req, env, corsHdrs);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.data.events).toEqual([]);
    });

    it("should handle CSV export with special characters", async () => {
      const { getRecentSecurityEvents } = await import(
        "../../services/securityMonitoring"
      );
      vi.mocked(getRecentSecurityEvents).mockResolvedValueOnce([
        {
          id: "event1",
          timestamp: Date.now(),
          type: "AUTH_FAILURE",
          severity: "HIGH",
          ip: "192.168.1.100",
          path: "/api/auth",
          method: "POST",
          tenantId: "tenant1",
          details: { message: 'Message with "quotes" and, commas' },
        },
      ]);

      const req = await createAdminRequest(
        "GET",
        "/api/v1/admin/security/export?format=csv"
      );

      const response = await handleSecurityExport(req, env, corsHdrs);
      expect(response.status).toBe(200);

      const csv = await response.text();
      // The details field is JSON.stringify'd, so check for the JSON representation
      expect(csv).toContain('{"message":"Message with \\"quotes\\" and, commas"}');
    });

    it("should apply multiple filters correctly", async () => {
      const req = await createAdminRequest(
        "GET",
        "/api/v1/admin/security/events?type=SUSPICIOUS_IP&severity=CRITICAL&tenantId=tenant1"
      );

      const response = await handleSecurityEvents(req, env, corsHdrs);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(
        data.data.events.every(
          (e: any) =>
            e.type === "SUSPICIOUS_IP" &&
            e.severity === "CRITICAL" &&
            e.tenantId === "tenant1"
        )
      ).toBe(true);
    });
  });
});
