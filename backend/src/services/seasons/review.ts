/**
 * How a season went, worked out the same way as everywhere else in the app:
 * results and stats by the season's dates (seasons/range.ts), not by a
 * season id on each row (nothing sets those any more). Used by the end of
 * season preview, the snapshots saved when a season ends, and its awards.
 */
import { squadStats, type PlayerStatLine } from "../squadStats";
import type { SeasonOption } from "./range";

type Env = { DB: D1Database };

export interface SeasonSummary {
  played: number; won: number; drawn: number; lost: number;
  goalsFor: number; goalsAgainst: number; goalDifference: number; points: number; cleanSheets: number;
}

export interface Leader { id: string; playerId: string; name: string; value: number }

export interface SeasonReview {
  summary: SeasonSummary;
  topScorer: (Leader & { goals: number }) | null;
  topAssister: (Leader & { assists: number }) | null;
  mostAppearances: (Leader & { appearances: number }) | null;
  motmLeader: (Leader & { count: number }) | null;
  players: PlayerStatLine[];
  warnings: string[];
}

/** Played, won ... clean sheets from our results (our_score is always ours). */
export function summarise(rows: Array<{ our_score: number | null; their_score: number | null }>): SeasonSummary {
  const s: SeasonSummary = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, cleanSheets: 0 };
  for (const r of rows) {
    const gf = Number(r.our_score) || 0;
    const ga = Number(r.their_score) || 0;
    s.played += 1;
    s.goalsFor += gf;
    s.goalsAgainst += ga;
    if (ga === 0) s.cleanSheets += 1;
    if (gf > ga) s.won += 1;
    else if (gf === ga) s.drawn += 1;
    else s.lost += 1;
  }
  s.goalDifference = s.goalsFor - s.goalsAgainst;
  s.points = s.won * 3 + s.drawn;
  return s;
}

/** The player with the most of something (null when nobody has any). */
export function leader(players: PlayerStatLine[], pick: (p: PlayerStatLine) => number): Leader | null {
  const best = [...players].sort((a, b) => pick(b) - pick(a) || a.name.localeCompare(b.name))[0];
  if (!best || pick(best) <= 0) return null;
  return { id: best.id, playerId: best.id, name: best.name, value: pick(best) };
}

export async function seasonReview(env: Env, tenantId: string, season: SeasonOption): Promise<SeasonReview> {
  const [{ results }, players] = await Promise.all([
    env.DB.prepare(`SELECT our_score, their_score FROM team_results WHERE tenant_id = ? AND substr(match_date, 1, 10) BETWEEN ? AND ?`)
      .bind(tenantId, season.from, season.to).all<{ our_score: number; their_score: number }>(),
    squadStats(env, tenantId, season),
  ]);
  const summary = summarise(results ?? []);
  const scorer = leader(players, (p) => p.goals);
  const assister = leader(players, (p) => p.assists);
  const apps = leader(players, (p) => p.appearances);
  const motm = leader(players, (p) => p.motmCount);
  const warnings: string[] = [];
  if (!summary.played) warnings.push("No results recorded this season");
  if (!scorer) warnings.push("No goals recorded this season");
  return {
    summary,
    topScorer: scorer && { ...scorer, goals: scorer.value },
    topAssister: assister && { ...assister, assists: assister.value },
    mostAppearances: apps && { ...apps, appearances: apps.value },
    motmLeader: motm && { ...motm, count: motm.value },
    players,
    warnings,
  };
}

export interface AwardInput { awardType: string; playerId: string; name: string | null; notes: string | null }

/** Awards as the app sends them ({awardType, playerId, customName}) or the website ({type, award_name, player_id}). */
export function readAwards(raw: unknown): AwardInput[] {
  if (!Array.isArray(raw)) return [];
  const out: AwardInput[] = [];
  for (const a of raw as Array<Record<string, unknown>>) {
    const playerId = String(a?.playerId ?? a?.player_id ?? "").trim();
    const awardType = String(a?.awardType ?? a?.type ?? "custom").trim().slice(0, 40) || "custom";
    const nameRaw = a?.customName ?? a?.award_name ?? a?.name;
    const name = typeof nameRaw === "string" && nameRaw.trim() ? nameRaw.trim().slice(0, 80) : null;
    const notes = typeof a?.notes === "string" && a.notes.trim() ? a.notes.trim().slice(0, 200) : null;
    if (!playerId || (awardType === "custom" && !name)) continue;
    out.push({ awardType, playerId, name, notes });
  }
  return out.slice(0, 30);
}
