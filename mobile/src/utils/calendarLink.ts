/**
 * Links for subscribing to the club's fixtures calendar (the server's
 * /public/:club/calendar.ics). Subscribing keeps it up to date: new and
 * moved fixtures appear by themselves. No react-native imports.
 */

export function calendarUrl(apiBase: string, clubSlug: string): string {
  return `${apiBase.replace(/\/+$/, '')}/public/${encodeURIComponent(clubSlug)}/calendar.ics`;
}

/** iPhone, iPad and Mac calendars open webcal:// links as a subscription. */
export function webcalUrl(httpsUrl: string): string {
  return httpsUrl.replace(/^https?:\/\//, 'webcal://');
}

/** Google Calendar's "add by URL" page with the calendar filled in. */
export function googleCalendarUrl(httpsUrl: string): string {
  return `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl(httpsUrl))}`;
}
