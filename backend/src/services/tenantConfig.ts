/**
 * Per-club settings kept in KV (`tenant:<id>`): feature flags and channel
 * credentials read by the older Google and settings code.
 */
import type { TenantConfig, TenantId } from "../types";

const key = (tenant: TenantId) => `tenant:${tenant}`;

export async function getTenantConfig(env: any, tenant: TenantId): Promise<TenantConfig | null> {
  const raw = await env.KV_IDEMP.get(key(tenant));
  if (!raw) {return null;}
  try {
    return JSON.parse(raw) as TenantConfig;
  } catch {
    return null;
  }
}

export async function putTenantConfig(env: any, cfg: TenantConfig): Promise<void> {
  cfg.updated_at = Date.now();
  await env.KV_IDEMP.put(key(cfg.id), JSON.stringify(cfg));
}

export async function ensureTenant(env: any, tenant: TenantId): Promise<TenantConfig> {
  const existing = await getTenantConfig(env, tenant);
  if (existing) {return existing;}
  const fresh: TenantConfig = {
    id: tenant,
    flags: { direct_yt: true },
    creds: {},
    created_at: Date.now(),
    updated_at: Date.now()
  };
  await putTenantConfig(env, fresh);
  return fresh;
}
