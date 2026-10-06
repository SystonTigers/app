/**
 * Works out which column is which in a manager's results spreadsheet, from
 * the header names and what's in the cells, so nobody has to reformat it.
 * Pure: no database (rows.ts turns the columns into results).
 */

export type ColumnKind =
  | "date" | "opponent" | "homeTeam" | "awayTeam" | "homeAway"
  | "ourScore" | "theirScore" | "homeScore" | "awayScore" | "score"
  | "outcome" | "competition" | "venue" | "scorers";

export type Columns = Partial<Record<ColumnKind, number>>;

/** Header words → what the column could be. Checked against the cells before it's trusted. */
const ALIASES: Array<[RegExp, ColumnKind[]]> = [
  [/^(match |fixture |game )?date( played)?$|^played( on)?$|^day$|^when$|^kick ?off$/, ["date"]],
  [/^(opponents?|opposition|opp|versus|vs?|v\.?|played|teams? played|played against|against|team)$/, ["opponent", "theirScore"]],
  [/^home( team)?$/, ["homeTeam", "homeAway"]],
  [/^away( team)?$/, ["awayTeam"]],
  [/^(h ?\/ ?a|home ?\/ ?away|h or a|home or away|ha)$/, ["homeAway"]],
  [/^(goals )?for$|^gf$|^f$|^(our|us|syston)( score| goals)?$|^scored$|^goals scored$/, ["ourScore"]],
  [/^(goals )?against$|^ga$|^a$|^(their|them|opp|opposition)( score| goals)?$|^conceded$|^goals conceded$/, ["theirScore", "opponent"]],
  [/^home (score|goals)$|^hs$/, ["homeScore"]],
  [/^away (score|goals)$|^as$/, ["awayScore"]],
  [/^(final |full ?time |ft )?(score|result)s?$|^ft$|^full ?time$/, ["score", "outcome"]],
  [/^(w ?\/ ?d ?\/ ?l|wdl|outcome|res|w\/l)$/, ["outcome"]],
  [/^(competition|comp|match type|type|league ?\/ ?cup|game type|cup ?\/ ?league)$/, ["competition"]],
  [/^(venue|ground|location|pitch|where|place)$/, ["venue", "homeAway"]],
  [/^(goal ?scorers?|scorers?|goals|who scored|scored by)$/, ["scorers"]],
];

export function headerKey(cell: string): string {
  return cell.toLowerCase().replace(/[^a-z0-9/ ]+/g, " ").replace(/\s+/g, " ").trim();
}

const SCORE_PAIR = /^\s*(?:[wdl]\s*)?(\d{1,2})\s*[-–—:]\s*(\d{1,2})\s*(?:[wdl]|\(.*\))?\s*$/i;

/** "3-1", "W 3-1", "3 - 1 (aet)" → [3, 1] as written (left, right). */
export function scorePair(cell: string): [number, number] | null {
  const m = SCORE_PAIR.exec(cell);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

const isInt = (s: string) => /^\d{1,2}$/.test(s.trim());
const isHomeAway = (s: string) => /^(h|a|home|away|n|neutral)$/i.test(s.trim());
const isOutcome = (s: string) => /^(w|d|l|won|drew|draw|lost|win|loss)$/i.test(s.trim());
const looksLikeDate = (s: string) => parseDateParts(s) !== null || /^\d{5}(\.\d+)?$/.test(s.trim());

/** Share of non-empty cells in this column passing the test (0 if the column is empty). */
function share(rows: string[][], col: number, test: (s: string) => boolean): number {
  const cells = rows.map((r) => (r[col] ?? "").trim()).filter((c) => c !== "");
  return cells.length ? cells.filter(test).length / cells.length : 0;
}

/** Day, month and maybe year from one date cell, in the order written (no UK/US decision yet). */
export function parseDateParts(cell: string): { a: number; b: number; y: number | null; iso?: boolean; named?: boolean } | null {
  const s = cell.trim();
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T].*)?$/.exec(s);
  if (m) return { a: Number(m[3]), b: Number(m[2]), y: Number(m[1]), iso: true };
  m = /^(\d{1,2})[/.\-](\d{1,2})(?:[/.\-](\d{2}|\d{4}))?(?:\s.*)?$/.exec(s);
  if (m) return { a: Number(m[1]), b: Number(m[2]), y: m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : null };
  m = /(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?\s*(\d{4}|\d{2})?/i.exec(s);
  if (m) return { a: Number(m[1]), b: monthNumber(m[2]), y: m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : null, named: true };
  m = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i.exec(s);
  if (m) return { a: Number(m[2]), b: monthNumber(m[1]), y: m[3] ? Number(m[3]) : null, named: true };
  return null;
}

function monthNumber(name: string): number {
  return ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(name.slice(0, 3).toLowerCase()) + 1;
}

/** Whether the date column is written month-first (US), judged from all its cells. */
export function monthFirst(cells: string[]): boolean {
  let dayFirstProof = 0;
  let monthFirstProof = 0;
  for (const c of cells) {
    const p = parseDateParts(c);
    if (!p || p.iso || p.named) continue;
    if (p.a > 12 && p.b <= 12) dayFirstProof += 1;
    if (p.b > 12 && p.a <= 12) monthFirstProof += 1;
  }
  return monthFirstProof > 0 && dayFirstProof === 0;
}

/** "2024-25", "2024/25", "24-25" in a sheet name → 2024 (the year the season starts). */
export function seasonStartYear(name: string): number | null {
  const m = /(?:^|\D)(20)?(\d{2})\s*[-/_ ]\s*(20)?(\d{2})(?:\D|$)/.exec(name);
  if (!m) return null;
  const start = 2000 + Number(m[2]);
  return (Number(m[4]) === (Number(m[2]) + 1) % 100) ? start : null;
}

/** A cell → "2025-09-14", or null. `usOrder` from monthFirst; `seasonYear` fills in missing years. */
export function isoDate(cell: string, usOrder: boolean, seasonYear: number | null): string | null {
  const s = cell.trim();
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const serial = Number(s);
    if (serial < 20000 || serial > 80000) return null;
    return new Date(Math.round((serial - 25569) * 86_400_000)).toISOString().slice(0, 10);
  }
  const p = parseDateParts(s);
  if (!p) return null;
  const [day, month] = p.iso || p.named || !usOrder ? [p.a, p.b] : [p.b, p.a];
  let year = p.y;
  // No year written: the football season (Aug-Jul) from the sheet's name
  if (year === null) year = seasonYear === null ? null : month >= 8 ? seasonYear : seasonYear + 1;
  if (year === null || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCMonth() !== month - 1) return null;
  return d.toISOString().slice(0, 10);
}

/** Index of the header row: the first row (of the first 15) that names a date and who we played. */
export function findHeaderRow(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 15); i += 1) {
    const kinds = new Set(rows[i].flatMap((c) => ALIASES.filter(([re]) => re.test(headerKey(c))).flatMap(([, k]) => k)));
    const hasWho = kinds.has("opponent") || (kinds.has("homeTeam") && kinds.has("awayTeam"));
    const hasScore = kinds.has("score") || kinds.has("ourScore") || kinds.has("homeScore") || kinds.has("theirScore");
    if (kinds.has("date") && hasWho && hasScore) return i;
  }
  return -1;
}

/** Which column holds what, from the header row and a look at the cells below it. */
export function detectColumns(header: string[], body: string[][]): Columns {
  const cols: Columns = {};
  const taken = new Set<number>();
  const claim = (kind: ColumnKind, i: number) => { if (cols[kind] === undefined && !taken.has(i)) { cols[kind] = i; taken.add(i); } };
  const candidates = header.map((h) => ALIASES.filter(([re]) => re.test(headerKey(h))).flatMap(([, k]) => k));
  // Content decides between look-alikes: "Against" with numbers is a score, with names it's the opponent
  const fits: Record<ColumnKind, (i: number) => boolean> = {
    date: (i) => share(body, i, looksLikeDate) >= 0.6,
    opponent: (i) => share(body, i, (s) => !isInt(s) && !isHomeAway(s) && !looksLikeDate(s) && !scorePair(s)) >= 0.6,
    homeTeam: (i) => share(body, i, (s) => !isInt(s) && !isHomeAway(s)) >= 0.6,
    awayTeam: (i) => share(body, i, (s) => !isInt(s) && !isHomeAway(s)) >= 0.6,
    homeAway: (i) => share(body, i, isHomeAway) >= 0.6,
    ourScore: (i) => share(body, i, isInt) >= 0.6,
    theirScore: (i) => share(body, i, isInt) >= 0.6,
    homeScore: (i) => share(body, i, isInt) >= 0.6,
    awayScore: (i) => share(body, i, isInt) >= 0.6,
    score: (i) => share(body, i, (s) => !!scorePair(s)) >= 0.5,
    outcome: (i) => share(body, i, isOutcome) >= 0.6,
    competition: () => true,
    venue: () => true,
    scorers: () => true,
  };
  // Pass 1: columns whose header fits exactly one kind well; pass 2: everything else in header order
  for (const pass of [1, 2]) {
    candidates.forEach((kinds, i) => {
      if (taken.has(i)) return;
      const ok = kinds.filter((k) => cols[k] === undefined && fits[k](i));
      if (pass === 1 && ok.length !== 1) return;
      if (ok.length) claim(ok[0], i);
    });
  }
  // "Home" / "Away" as team-name columns only count together; a lone one is home-or-away
  if ((cols.homeTeam === undefined) !== (cols.awayTeam === undefined)) {
    const lone = cols.homeTeam ?? cols.awayTeam!;
    delete cols.homeTeam; delete cols.awayTeam;
    if (cols.homeAway === undefined && share(body, lone, isHomeAway) >= 0.6) cols.homeAway = lone;
  }
  return cols;
}

/** What's missing to read results from these columns, or null if they're enough. */
export function missingColumns(cols: Columns): string | null {
  const missing: string[] = [];
  if (cols.date === undefined) missing.push("the date");
  if (cols.opponent === undefined && (cols.homeTeam === undefined || cols.awayTeam === undefined)) missing.push("who you played");
  const hasScore = cols.score !== undefined || (cols.ourScore !== undefined && cols.theirScore !== undefined) || (cols.homeScore !== undefined && cols.awayScore !== undefined);
  if (!hasScore) missing.push("the score");
  return missing.length ? `Couldn't find a column for ${missing.join(" or ")}.` : null;
}
