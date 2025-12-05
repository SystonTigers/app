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

      if (config?.features?.auto_throwbacks) {
        tenants.push(config);
      }
    }
  }

  return tenants;
}

// Create throwback post for a tenant
async function createThrowbackPost(env: Env, config: any, now: any) {
  const tenant = config.team_id;

  logJSON({ level: 'info', msg: 'Creating throwback post for tenant' });

  // Strategy 1: "On this day" - exact date from previous years
  const onThisDayMatch = await findOnThisDayMatch(env, tenant, now);

  if (onThisDayMatch) {
    await createOnThisDayPost(env, tenant, onThisDayMatch);
    return;
  }

  // Strategy 2: Random memorable moment from history
  const memorableMatch = await findMemorableMatch(env, tenant);

  if (memorableMatch) {
    await createMemorablePost(env, tenant, memorableMatch);
    return;
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
