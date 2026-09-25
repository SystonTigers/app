/**
 * Live match state, worked out from the touchline events.
 * Pure functions (no database) so the rules are easy to test.
 */

export const PHASE_TYPES = ["kick_off", "half_time", "second_half", "full_time"] as const;
export const PLAY_TYPES = ["goal", "opp_goal", "yellow", "red", "sub", "note"] as const;
export type PhaseType = (typeof PHASE_TYPES)[number];
export type PlayType = (typeof PLAY_TYPES)[number];
export type LiveEventType = PhaseType | PlayType;

export type LiveStatus = "scheduled" | "live" | "half_time" | "full_time";

export interface LiveEvent {
  id: string;
  type: LiveEventType;
  minute: number | null;
  playerId: string | null;
  playerName: string | null;
  player2Id: string | null;
  player2Name: string | null;
  text: string | null;
  createdAt: number;
}

export interface LiveState {
  status: LiveStatus;
  period: 1 | 2 | null;
  ourScore: number;
  theirScore: number;
  kickedOffAt: number | null;
  secondHalfAt: number | null;
  endedAt: number | null;
  halfLength: number;
}

export const DEFAULT_HALF_LENGTH = 40;

export function isLiveEventType(value: unknown): value is LiveEventType {
  return typeof value === "string" && ([...PHASE_TYPES, ...PLAY_TYPES] as string[]).includes(value);
}

/** Half length is saved on the kick-off event, e.g. "25" for younger age groups. */
function halfLengthFrom(events: LiveEvent[]): number {
  const kickOff = events.find((e) => e.type === "kick_off");
  const minutes = Number(kickOff?.text);
  return Number.isInteger(minutes) && minutes >= 5 && minutes <= 60 ? minutes : DEFAULT_HALF_LENGTH;
}

/** Events must be the non-deleted ones, oldest first. */
export function computeState(events: LiveEvent[]): LiveState {
  const at = (type: PhaseType) => events.find((e) => e.type === type)?.createdAt ?? null;
  const kickedOffAt = at("kick_off");
  const halfTimeAt = at("half_time");
  const secondHalfAt = at("second_half");
  const endedAt = at("full_time");

  let status: LiveStatus = "scheduled";
  let period: 1 | 2 | null = null;
  if (endedAt !== null) status = "full_time";
  else if (secondHalfAt !== null) { status = "live"; period = 2; }
  else if (halfTimeAt !== null) status = "half_time";
  else if (kickedOffAt !== null) { status = "live"; period = 1; }

  return {
    status,
    period,
    ourScore: events.filter((e) => e.type === "goal").length,
    theirScore: events.filter((e) => e.type === "opp_goal").length,
    kickedOffAt,
    secondHalfAt,
    endedAt,
    halfLength: halfLengthFrom(events),
  };
}

/** Match minute at a moment: 1st minute starts at kick-off; 2nd half continues from the half length. */
export function matchMinute(state: LiveState, now: number): number | null {
  if (state.status === "live" && state.period === 1 && state.kickedOffAt !== null) {
    return Math.max(1, Math.floor((now - state.kickedOffAt) / 60000) + 1);
  }
  if (state.status === "live" && state.period === 2 && state.secondHalfAt !== null) {
    return state.halfLength + Math.max(1, Math.floor((now - state.secondHalfAt) / 60000) + 1);
  }
  if (state.status === "half_time") return state.halfLength;
  return null;
}

/** Why an event can't be recorded now, or null if it can. */
export function rejectReason(state: LiveState, type: LiveEventType): string | null {
  switch (type) {
    case "kick_off":
      return state.status === "scheduled" ? null : "This match has already kicked off.";
    case "half_time":
      return state.status === "live" && state.period === 1 ? null : "Half time can only be called during the first half.";
    case "second_half":
      return state.status === "half_time" ? null : "The second half can only start at half time.";
    case "full_time":
      return state.status === "live" || state.status === "half_time" ? null : "Full time can only be called during the match.";
    default:
      if (state.status === "scheduled") return "Kick off first, then record what happens.";
      if (state.status === "full_time") return "This match has finished. Undo full time to add something you missed.";
      return null;
  }
}

/** Phase events can only be undone when nothing has been recorded after them. */
export function undoBlockedReason(events: LiveEvent[], target: LiveEvent): string | null {
  // The result is saved at full time, so earlier updates are locked until full time is undone
  if (target.type !== "full_time" && events.some((e) => e.type === "full_time")) return "Undo full time first.";
  if (!(PHASE_TYPES as readonly string[]).includes(target.type)) return null;
  const later = events.some((e) => e.id !== target.id && e.createdAt > target.createdAt);
  return later ? "Undo the later updates first." : null;
}
