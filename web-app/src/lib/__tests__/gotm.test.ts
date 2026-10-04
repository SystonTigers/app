import { describe, expect, it } from 'vitest';
import { goalSummary, newVoteBody, newVoteProblem, previousMonth, votesText } from '../gotm';

describe('Goal of the Month helpers', () => {
  it('suggests last month, across a new year', () => {
    expect(previousMonth(new Date('2026-10-04T12:00:00Z'))).toBe('2026-09');
    expect(previousMonth(new Date('2027-01-02T12:00:00Z'))).toBe('2026-12');
  });

  it('describes a goal with what is known', () => {
    expect(goalSummary({ opponent: 'Page Rovers', minute: 23, date: '2026-09-20' })).toMatch(/^v Page Rovers · 23' · Sun,? 20 Sept?$/);
    expect(goalSummary({ opponent: null, minute: null, date: null })).toBe('');
  });

  it('builds the request from picked and typed goals', () => {
    const body = newVoteBody('2026-09', [{ eventId: 'e1', playerId: 'p1', playerName: 'Pat', fixtureId: 'f1', opponent: 'X', date: '2026-09-20', minute: 3, hasClip: true }], [
      { playerId: 'p2', description: '  Free kick ', videoUrl: ' ' },
    ]);
    expect(body).toEqual({ month: '2026-09', goals: [{ eventId: 'e1', playerId: 'p1', fixtureId: 'f1' }, { playerId: 'p2', description: 'Free kick', videoUrl: undefined }] });
  });

  it('checks the vote before opening it', () => {
    expect(newVoteProblem('', 3)).toMatch(/month/);
    expect(newVoteProblem('2026-09', 1)).toMatch(/at least 2/);
    expect(newVoteProblem('2026-09', 11)).toMatch(/up to 10/);
    expect(newVoteProblem('2026-09', 2)).toBeNull();
    expect(votesText(1)).toBe('1 vote');
  });
});
