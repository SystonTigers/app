// src/middleware/security-headers.ts
// Production security headers (CSP, HSTS, etc.)

/**
 * Add security headers to response
 * Call this on every response before returning
 */
export function addSecurityHeaders(response: Response, env: any): Response {
  const headers = new Headers(response.headers);

  // 1. HSTS - Force HTTPS for 1 year, include subdomains
  headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  // 2. CSP - Content Security Policy
  // Adjust based on your actual domains
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com", // Analytics
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Google Fonts
    "font-src 'self' https://fonts.gstatic.com", // Google Fonts
    "img-src 'self' data: https:", // Allow images from anywhere (adjust as needed)
    "connect-src 'self' https://www.google-analytics.com", // API calls
    "frame-ancestors 'none'", // Prevent clickjacking
    "base-uri 'self'",
    "form-action 'self'",
  ];

  headers.set('Content-Security-Policy', cspDirectives.join('; '));

  // 3. X-Frame-Options - Additional clickjacking protection
  headers.set('X-Frame-Options', 'DENY');

  // 4. X-Content-Type-Options - Prevent MIME sniffing
  headers.set('X-Content-Type-Options', 'nosniff');

  // 5. Referrer-Policy - Control referrer information
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 6. Permissions-Policy - Disable unnecessary browser features
  headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=()'
  );

  // Clone response with new headers
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Get CORS headers based on environment
 * In production: only allow your actual domains
 * In preview/dev: allow localhost
 */
export function getCorsHeaders(request: Request, env: any): Headers {
  const headers = new Headers();
  const origin = request.headers.get('Origin') || '';

  // Production allowed origins
  // TODO: Update with your actual production domains before launch!
  const productionOrigins = [
    'https://team-platform-2025.pages.dev',
    'https://app-fresh.pages.dev',
    // Add your custom domain when ready:
    // 'https://app.your-domain.com',
  ];

  // Preview/dev allowed origins (include localhost)
  const devOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
  ];

  // Determine which origins to allow based on environment
  const isProd = env.ENVIRONMENT === 'production';
  const allowedOrigins = isProd ? productionOrigins : [...productionOrigins, ...devOrigins];

  // Check if request origin is allowed
  if (allowedOrigins.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  } else if (!isProd && origin.startsWith('http://localhost')) {
    // In dev, allow any localhost port
    headers.set('Access-Control-Allow-Origin', origin);
  } else {
    // Deny - but return a valid CORS response to avoid browser errors
    headers.set('Access-Control-Allow-Origin', productionOrigins[0]);
  }

  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tenant');
  headers.set('Access-Control-Max-Age', '86400'); // 24 hours

  return headers;
}

/**
 * Handle OPTIONS preflight requests
 */
export function handleCorsPreFlight(request: Request, env: any): Response {
  const corsHeaders = getCorsHeaders(request, env);
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}
