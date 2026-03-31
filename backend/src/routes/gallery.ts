import { json } from "../services/util";
import { logJSON } from "../lib/log";
import { getSessionFromRequest } from "../middleware/permissions";

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

// Upload Photo (renamed to match index.ts)
export async function handlePhotoUpload(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        // Handle FormData
        const formData = await req.formData();
        const file = formData.get('file');
        const caption = formData.get('caption') as string;
        const albumId = formData.get('albumId') as string;
        const tagsStr = formData.get('tags') as string;
        const tags = tagsStr ? JSON.parse(tagsStr) : [];

        // Mock upload - in real app, copy 'file' to R2/S3
        const id = crypto.randomUUID();
        const placeholderUrl = `https://picsum.photos/seed/${id}/800/600`;

        await env.DB.prepare(
            `INSERT INTO photos (id, tenant_id, album_id, url, uploaded_by, caption, tags)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            id, claims.tenantId, albumId, placeholderUrl, claims.email || 'User', caption, JSON.stringify(tags)
        ).run();

        return json({ success: true, data: { id, url: placeholderUrl } }, 201, corsHdrs);
    } catch (err: any) {
        console.error('Upload photo error:', err);
        const status = err.message === "Unauthorized" ? 401 : 500;
        return json({ success: false, error: "Failed to upload photo" }, status, corsHdrs);
    }
}

// Delete Photo
export async function handleDeletePhoto(req: Request, env: any, corsHdrs: Headers, id: string) {
    try {
        const claims = await requireJWT(req, env);
        await env.DB.prepare("DELETE FROM photos WHERE id = ? AND tenant_id = ?").bind(id, claims.tenantId).run();
        return json({ success: true }, 200, corsHdrs);
    } catch (err: any) {
        console.error('Delete photo error:', err);
        const status = err.message === "Unauthorized" ? 401 : 500;
        return json({ success: false, error: "Failed to delete photo" }, status, corsHdrs);
    }
}
