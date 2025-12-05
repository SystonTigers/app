/**
 * Enhanced Security Headers
 * Implements OWASP security best practices
 */

// =============================================================================
// Constants
// =============================================================================

const CONNECT_SRC = [
  "'self'",
  "https://syston-postbus.team-platform-2025.workers.dev",
  "https://api.systontigers.co.uk",
].join(" ");

// =============================================================================
// CSP Nonce Generation
// =============================================================================

/**
 * Generates a cryptographically secure nonce for CSP
 * Uses Web Crypto API which is available in Cloudflare Workers
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16); // 128 bits of entropy
  crypto.getRandomValues(bytes);
  // Convert bytes to base64 without spread operator for compatibility
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Context object containing nonce values for CSP
 */
export interface NonceContext {
  /** Raw nonce value */
  nonce: string;
  /** Formatted for script-src directive: 'nonce-{value}' */
  scriptNonce: string;
  /** Formatted for style-src directive: 'nonce-{value}' */
  styleNonce: string;
}

/**
 * Creates a new nonce context with formatted values for CSP directives
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
 * Generates a CSP header value with nonce-based script and style sources
 * This removes the need for 'unsafe-inline' directives
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

// =============================================================================
// Security Header Configurations
// =============================================================================

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

// =============================================================================
// Nonce-Based Security Headers
// =============================================================================

/**
 * Result of applying nonce-based security headers
 */
export interface NonceSecurityResult {
  /** The ResponseInit with nonce-based CSP applied */
  init: ResponseInit;
  /** The nonce context for use in HTML templates */
  nonceContext: NonceContext;
}

/**
 * Apply nonce-based security headers to ResponseInit
 * Use this for HTML responses where you need to include the nonce in script/style tags
 *
 * @example
 * ```typescript
 * const { init, nonceContext } = withSecurityNonce();
 * const html = `<script nonce="${nonceContext.nonce}">...</script>`;
 * return new Response(html, init);
 * ```
 */
export function withSecurityNonce(init: ResponseInit = {}): NonceSecurityResult {
  const nonceContext = createNonceContext();
  const h = new Headers(init.headers || {});

  // Apply all production security headers except CSP
  for (const [k, v] of Object.entries(securityHeaders)) {
    if (k !== "Content-Security-Policy") {
      h.set(k, v);
    }
  }

  // Apply nonce-based CSP
  h.set("Content-Security-Policy", generateCSPWithNonce(nonceContext));

  return {
    init: { ...init, headers: h },
    nonceContext,
  };
}

/**
 * Apply nonce-based security headers to an existing Response
 * Returns both the modified response and the nonce context for template rendering
 *
 * @example
 * ```typescript
 * const { response, nonceContext } = addSecurityHeadersWithNonce(existingResponse);
 * // Note: HTML content should already include nonce attributes
 * ```
 */
export function addSecurityHeadersWithNonce(response: Response): {
  response: Response;
  nonceContext: NonceContext;
} {
  const nonceContext = createNonceContext();
  const headers = new Headers(response.headers);

  // Apply all production security headers except CSP
  for (const [k, v] of Object.entries(securityHeaders)) {
    if (k !== "Content-Security-Policy") {
      headers.set(k, v);
    }
  }

  // Apply nonce-based CSP
  headers.set("Content-Security-Policy", generateCSPWithNonce(nonceContext));

  return {
    response: new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    }),
    nonceContext,
  };
}

/**
 * Helper to inject nonce into HTML content
 * Replaces __CSP_NONCE__ placeholders with the actual nonce value
 *
 * @example
 * ```typescript
 * const template = '<script nonce="__CSP_NONCE__">...</script>';
 * const html = injectNonceIntoHtml(template, nonceContext.nonce);
 * ```
 */
export function injectNonceIntoHtml(html: string, nonce: string): string {
  return html.replace(/__CSP_NONCE__/g, nonce);
}

/**
 * Complete helper for serving HTML with nonce-based CSP
 * Combines nonce generation, HTML injection, and security headers
 *
 * @example
 * ```typescript
 * const html = '<script nonce="__CSP_NONCE__">alert("Hello")</script>';
 * return createSecureHtmlResponse(html);
 * ```
 */
export function createSecureHtmlResponse(
  htmlTemplate: string,
  init: ResponseInit = {}
): Response {
  const { init: secureInit, nonceContext } = withSecurityNonce(init);
  const html = injectNonceIntoHtml(htmlTemplate, nonceContext.nonce);

  // Ensure content-type is set for HTML
  const headers = new Headers(secureInit.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "text/html; charset=utf-8");
  }

  return new Response(html, {
    ...secureInit,
    headers,
  });
}
