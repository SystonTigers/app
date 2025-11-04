/**
 * Security Dashboard API Routes
 * Admin-only endpoints for security monitoring
 */

import { requireAdmin } from '../services/auth';
import { json } from '../services/util';
import {
  getSecuritySummary,
  getSecurityMetrics,
  getRecentSecurityEvents,
  SecurityEventType,
  SecuritySeverity,
} from '../services/securityMonitoring';
import type { Env } from '../types';

/**
 * GET /api/v1/admin/security/summary
 * Get security dashboard summary
 */
export async function handleSecuritySummary(
  req: Request,
  env: Env,
  corsHdrs: Headers
): Promise<Response> {
  try {
    // Require admin authentication
    await requireAdmin(req, env);

    const summary = await getSecuritySummary(env);

    return json({
      success: true,
      data: summary,
    }, 200, corsHdrs);
  } catch (error) {
    if (error instanceof Response) throw error;

    return json({
      success: false,
      error: {
        code: 'SECURITY_SUMMARY_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch security summary',
      }
    }, 500, corsHdrs);
  }
}

/**
 * GET /api/v1/admin/security/metrics
 * Get security metrics for time period
 *
 * Query params:
 * - hours: Number of hours to look back (default 24, max 168)
 */
export async function handleSecurityMetrics(
  req: Request,
  env: Env,
  corsHdrs: Headers
): Promise<Response> {
  try {
    // Require admin authentication
    await requireAdmin(req, env);

    const url = new URL(req.url);
    const hours = Math.min(parseInt(url.searchParams.get('hours') || '24'), 168);

    const metrics = await getSecurityMetrics(env, hours);

    return json({
      success: true,
      data: {
        metrics,
        period: `${hours} hours`,
      }
    }, 200, corsHdrs);
  } catch (error) {
    if (error instanceof Response) throw error;

    return json({
      success: false,
      error: {
        code: 'SECURITY_METRICS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch security metrics',
      }
    }, 500, corsHdrs);
  }
}

/**
 * GET /api/v1/admin/security/events
 * Get recent security events
 *
 * Query params:
 * - limit: Max events (default 100, max 1000)
 * - type: Filter by event type
 * - severity: Filter by severity
 * - tenantId: Filter by tenant
 * - ip: Filter by IP address
 */
export async function handleSecurityEvents(
  req: Request,
  env: Env,
  corsHdrs: Headers
): Promise<Response> {
  try {
    // Require admin authentication
    await requireAdmin(req, env);

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 1000);
    const type = url.searchParams.get('type') as SecurityEventType | undefined;
    const severity = url.searchParams.get('severity') as SecuritySeverity | undefined;
    const tenantId = url.searchParams.get('tenantId') || undefined;
    const ip = url.searchParams.get('ip') || undefined;

    const events = await getRecentSecurityEvents(env, limit, {
      type,
      severity,
      tenantId,
      ip,
    });

    return json({
      success: true,
      data: {
        events,
        count: events.length,
        filters: { type, severity, tenantId, ip },
      }
    }, 200, corsHdrs);
  } catch (error) {
    if (error instanceof Response) throw error;

    return json({
      success: false,
      error: {
        code: 'SECURITY_EVENTS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch security events',
      }
    }, 500, corsHdrs);
  }
}

/**
 * GET /api/v1/admin/security/event-types
 * Get list of available event types and severities
 */
export async function handleEventTypes(
  req: Request,
  env: Env,
  corsHdrs: Headers
): Promise<Response> {
  try {
    // Require admin authentication
    await requireAdmin(req, env);

    return json({
      success: true,
      data: {
        eventTypes: Object.values(SecurityEventType),
        severities: Object.values(SecuritySeverity),
      }
    }, 200, corsHdrs);
  } catch (error) {
    if (error instanceof Response) throw error;

    return json({
      success: false,
      error: {
        code: 'EVENT_TYPES_ERROR',
        message: 'Failed to fetch event types',
      }
    }, 500, corsHdrs);
  }
}

/**
 * Export security events to CSV
 * GET /api/v1/admin/security/export
 */
export async function handleSecurityExport(
  req: Request,
  env: Env,
  corsHdrs: Headers
): Promise<Response> {
  try {
    // Require admin authentication
    await requireAdmin(req, env);

    const url = new URL(req.url);
    const format = url.searchParams.get('format') || 'csv';
    const hours = Math.min(parseInt(url.searchParams.get('hours') || '24'), 168);

    const events = await getRecentSecurityEvents(env, 10000);

    if (format === 'csv') {
      // Generate CSV
      const csv = [
        'Timestamp,Type,Severity,IP,Path,Method,TenantId,UserId,Details',
        ...events.map(e => [
          new Date(e.timestamp).toISOString(),
          e.type,
          e.severity,
          e.ip,
          e.path,
          e.method,
          e.tenantId || '',
          e.userId || '',
          JSON.stringify(e.details || {}),
        ].join(','))
      ].join('\n');

      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="security-events-${Date.now()}.csv"`,
          ...Object.fromEntries(corsHdrs.entries()),
        }
      });
    } else {
      // JSON format
      return json({
        success: true,
        data: { events },
      }, 200, corsHdrs);
    }
  } catch (error) {
    if (error instanceof Response) throw error;

    return json({
      success: false,
      error: {
        code: 'SECURITY_EXPORT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to export security events',
      }
    }, 500, corsHdrs);
  }
}
