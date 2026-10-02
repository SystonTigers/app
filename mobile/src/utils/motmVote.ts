/** Man of the Match vote length. No react-native imports (tested in Node). */

/** Votes can stay open for up to 3 days */
export const MAX_VOTING_HOURS = 72;

/** Hours from the custom box ("5" hours or "2" days), or null unless it's 1 hour to 3 days. */
export function customHours(amount: string, unit: 'hours' | 'days'): number | null {
  const n = Number(amount.trim().replace(',', '.'));
  if (!amount.trim() || !Number.isFinite(n) || n <= 0) return null;
  const hours = Math.round((unit === 'days' ? n * 24 : n) * 4) / 4;
  return hours >= 1 && hours <= MAX_VOTING_HOURS ? hours : null;
}

/** "3 hours", "1 day", "2 days", "1.5 hours" */
export function lengthText(hours: number): string {
  if (hours % 24 === 0) return `${hours / 24} day${hours === 24 ? '' : 's'}`;
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}
