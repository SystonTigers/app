// packages/sdk/src/methods-phase3.ts
// Phase 3: Self-Serve Signup SDK Methods
// ADD THESE METHODS TO THE TeamPlatformSDK CLASS IN index.ts

import type {
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
  ApiResponse,
} from './types-phase3';

// ==================== SELF-SERVE SIGNUP ====================

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

// ==================== USAGE TRACKING ====================

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

// ==================== ADMIN/OWNER CONSOLE ====================

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
