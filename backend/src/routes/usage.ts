// src/routes/usage.ts
// Usage Tracking for Starter Plan (1,000 actions/month cap)

import { z } from "zod";
import { json, parse, isValidationError } from "../lib/validate";
import { requireJWT } from "../services/auth";
import { logJSON } from "../lib/log";

// GET /api/v1/usage - Get current month's usage
export async function getUsage(req: Request, env: any, requestId: string, corsHdrs: Headers): Promise<Response> {
  try {
    const claims = await requireJWT(req, env);
    const tenantId = claims.tenant_id || claims.tenantId;

    // Get tenant plan
    const tenant = await env.DB.prepare("SELECT plan, comped FROM tenants WHERE id = ?").bind(tenantId).first();
    if (!tenant) {
      return json({ success: false, error: { code: "TENANT_NOT_FOUND", message: "Tenant not found" } }, 404, corsHdrs);
    }

    // Get current month (YYYY-MM format)
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Get usage counter for current month
    let usage = await env.DB.prepare(`
      SELECT action_count FROM usage_counters WHERE tenant_id = ? AND month = ?
    `).bind(tenantId, month).first();

    const actionCount = usage ? usage.action_count : 0;

    // Calculate limits based on plan
    const limit = tenant.plan === "starter" && !tenant.comped ? 1000 : null;  // null = unlimited for Pro or comped
    const remaining = limit ? Math.max(0, limit - actionCount) : null;
    const percentUsed = limit ? Math.round((actionCount / limit) * 100) : 0;

    return json({
      success: true,
      usage: {
        month,
        actionCount,
        limit,
        remaining,
        percentUsed,
        plan: tenant.plan,
        comped: tenant.comped === 1
      }
    }, 200, corsHdrs);

  } catch (err: any) {
    if (err instanceof Response) throw err;
    logJSON("error", requestId, { message: "GET_USAGE_ERROR", error: err.message });
    return json({ success: false, error: { code: "SERVER_ERROR", message: err.message } }, 500, corsHdrs);
  }
}

// POST /api/v1/usage/increment - Increment usage counter (called by automation)
export async function incrementUsage(req: Request, env: any, requestId: string, corsHdrs: Headers): Promise<Response> {
  try {
    const claims = await requireJWT(req, env);
    const tenantId = claims.tenant_id || claims.tenantId;

    // Get tenant plan
    const tenant = await env.DB.prepare("SELECT plan, comped, status FROM tenants WHERE id = ?").bind(tenantId).first();
    if (!tenant) {
      return json({ success: false, error: { code: "TENANT_NOT_FOUND", message: "Tenant not found" } }, 404, corsHdrs);
    }

    // Check if tenant is active
    if (tenant.status !== "active" && tenant.status !== "trial") {
      return json({ success: false, error: { code: "TENANT_INACTIVE", message: "Tenant account is not active" } }, 403, corsHdrs);
    }

    // Get current month
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // For Starter plan (not comped), enforce 1,000 action cap
    if (tenant.plan === "starter" && !tenant.comped) {
      const usage = await env.DB.prepare(`
        SELECT action_count FROM usage_counters WHERE tenant_id = ? AND month = ?
      `).bind(tenantId, month).first();

      const currentCount = usage ? usage.action_count : 0;

      if (currentCount >= 1000) {
        return json({
          success: false,
          error: {
            code: "USAGE_LIMIT_EXCEEDED",
            message: "Monthly action limit (1,000) exceeded. Upgrade to Pro for unlimited actions.",
            usage: {
              month,
              actionCount: currentCount,
              limit: 1000
            }
          }
        }, 429, corsHdrs);
      }
    }

    // Increment or create usage counter
    const counterId = `usage_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await env.DB.prepare(`
      INSERT INTO usage_counters (id, tenant_id, month, action_count)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(tenant_id, month) DO UPDATE SET
        action_count = action_count + 1,
        updated_at = unixepoch()
    `).bind(counterId, tenantId, month).run();

    // Get updated count
    const updated = await env.DB.prepare(`
      SELECT action_count FROM usage_counters WHERE tenant_id = ? AND month = ?
    `).bind(tenantId, month).first();

    const newCount = updated ? updated.action_count : 1;
    const limit = tenant.plan === "starter" && !tenant.comped ? 1000 : null;
    const remaining = limit ? Math.max(0, limit - newCount) : null;

    return json({
      success: true,
      usage: {
        month,
        actionCount: newCount,
        limit,
        remaining
      }
    }, 200, corsHdrs);

  } catch (err: any) {
    if (err instanceof Response) throw err;
    logJSON("error", requestId, { message: "INCREMENT_USAGE_ERROR", error: err.message });
    return json({ success: false, error: { code: "SERVER_ERROR", message: err.message } }, 500, corsHdrs);
  }
}
