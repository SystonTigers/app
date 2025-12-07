import { json } from "../services/util";
import { requireJWT } from "../services/auth";

// List all seasons for tenant
export async function handleListSeasons(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        const result = await env.DB.prepare(
            "SELECT * FROM seasons WHERE tenant_id = ? ORDER BY start_date DESC"
        ).bind(claims.tenantId).all();

        return json({ success: true, data: result.results || [] }, 200, corsHdrs);
    } catch (err) {
        console.error('List seasons error:', err);
        return json({ success: false, error: "Failed to list seasons" }, 500, corsHdrs);
    }
}

// Create new season
export async function handleCreateSeason(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as { name: string; startDate: string; endDate?: string; setCurrent?: boolean };

        const seasonId = crypto.randomUUID();
        const now = Date.now();

        // If setting as current, unset others first
        if (body.setCurrent) {
            await env.DB.prepare(
                "UPDATE seasons SET is_current = 0 WHERE tenant_id = ?"
            ).bind(claims.tenantId).run();
        }

        await env.DB.prepare(
            `INSERT INTO seasons (id, tenant_id, name, start_date, end_date, is_current, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`
        ).bind(
            seasonId,
            claims.tenantId,
            body.name,
            body.startDate,
            body.endDate || null,
            body.setCurrent ? 1 : 0,
            now
        ).run();

        return json({ success: true, id: seasonId }, 200, corsHdrs);
    } catch (err: any) {
        console.error('Create season error:', err);
        if (err.message?.includes('UNIQUE')) {
            return json({ success: false, error: "Season with this name already exists" }, 400, corsHdrs);
        }
        return json({ success: false, error: "Failed to create season" }, 500, corsHdrs);
    }
}

// Set season as current
export async function handleSetCurrentSeason(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as { seasonId: string };

        // Unset all others
        await env.DB.prepare(
            "UPDATE seasons SET is_current = 0 WHERE tenant_id = ?"
        ).bind(claims.tenantId).run();

        // Set requested season as current
        await env.DB.prepare(
            "UPDATE seasons SET is_current = 1 WHERE id = ? AND tenant_id = ?"
        ).bind(body.seasonId, claims.tenantId).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        console.error('Set current season error:', err);
        return json({ success: false, error: "Failed to set current season" }, 500, corsHdrs);
    }
}

// Archive a season
export async function handleArchiveSeason(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as { seasonId: string };

        await env.DB.prepare(
            "UPDATE seasons SET status = 'archived', is_current = 0 WHERE id = ? AND tenant_id = ?"
        ).bind(body.seasonId, claims.tenantId).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        console.error('Archive season error:', err);
        return json({ success: false, error: "Failed to archive season" }, 500, corsHdrs);
    }
}

// Get current season
export async function handleGetCurrentSeason(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        const season = await env.DB.prepare(
            "SELECT * FROM seasons WHERE tenant_id = ? AND is_current = 1"
        ).bind(claims.tenantId).first();

        return json({ success: true, data: season || null }, 200, corsHdrs);
    } catch (err) {
        console.error('Get current season error:', err);
        return json({ success: false, error: "Failed to get current season" }, 500, corsHdrs);
    }
}

// Add player to season roster
export async function handleAddPlayerToSeason(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as {
            seasonId: string;
            playerId: string;
            squadNumber?: number;
            position?: string;
            joinedDate?: string;
        };

        const id = crypto.randomUUID();

        await env.DB.prepare(
            `INSERT INTO player_seasons (id, tenant_id, season_id, player_id, squad_number, position, joined_date, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
             ON CONFLICT(season_id, player_id) DO UPDATE SET 
                squad_number = excluded.squad_number,
                position = excluded.position`
        ).bind(
            id,
            claims.tenantId,
            body.seasonId,
            body.playerId,
            body.squadNumber || null,
            body.position || null,
            body.joinedDate || null,
            Date.now()
        ).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        console.error('Add player to season error:', err);
        return json({ success: false, error: "Failed to add player to season" }, 500, corsHdrs);
    }
}

// Get season roster
export async function handleGetSeasonRoster(req: Request, env: any, corsHdrs: Headers, seasonId: string) {
    try {
        const claims = await requireJWT(req, env);

        const result = await env.DB.prepare(
            `SELECT ps.*, p.name, p.photo_url 
             FROM player_seasons ps
             LEFT JOIN squad p ON ps.player_id = p.id
             WHERE ps.season_id = ? AND ps.tenant_id = ?
             ORDER BY ps.squad_number ASC`
        ).bind(seasonId, claims.tenantId).all();

        return json({ success: true, data: result.results || [] }, 200, corsHdrs);
    } catch (err) {
        console.error('Get season roster error:', err);
        return json({ success: false, error: "Failed to get roster" }, 500, corsHdrs);
    }
}
