import { json } from "../services/util";
import { requireJWT } from "../services/auth";

/**
 * Career Stats Service
 * Aggregates player statistics across all seasons
 */

interface SeasonStats {
    seasonId: string;
    seasonName: string;
    appearances: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    cleanSheets: number;
    motmCount: number;
}

interface CareerTotals {
    appearances: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    cleanSheets: number;
    motmCount: number;
    seasonsPlayed: number;
}

interface PlayerAward {
    seasonId: string;
    seasonName: string;
    awardType: string;
    awardName?: string;
}

// Get career stats for a player across all seasons

export async function handleGetCareerStats(req: Request, env: any, corsHdrs: Headers, playerId: string) {
    try {
        const claims = await requireJWT(req, env);

        // Get player info
        const player = await env.DB.prepare(
            "SELECT id, name, photo_url, position, previous_club, signed_date FROM squad WHERE id = ? AND tenant_id = ?"
        ).bind(playerId, claims.tenantId).first();

        if (!player) {
            return json({ success: false, error: "Player not found" }, 404, corsHdrs);
        }

        // Get all seasons for context
        const seasons = await env.DB.prepare(
            "SELECT id, name, status FROM seasons WHERE tenant_id = ? ORDER BY start_date DESC"
        ).bind(claims.tenantId).all();

        const seasonMap = new Map<string, string>();
        for (const s of (seasons.results || []) as any[]) {
            seasonMap.set(s.id, s.name);
        }

        // Get stats per season from match_events
        const statsPerSeason = await env.DB.prepare(
            `SELECT
                f.season_id,
                COUNT(DISTINCT me.fixture_id) as appearances,
                SUM(CASE WHEN me.event_type = 'goal' THEN 1 ELSE 0 END) as goals,
                SUM(CASE WHEN me.event_type = 'assist' THEN 1 ELSE 0 END) as assists,
                SUM(CASE WHEN me.event_type = 'yellow_card' THEN 1 ELSE 0 END) as yellow_cards,
                SUM(CASE WHEN me.event_type = 'red_card' THEN 1 ELSE 0 END) as red_cards,
                SUM(CASE WHEN me.event_type = 'motm' THEN 1 ELSE 0 END) as motm_count
             FROM match_events me
             JOIN fixtures f ON me.fixture_id = f.id
             WHERE me.player_id = ? AND f.tenant_id = ?
             GROUP BY f.season_id`
        ).bind(playerId, claims.tenantId).all();

        // Transform into season stats array
        const seasonStats: SeasonStats[] = [];
        const totals: CareerTotals = {
            appearances: 0,
            goals: 0,
            assists: 0,
            yellowCards: 0,
            redCards: 0,
            cleanSheets: 0, // Would need goalkeeper-specific tracking
            motmCount: 0,
            seasonsPlayed: 0
        };

        for (const stat of (statsPerSeason.results || []) as any[]) {
            const seasonName = seasonMap.get(stat.season_id) || 'Unknown Season';

            seasonStats.push({
                seasonId: stat.season_id,
                seasonName,
                appearances: stat.appearances || 0,
                goals: stat.goals || 0,
                assists: stat.assists || 0,
                yellowCards: stat.yellow_cards || 0,
                redCards: stat.red_cards || 0,
                cleanSheets: 0, // Would need separate tracking
                motmCount: stat.motm_count || 0
            });

            // Accumulate totals
            totals.appearances += stat.appearances || 0;
            totals.goals += stat.goals || 0;
            totals.assists += stat.assists || 0;
            totals.yellowCards += stat.yellow_cards || 0;
            totals.redCards += stat.red_cards || 0;
            totals.motmCount += stat.motm_count || 0;
            totals.seasonsPlayed++;
        }

        // Get awards for this player
        const awards = await env.DB.prepare(
            `SELECT sa.season_id, s.name as season_name, sa.award_type, sa.award_name
             FROM season_awards sa
             LEFT JOIN seasons s ON sa.season_id = s.id
             WHERE sa.player_id = ? AND sa.tenant_id = ?
             ORDER BY s.start_date DESC`
        ).bind(playerId, claims.tenantId).all();

        const playerAwards: PlayerAward[] = (awards.results || []).map((a: any) => ({
            seasonId: a.season_id,
            seasonName: a.season_name || 'Unknown',
            awardType: a.award_type,
            awardName: a.award_name
        }));

        // Calculate averages
        const averages = totals.appearances > 0 ? {
            goalsPerGame: (totals.goals / totals.appearances).toFixed(2),
            assistsPerGame: (totals.assists / totals.appearances).toFixed(2),
            goalsPerSeason: totals.seasonsPlayed > 0 ? (totals.goals / totals.seasonsPlayed).toFixed(1) : '0'
        } : {
            goalsPerGame: '0',
            assistsPerGame: '0',
            goalsPerSeason: '0'
        };

        return json({
            success: true,
            data: {
                player: {
                    id: player.id,
                    name: player.name,
                    photoUrl: player.photo_url,
                    position: player.position,
                    previousClub: player.previous_club,
                    signedDate: player.signed_date
                },
                totals,
                averages,
                seasons: seasonStats,
                awards: playerAwards
            }
        }, 200, corsHdrs);
    } catch (err) {
        console.error('Get career stats error:', err);
        return json({ success: false, error: "Failed to get career stats" }, 500, corsHdrs);
    }
}

// Get career comparison between multiple players
export async function handleCompareCareerStats(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const url = new URL(req.url);
        const playerIdsParam = url.searchParams.get('playerIds');

        if (!playerIdsParam) {
            return json({ success: false, error: "playerIds parameter required" }, 400, corsHdrs);
        }

        const playerIds = playerIdsParam.split(',');

        if (playerIds.length > 5) {
            return json({ success: false, error: "Maximum 5 players can be compared" }, 400, corsHdrs);
        }

        const comparisons = [];

        for (const playerId of playerIds) {
            // Get player info
            const player = await env.DB.prepare(
                "SELECT id, name, photo_url, position FROM squad WHERE id = ? AND tenant_id = ?"
            ).bind(playerId, claims.tenantId).first();

            if (!player) continue;

            // Get career totals
            const stats = await env.DB.prepare(
                `SELECT
                    COUNT(DISTINCT me.fixture_id) as appearances,
                    SUM(CASE WHEN me.event_type = 'goal' THEN 1 ELSE 0 END) as goals,
                    SUM(CASE WHEN me.event_type = 'assist' THEN 1 ELSE 0 END) as assists,
                    SUM(CASE WHEN me.event_type = 'yellow_card' THEN 1 ELSE 0 END) as yellow_cards,
                    SUM(CASE WHEN me.event_type = 'red_card' THEN 1 ELSE 0 END) as red_cards,
                    SUM(CASE WHEN me.event_type = 'motm' THEN 1 ELSE 0 END) as motm_count
                 FROM match_events me
                 JOIN fixtures f ON me.fixture_id = f.id
                 WHERE me.player_id = ? AND f.tenant_id = ?`
            ).bind(playerId, claims.tenantId).first();

            comparisons.push({
                player: {
                    id: player.id,
                    name: player.name,
                    photoUrl: player.photo_url,
                    position: player.position
                },
                stats: {
                    appearances: stats?.appearances || 0,
                    goals: stats?.goals || 0,
                    assists: stats?.assists || 0,
                    yellowCards: stats?.yellow_cards || 0,
                    redCards: stats?.red_cards || 0,
                    motmCount: stats?.motm_count || 0,
                    contributions: (stats?.goals || 0) + (stats?.assists || 0)
                }
            });
        }

        return json({ success: true, data: comparisons }, 200, corsHdrs);
    } catch (err) {
        console.error('Compare career stats error:', err);
        return json({ success: false, error: "Failed to compare stats" }, 500, corsHdrs);
    }
}

// Get all-time records (most goals in a season, etc.)
export async function handleGetAllTimeRecords(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        // Most goals in a single season
        const mostGoalsSeason = await env.DB.prepare(
            `SELECT
                me.player_id, s.name as player_name, se.name as season_name,
                COUNT(*) as goals
             FROM match_events me
             JOIN fixtures f ON me.fixture_id = f.id
             JOIN squad s ON me.player_id = s.id
             JOIN seasons se ON f.season_id = se.id
             WHERE f.tenant_id = ? AND me.event_type = 'goal'
             GROUP BY me.player_id, f.season_id
             ORDER BY goals DESC
             LIMIT 1`
        ).bind(claims.tenantId).first();

        // Most assists in a single season
        const mostAssistsSeason = await env.DB.prepare(
            `SELECT
                me.player_id, s.name as player_name, se.name as season_name,
                COUNT(*) as assists
             FROM match_events me
             JOIN fixtures f ON me.fixture_id = f.id
             JOIN squad s ON me.player_id = s.id
             JOIN seasons se ON f.season_id = se.id
             WHERE f.tenant_id = ? AND me.event_type = 'assist'
             GROUP BY me.player_id, f.season_id
             ORDER BY assists DESC
             LIMIT 1`
        ).bind(claims.tenantId).first();

        // Most career goals
        const mostCareerGoals = await env.DB.prepare(
            `SELECT
                me.player_id, s.name as player_name,
                COUNT(*) as goals
             FROM match_events me
             JOIN fixtures f ON me.fixture_id = f.id
             JOIN squad s ON me.player_id = s.id
             WHERE f.tenant_id = ? AND me.event_type = 'goal'
             GROUP BY me.player_id
             ORDER BY goals DESC
             LIMIT 1`
        ).bind(claims.tenantId).first();

        // Most career appearances
        const mostCareerApps = await env.DB.prepare(
            `SELECT
                me.player_id, s.name as player_name,
                COUNT(DISTINCT me.fixture_id) as appearances
             FROM match_events me
             JOIN fixtures f ON me.fixture_id = f.id
             JOIN squad s ON me.player_id = s.id
             WHERE f.tenant_id = ?
             GROUP BY me.player_id
             ORDER BY appearances DESC
             LIMIT 1`
        ).bind(claims.tenantId).first();

        // Most MOTM awards
        const mostMotm = await env.DB.prepare(
            `SELECT
                me.player_id, s.name as player_name,
                COUNT(*) as count
             FROM match_events me
             JOIN fixtures f ON me.fixture_id = f.id
             JOIN squad s ON me.player_id = s.id
             WHERE f.tenant_id = ? AND me.event_type = 'motm'
             GROUP BY me.player_id
             ORDER BY count DESC
             LIMIT 1`
        ).bind(claims.tenantId).first();

        const records = {
            mostGoalsInSeason: mostGoalsSeason ? {
                playerName: mostGoalsSeason.player_name,
                playerId: mostGoalsSeason.player_id,
                seasonName: mostGoalsSeason.season_name,
                value: mostGoalsSeason.goals
            } : null,
            mostAssistsInSeason: mostAssistsSeason ? {
                playerName: mostAssistsSeason.player_name,
                playerId: mostAssistsSeason.player_id,
                seasonName: mostAssistsSeason.season_name,
                value: mostAssistsSeason.assists
            } : null,
            mostCareerGoals: mostCareerGoals ? {
                playerName: mostCareerGoals.player_name,
                playerId: mostCareerGoals.player_id,
                value: mostCareerGoals.goals
            } : null,
            mostCareerAppearances: mostCareerApps ? {
                playerName: mostCareerApps.player_name,
                playerId: mostCareerApps.player_id,
                value: mostCareerApps.appearances
            } : null,
            mostMotmAwards: mostMotm ? {
                playerName: mostMotm.player_name,
                playerId: mostMotm.player_id,
                value: mostMotm.count
            } : null
        };

        return json({ success: true, data: records }, 200, corsHdrs);
    } catch (err) {
        console.error('Get all-time records error:', err);
        return json({ success: false, error: "Failed to get records" }, 500, corsHdrs);
=======
        // 1. Get Player Profile
        const player = await env.DB.prepare("SELECT * FROM squad WHERE id = ? AND tenant_id = ?").bind(playerId, claims.tenantId).first();
        if (!player) return json({ success: false, error: "Player not found" }, 404, corsHdrs);

        // 2. Get All-Time Aggregates from Events
        // Group by season to build history
        const events = await env.DB.prepare(`
            SELECT e.type, m.season_id, s.name as season_name
            FROM events e
            JOIN matches m ON e.match_id = m.id
            LEFT JOIN seasons s ON m.season_id = s.id
            WHERE e.player_id = ? AND m.team_id = ?
            ORDER BY m.date_utc DESC
        `).bind(playerId, claims.tenantId).all();

        const historyMap = new Map<string, any>();
        const total = { appearances: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, motm: 0 };

        // Matches played calculation (distinct match_ids)
        // We need to fetch match IDs separately or group by match_id in SQL
        // Easier to fetch all event rows and process in memory for now (assuming <10k events per player)

        // Refetch with match_id
        const eventsWithMatch = await env.DB.prepare(`
            SELECT e.type, m.id as match_id, m.season_id, s.name as season_name
            FROM events e
            JOIN matches m ON e.match_id = m.id
            LEFT JOIN seasons s ON m.season_id = s.id
            WHERE e.player_id = ? AND m.team_id = ?
        `).bind(playerId, claims.tenantId).all();

        const seasonMatches = new Map<string, Set<string>>(); // seasonId -> Set<matchId>
        const allMatches = new Set<string>();

        const results = eventsWithMatch.results || [];

        for (const ev of results as any[]) {
            const seasonId = ev.season_id || 'unknown';
            const seasonName = ev.season_name || 'Unknown Season';

            if (!historyMap.has(seasonId)) {
                historyMap.set(seasonId, {
                    seasonId,
                    seasonName,
                    stats: { appearances: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, motm: 0 }
                });
                seasonMatches.set(seasonId, new Set());
            }

            const seasonEntry = historyMap.get(seasonId);
            seasonMatches.get(seasonId)?.add(ev.match_id);
            allMatches.add(ev.match_id);

            // Count Stats
            if (ev.type === 'goal') {
                seasonEntry.stats.goals++;
                total.goals++;
            }
            if (ev.type === 'assist') {
                seasonEntry.stats.assists++;
                total.assists++;
            }
            if (ev.type === 'card_yellow') {
                seasonEntry.stats.yellowCards++;
                total.yellowCards++;
            }
            if (ev.type === 'card_red') {
                seasonEntry.stats.redCards++;
                total.redCards++;
            }
            if (ev.type === 'motm') {
                seasonEntry.stats.motm++;
                total.motm++;
            }
        }

        // Set appearances
        historyMap.forEach((val, key) => {
            val.stats.appearances = seasonMatches.get(key)?.size || 0;
        });
        total.appearances = allMatches.size;

        const history = Array.from(historyMap.values());

        return json({
            success: true,
            player,
            total,
            history
        }, 200, corsHdrs);

    } catch (err: any) {
        console.error('Career Stats Error:', err);
        return json({ success: false, error: err.message }, 500, corsHdrs);
    }
}
