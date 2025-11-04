/**
 * CSRF (Cross-Site Request Forgery) Protection
 * Implements double-submit cookie pattern for CSRF token validation
 *
 * Usage:
 * 1. Generate a CSRF token when rendering forms
 * 2. Include token in form as hidden field or header
 * 3. Validate token on form submission
 */

import type { Env } from "../types";
import { logJSON } from "../lib/log";

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_FORM_FIELD = "csrf_token";

/**
 * Generate a cryptographically secure random token
 */
function generateSecureToken(): string {
  const array = new Uint8Array(CSRF_TOKEN_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a CSRF token and store it
 * Returns both the token and Set-Cookie header
 *
 * @param env - Cloudflare environment bindings
 * @param sessionId - Optional session identifier (user ID or session ID)
 * @returns Object containing token and cookie header
 *
 * @example
 * ```typescript
 * const { token, cookieHeader } = await generateCsrfToken(env, userId);
 * // Include token in form: <input type="hidden" name="csrf_token" value="{token}" />
 * // Set cookie: headers.set('Set-Cookie', cookieHeader);
 * ```
 */
export async function generateCsrfToken(
  env: Env,
  sessionId?: string
): Promise<{ token: string; cookieHeader: string }> {
  const token = generateSecureToken();
  const kv = env.KV_IDEMP;

  // Store token in KV for server-side validation (optional, for stateful validation)
  if (kv && sessionId) {
    const key = `csrf:${sessionId}:${token}`;
    // Token expires in 1 hour
    await kv.put(key, JSON.stringify({
      token,
      sessionId,
      createdAt: Date.now(),
    }), { expirationTtl: 3600 });
  }

  // Create cookie (SameSite=Strict for CSRF protection)
  const cookieHeader = [
    `${CSRF_COOKIE_NAME}=${token}`,
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    'Path=/',
    'Max-Age=3600', // 1 hour
  ].join('; ');

  return { token, cookieHeader };
}

/**
 * Extract CSRF token from request
 * Checks header first, then form body
 */
function extractCsrfToken(req: Request, body?: any): string | null {
  // Check header first (for AJAX requests)
  const headerToken = req.headers.get(CSRF_HEADER_NAME);
  if (headerToken) {
    return headerToken;
  }

  // Check form body (for traditional form submissions)
  if (body && typeof body === 'object' && CSRF_FORM_FIELD in body) {
    return body[CSRF_FORM_FIELD];
  }

  return null;
}

/**
 * Extract CSRF token from cookie
 */
function extractCsrfCookie(req: Request): string | null {
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

/**
 * Validate CSRF token using double-submit cookie pattern
 * Compares token from request (header/body) with token from cookie
 *
 * @param req - Request object
 * @param env - Cloudflare environment bindings
 * @param body - Optional parsed request body
 * @param sessionId - Optional session identifier for stateful validation
 * @returns true if token is valid, false otherwise
 *
 * @example
 * ```typescript
 * const body = await req.json();
 * const valid = await validateCsrfToken(req, env, body, userId);
 * if (!valid) {
 *   return json({ error: 'Invalid CSRF token' }, 403, corsHdrs);
 * }
 * ```
 */
export async function validateCsrfToken(
  req: Request,
  env: Env,
  body?: any,
  sessionId?: string
): Promise<boolean> {
  // Extract token from request (header or body)
  const requestToken = extractCsrfToken(req, body);
  if (!requestToken) {
    logJSON({
      level: "warn",
      msg: "csrf_token_missing",
      path: new URL(req.url).pathname,
    });
    return false;
  }

  // Extract token from cookie
  const cookieToken = extractCsrfCookie(req);
  if (!cookieToken) {
    logJSON({
      level: "warn",
      msg: "csrf_cookie_missing",
      path: new URL(req.url).pathname,
    });
    return false;
  }

  // Double-submit cookie validation: tokens must match
  if (requestToken !== cookieToken) {
    logJSON({
      level: "warn",
      msg: "csrf_token_mismatch",
      path: new URL(req.url).pathname,
    });
    return false;
  }

  // Optional: Server-side validation (stateful)
  if (env.KV_IDEMP && sessionId) {
    const key = `csrf:${sessionId}:${requestToken}`;
    const stored = await env.KV_IDEMP.get(key);
    if (!stored) {
      logJSON({
        level: "warn",
        msg: "csrf_token_not_found",
        path: new URL(req.url).pathname,
        sessionId,
      });
      return false;
    }
  }

  return true;
}

/**
 * Middleware-style CSRF validation
 * Throws Response with 403 status if validation fails
 *
 * @param req - Request object
 * @param env - Cloudflare environment bindings
 * @param body - Optional parsed request body
 * @param sessionId - Optional session identifier
 * @throws Response with 403 status if CSRF validation fails
 *
 * @example
 * ```typescript
 * const body = await req.json();
 * await requireCsrfToken(req, env, body, userId);
 * // If we reach here, CSRF token is valid
 * ```
 */
export async function requireCsrfToken(
  req: Request,
  env: Env,
  body?: any,
  sessionId?: string
): Promise<void> {
  const valid = await validateCsrfToken(req, env, body, sessionId);
  if (!valid) {
    throw new Response(JSON.stringify({
      success: false,
      error: {
        code: "CSRF_VALIDATION_FAILED",
        message: "Invalid or missing CSRF token"
      }
    }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * Invalidate a CSRF token (e.g., after use)
 * Only needed for stateful validation
 */
export async function invalidateCsrfToken(
  env: Env,
  sessionId: string,
  token: string
): Promise<void> {
  const kv = env.KV_IDEMP;
  if (!kv) return;

  const key = `csrf:${sessionId}:${token}`;
  await kv.delete(key);
}

/**
 * Clear all CSRF tokens for a session
 * Useful on logout or session invalidation
 */
export async function clearCsrfTokens(
  env: Env,
  sessionId: string
): Promise<void> {
  const kv = env.KV_IDEMP;
  if (!kv) return;

  // Note: This requires listing keys with prefix, which can be slow
  // Consider using a different data structure for production (e.g., session-based storage)
  const prefix = `csrf:${sessionId}:`;
  const list = await kv.list({ prefix, limit: 100 });

  for (const key of list.keys) {
    await kv.delete(key.name);
  }
}

/**
 * Get CSRF token info for debugging
 */
export function getCsrfTokenInfo(req: Request, body?: any): {
  requestToken: string | null;
  cookieToken: string | null;
  match: boolean;
} {
  const requestToken = extractCsrfToken(req, body);
  const cookieToken = extractCsrfCookie(req);

  return {
    requestToken,
    cookieToken,
    match: !!(requestToken && cookieToken && requestToken === cookieToken),
  };
}
