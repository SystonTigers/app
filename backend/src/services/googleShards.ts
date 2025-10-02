import { getTenantConfig } from "./tenants";

export interface Shard {
  client_id: string;
  client_secret: string;
}

// Simple hash function for tenant-to-shard mapping
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function safeParse<T>(json: string | undefined): T | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export async function pickShardForTenant(env: any, tenant: string): Promise<Shard> {
  // 1) BYO-Google? Check tenant config
  const cfg = await getTenantConfig(env, tenant);
  if (cfg?.creds?.yt?.client_id && cfg?.creds?.yt?.client_secret) {
    return {
      client_id: cfg.creds.yt.client_id,
      client_secret: cfg.creds.yt.client_secret,
    };
  }

  // 2) Shards list?
  const list = safeParse<Shard[]>(env.YT_SHARDS_JSON) ?? [];
  if (list.length > 0) {
    const h = simpleHash(tenant);
    const index = h % list.length;
    return list[index];
  }

  // 3) Default shard (from single env vars)
  if (env.YT_CLIENT_ID && env.YT_CLIENT_SECRET) {
    return {
      client_id: env.YT_CLIENT_ID,
      client_secret: env.YT_CLIENT_SECRET,
    };
  }

  // No shard available
  throw new Error("No YouTube OAuth configuration available (no BYO-Google, no shards, no default)");
}
