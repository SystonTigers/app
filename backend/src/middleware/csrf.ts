/**
 * CSRF Protection Middleware
 * Wrapper around csrf service for easy integration with routes
 */

import { requireCsrfToken, generateCsrfToken } from "../services/csrf";
import type { Env } from "../types";
import { logJSON } from "../lib/log";

/**
 * Middleware to require CSRF token validation on state-changing requests
 * Use this on POST, PUT, PATCH, DELETE routes for web admin
 *
 * @example
 * ```typescript
 * import { withCsrfProtection } from "../middleware/csrf";
 *
 * // In route handler:
 * export async function handleCreateTenant(req: Request, env: Env) {
 *   const body = await req.json();
 *   const sessionId = claims.userId; // or tenantId
 *
 *   // Validate CSRF token
 *   await withCsrfProtection(req, env, body, sessionId);
 *
 *   // If we reach here, CSRF is valid
 *   // ... rest of handler
 * }
 * ```
 */
export async function withCsrfProtection(
  req: Request,
  env: Env,
  body?: any,
  sessionId?: string
): Promise<void> {
  const method = req.method;
  const url = new URL(req.url);

  // Only check CSRF on state-changing methods
  const requiresCsrf = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  if (!requiresCsrf) {
    return; // GET, HEAD, OPTIONS don't need CSRF
  }

  // Skip CSRF for API endpoints (mobile app uses JWT auth)
  // CSRF is primarily for browser-based admin panel
  if (url.pathname.startsWith("/api/v1/")) {
    logJSON({
      level: "debug",
      msg: "csrf_skipped_api_endpoint",
      path: url.pathname,
    });
    return;
  }

  // Require CSRF for web admin routes
  try {
    await requireCsrfToken(req, env, body, sessionId);
  } catch (error) {
    logJSON({
      level: "error",
      msg: "csrf_validation_failed",
      path: url.pathname,
      sessionId,
      status: 403,
    });
    throw error; // Re-throw the 403 response
  }
}

/**
 * Helper to generate CSRF token for forms
 * Call this when rendering admin pages with forms
 *
 * @example
 * ```typescript
 * // In login page handler:
 * const { token, cookieHeader } = await generateCsrfForForm(env, sessionId);
 *
 * // Include in HTML:
 * const html = `
 *   <form method="POST">
 *     <input type="hidden" name="csrf_token" value="${token}" />
 *     ...
 *   </form>
 * `;
 *
 * return new Response(html, {
 *   headers: {
 *     'Content-Type': 'text/html',
 *     'Set-Cookie': cookieHeader,
 *   }
 * });
 * ```
 */
export async function generateCsrfForForm(
  env: Env,
  sessionId?: string
): Promise<{ token: string; cookieHeader: string }> {
  return generateCsrfToken(env, sessionId);
}

/**
 * Check if request is from web admin (needs CSRF) vs API (doesn't need CSRF)
 */
export function isWebAdminRequest(req: Request): boolean {
  const url = new URL(req.url);

  // Web admin paths
  const webAdminPaths = [
    "/admin/",
    "/setup/",
    "/web/",
    "/dashboard/",
  ];

  return webAdminPaths.some(path => url.pathname.startsWith(path));
}

/**
 * Middleware wrapper that conditionally applies CSRF based on request type
 */
export async function csrfMiddleware(
  req: Request,
  env: Env,
  body?: any,
  sessionId?: string
): Promise<void> {
  // Only apply CSRF to web admin requests
  if (!isWebAdminRequest(req)) {
    return;
  }

  await withCsrfProtection(req, env, body, sessionId);
}
