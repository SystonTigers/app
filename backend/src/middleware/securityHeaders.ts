/**
 * Enhanced Security Headers
 * Implements OWASP security best practices
 */

const CONNECT_SRC = [
  "'self'",
  "https://syston-postbus.team-platform-2025.workers.dev",
  "https://api.systontigers.co.uk",
].join(" ");

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

  // Content Security Policy
  "Content-Security-Policy": [
    "default-src 'self'",
    "img-src 'self' https: data:",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'", // Remove unsafe-inline when using styled-components with nonces
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
    headers = developmentSecurityHeaders;
  } else if (environment === 'api') {
    headers = apiSecurityHeaders;
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
    secHeaders = developmentSecurityHeaders;
  } else if (environment === 'api') {
    secHeaders = apiSecurityHeaders;
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
