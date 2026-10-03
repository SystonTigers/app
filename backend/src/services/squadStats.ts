/**
 * Players' goals, assists, cards, Man of the Match awards and appearances for
 * a season (or all time): Match Centre / match reports (`match_events`),
 * line-ups (`match_lineups`, starters and subs who came on) and numbers staff
 * typed in for past seasons (`player_stat_entries`).
 */
import type { SeasonOption } from "./seasons/range";

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
  appearances: number;
}

/** The whole squad (top scorers first), or one player when `playerId` is given. */
export async function squadStats(
  env: { DB: D1Database },
  tenantId: string,
  season: Pick<SeasonOption, "from" | "to"> | null,
  playerId: string | null = null,
): Promise<PlayerStatLine[]> {
  const from = season?.from ?? null;
  const to = season?.to ?? null;
  const { results } = await env.DB.prepare(`
        SELECT s.id, s.name, s.number, s.position, COALESCE(s.headshot_url, s.photo_url) AS photo,
               COALESCE(e.goals, 0) + COALESCE(h.goals, 0) AS goals,
               COALESCE(e.assists, 0) + COALESCE(h.assists, 0) AS assists,
               COALESCE(e.motm, 0) + COALESCE(h.motm, 0) AS motm,
               COALESCE(e.yellow, 0) + COALESCE(h.yellow, 0) AS yellow_cards,
               COALESCE(e.red, 0) + COALESCE(h.red, 0) AS red_cards,
               MAX(COALESCE(a.apps, 0), COALESCE(e.fixtures, 0)) + COALESCE(h.apps, 0) AS appearances
        FROM squad s
        LEFT JOIN (
            SELECT player_id, SUM(event_type = 'goal') AS goals, SUM(event_type = 'assist') AS assists,
                   SUM(event_type = 'motm') AS motm, SUM(event_type = 'yellow_card') AS yellow,
                   SUM(event_type = 'red_card') AS red, COUNT(DISTINCT fixture_id) AS fixtures
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
        `).bind(tenantId, from, from, to, tenantId, from, from, to, tenantId, from, from, to, tenantId, playerId, playerId).all<Record<string, unknown>>();
    return (results || []).map((r) => ({
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
        appearances: Number(r.appearances),
    }));
}
