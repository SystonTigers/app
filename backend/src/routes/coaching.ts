// routes/coaching.ts
// AI-powered coaching analysis and training drill generation routes

import { z } from "zod";
import { json } from "../services/util";
import { parse } from "../lib/validate";
import { requireJWT } from "../services/auth";
import { logJSON } from "../lib/log";

// Zod validation schemas
const AnalyzeMistakesSchema = z.object({
  team_name: z.string().min(1),
  opponent_name: z.string().min(1),
  goals_conceded: z.number().optional(),
  final_score: z.string().optional(),
});

const GenerateDrillsSchema = z.object({
  mistake_clip_ids: z.array(z.string()).optional(),
  mistake_data: z.array(z.any()).optional(), // Mistake objects
  num_drills: z.number().min(1).max(10).default(3),
  age_group: z.string().default("Adult"),
  skill_level: z.enum(["Beginner", "Intermediate", "Advanced"]).default("Intermediate"),
});

const GenerateSessionSchema = z.object({
  mistakes: z.array(z.any()), // Array of mistake objects
  session_duration: z.number().min(30).max(120).default(60),
  age_group: z.string().default("Adult"),
  skill_level: z.enum(["Beginner", "Intermediate", "Advanced"]).default("Intermediate"),
  focus_categories: z.array(z.string()).optional(),
});

const SaveTrainingSessionSchema = z.object({
  name: z.string().min(1),
  match_id: z.string().optional(),
  session_plan: z.any(), // Full session plan object
  notes: z.string().optional(),
  scheduled_date: z.string().optional(),
});

/**
 * POST /api/v1/videos/:id/analyze-mistakes
 * Trigger AI mistake detection on uploaded video
 * SECURITY: Requires JWT authentication
 */
export async function handleAnalyzeMistakes(
  req: Request,
  env: any,
  corsHdrs: Headers,
  videoId: string
): Promise<Response> {
  const claims = await requireJWT(req, env);
  const tenant = claims.tenantId;

  if (!tenant) {
    return json(
      { success: false, error: { code: "MISSING_TENANT", message: "Tenant not found" } },
      400,
      corsHdrs
    );
  }

  // Get video metadata
  const videoMetadata = await env.KV_IDEMP.get(`video:${tenant}:${videoId}`, "json");
  if (!videoMetadata) {
    return json(
      { success: false, error: { code: "VIDEO_NOT_FOUND", message: "Video not found" } },
      404,
      corsHdrs
    );
  }

  // Parse request body
  const body = await req.json();
  const validated = parse(AnalyzeMistakesSchema, body);
  if (!validated.success) {
    return json(
      { success: false, error: { code: "VALIDATION_ERROR", message: validated.error } },
      400,
      corsHdrs
    );
  }

  const { team_name, opponent_name, goals_conceded, final_score } = validated.data;

  // Create coaching analysis job
  const jobId = `coaching-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  const coachingJob = {
    id: jobId,
    type: "mistake_analysis",
    videoId,
    tenant,
    team_name,
    opponent_name,
    context: {
      goals_conceded,
      final_score,
    },
    status: "queued",
    createdAt: Date.now(),
  };

  // Store job metadata
  await env.KV_IDEMP.put(`coaching_job:${tenant}:${jobId}`, JSON.stringify(coachingJob));

  // Queue the job (we'll use the HIGHLIGHTS_QUEUE for now)
  // In production, you might want a separate COACHING_QUEUE
  try {
    await env.HIGHLIGHTS_QUEUE.send({
      type: "coaching_analysis",
      jobId,
      videoId,
      tenant,
      team_name,
      opponent_name,
      context: {
        goals_conceded,
        final_score,
      },
      r2Key: (videoMetadata as any).r2Key,
    });

    logJSON({
      level: "info",
      message: "Coaching analysis job queued",
      jobId,
      videoId,
      tenant,
    });

    return json(
      {
        success: true,
        data: {
          job_id: jobId,
          status: "queued",
          message: "AI coaching analysis started. Check status with /api/v1/videos/:id/mistakes",
        },
      },
      200,
      corsHdrs
    );
  } catch (error) {
    logJSON({
      level: "error",
      message: "Failed to queue coaching analysis",
      error: String(error),
      jobId,
    });

    return json(
      { success: false, error: { code: "QUEUE_ERROR", message: "Failed to queue analysis" } },
      500,
      corsHdrs
    );
  }
}

/**
 * GET /api/v1/videos/:id/mistakes
 * Get detected mistakes for a video
 * SECURITY: Requires JWT authentication
 */
export async function handleGetMistakes(
  req: Request,
  env: any,
  corsHdrs: Headers,
  videoId: string
): Promise<Response> {
  const claims = await requireJWT(req, env);
  const tenant = claims.tenantId;

  if (!tenant) {
    return json(
      { success: false, error: { code: "MISSING_TENANT", message: "Tenant not found" } },
      400,
      corsHdrs
    );
  }

  // Get mistakes from KV
  const mistakesKey = `mistakes:${tenant}:${videoId}`;
  const mistakesData = await env.KV_IDEMP.get(mistakesKey, "json");

  if (!mistakesData) {
    return json(
      {
        success: true,
        data: {
          video_id: videoId,
          mistakes: [],
          status: "not_analyzed",
          message: "No analysis found. Trigger analysis with POST /api/v1/videos/:id/analyze-mistakes",
        },
      },
      200,
      corsHdrs
    );
  }

  return json(
    {
      success: true,
      data: mistakesData,
    },
    200,
    corsHdrs
  );
}

/**
 * POST /api/v1/coaching/generate-drills
 * Generate training drills from mistakes
 * SECURITY: Requires JWT authentication
 */
export async function handleGenerateDrills(
  req: Request,
  env: any,
  corsHdrs: Headers
): Promise<Response> {
  const claims = await requireJWT(req, env);
  const tenant = claims.tenantId;

  if (!tenant) {
    return json(
      { success: false, error: { code: "MISSING_TENANT", message: "Tenant not found" } },
      400,
      corsHdrs
    );
  }

  // Parse request body
  const body = await req.json();
  const validated = parse(GenerateDrillsSchema, body);
  if (!validated.success) {
    return json(
      { success: false, error: { code: "VALIDATION_ERROR", message: validated.error } },
      400,
      corsHdrs
    );
  }

  const { mistake_clip_ids, mistake_data, num_drills, age_group, skill_level } = validated.data;

  // Create drill generation job
  const jobId = `drills-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  const drillJob = {
    id: jobId,
    type: "drill_generation",
    tenant,
    mistake_clip_ids,
    mistake_data,
    num_drills,
    age_group,
    skill_level,
    status: "queued",
    createdAt: Date.now(),
  };

  // Store job metadata
  await env.KV_IDEMP.put(`drill_job:${tenant}:${jobId}`, JSON.stringify(drillJob));

  // Queue the job
  try {
    await env.HIGHLIGHTS_QUEUE.send({
      type: "drill_generation",
      jobId,
      tenant,
      mistake_data,
      num_drills,
      age_group,
      skill_level,
    });

    logJSON({
      level: "info",
      message: "Drill generation job queued",
      jobId,
      tenant,
    });

    return json(
      {
        success: true,
        data: {
          job_id: jobId,
          status: "queued",
          message: "AI drill generation started",
        },
      },
      200,
      corsHdrs
    );
  } catch (error) {
    logJSON({
      level: "error",
      message: "Failed to queue drill generation",
      error: String(error),
      jobId,
    });

    return json(
      { success: false, error: { code: "QUEUE_ERROR", message: "Failed to queue generation" } },
      500,
      corsHdrs
    );
  }
}

/**
 * POST /api/v1/coaching/generate-session
 * Generate complete training session from mistakes
 * SECURITY: Requires JWT authentication
 */
export async function handleGenerateSession(
  req: Request,
  env: any,
  corsHdrs: Headers
): Promise<Response> {
  const claims = await requireJWT(req, env);
  const tenant = claims.tenantId;

  if (!tenant) {
    return json(
      { success: false, error: { code: "MISSING_TENANT", message: "Tenant not found" } },
      400,
      corsHdrs
    );
  }

  // Parse request body
  const body = await req.json();
  const validated = parse(GenerateSessionSchema, body);
  if (!validated.success) {
    return json(
      { success: false, error: { code: "VALIDATION_ERROR", message: validated.error } },
      400,
      corsHdrs
    );
  }

  const { mistakes, session_duration, age_group, skill_level, focus_categories } = validated.data;

  // Create session generation job
  const jobId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  const sessionJob = {
    id: jobId,
    type: "session_generation",
    tenant,
    mistakes,
    session_duration,
    age_group,
    skill_level,
    focus_categories,
    status: "queued",
    createdAt: Date.now(),
  };

  // Store job metadata
  await env.KV_IDEMP.put(`session_job:${tenant}:${jobId}`, JSON.stringify(sessionJob));

  // Queue the job
  try {
    await env.HIGHLIGHTS_QUEUE.send({
      type: "session_generation",
      jobId,
      tenant,
      mistakes,
      session_duration,
      age_group,
      skill_level,
      focus_categories,
    });

    logJSON({
      level: "info",
      message: "Session generation job queued",
      jobId,
      tenant,
    });

    return json(
      {
        success: true,
        data: {
          job_id: jobId,
          status: "queued",
          message: "AI session generation started",
        },
      },
      200,
      corsHdrs
    );
  } catch (error) {
    logJSON({
      level: "error",
      message: "Failed to queue session generation",
      error: String(error),
      jobId,
    });

    return json(
      { success: false, error: { code: "QUEUE_ERROR", message: "Failed to queue generation" } },
      500,
      corsHdrs
    );
  }
}

/**
 * POST /api/v1/coaching/sessions
 * Save training session plan
 * SECURITY: Requires JWT authentication
 */
export async function handleSaveTrainingSession(
  req: Request,
  env: any,
  corsHdrs: Headers
): Promise<Response> {
  const claims = await requireJWT(req, env);
  const tenant = claims.tenantId;
  const userId = (claims as any).userId || claims.sub || "anonymous";

  if (!tenant) {
    return json(
      { success: false, error: { code: "MISSING_TENANT", message: "Tenant not found" } },
      400,
      corsHdrs
    );
  }

  // Parse request body
  const body = await req.json();
  const validated = parse(SaveTrainingSessionSchema, body);
  if (!validated.success) {
    return json(
      { success: false, error: { code: "VALIDATION_ERROR", message: validated.error } },
      400,
      corsHdrs
    );
  }

  const { name, match_id, session_plan, notes, scheduled_date } = validated.data;

  // Generate session ID
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  // Create session record
  const session = {
    id: sessionId,
    tenant,
    userId,
    name,
    match_id,
    session_plan,
    notes,
    scheduled_date,
    createdAt: Date.now(),
  };

  // Store in KV
  await env.KV_IDEMP.put(`training_session:${tenant}:${sessionId}`, JSON.stringify(session));

  // Add to tenant's session list
  const sessionListKey = `training_sessions:${tenant}`;
  const sessionList = ((await env.KV_IDEMP.get(sessionListKey, "json")) as string[]) || [];
  sessionList.unshift(sessionId);
  await env.KV_IDEMP.put(sessionListKey, JSON.stringify(sessionList.slice(0, 50))); // Keep last 50

  logJSON({
    level: "info",
    message: "Training session saved",
    sessionId,
    tenant,
    userId,
  });

  return json(
    {
      success: true,
      data: {
        session_id: sessionId,
        message: "Training session saved successfully",
      },
    },
    201,
    corsHdrs
  );
}

/**
 * GET /api/v1/coaching/sessions
 * Get all training sessions for tenant
 * SECURITY: Requires JWT authentication
 */
export async function handleGetTrainingSessions(
  req: Request,
  env: any,
  corsHdrs: Headers
): Promise<Response> {
  const claims = await requireJWT(req, env);
  const tenant = claims.tenantId;

  if (!tenant) {
    return json(
      { success: false, error: { code: "MISSING_TENANT", message: "Tenant not found" } },
      400,
      corsHdrs
    );
  }

  // Get session list
  const sessionListKey = `training_sessions:${tenant}`;
  const sessionIds = ((await env.KV_IDEMP.get(sessionListKey, "json")) as string[]) || [];

  // Fetch all sessions
  const sessions = await Promise.all(
    sessionIds.map(async (id) => {
      const sessionData = await env.KV_IDEMP.get(`training_session:${tenant}:${id}`, "json");
      return sessionData;
    })
  );

  // Filter out nulls (deleted sessions)
  const validSessions = sessions.filter((s) => s !== null);

  return json(
    {
      success: true,
      data: {
        sessions: validSessions,
        total: validSessions.length,
      },
    },
    200,
    corsHdrs
  );
}

/**
 * GET /api/v1/coaching/sessions/:id
 * Get specific training session
 * SECURITY: Requires JWT authentication
 */
export async function handleGetTrainingSession(
  req: Request,
  env: any,
  corsHdrs: Headers,
  sessionId: string
): Promise<Response> {
  const claims = await requireJWT(req, env);
  const tenant = claims.tenantId;

  if (!tenant) {
    return json(
      { success: false, error: { code: "MISSING_TENANT", message: "Tenant not found" } },
      400,
      corsHdrs
    );
  }

  // Get session
  const session = await env.KV_IDEMP.get(`training_session:${tenant}:${sessionId}`, "json");

  if (!session) {
    return json(
      { success: false, error: { code: "SESSION_NOT_FOUND", message: "Session not found" } },
      404,
      corsHdrs
    );
  }

  return json(
    {
      success: true,
      data: session,
    },
    200,
    corsHdrs
  );
}

/**
 * DELETE /api/v1/coaching/sessions/:id
 * Delete training session
 * SECURITY: Requires JWT authentication
 */
export async function handleDeleteTrainingSession(
  req: Request,
  env: any,
  corsHdrs: Headers,
  sessionId: string
): Promise<Response> {
  const claims = await requireJWT(req, env);
  const tenant = claims.tenantId;

  if (!tenant) {
    return json(
      { success: false, error: { code: "MISSING_TENANT", message: "Tenant not found" } },
      400,
      corsHdrs
    );
  }

  // Delete session from KV
  await env.KV_IDEMP.delete(`training_session:${tenant}:${sessionId}`);

  // Remove from session list
  const sessionListKey = `training_sessions:${tenant}`;
  const sessionList = ((await env.KV_IDEMP.get(sessionListKey, "json")) as string[]) || [];
  const updatedList = sessionList.filter((id) => id !== sessionId);
  await env.KV_IDEMP.put(sessionListKey, JSON.stringify(updatedList));

  logJSON({
    level: "info",
    message: "Training session deleted",
    sessionId,
    tenant,
  });

  return json(
    {
      success: true,
      data: {
        message: "Training session deleted",
      },
    },
    200,
    corsHdrs
  );
}
