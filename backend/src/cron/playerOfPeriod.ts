import { logJSON } from '../lib/log';
import type { Env } from '../env';
import { nowUTC } from '../utils/time';

/**
 * Player of the Period (Week/Month) cron job
 * Runs on Sundays (weekly) and 1st of month (monthly)
 * Aggregates player performance and creates celebratory posts
 */
export const runPlayerOfPeriod = async (
    env: Env,
    ctx: ExecutionContext,
    options: { period: 'week' | 'month' }
) => {
    const now = nowUTC();
    const today = now.toFormat('yyyy-MM-dd');
    const period = options.period;

    logJSON({ level: 'info', msg: `Running Player of ${period} check`, date: today });

    try {
        const tenants = await getTenantsWithFeature(env, period);

        for (const tenantConfig of tenants) {
            await processPlayerOfPeriod(env, tenantConfig, period, now);
        }

        logJSON({ level: 'info', msg: `Player of ${period} completed`, tenantCount: tenants.length });
    } catch (error) {
        logJSON({ level: 'error', msg: `Player of ${period} error`, error: error instanceof Error ? error.message : String(error) });
    }
};

// Get tenants with feature enabled
async function getTenantsWithFeature(env: Env, period: 'week' | 'month'): Promise<any[]> {
    const list = await env.KV.list({ prefix: 'team:' });
    const tenants = [];

    const featureFlag = period === 'week' ? 'auto_player_of_week' : 'auto_player_of_month';

    for (const key of list.keys) {
        if (key.name.endsWith(':config')) {
            const config: any = await env.KV.get(key.name, 'json');
            if (config?.features?.[featureFlag] !== false) {
                tenants.push(config);
            }
        }
    }

    return tenants;
}

// Process player of period for a tenant
async function processPlayerOfPeriod(env: Env, config: any, period: 'week' | 'month', now: any) {
    const tenantId = config.team_id;

    // Get date range
    let startDate: number;
    if (period === 'week') {
        startDate = now.minus({ days: 7 }).toMillis();
    } else {
        startDate = now.minus({ months: 1 }).toMillis();
    }

    // Check if we already posted for this period
    const periodKey = period === 'week'
        ? now.toFormat('yyyy-WW') // Week number
        : now.toFormat('yyyy-MM'); // Month

    const alreadyPostedKey = `player_of_${period}:${tenantId}:${periodKey}`;
    const alreadyPosted = await env.KV.get(alreadyPostedKey);

    if (alreadyPosted) {
        logJSON({ level: 'info', msg: `Already posted Player of ${period} for ${periodKey}`, tenantId });
        return;
    }

    // Calculate player scores for the period
    const scores = await calculatePlayerScores(env, tenantId, startDate);

    if (scores.length === 0) {
        logJSON({ level: 'info', msg: `No player activity for ${period}`, tenantId });
        return;
    }

    // Top performer
    const winner = scores[0];

    // Create the post
    await createPlayerOfPeriodPost(env, tenantId, winner, period, periodKey, scores.slice(0, 5));

    // Mark as posted
    await env.KV.put(alreadyPostedKey, 'true', { expirationTtl: 60 * 60 * 24 * 35 }); // 35 days
}

// Calculate player scores based on performance
async function calculatePlayerScores(env: Env, tenantId: string, startDate: number) {
    // Get match events from the period
    const events = await env.DB.prepare(`
        SELECT me.player_id, me.event_type, COUNT(*) as count, s.name as player_name, s.photo_url
        FROM match_events me
        JOIN squad s ON me.player_id = s.id AND me.tenant_id = s.tenant_id
        WHERE me.tenant_id = ? AND me.created_at > ?
        GROUP BY me.player_id, me.event_type
    `).bind(tenantId, startDate).all();

    // Score calculation
    const playerScores: {
        [id: string]: {
            id: string;
            name: string;
            photo_url?: string;
            goals: number;
            assists: number;
            motm: number;
            score: number
        }
    } = {};

    for (const event of (events.results || []) as any[]) {
        if (!playerScores[event.player_id]) {
            playerScores[event.player_id] = {
                id: event.player_id,
                name: event.player_name,
                photo_url: event.photo_url,
                goals: 0,
                assists: 0,
                motm: 0,
                score: 0,
            };
        }

        const player = playerScores[event.player_id];

        switch (event.event_type) {
            case 'goal':
                player.goals += event.count;
                player.score += event.count * 5; // 5 points per goal
                break;
            case 'assist':
                player.assists += event.count;
                player.score += event.count * 3; // 3 points per assist
                break;
            case 'motm':
                player.motm += event.count;
                player.score += event.count * 10; // 10 points per MOTM
                break;
        }
    }

    // Sort by score descending
    return Object.values(playerScores).sort((a, b) => b.score - a.score);
}

// Create Player of Period post
async function createPlayerOfPeriodPost(
    env: Env,
    tenantId: string,
    winner: any,
    period: 'week' | 'month',
    periodKey: string,
    topFive: any[]
) {
    const periodText = period === 'week' ? 'Week' : 'Month';
    const emoji = period === 'week' ? '⭐' : '🏆';

    const statsLine = [
        winner.goals > 0 ? `${winner.goals} goals` : null,
        winner.assists > 0 ? `${winner.assists} assists` : null,
        winner.motm > 0 ? `${winner.motm} MOTM` : null,
    ].filter(Boolean).join(', ');

    const post = {
        id: crypto.randomUUID(),
        tenant: tenantId,
        type: `player_of_${period}`,
        player_id: winner.id,
        player_name: winner.name,
        player_photo: winner.photo_url,
        period: periodKey,
        stats: {
            goals: winner.goals,
            assists: winner.assists,
            motm: winner.motm,
            score: winner.score,
        },
        top_five: topFive.map(p => ({ name: p.name, score: p.score })),
        message: `${emoji} Player of the ${periodText}: ${winner.name}! ${statsLine ? `(${statsLine})` : ''}`,
        template: `player_of_${period}`,
        created_at: Date.now(),
        status: 'pending',
    };

    await env.KV.put(
        `autopost:${tenantId}:${post.id}`,
        JSON.stringify(post),
        { expirationTtl: 60 * 60 * 24 * 7 } // 7 days
    );

    // Trigger webhook
    const webhook = await env.KV.get(`team:${tenantId}:webhook`);
    if (webhook) {
        await fetch(webhook, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                event: `player_of_${period}`,
                tenant: tenantId,
                post,
            }),
        });
    }

    logJSON({ level: 'info', msg: `Created Player of ${period} post`, winner: winner.name, tenantId });
}
