import { logJSON } from '../lib/log';
import type { Env } from '../env';
import { nowUTC } from '../utils/time';

// Milestone thresholds for goals
const GOAL_MILESTONES = [5, 10, 25, 50, 75, 100, 150, 200];
// Milestone thresholds for assists
const ASSIST_MILESTONES = [5, 10, 25, 50, 75, 100];
// Milestone thresholds for appearances
const APPEARANCE_MILESTONES = [10, 25, 50, 75, 100, 150, 200, 300];

/**
 * Player Milestones cron job
 * Checks if any player has reached goal/assist/appearance milestones
 * Creates celebratory posts for achievements
 */
export const runMilestones = async (env: Env, ctx: ExecutionContext) => {
  const now = nowUTC();
  const today = now.toFormat('yyyy-MM-dd');

  logJSON({ level: 'info', msg: 'Running milestones check', date: today });

  try {
    const tenants = await getTenantsWithMilestones(env);

    let milestonesCreated = 0;
    for (const config of tenants) {
      const created = await checkTenantMilestones(env, config);
      milestonesCreated += created;
    }

    logJSON({ level: 'info', msg: 'Milestones check completed', tenantCount: tenants.length, milestonesCreated });
  } catch (error) {
    logJSON({ level: 'error', msg: 'Milestones error', error: error instanceof Error ? error.message : String(error) });
  }
};

/**
 * Check milestones after a match is completed
 * Called from match completion handler
 */
export async function checkMilestonesAfterMatch(env: Env, tenantId: string, fixtureId: string) {
  logJSON({ level: 'info', msg: 'Checking milestones after match', tenantId, fixtureId });

  const config: any = await env.KV.get(`team:${tenantId}:config`, 'json');
  if (!config?.features?.auto_milestones) {
    return;
  }

  const events = await env.DB.prepare(`
        SELECT DISTINCT player_id FROM match_events 
        WHERE tenant_id = ? AND fixture_id = ?
    `).bind(tenantId, fixtureId).all();

  const playerIds = (events.results || []).map((e: any) => e.player_id);

  for (const playerId of playerIds) {
    await checkPlayerMilestones(env, tenantId, playerId);
  }
}

// Get tenants with milestone feature enabled
async function getTenantsWithMilestones(env: Env): Promise<any[]> {
  const list = await env.KV.list({ prefix: 'team:' });
  const tenants = [];

  for (const key of list.keys) {
    if (key.name.endsWith(':config')) {
      const config: any = await env.KV.get(key.name, 'json');
      if (config?.features?.auto_milestones !== false) {
        tenants.push(config);
      }
    }
  }

  return tenants;
}

// Check all players for a tenant
async function checkTenantMilestones(env: Env, config: any): Promise<number> {
  const tenantId = config.team_id;
  let milestonesCreated = 0;

  const players = await env.DB.prepare(`
        SELECT id, name FROM squad WHERE tenant_id = ?
    `).bind(tenantId).all();

  for (const player of (players.results || []) as any[]) {
    const created = await checkPlayerMilestones(env, tenantId, player.id);
    if (created) milestonesCreated++;
  }

  return milestonesCreated;
}

// Check a single player for milestones
async function checkPlayerMilestones(env: Env, tenantId: string, playerId: string): Promise<boolean> {
  const player = await env.DB.prepare(`
        SELECT id, name, photo_url FROM squad WHERE id = ? AND tenant_id = ?
    `).bind(playerId, tenantId).first();

  if (!player) return false;

  const stats = await env.DB.prepare(`
        SELECT 
            event_type,
            COUNT(*) as count
        FROM match_events 
        WHERE tenant_id = ? AND player_id = ?
        GROUP BY event_type
    `).bind(tenantId, playerId).all();

  const statMap: { [key: string]: number } = {};
  for (const row of (stats.results || []) as any[]) {
    statMap[row.event_type] = row.count;
  }

  const goals = statMap['goal'] || 0;
  const assists = statMap['assist'] || 0;

  const appearances = await env.DB.prepare(`
        SELECT COUNT(DISTINCT fixture_id) as count
        FROM match_events 
        WHERE tenant_id = ? AND player_id = ?
    `).bind(tenantId, playerId).first();

  const apps = (appearances as any)?.count || 0;

  let created = false;

  for (const milestone of GOAL_MILESTONES) {
    if (goals >= milestone) {
      const result = await maybeCreateMilestonePost(env, tenantId, player as any, 'goals', milestone, goals);
      if (result) created = true;
    }
  }

  for (const milestone of ASSIST_MILESTONES) {
    if (assists >= milestone) {
      const result = await maybeCreateMilestonePost(env, tenantId, player as any, 'assists', milestone, assists);
      if (result) created = true;
    }
  }

  for (const milestone of APPEARANCE_MILESTONES) {
    if (apps >= milestone) {
      const result = await maybeCreateMilestonePost(env, tenantId, player as any, 'appearances', milestone, apps);
      if (result) created = true;
    }
  }

  return created;
}

// Create milestone post if not already created
async function maybeCreateMilestonePost(
  env: Env,
  tenantId: string,
  player: { id: string; name: string; photo_url?: string },
  statType: 'goals' | 'assists' | 'appearances',
  milestone: number,
  currentValue: number
): Promise<boolean> {
  const celebratedKey = `milestone:${tenantId}:${player.id}:${statType}:${milestone}`;
  const alreadyCelebrated = await env.KV.get(celebratedKey);

  if (alreadyCelebrated) {
    return false;
  }

  if (currentValue > milestone + 5) {
    await env.KV.put(celebratedKey, 'true');
    return false;
  }

  logJSON({ level: 'info', msg: 'Creating milestone post', player: player.name, statType, milestone });

  const emojis: { [key: string]: string } = {
    goals: '⚽',
    assists: '🎯',
    appearances: '🎽'
  };

  const messages: { [key: string]: string } = {
    goals: `${emojis.goals} ${player.name} has scored their ${milestone}${getOrdinalSuffix(milestone)} goal for the club! ${emojis.goals}`,
    assists: `${emojis.assists} ${player.name} has registered their ${milestone}${getOrdinalSuffix(milestone)} assist! ${emojis.assists}`,
    appearances: `${emojis.appearances} ${player.name} has made their ${milestone}${getOrdinalSuffix(milestone)} appearance for the club! ${emojis.appearances}`
  };

  const post = {
    id: crypto.randomUUID(),
    tenant: tenantId,
    type: 'milestone',
    player_id: player.id,
    player_name: player.name,
    player_photo: player.photo_url,
    stat_type: statType,
    milestone,
    current_value: currentValue,
    message: messages[statType],
    template: 'milestone',
    created_at: Date.now(),
    status: 'pending',
  };

  await env.KV.put(
    `autopost:${tenantId}:${post.id}`,
    JSON.stringify(post),
    { expirationTtl: 60 * 60 * 24 * 7 }
  );

  await env.KV.put(celebratedKey, 'true');

  const webhook = await env.KV.get(`team:${tenantId}:webhook`);
  if (webhook) {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        event: 'milestone',
        tenant: tenantId,
        post,
      }),
    });
  }

  logJSON({ level: 'info', msg: 'Milestone post created', player: player.name, milestone, statType });
  return true;
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
