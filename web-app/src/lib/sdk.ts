// src/lib/sdk.ts
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  '';

if (!API_BASE) {
  console.warn('NEXT_PUBLIC_API_BASE(_URL) is not set');
}

export type ProvisionCheckpoint =
  | 'seedDefaultContent'
  | 'configureRouting'
  | 'validateWebhook'
  | 'deployAutomations'
  | 'deployAppsScript'
  | 'sendOwnerEmails'
  | 'markReady';

export type ProvisionStatus = 'pending' | 'running' | 'failed' | 'ready';

export type ProvisionState = {
  tenantId: string;
  status: ProvisionStatus;
  step?: ProvisionCheckpoint | null;
  steps?: Record<ProvisionCheckpoint, 'pending' | 'running' | 'done' | 'failed'>;
  error?: string | null;
};

function headers(json = true) {
  const h: Record<string, string> = {};
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function http<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function getProvisionStatus(tenantId: string) {
  return http<ProvisionState>(
    `${API_BASE}/api/v1/tenants/${encodeURIComponent(tenantId)}/provision-status`
  );
}

export async function startMagicLogin(input: { email: string; tenantId?: string }) {
  return http<{ success: boolean; message?: string }>(
    `${API_BASE}/auth/magic/start`,
    { method: 'POST', headers: headers(), body: JSON.stringify(input) }
  );
}

export async function verifyMagicToken(token: string) {
  return http<{ success: boolean; redirect?: string }>(
    `${API_BASE}/auth/magic/verify?token=${encodeURIComponent(token)}`
  );
}

export async function getAdminOverview(tenantId: string) {
  return http<{
    success: true;
    data: {
      id: string;
      slug: string;
      name: string;
      plan: string;
      status: string;
      route_ready: number;
      provisioned_at: string | null;
      posts_count: number;
      webhooks_validated: number;
    };
  }>(`${API_BASE}/api/v1/tenants/${encodeURIComponent(tenantId)}/overview`);
}
