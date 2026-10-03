/**
 * Dates and times as people in the UK write them ("Sat 4 Oct 2026", "10:30").
 * Every page formats through here so nothing falls back to the browser's
 * locale (a US browser would otherwise show 10/4/2026).
 */

const LOCALE = 'en-GB';
/** Matches are in the UK, so times show UK time whatever the viewer's (or server's) clock says. */
const TIME_ZONE = 'Europe/London';

type DateInput = Date | string | number | null | undefined;

/** A Date, or null for missing or unreadable values. Plain yyyy-mm-dd is read as that day, not UTC midnight. */
export function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    // Midday UTC is the same calendar day in the UK and almost everywhere else
    const [y, m, d] = value.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12));
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "4 Oct 2026" by default; pass options for other shapes (always UK order). */
export function formatDate(value: DateInput, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  const date = toDate(value);
  return date ? date.toLocaleDateString(LOCALE, { timeZone: TIME_ZONE, ...options }) : '';
}

/** "Sat 4 Oct" */
export function formatShortDate(value: DateInput): string {
  return formatDate(value, { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "Saturday 4 October 2026" */
export function formatLongDate(value: DateInput): string {
  return formatDate(value, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** "10:30" (24-hour clock) */
export function formatTime(value: DateInput, options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }): string {
  const date = toDate(value);
  return date ? date.toLocaleTimeString(LOCALE, { timeZone: TIME_ZONE, ...options }) : '';
}

/** "4 Oct 2026, 10:30" */
export function formatDateTime(value: DateInput, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }): string {
  const date = toDate(value);
  return date ? date.toLocaleString(LOCALE, { timeZone: TIME_ZONE, ...options }) : '';
}

/** yyyy-mm-dd for the UK calendar day a moment falls on (for comparing with match dates). */
export function ukDay(value: DateInput = new Date()): string {
  const date = toDate(value);
  if (!date) return '';
  const parts = new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** "£12.50" */
export function formatMoney(pence: number): string {
  return (pence / 100).toLocaleString(LOCALE, { style: 'currency', currency: 'GBP' });
}
