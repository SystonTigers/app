// src/services/autoPostsMatrix.ts

import { z } from "zod";

export type ChannelKey = "app" | "x" | "instagram" | "facebook" | "tiktok";

export type PostType =
  | "COUNTDOWN_T3"
  | "COUNTDOWN_T2"
  | "COUNTDOWN_T1"
  | "MATCHDAY"
  | "LIVE_UPDATE"
  | "HALFTIME"
  | "FULLTIME"
  | "LEAGUE_FIXTURES"
  | "RESULTS_SUMMARY"
  | "TABLE_UPDATE"
  | "POSTPONEMENT"
  | "BIRTHDAY"
  | "QUOTE"
  | "MOTM_RESULT"
  | "HIGHLIGHTS";

export interface AutoPostConfig {
  channels: Record<ChannelKey, boolean>;
  scheduleTime?: string;
  sponsorOverlay: boolean;
}

export type AutoPostsMatrix = Record<PostType, AutoPostConfig>;

const ChannelConfigSchema = z.object({
  app: z.boolean(),
  x: z.boolean(),
  instagram: z.boolean(),
  facebook: z.boolean(),
  tiktok: z.boolean(),
});

const AutoPostConfigSchema = z.object({
  channels: ChannelConfigSchema,
  scheduleTime: z.string().optional(),
  sponsorOverlay: z.boolean(),
});

const AutoPostsMatrixSchema = z.record(AutoPostConfigSchema);

/**
 * Get default auto-posts matrix configuration
 */
export function getDefaultAutoPostsMatrix(): AutoPostsMatrix {
  const defaultChannels: Record<ChannelKey, boolean> = {
    app: true,
    x: false,
    instagram: false,
    facebook: false,
    tiktok: false,
  };

  const postTypes: PostType[] = [
    "COUNTDOWN_T3",
    "COUNTDOWN_T2",
    "COUNTDOWN_T1",
    "MATCHDAY",
    "LIVE_UPDATE",
    "HALFTIME",
    "FULLTIME",
    "LEAGUE_FIXTURES",
    "RESULTS_SUMMARY",
    "TABLE_UPDATE",
    "POSTPONEMENT",
    "BIRTHDAY",
    "QUOTE",
    "MOTM_RESULT",
    "HIGHLIGHTS",
  ];

  const matrix: AutoPostsMatrix = {} as AutoPostsMatrix;

  postTypes.forEach((type) => {
    matrix[type] = {
      channels: { ...defaultChannels },
      sponsorOverlay: false,
    };
  });

  return matrix;
}

/**
 * Get auto-posts matrix configuration for a tenant
 */
export async function getAutoPostsMatrix(
  env: any,
  tenant: string
): Promise<AutoPostsMatrix> {
  const key = `tenants:${tenant}:auto-posts-matrix`;
  const stored = await env.KV_IDEMP.get(key, "json");

  if (stored) {
    return stored as AutoPostsMatrix;
  }

  // Return default if not configured
  return getDefaultAutoPostsMatrix();
}

/**
 * Update auto-posts matrix configuration for a tenant
 */
export async function updateAutoPostsMatrix(
  env: any,
  tenant: string,
  matrix: AutoPostsMatrix
): Promise<AutoPostsMatrix> {
  const key = `tenants:${tenant}:auto-posts-matrix`;
  await env.KV_IDEMP.put(key, JSON.stringify(matrix));
  return matrix;
}

/**
 * Update a specific post type configuration
 */
export async function updatePostTypeConfig(
  env: any,
  tenant: string,
  postType: PostType,
  config: AutoPostConfig
): Promise<AutoPostsMatrix> {
  const matrix = await getAutoPostsMatrix(env, tenant);
  matrix[postType] = config;
  return await updateAutoPostsMatrix(env, tenant, matrix);
}

/**
 * Toggle a channel for a specific post type
 */
export async function togglePostTypeChannel(
  env: any,
  tenant: string,
  postType: PostType,
  channel: ChannelKey
): Promise<AutoPostsMatrix> {
  const matrix = await getAutoPostsMatrix(env, tenant);
  if (!matrix[postType]) {
    matrix[postType] = {
      channels: {
        app: false,
        x: false,
        instagram: false,
        facebook: false,
        tiktok: false,
      },
      sponsorOverlay: false,
    };
  }
  matrix[postType].channels[channel] = !matrix[postType].channels[channel];
  return await updateAutoPostsMatrix(env, tenant, matrix);
}

/**
 * Reset auto-posts matrix to defaults
 */
export async function resetAutoPostsMatrix(
  env: any,
  tenant: string
): Promise<AutoPostsMatrix> {
  const defaultMatrix = getDefaultAutoPostsMatrix();
  return await updateAutoPostsMatrix(env, tenant, defaultMatrix);
}

/**
 * Check if a post type should be sent to a specific channel
 */
export async function shouldPostToChannel(
  env: any,
  tenant: string,
  postType: PostType,
  channel: ChannelKey
): Promise<boolean> {
  const matrix = await getAutoPostsMatrix(env, tenant);
  return matrix[postType]?.channels[channel] || false;
}
