/**
 * Goal of the Month (GET /api/v1/gotm): the open vote, my vote and past
 * winners. No react-native imports (node test/gotm.test.js).
 */
import type { GoalClip } from './playerPage';

export interface GotmCandidate {
  id: string;
  playerId: string;
  playerName: string;
  fixtureId: string | null;
  opponent: string | null;
  date: string | null;
  minute: number | null;
  description: string | null;
  /** The match video clip, when there is one and the family agreed to video */
  clip: GoalClip | null;
  /** A link staff added for a goal with no match video */
  videoUrl: string | null;
  /** Staff see counts while voting is open; everyone once it's closed */
  votes: number | null;
}

export interface GotmVote {
  id: string;
  label: string;
  status: 'open' | 'closed';
  candidates: GotmCandidate[];
  myVote: string | null;
  winners: string[];
}

export interface GotmData {
  vote: GotmVote | null;
  past: GotmVote[];
}

const asText = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);
const asNumber = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function readCandidate(raw: unknown): GotmCandidate | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = asText(r.id);
  if (!id) return null;
  return {
    id,
    playerId: asText(r.playerId) ?? '',
    playerName: asText(r.playerName) ?? 'Unknown',
    fixtureId: asText(r.fixtureId),
    opponent: asText(r.opponent),
    date: asText(r.date),
    minute: asNumber(r.minute),
    description: asText(r.description),
    clip: r.clip && typeof r.clip === 'object' ? (r.clip as GoalClip) : null,
    videoUrl: asText(r.videoUrl),
    votes: asNumber(r.votes),
  };
}

function readVote(raw: unknown): GotmVote | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = asText(r.id);
  if (!id) return null;
  return {
    id,
    label: asText(r.label) ?? 'Goal of the Month',
    status: r.status === 'closed' ? 'closed' : 'open',
    candidates: (Array.isArray(r.candidates) ? r.candidates : []).map(readCandidate).filter((c): c is GotmCandidate => !!c),
    myVote: asText(r.myVote),
    winners: Array.isArray(r.winners) ? r.winners.filter((w): w is string => typeof w === 'string') : [],
  };
}

/** The server's `data`, checked. */
export function readGotm(data: unknown): GotmData {
  const d = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  return {
    vote: readVote(d.vote),
    past: (Array.isArray(d.past) ? d.past : []).map(readVote).filter((v): v is GotmVote => !!v),
  };
}

/** "v Page Rovers · 23' · Sun 20 Sep" (the parts we know). */
export function goalLine(c: Pick<GotmCandidate, 'opponent' | 'minute' | 'date'>): string {
  const d = c.date ? new Date(`${c.date.slice(0, 10)}T12:00:00Z`) : null;
  const when = d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }) : '';
  return [c.opponent ? `v ${c.opponent}` : '', c.minute !== null ? `${c.minute}'` : '', when].filter(Boolean).join(' · ');
}

export function votesText(n: number): string {
  return `${n} vote${n === 1 ? '' : 's'}`;
}

/** "Pat Player" or "Pat Player & Sam Smith" for a closed vote. */
export function winnerNames(vote: GotmVote): string {
  return vote.candidates.filter((c) => vote.winners.includes(c.id)).map((c) => c.playerName).join(' & ');
}

/** What can be played: the match clip in the app, else the link staff added, else nothing. */
export function watchable(c: Pick<GotmCandidate, 'clip' | 'videoUrl'>): 'clip' | 'link' | null {
  if (c.clip) return 'clip';
  return c.videoUrl ? 'link' : null;
}

/** Total votes, when the counts are shown. */
export function totalVotes(vote: GotmVote): number | null {
  if (vote.candidates.some((c) => c.votes === null)) return null;
  return vote.candidates.reduce((sum, c) => sum + (c.votes ?? 0), 0);
}
