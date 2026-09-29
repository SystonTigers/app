/**
 * Live video for matches: set by staff (a pasted YouTube link) or found on the
 * club's connected YouTube channel by the once-a-minute cron. The first time a
 * match gets a stream, members who aren't at the ground get "Live now".
 *
 * YouTube's free daily allowance is shared by every club, so each channel is
 * only checked when it matters (`checkEvery`): every minute from 15 minutes
 * before kick-off to 30 minutes after, then every 3 minutes for a late start
 * up to 2 hours after, and every 5 minutes while a stream is on to notice it
 * ending. Roughly 40 calls a match instead of 225.
 */
import { decryptToken, encryptToken } from "../social/tokenCrypto";
import { loadEvents, loadFixture } from "../liveMatch";
import { queueStreamAlert, type AlertsEnv } from "../matchAlerts/queue";
import { kickOffAt, todaysFixtureRows, type FixtureRow } from "../matchDay";
import { activeBroadcasts, refreshAccessToken, YouTubeAuthError, type Broadcast, type YouTubeEnv } from "./youtube";

export type StreamEnv = AlertsEnv & YouTubeEnv & { KV_IDEMP: KVNamespace };

const BEFORE_MS = 45 * 60_000;
const AFTER_MS = 3 * 3600_000;

/** KV flag shown on the settings page when the club needs to connect YouTube again. */
export const reconnectKey = (tenantId: string) => `yt_reconnect:${tenantId}`;
const accessKey = (tenantId: string) => `yt_access:${tenantId}`;

/**
 * Point a fixture at a stream. Returns true if it changed. The first stream
 * for a match (before full time) queues the "Live now" notification.
 */
export async function setFixtureStream(env: StreamEnv, tenantId: string, fixtureId: string, stream: { videoId: string; source: "youtube" | "link"; embeddable: boolean }, now = Date.now()): Promise<boolean> {
  const res = await env.DB.prepare(
    `UPDATE fixtures SET youtube_live_id = ?, youtube_status = 'live', stream_source = ?, stream_embeddable = ?,
       stream_started_at = COALESCE(CASE WHEN youtube_live_id = ? THEN stream_started_at END, ?)
     WHERE tenant_id = ? AND id = ? AND NOT (COALESCE(youtube_live_id, '') = ? AND COALESCE(youtube_status, '') = 'live' AND COALESCE(stream_source, '') = ? AND COALESCE(stream_embeddable, -1) = ?)`,
  ).bind(stream.videoId, stream.source, stream.embeddable ? 1 : 0, stream.videoId, now, tenantId, fixtureId, stream.videoId, stream.source, stream.embeddable ? 1 : 0).run();
  if ((res.meta?.changes ?? 0) === 0) return false;

  const fixture = await loadFixture(env, tenantId, fixtureId);
  const events = fixture ? await loadEvents(env, tenantId, fixtureId) : [];
  if (fixture && !events.some((e) => e.type === "full_time")) {
    await queueStreamAlert(env, tenantId, fixture, events);
  }
  return true;
}

export async function clearFixtureStream(env: StreamEnv, tenantId: string, fixtureId: string): Promise<void> {
  await env.DB.prepare(
    `UPDATE fixtures SET youtube_live_id = NULL, youtube_status = NULL, stream_source = NULL, stream_embeddable = NULL, stream_started_at = NULL
     WHERE tenant_id = ? AND id = ?`,
  ).bind(tenantId, fixtureId).run();
}

async function accessToken(env: StreamEnv, tenantId: string, stored: string): Promise<string> {
  const cached = await env.KV_IDEMP.get(accessKey(tenantId));
  if (cached) {
    try {
      return await decryptToken(env.SOCIAL_TOKEN_KEY, cached);
    } catch {
      // key rotated: fall through and refresh
    }
  }
  const refresh = await decryptToken(env.SOCIAL_TOKEN_KEY, stored);
  const { accessToken: token, expiresIn } = await refreshAccessToken(env, refresh);
  await env.KV_IDEMP.put(accessKey(tenantId), await encryptToken(env.SOCIAL_TOKEN_KEY, token), { expirationTtl: Math.max(60, expiresIn - 300) });
  return token;
}

/** Fixtures worth checking now: kick-off in the window, time unknown, or a stream we think is still on. */
export function inWindow(row: FixtureRow, now: number): boolean {
  if (row.stream_source === "youtube" && row.youtube_status === "live") return true;
  if (row.match_status === "full_time") return false;
  const ko = kickOffAt(row.fixture_date, row.kick_off_time);
  return ko === null || (now >= ko - BEFORE_MS && now <= ko + AFTER_MS);
}

const MINUTE = 60_000;

/**
 * How often (in minutes) to check the club's channel now, or null when there's
 * nothing to look for. Fixtures that already have a pasted link don't need it.
 */
export function checkEvery(rows: FixtureRow[], now: number): number | null {
  let every: number | null = null;
  const use = (n: number) => { every = every === null ? n : Math.min(every, n); };
  for (const r of rows) {
    if (r.youtube_live_id && r.youtube_status === "live") {
      if (r.stream_source === "youtube") use(5); // notice when it ends
      continue;
    }
    if (r.match_status === "full_time" || r.youtube_live_id) continue;
    const ko = kickOffAt(r.fixture_date, r.kick_off_time);
    if (ko === null) { use(5); continue; }
    if (now < ko - 15 * MINUTE) continue;
    if (now <= ko + 30 * MINUTE) use(1);
    else if (now <= ko + 120 * MINUTE) use(3);
  }
  return every;
}

/** Whether this minute is one to check on, for a check every `every` minutes. */
export function isCheckMinute(every: number, now: number): boolean {
  return Math.floor(now / MINUTE) % every === 0;
}

/** Which fixture a new broadcast belongs to: the one kicking off nearest now that has no live stream yet. */
export function pickFixture(rows: FixtureRow[], now: number): FixtureRow | null {
  const free = rows.filter((r) => r.match_status !== "full_time" && !(r.youtube_status === "live" && r.youtube_live_id));
  const distance = (r: FixtureRow) => Math.abs((kickOffAt(r.fixture_date, r.kick_off_time) ?? now) - now);
  return free.sort((a, b) => distance(a) - distance(b))[0] ?? null;
}

/** One club: match what's live on the channel to today's fixtures. */
export async function detectClubStreams(env: StreamEnv, tenantId: string, storedToken: string, now = Date.now()): Promise<number> {
  const rows = (await todaysFixtureRows(env, tenantId, new Date(now))).filter((r) => inWindow(r, now));
  if (!rows.length) return 0;
  const every = checkEvery(rows, now);
  if (every === null || !isCheckMinute(every, now)) return 0;

  let live: Broadcast[];
  try {
    live = await activeBroadcasts(await accessToken(env, tenantId, storedToken));
  } catch (err) {
    if (err instanceof YouTubeAuthError) {
      await env.KV_IDEMP.delete(accessKey(tenantId));
      await env.KV_IDEMP.put(reconnectKey(tenantId), "1", { expirationTtl: 30 * 86400 });
    }
    throw err;
  }
  await env.KV_IDEMP.delete(reconnectKey(tenantId));
  const liveIds = new Set(live.map((b) => b.videoId));

  // Streams that have stopped: the video stays for watching back
  for (const r of rows) {
    if (r.stream_source === "youtube" && r.youtube_status === "live" && r.youtube_live_id && !liveIds.has(r.youtube_live_id)) {
      await env.DB.prepare(`UPDATE fixtures SET youtube_status = 'ended' WHERE tenant_id = ? AND id = ?`).bind(tenantId, r.id).run();
      r.youtube_status = "ended";
    }
  }

  let changed = 0;
  const known = new Set(rows.map((r) => r.youtube_live_id).filter(Boolean));
  for (const b of live) {
    if (b.privacy === "private" || known.has(b.videoId)) continue;
    const target = pickFixture(rows, now);
    if (!target) break;
    if (await setFixtureStream(env, tenantId, target.id, { videoId: b.videoId, source: "youtube", embeddable: b.embeddable }, now)) changed++;
    target.youtube_live_id = b.videoId;
    target.youtube_status = "live";
    known.add(b.videoId);
  }
  return changed;
}

/** Every club with YouTube connected (once a minute from the cron). */
export async function detectStreams(env: StreamEnv, now = Date.now()): Promise<number> {
  if (!env.YT_CLIENT_ID || !env.YT_CLIENT_SECRET || !env.SOCIAL_TOKEN_KEY) return 0;
  const { results } = await env.DB.prepare(`SELECT tenant_id, access_token_enc FROM social_connections WHERE platform = 'youtube'`)
    .all<{ tenant_id: string; access_token_enc: string }>();
  let total = 0;
  for (const c of results || []) {
    try {
      total += await detectClubStreams(env, c.tenant_id, c.access_token_enc, now);
    } catch (err) {
      console.error(JSON.stringify({ event: "stream_detect", outcome: "failed", tenant: c.tenant_id, error: err instanceof Error ? err.message : String(err) }));
    }
  }
  return total;
}
