// src/routes/signup.ts
// Self-Serve Signup System (Phase 3)

import { z } from "zod";
import { json, parse, isValidationError } from "../lib/validate";
import { requireJWT } from "../services/auth";
import { issueTenantAdminJWT, generateServiceJWT } from "../services/jwt";
import { isAllowedWebhookHost } from "../services/tenantConfig";
import { logJSON } from "../lib/log";

const StartSchema = z.object({
  clubName: z.string().min(1, "Club name required"),
  clubSlug: z.string().min(3, "Slug must be at least 3 characters").regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  email: z.string().email("Valid email required"),
  plan: z.enum(["starter", "pro"]),
  promoCode: z.string().optional()
});

const BrandSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be valid hex color"),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be valid hex color")
});

const MakeSchema = z.object({
  webhookUrl: z.string().url(),
  webhookSecret: z.string().min(16, "Secret must be at least 16 characters")
});

// Helper function to queue provisioning
async function queueProvisioning(env: any, tenantId: string): Promise<void> {
  try {
    // Generate short-lived service JWT
    const serviceJWT = await generateServiceJWT(env, 30);

    // Call internal provisioning endpoint
    const baseUrl = env.BACKEND_URL || 'http://localhost:8787';
    await fetch(`${baseUrl}/internal/provision/queue`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceJWT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tenantId }),
    });

    console.log(`[Signup] Queued provisioning for ${tenantId}`);
  } catch (error) {
    console.error(`[Signup] Failed to queue provisioning for ${tenantId}:`, error);
    // Don't fail signup if provisioning queue fails - it can be retried
  }
}

// POST /public/signup/start - Step 1: Create tenant account
export async function signupStart(req: Request, env: any, requestId: string, corsHdrs: Headers): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const data = parse(StartSchema, body);

    // Check if slug is already taken
    const existing = await env.DB.prepare("SELECT id FROM tenants WHERE slug = ?").bind(data.clubSlug).first();
    if (existing) {
      return json({ success: false, error: { code: "SLUG_TAKEN", message: "That club slug is already in use" } }, 400, corsHdrs);
    }

    // Check if email is already registered
    const existingEmail = await env.DB.prepare("SELECT id FROM tenants WHERE email = ?").bind(data.email).first();
    if (existingEmail) {
      return json({ success: false, error: { code: "EMAIL_EXISTS", message: "That email is already registered" } }, 400, corsHdrs);
    }

    // Validate promo code if provided
    let promoId = null;
    let discount = 0;
    let comped = 0;

    if (data.promoCode) {
      const promo = await env.DB.prepare(`
        SELECT id, code, discount_percent, max_uses, used_count, valid_until
        FROM promo_codes
        WHERE code = ? COLLATE NOCASE
      `).bind(data.promoCode).first();

      if (!promo) {
        return json({ success: false, error: { code: "INVALID_PROMO", message: "Invalid promo code" } }, 400, corsHdrs);
      }

      // Check if promo is expired
      if (promo.valid_until && promo.valid_until < Math.floor(Date.now() / 1000)) {
        return json({ success: false, error: { code: "PROMO_EXPIRED", message: "Promo code has expired" } }, 400, corsHdrs);
      }

      // Check if promo has reached max uses
      if (promo.max_uses && promo.used_count >= promo.max_uses) {
        return json({ success: false, error: { code: "PROMO_MAXED", message: "Promo code has reached maximum uses" } }, 400, corsHdrs);
      }

      promoId = promo.id;
      discount = promo.discount_percent;

      // If 100% discount, mark as comped
      if (discount === 100) {
        comped = 1;
      }
    }

    // Generate tenant ID
    const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Calculate trial end date (14 days from now)
    const trialEndsAt = Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60);

    // Create tenant record
    await env.DB.prepare(`
      INSERT INTO tenants (id, slug, name, email, plan, status, comped, trial_ends_at)
      VALUES (?, ?, ?, ?, ?, 'trial', ?, ?)
    `).bind(tenantId, data.clubSlug, data.clubName, data.email, data.plan, comped, trialEndsAt).run();

    // Create default brand
    await env.DB.prepare(`
      INSERT INTO tenant_brand (tenant_id, primary_color, secondary_color)
      VALUES (?, '#FFD700', '#000000')
    `).bind(tenantId).run();

    // Record promo redemption if applicable
    if (promoId) {
      const redemptionId = `redemption_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await env.DB.prepare(`
        INSERT INTO promo_redemptions (id, tenant_id, promo_code_id)
        VALUES (?, ?, ?)
      `).bind(redemptionId, tenantId, promoId).run();

      // Increment promo used count
      await env.DB.prepare(`
        UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ?
      `).bind(promoId).run();
    }

    // Issue admin JWT for this tenant (1 year TTL)
    const jwt = await issueTenantAdminJWT(env, { tenant_id: tenantId, ttlMinutes: 525600 });

    return json({
      success: true,
      tenant: {
        id: tenantId,
        slug: data.clubSlug,
        name: data.clubName,
        email: data.email,
        plan: data.plan,
        status: "trial",
        comped: comped === 1,
        trialEndsAt
      },
      discount,
      jwt
    }, 200, corsHdrs);

  } catch (err: any) {
    if (isValidationError(err)) {
      return json({
        success: false,
        error: { code: "INVALID_REQUEST", message: "Validation failed", issues: err.issues }
      }, 400, corsHdrs);
    }
    logJSON("error", requestId, { message: "SIGNUP_START_ERROR", error: err.message });
    return json({ success: false, error: { code: "SIGNUP_FAILED", message: err.message } }, 500, corsHdrs);
  }
}

// POST /public/signup/brand - Step 2: Customize brand colors
export async function signupBrand(req: Request, env: any, requestId: string, corsHdrs: Headers): Promise<Response> {
  try {
    const claims = await requireJWT(req, env);
    const tenantId = claims.tenant_id || claims.tenantId;

    const body = await req.json().catch(() => ({}));
    const data = parse(BrandSchema, body);

    // Update brand colors
    await env.DB.prepare(`
      UPDATE tenant_brand
      SET primary_color = ?, secondary_color = ?, updated_at = unixepoch()
      WHERE tenant_id = ?
    `).bind(data.primaryColor, data.secondaryColor, tenantId).run();

    return json({ success: true }, 200, corsHdrs);

  } catch (err: any) {
    if (err instanceof Response) throw err;
    if (isValidationError(err)) {
      return json({
        success: false,
        error: { code: "INVALID_REQUEST", message: "Validation failed", issues: err.issues }
      }, 400, corsHdrs);
    }
    logJSON("error", requestId, { message: "BRAND_UPDATE_ERROR", error: err.message });
    return json({ success: false, error: { code: "BRAND_UPDATE_FAILED", message: err.message } }, 500, corsHdrs);
  }
}

// POST /public/signup/starter/make - Step 3a: Configure Make.com webhook (Starter plan)
export async function signupStarterMake(req: Request, env: any, requestId: string, corsHdrs: Headers): Promise<Response> {
  try {
    const claims = await requireJWT(req, env);
    const tenantId = claims.tenant_id || claims.tenantId;

    // Verify tenant is on Starter plan
    const tenant = await env.DB.prepare("SELECT plan FROM tenants WHERE id = ?").bind(tenantId).first();
    if (!tenant || tenant.plan !== "starter") {
      return json({ success: false, error: { code: "PLAN_MISMATCH", message: "This endpoint is only for Starter plan" } }, 400, corsHdrs);
    }

    const body = await req.json().catch(() => ({}));
    const data = parse(MakeSchema, body);

    // Validate webhook host is allowed
    const webhookHost = new URL(data.webhookUrl).hostname;
    if (!isAllowedWebhookHost(webhookHost, env)) {
      return json({
        success: false,
        error: { code: "INVALID_WEBHOOK_HOST", message: "Webhook host not allowed" }
      }, 400, corsHdrs);
    }

    // Create or update Make connection
    const connId = `make_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await env.DB.prepare(`
      INSERT INTO make_connections (id, tenant_id, webhook_url, webhook_secret)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(tenant_id) DO UPDATE SET
        webhook_url = excluded.webhook_url,
        webhook_secret = excluded.webhook_secret
    `).bind(connId, tenantId, data.webhookUrl, data.webhookSecret).run();

    // Mark tenant as active
    await env.DB.prepare(`
      UPDATE tenants SET status = 'active', updated_at = unixepoch() WHERE id = ?
    `).bind(tenantId).run();

    // Queue provisioning in background
    await queueProvisioning(env, tenantId);

    return json({ success: true }, 200, corsHdrs);

  } catch (err: any) {
    if (err instanceof Response) throw err;
    if (isValidationError(err)) {
      return json({
        success: false,
        error: { code: "INVALID_REQUEST", message: "Validation failed", issues: err.issues }
      }, 400, corsHdrs);
    }
    logJSON("error", requestId, { message: "MAKE_SETUP_ERROR", error: err.message });
    return json({ success: false, error: { code: "MAKE_SETUP_FAILED", message: err.message } }, 500, corsHdrs);
  }
}

// POST /public/signup/pro/confirm - Step 3b: Confirm Pro plan setup
export async function signupProConfirm(req: Request, env: any, requestId: string, corsHdrs: Headers): Promise<Response> {
  try {
    const claims = await requireJWT(req, env);
    const tenantId = claims.tenant_id || claims.tenantId;

    // Verify tenant is on Pro plan
    const tenant = await env.DB.prepare("SELECT plan FROM tenants WHERE id = ?").bind(tenantId).first();
    if (!tenant || tenant.plan !== "pro") {
      return json({ success: false, error: { code: "PLAN_MISMATCH", message: "This endpoint is only for Pro plan" } }, 400, corsHdrs);
    }

    // Create placeholder pro_automation record (Apps Script deployment happens async)
    const autoId = `pro_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await env.DB.prepare(`
      INSERT INTO pro_automation (id, tenant_id)
      VALUES (?, ?)
      ON CONFLICT(tenant_id) DO NOTHING
    `).bind(autoId, tenantId).run();

    // Mark tenant as active
    await env.DB.prepare(`
      UPDATE tenants SET status = 'active', updated_at = unixepoch() WHERE id = ?
    `).bind(tenantId).run();

    // Queue provisioning in background
    await queueProvisioning(env, tenantId);

    return json({ success: true }, 200, corsHdrs);

  } catch (err: any) {
    if (err instanceof Response) throw err;
    logJSON("error", requestId, { message: "PRO_CONFIRM_ERROR", error: err.message });
    return json({ success: false, error: { code: "PRO_CONFIRM_FAILED", message: err.message } }, 500, corsHdrs);
  }
}
