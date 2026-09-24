// src/services/provisioning.ts

import { issueTenantAdminJWT } from "./jwt";
import { putTenantConfig } from "./tenantConfig";
import { sendWelcomeEmail } from "../lib/email";
import type { TenantConfig, Env } from "../types";

/**
 * Automated tenant provisioning service
 * Handles end-to-end onboarding of new clubs
 */

export interface ProvisioningRequest {
  clubName: string;
  clubShortName: string; // Used as tenant ID
  contactEmail: string;
  contactName: string;
  locale?: string;
  timezone?: string;
  plan?: "free" | "managed" | "enterprise";
  makeWebhookUrl?: string;
  promoCode?: string;  // Optional promo code
}

export interface ProvisioningResult {
  success: boolean;
  tenant?: {
    id: string;
    name: string;
    adminJWT: string;
    automationJWT: string;
    setupUrl: string;
    adminConsoleUrl: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Provision a new tenant with full automation
 */
export async function provisionTenant(
  env: Env,
  request: ProvisioningRequest
): Promise<ProvisioningResult> {
  try {
    // 1. Validate tenant ID (club short name)
    const tenantId = sanitizeTenantId(request.clubShortName);

    // Check if tenant already exists
    const existing = await env.KV_IDEMP.get(`tenant:${tenantId}`);
    if (existing) {
      return {
        success: false,
        error: {
          code: "TENANT_EXISTS",
          message: `Tenant '${tenantId}' already exists`
        }
      };
    }

    // 2. Apply promo code if provided
    let finalPlan = request.plan || "free";
    let promoCodeApplied = null;

    if (request.promoCode) {
      const { PromoCodeService } = await import("./promoCodes");
      const promoService = new PromoCodeService(env);

      const promoResult = await promoService.applyPromoCode(request.promoCode, tenantId);

      if (promoResult.success && promoResult.discount) {
        promoCodeApplied = {
          code: request.promoCode,
          discount: promoResult.discount
        };

        // Apply plan upgrade if promo code specifies it
        if (promoResult.discount.type === 'plan_upgrade') {
          finalPlan = promoResult.discount.plan as "free" | "managed" | "enterprise";
        }

      } else {
        // Don't fail provisioning, just log warning and continue
      }
    }

    // 3. Determine flags based on final plan
    const flags = determineFlagsForPlan(finalPlan);

    // 4. Create tenant config
    const tenantConfig: TenantConfig = {
      id: tenantId,
      name: request.clubName,
      locale: request.locale || "en-GB",
      tz: request.timezone || "Europe/London",
      flags,
      makeWebhookUrl: request.makeWebhookUrl || null,
      metadata: {
        contactEmail: request.contactEmail,
        contactName: request.contactName,
        plan: finalPlan,
        createdAt: new Date().toISOString(),
        provisionedBy: "automated",
        ...(promoCodeApplied && {
          promoCode: promoCodeApplied.code,
          promoDiscount: promoCodeApplied.discount
        })
      }
    };

    await putTenantConfig(env, tenantConfig);

    // 4. Generate JWT tokens
    const adminJWT = await issueTenantAdminJWT(env, {
      tenant_id: tenantId,
      ttlMinutes: 525600 // 1 year
    });

    const automationJWT = await issueTenantAdminJWT(env, {
      tenant_id: tenantId,
      ttlMinutes: 525600 // 1 year
    });

    // 5. Generate setup URLs
    const baseUrl = env.SETUP_URL || "https://setup-console.team-platform-2025.workers.dev";
    const setupToken = await generateSetupToken(env, tenantId);
    const setupUrl = `${baseUrl}?token=${setupToken}`;

    const adminConsoleUrl = env.ADMIN_CONSOLE_URL || "https://admin-console.team-platform-2025.workers.dev";

    // 6. Welcome email (shared Boost Huddle template; never includes tokens)
    await sendWelcomeEmail(request.contactEmail, request.clubName, setupUrl, env);

    return {
      success: true,
      tenant: {
        id: tenantId,
        name: request.clubName,
        adminJWT,
        automationJWT,
        setupUrl,
        adminConsoleUrl,
      }
    };

  } catch (error: any) {
    return {
      success: false,
      error: {
        code: "PROVISIONING_FAILED",
        message: error.message || "Unknown error"
      }
    };
  }
}

/**
 * Sanitize tenant ID (lowercase, alphanumeric + hyphens only)
 */
function sanitizeTenantId(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 32);
}

/**
 * Determine tenant flags based on plan
 */
function determineFlagsForPlan(plan: string) {
  switch (plan) {
    case "enterprise":
    case "managed":
      return { use_make: false, direct_yt: true, direct_fb: true, direct_ig: true };
    case "free":
    default:
      return { use_make: true, direct_yt: false };
  }
}

/**
 * Generate time-limited setup token
 */
async function generateSetupToken(env: Env, tenantId: string): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

  // Store setup token with 24-hour expiration
  await env.KV_IDEMP.put(
    `setup-token:${token}`,
    JSON.stringify({ tenantId, expiresAt })
  );

  return token;
}
