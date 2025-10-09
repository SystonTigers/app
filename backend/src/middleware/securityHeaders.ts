export const securityHeaders = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
  // Adjust connect-src to include your public API origin(s) if needed:
  "Content-Security-Policy":
    "default-src 'self'; img-src 'self' https: data:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self' https:",
} as const;

export function withSecurity(init: ResponseInit = {}): ResponseInit {
  const h = new Headers(init.headers || {});
  for (const [k, v] of Object.entries(securityHeaders)) h.set(k, v);
  return { ...init, headers: h };
}
