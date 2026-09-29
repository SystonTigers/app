/**
 * Match highlights: clips of the moments tapped in Match Centre, played from
 * the match's YouTube video. No react-native imports (tested in Node).
 */

export type MomentType = 'goal' | 'opp_goal' | 'chance' | 'save' | 'skill' | 'yellow' | 'red';

export interface HighlightMoment {
  id: string;
  type: MomentType;
  minute: number | null;
  title: string;
  detail: string | null;
  /** Seconds into the video */
  start: number;
  end: number;
  hidden: boolean;
  /** Staff tweaks already applied (seconds) */
  shift: { start: number; end: number };
}

export interface HighlightsView {
  fixture: { id: string; opponent: string; date: string; homeAway: 'home' | 'away'; homeScore: number | null; awayScore: number | null };
  video: { videoId: string; watchUrl: string; embeddable: boolean } | null;
  /** Where kick-off is in the video, or null until it's lined up */
  kickoffSec: number | null;
  lineUp: 'automatic' | 'manual' | null;
  moments: HighlightMoment[];
  momentsTapped: number;
  canEdit: boolean;
}

export interface HighlightsMatch {
  fixtureId: string;
  opponent: string;
  date: string;
  homeAway: 'home' | 'away';
  homeScore: number | null;
  awayScore: number | null;
  videoId: string;
  moments: number;
}

/** 754 → "12:34", 3723 → "1:02:03" */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** "12:34" or "1:02:03" or "754" → seconds; null if it isn't a time. */
export function parseClock(text: string): number | null {
  const t = text.trim();
  if (/^\d+$/.test(t)) return Number(t);
  const m = /^(?:(\d+):)?(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return null;
  const [h, min, s] = [Number(m[1] ?? 0), Number(m[2]), Number(m[3])];
  if (s > 59 || (m[1] !== undefined && min > 59)) return null;
  return h * 3600 + min * 60 + s;
}

/** The YouTube player for one clip (or the whole video when no clip). */
export function clipEmbedUrl(videoId: string, clip: { start: number; end: number } | null, origin?: string): string {
  const params = new URLSearchParams({ enablejsapi: '1', playsinline: '1', rel: '0', modestbranding: '1', autoplay: '1' });
  if (clip) {
    params.set('start', String(Math.floor(clip.start)));
    params.set('end', String(Math.ceil(clip.end)));
  }
  if (origin) params.set('origin', origin);
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
}

/**
 * What the YouTube player told us (its postMessage API): the clip ended, or
 * where it's up to. Null for anything else.
 */
export function readPlayerMessage(data: unknown): { ended?: boolean; currentTime?: number } | null {
  let msg: unknown = data;
  if (typeof data === 'string') {
    try {
      msg = JSON.parse(data);
    } catch {
      return null;
    }
  }
  const m = msg as { event?: string; info?: { playerState?: number; currentTime?: number } } | null;
  if (!m || m.event !== 'infoDelivery' || !m.info) return null;
  const out: { ended?: boolean; currentTime?: number } = {};
  if (m.info.playerState === 0) out.ended = true;
  if (typeof m.info.currentTime === 'number') out.currentTime = m.info.currentTime;
  return out.ended || out.currentTime !== undefined ? out : null;
}

/** The next clip to play after `index` that isn't hidden, or -1 at the end. */
export function nextClip(moments: HighlightMoment[], index: number): number {
  for (let i = index + 1; i < moments.length; i++) if (!moments[i].hidden) return i;
  return -1;
}

/** "2026-09-27" → "Sun 27 Sep" (UK style) */
export function matchDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}
