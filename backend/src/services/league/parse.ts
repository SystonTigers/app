/**
 * Reads a league's results or table from text a manager copied from any
 * league website (FA Full-Time, FAW COMET, GotSport, ...). Copying a web page
 * table gives one row per line with cells separated by tabs (or runs of
 * spaces); dates can be on each row or on a heading line above a group.
 */

export interface ParsedResult {
  date: string; // yyyy-mm-dd
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
}

export interface ParsedTableRow {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number | null;
  goalsAgainst: number | null;
  goalDifference: number;
  points: number;
}

export type ParsedPaste =
  | { kind: "results"; results: ParsedResult[]; skipped: number }
  | { kind: "table"; rows: ParsedTableRow[] }
  | { kind: "none" };

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const WEEKDAY = /\b(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(day|sday|nesday|rsday|urday)?\b\.?,?/gi;
const TIME = /\b\d{1,2}[:.]\d{2}\s*(am|pm)?\b/gi;
const SCORE_CELL = /^(\d{1,2})\s*[-–—]\s*(\d{1,2})$/;
const INT = /^[-+−]?\d{1,3}$/;

type DateOrder = "dmy" | "mdy";

function iso(y: number, m: number, d: number): string | null {
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date.toISOString().slice(0, 10);
}

/** A year for a date written without one: the one that puts it nearest to today. */
function guessYear(m: number, d: number, today: Date): number {
  const y = today.getUTCFullYear();
  const candidates = [y - 1, y, y + 1];
  return candidates.reduce((best, c) =>
    Math.abs(Date.UTC(c, m - 1, d) - today.getTime()) < Math.abs(Date.UTC(best, m - 1, d) - today.getTime()) ? c : best);
}

function fullYear(raw: string): number {
  const n = Number(raw);
  return raw.length === 2 ? 2000 + n : n;
}

/** Whether slash dates in this text are month-first (US style). Day-first unless a date proves otherwise. */
export function detectDateOrder(text: string): DateOrder {
  let dmy = 0;
  let mdy = 0;
  for (const m of text.matchAll(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})\b/g)) {
    if (Number(m[1]) > 12) dmy++;
    if (Number(m[2]) > 12) mdy++;
  }
  return mdy > dmy ? "mdy" : "dmy";
}

/** The first date in a line, and the line with it removed. */
export function findDate(line: string, order: DateOrder, today: Date): { date: string; rest: string } | null {
  let m = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(line);
  if (m) {
    const date = iso(Number(m[1]), Number(m[2]), Number(m[3]));
    if (date) return { date, rest: line.replace(m[0], " ") };
  }
  m = /\b(\d{1,2})[/.](\d{1,2})[/.](\d{2}|\d{4})\b/.exec(line);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    const [d, mo] = order === "mdy" ? [b, a] : [a, b];
    const date = iso(fullYear(m[3]), mo, d);
    if (date) return { date, rest: line.replace(m[0], " ") };
  }
  // 27 Sep 2026 / 27th September / Sep 27, 2026 / September 27
  m = /\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?(?:,?\s+(\d{4}))?\b/.exec(line);
  if (m && MONTHS.includes(m[2].slice(0, 3).toLowerCase())) {
    const mo = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()) + 1;
    const d = Number(m[1]);
    const date = iso(m[3] ? Number(m[3]) : guessYear(mo, d, today), mo, d);
    if (date) return { date, rest: line.replace(m[0], " ") };
  }
  m = /\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/.exec(line);
  if (m && MONTHS.includes(m[1].slice(0, 3).toLowerCase())) {
    const mo = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()) + 1;
    const d = Number(m[2]);
    const date = iso(m[3] ? Number(m[3]) : guessYear(mo, d, today), mo, d);
    if (date) return { date, rest: line.replace(m[0], " ") };
  }
  return null;
}

function cellsOf(line: string): string[] {
  const parts = line.includes("\t") ? line.split("\t") : line.split(/\s{2,}|\s+\|\s+/);
  return parts.map((c) => c.replace(/\s+/g, " ").trim()).filter(Boolean);
}

function cleanTeam(name: string): string {
  return name.replace(/\((ht|h\/t|half[- ]time|aet|a\.e\.t\.|pens?|penalties)\b[^)]*\)/gi, " ").replace(WEEKDAY, " ").replace(TIME, " ").replace(/\s+/g, " ").replace(/^[\s\-–|:]+|[\s\-–|:]+$/g, "").trim();
}

const isTeamName = (s: string) => /[A-Za-z]{2,}/.test(s) && s.length <= 80;

/** One result from a line, or null. Uses cells when the line has them, otherwise the text around the score. */
function resultFromLine(rest: string): Omit<ParsedResult, "date"> | null {
  const withoutTimes = rest.replace(TIME, " ");
  const cells = cellsOf(withoutTimes);
  const at = cells.findIndex((c) => SCORE_CELL.test(c));
  if (at > 0 && at < cells.length - 1) {
    const [, h, a] = SCORE_CELL.exec(cells[at])!;
    const home = cleanTeam(cells[at - 1]);
    const away = cleanTeam(cells[at + 1]);
    if (isTeamName(home) && isTeamName(away)) return { home, away, homeScore: Number(h), awayScore: Number(a) };
  }
  // Scores split over cells: "Rovers | 3 | - | 1 | Town" or "Rovers | 3 | 1 | Town"
  for (let i = 1; i < cells.length - 2; i++) {
    if (!/^\d{1,2}$/.test(cells[i])) continue;
    const dash = /^[-–—]$/.test(cells[i + 1]) ? 1 : 0;
    const j = i + 1 + dash;
    if (/^\d{1,2}$/.test(cells[j] ?? "") && cells[j + 1] && isTeamName(cells[i - 1]) && isTeamName(cells[j + 1]) && (dash || cells.length <= 6)) {
      return { home: cleanTeam(cells[i - 1]), away: cleanTeam(cells[j + 1]), homeScore: Number(cells[i]), awayScore: Number(cells[j]) };
    }
  }
  const m = /^(.*[A-Za-z].*?)\s+(\d{1,2})\s*[-–—]\s*(\d{1,2})\s+(.*[A-Za-z].*)$/.exec(withoutTimes.replace(/\s+/g, " ").trim());
  if (m) {
    const home = cleanTeam(m[1]);
    const away = cleanTeam(m[4]);
    if (isTeamName(home) && isTeamName(away)) return { home, away, homeScore: Number(m[2]), awayScore: Number(m[3]) };
  }
  return null;
}

type Column = "played" | "won" | "drawn" | "lost" | "goalsFor" | "goalsAgainst" | "goalDifference" | "points";
const HEADERS: Array<[RegExp, Column]> = [
  [/^(p|pl|pld|played|gp|mp)$/i, "played"],
  [/^(w|won|wins)$/i, "won"],
  [/^(d|drawn|draws|t|ties)$/i, "drawn"],
  [/^(l|lost|losses)$/i, "lost"],
  [/^(f|gf|for|goals for)$/i, "goalsFor"],
  [/^(a|ga|against|goals against)$/i, "goalsAgainst"],
  [/^(gd|diff|\+\/-|goal difference)$/i, "goalDifference"],
  [/^(pts|points|pt)$/i, "points"],
];

function headerColumns(line: string): Column[] | null {
  const tokens = cellsOf(line).flatMap((c) => (c.includes(" ") && !/goal/i.test(c) ? c.split(" ") : [c]));
  const cols = tokens.map((t) => HEADERS.find(([re]) => re.test(t))?.[1]).filter((c): c is Column => Boolean(c));
  return cols.includes("played") && cols.includes("points") && cols.length >= 5 ? cols : null;
}

function tableRowFromLine(line: string, columns: Column[] | null): ParsedTableRow | null {
  let cells = cellsOf(line).flatMap((c) => (/^[-+−]?\d+(\s+[-+−]?\d+)+$/.test(c) ? c.split(" ") : [c]));
  if (cells.length < 3) cells = line.trim().split(/\s+/);
  const firstNumber = cells.findIndex((c, i) => i > 0 && INT.test(c) && cells.slice(i).every((x) => INT.test(x)));
  if (firstNumber < 1) return null;
  const team = cleanTeam(cells.slice(0, firstNumber).filter((c) => !/^\d{1,2}\.?$/.test(c)).join(" "));
  if (!isTeamName(team)) return null;
  const nums = cells.slice(firstNumber).map((c) => Number(c.replace("−", "-")));
  let cols = columns && columns.length === nums.length ? columns : null;
  if (!cols) {
    if (nums.length === 8) cols = ["played", "won", "drawn", "lost", "goalsFor", "goalsAgainst", "goalDifference", "points"];
    else if (nums.length === 7) cols = ["played", "won", "drawn", "lost", "goalsFor", "goalsAgainst", "points"];
    else if (nums.length === 6) cols = ["played", "won", "drawn", "lost", "goalDifference", "points"];
    else return null;
  }
  const v = (c: Column) => {
    const i = cols!.indexOf(c);
    return i < 0 ? null : nums[i];
  };
  const [played, won, drawn, lost, points] = [v("played"), v("won"), v("drawn"), v("lost"), v("points")];
  if (played === null || won === null || drawn === null || lost === null || points === null) return null;
  if (won + drawn + lost !== played) return null;
  const goalsFor = v("goalsFor");
  const goalsAgainst = v("goalsAgainst");
  const gd = v("goalDifference");
  if (goalsFor !== null && goalsAgainst !== null && gd !== null && goalsFor - goalsAgainst !== gd) return null;
  const goalDifference = gd ?? (goalsFor !== null && goalsAgainst !== null ? goalsFor - goalsAgainst : null);
  if (goalDifference === null) return null;
  return { team, played, won, drawn, lost, goalsFor, goalsAgainst, goalDifference, points };
}

/**
 * Work out whether the text is a list of results or a league table, and read it.
 * Postponed or void games (P-P, A-A, walkovers) are skipped.
 */
export function parseLeaguePaste(text: string, today = new Date()): ParsedPaste {
  const lines = text.replace(/\r/g, "").replace(/ /g, " ").split("\n").map((l) => l.trimEnd()).filter((l) => l.trim());
  const order = detectDateOrder(text);

  let columns: Column[] | null = null;
  const table: ParsedTableRow[] = [];
  for (const line of lines) {
    const header = headerColumns(line);
    if (header) {
      columns = header;
      continue;
    }
    const row = tableRowFromLine(line, columns);
    if (row) table.push(row);
  }

  const results: ParsedResult[] = [];
  let skipped = 0;
  let currentDate: string | null = null;
  for (const line of lines) {
    const found = findDate(line, order, today);
    let rest = line;
    if (found) {
      rest = found.rest;
      const leftover = rest.replace(WEEKDAY, " ").replace(TIME, " ").replace(/[\s,|-]+/g, "");
      if (!leftover) {
        currentDate = found.date;
        continue;
      }
    }
    const date = found?.date ?? currentDate;
    const result = resultFromLine(rest);
    if (!result) {
      if (/\b([A-Z])\s*[-–]\s*([A-Z])\b/.test(rest) && /[a-z]{3}/i.test(rest)) skipped++;
      continue;
    }
    if (!date) {
      skipped++;
      continue;
    }
    results.push({ date, ...result });
  }

  if (table.length >= 3 && table.length >= results.length) return { kind: "table", rows: table };
  if (results.length) return { kind: "results", results, skipped };
  return { kind: "none" };
}
