/**
 * A match's videos (`fixture_videos`, migration 0035). Usually one, but a
 * stream that drops and is restarted, or one stream per half, gives several
 * parts. Each keeps when it started, so highlights place every tap in the
 * part that was live then (services/highlights.ts placeTap). The latest part
 * is also written to `fixtures.youtube_live_id` for "watch live".
 */
import type { LiveEvent } from "../liveMatchState";
import type { PartTiming } from "../highlights";

type DB = { DB: D1Database };

export interface VideoPart extends PartTiming {
  source: "youtube" | "link";
  embeddable: boolean;
}

interface PartRow {
  video_id: string; source: string; started_at: number | null; added_at: number;
  anchor_sec: number | null; anchor_at: number | null; embeddable: number;
}

const fromRow = (r: PartRow): VideoPart => ({
  videoId: r.video_id,
  source: r.source === "youtube" ? "youtube" : "link",
  startedAt: r.started_at ?? null,
  addedAt: r.added_at,
  anchorSec: r.anchor_sec ?? null,
  anchorAt: r.anchor_at ?? null,
  embeddable: r.embeddable !== 0,
});

/** A match's video parts, earliest first. */
export async function loadParts(env: DB, tenantId: string, fixtureId: string): Promise<VideoPart[]> {
  const { results } = await env.DB.prepare(
    `SELECT video_id, source, started_at, added_at, anchor_sec, anchor_at, embeddable FROM fixture_videos
     WHERE tenant_id = ? AND fixture_id = ? ORDER BY COALESCE(started_at, added_at), added_at`,
  ).bind(tenantId, fixtureId).all<PartRow>();
  return (results ?? []).map(fromRow);
}

/**
 * The parts with their line-up applied. Matches lined up before parts existed
 * kept the kick-off position on the fixture (`video_kickoff_sec`): that lines
 * up the first part from the kick-off tap.
 */
export function withLegacyKickoff(parts: VideoPart[], kickoffSec: number | null, events: LiveEvent[]): VideoPart[] {
  const ko = events.find((e) => e.type === "kick_off");
  if (kickoffSec === null || !ko || !parts.length || parts[0].anchorSec !== null) return parts;
  return [{ ...parts[0], anchorSec: kickoffSec, anchorAt: ko.createdAt }, ...parts.slice(1)];
}

/**
 * Add a video to a match (or update one already there). Never removes an
 * earlier part: a restarted stream is a new part, not a replacement.
 */
export async function addPart(env: DB, tenantId: string, fixtureId: string, part: { videoId: string; source: "youtube" | "link"; embeddable: boolean; startedAt?: number | null }, now = Date.now()): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO fixture_videos (tenant_id, fixture_id, video_id, source, started_at, added_at, embeddable)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (tenant_id, fixture_id, video_id) DO UPDATE SET
       started_at = COALESCE(fixture_videos.started_at, excluded.started_at),
       embeddable = excluded.embeddable,
       source = CASE WHEN excluded.source = 'youtube' THEN 'youtube' ELSE fixture_videos.source END`,
  ).bind(tenantId, fixtureId, part.videoId, part.source, part.startedAt ?? null, now, part.embeddable ? 1 : 0).run();
}

/** Record when a part's stream started (looked up from YouTube after it was added). */
export async function setPartStart(env: DB, tenantId: string, fixtureId: string, videoId: string, startedAt: number): Promise<void> {
  await env.DB.prepare(`UPDATE fixture_videos SET started_at = ? WHERE tenant_id = ? AND fixture_id = ? AND video_id = ? AND started_at IS NULL`)
    .bind(startedAt, tenantId, fixtureId, videoId).run();
}

/** Staff line-up: `sec` seconds into this part's video is the moment tapped at `at` (ms). Null clears it. */
export async function setPartAnchor(env: DB, tenantId: string, fixtureId: string, videoId: string, anchor: { sec: number; at: number } | null): Promise<boolean> {
  const res = await env.DB.prepare(`UPDATE fixture_videos SET anchor_sec = ?, anchor_at = ? WHERE tenant_id = ? AND fixture_id = ? AND video_id = ?`)
    .bind(anchor ? Math.round(anchor.sec) : null, anchor ? anchor.at : null, tenantId, fixtureId, videoId).run();
  return (res.meta?.changes ?? 0) > 0;
}

/** Remove one part (a wrong link). Returns the parts left, earliest first. */
export async function removePart(env: DB, tenantId: string, fixtureId: string, videoId: string): Promise<VideoPart[]> {
  await env.DB.prepare(`DELETE FROM fixture_videos WHERE tenant_id = ? AND fixture_id = ? AND video_id = ?`).bind(tenantId, fixtureId, videoId).run();
  return loadParts(env, tenantId, fixtureId);
}

export async function removeAllParts(env: DB, tenantId: string, fixtureId: string): Promise<void> {
  await env.DB.prepare(`DELETE FROM fixture_videos WHERE tenant_id = ? AND fixture_id = ?`).bind(tenantId, fixtureId).run();
}
