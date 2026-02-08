import { logJSON } from '../lib/log';
import type { Env } from '../env';
import { nowUTC } from '../utils/time';

/**
 * "On This Day" cron job - Runs daily at 09:00 UTC
 * Posts match anniversaries: "On this day X years ago..."
 *
 * Separate from Throwback Thursday (which is photo-based)
 * This focuses on match milestones and anniversaries
 */
export const runOnThisDay = async (env: Env, ctx: ExecutionContext) => {
  const now = nowUTC();
  const today = now.toFormat('yyyy-MM-dd');

  logJSON({ level: 'info', msg: 'Running "On This Day" cron job', date: today });

  try {
    // Get all active tenants with On This Day feature enabled
    const tenants = await getTenantsWithOnThisDay(env);

    let postsCreated = 0;
    for (const tenant of tenants) {
      const created = await checkOnThisDay(env, tenant, now);
      if (created) {postsCreated++;}
    }

    logJSON({
      level: 'info',
      msg: '"On This Day" cron completed',
      tenantsChecked: tenants.length,
      postsCreated,
    });
  } catch (error) {
    logJSON({
      level: 'error',
      msg: '"On This Day" cron error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// Get tenants with "On This Day" feature enabled
async function getTenantsWithOnThisDay(env: Env): Promise<any[]> {
  const list = await env.KV.list({ prefix: 'team:' });
  const tenants = [];

  for (const key of list.keys) {
    if (key.name.endsWith(':config')) {
      const config: any = await env.KV.get(key.name, 'json');

      // Check for auto_on_this_day feature flag
      if (config?.features?.auto_on_this_day) {
        tenants.push(config);
      }
    }
  }

  return tenants;
}

// Check if there's an "On This Day" match for this tenant
async function checkOnThisDay(env: Env, config: any, now: any): Promise<boolean> {
  const tenant = config.team_id;
  const monthDay = now.toFormat('MM-dd'); // e.g., "10-12"

  // Find matches from this date in previous years (at least 1 year ago)
  const oneYearAgo = Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60);

  const results = await env.DB.prepare(`
    SELECT * FROM matches
    WHERE team_id = ?
    AND status IN ('completed', 'final')
    AND strftime('%m-%d', datetime(date_utc, 'unixepoch')) = ?
    AND date_utc < ?
    ORDER BY date_utc DESC
    LIMIT 5
  `).bind(tenant, monthDay, oneYearAgo).all();

  if (!results.results || results.results.length === 0) {
    return false;
  }

  // Check if we already posted for any of these matches today
  const todayKey = now.toFormat('yyyy-MM-dd');
  const alreadyPosted = await env.KV.get(`onthisday:${tenant}:${todayKey}`);
  if (alreadyPosted) {
    logJSON({ level: 'info', msg: '"On This Day" already posted today for tenant', tenant });
    return false;
  }

  // Score matches by significance
  const scoredMatches = await Promise.all(
    results.results.map(async (match: any) => {
      // Get extended match data from KV
      const matchData: any = await env.KV.get(`match:${tenant}:${match.id}`, 'json');
      const data = matchData || match;

      let score = 0;
      const yearsAgo = Math.floor((Date.now() / 1000 - match.date_utc) / (365 * 24 * 60 * 60));

      // Milestone years are more significant (1, 5, 10, 15, 20, etc.)
      if (yearsAgo === 1) {score += 20;}
      if (yearsAgo % 5 === 0) {score += 50;}
      if (yearsAgo % 10 === 0) {score += 100;}

      // Big wins
      if (data.home_score !== undefined && data.away_score !== undefined) {
        const ourScore = data.is_home ? data.home_score : data.away_score;
        const theirScore = data.is_home ? data.away_score : data.home_score;
        const margin = ourScore - theirScore;

        if (margin > 0) {score += margin * 10;} // Wins
        if (margin >= 4) {score += 30;} // Thrashing bonus
      }

      // Important competitions
      if (data.competition?.toLowerCase().includes('cup')) {score += 30;}
      if (data.competition?.toLowerCase().includes('final')) {score += 80;}
      if (data.competition?.toLowerCase().includes('semi')) {score += 40;}
      if (data.competition?.toLowerCase().includes('quarter')) {score += 20;}

      return { match: data, score, yearsAgo };
    })
  );

  // Pick the best match
  const validMatches = scoredMatches.filter((m) => m.score > 0);
  if (validMatches.length === 0) {
    // Even without scoring, post the most recent one
    if (scoredMatches.length > 0) {
      await createOnThisDayPost(env, tenant, scoredMatches[0].match, scoredMatches[0].yearsAgo, config);
      await env.KV.put(`onthisday:${tenant}:${todayKey}`, 'posted', { expirationTtl: 60 * 60 * 24 });
      return true;
    }
    return false;
  }

  validMatches.sort((a, b) => b.score - a.score);
  const best = validMatches[0];

  await createOnThisDayPost(env, tenant, best.match, best.yearsAgo, config);
  await env.KV.put(`onthisday:${tenant}:${todayKey}`, 'posted', { expirationTtl: 60 * 60 * 24 });

  return true;
}

// Create "On This Day" post
async function createOnThisDayPost(env: Env, tenant: string, match: any, yearsAgo: number, config: any) {
  // Determine result string
  let resultStr = '';
  if (match.home_score !== undefined && match.away_score !== undefined) {
    const ourScore = match.is_home ? match.home_score : match.away_score;
    const theirScore = match.is_home ? match.away_score : match.home_score;

    if (ourScore > theirScore) {
      resultStr = `beat ${match.opponent} ${ourScore}-${theirScore}`;
    } else if (ourScore < theirScore) {
      resultStr = `lost ${ourScore}-${theirScore} to ${match.opponent}`;
    } else {
      resultStr = `drew ${ourScore}-${theirScore} with ${match.opponent}`;
    }
  } else {
    resultStr = `played ${match.opponent}`;
  }

  // Generate message
  const yearText = yearsAgo === 1 ? '1 year' : `${yearsAgo} years`;
  const message = `On this day ${yearText} ago, we ${resultStr}! ${match.competition ? `(${match.competition})` : ''}`;

  const post = {
    id: crypto.randomUUID(),
    tenant,
    type: 'on_this_day',
    match: {
      id: match.id,
      opponent: match.opponent,
      home_score: match.home_score,
      away_score: match.away_score,
      is_home: match.is_home,
      competition: match.competition,
      date: match.date_utc,
    },
    years_ago: yearsAgo,
    message,
    template: 'on_this_day',
    created_at: Date.now(),
    status: 'pending',
  };

  // Store the post
  await env.KV.put(
    `autopost:${tenant}:${post.id}`,
    JSON.stringify(post),
    { expirationTtl: 60 * 60 * 24 * 7 } // 7 days
  );

  // Trigger webhook for Make.com
  const webhook = await env.KV.get(`team:${tenant}:webhook`);
  if (webhook) {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        event: 'on_this_day',
        event_type: 'on_this_day',
        tenant,
        post,
        message,
        years_ago: yearsAgo,
        opponent: match.opponent,
        result: resultStr,
        competition: match.competition || '',
        hashtags: ['#OnThisDay', '#Memories', '#GrassrootsFootball'],
      }),
    });
  }

  logJSON({
    level: 'info',
    msg: `Created "On This Day" post: ${yearText} ago vs ${match.opponent}`,
    tenant,
    matchId: match.id,
  });
}
