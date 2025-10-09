const ALLOWED = new Set<string>([
  "https://app.systontigers.co.uk",
  "https://admin.systontigers.co.uk",
  "https://setup.systontigers.co.uk",
  // Add/remove domains carefully; keep this list tight and audited.
]);

export function corsHeaders(origin: string | null) {
  const h = new Headers();
  const allow = origin && ALLOWED.has(origin) ? origin : "";
  if (allow) h.set("Access-Control-Allow-Origin", allow);
  h.set("Vary", "Origin");
  h.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  h.set("Access-Control-Allow-Headers", "authorization,content-type");
  h.set("Access-Control-Max-Age", "600");
  return h;
}

export function isPreflight(req: Request) {
  return req.method === "OPTIONS";
}
