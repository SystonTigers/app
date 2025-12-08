import { logJSON } from '../lib/log';
import type { Env } from '../env';
import { nowUTC } from '../utils/time';

// Milestone thresholds for goals
const GOAL_MILESTONES = [5, 10, 25, 50, 75, 100, 150, 200];

// Milestone thresholds for assists
const ASSIST_MILESTONES = [5, 10, 25, 50];

// Milestone thresholds for appearances
const APPEARANCE_MILESTONES = [10, 25, 50, 75, 100, 150, 200];

/**
 * Player Milestones cron job - Runs after matches complete
 * Checks if any player has reached goal/assist/appearance milestones
 * Creates celebratory posts for the achievement
 */
export const runMilestones = async (env: Env, ctx: ExecutionContext) => {
  const now = nowUTC();
  const today = now.toFormat('yyyy-MM-dd');

  logJSON({ level: 'info', msg: 'Running player milestones check', date: today });

  try {
    // Get all active tenants with milestones feature enabled
    const tenants = await getTenantsWithMilestones(env);

    let milestonesCreated = 0;
    for (const config of tenants) {
      const created = await checkPlayerMilestones(env, config);
      milestonesCreated += created;
    }

    logJSON({
      level: 'info',
      msg: 'Player milestones check completed',
      tenantsChecked: tenants.length,
      milestonesCreated,
    });
  } catch (error) {
    logJSON({
      level: 'error',
      msg: 'Player milestones check error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// Get tenants with milestones feature enabled
async function getTenantsWithMilestones(env: Env): Promise<any[]> {
  const list = await env.KV.list({ prefix: 'team:' });
  const tenants = [];

  for (const key of list.keys) {
    if (key.name.endsWith(':config')) {
      const config: any = await env.KV.get(key.name, 'json');

      // Check for auto_milestones feature flag
      if (config?.features?.auto_milestones) {
        tenants.push(config);
      }
    }
  }

  return tenants;
}

// Check all players for milestone achievements
async function checkPlayerMilestones(env: Env, config: any): Promise<number> {
  const tenant = config.team_id;
  let milestonesCreated = 0;

  // Get all player goal counts from match_events
  const goalCounts = await env.DB.prepare(`
    SELECT
      me.player_id,
      COUNT(*) as total_goals
    FROM match_events me
    WHERE me.tenant_id = ? AND me.event_type = 'goal'
    GROUP BY me.player_id
  `).bind(tenant).all();

  // Get all player assist counts
  const assistCounts = await env.DB.prepare(`
    SELECT
      me.player_id,
      COUNT(*) as total_assists
    FROM match_events me
    WHERE me.tenant_id = ? AND me.event_type = 'assist'
    GROUP BY me.player_id
  `).bind(tenant).all();

  // Get all player appearance counts
  const appearanceCounts = await env.DB.prepare(`
    SELECT
      me.player_id,
      COUNT(DISTINCT me.fixture_id) as total_appearances
    FROM match_events me
    WHERE me.tenant_id = ?
    GROUP BY me.player_id
  `).bind(tenant).all();

  // Process goal milestones
  for (const row of (goalCounts.results || []) as any[]) {
    const created = await checkMilestone(
      env,
      tenant,
      row.player_id,
      row.total_goals,
      'goal',
      GOAL_MILESTONES,
      config
    );
    if (created) milestonesCreated++;
  }

  // Process assist milestones
  for (const row of (assistCounts.results || []) as any[]) {
    const created = await checkMilestone(
      env,
      tenant,
      row.player_id,
      row.total_assists,
      'assist',
      ASSIST_MILESTONES,
      config
    );
    if (created) milestonesCreated++;
  }

  // Process appearance milestones
  for (const row of (appearanceCounts.results || []) as any[]) {
    const created = await checkMilestone(
      env,
      tenant,
      row.player_id,
      row.total_appearances,
      'appearance',
      APPEARANCE_MILESTONES,
      config
    );
    if (created) milestonesCreated++;
  }

  return milestonesCreated;
}

// Check if a player has hit a milestone that hasn't been celebrated yet
async function checkMilestone(
  env: Env,
  tenant: string,
  playerId: string,
  currentCount: number,
  statType: 'goal' | 'assist' | 'appearance',
  milestones: number[],
  config: any
): Promise<boolean> {
  // Find the highest milestone reached
  const reachedMilestone = milestones
    .filter((m) => currentCount >= m)
    .sort((a, b) => b - a)[0];

  if (!reachedMilestone) {
    return false; // No milestone reached
  }

  // Check if we've already celebrated this milestone
  const milestoneKey = `milestone:${tenant}:${playerId}:${statType}`;
  const lastCelebrated = await env.KV.get(milestoneKey);

  if (lastCelebrated && parseInt(lastCelebrated) >= reachedMilestone) {
    return false; // Already celebrated this milestone
  }

  // Get player details
  const player = await getPlayerDetails(env, tenant, playerId);
  if (!player) {
    logJSON({
      level: 'warn',
      msg: 'Player not found for milestone',
      tenant,
      playerId,
    });
    return false;
  }

  // Create celebratory post
  await createMilestonePost(env, tenant, player, statType, reachedMilestone, currentCount, config);

  // Mark milestone as celebrated
  await env.KV.put(milestoneKey, reachedMilestone.toString(), {
    expirationTtl: 60 * 60 * 24 * 365 * 5, // 5 years
  });

  return true;
}

// Get player details from D1 or KV
async function getPlayerDetails(env: Env, tenant: string, playerId: string): Promise<any | null> {
  // Try D1 first (squad_players table)
  const dbPlayer = await env.DB.prepare(`
    SELECT id, name, photo_url, position
    FROM squad_players
    WHERE id = ? AND tenant_id = ?
  `).bind(playerId, tenant).first();

  if (dbPlayer) {
    return dbPlayer;
  }

  // Fallback to KV squad data
  const squad: any = await env.KV.get(`squad:${tenant}`, 'json');
  if (squad && Array.isArray(squad)) {
    const player = squad.find((p: any) => p.id === playerId);
    if (player) {
      return player;
    }
  }

  return null;
}

// Create milestone celebration post
async function createMilestonePost(
  env: Env,
  tenant: string,
  player: any,
  statType: 'goal' | 'assist' | 'appearance',
  milestone: number,
  currentCount: number,
  config: any
) {
  // Generate appropriate message based on stat type
  let message: string;
  let emoji: string;
  let hashtags: string[];

  switch (statType) {
    case 'goal':
      emoji = '⚽';
      if (milestone >= 100) {
        message = `${emoji} CENTURY! ${player.name} has scored their ${milestone}th goal for the team! What an incredible achievement! ${emoji}`;
      } else if (milestone >= 50) {
        message = `${emoji} HALF CENTURY! ${player.name} reaches ${milestone} goals! Amazing milestone! ${emoji}`;
      } else {
        message = `${emoji} Congratulations to ${player.name} on reaching ${milestone} goals! Keep them coming! ${emoji}`;
      }
      hashtags = ['#Goals', '#Milestone', '#GrassrootsFootball', '#TopScorer'];
      break;

    case 'assist':
      emoji = '🎯';
      message = `${emoji} ${player.name} has reached ${milestone} assists! What a playmaker! ${emoji}`;
      hashtags = ['#Assists', '#Playmaker', '#TeamPlayer', '#GrassrootsFootball'];
      break;

    case 'appearance':
      emoji = '🏃';
      if (milestone >= 100) {
        message = `${emoji} 100 APPEARANCES! ${player.name} has made their ${milestone}th appearance for the team! A true club legend! ${emoji}`;
      } else if (milestone >= 50) {
        message = `${emoji} ${player.name} makes their ${milestone}th appearance! Dedication at its finest! ${emoji}`;
      } else {
        message = `${emoji} Congratulations to ${player.name} on ${milestone} appearances! Here's to many more! ${emoji}`;
      }
      hashtags = ['#Appearances', '#Dedication', '#ClubLoyalty', '#GrassrootsFootball'];
      break;
  }

  const post = {
    id: crypto.randomUUID(),
    tenant,
    type: 'milestone',
    stat_type: statType,
    milestone,
    current_count: currentCount,
    player: {
      id: player.id,
      name: player.name,
      photo_url: player.photo_url,
      position: player.position,
    },
    message,
    template: 'milestone',
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
        event: 'milestone',
        event_type: 'player_milestone',
        tenant,
        post,
        player_name: player.name,
        player_photo: player.photo_url,
        stat_type: statType,
        milestone,
        current_count: currentCount,
        message,
        hashtags,
      }),
    });
  }

  logJSON({
    level: 'info',
    msg: `Created milestone post: ${player.name} reached ${milestone} ${statType}s`,
    tenant,
    playerId: player.id,
    statType,
    milestone,
  });
}

/**
 * Trigger milestone check after a match is completed
 * Call this from match update handlers
 */
export const checkMilestonesAfterMatch = async (
  env: Env,
  tenant: string,
  fixtureId: string
) => {
  logJSON({
    level: 'info',
    msg: 'Checking milestones after match completion',
    tenant,
    fixtureId,
  });

  // Get tenant config
  const config: any = await env.KV.get(`team:${tenant}:config`, 'json');

  if (!config?.features?.auto_milestones) {
    return; // Feature not enabled
  }

  // Get players who participated in this match
  const participants = await env.DB.prepare(`
    SELECT DISTINCT player_id
    FROM match_events
    WHERE tenant_id = ? AND fixture_id = ?
  `).bind(tenant, fixtureId).all();

  // Check each participant for milestones
  for (const row of (participants.results || []) as any[]) {
    // Get their current stats
    const stats = await env.DB.prepare(`
      SELECT
        SUM(CASE WHEN event_type = 'goal' THEN 1 ELSE 0 END) as goals,
        SUM(CASE WHEN event_type = 'assist' THEN 1 ELSE 0 END) as assists,
        COUNT(DISTINCT fixture_id) as appearances
      FROM match_events
      WHERE tenant_id = ? AND player_id = ?
    `).bind(tenant, row.player_id).first();

    if (!stats) continue;

    // Check each stat type
    await checkMilestone(
      env,
      tenant,
      row.player_id,
      (stats as any).goals || 0,
      'goal',
      GOAL_MILESTONES,
      config
    );

    await checkMilestone(
      env,
      tenant,
      row.player_id,
      (stats as any).assists || 0,
      'assist',
      ASSIST_MILESTONES,
      config
    );

    await checkMilestone(
      env,
      tenant,
      row.player_id,
      (stats as any).appearances || 0,
      'appearance',
      APPEARANCE_MILESTONES,
      config
    );
  }
};
