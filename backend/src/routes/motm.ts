import { json } from "../services/util";
import { requireJWT } from "../services/auth";

export async function handleInitVote(req: Request, env: any, corsHdrs: Headers, matchId: string) {
    try {
        const claims = await requireJWT(req, env);

        // Get match details and squad
        const match = await env.DB.prepare(
            `SELECT * FROM team_results WHERE id = ? AND tenant_id = ?`
        ).bind(matchId, claims.tenantId).first();

        if (!match) {
            return json({ success: false, error: "Match not found" }, 404, corsHdrs);
        }

        // Get current vote count
        const votes = await env.DB.prepare(
            `SELECT player_id, COUNT(*) as votes
             FROM motm_votes
             WHERE match_id = ?
             GROUP BY player_id`
        ).bind(matchId).all();

        // Check if user has voted
        const userVote = await env.DB.prepare(
            `SELECT player_id FROM motm_votes WHERE match_id = ? AND user_id = ?`
        ).bind(matchId, claims.userId).first();

        return json({
            success: true,
            data: {
                match,
                votes: votes.results,
                userVote: userVote?.player_id || null,
            }
        }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) throw err;
        return json({ success: false, error: "Failed to initialize vote" }, 500, corsHdrs);
    }
}

export async function handleCastVote(req: Request, env: any, corsHdrs: Headers, matchId: string) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as any;

        // Check if user has already voted
        const existing = await env.DB.prepare(
            `SELECT id FROM motm_votes WHERE match_id = ? AND user_id = ?`
        ).bind(matchId, claims.userId).first();

        if (existing) {
            // Update existing vote
            await env.DB.prepare(
                `UPDATE motm_votes SET player_id = ?, voted_at = ? WHERE id = ?`
            ).bind(body.playerId, Date.now(), existing.id).run();
        } else {
            // Create new vote
            await env.DB.prepare(
                `INSERT INTO motm_votes (id, match_id, player_id, user_id, voted_at)
                 VALUES (?, ?, ?, ?, ?)`
            ).bind(crypto.randomUUID(), matchId, body.playerId, claims.userId, Date.now()).run();
        }

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) throw err;
        return json({ success: false, error: "Failed to cast vote" }, 500, corsHdrs);
    }
}

export async function handleGetResults(req: Request, env: any, corsHdrs: Headers, matchId: string) {
    try {
        const claims = await requireJWT(req, env);

        const results = await env.DB.prepare(
            `SELECT 
                v.player_id,
                p.name as player_name,
                COUNT(*) as vote_count
             FROM motm_votes v
             LEFT JOIN squad_players p ON v.player_id = p.id
             WHERE v.match_id = ?
             GROUP BY v.player_id
             ORDER BY vote_count DESC`
        ).bind(matchId).all();

        const total = results.results.reduce((sum: number, r: any) => sum + r.vote_count, 0);

        return json({
            success: true,
            data: {
                results: results.results,
                totalVotes: total,
            }
        }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) throw err;
        return json({ success: false, error: "Failed to get results" }, 500, corsHdrs);
    }
}
