/**
 * Automatic posts ("jobs"): one per match event or MOTM result.
 *
 * Created when the event is recorded, with the caption and graphic contents
 * worked out on the server (so the club's name/photo choices always apply).
 * The manager's phone draws the graphic and uploads it. When post_after has
 * passed (a 1-minute undo window by default) the job is sent to the club app
 * feed, Facebook and Instagram. Safe to run twice: jobs are claimed before
 * posting and each place is only posted to once.
 */
import { decryptToken } from "./tokenCrypto";
import { deleteFacebookPost, MetaError, publishFacebook, publishInstagram, type MetaEnv } from "./meta";
import { buildPost, isPostKind, parseEventSettings, type GraphicSpec, type MatchContext, type PostInput, type PostKind } from "./content";
import { getPublicNamePolicy } from "../publicNames";

export type Target = "feed" | "facebook" | "instagram";
export type JobStatus = "pending" | "posting" | "done" | "cancelled" | "failed";
interface TargetResult { ok: boolean; id?: string; error?: string; skipped?: boolean }

export interface SocialEnv extends MetaEnv {
  DB: D1Database;
  R2_MEDIA?: R2Bucket;
  SOCIAL_TOKEN_KEY?: string;
  R2_PUBLIC_URL?: string;
  BACKEND_URL?: string;
  WORKER_BASE_URL?: string;
}

export interface JobSummary {
  id: string;
  sourceId: string;
  kind: PostKind;
  status: JobStatus;
  postAfter: number;
  targets: Target[];
  results: Record<string, TargetResult>;
  hasImage: boolean;
  caption: string;
  graphic: GraphicSpec;
}

const UNDO_WINDOW_MS = 60_000;
/** Post without a graphic if the phone hasn't sent one this long after the event. */
const IMAGE_WAIT_MS = 120_000;
const MAX_ATTEMPTS = 3;

interface JobRow {
  id: string; tenant_id: string; fixture_id: string | null; source_type: string; source_id: string; kind: string;
  caption: string; graphic: string; targets: string; image_key: string | null; post_after: number; status: JobStatus;
  results: string | null; attempts: number; created_at: number; updated_at: number;
}

function summary(row: JobRow): JobSummary {
  return {
    id: row.id,
    sourceId: row.source_id,
    kind: row.kind as PostKind,
    status: row.status,
    postAfter: row.post_after,
    targets: JSON.parse(row.targets) as Target[],
    results: row.results ? JSON.parse(row.results) : {},
    hasImage: !!row.image_key,
    caption: row.caption,
    graphic: JSON.parse(row.graphic) as GraphicSpec,
  };
}

export function mediaBase(env: SocialEnv): string {
  return (env.R2_PUBLIC_URL || env.BACKEND_URL || env.WORKER_BASE_URL || "").replace(/\/+$/, "");
}

export function publicImageUrl(env: SocialEnv, key: string): string {
  return env.R2_PUBLIC_URL ? `${mediaBase(env)}/${key}` : `${mediaBase(env)}/api/v1/media/${key}`;
}

export interface ClubSocial {
  clubName: string;
  badgeUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  undoWindow: boolean;
  settings: ReturnType<typeof parseEventSettings>;
  connections: { facebook: { id: string; name: string | null } | null; instagram: { id: string; name: string | null } | null };
}

export async function loadClubSocial(env: SocialEnv, tenantId: string): Promise<ClubSocial> {
  const [club, conns] = await Promise.all([
    env.DB.prepare(
      `SELECT t.name, t.social_undo_window, t.social_events, b.badge_url, b.primary_color, b.secondary_color
       FROM tenants t LEFT JOIN tenant_brand b ON b.tenant_id = t.id WHERE t.id = ?`,
    ).bind(tenantId).first<{ name: string; social_undo_window: number; social_events: string | null; badge_url: string | null; primary_color: string | null; secondary_color: string | null }>(),
    env.DB.prepare(`SELECT platform, account_id, account_name FROM social_connections WHERE tenant_id = ?`)
      .bind(tenantId).all<{ platform: string; account_id: string; account_name: string | null }>(),
  ]);
  const find = (p: string) => {
    const c = (conns.results || []).find((r) => r.platform === p);
    return c ? { id: c.account_id, name: c.account_name } : null;
  };
  return {
    clubName: club?.name ?? "Our club",
    badgeUrl: club?.badge_url ?? null,
    primaryColor: club?.primary_color ?? null,
    secondaryColor: club?.secondary_color ?? null,
    undoWindow: club?.social_undo_window !== 0,
    settings: parseEventSettings(club?.social_events),
    connections: { facebook: find("facebook"), instagram: find("instagram") },
  };
}

/** Squad name and public photo for a player (photo only used if the club allows photos). */
export async function postPerson(env: SocialEnv, tenantId: string, playerId: string | null, fallbackName: string | null): Promise<{ name: string; photoUrl: string | null } | null> {
  if (!playerId) return fallbackName ? { name: fallbackName, photoUrl: null } : null;
  const row = await env.DB.prepare(`SELECT name, COALESCE(headshot_url, photo_url) AS photo FROM squad WHERE tenant_id = ? AND id = ?`)
    .bind(tenantId, playerId).first<{ name: string; photo: string | null }>();
  if (!row) return fallbackName ? { name: fallbackName, photoUrl: null } : null;
  return { name: row.name, photoUrl: row.photo };
}

/**
 * Create the post for a match event or MOTM result, if the club posts that
 * kind of event anywhere. Returns the job, or null when nothing is posted.
 */
export async function queuePost(env: SocialEnv, args: {
  tenantId: string;
  fixtureId: string | null;
  sourceType: "live_event" | "motm" | "lineup";
  sourceId: string;
  match: Omit<MatchContext, "clubName" | "badgeUrl" | "primaryColor" | "secondaryColor">;
  input: PostInput;
  now?: number;
}): Promise<JobSummary | null> {
  if (!isPostKind(args.input.kind)) return null;
  const club = await loadClubSocial(env, args.tenantId);
  const choice = club.settings[args.input.kind];
  const targets: Target[] = [];
  if (choice.feed) targets.push("feed");
  if (choice.social && club.connections.facebook) targets.push("facebook");
  if (choice.social && club.connections.instagram) targets.push("instagram");
  if (!targets.length) return null;

  const policy = await getPublicNamePolicy(env, args.tenantId);
  const { caption, graphic } = buildPost(policy, {
    ...args.match, clubName: club.clubName, badgeUrl: club.badgeUrl, primaryColor: club.primaryColor, secondaryColor: club.secondaryColor,
  }, args.input);

  const now = args.now ?? Date.now();
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO social_jobs (id, tenant_id, fixture_id, source_type, source_id, kind, caption, graphic, targets, post_after, status, attempts, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)
     ON CONFLICT(tenant_id, source_type, source_id) DO NOTHING`,
  ).bind(
    id, args.tenantId, args.fixtureId, args.sourceType, args.sourceId, args.input.kind, caption, JSON.stringify(graphic),
    JSON.stringify(targets), now + (club.undoWindow ? UNDO_WINDOW_MS : 0), now, now,
  ).run();
  const row = await env.DB.prepare(`SELECT * FROM social_jobs WHERE tenant_id = ? AND source_type = ? AND source_id = ?`)
    .bind(args.tenantId, args.sourceType, args.sourceId).first<JobRow>();
  return row ? summary(row) : null;
}

export async function getJob(env: SocialEnv, tenantId: string, jobId: string): Promise<JobSummary | null> {
  const row = await env.DB.prepare(`SELECT * FROM social_jobs WHERE tenant_id = ? AND id = ?`).bind(tenantId, jobId).first<JobRow>();
  return row ? summary(row) : null;
}

export async function getJobBySource(env: SocialEnv, tenantId: string, sourceType: string, sourceId: string): Promise<JobSummary | null> {
  const row = await env.DB.prepare(`SELECT * FROM social_jobs WHERE tenant_id = ? AND source_type = ? AND source_id = ?`)
    .bind(tenantId, sourceType, sourceId).first<JobRow>();
  return row ? summary(row) : null;
}

export async function jobsForFixture(env: SocialEnv, tenantId: string, fixtureId: string): Promise<JobSummary[]> {
  const { results } = await env.DB.prepare(`SELECT * FROM social_jobs WHERE tenant_id = ? AND fixture_id = ? ORDER BY created_at`)
    .bind(tenantId, fixtureId).all<JobRow>();
  return (results || []).map(summary);
}

export async function attachImage(env: SocialEnv, tenantId: string, jobId: string, jpeg: ArrayBuffer): Promise<JobSummary | null> {
  const job = await getJob(env, tenantId, jobId);
  if (!job || !env.R2_MEDIA) return job;
  const key = `social/${tenantId}/${jobId}.jpg`;
  await env.R2_MEDIA.put(key, jpeg, { httpMetadata: { contentType: "image/jpeg", cacheControl: "public, max-age=31536000, immutable" } });
  await env.DB.prepare(`UPDATE social_jobs SET image_key = ?, updated_at = ? WHERE tenant_id = ? AND id = ?`)
    .bind(key, Date.now(), tenantId, jobId).run();
  return getJob(env, tenantId, jobId);
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
  const graphic = JSON.parse(row.graphic) as GraphicSpec;
  const imageUrl = row.image_key ? publicImageUrl(env, row.image_key) : null;

  for (const target of targets) {
    if (results[target]?.ok) continue;
    try {
      if (target === "feed") {
        const postId = `social-${row.id}`;
        await env.DB.prepare(
          `INSERT OR IGNORE INTO feed_posts (id, tenant_id, title, content, author, image_url, post_type, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'live', ?, ?)`,
        ).bind(postId, row.tenant_id, graphic.headline, row.caption, graphic.clubName, imageUrl, Date.now(), Date.now()).run();
        results.feed = { ok: true, id: postId };
      } else if (target === "facebook") {
        const conn = await connectionToken(env, row.tenant_id, "facebook");
        if (!conn) { results.facebook = { ok: true, skipped: true, error: "Facebook isn't connected." }; continue; }
        results.facebook = { ok: true, id: await publishFacebook(env, conn.accountId, conn.token, row.caption, imageUrl, fetchImpl) };
      } else if (target === "instagram") {
        if (!imageUrl) { results.instagram = { ok: true, skipped: true, error: "Instagram needs a picture, and none was sent." }; continue; }
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
 * Post everything that's due (or one job, when its graphic has just arrived).
 * Called every minute by the scheduler.
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
    : await env.DB.prepare(
      `SELECT * FROM social_jobs WHERE status = 'pending' AND post_after <= ? AND (image_key IS NOT NULL OR created_at <= ?)
       ORDER BY post_after LIMIT 20`,
    ).bind(now, now - IMAGE_WAIT_MS).all<JobRow>();

  let posted = 0;
  for (const row of due.results || []) {
    const claim = await env.DB.prepare(
      `UPDATE social_jobs SET status = 'posting', attempts = attempts + 1, updated_at = ? WHERE id = ? AND status = 'pending'`,
    ).bind(now, row.id).run();
    if (!claim.meta.changes) continue; // someone else is posting it

    const results = await publish(env, row, fetchImpl);
    const failed = Object.values(results).some((r) => !r.ok);
    const status: JobStatus = !failed ? "done" : row.attempts + 1 >= MAX_ATTEMPTS ? "failed" : "pending";
    await env.DB.prepare(`UPDATE social_jobs SET status = ?, results = ?, post_after = ?, updated_at = ? WHERE id = ?`)
      .bind(status, JSON.stringify(results), status === "pending" ? now + 60_000 : row.post_after, Date.now(), row.id).run();
    console.log(JSON.stringify({ event: "social_post", outcome: status, id: row.id, tenant: row.tenant_id, kind: row.kind, results }));
    posted++;
  }
  return posted;
}

/**
 * Undo: cancel a post that hasn't gone out. If it already went out, remove it
 * from the club app and Facebook; Instagram posts can't be removed by apps.
 */
export async function cancelPost(env: SocialEnv, tenantId: string, sourceType: "live_event" | "motm" | "lineup", sourceId: string, fetchImpl: typeof fetch = fetch): Promise<{ cancelled: boolean; instagramLeftUp: boolean }> {
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
      console.log(JSON.stringify({ event: "social_delete", outcome: "failed", id: row.id, error: errorText(err) }));
    }
  }
  await env.DB.prepare(`UPDATE social_jobs SET status = 'cancelled', updated_at = ? WHERE id = ?`).bind(Date.now(), row.id).run();
  return { cancelled: true, instagramLeftUp: !!(results.instagram?.ok && results.instagram.id) };
}
