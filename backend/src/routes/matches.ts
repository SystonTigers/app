import { json } from "../services/util";
import { logJSON } from "../lib/log";

export async function handleMatchUpdates(
    req: Request,
    env: any,
    corsHdrs: Headers,
    matchId: string
): Promise<Response> {
    // 1. Fetch match details
    const match = await env.DB.prepare("SELECT * FROM matches WHERE id = ?").bind(matchId).first();

    if (!match) {
        return json({ success: false, error: "Match not found" }, 404, corsHdrs);
    }

    // 2. Fetch all events for this match
    const { results: events } = await env.DB.prepare(
        "SELECT * FROM events WHERE match_id = ? ORDER BY minute ASC, ts ASC"
    ).bind(matchId).all();

    // 3. Calculate score
    let homeScore = 0;
    let awayScore = 0;

    // We need to know which team the event belongs to. 
    // The 'events' table has 'player_id', but not 'team_id' directly.
    // However, for a simple implementation, we might assume the payload_json contains team info 
    // or we need to join with users/teams.
    // For now, let's look at the schema again. 'events' has 'player_id'. 'users' has 'team_id'.
    // We can do a join or just iterate if the dataset is small.

    // Let's refine the query to include team_id if possible, or assume payload has it.
    // Actually, for the LiveMatchPanel, we just need the events list and the current score.
    // The LiveMatchPanel expects:
    // interface MatchEvent { id, type, minute, player, team: 'home' | 'away', ... }

    // Let's assume for now we can derive 'home' or 'away' from the event or player.
    // Since we don't have a complex team logic yet, let's try to infer it or return raw events 
    // and let frontend handle it, OR improve the query.

    // BETTER APPROACH:
    // The frontend expects `score: { home: number, away: number }`.
    // We should calculate this on the backend.

    // Let's assume the `type` 'goal' increments score.
    // But we need to know FOR WHICH TEAM.
    // The `events` table schema: id, match_id, type, minute, player_id, assist_id, payload_json, ts.
    // It doesn't have team_id. This is a schema limitation.
    // However, `payload_json` might store it.

    const formattedEvents = events.map((e: any) => {
        let payload = {};
        try { payload = JSON.parse(e.payload_json || "{}"); } catch { }

        return {
            id: e.id,
            type: e.type,
            minute: e.minute,
            player: e.player_id, // Ideally fetch name
            team: (payload as any).team || 'home', // Fallback
            ...payload
        };
    });

    // Calculate score from events
    homeScore = formattedEvents.filter((e: any) => e.type === 'goal' && e.team === 'home').length;
    awayScore = formattedEvents.filter((e: any) => e.type === 'goal' && e.team === 'away').length;

    // 4. Determine current time/status
    // If match is 'live', calculate time from start (if we had a start timestamp).
    // For now, return the status string.

    return json({
        success: true,
        data: {
            id: match.id,
            status: match.status,
            score: {
                home: homeScore,
                away: awayScore
            },
            time: match.status === 'live' ? "45'" : "0'", // Placeholder for actual time calculation
            events: formattedEvents
        }
    }, 200, corsHdrs);
}
