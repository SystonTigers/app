// src/index.ts

import { z } from "zod";
import { PostReqSchema, json, cors, readIdempotencyKey } from "./services/util";
import { requireJWT, hasRole, requireAdmin } from "./services/auth";
import { ensureIdempotent } from "./services/idempotency";
import { ensureTenant, setMakeWebhook, updateFlags, putTenantConfig, getTenantConfig, setTenantFlags, setChannelWebhook, setYouTubeBYOGoogle } from "./services/tenants";
import { issueTenantAdminJWT } from "./services/jwt";
import type { TenantConfig } from "./types";
import queueWorker from "./queue-consumer";
import { putEvent, getEvent, deleteEvent, listEvents, setRsvp, getRsvp, addCheckin, listCheckins } from "./services/events";
import { registerDevice, sendToUser } from "./services/push";
import * as Invites from "./services/invites";
import * as Teams from "./services/teams";
import * as ChatKV from "./services/chatKV";
import * as GalleryKV from "./services/galleryKV";

// Export the Durable Object classes so the binding works
export { TenantRateLimiter } from "./do/rateLimiter";
export { VotingRoom } from "./do/votingRoom";
export { MatchRoom } from "./do/matchRoom";
export { ChatRoom } from "./do/chatRoom";

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

    // Log admin console requests
    if (url.pathname.includes("/admin/")) {
      const fromAdminConsole = req.headers.get("x-admin-console") === "true";
      if (fromAdminConsole) {
        console.log("ADMIN_CONSOLE_CALL", {
          path: url.pathname,
          method: req.method,
          hdr_auth_present: !!req.headers.get("authorization"),
        });
      }
    }

    // -------- Admin debug endpoint --------

    // GET /api/v1/admin/whoami
    if (url.pathname === `/api/${v}/admin/whoami` && req.method === "GET") {
      try {
        const claims = await requireAdmin(req, env);
        return json({ ok: true, claims }, 200, corsHdrs);
      } catch (e: any) {
        if (e instanceof Response) throw e;
        return json({ success: false, error: { code: "INTERNAL", message: e.message } }, 500, corsHdrs);
      }
    }

    // -------- Admin endpoints --------

    // POST /api/v1/admin/tenant/create
    if (url.pathname === `/api/${v}/admin/tenant/create` && req.method === "POST") {
      await requireAdmin(req, env); // throws 403 Response on failure
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
      await requireAdmin(req, env);
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
      await requireAdmin(req, env);
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

    // POST /api/v1/admin/tenant/channel/flags
    // Set per-channel managed toggles
    if (url.pathname === `/api/${v}/admin/tenant/channel/flags` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const body = await req.json().catch(() => ({}));
      const schema = z.object({
        tenant: z.string().min(1),
        managed: z.record(z.boolean()).optional(),
      });
      const parsed = schema.safeParse(body);
      if (!parsed.success) return json({ success: false, error: { code: "VALIDATION", details: parsed.error.issues } }, 400, corsHdrs);

      const { tenant, managed } = parsed.data;
      const updated = await setTenantFlags(env, tenant, { managed });
      return json({ success: true, data: { tenant: updated.id, flags: updated.flags } }, 200, corsHdrs);
    }

    // POST /api/v1/admin/tenant/channel/webhook
    // Set BYO-Make webhook per channel
    if (url.pathname === `/api/${v}/admin/tenant/channel/webhook` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const body = await req.json().catch(() => ({}));
      const schema = z.object({
        tenant: z.string().min(1),
        channel: z.enum(["yt", "fb", "ig", "tiktok", "x"]),
        url: z.string().url(),
      });
      const parsed = schema.safeParse(body);
      if (!parsed.success) return json({ success: false, error: { code: "VALIDATION", details: parsed.error.issues } }, 400, corsHdrs);

      const { tenant, channel, url: webhookUrl } = parsed.data;
      const updated = await setChannelWebhook(env, tenant, channel, webhookUrl);
      return json({ success: true, data: { tenant: updated.id, channel, webhook: webhookUrl } }, 200, corsHdrs);
    }

    // POST /api/v1/admin/tenant/yt/byo-google
    // Set BYO-Google client (YouTube)
    if (url.pathname === `/api/${v}/admin/tenant/yt/byo-google` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const body = await req.json().catch(() => ({}));
      const schema = z.object({
        tenant: z.string().min(1),
        client_id: z.string().min(1),
        client_secret: z.string().min(1),
      });
      const parsed = schema.safeParse(body);
      if (!parsed.success) return json({ success: false, error: { code: "VALIDATION", details: parsed.error.issues } }, 400, corsHdrs);

      const { tenant, client_id, client_secret } = parsed.data;
      const updated = await setYouTubeBYOGoogle(env, tenant, client_id, client_secret);
      return json({ success: true, data: { tenant: updated.id, byo_google: true } }, 200, corsHdrs);
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

    // -------- MOTM Voting (Admin) --------

    // POST /api/v1/admin/matches/:matchId/motm/open
    if (url.pathname.match(new RegExp(`^/api/${v}/admin/matches/[^/]+/motm/open$`)) && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const matchId = url.pathname.split("/")[5];
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";

      const id = env.VotingRoom.idFromName(`${tenant}:${matchId}`);
      const stub = env.VotingRoom.get(id);
      const voteBody = { tenant, matchId, ...body };
      const r = await stub.fetch("https://do/open", { method: "POST", body: JSON.stringify(voteBody) });
      return json(await r.json(), r.status, corsHdrs);
    }

    // POST /api/v1/admin/matches/:matchId/motm/close
    if (url.pathname.match(new RegExp(`^/api/${v}/admin/matches/[^/]+/motm/close$`)) && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const matchId = url.pathname.split("/")[5];
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";

      const id = env.VotingRoom.idFromName(`${tenant}:${matchId}`);
      const stub = env.VotingRoom.get(id);
      const r = await stub.fetch("https://do/close", { method: "POST" });
      return json(await r.json(), r.status, corsHdrs);
    }

    // GET /api/v1/admin/matches/:matchId/motm/tally
    if (url.pathname.match(new RegExp(`^/api/${v}/admin/matches/[^/]+/motm/tally$`)) && req.method === "GET") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const matchId = url.pathname.split("/")[5];
      const tenant = url.searchParams.get("tenant") || "default";

      const id = env.VotingRoom.idFromName(`${tenant}:${matchId}`);
      const stub = env.VotingRoom.get(id);
      const r = await stub.fetch("https://do/tally");
      return json(await r.json(), r.status, corsHdrs);
    }

    // -------- MOTM Voting (App) --------

    // POST /api/v1/matches/:matchId/motm/vote
    if (url.pathname.match(new RegExp(`^/api/${v}/matches/[^/]+/motm/vote$`)) && req.method === "POST") {
      const matchId = url.pathname.split("/")[4];
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";

      // Simple user hash from IP + User-Agent (anonymous voting)
      const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown";
      const ua = req.headers.get("user-agent") || "";
      const userHash = `${ip}:${ua}`.substring(0, 64);

      const id = env.VotingRoom.idFromName(`${tenant}:${matchId}`);
      const stub = env.VotingRoom.get(id);
      const voteBody = { candidateId: body.candidateId, userHash };
      const r = await stub.fetch("https://do/vote", { method: "POST", body: JSON.stringify(voteBody) });
      return json(await r.json(), r.status, corsHdrs);
    }

    // -------- Events (Admin) --------

    // POST /api/v1/admin/events
    if (url.pathname === `/api/${v}/admin/events` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";
      const now = Date.now();
      body.createdAt = body.createdAt || now;
      body.updatedAt = now;
      await putEvent(env, tenant, body);
      return json({ success: true, data: { id: body.id } }, 200, corsHdrs);
    }

    // PATCH /api/v1/admin/events/:id
    if (url.pathname.match(new RegExp(`^/api/${v}/admin/events/[^/]+$`)) && req.method === "PATCH") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const eventId = url.pathname.split("/").pop()!;
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";

      const cur = await getEvent(env, tenant, eventId);
      if (!cur) return json({ success: false, error: { code: "NOT_FOUND" } }, 404, corsHdrs);

      const next = { ...cur, ...body, updatedAt: Date.now() };
      await putEvent(env, tenant, next);
      return json({ success: true, data: { id: eventId } }, 200, corsHdrs);
    }

    // DELETE /api/v1/admin/events/:id
    if (url.pathname.match(new RegExp(`^/api/${v}/admin/events/[^/]+$`)) && req.method === "DELETE") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const eventId = url.pathname.split("/").pop()!;
      const tenant = url.searchParams.get("tenant") || "default";

      await deleteEvent(env, tenant, eventId);
      return json({ success: true }, 200, corsHdrs);
    }

    // -------- Events (App) --------

    // GET /api/v1/events
    if (url.pathname === `/api/${v}/events` && req.method === "GET") {
      const tenant = url.searchParams.get("tenant") || "default";
      const list = await listEvents(env, tenant);
      return json({ success: true, data: list }, 200, corsHdrs);
    }

    // GET /api/v1/events/:id
    if (url.pathname.match(new RegExp(`^/api/${v}/events/[^/]+$`)) && req.method === "GET") {
      const eventId = url.pathname.split("/").pop()!;
      const tenant = url.searchParams.get("tenant") || "default";

      const ev = await getEvent(env, tenant, eventId);
      if (!ev) return json({ success: false, error: { code: "NOT_FOUND" } }, 404, corsHdrs);

      return json({ success: true, data: ev }, 200, corsHdrs);
    }

    // POST /api/v1/events/:id/rsvp
    if (url.pathname.match(new RegExp(`^/api/${v}/events/[^/]+/rsvp$`)) && req.method === "POST") {
      const eventId = url.pathname.split("/")[4];
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";
      const userId = body.userId || "anonymous";
      const rsvp = body.rsvp as "yes" | "no" | "maybe";

      if (!["yes", "no", "maybe"].includes(rsvp)) {
        return json({ success: false, error: { code: "VALIDATION", message: "rsvp must be yes/no/maybe" } }, 400, corsHdrs);
      }

      await setRsvp(env, tenant, eventId, userId, rsvp);
      return json({ success: true }, 200, corsHdrs);
    }

    // POST /api/v1/events/:id/checkin
    if (url.pathname.match(new RegExp(`^/api/${v}/events/[^/]+/checkin$`)) && req.method === "POST") {
      const eventId = url.pathname.split("/")[4];
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";
      const userId = body.userId || "anonymous";

      await addCheckin(env, tenant, eventId, userId);
      return json({ success: true, data: { ts: Date.now() } }, 200, corsHdrs);
    }

    // -------- Device Registration (for Push) --------

    // POST /api/v1/devices/register
    if (url.pathname === `/api/${v}/devices/register` && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";
      const userId = body.userId || "anonymous";
      const platform = body.platform || "unknown";
      const token = body.token;

      if (!token) {
        return json({ success: false, error: { code: "VALIDATION", message: "token required" } }, 400, corsHdrs);
      }

      await registerDevice(env, tenant, userId, platform, token);
      return json({ success: true }, 200, corsHdrs);
    }

    // -------- Push Token Registration (for live updates) --------

    // POST /api/v1/push/register
    if (url.pathname === `/api/${v}/push/register` && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";
      const teamId = body.teamId;
      const token = body.token;

      if (!token) {
        return json({ success: false, error: { code: "VALIDATION", message: "token required" } }, 400, corsHdrs);
      }

      // Global tokens
      const tokensKey = `tenants:${tenant}:push:tokens`;
      const existing = ((await env.KV_IDEMP.get(tokensKey, "json")) as string[]) || [];
      if (!existing.includes(token)) {
        existing.push(token);
        await env.KV_IDEMP.put(tokensKey, JSON.stringify(existing));
      }

      // Team-specific tokens
      if (teamId) {
        const teamKey = `tenants:${tenant}:team:${teamId}:tokens`;
        const teamTokens = ((await env.KV_IDEMP.get(teamKey, "json")) as string[]) || [];
        if (!teamTokens.includes(token)) {
          teamTokens.push(token);
          await env.KV_IDEMP.put(teamKey, JSON.stringify(teamTokens));
        }
      }

      return json({ success: true }, 200, corsHdrs);
    }

    // -------- League Tables & Fixtures --------

    // GET /api/v1/league/:leagueId/table
    if (url.pathname.match(new RegExp(`^/api/${v}/league/[^/]+/table$`)) && req.method === "GET") {
      const leagueId = url.pathname.split("/")[4];
      const season = url.searchParams.get("season") || new Date().getFullYear().toString();

      try {
        const fixturesBase = (env.FIXTURES_REFRESH_URL || "").replace("/refresh", "");
        const upstreamUrl = `${fixturesBase}/table?league=${leagueId}&season=${season}`;
        const r = await fetch(upstreamUrl);
        const data = await r.json();
        if (!r.ok || !data.ok) {
          return json({ success: false, error: { code: "UPSTREAM_ERROR", message: data.message || "Failed" } }, r.status, corsHdrs);
        }
        return json({ success: true, data: data.data }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "FETCH_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // GET /api/v1/league/:leagueId/fixtures
    if (url.pathname.match(new RegExp(`^/api/${v}/league/[^/]+/fixtures$`)) && req.method === "GET") {
      const leagueId = url.pathname.split("/")[4];
      const season = url.searchParams.get("season") || new Date().getFullYear().toString();

      try {
        const fixturesBase = (env.FIXTURES_REFRESH_URL || "").replace("/refresh", "");
        const upstreamUrl = `${fixturesBase}/fixtures?league=${leagueId}&season=${season}`;
        const r = await fetch(upstreamUrl);
        const data = await r.json();
        if (!r.ok || !data.ok) {
          return json({ success: false, error: { code: "UPSTREAM_ERROR", message: data.message || "Failed" } }, r.status, corsHdrs);
        }
        return json({ success: true, data: data.data }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "FETCH_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // GET /api/v1/league/:leagueId/results
    if (url.pathname.match(new RegExp(`^/api/${v}/league/[^/]+/results$`)) && req.method === "GET") {
      const leagueId = url.pathname.split("/")[4];
      const season = url.searchParams.get("season") || new Date().getFullYear().toString();

      try {
        const fixturesBase = (env.FIXTURES_REFRESH_URL || "").replace("/refresh", "");
        const upstreamUrl = `${fixturesBase}/results?league=${leagueId}&season=${season}`;
        const r = await fetch(upstreamUrl);
        const data = await r.json();
        if (!r.ok || !data.ok) {
          return json({ success: false, error: { code: "UPSTREAM_ERROR", message: data.message || "Failed" } }, r.status, corsHdrs);
        }
        return json({ success: true, data: data.data }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "FETCH_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // GET /api/v1/league/:leagueId/seasons
    if (url.pathname.match(new RegExp(`^/api/${v}/league/[^/]+/seasons$`)) && req.method === "GET") {
      const leagueId = url.pathname.split("/")[4];

      try {
        const fixturesBase = (env.FIXTURES_REFRESH_URL || "").replace("/refresh", "");
        const upstreamUrl = `${fixturesBase}/seasons?league=${leagueId}`;
        const r = await fetch(upstreamUrl);
        const data = await r.json();
        if (!r.ok || !data.ok) {
          return json({ success: false, error: { code: "UPSTREAM_ERROR", message: data.message || "Failed" } }, r.status, corsHdrs);
        }
        return json({ success: true, data: data.data }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "FETCH_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // -------- Live Match Ticker (Admin) --------

    // POST /api/v1/admin/matches/:matchId/live/open
    if (url.pathname.match(new RegExp(`^/api/${v}/admin/matches/[^/]+/live/open$`)) && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const matchId = url.pathname.split("/")[5];
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";

      const id = env.MatchRoom.idFromName(`${tenant}::${matchId}`);
      const stub = env.MatchRoom.get(id);
      const matchBody = { tenant, matchId, ...body };
      const r = await stub.fetch("https://do/open", { method: "POST", body: JSON.stringify(matchBody) });
      return json(await r.json(), r.status, corsHdrs);
    }

    // POST /api/v1/admin/matches/:matchId/live/event
    if (url.pathname.match(new RegExp(`^/api/${v}/admin/matches/[^/]+/live/event$`)) && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const matchId = url.pathname.split("/")[5];
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";

      const id = env.MatchRoom.idFromName(`${tenant}::${matchId}`);
      const stub = env.MatchRoom.get(id);
      const r = await stub.fetch("https://do/event", { method: "POST", body: JSON.stringify(body) });
      return json(await r.json(), r.status, corsHdrs);
    }

    // POST /api/v1/admin/matches/:matchId/live/close
    if (url.pathname.match(new RegExp(`^/api/${v}/admin/matches/[^/]+/live/close$`)) && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const matchId = url.pathname.split("/")[5];
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";

      const id = env.MatchRoom.idFromName(`${tenant}::${matchId}`);
      const stub = env.MatchRoom.get(id);
      const r = await stub.fetch("https://do/close", { method: "POST" });
      return json(await r.json(), r.status, corsHdrs);
    }

    // -------- Live Match Ticker (App) --------

    // GET /api/v1/matches/:matchId/live
    if (url.pathname.match(new RegExp(`^/api/${v}/matches/[^/]+/live$`)) && req.method === "GET") {
      const matchId = url.pathname.split("/")[4];
      const tenant = url.searchParams.get("tenant") || "default";

      const id = env.MatchRoom.idFromName(`${tenant}::${matchId}`);
      const stub = env.MatchRoom.get(id);
      const r = await stub.fetch("https://do/tally");
      return json(await r.json(), r.status, corsHdrs);
    }

    // -------- Chat Routes --------

    // POST /api/v1/chat/:roomId/send
    if (url.pathname.match(new RegExp(`^/api/${v}/chat/[^/]+/send$`)) && req.method === "POST") {
      const roomId = url.pathname.split("/")[4];
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";

      // Rate limit: 1 msg/sec per user (using TenantRateLimiter)
      const userId = body.userId || "anonymous";
      const rateLimitKey = `${tenant}:chat:${roomId}:${userId}`;
      const limitId = env.TenantRateLimiter.idFromName(rateLimitKey);
      const limiterStub = env.TenantRateLimiter.get(limitId);
      const limitCheck = await limiterStub.fetch("https://do/check", {
        method: "POST",
        body: JSON.stringify({ key: rateLimitKey, limit: 1, window: 1000 }),
      });
      const limitResult = await limitCheck.json();
      if (!limitResult.allowed) {
        return json({ success: false, error: { code: "RATE_LIMIT", message: "Too many messages" } }, 429, corsHdrs);
      }

      const id = env.ChatRoom.idFromName(`${tenant}::${roomId}`);
      const stub = env.ChatRoom.get(id);
      const chatBody = { tenant, roomId, ...body };
      const r = await stub.fetch("https://do/send", { method: "POST", body: JSON.stringify(chatBody) });
      return json(await r.json(), r.status, corsHdrs);
    }

    // GET /api/v1/chat/:roomId/history
    if (url.pathname.match(new RegExp(`^/api/${v}/chat/[^/]+/history$`)) && req.method === "GET") {
      const roomId = url.pathname.split("/")[4];
      const tenant = url.searchParams.get("tenant") || "default";
      const cursor = url.searchParams.get("cursor") || undefined;
      const limit = parseInt(url.searchParams.get("limit") || "50", 10);

      const id = env.ChatRoom.idFromName(`${tenant}::${roomId}`);
      const stub = env.ChatRoom.get(id);
      const r = await stub.fetch(`https://do/history?tenant=${tenant}&roomId=${roomId}&cursor=${cursor || ""}&limit=${limit}`);
      return json(await r.json(), r.status, corsHdrs);
    }

    // POST /api/v1/chat/:roomId/typing
    if (url.pathname.match(new RegExp(`^/api/${v}/chat/[^/]+/typing$`)) && req.method === "POST") {
      const roomId = url.pathname.split("/")[4];
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";

      const id = env.ChatRoom.idFromName(`${tenant}::${roomId}`);
      const stub = env.ChatRoom.get(id);
      const chatBody = { tenant, roomId, ...body };
      const r = await stub.fetch("https://do/typing", { method: "POST", body: JSON.stringify(chatBody) });
      return json(await r.json(), r.status, corsHdrs);
    }

    // -------- Photo Gallery (R2) --------

    // POST /api/v1/media/albums
    if (url.pathname === `/api/${v}/media/albums` && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";
      const title = body.title || "Untitled Album";
      const teamId = body.teamId;

      const albumId = `alb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const indexKey = `tenants:${tenant}:albums:index`;
      const existing = ((await env.KV_IDEMP.get(indexKey, "json")) as any[]) || [];
      const row = { albumId, title, teamId, coverKey: null, count: 0, updatedTs: Date.now() };
      const next = [row, ...existing.filter((r) => r.albumId !== albumId)];
      await env.KV_IDEMP.put(indexKey, JSON.stringify(next.slice(0, 500)));

      // Initialize album photos index
      const albumIndexKey = `tenants:${tenant}:albums:${albumId}:index`;
      await env.KV_IDEMP.put(albumIndexKey, JSON.stringify([]));

      return json({ success: true, data: { albumId } }, 200, corsHdrs);
    }

    // GET /api/v1/media/albums (list albums)
    if (url.pathname === `/api/${v}/media/albums` && req.method === "GET") {
      const tenant = url.searchParams.get("tenant") || "default";
      const indexKey = `tenants:${tenant}:albums:index`;
      const albums = ((await env.KV_IDEMP.get(indexKey, "json")) as any[]) || [];
      return json({ success: true, data: albums }, 200, corsHdrs);
    }

    // GET /api/v1/media/albums/:id
    if (url.pathname.match(new RegExp(`^/api/${v}/media/albums/[^/]+$`)) && req.method === "GET") {
      const albumId = url.pathname.split("/").pop()!;
      const tenant = url.searchParams.get("tenant") || "default";

      const indexKey = `tenants:${tenant}:albums:index`;
      const albums = ((await env.KV_IDEMP.get(indexKey, "json")) as any[]) || [];
      const album = albums.find((a) => a.albumId === albumId);
      if (!album) {
        return json({ success: false, error: { code: "NOT_FOUND" } }, 404, corsHdrs);
      }

      const albumIndexKey = `tenants:${tenant}:albums:${albumId}:index`;
      const photos = ((await env.KV_IDEMP.get(albumIndexKey, "json")) as any[]) || [];

      return json({ success: true, data: { ...album, photos: photos.slice(0, 20) } }, 200, corsHdrs);
    }

    // POST /api/v1/media/albums/:id/upload-url
    if (url.pathname.match(new RegExp(`^/api/${v}/media/albums/[^/]+/upload-url$`)) && req.method === "POST") {
      const albumId = url.pathname.split("/")[5];
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";
      const contentType = body.contentType || "image/jpeg";

      const photoId = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const objectKey = `tenants/${tenant}/albums/${albumId}/${photoId}.jpg`;

      try {
        const putUrl = await env.R2_MEDIA.createMultipartUpload(objectKey);
        return json({ success: true, data: { putUrl, objectKey } }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "R2_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // POST /api/v1/media/albums/:id/commit
    if (url.pathname.match(new RegExp(`^/api/${v}/media/albums/[^/]+/commit$`)) && req.method === "POST") {
      const albumId = url.pathname.split("/")[5];
      const body = await req.json().catch(() => ({}));
      const tenant = body.tenant || "default";
      const objectKey = body.objectKey;
      const caption = body.caption;

      if (!objectKey) {
        return json({ success: false, error: { code: "VALIDATION", message: "objectKey required" } }, 400, corsHdrs);
      }

      // Update album photos index
      const albumIndexKey = `tenants:${tenant}:albums:${albumId}:index`;
      const photos = ((await env.KV_IDEMP.get(albumIndexKey, "json")) as any[]) || [];
      const photo = { key: objectKey, ts: Date.now(), caption };
      photos.push(photo);
      await env.KV_IDEMP.put(albumIndexKey, JSON.stringify(photos));

      // Update album count
      const indexKey = `tenants:${tenant}:albums:index`;
      const albums = ((await env.KV_IDEMP.get(indexKey, "json")) as any[]) || [];
      const album = albums.find((a) => a.albumId === albumId);
      if (album) {
        album.count = photos.length;
        album.updatedTs = Date.now();
        if (!album.coverKey) album.coverKey = objectKey;
        await env.KV_IDEMP.put(indexKey, JSON.stringify(albums));
      }

      return json({ success: true, data: { photoKey: objectKey } }, 200, corsHdrs);
    }

    // GET /api/v1/media/albums/:id/photos
    if (url.pathname.match(new RegExp(`^/api/${v}/media/albums/[^/]+/photos$`)) && req.method === "GET") {
      const albumId = url.pathname.split("/")[5];
      const tenant = url.searchParams.get("tenant") || "default";
      const cursor = url.searchParams.get("cursor") || "0";

      const albumIndexKey = `tenants:${tenant}:albums:${albumId}:index`;
      const photos = ((await env.KV_IDEMP.get(albumIndexKey, "json")) as any[]) || [];

      const offset = parseInt(cursor, 10);
      const limit = 20;
      const page = photos.slice(offset, offset + limit);

      // Generate signed GET URLs (1h TTL)
      const signedPhotos = await Promise.all(
        page.map(async (p: any) => {
          try {
            const obj = await env.R2_MEDIA.get(p.key);
            if (!obj) return { ...p, url: null };
            // Note: R2 doesn't have native presigned URLs yet, use object.createReadableStream() or proxy
            // For now, return the key (client can fetch via a proxy route)
            return { ...p, url: `/api/${v}/media/photo/${encodeURIComponent(p.key)}` };
          } catch (e) {
            return { ...p, url: null };
          }
        })
      );

      const nextCursor = offset + page.length < photos.length ? String(offset + limit) : null;

      return json({ success: true, data: { photos: signedPhotos, nextCursor } }, 200, corsHdrs);
    }

    // DELETE /api/v1/media/photos/:objectKey
    if (url.pathname.match(new RegExp(`^/api/${v}/media/photos/`)) && req.method === "DELETE") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const objectKey = decodeURIComponent(url.pathname.split("/media/photos/")[1]);
      const tenant = url.searchParams.get("tenant") || "default";

      try {
        await env.R2_MEDIA.delete(objectKey);
        // TODO: remove from album index
        return json({ success: true }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "R2_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // GET /api/v1/media/photo/:objectKey (proxy route for R2 object)
    if (url.pathname.match(new RegExp(`^/api/${v}/media/photo/`)) && req.method === "GET") {
      const objectKey = decodeURIComponent(url.pathname.split("/media/photo/")[1]);

      try {
        const obj = await env.R2_MEDIA.get(objectKey);
        if (!obj) {
          return new Response("Not found", { status: 404 });
        }
        return new Response(obj.body, {
          headers: {
            "content-type": obj.httpMetadata?.contentType || "image/jpeg",
            "cache-control": "public, max-age=3600",
            ...corsHdrs,
          },
        });
      } catch (e: any) {
        return json({ success: false, error: { code: "R2_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // -------- Invites --------

    // POST /api/v1/admin/invites/create (admin)
    if (url.pathname === `/api/${v}/admin/invites/create` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const body = await req.json().catch(() => ({}));
      const { tenant, teamId, role, maxUses, ttl_minutes } = body;
      try {
        const result = await Invites.createInvite(env, {
          tenant,
          teamId,
          role,
          maxUses,
          ttl_minutes,
          createdBy: user.userId || "admin",
        });
        return json(result, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "INVITE_ERROR", message: e.message } }, e.status || 500, corsHdrs);
      }
    }

    // GET /api/v1/admin/invites/:token (admin)
    if (url.pathname.match(new RegExp(`^/api/${v}/admin/invites/[^/]+$`)) && req.method === "GET") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const token = url.pathname.split("/").pop()!;
      try {
        const invite = await Invites.getInvite(env, token);
        return json({ ok: true, invite }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "INVITE_ERROR", message: e.message } }, e.status || 500, corsHdrs);
      }
    }

    // POST /api/v1/invites/consume (public)
    if (url.pathname === `/api/${v}/invites/consume` && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const { token, email, name } = body;
      try {
        const invite = await Invites.consumeInvite(env, token);
        // TODO: create or find user by email; assign role/team based on invite.role
        // TODO: issue tenant-scoped app JWT
        return json({ ok: true, invite }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "INVITE_ERROR", message: e.message } }, e.status || 500, corsHdrs);
      }
    }

    // -------- Teams --------

    // POST /api/v1/admin/teams (admin)
    if (url.pathname === `/api/${v}/admin/teams` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const body = await req.json().catch(() => ({}));
      const { tenant, teamId, name, ageGroup } = body;
      try {
        const team = await Teams.createTeam(env, { tenant, teamId, name, ageGroup });
        return json({ ok: true, team }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "TEAM_ERROR", message: e.message } }, e.status || 500, corsHdrs);
      }
    }

    // GET /api/v1/teams (authenticated)
    if (url.pathname === `/api/${v}/teams` && req.method === "GET") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user) {
        return json({ success: false, error: { code: "UNAUTHORIZED" } }, 401, corsHdrs);
      }
      const tenant = url.searchParams.get("tenant") || "default";
      try {
        const teams = await Teams.listTeams(env, tenant);
        return json({ ok: true, teams }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "TEAM_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // -------- Chat (KV-backed) --------

    // POST /api/v1/admin/chat/rooms (admin)
    if (url.pathname === `/api/${v}/admin/chat/rooms` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const body = await req.json().catch(() => ({}));
      const { tenant, roomId, teamId, type } = body;
      try {
        const room = await ChatKV.createRoom(env, { tenant, roomId, teamId, type });
        return json({ ok: true, room }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "CHAT_ERROR", message: e.message } }, e.status || 500, corsHdrs);
      }
    }

    // GET /api/v1/chat/rooms (authenticated)
    if (url.pathname === `/api/${v}/chat/rooms` && req.method === "GET") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user) {
        return json({ success: false, error: { code: "UNAUTHORIZED" } }, 401, corsHdrs);
      }
      const tenant = url.searchParams.get("tenant") || "default";
      const teamId = url.searchParams.get("teamId") || undefined;
      try {
        // TODO: filter based on caller's role/team access
        const rooms = await ChatKV.listRooms(env, tenant, teamId);
        return json({ ok: true, rooms }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "CHAT_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // POST /api/v1/chat/rooms/:roomId/messages (authenticated)
    if (url.pathname.match(new RegExp(`^/api/${v}/chat/rooms/[^/]+/messages$`)) && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user) {
        return json({ success: false, error: { code: "UNAUTHORIZED" } }, 401, corsHdrs);
      }
      const roomId = url.pathname.split("/")[5];
      const body = await req.json().catch(() => ({}));
      const { tenant, text } = body;
      try {
        // TODO: authZ: ensure caller can write to this room
        const msg = await ChatKV.addMessage(env, { tenant, roomId, userId: user.userId || "anonymous", text });
        return json({ ok: true, msg }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "CHAT_ERROR", message: e.message } }, e.status || 500, corsHdrs);
      }
    }

    // GET /api/v1/chat/rooms/:roomId/messages (authenticated)
    if (url.pathname.match(new RegExp(`^/api/${v}/chat/rooms/[^/]+/messages$`)) && req.method === "GET") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user) {
        return json({ success: false, error: { code: "UNAUTHORIZED" } }, 401, corsHdrs);
      }
      const roomId = url.pathname.split("/")[5];
      const tenant = url.searchParams.get("tenant") || "default";
      try {
        const messages = await ChatKV.listMessages(env, { tenant, roomId, limit: 100 });
        return json({ ok: true, messages }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "CHAT_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // -------- Gallery (KV-backed) --------

    // POST /api/v1/admin/gallery/albums (admin)
    if (url.pathname === `/api/${v}/admin/gallery/albums` && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user || !hasRole(user, "admin")) {
        return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
      }
      const body = await req.json().catch(() => ({}));
      const { tenant, title, teamId, eventId } = body;
      try {
        const album = await GalleryKV.createAlbum(env, {
          tenant,
          title,
          teamId,
          eventId,
          createdBy: user.userId || "admin",
        });
        return json({ ok: true, album }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "GALLERY_ERROR", message: e.message } }, e.status || 500, corsHdrs);
      }
    }

    // GET /api/v1/gallery/albums (authenticated)
    if (url.pathname === `/api/${v}/gallery/albums` && req.method === "GET") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user) {
        return json({ success: false, error: { code: "UNAUTHORIZED" } }, 401, corsHdrs);
      }
      const tenant = url.searchParams.get("tenant") || "default";
      const teamId = url.searchParams.get("teamId") || undefined;
      try {
        const albums = await GalleryKV.listAlbums(env, tenant, teamId);
        return json({ ok: true, albums }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "GALLERY_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // POST /api/v1/gallery/albums/:albumId/upload (authenticated, multipart)
    if (url.pathname.match(new RegExp(`^/api/${v}/gallery/albums/[^/]+/upload$`)) && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user) {
        return json({ success: false, error: { code: "UNAUTHORIZED" } }, 401, corsHdrs);
      }
      const albumId = url.pathname.split("/")[5];
      const tenant = url.searchParams.get("tenant") || "default";
      const ct = req.headers.get("content-type") || "";
      if (!ct.startsWith("multipart/form-data")) {
        return json({ success: false, error: { code: "VALIDATION", message: "multipart required" } }, 400, corsHdrs);
      }
      try {
        const form = await req.formData();
        const file = form.get("file");
        if (!(file instanceof File)) {
          return json({ success: false, error: { code: "VALIDATION", message: "file missing" } }, 400, corsHdrs);
        }
        const buf = await file.arrayBuffer();
        const { r2Key } = await GalleryKV.uploadBinary(env, { tenant, albumId, file: buf, contentType: file.type });
        return json({ ok: true, r2Key }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "GALLERY_ERROR", message: e.message } }, e.status || 500, corsHdrs);
      }
    }

    // POST /api/v1/gallery/albums/:albumId/commit (authenticated)
    if (url.pathname.match(new RegExp(`^/api/${v}/gallery/albums/[^/]+/commit$`)) && req.method === "POST") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user) {
        return json({ success: false, error: { code: "UNAUTHORIZED" } }, 401, corsHdrs);
      }
      const albumId = url.pathname.split("/")[5];
      const body = await req.json().catch(() => ({}));
      const { tenant, r2Key, playerTags, consentCheck } = body;
      try {
        const media = await GalleryKV.commitMedia(env, {
          tenant,
          albumId,
          r2Key,
          uploaderId: user.userId || "anonymous",
          playerTags,
          consentCheck,
        });
        return json({ ok: true, media }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "GALLERY_ERROR", message: e.message } }, e.status || 500, corsHdrs);
      }
    }

    // GET /api/v1/gallery/albums/:albumId (authenticated)
    if (url.pathname.match(new RegExp(`^/api/${v}/gallery/albums/[^/]+$`)) && req.method === "GET") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user) {
        return json({ success: false, error: { code: "UNAUTHORIZED" } }, 401, corsHdrs);
      }
      const albumId = url.pathname.split("/")[5];
      const tenant = url.searchParams.get("tenant") || "default";
      try {
        const media = await GalleryKV.listMedia(env, { tenant, albumId, respectConsent: true });
        return json({ ok: true, media }, 200, corsHdrs);
      } catch (e: any) {
        return json({ success: false, error: { code: "GALLERY_ERROR", message: e.message } }, 500, corsHdrs);
      }
    }

    // GET /api/v1/gallery/file (authenticated, stream from R2)
    if (url.pathname === `/api/${v}/gallery/file` && req.method === "GET") {
      const user = await requireJWT(req, env).catch(() => null);
      if (!user) {
        return json({ success: false, error: { code: "UNAUTHORIZED" } }, 401, corsHdrs);
      }
      const key = url.searchParams.get("key");
      if (!key) {
        return json({ success: false, error: { code: "VALIDATION", message: "key required" } }, 400, corsHdrs);
      }
      try {
        const obj = await env.R2_MEDIA.get(key);
        if (!obj) {
          return json({ success: false, error: { code: "NOT_FOUND" } }, 404, corsHdrs);
        }
        return new Response(obj.body, {
          headers: {
            "content-type": obj.httpMetadata?.contentType || "image/jpeg",
            "cache-control": "public, max-age=3600",
            ...corsHdrs,
          },
        });
      } catch (e: any) {
        return json({ success: false, error: { code: "R2_ERROR", message: e.message } }, 500, corsHdrs);
      }
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
  queue: queueWorker.queue,

  // <- Cron handler (called by [triggers].crons in wrangler.toml)
  async scheduled(controller: ScheduledController, env: any, ctx: ExecutionContext) {
    console.log("cron tick", new Date().toISOString());

    // OPTIONAL: event reminders (wire later)
    // try {
    //   await sendEventReminders(env);
    // } catch (err) {
    //   console.error("reminders failure", err);
    // }
  }
};
