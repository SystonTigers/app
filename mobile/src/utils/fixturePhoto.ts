/** Helpers for fixtures read from a photo. No react-native imports (tested in Node). */

export type Competition = 'League' | 'Cup' | 'Friendly';

export interface PhotoFixtureLike {
  date: string;
  time: string | null;
  home: string;
  away: string;
  venue: string | null;
  competition: string | null;
  us: 'home' | 'away' | null;
}

export interface FixtureForm {
  opponent: string;
  date: string;
  time: string;
  venue: string;
  competition: Competition;
  homeAway: 'home' | 'away';
}

/** The app's three competition types from whatever the picture called it. */
export function competitionChoice(text: string | null | undefined): Competition {
  const t = (text ?? '').toLowerCase();
  if (/friendl/.test(t)) return 'Friendly';
  if (/\bcup\b|trophy|shield|plate|vase|bowl|knock ?out/.test(t)) return 'Cup';
  return 'League';
}

/** The add-fixture form filled from one fixture, with our side chosen. */
export function formFromPhoto(f: PhotoFixtureLike, us: 'home' | 'away'): FixtureForm {
  return {
    opponent: us === 'home' ? f.away : f.home,
    date: f.date,
    time: f.time ?? '',
    venue: f.venue ?? '',
    competition: competitionChoice(f.competition),
    homeAway: us,
  };
}

/** Max longest side for the picture we send: plenty for reading text, quick to upload. */
export const MAX_PHOTO_SIDE = 1600;

/** The size to shrink a picture to, keeping its shape. */
export function fitWithin(width: number, height: number, max = MAX_PHOTO_SIDE): { width: number; height: number } {
  if (width <= max && height <= max) return { width, height };
  const scale = max / Math.max(width, height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}
