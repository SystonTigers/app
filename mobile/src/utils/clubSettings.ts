/**
 * Club settings: labels and small pure helpers shared by the Club Settings
 * cards. The lists match the server (services/social/content.ts POST_KINDS,
 * services/faFullTime.ts) and the website's settings page.
 */

export type NameStyle = 'full' | 'first_initial' | 'initial_last' | 'first' | 'last';
export type PostKind =
  | 'lineup' | 'goal' | 'opp_goal' | 'kick_off' | 'half_time' | 'second_half' | 'full_time' | 'yellow' | 'red' | 'sub' | 'motm' | 'correction'
  | 'countdown' | 'matchday' | 'fixtures' | 'results' | 'table' | 'postponed' | 'birthday' | 'player_of_week' | 'player_of_month' | 'milestone' | 'throwback' | 'quote'
  | 'month_fixtures' | 'month_results' | 'stats_roundup' | 'gotm';
export type PostWhere = 'feed' | 'social';
export type PostEvents = Record<PostKind, Record<PostWhere, boolean>>;
export type SnippetKind = 'table' | 'fixtures' | 'results' | 'team';

export const MATCH_POSTS: Array<[PostKind, string]> = [
  ['lineup', 'Team news (line-up)'],
  ['kick_off', 'Kick-off'],
  ['goal', 'Our goals'],
  ['opp_goal', 'Opposition goals'],
  ['yellow', 'Yellow cards'],
  ['red', 'Red cards'],
  ['sub', 'Substitutions'],
  ['half_time', 'Half time'],
  ['second_half', 'Second half'],
  ['full_time', 'Full time'],
  ['motm', 'Man of the Match'],
  ['correction', 'Corrections (an update undone after it went out)'],
];

/** Posted on a schedule (UK time). */
export const CLUB_POSTS: Array<[PostKind, string]> = [
  ['countdown', '3 days to go (6pm, 3 days before)'],
  ['matchday', 'Match day (8am)'],
  ['postponed', 'Game postponed (when you mark it)'],
  ['fixtures', "This week's fixtures (Monday 6pm)"],
  ['results', "This week's results (Sunday 7pm)"],
  ['table', 'League table (Monday 12pm)'],
  ['player_of_week', 'Player of the week (Monday 7pm)'],
  ['player_of_month', 'Player of the month (1st of the month)'],
  ['month_results', "Last month's results (1st, 11am)"],
  ['stats_roundup', 'Top scorers so far this season (1st, 12pm)'],
  ['month_fixtures', "This month's fixtures (1st, 5pm)"],
  ['gotm', 'Goal of the Month winner (when staff close the vote)'],
  ['milestone', 'Milestones: 10, 25, 50... apps or goals (7pm)'],
  ['birthday', 'Player birthdays (8am, no age shown)'],
  ['throwback', 'Throwback Thursday photo (6pm)'],
  ['quote', 'Quote of the week (Wednesday 12pm)'],
];

export const NAME_STYLES: Array<[NameStyle, string]> = [
  ['first_initial', 'Sam S.'],
  ['initial_last', 'S. Smith'],
  ['full', 'Sam Smith'],
  ['first', 'Sam'],
  ['last', 'Smith'],
];

/** The FA's snippet types, in the order Full-Time lists them. */
export const SNIPPETS: Array<{ kind: SnippetKind; faType: string; label: string; shows: string }> = [
  { kind: 'table', faType: 'Division - Table', label: 'League table', shows: 'the League Table screen' },
  { kind: 'fixtures', faType: 'Division - Upcoming Fixtures', label: 'League fixtures', shows: '"Around the League" under Fixtures' },
  { kind: 'results', faType: 'Division - Recent Results', label: 'League results', shows: '"Around the League" under Results' },
  { kind: 'team', faType: 'Team - Fixtures / Results', label: 'Our fixtures & results', shows: "Fixtures and Results until you've added your own" },
];

export const EMAIL_OUTCOMES: Record<string, string> = {
  imported: 'Read',
  nothing_found: 'No fixture found in it',
  not_fa: 'Not from FA Full-Time (ignored)',
  gmail_confirmation: 'Gmail forwarding confirmation',
  failed: 'Something went wrong',
};

/** The same matrix with one box changed. */
export function toggleEvent(events: PostEvents, kind: PostKind, where: PostWhere, on: boolean): PostEvents {
  return { ...events, [kind]: { ...events[kind], [where]: on } };
}

/** Kinds whose boxes differ between two versions (what Save will change). */
export function changedKinds(saved: PostEvents, draft: PostEvents): PostKind[] {
  return (Object.keys(draft) as PostKind[]).filter((k) => saved[k]?.feed !== draft[k]?.feed || saved[k]?.social !== draft[k]?.social);
}

/** Badges and logos: graphics can draw PNG and JPG up to 3 MB (the server checks again). */
export const MAX_BADGE_BYTES = 3 * 1024 * 1024;

/** Why a picked picture can't be used, or null if it's fine. Unknown type/size are left to the server. */
export function imageProblem(file: { mimeType?: string | null; fileSize?: number | null }, maxBytes = MAX_BADGE_BYTES): string | null {
  const type = (file.mimeType || '').toLowerCase();
  if (type && type !== 'image/png' && type !== 'image/jpeg' && type !== 'image/jpg') {
    return 'Please choose a PNG or JPG. A PNG with a see-through background looks best.';
  }
  if (file.fileSize && file.fileSize > maxBytes) {
    return `That picture is too big. Please use one under ${Math.round(maxBytes / 1024 / 1024)} MB.`;
  }
  return null;
}

/** "Sat 4 Oct, 09:15" for the recent emails list. */
export function receivedLabel(ms: number): string {
  return new Date(ms).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** What an FA email did, for the recent emails list. */
export function emailOutcome(row: { outcome: string; added: number | null; updated: number | null }): string {
  const base = EMAIL_OUTCOMES[row.outcome] ?? row.outcome;
  return row.outcome === 'imported' ? `${base}: ${row.added ?? 0} added, ${row.updated ?? 0} updated` : base;
}
