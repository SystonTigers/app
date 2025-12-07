import { json } from "../services/util";
import { requireJWT } from "../services/auth";

export async function handlePlayerPhotoUpload(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        // Parse multipart form data
        const formData = await req.formData();
        const file = formData.get('photo') as File;
        const playerId = formData.get('playerId') as string;

        if (!file) {
            return json({ success: false, error: "No photo provided" }, 400, corsHdrs);
        }

        const photoId = crypto.randomUUID();
        const key = `players/${claims.tenantId}/${playerId}/${photoId}`;

        // Upload to R2
        await env.BUCKET.put(key, file.stream());

        // Store metadata in D1
        await env.DB.prepare(
            `UPDATE squad_players SET photo_url = ? WHERE id = ? AND tenant_id = ?`
        ).bind(key, playerId, claims.tenantId).run();

        return json({ success: true, photoUrl: key }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) throw err;
        return json({ success: false, error: "Failed to upload photo" }, 500, corsHdrs);
    }
}

export async function handlePlayerPhotoDelete(req: Request, env: any, corsHdrs: Headers, playerId: string) {
    try {
        const claims = await requireJWT(req, env);

        // Get current photo URL
        const player = await env.DB.prepare(
            `SELECT photo_url FROM squad_players WHERE id = ? AND tenant_id = ?`
        ).bind(playerId, claims.tenantId).first();

        if (player && player.photo_url) {
            // Delete from R2
            await env.BUCKET.delete(player.photo_url);

            // Clear from DB
            await env.DB.prepare(
                `UPDATE squad_players SET photo_url = NULL WHERE id = ? AND tenant_id = ?`
            ).bind(playerId, claims.tenantId).run();
        }

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) throw err;
        return json({ success: false, error: "Failed to delete photo" }, 500, corsHdrs);
    }
}

// Get player goal history
export async function handleGetPlayerGoals(req: Request, env: any, corsHdrs: Headers, playerId: string) {
    try {
        const claims = await requireJWT(req, env);

        // Get goals by season
        const goals = await env.DB.prepare(`
            SELECT 
                COALESCE(f.season_id, 'all-time') as season_id, 
                s.name as season_name,
                COUNT(*) as goals
            FROM match_events me
            LEFT JOIN fixtures f ON me.fixture_id = f.id
            LEFT JOIN seasons s ON f.season_id = s.id
            WHERE me.tenant_id = ? AND me.player_id = ? AND me.event_type = 'goal'
            GROUP BY f.season_id, s.name
            ORDER BY s.start_date DESC
        `).bind(claims.tenantId, playerId).all();

        const bySeason = (goals.results || []).map((row: any) => ({
            seasonId: row.season_id,
            seasonName: row.season_name || 'All-Time',
            goals: row.goals
        }));

        const total = bySeason.reduce((sum: number, season: any) => sum + season.goals, 0);

        return json({
            success: true,
            data: { total, bySeason }
        }, 200, corsHdrs);
    } catch (err) {
        console.error('Get player goals error:', err);
        return json({ success: false, error: "Failed to get player goals" }, 500, corsHdrs);
    }
}
