// Default allowed origins for production
const DEFAULT_ALLOWED = new Set<string>([
  "https://app.systontigers.co.uk",
  "https://admin.systontigers.co.uk",
  "https://setup.systontigers.co.uk",
  "https://admin-console.team-platform-2025.workers.dev",
  "https://setup-console.team-platform-2025.workers.dev",
  "https://*.vercel.app", // Allow all Vercel deployments
]);

// Development origins (localhost)
const DEV_ORIGINS = new Set<string>([
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:8081",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:8081",
]);

export function corsHeaders(origin: string | null, env?: { CORS_ALLOWED?: string; ENVIRONMENT?: string }) {
  const h = new Headers();

  // Build allowed origins set
  const allowed = new Set<string>(DEFAULT_ALLOWED);

  // In development, allow localhost
  if (env?.ENVIRONMENT === 'development') {
    DEV_ORIGINS.forEach(o => allowed.add(o));
  }

  // Add custom origins from environment variable
  if (env?.CORS_ALLOWED) {
    env.CORS_ALLOWED.split(',').forEach(o => {
      const trimmed = o.trim();
      if (trimmed) allowed.add(trimmed);
    });
  }

  // Check if origin is allowed (exact match or wildcard)
  let allow = "";
  if (origin) {
    if (allowed.has(origin)) {
      allow = origin;
    } else {
      // Check for wildcard patterns like https://*.vercel.app
      for (const pattern of allowed) {
        if (pattern.includes('*')) {
          const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
          if (regex.test(origin)) {
            allow = origin;
            break;
          }
        }
      }
    }
  }

  if (allow) {
    h.set("Access-Control-Allow-Origin", allow);
    h.set("Access-Control-Allow-Credentials", "true"); // Support cookies/auth
  }

  h.set("Vary", "Origin");
  h.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS,PATCH");
  h.set("Access-Control-Allow-Headers", "authorization,content-type,x-tenant-id");
  h.set("Access-Control-Max-Age", "600");

  return h;
}

export function isPreflight(req: Request) {
  return req.method === "OPTIONS";
}
