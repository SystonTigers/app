/** Man of the Match vote length. No react-native imports (tested in Node). */

/** Votes can stay open for up to 3 days */
export const MAX_VOTING_HOURS = 72;

/** Hours from the custom box ("5" hours or "2" days), or null unless it's 1 hour to 3 days. */
export function customHours(amount: string, unit: 'hours' | 'days'): number | null {
  const n = Number(amount.trim().replace(',', '.'));
  if (!amount.trim() || !Number.isFinite(n) || n <= 0) return null;
  const hours = Math.round((unit === 'days' ? n * 24 : n) * 4) / 4;
  return hours >= 1 && hours <= MAX_VOTING_HOURS ? hours : null;
}

/** "3 hours", "1 day", "2 days", "1.5 hours" */
export function lengthText(hours: number): string {
  if (hours % 24 === 0) return `${hours / 24} day${hours === 24 ? '' : 's'}`;
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}

/** The bits of an open vote the Home prompt needs (a MotmVote from GET /motm/open). */
export interface VoteForPrompt {
  matchId: string;
  votingOpen: boolean;
  closesAt: string | null;
  userVote: string | null;
  match: { opponent: string } | null;
}

/** "Closes in 2 hours", "Closes in 25 minutes", "Closes in 2 days" (null once it's closed or has no end) */
export function closesInText(closesAt: string | null, now: number): string | null {
  if (!closesAt) return null;
  const left = Date.parse(closesAt) - now;
  if (!Number.isFinite(left) || left <= 0) return null;
  const minutes = Math.ceil(left / 60000);
  if (minutes < 60) return `Closes in ${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `Closes in ${hours} hour${hours === 1 ? '' : 's'}`;
  return `Closes in ${Math.round(hours / 24)} days`;
}

/**
 * Home: the vote to ask about, the newest open one I haven't voted in yet
 * ("Who was best v Rovers? Closes in 2 hours"). Null when there's nothing to ask.
 */
export function votePrompt(open: VoteForPrompt[], now: number): { matchId: string; line: string } | null {
  const vote = open.find((v) => v.votingOpen && !v.userVote && (!v.closesAt || Date.parse(v.closesAt) > now));
  if (!vote) return null;
  const against = vote.match?.opponent ? ` v ${vote.match.opponent}` : '';
  const closes = closesInText(vote.closesAt, now);
  return { matchId: vote.matchId, line: `Who was best${against}?${closes ? ` ${closes}.` : ''}` };
}
