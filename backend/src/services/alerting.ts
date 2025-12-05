/**
 * Alerting Service
 *
 * Sends notifications for critical events to various channels:
 * - Slack webhooks
 * - Discord webhooks
 * - Email (via Resend)
 * - PagerDuty (for critical incidents)
 *
 * Configuration via environment variables:
 * - SLACK_WEBHOOK_URL: Slack incoming webhook URL
 * - DISCORD_WEBHOOK_URL: Discord webhook URL
 * - PAGERDUTY_ROUTING_KEY: PagerDuty service integration key
 * - ALERT_EMAIL: Email address for alerts
 * - RESEND_API_KEY: Resend API key for email alerts
 */

import { logJSON } from "../lib/log";
import { SecurityEvent, SecuritySeverity, SecurityEventType } from "./securityMonitoring";

// =============================================================================
// Types
// =============================================================================

export interface AlertConfig {
  slackWebhookUrl?: string;
  discordWebhookUrl?: string;
  pagerdutyRoutingKey?: string;
  alertEmail?: string;
  resendApiKey?: string;
}

export interface Alert {
  title: string;
  message: string;
  severity: "info" | "warning" | "error" | "critical";
  source: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface AlertResult {
  success: boolean;
  channels: string[];
  errors?: string[];
}

// =============================================================================
// Alert Sending Functions
// =============================================================================

/**
 * Send alert to Slack
 */
async function sendSlackAlert(webhookUrl: string, alert: Alert): Promise<boolean> {
  const color = {
    info: "#36a64f",
    warning: "#ffcc00",
    error: "#ff0000",
    critical: "#8b0000",
  }[alert.severity];

  const emoji = {
    info: ":information_source:",
    warning: ":warning:",
    error: ":x:",
    critical: ":rotating_light:",
  }[alert.severity];

  const payload = {
    attachments: [
      {
        color,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `${emoji} ${alert.title}`,
              emoji: true,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: alert.message,
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `*Source:* ${alert.source} | *Severity:* ${alert.severity.toUpperCase()} | *Time:* <!date^${Math.floor(alert.timestamp / 1000)}^{date_short_pretty} at {time}|${new Date(alert.timestamp).toISOString()}>`,
              },
            ],
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    logJSON({
      level: "error",
      msg: "slack_alert_failed",
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Send alert to Discord
 */
async function sendDiscordAlert(webhookUrl: string, alert: Alert): Promise<boolean> {
  const color = {
    info: 3066993, // Green
    warning: 16776960, // Yellow
    error: 16711680, // Red
    critical: 9109504, // Dark red
  }[alert.severity];

  const emoji = {
    info: "ℹ️",
    warning: "⚠️",
    error: "❌",
    critical: "🚨",
  }[alert.severity];

  const payload = {
    embeds: [
      {
        title: `${emoji} ${alert.title}`,
        description: alert.message,
        color,
        fields: [
          { name: "Source", value: alert.source, inline: true },
          { name: "Severity", value: alert.severity.toUpperCase(), inline: true },
        ],
        timestamp: new Date(alert.timestamp).toISOString(),
        footer: {
          text: "Syston Tigers Alert System",
        },
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    logJSON({
      level: "error",
      msg: "discord_alert_failed",
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Send alert to PagerDuty
 */
async function sendPagerDutyAlert(
  routingKey: string,
  alert: Alert
): Promise<boolean> {
  const severity = {
    info: "info",
    warning: "warning",
    error: "error",
    critical: "critical",
  }[alert.severity] as "info" | "warning" | "error" | "critical";

  const payload = {
    routing_key: routingKey,
    event_action: "trigger",
    dedup_key: `${alert.source}-${alert.title}-${Math.floor(alert.timestamp / 60000)}`,
    payload: {
      summary: `[${alert.severity.toUpperCase()}] ${alert.title}`,
      source: alert.source,
      severity,
      timestamp: new Date(alert.timestamp).toISOString(),
      custom_details: {
        message: alert.message,
        ...alert.metadata,
      },
    },
  };

  try {
    const response = await fetch("https://events.pagerduty.com/v2/enqueue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    logJSON({
      level: "error",
      msg: "pagerduty_alert_failed",
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Send alert via email (using Resend)
 */
async function sendEmailAlert(
  apiKey: string,
  toEmail: string,
  alert: Alert
): Promise<boolean> {
  const severityEmoji = {
    info: "ℹ️",
    warning: "⚠️",
    error: "❌",
    critical: "🚨",
  }[alert.severity];

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${alert.severity === "critical" ? "#8b0000" : alert.severity === "error" ? "#ff0000" : alert.severity === "warning" ? "#ffcc00" : "#36a64f"}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .body { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .metadata { background: #eee; padding: 10px; margin-top: 15px; border-radius: 4px; font-size: 14px; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${severityEmoji} ${alert.title}</h1>
          </div>
          <div class="body">
            <p>${alert.message}</p>
            <div class="metadata">
              <strong>Source:</strong> ${alert.source}<br>
              <strong>Severity:</strong> ${alert.severity.toUpperCase()}<br>
              <strong>Time:</strong> ${new Date(alert.timestamp).toISOString()}
            </div>
          </div>
          <div class="footer">
            Syston Tigers Alert System
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "alerts@systontigers.co.uk",
        to: toEmail,
        subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
        html,
      }),
    });

    return response.ok;
  } catch (error) {
    logJSON({
      level: "error",
      msg: "email_alert_failed",
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

// =============================================================================
// Main Alert Function
// =============================================================================

/**
 * Send alert to all configured channels
 */
export async function sendAlert(
  alert: Alert,
  config: AlertConfig
): Promise<AlertResult> {
  const channels: string[] = [];
  const errors: string[] = [];

  // Determine which channels to use based on severity
  const shouldPagerDuty = alert.severity === "critical" && config.pagerdutyRoutingKey;
  const shouldSlack = config.slackWebhookUrl;
  const shouldDiscord = config.discordWebhookUrl;
  const shouldEmail = (alert.severity === "critical" || alert.severity === "error") &&
                      config.alertEmail && config.resendApiKey;

  // Send to channels in parallel
  const promises: Promise<void>[] = [];

  if (shouldSlack) {
    promises.push(
      sendSlackAlert(config.slackWebhookUrl!, alert).then((success) => {
        if (success) channels.push("slack");
        else errors.push("Slack alert failed");
      })
    );
  }

  if (shouldDiscord) {
    promises.push(
      sendDiscordAlert(config.discordWebhookUrl!, alert).then((success) => {
        if (success) channels.push("discord");
        else errors.push("Discord alert failed");
      })
    );
  }

  if (shouldPagerDuty) {
    promises.push(
      sendPagerDutyAlert(config.pagerdutyRoutingKey!, alert).then((success) => {
        if (success) channels.push("pagerduty");
        else errors.push("PagerDuty alert failed");
      })
    );
  }

  if (shouldEmail) {
    promises.push(
      sendEmailAlert(config.resendApiKey!, config.alertEmail!, alert).then(
        (success) => {
          if (success) channels.push("email");
          else errors.push("Email alert failed");
        }
      )
    );
  }

  await Promise.all(promises);

  const result: AlertResult = {
    success: channels.length > 0,
    channels,
  };

  if (errors.length > 0) {
    result.errors = errors;
  }

  // Log alert result
  logJSON({
    level: result.success ? "info" : "warn",
    msg: "alert_sent",
    title: alert.title,
    severity: alert.severity,
    channels,
    errors: result.errors,
  });

  return result;
}

// =============================================================================
// Security Event Alerts
// =============================================================================

/**
 * Convert security event to alert and send
 */
export async function alertOnSecurityEvent(
  event: SecurityEvent,
  config: AlertConfig
): Promise<AlertResult | null> {
  // Only alert on high/critical severity events
  if (
    event.severity !== SecuritySeverity.HIGH &&
    event.severity !== SecuritySeverity.CRITICAL
  ) {
    return null;
  }

  const alert: Alert = {
    title: getSecurityEventTitle(event.type),
    message: formatSecurityEventMessage(event),
    severity: event.severity === SecuritySeverity.CRITICAL ? "critical" : "error",
    source: "security-monitoring",
    timestamp: event.timestamp,
    metadata: {
      eventType: event.type,
      ip: event.ip,
      path: event.path,
      tenantId: event.tenantId,
      ...event.details,
    },
  };

  return sendAlert(alert, config);
}

/**
 * Get human-readable title for security event type
 */
function getSecurityEventTitle(type: SecurityEventType): string {
  const titles: Record<SecurityEventType, string> = {
    [SecurityEventType.AUTH_FAILURE]: "Authentication Failure",
    [SecurityEventType.AUTH_SUCCESS]: "Authentication Success",
    [SecurityEventType.JWT_EXPIRED]: "JWT Token Expired",
    [SecurityEventType.JWT_INVALID]: "Invalid JWT Token",
    [SecurityEventType.JWT_REVOKED]: "Revoked JWT Token Used",
    [SecurityEventType.UNAUTHORIZED_ACCESS]: "Unauthorized Access Attempt",
    [SecurityEventType.FORBIDDEN_ACCESS]: "Forbidden Access",
    [SecurityEventType.CROSS_TENANT_ATTEMPT]: "Cross-Tenant Access Attempt",
    [SecurityEventType.RATE_LIMIT_IP]: "IP Rate Limit Hit",
    [SecurityEventType.RATE_LIMIT_TENANT]: "Tenant Rate Limit Hit",
    [SecurityEventType.RATE_LIMIT_EXCEEDED]: "Rate Limit Exceeded",
    [SecurityEventType.CSRF_MISSING]: "Missing CSRF Token",
    [SecurityEventType.CSRF_INVALID]: "Invalid CSRF Token",
    [SecurityEventType.CSRF_VALIDATION_SUCCESS]: "CSRF Validation Success",
    [SecurityEventType.FILE_VALIDATION_FAILURE]: "File Validation Failed",
    [SecurityEventType.SUSPICIOUS_FILE_UPLOAD]: "Suspicious File Upload",
    [SecurityEventType.VALIDATION_ERROR]: "Input Validation Error",
    [SecurityEventType.XSS_ATTEMPT]: "XSS Attack Attempt",
    [SecurityEventType.SQL_INJECTION_ATTEMPT]: "SQL Injection Attempt",
    [SecurityEventType.BRUTE_FORCE_ATTEMPT]: "Brute Force Attack Detected",
    [SecurityEventType.ACCOUNT_ENUMERATION]: "Account Enumeration Detected",
    [SecurityEventType.ANOMALOUS_BEHAVIOR]: "Anomalous Behavior Detected",
    [SecurityEventType.ADMIN_LOGIN]: "Admin Login",
    [SecurityEventType.ADMIN_ACTION]: "Admin Action",
    [SecurityEventType.PRIVILEGE_ESCALATION_ATTEMPT]: "Privilege Escalation Attempt",
  };

  return titles[type] || type;
}

/**
 * Format security event details into alert message
 */
function formatSecurityEventMessage(event: SecurityEvent): string {
  const parts = [
    `**Type:** ${event.type}`,
    `**IP Address:** ${event.ip}`,
    `**Path:** ${event.method} ${event.path}`,
  ];

  if (event.tenantId) {
    parts.push(`**Tenant:** ${event.tenantId}`);
  }

  if (event.userId) {
    parts.push(`**User:** ${event.userId}`);
  }

  if (event.country) {
    parts.push(`**Country:** ${event.country}`);
  }

  if (event.details) {
    parts.push(`**Details:** ${JSON.stringify(event.details)}`);
  }

  return parts.join("\n");
}

// =============================================================================
// Performance Alerts
// =============================================================================

/**
 * Send performance degradation alert
 */
export async function alertOnPerformanceIssue(
  operation: string,
  duration: number,
  threshold: number,
  config: AlertConfig
): Promise<AlertResult> {
  const alert: Alert = {
    title: "Performance Degradation Detected",
    message: `The operation "${operation}" took ${duration}ms, exceeding the threshold of ${threshold}ms by ${duration - threshold}ms.`,
    severity: duration > threshold * 3 ? "error" : "warning",
    source: "performance-monitoring",
    timestamp: Date.now(),
    metadata: {
      operation,
      duration,
      threshold,
      exceeded: duration - threshold,
    },
  };

  return sendAlert(alert, config);
}

// =============================================================================
// Error Alerts
// =============================================================================

/**
 * Send critical error alert
 */
export async function alertOnCriticalError(
  error: Error | unknown,
  context: Record<string, unknown>,
  config: AlertConfig
): Promise<AlertResult> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  const alert: Alert = {
    title: "Critical Error Occurred",
    message: `**Error:** ${errorMessage}\n\n**Stack Trace:**\n\`\`\`\n${errorStack || "Not available"}\n\`\`\``,
    severity: "critical",
    source: "error-tracking",
    timestamp: Date.now(),
    metadata: {
      error: errorMessage,
      ...context,
    },
  };

  return sendAlert(alert, config);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create alert config from environment
 */
export function createAlertConfigFromEnv(env: Record<string, string | undefined>): AlertConfig {
  return {
    slackWebhookUrl: env.SLACK_WEBHOOK_URL,
    discordWebhookUrl: env.DISCORD_WEBHOOK_URL,
    pagerdutyRoutingKey: env.PAGERDUTY_ROUTING_KEY,
    alertEmail: env.ALERT_EMAIL,
    resendApiKey: env.RESEND_API_KEY,
  };
}
