import { json } from "../services/util";
import { logJSON } from "../lib/log";
import { getSessionFromRequest } from "../middleware/permissions";
import { MediaError, deleteMedia, keyFromMediaUrl, mediaUrl, putMedia, validateImage } from "../services/media";

async function requireJWT(req: Request, env: any) {
    const session = await getSessionFromRequest(req, env);
    if (!session) {
        throw new Error("Unauthorized");
    }
    return session;
}

// List Albums
export async function handleListAlbums(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        const query = `
            SELECT a.*, (SELECT COUNT(*) FROM photos p WHERE p.album_id = a.id) as photo_count
            FROM albums a
            WHERE a.tenant_id = ?
            ORDER BY a.event_date DESC
        `;

        const { results } = await env.DB.prepare(query).bind(claims.tenantId).all();

        const albums = (results || []).map((r: any) => ({
            id: r.id,
            title: r.title,
            date: r.event_date,
            coverPhoto: r.cover_photo_url,
            photoCount: r.photo_count,
            type: r.type
        }));

        return json({ success: true, data: albums }, 200, corsHdrs);
    } catch (err: any) {
        console.error('List albums error:', err);
        const status = err.message === "Unauthorized" ? 401 : 500;
        return json({ success: false, error: "Failed to list albums" }, status, corsHdrs);
    }
}

// Create Album
export async function handleCreateAlbum(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as any;

        const id = crypto.randomUUID();

        await env.DB.prepare(
            `INSERT INTO albums (id, tenant_id, title, event_date, cover_photo_url, type)
             VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(
            id, claims.tenantId, body.title, body.date, body.coverPhoto, body.type
        ).run();

        return json({ success: true, data: { id } }, 201, corsHdrs);
    } catch (err: any) {
        console.error('Create album error:', err);
        const status = err.message === "Unauthorized" ? 401 : 500;
        return json({ success: false, error: "Failed to create album" }, status, corsHdrs);
    }
}

// Delete Album
export async function handleDeleteAlbum(req: Request, env: any, corsHdrs: Headers, id: string) {
    try {
        const claims = await requireJWT(req, env);
        await env.DB.prepare("DELETE FROM albums WHERE id = ? AND tenant_id = ?").bind(id, claims.tenantId).run();
        return json({ success: true }, 200, corsHdrs);
    } catch (err: any) {
        console.error('Delete album error:', err);
        const status = err.message === "Unauthorized" ? 401 : 500;
        return json({ success: false, error: "Failed to delete album" }, status, corsHdrs);
    }
}

// List Photos in Album
export async function handleListPhotos(req: Request, env: any, corsHdrs: Headers, albumId?: string) {
    try {
        const claims = await requireJWT(req, env);

        let query = "SELECT * FROM photos WHERE tenant_id = ?";
        const params: any[] = [claims.tenantId];

        if (albumId) {
            query += " AND album_id = ?";
            params.push(albumId);
        }

        query += " ORDER BY uploaded_at DESC";

        const { results } = await env.DB.prepare(query).bind(...params).all();

        const photos = (results || []).map((r: any) => ({
            id: r.id,
            uri: r.url,
            albumId: r.album_id,
            uploadedBy: r.uploaded_by || 'Unknown',
            uploadedAt: r.uploaded_at,
            caption: r.caption,
            tags: r.tags ? JSON.parse(r.tags) : []
        }));

        return json({ success: true, data: photos }, 200, corsHdrs);
    } catch (err: any) {
        console.error('List photos error:', err);
        const status = err.message === "Unauthorized" ? 401 : 500;
        return json({ success: false, error: "Failed to list photos" }, status, corsHdrs);
    }
}

// Get Single Photo
export async function handleGetPhoto(req: Request, env: any, corsHdrs: Headers, id: string) {
    try {
        const claims = await requireJWT(req, env);
        const photo = await env.DB.prepare("SELECT * FROM photos WHERE id = ? AND tenant_id = ?").bind(id, claims.tenantId).first();
        if (!photo) return json({ success: false, error: "Photo not found" }, 404, corsHdrs);

        return json({
            success: true, data: {
                id: photo.id,
                uri: photo.url,
                albumId: photo.album_id,
                uploadedBy: photo.uploaded_by,
                uploadedAt: photo.uploaded_at,
                caption: photo.caption,
                tags: photo.tags ? JSON.parse(photo.tags) : []
            }
        }, 200, corsHdrs);
    } catch (err: any) {
        console.error('Get photo error:', err);
        const status = err.message === "Unauthorized" ? 401 : 500;
        return json({ success: false, error: "Failed to get photo" }, status, corsHdrs);
    }
}

// Upload Photo: stores the image in R2 and records it against the album
export async function handlePhotoUpload(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        const formData = await req.formData();
        const { file, ext } = validateImage(formData.get('file'));
        const caption = (formData.get('caption') as string | null)?.slice(0, 500) || null;
        const albumId = (formData.get('albumId') as string | null) || null;
        const tagsStr = formData.get('tags') as string | null;
        let tags: string[] = [];
        if (tagsStr) {
            try {
                const parsed = JSON.parse(tagsStr);
                tags = Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string').slice(0, 20) : [];
            } catch {
                return json({ success: false, error: "tags must be a JSON array of strings" }, 400, corsHdrs);
            }
        }

        if (albumId) {
            const album = await env.DB.prepare("SELECT id FROM albums WHERE id = ? AND tenant_id = ?")
                .bind(albumId, claims.tenantId).first();
            if (!album) {
                return json({ success: false, error: "Album not found" }, 404, corsHdrs);
            }
        }

        const id = crypto.randomUUID();
        const key = `gallery/${claims.tenantId}/${id}.${ext}`;
        await putMedia(env, key, await file.arrayBuffer(), file.type);
        const url = mediaUrl(env, req.url, key);

        try {
            await env.DB.prepare(
                `INSERT INTO photos (id, tenant_id, album_id, url, uploaded_by, caption, tags)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`
            ).bind(
                id, claims.tenantId, albumId, url, claims.email || claims.userId || 'User', caption, JSON.stringify(tags)
            ).run();
        } catch (dbErr) {
            // Don't leave an orphaned file behind if the record couldn't be saved
            await deleteMedia(env, key).catch(() => undefined);
            throw dbErr;
        }

        logJSON({ level: 'info', msg: 'gallery_photo_uploaded', tenant: claims.tenantId, id, bytes: file.size });
        return json({ success: true, data: { id, url } }, 201, corsHdrs);
    } catch (err: any) {
        if (err instanceof MediaError) {
            return json({ success: false, error: err.message }, err.status, corsHdrs);
        }
        console.error('Upload photo error:', err);
        const status = err.message === "Unauthorized" ? 401 : 500;
        return json({ success: false, error: "Failed to upload photo" }, status, corsHdrs);
    }
}

// Delete Photo
export async function handleDeletePhoto(req: Request, env: any, corsHdrs: Headers, id: string) {
    try {
        const claims = await requireJWT(req, env);
        const photo = await env.DB.prepare("SELECT url FROM photos WHERE id = ? AND tenant_id = ?")
            .bind(id, claims.tenantId).first() as { url?: string } | null;
        if (!photo) {
            return json({ success: false, error: "Photo not found" }, 404, corsHdrs);
        }
        await env.DB.prepare("DELETE FROM photos WHERE id = ? AND tenant_id = ?").bind(id, claims.tenantId).run();

        // Remove the stored file too (only ones we own, scoped to this tenant)
        const key = photo.url ? keyFromMediaUrl(env, photo.url) : null;
        if (key && key.startsWith(`gallery/${claims.tenantId}/`)) {
            await deleteMedia(env, key).catch((e) => console.warn('R2 delete failed', key, e));
        }
        return json({ success: true }, 200, corsHdrs);
    } catch (err: any) {
        console.error('Delete photo error:', err);
        const status = err.message === "Unauthorized" ? 401 : 500;
        return json({ success: false, error: "Failed to delete photo" }, status, corsHdrs);
    }
}
