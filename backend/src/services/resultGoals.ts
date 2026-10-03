/**
 * Scorers picked from the squad when staff add or edit a result. Each goal is
 * saved as a `match_events` goal (id `res-<result id>-<n>`), so it counts in
 * player stats, season totals and player pages; the result's `scorers` text
 * ("Pat Player 2, OG") is written from the same picks.
 *
 * Results recorded in Match Centre or a match report already have their own
 * goal events for the fixture: those scorers are locked here.
 */

type Env = { DB: D1Database };

export const MAX_GOALS = 99;

export interface GoalPicks {
  /** One entry per goal: the same player twice for two goals */
  scorerIds: string[];
  ownGoals: number;
}

/** Picks from a request body, `undefined` if none were sent, or why they can't be used. */
export function readGoalPicks(body: Record<string, unknown>): GoalPicks | undefined | string {
  if (body.scorerIds === undefined && body.ownGoals === undefined) return undefined;
  const ids = body.scorerIds ?? [];
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string" || !id || id.length > 100)) return "Choose scorers from the squad.";
  const ownGoals = body.ownGoals === undefined ? 0 : Number(body.ownGoals);
  if (!Number.isInteger(ownGoals) || ownGoals < 0) return "Own goals must be a whole number.";
  if (ids.length + ownGoals > MAX_GOALS) return "That's too many goals.";
  return { scorerIds: ids as string[], ownGoals };
}

/** "Pat Player 2, Sam Smith, OG" in the order players first scored. */
export function scorersText(picks: GoalPicks, names: Map<string, string>): string | null {
  const counts = new Map<string, number>();
  for (const id of picks.scorerIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  const parts = [...counts].map(([id, n]) => `${names.get(id) ?? "Unknown"}${n > 1 ? ` ${n}` : ""}`);
  if (picks.ownGoals) parts.push(picks.ownGoals > 1 ? `OG ${picks.ownGoals}` : "OG");
  return parts.length ? parts.join(", ") : null;
}

/** Own goals written by scorersText ("OG" or "OG 2"), for loading a result back into the form. */
export function ownGoalsIn(text: string | null | undefined): number {
  const m = /(?:^|,\s*)OG(?:\s+(\d+))?\s*(?:,|$)/.exec(text ?? "");
  return m ? Number(m[1] ?? 1) : 0;
}

const prefix = (resultId: number | string) => `res-${resultId}-`;

/** The squad names for these ids, or the first id that isn't in this club's squad. */
export async function squadNames(env: Env, tenantId: string, ids: string[]): Promise<Map<string, string> | { unknown: string }> {
  const unique = [...new Set(ids)];
  const names = new Map<string, string>();
  if (!unique.length) return names;
  const { results } = await env.DB.prepare(
    `SELECT id, name FROM squad WHERE tenant_id = ? AND id IN (${unique.map(() => "?").join(",")})`,
  ).bind(tenantId, ...unique).all<{ id: string; name: string }>();
  for (const r of results ?? []) names.set(r.id, r.name);
  const missing = unique.find((id) => !names.has(id));
  return missing ? { unknown: missing } : names;
}

/** Whether a result's scorers come from Match Centre or a match report (so can't be picked here). */
export async function lockedResultIds(env: Env, tenantId: string, rows: Array<{ id: number; fixture_id: string | null }>): Promise<Set<number>> {
  const fixtures = [...new Set(rows.map((r) => r.fixture_id).filter((f): f is string => !!f))];
  if (!fixtures.length) return new Set();
  const { results } = await env.DB.prepare(
    `SELECT DISTINCT fixture_id FROM match_events
     WHERE tenant_id = ? AND event_type = 'goal' AND id NOT LIKE 'res-%' AND fixture_id IN (${fixtures.map(() => "?").join(",")})`,
  ).bind(tenantId, ...fixtures).all<{ fixture_id: string }>();
  const withEvents = new Set((results ?? []).map((r) => r.fixture_id));
  return new Set(rows.filter((r) => r.fixture_id && withEvents.has(r.fixture_id)).map((r) => r.id));
}

/**
 * Replaces this result's picked goals. Events are tied to the fixture when the
 * result has one, otherwise to the result itself (squadStats dates both).
 */
export async function replaceResultGoals(env: Env, tenantId: string, result: { id: number; fixture_id: string | null }, picks: GoalPicks): Promise<void> {
  const fixtureKey = result.fixture_id ?? String(result.id);
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM match_events WHERE tenant_id = ? AND id LIKE ?`).bind(tenantId, `${prefix(result.id)}%`),
    ...picks.scorerIds.map((playerId, i) =>
      env.DB.prepare(`INSERT INTO match_events (id, tenant_id, fixture_id, player_id, event_type, minute, created_at) VALUES (?, ?, ?, ?, 'goal', NULL, ?)`)
        .bind(`${prefix(result.id)}${i + 1}`, tenantId, fixtureKey, playerId, now)),
  ]);
}

export async function removeResultGoals(env: Env, tenantId: string, resultId: number | string): Promise<void> {
  await env.DB.prepare(`DELETE FROM match_events WHERE tenant_id = ? AND id LIKE ?`).bind(tenantId, `${prefix(resultId)}%`).run();
}

/** Picked scorer ids per result (one entry per goal), for the edit form. */
export async function pickedGoals(env: Env, tenantId: string, resultIds: number[]): Promise<Map<number, string[]>> {
  const out = new Map<number, string[]>();
  if (!resultIds.length) return out;
  const { results } = await env.DB.prepare(
    `SELECT id, player_id FROM match_events WHERE tenant_id = ? AND event_type = 'goal' AND id LIKE 'res-%' ORDER BY created_at, id`,
  ).bind(tenantId).all<{ id: string; player_id: string }>();
  const wanted = new Set(resultIds);
  for (const r of results ?? []) {
    const m = /^res-(\d+)-(\d+)$/.exec(r.id);
    if (!m || !wanted.has(Number(m[1]))) continue;
    const list = out.get(Number(m[1])) ?? [];
    list[Number(m[2]) - 1] = r.player_id;
    out.set(Number(m[1]), list);
  }
  for (const [k, v] of out) out.set(k, v.filter(Boolean));
  return out;
}
