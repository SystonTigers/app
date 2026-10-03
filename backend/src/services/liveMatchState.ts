/**
 * Live match state, worked out from the touchline events.
 * Pure functions (no database) so the rules are easy to test.
 */

export const PHASE_TYPES = ["kick_off", "half_time", "second_half", "full_time"] as const;
/**
 * chance / save / skill: moments for the highlights (no score change, no posts or alerts).
 * opp_yellow / opp_red: the other team's cards, shown on the timeline only (no stats, posts or alerts).
 * sin_bin: one of our players off for a while (text = minutes); timeline and stats, no posts or alerts.
 * A player's second "yellow" in a match is a second yellow: they're sent off (see secondYellowIds).
 */
export const PLAY_TYPES = ["goal", "opp_goal", "yellow", "red", "sub", "note", "chance", "save", "skill", "opp_yellow", "opp_red", "sin_bin"] as const;
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

/** Added time is shown as "40+3'" up to this many minutes, then "40+'". */
export const ADDED_TIME_SHOWN = 15;
/** Still on this many minutes after both halves should have finished: ask staff whether it's over. */
export const OVERDUE_AFTER_MIN = 20;
/** No full time this long after kick-off: the match was forgotten, so it's no longer shown as live. */
export const STALE_AFTER_MS = 4 * 3600_000;

/** Minutes on the clock since the half started, with no cap (1st minute starts at kick-off). */
function elapsedMinute(state: LiveState, now: number): number | null {
  if (state.status === "live" && state.period === 1 && state.kickedOffAt !== null) {
    return Math.max(1, Math.floor((now - state.kickedOffAt) / 60000) + 1);
  }
  if (state.status === "live" && state.period === 2 && state.secondHalfAt !== null) {
    return state.halfLength + Math.max(1, Math.floor((now - state.secondHalfAt) / 60000) + 1);
  }
  if (state.status === "half_time") return state.halfLength;
  return null;
}

/** Where the current half ends on the clock: the half length, or twice it in the 2nd half. */
function periodEnd(state: LiveState): number {
  return state.period === 2 ? state.halfLength * 2 : state.halfLength;
}

/**
 * Match minute for an update recorded now: the 2nd half carries on from the
 * half length, and added time counts on up to ADDED_TIME_SHOWN minutes (so a
 * match left running can't stamp "558'").
 */
export function matchMinute(state: LiveState, now: number): number | null {
  const elapsed = elapsedMinute(state, now);
  return elapsed === null ? null : Math.min(elapsed, periodEnd(state) + ADDED_TIME_SHOWN);
}

export interface MatchClock {
  /** Never past the end of the half (40, not 42), for screens that only show a number */
  minute: number | null;
  /** "23'", "40+2'", or "40+'" once added time passes ADDED_TIME_SHOWN; null when the clock isn't running */
  label: string | null;
  /** Running well past full length: staff are asked whether it has finished */
  overdue: boolean;
  /** Kicked off more than STALE_AFTER_MS ago with no full time: shown as "Awaiting full time", not live */
  stale: boolean;
}

export function matchClock(state: LiveState, now: number): MatchClock {
  const on = (state.status === "live" || state.status === "half_time") && state.kickedOffAt !== null;
  const sinceKickOff = on && state.kickedOffAt !== null ? now - state.kickedOffAt : 0;
  const stale = on && sinceKickOff > STALE_AFTER_MS;
  const overdue = on && sinceKickOff > (state.halfLength * 2 + OVERDUE_AFTER_MIN) * 60_000;
  const elapsed = elapsedMinute(state, now);
  if (stale || elapsed === null) return { minute: null, label: null, overdue, stale };
  if (state.status === "half_time") return { minute: state.halfLength, label: null, overdue, stale };
  const end = periodEnd(state);
  const added = elapsed - end;
  const label = added <= 0 ? `${elapsed}'` : added <= ADDED_TIME_SHOWN ? `${end}+${added}'` : `${end}+'`;
  return { minute: Math.min(elapsed, end), label, overdue, stale };
}

/** Ids of yellow cards that were a player's second in the match (so they were sent off). Events oldest first. */
export function secondYellowIds(events: LiveEvent[]): Set<string> {
  const booked = new Set<string>();
  const second = new Set<string>();
  for (const e of events) {
    if (e.type !== "yellow" || !e.playerId) continue;
    if (booked.has(e.playerId)) second.add(e.id);
    else booked.add(e.playerId);
  }
  return second;
}

/** Players sent off (a red card or a second yellow). */
export function sentOffIds(events: LiveEvent[]): Set<string> {
  const seconds = secondYellowIds(events);
  return new Set(events.filter((e) => e.playerId && (e.type === "red" || seconds.has(e.id))).map((e) => e.playerId as string));
}

/**
 * Sin bin length: 10% of the match's full length (the Laws of the Game
 * guidance for temporary dismissals), so 8 minutes with 40-minute halves,
 * 5 with 25-minute halves. At least 2 minutes.
 */
export function sinBinMinutes(halfLength: number): number {
  return Math.max(2, Math.round((halfLength * 2) / 10));
}

/** Time a sin bin has left (ms). The clock stops at half time and the sin bin ends at full time. */
export function sinBinRemainingMs(events: LiveEvent[], sinBin: LiveEvent, now: number): number {
  const state = computeState(events);
  const length = Number(sinBin.text);
  const total = (Number.isFinite(length) && length > 0 ? length : sinBinMinutes(state.halfLength)) * 60_000;
  if (state.endedAt !== null && state.endedAt <= now) return 0;
  const halfTimeAt = events.find((e) => e.type === "half_time")?.createdAt ?? null;
  const playing: Array<[number, number]> = [];
  if (state.kickedOffAt !== null) playing.push([state.kickedOffAt, halfTimeAt ?? Infinity]);
  if (state.secondHalfAt !== null) playing.push([state.secondHalfAt, Infinity]);
  const served = playing.reduce((sum, [from, to]) => sum + Math.max(0, Math.min(to, now) - Math.max(from, sinBin.createdAt)), 0);
  return Math.max(0, total - served);
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

export interface LineupEntry { playerId: string; role: "starter" | "sub" }

/**
 * Minutes each player was on the pitch in one match, from the line-up and the
 * Match Centre updates (oldest first): starters from kick-off, subs from when
 * they came on, until they went off, were sent off (red or second yellow) or
 * full time. A match lasts two halves of the kick-off's half length (40 if
 * none); added time isn't counted and a match ended early stops there. Sin
 * bins still count as playing time. With no Match Centre updates (a match
 * report) starters get the full match and a red card's minute stops the clock.
 */
export function minutesPlayed(lineup: LineupEntry[], events: LiveEvent[]): Map<string, number> {
  const half = halfLengthFrom(events);
  const htIndex = events.findIndex((e) => e.type === "half_time");
  const shIndex = events.findIndex((e) => e.type === "second_half");
  const phased = events.some((e) => e.type === "kick_off");
  const clamp = (m: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, m));
  // Where an update falls on the regular clock, by its place in the match
  const onClock = (e: LiveEvent, index: number): number => {
    const m = e.minute ?? 0;
    // No phases, or half time never tapped: the minute stands on its own
    if (!phased || htIndex === -1) return clamp(m, 0, half * 2);
    if (shIndex !== -1 && index > shIndex) return clamp(m, half, half * 2);
    if (htIndex !== -1 && index > htIndex) return half;
    return clamp(m, 0, half);
  };
  const ftIndex = events.findIndex((e) => e.type === "full_time");
  const end = ftIndex === -1 ? half * 2 : onClock(events[ftIndex], ftIndex);

  const seconds = secondYellowIds(events);
  const onSince = new Map<string, number>();
  const everOn = new Set<string>();
  const sentOff = new Set<string>();
  const minutes = new Map<string, number>();
  const comeOff = (id: string, at: number) => {
    const from = onSince.get(id);
    if (from === undefined) return;
    minutes.set(id, (minutes.get(id) ?? 0) + Math.max(0, at - from));
    onSince.delete(id);
  };
  for (const p of lineup) {
    if (p.role === "starter") { onSince.set(p.playerId, 0); everOn.add(p.playerId); }
  }
  events.forEach((e, index) => {
    if (ftIndex !== -1 && index > ftIndex) return;
    const at = onClock(e, index);
    if (e.type === "sub") {
      // Going off without having come on: the line-up was incomplete, so they started
      if (e.player2Id && !onSince.has(e.player2Id) && !everOn.has(e.player2Id)) onSince.set(e.player2Id, 0);
      if (e.player2Id) { everOn.add(e.player2Id); comeOff(e.player2Id, at); }
      if (e.playerId && !sentOff.has(e.playerId) && !onSince.has(e.playerId)) { onSince.set(e.playerId, at); everOn.add(e.playerId); }
    } else if (e.playerId && (e.type === "red" || seconds.has(e.id))) {
      comeOff(e.playerId, at);
      sentOff.add(e.playerId);
    }
  });
  for (const id of [...onSince.keys()]) comeOff(id, end);
  return minutes;
}
