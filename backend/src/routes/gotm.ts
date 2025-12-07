import { json } from "../services/util";
import { requireJWT } from "../services/auth";

// Types
interface GoalCandidate {
    id: string;
    playerId: string;
    matchId: string;
    description: string;
    videoUrl?: string;
    votes: number;
}

// Start GOTM voting for a month
export async function handleStartGOTMVoting(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as { month: string; year: number; goals: any[] };

        const votingId = crypto.randomUUID();

        // Create voting session
        await env.DB.prepare(
            `INSERT INTO gotm_voting (id, tenant_id, month, year, status, created_at)
             VALUES (?, ?, ?, ?, 'open', ?)`
        ).bind(votingId, claims.tenantId, body.month, body.year, Date.now()).run();

        // Add goal candidates
        for (const goal of body.goals) {
            const candidateId = crypto.randomUUID();
            await env.DB.prepare(
                `INSERT INTO gotm_candidates (id, voting_id, tenant_id, player_id, match_id, description, video_url, votes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 0)`
            ).bind(candidateId, votingId, claims.tenantId, goal.playerId, goal.matchId, goal.description, goal.videoUrl || null).run();
        }

        return json({ success: true, votingId }, 200, corsHdrs);
    } catch (err) {
        console.error('Start GOTM error:', err);
        return json({ success: false, error: "Failed to start voting" }, 500, corsHdrs);
    }
}

// Get current/active GOTM voting
export async function handleGetGOTMVoting(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const url = new URL(req.url);
        const votingId = url.searchParams.get('votingId');

        let voting;
        if (votingId) {
            voting = await env.DB.prepare(
                "SELECT * FROM gotm_voting WHERE id = ? AND tenant_id = ?"
            ).bind(votingId, claims.tenantId).first();
        } else {
            // Get latest open voting
            voting = await env.DB.prepare(
                "SELECT * FROM gotm_voting WHERE tenant_id = ? AND status = 'open' ORDER BY created_at DESC LIMIT 1"
            ).bind(claims.tenantId).first();
        }

        if (!voting) {
            return json({ success: true, voting: null, candidates: [] }, 200, corsHdrs);
        }

        // Get candidates
        const candidates = await env.DB.prepare(
            "SELECT * FROM gotm_candidates WHERE voting_id = ? ORDER BY votes DESC"
        ).bind(voting.id).all();

        return json({
            success: true,
            voting,
            candidates: candidates.results || []
        }, 200, corsHdrs);
    } catch (err) {
        console.error('Get GOTM error:', err);
        return json({ success: false, error: "Failed to get voting" }, 500, corsHdrs);
    }
}

// Cast vote for a goal
export async function handleCastGOTMVote(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as { candidateId: string; votingId: string };

        // Check if voting is open
        const voting = await env.DB.prepare(
            "SELECT * FROM gotm_voting WHERE id = ? AND status = 'open'"
        ).bind(body.votingId).first();

        if (!voting) {
            return json({ success: false, error: "Voting is closed or not found" }, 400, corsHdrs);
        }

        // Check if user already voted (using simple check - could use a votes table for more control)
        const existingVote = await env.DB.prepare(
            "SELECT * FROM gotm_votes WHERE voting_id = ? AND user_id = ?"
        ).bind(body.votingId, claims.sub).first();

        if (existingVote) {
            return json({ success: false, error: "Already voted" }, 400, corsHdrs);
        }

        // Record vote
        await env.DB.prepare(
            "INSERT INTO gotm_votes (id, voting_id, candidate_id, user_id, created_at) VALUES (?, ?, ?, ?, ?)"
        ).bind(crypto.randomUUID(), body.votingId, body.candidateId, claims.sub, Date.now()).run();

        // Increment vote count
        await env.DB.prepare(
            "UPDATE gotm_candidates SET votes = votes + 1 WHERE id = ?"
        ).bind(body.candidateId).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        console.error('Cast GOTM vote error:', err);
        return json({ success: false, error: "Failed to cast vote" }, 500, corsHdrs);
    }
}

// Close voting and determine winner
export async function handleCloseGOTMVoting(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as { votingId: string };

        // Close voting
        await env.DB.prepare(
            "UPDATE gotm_voting SET status = 'closed' WHERE id = ? AND tenant_id = ?"
        ).bind(body.votingId, claims.tenantId).run();

        // Get winner
        const winner = await env.DB.prepare(
            "SELECT * FROM gotm_candidates WHERE voting_id = ? ORDER BY votes DESC LIMIT 1"
        ).bind(body.votingId).first();

        return json({ success: true, winner }, 200, corsHdrs);
    } catch (err) {
        console.error('Close GOTM error:', err);
        return json({ success: false, error: "Failed to close voting" }, 500, corsHdrs);
    }
}
