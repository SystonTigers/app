// packages/sdk/src/index.ts
// Shared SDK client for team platform API

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import type {
  BrandKit,
  Fixture,
  Result,
  LeagueTableRow,
  Player,
  TeamStats,
  FeedPost,
  Event,
  LiveEvent,
  PushToken,
  UsageStats,
  TenantConfig,
  ApiResponse,
  SignupStartRequest,
  SignupStartResponse,
  BrandUpdateRequest,
  MakeConnectionRequest,
  UsageResponse,
  AdminStatsResponse,
  TenantListResponse,
  TenantDetailResponse,
  PromoCode,
  CreatePromoCodeRequest,
  UpdateTenantRequest,
} from './types';

export * from './types';

export type ProvisionState = {
  tenantId: string;
  plan: 'starter'|'pro';
  status: 'idle'|'running'|'completed'|'failed';
  currentStep: string|null;
  checkpoints: Record<string, { status: string; error?: string }>;
  startedAt?: number; completedAt?: number; error?: string;
};

export interface SDKOptions {
  tenant?: string;
  token?: string;
  timeout?: number;
}

// Legacy interface for backward compatibility
export interface TeamPlatformSDKConfig {
  apiBaseUrl: string;
  tenantId: string;
  authToken?: string;
  timeout?: number;
}

export class TeamPlatformSDK {
  private client: AxiosInstance;
  private baseURL: string;
  private tenant?: string;
  private token?: string;

  constructor(baseURL: string | TeamPlatformSDKConfig, opts: SDKOptions = {}) {
    // Support both new and legacy constructor signatures
    if (typeof baseURL === 'string') {
      // New signature: TeamPlatformSDK(baseURL, opts)
      this.baseURL = baseURL.replace(/\/+$/, '');
      this.tenant = opts.tenant;
      this.token = opts.token;

      this.client = axios.create({
        baseURL: this.baseURL,
        timeout: opts.timeout || 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } else {
      // Legacy signature: TeamPlatformSDK(config)
      const config = baseURL as TeamPlatformSDKConfig;
      this.baseURL = config.apiBaseUrl.replace(/\/+$/, '');
      this.tenant = config.tenantId;
      this.token = config.authToken;

      this.client = axios.create({
        baseURL: this.baseURL,
        timeout: config.timeout || 30000,
        headers: {
          'Content-Type': 'application/json',
          'x-tenant': config.tenantId,
        },
      });
    }

    // Add request interceptor for auth
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers['Authorization'] = `Bearer ${this.token}`;
      }
      if (this.tenant) {
        config.headers['x-tenant'] = this.tenant;
      }
      return config;
    });
  }

  /**
   * Set authentication token
   */
  setToken(token?: string): void {
    this.token = token;
  }

  /**
   * Set authentication token (legacy alias)
   */
  setAuthToken(token: string): void {
    this.setToken(token);
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    this.token = undefined;
  }

  /**
   * Update tenant ID
   */
  setTenant(tenant?: string): void {
    this.tenant = tenant;
  }

  /**
   * Helper to get auth headers
   */
  private authHeaders() {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  /**
   * Helper to require tenant
   */
  private requireTenant(tenant?: string): string {
    const t = tenant ?? this.tenant;
    if (!t) throw new Error('Tenant slug is required');
    return t;
  }

  // ==================== BRAND API ====================

  /**
   * Get brand kit for current tenant
   */
  async getBrand(): Promise<BrandKit> {
    const response = await this.client.get<ApiResponse<BrandKit>>('/api/v1/brand');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to get brand');
    }
    return response.data.data;
  }

  /**
   * Update brand kit (admin only)
   */
  async setBrand(brand: Partial<BrandKit>): Promise<BrandKit> {
    const response = await this.client.post<ApiResponse<BrandKit>>('/api/v1/brand', brand);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to set brand');
    }
    return response.data.data;
  }

  // ==================== PUBLIC PAGES API (tenant) ====================

  /**
   * Get next upcoming fixture (public)
   */
  async getNextFixture(tenant?: string): Promise<Fixture | null> {
    const t = this.requireTenant(tenant);
    try {
      const response = await this.client.get(`/public/${t}/fixtures/next`);
      return response.data?.fixture || response.data || null;
    } catch {
      return null;
    }
  }

  /**
   * List fixtures (public)
   */
  async listFixtures(tenant?: string, limit: number = 20): Promise<Fixture[]> {
    // Check if being called with tenant parameter (new signature)
    if (tenant && typeof tenant === 'string' && !tenant.includes('/')) {
      const t = tenant;
      try {
        const response = await this.client.get(`/public/${t}/fixtures`, {
          params: { limit },
        });
        return response.data?.fixtures || response.data || [];
      } catch {
        return [];
      }
    }

    // Legacy signature or no tenant - use private API
    const response = await this.client.get('/api/v1/fixtures');
    return response.data?.fixtures || response.data || [];
  }

  /**
   * List feed posts (public)
   */
  async listFeed(page: number = 1, pageSize: number = 10, tenant?: string): Promise<FeedPost[]> {
    // If tenant is provided as third parameter, use public API
    if (tenant) {
      try {
        const response = await this.client.get(`/public/${tenant}/feed`, {
          params: { page, pageSize },
        });
        return response.data?.posts || response.data || [];
      } catch {
        return [];
      }
    }

    // Legacy signature - use private API
    const response = await this.client.get(`/api/v1/feed`, {
      params: { page, limit: pageSize },
    });
    return response.data?.posts || response.data || [];
  }

  /**
   * Get league table (public)
   */
  async getLeagueTable(tenant?: string): Promise<LeagueTableRow[]> {
    // If tenant provided, use public API
    if (tenant && typeof tenant === 'string' && !tenant.includes('/')) {
      try {
        const response = await this.client.get(`/public/${tenant}/table`);
        return response.data?.table || response.data || [];
      } catch {
        return [];
      }
    }

    // Legacy signature - use private API
    const params: any = {};
    const response = await this.client.get('/api/v1/table', { params });
    return response.data?.table || response.data || [];
  }

  // ==================== FIXTURES & RESULTS (Private API) ====================

  /**
   * Get past results
   */
  async listResults(): Promise<Result[]> {
    const response = await this.client.get('/api/v1/results');
    return response.data?.results || response.data || [];
  }

  // ==================== SQUAD ====================

  /**
   * Get team squad
   */
  async getSquad(): Promise<Player[]> {
    const response = await this.client.get('/api/v1/squad');
    return response.data?.squad || response.data || [];
  }

  /**
   * Get player details
   */
  async getPlayer(playerId: string): Promise<Player> {
    const response = await this.client.get(`/api/v1/squad/${playerId}`);
    return response.data?.player || response.data;
  }

  /**
   * Get top scorers
   */
  async getTopScorers(limit?: number): Promise<Player[]> {
    const params = limit ? { limit } : {};
    const response = await this.client.get('/api/v1/stats/top-scorers', { params });
    return response.data?.topScorers || response.data || [];
  }

  // ==================== STATS ====================

  /**
   * Get team statistics
   */
  async getTeamStats(): Promise<TeamStats> {
    const response = await this.client.get('/api/v1/stats/team');
    return response.data?.stats || response.data;
  }

  /**
   * Get player statistics
   */
  async getPlayerStats(): Promise<Player[]> {
    const response = await this.client.get('/api/v1/stats/players');
    return response.data?.players || response.data || [];
  }

  // ==================== FEED/POSTS ====================

  /**
   * Create a new post (admin only)
   */
  async createPost(content: string, channels?: any, media?: string[]): Promise<FeedPost> {
    const response = await this.client.post('/api/v1/feed/create', {
      content,
      channels,
      media,
    });
    return response.data?.post || response.data;
  }

  // ==================== EVENTS ====================

  /**
   * Get list of events
   */
  async listEvents(limit?: number): Promise<Event[]> {
    const params = limit ? { limit } : {};
    const response = await this.client.get('/api/v1/events', { params });
    return response.data?.events || response.data || [];
  }

  /**
   * Get event details
   */
  async getEvent(eventId: string): Promise<Event> {
    const response = await this.client.get(`/api/v1/events/${eventId}`);
    return response.data?.event || response.data;
  }

  /**
   * Create event (admin only)
   */
  async createEvent(event: Partial<Event>): Promise<Event> {
    const response = await this.client.post('/api/v1/events', event);
    return response.data?.event || response.data;
  }

  /**
   * Delete event (admin only)
   */
  async deleteEvent(eventId: string): Promise<void> {
    await this.client.delete(`/api/v1/events/${eventId}`);
  }

  // ==================== LIVE EVENTS ====================

  /**
   * Get live events/updates
   */
  async listLive(): Promise<LiveEvent[]> {
    const response = await this.client.get('/api/v1/events/live');
    return response.data?.events || response.data || [];
  }

  /**
   * Post a live event (admin only)
   */
  async postLive(event: Partial<LiveEvent>): Promise<LiveEvent> {
    const response = await this.client.post('/api/v1/events/live', event);
    return response.data?.event || response.data;
  }

  // ==================== PUSH NOTIFICATIONS ====================

  /**
   * Register push notification token
   */
  async registerPush(token: PushToken): Promise<void> {
    await this.client.post('/api/v1/push/register', token);
  }

  /**
   * Send push notification (admin only)
   */
  async sendPush(title: string, body: string, data?: any): Promise<void> {
    await this.client.post('/api/v1/push/send', { title, body, data });
  }

  /**
   * Unregister push notification token
   */
  async unregisterPush(token: string): Promise<void> {
    await this.client.post('/api/v1/push/unregister', { token });
  }

  /**
   * Get push notification history
   */
  async getPushHistory(): Promise<any[]> {
    const response = await this.client.get('/api/v1/push/history');
    return response.data?.history || response.data || [];
  }

  // ==================== USAGE ====================

  /**
   * Get usage statistics
   */
  async getUsage(): Promise<UsageStats> {
    const response = await this.client.get('/api/v1/usage');
    return response.data?.usage || response.data;
  }

  /**
   * Check if Make.com automation is allowed
   */
  async canUseMake(): Promise<boolean> {
    const response = await this.client.get('/api/v1/usage/make/allowed');
    return response.data?.allowed || false;
  }

  /**
   * Increment Make.com usage counter
   */
  async incrementMake(): Promise<void> {
    await this.client.post('/api/v1/usage/make/increment');
  }

  // ==================== TENANT CONFIG ====================

  /**
   * Get tenant configuration
   */
  async getTenantConfig(): Promise<TenantConfig> {
    const response = await this.client.get('/api/v1/tenant/config');
    return response.data?.config || response.data;
  }

  // ==================== PHASE 3: SELF-SERVE SIGNUP ====================

  /**
   * Step 1: Create tenant account (PUBLIC - no auth required)
   */
  async signupStart(request: SignupStartRequest): Promise<SignupStartResponse> {
    const response = await this.client.post<{ success: boolean; tenant: any; discount: number; jwt: string }>(
      '/public/signup/start',
      request
    );
    if (!response.data.success) {
      throw new Error('Signup failed');
    }
    return {
      tenant: response.data.tenant,
      discount: response.data.discount,
      jwt: response.data.jwt,
    };
  }

  /**
   * Step 2: Customize brand colors (requires JWT from step 1)
   */
  async signupBrand(colors: BrandUpdateRequest): Promise<void> {
    const response = await this.client.post<ApiResponse<void>>('/public/signup/brand', colors);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Brand update failed');
    }
  }

  /**
   * Step 3a: Configure Make.com webhook (Starter plan only)
   */
  async signupStarterMake(connection: MakeConnectionRequest): Promise<void> {
    const response = await this.client.post<ApiResponse<void>>('/public/signup/starter/make', connection);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Make.com setup failed');
    }
  }

  /**
   * Step 3b: Confirm Pro plan setup
   */
  async signupProConfirm(): Promise<void> {
    const response = await this.client.post<ApiResponse<void>>('/public/signup/pro/confirm');
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Pro confirmation failed');
    }
  }

  // ==================== PHASE 3: USAGE TRACKING ====================

  /**
   * Get current month's usage stats
   */
  async getUsageStats(): Promise<UsageResponse> {
    const response = await this.client.get<{ success: boolean; usage: UsageResponse }>('/api/v1/usage');
    if (!response.data.success || !response.data.usage) {
      throw new Error('Failed to get usage stats');
    }
    return response.data.usage;
  }

  /**
   * Increment usage counter (called by automation systems)
   */
  async incrementUsage(): Promise<UsageResponse> {
    const response = await this.client.post<{ success: boolean; usage: UsageResponse }>('/api/v1/usage/increment');
    if (!response.data.success || !response.data.usage) {
      throw new Error('Failed to increment usage');
    }
    return response.data.usage;
  }

  // ==================== PHASE 3: ADMIN/OWNER CONSOLE ====================

  /**
   * Get dashboard statistics (admin only)
   */
  async getAdminStats(): Promise<AdminStatsResponse> {
    const response = await this.client.get<{ success: boolean; stats: AdminStatsResponse }>('/api/v1/admin/stats');
    if (!response.data.success || !response.data.stats) {
      throw new Error('Failed to get admin stats');
    }
    return response.data.stats;
  }

  /**
   * List all tenants (admin only)
   */
  async listTenants(filters?: {
    status?: string;
    plan?: string;
    limit?: number;
    offset?: number;
  }): Promise<TenantListResponse> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.plan) params.append('plan', filters.plan);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const response = await this.client.get<{ success: boolean } & TenantListResponse>(
      `/api/v1/admin/tenants?${params.toString()}`
    );
    if (!response.data.success) {
      throw new Error('Failed to list tenants');
    }
    return {
      tenants: response.data.tenants,
      pagination: response.data.pagination,
    };
  }

  /**
   * Get tenant details (admin only)
   */
  async getTenantDetail(tenantId: string): Promise<TenantDetailResponse> {
    const response = await this.client.get<{ success: boolean; tenant: TenantDetailResponse }>(
      `/api/v1/admin/tenants/${tenantId}`
    );
    if (!response.data.success || !response.data.tenant) {
      throw new Error('Failed to get tenant details');
    }
    return response.data.tenant;
  }

  /**
   * Update tenant (admin only)
   */
  async updateTenant(tenantId: string, updates: UpdateTenantRequest): Promise<void> {
    const response = await this.client.patch<ApiResponse<void>>(`/api/v1/admin/tenants/${tenantId}`, updates);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to update tenant');
    }
  }

  /**
   * List promo codes (admin only)
   */
  async listPromoCodes(): Promise<PromoCode[]> {
    const response = await this.client.get<{ success: boolean; promoCodes: PromoCode[] }>('/api/v1/admin/promo-codes');
    if (!response.data.success) {
      throw new Error('Failed to list promo codes');
    }
    return response.data.promoCodes || [];
  }

  /**
   * Create promo code (admin only)
   */
  async createPromoCode(request: CreatePromoCodeRequest): Promise<PromoCode> {
    const response = await this.client.post<{ success: boolean; promoCode: PromoCode }>(
      '/api/v1/admin/promo-codes',
      request
    );
    if (!response.data.success || !response.data.promoCode) {
      throw new Error('Failed to create promo code');
    }
    return response.data.promoCode;
  }

  // ==================== PROVISIONING & MAGIC LINKS ====================

  /**
   * Get provisioning status for a tenant
   */
  async getProvisionStatus(tenantId: string): Promise<ProvisionState | null> {
    const response = await this.client.get<{ success: boolean; data?: { status: string; currentStep: string | null; checkpoints: Record<string, { status: string; error?: string }>; error?: string } }>(
      `/api/v1/tenants/${tenantId}/provision-status`
    );
    if (!response.data.success || !response.data.data) {
      return null;
    }
    return response.data.data as ProvisionState;
  }

  /**
   * Start magic link login flow
   */
  async startMagicLogin(email: string, tenantId: string): Promise<{ success: boolean }> {
    const response = await this.client.post<{ success: boolean }>(
      '/auth/magic/start',
      { email, tenantId }
    );
    return response.data;
  }

  /**
   * Verify magic token and get session
   */
  async verifyMagicToken(token: string): Promise<{ success: boolean; tenantId?: string }> {
    const response = await this.client.get<{ success: boolean; tenantId?: string }>(
      `/auth/magic/verify?token=${encodeURIComponent(token)}`,
      {
        withCredentials: true, // Allow cookies
      }
    );
    return response.data;
  }

  /**
   * Get admin overview/dashboard data
   */
  async getAdminOverview(tenantId: string): Promise<any> {
    const response = await this.client.get(
      `/api/v1/tenants/${tenantId}/overview`,
      {
        withCredentials: true, // Allow cookies for admin auth
      }
    );
    return response.data;
  }
}

/**
 * Create SDK instance
 */
export function createSDK(config: TeamPlatformSDKConfig): TeamPlatformSDK {
  return new TeamPlatformSDK(config);
}

export default TeamPlatformSDK;
