import { json } from "../services/util";
import { logJSON } from "../lib/log";
import { getSessionFromRequest } from "../middleware/permissions";
import { MediaError, deleteMedia, keyFromMediaUrl, mediaUrl, putMedia, validateVideo } from "../services/media";

async function requireJWT(req: Request, env: any) {
  const session = await getSessionFromRequest(req, env);
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

// List videos (Legacy name: handleVideoList)
export async function handleVideoList(req: Request, env: any, corsHdrs: Headers) {
  try {
    const claims = await requireJWT(req, env);
    const url = new URL(req.url);
    const matchId = url.searchParams.get("matchId");
    const type = url.searchParams.get("type");

    let query = "SELECT * FROM videos WHERE tenant_id = ?";
    const params: any[] = [claims.tenantId];

    if (matchId) {
      query += " AND match_id = ?";
      params.push(matchId);
    }

    if (type) {
      query += " AND type = ?";
      params.push(type);
    }

    query += " ORDER BY uploaded_at DESC";

    const { results } = await env.DB.prepare(query).bind(...params).all();

    return json({ success: true, data: results }, 200, corsHdrs);
  } catch (err: any) {
    console.error('List videos error:', err);
    const status = err.message === "Unauthorized" ? 401 : 500;
    return json({ success: false, error: "Failed to list videos" }, status, corsHdrs);
  }
}

// Get video (Legacy name: handleVideoGet)
export async function handleVideoGet(req: Request, env: any, corsHdrs: Headers, id: string) {
  try {
    const claims = await requireJWT(req, env);

    const video = await env.DB.prepare(
      "SELECT * FROM videos WHERE id = ? AND tenant_id = ?"
    ).bind(id, claims.tenantId).first();

    if (!video) {
      return json({ success: false, error: "Video not found" }, 404, corsHdrs);
    }

    return json({ success: true, data: video }, 200, corsHdrs);
  } catch (err: any) {
    console.error('Get video error:', err);
    const status = err.message === "Unauthorized" ? 401 : 500;
    return json({ success: false, error: "Failed to get video" }, status, corsHdrs);
  }
}

// Upload video (Legacy name: handleVideoUpload)
//
// Two forms:
//  - multipart/form-data with a `video` (or `file`) field: the mobile app's
//    record/select flow. The file is stored in R2 and served via /api/v1/media.
//    Optional fields: title, description, matchId, type.
//  - JSON { title, videoUrl | youtubeUrl, ... }: register an existing link.
export async function handleVideoUpload(req: Request, env: any, corsHdrs: Headers) {
  try {
    const claims = await requireJWT(req, env);
    const id = crypto.randomUUID();
    const contentType = req.headers.get("Content-Type") || "";

    let row: {
      matchId: string | null; title: string; description: string | null; thumbnailUrl: string | null;
      videoUrl: string; youtubeUrl: string | null; duration: number; type: string;
    };

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const { file, ext } = validateVideo(form.get("video") ?? form.get("file"));
      const key = `videos/${claims.tenantId}/${id}.${ext}`;
      // R2 needs a stream of known length; FixedLengthStream avoids buffering up to 100 MB in memory
      const body = typeof FixedLengthStream !== "undefined"
        ? file.stream().pipeThrough(new FixedLengthStream(file.size))
        : await file.arrayBuffer();
      await putMedia(env, key, body, file.type);

      const field = (name: string) => {
        const v = form.get(name);
        return typeof v === "string" && v.trim() ? v.trim() : null;
      };
      row = {
        matchId: field("matchId"),
        title: field("title") || `Clip ${new Date().toISOString().slice(0, 10)}`,
        description: field("description"),
        thumbnailUrl: null,
        videoUrl: mediaUrl(env, req.url, key),
        youtubeUrl: null,
        duration: 0,
        type: field("type") || "highlights",
      };
    } else {
      const body = await req.json().catch(() => null) as Record<string, unknown> | null;
      const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
      const title = str(body?.title);
      const videoUrl = str(body?.videoUrl) || str(body?.youtubeUrl);
      if (!title || !videoUrl) {
        return json({ success: false, error: "title and videoUrl (or youtubeUrl) are required" }, 400, corsHdrs);
      }
      row = {
        matchId: str(body?.matchId),
        title,
        description: str(body?.description),
        thumbnailUrl: str(body?.thumbnailUrl),
        videoUrl,
        youtubeUrl: str(body?.youtubeUrl),
        duration: Number(body?.duration) || 0,
        type: str(body?.type) || "highlights",
      };
    }

    await env.DB.prepare(
      `INSERT INTO videos (id, tenant_id, match_id, title, description, thumbnail_url, video_url, youtube_url, duration, type)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, claims.tenantId, row.matchId, row.title, row.description,
      row.thumbnailUrl, row.videoUrl, row.youtubeUrl, row.duration, row.type
    ).run();

    logJSON({ level: "info", msg: "video_created", tenant: claims.tenantId, videoId: id });
    return json({ success: true, data: { id, videoId: id, ...row } }, 201, corsHdrs);
  } catch (err: any) {
    if (err instanceof MediaError) {
      return json({ success: false, error: err.message }, err.status, corsHdrs);
    }
    console.error('Create video error:', err);
    const status = err.message === "Unauthorized" ? 401 : 500;
    return json({ success: false, error: "Failed to create video" }, status, corsHdrs);
  }
}

// Delete video (Legacy name: handleVideoDelete)
export async function handleVideoDelete(req: Request, env: any, corsHdrs: Headers, id: string) {
  try {
    const claims = await requireJWT(req, env);

    const video = await env.DB.prepare(
      "SELECT video_url FROM videos WHERE id = ? AND tenant_id = ?"
    ).bind(id, claims.tenantId).first() as { video_url?: string } | null;
    if (!video) {
      return json({ success: false, error: "Video not found" }, 404, corsHdrs);
    }

    await env.DB.prepare(
      "DELETE FROM videos WHERE id = ? AND tenant_id = ?"
    ).bind(id, claims.tenantId).run();

    // Remove the uploaded file too (links to YouTube etc. aren't ours to delete)
    const key = video.video_url ? keyFromMediaUrl(env, video.video_url) : null;
    if (key && key.startsWith(`videos/${claims.tenantId}/`)) {
      await deleteMedia(env, key).catch((e: unknown) => console.warn("Video file delete failed", e));
    }

    return json({ success: true }, 200, corsHdrs);
  } catch (err: any) {
    console.error('Delete video error:', err);
    const status = err.message === "Unauthorized" ? 401 : 500;
    return json({ success: false, error: "Failed to delete video" }, status, corsHdrs);
  }
}

// Stubs for other legacy handlers
export async function handleVideoStatus(req: Request, env: any, corsHdrs: Headers, id: string) {
  return json({ success: true, status: 'ready' }, 200, corsHdrs);
}

export async function handleVideoProcess(req: Request, env: any, corsHdrs: Headers, id: string) {
  return json({ success: true, message: 'Processing started' }, 200, corsHdrs);
}

export async function handleVideoClips(req: Request, env: any, corsHdrs: Headers, id: string) {
  return json({ success: true, clips: [] }, 200, corsHdrs);
}

// Redirect to the playable file (R2 media URL or external link)
export async function handleVideoStream(req: Request, env: any, corsHdrs: Headers, id: string) {
  try {
    const claims = await requireJWT(req, env);
    const video = await env.DB.prepare(
      "SELECT video_url FROM videos WHERE id = ? AND tenant_id = ?"
    ).bind(id, claims.tenantId).first() as { video_url?: string } | null;
    if (!video?.video_url) {
      return json({ success: false, error: "Video not found" }, 404, corsHdrs);
    }
    const headers = new Headers(corsHdrs);
    headers.set("Location", video.video_url);
    return new Response(null, { status: 302, headers });
  } catch (err: any) {
    const status = err.message === "Unauthorized" ? 401 : 500;
    return json({ success: false, error: "Failed to stream video" }, status, corsHdrs);
  }
}

// Alias handleCreateVideo to handleVideoUpload for any other usages
export const handleCreateVideo = handleVideoUpload;
