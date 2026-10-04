import { describe, expect, it } from 'vitest';
import { fixtureState, isLive, kickOffText, liveMatchFor, nextFixture, upcomingFixtures } from '../fixtures';

const f = (id: string, date: string, status: string, time = '10:00') => ({ id, homeTeam: 'Us', awayTeam: id, date, status, time });
const live = (opponent: string, status = 'live') => ({ opponent, homeAway: 'home', status, minute: 12, ourScore: 1, theirScore: 0 });

describe('fixtures', () => {
  const now = new Date('2026-10-03T12:00:00Z');
  const list = [
    f('later', '2026-10-17T09:30:00Z', 'scheduled'),
    f('played', '2026-09-27T09:00:00Z', 'completed'),
    f('live', '2026-10-03T09:00:00Z', 'live'),
    f('soon', '2026-10-10T09:30:00Z', 'scheduled'),
    f('past-unplayed', '2026-09-20T09:00:00Z', 'scheduled'),
    f('today-later', '2026-10-03T14:00:00Z', 'scheduled'),
    f('today-earlier', '2026-10-03T09:00:00Z', 'scheduled'),
  ];

  it('lists only games still to come, soonest first', () => {
    expect(upcomingFixtures(list, now).map((x) => x.id)).toEqual(['today-later', 'soon', 'later']);
  });

  it('spots fixtures marked live', () => {
    expect(list.filter(isLive).map((x) => x.id)).toEqual(['live']);
  });

  it('only calls a game live when Match Centre says so', () => {
    const marked = list[2];
    expect(fixtureState(marked, [], now)).toBe('awaiting');
    expect(fixtureState(marked, [live('live')], now)).toBe('live');
    expect(fixtureState(marked, [live('live', 'half_time')], now)).toBe('live');
    expect(fixtureState(marked, [live('live', 'full_time')], now)).toBe('awaiting');
    expect(liveMatchFor(marked, [live('someone else')])).toBeNull();
  });

  it('treats a past game with no result as awaiting, never upcoming', () => {
    expect(fixtureState(list[4], [], now)).toBe('awaiting');
    expect(fixtureState(list[6], [], now)).toBe('awaiting');
    expect(fixtureState(list[1], [], now)).toBe('finished');
    expect(fixtureState(list[3], [], now)).toBe('upcoming');
  });

  it('counts a game with no kick-off time as upcoming all day', () => {
    expect(fixtureState(f('tbc', '2026-10-03T00:00:00Z', 'scheduled', ''), [], now)).toBe('upcoming');
    expect(fixtureState(f('tbc', '2026-10-02T00:00:00Z', 'scheduled', ''), [], now)).toBe('awaiting');
  });

  it('picks the next game to be played, skipping postponed ones', () => {
    const withPostponed = [...list, f('off', '2026-10-04T09:00:00Z', 'postponed')];
    expect(upcomingFixtures(withPostponed, now).map((x) => x.id)).toContain('off');
    expect(nextFixture(withPostponed, now)?.id).toBe('today-later');
    expect(nextFixture([list[2], list[4]], now)).toBeNull();
  });

  it('shows the typed kick-off time', () => {
    expect(kickOffText({ time: '10:30' })).toBe('10:30');
    expect(kickOffText({ time: '10:30:00' })).toBe('10:30');
    expect(kickOffText({ time: 'TBC' })).toBe('');
  });
});
