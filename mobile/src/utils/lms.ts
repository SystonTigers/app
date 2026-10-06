/**
 * Last Man Standing admin helpers (Manager zone → Last Man Standing).
 * No react-native imports (node test/lms.test.js).
 */
import { parseDueDate } from './dues';

export interface LmsGame {
  id: string; name: string; competition?: string | null; status: 'active' | 'completed';
  round_number: number; total_entries: number; alive_entries: number; winner_name?: string | null;
}
export interface LmsFixture { id: string; home: string; away: string; homeScore?: number; awayScore?: number }
export interface LmsRound { id: string; round_number: number; name: string; deadline: number; status: 'open' | 'locked' | 'processed'; fixtures: LmsFixture[] }
export interface LmsEntry { id: string; user_name: string; status: 'alive' | 'eliminated' | 'winner'; streak: number; teams_used?: string[] | string; eliminated_round?: number | null }

export const ROUND_STATUS: Record<LmsRound['status'], string> = { open: 'Open for picks', locked: 'Picks closed', processed: 'Done' };
export const ENTRY_STATUS: Record<LmsEntry['status'], string> = { alive: 'Still in', eliminated: 'Out', winner: 'Winner' };

/** The matches typed in: blank rows dropped; a half-filled row or the same team twice is a problem. */
export function roundFixtures(rows: Array<{ home: string; away: string }>): Array<{ home: string; away: string }> | string {
  const out: Array<{ home: string; away: string }> = [];
  const teams = new Set<string>();
  for (const r of rows) {
    const home = r.home.trim().replace(/\s+/g, ' ');
    const away = r.away.trim().replace(/\s+/g, ' ');
    if (!home && !away) continue;
    if (!home || !away) return 'Fill in both teams for each match (or clear the row).';
    for (const t of [home, away]) {
      const key = t.toLowerCase();
      if (teams.has(key)) return `${t} is in more than one match.`;
      teams.add(key);
    }
    out.push({ home, away });
  }
  return out.length ? out : 'Add at least one match.';
}

/**
 * When picks close, from "31/10/2026" and "15:00" (UK time on the phone).
 * Blank date = none (the server uses a week from now). Must be in the future.
 */
export function picksClose(date: string, time: string, now = Date.now()): number | null | string {
  if (!date.trim()) return null;
  const day = parseDueDate(date);
  if (!day) return 'Enter the date like 31/10/2026.';
  const t = time.trim() || '23:59';
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return 'Enter the time like 15:00.';
  const [y, mo, d] = day.split('-').map(Number);
  const at = new Date(y, mo - 1, d, Number(m[1]), Number(m[2])).getTime();
  return at > now ? at : 'Picks need to close in the future.';
}

/** Scores typed in for each match: all needed, 0 to 99. */
export function roundResults(fixtures: LmsFixture[], typed: Record<string, { home: string; away: string }>): Array<{ id: string; homeScore: number; awayScore: number }> | string {
  const out = [];
  for (const f of fixtures) {
    const t = typed[f.id] ?? { home: '', away: '' };
    const h = /^\d{1,2}$/.test(t.home.trim()) ? Number(t.home) : NaN;
    const a = /^\d{1,2}$/.test(t.away.trim()) ? Number(t.away) : NaN;
    if (!Number.isFinite(h) || !Number.isFinite(a)) return `Enter the score for ${f.home} v ${f.away}.`;
    out.push({ id: f.id, homeScore: h, awayScore: a });
  }
  return out;
}

export function teamsUsed(e: LmsEntry): string[] {
  if (Array.isArray(e.teams_used)) return e.teams_used;
  try { const v = JSON.parse(e.teams_used || '[]'); return Array.isArray(v) ? v.map(String) : []; } catch { return []; }
}

export function processedText(s: { survived?: number; eliminated?: number; gameOver?: boolean; winners?: Array<{ name: string }> }): string {
  const base = `Round done: ${s.survived ?? 0} through, ${s.eliminated ?? 0} out.`;
  if (!s.gameOver) return base;
  return s.winners?.length === 1 ? `${base} ${s.winners[0].name} wins!` : `${base} Nobody is left, so the game is over.`;
}
