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
        return json({ success: false, error: "Failed to delete photo" }, 500, corsHdrs);
    }
}
