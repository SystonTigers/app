/**
 * A player's goals on video: every Match Centre goal they scored in a match
 * with a YouTube video lined up, as a clip of that video (the same clip as
 * the match's Highlights, so staff trims and hidden clips apply).
 */
import { buildHighlights, parseEdits, partsPlacer } from "../highlights";
import { loadParts, withLegacyKickoff } from "../stream/parts";
import { loadEvents, loadFixture } from "../liveMatch";
import { streamView } from "../matchDay";

type Env = { DB: D1Database };

export interface GoalClip {
  id: string;
  fixtureId: string;
  opponent: string;
  date: string;
  minute: number | null;
  title: string;
  detail: string | null;
  videoId: string;
  /** Seconds into the video */
  start: number;
  end: number;
  embeddable: boolean;
  watchUrl: string;
}

const MAX_MATCHES = 40;

/**
 * Clips of the goals in one match, by goal event id: only when the match has
 * a YouTube video lined up with kick-off. Goals staff hid are left out.
 */
export async function fixtureGoalClips(env: Env, tenantId: string, fixtureId: string): Promise<Map<string, GoalClip>> {
  const clips = new Map<string, GoalClip>();
  const [fixture, row, events] = await Promise.all([
    loadFixture(env, tenantId, fixtureId),
    env.DB.prepare(
      `SELECT youtube_live_id, youtube_status, stream_source, stream_embeddable, stream_started_at, video_kickoff_sec, highlight_edits
       FROM fixtures WHERE tenant_id = ? AND id = ?`,
    ).bind(tenantId, fixtureId).first<{
      youtube_live_id: string | null; youtube_status: string | null; stream_source: string | null; stream_embeddable: number | null;
      stream_started_at: number | null; video_kickoff_sec: number | null; highlight_edits: string | null;
    }>(),
    loadEvents(env, tenantId, fixtureId),
  ]);
  const video = row ? streamView(row) : null;
  if (!fixture || !row || !video) return clips;
  const parts = withLegacyKickoff(await loadParts(env, tenantId, fixtureId), row.video_kickoff_sec, events);
  const goals = new Set(events.filter((e) => e.type === "goal").map((e) => e.id));
  for (const m of buildHighlights(events, partsPlacer(parts), fixture.opponent, parseEdits(row.highlight_edits))) {
    if (!goals.has(m.id) || m.hidden) continue;
    const part = parts.find((p) => p.videoId === m.videoId);
    const watchUrl = `https://www.youtube.com/watch?v=${m.videoId}`;
    clips.set(m.id, {
      id: m.id, fixtureId, opponent: fixture.opponent, date: fixture.date.slice(0, 10), minute: m.minute, title: m.title, detail: m.detail,
      videoId: m.videoId, start: m.start, end: m.end, embeddable: part?.embeddable ?? video.embeddable, watchUrl: `${watchUrl}&t=${m.start}s`,
    });
  }
  return clips;
}

export async function playerGoalClips(env: Env, tenantId: string, playerId: string): Promise<GoalClip[]> {
  const { results } = await env.DB.prepare(
    `SELECT e.fixture_id, MAX(f.fixture_date) AS d FROM live_match_events e
       JOIN fixtures f ON f.id = e.fixture_id AND f.tenant_id = e.tenant_id
     WHERE e.tenant_id = ? AND e.type = 'goal' AND e.player_id = ? AND e.deleted_at IS NULL AND f.youtube_live_id IS NOT NULL
     GROUP BY e.fixture_id ORDER BY d DESC LIMIT ?`,
  ).bind(tenantId, playerId, MAX_MATCHES).all<{ fixture_id: string }>();

  const ids = new Set((await env.DB.prepare(
    `SELECT id FROM live_match_events WHERE tenant_id = ? AND type = 'goal' AND player_id = ? AND deleted_at IS NULL`,
  ).bind(tenantId, playerId).all<{ id: string }>()).results?.map((r) => r.id));
  const clips: GoalClip[] = [];
  for (const { fixture_id: fixtureId } of results ?? []) {
    for (const clip of (await fixtureGoalClips(env, tenantId, fixtureId)).values()) {
      if (ids.has(clip.id)) clips.push(clip);
    }
  }
  return clips;
}
