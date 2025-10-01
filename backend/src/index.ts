// src/index.ts

import { z } from "zod";
import { PostReqSchema, json, cors, readIdempotencyKey } from "./services/util";
import { requireJWT, hasRole } from "./services/auth";
import { ensureIdempotent } from "./services/idempotency";
import { ensureTenant, setMakeWebhook, updateFlags, putTenantConfig, getTenantConfig } from "./services/tenants";
import { issueTenantAdminJWT } from "./services/jwt";
import type { TenantConfig } from "./types";
import queueWorker from "./queue-consumer";

// Export the Durable Object class so the binding works
export { TenantRateLimiter } from "./do/rateLimiter";

export default {
  async fetch(req: Request, env: any): Promise<Response> {
    const url = new URL(req.url);

    // CORS
    const allowed = env.CORS_ALLOWED ? String(env.CORS_ALLOWED).split(",") : null;
    const corsHdrs = cors(allowed, req.headers.get("origin"));
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHdrs });
    }

    // Health
    if (url.pathname === "/healthz") {
      return json({ ok: true, ts: Date.now() }, 200, corsHdrs);
    }

    const v = env.API_VERSION || "v1";

    // -------- Admin endpoints --------

    // POST /api/v1/admin/tenant/create
    if (url.pathname === `/api/${v}/admin/tenant/create` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const body = await req.json().catch(() => ({}));
      const schema = z.object({
        id: z.string().min(1, "id required"),
        name: z.string().optional(),
        locale: z.string().optional(),
        tz: z.string().optional(),
      });
      const parsed = schema.safeParse(body);
      if (!parsed.success) return json({ success: false, error: { code: "VALIDATION", details: parsed.error.issues } }, 400, corsHdrs);

      const { id, name, locale, tz } = parsed.data;
      const cfg: TenantConfig = {
        id, name, locale, tz,
        flags: { use_make: false, direct_yt: true },
        makeWebhookUrl: null,
      };
      await putTenantConfig(env, cfg);
      return json({ success: true, data: { created: true, tenant: cfg } }, 200, corsHdrs);
    }

    // POST /api/v1/admin/tenant/webhook
    if (url.pathname === `/api/${v}/admin/tenant/webhook` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const body = await req.json().catch(() => ({}));
      const schema = z.object({
        tenant: z.string().min(1),
        make_webhook_url: z.string().url(),
      });
      const parsed = schema.safeParse(body);
      if (!parsed.success) return json({ success: false, error: { code: "VALIDATION", details: parsed.error.issues } }, 400, corsHdrs);

      const { tenant, make_webhook_url } = parsed.data;
      const allowedHosts = (env.ALLOWED_WEBHOOK_HOSTS || "").split(",").map((s: string) => s.trim()).filter(Boolean);
      const host = new URL(make_webhook_url).host;
      if (allowedHosts.length && !allowedHosts.includes(host)) {
        return json({ success: false, error: { code: "VALIDATION", message: `Host ${host} not allowed` } }, 400, corsHdrs);
      }
      const updated = await setMakeWebhook(env, tenant, make_webhook_url);
      return json({ success: true, data: { tenant: updated.id, makeWebhookUrl: updated.makeWebhookUrl } }, 200, corsHdrs);
    }

    // POST /api/v1/admin/fixtures/refresh
    if (url.pathname === `/api/${v}/admin/fixtures/refresh` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const refreshUrl = env.FIXTURES_REFRESH_URL || "";
      if (!refreshUrl) return json({ success: true, data: { pinged: false, note: "No FIXTURES_REFRESH_URL set" } }, 200, corsHdrs);
      const r = await fetch(refreshUrl, { method: "POST" }).catch(() => null);
      const ok = !!r && r.ok;
      return json({ success: ok, data: { pinged: ok } }, ok ? 200 : 502, corsHdrs);
    }

    // POST /api/v1/admin/tenant/invite
    if (url.pathname === `/api/${v}/admin/tenant/invite` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const body = await req.json().catch(() => ({}));
      const schema = z.object({ tenant: z.string().min(1), ttl_minutes: z.number().min(5).max(1440).default(60) });
      const parsed = schema.safeParse(body);
      if (!parsed.success) return json({ success: false, error: { code: "VALIDATION", details: parsed.error.issues } }, 400, corsHdrs);
      const { tenant, ttl_minutes } = parsed.data;

      const cfg = await ensureTenant(env, tenant);
      const token = await issueTenantAdminJWT(env, { tenant_id: cfg.id, ttlMinutes: ttl_minutes });
      const base = env.SETUP_URL || "https://setup.yourbrand.app";
      const setup_url = `${base}/?token=${encodeURIComponent(token)}`;

      return json({ success: true, data: { setup_url } }, 200, corsHdrs);
    }

    // Set tenant flags (existing route, kept for backward compatibility)
    if (url.pathname === `/api/${v}/admin/tenant/flags` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const body = await req.json().catch(() => null);
      if (!body?.tenant || typeof body.flags !== "object") {
        return json({ success: false, error: { code: "VALIDATION", message: "tenant + flags required" } }, 400, corsHdrs);
      }
      const updated = await updateFlags(env, body.tenant, body.flags);
      return json({ success: true, data: { updated: true, flags: updated.flags } }, 200, corsHdrs);
    }

    // Store YouTube OAuth creds (existing route)
    if (url.pathname === `/api/${v}/admin/tenant/youtube-token` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const body = await req.json().catch(() => null);
      if (!body?.tenant || !body?.client_id || !body?.client_secret || !body?.refresh_token) {
        return json({ success: false, error: { code: "VALIDATION", message: "tenant, client_id, client_secret, refresh_token" } }, 400, corsHdrs);
      }
      await env.KV_IDEMP.put(
        `yt:${body.tenant}`,
        JSON.stringify({
          client_id: body.client_id,
          client_secret: body.client_secret,
          refresh_token: body.refresh_token,
          channel_id: body.channel_id || null
        })
      );
      return json({ success: true, data: { stored: true } }, 200, corsHdrs);
    }

    // GET /api/v1/admin/yt/start?tenant=club-123
    // Initiates YouTube OAuth flow for managed plans
    if (url.pathname === `/api/${v}/admin/yt/start` && req.method === "GET") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const tenant = url.searchParams.get("tenant");
      if (!tenant) return json({ success: false, error: { code: "VALIDATION", message: "tenant required" } }, 400, corsHdrs);

      const cid = env.YT_CLIENT_ID as string;
      const redirect = env.YT_REDIRECT_URL as string;
      if (!cid || !redirect) {
        return json({ success: false, error: { code: "CONFIG", message: "YT_CLIENT_ID or YT_REDIRECT_URL not configured" } }, 500, corsHdrs);
      }

      const scope = encodeURIComponent("https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.readonly");
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${encodeURIComponent(cid)}&redirect_uri=${encodeURIComponent(redirect)}&scope=${scope}&access_type=offline&prompt=consent&state=${encodeURIComponent(tenant)}`;
      return json({ success: true, data: { url: authUrl } }, 200, corsHdrs);
    }

    // GET /api/v1/admin/yt/callback?code=...&state=tenant
    // OAuth callback endpoint - exchanges code for tokens
    if (url.pathname === `/api/${v}/admin/yt/callback` && req.method === "GET") {
      const code = url.searchParams.get("code");
      const tenant = url.searchParams.get("state") || "";

      if (!code || !tenant) return new Response("Missing code/state", { status: 400 });

      const cid = env.YT_CLIENT_ID as string;
      const cs = env.YT_CLIENT_SECRET as string;
      const redirect = env.YT_REDIRECT_URL as string;

      const body = new URLSearchParams({
        code,
        client_id: cid,
        client_secret: cs,
        redirect_uri: redirect,
        grant_type: "authorization_code"
      });

      const r = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body
      });

      if (!r.ok) return new Response("Token exchange failed", { status: 502 });

      const tok = await r.json() as any;

      // Store into tenant config
      const cfg = await ensureTenant(env, tenant);
      // @ts-ignore
      cfg.youtube = { ...tok };
      await putTenantConfig(env, cfg);

      return new Response("YouTube connected. You can close this window.", { status: 200 });
    }

    // -------- Tenant self-serve endpoints --------

    // GET /api/v1/tenant/self
    if (url.pathname === `/api/${v}/tenant/self` && req.method === "GET") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "tenant_admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const tenantId = user.tenantId;
      const cfg = await ensureTenant(env, tenantId);
      // Mask webhook
      let masked = null;
      if (cfg.makeWebhookUrl) {
        const end = cfg.makeWebhookUrl.slice(-6);
        masked = `***${end}`;
      }
      return json({ success: true, data: { id: cfg.id, flags: cfg.flags, makeWebhookMasked: masked } }, 200, corsHdrs);
    }

    // POST /api/v1/tenant/self/webhook
    if (url.pathname === `/api/${v}/tenant/self/webhook` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "tenant_admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const tenantId = user.tenantId;
      const body = await req.json().catch(() => ({}));
      const schema = z.object({ make_webhook_url: z.string().url() });
      const parsed = schema.safeParse(body);
      if (!parsed.success) return json({ success: false, error: { code: "VALIDATION", details: parsed.error.issues } }, 400, corsHdrs);

      const allowedHosts = (env.ALLOWED_WEBHOOK_HOSTS || "").split(",").map((s: string) => s.trim()).filter(Boolean);
      const u = new URL(parsed.data.make_webhook_url);
      if (allowedHosts.length && !allowedHosts.includes(u.host)) {
        return json({ success: false, error: { code: "VALIDATION", message: `Host ${u.host} not allowed` } }, 400, corsHdrs);
      }

      await setMakeWebhook(env, tenantId, u.toString());
      return json({ success: true, data: { saved: true } }, 200, corsHdrs);
    }

    // POST /api/v1/tenant/self/flags
    if (url.pathname === `/api/${v}/tenant/self/flags` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "tenant_admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const tenantId = user.tenantId;
      const body = await req.json().catch(() => ({}));
      const schema = z.object({ use_make: z.boolean().optional(), direct_yt: z.boolean().optional() });
      const parsed = schema.safeParse(body);
      if (!parsed.success) return json({ success: false, error: { code: "VALIDATION", details: parsed.error.issues } }, 400, corsHdrs);
      const updated = await updateFlags(env, tenantId, parsed.data);
      return json({ success: true, data: { flags: updated.flags } }, 200, corsHdrs);
    }

    // POST /api/v1/tenant/self/test-webhook
    if (url.pathname === `/api/${v}/tenant/self/test-webhook` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "tenant_admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const tenantId = user.tenantId;
      const cfg = await ensureTenant(env, tenantId);

      if (!cfg.flags.use_make || !cfg.makeWebhookUrl) {
        return json({ success: false, error: { code: "INVALID_STATE", message: "Enable BYO-Make and set webhook first" } }, 400, corsHdrs);
      }
      try {
        const r = await fetch(cfg.makeWebhookUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kind: "test", tenant: tenantId, ts: Date.now() })
        });
        return json({ success: r.ok, data: { status: r.status } }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "UPSTREAM", message: e?.message || "webhook failed" } }, 502, corsHdrs);
      }
    }

    // -------- Stripe Webhook --------
    // POST /api/v1/stripe/webhook
    // Handles Stripe events to update tenant plans
    if (url.pathname === `/api/${v}/stripe/webhook` && req.method === "POST") {
      const evt = await req.json().catch(() => null);
      if (!evt) return new Response("bad json", { status: 400 });

      try {
        const type = evt.type;
        // Determine tenant + plan from metadata or customer mapping
        const tenant = evt.data?.object?.metadata?.tenant || evt.data?.object?.metadata?.tenant_id;
        if (!tenant) return new Response("ok", { status: 200 });

        // Simple example mapping
        if (type === "customer.subscription.created" || type === "customer.subscription.updated") {
          const plan = evt.data.object?.plan?.nickname || evt.data.object?.items?.data?.[0]?.price?.nickname || "";
          const managed = /managed|pro|premium/i.test(plan);
          const cfg = await ensureTenant(env, tenant);
          cfg.flags = { use_make: !managed, direct_yt: managed };
          await putTenantConfig(env, cfg);
        }
      } catch (e) {
        // Swallow errors
      }

      return new Response("ok", { status: 200 });
    }

    // -------- Post Bus --------
    if (url.pathname === `/api/${v}/post` && req.method === "POST") {
      // 1) Auth
      const user = await requireJWT(req, env).catch(() => null);
      if (!user) return json({ success: false, error: { code: "UNAUTHORIZED" } }, 401, corsHdrs);

      // 2) Validate body
      const body = await req.json().catch(() => null);
      const parsed = body ? PostReqSchema.safeParse(body) : { success: false, error: { message: "Invalid JSON" } } as const;
      if (!("success" in parsed) || !parsed.success) {
        return json({ success: false, error: { code: "VALIDATION", message: (parsed as any).error?.message || "Invalid" } }, 400, corsHdrs);
      }

      // 3) Idempotency
      const idemHeader = readIdempotencyKey(req);
      const idem = await ensureIdempotent(env, parsed.data.tenant, parsed.data, idemHeader || undefined);
      if (idem.hit) return json(idem.response, 200, corsHdrs);

      // 4) Enqueue to Cloudflare Queues
      await env.POST_QUEUE.send({
        tenant: parsed.data.tenant,
        template: parsed.data.template,
        channels: parsed.data.channels,
        data: parsed.data.data,
        createdAt: Date.now(),
        idemKey: idem.key
      });

      // 5) Store and return "queued"
      const resp = { success: true, data: { queued: true } };
      await idem.store(resp);
      return json(resp, 202, corsHdrs);
    }

    // Fallback
    return json({ success: false, error: { code: "NOT_FOUND", message: "Route not found" } }, 404, corsHdrs);
  },

  // <- This wires the queue consumer to this worker
  queue: queueWorker.queue
};
