/**
 * Which dates a season covers, for looking back at results, stats and votes.
 *
 * A club that has set up seasons (website Seasons page) gets those, by their
 * dates. Otherwise seasons are football years, 1 August to 31 July
 * ("2025/26"), going back to the club's first result, fixture or hand-entered
 * stats, and at least three seasons.
 */
type DB = { DB: D1Database };

export interface SeasonOption {
  /** A club season's id, or "2025-26" for a football year */
  id: string;
  label: string;
  /** yyyy-mm-dd, inclusive */
  from: string;
  to: string;
  current: boolean;
}

const YEAR_ID = /^(\d{4})-(\d{2})$/;
/** Past football years always offered, even before anything is recorded */
const PAST_SEASONS = 3;

/** The football year a date falls in: 1 August onwards is the next season. */
export function footballYear(date: string): number {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7));
  return m >= 8 ? y : y - 1;
}

export function footballSeason(startYear: number, today: string): SeasonOption {
  const end = String((startYear + 1) % 100).padStart(2, "0");
  return {
    id: `${startYear}-${end}`,
    label: `${startYear}/${end}`,
    from: `${startYear}-08-01`,
    to: `${startYear + 1}-07-31`,
    current: footballYear(today) === startYear,
  };
}

export interface SeasonRow { id: string; name: string; start_date: string; end_date: string | null; is_current: number | null }

async function clubSeasons(env: DB, tenantId: string): Promise<SeasonRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT id, name, start_date, end_date, is_current FROM seasons WHERE tenant_id = ? AND start_date IS NOT NULL ORDER BY start_date DESC LIMIT 30`,
  ).bind(tenantId).all<SeasonRow>();
  return results ?? [];
}

/** Every season the club can look back at, newest first. */
export async function seasonOptions(env: DB, tenantId: string, now = new Date()): Promise<SeasonOption[]> {
  const today = now.toISOString().slice(0, 10);
  const rows = await clubSeasons(env, tenantId);
  const first = await env.DB.prepare(
    `SELECT MIN(d) AS d FROM (
       SELECT MIN(substr(match_date, 1, 10)) AS d FROM team_results WHERE tenant_id = ?
       UNION ALL SELECT MIN(substr(fixture_date, 1, 10)) FROM fixtures WHERE tenant_id = ?
       UNION ALL SELECT MIN(season_from) FROM player_stat_entries WHERE tenant_id = ?)`,
  ).bind(tenantId, tenantId, tenantId).first<{ d: string | null }>();
  const thisYear = footballYear(today);
  // Always offer a few past seasons, so clubs can fill in their history
  const seeded = first?.d && /^\d{4}-\d{2}/.test(first.d) ? footballYear(first.d) : thisYear;
  const firstYear = Math.max(Math.min(seeded, thisYear - PAST_SEASONS), thisYear - 15);
  if (rows.length) return withClubSeasons(rows, firstYear, today);
  const out: SeasonOption[] = [];
  for (let y = Math.max(thisYear, firstYear); y >= Math.min(firstYear, thisYear); y--) out.push(footballSeason(y, today));
  return out;
}

/**
 * The club's own seasons, newest first, then the football years before the
 * first of them, so starting a season never hides older results and stats
 * (a year running into the first club season stops the day before it).
 */
export function withClubSeasons(rows: SeasonRow[], firstYear: number, today: string): SeasonOption[] {
  const anyCurrent = rows.some((r) => r.is_current === 1);
  const club = rows.map((r, i) => {
    const from = r.start_date.slice(0, 10);
    // An open season runs until the next one starts (or for good)
    const to = (r.end_date ?? "").slice(0, 10) || (i > 0 ? previousDay(rows[i - 1].start_date.slice(0, 10)) : "9999-12-31");
    return { id: r.id, label: r.name, from, to, current: anyCurrent ? r.is_current === 1 : i === 0 };
  });
  const earliest = club.reduce((m, o) => (o.from < m ? o.from : m), club[0].from);
  const older: SeasonOption[] = [];
  for (let y = footballYear(earliest); y >= firstYear; y--) {
    const year = { ...footballSeason(y, today), current: false };
    // A year that runs into the first club season stops the day before it
    if (year.from < earliest) older.push(year.to < earliest ? year : { ...year, to: previousDay(earliest) });
  }
  return [...club, ...older];
}

function previousDay(date: string): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
}

/**
 * The season asked for (`season` query value): a club season id, "2025-26",
 * "all" (null: no filter), or nothing (the current season).
 */
export async function resolveSeason(env: DB, tenantId: string, value: string | null, now = new Date()): Promise<SeasonOption | null> {
  if (value === "all") return null;
  const today = now.toISOString().slice(0, 10);
  const year = value ? value.match(YEAR_ID) : null;
  if (year) return footballSeason(Number(year[1]), today);
  const options = await seasonOptions(env, tenantId, now);
  if (value) {
    const found = options.find((o) => o.id === value);
    if (found) return found;
  }
  return options.find((o) => o.current) ?? options[0] ?? footballSeason(footballYear(today), today);
}
