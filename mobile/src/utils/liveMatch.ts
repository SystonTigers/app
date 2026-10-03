/**
 * Live match types and display helpers shared by Match Centre (staff) and
 * Live Match (everyone). No react-native imports, so it can be tested in Node.
 */

export type LiveEventType =
  | 'kick_off' | 'half_time' | 'second_half' | 'full_time'
  | 'goal' | 'opp_goal' | 'yellow' | 'red' | 'sub' | 'note'
  /** Moments for the highlights: no score change, no posts or alerts */
  | 'chance' | 'save' | 'skill'
  /** The other team's cards: timeline only (no stats, posts or alerts) */
  | 'opp_yellow' | 'opp_red'
  /** One of our players off for a while (text = minutes); timeline and stats */
  | 'sin_bin';

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
  /** The clock as the server worked it out: "23'", "40+2'" (the app keeps it ticking with clockLabel) */
  clock?: string | null;
  /** Running well past full length: Match Centre asks whether it has finished */
  overdue?: boolean;
  /** Kicked off hours ago and never finished: "Awaiting full time" */
  stale?: boolean;
  /** Newest first */
  events: LiveEvent[];
  /** Staff only: automatic posts for these updates */
  posts?: SocialPost[];
  /** Staff only, after recording: the post just queued for it */
  newPost?: SocialPost | null;
  /** After undo: whether a post was stopped or taken down */
  undonePost?: { cancelled: boolean; instagramLeftUp: boolean; wasPublished?: boolean };
  /** After undoing an update that had already gone out: the "CORRECTION" post queued for it */
  correctionPost?: SocialPost | null;
  /** After full time: Man of the Match voting opened automatically */
}

export interface NewLiveEvent {
  type: LiveEventType;
  clientEventId: string;
  /** When the manager tapped (ms); used for the match clock and footage timings */
  occurredAt?: number;
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

/** Added time is shown as "40+3'" up to this many minutes, then "40+'" (same as the server). */
export const ADDED_TIME_SHOWN = 15;

/** "23'", "40+2'", "40+'" while the clock runs (same rule as the server's matchClock). */
export function clockLabel(match: Pick<LiveMatchView, 'status' | 'period' | 'kickedOffAt' | 'secondHalfAt' | 'halfLength'>, now: number): string | null {
  const minute = currentMinute(match, now);
  if (minute === null) return null;
  const end = match.period === 2 ? match.halfLength * 2 : match.halfLength;
  const added = minute - end;
  return added <= 0 ? `${minute}'` : added <= ADDED_TIME_SHOWN ? `${end}+${added}'` : `${end}+'`;
}

export function statusLabel(match: Pick<LiveMatchView, 'status' | 'period' | 'kickedOffAt' | 'secondHalfAt' | 'halfLength' | 'stale'>, now: number): string {
  if (match.stale) return 'Awaiting full time';
  switch (match.status) {
    case 'scheduled': return 'Not started';
    case 'half_time': return 'Half time';
    case 'full_time': return 'Full time';
    default: return clockLabel(match, now) ?? 'Live';
  }
}

/** Ids of yellow cards that were a player's second (they were sent off). Any order. */
export function secondYellowIds(events: LiveEvent[]): Set<string> {
  const booked = new Set<string>();
  const second = new Set<string>();
  for (const e of [...events].sort((a, b) => a.createdAt - b.createdAt)) {
    if (e.type !== 'yellow' || !e.playerId) continue;
    if (booked.has(e.playerId)) second.add(e.id);
    else booked.add(e.playerId);
  }
  return second;
}

/** Players sent off (red card or second yellow): they can't be picked again. */
export function sentOffIds(events: LiveEvent[]): Set<string> {
  const seconds = secondYellowIds(events);
  return new Set(events.filter((e) => e.playerId && (e.type === 'red' || seconds.has(e.id))).map((e) => e.playerId as string));
}

/** Sin bin length: a tenth of the match, at least 2 minutes (same as the server). */
export function sinBinMinutes(halfLength: number): number {
  return Math.max(2, Math.round((halfLength * 2) / 10));
}

/** Sin bins still running: who, and how long is left (the clock stops at half time). */
export function activeSinBins(match: Pick<LiveMatchView, 'events' | 'halfLength' | 'endedAt'>, now: number): Array<{ id: string; playerId: string | null; playerName: string | null; remainingMs: number }> {
  if (match.endedAt !== null && match.endedAt <= now) return [];
  const at = (type: LiveEventType) => match.events.find((e) => e.type === type)?.createdAt ?? null;
  const kickOff = at('kick_off');
  const halfTime = at('half_time');
  const secondHalf = at('second_half');
  const playing: Array<[number, number]> = [];
  if (kickOff !== null) playing.push([kickOff, halfTime ?? Infinity]);
  if (secondHalf !== null) playing.push([secondHalf, Infinity]);
  return match.events
    .filter((e) => e.type === 'sin_bin')
    .map((e) => {
      const length = Number(e.text);
      const total = (Number.isFinite(length) && length > 0 ? length : sinBinMinutes(match.halfLength)) * 60_000;
      const served = playing.reduce((sum, [from, to]) => sum + Math.max(0, Math.min(to, now) - Math.max(from, e.createdAt)), 0);
      return { id: e.id, playerId: e.playerId, playerName: e.playerName, remainingMs: Math.max(0, total - served) };
    })
    .filter((b) => b.remainingMs > 0);
}

/** "4:05" */
export function countdown(ms: number): string {
  const secs = Math.ceil(ms / 1000);
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

/** "Syston 2 - 1 Rovers", home team first. */
export function scoreline(match: LiveMatchView, clubName: string): { home: string; away: string; homeScore: number; awayScore: number } {
  return match.fixture.homeAway === 'home'
    ? { home: clubName, away: match.fixture.opponent, homeScore: match.ourScore, awayScore: match.theirScore }
    : { home: match.fixture.opponent, away: clubName, homeScore: match.theirScore, awayScore: match.ourScore };
}

/** One line for the timeline. `secondYellow`: this yellow was the player's second, so they're off. */
export function describeEvent(e: LiveEvent, opponent: string, secondYellow = false): string {
  if (e.type === 'yellow' && secondYellow) return `Second yellow, sent off: ${e.playerName ?? 'Unknown'}`;
  switch (e.type) {
    case 'kick_off': return 'Kick-off';
    case 'half_time': return 'Half time';
    case 'second_half': return 'Second half under way';
    case 'full_time': return 'Full time';
    case 'goal': return e.playerName ? `GOAL! ${e.playerName}${e.player2Name ? ` (assist ${e.player2Name})` : ''}` : 'GOAL!';
    case 'opp_goal': return `${opponent} score${e.text ? ` (${e.text})` : ''}`;
    case 'yellow': return `Yellow card: ${e.playerName ?? 'Unknown'}`;
    case 'red': return `Red card: ${e.playerName ?? 'Unknown'}`;
    case 'sub': return `Sub: ${e.playerName ?? '?'} on for ${e.player2Name ?? '?'}`;
    case 'note': return e.text ?? '';
    case 'chance': return `Chance${e.playerName ? `: ${e.playerName}` : ''}`;
    case 'save': return `Save${e.playerName ? `: ${e.playerName}` : ''}`;
    case 'skill': return `Great play${e.playerName ? `: ${e.playerName}` : ''}`;
    case 'opp_yellow': return `Yellow card: ${opponent}${e.text ? ` (${e.text})` : ''}`;
    case 'opp_red': return `Red card: ${opponent}${e.text ? ` (${e.text})` : ''}`;
    case 'sin_bin': return `Sin bin: ${e.playerName ?? 'Unknown'}${e.text ? ` (${e.text} min)` : ''}`;
  }
}

/** Which side of a two-column timeline an update belongs to: our team's, the opponent's, or the middle (whistles, notes). */
export function eventSide(e: LiveEvent): 'us' | 'them' | 'middle' {
  switch (e.type) {
    case 'opp_goal': case 'opp_yellow': case 'opp_red': return 'them';
    case 'kick_off': case 'half_time': case 'second_half': case 'full_time': case 'note': return 'middle';
    default: return 'us';
  }
}

/** The text for an update shown under its team's name (the team is already clear from the side). */
export function describeEventOnSide(e: LiveEvent, opponent: string, secondYellow = false): string {
  if (e.type === 'opp_goal') return `GOAL!${e.text ? ` ${e.text}` : ''}`;
  if (e.type === 'opp_yellow') return `Yellow card${e.text ? ` ${e.text}` : ''}`;
  if (e.type === 'opp_red') return `Red card${e.text ? ` ${e.text}` : ''}`;
  return describeEvent(e, opponent, secondYellow);
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

export type PostTarget = 'feed' | 'facebook' | 'instagram';

/** An automatic post for one update (staff only). */
export interface SocialPost {
  id: string;
  sourceId: string;
  kind: string;
  status: 'pending' | 'posting' | 'done' | 'cancelled' | 'failed';
  postAfter: number;
  targets: PostTarget[];
  results: Record<string, { ok: boolean; id?: string; error?: string; skipped?: boolean }>;
  hasImage: boolean;
  /** The graphic the server drew, once it's ready */
  imageUrl: string | null;
  caption: string;
}

const TARGET_NAMES: Record<PostTarget, string> = { feed: 'club app', facebook: 'Facebook', instagram: 'Instagram' };

/** "Posting to club app, Facebook in 42s" / "Posted to club app, Facebook" / problems. */
export function postStatusText(post: SocialPost, now: number): string {
  const names = post.targets.map((t) => TARGET_NAMES[t]).join(', ');
  switch (post.status) {
    case 'pending': {
      const secs = Math.ceil((post.postAfter - now) / 1000);
      return secs > 0 ? `Posting to ${names} in ${secs}s. Undo stops it.` : `Posting to ${names}…`;
    }
    case 'posting': return `Posting to ${names}…`;
    case 'cancelled': return 'Post cancelled';
    case 'done': {
      const posted = post.targets.filter((t) => post.results[t]?.ok && !post.results[t]?.skipped).map((t) => TARGET_NAMES[t]);
      const skipped = post.targets.filter((t) => post.results[t]?.skipped).map((t) => `${TARGET_NAMES[t]} (${post.results[t]?.error ?? 'skipped'})`);
      return [`Posted to ${posted.join(', ') || 'nowhere'}`, skipped.length ? `Not posted: ${skipped.join(', ')}` : ''].filter(Boolean).join('. ');
    }
    case 'failed': {
      const errors = post.targets.filter((t) => post.results[t] && !post.results[t].ok).map((t) => `${TARGET_NAMES[t]}: ${post.results[t].error ?? 'failed'}`);
      return `Couldn't post. ${errors.join('; ')}`;
    }
  }
}
