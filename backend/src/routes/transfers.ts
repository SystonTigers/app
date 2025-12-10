import { ok, badRequest, notFound } from '../utils/response';
import type { Env } from '../env';

/**
 * Generate a random 8-character alphanumeric transfer code
 */
function generateTransferCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (0, O, 1, I)
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Get player's stats from their team
 */
async function getPlayerStats(env: Env, tenantId: string, playerId: string) {
    // Get all events for this player
    const events = await env.DB.prepare(`
        SELECT 
            me.event_type,
            me.minute,
            me.fixture_id,
            f.opponent,
            f.match_date,
            f.home_score,
            f.away_score
        FROM match_events me
        LEFT JOIN fixtures f ON me.fixture_id = f.id AND me.tenant_id = f.tenant_id
        WHERE me.tenant_id = ? AND me.player_id = ?
        ORDER BY me.created_at DESC
    `).bind(tenantId, playerId).all();

    const eventList = events.results || [];

    // Calculate aggregate stats
    let goals = 0;
    let assists = 0;
    let yellowCards = 0;
    let redCards = 0;
    let appearances = 0;
    const matchIds = new Set<string>();
    const matchDetails: any[] = [];

    for (const event of eventList as any[]) {
        if (event.fixture_id) {
            matchIds.add(event.fixture_id);
        }

        switch (event.event_type) {
            case 'goal':
                goals++;
                matchDetails.push({
                    type: 'goal',
                    minute: event.minute,
                    opponent: event.opponent,
                    date: event.match_date
                });
                break;
            case 'assist':
                assists++;
                matchDetails.push({
                    type: 'assist',
                    minute: event.minute,
                    opponent: event.opponent,
                    date: event.match_date
                });
                break;
            case 'yellow_card':
                yellowCards++;
                break;
            case 'red_card':
                redCards++;
                break;
        }
    }

    appearances = matchIds.size;

    return {
        goals,
        assists,
        yellowCards,
        redCards,
        appearances,
        matchDetails
    };
}

/**
 * POST /api/v1/squad/:playerId/generate-transfer
 * Generate a transfer code for a departing player
 */
export async function handleGenerateTransferCode(req: any, env: Env, corsHdrs: Headers, playerId: string) {
    const tenantId = req.tenant;

    // 1. Check player exists in squad
    const player = await env.DB.prepare(`
        SELECT id, name, global_profile_id FROM squad WHERE id = ? AND tenant_id = ?
    `).bind(playerId, tenantId).first();

    if (!player) {
        return notFound('Player not found in squad');
    }

    // 2. Get or create global profile
    let globalProfileId = (player as any).global_profile_id;

    if (!globalProfileId) {
        globalProfileId = crypto.randomUUID();

        // Create global profile
        await env.DB.prepare(`
            INSERT INTO player_global_profiles (id, created_at)
            VALUES (?, ?)
        `).bind(globalProfileId, Date.now()).run();

        // Link squad member to global profile
        await env.DB.prepare(`
            UPDATE squad SET global_profile_id = ? WHERE id = ?
        `).bind(globalProfileId, playerId).run();
    }

    // 3. Get player stats
    const stats = await getPlayerStats(env, tenantId, playerId);

    // 4. Generate unique transfer code
    let transferCode = generateTransferCode();
    let attempts = 0;

    while (attempts < 10) {
        const existing = await env.DB.prepare(`
            SELECT id FROM player_transfers WHERE transfer_code = ?
        `).bind(transferCode).first();

        if (!existing) break;
        transferCode = generateTransferCode();
        attempts++;
    }

    // 5. Create transfer record
    const transferId = crypto.randomUUID();
    const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days

    await env.DB.prepare(`
        INSERT INTO player_transfers (
            id, global_profile_id, from_tenant_id, from_player_id,
            transfer_code, stats_snapshot, player_name, created_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        transferId,
        globalProfileId,
        tenantId,
        playerId,
        transferCode,
        JSON.stringify(stats),
        (player as any).name,
        Date.now(),
        expiresAt
    ).run();

    return ok({
        transferCode,
        playerName: (player as any).name,
        stats: {
            goals: stats.goals,
            assists: stats.assists,
            appearances: stats.appearances,
            yellowCards: stats.yellowCards,
            redCards: stats.redCards
        },
        expiresAt: new Date(expiresAt).toISOString()
    });
}

/**
 * GET /api/v1/transfers/:code
 * Verify a transfer code and preview the player's stats
 */
export async function handleVerifyTransferCode(req: any, env: Env, corsHdrs: Headers, code: string) {
    const transfer = await env.DB.prepare(`
        SELECT 
            pt.*,
            t.name as from_club_name
        FROM player_transfers pt
        LEFT JOIN tenants t ON pt.from_tenant_id = t.id
        WHERE pt.transfer_code = ?
    `).bind(code.toUpperCase()).first();

    if (!transfer) {
        return notFound('Invalid transfer code');
    }

    const t = transfer as any;

    // Check if already redeemed
    if (t.redeemed_at) {
        return badRequest('This transfer code has already been used');
    }

    // Check if expired
    if (Date.now() > t.expires_at) {
        return badRequest('This transfer code has expired');
    }

    const stats = JSON.parse(t.stats_snapshot);

    return ok({
        valid: true,
        playerName: t.player_name,
        fromClub: t.from_club_name || 'Unknown Club',
        stats: {
            goals: stats.goals,
            assists: stats.assists,
            appearances: stats.appearances,
            yellowCards: stats.yellowCards,
            redCards: stats.redCards
        },
        expiresAt: new Date(t.expires_at).toISOString()
    });
}

/**
 * POST /api/v1/squad/claim-transfer
 * Link an incoming player to their historical stats
 */
export async function handleClaimTransfer(req: any, env: Env, corsHdrs: Headers) {
    const body = await req.json();
    const { transferCode, newPlayerId } = body;
    const tenantId = req.tenant;

    if (!transferCode || !newPlayerId) {
        return badRequest('Transfer code and new player ID are required');
    }

    // 1. Validate transfer code
    const transfer = await env.DB.prepare(`
        SELECT * FROM player_transfers WHERE transfer_code = ?
    `).bind(transferCode.toUpperCase()).first();

    if (!transfer) {
        return notFound('Invalid transfer code');
    }

    const t = transfer as any;

    if (t.redeemed_at) {
        return badRequest('This transfer code has already been used');
    }

    if (Date.now() > t.expires_at) {
        return badRequest('This transfer code has expired');
    }

    // 2. Verify new player exists
    const newPlayer = await env.DB.prepare(`
        SELECT id, name FROM squad WHERE id = ? AND tenant_id = ?
    `).bind(newPlayerId, tenantId).first();

    if (!newPlayer) {
        return notFound('New player not found in your squad');
    }

    // 3. Link new player to global profile
    await env.DB.prepare(`
        UPDATE squad SET global_profile_id = ? WHERE id = ?
    `).bind(t.global_profile_id, newPlayerId).run();

    // 4. Mark transfer as redeemed
    await env.DB.prepare(`
        UPDATE player_transfers 
        SET redeemed_at = ?, to_tenant_id = ?, to_player_id = ?
        WHERE id = ?
    `).bind(Date.now(), tenantId, newPlayerId, t.id).run();

    const stats = JSON.parse(t.stats_snapshot);

    return ok({
        success: true,
        message: `Successfully linked ${t.player_name}'s career history`,
        linkedStats: {
            goals: stats.goals,
            assists: stats.assists,
            appearances: stats.appearances
        }
    });
}

/**
 * GET /api/v1/squad/:playerId/career-stats
 * Get combined career stats across all clubs
 */
export async function handleGetCareerStats(req: any, env: Env, corsHdrs: Headers, playerId: string) {
    const tenantId = req.tenant;

    // 1. Get player and their global profile
    const player = await env.DB.prepare(`
        SELECT id, name, global_profile_id FROM squad WHERE id = ? AND tenant_id = ?
    `).bind(playerId, tenantId).first();

    if (!player) {
        return notFound('Player not found');
    }

    const p = player as any;
    const globalProfileId = p.global_profile_id;

    // 2. Get current club stats
    const currentStats = await getPlayerStats(env, tenantId, playerId);

    const careerHistory: any[] = [{
        club: tenantId, // Will be replaced with club name
        isCurrent: true,
        stats: {
            goals: currentStats.goals,
            assists: currentStats.assists,
            appearances: currentStats.appearances,
            yellowCards: currentStats.yellowCards,
            redCards: currentStats.redCards
        }
    }];

    // 3. Get historical stats from transfers
    if (globalProfileId) {
        const transfers = await env.DB.prepare(`
            SELECT 
                pt.from_tenant_id,
                pt.stats_snapshot,
                t.name as club_name
            FROM player_transfers pt
            LEFT JOIN tenants t ON pt.from_tenant_id = t.id
            WHERE pt.global_profile_id = ?
            ORDER BY pt.created_at DESC
        `).bind(globalProfileId).all();

        for (const transfer of (transfers.results || []) as any[]) {
            const stats = JSON.parse(transfer.stats_snapshot);
            careerHistory.push({
                club: transfer.club_name || transfer.from_tenant_id,
                isCurrent: false,
                stats: {
                    goals: stats.goals,
                    assists: stats.assists,
                    appearances: stats.appearances,
                    yellowCards: stats.yellowCards,
                    redCards: stats.redCards
                }
            });
        }
    }

    // 4. Calculate career totals
    const careerTotals = {
        goals: 0,
        assists: 0,
        appearances: 0,
        yellowCards: 0,
        redCards: 0,
        clubs: careerHistory.length
    };

    for (const club of careerHistory) {
        careerTotals.goals += club.stats.goals;
        careerTotals.assists += club.stats.assists;
        careerTotals.appearances += club.stats.appearances;
        careerTotals.yellowCards += club.stats.yellowCards;
        careerTotals.redCards += club.stats.redCards;
    }

    return ok({
        playerId,
        playerName: p.name,
        hasCareerHistory: careerHistory.length > 1,
        careerTotals,
        clubHistory: careerHistory
    });
}
