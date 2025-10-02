import { TenantConfig } from "../types";

export interface PublishParams {
  tenant: TenantConfig;
  job: { template: string; data: any; mediaUrl?: string; text?: string; };
  env: any;
  fetchImpl?: typeof fetch;
}

export async function publishX(p: PublishParams): Promise<void> {
  const { tenant, job, env, fetchImpl = fetch } = p;

  // 1) Check if BYO-Make webhook is configured for X
  const makeWebhook = tenant.creds?.make?.x;
  if (makeWebhook) {
    // Forward to Make.com webhook
    const payload = {
      kind: "x_post",
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
      throw new Error(`BYO-Make webhook failed for X: ${r.status}`);
    }

    return; // Successfully forwarded to Make
  }

  // 2) Check if Managed mode is enabled
  const isManaged = tenant.flags?.managed?.x ?? false;
  if (isManaged) {
    // Check if we have credentials
    const xCreds = tenant.creds?.x;
    if (!xCreds?.access_token || !xCreds?.access_secret) {
      throw new Error("Managed X enabled but credentials not configured. Please connect X (Twitter) or use BYO-Make.");
    }

    // TODO: Implement real X (Twitter) API publishing
    // For now, throw "Not implemented"
    throw new Error("X (Twitter) Managed publishing not yet implemented. Use BYO-Make or wait for update.");
  }

  // 3) Neither BYO-Make nor Managed configured
  throw new Error("X (Twitter) channel not configured. Enable Managed mode or set BYO-Make webhook.");
}
