/**
 * Automatic posts ("jobs"): one per match event, MOTM result, line-up or
 * scheduled club post (fixtures, results, birthdays...).
 *
 * Created with the caption and graphic contents worked out on the server (so
 * the club's name/photo choices always apply). The server draws the graphic
 * in the club's design pack. When post_after has passed (a 1-minute undo
 * window for match events) the job is sent to the club app feed, Facebook and
 * Instagram by the once-a-minute scheduler (services/social/publish.ts).
 * Unique per (club, source), so queuing the same thing twice is harmless.
 */
import { buildPost, displayDate, isPostKind, type PostInput, type PostKind } from "./content";
import { getPublicNamePolicy, type PublicNamePolicy } from "../publicNames";
import { opponentBadgeUrl } from "../opponentBadges";
import { loadClubSocial, type ClubSocial, type SocialEnv } from "./club";
import type { Graphic } from "../graphics/types";
import { storeJobImage } from "./publish";

export { loadClubSocial, postPerson, type ClubSocial, type SocialEnv } from "./club";

export type Target = "feed" | "facebook" | "instagram";
export type JobStatus = "pending" | "posting" | "done" | "cancelled" | "failed";
export type SourceType = "live_event" | "motm" | "lineup" | "club";
export interface TargetResult { ok: boolean; id?: string; error?: string; skipped?: boolean }

export interface JobSummary {
  id: string;
  sourceId: string;
  kind: PostKind;
  status: JobStatus;
  postAfter: number;
  targets: Target[];
  results: Record<string, TargetResult>;
  hasImage: boolean;
  /** The drawn graphic, once ready */
  imageUrl: string | null;
  caption: string;
  graphic: Graphic;
}

const UNDO_WINDOW_MS = 60_000;

export interface JobRow {
  id: string; tenant_id: string; fixture_id: string | null; source_type: string; source_id: string; kind: string;
  caption: string; graphic: string; targets: string; image_key: string | null; post_after: number; status: JobStatus;
  results: string | null; attempts: number; created_at: number; updated_at: number;
}

export function mediaBase(env: SocialEnv): string {
  return (env.R2_PUBLIC_URL || env.BACKEND_URL || env.WORKER_BASE_URL || "").replace(/\/+$/, "");
}

export function publicImageUrl(env: SocialEnv, key: string): string {
  return env.R2_PUBLIC_URL ? `${mediaBase(env)}/${key}` : `${mediaBase(env)}/api/v1/media/${key}`;
}

export function summary(env: SocialEnv, row: JobRow): JobSummary {
  return {
    id: row.id,
    sourceId: row.source_id,
    kind: row.kind as PostKind,
    status: row.status,
    postAfter: row.post_after,
    targets: JSON.parse(row.targets) as Target[],
    results: row.results ? JSON.parse(row.results) : {},
    hasImage: !!row.image_key,
    imageUrl: row.image_key ? publicImageUrl(env, row.image_key) : null,
    caption: row.caption,
    graphic: JSON.parse(row.graphic) as Graphic,
  };
}

/** Where a kind of post goes for this club (empty = nowhere). */
export function targetsFor(club: ClubSocial, kind: PostKind): Target[] {
  const choice = club.settings[kind];
  const targets: Target[] = [];
  if (choice.feed) targets.push("feed");
  if (choice.social && club.connections.facebook) targets.push("facebook");
  if (choice.social && club.connections.instagram) targets.push("instagram");
  return targets;
}

async function insertJob(env: SocialEnv, job: {
  tenantId: string; fixtureId: string | null; sourceType: SourceType; sourceId: string; kind: PostKind;
  caption: string; graphic: Graphic; targets: Target[]; postAfter: number; now: number;
}): Promise<JobSummary | null> {
  await env.DB.prepare(
    `INSERT INTO social_jobs (id, tenant_id, fixture_id, source_type, source_id, kind, caption, graphic, targets, post_after, status, attempts, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)
     ON CONFLICT(tenant_id, source_type, source_id) DO NOTHING`,
  ).bind(
    crypto.randomUUID(), job.tenantId, job.fixtureId, job.sourceType, job.sourceId, job.kind, job.caption, JSON.stringify(job.graphic),
    JSON.stringify(job.targets), job.postAfter, job.now, job.now,
  ).run();
  return getJobBySource(env, job.tenantId, job.sourceType, job.sourceId);
}

/** The facts about a match that posts need. `date` is the fixture's ISO date. */
export interface MatchFacts {
  opponent: string;
  homeAway: "home" | "away";
  ourScore: number;
  theirScore: number;
  competition: string | null;
  date?: string | null;
  time?: string | null;
  venue?: string | null;
}

/**
 * Create the post for a match event, line-up or MOTM result, if the club
 * posts that kind of event anywhere. Returns the job, or null when nothing is posted.
 */
export async function queuePost(env: SocialEnv, args: {
  tenantId: string;
  fixtureId: string | null;
  sourceType: "live_event" | "motm" | "lineup";
  sourceId: string;
  match: MatchFacts;
  input: PostInput;
  now?: number;
}): Promise<JobSummary | null> {
  if (!isPostKind(args.input.kind)) return null;
  const club = await loadClubSocial(env, args.tenantId);
  const targets = targetsFor(club, args.input.kind);
  if (!targets.length) return null;

  const [policy, badge] = await Promise.all([getPublicNamePolicy(env, args.tenantId), opponentBadgeUrl(env, args.tenantId, args.match.opponent)]);
  const { caption, graphic } = buildPost(policy, {
    ...args.match,
    brand: club.brand,
    opponentBadgeUrl: badge,
    date: displayDate(args.match.date),
    time: args.match.time ?? null,
    venue: args.match.venue ?? null,
  }, args.input);

  const now = args.now ?? Date.now();
  return insertJob(env, {
    tenantId: args.tenantId, fixtureId: args.fixtureId, sourceType: args.sourceType, sourceId: args.sourceId, kind: args.input.kind,
    caption, graphic, targets, postAfter: now + (club.undoWindow ? UNDO_WINDOW_MS : 0), now,
  });
}

/**
 * Create a scheduled club post (fixtures, results, birthdays...). `sourceId`
 * must identify the post uniquely (e.g. "birthday:<player>:2026") so the
 * scheduler can run twice without posting twice. No undo window.
 */
export async function queueClubPost(env: SocialEnv, args: {
  tenantId: string;
  kind: PostKind;
  sourceId: string;
  fixtureId?: string | null;
  build: (club: ClubSocial, policy: PublicNamePolicy) => Promise<{ caption: string; graphic: Graphic } | null> | { caption: string; graphic: Graphic } | null;
  /** The picture shows players (e.g. a team photo): only post it publicly if the club allows player photos */
  showsPlayers?: boolean;
  now?: number;
}): Promise<JobSummary | null> {
  const existing = await getJobBySource(env, args.tenantId, "club", args.sourceId);
  if (existing) return existing;
  const club = await loadClubSocial(env, args.tenantId);
  const policy = await getPublicNamePolicy(env, args.tenantId);
  const targets = targetsFor(club, args.kind).filter((t) => t === "feed" || !args.showsPlayers || policy.photos);
  if (!targets.length) return null;
  const built = await args.build(club, policy);
  if (!built) return null;
  const now = args.now ?? Date.now();
  return insertJob(env, {
    tenantId: args.tenantId, fixtureId: args.fixtureId ?? null, sourceType: "club", sourceId: args.sourceId, kind: args.kind,
    caption: built.caption, graphic: built.graphic, targets, postAfter: now, now,
  });
}

export async function getJob(env: SocialEnv, tenantId: string, jobId: string): Promise<JobSummary | null> {
  const row = await env.DB.prepare(`SELECT * FROM social_jobs WHERE tenant_id = ? AND id = ?`).bind(tenantId, jobId).first<JobRow>();
  return row ? summary(env, row) : null;
}

export async function getJobBySource(env: SocialEnv, tenantId: string, sourceType: string, sourceId: string): Promise<JobSummary | null> {
  const row = await env.DB.prepare(`SELECT * FROM social_jobs WHERE tenant_id = ? AND source_type = ? AND source_id = ?`)
    .bind(tenantId, sourceType, sourceId).first<JobRow>();
  return row ? summary(env, row) : null;
}

export async function jobsForFixture(env: SocialEnv, tenantId: string, fixtureId: string): Promise<JobSummary[]> {
  const { results } = await env.DB.prepare(`SELECT * FROM social_jobs WHERE tenant_id = ? AND fixture_id = ? ORDER BY created_at`)
    .bind(tenantId, fixtureId).all<JobRow>();
  return (results || []).map((r) => summary(env, r));
}

/** Store a graphic for a job that doesn't have one yet (older app versions still upload their own). */
export async function attachImage(env: SocialEnv, tenantId: string, jobId: string, jpeg: ArrayBuffer | Uint8Array): Promise<JobSummary | null> {
  const job = await getJob(env, tenantId, jobId);
  if (!job || job.hasImage) return job;
  await storeJobImage(env, tenantId, jobId, jpeg);
  return getJob(env, tenantId, jobId);
}

export { processDueJobs, renderJobImage, cancelPost, drawAndPostSoon, storeJobImage } from "./publish";
