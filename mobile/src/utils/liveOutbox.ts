/**
 * Match Centre's send queue: every tap is queued with the time it was made
 * and sent in order. With no signal the taps wait (saved on the phone, so
 * closing the app doesn't lose them) and go as soon as there's signal; the
 * server uses the tap time, so the clock, posts and video clips still line
 * up, and `clientEventId` stops a retried tap counting twice.
 * Pure helpers; storage and sending are in services/liveOutbox.ts.
 * Tested by test/liveOutbox.test.js.
 */
import type { LiveMatchView, NewLiveEvent } from './liveMatch';

export interface QueuedTap {
  fixtureId: string;
  event: NewLiveEvent;
  /** What it was, for the "waiting to send" list: "Goal · Sam Smith" */
  label: string;
}

/** Add a tap to the end (a tap already queued isn't added twice). */
export function enqueue(queue: QueuedTap[], tap: QueuedTap): QueuedTap[] {
  return [...queue.filter((q) => q.event.clientEventId !== tap.event.clientEventId), tap];
}

/** Take a tap off once it's sent (or refused). */
export function dequeue(queue: QueuedTap[], clientEventId: string): QueuedTap[] {
  return queue.filter((q) => q.event.clientEventId !== clientEventId);
}

/**
 * What to do after a send failed: no reply (no signal) or a server problem
 * means try again later; the server saying no (a 4xx, e.g. full time already
 * recorded) means drop it and show why, so one bad tap doesn't hold up the rest.
 */
export function afterFailure(status: number | undefined): 'retry' | 'drop' {
  if (status === undefined || status === 0 || status === 408 || status === 429 || status >= 500) return 'retry';
  return 'drop';
}

const LABELS: Partial<Record<NewLiveEvent['type'], string>> = {
  kick_off: 'Kick-off', half_time: 'Half time', second_half: 'Second half', full_time: 'Full time',
  goal: 'Goal', opp_goal: 'Their goal', yellow: 'Yellow card', red: 'Red card', sin_bin: 'Sin bin', sub: 'Sub',
  chance: 'Chance', save: 'Save', skill: 'Great play', opp_yellow: 'Their yellow', opp_red: 'Their red', note: 'Update',
};

/** "Goal · Sam Smith" */
export function tapLabel(type: NewLiveEvent['type'], playerName?: string | null): string {
  const base = LABELS[type] ?? 'Update';
  return playerName ? `${base} · ${playerName}` : base;
}

/** The line over the waiting list, or null when nothing's waiting. */
export function waitingLine(queue: QueuedTap[]): string | null {
  if (!queue.length) return null;
  return queue.length === 1
    ? '1 update waiting to send. It will go as soon as there is signal, with the time you tapped it.'
    : `${queue.length} updates waiting to send. They'll go in order as soon as there is signal, with the times you tapped them.`;
}

/** Queued taps for one match, oldest first. */
export function queuedFor(queue: QueuedTap[], fixtureId: string): QueuedTap[] {
  return queue.filter((q) => q.fixtureId === fixtureId);
}

/**
 * The match as it will be once the queued taps arrive: phase, clock times and
 * score move straight away, and the taps show in the timeline (with their
 * clientEventId as id, so Undo can take one back off the queue).
 */
export function withQueued(match: LiveMatchView, queue: QueuedTap[], names: Map<string, string> = new Map()): LiveMatchView {
  const mine = queuedFor(queue, match.fixture.id);
  if (!mine.length) return match;
  const next: LiveMatchView = { ...match, events: [...match.events] };
  for (const { event } of mine) {
    const at = event.occurredAt ?? Date.now();
    switch (event.type) {
      case 'kick_off': next.status = 'live'; next.period = 1; next.kickedOffAt = next.kickedOffAt ?? at; if (event.halfLength) next.halfLength = event.halfLength; break;
      case 'half_time': next.status = 'half_time'; break;
      case 'second_half': next.status = 'live'; next.period = 2; next.secondHalfAt = next.secondHalfAt ?? at; break;
      case 'full_time': next.status = 'full_time'; next.endedAt = next.endedAt ?? at; break;
      case 'goal': next.ourScore += 1; break;
      case 'opp_goal': next.theirScore += 1; break;
      default: break;
    }
    next.events.unshift({
      id: event.clientEventId, type: event.type, minute: event.minute ?? null,
      playerId: event.playerId ?? null, playerName: event.playerId ? names.get(event.playerId) ?? null : null,
      player2Id: event.player2Id ?? null, player2Name: event.player2Id ? names.get(event.player2Id) ?? null : null,
      text: event.text ?? null, createdAt: at,
    });
  }
  return next;
}

/** A match that hasn't reached the server yet because its kick-off is still queued. */
export function queuedKickOff(
  fixture: { id: string; opponent: string; date: string; time: string | null },
  queue: QueuedTap[],
): LiveMatchView | null {
  const ko = queuedFor(queue, fixture.id).find((q) => q.event.type === 'kick_off');
  if (!ko) return null;
  const base: LiveMatchView = {
    fixture: { ...fixture, venue: null, competition: null, homeAway: 'home' },
    status: 'scheduled', period: null, ourScore: 0, theirScore: 0, kickedOffAt: null, secondHalfAt: null, endedAt: null,
    halfLength: ko.event.halfLength ?? 40, minute: null, events: [],
  };
  return withQueued(base, queue);
}
