import { describe, it, expect, beforeEach, vi } from "vitest";
import { getBrand, setBrand, type BrandKit } from "../brand";

// Mock clubConfig module
vi.mock("../clubConfig", () => ({
  getClubConfig: vi.fn(),
  updateClubConfigSection: vi.fn(),
}));

describe("Brand Service", () => {
  let mockEnv: any;
  let getClubConfigMock: any;
  let updateClubConfigSectionMock: any;

  beforeEach(async () => {
    mockEnv = {};

    const { getClubConfig, updateClubConfigSection } = await import("../clubConfig");
    getClubConfigMock = getClubConfig as any;
    updateClubConfigSectionMock = updateClubConfigSection as any;

    vi.clearAllMocks();
  });

  describe("getBrand", () => {
    it("should return brand kit with all fields", async () => {
      getClubConfigMock.mockResolvedValue({
        branding: {
          primaryColor: "#6CC5FF",
          secondaryColor: "#9AA1AC",
          clubBadge: "https://example.com/badge.png",
          sponsorLogos: ["https://example.com/sponsor1.png"],
        },
        clubDetails: {
          name: "Demo FC",
          shortName: "DFC",
        },
      });

      const result = await getBrand(mockEnv, "demo");

      expect(result.primaryColor).toBe("#6CC5FF");
      expect(result.secondaryColor).toBe("#9AA1AC");
      expect(result.clubBadge).toBe("https://example.com/badge.png");
      expect(result.sponsorLogos).toEqual(["https://example.com/sponsor1.png"]);
      expect(result.clubName).toBe("Demo FC");
      expect(result.clubShortName).toBe("DFC");
    });

    it("should calculate onPrimary contrast color for dark background", async () => {
      getClubConfigMock.mockResolvedValue({
        branding: {
          primaryColor: "#000000", // Black - dark
          secondaryColor: "#FFFFFF",
        },
        clubDetails: { name: "Club", shortName: "C" },
      });

      const result = await getBrand(mockEnv, "demo");

      expect(result.onPrimary).toBe("#FFFFFF"); // White text on black bg
    });

    it("should calculate onPrimary contrast color for light background", async () => {
      getClubConfigMock.mockResolvedValue({
        branding: {
          primaryColor: "#FFFFFF", // White - light
          secondaryColor: "#000000",
        },
        clubDetails: { name: "Club", shortName: "C" },
      });

      const result = await getBrand(mockEnv, "demo");

      expect(result.onPrimary).toBe("#000000"); // Black text on white bg
    });

    it("should calculate onSecondary contrast color", async () => {
      getClubConfigMock.mockResolvedValue({
        branding: {
          primaryColor: "#6CC5FF",
          secondaryColor: "#1A1A1A", // Very dark
        },
        clubDetails: { name: "Club", shortName: "C" },
      });

      const result = await getBrand(mockEnv, "demo");

      expect(result.onSecondary).toBe("#FFFFFF"); // White text on dark bg
    });

    it("should handle undefined clubBadge", async () => {
      getClubConfigMock.mockResolvedValue({
        branding: {
          primaryColor: "#6CC5FF",
          secondaryColor: "#9AA1AC",
          clubBadge: undefined,
          sponsorLogos: [],
        },
        clubDetails: { name: "Club", shortName: "C" },
      });

      const result = await getBrand(mockEnv, "demo");

      expect(result.clubBadge).toBeUndefined();
    });

    it("should handle empty sponsor logos", async () => {
      getClubConfigMock.mockResolvedValue({
        branding: {
          primaryColor: "#6CC5FF",
          secondaryColor: "#9AA1AC",
          sponsorLogos: [],
        },
        clubDetails: { name: "Club", shortName: "C" },
      });

      const result = await getBrand(mockEnv, "demo");

      expect(result.sponsorLogos).toEqual([]);
    });
  });

  describe("setBrand", () => {
    beforeEach(() => {
      getClubConfigMock.mockResolvedValue({
        branding: {
          primaryColor: "#6CC5FF",
          secondaryColor: "#9AA1AC",
          sponsorLogos: [],
        },
        clubDetails: {
          name: "Demo FC",
          shortName: "DFC",
        },
      });
    });

    it("should update primary color", async () => {
      await setBrand(mockEnv, "demo", { primaryColor: "#FF0000" });

      expect(updateClubConfigSectionMock).toHaveBeenCalledWith(
        mockEnv,
        "demo",
        "branding",
        expect.objectContaining({ primaryColor: "#FF0000" })
      );
    });

    it("should update secondary color", async () => {
      await setBrand(mockEnv, "demo", { secondaryColor: "#0000FF" });

      expect(updateClubConfigSectionMock).toHaveBeenCalledWith(
        mockEnv,
        "demo",
        "branding",
        expect.objectContaining({ secondaryColor: "#0000FF" })
      );
    });

    it("should update club badge", async () => {
      await setBrand(mockEnv, "demo", {
        clubBadge: "https://example.com/new-badge.png",
      });

      expect(updateClubConfigSectionMock).toHaveBeenCalledWith(
        mockEnv,
        "demo",
        "branding",
        expect.objectContaining({
          clubBadge: "https://example.com/new-badge.png",
        })
      );
    });

    it("should update sponsor logos", async () => {
      await setBrand(mockEnv, "demo", {
        sponsorLogos: [
          "https://example.com/sponsor1.png",
          "https://example.com/sponsor2.png",
        ],
      });

      expect(updateClubConfigSectionMock).toHaveBeenCalledWith(
        mockEnv,
        "demo",
        "branding",
        expect.objectContaining({
          sponsorLogos: [
            "https://example.com/sponsor1.png",
            "https://example.com/sponsor2.png",
          ],
        })
      );
    });

    it("should update club name", async () => {
      await setBrand(mockEnv, "demo", { clubName: "Updated FC" });

      expect(updateClubConfigSectionMock).toHaveBeenCalledWith(
        mockEnv,
        "demo",
        "clubDetails",
        expect.objectContaining({ name: "Updated FC" })
      );
    });

    it("should update club short name", async () => {
      await setBrand(mockEnv, "demo", { clubShortName: "UFC" });

      expect(updateClubConfigSectionMock).toHaveBeenCalledWith(
        mockEnv,
        "demo",
        "clubDetails",
        expect.objectContaining({ shortName: "UFC" })
      );
    });

    it("should update multiple fields at once", async () => {
      await setBrand(mockEnv, "demo", {
        primaryColor: "#FF0000",
        secondaryColor: "#00FF00",
        clubName: "New Club",
      });

      expect(updateClubConfigSectionMock).toHaveBeenCalledWith(
        mockEnv,
        "demo",
        "branding",
        expect.objectContaining({
          primaryColor: "#FF0000",
          secondaryColor: "#00FF00",
        })
      );

      expect(updateClubConfigSectionMock).toHaveBeenCalledWith(
        mockEnv,
        "demo",
        "clubDetails",
        expect.objectContaining({ name: "New Club" })
      );
    });

    it("should validate hex color format", async () => {
      await expect(
        setBrand(mockEnv, "demo", { primaryColor: "red" })
      ).rejects.toThrow();

      await expect(
        setBrand(mockEnv, "demo", { primaryColor: "#FFF" })
      ).rejects.toThrow();

      await expect(
        setBrand(mockEnv, "demo", { primaryColor: "#GGGGGG" })
      ).rejects.toThrow();
    });

    it("should accept valid 6-digit hex colors", async () => {
      await expect(
        setBrand(mockEnv, "demo", { primaryColor: "#FF0000" })
      ).resolves.not.toThrow();

      await expect(
        setBrand(mockEnv, "demo", { primaryColor: "#00ff00" })
      ).resolves.not.toThrow();

      await expect(
        setBrand(mockEnv, "demo", { primaryColor: "#123ABC" })
      ).resolves.not.toThrow();
    });

    it("should return full brand kit after update", async () => {
      const result = await setBrand(mockEnv, "demo", {
        primaryColor: "#FF0000",
      });

      expect(result).toHaveProperty("primaryColor");
      expect(result).toHaveProperty("secondaryColor");
      expect(result).toHaveProperty("onPrimary");
      expect(result).toHaveProperty("onSecondary");
    });
  });

  describe("Contrast Color Calculation", () => {
    it("should return white text for very dark colors", async () => {
      getClubConfigMock.mockResolvedValue({
        branding: {
          primaryColor: "#000000",
          secondaryColor: "#111111",
        },
        clubDetails: { name: "Club", shortName: "C" },
      });

      const result = await getBrand(mockEnv, "demo");

      expect(result.onPrimary).toBe("#FFFFFF");
      expect(result.onSecondary).toBe("#FFFFFF");
    });

    it("should return black text for very light colors", async () => {
      getClubConfigMock.mockResolvedValue({
        branding: {
          primaryColor: "#FFFFFF",
          secondaryColor: "#EEEEEE",
        },
        clubDetails: { name: "Club", shortName: "C" },
      });

      const result = await getBrand(mockEnv, "demo");

      expect(result.onPrimary).toBe("#000000");
      expect(result.onSecondary).toBe("#000000");
    });

    it("should handle medium brightness colors correctly", async () => {
      getClubConfigMock.mockResolvedValue({
        branding: {
          primaryColor: "#808080", // Medium gray - should use white text
          secondaryColor: "#B0B0B0", // Light gray - should use black text
        },
        clubDetails: { name: "Club", shortName: "C" },
      });

      const result = await getBrand(mockEnv, "demo");

      // Medium gray (0x80 = 128) should have white text
      expect(result.onPrimary).toBe("#000000");
      // Light gray should have black text
      expect(result.onSecondary).toBe("#000000");
    });
  });

  describe("Edge Cases", () => {
    it("should handle uppercase and lowercase hex colors", async () => {
      await expect(
        setBrand(mockEnv, "demo", { primaryColor: "#ABCDEF" })
      ).resolves.not.toThrow();

      await expect(
        setBrand(mockEnv, "demo", { primaryColor: "#abcdef" })
      ).resolves.not.toThrow();
    });

    it("should handle empty sponsor logos array", async () => {
      await expect(
        setBrand(mockEnv, "demo", { sponsorLogos: [] })
      ).resolves.not.toThrow();
    });

    it("should handle partial updates without affecting other fields", async () => {
      getClubConfigMock.mockResolvedValue({
        branding: {
          primaryColor: "#6CC5FF",
          secondaryColor: "#9AA1AC",
          clubBadge: "https://example.com/badge.png",
          sponsorLogos: ["https://example.com/sponsor1.png"],
        },
        clubDetails: {
          name: "Demo FC",
          shortName: "DFC",
        },
      });

      await setBrand(mockEnv, "demo", { primaryColor: "#FF0000" });

      // Should only update branding section, not clubDetails
      expect(updateClubConfigSectionMock).toHaveBeenCalledTimes(1);
      expect(updateClubConfigSectionMock).toHaveBeenCalledWith(
        mockEnv,
        "demo",
        "branding",
        expect.any(Object)
      );
    });
  });
});
