import { TenantConfig, TenantFlags, TenantId } from "../types";

const key = (tenant: TenantId) => `tenant:${tenant}`;

export async function getTenantConfig(env: any, tenant: TenantId): Promise<TenantConfig | null> {
  const raw = await env.KV_IDEMP.get(key(tenant));
  if (!raw) return null;
  try { return JSON.parse(raw) as TenantConfig; } catch { return null; }
}

export async function putTenantConfig(env: any, cfg: TenantConfig): Promise<void> {
  await env.KV_IDEMP.put(key(cfg.id), JSON.stringify(cfg));
}

export async function ensureTenant(env: any, tenant: TenantId): Promise<TenantConfig> {
  const existing = await getTenantConfig(env, tenant);
  if (existing) return existing;
  const fresh: TenantConfig = {
    id: tenant,
    flags: { use_make: false, direct_yt: true },
    makeWebhookUrl: null,
  };
  await putTenantConfig(env, fresh);
  return fresh;
}

export async function updateFlags(env: any, tenant: TenantId, flags: Partial<TenantFlags>): Promise<TenantConfig> {
  const cfg = await ensureTenant(env, tenant);
  cfg.flags = { ...cfg.flags, ...flags };
  await putTenantConfig(env, cfg);
  return cfg;
}

export async function setMakeWebhook(env: any, tenant: TenantId, url: string): Promise<TenantConfig> {
  const cfg = await ensureTenant(env, tenant);
  cfg.makeWebhookUrl = url;
  await putTenantConfig(env, cfg);
  return cfg;
}

// Backward compatibility: old getTenant function
export async function getTenant(env: any, tenantId: string) {
  return await ensureTenant(env, tenantId);
}
