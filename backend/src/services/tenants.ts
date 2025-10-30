import type { Env } from "../types/env";

export interface Tenant {
  tenantId: string;
  teamName: string;
  primary: string;
  secondary: string;
  badgeUrl: string;
  contactEmail: string;
  makeWebhookUrl?: string;
  youtubeChannelId?: string;
  spreadsheetId?: string;
  status: "PROVISIONING" | "READY" | "ERROR";
  validatorReport?: unknown;
  createdAt: string;
  updatedAt: string;
}

const key = (tenantId: string) => `tenant:${tenantId}`;

export async function putTenant(env: Env, tenant: Tenant) {
  const record: Tenant = {
    ...tenant,
    createdAt: tenant.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await env.TENANTS.put(key(record.tenantId), JSON.stringify(record));
  return record;
}

export async function getTenant(env: Env, tenantId: string): Promise<Tenant | null> {
  const raw = await env.TENANTS.get(key(tenantId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Tenant;
  } catch {
    return null;
  }
}
