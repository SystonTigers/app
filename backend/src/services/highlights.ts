/**
 * Match highlights from the moments tapped in Match Centre, played straight
 * from the match's YouTube video (nothing is downloaded or re-encoded, so it
 * costs nothing). Pure functions: easy to test.
 *
 * Phones record when each button was tapped. Taps come a few seconds after
 * the moment, so each clip starts well before the tap and ends shortly after.
 */
import type { LiveEvent, LiveEventType } from "./liveMatchState";

/** Seconds before and after the tap for each kind of moment. */
export const CLIP_WINDOWS: Partial<Record<LiveEventType, { before: number; after: number }>> = {
  goal: { before: 20, after: 6 },
  opp_goal: { before: 18, after: 5 },
  chance: { before: 15, after: 4 },
  save: { before: 12, after: 4 },
  skill: { before: 15, after: 4 },
  red: { before: 12, after: 5 },
  yellow: { before: 10, after: 4 },
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
}

const LIMIT = 60; // no edit moves a clip edge more than a minute

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

/** The highlight clips for a match, in match order. Hidden ones are included (flagged) for staff. */
export function buildHighlights(events: LiveEvent[], kickoffSec: number, opponent: string, edits: HighlightEdits = {}): HighlightMoment[] {
  const ko = events.find((e) => e.type === "kick_off");
  if (!ko) return [];
  const moments: HighlightMoment[] = [];
  for (const e of events) {
    const w = CLIP_WINDOWS[e.type];
    if (!w) continue;
    const at = kickoffSec + (e.createdAt - ko.createdAt) / 1000;
    const edit = edits[e.id] ?? {};
    const start = Math.max(0, Math.round(at - w.before + (edit.start ?? 0)));
    const end = Math.max(start + 3, Math.round(at + w.after + (edit.end ?? 0)));
    moments.push({
      id: e.id, type: e.type, minute: e.minute, ...describe(e, opponent), start, end, hidden: edit.hidden === true,
      shift: { start: edit.start ?? 0, end: edit.end ?? 0 },
    });
  }
  return moments;
}
