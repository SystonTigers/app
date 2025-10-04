// src/services/promoCodes.ts

import type { Env } from "../types";

/**
 * Promo code types
 */
export type PromoCodeType =
  | "percentage_discount"  // X% off subscription
  | "months_free"          // X months free
  | "plan_upgrade"         // Upgrade to specific plan for free/discounted
  | "referral_reward";     // Reward for referring someone

/**
 * Promo code interface
 */
export interface PromoCode {
  code: string;
  type: PromoCodeType;
  value: string | number;  // Depends on type: percentage (50), months (3), plan ("enterprise")
  durationMonths?: number;  // How long discount lasts (null = forever)
  maxUses?: number;         // Max times it can be used (null = unlimited)
  usedCount: number;        // Times it's been used
  active: boolean;
  expiresAt?: string;       // ISO date string (null = never expires)
  createdAt: string;
  createdBy: string;
  metadata?: {
    description?: string;
    referredBy?: string;    // For referral codes
    targetTenant?: string;  // For tenant-specific codes (e.g., "SYSTON-PRO")
  };
}

/**
 * Promo code redemption record
 */
export interface PromoRedemption {
  code: string;
  tenantId: string;
  redeemedAt: string;
  appliedDiscount: {
    type: PromoCodeType;
    value: string | number;
    durationMonths?: number;
  };
}

/**
 * Promo code service
 */
export class PromoCodeService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Create a new promo code
   */
  async createPromoCode(promoCode: Omit<PromoCode, 'usedCount' | 'createdAt'>): Promise<{ success: boolean; code?: PromoCode; error?: string }> {
    try {
      // Validate code format (uppercase, alphanumeric, hyphens)
      const cleanCode = promoCode.code.toUpperCase().replace(/[^A-Z0-9-]/g, '');

      if (cleanCode !== promoCode.code.toUpperCase()) {
        return {
          success: false,
          error: 'Invalid code format. Use uppercase letters, numbers, and hyphens only.'
        };
      }

      // Check if code already exists
      const existing = await this.getPromoCode(cleanCode);
      if (existing) {
        return {
          success: false,
          error: `Promo code '${cleanCode}' already exists`
        };
      }

      // Create complete promo code object
      const fullPromoCode: PromoCode = {
        ...promoCode,
        code: cleanCode,
        usedCount: 0,
        createdAt: new Date().toISOString()
      };

      // Store in KV
      await this.env.KV_IDEMP.put(
        `promo:${cleanCode}`,
        JSON.stringify(fullPromoCode)
      );

      console.log(`[PromoCode] Created: ${cleanCode}`, fullPromoCode);

      return {
        success: true,
        code: fullPromoCode
      };

    } catch (error: any) {
      console.error('[PromoCode] Creation failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to create promo code'
      };
    }
  }

  /**
   * Get promo code by code
   */
  async getPromoCode(code: string): Promise<PromoCode | null> {
    try {
      const cleanCode = code.toUpperCase();
      const data = await this.env.KV_IDEMP.get(`promo:${cleanCode}`);

      if (!data) {
        return null;
      }

      return JSON.parse(data) as PromoCode;
    } catch (error) {
      console.error('[PromoCode] Retrieval failed:', error);
      return null;
    }
  }

  /**
   * Validate promo code for tenant
   */
  async validatePromoCode(code: string, tenantId: string): Promise<{
    valid: boolean;
    promoCode?: PromoCode;
    error?: string
  }> {
    try {
      const promoCode = await this.getPromoCode(code);

      if (!promoCode) {
        return {
          valid: false,
          error: 'Invalid promo code'
        };
      }

      // Check if active
      if (!promoCode.active) {
        return {
          valid: false,
          error: 'Promo code is no longer active'
        };
      }

      // Check expiry
      if (promoCode.expiresAt) {
        const expiryDate = new Date(promoCode.expiresAt);
        if (expiryDate < new Date()) {
          return {
            valid: false,
            error: 'Promo code has expired'
          };
        }
      }

      // Check usage limits
      if (promoCode.maxUses && promoCode.usedCount >= promoCode.maxUses) {
        return {
          valid: false,
          error: 'Promo code has reached maximum uses'
        };
      }

      // Check if already used by this tenant
      const alreadyUsed = await this.hasUsedPromoCode(tenantId, code);
      if (alreadyUsed) {
        return {
          valid: false,
          error: 'You have already used this promo code'
        };
      }

      // Check tenant-specific codes
      if (promoCode.metadata?.targetTenant) {
        if (promoCode.metadata.targetTenant !== tenantId) {
          return {
            valid: false,
            error: 'This promo code is not valid for your account'
          };
        }
      }

      return {
        valid: true,
        promoCode
      };

    } catch (error: any) {
      console.error('[PromoCode] Validation failed:', error);
      return {
        valid: false,
        error: error.message || 'Validation failed'
      };
    }
  }

  /**
   * Apply promo code to tenant
   */
  async applyPromoCode(code: string, tenantId: string): Promise<{
    success: boolean;
    discount?: {
      type: PromoCodeType;
      value: string | number;
      durationMonths?: number;
      plan?: string;
    };
    error?: string;
  }> {
    try {
      // Validate first
      const validation = await this.validatePromoCode(code, tenantId);
      if (!validation.valid || !validation.promoCode) {
        return {
          success: false,
          error: validation.error
        };
      }

      const promoCode = validation.promoCode;

      // Record redemption
      const redemption: PromoRedemption = {
        code: promoCode.code,
        tenantId,
        redeemedAt: new Date().toISOString(),
        appliedDiscount: {
          type: promoCode.type,
          value: promoCode.value,
          durationMonths: promoCode.durationMonths
        }
      };

      await this.env.KV_IDEMP.put(
        `promo-redemption:${tenantId}:${promoCode.code}`,
        JSON.stringify(redemption)
      );

      // Increment usage count
      promoCode.usedCount++;
      await this.env.KV_IDEMP.put(
        `promo:${promoCode.code}`,
        JSON.stringify(promoCode)
      );

      console.log(`[PromoCode] Applied: ${promoCode.code} to ${tenantId}`);

      // Return discount details
      const discount: any = {
        type: promoCode.type,
        value: promoCode.value,
        durationMonths: promoCode.durationMonths
      };

      // For plan upgrades, specify the plan
      if (promoCode.type === 'plan_upgrade') {
        discount.plan = promoCode.value;
      }

      return {
        success: true,
        discount
      };

    } catch (error: any) {
      console.error('[PromoCode] Application failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to apply promo code'
      };
    }
  }

  /**
   * Check if tenant has used a promo code
   */
  async hasUsedPromoCode(tenantId: string, code: string): Promise<boolean> {
    try {
      const cleanCode = code.toUpperCase();
      const redemption = await this.env.KV_IDEMP.get(
        `promo-redemption:${tenantId}:${cleanCode}`
      );
      return !!redemption;
    } catch (error) {
      console.error('[PromoCode] Usage check failed:', error);
      return false;
    }
  }

  /**
   * Deactivate promo code
   */
  async deactivatePromoCode(code: string): Promise<{ success: boolean; error?: string }> {
    try {
      const promoCode = await this.getPromoCode(code);

      if (!promoCode) {
        return {
          success: false,
          error: 'Promo code not found'
        };
      }

      promoCode.active = false;
      await this.env.KV_IDEMP.put(
        `promo:${promoCode.code}`,
        JSON.stringify(promoCode)
      );

      console.log(`[PromoCode] Deactivated: ${promoCode.code}`);

      return { success: true };

    } catch (error: any) {
      console.error('[PromoCode] Deactivation failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to deactivate promo code'
      };
    }
  }

  /**
   * List all promo codes (admin)
   */
  async listPromoCodes(): Promise<PromoCode[]> {
    try {
      // Note: This requires KV list operation
      // For production, consider storing a promo code index
      const list = await this.env.KV_IDEMP.list({ prefix: 'promo:' });
      const promoCodes: PromoCode[] = [];

      for (const key of list.keys) {
        const data = await this.env.KV_IDEMP.get(key.name);
        if (data) {
          promoCodes.push(JSON.parse(data));
        }
      }

      return promoCodes.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    } catch (error) {
      console.error('[PromoCode] List failed:', error);
      return [];
    }
  }

  /**
   * Create referral code for tenant
   */
  async createReferralCode(tenantId: string, rewardMonths: number = 3): Promise<{
    success: boolean;
    code?: string;
    error?: string;
  }> {
    try {
      // Generate unique referral code
      const referralCode = `REFER-${tenantId.toUpperCase().substring(0, 8)}-${Date.now().toString(36).toUpperCase()}`;

      const promoCode: Omit<PromoCode, 'usedCount' | 'createdAt'> = {
        code: referralCode,
        type: 'referral_reward',
        value: rewardMonths,
        durationMonths: rewardMonths,
        maxUses: null,  // Unlimited uses
        active: true,
        expiresAt: undefined,
        createdBy: tenantId,
        metadata: {
          description: `Referral reward: ${rewardMonths} months free`,
          referredBy: tenantId
        }
      };

      const result = await this.createPromoCode(promoCode);

      if (result.success) {
        return {
          success: true,
          code: referralCode
        };
      } else {
        return {
          success: false,
          error: result.error
        };
      }

    } catch (error: any) {
      console.error('[PromoCode] Referral code creation failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to create referral code'
      };
    }
  }
}
