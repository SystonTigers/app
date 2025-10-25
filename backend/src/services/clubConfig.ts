// src/services/clubConfig.ts

import { z } from "zod";

export interface ClubConfig {
  clubDetails: {
    name: string;
    shortName: string;
    founded?: string;
    venue?: string;
    email?: string;
    phone?: string;
  };
  branding: {
    primaryColor: string;
    secondaryColor: string;
    clubBadge?: string;
    sponsorLogos: string[];
  };
  externalIds: {
    faFullTime?: string;
    youtubeChannelId?: string;
    printifyStoreId?: string;
    paymentPlatformId?: string;
  };
  featureFlags: {
    enableGallery: boolean;
    enableShop: boolean;
    enablePayments: boolean;
    enableHighlights: boolean;
    enableMOTMVoting: boolean;
    enableTrainingPlans: boolean;
    enableAwards: boolean;
  };
  policies: {
    quietHoursStart: string;
    quietHoursEnd: string;
    allowUrgentBypass: boolean;
    maxUploadSizeMB: number;
    photoConsentRequired: boolean;
  };
  navLinks: {
    websiteUrl?: string;
    facebookUrl?: string;
    instagramUrl?: string;
    twitterUrl?: string;
    tiktokUrl?: string;
  };
}

const ClubConfigSchema = z.object({
  clubDetails: z.object({
    name: z.string().min(1),
    shortName: z.string().min(1),
    founded: z.string().optional(),
    venue: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }),
  branding: z.object({
    primaryColor: z.string(),
    secondaryColor: z.string(),
    clubBadge: z.string().optional(),
    sponsorLogos: z.array(z.string()),
  }),
  externalIds: z.object({
    faFullTime: z.string().optional(),
    youtubeChannelId: z.string().optional(),
    printifyStoreId: z.string().optional(),
    paymentPlatformId: z.string().optional(),
  }),
  featureFlags: z.object({
    enableGallery: z.boolean(),
    enableShop: z.boolean(),
    enablePayments: z.boolean(),
    enableHighlights: z.boolean(),
    enableMOTMVoting: z.boolean(),
    enableTrainingPlans: z.boolean(),
    enableAwards: z.boolean(),
  }),
  policies: z.object({
    quietHoursStart: z.string(),
    quietHoursEnd: z.string(),
    allowUrgentBypass: z.boolean(),
    maxUploadSizeMB: z.number().min(1).max(100),
    photoConsentRequired: z.boolean(),
  }),
  navLinks: z.object({
    websiteUrl: z.string().url().optional(),
    facebookUrl: z.string().url().optional(),
    instagramUrl: z.string().url().optional(),
    twitterUrl: z.string().url().optional(),
    tiktokUrl: z.string().url().optional(),
  }),
});

/**
 * Get default club config
 */
export function getDefaultClubConfig(clubName: string, shortName: string): ClubConfig {
  return {
    clubDetails: {
      name: clubName,
      shortName: shortName,
      founded: "",
      venue: "",
      email: "",
      phone: "",
    },
    branding: {
      primaryColor: "#6CC5FF",
      secondaryColor: "#9AA1AC",
      clubBadge: undefined,
      sponsorLogos: [],
    },
    externalIds: {
      faFullTime: undefined,
      youtubeChannelId: undefined,
      printifyStoreId: undefined,
      paymentPlatformId: undefined,
    },
    featureFlags: {
      enableGallery: true,
      enableShop: false,
      enablePayments: false,
      enableHighlights: true,
      enableMOTMVoting: true,
      enableTrainingPlans: false,
      enableAwards: false,
    },
    policies: {
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
      allowUrgentBypass: true,
      maxUploadSizeMB: 10,
      photoConsentRequired: true,
    },
    navLinks: {
      websiteUrl: undefined,
      facebookUrl: undefined,
      instagramUrl: undefined,
      twitterUrl: undefined,
      tiktokUrl: undefined,
    },
  };
}

/**
 * Get club config for a tenant
 */
export async function getClubConfig(
  env: any,
  tenant: string
): Promise<ClubConfig> {
  const key = `tenants:${tenant}:club-config`;
  const stored = await env.KV_IDEMP.get(key, "json");

  if (stored) {
    return stored as ClubConfig;
  }

  // Try to get tenant config for defaults
  const tenantKey = `tenants:${tenant}:config`;
  const tenantConfig = await env.KV_IDEMP.get(tenantKey, "json");
  const clubName = (tenantConfig as any)?.name || "My Club";
  const shortName = (tenantConfig as any)?.id || tenant;

  // Return default if not configured
  return getDefaultClubConfig(clubName, shortName);
}

/**
 * Update club config for a tenant
 */
export async function updateClubConfig(
  env: any,
  tenant: string,
  config: ClubConfig
): Promise<ClubConfig> {
  const key = `tenants:${tenant}:club-config`;
  await env.KV_IDEMP.put(key, JSON.stringify(config));
  return config;
}

/**
 * Update specific section of club config
 */
export async function updateClubConfigSection(
  env: any,
  tenant: string,
  section: keyof ClubConfig,
  data: any
): Promise<ClubConfig> {
  const config = await getClubConfig(env, tenant);
  config[section] = { ...config[section], ...data };
  return await updateClubConfig(env, tenant, config);
}

/**
 * Update feature flags
 */
export async function updateFeatureFlags(
  env: any,
  tenant: string,
  flags: Partial<ClubConfig["featureFlags"]>
): Promise<ClubConfig> {
  const config = await getClubConfig(env, tenant);
  config.featureFlags = { ...config.featureFlags, ...flags };
  return await updateClubConfig(env, tenant, config);
}

/**
 * Upload club badge (returns R2 key)
 */
export async function uploadClubBadge(
  env: any,
  tenant: string,
  file: ArrayBuffer,
  contentType: string
): Promise<{ r2Key: string; url: string }> {
  const r2Key = `tenants/${tenant}/branding/badge_${Date.now()}.jpg`;

  await env.R2_MEDIA.put(r2Key, file, {
    httpMetadata: {
      contentType: contentType || "image/jpeg",
    },
  });

  const url = `/api/v1/media/photo/${encodeURIComponent(r2Key)}`;
  return { r2Key, url };
}

/**
 * Upload sponsor logo (returns R2 key)
 */
export async function uploadSponsorLogo(
  env: any,
  tenant: string,
  file: ArrayBuffer,
  contentType: string
): Promise<{ r2Key: string; url: string }> {
  const r2Key = `tenants/${tenant}/branding/sponsor_${Date.now()}.jpg`;

  await env.R2_MEDIA.put(r2Key, file, {
    httpMetadata: {
      contentType: contentType || "image/jpeg",
    },
  });

  const url = `/api/v1/media/photo/${encodeURIComponent(r2Key)}`;
  return { r2Key, url };
}
