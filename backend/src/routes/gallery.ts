import { json } from "../services/util";
import { requireJWT } from "../services/auth";

export async function handlePhotoUpload(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const albumId = formData.get('albumId') as string || 'default';
        const caption = formData.get('caption') as string || '';

        if (!file) {
            return json({ success: false, error: "No file provided" }, 400, corsHdrs);
        }

        const photoId = crypto.randomUUID();
        const ext = file.name.split('.').pop();
        const key = `${claims.tenantId}/photos/${albumId}/${photoId}.${ext}`;

        // Upload to R2
        await env.BUCKET.put(key, file.stream(), {
            httpMetadata: {
                contentType: file.type,
            },
        });

        // Store metadata in D1
        await env.DB.prepare(
            `INSERT INTO photos (id, tenant_id, album_id, photo_key, caption, uploaded_by, uploaded_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            photoId, claims.tenantId, albumId, key, caption, claims.userId, Date.now()
        ).run();

        return json({ success: true, id: photoId, url: `/api/v1/photos/${photoId}` }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) throw err;
        return json({ success: false, error: "Failed to upload photo" }, 500, corsHdrs);
    }
}

export async function handleListPhotos(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const url = new URL(req.url);
        const albumId = url.searchParams.get('albumId');

        let query = `SELECT * FROM photos WHERE tenant_id = ?`;
        const params = [claims.tenantId];

        if (albumId) {
            query += ` AND album_id = ?`;
            params.push(albumId);
        }

        query += ` ORDER BY uploaded_at DESC`;

        const result = await env.DB.prepare(query).bind(...params).all();

        return json({ success: true, data: result.results }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) throw err;
        return json({ success: false, error: "Failed to list photos" }, 500, corsHdrs);
    }
}

export async function handleGetPhoto(req: Request, env: any, corsHdrs: Headers, photoId: string) {
    try {
        const claims = await requireJWT(req, env);

        const result = await env.DB.prepare(
            `SELECT * FROM photos WHERE id = ? AND tenant_id = ?`
        ).bind(photoId, claims.tenantId).first();

        if (!result) {
            return json({ success: false, error: "Photo not found" }, 404, corsHdrs);
        }

        // Get signed URL from R2
        const object = await env.BUCKET.get(result.photo_key);
        if (!object) {
            return json({ success: false, error: "Photo file not found" }, 404, corsHdrs);
        }

        return new Response(object.body, {
            headers: {
                'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000',
                ...corsHdrs,
            },
        });
    } catch (err) {
        if (err instanceof Response) throw err;
        return json({ success: false, error: "Failed to get photo" }, 500, corsHdrs);
    }
}

export async function handleDeletePhoto(req: Request, env: any, corsHdrs: Headers, photoId: string) {
    try {
        const claims = await requireJWT(req, env);

        const result = await env.DB.prepare(
            `SELECT photo_key FROM photos WHERE id = ? AND tenant_id = ?`
        ).bind(photoId, claims.tenantId).first();

        if (!result) {
            return json({ success: false, error: "Photo not found" }, 404, corsHdrs);
        }

        // Delete from R2
        await env.BUCKET.delete(result.photo_key);

        // Delete from database
        await env.DB.prepare(
            `DELETE FROM photos WHERE id = ? AND tenant_id = ?`
        ).bind(photoId, claims.tenantId).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) throw err;
        return json({ success: false, error: "Failed to delete photo" }, 500, corsHdrs);
    }
}

export async function handleCreateAlbum(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as any;

        const albumId = body.albumId || crypto.randomUUID();
        const { name, type, date } = body;

        if (!name) {
            return json({ success: false, error: "Album name is required" }, 400, corsHdrs);
        }

        await env.DB.prepare(
            `INSERT INTO photo_albums (id, tenant_id, name, type, album_date, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(
            albumId, claims.tenantId, name, type || 'general', date || null, Date.now()
        ).run();

        return json({ success: true, id: albumId }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) throw err;
        return json({ success: false, error: "Failed to create album" }, 500, corsHdrs);
    }
}

export async function handleListAlbums(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        const albums = await env.DB.prepare(
            `SELECT a.*, COUNT(p.id) as photo_count
             FROM photo_albums a
             LEFT JOIN photos p ON a.id = p.album_id AND p.tenant_id = a.tenant_id
             WHERE a.tenant_id = ?
             GROUP BY a.id
             ORDER BY a.created_at DESC`
        ).bind(claims.tenantId).all();

        return json({ success: true, data: albums.results }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) throw err;
        return json({ success: false, error: "Failed to list albums" }, 500, corsHdrs);
    }
}

export async function handleDeleteAlbum(req: Request, env: any, corsHdrs: Headers, albumId: string) {
    try {
        const claims = await requireJWT(req, env);

        // Get all photos in album
        const photos = await env.DB.prepare(
            `SELECT photo_key FROM photos WHERE album_id = ? AND tenant_id = ?`
        ).bind(albumId, claims.tenantId).all();

        // Delete photos from R2
        for (const photo of photos.results) {
            await env.BUCKET.delete(photo.photo_key);
        }

        // Delete photos from database
        await env.DB.prepare(
            `DELETE FROM photos WHERE album_id = ? AND tenant_id = ?`
        ).bind(albumId, claims.tenantId).run();

        // Delete album
        await env.DB.prepare(
            `DELETE FROM photo_albums WHERE id = ? AND tenant_id = ?`
        ).bind(albumId, claims.tenantId).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) throw err;
        return json({ success: false, error: "Failed to delete album" }, 500, corsHdrs);
    }
}
