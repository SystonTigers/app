/**
 * Drawing and sending posts. processDueJobs runs every minute: it draws any
 * missing graphic, then posts each due job to its places. Safe to run twice:
 * jobs are claimed before posting and each place is only posted to once.
 */
import type { Graphic } from "../graphics/types";
import { loadClubSocial, type SocialEnv } from "./club";
import { publicImageUrl, type JobRow, type JobStatus, type Target, type TargetResult } from "./jobs";
import { decryptToken } from "./tokenCrypto";
import { deleteFacebookPost, MetaError, publishFacebook, publishInstagram } from "./meta";

const MAX_ATTEMPTS = 3;

function log(fields: Record<string, unknown>): void {
  console.log(JSON.stringify(fields));
}

/**
 * Save a job's picture under its own name and point the job at it, unless
 * the job already has one; in that case the new copy is removed. Returns
 * false when another picture got there first.
 */
export async function storeJobImage(env: SocialEnv, tenantId: string, jobId: string, jpeg: ArrayBuffer | Uint8Array): Promise<boolean> {
  if (!env.R2_MEDIA) return false;
  const key = `social/${tenantId}/${jobId}-${crypto.randomUUID().slice(0, 8)}.jpg`;
  await env.R2_MEDIA.put(key, jpeg, { httpMetadata: { contentType: "image/jpeg", cacheControl: "public, max-age=31536000, immutable" } });
  const saved = await env.DB.prepare(`UPDATE social_jobs SET image_key = ?, updated_at = ? WHERE tenant_id = ? AND id = ? AND image_key IS NULL`)
    .bind(key, Date.now(), tenantId, jobId).run();
  if (saved.meta.changes) return true;
  await env.R2_MEDIA.delete(key);
  return false;
}

/**
 * Draw a job's graphic in the club's design pack and store it, unless it has
 * one already. Returns true when the job has a picture afterwards.
 */
export async function renderJobImage(env: SocialEnv, tenantId: string, jobId: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const row = await env.DB.prepare(`SELECT id, graphic, image_key, status FROM social_jobs WHERE tenant_id = ? AND id = ?`)
    .bind(tenantId, jobId).first<{ id: string; graphic: string; image_key: string | null; status: string }>();
  if (!row) return false;
  if (row.image_key) return true;
  if (row.status === "cancelled") return false;
  if (!env.R2_MEDIA) return false;
  const graphic = JSON.parse(row.graphic) as Graphic;
  if (graphic.v !== 2) return false; // posts queued before server-side graphics
  const started = Date.now();
  try {
    const club = await loadClubSocial(env, tenantId);
    // Loaded on demand: the renderer bundles a WASM module that plain Node tests can't import
    const { renderGraphic } = await import("../graphics/render");
    const jpeg = await renderGraphic(env, club.pack, graphic, fetchImpl);
    const stored = await storeJobImage(env, tenantId, jobId, jpeg);
    if (!stored) return true; // another drawing (or an app upload) got there first
    log({ event: "social_graphic", outcome: "drawn", id: jobId, tenant: tenantId, pack: club.pack.id, ms: Date.now() - started, bytes: jpeg.length });
    return true;
  } catch (err) {
    log({ event: "social_graphic", outcome: "failed", id: jobId, tenant: tenantId, error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

async function connectionToken(env: SocialEnv, tenantId: string, platform: "facebook" | "instagram"): Promise<{ accountId: string; token: string } | null> {
  const row = await env.DB.prepare(`SELECT account_id, access_token_enc FROM social_connections WHERE tenant_id = ? AND platform = ?`)
    .bind(tenantId, platform).first<{ account_id: string; access_token_enc: string }>();
  if (!row) return null;
  return { accountId: row.account_id, token: await decryptToken(env.SOCIAL_TOKEN_KEY, row.access_token_enc) };
}

function errorText(err: unknown): string {
  if (err instanceof MetaError && err.needsReconnect) return "Reconnect Facebook and Instagram in Settings.";
  return err instanceof Error ? err.message : String(err);
}

/** Send one claimed job to each of its places, skipping ones already done. */
async function publish(env: SocialEnv, row: JobRow, fetchImpl: typeof fetch): Promise<Record<string, TargetResult>> {
  const targets = JSON.parse(row.targets) as Target[];
  const results: Record<string, TargetResult> = row.results ? JSON.parse(row.results) : {};
  const graphic = JSON.parse(row.graphic) as Graphic & { clubName?: string };
  const imageUrl = row.image_key ? publicImageUrl(env, row.image_key) : null;
  const author = graphic.brand?.clubName ?? graphic.clubName ?? "Club";

  for (const target of targets) {
    if (results[target]?.ok) continue;
    try {
      if (target === "feed") {
        const postId = `social-${row.id}`;
        await env.DB.prepare(
          `INSERT OR IGNORE INTO feed_posts (id, tenant_id, title, content, author, image_url, post_type, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'live', ?, ?)`,
        ).bind(postId, row.tenant_id, graphic.headline, row.caption, author, imageUrl, Date.now(), Date.now()).run();
        results.feed = { ok: true, id: postId };
      } else if (target === "facebook") {
        const conn = await connectionToken(env, row.tenant_id, "facebook");
        if (!conn) { results.facebook = { ok: true, skipped: true, error: "Facebook isn't connected." }; continue; }
        results.facebook = { ok: true, id: await publishFacebook(env, conn.accountId, conn.token, row.caption, imageUrl, fetchImpl) };
      } else if (target === "instagram") {
        if (!imageUrl) { results.instagram = { ok: true, skipped: true, error: "Instagram needs a picture, and it couldn't be drawn." }; continue; }
        const conn = await connectionToken(env, row.tenant_id, "instagram");
        if (!conn) { results.instagram = { ok: true, skipped: true, error: "Instagram isn't connected." }; continue; }
        results.instagram = { ok: true, id: await publishInstagram(env, conn.accountId, conn.token, row.caption, imageUrl, fetchImpl) };
      }
    } catch (err) {
      results[target] = { ok: false, error: errorText(err) };
    }
  }
  return results;
}

/**
 * Post everything that's due (or one job). Called every minute by the
 * scheduler, and straight away when a job is due as it's created.
 */
export async function processDueJobs(env: SocialEnv, opts: { now?: number; jobId?: string; tenantId?: string; fetchImpl?: typeof fetch } = {}): Promise<number> {
  const now = opts.now ?? Date.now();
  const fetchImpl = opts.fetchImpl ?? fetch;
  // A job stuck in 'posting' (the worker stopped mid-way) is tried again
  await env.DB.prepare(`UPDATE social_jobs SET status = 'pending' WHERE status = 'posting' AND updated_at < ? AND attempts < ?`)
    .bind(now - 5 * 60_000, MAX_ATTEMPTS).run();

  const due = opts.jobId
    ? await env.DB.prepare(`SELECT * FROM social_jobs WHERE id = ? AND tenant_id = ? AND status = 'pending' AND post_after <= ?`)
      .bind(opts.jobId, opts.tenantId ?? "", now).all<JobRow>()
    : await env.DB.prepare(`SELECT * FROM social_jobs WHERE status = 'pending' AND post_after <= ? ORDER BY post_after LIMIT 20`)
      .bind(now).all<JobRow>();

  let posted = 0;
  for (const found of due.results || []) {
    const claim = await env.DB.prepare(
      `UPDATE social_jobs SET status = 'posting', attempts = attempts + 1, updated_at = ? WHERE id = ? AND status = 'pending'`,
    ).bind(now, found.id).run();
    if (!claim.meta.changes) continue; // someone else is posting it

    let row = found;
    if (!row.image_key && (await renderJobImage(env, row.tenant_id, row.id, fetchImpl))) {
      row = (await env.DB.prepare(`SELECT * FROM social_jobs WHERE id = ?`).bind(row.id).first<JobRow>()) ?? row;
    }
    const results = await publish(env, row, fetchImpl);
    const failed = Object.values(results).some((r) => !r.ok);
    const status: JobStatus = !failed ? "done" : row.attempts + 1 >= MAX_ATTEMPTS ? "failed" : "pending";
    await env.DB.prepare(`UPDATE social_jobs SET status = ?, results = ?, post_after = ?, updated_at = ? WHERE id = ?`)
      .bind(status, JSON.stringify(results), status === "pending" ? now + 60_000 : row.post_after, Date.now(), row.id).run();
    log({ event: "social_post", outcome: status, id: row.id, tenant: row.tenant_id, kind: row.kind, results });
    posted++;
  }
  return posted;
}

/**
 * Undo: cancel a post that hasn't gone out. If it already went out, remove it
 * from the club app and Facebook; Instagram posts can't be removed by apps.
 */
export async function cancelPost(env: SocialEnv, tenantId: string, sourceType: string, sourceId: string, fetchImpl: typeof fetch = fetch): Promise<{ cancelled: boolean; instagramLeftUp: boolean }> {
  const row = await env.DB.prepare(`SELECT * FROM social_jobs WHERE tenant_id = ? AND source_type = ? AND source_id = ?`)
    .bind(tenantId, sourceType, sourceId).first<JobRow>();
  if (!row) return { cancelled: false, instagramLeftUp: false };
  const pending = await env.DB.prepare(`UPDATE social_jobs SET status = 'cancelled', updated_at = ? WHERE id = ? AND status = 'pending'`)
    .bind(Date.now(), row.id).run();
  if (pending.meta.changes) return { cancelled: true, instagramLeftUp: false };

  const results: Record<string, TargetResult> = row.results ? JSON.parse(row.results) : {};
  if (results.feed?.ok && results.feed.id) {
    await env.DB.prepare(`DELETE FROM feed_posts WHERE tenant_id = ? AND id = ?`).bind(tenantId, results.feed.id).run();
  }
  if (results.facebook?.ok && results.facebook.id) {
    try {
      const conn = await connectionToken(env, tenantId, "facebook");
      if (conn) await deleteFacebookPost(env, results.facebook.id, conn.token, fetchImpl);
    } catch (err) {
      log({ event: "social_delete", outcome: "failed", id: row.id, error: errorText(err) });
    }
  }
  await env.DB.prepare(`UPDATE social_jobs SET status = 'cancelled', updated_at = ? WHERE id = ?`).bind(Date.now(), row.id).run();
  return { cancelled: true, instagramLeftUp: !!(results.instagram?.ok && results.instagram.id) };
}

/**
 * After queuing a post in a request: draw its graphic in the background (so
 * the Share button has it quickly) and post it straight away if it's due.
 * Otherwise the once-a-minute scheduler does both. End-to-end tests turn this
 * off (SOCIAL_BACKGROUND_DRAWING=off) and call the same steps directly.
 */
export function drawAndPostSoon(env: SocialEnv & { SOCIAL_BACKGROUND_DRAWING?: string }, ctx: ExecutionContext | undefined, tenantId: string, job: { id: string; postAfter: number } | null): void {
  if (!job || !ctx || env.SOCIAL_BACKGROUND_DRAWING === "off") return;
  ctx.waitUntil((async () => {
    await renderJobImage(env, tenantId, job.id);
    if (job.postAfter <= Date.now()) await processDueJobs(env, { jobId: job.id, tenantId });
  })().catch((err) => log({ event: "social_graphic", outcome: "failed", id: job.id, tenant: tenantId, error: err instanceof Error ? err.message : String(err) })));
}
