import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getDefaultClubConfig,
  getClubConfig,
  updateClubConfig,
  updateClubConfigSection,
  updateFeatureFlags,
  uploadClubBadge,
  uploadSponsorLogo,
  type ClubConfig,
} from "../clubConfig";

describe("Club Config Service", () => {
  let mockEnv: any;
  let mockKV: Map<string, string>;
  let mockR2: Map<string, any>;

  beforeEach(() => {
    mockKV = new Map();
    mockR2 = new Map();

    mockEnv = {
      KV_IDEMP: {
        get: vi.fn(async (key: string, type?: string) => {
          const value = mockKV.get(key);
          if (!value) {return null;}
          return type === "json" ? JSON.parse(value) : value;
        }),
        put: vi.fn(async (key: string, value: string) => {
          mockKV.set(key, value);
        }),
      },
      R2_MEDIA: {
        put: vi.fn(async (key: string, data: any, options?: any) => {
          mockR2.set(key, { data, options });
        }),
      },
    };

    vi.clearAllMocks();
  });

  describe("getDefaultClubConfig", () => {
    it("should return default config with club name and short name", () => {
      const config = getDefaultClubConfig("Demo FC", "DFC");

      expect(config.clubDetails.name).toBe("Demo FC");
      expect(config.clubDetails.shortName).toBe("DFC");
    });

    it("should have default branding colors", () => {
      const config = getDefaultClubConfig("Test Club", "TC");

      expect(config.branding.primaryColor).toBe("#6CC5FF");
      expect(config.branding.secondaryColor).toBe("#9AA1AC");
      expect(config.branding.sponsorLogos).toEqual([]);
    });

    it("should have gallery and highlights enabled by default", () => {
      const config = getDefaultClubConfig("Test Club", "TC");

      expect(config.featureFlags.enableGallery).toBe(true);
      expect(config.featureFlags.enableHighlights).toBe(true);
      expect(config.featureFlags.enableMOTMVoting).toBe(true);
    });

    it("should have shop and payments disabled by default", () => {
      const config = getDefaultClubConfig("Test Club", "TC");

      expect(config.featureFlags.enableShop).toBe(false);
      expect(config.featureFlags.enablePayments).toBe(false);
      expect(config.featureFlags.enableTrainingPlans).toBe(false);
      expect(config.featureFlags.enableAwards).toBe(false);
    });

    it("should have default quiet hours", () => {
      const config = getDefaultClubConfig("Test Club", "TC");

      expect(config.policies.quietHoursStart).toBe("22:00");
      expect(config.policies.quietHoursEnd).toBe("08:00");
      expect(config.policies.allowUrgentBypass).toBe(true);
    });

    it("should have default upload size limit", () => {
      const config = getDefaultClubConfig("Test Club", "TC");

      expect(config.policies.maxUploadSizeMB).toBe(10);
    });

    it("should require photo consent by default", () => {
      const config = getDefaultClubConfig("Test Club", "TC");

      expect(config.policies.photoConsentRequired).toBe(true);
    });

    it("should have all external IDs undefined", () => {
      const config = getDefaultClubConfig("Test Club", "TC");

      expect(config.externalIds.faFullTime).toBeUndefined();
      expect(config.externalIds.youtubeChannelId).toBeUndefined();
      expect(config.externalIds.printifyStoreId).toBeUndefined();
      expect(config.externalIds.paymentPlatformId).toBeUndefined();
    });

    it("should have all nav links undefined", () => {
      const config = getDefaultClubConfig("Test Club", "TC");

      expect(config.navLinks.websiteUrl).toBeUndefined();
      expect(config.navLinks.facebookUrl).toBeUndefined();
      expect(config.navLinks.instagramUrl).toBeUndefined();
      expect(config.navLinks.twitterUrl).toBeUndefined();
      expect(config.navLinks.tiktokUrl).toBeUndefined();
    });
  });

  describe("getClubConfig", () => {
    it("should return stored config when exists", async () => {
      const storedConfig: ClubConfig = {
        clubDetails: {
          name: "Stored Club",
          shortName: "SC",
          founded: "1990",
          venue: "Home Stadium",
        },
        branding: {
          primaryColor: "#FF0000",
          secondaryColor: "#0000FF",
          sponsorLogos: ["logo1.jpg"],
        },
        externalIds: {},
        featureFlags: {
          enableGallery: true,
          enableShop: true,
          enablePayments: false,
          enableHighlights: true,
          enableMOTMVoting: true,
          enableTrainingPlans: false,
          enableAwards: false,
        },
        policies: {
          quietHoursStart: "23:00",
          quietHoursEnd: "07:00",
          allowUrgentBypass: false,
          maxUploadSizeMB: 20,
          photoConsentRequired: true,
        },
        navLinks: {
          websiteUrl: "https://example.com",
        },
      };

      mockKV.set(
        "tenants:demo:club-config",
        JSON.stringify(storedConfig)
      );

      const result = await getClubConfig(mockEnv, "demo");

      expect(result.clubDetails.name).toBe("Stored Club");
      expect(result.branding.primaryColor).toBe("#FF0000");
      expect(result.featureFlags.enableShop).toBe(true);
    });

    it("should return default config when not stored", async () => {
      const result = await getClubConfig(mockEnv, "demo");

      expect(result.clubDetails.name).toBe("My Club");
      expect(result.clubDetails.shortName).toBe("demo");
    });

    it("should use tenant name from config if available", async () => {
      mockKV.set(
        "tenants:demo:config",
        JSON.stringify({ name: "Demo Football Club", id: "DFC" })
      );

      const result = await getClubConfig(mockEnv, "demo");

      expect(result.clubDetails.name).toBe("Demo Football Club");
      expect(result.clubDetails.shortName).toBe("DFC");
    });

    it("should isolate config by tenant", async () => {
      mockKV.set(
        "tenants:tenant1:club-config",
        JSON.stringify(
          getDefaultClubConfig("Tenant 1 Club", "T1")
        )
      );
      mockKV.set(
        "tenants:tenant2:club-config",
        JSON.stringify(
          getDefaultClubConfig("Tenant 2 Club", "T2")
        )
      );

      const result1 = await getClubConfig(mockEnv, "tenant1");
      const result2 = await getClubConfig(mockEnv, "tenant2");

      expect(result1.clubDetails.name).toBe("Tenant 1 Club");
      expect(result2.clubDetails.name).toBe("Tenant 2 Club");
    });
  });

  describe("updateClubConfig", () => {
    it("should store config in KV", async () => {
      const config = getDefaultClubConfig("Updated Club", "UC");

      await updateClubConfig(mockEnv, "demo", config);

      expect(mockEnv.KV_IDEMP.put).toHaveBeenCalled();
      const stored = JSON.parse(
        mockKV.get("tenants:demo:club-config")!
      );
      expect(stored.clubDetails.name).toBe("Updated Club");
    });

    it("should return the updated config", async () => {
      const config = getDefaultClubConfig("Updated Club", "UC");

      const result = await updateClubConfig(mockEnv, "demo", config);

      expect(result).toEqual(config);
    });

    it("should overwrite existing config", async () => {
      const oldConfig = getDefaultClubConfig("Old Club", "OC");
      mockKV.set("tenants:demo:club-config", JSON.stringify(oldConfig));

      const newConfig = getDefaultClubConfig("New Club", "NC");
      await updateClubConfig(mockEnv, "demo", newConfig);

      const stored = JSON.parse(
        mockKV.get("tenants:demo:club-config")!
      );
      expect(stored.clubDetails.name).toBe("New Club");
    });
  });

  describe("updateClubConfigSection", () => {
    beforeEach(() => {
      const config = getDefaultClubConfig("Test Club", "TC");
      mockKV.set("tenants:demo:club-config", JSON.stringify(config));
    });

    it("should update clubDetails section", async () => {
      const result = await updateClubConfigSection(
        mockEnv,
        "demo",
        "clubDetails",
        { founded: "1985", venue: "New Stadium" }
      );

      expect(result.clubDetails.founded).toBe("1985");
      expect(result.clubDetails.venue).toBe("New Stadium");
      expect(result.clubDetails.name).toBe("Test Club"); // Original preserved
    });

    it("should update branding section", async () => {
      const result = await updateClubConfigSection(
        mockEnv,
        "demo",
        "branding",
        { primaryColor: "#00FF00" }
      );

      expect(result.branding.primaryColor).toBe("#00FF00");
      expect(result.branding.secondaryColor).toBe("#9AA1AC"); // Original preserved
    });

    it("should update externalIds section", async () => {
      const result = await updateClubConfigSection(
        mockEnv,
        "demo",
        "externalIds",
        { youtubeChannelId: "UCtest123", faFullTime: "fa_test" }
      );

      expect(result.externalIds.youtubeChannelId).toBe("UCtest123");
      expect(result.externalIds.faFullTime).toBe("fa_test");
    });

    it("should update policies section", async () => {
      const result = await updateClubConfigSection(
        mockEnv,
        "demo",
        "policies",
        { maxUploadSizeMB: 50, allowUrgentBypass: false }
      );

      expect(result.policies.maxUploadSizeMB).toBe(50);
      expect(result.policies.allowUrgentBypass).toBe(false);
      expect(result.policies.quietHoursStart).toBe("22:00"); // Original preserved
    });

    it("should update navLinks section", async () => {
      const result = await updateClubConfigSection(
        mockEnv,
        "demo",
        "navLinks",
        {
          websiteUrl: "https://club.example.com",
          facebookUrl: "https://facebook.com/club",
        }
      );

      expect(result.navLinks.websiteUrl).toBe("https://club.example.com");
      expect(result.navLinks.facebookUrl).toBe("https://facebook.com/club");
    });

    it("should persist section update to KV", async () => {
      await updateClubConfigSection(mockEnv, "demo", "clubDetails", {
        email: "info@club.com",
      });

      const stored = JSON.parse(
        mockKV.get("tenants:demo:club-config")!
      );
      expect(stored.clubDetails.email).toBe("info@club.com");
    });
  });

  describe("updateFeatureFlags", () => {
    beforeEach(() => {
      const config = getDefaultClubConfig("Test Club", "TC");
      mockKV.set("tenants:demo:club-config", JSON.stringify(config));
    });

    it("should update single feature flag", async () => {
      const result = await updateFeatureFlags(mockEnv, "demo", {
        enableShop: true,
      });

      expect(result.featureFlags.enableShop).toBe(true);
    });

    it("should update multiple feature flags", async () => {
      const result = await updateFeatureFlags(mockEnv, "demo", {
        enableShop: true,
        enablePayments: true,
        enableTrainingPlans: true,
      });

      expect(result.featureFlags.enableShop).toBe(true);
      expect(result.featureFlags.enablePayments).toBe(true);
      expect(result.featureFlags.enableTrainingPlans).toBe(true);
    });

    it("should preserve unmodified flags", async () => {
      const result = await updateFeatureFlags(mockEnv, "demo", {
        enableShop: true,
      });

      expect(result.featureFlags.enableGallery).toBe(true); // Original
      expect(result.featureFlags.enableHighlights).toBe(true); // Original
    });

    it("should disable feature flag", async () => {
      const result = await updateFeatureFlags(mockEnv, "demo", {
        enableGallery: false,
      });

      expect(result.featureFlags.enableGallery).toBe(false);
    });

    it("should persist flag updates to KV", async () => {
      await updateFeatureFlags(mockEnv, "demo", {
        enableAwards: true,
      });

      const stored = JSON.parse(
        mockKV.get("tenants:demo:club-config")!
      );
      expect(stored.featureFlags.enableAwards).toBe(true);
    });
  });

  describe("uploadClubBadge", () => {
    it("should upload badge to R2", async () => {
      const file = new ArrayBuffer(1024);
      const result = await uploadClubBadge(
        mockEnv,
        "demo",
        file,
        "image/png"
      );

      expect(mockEnv.R2_MEDIA.put).toHaveBeenCalled();
      expect(result.r2Key).toContain("tenants/demo/branding/badge_");
    });

    it("should use correct R2 key format", async () => {
      const file = new ArrayBuffer(1024);
      const result = await uploadClubBadge(
        mockEnv,
        "demo",
        file,
        "image/jpeg"
      );

      expect(result.r2Key).toMatch(
        /^tenants\/demo\/branding\/badge_\d+\.jpg$/
      );
    });

    it("should return URL for badge", async () => {
      const file = new ArrayBuffer(1024);
      const result = await uploadClubBadge(
        mockEnv,
        "demo",
        file,
        "image/jpeg"
      );

      expect(result.url).toContain("/api/v1/media/photo/");
      expect(result.url).toContain(encodeURIComponent(result.r2Key));
    });

    it("should set content type in R2 metadata", async () => {
      const file = new ArrayBuffer(1024);
      await uploadClubBadge(mockEnv, "demo", file, "image/webp");

      const putCall = (mockEnv.R2_MEDIA.put as any).mock.calls[0];
      expect(putCall[2].httpMetadata.contentType).toBe("image/webp");
    });

    it("should use default content type if not provided", async () => {
      const file = new ArrayBuffer(1024);
      await uploadClubBadge(mockEnv, "demo", file, "");

      const putCall = (mockEnv.R2_MEDIA.put as any).mock.calls[0];
      expect(putCall[2].httpMetadata.contentType).toBe("image/jpeg");
    });
  });

  describe("uploadSponsorLogo", () => {
    it("should upload logo to R2", async () => {
      const file = new ArrayBuffer(2048);
      const result = await uploadSponsorLogo(
        mockEnv,
        "demo",
        file,
        "image/png"
      );

      expect(mockEnv.R2_MEDIA.put).toHaveBeenCalled();
      expect(result.r2Key).toContain("tenants/demo/branding/sponsor_");
    });

    it("should use correct R2 key format", async () => {
      const file = new ArrayBuffer(2048);
      const result = await uploadSponsorLogo(
        mockEnv,
        "demo",
        file,
        "image/jpeg"
      );

      expect(result.r2Key).toMatch(
        /^tenants\/demo\/branding\/sponsor_\d+\.jpg$/
      );
    });

    it("should return URL for logo", async () => {
      const file = new ArrayBuffer(2048);
      const result = await uploadSponsorLogo(
        mockEnv,
        "demo",
        file,
        "image/jpeg"
      );

      expect(result.url).toContain("/api/v1/media/photo/");
      expect(result.url).toContain(encodeURIComponent(result.r2Key));
    });

    it("should handle multiple sponsor logos", async () => {
      const file1 = new ArrayBuffer(1024);
      const file2 = new ArrayBuffer(2048);

      const result1 = await uploadSponsorLogo(
        mockEnv,
        "demo",
        file1,
        "image/png"
      );

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const result2 = await uploadSponsorLogo(
        mockEnv,
        "demo",
        file2,
        "image/png"
      );

      expect(result1.r2Key).not.toBe(result2.r2Key);
      expect(mockEnv.R2_MEDIA.put).toHaveBeenCalledTimes(2);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty sponsor logos array", () => {
      const config = getDefaultClubConfig("Test", "T");
      expect(config.branding.sponsorLogos).toEqual([]);
    });

    it("should handle very long club names", () => {
      const longName = "A".repeat(200);
      const config = getDefaultClubConfig(longName, "SHORT");

      expect(config.clubDetails.name).toBe(longName);
      expect(config.clubDetails.shortName).toBe("SHORT");
    });

    it("should handle Unicode club names", () => {
      const config = getDefaultClubConfig("北京国安足球俱乐部", "国安");

      expect(config.clubDetails.name).toBe("北京国安足球俱乐部");
      expect(config.clubDetails.shortName).toBe("国安");
    });

    it("should handle updating all feature flags at once", async () => {
      const config = getDefaultClubConfig("Test", "T");
      mockKV.set("tenants:demo:club-config", JSON.stringify(config));

      const result = await updateFeatureFlags(mockEnv, "demo", {
        enableGallery: false,
        enableShop: true,
        enablePayments: true,
        enableHighlights: false,
        enableMOTMVoting: false,
        enableTrainingPlans: true,
        enableAwards: true,
      });

      expect(result.featureFlags.enableGallery).toBe(false);
      expect(result.featureFlags.enableShop).toBe(true);
      expect(result.featureFlags.enablePayments).toBe(true);
      expect(result.featureFlags.enableHighlights).toBe(false);
      expect(result.featureFlags.enableMOTMVoting).toBe(false);
      expect(result.featureFlags.enableTrainingPlans).toBe(true);
      expect(result.featureFlags.enableAwards).toBe(true);
    });
  });
});
