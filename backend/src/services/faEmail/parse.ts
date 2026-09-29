/**
 * Reading FA Full-Time fixture emails ("Full-Time: <league>"): fixture
 * changes, referee appointments and weekly reminders. Each fixture appears as
 *
 *   Under 18 Division One
 *   Sun 20 Sept 2026 14:00, Coalville Town Ravens U18 Ravens -v- Syston Town Juniors U18 Tigers Status: Normal
 *   Venue: MILLFIELD RECREATION GROUND #1
 *
 * Only the fixture itself is read. Referee and team contact details (names,
 * phone numbers, email addresses) in the same email are never kept.
 */

export type FaFixtureStatus = "scheduled" | "postponed" | "cancelled";

export interface FaEmailFixture {
  /** yyyy-mm-dd */
  date: string;
  /** HH:MM (24 hour), or null when the email has no time */
  time: string | null;
  homeTeam: string;
  awayTeam: string;
  status: FaFixtureStatus;
  /** The FA's own word for it, e.g. "Normal", "Postponed" */
  statusText: string | null;
  venue: string | null;
  competition: string | null;
  /** FA Full-Time's fixture number, when the email's link was pasted too */
  faFixtureId: string | null;
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

// "Sun 20 Sept 2026 14:00, Home -v- Away Status: Normal" (day name, comma and status optional)
const FIXTURE = /^(?:(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})\.?\s+(\d{4})(?:\s+(\d{1,2})[:.](\d{2}))?\s*,?\s*(.+?)\s+-?v-?\s+(.+?)(?:\s+status:\s*(.+))?$/i;
const VENUE = /^venue\s*:\s*(.+)$/i;
const FA_ID = /fulltime[^\s"'<>]*?[?&](?:id|fixtureid|fixture_id)=(\d{4,})/i;
// A competition line looks like "Under 18 Division One" or "County Cup"
const COMPETITION = /\b(division|league|cup|under|u\d{1,2}s?|premier|championship|trophy|shield|plate|vase|group|conference|section)\b/i;

function statusOf(text: string | null): FaFixtureStatus {
  const t = (text ?? "").toLowerCase();
  if (/postpon|abandon|rearrang|tbc|to be confirmed/.test(t)) return "postponed";
  if (/cancel|void|withdrawn|walkover|conceded|awarded/.test(t)) return "cancelled";
  return "scheduled";
}

function isoDate(day: number, month: number, year: number): string | null {
  if (!month || day < 1 || day > 31 || year < 2000 || year > 2100) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCMonth() !== month - 1) return null;
  return d.toISOString().slice(0, 10);
}

/** Tidy one line of an email (HTML tags, entities, odd spaces). */
function clean(line: string): string {
  return line
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&#39;|&apos;/gi, "'").replace(/&quot;/gi, '"')
    .replace(/[   \t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Every fixture in the email (pasted text or the email's body). */
export function parseFaEmail(text: string): FaEmailFixture[] {
  const lines = text.split(/\r?\n|<br\s*\/?>|<\/(?:p|div|tr|li)>/i).map(clean).filter(Boolean);
  const out: FaEmailFixture[] = [];
  let lastPlain: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = FIXTURE.exec(line);
    const month = m ? MONTHS[m[2].toLowerCase()] : undefined;
    const date = m && month ? isoDate(Number(m[1]), month, Number(m[3])) : null;
    if (m && date) {
      const hour = m[4] !== undefined ? Number(m[4]) : null;
      const time = hour !== null && hour < 24 ? `${String(hour).padStart(2, "0")}:${m[5]}` : null;
      const fixture: FaEmailFixture = {
        date, time,
        homeTeam: m[6].trim(),
        awayTeam: m[7].trim(),
        status: statusOf(m[8] ?? null),
        statusText: m[8]?.trim() ?? null,
        venue: null,
        competition: lastPlain,
        faFixtureId: null,
      };
      // Venue and the fixture's link follow within the next few lines
      for (let j = i + 1; j < Math.min(lines.length, i + 8); j++) {
        if (FIXTURE.test(lines[j])) break;
        const v = VENUE.exec(lines[j]);
        if (v && !fixture.venue) fixture.venue = v[1].trim();
        const id = FA_ID.exec(lines[j]);
        if (id && !fixture.faFixtureId) fixture.faFixtureId = id[1];
      }
      out.push(fixture);
      continue;
    }
    // The line above a fixture is its competition ("Under 18 Division One")
    if (COMPETITION.test(line) && !/[@:,.]|\d{5,}/.test(line) && !/^(this|if|please|click|dear|hi|hello)\b/i.test(line) && line.length <= 80) lastPlain = line;
  }
  return out;
}
