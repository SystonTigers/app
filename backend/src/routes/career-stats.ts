import { json } from "../services/util";
import { requireJWT } from "../services/auth";

export async function handleGetCareerStats(req: Request, env: any, corsHdrs: Headers, playerId: string) {
    try {
        const claims = await requireJWT(req, env);

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
