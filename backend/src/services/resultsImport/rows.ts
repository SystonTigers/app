/**
 * Turns spreadsheet rows into results to import, and matches the scorers'
 * names to the squad. Pure: no database (store.ts saves them).
 */
import { detectColumns, findHeaderRow, isoDate, missingColumns, monthFirst, scorePair, seasonStartYear, type Columns } from "./columns";
import type { Sheet } from "./sheet";

export interface ScorerName { name: string; goals: number }

export interface ParsedResult {
  /** Where it came from, for the preview: "2024-25, row 7" */
  where: string;
  date: string;
  opponent: string;
  ourScore: number;
  theirScore: number;
  homeAway: "home" | "away" | null;
  competition: string;
  venue: string | null;
  /** The scorers cell as written, cleaned up */
  scorersText: string | null;
  scorers: ScorerName[];
  ownGoals: number;
}

export interface SkippedRow { where: string; reason: string }

export interface ParsedSheets {
  results: ParsedResult[];
  skipped: SkippedRow[];
  /** Sheets that didn't look like results, and why */
  ignoredSheets: Array<{ name: string; reason: string }>;
}

const NOT_PLAYED = /^(p\s*[-–]?\s*p|pp|p|postponed|postp|void|cancell?ed|abandoned|tbc|tba|-|–|n\/a|bye|walkover|w\/o|awarded)$/i;

/** "Smith 2, Jones (pen), J. Brown x2, OG" → names with goal counts, and own goals. */
export function parseScorers(cell: string): { scorers: ScorerName[]; ownGoals: number } {
  const counts = new Map<string, ScorerName>();
  let ownGoals = 0;
  const parts = cell
    .replace(/\r?\n/g, ",")
    .split(/\s*(?:,|;|\/|&|\+|\band\b)\s*/i)
    .map((p) => p.trim())
    .filter(Boolean);
  for (const raw of parts) {
    let part = raw
      .replace(/\b(pen|penalty|p|fk|free kick|header|hdr|volley)\b\.?/gi, "")
      .replace(/\b\d{1,3}\s*(?:'|’|mins?|minutes?)/gi, "")
      .replace(/[()[\]]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    let goals = 1;
    const tail = /^(.*?)\s*(?:x|×)?\s*(\d{1,2})\s*(?:goals?)?$/i.exec(part);
    const head = /^(\d{1,2})\s*(?:x|×)?\s+(.*)$/i.exec(part);
    if (tail && tail[1] && /[a-z]/i.test(tail[1])) { part = tail[1].trim(); goals = Number(tail[2]); }
    else if (head && /[a-z]/i.test(head[2])) { part = head[2].trim(); goals = Number(head[1]); }
    part = part.replace(/\s*[x×]$/i, "").trim();
    if (!part || !/[a-z]/i.test(part) || goals < 1) continue;
    if (/^(o\.?g\.?|own ?goals?)$/i.test(part)) { ownGoals += goals; continue; }
    const key = part.toLowerCase();
    const prev = counts.get(key);
    if (prev) prev.goals += goals;
    else counts.set(key, { name: part, goals });
  }
  return { scorers: [...counts.values()], ownGoals };
}

function cleanOpponent(raw: string): { name: string; homeAway: "home" | "away" | null } {
  let name = raw.replace(/\s+/g, " ").trim();
  let homeAway: "home" | "away" | null = null;
  const tag = /\s*[([]\s*(h|a|home|away)\s*[)\]]\s*$/i.exec(name);
  if (tag) { homeAway = /^h/i.test(tag[1]) ? "home" : "away"; name = name.slice(0, tag.index).trim(); }
  name = name.replace(/^(vs?\.?|versus|against|@)\s+/i, "").trim();
  if (/^@/.test(raw.trim())) homeAway = "away";
  return { name: name.slice(0, 80), homeAway };
}

function homeAwayOf(cell: string): "home" | "away" | null {
  const s = cell.trim().toLowerCase();
  if (s === "h" || s === "home") return "home";
  if (s === "a" || s === "away") return "away";
  return null;
}

function competitionOf(cell: string): string {
  const c = cell.trim();
  if (!c) return "League";
  if (/^l(ge|eague)?$/i.test(c)) return "League";
  if (/^(c|cup)$/i.test(c)) return "Cup";
  if (/^(f|fr|friendly|friendlies)$/i.test(c)) return "Friendly";
  return c.slice(0, 80);
}

/** How well a team name matches our club's (so FA-style "Home team / Away team" sheets know which side we were). */
function ourSideScore(team: string, clubWords: string[]): number {
  const t = ` ${team.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
  return clubWords.filter((w) => t.includes(` ${w} `)).length;
}

/** Every results-looking sheet → results to import, rows skipped with the reason. */
export function parseSheets(sheets: Sheet[], opts: { clubName: string; today: string }): ParsedSheets {
  const out: ParsedSheets = { results: [], skipped: [], ignoredSheets: [] };
  const clubWords = opts.clubName.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((w) => w.length >= 3 && !/^u\d+$/.test(w) && !["the", "club", "juniors", "junior", "football"].includes(w));
  const many = sheets.length > 1;
  for (const sheet of sheets) {
    const h = findHeaderRow(sheet.rows);
    if (h < 0) { out.ignoredSheets.push({ name: sheet.name, reason: "no Date, Opponent and Score headings" }); continue; }
    const header = sheet.rows[h];
    const body = sheet.rows.slice(h + 1);
    const cols: Columns = detectColumns(header, body);
    const missing = missingColumns(cols);
    if (missing) { out.ignoredSheets.push({ name: sheet.name, reason: missing }); continue; }
    const us = monthFirst(body.map((r) => r[cols.date!] ?? ""));
    const seasonYear = seasonStartYear(sheet.name);
    body.forEach((row, i) => {
      const where = `${many ? `${sheet.name}, ` : ""}row ${h + i + 2}`;
      const cell = (k: keyof Columns) => (cols[k] === undefined ? "" : (row[cols[k]!] ?? "").trim());
      if (row.every((c) => !c.trim())) return;
      const date = isoDate(cell("date"), us, seasonYear);
      if (!date) { if (cell("date") || cell("opponent")) out.skipped.push({ where, reason: cell("date") ? `can't read the date "${cell("date")}"` : "no date" }); return; }
      if (date > opts.today) { out.skipped.push({ where, reason: "not played yet" }); return; }

      // Who we played, and at which end
      let opponent = "";
      let homeAway: "home" | "away" | null = cols.homeAway !== undefined ? homeAwayOf(cell("homeAway")) : null;
      let usHome: boolean | null = null;
      if (cols.opponent !== undefined) {
        const o = cleanOpponent(cell("opponent"));
        opponent = o.name;
        homeAway = homeAway ?? o.homeAway;
      } else {
        const home = cell("homeTeam");
        const away = cell("awayTeam");
        const hs = ourSideScore(home, clubWords);
        const as = ourSideScore(away, clubWords);
        if (hs === as) { out.skipped.push({ where, reason: `can't tell which of "${home}" and "${away}" is us` }); return; }
        usHome = hs > as;
        opponent = (usHome ? away : home).trim().slice(0, 80);
        homeAway = usHome ? "home" : "away";
      }
      if (!opponent) { out.skipped.push({ where, reason: "no opponent" }); return; }

      // "Home"/"Away" in the venue column says which end we were at
      const venueCell = cell("venue");
      const venueSide = homeAwayOf(venueCell);
      homeAway = homeAway ?? venueSide;

      // The score, from our side
      let ours: number | null = null;
      let theirs: number | null = null;
      if (cols.ourScore !== undefined && cols.theirScore !== undefined && /^\d{1,2}$/.test(cell("ourScore")) && /^\d{1,2}$/.test(cell("theirScore"))) {
        ours = Number(cell("ourScore")); theirs = Number(cell("theirScore"));
      } else if (cols.homeScore !== undefined && cols.awayScore !== undefined && /^\d{1,2}$/.test(cell("homeScore")) && /^\d{1,2}$/.test(cell("awayScore"))) {
        const hsc = Number(cell("homeScore")); const asc = Number(cell("awayScore"));
        const weAreHome = usHome ?? (homeAway ? homeAway === "home" : true);
        [ours, theirs] = weAreHome ? [hsc, asc] : [asc, hsc];
      } else if (cols.score !== undefined) {
        const pair = scorePair(cell("score"));
        if (pair) {
          // Written as home-away when the sheet names both teams, otherwise ours first
          [ours, theirs] = usHome === false ? [pair[1], pair[0]] : pair;
          // A W/D/L letter beats the order it was written in
          const letter = (/^\s*([wdl])\b/i.exec(cell("score"))?.[1] ?? /\b([wdl])\s*$/i.exec(cell("score"))?.[1] ?? cell("outcome")).trim().toLowerCase()[0];
          if ((letter === "w" && ours < theirs) || (letter === "l" && ours > theirs)) [ours, theirs] = [theirs, ours];
        }
      }
      if (ours === null || theirs === null) {
        const shown = cell("score") || `${cell("ourScore")}${cell("theirScore") ? `-${cell("theirScore")}` : ""}`;
        out.skipped.push({ where, reason: !shown || NOT_PLAYED.test(shown) ? "no score (postponed or not played?)" : `can't read the score "${shown}"` });
        return;
      }

      const scorersCell = cell("scorers").replace(/\s+/g, " ").trim();
      const { scorers, ownGoals } = scorersCell ? parseScorers(scorersCell) : { scorers: [], ownGoals: 0 };
      out.results.push({
        where,
        date,
        opponent,
        ourScore: ours,
        theirScore: theirs,
        homeAway,
        competition: competitionOf(cell("competition")),
        venue: venueSide ? null : venueCell ? venueCell.slice(0, 120) : null,
        scorersText: scorersCell ? scorersCell.slice(0, 500) : null,
        scorers,
        ownGoals,
      });
    });
  }
  return out;
}

export interface SquadMember { id: string; name: string }

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z ]+/g, " ").replace(/\s+/g, " ").trim();

/**
 * A scorer's name as written → a squad id, or null. Tries the full name,
 * then a unique surname, a unique "J Smith", then a unique first name.
 */
export function matchScorer(name: string, squad: SquadMember[]): string | null {
  const n = norm(name);
  if (!n) return null;
  const people = squad.map((p) => {
    const words = norm(p.name).split(" ").filter(Boolean);
    return { id: p.id, full: words.join(" "), first: words[0] ?? "", last: words[words.length - 1] ?? "" };
  });
  const one = (list: typeof people) => (list.length === 1 ? list[0].id : null);
  const exact = people.filter((p) => p.full === n);
  if (exact.length) return one(exact);
  const words = n.split(" ");
  if (words.length === 1) {
    return one(people.filter((p) => p.last === n)) ?? one(people.filter((p) => p.first === n));
  }
  const first = words[0];
  const last = words[words.length - 1];
  const firstLast = people.filter((p) => p.first === first && p.last === last);
  if (firstLast.length) return one(firstLast);
  if (first.length === 1) return one(people.filter((p) => p.last === last && p.first.startsWith(first)));
  return null;
}

export interface ScorerMatch {
  /** One squad id per goal, as the result form sends */
  scorerIds: string[];
  ownGoals: number;
  /** Names that aren't in the squad (goals not counted for anyone) */
  unmatched: ScorerName[];
  /** More scorers written than goals scored */
  tooMany: boolean;
}

export function matchScorers(r: Pick<ParsedResult, "scorers" | "ownGoals" | "ourScore">, squad: SquadMember[]): ScorerMatch {
  const scorerIds: string[] = [];
  const unmatched: ScorerName[] = [];
  for (const s of r.scorers) {
    const id = matchScorer(s.name, squad);
    if (id) for (let g = 0; g < s.goals; g += 1) scorerIds.push(id);
    else unmatched.push(s);
  }
  const written = r.scorers.reduce((n, s) => n + s.goals, 0) + r.ownGoals;
  return { scorerIds, ownGoals: r.ownGoals, unmatched, tooMany: written > r.ourScore };
}
