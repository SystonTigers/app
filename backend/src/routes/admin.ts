// src/routes/admin.ts
// Owner Console - Admin routes for managing tenants, promo codes, etc.

import { z } from "zod";
import { json } from "../services/util";
import { parse, isValidationError } from "../lib/validate";
import { requireAdmin } from "../services/auth";
import { logJSON } from "../lib/log";

// GET /api/v1/admin/tenants - List all tenants
export async function listTenants(req: Request, env: any, requestId: string, corsHdrs: Headers): Promise<Response> {
  try {
    // Require admin authentication
    await requireAdmin(req, env);

    const url = new URL(req.url);
    const status = url.searchParams.get("status");  // filter by status
    const plan = url.searchParams.get("plan");  // filter by plan
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    let query = `
      SELECT
        id, slug, name, email, plan, status, comped,
        trial_ends_at, created_at, updated_at
      FROM tenants
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      query += " AND status = ?";
      params.push(status);
    }
    if (plan) {
      query += " AND plan = ?";
      params.push(plan);
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const stmt = env.DB.prepare(query);
    const results = await stmt.bind(...params).all();

    // Get total count
    let countQuery = "SELECT COUNT(*) as total FROM tenants WHERE 1=1";
    const countParams: any[] = [];
    if (status) {
      countQuery += " AND status = ?";
      countParams.push(status);
    }
    if (plan) {
      countQuery += " AND plan = ?";
      countParams.push(plan);
    }
    const countResult = await env.DB.prepare(countQuery).bind(...countParams).first();
    const total = countResult ? countResult.total : 0;

    return json({
      success: true,
      tenants: results.results || [],
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    }, 200, corsHdrs);

  } catch (err: any) {
    if (err instanceof Response) throw err;
    logJSON("error", requestId, { message: "LIST_TENANTS_ERROR", error: err.message });
    return json({ success: false, error: { code: "SERVER_ERROR", message: err.message } }, 500, corsHdrs);
  }
}

// GET /api/v1/admin/tenants/:id - Get tenant details
export async function getTenant(req: Request, env: any, requestId: string, corsHdrs: Headers, tenantId: string): Promise<Response> {
  try {
    await requireAdmin(req, env);

    const tenant = await env.DB.prepare(`
      SELECT
        t.*,
        tb.primary_color, tb.secondary_color, tb.badge_url,
        mc.webhook_url as make_webhook_url,
        pa.apps_script_id
      FROM tenants t
      LEFT JOIN tenant_brand tb ON t.id = tb.tenant_id
      LEFT JOIN make_connections mc ON t.id = mc.tenant_id
      LEFT JOIN pro_automation pa ON t.id = pa.tenant_id
      WHERE t.id = ?
    `).bind(tenantId).first();

    if (!tenant) {
      return json({ success: false, error: { code: "NOT_FOUND", message: "Tenant not found" } }, 404, corsHdrs);
    }

    // Get usage history (last 6 months)
    const now = new Date();
    const usageHistory = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const usage = await env.DB.prepare(`
        SELECT action_count FROM usage_counters WHERE tenant_id = ? AND month = ?
      `).bind(tenantId, month).first();
      usageHistory.push({
        month,
        actionCount: usage ? usage.action_count : 0
      });
    }

    return json({
      success: true,
      tenant: {
        ...tenant,
        usageHistory
      }
    }, 200, corsHdrs);

  } catch (err: any) {
    if (err instanceof Response) throw err;
    logJSON("error", requestId, { message: "GET_TENANT_ERROR", error: err.message });
    return json({ success: false, error: { code: "SERVER_ERROR", message: err.message } }, 500, corsHdrs);
  }
}

// PATCH /api/v1/admin/tenants/:id - Update tenant
export async function updateTenant(req: Request, env: any, requestId: string, corsHdrs: Headers, tenantId: string): Promise<Response> {
  try {
    await requireAdmin(req, env);

    const body = await req.json().catch(() => ({}));

    const UpdateSchema = z.object({
      status: z.enum(["trial", "active", "suspended", "cancelled"]).optional(),
      comped: z.boolean().optional(),
      plan: z.enum(["starter", "pro"]).optional()
    });

    const data = parse(UpdateSchema, body);

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];

    if (data.status !== undefined) {
      updates.push("status = ?");
      params.push(data.status);
    }
    if (data.comped !== undefined) {
      updates.push("comped = ?");
      params.push(data.comped ? 1 : 0);
    }
    if (data.plan !== undefined) {
      updates.push("plan = ?");
      params.push(data.plan);
    }

    if (updates.length === 0) {
      return json({ success: false, error: { code: "NO_UPDATES", message: "No fields to update" } }, 400, corsHdrs);
    }

    updates.push("updated_at = unixepoch()");
    params.push(tenantId);

    await env.DB.prepare(`
      UPDATE tenants SET ${updates.join(", ")} WHERE id = ?
    `).bind(...params).run();

    return json({ success: true }, 200, corsHdrs);

  } catch (err: any) {
    if (err instanceof Response) throw err;
    if (isValidationError(err)) {
      return json({
        success: false,
        error: { code: "INVALID_REQUEST", message: "Validation failed", issues: err.issues }
      }, 400, corsHdrs);
    }
    logJSON("error", requestId, { message: "UPDATE_TENANT_ERROR", error: err.message });
    return json({ success: false, error: { code: "SERVER_ERROR", message: err.message } }, 500, corsHdrs);
  }
}

// GET /api/v1/admin/promo-codes - List promo codes
export async function listPromoCodes(req: Request, env: any, requestId: string, corsHdrs: Headers): Promise<Response> {
  try {
    await requireAdmin(req, env);

    const codes = await env.DB.prepare(`
      SELECT id, code, discount_percent, max_uses, used_count, valid_until, created_at
      FROM promo_codes
      ORDER BY created_at DESC
    `).all();

    return json({
      success: true,
      promoCodes: codes.results || []
    }, 200, corsHdrs);

  } catch (err: any) {
    if (err instanceof Response) throw err;
    logJSON("error", requestId, { message: "LIST_PROMO_CODES_ERROR", error: err.message });
    return json({ success: false, error: { code: "SERVER_ERROR", message: err.message } }, 500, corsHdrs);
  }
}

// POST /api/v1/admin/promo-codes - Create promo code
export async function createPromoCode(req: Request, env: any, requestId: string, corsHdrs: Headers): Promise<Response> {
  try {
    await requireAdmin(req, env);

    const body = await req.json().catch(() => ({}));

    const PromoSchema = z.object({
      code: z.string().min(4).max(20).regex(/^[A-Z0-9]+$/, "Code must be uppercase alphanumeric"),
      discountPercent: z.number().min(0).max(100),
      maxUses: z.number().int().positive().optional(),
      validUntil: z.number().int().optional()  // Unix timestamp
    });

    const data = parse(PromoSchema, body);

    // Check if code already exists
    const existing = await env.DB.prepare("SELECT id FROM promo_codes WHERE code = ?").bind(data.code).first();
    if (existing) {
      return json({ success: false, error: { code: "CODE_EXISTS", message: "Promo code already exists" } }, 400, corsHdrs);
    }

    const promoId = `promo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await env.DB.prepare(`
      INSERT INTO promo_codes (id, code, discount_percent, max_uses, valid_until)
      VALUES (?, ?, ?, ?, ?)
    `).bind(promoId, data.code, data.discountPercent, data.maxUses || null, data.validUntil || null).run();

    return json({
      success: true,
      promoCode: {
        id: promoId,
        code: data.code,
        discountPercent: data.discountPercent,
        maxUses: data.maxUses || null,
        validUntil: data.validUntil || null
      }
    }, 201, corsHdrs);

  } catch (err: any) {
    if (err instanceof Response) throw err;
    if (isValidationError(err)) {
      return json({
        success: false,
        error: { code: "INVALID_REQUEST", message: "Validation failed", issues: err.issues }
      }, 400, corsHdrs);
    }
    logJSON("error", requestId, { message: "CREATE_PROMO_CODE_ERROR", error: err.message });
    return json({ success: false, error: { code: "SERVER_ERROR", message: err.message } }, 500, corsHdrs);
  }
}

// POST /api/v1/admin/tenants/:id/deactivate - Deactivate tenant (soft delete)
export async function deactivateTenant(req: Request, env: any, requestId: string, corsHdrs: Headers, tenantId: string): Promise<Response> {
  try {
    await requireAdmin(req, env);

    // Never deactivate Syston production tenant
    const current = await env.DB.prepare(`SELECT slug FROM tenants WHERE id = ?`).bind(tenantId).first();
    if (!current) {
      return json({ success: false, error: { code: "NOT_FOUND", message: "Tenant not found" } }, 404, corsHdrs);
    }

    const protectedSlugs = ["syston-town-tigers", "syston", "syston-tigers"];
    if (protectedSlugs.includes(current.slug as string)) {
      return json({ success: false, error: { code: "PROTECTED_TENANT", message: "Cannot deactivate protected tenant" } }, 403, corsHdrs);
    }

    await env.DB.prepare(`UPDATE tenants SET status = 'deactivated', updated_at = unixepoch() WHERE id = ?`).bind(tenantId).run();

    logJSON("info", requestId, { message: "TENANT_DEACTIVATED", tenantId, slug: current.slug });
    return json({ success: true }, 200, corsHdrs);

  } catch (err: any) {
    if (err instanceof Response) throw err;
    logJSON("error", requestId, { message: "DEACTIVATE_TENANT_ERROR", error: err.message });
    return json({ success: false, error: { code: "SERVER_ERROR", message: err.message } }, 500, corsHdrs);
  }
}

// DELETE /api/v1/admin/tenants/:id - Delete tenant (hard delete)
export async function deleteTenant(req: Request, env: any, requestId: string, corsHdrs: Headers, tenantId: string): Promise<Response> {
  try {
    await requireAdmin(req, env);

    // Never delete Syston production tenant
    const current = await env.DB.prepare(`SELECT slug FROM tenants WHERE id = ?`).bind(tenantId).first();
    if (!current) {
      return json({ success: false, error: { code: "NOT_FOUND", message: "Tenant not found" } }, 404, corsHdrs);
    }

    const protectedSlugs = ["syston-town-tigers", "syston", "syston-tigers"];
    if (protectedSlugs.includes(current.slug as string)) {
      return json({ success: false, error: { code: "PROTECTED_TENANT", message: "Cannot delete protected tenant" } }, 403, corsHdrs);
    }

    // Cascade deletes - delete related data first, then tenant
    await env.DB.batch([
      env.DB.prepare(`DELETE FROM promo_redemptions WHERE tenant_id = ?`).bind(tenantId),
      env.DB.prepare(`DELETE FROM feed_posts WHERE tenant_id = ?`).bind(tenantId),
      env.DB.prepare(`DELETE FROM make_connections WHERE tenant_id = ?`).bind(tenantId),
      env.DB.prepare(`DELETE FROM tenant_brand WHERE tenant_id = ?`).bind(tenantId),
      env.DB.prepare(`DELETE FROM pro_automation WHERE tenant_id = ?`).bind(tenantId),
      env.DB.prepare(`DELETE FROM usage_counters WHERE tenant_id = ?`).bind(tenantId),
      env.DB.prepare(`DELETE FROM tenants WHERE id = ?`).bind(tenantId),
    ]);

    logJSON("info", requestId, { message: "TENANT_DELETED", tenantId, slug: current.slug });
    return json({ success: true }, 200, corsHdrs);

  } catch (err: any) {
    if (err instanceof Response) throw err;
    logJSON("error", requestId, { message: "DELETE_TENANT_ERROR", error: err.message });
    return json({ success: false, error: { code: "SERVER_ERROR", message: err.message } }, 500, corsHdrs);
  }
}

// POST /api/v1/admin/promo-codes/:code/deactivate - Deactivate promo code
export async function deactivatePromoCode(req: Request, env: any, requestId: string, corsHdrs: Headers, code: string): Promise<Response> {
  try {
    await requireAdmin(req, env);

    const existing = await env.DB.prepare("SELECT id FROM promo_codes WHERE code = ?").bind(code).first();
    if (!existing) {
      return json({ success: false, error: { code: "NOT_FOUND", message: "Promo code not found" } }, 404, corsHdrs);
    }

    await env.DB.prepare(`
      UPDATE promo_codes SET active = 0 WHERE code = ?
    `).bind(code).run();

    logJSON("info", requestId, { message: "PROMO_CODE_DEACTIVATED", code });
    return json({ success: true }, 200, corsHdrs);

  } catch (err: any) {
    if (err instanceof Response) throw err;
    logJSON("error", requestId, { message: "DEACTIVATE_PROMO_CODE_ERROR", error: err.message });
    return json({ success: false, error: { code: "SERVER_ERROR", message: err.message } }, 500, corsHdrs);
  }
}

// GET /api/v1/admin/stats - Dashboard statistics
export async function getAdminStats(req: Request, env: any, requestId: string, corsHdrs: Headers): Promise<Response> {
  try {
    await requireAdmin(req, env);

    // Get counts by status
    const statusCounts = await env.DB.prepare(`
      SELECT status, COUNT(*) as count FROM tenants GROUP BY status
    `).all();

    // Get counts by plan
    const planCounts = await env.DB.prepare(`
      SELECT plan, COUNT(*) as count FROM tenants GROUP BY plan
    `).all();

    // Get recent signups (last 30 days)
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    const recentSignups = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM tenants WHERE created_at >= ?
    `).bind(thirtyDaysAgo).first();

    // Get total usage this month
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthlyUsage = await env.DB.prepare(`
      SELECT SUM(action_count) as total FROM usage_counters WHERE month = ?
    `).bind(month).first();

    return json({
      success: true,
      stats: {
        byStatus: statusCounts.results || [],
        byPlan: planCounts.results || [],
        recentSignups: recentSignups?.count || 0,
        monthlyUsage: monthlyUsage?.total || 0
      }
    }, 200, corsHdrs);

  } catch (err: any) {
    if (err instanceof Response) throw err;
    logJSON("error", requestId, { message: "GET_ADMIN_STATS_ERROR", error: err.message });
    return json({ success: false, error: { code: "SERVER_ERROR", message: err.message } }, 500, corsHdrs);
  }
}
