/**
 * The Stats screen: season leaderboards from GET /api/v1/stats/players
 * (the server's squadStats). No react-native imports (node test/stats.test.js).
 */

export interface PlayerTotals {
  id: string;
  name: string;
  number: number | null;
  position: string | null;
  photo: string | null;
  appearances: number;
  minutes: number;
  goals: number;
  assists: number;
  motm: number;
  yellowCards: number;
  redCards: number;
  sinBins: number;
}

export type Board = 'goals' | 'assists' | 'involvements' | 'minutes' | 'motm' | 'discipline';

export const BOARDS: Array<{ id: Board; label: string; icon: string; column: string; empty: string }> = [
  { id: 'goals', label: 'Goals', icon: 'soccer', column: 'Goals', empty: 'No goals recorded yet.' },
  { id: 'assists', label: 'Assists', icon: 'shoe-cleat', column: 'Assists', empty: 'No assists recorded yet.' },
  { id: 'involvements', label: 'Goals + assists', icon: 'target', column: 'G+A', empty: 'No goals or assists recorded yet.' },
  { id: 'minutes', label: 'Minutes', icon: 'timer-outline', column: 'Mins', empty: 'Minutes count from matches with a line-up in Match Centre.' },
  { id: 'motm', label: 'Man of the Match', icon: 'star', column: 'MOTM', empty: 'No Man of the Match awards yet.' },
  { id: 'discipline', label: 'Cards', icon: 'cards', column: 'Cards', empty: 'No cards or sin bins. Nice and clean.' },
];

const count = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};

/** The server's rows, checked: anything missing counts as 0. */
export function readTotals(raw: unknown): PlayerTotals[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object' && typeof (r as { id?: unknown }).id === 'string')
    .map((r) => ({
      id: r.id as string,
      name: typeof r.name === 'string' && r.name.trim() ? r.name.trim() : 'Unknown',
      number: count(r.number) || null,
      position: typeof r.position === 'string' && r.position.trim() ? r.position.trim() : null,
      photo: typeof r.photo === 'string' && r.photo ? r.photo : null,
      appearances: count(r.appearances),
      minutes: count(r.minutes),
      goals: count(r.goals),
      assists: count(r.assists),
      motm: count(r.motmCount),
      yellowCards: count(r.yellowCards),
      redCards: count(r.redCards),
      sinBins: count(r.sinBins),
    }));
}

/** The number a board ranks by. Cards: a red counts as two yellows, a sin bin as one. */
export function boardValue(p: PlayerTotals, board: Board): number {
  switch (board) {
    case 'goals': return p.goals;
    case 'assists': return p.assists;
    case 'involvements': return p.goals + p.assists;
    case 'minutes': return p.minutes;
    case 'motm': return p.motm;
    case 'discipline': return p.yellowCards + p.redCards * 2 + p.sinBins;
  }
}

export interface BoardRow {
  player: PlayerTotals;
  value: number;
  /** Joint places share a rank: 1, 2, 2, 4 */
  rank: number;
}

/** Players with something on this board, highest first (fewer apps first on a tie), up to `limit`. */
export function leaderboard(players: PlayerTotals[], board: Board, limit = 15): BoardRow[] {
  const sorted = players
    .map((player) => ({ player, value: boardValue(player, board) }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value || a.player.appearances - b.player.appearances || a.player.name.localeCompare(b.player.name))
    .slice(0, limit);
  const rows: BoardRow[] = [];
  sorted.forEach((r, i) => {
    const previous = rows[i - 1];
    rows.push({ ...r, rank: previous && previous.value === r.value ? previous.rank : i + 1 });
  });
  return rows;
}

/** "2 yellow · 1 red · 1 sin bin" under a name on the Cards board. */
export function disciplineText(p: PlayerTotals): string {
  return [
    p.yellowCards ? `${p.yellowCards} yellow` : '',
    p.redCards ? `${p.redCards} red` : '',
    p.sinBins ? `${p.sinBins} sin bin${p.sinBins === 1 ? '' : 's'}` : '',
  ].filter(Boolean).join(' · ');
}

/** The squad's totals for the summary strip. */
export function squadTotals(players: PlayerTotals[]): { goals: number; assists: number; scorers: number; motm: number } {
  return {
    goals: players.reduce((s, p) => s + p.goals, 0),
    assists: players.reduce((s, p) => s + p.assists, 0),
    scorers: players.filter((p) => p.goals > 0).length,
    motm: players.reduce((s, p) => s + p.motm, 0),
  };
}
