/**
 * Goal of the Month on the website (staff run the vote on Admin → Goal of
 * the Month; members vote in the app). Shapes match backend services/gotm.
 */
import { formatShortDate } from './format';

export const MIN_GOALS = 2;
export const MAX_GOALS = 10;

/** A goal from the month, from Match Centre or a match report. */
export interface GoalOption {
  eventId: string;
  playerId: string;
  playerName: string;
  fixtureId: string;
  opponent: string;
  date: string;
  minute: number | null;
  hasClip: boolean;
}

export interface Candidate {
  id: string;
  playerId: string;
  playerName: string;
  opponent: string | null;
  date: string | null;
  minute: number | null;
  description: string | null;
  videoUrl: string | null;
  votes: number | null;
  clip: { watchUrl: string } | null;
}

export interface Vote {
  id: string;
  label: string;
  status: 'open' | 'closed';
  candidates: Candidate[];
  myVote: string | null;
  winners: string[];
}

export interface GotmData {
  vote: Vote | null;
  past: Vote[];
}

/** A goal typed in by staff (not recorded in Match Centre or a report). */
export interface ManualGoal {
  playerId: string;
  description: string;
  videoUrl: string;
}

/** Last month as "YYYY-MM" (votes usually run in the first days of the next month). */
export function previousMonth(now: Date = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** "v Page Rovers · 23' · Sun 20 Sept" */
export function goalSummary(g: { opponent: string | null; minute: number | null; date: string | null }): string {
  return [g.opponent ? `v ${g.opponent}` : '', g.minute !== null ? `${g.minute}'` : '', g.date ? formatShortDate(g.date) : ''].filter(Boolean).join(' · ');
}

/** The body for POST /api/v1/gotm/start. */
export function newVoteBody(month: string, picked: GoalOption[], manual: ManualGoal[]) {
  return {
    month,
    goals: [
      ...picked.map((g) => ({ eventId: g.eventId, playerId: g.playerId, fixtureId: g.fixtureId })),
      ...manual.map((g) => ({ playerId: g.playerId, description: g.description.trim(), videoUrl: g.videoUrl.trim() || undefined })),
    ],
  };
}

/** Why the vote can't open yet, or null. */
export function newVoteProblem(month: string, count: number): string | null {
  if (!/^\d{4}-\d{2}$/.test(month)) return 'Choose the month the goals were scored in.';
  if (count < MIN_GOALS) return `Pick at least ${MIN_GOALS} goals so there's something to vote on.`;
  if (count > MAX_GOALS) return `Pick up to ${MAX_GOALS} goals.`;
  return null;
}

export function votesText(n: number): string {
  return `${n} vote${n === 1 ? '' : 's'}`;
}
