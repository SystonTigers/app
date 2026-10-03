import { describe, expect, it } from 'vitest';
import { isLive, kickOffText, upcomingFixtures } from '../fixtures';

const f = (id: string, date: string, status: string) => ({ id, homeTeam: 'Us', awayTeam: id, date, status });

describe('fixtures', () => {
  const now = new Date('2026-10-03T12:00:00Z');
  const list = [
    f('later', '2026-10-17T09:30:00Z', 'scheduled'),
    f('played', '2026-09-27T09:00:00Z', 'completed'),
    f('live', '2026-10-03T09:00:00Z', 'live'),
    f('soon', '2026-10-10T09:30:00Z', 'scheduled'),
    f('past-unplayed', '2026-09-20T09:00:00Z', 'scheduled'),
    f('today-later', '2026-10-03T14:00:00Z', 'scheduled'),
  ];

  it('lists only games still to come, soonest first', () => {
    expect(upcomingFixtures(list, now).map((x) => x.id)).toEqual(['today-later', 'soon', 'later']);
  });

  it('spots live games', () => {
    expect(list.filter(isLive).map((x) => x.id)).toEqual(['live']);
  });

  it('shows the typed kick-off time', () => {
    expect(kickOffText({ time: '10:30' })).toBe('10:30');
    expect(kickOffText({ time: '10:30:00' })).toBe('10:30');
    expect(kickOffText({ time: 'TBC' })).toBe('');
  });
});
