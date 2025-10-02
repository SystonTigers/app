import { TenantConfig } from "../types";

export interface PublishParams {
  tenant: TenantConfig;
  job: { template: string; data: any; mediaUrl?: string; text?: string; };
  env: any;
  fetchImpl?: typeof fetch;
}

export async function publishInstagram(p: PublishParams): Promise<void> {
  const { tenant, job, env, fetchImpl = fetch } = p;

  // 1) Check if BYO-Make webhook is configured for IG
  const makeWebhook = tenant.creds?.make?.ig;
  if (makeWebhook) {
    // Forward to Make.com webhook
    const payload = {
      kind: "instagram_post",
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
      throw new Error(`BYO-Make webhook failed for IG: ${r.status}`);
    }

    return; // Successfully forwarded to Make
  }

  // 2) Check if Managed mode is enabled
  const isManaged = tenant.flags?.managed?.ig ?? false;
  if (isManaged) {
    // Check if we have credentials
    const igCreds = tenant.creds?.ig;
    if (!igCreds?.ig_user_id || !igCreds?.access_token) {
      throw new Error("Managed IG enabled but credentials not configured. Please connect Instagram or use BYO-Make.");
    }

    // TODO: Implement real Instagram Graph API publishing
    // For now, throw "Not implemented"
    throw new Error("Instagram Managed publishing not yet implemented. Use BYO-Make or wait for update.");
  }

  // 3) Neither BYO-Make nor Managed configured
  throw new Error("Instagram channel not configured. Enable Managed mode or set BYO-Make webhook.");
}
