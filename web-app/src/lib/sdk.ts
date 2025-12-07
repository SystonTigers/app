// src/lib/sdk.ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8787';

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

async function http<T>(url: string, init?: RequestInit): Promise<T> {
  console.log('[SDK] Fetching:', url, 'with options:', init);
  try {
    const res = await fetch(url, {
      ...init,
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {})
      }
    });
    console.log('[SDK] Response status:', res.status, res.statusText);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[SDK] Error response:', text);
      const error = new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
      throw error;
    }
    const data = await res.json();
    // console.log('[SDK] Response data:', data);
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
    { method: 'POST', body: JSON.stringify(input) }
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
    { method: 'PATCH', body: JSON.stringify(updates) }
  );
}

export async function deactivateTenant(tenantId: string) {
  return http<{ success: true }>(
    `${API_BASE}/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/deactivate`,
    { method: 'POST' }
  );
}

export async function deleteTenant(tenantId: string) {
  return http<{ success: true }>(
    `${API_BASE}/api/v1/admin/tenants/${encodeURIComponent(tenantId)}`,
    { method: 'DELETE' }
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
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export async function updateSquad(players: any[]) {
  return http<{ success: true; count: number }>(
    `${API_BASE}/api/v1/squad`,
    { method: 'POST', body: JSON.stringify(players) }
  );
}

export async function createFixture(data: any) {
  return http<{ success: true; id: string }>(
    `${API_BASE}/api/v1/fixtures`,
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export async function deleteFixture(id: string) {
  return http<{ success: true }>(
    `${API_BASE}/api/v1/fixtures/${id}`,
    { method: 'DELETE' }
  );
}

export async function createResult(data: any) {
  return http<{ success: true; id: string }>(
    `${API_BASE}/api/v1/results`,
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export async function deleteResult(id: string) {
  return http<{ success: true }>(
    `${API_BASE}/api/v1/results/${id}`,
    { method: 'DELETE' }
  );
}

export async function createPost(data: any) {
  return http<{ success: true; id: string }>(
    `${API_BASE}/api/v1/feed`,
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export async function deletePost(id: string) {
  return http<{ success: true }>(
    `${API_BASE}/api/v1/feed/${id}`,
    { method: 'DELETE' }
  );
}

export async function updateTable(rows: any[]) {
  return http<{ success: true }>(
    `${API_BASE}/api/v1/table`,
    { method: 'POST', body: JSON.stringify(rows) }
  );
}

export async function listEvents() {
  return http<any[]>(
    `${API_BASE}/api/v1/events`,
    { method: 'GET' }
  );
}

export async function createEvent(data: any) {
  return http<{ success: true; data: { event: any } }>(
    `${API_BASE}/api/v1/events`,
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export async function deleteEvent(id: string) {
  return http<{ success: true }>(
    `${API_BASE}/api/v1/events/${id}`,
    { method: 'DELETE' }
  );
}

export async function deactivatePromoCode(code: string) {
  return http<{ success: true }>(
    `${API_BASE}/api/v1/admin/promo-codes/${encodeURIComponent(code)}/deactivate`,
    { method: 'POST' }
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
  getPlayer: (id: string) => Promise<Record<string, unknown> | null>;

  // Shop
  getShopProducts: () => Promise<Array<Record<string, unknown>>>;
  createCart: () => Promise<{ success: boolean; cart: any }>;
  getCart: (cartId: string) => Promise<{ success: boolean; cart: any }>;
  addToCart: (cartId: string, variantId: string, quantity: number) => Promise<{ success: boolean; cart: any }>;
  removeFromCart: (cartId: string, variantId: string) => Promise<{ success: boolean; cart: any }>;
  createCheckoutSession: (cartId: string, email: string) => Promise<{ success: boolean; sessionId: string; url: string }>;
  saveMatchReport: (fixtureId: string, report: any) => Promise<{ success: boolean }>;
  getMatchReport: (fixtureId: string) => Promise<{ success: boolean; events: any[] }>;
  resignTeam: (teamName: string) => Promise<{ success: boolean }>;
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
  getPlayer: async () => null,

  // Shop mocks
  getShopProducts: async () => [],
  createCart: async () => ({ success: true, cart: { items: [] } }),
  getCart: async () => ({ success: true, cart: { items: [] } }),
  addToCart: async () => ({ success: true, cart: { items: [] } }),
  removeFromCart: async () => ({ success: true, cart: { items: [] } }),
  createCheckoutSession: async () => ({ success: true, sessionId: 'mock', url: '#' }),
  saveMatchReport: async () => ({ success: true }),
  getMatchReport: async () => ({ success: true, events: [] }),
  resignTeam: async () => ({ success: true }),
};

// Client SDK implementation
class ClientSDK implements AnySDK {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  // Real implementations
  async listFixtures() {
    return http<any[]>(`${API_BASE}/public/${this.tenantId}/fixtures`);
  }

  async listResults() {
    return http<any[]>(`${API_BASE}/public/${this.tenantId}/fixtures?status=results`);
  }

  async listFeed(page = 1, limit = 10) {
    return http<any[]>(`${API_BASE}/public/${this.tenantId}/feed?page=${page}&limit=${limit}`);
  }

  async getLeagueTable() {
    return http<any[]>(`${API_BASE}/public/${this.tenantId}/table`);
  }

  async getTeamStats() {
    return http<any>(`${API_BASE}/public/${this.tenantId}/stats`);
  }

  async getTopScorers(limit = 10) {
    return [];
  }

  async getSquad() {
    return http<any[]>(`${API_BASE}/public/${this.tenantId}/squad`);
  }

  async getPlayer(id: string) {
    const squad = await this.getSquad();
    return squad.find(p => p.id === id) || null;
  }

  // Shop
  async getShopProducts() {
    return http<any[]>(`${API_BASE}/api/v1/shop/products?tenant=${this.tenantId}`);
  }

  async createCart() {
    return http<{ success: true; cart: any }>(
      `${API_BASE}/api/v1/shop/cart`,
      { method: 'POST', body: JSON.stringify({ tenantId: this.tenantId }) }
    );
  }

  async getCart(cartId: string) {
    return http<{ success: true; cart: any }>(
      `${API_BASE}/api/v1/shop/cart/${cartId}`
    );
  }

  async addToCart(cartId: string, variantId: string, quantity: number) {
    return http<{ success: true; cart: any }>(
      `${API_BASE}/api/v1/shop/cart/${cartId}/items`,
      { method: 'POST', body: JSON.stringify({ variantId, quantity }) }
    );
  }

  async removeFromCart(cartId: string, variantId: string) {
    return http<{ success: true; cart: any }>(
      `${API_BASE}/api/v1/shop/cart/${cartId}/items`,
      { method: 'DELETE', body: JSON.stringify({ variantId }) }
    );
  }

  async createCheckoutSession(cartId: string, email: string) {
    return http<{ success: true; sessionId: string; url: string }>(
      `${API_BASE}/api/v1/shop/checkout`,
      { method: 'POST', body: JSON.stringify({ cartId, customerEmail: email }) }
    );
  }

  // Match Reports
  async saveMatchReport(fixtureId: string, report: any) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    return http<{ success: boolean }>(
      `${API_BASE}/api/v1/matches/${fixtureId}/report`,
      { method: 'POST', body: JSON.stringify(report), headers: { Authorization: `Bearer ${token}` } }
    );
  }

  async getMatchReport(fixtureId: string) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    return http<{ success: boolean; events: any[] }>(
      `${API_BASE}/api/v1/matches/${fixtureId}/report`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  }

  async resignTeam(teamName: string) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    return http<{ success: boolean }>(
      `${API_BASE}/api/v1/table/resign`,
      { method: 'POST', body: JSON.stringify({ teamName }), headers: { Authorization: `Bearer ${token}` } }
    );
  }

  // Fallback to compat/mocks for others
  getProvisionStatus = compat.getProvisionStatus;
  startMagicLogin = compat.startMagicLogin;
  verifyMagicToken = compat.verifyMagicToken;
  getAdminOverview = compat.getAdminOverview;
  getBrand = compat.getBrand;
  getBrandKit = compat.getBrandKit;
  getFeed = this.listFeed; // Alias
  getFixtures = this.listFixtures; // Alias
  getNextFixture = compat.getNextFixture;
  getResults = this.listResults; // Alias
  getTable = this.getLeagueTable; // Alias
  getStats = this.getTeamStats; // Alias
  listLiveUpdates = compat.listLiveUpdates;
}

export function createClientSDK(tenant?: string): AnySDK {
  if (!tenant) return compat;
  return new ClientSDK(tenant);
}

export function getServerSDK(tenant?: string): AnySDK {
  if (!tenant) return compat;
  return new ClientSDK(tenant);
}
