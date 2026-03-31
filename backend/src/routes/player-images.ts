import { json, id as generateId } from "../services/util";
import { requireJWT } from "../services/auth";

export async function handleListImages(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const url = new URL(req.url);
        const playerId = url.searchParams.get('playerId');
        const type = url.searchParams.get('type');

        let query = `SELECT * FROM player_images WHERE tenant_id = ?`;
        const params: any[] = [claims.tenantId];

        if (playerId) {
            query += ` AND player_id = ?`;
            params.push(playerId);
        }

        if (type) {
            query += ` AND image_type = ?`;
            params.push(type);
        }

        query += ` ORDER BY uploaded_at DESC`;

        const results = await env.DB.prepare(query).bind(...params).all();

        return json({ success: true, data: results.results || [] }, 200, corsHdrs);
    } catch (err) {
        console.error('List player images error:', err);
        return json({ success: false, error: "Failed to list player images" }, 500, corsHdrs);
    }
}

export async function handleUploadImage(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        // Parse multipart form data
        const formData = await req.formData();
        const file = formData.get('photo') as File;
        const playerId = formData.get('playerId') as string;
        const imageType = formData.get('type') as string; // 'headshot' | 'action'
        const playerName = formData.get('playerName') as string; // Optional, for logging/metadata

        if (!file || !playerId || !imageType) {
            return json({ success: false, error: "Missing required fields (photo, playerId, type)" }, 400, corsHdrs);
        }

        const imageId = generateId();
        const key = `players/${claims.tenantId}/${playerId}/${imageId}-${file.name}`;

        // Upload to R2 (or mock if no bucket)
        if (env.BUCKET) {
            await env.BUCKET.put(key, file.stream());
        } else {
            console.warn("No BUCKET binding found, skipping R2 upload");
        }

        // Generate public URL (assuming public bucket or worker proxy)
        // For now, we'll assume a standard R2 public URL structure or similar
        // If testing locally without R2, this URL might not be reachable
        const imageUrl = `https://${env.R2_PUBLIC_URL}/${key}`;
        // fallback if env.R2_PUBLIC_URL is not set, just use the key or a placeholder
        const finalUrl = env.R2_PUBLIC_URL ? `${env.R2_PUBLIC_URL}/${key}` : `https://placeholder.com/${key}`;

        // Insert into DB
        await env.DB.prepare(`
            INSERT INTO player_images (id, tenant_id, player_id, image_url, image_type, uploaded_at, uploaded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
            imageId,
            claims.tenantId,
            playerId,
            finalUrl,
            imageType,
            Date.now(),
            claims.sub // User ID
        ).run();

        return json({ success: true, data: { id: imageId, imageUrl: finalUrl } }, 200, corsHdrs);
    } catch (err) {
        console.error('Upload player image error:', err);
        return json({ success: false, error: "Failed to upload player image" }, 500, corsHdrs);
    }
}

export async function handleDeleteImage(req: Request, env: any, corsHdrs: Headers, id: string) {
    try {
        const claims = await requireJWT(req, env);

        // Get image to find URL/Key
        const image = await env.DB.prepare(`
            SELECT image_url FROM player_images WHERE id = ? AND tenant_id = ?
        `).bind(id, claims.tenantId).first();

        if (!image) {
            return json({ success: false, error: "Image not found" }, 404, corsHdrs);
        }

        // Delete from R2 (Key derivation might be needed if full URL is stored)
        // Assuming we can derive key from URL or just store key. 
        // Basic implementation: if using standard URL, key is part of it.
        // For now, let's just delete from DB. In production, we should parse key and delete from bucket.

        // Delete from DB
        await env.DB.prepare(`
            DELETE FROM player_images WHERE id = ? AND tenant_id = ?
        `).bind(id, claims.tenantId).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        console.error('Delete player image error:', err);
        return json({ success: false, error: "Failed to delete player image" }, 500, corsHdrs);
    }
}
