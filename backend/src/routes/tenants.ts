import { z } from "zod";
import type { Env } from "../types/env";
import { gasCall } from "../services/gas";
import { putTenant, getTenant, type Tenant } from "../services/tenants";
import { logJSON } from "../lib/log";

const ProvisionBody = z.object({
  teamName: z.string().min(2),
  tenantId: z.string().min(2).regex(/^[a-z0-9-]+$/),
  primary: z.string().startsWith("#"),
  secondary: z.string().startsWith("#"),
  badgeUrl: z.string().url(),
  contactEmail: z.string().email(),
  makeWebhookUrl: z.string().url().optional(),
  youtubeChannelId: z.string().optional()
});

function jsonHeaders(base: Headers) {
  const headers = new Headers(base);
  headers.set("content-type", "application/json");
  return headers;
}

export function registerTenantRoutes(router: any) {
  router.post("/api/tenants", async (request: Request, env: Env, corsHdrs: Headers, requestId?: string) => {
    const headers = jsonHeaders(corsHdrs);
    const body = await request.json().catch(() => ({}));
    const parsed = ProvisionBody.safeParse(body);

    if (!parsed.success) {
      logJSON({
        level: "warn",
        msg: "tenant_provision_validation_failed",
        requestId,
        issues: parsed.error.issues
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "invalid_request",
          issues: parsed.error.issues
        }),
        { status: 400, headers }
      );
    }

    const input = parsed.data;
    const now = new Date().toISOString();

    const existing = await getTenant(env, input.tenantId);
    if (existing && existing.status === "READY" && existing.spreadsheetId) {
      logJSON({
        level: "info",
        msg: "tenant_provision_idempotent_hit",
        requestId,
        tenantId: input.tenantId
      });
      return new Response(
        JSON.stringify({
          success: true,
          tenantId: existing.tenantId,
          spreadsheetId: existing.spreadsheetId,
          status: existing.status,
          validatorReport: existing.validatorReport
        }),
        { status: 200, headers }
      );
    }

    const base: Tenant = {
      tenantId: input.tenantId,
      teamName: input.teamName,
      primary: input.primary,
      secondary: input.secondary,
      badgeUrl: input.badgeUrl,
      contactEmail: input.contactEmail,
      makeWebhookUrl: input.makeWebhookUrl,
      youtubeChannelId: input.youtubeChannelId,
      spreadsheetId: existing?.spreadsheetId,
      status: "PROVISIONING",
      validatorReport: existing?.validatorReport,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };

    await putTenant(env, base);

    const payload = {
      templateSpreadsheetId: env.TEMPLATE_SPREADSHEET_ID,
      teamName: input.teamName,
      tenantId: input.tenantId,
      config: {
        TEAM_NAME: input.teamName,
        TENANT_ID: input.tenantId,
        PRIMARY_COLOUR: input.primary,
        SECONDARY_COLOUR: input.secondary,
        BADGE_URL: input.badgeUrl,
        CONTACT_EMAIL: input.contactEmail,
        WORKER_BASE_URL: env.WORKER_BASE_URL,
        MAKE_WEBHOOK_URL: input.makeWebhookUrl ?? "",
        YOUTUBE_CHANNEL_ID: input.youtubeChannelId ?? ""
      },
      properties: {
        "SYSTEM.SPREADSHEET_ID": existing?.spreadsheetId ?? "",
        "SYSTEM.ENVIRONMENT": env.ENVIRONMENT,
        "SYSTEM.VERSION": env.APP_VERSION,
        "TENANT.ID": input.tenantId,
        "BACKEND.BASE_URL": env.WORKER_BASE_URL,
        "BACKEND.API_KEY": env.BACKEND_API_KEY,
        "MAKE.WEBHOOK_URL": input.makeWebhookUrl ?? "",
        "YOUTUBE.API_KEY": env.YOUTUBE_API_KEY,
        "YOUTUBE.CHANNEL_ID": input.youtubeChannelId ?? ""
      }
    };

    try {
      const result = await gasCall(env, "provision", payload);
      const stored = await putTenant(env, {
        ...base,
        spreadsheetId: result.spreadsheetId,
        status: result.ok ? "READY" : "ERROR",
        validatorReport: result.report
      });

      logJSON({
        level: "info",
        msg: "tenant_provision_complete",
        requestId,
        tenantId: stored.tenantId,
        status: stored.status
      });

      return new Response(
        JSON.stringify({
          success: !!result.ok,
          tenantId: stored.tenantId,
          spreadsheetId: stored.spreadsheetId,
          status: stored.status,
          validatorReport: stored.validatorReport
        }),
        { status: 200, headers }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await putTenant(env, {
        ...base,
        status: "ERROR",
        validatorReport: { error: message }
      });

      logJSON({
        level: "error",
        msg: "tenant_provision_failed",
        requestId,
        tenantId: base.tenantId,
        error: message
      });

      return new Response(
        JSON.stringify({
          success: false,
          tenantId: base.tenantId,
          status: "ERROR",
          error: message
        }),
        { status: 502, headers }
      );
    }
  });

  router.post("/api/tenants/:id/verify", async (request: Request, env: Env, corsHdrs: Headers, requestId?: string) => {
    const headers = jsonHeaders(corsHdrs);
    const params = (request as any).params || {};
    const tenantId = params.id as string;

    if (!tenantId) {
      return new Response(
        JSON.stringify({ success: false, error: "missing_tenant_id" }),
        { status: 400, headers }
      );
    }

    const tenant = await getTenant(env, tenantId);
    if (!tenant || !tenant.spreadsheetId) {
      logJSON({
        level: "warn",
        msg: "tenant_verify_missing",
        requestId,
        tenantId
      });
      return new Response(
        JSON.stringify({ success: false, ok: false, error: "unknown_tenant" }),
        { status: 404, headers }
      );
    }

    try {
      const result = await gasCall(env, "verify", { spreadsheetId: tenant.spreadsheetId });
      const stored = await putTenant(env, {
        ...tenant,
        status: result.ok ? "READY" : "ERROR",
        validatorReport: result.report
      });

      logJSON({
        level: "info",
        msg: "tenant_verify_complete",
        requestId,
        tenantId: stored.tenantId,
        status: stored.status
      });

      return new Response(
        JSON.stringify({
          success: !!result.ok,
          ok: !!result.ok,
          report: result.report
        }),
        { status: 200, headers }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await putTenant(env, {
        ...tenant,
        status: "ERROR",
        validatorReport: { error: message }
      });

      logJSON({
        level: "error",
        msg: "tenant_verify_failed",
        requestId,
        tenantId,
        error: message
      });

      return new Response(
        JSON.stringify({ success: false, ok: false, error: message }),
        { status: 502, headers }
      );
    }
  });
}
