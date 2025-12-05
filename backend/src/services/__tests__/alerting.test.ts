import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sendAlert,
  alertOnSecurityEvent,
  alertOnPerformanceIssue,
  alertOnCriticalError,
  createAlertConfigFromEnv,
  Alert,
  AlertConfig,
} from "../alerting";
import {
  SecurityEvent,
  SecuritySeverity,
  SecurityEventType,
} from "../securityMonitoring";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("Alerting Service", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("sendAlert", () => {
    const testAlert: Alert = {
      title: "Test Alert",
      message: "This is a test alert",
      severity: "warning",
      source: "test",
      timestamp: Date.now(),
    };

    it("sends alert to Slack when configured", async () => {
      const config: AlertConfig = {
        slackWebhookUrl: "https://hooks.slack.com/test",
      };

      const result = await sendAlert(testAlert, config);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://hooks.slack.com/test",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
      expect(result.success).toBe(true);
      expect(result.channels).toContain("slack");
    });

    it("sends alert to Discord when configured", async () => {
      const config: AlertConfig = {
        discordWebhookUrl: "https://discord.com/api/webhooks/test",
      };

      const result = await sendAlert(testAlert, config);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://discord.com/api/webhooks/test",
        expect.objectContaining({
          method: "POST",
        })
      );
      expect(result.success).toBe(true);
      expect(result.channels).toContain("discord");
    });

    it("sends alert to PagerDuty for critical alerts", async () => {
      const criticalAlert: Alert = {
        ...testAlert,
        severity: "critical",
      };
      const config: AlertConfig = {
        pagerdutyRoutingKey: "test-routing-key",
      };

      const result = await sendAlert(criticalAlert, config);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://events.pagerduty.com/v2/enqueue",
        expect.objectContaining({
          method: "POST",
        })
      );
      expect(result.success).toBe(true);
      expect(result.channels).toContain("pagerduty");
    });

    it("sends to multiple channels when configured", async () => {
      const config: AlertConfig = {
        slackWebhookUrl: "https://hooks.slack.com/test",
        discordWebhookUrl: "https://discord.com/api/webhooks/test",
      };

      const result = await sendAlert(testAlert, config);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
      expect(result.channels).toContain("slack");
      expect(result.channels).toContain("discord");
    });

    it("handles fetch failures gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      const config: AlertConfig = {
        slackWebhookUrl: "https://hooks.slack.com/test",
      };

      const result = await sendAlert(testAlert, config);

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Slack alert failed");
    });

    it("returns failure when no channels configured", async () => {
      const result = await sendAlert(testAlert, {});

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.channels).toHaveLength(0);
    });
  });

  describe("alertOnSecurityEvent", () => {
    it("alerts on critical security events", async () => {
      const event: SecurityEvent = {
        timestamp: Date.now(),
        type: SecurityEventType.BRUTE_FORCE_ATTEMPT,
        severity: SecuritySeverity.CRITICAL,
        ip: "192.168.1.1",
        path: "/api/v1/auth/login",
        method: "POST",
        details: { attempts: 10 },
      };
      const config: AlertConfig = {
        slackWebhookUrl: "https://hooks.slack.com/test",
      };

      const result = await alertOnSecurityEvent(event, config);

      expect(result).not.toBeNull();
      expect(result?.success).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
    });

    it("alerts on high severity security events", async () => {
      const event: SecurityEvent = {
        timestamp: Date.now(),
        type: SecurityEventType.UNAUTHORIZED_ACCESS,
        severity: SecuritySeverity.HIGH,
        ip: "192.168.1.1",
        path: "/api/v1/admin",
        method: "GET",
      };
      const config: AlertConfig = {
        slackWebhookUrl: "https://hooks.slack.com/test",
      };

      const result = await alertOnSecurityEvent(event, config);

      expect(result).not.toBeNull();
      expect(result?.success).toBe(true);
    });

    it("does not alert on low severity events", async () => {
      const event: SecurityEvent = {
        timestamp: Date.now(),
        type: SecurityEventType.AUTH_FAILURE,
        severity: SecuritySeverity.LOW,
        ip: "192.168.1.1",
        path: "/api/v1/auth/login",
        method: "POST",
      };
      const config: AlertConfig = {
        slackWebhookUrl: "https://hooks.slack.com/test",
      };

      const result = await alertOnSecurityEvent(event, config);

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("does not alert on info severity events", async () => {
      const event: SecurityEvent = {
        timestamp: Date.now(),
        type: SecurityEventType.AUTH_SUCCESS,
        severity: SecuritySeverity.INFO,
        ip: "192.168.1.1",
        path: "/api/v1/auth/login",
        method: "POST",
      };
      const config: AlertConfig = {
        slackWebhookUrl: "https://hooks.slack.com/test",
      };

      const result = await alertOnSecurityEvent(event, config);

      expect(result).toBeNull();
    });
  });

  describe("alertOnPerformanceIssue", () => {
    it("sends performance alert with correct severity", async () => {
      const config: AlertConfig = {
        slackWebhookUrl: "https://hooks.slack.com/test",
      };

      const result = await alertOnPerformanceIssue(
        "database_query",
        1500,
        500,
        config
      );

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalled();

      // Check that the alert was formatted correctly
      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.attachments[0].blocks[0].text.text).toContain(
        "Performance Degradation"
      );
    });

    it("escalates to error severity for extreme delays", async () => {
      const config: AlertConfig = {
        slackWebhookUrl: "https://hooks.slack.com/test",
      };

      // Duration > threshold * 3 should trigger error severity
      await alertOnPerformanceIssue("slow_operation", 2000, 500, config);

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe("alertOnCriticalError", () => {
    it("sends critical error alert", async () => {
      const error = new Error("Database connection failed");
      const context = { endpoint: "/api/v1/users", method: "GET" };
      const config: AlertConfig = {
        slackWebhookUrl: "https://hooks.slack.com/test",
        pagerdutyRoutingKey: "test-key",
      };

      const result = await alertOnCriticalError(error, context, config);

      expect(result.success).toBe(true);
      // Should send to both Slack and PagerDuty for critical errors
      expect(result.channels).toContain("slack");
      expect(result.channels).toContain("pagerduty");
    });

    it("includes error stack trace in message", async () => {
      const error = new Error("Test error");
      const config: AlertConfig = {
        slackWebhookUrl: "https://hooks.slack.com/test",
      };

      await alertOnCriticalError(error, {}, config);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.attachments[0].blocks[1].text.text).toContain("Stack Trace");
    });
  });

  describe("createAlertConfigFromEnv", () => {
    it("extracts config from environment variables", () => {
      const env = {
        SLACK_WEBHOOK_URL: "https://hooks.slack.com/test",
        DISCORD_WEBHOOK_URL: "https://discord.com/test",
        PAGERDUTY_ROUTING_KEY: "pd-key",
        ALERT_EMAIL: "alerts@example.com",
        RESEND_API_KEY: "resend-key",
      };

      const config = createAlertConfigFromEnv(env);

      expect(config.slackWebhookUrl).toBe("https://hooks.slack.com/test");
      expect(config.discordWebhookUrl).toBe("https://discord.com/test");
      expect(config.pagerdutyRoutingKey).toBe("pd-key");
      expect(config.alertEmail).toBe("alerts@example.com");
      expect(config.resendApiKey).toBe("resend-key");
    });

    it("handles missing environment variables", () => {
      const config = createAlertConfigFromEnv({});

      expect(config.slackWebhookUrl).toBeUndefined();
      expect(config.discordWebhookUrl).toBeUndefined();
      expect(config.pagerdutyRoutingKey).toBeUndefined();
      expect(config.alertEmail).toBeUndefined();
      expect(config.resendApiKey).toBeUndefined();
    });
  });
});
