/**
 * Enhanced Security Headers
 * Implements OWASP security best practices with CSP nonce support
 */

const CONNECT_SRC = [
  "'self'",
  "https://syston-postbus.team-platform-2025.workers.dev",
  "https://api.systontigers.co.uk",
].join(" ");

/**
 * Generate a cryptographically secure nonce for CSP
 * Returns a base64-encoded 16-byte random string
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * CSP nonce context for request-scoped nonce management
 */
export interface NonceContext {
  nonce: string;
  scriptNonce: string;
  styleNonce: string;
}

/**
 * Create a new nonce context for a request
 * Use the same nonce for both scripts and styles for simplicity
 */
export function createNonceContext(): NonceContext {
  const nonce = generateNonce();
  return {
    nonce,
    scriptNonce: `'nonce-${nonce}'`,
    styleNonce: `'nonce-${nonce}'`,
  };
}

/**
 * Production security headers - Maximum security
 */
export const securityHeaders = {
  // HSTS - Force HTTPS for 1 year
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",

  // MIME sniffing protection
  "X-Content-Type-Options": "nosniff",

  // Clickjacking protection
  "X-Frame-Options": "DENY",

  // Referrer policy - Don't send referrer to external sites
  "Referrer-Policy": "strict-origin-when-cross-origin",

  // Cross-Origin policies
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cross-Origin-Resource-Policy": "same-origin",

  // XSS Protection (deprecated but still used by some browsers)
  "X-XSS-Protection": "1; mode=block",

  // Permissions Policy - Restrict browser features
  "Permissions-Policy": [
    "geolocation=(self)",
    "microphone=()",
    "camera=()",
    "payment=()",
    "usb=()",
    "magnetometer=()",
    "gyroscope=()",
    "accelerometer=()",
    "fullscreen=(self)",
  ].join(", "),

  // Content Security Policy (static - use generateCSPWithNonce for dynamic)
  "Content-Security-Policy": [
    "default-src 'self'",
    "img-src 'self' https: data:",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'", // Fallback - use generateCSPWithNonce for nonce-based
    `connect-src ${CONNECT_SRC}`,
    "font-src 'self' https:",
    "object-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; "),
} as const;

/**
 * Generate Content-Security-Policy header with nonce
 * Use this for HTML responses that include inline scripts/styles
 *
 * @param nonceContext - The nonce context for this request
 * @returns CSP header value with nonce directives
 *
 * @example
 * ```typescript
 * const nonceCtx = createNonceContext();
 * const csp = generateCSPWithNonce(nonceCtx);
 * // Use nonceCtx.nonce in HTML: <script nonce="${nonceCtx.nonce}">...</script>
 * ```
 */
export function generateCSPWithNonce(nonceContext: NonceContext): string {
  return [
    "default-src 'self'",
    "img-src 'self' https: data:",
    `script-src 'self' ${nonceContext.scriptNonce}`,
    `style-src 'self' ${nonceContext.styleNonce}`,
    `connect-src ${CONNECT_SRC}`,
    "font-src 'self' https:",
    "object-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

/**
 * Development security headers - Relaxed for debugging
 */
export const developmentSecurityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN", // Allow same-origin framing for dev tools
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-XSS-Protection": "1; mode=block",

  // Relaxed CSP for development
  "Content-Security-Policy": [
    "default-src 'self'",
    "img-src 'self' https: data: blob:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Allow inline scripts for hot reload
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self' http://localhost:* ws://localhost:* wss://localhost:*",
    "font-src 'self' https: data:",
    "object-src 'none'",
    "base-uri 'self'",
  ].join("; "),
} as const;

/**
 * API security headers - Minimal headers for JSON APIs
 */
export const apiSecurityHeaders = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "X-XSS-Protection": "1; mode=block",
  "Cross-Origin-Resource-Policy": "cross-origin", // Allow cross-origin for API
} as const;

/**
 * Apply security headers to ResponseInit
 */
export function withSecurity(init: ResponseInit = {}, environment?: string): ResponseInit {
  const h = new Headers(init.headers || {});

  // Choose appropriate headers based on environment
  let headers = securityHeaders;
  if (environment === 'development') {
    headers = developmentSecurityHeaders as unknown as typeof securityHeaders;
  } else if (environment === 'api') {
    headers = apiSecurityHeaders as unknown as typeof securityHeaders;
  }

  for (const [k, v] of Object.entries(headers)) {
    h.set(k, v);
  }

  return { ...init, headers: h };
}

/**
 * Apply security headers to existing Response
 */
export function addSecurityHeaders(response: Response, environment?: string): Response {
  const headers = new Headers(response.headers);

  // Choose appropriate headers based on environment
  let secHeaders = securityHeaders;
  if (environment === 'development') {
    secHeaders = developmentSecurityHeaders as unknown as typeof securityHeaders;
  } else if (environment === 'api') {
    secHeaders = apiSecurityHeaders as unknown as typeof securityHeaders;
  }

  for (const [k, v] of Object.entries(secHeaders)) {
    headers.set(k, v);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
