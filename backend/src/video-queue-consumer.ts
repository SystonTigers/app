// video-queue-consumer.ts
// Consumes video processing AND coaching jobs from HIGHLIGHTS_QUEUE

import { logJSON } from "./lib/log";

export interface VideoJob {
  type?: "video" | "coaching_analysis" | "drill_generation" | "session_generation";
  videoId: string;
  tenant: string;
  r2Key?: string;
  timestamp: number;
  metadata?: {
    filename?: string;
    size?: number;
    uploadedBy?: string;
  };
  // Coaching-specific fields
  jobId?: string;
  team_name?: string;
  opponent_name?: string;
  context?: any;
  mistake_data?: any[];
  mistakes?: any[];
  num_drills?: number;
  age_group?: string;
  skill_level?: string;
  session_duration?: number;
  focus_categories?: string[];
}

export default {
  async queue(batch: MessageBatch<VideoJob>, env: any) {
    for (const msg of batch.messages) {
      const job = msg.body;

      // Determine job type (default to "video" for backward compatibility)
      const jobType = job.type || "video";

      logJSON({
        level: "info",
        msg: `Processing ${jobType} job`,
        videoId: job.videoId,
        jobId: job.jobId,
        tenant: job.tenant
      });

      try {
        switch (jobType) {
          case "video":
            await processVideoJob(env, job);
            break;

          case "coaching_analysis":
            await processCoachingAnalysis(env, job);
            break;

          case "drill_generation":
            await processDrillGeneration(env, job);
            break;

          case "session_generation":
            await processSessionGeneration(env, job);
            break;

          default:
            logJSON({
              level: "warn",
              msg: `Unknown job type: ${jobType}`,
              job
            });
        }

        msg.ack();

      } catch (err: any) {
        logJSON({
          level: "error",
          msg: `${jobType} processing failed`,
          videoId: job.videoId,
          jobId: job.jobId,
          error: err?.message || String(err)
        });

        // Send to dead-letter queue if available
        if (env.DLQ) {
          await env.DLQ.send({
            tenant: job.tenant,
            videoId: job.videoId,
            jobId: job.jobId,
            error: err?.message || "unknown",
            job,
            timestamp: Date.now()
          }).catch(() => { });
        }

        msg.ack();
      }
    }
  }
};

/**
 * Process video highlights (original video processing)
 */
async function processVideoJob(env: any, job: VideoJob) {
  const metadataKey = `video:${job.tenant}:${job.videoId}`;
  const existingMetadata = await env.KV_IDEMP.get(metadataKey, "json") as any;

  if (!existingMetadata) {
    throw new Error(`Video metadata not found: ${job.videoId}`);
  }

  // Mark as processing
  existingMetadata.status = "processing";
  existingMetadata.processingStarted = new Date().toISOString();
  await env.KV_IDEMP.put(metadataKey, JSON.stringify(existingMetadata));

  // TODO: Integrate with your video processing pipeline
  const processingResult = await processVideoHighlights(env, job);

  // Update status to completed
  existingMetadata.status = processingResult.success ? "completed" : "failed";
  existingMetadata.processingCompleted = new Date().toISOString();
  existingMetadata.processingDuration = Date.now() - job.timestamp;

  if (processingResult.success) {
    existingMetadata.highlightsUrl = processingResult.highlightsUrl;
    existingMetadata.clipsGenerated = processingResult.clipsCount || 0;
  } else {
    existingMetadata.error = processingResult.error;
  }

  await env.KV_IDEMP.put(metadataKey, JSON.stringify(existingMetadata));

  logJSON({
    level: "info",
    msg: "Video processing completed",
    videoId: job.videoId,
    status: existingMetadata.status,
    duration: existingMetadata.processingDuration
  });
}

/**
 * Process coaching analysis request (mistake detection)
 */
async function processCoachingAnalysis(env: any, job: VideoJob) {
  const jobKey = `coaching_job:${job.tenant}:${job.jobId}`;

  // Update job status to processing
  await updateJobStatus(env, jobKey, "processing");

  // Get video URL from R2
  const videoUrl = job.r2Key ? await getSignedR2Url(env, job.r2Key) : null;

  if (!videoUrl) {
    throw new Error("No video URL available for coaching analysis");
  }

  // Call Python coaching service
  const pythonServiceUrl = env.PYTHON_COACHING_SERVICE_URL || "http://localhost:8000";

  const response = await fetch(`${pythonServiceUrl}/analyze-mistakes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": env.COACHING_SERVICE_API_KEY || "" // Add auth header
    },
    body: JSON.stringify({
      job_id: job.jobId,
      video_id: job.videoId,
      tenant: job.tenant,
      team_name: job.team_name,
      opponent_name: job.opponent_name,
      context: job.context,
      video_url: videoUrl,
      r2_key: job.r2Key,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Python service error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as any;

  if (!data.success) {
    throw new Error(`Coaching analysis failed: ${data.message || "Unknown error"}`);
  }

  logJSON({
    level: "info",
    msg: "Coaching analysis started",
    jobId: job.jobId,
    videoId: job.videoId
  });

  // Note: Python service will update job status when complete via background task
}

/**
 * Process drill generation request
 */
async function processDrillGeneration(env: any, job: VideoJob) {
  const jobKey = `drill_job:${job.tenant}:${job.jobId}`;

  // Update job status to processing
  await updateJobStatus(env, jobKey, "processing");

  // Call Python coaching service
  const pythonServiceUrl = env.PYTHON_COACHING_SERVICE_URL || "http://localhost:8000";

  const response = await fetch(`${pythonServiceUrl}/generate-drills`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": env.COACHING_SERVICE_API_KEY || ""
    },
    body: JSON.stringify({
      job_id: job.jobId,
      tenant: job.tenant,
      mistake_data: job.mistake_data || [],
      num_drills: job.num_drills || 3,
      age_group: job.age_group || "Adult",
      skill_level: job.skill_level || "Intermediate",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Python service error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as any;

  if (!data.success) {
    throw new Error(`Drill generation failed: ${data.message || "Unknown error"}`);
  }

  logJSON({
    level: "info",
    msg: "Drill generation started",
    jobId: job.jobId,
    tenant: job.tenant
  });

  // Python service will update job status when complete
}

/**
 * Process session generation request
 */
async function processSessionGeneration(env: any, job: VideoJob) {
  const jobKey = `session_job:${job.tenant}:${job.jobId}`;

  // Update job status to processing
  await updateJobStatus(env, jobKey, "processing");

  // Call Python coaching service
  const pythonServiceUrl = env.PYTHON_COACHING_SERVICE_URL || "http://localhost:8000";

  const response = await fetch(`${pythonServiceUrl}/generate-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": env.COACHING_SERVICE_API_KEY || ""
    },
    body: JSON.stringify({
      job_id: job.jobId,
      tenant: job.tenant,
      mistakes: job.mistakes || [],
      session_duration: job.session_duration || 60,
      age_group: job.age_group || "Adult",
      skill_level: job.skill_level || "Intermediate",
      focus_categories: job.focus_categories,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Python service error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as any;

  if (!data.success) {
    throw new Error(`Session generation failed: ${data.message || "Unknown error"}`);
  }

  logJSON({
    level: "info",
    msg: "Session generation started",
    jobId: job.jobId,
    tenant: job.tenant
  });

  // Python service will update job status when complete
}

/**
 * Update job status in KV
 */
async function updateJobStatus(
  env: any,
  jobKey: string,
  status: "queued" | "processing" | "completed" | "failed",
  result?: any,
  error?: string
) {
  try {
    const existingJob = await env.KV_IDEMP.get(jobKey, "json") as any;

    if (existingJob) {
      existingJob.status = status;
      existingJob.updatedAt = Date.now();

      if (result) {
        existingJob.result = result;
      }

      if (error) {
        existingJob.error = error;
      }

      if (status === "completed") {
        existingJob.completedAt = Date.now();
      }

      await env.KV_IDEMP.put(jobKey, JSON.stringify(existingJob));
    }
  } catch (err) {
    logJSON({
      level: "error",
      msg: "Failed to update job status",
      jobKey,
      error: String(err)
    });
  }
}

/**
 * Process video highlights using your existing video processing pipeline
 * This is a placeholder - integrate with your highlights_bot or football-highlights-processor
 */
async function processVideoHighlights(
  env: any,
  job: VideoJob
): Promise<{ success: boolean; highlightsUrl?: string; clipsCount?: number; error?: string }> {

  logJSON({
    level: "warn",
    msg: "Video processing not yet implemented - placeholder",
    videoId: job.videoId,
    hint: "Integrate with highlights_bot or football-highlights-processor"
  });

  // Placeholder: Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    success: true,
    highlightsUrl: `https://placeholder.com/highlights/${job.videoId}`,
    clipsCount: 0,
    error: undefined
  };
}

/**
 * Generate a signed R2 URL for the video processor to access
 */
async function getSignedR2Url(env: any, r2Key: string): Promise<string> {
  // TODO: Implement R2 signed URL generation
  // For now, return a placeholder that assumes your Python service can access R2
  return `https://your-worker.workers.dev/videos/${r2Key}`;
}
