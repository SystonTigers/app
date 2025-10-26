// src/lib/sdk.ts
function getApiBase(): string {
  const base = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_BASE ||
       process.env.NEXT_PUBLIC_API_BASE_URL ||
       'https://syston-postbus.team-platform-2025.workers.dev')
    : (process.env.NEXT_PUBLIC_API_BASE ||
       process.env.NEXT_PUBLIC_API_BASE_URL ||
       'https://syston-postbus.team-platform-2025.workers.dev');

  console.log('[SDK] API_BASE:', base);
  return base;
}

const API_BASE = getApiBase();

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
  console.log('[SDK] Fetching:', url, 'with options:', init);
  try {
    const res = await fetch(url, {
      ...init,
      credentials: 'include',
      cache: 'no-store',
    });
    console.log('[SDK] Response status:', res.status, res.statusText);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[SDK] Error response:', text);
      const error = new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
      console.error('API fetch failed', { url, init, status: res.status, statusText: res.statusText });
      throw error;
    }
    const data = await res.json();
    console.log('[SDK] Response data:', data);
    return data as T;
  } catch (e) {
    console.error('API fetch failed', { url, init, error: e });
    throw e;
  }
}

export async function getProvisionStatus(tenantId: string) {
  return http<ProvisionState>(
    `${API_BASE}/api/v1/tenants/${encodeURIComponent(tenantId)}/provision-status`
  );
}

export async function startMagicLogin(input: { email: string; tenantId?: string }) {
  const url = `${API_BASE}/auth/magic/start`;
  console.log('[SDK] startMagicLogin URL:', url);
  console.log('[SDK] startMagicLogin input:', input);
  return http<{ success: boolean; message?: string }>(
    url,
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

// ---- Admin endpoints ----

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  email: string;
  plan: 'starter' | 'pro';
  status: 'trial' | 'active' | 'suspended' | 'cancelled' | 'deactivated';
  comped: boolean;
  trial_ends_at?: number;
  created_at: number;
  updated_at: number;
}

export interface PromoCode {
  id: string;
  code: string;
  discount_percent: number;
  max_uses?: number | null;
  used_count: number;
  valid_until?: number | null;
  active?: boolean;
  created_at: number;
}

export interface AdminStats {
  byStatus: Array<{ status: string; count: number }>;
  byPlan: Array<{ plan: string; count: number }>;
  recentSignups: number;
  monthlyUsage: number;
}

export async function getAdminStats() {
  return http<{ success: true; stats: AdminStats }>(
    `${API_BASE}/api/v1/admin/stats`
  );
}

export async function listTenants(params?: { status?: string; plan?: string; limit?: number; offset?: number }) {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.plan) query.set('plan', params.plan);
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.offset) query.set('offset', params.offset.toString());

  const qs = query.toString();
  return http<{
    success: true;
    tenants: Tenant[];
    pagination: { total: number; limit: number; offset: number; hasMore: boolean };
  }>(`${API_BASE}/api/v1/admin/tenants${qs ? `?${qs}` : ''}`);
}

export async function getTenant(tenantId: string) {
  return http<{ success: true; tenant: Tenant }>(
    `${API_BASE}/api/v1/admin/tenants/${encodeURIComponent(tenantId)}`
  );
}

export async function updateTenant(
  tenantId: string,
  updates: { status?: Tenant['status']; comped?: boolean; plan?: Tenant['plan'] }
) {
  return http<{ success: true }>(
    `${API_BASE}/api/v1/admin/tenants/${encodeURIComponent(tenantId)}`,
    { method: 'PATCH', headers: headers(), body: JSON.stringify(updates) }
  );
}

export async function deactivateTenant(tenantId: string) {
  return http<{ success: true }>(
    `${API_BASE}/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/deactivate`,
    { method: 'POST', headers: headers() }
  );
}

export async function deleteTenant(tenantId: string) {
  return http<{ success: true }>(
    `${API_BASE}/api/v1/admin/tenants/${encodeURIComponent(tenantId)}`,
    { method: 'DELETE', headers: headers() }
  );
}

export async function listPromoCodes() {
  return http<{ success: true; promoCodes: PromoCode[] }>(
    `${API_BASE}/api/v1/admin/promo-codes`
  );
}

export async function createPromoCode(data: {
  code: string;
  discountPercent: number;
  maxUses?: number;
  validUntil?: number;
}) {
  return http<{ success: true; promoCode: PromoCode }>(
    `${API_BASE}/api/v1/admin/promo-codes`,
    { method: 'POST', headers: headers(), body: JSON.stringify(data) }
  );
}

export async function deactivatePromoCode(code: string) {
  return http<{ success: true }>(
    `${API_BASE}/api/v1/admin/promo-codes/${encodeURIComponent(code)}/deactivate`,
    { method: 'POST', headers: headers() }
  );
}

// ---- Compatibility shims for legacy imports ----
export type AnySDK = {
  // real endpoints
  getProvisionStatus: (tenantId: string) => Promise<ProvisionState>;
  startMagicLogin: (p: { email: string; tenantId?: string }) => Promise<{ success: boolean; message?: string }>;
  verifyMagicToken: (token: string) => Promise<{ success: boolean; redirect?: string }>;
  getAdminOverview: (tenantId: string) => Promise<{ success: true; data: Record<string, unknown> | null }>;

  // UI-only placeholders so pages compile & render empty states
  getBrand: () => Promise<Record<string, unknown>>;
  getBrandKit: () => Promise<Record<string, unknown>>;
  getFeed: () => Promise<Array<Record<string, unknown>>>;
  getFixtures: () => Promise<Array<Record<string, unknown>>>;
  getNextFixture: () => Promise<Record<string, unknown> | null>;
  getResults: () => Promise<Array<Record<string, unknown>>>;
  getTable: () => Promise<Array<Record<string, unknown>>>;
  getSquad: () => Promise<Array<Record<string, unknown>>>;
  getStats: () => Promise<Record<string, unknown>>;
  getLeagueTable: () => Promise<Array<Record<string, unknown>>>;
  getTopScorers: (limit?: number) => Promise<Array<Record<string, unknown>>>;
  getTeamStats: () => Promise<Record<string, unknown> | null>;
  listFixtures: () => Promise<Array<Record<string, unknown>>>;
  listFeed: (page: number, limit: number) => Promise<Array<Record<string, unknown>>>;
  listResults: () => Promise<Array<Record<string, unknown>>>;
  listLiveUpdates: (fixtureId: string) => Promise<Array<Record<string, unknown>>>;
};

// One shared instance; hook these up to real calls later as needed
const compat: AnySDK = {
  getProvisionStatus,
  startMagicLogin,
  verifyMagicToken,
  getAdminOverview,

  // temporary no-op implementations (return empty data so UI shows empty state)
  getBrand: async () => ({}),
  getBrandKit: async () => ({}),
  getFeed: async () => [],
  getFixtures: async () => [],
  getNextFixture: async () => null,
  getResults: async () => [],
  getTable: async () => [],
  getSquad: async () => [],
  getStats: async () => ({}),
  getLeagueTable: async () => [],
  getTopScorers: async () => [],
  getTeamStats: async () => null,
  listFixtures: async () => [],
  listFeed: async () => [],
  listResults: async () => [],
  listLiveUpdates: async () => [],
};

// Legacy entry points some pages still import
export function getServerSDK(_tenant?: string): AnySDK {
  return compat;
}
export function createClientSDK(_tenant?: string): AnySDK {
  return compat;
}
