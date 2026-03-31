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
export async function handleVideoUpload(req: Request, env: any, corsHdrs: Headers) {
  try {
    const claims = await requireJWT(req, env);
    const body = await req.json() as any;

    const id = crypto.randomUUID();

    await env.DB.prepare(
      `INSERT INTO videos (id, tenant_id, match_id, title, description, thumbnail_url, video_url, youtube_url, duration, type)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, claims.tenantId, body.matchId, body.title, body.description,
      body.thumbnailUrl, body.videoUrl, body.youtubeUrl, body.duration || 0, body.type || 'highlights'
    ).run();

    return json({ success: true, data: { id, ...body } }, 200, corsHdrs);
  } catch (err: any) {
    console.error('Create video error:', err);
    const status = err.message === "Unauthorized" ? 401 : 500;
    return json({ success: false, error: "Failed to create video" }, status, corsHdrs);
  }
}

// Delete video (Legacy name: handleVideoDelete)
export async function handleVideoDelete(req: Request, env: any, corsHdrs: Headers, id: string) {
  try {
    const claims = await requireJWT(req, env);

    await env.DB.prepare(
      "DELETE FROM videos WHERE id = ? AND tenant_id = ?"
    ).bind(id, claims.tenantId).run();

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

export async function handleVideoStream(req: Request, env: any, corsHdrs: Headers, id: string) {
  return json({ success: false, error: "Not implemented" }, 501, corsHdrs);
}

// Alias handleCreateVideo to handleVideoUpload for any other usages
export const handleCreateVideo = handleVideoUpload;
