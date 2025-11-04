/**
 * Security Monitoring Service
 * Comprehensive logging and tracking of security events
 *
 * Features:
 * - Authentication failures tracking
 * - Rate limit violations
 * - JWT revocation attempts
 * - CSRF validation failures
 * - Suspicious activity detection
 * - Security metrics aggregation
 *
 * Integrations:
 * - Cloudflare Analytics
 * - Custom logging to KV
 * - Optional: Sentry, DataDog, etc.
 */

import type { Env } from '../types';
import { logJSON } from '../lib/log';

/**
 * Security Event Types
 */
export enum SecurityEventType {
  // Authentication Events
  AUTH_FAILURE = 'auth_failure',
  AUTH_SUCCESS = 'auth_success',
  JWT_EXPIRED = 'jwt_expired',
  JWT_INVALID = 'jwt_invalid',
  JWT_REVOKED = 'jwt_revoked',

  // Authorization Events
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  FORBIDDEN_ACCESS = 'forbidden_access',
  CROSS_TENANT_ATTEMPT = 'cross_tenant_attempt',

  // Rate Limiting Events
  RATE_LIMIT_IP = 'rate_limit_ip',
  RATE_LIMIT_TENANT = 'rate_limit_tenant',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',

  // CSRF Events
  CSRF_MISSING = 'csrf_missing',
  CSRF_INVALID = 'csrf_invalid',
  CSRF_VALIDATION_SUCCESS = 'csrf_validation_success',

  // File Upload Events
  FILE_VALIDATION_FAILURE = 'file_validation_failure',
  SUSPICIOUS_FILE_UPLOAD = 'suspicious_file_upload',

  // Input Validation Events
  VALIDATION_ERROR = 'validation_error',
  XSS_ATTEMPT = 'xss_attempt',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',

  // Suspicious Activity
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt',
  ACCOUNT_ENUMERATION = 'account_enumeration',
  ANOMALOUS_BEHAVIOR = 'anomalous_behavior',

  // Admin Actions
  ADMIN_LOGIN = 'admin_login',
  ADMIN_ACTION = 'admin_action',
  PRIVILEGE_ESCALATION_ATTEMPT = 'privilege_escalation_attempt',
}

/**
 * Security Event Severity
 */
export enum SecuritySeverity {
  INFO = 'info',      // Normal operation
  LOW = 'low',        // Minor security event
  MEDIUM = 'medium',  // Notable security event
  HIGH = 'high',      // Significant security event
  CRITICAL = 'critical', // Critical security incident
}

/**
 * Security Event
 */
export interface SecurityEvent {
  timestamp: number;
  type: SecurityEventType;
  severity: SecuritySeverity;
  ip: string;
  path: string;
  method: string;
  tenantId?: string;
  userId?: string;
  details?: Record<string, any>;
  userAgent?: string;
  country?: string;
}

/**
 * Security Metrics
 */
export interface SecurityMetrics {
  period: string; // e.g., "2025-11-04T14:00"
  authFailures: number;
  rateLimitHits: number;
  csrfFailures: number;
  unauthorizedAttempts: number;
  suspiciousActivity: number;
  totalEvents: number;
}

/**
 * Log security event
 *
 * @param env - Cloudflare environment bindings
 * @param event - Security event to log
 */
export async function logSecurityEvent(
  env: Env,
  event: SecurityEvent
): Promise<void> {
  // Log to console for Cloudflare Logs
  logJSON({
    level: event.severity === SecuritySeverity.CRITICAL || event.severity === SecuritySeverity.HIGH ? 'error' :
           event.severity === SecuritySeverity.MEDIUM ? 'warn' : 'info',
    msg: 'security_event',
    eventType: event.type,
    severity: event.severity,
    ip: event.ip,
    path: event.path,
    method: event.method,
    tenantId: event.tenantId,
    userId: event.userId,
    ...event.details,
  });

  // Store in KV for querying (last 7 days)
  const kv = env.KV_IDEMP;
  if (!kv) return;

  try {
    // Store with timestamp key for time-series queries
    const eventKey = `security:event:${event.timestamp}:${crypto.randomUUID()}`;
    await kv.put(eventKey, JSON.stringify(event), {
      expirationTtl: 604800, // 7 days
    });

    // Update metrics
    await updateSecurityMetrics(env, event);

    // Check for attack patterns
    await checkAttackPatterns(env, event);
  } catch (error) {
    logJSON({
      level: 'error',
      msg: 'security_event_storage_error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Update security metrics
 */
async function updateSecurityMetrics(
  env: Env,
  event: SecurityEvent
): Promise<void> {
  const kv = env.KV_IDEMP;
  if (!kv) return;

  // Get current hour for metrics bucketing
  const hour = new Date(event.timestamp).toISOString().slice(0, 13) + ':00';
  const metricsKey = `security:metrics:${hour}`;

  try {
    const existing = await kv.get(metricsKey, 'json') as SecurityMetrics | null;
    const metrics: SecurityMetrics = existing || {
      period: hour,
      authFailures: 0,
      rateLimitHits: 0,
      csrfFailures: 0,
      unauthorizedAttempts: 0,
      suspiciousActivity: 0,
      totalEvents: 0,
    };

    // Increment counters based on event type
    metrics.totalEvents++;

    switch (event.type) {
      case SecurityEventType.AUTH_FAILURE:
      case SecurityEventType.JWT_EXPIRED:
      case SecurityEventType.JWT_INVALID:
        metrics.authFailures++;
        break;

      case SecurityEventType.RATE_LIMIT_IP:
      case SecurityEventType.RATE_LIMIT_TENANT:
      case SecurityEventType.RATE_LIMIT_EXCEEDED:
        metrics.rateLimitHits++;
        break;

      case SecurityEventType.CSRF_MISSING:
      case SecurityEventType.CSRF_INVALID:
        metrics.csrfFailures++;
        break;

      case SecurityEventType.UNAUTHORIZED_ACCESS:
      case SecurityEventType.FORBIDDEN_ACCESS:
      case SecurityEventType.CROSS_TENANT_ATTEMPT:
        metrics.unauthorizedAttempts++;
        break;

      case SecurityEventType.BRUTE_FORCE_ATTEMPT:
      case SecurityEventType.ACCOUNT_ENUMERATION:
      case SecurityEventType.XSS_ATTEMPT:
      case SecurityEventType.SQL_INJECTION_ATTEMPT:
        metrics.suspiciousActivity++;
        break;
    }

    // Store metrics (expires after 30 days)
    await kv.put(metricsKey, JSON.stringify(metrics), {
      expirationTtl: 2592000, // 30 days
    });
  } catch (error) {
    logJSON({
      level: 'error',
      msg: 'security_metrics_update_error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Check for attack patterns
 * Detects brute force, enumeration, and other suspicious patterns
 */
async function checkAttackPatterns(
  env: Env,
  event: SecurityEvent
): Promise<void> {
  const kv = env.KV_IDEMP;
  if (!kv) return;

  // Check for brute force attempts (multiple auth failures from same IP)
  if (event.type === SecurityEventType.AUTH_FAILURE) {
    const windowKey = `security:bruteforce:${event.ip}`;

    try {
      const count = await kv.get(windowKey);
      const attempts = count ? parseInt(count, 10) : 0;
      const newAttempts = attempts + 1;

      // Store attempt count (5 minute window)
      await kv.put(windowKey, String(newAttempts), {
        expirationTtl: 300, // 5 minutes
      });

      // Alert if threshold exceeded
      if (newAttempts >= 5) {
        await logSecurityEvent(env, {
          timestamp: Date.now(),
          type: SecurityEventType.BRUTE_FORCE_ATTEMPT,
          severity: SecuritySeverity.HIGH,
          ip: event.ip,
          path: event.path,
          method: event.method,
          tenantId: event.tenantId,
          details: {
            attempts: newAttempts,
            window: '5 minutes',
          },
        });

        // Could trigger additional actions:
        // - Block IP temporarily
        // - Send alert to security team
        // - Trigger MFA requirement
      }
    } catch (error) {
      // Fail silently
    }
  }

  // Check for account enumeration (repeated attempts on different accounts)
  if (event.type === SecurityEventType.AUTH_FAILURE && event.userId) {
    const enumerationKey = `security:enumeration:${event.ip}`;

    try {
      const data = await kv.get(enumerationKey, 'json') as { userIds: string[] } | null;
      const userIds = data?.userIds || [];

      if (!userIds.includes(event.userId)) {
        userIds.push(event.userId);
      }

      await kv.put(enumerationKey, JSON.stringify({ userIds }), {
        expirationTtl: 600, // 10 minutes
      });

      // Alert if trying many different accounts
      if (userIds.length >= 10) {
        await logSecurityEvent(env, {
          timestamp: Date.now(),
          type: SecurityEventType.ACCOUNT_ENUMERATION,
          severity: SecuritySeverity.MEDIUM,
          ip: event.ip,
          path: event.path,
          method: event.method,
          details: {
            uniqueAccounts: userIds.length,
            window: '10 minutes',
          },
        });
      }
    } catch (error) {
      // Fail silently
    }
  }
}

/**
 * Get security metrics for a time period
 *
 * @param env - Cloudflare environment bindings
 * @param hours - Number of hours to look back (default 24)
 * @returns Array of security metrics
 */
export async function getSecurityMetrics(
  env: Env,
  hours: number = 24
): Promise<SecurityMetrics[]> {
  const kv = env.KV_IDEMP;
  if (!kv) return [];

  const metrics: SecurityMetrics[] = [];
  const now = Date.now();

  for (let i = 0; i < hours; i++) {
    const hour = new Date(now - i * 3600000).toISOString().slice(0, 13) + ':00';
    const metricsKey = `security:metrics:${hour}`;

    try {
      const data = await kv.get(metricsKey, 'json') as SecurityMetrics | null;
      if (data) {
        metrics.push(data);
      }
    } catch (error) {
      // Skip this hour if error
    }
  }

  return metrics;
}

/**
 * Get recent security events
 *
 * @param env - Cloudflare environment bindings
 * @param limit - Maximum events to return (default 100)
 * @param filter - Optional filter by type or severity
 * @returns Array of security events
 */
export async function getRecentSecurityEvents(
  env: Env,
  limit: number = 100,
  filter?: {
    type?: SecurityEventType;
    severity?: SecuritySeverity;
    tenantId?: string;
    ip?: string;
  }
): Promise<SecurityEvent[]> {
  const kv = env.KV_IDEMP;
  if (!kv) return [];

  try {
    // List events from KV
    const list = await kv.list({ prefix: 'security:event:', limit });
    const events: SecurityEvent[] = [];

    for (const key of list.keys) {
      const event = await kv.get(key.name, 'json') as SecurityEvent | null;
      if (!event) continue;

      // Apply filters
      if (filter) {
        if (filter.type && event.type !== filter.type) continue;
        if (filter.severity && event.severity !== filter.severity) continue;
        if (filter.tenantId && event.tenantId !== filter.tenantId) continue;
        if (filter.ip && event.ip !== filter.ip) continue;
      }

      events.push(event);
    }

    // Sort by timestamp (newest first)
    events.sort((a, b) => b.timestamp - a.timestamp);

    return events;
  } catch (error) {
    logJSON({
      level: 'error',
      msg: 'security_events_fetch_error',
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Get security summary for dashboard
 */
export async function getSecuritySummary(env: Env): Promise<{
  last24Hours: SecurityMetrics;
  topThreats: Array<{ type: SecurityEventType; count: number }>;
  topIPs: Array<{ ip: string; events: number }>;
  recentCritical: SecurityEvent[];
}> {
  const metrics = await getSecurityMetrics(env, 24);
  const events = await getRecentSecurityEvents(env, 1000);

  // Aggregate last 24 hours
  const last24Hours = metrics.reduce((acc, m) => ({
    period: 'Last 24 Hours',
    authFailures: acc.authFailures + m.authFailures,
    rateLimitHits: acc.rateLimitHits + m.rateLimitHits,
    csrfFailures: acc.csrfFailures + m.csrfFailures,
    unauthorizedAttempts: acc.unauthorizedAttempts + m.unauthorizedAttempts,
    suspiciousActivity: acc.suspiciousActivity + m.suspiciousActivity,
    totalEvents: acc.totalEvents + m.totalEvents,
  }), {
    period: 'Last 24 Hours',
    authFailures: 0,
    rateLimitHits: 0,
    csrfFailures: 0,
    unauthorizedAttempts: 0,
    suspiciousActivity: 0,
    totalEvents: 0,
  });

  // Count event types
  const threatCounts = new Map<SecurityEventType, number>();
  const ipCounts = new Map<string, number>();

  for (const event of events) {
    // Count threats
    const count = threatCounts.get(event.type) || 0;
    threatCounts.set(event.type, count + 1);

    // Count IPs
    const ipCount = ipCounts.get(event.ip) || 0;
    ipCounts.set(event.ip, ipCount + 1);
  }

  // Top threats
  const topThreats = Array.from(threatCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Top IPs
  const topIPs = Array.from(ipCounts.entries())
    .map(([ip, events]) => ({ ip, events }))
    .sort((a, b) => b.events - a.events)
    .slice(0, 10);

  // Recent critical events
  const recentCritical = events
    .filter(e => e.severity === SecuritySeverity.CRITICAL)
    .slice(0, 10);

  return {
    last24Hours,
    topThreats,
    topIPs,
    recentCritical,
  };
}

/**
 * Helper: Create security event from request
 */
export function createSecurityEventFromRequest(
  req: Request,
  type: SecurityEventType,
  severity: SecuritySeverity,
  details?: Record<string, any>
): SecurityEvent {
  const url = new URL(req.url);

  return {
    timestamp: Date.now(),
    type,
    severity,
    ip: req.headers.get('CF-Connecting-IP') || 'unknown',
    path: url.pathname,
    method: req.method,
    details,
    userAgent: req.headers.get('User-Agent') || undefined,
    country: req.headers.get('CF-IPCountry') || undefined,
  };
}
