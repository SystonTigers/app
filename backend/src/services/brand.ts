// src/services/brand.ts
// Brand management service for multi-tenant white-label support

import { z } from "zod";
import { getClubConfig, updateClubConfigSection } from "./clubConfig";

/**
 * Brand Kit Schema
 * Simplified brand interface for easy consumption by frontends
 */
export const BrandKitSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  onPrimary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(), // Text color for primary bg (WCAG)
  onSecondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(), // Text color for secondary bg
  clubBadge: z.string().url().optional(),
  sponsorLogos: z.array(z.string().url()).optional(),
  clubName: z.string().optional(),
  clubShortName: z.string().optional(),
});

export type BrandKit = z.infer<typeof BrandKitSchema>;

/**
 * Calculate contrasting text color (WCAG)
 * Returns #FFFFFF for dark backgrounds, #000000 for light backgrounds
 */
function getContrastTextColor(hexColor: string): string {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance (WCAG formula)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

/**
 * Get brand kit for a tenant
 */
export async function getBrand(env: any, tenant: string): Promise<BrandKit> {
  const config = await getClubConfig(env, tenant);

  return {
    primaryColor: config.branding.primaryColor,
    secondaryColor: config.branding.secondaryColor,
    onPrimary: getContrastTextColor(config.branding.primaryColor),
    onSecondary: getContrastTextColor(config.branding.secondaryColor),
    clubBadge: config.branding.clubBadge,
    sponsorLogos: config.branding.sponsorLogos,
    clubName: config.clubDetails.name,
    clubShortName: config.clubDetails.shortName,
  };
}

/**
 * Update brand kit for a tenant
 * Validates colors, computes onPrimary/onSecondary automatically
 */
export async function setBrand(
  env: any,
  tenant: string,
  payload: Partial<BrandKit>
): Promise<BrandKit> {
  // Validate the payload
  const validated = BrandKitSchema.partial().parse(payload);

  // Get current config
  const config = await getClubConfig(env, tenant);

  // Update branding section
  if (validated.primaryColor !== undefined) {
    config.branding.primaryColor = validated.primaryColor;
  }
  if (validated.secondaryColor !== undefined) {
    config.branding.secondaryColor = validated.secondaryColor;
  }
  if (validated.clubBadge !== undefined) {
    config.branding.clubBadge = validated.clubBadge;
  }
  if (validated.sponsorLogos !== undefined) {
    config.branding.sponsorLogos = validated.sponsorLogos;
  }

  // Update club details if provided
  if (validated.clubName !== undefined) {
    config.clubDetails.name = validated.clubName;
  }
  if (validated.clubShortName !== undefined) {
    config.clubDetails.shortName = validated.clubShortName;
  }

  // Save the updated config
  await updateClubConfigSection(env, tenant, "branding", config.branding);

  if (validated.clubName || validated.clubShortName) {
    await updateClubConfigSection(env, tenant, "clubDetails", config.clubDetails);
  }

  // Return the full brand kit
  return getBrand(env, tenant);
}
