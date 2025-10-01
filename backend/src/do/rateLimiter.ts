export class TenantRateLimiter {
  state: DurableObjectState; storage: DurableObjectStorage;
  constructor(state: DurableObjectState) { this.state = state; this.storage = state.storage; }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname !== "/check") return new Response("not found", { status: 404 });

    const bucket = url.searchParams.get("bucket") || "post";
    const now = Date.now(); const windowMs = 1000; const burst = 5;
    const key = `rl:${bucket}:${Math.floor(now / windowMs)}`;
    let used = (await this.storage.get<number>(key)) ?? 0;

    if (used < burst) {
      await this.storage.put(key, used + 1, { expiration: Math.floor((now + windowMs)/1000) });
      return new Response(JSON.stringify({ ok: true }), {
        headers: {
          "X-RateLimit-Limit": String(burst),
          "X-RateLimit-Remaining": String(burst-(used+1)),
          "X-RateLimit-Reset": "1"
        }
      });
    }

    return new Response(JSON.stringify({ ok: false }), {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(burst),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": "1"
      }
    });
  }
}
