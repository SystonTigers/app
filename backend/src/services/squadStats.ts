/**
 * Players' goals, assists, cards, sin bins, Man of the Match awards,
 * appearances and minutes for a season (or all time): Match Centre / match
 * reports (`match_events`), line-ups (`match_lineups`, starters and subs who
 * came on) and numbers staff typed in for past seasons (`player_stat_entries`).
 * Minutes only count matches with a line-up (`minutesPlayed`).
 */
import type { SeasonOption } from "./seasons/range";
import { minutesPlayed, type LineupEntry, type LiveEvent, type LiveEventType } from "./liveMatchState";
import { hideAssists, tracksAssists } from "./clubOptions";

export interface PlayerStatLine {
  id: string;
  name: string;
  number: number | null;
  position: string | null;
  photo: string | null;
  goals: number;
  assists: number;
  motmCount: number;
  yellowCards: number;
  redCards: number;
  sinBins: number;
  appearances: number;
  /** Minutes on the pitch in matches with a line-up */
  minutes: number;
}

type Season = Pick<SeasonOption, "from" | "to"> | null;

/**
 * Minutes per player in the completed matches (in the season) that have a
 * line-up: two reads for the whole season, worked out per match in TS.
 */
async function seasonMinutes(env: { DB: D1Database }, tenantId: string, season: Season): Promise<Map<string, number>> {
  const from = season?.from ?? null;
  const to = season?.to ?? null;
  const inSeason = `f.status = 'completed' AND (? IS NULL OR substr(f.fixture_date, 1, 10) BETWEEN ? AND ?)`;
  const [lineups, events, reportReds] = await Promise.all([
    env.DB.prepare(
      `SELECT ml.fixture_id, ml.player_id, ml.role FROM match_lineups ml
       JOIN fixtures f ON f.id = ml.fixture_id AND f.tenant_id = ml.tenant_id
       WHERE ml.tenant_id = ? AND ${inSeason}`,
    ).bind(tenantId, from, from, to).all<{ fixture_id: string; player_id: string; role: string }>(),
    env.DB.prepare(
      `SELECT le.id, le.fixture_id, le.type, le.minute, le.player_id, le.player2_id, le.text, COALESCE(le.occurred_at, le.created_at) AS at
       FROM live_match_events le JOIN fixtures f ON f.id = le.fixture_id AND f.tenant_id = le.tenant_id
       WHERE le.tenant_id = ? AND le.deleted_at IS NULL AND ${inSeason}
         AND le.type IN ('kick_off', 'half_time', 'second_half', 'full_time', 'sub', 'yellow', 'red')
         AND EXISTS (SELECT 1 FROM match_lineups x WHERE x.tenant_id = le.tenant_id AND x.fixture_id = le.fixture_id)
       ORDER BY COALESCE(le.occurred_at, le.created_at), le.rowid`,
    ).bind(tenantId, from, from, to).all<{ id: string; fixture_id: string; type: LiveEventType; minute: number | null; player_id: string | null; player2_id: string | null; text: string | null; at: number }>(),
    // Red cards from match reports (Match Centre's own are in the updates above)
    env.DB.prepare(
      `SELECT me.id, me.fixture_id, me.player_id, me.minute FROM match_events me
       JOIN fixtures f ON f.id = me.fixture_id AND f.tenant_id = me.tenant_id
       WHERE me.tenant_id = ? AND me.event_type = 'red_card' AND me.id NOT LIKE 'live-%' AND ${inSeason}`,
    ).bind(tenantId, from, from, to).all<{ id: string; fixture_id: string; player_id: string; minute: number | null }>(),
  ]);

  const byFixture = new Map<string, { lineup: LineupEntry[]; events: LiveEvent[] }>();
  for (const l of lineups.results || []) {
    const match = byFixture.get(l.fixture_id) ?? { lineup: [], events: [] };
    match.lineup.push({ playerId: l.player_id, role: l.role === "starter" ? "starter" : "sub" });
    byFixture.set(l.fixture_id, match);
  }
  const event = (id: string, type: LiveEventType, minute: number | null, playerId: string | null, player2Id: string | null, text: string | null, at: number): LiveEvent =>
    ({ id, type, minute, playerId, playerName: null, player2Id, player2Name: null, text, createdAt: at });
  for (const e of events.results || []) {
    byFixture.get(e.fixture_id)?.events.push(event(e.id, e.type, e.minute, e.player_id, e.player2_id, e.text, e.at));
  }
  // A match report has no Match Centre updates: its red cards stop the clock instead
  const reds = [...(reportReds.results || [])].sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));
  const reportOnly = new Set([...byFixture].filter(([, m]) => !m.events.length).map(([id]) => id));
  for (const r of reds) {
    // Without a minute we can't tell when they went off, so they keep the full match
    if (reportOnly.has(r.fixture_id) && r.minute !== null) byFixture.get(r.fixture_id)?.events.push(event(r.id, "red", r.minute, r.player_id, null, null, 0));
  }

  const totals = new Map<string, number>();
  for (const { lineup, events: matchEvents } of byFixture.values()) {
    for (const [id, m] of minutesPlayed(lineup, matchEvents)) totals.set(id, (totals.get(id) ?? 0) + m);
  }
  return totals;
}

/** The whole squad (top scorers first), or one player when `playerId` is given. */
export async function squadStats(
  env: { DB: D1Database },
  tenantId: string,
  season: Season,
  playerId: string | null = null,
): Promise<PlayerStatLine[]> {
  const from = season?.from ?? null;
  const to = season?.to ?? null;
  const [played, tracked, { results }] = await Promise.all([seasonMinutes(env, tenantId, season), tracksAssists(env, tenantId), env.DB.prepare(`
        SELECT s.id, s.name, s.number, s.position, COALESCE(s.headshot_url, s.photo_url) AS photo,
               COALESCE(e.goals, 0) + COALESCE(h.goals, 0) AS goals,
               COALESCE(e.assists, 0) + COALESCE(h.assists, 0) AS assists,
               COALESCE(e.motm, 0) + COALESCE(h.motm, 0) AS motm,
               COALESCE(e.yellow, 0) + COALESCE(h.yellow, 0) AS yellow_cards,
               COALESCE(e.red, 0) + COALESCE(h.red, 0) AS red_cards,
               COALESCE(e.sin_bins, 0) AS sin_bins,
               MAX(COALESCE(a.apps, 0), COALESCE(e.fixtures, 0)) + COALESCE(h.apps, 0) AS appearances
        FROM squad s
        LEFT JOIN (
            SELECT player_id, SUM(event_type = 'goal') AS goals, SUM(event_type = 'assist') AS assists,
                   SUM(event_type = 'motm') AS motm, SUM(event_type = 'yellow_card') AS yellow,
                   SUM(event_type = 'red_card') AS red, SUM(event_type = 'sin_bin') AS sin_bins,
                   COUNT(DISTINCT fixture_id) AS fixtures
            FROM match_events me
            WHERE me.tenant_id = ? AND me.player_id IS NOT NULL
              AND (? IS NULL OR COALESCE(
                (SELECT substr(f.fixture_date, 1, 10) FROM fixtures f WHERE f.id = me.fixture_id AND f.tenant_id = me.tenant_id),
                (SELECT substr(r.match_date, 1, 10) FROM team_results r WHERE CAST(r.id AS TEXT) = me.fixture_id AND r.tenant_id = me.tenant_id)
              ) BETWEEN ? AND ?)
            GROUP BY player_id
        ) e ON e.player_id = s.id
        LEFT JOIN (
            SELECT ml.player_id, COUNT(DISTINCT ml.fixture_id) AS apps
            FROM match_lineups ml JOIN fixtures f ON f.id = ml.fixture_id AND f.tenant_id = ml.tenant_id
            WHERE ml.tenant_id = ? AND f.status = 'completed' AND (? IS NULL OR substr(f.fixture_date, 1, 10) BETWEEN ? AND ?)
              AND (ml.role = 'starter' OR EXISTS (
                SELECT 1 FROM live_match_events le WHERE le.tenant_id = ml.tenant_id AND le.fixture_id = ml.fixture_id
                  AND le.type = 'sub' AND le.player_id = ml.player_id AND le.deleted_at IS NULL))
            GROUP BY ml.player_id
        ) a ON a.player_id = s.id
        LEFT JOIN (
            SELECT player_id, SUM(appearances) AS apps, SUM(goals) AS goals, SUM(assists) AS assists,
                   SUM(yellow_cards) AS yellow, SUM(red_cards) AS red, SUM(motm) AS motm
            FROM player_stat_entries
            WHERE tenant_id = ? AND (? IS NULL OR season_from BETWEEN ? AND ?)
            GROUP BY player_id
        ) h ON h.player_id = s.id
        WHERE s.tenant_id = ? AND (? IS NULL OR s.id = ?)
        ORDER BY goals DESC, assists DESC, s.name
        `).bind(tenantId, from, from, to, tenantId, from, from, to, tenantId, from, from, to, tenantId, playerId, playerId).all<Record<string, unknown>>()]);
    return hideAssists((results || []).map((r) => ({
        id: String(r.id),
        name: String(r.name ?? ""),
        number: r.number === null || r.number === undefined ? null : Number(r.number),
        position: (r.position as string | null) ?? null,
        photo: (r.photo as string | null) ?? null,
        goals: Number(r.goals),
        assists: Number(r.assists),
        motmCount: Number(r.motm),
        yellowCards: Number(r.yellow_cards),
        redCards: Number(r.red_cards),
        sinBins: Number(r.sin_bins),
        appearances: Number(r.appearances),
        minutes: played.get(String(r.id)) ?? 0,
    })), tracked);
}
