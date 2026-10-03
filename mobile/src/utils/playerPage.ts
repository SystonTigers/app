/**
 * Player pages (GET /api/v1/players/:id/profile). No react-native imports
 * (node test/playerPage.test.js).
 */

export interface StatLine {
  appearances: number;
  goals: number;
  assists: number;
  motm: number;
  yellowCards: number;
  redCards: number;
}

export interface SeasonLine extends StatLine {
  id: string;
  label: string;
  current: boolean;
}

export interface GoalClip {
  id: string;
  fixtureId: string;
  opponent: string;
  date: string;
  minute: number | null;
  title: string;
  detail: string | null;
  videoId: string;
  start: number;
  end: number;
  embeddable: boolean;
  watchUrl: string;
}

export interface PlayerProfile {
  player: { id: string; name: string; firstName: string; number: number | null; position: string | null; photo: string | null };
  bio: string | null;
  bioUpdatedAt: number | null;
  canEditBio: boolean;
  canRemoveBio: boolean;
  career: StatLine;
  seasons: SeasonLine[];
  photos: Array<{ id: string; url: string; type: string }>;
  clips: GoalClip[];
  hidden: { photos: boolean; clips: boolean };
}

export interface MyPlayer {
  id: string;
  name: string;
  isMe: boolean;
  hasBio: boolean;
}

export const MAX_BIO = 400;

/** The big numbers at the top of the page. */
export function careerTiles(c: StatLine): Array<{ label: string; value: number }> {
  return [
    { label: 'APPS', value: c.appearances },
    { label: 'GOALS', value: c.goals },
    { label: 'ASSISTS', value: c.assists },
    { label: 'MOTM', value: c.motm },
  ];
}

/** "2 yellow, 1 red" or null when clean. */
export function cardsText(s: Pick<StatLine, 'yellowCards' | 'redCards'>): string | null {
  const parts = [s.yellowCards ? `${s.yellowCards} yellow` : '', s.redCards ? `${s.redCards} red` : ''].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

/** "Goal v Page Rovers · 4'" with the date as "Sun 20 Sep". */
export function clipLabel(clip: Pick<GoalClip, 'opponent' | 'minute' | 'date'>): { title: string; when: string } {
  const d = new Date(`${clip.date.slice(0, 10)}T12:00:00Z`);
  const when = Number.isNaN(d.getTime()) ? clip.date : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return { title: `Goal v ${clip.opponent}${clip.minute !== null ? ` · ${clip.minute}'` : ''}`, when };
}

/** The next clip to play after `i` (-1 when finished). */
export function nextGoal(clips: GoalClip[], i: number): number {
  return i + 1 < clips.length ? i + 1 : -1;
}

/** Quick checks before saving (the server checks properly). */
export function bioProblem(text: string): string | null {
  if (text.trim().length > MAX_BIO) return `Keep it under ${MAX_BIO} characters.`;
  if (/https?:\/\/|www\.|[\w.+-]+@[\w-]+\.|(^|\s)@[\w.]{2,}|(\+?\d[\s-]?){9,}/i.test(text)) {
    return "To keep everyone safe, bios can't include links, email addresses, phone numbers or social media names.";
  }
  return null;
}

/** "Sam Smith" → "SS" */
export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
}
