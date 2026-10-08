/**
 * Players' dates of birth (Manage Squad), used only for the club's birthday
 * posts. Tested by test/squadDob.test.js.
 */
import { isoDate } from './signingOn';

/** Why a typed date of birth won't do, or null when it's fine. */
export function dobProblem(text: string, now = new Date()): string | null {
  const iso = isoDate(text);
  if (!iso) return 'Type the date as day/month/year, for example 14/03/2012.';
  const today = now.toISOString().slice(0, 10);
  if (iso > today) return "That date hasn't happened yet. Check the year.";
  if (Number(iso.slice(0, 4)) < now.getUTCFullYear() - 100) return 'Check the year: that would make them over 100.';
  return null;
}

/** "2012-03-14" → "14 Mar" (no year, so no age). */
export function birthdayLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d);
}
