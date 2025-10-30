import { TenantConfig, TenantFlags, TenantId, TenantCredentials, Channel } from "../types";

const key = (tenant: TenantId) => `tenant:${tenant}`;

export async function getTenantConfig(env: any, tenant: TenantId): Promise<TenantConfig | null> {
  const raw = await env.KV_IDEMP.get(key(tenant));
  if (!raw) return null;
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
  if (existing) return existing;
  const fresh: TenantConfig = {
    id: tenant,
    flags: { use_make: false, direct_yt: true },
    creds: {},
    makeWebhookUrl: null,
    created_at: Date.now(),
    updated_at: Date.now()
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

// New helper functions for per-channel management

export async function setTenantFlags(env: any, tenant: TenantId, patch: Partial<TenantFlags>): Promise<TenantConfig> {
  const cfg = await ensureTenant(env, tenant);
  cfg.flags = { ...cfg.flags, ...patch };
  await putTenantConfig(env, cfg);
  return cfg;
}

export async function setTenantCreds(env: any, tenant: TenantId, patch: Partial<TenantCredentials>): Promise<TenantConfig> {
  const cfg = await ensureTenant(env, tenant);
  cfg.creds = { ...cfg.creds, ...patch };
  await putTenantConfig(env, cfg);
  return cfg;
}

export async function setChannelWebhook(env: any, tenant: TenantId, channel: Channel, url: string): Promise<TenantConfig> {
  const cfg = await ensureTenant(env, tenant);
  if (!cfg.creds) cfg.creds = {};
  if (!cfg.creds.make) cfg.creds.make = {};
  cfg.creds.make[channel] = url;
  await putTenantConfig(env, cfg);
  return cfg;
}

export async function setYouTubeBYOGoogle(env: any, tenant: TenantId, client_id: string, client_secret: string): Promise<TenantConfig> {
  const cfg = await ensureTenant(env, tenant);
  if (!cfg.creds) cfg.creds = {};
  if (!cfg.creds.yt) cfg.creds.yt = {};
  cfg.creds.yt.client_id = client_id;
  cfg.creds.yt.client_secret = client_secret;
  await putTenantConfig(env, cfg);
  return cfg;
}

// Webhook host validation with suffix support - defensive, never throws
export function isAllowedWebhookHost(host: string, allowedCsv: string): boolean {
  try {
    if (!host) return false;
    const raw = (allowedCsv || "").trim();
    if (!raw) return false; // fail closed if no config

    const items = raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const h = host.toLowerCase();

    // Exact match
    if (items.includes(h)) return true;

    // Wildcard *.make.com
    if (items.includes("*.make.com") && h.endsWith(".make.com")) return true;

    // Generic make.com allowance (exact or any subdomain)
    if (items.includes("make.com") && (h === "make.com" || h.endsWith(".make.com"))) return true;

    // Check other suffix rules
    for (const item of items) {
      if (item.startsWith('.')) {
        // explicit suffix rule (e.g. ".make.com")
        if (h.endsWith(item)) return true;
      } else if (item.startsWith('*.')) {
        // wildcard style (e.g. "*.make.com")
        const suf = item.slice(1); // ".make.com"
        if (h.endsWith(suf)) return true;
      }
    }

    return false;
  } catch {
    return false; // never crash due to parsing errors
  }
}
