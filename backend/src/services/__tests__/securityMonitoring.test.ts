import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  SecurityEventType,
  SecuritySeverity,
  logSecurityEvent,
  getSecurityMetrics,
  getRecentSecurityEvents,
  getSecuritySummary,
  createSecurityEventFromRequest,
  type SecurityEvent,
  type SecurityMetrics,
} from "../securityMonitoring";

describe("Security Monitoring Service", () => {
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
        put: async (key: string, value: string, options?: any) => {
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

  describe("logSecurityEvent", () => {
    it("logs security event to KV storage", async () => {
      const event: SecurityEvent = {
        timestamp: Date.now(),
        type: SecurityEventType.AUTH_FAILURE,
        severity: SecuritySeverity.LOW,
        ip: "1.2.3.4",
        path: "/api/auth",
        method: "POST",
        tenantId: "tenant-123",
        userId: "user-456",
      };

      await logSecurityEvent(mockEnv, event);

      // Should store event with timestamp-based key
      const eventKeys = Array.from(mockKV.keys()).filter((k) =>
        k.startsWith("security:event:")
      );
      expect(eventKeys.length).toBeGreaterThan(0);

      const storedEvent = JSON.parse(mockKV.get(eventKeys[0])!);
      expect(storedEvent.type).toBe(SecurityEventType.AUTH_FAILURE);
      expect(storedEvent.ip).toBe("1.2.3.4");
    });

    it("updates security metrics when logging event", async () => {
      const event: SecurityEvent = {
        timestamp: Date.now(),
        type: SecurityEventType.AUTH_FAILURE,
        severity: SecuritySeverity.LOW,
        ip: "1.2.3.4",
        path: "/api/auth",
        method: "POST",
      };

      await logSecurityEvent(mockEnv, event);

      // Check metrics were updated
      const hour = new Date(event.timestamp).toISOString().slice(0, 13) + ":00";
      const metricsKey = `security:metrics:${hour}`;
      const metrics = JSON.parse(mockKV.get(metricsKey)!) as SecurityMetrics;

      expect(metrics.authFailures).toBe(1);
      expect(metrics.totalEvents).toBe(1);
    });

    it("handles missing KV gracefully", async () => {
      const envWithoutKV = { KV_IDEMP: null };
      const event: SecurityEvent = {
        timestamp: Date.now(),
        type: SecurityEventType.AUTH_FAILURE,
        severity: SecuritySeverity.LOW,
        ip: "1.2.3.4",
        path: "/api/auth",
        method: "POST",
      };

      await expect(
        logSecurityEvent(envWithoutKV, event)
      ).resolves.not.toThrow();
    });

    it("detects brute force attempts after 5 failures", async () => {
      const ip = "1.2.3.4";

      // Log 5 auth failures from same IP
      for (let i = 0; i < 5; i++) {
        const event: SecurityEvent = {
          timestamp: Date.now(),
          type: SecurityEventType.AUTH_FAILURE,
          severity: SecuritySeverity.LOW,
          ip,
          path: "/api/auth",
          method: "POST",
        };

        await logSecurityEvent(mockEnv, event);
      }

      // Should have created brute force event
      const events = Array.from(mockKV.entries()).filter(
        ([key]) => key.startsWith("security:event:")
      );

      const bruteForceEvent = events.find(([_, value]) => {
        const evt = JSON.parse(value) as SecurityEvent;
        return evt.type === SecurityEventType.BRUTE_FORCE_ATTEMPT;
      });

      expect(bruteForceEvent).toBeTruthy();
    });

    it("detects account enumeration after 10 different accounts", async () => {
      const ip = "1.2.3.4";

      // Try 10 different user IDs
      for (let i = 0; i < 10; i++) {
        const event: SecurityEvent = {
          timestamp: Date.now(),
          type: SecurityEventType.AUTH_FAILURE,
          severity: SecuritySeverity.LOW,
          ip,
          path: "/api/auth",
          method: "POST",
          userId: `user-${i}`,
        };

        await logSecurityEvent(mockEnv, event);
      }

      // Should have created enumeration event
      const events = Array.from(mockKV.entries()).filter(
        ([key]) => key.startsWith("security:event:")
      );

      const enumerationEvent = events.find(([_, value]) => {
        const evt = JSON.parse(value) as SecurityEvent;
        return evt.type === SecurityEventType.ACCOUNT_ENUMERATION;
      });

      expect(enumerationEvent).toBeTruthy();
    });

    it("increments different metric counters for different event types", async () => {
      const hour = new Date().toISOString().slice(0, 13) + ":00";
      const timestamp = Date.now();

      // Auth failure
      await logSecurityEvent(mockEnv, {
        timestamp,
        type: SecurityEventType.AUTH_FAILURE,
        severity: SecuritySeverity.LOW,
        ip: "1.2.3.4",
        path: "/api/auth",
        method: "POST",
      });

      // Rate limit
      await logSecurityEvent(mockEnv, {
        timestamp,
        type: SecurityEventType.RATE_LIMIT_IP,
        severity: SecuritySeverity.MEDIUM,
        ip: "1.2.3.4",
        path: "/api/test",
        method: "GET",
      });

      // CSRF failure
      await logSecurityEvent(mockEnv, {
        timestamp,
        type: SecurityEventType.CSRF_INVALID,
        severity: SecuritySeverity.MEDIUM,
        ip: "1.2.3.4",
        path: "/api/submit",
        method: "POST",
      });

      const metricsKey = `security:metrics:${hour}`;
      const metrics = JSON.parse(mockKV.get(metricsKey)!) as SecurityMetrics;

      expect(metrics.authFailures).toBe(1);
      expect(metrics.rateLimitHits).toBe(1);
      expect(metrics.csrfFailures).toBe(1);
      expect(metrics.totalEvents).toBe(3);
    });
  });

  describe("getSecurityMetrics", () => {
    it("returns security metrics for specified hours", async () => {
      const now = Date.now();
      const hour1 = new Date(now).toISOString().slice(0, 13) + ":00";
      const hour2 = new Date(now - 3600000).toISOString().slice(0, 13) + ":00";

      // Create metrics for two hours
      mockKV.set(
        `security:metrics:${hour1}`,
        JSON.stringify({
          period: hour1,
          authFailures: 5,
          rateLimitHits: 2,
          csrfFailures: 1,
          unauthorizedAttempts: 0,
          suspiciousActivity: 0,
          totalEvents: 8,
        })
      );

      mockKV.set(
        `security:metrics:${hour2}`,
        JSON.stringify({
          period: hour2,
          authFailures: 3,
          rateLimitHits: 1,
          csrfFailures: 0,
          unauthorizedAttempts: 2,
          suspiciousActivity: 1,
          totalEvents: 7,
        })
      );

      const metrics = await getSecurityMetrics(mockEnv, 2);

      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics.some((m) => m.period === hour1 || m.period === hour2)).toBe(
        true
      );
    });

    it("returns empty array when KV unavailable", async () => {
      const envWithoutKV = { KV_IDEMP: null };
      const metrics = await getSecurityMetrics(envWithoutKV, 24);

      expect(metrics).toEqual([]);
    });

    it("handles missing hours gracefully", async () => {
      const metrics = await getSecurityMetrics(mockEnv, 48);

      // Should not throw, may return empty array
      expect(Array.isArray(metrics)).toBe(true);
    });
  });

  describe("getRecentSecurityEvents", () => {
    it("returns recent security events", async () => {
      // Store some events
      const event1: SecurityEvent = {
        timestamp: Date.now(),
        type: SecurityEventType.AUTH_FAILURE,
        severity: SecuritySeverity.LOW,
        ip: "1.2.3.4",
        path: "/api/auth",
        method: "POST",
      };

      const event2: SecurityEvent = {
        timestamp: Date.now() + 1000,
        type: SecurityEventType.RATE_LIMIT_IP,
        severity: SecuritySeverity.MEDIUM,
        ip: "5.6.7.8",
        path: "/api/test",
        method: "GET",
      };

      mockKV.set(
        `security:event:${event1.timestamp}:uuid1`,
        JSON.stringify(event1)
      );
      mockKV.set(
        `security:event:${event2.timestamp}:uuid2`,
        JSON.stringify(event2)
      );

      const events = await getRecentSecurityEvents(mockEnv, 100);

      expect(events.length).toBe(2);
      // Should be sorted by timestamp (newest first)
      expect(events[0].timestamp).toBeGreaterThan(events[1].timestamp);
    });

    it("filters events by type", async () => {
      const event1: SecurityEvent = {
        timestamp: Date.now(),
        type: SecurityEventType.AUTH_FAILURE,
        severity: SecuritySeverity.LOW,
        ip: "1.2.3.4",
        path: "/api/auth",
        method: "POST",
      };

      const event2: SecurityEvent = {
        timestamp: Date.now() + 1000,
        type: SecurityEventType.RATE_LIMIT_IP,
        severity: SecuritySeverity.MEDIUM,
        ip: "1.2.3.4",
        path: "/api/test",
        method: "GET",
      };

      mockKV.set(
        `security:event:${event1.timestamp}:uuid1`,
        JSON.stringify(event1)
      );
      mockKV.set(
        `security:event:${event2.timestamp}:uuid2`,
        JSON.stringify(event2)
      );

      const events = await getRecentSecurityEvents(mockEnv, 100, {
        type: SecurityEventType.AUTH_FAILURE,
      });

      expect(events.length).toBe(1);
      expect(events[0].type).toBe(SecurityEventType.AUTH_FAILURE);
    });

    it("filters events by severity", async () => {
      const event1: SecurityEvent = {
        timestamp: Date.now(),
        type: SecurityEventType.AUTH_FAILURE,
        severity: SecuritySeverity.LOW,
        ip: "1.2.3.4",
        path: "/api/auth",
        method: "POST",
      };

      const event2: SecurityEvent = {
        timestamp: Date.now() + 1000,
        type: SecurityEventType.BRUTE_FORCE_ATTEMPT,
        severity: SecuritySeverity.CRITICAL,
        ip: "1.2.3.4",
        path: "/api/auth",
        method: "POST",
      };

      mockKV.set(
        `security:event:${event1.timestamp}:uuid1`,
        JSON.stringify(event1)
      );
      mockKV.set(
        `security:event:${event2.timestamp}:uuid2`,
        JSON.stringify(event2)
      );

      const events = await getRecentSecurityEvents(mockEnv, 100, {
        severity: SecuritySeverity.CRITICAL,
      });

      expect(events.length).toBe(1);
      expect(events[0].severity).toBe(SecuritySeverity.CRITICAL);
    });

    it("filters events by IP address", async () => {
      const event1: SecurityEvent = {
        timestamp: Date.now(),
        type: SecurityEventType.AUTH_FAILURE,
        severity: SecuritySeverity.LOW,
        ip: "1.2.3.4",
        path: "/api/auth",
        method: "POST",
      };

      const event2: SecurityEvent = {
        timestamp: Date.now() + 1000,
        type: SecurityEventType.AUTH_FAILURE,
        severity: SecuritySeverity.LOW,
        ip: "5.6.7.8",
        path: "/api/auth",
        method: "POST",
      };

      mockKV.set(
        `security:event:${event1.timestamp}:uuid1`,
        JSON.stringify(event1)
      );
      mockKV.set(
        `security:event:${event2.timestamp}:uuid2`,
        JSON.stringify(event2)
      );

      const events = await getRecentSecurityEvents(mockEnv, 100, {
        ip: "1.2.3.4",
      });

      expect(events.length).toBe(1);
      expect(events[0].ip).toBe("1.2.3.4");
    });

    it("returns empty array when KV unavailable", async () => {
      const envWithoutKV = { KV_IDEMP: null };
      const events = await getRecentSecurityEvents(envWithoutKV, 100);

      expect(events).toEqual([]);
    });
  });

  describe("getSecuritySummary", () => {
    it("aggregates security data for dashboard", async () => {
      const now = Date.now();
      const hour = new Date(now).toISOString().slice(0, 13) + ":00";

      // Add metrics
      mockKV.set(
        `security:metrics:${hour}`,
        JSON.stringify({
          period: hour,
          authFailures: 10,
          rateLimitHits: 5,
          csrfFailures: 2,
          unauthorizedAttempts: 3,
          suspiciousActivity: 1,
          totalEvents: 21,
        })
      );

      // Add some events
      const event1: SecurityEvent = {
        timestamp: now,
        type: SecurityEventType.AUTH_FAILURE,
        severity: SecuritySeverity.LOW,
        ip: "1.2.3.4",
        path: "/api/auth",
        method: "POST",
      };

      const event2: SecurityEvent = {
        timestamp: now + 1000,
        type: SecurityEventType.BRUTE_FORCE_ATTEMPT,
        severity: SecuritySeverity.CRITICAL,
        ip: "5.6.7.8",
        path: "/api/auth",
        method: "POST",
      };

      mockKV.set(
        `security:event:${event1.timestamp}:uuid1`,
        JSON.stringify(event1)
      );
      mockKV.set(
        `security:event:${event2.timestamp}:uuid2`,
        JSON.stringify(event2)
      );

      const summary = await getSecuritySummary(mockEnv);

      expect(summary.last24Hours).toBeDefined();
      expect(summary.last24Hours.totalEvents).toBeGreaterThan(0);
      expect(summary.topThreats).toBeDefined();
      expect(summary.topIPs).toBeDefined();
      expect(summary.recentCritical).toBeDefined();

      // Should include critical event
      expect(summary.recentCritical.length).toBeGreaterThan(0);
      expect(summary.recentCritical[0].severity).toBe(SecuritySeverity.CRITICAL);
    });

    it("counts threat types correctly", async () => {
      const now = Date.now();

      // Add multiple events of different types
      const event1: SecurityEvent = {
        timestamp: now,
        type: SecurityEventType.AUTH_FAILURE,
        severity: SecuritySeverity.LOW,
        ip: "1.2.3.4",
        path: "/api/auth",
        method: "POST",
      };

      const event2: SecurityEvent = {
        timestamp: now + 1000,
        type: SecurityEventType.AUTH_FAILURE,
        severity: SecuritySeverity.LOW,
        ip: "1.2.3.4",
        path: "/api/auth",
        method: "POST",
      };

      const event3: SecurityEvent = {
        timestamp: now + 2000,
        type: SecurityEventType.RATE_LIMIT_IP,
        severity: SecuritySeverity.MEDIUM,
        ip: "1.2.3.4",
        path: "/api/test",
        method: "GET",
      };

      mockKV.set(
        `security:event:${event1.timestamp}:uuid1`,
        JSON.stringify(event1)
      );
      mockKV.set(
        `security:event:${event2.timestamp}:uuid2`,
        JSON.stringify(event2)
      );
      mockKV.set(
        `security:event:${event3.timestamp}:uuid3`,
        JSON.stringify(event3)
      );

      const summary = await getSecuritySummary(mockEnv);

      // Should have counted AUTH_FAILURE twice
      const authFailureThreat = summary.topThreats.find(
        (t) => t.type === SecurityEventType.AUTH_FAILURE
      );
      expect(authFailureThreat?.count).toBe(2);
    });

    it("tracks top IPs", async () => {
      const now = Date.now();

      // Multiple events from same IP
      for (let i = 0; i < 5; i++) {
        const event: SecurityEvent = {
          timestamp: now + i,
          type: SecurityEventType.AUTH_FAILURE,
          severity: SecuritySeverity.LOW,
          ip: "1.2.3.4",
          path: "/api/auth",
          method: "POST",
        };

        mockKV.set(
          `security:event:${event.timestamp}:uuid${i}`,
          JSON.stringify(event)
        );
      }

      const summary = await getSecuritySummary(mockEnv);

      // Should track this IP
      expect(summary.topIPs.length).toBeGreaterThan(0);
      expect(summary.topIPs[0].ip).toBe("1.2.3.4");
      expect(summary.topIPs[0].events).toBe(5);
    });
  });

  describe("createSecurityEventFromRequest", () => {
    it("creates security event from request", () => {
      const req = new Request("https://example.com/api/test", {
        method: "POST",
        headers: {
          "CF-Connecting-IP": "1.2.3.4",
          "User-Agent": "Mozilla/5.0",
          "CF-IPCountry": "US",
        },
      });

      const event = createSecurityEventFromRequest(
        req,
        SecurityEventType.AUTH_FAILURE,
        SecuritySeverity.LOW,
        { reason: "invalid password" }
      );

      expect(event.type).toBe(SecurityEventType.AUTH_FAILURE);
      expect(event.severity).toBe(SecuritySeverity.LOW);
      expect(event.ip).toBe("1.2.3.4");
      expect(event.path).toBe("/api/test");
      expect(event.method).toBe("POST");
      expect(event.userAgent).toBe("Mozilla/5.0");
      expect(event.country).toBe("US");
      expect(event.details?.reason).toBe("invalid password");
      expect(event.timestamp).toBeDefined();
    });

    it("handles missing Cloudflare headers", () => {
      const req = new Request("https://example.com/api/test", {
        method: "GET",
      });

      const event = createSecurityEventFromRequest(
        req,
        SecurityEventType.RATE_LIMIT_IP,
        SecuritySeverity.MEDIUM
      );

      expect(event.ip).toBe("unknown");
      expect(event.userAgent).toBeUndefined();
      expect(event.country).toBeUndefined();
    });

    it("extracts path correctly from URL", () => {
      const req = new Request("https://example.com/api/v1/users?page=1", {
        method: "GET",
      });

      const event = createSecurityEventFromRequest(
        req,
        SecurityEventType.UNAUTHORIZED_ACCESS,
        SecuritySeverity.MEDIUM
      );

      expect(event.path).toBe("/api/v1/users");
      // Query parameters not included in path
      expect(event.path).not.toContain("?");
    });
  });
});
