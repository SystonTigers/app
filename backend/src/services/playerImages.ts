// src/services/playerImages.ts

import { z } from "zod";

export interface PlayerImage {
  id: string;
  playerId: string;
  playerName: string;
  type: "headshot" | "action";
  imageUrl: string;
  r2Key: string;
  uploadedAt: string;
  uploadedBy: string;
  metadata?: {
    aspectRatio?: string;
    width?: number;
    height?: number;
  };
}

const PlayerImageSchema = z.object({
  playerId: z.string().min(1),
  playerName: z.string().min(1),
  type: z.enum(["headshot", "action"]),
  imageUrl: z.string().url().optional(),
  r2Key: z.string().min(1),
  uploadedBy: z.string().min(1),
  metadata: z.object({
    aspectRatio: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  }).optional(),
});

/**
 * Create a new player image
 */
export async function createPlayerImage(
  env: any,
  tenant: string,
  data: Omit<PlayerImage, "id" | "uploadedAt">
): Promise<PlayerImage> {
  const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const image: PlayerImage = {
    id,
    ...data,
    uploadedAt: new Date().toISOString(),
  };

  // Store individual image
  const imageKey = `tenants:${tenant}:player-images:${id}`;
  await env.KV_IDEMP.put(imageKey, JSON.stringify(image));

  // Update index
  const indexKey = `tenants:${tenant}:player-images:index`;
  const existing = ((await env.KV_IDEMP.get(indexKey, "json")) as PlayerImage[]) || [];
  const updated = [image, ...existing.filter((img) => img.id !== id)];
  await env.KV_IDEMP.put(indexKey, JSON.stringify(updated.slice(0, 1000)));

  return image;
}

/**
 * Get a player image by ID
 */
export async function getPlayerImage(
  env: any,
  tenant: string,
  imageId: string
): Promise<PlayerImage | null> {
  const imageKey = `tenants:${tenant}:player-images:${imageId}`;
  const image = await env.KV_IDEMP.get(imageKey, "json");
  return image as PlayerImage | null;
}

/**
 * List all player images for a tenant
 */
export async function listPlayerImages(
  env: any,
  tenant: string,
  filters?: { playerId?: string; type?: "headshot" | "action" }
): Promise<PlayerImage[]> {
  const indexKey = `tenants:${tenant}:player-images:index`;
  let images = ((await env.KV_IDEMP.get(indexKey, "json")) as PlayerImage[]) || [];

  // Apply filters
  if (filters?.playerId) {
    images = images.filter((img) => img.playerId === filters.playerId);
  }
  if (filters?.type) {
    images = images.filter((img) => img.type === filters.type);
  }

  return images;
}

/**
 * Update a player image
 */
export async function updatePlayerImage(
  env: any,
  tenant: string,
  imageId: string,
  updates: Partial<Omit<PlayerImage, "id" | "uploadedAt">>
): Promise<PlayerImage | null> {
  const existing = await getPlayerImage(env, tenant, imageId);
  if (!existing) return null;

  const updated: PlayerImage = {
    ...existing,
    ...updates,
  };

  // Store updated image
  const imageKey = `tenants:${tenant}:player-images:${imageId}`;
  await env.KV_IDEMP.put(imageKey, JSON.stringify(updated));

  // Update index
  const indexKey = `tenants:${tenant}:player-images:index`;
  const images = ((await env.KV_IDEMP.get(indexKey, "json")) as PlayerImage[]) || [];
  const updatedIndex = images.map((img) => (img.id === imageId ? updated : img));
  await env.KV_IDEMP.put(indexKey, JSON.stringify(updatedIndex.slice(0, 1000)));

  return updated;
}

/**
 * Delete a player image
 */
export async function deletePlayerImage(
  env: any,
  tenant: string,
  imageId: string
): Promise<boolean> {
  const existing = await getPlayerImage(env, tenant, imageId);
  if (!existing) return false;

  // Delete from R2 if exists
  if (existing.r2Key) {
    try {
      await env.R2_MEDIA.delete(existing.r2Key);
    } catch (err) {
      console.error("Failed to delete R2 object", existing.r2Key, err);
    }
  }

  // Delete from KV
  const imageKey = `tenants:${tenant}:player-images:${imageId}`;
  await env.KV_IDEMP.delete(imageKey);

  // Update index
  const indexKey = `tenants:${tenant}:player-images:index`;
  const images = ((await env.KV_IDEMP.get(indexKey, "json")) as PlayerImage[]) || [];
  const updated = images.filter((img) => img.id !== imageId);
  await env.KV_IDEMP.put(indexKey, JSON.stringify(updated));

  return true;
}

/**
 * Generate upload URL for player image
 */
export async function getPlayerImageUploadUrl(
  env: any,
  tenant: string,
  playerId: string,
  type: "headshot" | "action",
  contentType: string = "image/jpeg"
): Promise<{ uploadUrl: string; r2Key: string; imageId: string }> {
  const imageId = `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const r2Key = `tenants/${tenant}/player-images/${playerId}/${type}/${imageId}.jpg`;

  // For R2, we'll use a presigned URL approach (simplified for now)
  // In production, you'd generate a proper presigned PUT URL
  return {
    uploadUrl: `/api/v1/admin/player-images/upload/${imageId}`,
    r2Key,
    imageId,
  };
}
