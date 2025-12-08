import { logJSON } from '../lib/log';
import type { Env } from '../env';
import { nowUTC } from '../utils/time';

/**
 * Throwback Thursday cron job - Runs Thursday at 19:00 UTC
 * Handles:
 * - Finding memorable moments from past seasons
 * - Creating nostalgia posts with old match highlights
 * - "On this day" posts
 */
export const runThrowback = async (env: Env, ctx: ExecutionContext) => {
  const now = nowUTC();
  const today = now.toFormat('yyyy-MM-dd');

  logJSON({ level: 'info', msg: 'Running Throwback Thursday cron job for today' });

  try {
    // Get all active tenants with throwback feature enabled
    const tenants = await getTenantsWithThrowbacks(env);

    for (const tenant of tenants) {
      await createThrowbackPost(env, tenant, now);
    }

    logJSON({ level: 'info', msg: 'Throwback posts created for tenants.length tenants' });
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

      // Support both old flag (auto_throwbacks) and new flag (auto_throwback_photos)
      if (config?.features?.auto_throwbacks || config?.features?.auto_throwback_photos) {
        tenants.push({
          ...config,
          // Determine which throwback types are enabled
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

  logJSON({ level: 'info', msg: 'Creating throwback post for tenant' });

  // Strategy 1: Find throwback photos (the REAL Throwback Thursday - old photos!)
  // Only if photo throwbacks are enabled
  if (config.throwback_photos_enabled !== false) {
    const throwbackPhoto = await findThrowbackPhoto(env, tenant, now);

    if (throwbackPhoto) {
      await createPhotoThrowbackPost(env, tenant, throwbackPhoto, config);
      return;
    }
  }

  // Strategy 2 & 3: Match-based throwbacks (On This Day / Memorable Moments)
  // Only if match throwbacks are enabled
  if (config.throwback_matches_enabled !== false) {
    // "On this day" match - exact date from previous years
    const onThisDayMatch = await findOnThisDayMatch(env, tenant, now);

    if (onThisDayMatch) {
      await createOnThisDayPost(env, tenant, onThisDayMatch);
      return;
    }

    // Random memorable moment from match history
    const memorableMatch = await findMemorableMatch(env, tenant);

    if (memorableMatch) {
      await createMemorablePost(env, tenant, memorableMatch);
      return;
    }
  }

  logJSON({ level: 'info', msg: 'No throwback content found for tenant' });
}

// Find match that happened on this day in previous years
async function findOnThisDayMatch(env: Env, tenant: string, now: any) {
  const monthDay = now.toFormat('MM-dd'); // e.g., "10-12"

  // Query D1 for matches on this date in past years
  const result = await env.DB.prepare(`
    SELECT * FROM matches
    WHERE team_id = ?
    AND status IN ('completed', 'final')
    AND strftime('%m-%d', datetime(date_utc, 'unixepoch')) = ?
    ORDER BY date_utc DESC
    LIMIT 1
  `).bind(tenant, monthDay).first();

  if (result) {
    // Get extended match data from KV
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
  // Get matches with big wins or important games
  const result = await env.DB.prepare(`
    SELECT * FROM matches
    WHERE team_id = ?
    AND status IN ('completed', 'final')
    AND date_utc < ?
    ORDER BY RANDOM()
    LIMIT 5
  `).bind(tenant, Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60)).all();

  if (result.results && result.results.length > 0) {
    // Score the matches by "memorability"
    const scoredMatches = await Promise.all(
      result.results.map(async (match: any) => {
        const matchData: any = await env.KV.get(
          `match:${tenant}:${match.id}`,
          'json'
        );

        if (!matchData) {return null;}

        let score = 0;

        // Big win
        if (matchData.home_score && matchData.away_score) {
          const margin = Math.abs(matchData.home_score - matchData.away_score);
          score += margin * 10;

          // High-scoring game
          score += (matchData.home_score + matchData.away_score) * 5;
        }

        // Important competition
        if (matchData.competition?.toLowerCase().includes('cup')) {
          score += 50;
        }
        if (matchData.competition?.toLowerCase().includes('final')) {
          score += 100;
        }

        return { match: matchData, score };
      })
    );

    // Pick highest scoring match
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
    { expirationTtl: 60 * 60 * 24 * 7 } // 7 days
  );

  // Trigger webhook
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

  logJSON({ level: 'info', msg: 'Created "On This Day" post for tenant: yearsAgo years ago' });
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
    { expirationTtl: 60 * 60 * 24 * 7 } // 7 days
  );

  // Trigger webhook
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

  logJSON({ level: 'info', msg: 'Created memorable moment post for tenant' });
}

// ============================================
// PHOTO-BASED THROWBACK THURSDAY
// ============================================

/**
 * Find a throwback photo from the gallery
 * Looks for:
 * 1. Photos from albums marked as 'throwback' type
 * 2. Photos from albums older than 1 year
 * 3. Randomly selects one to avoid repetition
 */
async function findThrowbackPhoto(env: Env, tenant: string, now: any) {
  const oneYearAgo = now.minus({ years: 1 }).toMillis();
  const twoYearsAgo = now.minus({ years: 2 }).toMillis();

  // First try: Look for photos explicitly tagged as throwback
  let photos = await env.DB.prepare(`
    SELECT p.*, a.name as album_name, a.album_date, a.type as album_type
    FROM photos p
    INNER JOIN photo_albums a ON p.album_id = a.id
    WHERE p.tenant_id = ?
    AND (
      a.type = 'throwback'
      OR a.album_date < ?
    )
    ORDER BY RANDOM()
    LIMIT 5
  `).bind(tenant, oneYearAgo).all();

  if (!photos.results || photos.results.length === 0) {
    // Second try: Any old photos (over 2 years for more meaningful throwback)
    photos = await env.DB.prepare(`
      SELECT p.*, a.name as album_name, a.album_date, a.type as album_type
      FROM photos p
      INNER JOIN photo_albums a ON p.album_id = a.id
      WHERE p.tenant_id = ?
      AND p.uploaded_at < ?
      ORDER BY RANDOM()
      LIMIT 5
    `).bind(tenant, twoYearsAgo).all();
  }

  if (photos.results && photos.results.length > 0) {
    // Get recently used photos to avoid repetition
    const recentlyUsed = await getRecentlyUsedPhotos(env, tenant);

    // Filter out recently used photos
    const availablePhotos = photos.results.filter(
      (p: any) => !recentlyUsed.includes(p.id)
    );

    // If all have been used, reset and use any
    const photoPool = availablePhotos.length > 0 ? availablePhotos : photos.results;

    // Pick random photo from pool
    const selectedPhoto = photoPool[Math.floor(Math.random() * photoPool.length)];

    // Calculate how old the photo is
    const photoDate = selectedPhoto.album_date || selectedPhoto.uploaded_at;
    const yearsAgo = Math.floor((Date.now() - photoDate) / (365 * 24 * 60 * 60 * 1000));

    return {
      ...selectedPhoto,
      years_ago: yearsAgo > 0 ? yearsAgo : 1,
    };
  }

  return null;
}

/**
 * Get list of recently used throwback photos (last 30 days)
 */
async function getRecentlyUsedPhotos(env: Env, tenant: string): Promise<string[]> {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

  // Look through recent throwback posts
  const posts = await env.KV.list({ prefix: `autopost:${tenant}:` });
  const usedPhotoIds: string[] = [];

  for (const key of posts.keys) {
    const post: any = await env.KV.get(key.name, 'json');
    if (post?.type === 'photo_throwback' && post?.photo?.id && post.created_at > thirtyDaysAgo) {
      usedPhotoIds.push(post.photo.id);
    }
  }

  return usedPhotoIds;
}

/**
 * Create a photo-based throwback post
 */
async function createPhotoThrowbackPost(env: Env, tenant: string, photo: any, config: any) {
  // Generate R2 URL for the photo
  let photoUrl = '';
  if (photo.photo_key && env.R2) {
    // Create a public URL or signed URL for the photo
    // For public buckets:
    photoUrl = `https://${config.r2_public_domain || 'media.systontigers.com'}/${photo.photo_key}`;
    // Note: If R2 bucket is not public, you'd need to generate a signed URL
  }

  const post = {
    id: crypto.randomUUID(),
    tenant,
    type: 'photo_throwback',
    photo: {
      id: photo.id,
      url: photoUrl,
      caption: photo.caption || '',
      album_name: photo.album_name || 'Team Photos',
      photo_key: photo.photo_key,
    },
    years_ago: photo.years_ago,
    template: 'throwback_photo',
    created_at: Date.now(),
    status: 'pending',
  };

  // Store the post
  await env.KV.put(
    `autopost:${tenant}:${post.id}`,
    JSON.stringify(post),
    { expirationTtl: 60 * 60 * 24 * 7 } // 7 days
  );

  // Trigger webhook for Make.com social posting
  const webhook = await env.KV.get(`team:${tenant}:webhook`);
  if (webhook) {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        event: 'throwback_photo',
        event_type: 'weekly_throwback',
        tenant,
        post,
        // Include photo details for Make.com template
        photo_url: photoUrl,
        caption: photo.caption || '',
        album_name: photo.album_name || 'Team Archive',
        years_ago: photo.years_ago,
        hashtags: ['#ThrowbackThursday', '#TBT', '#TeamMemories', '#GrassrootsFootball'],
      }),
    });
  }

  logJSON({
    level: 'info',
    msg: `Created photo throwback post for tenant - ${photo.years_ago} years ago`,
    photoId: photo.id,
    albumName: photo.album_name,
  });
}
