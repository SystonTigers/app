import type { PostJob, Channel } from "./types";
import { publishViaMake } from "./adapters/make";
import { publishYouTube } from "./adapters/youtube";
import { publishFacebook } from "./adapters/facebook";
import { publishInstagram } from "./adapters/instagram";
import { publishTikTok } from "./adapters/tiktok";
import { publishX } from "./adapters/x";
import { setFinalIdempotent } from "./services/idempotency";
import { getTenantConfig } from "./services/tenantConfig";
import { shouldDefer, incrementCounter } from "./services/rateAware";

export default {
  async queue(batch: QueueBatch<PostJob>, env: any) {
    for (const msg of batch.messages) {
      const job = msg.body;
      try {
        const cfg = job?.tenant ? await getTenantConfig(env, job.tenant) : null;
        if (!cfg) throw new Error(`Tenant ${job.tenant} not found`);

        const useMake = !!cfg?.flags?.use_make;
        const hook = cfg?.makeWebhookUrl || null;

        // Legacy: if use_make=true, forward ALL channels to Make webhook
        if (useMake && hook) {
          const results: Record<string, unknown> = {};
          for (const ch of job.channels) {
            results[ch] = await publishViaMake(env, cfg, job.template, job.data);
          }
          await setFinalIdempotent(env, job.idemKey, { success: true, data: { results } });
          await msg.ack();
          continue;
        }

        // New per-channel routing
        const results: Record<string, unknown> = {};
        const fallbacks: Array<{ channel: Channel; reason: string }> = [];

        for (const ch of job.channels as Channel[]) {
          try {
            // Check if we should defer due to rate limits
            const defer = await shouldDefer(ch, cfg, env);
            if (defer) {
              fallbacks.push({
                channel: ch,
                reason: `${ch}_quota_exhausted`,
              });
              results[ch] = {
                status: "deferred",
                fallback: "share",
                suggested: ["share_native", "upload_stream"],
              };
              continue;
            }

            // Prepare publish params
            const params = {
              tenant: cfg,
              job: {
                template: job.template,
                data: job.data,
                text: job.data.text || job.data.msg || job.data.title,
                mediaUrl: job.data.mediaUrl || job.data.videoUrl,
              },
              env,
            };

            // Route to appropriate adapter
            switch (ch) {
              case "yt":
                await publishYouTube(env, cfg, job.template, job.data);
                break;
              case "fb":
                await publishFacebook(params);
                break;
              case "ig":
                await publishInstagram(params);
                break;
              case "tiktok":
                await publishTikTok(params);
                break;
              case "x":
                await publishX(params);
                break;
              default:
                throw new Error(`Unknown channel: ${ch}`);
            }

            // Increment counter after successful publish
            await incrementCounter(ch, cfg, env);
            results[ch] = { status: "published" };

          } catch (err: any) {
            // Check if error indicates fallback needed
            if (err?.message?.includes("not configured") || err?.message?.includes("not yet implemented")) {
              fallbacks.push({
                channel: ch,
                reason: err.message,
              });
              results[ch] = {
                status: "fallback_required",
                error: err.message,
                fallback: "share",
                suggested: ["share_native", "upload_stream"],
              };
            } else {
              // Real error - rethrow to DLQ
              throw err;
            }
          }
        }

        // Store results
        await setFinalIdempotent(env, job.idemKey, {
          success: fallbacks.length === 0,
          data: { results, fallbacks: fallbacks.length > 0 ? fallbacks : undefined },
        });

        await msg.ack();
      } catch (err: any) {
        // Send to dead-letter queue (no retries yet)
        if (env.DLQ) {
          await env.DLQ.send({
            tenant: job.tenant,
            error: err?.message || "unknown",
            job,
            timestamp: Date.now()
          }).catch(() => {});

          // Optional: send alert webhook (non-blocking)
          if (env.DLQ_ALERT_URL) {
            try {
              await fetch(env.DLQ_ALERT_URL, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  tenant: job.tenant,
                  reason: err?.message || "unknown",
                  ts: Date.now()
                })
              });
            } catch {
              // Ignore alert failures - never block the worker
            }
          }
        }
        await setFinalIdempotent(env, job.idemKey, {
          success: false,
          error: { code: "DLQ", message: String(err?.message || err) },
        });
        await msg.ack();
      }
    }
  }
};
