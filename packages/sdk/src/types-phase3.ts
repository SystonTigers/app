// packages/sdk/src/types-phase3.ts
// Phase 3: Self-Serve Signup Types

/**
 * Tenant - Organization/club account
 */
export interface Tenant {
  id: string;
  slug: string;
  name: string;
  email: string;
  plan: 'starter' | 'pro';
  status: 'trial' | 'active' | 'suspended' | 'cancelled';
  comped: boolean;
  trialEndsAt?: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Signup Start Request
 */
export interface SignupStartRequest {
  clubName: string;
  clubSlug: string;
  email: string;
  plan: 'starter' | 'pro';
  promoCode?: string;
}

/**
 * Signup Start Response
 */
export interface SignupStartResponse {
  tenant: Tenant;
  discount: number;
  jwt: string;
}

/**
 * Brand Update Request
 */
export interface BrandUpdateRequest {
  primaryColor: string;
  secondaryColor: string;
}

/**
 * Make.com Connection Request
 */
export interface MakeConnectionRequest {
  webhookUrl: string;
  webhookSecret: string;
}

/**
 * Usage Stats (Phase 3)
 */
export interface UsageResponse {
  month: string;
  actionCount: number;
  limit: number | null;
  remaining: number | null;
  percentUsed: number;
  plan: 'starter' | 'pro';
  comped: boolean;
}

/**
 * Admin Stats Response
 */
export interface AdminStatsResponse {
  byStatus: Array<{ status: string; count: number }>;
  byPlan: Array<{ plan: string; count: number }>;
  recentSignups: number;
  monthlyUsage: number;
}

/**
 * Tenant List Response
 */
export interface TenantListResponse {
  tenants: Tenant[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Tenant Detail Response
 */
export interface TenantDetailResponse extends Tenant {
  primaryColor?: string;
  secondaryColor?: string;
  badgeUrl?: string;
  makeWebhookUrl?: string;
  appsScriptId?: string;
  usageHistory: Array<{
    month: string;
    actionCount: number;
  }>;
}

/**
 * Promo Code
 */
export interface PromoCode {
  id: string;
  code: string;
  discountPercent: number;
  maxUses?: number;
  usedCount: number;
  validUntil?: number;
  createdAt: number;
}

/**
 * Create Promo Code Request
 */
export interface CreatePromoCodeRequest {
  code: string;
  discountPercent: number;
  maxUses?: number;
  validUntil?: number;
}

/**
 * Update Tenant Request
 */
export interface UpdateTenantRequest {
  status?: 'trial' | 'active' | 'suspended' | 'cancelled';
  comped?: boolean;
  plan?: 'starter' | 'pro';
}
