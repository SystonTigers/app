/**
 * Club gallery: albums of photos for match days, training, days out and
 * throwbacks. Members only (signed in to the club); staff add albums and
 * photos and remove them (removing an album removes its photos and files).
 *
 *   GET    /api/v1/gallery/albums            albums, newest first, with a cover and count
 *   POST   /api/v1/gallery/albums            staff: { title, date?, type? }
 *   PUT    /api/v1/gallery/albums/:id        staff: rename, change date or type
 *   DELETE /api/v1/gallery/albums/:id        staff: the album, its photos and their files
 *   GET    /api/v1/gallery/photos?albumId=   photos (one album, or all)
 *   POST   /api/v1/gallery/upload            staff: multipart file + albumId (+ caption, tags)
 *   DELETE /api/v1/gallery/photos/:id        staff: one photo and its file
 */
import { json } from "../services/util";
import { logJSON } from "../lib/log";
import { getSessionFromRequest } from "../middleware/permissions";
import { MediaError, deleteMedia, keyFromMediaUrl, mediaUrl, putMedia, validateImage } from "../services/media";

type Session = NonNullable<Awaited<ReturnType<typeof getSessionFromRequest>>>;

export const ALBUM_TYPES = ["match", "training", "social", "throwback"] as const;
type AlbumType = (typeof ALBUM_TYPES)[number];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

async function requireSession(req: Request, env: any): Promise<Session> {
    const session = await getSessionFromRequest(req, env);
    if (!session) throw new Error("Unauthorized");
    return session;
}

const CODES: Record<number, string> = { 400: "INVALID", 401: "UNAUTHORIZED", 403: "FORBIDDEN", 404: "NOT_FOUND", 413: "TOO_LARGE" };

function fail(corsHdrs: Headers, status: number, message: string): Response {
    return json({ success: false, error: { code: CODES[status] ?? "INTERNAL", message } }, status, corsHdrs);
}

function failure(err: unknown, corsHdrs: Headers, message: string): Response {
    if (err instanceof MediaError) return fail(corsHdrs, err.status, err.message);
    if (err instanceof Error && err.message === "Unauthorized") return fail(corsHdrs, 401, "Please log in again.");
    console.error(message, err);
    return fail(corsHdrs, 500, message);
}

/** Checks an album from the app; partial for updates. */
export function parseAlbum(body: Record<string, unknown>, partial: boolean, today = new Date()): { title?: string; date?: string; type?: AlbumType } | string {
    const out: { title?: string; date?: string; type?: AlbumType } = {};
    if (body.title !== undefined || !partial) {
        const title = typeof body.title === "string" ? body.title.trim().replace(/\s+/g, " ") : "";
        if (!title) return "Give the album a name.";
        if (title.length > 80) return "Keep the album name under 80 characters.";
        out.title = title;
    }
    if (body.date !== undefined || !partial) {
        const date = typeof body.date === "string" && body.date.trim() ? body.date.trim().slice(0, 10) : today.toISOString().slice(0, 10);
        if (!DATE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return "Enter the album date as YYYY-MM-DD.";
        out.date = date;
    }
    if (body.type !== undefined || !partial) {
        const type = typeof body.type === "string" ? body.type : "social";
        if (!(ALBUM_TYPES as readonly string[]).includes(type)) return "Choose match, training, days out or throwback.";
        out.type = type as AlbumType;
    }
    return out;
}

/** Who added a photo, without ever showing an email address to other members. */
function uploaderName(row: { uploaded_by?: string | null; profile?: string | null }): string {
    try {
        const name = row.profile ? (JSON.parse(row.profile)?.name as unknown) : null;
        if (typeof name === "string" && name.trim()) return name.trim().slice(0, 60);
    } catch {
        // Fall through to the generic name
    }
    return "Club staff";
}

function albumRow(r: any) {
    return {
        id: r.id,
        title: r.title,
        date: r.event_date,
        coverPhoto: r.cover_photo_url || r.latest_photo || null,
        photoCount: Number(r.photo_count) || 0,
        type: r.type,
    };
}

const ALBUM_SELECT = `
    SELECT a.*,
      (SELECT COUNT(*) FROM photos p WHERE p.album_id = a.id AND p.tenant_id = a.tenant_id) AS photo_count,
      (SELECT p.url FROM photos p WHERE p.album_id = a.id AND p.tenant_id = a.tenant_id ORDER BY p.uploaded_at DESC LIMIT 1) AS latest_photo
    FROM albums a`;

export async function handleListAlbums(req: Request, env: any, corsHdrs: Headers) {
    try {
        const { tenantId } = await requireSession(req, env);
        const { results } = await env.DB.prepare(`${ALBUM_SELECT} WHERE a.tenant_id = ? ORDER BY a.event_date DESC, a.created_at DESC`).bind(tenantId).all();
        return json({ success: true, data: (results || []).map(albumRow) }, 200, corsHdrs);
    } catch (err) {
        return failure(err, corsHdrs, "Failed to list albums");
    }
}

export async function handleCreateAlbum(req: Request, env: any, corsHdrs: Headers) {
    try {
        const { tenantId } = await requireSession(req, env);
        const body = await req.json().catch(() => null);
        if (!body || typeof body !== "object") return fail(corsHdrs, 400, "Send the album as JSON.");
        const album = parseAlbum(body as Record<string, unknown>, false);
        if (typeof album === "string") return fail(corsHdrs, 400, album);
        const id = crypto.randomUUID();
        await env.DB.prepare(`INSERT INTO albums (id, tenant_id, title, event_date, cover_photo_url, type) VALUES (?, ?, ?, ?, NULL, ?)`)
            .bind(id, tenantId, album.title, album.date, album.type).run();
        logJSON({ level: "info", msg: "gallery_album_created", tenant: tenantId, id });
        return json({ success: true, data: { id, title: album.title, date: album.date, type: album.type, coverPhoto: null, photoCount: 0 } }, 201, corsHdrs);
    } catch (err) {
        return failure(err, corsHdrs, "Failed to create album");
    }
}

export async function handleUpdateAlbum(req: Request, env: any, corsHdrs: Headers, id: string) {
    try {
        const { tenantId } = await requireSession(req, env);
        const body = await req.json().catch(() => null);
        if (!body || typeof body !== "object") return fail(corsHdrs, 400, "Send the changes as JSON.");
        const changes = parseAlbum(body as Record<string, unknown>, true);
        if (typeof changes === "string") return fail(corsHdrs, 400, changes);
        const res = await env.DB.prepare(
            `UPDATE albums SET title = COALESCE(?, title), event_date = COALESCE(?, event_date), type = COALESCE(?, type) WHERE id = ? AND tenant_id = ?`,
        ).bind(changes.title ?? null, changes.date ?? null, changes.type ?? null, id, tenantId).run();
        if (!res.meta?.changes) return fail(corsHdrs, 404, "Album not found");
        const row = await env.DB.prepare(`${ALBUM_SELECT} WHERE a.id = ? AND a.tenant_id = ?`).bind(id, tenantId).first();
        return json({ success: true, data: albumRow(row) }, 200, corsHdrs);
    } catch (err) {
        return failure(err, corsHdrs, "Failed to update album");
    }
}

/** Removes the stored file behind a photo (only files we own, in this club's folder). */
async function removeFile(env: any, tenantId: string, url: string | null | undefined): Promise<void> {
    const key = url ? keyFromMediaUrl(env, url) : null;
    if (key && key.startsWith(`gallery/${tenantId}/`)) {
        await deleteMedia(env, key).catch((e) => console.warn("R2 delete failed", key, e));
    }
}

export async function handleDeleteAlbum(req: Request, env: any, corsHdrs: Headers, id: string) {
    try {
        const { tenantId } = await requireSession(req, env);
        const album = await env.DB.prepare("SELECT id FROM albums WHERE id = ? AND tenant_id = ?").bind(id, tenantId).first();
        if (!album) return fail(corsHdrs, 404, "Album not found");
        const { results } = await env.DB.prepare("SELECT url FROM photos WHERE album_id = ? AND tenant_id = ?").bind(id, tenantId).all();
        await env.DB.batch([
            env.DB.prepare("DELETE FROM photos WHERE album_id = ? AND tenant_id = ?").bind(id, tenantId),
            env.DB.prepare("DELETE FROM albums WHERE id = ? AND tenant_id = ?").bind(id, tenantId),
        ]);
        // Files go after the records, so a failure never leaves a photo pointing at nothing
        for (const row of (results || []) as Array<{ url?: string }>) await removeFile(env, tenantId, row.url);
        logJSON({ level: "info", msg: "gallery_album_deleted", tenant: tenantId, id, photos: (results || []).length });
        return json({ success: true, data: { photosRemoved: (results || []).length } }, 200, corsHdrs);
    } catch (err) {
        return failure(err, corsHdrs, "Failed to delete album");
    }
}

function photoRow(r: any) {
    return {
        id: r.id,
        uri: r.url,
        albumId: r.album_id,
        uploadedBy: uploaderName(r),
        uploadedAt: r.uploaded_at,
        caption: r.caption,
        tags: (() => {
            try { return r.tags ? JSON.parse(r.tags) : []; } catch { return []; }
        })(),
    };
}

const PHOTO_SELECT = `SELECT p.*, u.profile FROM photos p LEFT JOIN auth_users u ON u.id = p.uploaded_by AND u.tenant_id = p.tenant_id`;

export async function handleListPhotos(req: Request, env: any, corsHdrs: Headers, albumId?: string) {
    try {
        const { tenantId } = await requireSession(req, env);
        const params: string[] = [tenantId];
        let where = "p.tenant_id = ?";
        if (albumId) {
            where += " AND p.album_id = ?";
            params.push(albumId);
        }
        const { results } = await env.DB.prepare(`${PHOTO_SELECT} WHERE ${where} ORDER BY p.uploaded_at DESC LIMIT 500`).bind(...params).all();
        return json({ success: true, data: (results || []).map(photoRow) }, 200, corsHdrs);
    } catch (err) {
        return failure(err, corsHdrs, "Failed to list photos");
    }
}

export async function handleGetPhoto(req: Request, env: any, corsHdrs: Headers, id: string) {
    try {
        const { tenantId } = await requireSession(req, env);
        const photo = await env.DB.prepare(`${PHOTO_SELECT} WHERE p.id = ? AND p.tenant_id = ?`).bind(id, tenantId).first();
        if (!photo) return fail(corsHdrs, 404, "Photo not found");
        return json({ success: true, data: photoRow(photo) }, 200, corsHdrs);
    } catch (err) {
        return failure(err, corsHdrs, "Failed to get photo");
    }
}

/** Stores the image in R2 and records it against the album. */
export async function handlePhotoUpload(req: Request, env: any, corsHdrs: Headers) {
    try {
        const session = await requireSession(req, env);
        const tenantId = session.tenantId;
        const formData = await req.formData().catch(() => null);
        if (!formData) return fail(corsHdrs, 400, "Send the photo as a file upload.");
        const { file, ext } = validateImage(formData.get("file"));
        const caption = (formData.get("caption") as string | null)?.trim().slice(0, 500) || null;
        const albumId = (formData.get("albumId") as string | null) || null;
        const tagsStr = formData.get("tags") as string | null;
        let tags: string[] = [];
        if (tagsStr) {
            try {
                const parsed = JSON.parse(tagsStr);
                tags = Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string").map((t) => t.slice(0, 40)).slice(0, 20) : [];
            } catch {
                return fail(corsHdrs, 400, "tags must be a JSON array of strings");
            }
        }
        if (!albumId) return fail(corsHdrs, 400, "Choose an album for the photo.");
        const album = await env.DB.prepare("SELECT id FROM albums WHERE id = ? AND tenant_id = ?").bind(albumId, tenantId).first();
        if (!album) return fail(corsHdrs, 404, "Album not found");

        const id = crypto.randomUUID();
        const key = `gallery/${tenantId}/${id}.${ext}`;
        await putMedia(env, key, await file.arrayBuffer(), file.type);
        const url = mediaUrl(env, req.url, key);
        try {
            // uploaded_by is the account id; names are looked up when listing, emails are never shown
            await env.DB.prepare(
                `INSERT INTO photos (id, tenant_id, album_id, url, uploaded_by, caption, tags, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            ).bind(id, tenantId, albumId, url, session.userId || null, caption, JSON.stringify(tags), new Date().toISOString()).run();
        } catch (dbErr) {
            await deleteMedia(env, key).catch(() => undefined);
            throw dbErr;
        }
        logJSON({ level: "info", msg: "gallery_photo_uploaded", tenant: tenantId, id, bytes: file.size });
        return json({ success: true, data: { id, url } }, 201, corsHdrs);
    } catch (err) {
        return failure(err, corsHdrs, "Failed to upload photo");
    }
}

export async function handleDeletePhoto(req: Request, env: any, corsHdrs: Headers, id: string) {
    try {
        const { tenantId } = await requireSession(req, env);
        const photo = await env.DB.prepare("SELECT url FROM photos WHERE id = ? AND tenant_id = ?").bind(id, tenantId).first() as { url?: string } | null;
        if (!photo) return fail(corsHdrs, 404, "Photo not found");
        await env.DB.prepare("DELETE FROM photos WHERE id = ? AND tenant_id = ?").bind(id, tenantId).run();
        await removeFile(env, tenantId, photo.url);
        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        return failure(err, corsHdrs, "Failed to delete photo");
    }
}
