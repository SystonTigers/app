const ALLOWED = new Set<string>([
  // TODO: replace with real domains:
  "https://app.example.tld",
  "https://admin.example.tld",
  "https://setup.example.tld",
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
