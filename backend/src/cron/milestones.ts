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
        // Get all active tenants
        const tenants = await getTenantsWithMilestones(env);

        for (const tenantConfig of tenants) {
            await checkTenantMilestones(env, tenantConfig);
        }

        logJSON({ level: 'info', msg: 'Milestones check completed', tenantCount: tenants.length });
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

    // Get players who participated in this match
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
async function checkTenantMilestones(env: Env, config: any) {
    const tenantId = config.team_id;

    // Get all players in squad
    const players = await env.DB.prepare(`
        SELECT id, name FROM squad WHERE tenant_id = ?
    `).bind(tenantId).all();

    for (const player of (players.results || []) as any[]) {
        await checkPlayerMilestones(env, tenantId, player.id);
    }
}

// Check a single player for milestones
async function checkPlayerMilestones(env: Env, tenantId: string, playerId: string) {
    // Get player details
    const player = await env.DB.prepare(`
        SELECT id, name, photo_url FROM squad WHERE id = ? AND tenant_id = ?
    `).bind(playerId, tenantId).first();

    if (!player) return;

    // Get current stats
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

    // Get appearances (distinct fixtures)
    const appearances = await env.DB.prepare(`
        SELECT COUNT(DISTINCT fixture_id) as count
        FROM match_events 
        WHERE tenant_id = ? AND player_id = ?
    `).bind(tenantId, playerId).first();

    const apps = (appearances as any)?.count || 0;

    // Check goal milestones
    for (const milestone of GOAL_MILESTONES) {
        if (goals >= milestone) {
            await maybeCreateMilestonePost(env, tenantId, player as any, 'goals', milestone, goals);
        }
    }

    // Check assist milestones
    for (const milestone of ASSIST_MILESTONES) {
        if (assists >= milestone) {
            await maybeCreateMilestonePost(env, tenantId, player as any, 'assists', milestone, assists);
        }
    }

    // Check appearance milestones
    for (const milestone of APPEARANCE_MILESTONES) {
        if (apps >= milestone) {
            await maybeCreateMilestonePost(env, tenantId, player as any, 'appearances', milestone, apps);
        }
    }
}

// Create milestone post if not already created
async function maybeCreateMilestonePost(
    env: Env,
    tenantId: string,
    player: { id: string; name: string; photo_url?: string },
    statType: 'goals' | 'assists' | 'appearances',
    milestone: number,
    currentValue: number
) {
    // Check if we've already celebrated this milestone
    const celebratedKey = `milestone:${tenantId}:${player.id}:${statType}:${milestone}`;
    const alreadyCelebrated = await env.KV.get(celebratedKey);

    if (alreadyCelebrated) {
        return; // Already posted this milestone
    }

    // Only celebrate if they JUST hit the milestone (not if they're way past it)
    // Allow some buffer - within 5 of the milestone
    if (currentValue > milestone + 5) {
        // They're past this milestone, mark as celebrated silently
        await env.KV.put(celebratedKey, 'true');
        return;
    }

    logJSON({ level: 'info', msg: 'Creating milestone post', player: player.name, statType, milestone });

    // Create the celebratory post
    const emojis: { [key: string]: string } = {
        goals: '⚽',
        assists: '🅰️',
        appearances: '🎽'
    };

    const messages: { [key: string]: string } = {
        goals: `${player.name} has scored their ${milestone}${getOrdinalSuffix(milestone)} goal for the club! ${emojis.goals}`,
        assists: `${player.name} has registered their ${milestone}${getOrdinalSuffix(milestone)} assist! ${emojis.assists}`,
        appearances: `${player.name} has made their ${milestone}${getOrdinalSuffix(milestone)} appearance for the club! ${emojis.appearances}`
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

    // Store in KV for Make.com to pick up
    await env.KV.put(
        `autopost:${tenantId}:${post.id}`,
        JSON.stringify(post),
        { expirationTtl: 60 * 60 * 24 * 7 } // 7 days
    );

    // Mark as celebrated
    await env.KV.put(celebratedKey, 'true');

    // Trigger webhook
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
}

// Get ordinal suffix (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}
