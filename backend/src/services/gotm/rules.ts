/**
 * Goal of the Month rules with no database access (unit tested in Node):
 * reading a new vote from staff, and working out the winner.
 */

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const MIN_GOALS = 2;
export const MAX_GOALS = 10;
export const MAX_DESCRIPTION = 120;

export interface Nomination {
  /** The goal's event id (Match Centre or match report), when picked from the month's goals */
  eventId: string | null;
  playerId: string;
  fixtureId: string | null;
  description: string | null;
  /** A link staff pasted for a goal with no match video (YouTube, TikTok...) */
  videoUrl: string | null;
}

export interface NewVote { month: number; year: number; goals: Nomination[] }

const text = (v: unknown): string => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "");
const id = (v: unknown): string | null => {
  const s = text(v);
  return s && s.length <= 100 ? s : null;
};

/** "2026-09", or a month name/number with a year, as { month: 9, year: 2026 }. */
export function readMonth(month: unknown, year: unknown): { month: number; year: number } | null {
  const m = text(month);
  const iso = /^(\d{4})-(\d{2})$/.exec(m);
  if (iso) {
    const n = Number(iso[2]);
    return n >= 1 && n <= 12 ? { month: n, year: Number(iso[1]) } : null;
  }
  const byName = MONTHS.findIndex((name) => name.toLowerCase() === m.toLowerCase()) + 1;
  const n = byName || (/^\d{1,2}$/.test(m) ? Number(m) : 0);
  const y = Number(year);
  if (n < 1 || n > 12 || !Number.isInteger(y) || y < 2000 || y > 2100) return null;
  return { month: n, year: y };
}

/** A new vote from staff, or what's wrong with it. */
export function readNewVote(body: Record<string, unknown>): NewVote | string {
  const when = readMonth(body.month, body.year);
  if (!when) return "Choose the month the goals were scored in.";
  if (!Array.isArray(body.goals)) return "Add the goals people can vote for.";
  if (body.goals.length < MIN_GOALS) return `Add at least ${MIN_GOALS} goals so there's something to vote on.`;
  if (body.goals.length > MAX_GOALS) return `Pick up to ${MAX_GOALS} goals.`;
  const goals: Nomination[] = [];
  for (const raw of body.goals) {
    const g = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const playerId = id(g.playerId);
    if (!playerId) return "Choose who scored each goal.";
    const description = text(g.description).slice(0, MAX_DESCRIPTION) || null;
    const link = text(g.videoUrl);
    if (link && (!/^https?:\/\/\S+$/i.test(link) || link.length > 300)) return "Video links must start with https://";
    goals.push({ eventId: id(g.eventId), playerId, fixtureId: id(g.fixtureId ?? g.matchId), description, videoUrl: link || null });
  }
  const events = goals.map((g) => g.eventId).filter((e): e is string => !!e);
  if (new Set(events).size !== events.length) return "Each goal can only be picked once.";
  return { ...when, goals };
}

/** The candidates with the most votes (joint winners share it), or none if nobody voted. */
export function winnersOf<T extends { votes: number }>(candidates: T[]): T[] {
  const top = Math.max(0, ...candidates.map((c) => c.votes));
  return top > 0 ? candidates.filter((c) => c.votes === top) : [];
}

/** "September 2026" */
export function monthLabel(month: string | number, year: number): string {
  const name = typeof month === "number" ? MONTHS[month - 1] : (MONTHS.find((m) => m.toLowerCase() === month.toLowerCase()) ?? month);
  return `${name} ${year}`;
}

/** First and last day of a month, as YYYY-MM-DD. */
export function monthRange(month: number, year: number): { from: string; to: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(last)}` };
}
