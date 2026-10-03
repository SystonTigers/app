/**
 * League at a glance (GET /api/v1/league/snapshot): our row, the teams around
 * us and, during a league game, the table as it stands. No react-native
 * imports (tested in Node).
 */

export interface LeagueRow {
  position: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number | null;
  goalsAgainst: number | null;
  goalDifference: number;
  points: number;
  /** As it stands only: position in the saved table (null if new to it) */
  was?: number | null;
  /** As it stands only: one of the two teams playing now */
  playing?: boolean;
}

export interface LiveLeagueTable {
  fixtureId: string;
  opponent: string;
  opponentTeam: string | null;
  status: 'live' | 'half_time';
  ourScore: number;
  theirScore: number;
  rows: LeagueRow[];
}

export interface LeagueSnapshot {
  competition: string;
  ourTeam: string | null;
  source: 'results' | 'table';
  rows: LeagueRow[];
  around: LeagueRow[];
  live: LiveLeagueTable | null;
}

export type Movement = 'up' | 'down' | 'same' | 'new';

/** How a team has moved compared with the saved table. */
export function movement(row: Pick<LeagueRow, 'position' | 'was'>): Movement {
  if (row.was === undefined) return 'same';
  if (row.was === null) return 'new';
  return row.position < row.was ? 'up' : row.position > row.was ? 'down' : 'same';
}

/** +3, 0, -2 */
export function gdText(n: number): string {
  return `${n > 0 ? '+' : ''}${n}`;
}

/** A number or "–" for goals a pasted table didn't include. */
export function cell(n: number | null | undefined): string {
  return n === null || n === undefined ? '–' : String(n);
}

/** Up to `size` rows centred on ours (more below when top, more above when bottom). */
export function aroundTeam(rows: LeagueRow[], ourTeam: string | null, size = 5): LeagueRow[] {
  const i = ourTeam ? rows.findIndex((r) => sameTeam(r.team, ourTeam)) : -1;
  if (i < 0) return [];
  if (rows.length <= size) return rows;
  const start = Math.min(Math.max(i - Math.floor(size / 2), 0), rows.length - size);
  return rows.slice(start, start + size);
}

export function sameTeam(a: string, b: string): boolean {
  const key = (s: string) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
  return key(a) === key(b);
}

/** What the home strip shows: the live table when a league game is on, else the saved one. */
export function stripFor(snapshot: LeagueSnapshot | null): { rows: LeagueRow[]; live: LiveLeagueTable | null } | null {
  if (!snapshot?.ourTeam) return null;
  const live = snapshot.live;
  const rows = live ? aroundTeam(live.rows, snapshot.ourTeam) : snapshot.around;
  return rows.length ? { rows, live } : null;
}

/** "AS IT STANDS · 1–0 v Oadby" / "AS IT STANDS · HT 1–0 v Oadby" */
export function liveHeadline(live: LiveLeagueTable): string {
  return `${live.status === 'half_time' ? 'HT ' : ''}${live.ourScore}–${live.theirScore} v ${live.opponent}`;
}

/** "Up to 1st", "Down to 4th", "Staying 3rd" for our row in the live table. */
export function ourMoveText(live: LiveLeagueTable, ourTeam: string): string | null {
  const us = live.rows.find((r) => sameTeam(r.team, ourTeam));
  if (!us) return null;
  const pos = ordinal(us.position);
  const move = movement(us);
  return move === 'up' ? `Up to ${pos}` : move === 'down' ? `Down to ${pos}` : `Staying ${pos}`;
}

function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${s}`;
}
