/**
 * Match highlights from the moments tapped in Match Centre, played straight
 * from the match's YouTube video (nothing is downloaded or re-encoded, so it
 * costs nothing). Pure functions: easy to test.
 *
 * Phones record when each button was first pressed (the clock time, sent
 * with the update). Taps still come a few seconds after the moment, so each
 * clip starts well before the tap and ends shortly after. A match can have
 * several videos (a stream that dropped and restarted): each tap is placed in
 * the part that was live at that time, by clock time (placeTap), so nothing
 * depends on lining up kick-off unless a part's start time isn't known.
 */
import type { LiveEvent, LiveEventType } from "./liveMatchState";

/** Seconds before and after the tap for each kind of moment. */
export const CLIP_WINDOWS: Partial<Record<LiveEventType, { before: number; after: number }>> = {
  goal: { before: 30, after: 8 },
  opp_goal: { before: 25, after: 6 },
  chance: { before: 20, after: 5 },
  save: { before: 15, after: 5 },
  skill: { before: 20, after: 5 },
  red: { before: 15, after: 5 },
  yellow: { before: 12, after: 4 },
};

export const HIGHLIGHT_TYPES = Object.keys(CLIP_WINDOWS) as LiveEventType[];

export interface MomentEdit {
  /** Seconds added to the start (negative = start earlier) */
  start?: number;
  /** Seconds added to the end */
  end?: number;
  hidden?: boolean;
}
export type HighlightEdits = Record<string, MomentEdit>;

export interface HighlightMoment {
  id: string;
  /** The YouTube video this clip plays from (a match can have several parts) */
  videoId: string;
  type: LiveEventType;
  minute: number | null;
  title: string;
  detail: string | null;
  /** Seconds into the video */
  start: number;
  end: number;
  hidden: boolean;
  /** Staff tweaks already applied, in seconds (so the app can add to them) */
  shift: { start: number; end: number };
  /** When the button was tapped (seconds into the video) */
  tapAt: number;
  /** Seconds the clip starts before the tap, and runs on after it */
  before: number;
  after: number;
  /** The score (us, them) just before and just after this moment, for scoreboards */
  scoreBefore: { us: number; them: number };
  scoreAfter: { us: number; them: number };
}

const LIMIT = 120; // no edit moves a clip edge more than two minutes
/** Longest the manager can make either side of a clip (seconds) */
export const MAX_SIDE = 120;

const clamp = (n: unknown): number => {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return Math.max(-LIMIT, Math.min(LIMIT, Math.round(v)));
};

/** Stored edits JSON to clean edits, ignoring anything malformed. */
export function parseEdits(raw: string | null | undefined): HighlightEdits {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    const out: HighlightEdits = {};
    for (const [id, e] of Object.entries(value ?? {})) {
      if (!e || typeof e !== "object" || id.length > 100) continue;
      const edit = e as Record<string, unknown>;
      const clean: MomentEdit = {};
      if (edit.start !== undefined) clean.start = clamp(edit.start);
      if (edit.end !== undefined) clean.end = clamp(edit.end);
      if (edit.hidden === true) clean.hidden = true;
      out[id] = clean;
    }
    return out;
  } catch {
    return {};
  }
}

function describe(e: LiveEvent, opponent: string): { title: string; detail: string | null } {
  const at = e.minute !== null ? ` ${e.minute}'` : "";
  const who = e.playerName ?? "";
  switch (e.type) {
    case "goal": return { title: `Goal${who ? ` · ${who}` : ""}${at}`, detail: e.player2Name ? `Assist: ${e.player2Name}` : null };
    case "opp_goal": return { title: `${opponent} goal${at}`, detail: null };
    case "chance": return { title: `Chance${who ? ` · ${who}` : ""}${at}`, detail: e.text };
    case "save": return { title: `Save${who ? ` · ${who}` : ""}${at}`, detail: e.text };
    case "skill": return { title: `Great play${who ? ` · ${who}` : ""}${at}`, detail: e.text };
    case "red": return { title: `Red card${who ? ` · ${who}` : ""}${at}`, detail: null };
    case "yellow": return { title: `Yellow card${who ? ` · ${who}` : ""}${at}`, detail: null };
    default: return { title: e.type, detail: null };
  }
}

/**
 * Where kick-off is in the video, from when the stream started. Null when we
 * don't know when it started (a pasted link): staff line it up by hand.
 */
export function kickoffFromStreamStart(events: LiveEvent[], streamStartedAt: number | null): number | null {
  const ko = events.find((e) => e.type === "kick_off");
  if (!ko || !streamStartedAt) return null;
  const sec = (ko.createdAt - streamStartedAt) / 1000;
  return sec >= 0 && sec < 6 * 3600 ? Math.round(sec) : null;
}

/** One video of a match, as far as timing goes. */
export interface PartTiming {
  videoId: string;
  /** When the stream went live (ms), if known */
  startedAt: number | null;
  /** When it was added to the match (ms) */
  addedAt: number;
  /** Staff line-up: `anchorSec` seconds into the video is the moment at `anchorAt` (ms) */
  anchorSec: number | null;
  anchorAt: number | null;
}

/** The clock time (ms) a part's video starts at, or null when it needs lining up. */
export function partOrigin(p: PartTiming): number | null {
  if (p.anchorSec !== null && p.anchorAt !== null) return p.anchorAt - p.anchorSec * 1000;
  return p.startedAt;
}

/** A tap up to this long before a part's start still belongs to it (clocks differ a little). */
const PART_SLACK_MS = 60_000;

/**
 * Which part a tap (clock time, ms) falls in and how many seconds into that
 * video, or null when the part it falls in hasn't been lined up yet.
 * Parts are ordered by when they started; a tap belongs to the last part that
 * had started by then (or the first, for a tap just before the stream began).
 */
export function placeTap(parts: PartTiming[], tapAt: number): { videoId: string; sec: number } | null {
  if (!parts.length) return null;
  const from = (p: PartTiming) => partOrigin(p) ?? p.addedAt;
  const ordered = [...parts].sort((a, b) => from(a) - from(b));
  let part = ordered[0];
  for (const p of ordered) if (from(p) <= tapAt + PART_SLACK_MS) part = p;
  const origin = partOrigin(part);
  if (origin === null) return null;
  return { videoId: part.videoId, sec: (tapAt - origin) / 1000 };
}

/** Places a tap (clock time, ms) in a video: seconds into it and which video, or null if it can't be. */
export type Placer = (tapAt: number) => { videoId: string; sec: number } | null;

/** The match's parts as a placer. */
export const partsPlacer = (parts: PartTiming[]): Placer => (tapAt) => placeTap(parts, tapAt);

/** The highlight clips for a match, in match order. Hidden ones are included (flagged) for staff. */
export function buildHighlights(events: LiveEvent[], place: Placer, opponent: string, edits: HighlightEdits = {}): HighlightMoment[] {
  const ko = events.find((e) => e.type === "kick_off");
  if (!ko) return [];
  const moments: HighlightMoment[] = [];
  const score = { us: 0, them: 0 };
  for (const e of events) {
    const scoreBefore = { ...score };
    if (e.type === "goal") score.us++;
    if (e.type === "opp_goal") score.them++;
    const w = CLIP_WINDOWS[e.type];
    if (!w) continue;
    const placed = place(e.createdAt);
    // Not on any lined-up video, or before the video began (it wasn't filmed)
    if (!placed || placed.sec + w.after < 0) continue;
    const at = placed.sec;
    const edit = edits[e.id] ?? {};
    const start = Math.max(0, Math.round(at - w.before + (edit.start ?? 0)));
    const end = Math.max(start + 3, Math.round(at + w.after + (edit.end ?? 0)));
    const tapAt = Math.round(at);
    moments.push({
      id: e.id, videoId: placed.videoId, type: e.type, minute: e.minute, ...describe(e, opponent), start, end, hidden: edit.hidden === true,
      shift: { start: edit.start ?? 0, end: edit.end ?? 0 },
      tapAt, before: Math.max(0, tapAt - start), after: Math.max(0, end - tapAt),
      scoreBefore, scoreAfter: { ...score },
    });
  }
  return moments;
}

/** Times from kick-off (for cutting the camera's own recording): every moment, in seconds after kick-off. */
export function fromKickOffPlacer(events: LiveEvent[], offset: number): Placer {
  const ko = events.find((e) => e.type === "kick_off");
  return (tapAt) => (ko ? { videoId: "", sec: offset + (tapAt - ko.createdAt) / 1000 } : null);
}

/**
 * The saved tweak for "start `before` seconds before the tap and end `after`
 * seconds after it", for a moment of this type.
 */
export function shiftFor(type: LiveEventType, before: number, after: number): { start: number; end: number } | null {
  const w = CLIP_WINDOWS[type];
  if (!w) return null;
  const b = Math.max(0, Math.min(MAX_SIDE, Math.round(before)));
  const a = Math.max(0, Math.min(MAX_SIDE, Math.round(after)));
  return { start: w.before - b, end: a - w.after };
}
