import { json } from "../services/util";
import { requireJWT } from "../services/auth";

// Public: Get voting status and options for a match
export async function handleInitVote(req: Request, env: any, corsHdrs: Headers, matchId: string) {
    try {
        const claims = await requireJWT(req, env);

        // Get match details - SECURITY: Filter by tenant_id
        let match = await env.DB.prepare(
            `SELECT * FROM team_results WHERE id = ? AND tenant_id = ?`
        ).bind(matchId, claims.tenantId).first();

        if (!match) {
            match = await env.DB.prepare(
                `SELECT * FROM fixtures WHERE id = ? AND tenant_id = ?`
            ).bind(matchId, claims.tenantId).first();
        }

        if (!match) {
            return json({ success: false, error: "Match not found" }, 404, corsHdrs);
        }

        // Get session status
        const session = await env.DB.prepare(
            `SELECT * FROM motm_sessions WHERE match_id = ? AND tenant_id = ?`
        ).bind(matchId, claims.tenantId).first();

        const status = session ? session.status : 'draft';

        // Get current vote count
        const votes = await env.DB.prepare(
            `SELECT v.player_id, COUNT(*) as votes
             FROM motm_votes v
             WHERE v.match_id = ?
             GROUP BY v.player_id`
        ).bind(matchId).all();

        // Check if user has voted
        const userVote = await env.DB.prepare(
            `SELECT player_id FROM motm_votes WHERE match_id = ? AND user_id = ?`
        ).bind(matchId, claims.userId).first();

        return json({
            success: true,
            data: {
                match,
                status,
                votingWindow: session ? { start: session.voting_start_at, end: session.voting_end_at } : null,
                votes: votes.results || [],
                userVote: userVote?.player_id || null,
                autoPostEnabled: session ? !!session.auto_post : true
            }
        }, 200, corsHdrs);
    } catch (err: any) {
        console.error("Init Vote Error", err);
        return json({ success: false, error: "Failed to initialize vote" }, 500, corsHdrs);
    }
}

// Public: Cast Vote
export async function handleCastVote(req: Request, env: any, corsHdrs: Headers, matchId: string) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as any;

        // Check session status
        const session = await env.DB.prepare(
            `SELECT status FROM motm_sessions WHERE match_id = ? AND tenant_id = ?`
        ).bind(matchId, claims.tenantId).first();

        if (!session || session.status !== 'active') {
            return json({ success: false, error: "Voting is not active for this match" }, 400, corsHdrs);
        }

        // Check if user has already voted
        const existing = await env.DB.prepare(
            `SELECT id FROM motm_votes WHERE match_id = ? AND user_id = ?`
        ).bind(matchId, claims.userId).first();

        if (existing) {
            // Update existing vote
            await env.DB.prepare(`
                UPDATE motm_votes
                SET player_id = ?, voted_at = ?
                WHERE id = ?
            `).bind(body.candidateId, Date.now(), existing.id).run();
        } else {
            // Create new vote
            await env.DB.prepare(
                `INSERT INTO motm_votes (id, match_id, player_id, user_id, voted_at)
                 VALUES (?, ?, ?, ?, ?)`
            ).bind(crypto.randomUUID(), matchId, body.candidateId, claims.userId, Date.now()).run();
        }

        return json({ success: true }, 200, corsHdrs);
    } catch (err: any) {
        console.error("Cast Vote Error", err);
        return json({ success: false, error: "Failed to cast vote" }, 500, corsHdrs);
    }
}

// Public: Get Results
export async function handleGetResults(req: Request, env: any, corsHdrs: Headers, matchId: string) {
    try {
        const claims = await requireJWT(req, env);

        const results = await env.DB.prepare(
            `SELECT
                v.player_id,
                p.name as player_name,
                COUNT(*) as vote_count
             FROM motm_votes v
             LEFT JOIN squad_players p ON v.player_id = p.id AND p.tenant_id = ?
             WHERE v.match_id = ?
             GROUP BY v.player_id
             ORDER BY vote_count DESC`
        ).bind(claims.tenantId, matchId).all();

        const total = (results.results || []).reduce((sum: number, r: any) => sum + r.vote_count, 0);

        return json({
            success: true,
            data: {
                results: results.results || [],
                totalVotes: total,
            }
        }, 200, corsHdrs);
    } catch (err: any) {
        return json({ success: false, error: "Failed to get results" }, 500, corsHdrs);
    }
}

// Admin: Open Voting
export async function handleOpenVoting(req: Request, env: any, corsHdrs: Headers, matchId: string) {
    try {
        const claims = await requireJWT(req, env);
        if (!claims.roles?.includes('owner') && !claims.roles?.includes('admin')) {
            return json({ success: false, error: "Unauthorized" }, 403, corsHdrs);
        }

        const body = await req.json() as any;
        // body: { votingWindow: { start, end }, autoPostEnabled, status }

        const now = new Date().toISOString();
        const start = body.votingWindow?.start || now;
        const end = body.votingWindow?.end; // optional
        const status = body.status || 'active';

        // Upsert session
        await env.DB.prepare(`
            INSERT INTO motm_sessions (match_id, tenant_id, status, voting_start_at, voting_end_at, auto_post, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(match_id) DO UPDATE SET
                status = excluded.status,
                voting_start_at = excluded.voting_start_at,
                voting_end_at = excluded.voting_end_at,
                auto_post = excluded.auto_post,
                updated_at = excluded.updated_at
        `).bind(
            matchId,
            claims.tenantId,
            status,
            start,
            end,
            body.autoPostEnabled ? 1 : 0,
            now
        ).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (err: any) {
        console.error("Open Voting Error", err);
        return json({ success: false, error: "Failed to open voting" }, 500, corsHdrs);
    }
}

// Admin: Close Voting
export async function handleCloseVoting(req: Request, env: any, corsHdrs: Headers, matchId: string) {
    try {
        const claims = await requireJWT(req, env);
        if (!claims.roles?.includes('owner') && !claims.roles?.includes('admin')) {
            return json({ success: false, error: "Unauthorized" }, 403, corsHdrs);
        }

        await env.DB.prepare(`
            UPDATE motm_sessions 
            SET status = 'closed', updated_at = ?
            WHERE match_id = ? AND tenant_id = ?
        `).bind(new Date().toISOString(), matchId, claims.tenantId).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (err: any) {
        return json({ success: false, error: "Failed to close voting" }, 500, corsHdrs);
    }
}

// Admin: Tally
export async function handleGetTally(req: Request, env: any, corsHdrs: Headers, matchId: string) {
    return handleGetResults(req, env, corsHdrs, matchId);
}

// Admin: List all MOTM sessions
export async function handleListMotmSessions(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        if (!claims.roles?.includes('owner') && !claims.roles?.includes('admin')) {
            return json({ success: false, error: "Unauthorized" }, 403, corsHdrs);
        }

        const sessions = await env.DB.prepare(
            `SELECT * FROM motm_sessions WHERE tenant_id = ? ORDER BY created_at DESC`
        ).bind(claims.tenantId).all();

        return json({ success: true, data: sessions.results }, 200, corsHdrs);
    } catch (err: any) {
        return json({ success: false, error: "Failed to list sessions" }, 500, corsHdrs);
    }
}
