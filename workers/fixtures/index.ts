export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);

    if (url.pathname === "/healthz") {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" }
      });
    }

    if (url.pathname === "/refresh" && request.method === "POST") {
      // TODO: fetch fixtures source + cache in KV
      // For now, just acknowledge the refresh request
      return new Response(JSON.stringify({ ok: true, refreshed: true }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    if (url.pathname === "/fixtures.json") {
      const key = "fx:default";
      const cached = await env.KV_FIXTURES.get(key);
      if (cached) {
        return new Response(cached, {
          headers: {
            "content-type": "application/json",
            "cache-control": "public, max-age=300, stale-while-revalidate=600"
          }
        });
      }
      const body = JSON.stringify({ updated_iso: new Date().toISOString(), items: [] });
      await env.KV_FIXTURES.put(key, body, { expirationTtl: Number(env.CACHE_TTL_SECS || 3600) });
      return new Response(body, { headers: { "content-type": "application/json" } });
    }

    // GET /table?league={id}&season={yyyy}
    if (url.pathname === "/table" && request.method === "GET") {
      const league = url.searchParams.get("league") || "default";
      const season = url.searchParams.get("season") || new Date().getFullYear().toString();
      const key = `leagues:${league}:${season}:table`;
      const cached = await env.KV_FIXTURES.get(key);
      if (cached) {
        return new Response(JSON.stringify({ ok: true, data: JSON.parse(cached) }), {
          headers: { "content-type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ ok: false, message: "not cached" }), {
        status: 404,
        headers: { "content-type": "application/json" }
      });
    }

    // GET /fixtures?league={id}&season={yyyy}
    if (url.pathname === "/fixtures" && request.method === "GET") {
      const league = url.searchParams.get("league") || "default";
      const season = url.searchParams.get("season") || new Date().getFullYear().toString();
      const key = `leagues:${league}:${season}:fixtures`;
      const cached = await env.KV_FIXTURES.get(key);
      if (cached) {
        return new Response(JSON.stringify({ ok: true, data: JSON.parse(cached) }), {
          headers: { "content-type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ ok: false, message: "not cached" }), {
        status: 404,
        headers: { "content-type": "application/json" }
      });
    }

    // GET /results?league={id}&season={yyyy}
    if (url.pathname === "/results" && request.method === "GET") {
      const league = url.searchParams.get("league") || "default";
      const season = url.searchParams.get("season") || new Date().getFullYear().toString();
      const key = `leagues:${league}:${season}:results`;
      const cached = await env.KV_FIXTURES.get(key);
      if (cached) {
        return new Response(JSON.stringify({ ok: true, data: JSON.parse(cached) }), {
          headers: { "content-type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ ok: false, message: "not cached" }), {
        status: 404,
        headers: { "content-type": "application/json" }
      });
    }

    // GET /seasons?league={id}
    if (url.pathname === "/seasons" && request.method === "GET") {
      const league = url.searchParams.get("league") || "default";
      const key = `leagues:${league}:seasons`;
      const cached = await env.KV_FIXTURES.get(key);
      if (cached) {
        return new Response(JSON.stringify({ ok: true, data: JSON.parse(cached) }), {
          headers: { "content-type": "application/json" }
        });
      }
      // Default seasons list if not cached
      return new Response(JSON.stringify({ ok: true, data: ["2025", "2024", "2023"] }), {
        headers: { "content-type": "application/json" }
      });
    }

    return new Response("Not found", { status: 404 });
  }
};
