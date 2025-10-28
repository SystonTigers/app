# SDK Integration Instructions - Phase 3

## Files Created
- `src/types-phase3.ts` - 12 new TypeScript interfaces for Phase 3
- `src/methods-phase3.ts` - 12 new SDK methods for signup, usage, and admin

## Integration Steps

### Step 1: Merge types into types.ts

Open `src/types.ts` and add the following at the end (after the `ApiResponse` interface):

```typescript
/**
 * Phase 3: Self-Serve Signup Types
 */

// Copy all exports from types-phase3.ts here (lines 6-126)
```

**Or simpler**: Just add this export to `src/types.ts`:
```typescript
export * from './types-phase3';
```

### Step 2: Add imports to index.ts

At the top of `src/index.ts`, after the existing type imports (around line 18), add:

```typescript
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
} from './types-phase3';
```

### Step 3: Update exports in index.ts

Update the export line (line 21) to:

```typescript
export * from './types';
export * from './types-phase3';
```

### Step 4: Add methods to TeamPlatformSDK class

In `src/index.ts`, add these sections to the `TeamPlatformSDK` class (before the closing brace around line 319):

```typescript
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
```

### Step 5: Rebuild SDK

```bash
cd "G:\My Drive\Final Products\OA App\applatest\packages\sdk"
npm run build  # if there's a build script
```

## Testing SDK Methods

### Signup Flow
```typescript
const sdk = new TeamPlatformSDK({
  apiBaseUrl: 'https://syston-postbus.team-platform-2025.workers.dev',
  tenantId: 'temp',  // Will be overwritten
});

// Step 1: Create account
const { tenant, jwt } = await sdk.signupStart({
  clubName: 'My Club',
  clubSlug: 'my-club',
  email: 'owner@myclub.com',
  plan: 'starter',
  promoCode: 'LAUNCH50',
});

// Set JWT for subsequent calls
sdk.setAuthToken(jwt);
sdk.setTenant(tenant.slug);

// Step 2: Brand colors
await sdk.signupBrand({
  primaryColor: '#FFD700',
  secondaryColor: '#000000',
});

// Step 3a: Make.com (Starter)
await sdk.signupStarterMake({
  webhookUrl: 'https://hook.make.com/abc123',
  webhookSecret: 'secret_key_16_chars',
});
```

### Usage Tracking
```typescript
const usage = await sdk.getUsageStats();
console.log(`Used ${usage.actionCount} of ${usage.limit} actions this month`);

// Increment (automation call)
await sdk.incrementUsage();
```

### Admin Operations
```typescript
// Dashboard stats
const stats = await sdk.getAdminStats();
console.log(`${stats.recentSignups} signups in last 30 days`);

// List tenants
const { tenants, pagination } = await sdk.listTenants({
  status: 'active',
  limit: 50,
  offset: 0,
});

// Get tenant detail
const tenant = await sdk.getTenantDetail('tenant_123');

// Update tenant
await sdk.updateTenant('tenant_123', {
  status: 'active',
  comped: true,
});

// Promo codes
const promos = await sdk.listPromoCodes();
await sdk.createPromoCode({
  code: 'SPECIAL50',
  discountPercent: 50,
  maxUses: 100,
  validUntil: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60),  // 90 days
});
```

## Summary

**New SDK Methods (12 total)**:
- 4 signup methods (start, brand, starterMake, proConfirm)
- 2 usage methods (getUsageStats, incrementUsage)
- 6 admin methods (getAdminStats, listTenants, getTenantDetail, updateTenant, listPromoCodes, createPromoCode)

**Files to integrate**:
- `src/types.ts` - Add export of types-phase3
- `src/index.ts` - Add imports and 12 new methods to TeamPlatformSDK class

**Estimated time**: 10 minutes
