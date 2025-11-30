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
        console.error(err);
        return json({ success: false, error: "Failed to update table" }, 500, corsHdrs);
    }
}
