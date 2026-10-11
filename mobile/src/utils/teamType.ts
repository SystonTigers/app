/**
 * Junior or adult team (backend tenants.team_type, migration 0036). Words
 * that change with the team type live here so screens stay consistent.
 * No react-native imports (tested by test/teamType.test.js).
 */

export type TeamType = 'junior' | 'adult';

export const TEAM_TYPES: Array<{ value: TeamType; label: string; short: string; means: string[] }> = [
  {
    value: 'junior',
    label: 'Junior team',
    short: 'Under-18s. Parents answer for their children.',
    means: [
      "Photos and clips are only used once a parent says yes.",
      'Parents link to their child and answer availability and consent.',
      'Kick-off times and grounds are only shown to the club\'s members.',
      'Posts use initials (J. Smith) unless you change it.',
    ],
  },
  {
    value: 'adult',
    label: 'Adult team',
    short: 'Open age. Players answer for themselves.',
    means: [
      "Photos and clips are used unless a player says no in the app.",
      'Players link to their own page and answer availability themselves.',
      'Fixtures, kick-off times and grounds are public on the club page.',
      'Posts use full names unless you change it.',
    ],
  },
];

/** "your child" / "you": who a consent or availability question is about. */
export function aboutWho(adult: boolean, name?: string | null): string {
  if (adult) return 'you';
  return name ? name.split(/\s+/)[0] : 'your child';
}

/** The consent answer to show: adults' unanswered counts as yes. */
export function consentShown(answer: boolean | null, adult: boolean): boolean | null {
  if (answer === null && adult) return true;
  return answer;
}
