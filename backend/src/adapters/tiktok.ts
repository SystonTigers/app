import { TenantConfig } from "../types";

export interface PublishParams {
  tenant: TenantConfig;
  job: { template: string; data: any; mediaUrl?: string; text?: string; };
  env: any;
  fetchImpl?: typeof fetch;
}

export async function publishTikTok(p: PublishParams): Promise<void> {
  const { tenant, job, env, fetchImpl = fetch } = p;

  // 1) Check if BYO-Make webhook is configured for TikTok
  const makeWebhook = tenant.creds?.make?.tiktok;
  if (makeWebhook) {
    // Forward to Make.com webhook
    const payload = {
      kind: "tiktok_post",
      tenant: tenant.id,
      template: job.template,
      data: job.data,
      ts: Date.now(),
    };

    const r = await fetchImpl(makeWebhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      throw new Error(`BYO-Make webhook failed for TikTok: ${r.status}`);
    }

    return; // Successfully forwarded to Make
  }

  // 2) Check if Managed mode is enabled
  const isManaged = tenant.flags?.managed?.tiktok ?? false;
  if (isManaged) {
    // Check if we have credentials
    const tiktokCreds = tenant.creds?.tiktok;
    if (!tiktokCreds?.refresh_token || !tiktokCreds?.open_id) {
      throw new Error("Managed TikTok enabled but credentials not configured. Please connect TikTok or use BYO-Make.");
    }

    // TODO: Implement real TikTok API publishing
    // For now, throw "Not implemented"
    throw new Error("TikTok Managed publishing not yet implemented. Use BYO-Make or wait for update.");
  }

  // 3) Neither BYO-Make nor Managed configured
  throw new Error("TikTok channel not configured. Enable Managed mode or set BYO-Make webhook.");
}
