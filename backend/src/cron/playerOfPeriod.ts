import { logJSON } from '../lib/log';
import type { Env } from '../env';
import { nowUTC } from '../utils/time';

/**
 * Player of the Period (Week/Month) cron job
 * Runs on Sundays (weekly) and 1st of month (monthly)
 * Aggregates player performance and creates celebratory posts
 */
export const runPlayerOfPeriod = async (env: Env, ctx: ExecutionContext, options?: { period: 'week' | 'month' }) => {
  const now = nowUTC();
  const today = now.toFormat('yyyy-MM-dd');
  const period = options?.period || 'week';

  logJSON({ level: 'info', msg: `Running Player of ${period} check`, date: today });

  try {
    // Get all active tenants with this feature enabled
    const tenants = await getTenantsWithFeature(env, period);

    let postsCreated = 0;
    for (const config of tenants) {
      const created = await calculateAndPostPlayerOfPeriod(env, config, period);
      if (created) postsCreated++;
    }

    logJSON({
      level: 'info',
      msg: `Player of ${period} completed`,
      tenantsChecked: tenants.length,
      postsCreated,
    });
  } catch (error) {
    logJSON({
      level: 'error',
      msg: `Player of ${period} error`,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// Get tenants with Player of Week/Month feature enabled
async function getTenantsWithFeature(env: Env, period: 'week' | 'month'): Promise<any[]> {
  const list = await env.KV.list({ prefix: 'team:' });
  const tenants = [];

  const featureKey = period === 'week' ? 'auto_player_of_week' : 'auto_player_of_month';

  for (const key of list.keys) {
    if (key.name.endsWith(':config')) {
      const config: any = await env.KV.get(key.name, 'json');

      if (config?.features?.[featureKey]) {
        tenants.push(config);
      }
    }
  }

  return tenants;
}

// Calculate and post Player of Period
async function calculateAndPostPlayerOfPeriod(
  env: Env,
  config: any,
  period: 'week' | 'month'
): Promise<boolean> {
  const tenant = config.team_id;
  const now = Date.now();

  // Calculate date range
  let startDate: number;
  if (period === 'week') {
    // Last 7 days
    startDate = now - (7 * 24 * 60 * 60 * 1000);
  } else {
    // Last 30 days
    startDate = now - (30 * 24 * 60 * 60 * 1000);
  }

  const startTimestamp = Math.floor(startDate / 1000);

  // Check if we already posted this period
  const periodKey = period === 'week'
    ? `pop:${tenant}:week:${new Date().toISOString().substring(0, 10)}`
    : `pop:${tenant}:month:${new Date().toISOString().substring(0, 7)}`;

  const alreadyPosted = await env.KV.get(periodKey);
  if (alreadyPosted) {
    logJSON({ level: 'info', msg: `Player of ${period} already posted`, tenant });
    return false;
  }

  // Get player performance for the period from match_events
  const stats = await env.DB.prepare(`
    SELECT
      me.player_id,
      SUM(CASE WHEN me.event_type = 'goal' THEN 1 ELSE 0 END) as goals,
      SUM(CASE WHEN me.event_type = 'assist' THEN 1 ELSE 0 END) as assists,
      SUM(CASE WHEN me.event_type = 'motm' THEN 1 ELSE 0 END) as motm_awards,
      COUNT(DISTINCT me.fixture_id) as matches_played
    FROM match_events me
    INNER JOIN fixtures f ON me.fixture_id = f.id
    WHERE me.tenant_id = ?
    AND f.date >= datetime(?, 'unixepoch')
    GROUP BY me.player_id
    HAVING (goals > 0 OR assists > 0 OR motm_awards > 0)
  `).bind(tenant, startTimestamp).all();

  if (!stats.results || stats.results.length === 0) {
    logJSON({ level: 'info', msg: `No player stats for ${period}`, tenant });
    return false;
  }

  // Calculate performance score for each player
  // Goals = 5 points, Assists = 3 points, MOTM = 10 points, Matches = 1 point
  const scoredPlayers = await Promise.all(
    (stats.results as any[]).map(async (row) => {
      const score = (row.goals * 5) + (row.assists * 3) + (row.motm_awards * 10) + (row.matches_played * 1);

      // Get player details
      const player = await getPlayerDetails(env, tenant, row.player_id);

      return {
        player_id: row.player_id,
        player_name: player?.name || 'Unknown Player',
        player_photo: player?.photo_url,
        position: player?.position,
        goals: row.goals,
        assists: row.assists,
        motm_awards: row.motm_awards,
        matches_played: row.matches_played,
        score,
      };
    })
  );

  // Sort by score and get top player
  scoredPlayers.sort((a, b) => b.score - a.score);
  const winner = scoredPlayers[0];

  if (!winner || winner.score === 0) {
    return false;
  }

  // Create celebratory post
  await createPlayerOfPeriodPost(env, tenant, winner, period, config);

  // Mark as posted
  const ttl = period === 'week' ? 60 * 60 * 24 * 7 : 60 * 60 * 24 * 35;
  await env.KV.put(periodKey, JSON.stringify({
    player_id: winner.player_id,
    posted_at: Date.now(),
  }), { expirationTtl: ttl });

  return true;
}

// Get player details
async function getPlayerDetails(env: Env, tenant: string, playerId: string): Promise<any | null> {
  // Try D1 first
  const dbPlayer = await env.DB.prepare(`
    SELECT id, name, photo_url, position
    FROM squad_players
    WHERE id = ? AND tenant_id = ?
  `).bind(playerId, tenant).first();

  if (dbPlayer) return dbPlayer;

  // Fallback to KV
  const squad: any = await env.KV.get(`squad:${tenant}`, 'json');
  if (squad && Array.isArray(squad)) {
    return squad.find((p: any) => p.id === playerId) || null;
  }

  return null;
}

// Create Player of Period post
async function createPlayerOfPeriodPost(
  env: Env,
  tenant: string,
  winner: any,
  period: 'week' | 'month',
  config: any
) {
  const periodLabel = period === 'week' ? 'Week' : 'Month';
  const emoji = period === 'week' ? '🌟' : '🏆';

  // Build stats summary
  const statsParts = [];
  if (winner.goals > 0) statsParts.push(`${winner.goals} goal${winner.goals > 1 ? 's' : ''}`);
  if (winner.assists > 0) statsParts.push(`${winner.assists} assist${winner.assists > 1 ? 's' : ''}`);
  if (winner.motm_awards > 0) statsParts.push(`${winner.motm_awards} MOTM award${winner.motm_awards > 1 ? 's' : ''}`);

  const statsStr = statsParts.length > 0
    ? ` with ${statsParts.join(', ')}`
    : '';

  const message = `${emoji} Player of the ${periodLabel}: ${winner.player_name}! ${emoji}\n\nCongratulations to ${winner.player_name} for an outstanding ${period}${statsStr}! 👏`;

  const post = {
    id: crypto.randomUUID(),
    tenant,
    type: `player_of_${period}`,
    period,
    winner: {
      player_id: winner.player_id,
      player_name: winner.player_name,
      photo_url: winner.player_photo,
      position: winner.position,
      goals: winner.goals,
      assists: winner.assists,
      motm_awards: winner.motm_awards,
      matches_played: winner.matches_played,
      score: winner.score,
    },
    message,
    template: `player_of_${period}`,
    created_at: Date.now(),
    status: 'pending',
  };

  // Store the post
  await env.KV.put(
    `autopost:${tenant}:${post.id}`,
    JSON.stringify(post),
    { expirationTtl: 60 * 60 * 24 * 14 } // 14 days
  );

  // Trigger webhook for Make.com
  const webhook = await env.KV.get(`team:${tenant}:webhook`);
  if (webhook) {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        event: `player_of_${period}`,
        event_type: `player_of_${period}`,
        tenant,
        post,
        player_name: winner.player_name,
        player_photo: winner.player_photo,
        period: periodLabel,
        goals: winner.goals,
        assists: winner.assists,
        motm_awards: winner.motm_awards,
        message,
        hashtags: [`#PlayerOfThe${periodLabel}`, '#GrassrootsFootball', '#TeamMVP', '#Recognition'],
      }),
    });
  }

  logJSON({
    level: 'info',
    msg: `Created Player of ${periodLabel} post: ${winner.player_name}`,
    tenant,
    playerId: winner.player_id,
    score: winner.score,
  });
}

/**
 * Get leaderboard for current period
 * Can be called from API to show rankings before official announcement
 */
export async function getPlayerOfPeriodLeaderboard(
  env: Env,
  tenant: string,
  period: 'week' | 'month'
): Promise<any[]> {
  const now = Date.now();
  const startDate = period === 'week'
    ? now - (7 * 24 * 60 * 60 * 1000)
    : now - (30 * 24 * 60 * 60 * 1000);

  const startTimestamp = Math.floor(startDate / 1000);

  const stats = await env.DB.prepare(`
    SELECT
      me.player_id,
      SUM(CASE WHEN me.event_type = 'goal' THEN 1 ELSE 0 END) as goals,
      SUM(CASE WHEN me.event_type = 'assist' THEN 1 ELSE 0 END) as assists,
      SUM(CASE WHEN me.event_type = 'motm' THEN 1 ELSE 0 END) as motm_awards,
      COUNT(DISTINCT me.fixture_id) as matches_played
    FROM match_events me
    INNER JOIN fixtures f ON me.fixture_id = f.id
    WHERE me.tenant_id = ?
    AND f.date >= datetime(?, 'unixepoch')
    GROUP BY me.player_id
  `).bind(tenant, startTimestamp).all();

  if (!stats.results) return [];

  const scoredPlayers = await Promise.all(
    (stats.results as any[]).map(async (row) => {
      const score = (row.goals * 5) + (row.assists * 3) + (row.motm_awards * 10) + (row.matches_played * 1);
      const player = await getPlayerDetails(env, tenant, row.player_id);

      return {
        rank: 0,
        player_id: row.player_id,
        player_name: player?.name || 'Unknown',
        photo_url: player?.photo_url,
        position: player?.position,
        goals: row.goals,
        assists: row.assists,
        motm_awards: row.motm_awards,
        matches_played: row.matches_played,
        score,
      };
    })
  );

  // Sort and add ranks
  scoredPlayers.sort((a, b) => b.score - a.score);
  scoredPlayers.forEach((p, i) => { p.rank = i + 1; });

  return scoredPlayers;
}

/**
 * Get past Player of Period winners
 */
export async function getPastWinners(
  env: Env,
  tenant: string,
  period: 'week' | 'month',
  limit = 10
): Promise<any[]> {
  const prefix = `pop:${tenant}:${period}:`;
  const list = await env.KV.list({ prefix, limit });

  const winners = [];
  for (const key of list.keys) {
    const data: any = await env.KV.get(key.name, 'json');
    if (data) {
      const player = await getPlayerDetails(env, tenant, data.player_id);
      winners.push({
        period_key: key.name.replace(prefix, ''),
        player_id: data.player_id,
        player_name: player?.name || 'Unknown',
        photo_url: player?.photo_url,
        posted_at: data.posted_at,
      });
    }
  }

  return winners;
}
