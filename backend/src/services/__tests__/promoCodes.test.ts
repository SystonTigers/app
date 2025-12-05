import { describe, it, expect, beforeEach } from "vitest";
import { PromoCodeService, type PromoCode, type PromoCodeType } from "../promoCodes";

/**
 * Promo Codes Service Tests
 *
 * Tests promo code management including creation, validation, application,
 * and referral code generation.
 */
describe("PromoCodeService", () => {
  let mockEnv: any;
  let mockKV: Map<string, string>;
  let service: PromoCodeService;

  beforeEach(() => {
    // Create fresh mock environment for each test
    mockKV = new Map();

    mockEnv = {
      KV_IDEMP: {
        get: async (key: string) => {
          return mockKV.get(key) || null;
        },
        put: async (key: string, value: string) => {
          mockKV.set(key, value);
        },
        list: async (options?: any) => {
          const keys = Array.from(mockKV.keys());
          const filtered = options?.prefix
            ? keys.filter((k) => k.startsWith(options.prefix))
            : keys;
          return {
            keys: filtered.map((name) => ({ name })),
          };
        },
      },
    };

    service = new PromoCodeService(mockEnv);
  });

  describe("createPromoCode()", () => {
    it("successfully creates a percentage discount promo code", async () => {
      const promoCode = {
        code: "SAVE50",
        type: "percentage_discount" as PromoCodeType,
        value: 50,
        active: true,
        createdBy: "admin",
      };

      const result = await service.createPromoCode(promoCode);

      expect(result.success).toBe(true);
      expect(result.code?.code).toBe("SAVE50");
      expect(result.code?.type).toBe("percentage_discount");
      expect(result.code?.value).toBe(50);
      expect(result.code?.usedCount).toBe(0);
      expect(result.code?.createdAt).toBeTruthy();
    });

    it("creates months_free promo code", async () => {
      const promoCode = {
        code: "FREE3MONTHS",
        type: "months_free" as PromoCodeType,
        value: 3,
        durationMonths: 3,
        active: true,
        createdBy: "admin",
      };

      const result = await service.createPromoCode(promoCode);

      expect(result.success).toBe(true);
      expect(result.code?.type).toBe("months_free");
      expect(result.code?.value).toBe(3);
      expect(result.code?.durationMonths).toBe(3);
    });

    it("creates plan_upgrade promo code", async () => {
      const promoCode = {
        code: "UPGRADE-ENT",
        type: "plan_upgrade" as PromoCodeType,
        value: "enterprise",
        active: true,
        createdBy: "admin",
      };

      const result = await service.createPromoCode(promoCode);

      expect(result.success).toBe(true);
      expect(result.code?.type).toBe("plan_upgrade");
      expect(result.code?.value).toBe("enterprise");
    });

    it("converts code to uppercase", async () => {
      const promoCode = {
        code: "lowercase",
        type: "percentage_discount" as PromoCodeType,
        value: 25,
        active: true,
        createdBy: "admin",
      };

      const result = await service.createPromoCode(promoCode);

      expect(result.success).toBe(true);
      expect(result.code?.code).toBe("LOWERCASE");
    });

    it("rejects invalid characters in code", async () => {
      const promoCode = {
        code: "PROMO@CODE!",
        type: "percentage_discount" as PromoCodeType,
        value: 10,
        active: true,
        createdBy: "admin",
      };

      const result = await service.createPromoCode(promoCode);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid code format");
    });

    it("allows hyphens in code", async () => {
      const promoCode = {
        code: "PROMO-CODE-123",
        type: "percentage_discount" as PromoCodeType,
        value: 15,
        active: true,
        createdBy: "admin",
      };

      const result = await service.createPromoCode(promoCode);

      expect(result.success).toBe(true);
      expect(result.code?.code).toBe("PROMO-CODE-123");
    });

    it("rejects duplicate promo codes", async () => {
      const promoCode = {
        code: "DUPLICATE",
        type: "percentage_discount" as PromoCodeType,
        value: 20,
        active: true,
        createdBy: "admin",
      };

      await service.createPromoCode(promoCode);
      const result = await service.createPromoCode(promoCode);

      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists");
    });

    it("creates code with maxUses limit", async () => {
      const promoCode = {
        code: "LIMITED",
        type: "percentage_discount" as PromoCodeType,
        value: 30,
        maxUses: 100,
        active: true,
        createdBy: "admin",
      };

      const result = await service.createPromoCode(promoCode);

      expect(result.success).toBe(true);
      expect(result.code?.maxUses).toBe(100);
    });

    it("creates code with expiration date", async () => {
      const expiresAt = "2026-12-31T23:59:59.000Z";
      const promoCode = {
        code: "EXPIRES",
        type: "percentage_discount" as PromoCodeType,
        value: 40,
        active: true,
        expiresAt,
        createdBy: "admin",
      };

      const result = await service.createPromoCode(promoCode);

      expect(result.success).toBe(true);
      expect(result.code?.expiresAt).toBe(expiresAt);
    });

    it("creates code with metadata", async () => {
      const promoCode = {
        code: "TENANT-SPECIFIC",
        type: "percentage_discount" as PromoCodeType,
        value: 50,
        active: true,
        createdBy: "admin",
        metadata: {
          description: "Special offer for Syston",
          targetTenant: "syston",
        },
      };

      const result = await service.createPromoCode(promoCode);

      expect(result.success).toBe(true);
      expect(result.code?.metadata?.targetTenant).toBe("syston");
      expect(result.code?.metadata?.description).toBe("Special offer for Syston");
    });

    it("initializes usedCount to 0", async () => {
      const promoCode = {
        code: "NEWCODE",
        type: "percentage_discount" as PromoCodeType,
        value: 10,
        active: true,
        createdBy: "admin",
      };

      const result = await service.createPromoCode(promoCode);

      expect(result.code?.usedCount).toBe(0);
    });

    it("stores code in KV", async () => {
      const promoCode = {
        code: "STORED",
        type: "percentage_discount" as PromoCodeType,
        value: 15,
        active: true,
        createdBy: "admin",
      };

      await service.createPromoCode(promoCode);

      const stored = mockKV.get("promo:STORED");
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.code).toBe("STORED");
    });
  });

  describe("getPromoCode()", () => {
    it("retrieves an existing promo code", async () => {
      const promoCode = {
        code: "RETRIEVE",
        type: "percentage_discount" as PromoCodeType,
        value: 25,
        active: true,
        createdBy: "admin",
      };

      await service.createPromoCode(promoCode);
      const result = await service.getPromoCode("RETRIEVE");

      expect(result).not.toBeNull();
      expect(result?.code).toBe("RETRIEVE");
      expect(result?.value).toBe(25);
    });

    it("returns null for non-existent code", async () => {
      const result = await service.getPromoCode("NONEXISTENT");

      expect(result).toBeNull();
    });

    it("handles case-insensitive lookup", async () => {
      const promoCode = {
        code: "CASELESS",
        type: "percentage_discount" as PromoCodeType,
        value: 30,
        active: true,
        createdBy: "admin",
      };

      await service.createPromoCode(promoCode);
      const result = await service.getPromoCode("caseless");

      expect(result).not.toBeNull();
      expect(result?.code).toBe("CASELESS");
    });
  });

  describe("validatePromoCode()", () => {
    it("validates a valid active promo code", async () => {
      const promoCode = {
        code: "VALID",
        type: "percentage_discount" as PromoCodeType,
        value: 20,
        active: true,
        createdBy: "admin",
      };

      await service.createPromoCode(promoCode);
      const result = await service.validatePromoCode("VALID", "tenant1");

      expect(result.valid).toBe(true);
      expect(result.promoCode?.code).toBe("VALID");
    });

    it("rejects non-existent promo code", async () => {
      const result = await service.validatePromoCode("NONEXISTENT", "tenant1");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid promo code");
    });

    it("rejects inactive promo code", async () => {
      const promoCode = {
        code: "INACTIVE",
        type: "percentage_discount" as PromoCodeType,
        value: 20,
        active: false,
        createdBy: "admin",
      };

      await service.createPromoCode(promoCode);
      const result = await service.validatePromoCode("INACTIVE", "tenant1");

      expect(result.valid).toBe(false);
      expect(result.error).toContain("no longer active");
    });

    it("rejects expired promo code", async () => {
      const promoCode = {
        code: "EXPIRED",
        type: "percentage_discount" as PromoCodeType,
        value: 20,
        active: true,
        expiresAt: "2020-01-01T00:00:00.000Z",
        createdBy: "admin",
      };

      await service.createPromoCode(promoCode);
      const result = await service.validatePromoCode("EXPIRED", "tenant1");

      expect(result.valid).toBe(false);
      expect(result.error).toContain("expired");
    });

    it("accepts non-expired promo code", async () => {
      const promoCode = {
        code: "FUTURE",
        type: "percentage_discount" as PromoCodeType,
        value: 20,
        active: true,
        expiresAt: "2099-12-31T23:59:59.000Z",
        createdBy: "admin",
      };

      await service.createPromoCode(promoCode);
      const result = await service.validatePromoCode("FUTURE", "tenant1");

      expect(result.valid).toBe(true);
    });

    it("rejects code at max uses", async () => {
      const promoCode = {
        code: "MAXED",
        type: "percentage_discount" as PromoCodeType,
        value: 20,
        maxUses: 2,
        active: true,
        createdBy: "admin",
      };

      const created = await service.createPromoCode(promoCode);

      // Manually set usedCount to maxUses
      const updatedCode = { ...created.code!, usedCount: 2 };
      mockKV.set("promo:MAXED", JSON.stringify(updatedCode));

      const result = await service.validatePromoCode("MAXED", "tenant1");

      expect(result.valid).toBe(false);
      expect(result.error).toContain("maximum uses");
    });

    it("accepts code below max uses", async () => {
      const promoCode = {
        code: "AVAILABLE",
        type: "percentage_discount" as PromoCodeType,
        value: 20,
        maxUses: 10,
        active: true,
        createdBy: "admin",
      };

      await service.createPromoCode(promoCode);
      const result = await service.validatePromoCode("AVAILABLE", "tenant1");

      expect(result.valid).toBe(true);
    });

    it("rejects code already used by tenant", async () => {
      const promoCode = {
        code: "USED",
        type: "percentage_discount" as PromoCodeType,
        value: 20,
        active: true,
        createdBy: "admin",
      };

      await service.createPromoCode(promoCode);
      await service.applyPromoCode("USED", "tenant1");

      const result = await service.validatePromoCode("USED", "tenant1");

      expect(result.valid).toBe(false);
      expect(result.error).toContain("already used");
    });

    it("rejects tenant-specific code for wrong tenant", async () => {
      const promoCode = {
        code: "SYSTON-ONLY",
        type: "percentage_discount" as PromoCodeType,
        value: 50,
        active: true,
        createdBy: "admin",
        metadata: {
          targetTenant: "syston",
        },
      };

      await service.createPromoCode(promoCode);
      const result = await service.validatePromoCode("SYSTON-ONLY", "kingsthorpe");

      expect(result.valid).toBe(false);
      expect(result.error).toContain("not valid for your account");
    });

    it("accepts tenant-specific code for correct tenant", async () => {
      const promoCode = {
        code: "SYSTON-SPECIAL",
        type: "percentage_discount" as PromoCodeType,
        value: 50,
        active: true,
        createdBy: "admin",
        metadata: {
          targetTenant: "syston",
        },
      };

      await service.createPromoCode(promoCode);
      const result = await service.validatePromoCode("SYSTON-SPECIAL", "syston");

      expect(result.valid).toBe(true);
    });
  });

  describe("applyPromoCode()", () => {
    it("successfully applies a valid promo code", async () => {
      const promoCode = {
        code: "APPLY",
        type: "percentage_discount" as PromoCodeType,
        value: 25,
        active: true,
        createdBy: "admin",
      };

      await service.createPromoCode(promoCode);
      const result = await service.applyPromoCode("APPLY", "tenant1");

      expect(result.success).toBe(true);
      expect(result.discount?.type).toBe("percentage_discount");
      expect(result.discount?.value).toBe(25);
    });

    it("increments usedCount when applied", async () => {
      const promoCode = {
        code: "INCREMENT",
        type: "percentage_discount" as PromoCodeType,
        value: 30,
        active: true,
        createdBy: "admin",
      };

      await service.createPromoCode(promoCode);
      await service.applyPromoCode("INCREMENT", "tenant1");

      const updated = await service.getPromoCode("INCREMENT");
      expect(updated?.usedCount).toBe(1);
    });

    it("creates redemption record", async () => {
      const promoCode = {
        code: "RECORD",
        type: "percentage_discount" as PromoCodeType,
        value: 35,
        active: true,
        createdBy: "admin",
      };

      await service.createPromoCode(promoCode);
      await service.applyPromoCode("RECORD", "tenant1");

      const redemption = mockKV.get("promo-redemption:tenant1:RECORD");
      expect(redemption).toBeTruthy();
      const parsed = JSON.parse(redemption!);
      expect(parsed.code).toBe("RECORD");
      expect(parsed.tenantId).toBe("tenant1");
    });

    it("prevents duplicate application by same tenant", async () => {
      const promoCode = {
        code: "ONCE",
        type: "percentage_discount" as PromoCodeType,
        value: 40,
        active: true,
        createdBy: "admin",
      };

      await service.createPromoCode(promoCode);
      await service.applyPromoCode("ONCE", "tenant1");
      const result = await service.applyPromoCode("ONCE", "tenant1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("already used");
    });

    it("allows different tenants to use same code", async () => {
      const promoCode = {
        code: "SHARED",
        type: "percentage_discount" as PromoCodeType,
        value: 20,
        maxUses: 10,
        active: true,
        createdBy: "admin",
      };

      await service.createPromoCode(promoCode);
      const result1 = await service.applyPromoCode("SHARED", "tenant1");
      const result2 = await service.applyPromoCode("SHARED", "tenant2");

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const updated = await service.getPromoCode("SHARED");
      expect(updated?.usedCount).toBe(2);
    });

    it("returns discount with durationMonths", async () => {
      const promoCode = {
        code: "DURATION",
        type: "months_free" as PromoCodeType,
        value: 3,
        durationMonths: 3,
        active: true,
        createdBy: "admin",
      };

      await service.createPromoCode(promoCode);
      const result = await service.applyPromoCode("DURATION", "tenant1");

      expect(result.success).toBe(true);
      expect(result.discount?.durationMonths).toBe(3);
    });

    it("returns plan for plan_upgrade type", async () => {
      const promoCode = {
        code: "UPGRADE",
        type: "plan_upgrade" as PromoCodeType,
        value: "enterprise",
        active: true,
        createdBy: "admin",
      };

      await service.createPromoCode(promoCode);
      const result = await service.applyPromoCode("UPGRADE", "tenant1");

      expect(result.success).toBe(true);
      expect(result.discount?.plan).toBe("enterprise");
    });

    it("rejects invalid promo code", async () => {
      const result = await service.applyPromoCode("INVALID", "tenant1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid promo code");
    });
  });

  describe("hasUsedPromoCode()", () => {
    it("returns false when tenant has not used code", async () => {
      const result = await service.hasUsedPromoCode("tenant1", "UNUSED");

      expect(result).toBe(false);
    });

    it("returns true when tenant has used code", async () => {
      const promoCode = {
        code: "HASUSED",
        type: "percentage_discount" as PromoCodeType,
        value: 20,
        active: true,
        createdBy: "admin",
      };

      await service.createPromoCode(promoCode);
      await service.applyPromoCode("HASUSED", "tenant1");

      const result = await service.hasUsedPromoCode("tenant1", "HASUSED");
      expect(result).toBe(true);
    });

    it("handles case-insensitive code lookup", async () => {
      const promoCode = {
        code: "CASETEST",
        type: "percentage_discount" as PromoCodeType,
        value: 20,
        active: true,
        createdBy: "admin",
      };

      await service.createPromoCode(promoCode);
      await service.applyPromoCode("CASETEST", "tenant1");

      const result = await service.hasUsedPromoCode("tenant1", "casetest");
      expect(result).toBe(true);
    });
  });

  describe("deactivatePromoCode()", () => {
    it("successfully deactivates a promo code", async () => {
      const promoCode = {
        code: "DEACTIVATE",
        type: "percentage_discount" as PromoCodeType,
        value: 20,
        active: true,
        createdBy: "admin",
      };

      await service.createPromoCode(promoCode);
      const result = await service.deactivatePromoCode("DEACTIVATE");

      expect(result.success).toBe(true);

      const updated = await service.getPromoCode("DEACTIVATE");
      expect(updated?.active).toBe(false);
    });

    it("returns error for non-existent code", async () => {
      const result = await service.deactivatePromoCode("NONEXISTENT");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("deactivated code fails validation", async () => {
      const promoCode = {
        code: "DEACT",
        type: "percentage_discount" as PromoCodeType,
        value: 20,
        active: true,
        createdBy: "admin",
      };

      await service.createPromoCode(promoCode);
      await service.deactivatePromoCode("DEACT");

      const validation = await service.validatePromoCode("DEACT", "tenant1");
      expect(validation.valid).toBe(false);
    });
  });

  describe("listPromoCodes()", () => {
    it("returns empty array when no promo codes exist", async () => {
      const result = await service.listPromoCodes();

      expect(result).toEqual([]);
    });

    it("lists all promo codes", async () => {
      await service.createPromoCode({
        code: "CODE1",
        type: "percentage_discount" as PromoCodeType,
        value: 10,
        active: true,
        createdBy: "admin",
      });

      await service.createPromoCode({
        code: "CODE2",
        type: "months_free" as PromoCodeType,
        value: 2,
        active: true,
        createdBy: "admin",
      });

      const result = await service.listPromoCodes();

      expect(result).toHaveLength(2);
      expect(result.map((c) => c.code)).toContain("CODE1");
      expect(result.map((c) => c.code)).toContain("CODE2");
    });

    it("sorts promo codes by createdAt descending", async () => {
      // Create codes with small delays to ensure different timestamps
      await service.createPromoCode({
        code: "FIRST",
        type: "percentage_discount" as PromoCodeType,
        value: 10,
        active: true,
        createdBy: "admin",
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await service.createPromoCode({
        code: "SECOND",
        type: "percentage_discount" as PromoCodeType,
        value: 20,
        active: true,
        createdBy: "admin",
      });

      const result = await service.listPromoCodes();

      expect(result[0].code).toBe("SECOND");
      expect(result[1].code).toBe("FIRST");
    });
  });

  describe("createReferralCode()", () => {
    it("creates a referral code with default reward", async () => {
      const result = await service.createReferralCode("syston");

      expect(result.success).toBe(true);
      expect(result.code).toBeTruthy();
      expect(result.code).toContain("REFER-");
    });

    it("creates referral code with custom reward months", async () => {
      const result = await service.createReferralCode("syston", 6);

      expect(result.success).toBe(true);

      const promoCode = await service.getPromoCode(result.code!);
      expect(promoCode?.type).toBe("referral_reward");
      expect(promoCode?.value).toBe(6);
      expect(promoCode?.durationMonths).toBe(6);
    });

    it("creates referral code with unlimited uses", async () => {
      const result = await service.createReferralCode("syston");

      const promoCode = await service.getPromoCode(result.code!);
      expect(promoCode?.maxUses).toBeNull();
    });

    it("includes referredBy in metadata", async () => {
      const result = await service.createReferralCode("syston");

      const promoCode = await service.getPromoCode(result.code!);
      expect(promoCode?.metadata?.referredBy).toBe("syston");
    });

    it("generates unique codes for same tenant", async () => {
      const result1 = await service.createReferralCode("syston");
      const result2 = await service.createReferralCode("syston");

      expect(result1.code).not.toBe(result2.code);
    });

    it("creates active referral code", async () => {
      const result = await service.createReferralCode("syston");

      const promoCode = await service.getPromoCode(result.code!);
      expect(promoCode?.active).toBe(true);
    });
  });

  describe("Edge Cases & Integration", () => {
    it("handles multiple redemptions across different tenants", async () => {
      const promoCode = {
        code: "MULTI",
        type: "percentage_discount" as PromoCodeType,
        value: 15,
        maxUses: 5,
        active: true,
        createdBy: "admin",
      };

      await service.createPromoCode(promoCode);

      await service.applyPromoCode("MULTI", "tenant1");
      await service.applyPromoCode("MULTI", "tenant2");
      await service.applyPromoCode("MULTI", "tenant3");

      const updated = await service.getPromoCode("MULTI");
      expect(updated?.usedCount).toBe(3);

      const has1 = await service.hasUsedPromoCode("tenant1", "MULTI");
      const has2 = await service.hasUsedPromoCode("tenant2", "MULTI");
      const has4 = await service.hasUsedPromoCode("tenant4", "MULTI");

      expect(has1).toBe(true);
      expect(has2).toBe(true);
      expect(has4).toBe(false);
    });

    it("handles all promo code types", async () => {
      const types: Array<{ code: string; type: PromoCodeType; value: string | number }> = [
        { code: "PERCENT50", type: "percentage_discount", value: 50 },
        { code: "FREE3", type: "months_free", value: 3 },
        { code: "UPGRADE-PRO", type: "plan_upgrade", value: "enterprise" },
        { code: "REFERRAL1", type: "referral_reward", value: 2 },
      ];

      for (const { code, type, value } of types) {
        await service.createPromoCode({
          code,
          type,
          value,
          active: true,
          createdBy: "admin",
        });

        const retrieved = await service.getPromoCode(code);
        expect(retrieved?.type).toBe(type);
        expect(retrieved?.value).toBe(value);
      }
    });

    it("validates complete promo code lifecycle", async () => {
      // Create
      const createResult = await service.createPromoCode({
        code: "LIFECYCLE",
        type: "percentage_discount" as PromoCodeType,
        value: 25,
        maxUses: 2,
        active: true,
        createdBy: "admin",
      });
      expect(createResult.success).toBe(true);

      // Validate
      const validateResult = await service.validatePromoCode("LIFECYCLE", "tenant1");
      expect(validateResult.valid).toBe(true);

      // Apply
      const applyResult = await service.applyPromoCode("LIFECYCLE", "tenant1");
      expect(applyResult.success).toBe(true);

      // Check usage
      const hasUsed = await service.hasUsedPromoCode("tenant1", "LIFECYCLE");
      expect(hasUsed).toBe(true);

      // Deactivate
      const deactivateResult = await service.deactivatePromoCode("LIFECYCLE");
      expect(deactivateResult.success).toBe(true);

      // Validate after deactivation
      const finalValidation = await service.validatePromoCode("LIFECYCLE", "tenant2");
      expect(finalValidation.valid).toBe(false);
    });
  });
});
