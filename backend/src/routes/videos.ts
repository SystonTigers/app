// routes/videos.ts
// Video upload, processing, and management routes

import { z } from "zod";
import { json } from "../services/util";
import { parse } from "../lib/validate";
import { requireJWT } from "../services/auth";
import type { VideoJob } from "../video-queue-consumer";
import { logJSON } from "../lib/log";
import { fileValidators, getValidationErrorResponse } from "../lib/fileValidation";

// Zod validation schemas
const VideoUploadMetadataSchema = z.object({
  user_id: z.string().optional(),
});

const VideoProcessSchema = z.object({
  // No additional fields needed - videoId comes from URL param, tenant from JWT
});

/**
 * POST /api/v1/videos/upload
 * Upload video from mobile app
 * SECURITY: Requires JWT authentication, tenant extracted from JWT claims
 */
export async function handleVideoUpload(
  req: Request,
  env: any,
  corsHdrs: Headers
): Promise<Response> {
  // Require JWT authentication
  const claims = await requireJWT(req, env);
  const tenant = claims.tenantId;
  const userId = claims.userId || claims.sub || "anonymous";

  if (!tenant) {
    return json(
      { success: false, error: { code: "MISSING_TENANT", message: "Tenant ID not found in JWT" } },
      400,
      corsHdrs
    );
  }

  const formData = await req.formData();
  const videoFile = formData.get("video");

  if (!videoFile || !(videoFile instanceof File)) {
    return json(
      { success: false, error: { code: "MISSING_VIDEO", message: "Video file required" } },
      400,
      corsHdrs
    );
  }

  // SECURITY: Validate file type, size, and signature
  const validationResult = await fileValidators.video(videoFile);
  if (!validationResult.valid) {
    const errorResponse = getValidationErrorResponse(validationResult);
    return json(errorResponse, 400, corsHdrs);
  }

  // Generate video ID
  const videoId = `vid-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  // Store in R2
  const r2Key = `videos/${tenant}/uploads/${videoId}.mp4`;
  const arrayBuffer = await videoFile.arrayBuffer();
  await env.R2_MEDIA.put(r2Key, arrayBuffer, {
    httpMetadata: {
      contentType: "video/mp4",
    },
    customMetadata: {
      tenant: String(tenant),
      userId: String(userId),
      uploadedAt: new Date().toISOString(),
    },
  });

  // Store metadata in KV
  const videoMetadata = {
    id: videoId,
    tenant,
    userId,
    filename: videoFile.name,
    size: videoFile.size,
    r2Key,
    uploadTimestamp: Date.now(),
    status: "queued", // Changed from "uploaded" to "queued"
    processingProgress: 0,
  };

  await env.KV_IDEMP.put(`video:${tenant}:${videoId}`, JSON.stringify(videoMetadata));

  // Add to tenant's video list
  const videoListKey = `video_list:${tenant}`;
  const videoList = ((await env.KV_IDEMP.get(videoListKey, "json")) as string[]) || [];
  videoList.unshift(videoId);
  await env.KV_IDEMP.put(videoListKey, JSON.stringify(videoList.slice(0, 100))); // Keep last 100

  // Enqueue video processing job (NEW - this was the missing piece!)
  if (env.HIGHLIGHTS_QUEUE) {
    const job: VideoJob = {
      videoId,
      tenant: String(tenant),
      r2Key,
      timestamp: Date.now(),
      metadata: {
        filename: videoFile.name,
        size: videoFile.size,
        uploadedBy: String(userId),
      },
    };

    await env.HIGHLIGHTS_QUEUE.send(job);

    logJSON({
      level: "info",
      msg: "Video processing job queued",
      videoId,
      tenant,
      r2Key,
    });
  }

  return json({ success: true, data: { videoId, status: "queued" } }, 200, corsHdrs);
}

/**
 * GET /api/v1/videos
 * List videos for tenant
 * SECURITY: Requires JWT authentication, tenant extracted from JWT claims
 */
export async function handleVideoList(
  req: Request,
  env: any,
  corsHdrs: Headers
): Promise<Response> {
  // Require JWT authentication
  const claims = await requireJWT(req, env);
  const tenant = claims.tenantId;

  if (!tenant) {
    return json(
      { success: false, error: { code: "MISSING_TENANT", message: "Tenant ID not found in JWT" } },
      400,
      corsHdrs
    );
  }

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const offset = parseInt(url.searchParams.get("offset") || "0");

  const videoListKey = `video_list:${tenant}`;
  const videoList = ((await env.KV_IDEMP.get(videoListKey, "json")) as string[]) || [];

  const videoIds = videoList.slice(offset, offset + limit);
  const videos = [];

  for (const videoId of videoIds) {
    const metadata = await env.KV_IDEMP.get(`video:${tenant}:${videoId}`, "json");
    if (metadata) {
      videos.push(metadata);
    }
  }

  return json({ success: true, data: { videos, total: videoList.length } }, 200, corsHdrs);
}

/**
 * GET /api/v1/videos/:id
 * Get video details
 * SECURITY: Requires JWT authentication, tenant extracted from JWT claims
 */
export async function handleVideoGet(
  req: Request,
  env: any,
  corsHdrs: Headers,
  videoId: string
): Promise<Response> {
  // Require JWT authentication
  const claims = await requireJWT(req, env);
  const tenant = claims.tenantId;

  if (!tenant) {
    return json(
      { success: false, error: { code: "MISSING_TENANT", message: "Tenant ID not found in JWT" } },
      400,
      corsHdrs
    );
  }

  const metadata = await env.KV_IDEMP.get(`video:${tenant}:${videoId}`, "json");

  if (!metadata) {
    return json(
      { success: false, error: { code: "VIDEO_NOT_FOUND", message: "Video not found" } },
      404,
      corsHdrs
    );
  }

  return json({ success: true, data: metadata }, 200, corsHdrs);
}

/**
 * GET /api/v1/videos/:id/status
 * Get processing status
 * SECURITY: Requires JWT authentication, tenant extracted from JWT claims
 */
export async function handleVideoStatus(
  req: Request,
  env: any,
  corsHdrs: Headers,
  videoId: string
): Promise<Response> {
  // Require JWT authentication
  const claims = await requireJWT(req, env);
  const tenant = claims.tenantId;

  if (!tenant) {
    return json(
      { success: false, error: { code: "MISSING_TENANT", message: "Tenant ID not found in JWT" } },
      400,
      corsHdrs
    );
  }

  const metadata = (await env.KV_IDEMP.get(`video:${tenant}:${videoId}`, "json")) as any;

  if (!metadata) {
    return json(
      { success: false, error: { code: "VIDEO_NOT_FOUND", message: "Video not found" } },
      404,
      corsHdrs
    );
  }

  return json(
    {
      success: true,
      data: {
        videoId,
        status: metadata.status || "uploaded",
        progress: metadata.processingProgress || 0,
        clips: metadata.clips || [],
        highlightsUrl: metadata.highlightsUrl,
        clipsGenerated: metadata.clipsGenerated || 0,
        processingStarted: metadata.processingStarted,
        processingCompleted: metadata.processingCompleted,
        processingDuration: metadata.processingDuration,
        error: metadata.error,
      },
    },
    200,
    corsHdrs
  );
}

/**
 * POST /api/v1/videos/:id/process
 * Trigger AI processing (manual trigger, usually auto-queued on upload)
 * SECURITY: Requires JWT authentication, tenant extracted from JWT claims
 */
export async function handleVideoProcess(
  req: Request,
  env: any,
  corsHdrs: Headers,
  videoId: string
): Promise<Response> {
  // Require JWT authentication
  const claims = await requireJWT(req, env);
  const tenant = claims.tenantId;

  if (!tenant) {
    return json(
      { success: false, error: { code: "MISSING_TENANT", message: "Tenant ID not found in JWT" } },
      400,
      corsHdrs
    );
  }

  const metadata = (await env.KV_IDEMP.get(`video:${tenant}:${videoId}`, "json")) as any;

  if (!metadata) {
    return json(
      { success: false, error: { code: "VIDEO_NOT_FOUND", message: "Video not found" } },
      404,
      corsHdrs
    );
  }

  // Check if already processing
  if (metadata.status === "processing") {
    return json(
      {
        success: false,
        error: { code: "ALREADY_PROCESSING", message: "Video is already being processed" },
      },
      400,
      corsHdrs
    );
  }

  // Update status to queued
  metadata.status = "queued";
  metadata.processingProgress = 0;
  await env.KV_IDEMP.put(`video:${tenant}:${videoId}`, JSON.stringify(metadata));

  // Enqueue video processing job
  if (env.HIGHLIGHTS_QUEUE) {
    const job: VideoJob = {
      videoId,
      tenant: String(tenant),
      r2Key: metadata.r2Key,
      timestamp: Date.now(),
      metadata: {
        filename: metadata.filename,
        size: metadata.size,
        uploadedBy: metadata.userId,
      },
    };

    await env.HIGHLIGHTS_QUEUE.send(job);

    logJSON({
      level: "info",
      msg: "Video processing job queued (manual trigger)",
      videoId,
      tenant,
      r2Key: metadata.r2Key,
    });
  }

  return json({ success: true, data: { videoId, status: "queued" } }, 200, corsHdrs);
}

/**
 * DELETE /api/v1/videos/:id
 * Delete video
 * SECURITY: Requires JWT authentication, tenant extracted from JWT claims
 */
export async function handleVideoDelete(
  req: Request,
  env: any,
  corsHdrs: Headers,
  videoId: string
): Promise<Response> {
  // Require JWT authentication
  const claims = await requireJWT(req, env);
  const tenant = claims.tenantId;

  if (!tenant) {
    return json(
      { success: false, error: { code: "MISSING_TENANT", message: "Tenant ID not found in JWT" } },
      400,
      corsHdrs
    );
  }

  const metadata = (await env.KV_IDEMP.get(`video:${tenant}:${videoId}`, "json")) as any;

  if (!metadata) {
    return json(
      { success: false, error: { code: "VIDEO_NOT_FOUND", message: "Video not found" } },
      404,
      corsHdrs
    );
  }

  // Delete from R2
  await env.R2_MEDIA.delete(metadata.r2Key);

  // Delete metadata
  await env.KV_IDEMP.delete(`video:${tenant}:${videoId}`);

  // Remove from video list
  const videoListKey = `video_list:${tenant}`;
  const videoList = ((await env.KV_IDEMP.get(videoListKey, "json")) as string[]) || [];
  const updatedList = videoList.filter((id) => id !== videoId);
  await env.KV_IDEMP.put(videoListKey, JSON.stringify(updatedList));

  return json({ success: true, data: { deleted: true } }, 200, corsHdrs);
}

/**
 * GET /api/v1/videos/:id/clips
 * List generated clips
 * SECURITY: Requires JWT authentication, tenant extracted from JWT claims
 */
export async function handleVideoClips(
  req: Request,
  env: any,
  corsHdrs: Headers,
  videoId: string
): Promise<Response> {
  // Require JWT authentication
  const claims = await requireJWT(req, env);
  const tenant = claims.tenantId;

  if (!tenant) {
    return json(
      { success: false, error: { code: "MISSING_TENANT", message: "Tenant ID not found in JWT" } },
      400,
      corsHdrs
    );
  }

  const metadata = (await env.KV_IDEMP.get(`video:${tenant}:${videoId}`, "json")) as any;

  if (!metadata) {
    return json(
      { success: false, error: { code: "VIDEO_NOT_FOUND", message: "Video not found" } },
      404,
      corsHdrs
    );
  }

  return json({ success: true, data: { clips: metadata.clips || [] } }, 200, corsHdrs);
}
