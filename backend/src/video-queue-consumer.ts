// video-queue-consumer.ts
// Consumes video processing jobs from HIGHLIGHTS_QUEUE

import { logJSON } from "./lib/log";

export interface VideoJob {
  videoId: string;
  tenant: string;
  r2Key: string;
  timestamp: number;
  metadata?: {
    filename?: string;
    size?: number;
    uploadedBy?: string;
  };
}

export default {
  async queue(batch: QueueBatch<VideoJob>, env: any) {
    for (const msg of batch.messages) {
      const job = msg.body;

      logJSON({
        level: "info",
        msg: "Processing video job",
        videoId: job.videoId,
        tenant: job.tenant,
        r2Key: job.r2Key
      });

      try {
        // Update status to processing
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
        // Option 1: Call your existing Python highlights_bot
        // Option 2: Call football-highlights-processor Docker container
        // Option 3: Trigger via webhook to your video processing service

        // For now, we'll simulate processing and prepare for integration
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

        await msg.ack();

      } catch (err: any) {
        logJSON({
          level: "error",
          msg: "Video processing failed",
          videoId: job.videoId,
          error: err?.message || String(err)
        });

        // Update status to failed
        try {
          const metadataKey = `video:${job.tenant}:${job.videoId}`;
          const existingMetadata = await env.KV_IDEMP.get(metadataKey, "json") as any;

          if (existingMetadata) {
            existingMetadata.status = "failed";
            existingMetadata.error = err?.message || String(err);
            existingMetadata.processingCompleted = new Date().toISOString();
            await env.KV_IDEMP.put(metadataKey, JSON.stringify(existingMetadata));
          }
        } catch (updateErr) {
          logJSON({
            level: "error",
            msg: "Failed to update video metadata after error",
            videoId: job.videoId,
            error: String(updateErr)
          });
        }

        // Send to dead-letter queue if available
        if (env.DLQ) {
          await env.DLQ.send({
            tenant: job.tenant,
            videoId: job.videoId,
            error: err?.message || "unknown",
            job,
            timestamp: Date.now()
          }).catch(() => {});
        }

        await msg.ack();
      }
    }
  }
};

/**
 * Process video highlights using your existing video processing pipeline
 * This is a placeholder - integrate with your highlights_bot or football-highlights-processor
 */
async function processVideoHighlights(
  env: any,
  job: VideoJob
): Promise<{ success: boolean; highlightsUrl?: string; clipsCount?: number; error?: string }> {

  // TODO: Replace this with actual video processing integration
  //
  // Integration Options:
  //
  // Option 1: Call Python highlights_bot via HTTP
  // const response = await fetch('http://your-highlights-bot/process', {
  //   method: 'POST',
  //   body: JSON.stringify({
  //     videoUrl: await getSignedR2Url(env, job.r2Key),
  //     videoId: job.videoId,
  //     tenant: job.tenant
  //   })
  // });
  //
  // Option 2: Invoke Docker container via your orchestration platform
  // const result = await triggerDockerProcessor(env, job);
  //
  // Option 3: Write to a queue that your video processor monitors
  // await env.VIDEO_PROCESSING_QUEUE.send(job);

  logJSON({
    level: "warn",
    msg: "Video processing not yet implemented - placeholder",
    videoId: job.videoId,
    hint: "Integrate with highlights_bot or football-highlights-processor"
  });

  // Placeholder: Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Return simulated result
  // Replace this with actual processing results
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
  // This allows your video processor to securely download the video
  //
  // Note: R2 doesn't have native presigned URLs like S3 yet
  // You may need to:
  // 1. Use a Worker endpoint that streams from R2 with auth
  // 2. Use R2's public bucket + time-limited tokens
  // 3. Use Cloudflare signed URLs (if available in your plan)

  return `https://your-worker.workers.dev/videos/${r2Key}`;
}
