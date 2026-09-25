/**
 * Live match types and display helpers shared by Match Centre (staff) and
 * Live Match (everyone). No react-native imports, so it can be tested in Node.
 */

export type LiveEventType =
  | 'kick_off' | 'half_time' | 'second_half' | 'full_time'
  | 'goal' | 'opp_goal' | 'yellow' | 'red' | 'sub' | 'note';

export type LiveStatus = 'scheduled' | 'live' | 'half_time' | 'full_time';

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

export interface LiveMatchView {
  fixture: { id: string; opponent: string; date: string; time: string | null; venue: string | null; competition: string | null; homeAway: 'home' | 'away' };
  status: LiveStatus;
  period: 1 | 2 | null;
  ourScore: number;
  theirScore: number;
  kickedOffAt: number | null;
  secondHalfAt: number | null;
  endedAt: number | null;
  halfLength: number;
  minute: number | null;
  /** Newest first */
  events: LiveEvent[];
}

export interface NewLiveEvent {
  type: LiveEventType;
  clientEventId: string;
  playerId?: string;
  player2Id?: string;
  text?: string;
  minute?: number;
  halfLength?: number;
}

/** Same rule as the server: minute 1 starts at kick-off; the 2nd half carries on from the half length. */
export function currentMinute(match: Pick<LiveMatchView, 'status' | 'period' | 'kickedOffAt' | 'secondHalfAt' | 'halfLength'>, now: number): number | null {
  if (match.status === 'live' && match.period === 1 && match.kickedOffAt !== null) {
    return Math.max(1, Math.floor((now - match.kickedOffAt) / 60000) + 1);
  }
  if (match.status === 'live' && match.period === 2 && match.secondHalfAt !== null) {
    return match.halfLength + Math.max(1, Math.floor((now - match.secondHalfAt) / 60000) + 1);
  }
  return null;
}

export function statusLabel(match: Pick<LiveMatchView, 'status' | 'period' | 'kickedOffAt' | 'secondHalfAt' | 'halfLength'>, now: number): string {
  switch (match.status) {
    case 'scheduled': return 'Not started';
    case 'half_time': return 'Half time';
    case 'full_time': return 'Full time';
    default: {
      const minute = currentMinute(match, now);
      return minute !== null ? `${minute}'` : 'Live';
    }
  }
}

/** "Syston 2 - 1 Rovers", home team first. */
export function scoreline(match: LiveMatchView, clubName: string): { home: string; away: string; homeScore: number; awayScore: number } {
  return match.fixture.homeAway === 'home'
    ? { home: clubName, away: match.fixture.opponent, homeScore: match.ourScore, awayScore: match.theirScore }
    : { home: match.fixture.opponent, away: clubName, homeScore: match.theirScore, awayScore: match.ourScore };
}

/** One line for the timeline. */
export function describeEvent(e: LiveEvent, opponent: string): string {
  switch (e.type) {
    case 'kick_off': return 'Kick-off';
    case 'half_time': return 'Half time';
    case 'second_half': return 'Second half under way';
    case 'full_time': return 'Full time';
    case 'goal': return `GOAL! ${e.playerName ?? 'Unknown'}${e.player2Name ? ` (assist ${e.player2Name})` : ''}`;
    case 'opp_goal': return `${opponent} score${e.text ? ` (${e.text})` : ''}`;
    case 'yellow': return `Yellow card: ${e.playerName ?? 'Unknown'}`;
    case 'red': return `Red card: ${e.playerName ?? 'Unknown'}`;
    case 'sub': return `Sub: ${e.playerName ?? '?'} on for ${e.player2Name ?? '?'}`;
    case 'note': return e.text ?? '';
  }
}

export function newClientEventId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const PHASES: LiveEventType[] = ['kick_off', 'half_time', 'second_half', 'full_time'];

/**
 * Same rule as the server: after full time only "Full time" can be undone;
 * kick-off/half-time calls only while nothing has been recorded after them.
 * `events` is newest first.
 */
export function canUndo(events: LiveEvent[], target: LiveEvent): boolean {
  if (events.some((e) => e.type === 'full_time')) return target.type === 'full_time';
  if (PHASES.includes(target.type)) return events[0]?.id === target.id;
  return true;
}
