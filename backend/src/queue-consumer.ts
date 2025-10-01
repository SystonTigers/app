import type { PostJob } from "./types";
import { publishViaMake } from "./adapters/make";
import { publishYouTube } from "./adapters/youtube";
import { setFinalIdempotent } from "./services/idempotency";
import { getTenantConfig } from "./services/tenants";

export default {
  async queue(batch: QueueBatch<PostJob>, env: any) {
    for (const msg of batch.messages) {
      const job = msg.body;
      try {
        const cfg = job?.tenant ? await getTenantConfig(env, job.tenant) : null;
        const useMake = !!cfg?.flags?.use_make;
        const hook = cfg?.makeWebhookUrl || null;

        if (useMake) {
          if (!hook) throw new Error("use_make=true but no webhook URL set");
          // Use Make webhook for all channels
          const tenant = cfg!;
          const results: Record<string, unknown> = {};
          for (const ch of job.channels) {
            results[ch] = await publishViaMake(env, tenant, job.template, job.data);
          }
          await setFinalIdempotent(env, job.idemKey, { success: true, data: { results } });
        } else {
          // Direct publishing path
          const results: Record<string, unknown> = {};
          for (const ch of job.channels) {
            try {
              switch (ch) {
                case "yt":
                  results[ch] = await publishYouTube(env, cfg || { id: job.tenant }, job.template, job.data);
                  break;
                default:
                  results[ch] = { skipped: "no direct publisher implemented yet" };
              }
            } catch (err) {
              // Fallback to Make if direct fails
              if (!useMake && hook) {
                const tenant = cfg || { id: job.tenant, makeWebhookUrl: hook };
                results[ch] = await publishViaMake(env, tenant, job.template, { ...job.data, fallback: String(err) });
              } else {
                throw err;
              }
            }
          }
          await setFinalIdempotent(env, job.idemKey, { success: true, data: { results } });
        }

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
        }
        await setFinalIdempotent(env, job.idemKey, { success: false, error: { code: "DLQ", message: String(err?.message || err) } });
        await msg.ack();
      }
    }
  }
};
