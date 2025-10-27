import type { Env } from '../env';

/**
 * Cleanup cron job - Runs every 5 minutes
 * Handles:
 * - Expiring old live match updates (>100 minutes)
 * - Cleaning up temporary data
 * - Removing expired cache entries
 */
export const runCleanup = async (env: Env, ctx: ExecutionContext) => {
  console.log('Running cleanup cron job');

  try {
    await cleanupLiveUpdates(env);
    await cleanupExpiredData(env);
    await cleanupOldRenders(env);

    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error('Cleanup cron error:', error);
  }
};

// Cleanup old live match updates
async function cleanupLiveUpdates(env: Env) {
  const list = await env.KV.list({ prefix: 'live:' });
  const now = Date.now();
  const maxAge = 100 * 60 * 1000; // 100 minutes
  let cleaned = 0;

  for (const key of list.keys) {
    const data: any = await env.KV.get(key.name, 'json');

    if (data && data.ts && now - data.ts > maxAge) {
      await env.KV.delete(key.name);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} expired live updates`);
  }
}

// Cleanup expired data entries
async function cleanupExpiredData(env: Env) {
  const now = Date.now();
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
  let cleaned = 0;

  // Cleanup old autoposts
  const autoposts = await env.KV.list({ prefix: 'autopost:' });

  for (const key of autoposts.keys) {
    const data: any = await env.KV.get(key.name, 'json');

    if (data && data.created_at && now - data.created_at > maxAge) {
      if (data.status === 'completed' || data.status === 'failed') {
        await env.KV.delete(key.name);
        cleaned++;
      }
    }
  }

  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} old autoposts`);
  }
}

// Cleanup old render requests
async function cleanupOldRenders(env: Env) {
  const list = await env.KV.list({ prefix: 'render:' });
  const now = Date.now();
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  let cleaned = 0;

  for (const key of list.keys) {
    const data: any = await env.KV.get(key.name, 'json');

    if (data && data.requested_at && now - data.requested_at > maxAge) {
      await env.KV.delete(key.name);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} old render requests`);
  }
}

// Cleanup old match events (optional - if storing in D1)
async function cleanupOldEvents(env: Env) {
  // Calculate cutoff date (e.g., 1 year ago)
  const cutoffTs = Math.floor((Date.now() - 365 * 24 * 60 * 60 * 1000) / 1000);

  try {
    // Delete events older than cutoff
    const result = await env.DB.prepare(`
      DELETE FROM events
      WHERE ts < ?
    `).bind(cutoffTs).run();

    if (result.meta.changes > 0) {
      console.log(`Cleaned up ${result.meta.changes} old events from D1`);
    }
  } catch (error) {
    console.error('Failed to cleanup old events:', error);
  }
}

// Cleanup orphaned data (optional - advanced)
async function cleanupOrphanedData(env: Env) {
  // Find and remove data for deleted tenants
  // This is a more complex operation that would need careful implementation
  // to avoid accidentally deleting active tenant data

  // Example: Check if tenant config still exists before removing related data
  const list = await env.KV.list({ prefix: 'match:' });

  for (const key of list.keys) {
    const parts = key.name.split(':');
    if (parts.length >= 2) {
      const tenant = parts[1];

      // Check if tenant config exists
      const config = await env.KV.get(`team:${tenant}:config`);

      if (!config) {
        // Tenant deleted - remove orphaned data
        await env.KV.delete(key.name);
        console.log(`Cleaned up orphaned data: ${key.name}`);
      }
    }
  }
}

// Monitor KV storage usage (optional)
async function monitorStorage(env: Env) {
  // This would track storage metrics
  // KV doesn't provide built-in usage stats, so this would need custom tracking

  const prefixes = ['team:', 'match:', 'event:', 'autopost:', 'render:'];
  const counts: Record<string, number> = {};

  for (const prefix of prefixes) {
    const list = await env.KV.list({ prefix });
    counts[prefix] = list.keys.length;
  }

  console.log('KV Storage metrics:', counts);

  // Store metrics for monitoring
  await env.KV.put(
    'metrics:storage:latest',
    JSON.stringify({
      timestamp: Date.now(),
      counts,
    }),
    { expirationTtl: 60 * 60 * 24 * 7 } // 7 days
  );
}
