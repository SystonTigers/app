import { logJSON } from '../lib/log';
import type { Env } from '../env';
import { nowUTC } from '../utils/time';

/**
 * Throwback Thursday cron job - Runs Thursday at 19:00 UTC
 * Handles:
 * - Finding memorable moments from past seasons
 * - Creating nostalgia posts with old match highlights
 * - "On this day" posts
 * - Photo-based throwbacks
 */
export const runThrowback = async (env: Env, ctx: ExecutionContext) => {
  const now = nowUTC();
  const today = now.toFormat('yyyy-MM-dd');

  logJSON({ level: 'info', msg: 'Running Throwback Thursday cron job for today' });

  try {
    const tenants = await getTenantsWithThrowbacks(env);

    for (const tenant of tenants) {
      await createThrowbackPost(env, tenant, now);
    }

    logJSON({ level: 'info', msg: 'Throwback posts created', tenantCount: tenants.length });
  } catch (error) {
    logJSON({ level: 'error', msg: 'Throwback cron error', error: error instanceof Error ? error.message : String(error) });
  }
};

// Get tenants with throwback feature enabled
async function getTenantsWithThrowbacks(env: Env): Promise<any[]> {
  const list = await env.KV.list({ prefix: 'team:' });
  const tenants = [];

  for (const key of list.keys) {
    if (key.name.endsWith(':config')) {
      const config: any = await env.KV.get(key.name, 'json');

      if (config?.features?.auto_throwbacks || config?.features?.auto_throwback_photos) {
        tenants.push({
          ...config,
          throwback_photos_enabled: config?.features?.auto_throwback_photos !== false,
          throwback_matches_enabled: config?.features?.auto_throwbacks !== false,
        });
      }
    }
  }

  return tenants;
}

// Create throwback post for a tenant
async function createThrowbackPost(env: Env, config: any, now: any) {
  const tenant = config.team_id;

  logJSON({ level: 'info', msg: 'Creating throwback post for tenant', tenant });

  // Strategy 1: Photo-based throwback
  if (config.throwback_photos_enabled !== false) {
    const throwbackPhoto = await findThrowbackPhoto(env, tenant, now);
    if (throwbackPhoto) {
      await createPhotoThrowbackPost(env, tenant, throwbackPhoto);
      return;
    }
  }

  // Strategy 2: "On this day" - exact date from previous years
  if (config.throwback_matches_enabled !== false) {
    const onThisDayMatch = await findOnThisDayMatch(env, tenant, now);
    if (onThisDayMatch) {
      await createOnThisDayPost(env, tenant, onThisDayMatch);
      return;
    }

    // Strategy 3: Random memorable moment from history
    const memorableMatch = await findMemorableMatch(env, tenant);
    if (memorableMatch) {
      await createMemorablePost(env, tenant, memorableMatch);
      return;
    }
  }

  logJSON({ level: 'info', msg: 'No throwback content found for tenant', tenant });
}

// Find old photos for throwback
async function findThrowbackPhoto(env: Env, tenant: string, now: any) {
  const oneYearAgo = now.minus({ years: 1 }).toMillis();

  const result = await env.DB.prepare(`
        SELECT g.*, a.name as album_name, a.date as album_date
        FROM gallery_photos g
        LEFT JOIN gallery_albums a ON g.album_id = a.id
        WHERE g.tenant_id = ?
        AND (a.date < ? OR g.created_at < ?)
        ORDER BY RANDOM()
        LIMIT 10
    `).bind(tenant, oneYearAgo, oneYearAgo).all();

  if (!result.results || result.results.length === 0) {
    return null;
  }

  const recentlyUsedKey = `throwback:${tenant}:recent_photos`;
  const recentlyUsedStr = await env.KV.get(recentlyUsedKey);
  const recentlyUsed = recentlyUsedStr ? JSON.parse(recentlyUsedStr) : [];

  for (const photo of result.results as any[]) {
    if (!recentlyUsed.includes(photo.id)) {
      recentlyUsed.push(photo.id);
      while (recentlyUsed.length > 20) {
        recentlyUsed.shift();
      }
      await env.KV.put(recentlyUsedKey, JSON.stringify(recentlyUsed), { expirationTtl: 60 * 60 * 24 * 30 });
      return photo;
    }
  }

  return result.results[0];
}

// Create photo-based throwback post
async function createPhotoThrowbackPost(env: Env, tenant: string, photo: any) {
  const post = {
    id: crypto.randomUUID(),
    tenant,
    type: 'throwback_photo',
    photo_id: photo.id,
    photo_url: photo.url,
    album_name: photo.album_name,
    caption: photo.caption || `Throwback to ${photo.album_name || 'the archives'} 📸`,
    template: 'throwback_photo',
    created_at: Date.now(),
    status: 'pending',
  };

  await env.KV.put(
    `autopost:${tenant}:${post.id}`,
    JSON.stringify(post),
    { expirationTtl: 60 * 60 * 24 * 7 }
  );

  const webhook = await env.KV.get(`team:${tenant}:webhook`);
  if (webhook) {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        event: 'throwback',
        tenant,
        post,
      }),
    });
  }

  logJSON({ level: 'info', msg: 'Created photo throwback post for tenant', tenant });
}

// Find match that happened on this day in previous years
async function findOnThisDayMatch(env: Env, tenant: string, now: any) {
  const monthDay = now.toFormat('MM-dd');

  const result = await env.DB.prepare(`
        SELECT * FROM matches
        WHERE team_id = ?
        AND status IN ('completed', 'final')
        AND strftime('%m-%d', datetime(date_utc, 'unixepoch')) = ?
        ORDER BY date_utc DESC
        LIMIT 1
    `).bind(tenant, monthDay).first();

  if (result) {
    const matchData = await env.KV.get(
      `match:${tenant}:${result.id}`,
      'json'
    );
    return matchData || result;
  }

  return null;
}

// Find a memorable match from history
async function findMemorableMatch(env: Env, tenant: string) {
  const result = await env.DB.prepare(`
        SELECT * FROM matches
        WHERE team_id = ?
        AND status IN ('completed', 'final')
        AND date_utc < ?
        ORDER BY RANDOM()
        LIMIT 5
    `).bind(tenant, Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60)).all();

  if (result.results && result.results.length > 0) {
    const scoredMatches = await Promise.all(
      result.results.map(async (match: any) => {
        const matchData: any = await env.KV.get(
          `match:${tenant}:${match.id}`,
          'json'
        );

        if (!matchData) return null;

        let score = 0;

        if (matchData.home_score && matchData.away_score) {
          const margin = Math.abs(matchData.home_score - matchData.away_score);
          score += margin * 10;
          score += (matchData.home_score + matchData.away_score) * 5;
        }

        if (matchData.competition?.toLowerCase().includes('cup')) {
          score += 50;
        }
        if (matchData.competition?.toLowerCase().includes('final')) {
          score += 100;
        }

        return { match: matchData, score };
      })
    );

    const validMatches = scoredMatches.filter((m) => m !== null);
    if (validMatches.length > 0) {
      validMatches.sort((a, b) => b!.score - a!.score);
      return validMatches[0]!.match;
    }
  }

  return null;
}

// Create "on this day" post
async function createOnThisDayPost(env: Env, tenant: string, match: any) {
  const yearsAgo = Math.floor(
    (Date.now() / 1000 - match.date_utc) / (365 * 24 * 60 * 60)
  );

  const post = {
    id: crypto.randomUUID(),
    tenant,
    type: 'on_this_day',
    match,
    years_ago: yearsAgo,
    template: 'throwback',
    created_at: Date.now(),
    status: 'pending',
  };

  await env.KV.put(
    `autopost:${tenant}:${post.id}`,
    JSON.stringify(post),
    { expirationTtl: 60 * 60 * 24 * 7 }
  );

  const webhook = await env.KV.get(`team:${tenant}:webhook`);
  if (webhook) {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        event: 'throwback',
        tenant,
        post,
      }),
    });
  }

  logJSON({ level: 'info', msg: `Created "On This Day" post: ${yearsAgo} years ago`, tenant });
}

// Create memorable moment post
async function createMemorablePost(env: Env, tenant: string, match: any) {
  const post = {
    id: crypto.randomUUID(),
    tenant,
    type: 'memorable_moment',
    match,
    template: 'throwback',
    created_at: Date.now(),
    status: 'pending',
  };

  await env.KV.put(
    `autopost:${tenant}:${post.id}`,
    JSON.stringify(post),
    { expirationTtl: 60 * 60 * 24 * 7 }
  );

  const webhook = await env.KV.get(`team:${tenant}:webhook`);
  if (webhook) {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        event: 'throwback',
        tenant,
        post,
      }),
    });
  }

  logJSON({ level: 'info', msg: 'Created memorable moment post for tenant', tenant });
}
