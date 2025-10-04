// src/services/provisioning.ts

import { issueTenantAdminJWT } from "./jwt";
import { putTenantConfig } from "./tenants";
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

        console.log(`[Provisioning] Promo code applied: ${request.promoCode} for ${tenantId}`);
      } else {
        console.warn(`[Provisioning] Invalid promo code: ${request.promoCode}`, promoResult.error);
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

    // 6. Send welcome email (optional - implement later)
    if (env.SENDGRID_API_KEY || env.RESEND_API_KEY) {
      await sendWelcomeEmail(env, {
        to: request.contactEmail,
        clubName: request.clubName,
        setupUrl,
        adminJWT
      });
    }

    // 7. Deploy Apps Script automatically (if enabled)
    let appsScriptDeployment = null;
    if (env.APPS_SCRIPT_AUTO_DEPLOY === "true") {
      const { deployAppsScriptForTenant } = await import("./appsScriptDeployer");

      appsScriptDeployment = await deployAppsScriptForTenant(
        env,
        tenantId,
        request.clubName,
        automationJWT
      );

      if (appsScriptDeployment.success) {
        console.log(`[Provisioning] Apps Script deployed for ${tenantId}:`, appsScriptDeployment.scriptId);
      } else {
        console.warn(`[Provisioning] Apps Script deployment failed (non-critical):`, appsScriptDeployment.error);
      }
    }

    return {
      success: true,
      tenant: {
        id: tenantId,
        name: request.clubName,
        adminJWT,
        automationJWT,
        setupUrl,
        adminConsoleUrl,
        appsScript: appsScriptDeployment?.success ? {
          scriptId: appsScriptDeployment.scriptId,
          scriptUrl: appsScriptDeployment.scriptUrl,
          webAppUrl: appsScriptDeployment.webAppUrl
        } : null
      }
    };

  } catch (error: any) {
    console.error("PROVISIONING_ERROR", error);
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

/**
 * Send welcome email to new tenant
 */
async function sendWelcomeEmail(env: Env, data: {
  to: string;
  clubName: string;
  setupUrl: string;
  adminJWT: string;
}) {
  // Example using Resend API
  if (!env.RESEND_API_KEY) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "onboarding@yourdomain.com",
      to: data.to,
      subject: `Welcome to ${data.clubName} - Platform Setup`,
      html: `
        <h1>Welcome to the Platform!</h1>
        <p>Your club <strong>${data.clubName}</strong> has been set up successfully.</p>

        <h2>Next Steps:</h2>
        <ol>
          <li><a href="${data.setupUrl}">Complete your setup</a> (link expires in 24 hours)</li>
          <li>Configure your automation preferences</li>
          <li>Connect your social media accounts</li>
        </ol>

        <h2>Your Credentials:</h2>
        <p><strong>Admin Token:</strong> ${data.adminJWT.substring(0, 20)}...</p>
        <p><em>Keep this secure - it provides full access to your account.</em></p>

        <p>Need help? Reply to this email or visit our documentation.</p>
      `
    })
  });
}

/**
 * Deploy Apps Script instance for tenant (advanced)
 * Requires Google Cloud Service Account + Clasp API
 */
export async function deployAppsScript(
  env: Env,
  tenantId: string,
  automationJWT: string
): Promise<{ success: boolean; scriptId?: string; error?: string }> {
  try {
    // This requires:
    // 1. Google Cloud Service Account with Apps Script API enabled
    // 2. Template Apps Script project
    // 3. clasp library or Google Apps Script API

    // Pseudocode:
    // const serviceAccountKey = env.GOOGLE_SERVICE_ACCOUNT_KEY;
    // const templateScriptId = env.APPS_SCRIPT_TEMPLATE_ID;

    // 1. Clone template script
    // const newScriptId = await claspClone(templateScriptId, serviceAccountKey);

    // 2. Update Script Properties
    // await setScriptProperties(newScriptId, {
    //   TENANT_ID: tenantId,
    //   BACKEND_JWT: automationJWT,
    //   BACKEND_API_URL: env.BACKEND_URL
    // });

    // 3. Deploy as web app
    // await claspDeploy(newScriptId);

    // For now, return placeholder
    return {
      success: false,
      error: "Apps Script automation not yet implemented - requires Google Cloud setup"
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}
