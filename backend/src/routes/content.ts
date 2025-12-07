import { json } from "../services/util";
import { requireJWT } from "../services/auth";

// Fixtures
export async function handleCreateFixture(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as any;
        const id = crypto.randomUUID();

        await env.DB.prepare(
            `INSERT INTO fixtures (id, tenant_id, fixture_date, kick_off_time, opponent, venue, competition, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled')`
        ).bind(
            id, claims.tenantId, body.date, body.time, body.opponent, body.venue, body.competition
        ).run();

        return json({ success: true, id }, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to create fixture" }, 500, corsHdrs);
    }
}

export async function handleDeleteFixture(req: Request, env: any, corsHdrs: Headers, id: string) {
    try {
        const claims = await requireJWT(req, env);
        await env.DB.prepare("DELETE FROM fixtures WHERE id = ? AND tenant_id = ?")
            .bind(id, claims.tenantId).run();
        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to delete fixture" }, 500, corsHdrs);
    }
}

// Results
export async function handleCreateResult(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as any;
        const id = crypto.randomUUID();

        await env.DB.prepare(
            `INSERT INTO team_results (id, tenant_id, match_date, opponent, venue, competition, our_score, their_score, scorers)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            id, claims.tenantId, body.date, body.opponent, body.venue, body.competition,
            body.ourScore, body.theirScore, body.scorers
        ).run();

        return json({ success: true, id }, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to create result" }, 500, corsHdrs);
    }
}

export async function handleDeleteResult(req: Request, env: any, corsHdrs: Headers, id: string) {
    try {
        const claims = await requireJWT(req, env);
        await env.DB.prepare("DELETE FROM team_results WHERE id = ? AND tenant_id = ?")
            .bind(id, claims.tenantId).run();
        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to delete result" }, 500, corsHdrs);
    }
}

// Feed
export async function handleCreatePost(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as any;
        const id = crypto.randomUUID();

        await env.DB.prepare(
            `INSERT INTO feed_posts (id, tenant_id, title, content, author, image_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            id, claims.tenantId, body.title, body.content, body.author, body.imageUrl, Date.now()
        ).run();

        return json({ success: true, id }, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to create post" }, 500, corsHdrs);
    }
}

export async function handleDeletePost(req: Request, env: any, corsHdrs: Headers, id: string) {
    try {
        const claims = await requireJWT(req, env);
        await env.DB.prepare("DELETE FROM feed_posts WHERE id = ? AND tenant_id = ?")
            .bind(id, claims.tenantId).run();
        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to delete post" }, 500, corsHdrs);
    }
}

// Table
export async function handleUpdateTable(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as any[]; // Array of rows

        // Transaction: Delete all for tenant, insert new
        const batch = [
            env.DB.prepare("DELETE FROM league_standings WHERE tenant_id = ?").bind(claims.tenantId)
        ];

        for (const row of body) {
            batch.push(
                env.DB.prepare(
                    `INSERT INTO league_standings (id, tenant_id, position, team_name, played, won, drawn, lost, goals_for, goals_against, points, competition)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                ).bind(
                    crypto.randomUUID(), claims.tenantId, row.position, row.team, row.played, row.won, row.drawn, row.lost,
                    row.goalsFor, row.goalsAgainst, row.points, row.competition || 'League'
                )
            );
        }

        await env.DB.batch(batch);
        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to update table" }, 500, corsHdrs);
    }
}

export async function handleResignTeam(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as { teamName: string };
        const teamName = body.teamName;

        if (!teamName) return json({ success: false, error: "Team name required" }, 400, corsHdrs);

        // Step 1: Get all results involving the resigned team to calculate deductions
        const results = await env.DB.prepare(
            `SELECT opponent, our_score, their_score FROM team_results WHERE tenant_id = ? AND opponent = ?`
        ).bind(claims.tenantId, teamName).all();

        // Calculate deductions for each opponent (YOUR team's results against them)
        // our_score = your team's goals, their_score = resigned team's goals
        const deductions: Record<string, { played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; points: number }> = {};

        // Your team played matches against the resigned team - need to deduct YOUR stats
        for (const row of (results.results || [])) {
            const ourScore = Number(row.our_score || 0);
            const theirScore = Number(row.their_score || 0);

            // This is a match your team played against the resigned team
            // We need to deduct from YOUR team's record (claims.tenantId)
            // The "opponent" here IS the resigned team, so we deduct from our own team
            // But actually we need to update the LEAGUE TABLE not just our results

            // For the LEAGUE TABLE: we need to find all teams that played the resigned team
            // and deduct their points. In your league table, each row is a different team.
        }

        // Step 2: Query the league standings to find teams and recalculate
        // Get current standings
        const standings = await env.DB.prepare(
            `SELECT * FROM league_standings WHERE tenant_id = ?`
        ).bind(claims.tenantId).all();

        // We need results WHERE the resigned team was opponent for ANY team
        // But team_results only stores YOUR team's results
        // For a proper implementation, we need match_events or a full results table

        // Alternative: Since we're storing league table manually, 
        // we recalculate based on remaining results
        // Get all remaining results (excluding resigned team)
        const remainingResults = await env.DB.prepare(
            `SELECT * FROM team_results WHERE tenant_id = ? AND opponent != ?`
        ).bind(claims.tenantId, teamName).all();

        // Recalculate your team's stats from remaining results
        let played = 0, won = 0, drawn = 0, lost = 0, goalsFor = 0, goalsAgainst = 0;
        for (const r of (remainingResults.results || [])) {
            const ourScore = Number(r.our_score || 0);
            const theirScore = Number(r.their_score || 0);
            played++;
            goalsFor += ourScore;
            goalsAgainst += theirScore;
            if (ourScore > theirScore) won++;
            else if (ourScore === theirScore) drawn++;
            else lost++;
        }
        const points = (won * 3) + drawn;

        // Step 3: Update league standings - remove resigned team and update your team
        const batch = [
            // Remove resigned team from table
            env.DB.prepare("DELETE FROM league_standings WHERE tenant_id = ? AND team_name = ?")
                .bind(claims.tenantId, teamName),
            // Update your team's standing with recalculated stats
            env.DB.prepare(
                `UPDATE league_standings 
                 SET played = ?, won = ?, drawn = ?, lost = ?, goals_for = ?, goals_against = ?, points = ?
                 WHERE tenant_id = ? AND team_name = (SELECT name FROM tenants WHERE id = ?)`
            ).bind(played, won, drawn, lost, goalsFor, goalsAgainst, points, claims.tenantId, claims.tenantId),
            // Remove fixtures against resigned team
            env.DB.prepare("DELETE FROM fixtures WHERE tenant_id = ? AND opponent = ?")
                .bind(claims.tenantId, teamName),
            // Remove results against resigned team
            env.DB.prepare("DELETE FROM team_results WHERE tenant_id = ? AND opponent = ?")
                .bind(claims.tenantId, teamName)
        ];

        await env.DB.batch(batch);

        // Step 4: Recalculate positions based on new points
        const updatedStandings = await env.DB.prepare(
            `SELECT id, points, goals_for - goals_against as gd FROM league_standings 
             WHERE tenant_id = ? ORDER BY points DESC, gd DESC`
        ).bind(claims.tenantId).all();

        // Update positions
        const positionUpdates = [];
        let position = 1;
        for (const team of (updatedStandings.results || [])) {
            positionUpdates.push(
                env.DB.prepare("UPDATE league_standings SET position = ? WHERE id = ?")
                    .bind(position++, team.id)
            );
        }
        if (positionUpdates.length > 0) {
            await env.DB.batch(positionUpdates);
        }

        return json({ success: true, message: `Team ${teamName} resigned. Standings recalculated.` }, 200, corsHdrs);
    } catch (err) {
        console.error('Resign team error:', err);
        return json({ success: false, error: "Failed to resign team" }, 500, corsHdrs);
    }
}
