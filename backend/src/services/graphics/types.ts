/**
 * What a post's graphic shows. The server builds one of these (names already
 * in the club's chosen style) and a design pack turns it into an image.
 */

export const GRAPHIC_WIDTH = 1080;
export const GRAPHIC_HEIGHT = 1350;

export interface Brand {
  clubName: string;
  primaryColor: string;
  secondaryColor: string;
  badgeUrl: string | null;
  sponsorName: string | null;
  sponsorLogoUrl: string | null;
}

export interface TeamSide {
  name: string;
  badgeUrl: string | null;
  score: number | null;
  /** Our scorers with minutes, e.g. "SAM S. 23', 41'" (opponents' aren't recorded) */
  scorers: string[];
  /** True for the club posting */
  isUs: boolean;
}

interface Base {
  v: 2;
  /** Which kind of post (goal, full_time, fixtures...) */
  kind: string;
  headline: string;
  brand: Brand;
  /** Competition or short context line shown small at the bottom */
  footer: string | null;
}

/** A moment in a match: goal, card, substitution. */
export interface MomentGraphic extends Base {
  layout: "moment";
  playerName: string | null;
  secondary: string | null;
  minute: number | null;
  photoUrl: string | null;
  home: TeamSide;
  away: TeamSide;
  /** Goals: the scorer's goals so far this match when 2 or more */
  goalCount?: number;
  /** Colour accent for cards: "yellow" | "red" */
  card?: "yellow" | "red";
}

/** Kick-off, half time, second half, full time: both teams and the score. */
export interface ScoreGraphic extends Base {
  layout: "score";
  home: TeamSide;
  away: TeamSide;
  minute: number | null;
  showScore: boolean;
  detail: string | null;
}

/** Countdown, match day, postponed: the fixture details. */
export interface FixtureGraphic extends Base {
  layout: "fixture";
  home: TeamSide;
  away: TeamSide;
  date: string;
  time: string | null;
  venue: string | null;
  /** Line under the headline, e.g. "NEW DATE TO BE CONFIRMED" */
  tagline: string | null;
  /** Countdown posts: days to go, drawn as a giant number */
  countdown: number | null;
}

export interface LineupGraphic extends Base {
  layout: "lineup";
  players: Array<{ number: number | null; name: string }>;
  subs: string[];
  home: TeamSide;
  away: TeamSide;
  date: string | null;
  time: string | null;
  venue: string | null;
}

export interface ListRow {
  date: string;
  home: string;
  away: string;
  homeBadgeUrl: string | null;
  awayBadgeUrl: string | null;
  /** Results */
  homeScore: number | null;
  awayScore: number | null;
  outcome: "W" | "D" | "L" | null;
  /** Fixtures */
  time: string | null;
  venue: string | null;
}

/** This week's fixtures or results. */
export interface ListGraphic extends Base {
  layout: "list";
  /** e.g. "MON 29 SEP – SUN 5 OCT" */
  subtitle: string | null;
  rows: ListRow[];
  mode: "fixtures" | "results";
}

export interface TableRow {
  position: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalDifference: number;
  points: number;
  isUs: boolean;
}

export interface TableGraphic extends Base {
  layout: "table";
  competition: string;
  rows: TableRow[];
}

/** One player: birthday, player of the week/month, milestone, Man of the Match. */
export interface PersonGraphic extends Base {
  layout: "person";
  playerName: string;
  photoUrl: string | null;
  /** Big stat line, e.g. "50 APPEARANCES" or "5 GOALS · 2 ASSISTS" */
  stat: string | null;
  secondary: string | null;
}

export interface QuoteGraphic extends Base {
  layout: "quote";
  text: string;
  author: string | null;
}

/** A photo post: throwback. */
export interface PhotoGraphic extends Base {
  layout: "photo";
  photoUrl: string | null;
  caption: string | null;
}

export type Graphic =
  | MomentGraphic
  | ScoreGraphic
  | FixtureGraphic
  | LineupGraphic
  | ListGraphic
  | TableGraphic
  | PersonGraphic
  | QuoteGraphic
  | PhotoGraphic;

export type GraphicLayout = Graphic["layout"];

/** Images the renderer has already fetched, keyed by URL (null = couldn't load). */
export type ImageMap = Map<string, string | null>;

/** Every image URL a graphic wants, so they can be fetched before drawing. */
export function imageUrls(g: Graphic): string[] {
  const urls: Array<string | null | undefined> = [g.brand.badgeUrl, g.brand.sponsorLogoUrl];
  if ("home" in g) urls.push(g.home.badgeUrl, g.away.badgeUrl);
  if ("photoUrl" in g) urls.push(g.photoUrl);
  if (g.layout === "list") g.rows.forEach((r) => urls.push(r.homeBadgeUrl, r.awayBadgeUrl));
  return [...new Set(urls.filter((u): u is string => typeof u === "string" && u.length > 0))];
}
