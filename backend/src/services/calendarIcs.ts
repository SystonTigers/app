/**
 * The club's fixtures as a calendar file (iCalendar, RFC 5545) for phones and
 * computers to subscribe to: GET /public/:club/calendar.ics (anyone; fixtures
 * are public on the club page) and GET /api/v1/calendar/export (members).
 * Times are UK local (TZID=Europe/London), so they stay right through the
 * clock changes. Pure: no database.
 */

export interface CalendarFixture {
  id: string;
  fixture_date: string;
  kick_off_time: string | null;
  opponent: string;
  home_team: string | null;
  away_team: string | null;
  venue: string | null;
  competition: string | null;
  status: string | null;
}

const LONDON = [
  "BEGIN:VTIMEZONE", "TZID:Europe/London",
  "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0000", "TZOFFSETTO:+0100", "TZNAME:BST", "DTSTART:19700329T010000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
  "BEGIN:STANDARD", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0000", "TZNAME:GMT", "DTSTART:19701025T020000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
  "END:VTIMEZONE",
];

/** Commas, semicolons, backslashes and new lines escaped as the format needs. */
export function icsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 bytes are folded (a new line then a space). */
export function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let current = "";
  let size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (size + n > (out.length ? 74 : 75)) { out.push(current); current = ""; size = 0; }
    current += ch; size += n;
  }
  out.push(current);
  return out.join("\r\n ");
}

/** "2026-10-10" + "10:30" → "20261010T103000"; the end is the start plus some minutes (across midnight too). */
export function localStamp(date: string, time: string | null, addMinutes = 0): string | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})/.exec(date || "");
  if (!d) return null;
  const t = /^(\d{1,2}):(\d{2})/.exec(time || "");
  const at = new Date(Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), t ? Number(t[1]) : 0, t ? Number(t[2]) : 0) + addMinutes * 60_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${at.getUTCFullYear()}${p(at.getUTCMonth() + 1)}${p(at.getUTCDate())}T${p(at.getUTCHours())}${p(at.getUTCMinutes())}00`;
}

/** Which side we are, from the fixture's teams (home unless we're named as the away side). */
function weAreHome(f: CalendarFixture): boolean {
  if (f.home_team && f.home_team === f.opponent && f.away_team !== f.opponent) return false;
  return true;
}

export function buildCalendar(clubName: string, fixtures: CalendarFixture[], opts: { host: string; now?: Date; matchMinutes?: number } ): string {
  const now = opts.now ?? new Date();
  const stamp = `${now.toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;
  const minutes = opts.matchMinutes ?? 120;
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Boost Huddle//Fixtures//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsText(`${clubName} fixtures`)}`, "X-WR-TIMEZONE:Europe/London", "REFRESH-INTERVAL;VALUE=DURATION:PT6H", "X-PUBLISHED-TTL:PT6H",
    ...LONDON,
  ];
  for (const f of fixtures) {
    const day = (f.fixture_date || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    const home = weAreHome(f);
    const summary = `${home ? clubName : f.opponent} v ${home ? f.opponent : clubName}`;
    const status = (f.status || "").toLowerCase();
    const cancelled = status === "cancelled" || status === "postponed";
    const timed = /^\d{1,2}:\d{2}/.test(f.kick_off_time || "");
    lines.push("BEGIN:VEVENT", `UID:fixture-${f.id}@${opts.host}`, `DTSTAMP:${stamp}`);
    if (timed) {
      lines.push(`DTSTART;TZID=Europe/London:${localStamp(day, f.kick_off_time)}`, `DTEND;TZID=Europe/London:${localStamp(day, f.kick_off_time, minutes)}`);
    } else {
      // No kick-off time yet: an all-day entry
      lines.push(`DTSTART;VALUE=DATE:${day.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${localStamp(day, null, 24 * 60)!.slice(0, 8)}`);
    }
    lines.push(
      `SUMMARY:${icsText(`${status === "postponed" ? "POSTPONED: " : status === "cancelled" ? "CANCELLED: " : ""}${summary}`)}`,
      `DESCRIPTION:${icsText([f.competition || "Match", home ? "Home" : "Away"].join(" · "))}`,
    );
    if (f.venue && f.venue !== "TBC") lines.push(`LOCATION:${icsText(f.venue)}`);
    lines.push(`STATUS:${cancelled ? "CANCELLED" : "CONFIRMED"}`, "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
