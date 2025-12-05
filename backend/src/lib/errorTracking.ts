/**
 * Error Tracking Service
 * Centralized error reporting and monitoring for production
 *
 * Integrates with:
 * - Cloudflare Workers Analytics (via structured logging)
 * - External services (Sentry, Datadog, etc.) via optional webhooks
 */

import { logJSON } from "./log";

export interface ErrorContext {
  requestId?: string;
  userId?: string;
  tenantId?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  timestamp?: string;
  [key: string]: any;
}

export interface TrackedError {
  message: string;
  stack?: string;
  name?: string;
  code?: string;
  statusCode?: number;
  context?: ErrorContext;
}

/**
 * Track and report errors with full context
 * Use this for all caught exceptions that should be monitored
 */
export function trackError(error: Error | unknown, context?: ErrorContext): void {
  const trackedError: TrackedError = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    name: error instanceof Error ? error.name : "UnknownError",
    context: {
      ...context,
      timestamp: new Date().toISOString()
    }
  };

  // Log to Cloudflare Workers Analytics
  logJSON({
    level: "error",
    msg: "error_tracked",
    error: trackedError.message,
    errorName: trackedError.name,
    stack: trackedError.stack,
    ...context,
    alert: true // Flag for monitoring/alerting systems
  });

  // Future: Send to external error tracking service
  // if (env.SENTRY_DSN) {
  //   sendToSentry(trackedError);
  // }
}

/**
 * Track critical errors that require immediate attention
 * These errors should trigger alerts in monitoring systems
 */
export function trackCriticalError(error: Error | unknown, context?: ErrorContext): void {
  const trackedError: TrackedError = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    name: error instanceof Error ? error.name : "CriticalError",
    context: {
      ...context,
      severity: "critical",
      timestamp: new Date().toISOString()
    }
  };

  // Log as error with critical severity and alert flag
  logJSON({
    level: "error",
    msg: "critical_error",
    error: trackedError.message,
    errorName: trackedError.name,
    stack: trackedError.stack,
    ...context,
    severity: "critical",
    alert: true,
    requiresAction: true
  });

  // Future: Send to PagerDuty, Opsgenie, etc. for immediate alerting
}

/**
 * Track authentication/authorization failures
 * Helps detect brute force attacks and unauthorized access attempts
 */
export function trackAuthError(
  type: "login_failed" | "token_invalid" | "unauthorized_access",
  context?: ErrorContext
): void {
  logJSON({
    level: "warn",
    msg: `auth_error_${type}`,
    authErrorType: type,
    ...context,
    alert: type === "unauthorized_access" // Alert on unauthorized access attempts
  });
}

/**
 * Track API errors (5xx responses)
 * Helps monitor API reliability and identify systemic issues
 */
export function trackAPIError(
  endpoint: string,
  statusCode: number,
  error: Error | unknown,
  context?: ErrorContext
): void {
  logJSON({
    level: "error",
    msg: "api_error",
    endpoint,
    statusCode,
    error: error instanceof Error ? error.message : String(error),
    ...context,
    alert: statusCode >= 500 // Alert on 5xx errors
  });
}

/**
 * Track external API failures
 * Monitor third-party service health
 */
export function trackExternalAPIError(
  service: string,
  operation: string,
  error: Error | unknown,
  context?: ErrorContext
): void {
  logJSON({
    level: "error",
    msg: "external_api_error",
    service,
    operation,
    error: error instanceof Error ? error.message : String(error),
    ...context
  });
}

/**
 * Track database errors
 * Critical for monitoring data layer health
 */
export function trackDatabaseError(
  query: string,
  error: Error | unknown,
  context?: ErrorContext
): void {
  // Sanitize query to remove sensitive data
  const sanitizedQuery = query.replace(/VALUES\s*\([^)]+\)/gi, "VALUES (...)");

  logJSON({
    level: "error",
    msg: "database_error",
    query: sanitizedQuery,
    error: error instanceof Error ? error.message : String(error),
    ...context,
    alert: true // Database errors are critical
  });
}

/**
 * Track performance issues
 * Monitor slow operations and potential bottlenecks
 */
export function trackPerformanceIssue(
  operation: string,
  duration: number,
  threshold: number,
  context?: ErrorContext
): void {
  logJSON({
    level: "warn",
    msg: "performance_issue",
    operation,
    duration,
    threshold,
    exceeded: duration - threshold,
    ...context
  });
}

/**
 * Global error handler for unhandled exceptions
 * Call this in the main worker's error boundary
 */
export function handleUncaughtError(error: Error | unknown, request?: Request): void {
  const context: ErrorContext = {
    endpoint: request ? new URL(request.url).pathname : undefined,
    method: request?.method,
    userAgent: request?.headers.get("User-Agent") || undefined,
    ip: request?.headers.get("CF-Connecting-IP") || undefined
  };

  trackCriticalError(error, context);
}

/**
 * Error tracking middleware wrapper
 * Wrap route handlers to automatically track errors
 */
export function withErrorTracking<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  handlerName: string
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      const [request] = args;
      trackError(error, {
        handler: handlerName,
        endpoint: request ? new URL(request.url).pathname : undefined,
        method: request?.method
      });
      throw error;
    }
  }) as T;
}
