import { Channel, TenantConfig } from "../types";

/**
 * Simple rate-aware router to check if we should defer publishing
 * For now, implements basic counters per channel per tenant per day
 * Future: integrate with actual platform quota APIs
 */

const getCounterKey = (tenant: string, channel: Channel): string => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `rate:${tenant}:${channel}:${today}`;
};

// Default daily limits per channel (conservative estimates)
const DEFAULT_LIMITS: Record<Channel, number> = {
  yt: 50,       // YouTube: ~50 uploads/day for most channels
  fb: 200,      // Facebook: higher limits
  ig: 100,      // Instagram: varies by account
  tiktok: 50,   // TikTok: moderate limits
  x: 300,       // X (Twitter): high limits for posts
};

export async function shouldDefer(
  channel: Channel,
  tenant: TenantConfig,
  env: any
): Promise<boolean> {
  // For YouTube, check daily quota
  if (channel === "yt") {
    const key = getCounterKey(tenant.id, channel);
    const countStr = await env.KV_IDEMP.get(key);
    const count = countStr ? parseInt(countStr, 10) : 0;

    // Check against limit
    const limit = DEFAULT_LIMITS[channel];
    if (count >= limit) {
      return true; // Should defer - quota exhausted
    }
  }

  // For other channels, no deferral for now (always proceed)
  return false;
}

export async function incrementCounter(
  channel: Channel,
  tenant: TenantConfig,
  env: any
): Promise<void> {
  const key = getCounterKey(tenant.id, channel);
  const countStr = await env.KV_IDEMP.get(key);
  const count = countStr ? parseInt(countStr, 10) : 0;

  // Increment and store with 25-hour TTL (ensures it expires next day)
  await env.KV_IDEMP.put(key, String(count + 1), { expirationTtl: 90000 });
}
