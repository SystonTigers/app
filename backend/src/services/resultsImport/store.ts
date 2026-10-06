/**
 * Plans and saves a results spreadsheet: which rows are new, which update an
 * earlier import, which are already there from Match Centre or the form.
 *
 * Safe to run twice: the same file again changes nothing. Re-importing after
 * adding old players to the squad fills in their goals (rows saved by an
 * earlier import are updated; results from anywhere else are never touched).
 */
import { outcomeFromScores } from "../results";
import { sameOpponent } from "../headToHead";
import { matchScorers, type ParsedResult, type ParsedSheets, type ScorerName, type SquadMember } from "./rows";

type Env = { DB: D1Database };

export type PlanStatus = "new" | "update" | "unchanged" | "exists";

export interface PlannedResult extends ParsedResult {
  status: PlanStatus;
  existingId: number | null;
  scorerIds: string[];
  unmatched: ScorerName[];
  tooMany: boolean;
}

export interface ImportPlan {
  results: PlannedResult[];
  skipped: ParsedSheets["skipped"];
  ignoredSheets: ParsedSheets["ignoredSheets"];
  /** Scorers not in the squad, across the file, most goals first */
  unmatchedNames: ScorerName[];
  counts: { new: number; update: number; unchanged: number; exists: number; skipped: number };
}

interface ExistingRow { id: number; match_date: string; opponent: string; our_score: number; their_score: number; competition: string; scorers: string | null; source: string | null }

/** Compares the file with what's saved and decides what to do with each row. */
export async function planImport(env: Env, tenantId: string, parsed: ParsedSheets): Promise<ImportPlan> {
  const [{ results: squadRows }, { results: existingRows }, { results: goalRows }] = await Promise.all([
    env.DB.prepare(`SELECT id, name FROM squad WHERE tenant_id = ?`).bind(tenantId).all<SquadMember>(),
    env.DB.prepare(`SELECT id, substr(match_date, 1, 10) AS match_date, opponent, our_score, their_score, competition, scorers, source FROM team_results WHERE tenant_id = ?`)
      .bind(tenantId).all<ExistingRow>(),
    env.DB.prepare(`SELECT id, player_id FROM match_events WHERE tenant_id = ? AND event_type = 'goal' AND id LIKE 'res-%'`)
      .bind(tenantId).all<{ id: string; player_id: string }>(),
  ]);
  // Goals already saved for each result, to tell whether an earlier import needs updating
  const savedGoals = new Map<number, string[]>();
  for (const g of goalRows ?? []) {
    const id = Number(/^res-(\d+)-/.exec(g.id)?.[1]);
    if (id) savedGoals.set(id, [...(savedGoals.get(id) ?? []), g.player_id]);
  }
  const samePlayers = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join();
  const squad = squadRows ?? [];
  const byDate = new Map<string, ExistingRow[]>();
  for (const r of existingRows ?? []) byDate.set(r.match_date, [...(byDate.get(r.match_date) ?? []), r]);

  const seen = new Set<string>();
  const results: PlannedResult[] = [];
  const skipped = [...parsed.skipped];
  for (const r of parsed.results) {
    // The same match twice in the file: keep the first
    const key = `${r.date}|${r.opponent.toLowerCase()}`;
    if (seen.has(key)) { skipped.push({ where: r.where, reason: "the same match is in the file twice" }); continue; }
    seen.add(key);
    const m = matchScorers(r, squad);
    const existing = (byDate.get(r.date) ?? []).find((e) => e.opponent.toLowerCase() === r.opponent.toLowerCase() || sameOpponent(e.opponent, r.opponent)) ?? null;
    let status: PlanStatus = "new";
    if (existing) {
      if (existing.source !== "import") status = "exists";
      else {
        const same = existing.our_score === r.ourScore && existing.their_score === r.theirScore && existing.competition === r.competition
          && (existing.scorers ?? null) === (r.scorersText ?? null) && samePlayers(savedGoals.get(existing.id) ?? [], m.tooMany ? [] : m.scorerIds);
        status = same ? "unchanged" : "update";
      }
    }
    results.push({ ...r, status, existingId: existing?.id ?? null, scorerIds: m.tooMany ? [] : m.scorerIds, unmatched: m.unmatched, tooMany: m.tooMany });
  }

  const missing = new Map<string, ScorerName>();
  for (const r of results) {
    if (r.status === "exists") continue;
    for (const u of r.unmatched) {
      const k = u.name.toLowerCase();
      const prev = missing.get(k);
      if (prev) prev.goals += u.goals;
      else missing.set(k, { ...u });
    }
  }
  const count = (s: PlanStatus) => results.filter((r) => r.status === s).length;
  return {
    results,
    skipped,
    ignoredSheets: parsed.ignoredSheets,
    unmatchedNames: [...missing.values()].sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name)),
    counts: { new: count("new"), update: count("update"), unchanged: count("unchanged"), exists: count("exists"), skipped: skipped.length },
  };
}

function venueFor(r: ParsedResult): string {
  if (r.homeAway === "home") return "Home";
  if (r.homeAway === "away") return "Away";
  return r.venue ?? "TBC";
}

const CHUNK = 40;

/** Saves the plan's new and changed rows. Returns how many were added and updated. */
export async function applyImport(env: Env, tenantId: string, plan: ImportPlan): Promise<{ added: number; updated: number }> {
  const toAdd = plan.results.filter((r) => r.status === "new");
  const toUpdate = plan.results.filter((r) => r.status === "update" && r.existingId);
  const goalsFor: Array<{ id: number; r: PlannedResult }> = [];

  for (let i = 0; i < toAdd.length; i += CHUNK) {
    const chunk = toAdd.slice(i, i + CHUNK);
    const res = await env.DB.batch(chunk.map((r) => {
      const { result, points } = outcomeFromScores(r.ourScore, r.theirScore);
      return env.DB.prepare(
        `INSERT INTO team_results (tenant_id, match_date, opponent, venue, competition, our_score, their_score, result, points, scorers, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'import')
         ON CONFLICT(tenant_id, match_date, opponent) DO NOTHING
         RETURNING id`,
      ).bind(tenantId, r.date, r.opponent, venueFor(r), r.competition, r.ourScore, r.theirScore, result, points, r.scorersText);
    }));
    res.forEach((out, j) => {
      const id = Number((out.results?.[0] as { id?: number } | undefined)?.id);
      if (id) goalsFor.push({ id, r: chunk[j] });
    });
  }

  for (let i = 0; i < toUpdate.length; i += CHUNK) {
    await env.DB.batch(toUpdate.slice(i, i + CHUNK).map((r) => {
      const { result, points } = outcomeFromScores(r.ourScore, r.theirScore);
      return env.DB.prepare(
        `UPDATE team_results SET our_score = ?, their_score = ?, result = ?, points = ?, competition = ?, venue = ?, scorers = ?
         WHERE id = ? AND tenant_id = ? AND source = 'import'`,
      ).bind(r.ourScore, r.theirScore, result, points, r.competition, venueFor(r), r.scorersText, r.existingId, tenantId);
    }));
    for (const r of toUpdate.slice(i, i + CHUNK)) goalsFor.push({ id: r.existingId!, r });
  }

  // Goals by squad players, as match_events "res-<result>-<n>" (same as results added in the app)
  const now = Date.now();
  const statements: D1PreparedStatement[] = [];
  for (const { id, r } of goalsFor) {
    statements.push(env.DB.prepare(`DELETE FROM match_events WHERE tenant_id = ? AND id LIKE ?`).bind(tenantId, `res-${id}-%`));
    r.scorerIds.forEach((playerId, n) => {
      statements.push(env.DB.prepare(`INSERT INTO match_events (id, tenant_id, fixture_id, player_id, event_type, minute, created_at) VALUES (?, ?, ?, ?, 'goal', NULL, ?)`)
        .bind(`res-${id}-${n + 1}`, tenantId, String(id), playerId, now));
    });
  }
  for (let i = 0; i < statements.length; i += 100) await env.DB.batch(statements.slice(i, i + 100));

  return { added: goalsFor.length - toUpdate.length, updated: toUpdate.length };
}
