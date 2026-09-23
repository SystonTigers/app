/** Outcome of a match from our point of view, as stored in team_results.result. */
export type MatchOutcome = 'win' | 'draw' | 'loss';

/**
 * Derive the stored result and league points from a scoreline.
 * Non-numeric input is treated as 0 so a partially filled form can't
 * produce NaN in the table.
 */
export function outcomeFromScores(ourScore: unknown, theirScore: unknown): { result: MatchOutcome; points: number } {
  const ours = Number(ourScore) || 0;
  const theirs = Number(theirScore) || 0;
  if (ours > theirs) return { result: 'win', points: 3 };
  if (ours === theirs) return { result: 'draw', points: 1 };
  return { result: 'loss', points: 0 };
}
