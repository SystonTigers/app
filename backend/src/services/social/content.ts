/**
 * What gets posted for each match event: which places it goes (club app feed,
 * social media), the caption and what the graphic shows. Pure functions.
 */
import { publicName, type PublicNamePolicy } from "../publicNames";
import type { Brand, Graphic, TeamSide } from "../graphics/types";

/** Match events posted live, then scheduled club posts. */
export const MATCH_KINDS = [
  "lineup", "goal", "opp_goal", "kick_off", "half_time", "second_half", "full_time", "yellow", "red", "sub", "motm",
] as const;
export const SCHEDULED_KINDS = [
  "countdown", "matchday", "fixtures", "results", "table", "postponed", "birthday", "player_of_week", "player_of_month", "milestone", "throwback", "quote",
] as const;
export const POST_KINDS = [...MATCH_KINDS, ...SCHEDULED_KINDS] as const;
export type PostKind = (typeof POST_KINDS)[number];
export type MatchKind = (typeof MATCH_KINDS)[number];

export interface KindSetting { feed: boolean; social: boolean }
export type EventSettings = Record<PostKind, KindSetting>;

const BOTH = { feed: true, social: true };
const APP_ONLY = { feed: true, social: false };

/**
 * Line-ups, goals, half/full time, MOTM and the weekly club posts go
 * everywhere; minor match events, birthdays, throwback photos and quotes only
 * to the club app.
 */
export const DEFAULT_EVENT_SETTINGS: EventSettings = {
  lineup: BOTH, goal: BOTH, opp_goal: APP_ONLY, kick_off: APP_ONLY, half_time: BOTH, second_half: { feed: false, social: false },
  full_time: BOTH, yellow: APP_ONLY, red: APP_ONLY, sub: APP_ONLY, motm: BOTH,
  countdown: BOTH, matchday: BOTH, fixtures: BOTH, results: BOTH, table: BOTH, postponed: BOTH,
  birthday: APP_ONLY, player_of_week: BOTH, player_of_month: BOTH, milestone: BOTH, throwback: APP_ONLY, quote: APP_ONLY,
};

export function isPostKind(value: unknown): value is PostKind {
  return typeof value === "string" && (POST_KINDS as readonly string[]).includes(value);
}

/** Merge a club's saved choices (JSON) over the defaults, ignoring anything unrecognised. */
export function parseEventSettings(raw: string | null | undefined): EventSettings {
  const settings: EventSettings = JSON.parse(JSON.stringify(DEFAULT_EVENT_SETTINGS));
  if (!raw) return settings;
  try {
    const saved = JSON.parse(raw) as Record<string, Partial<KindSetting>>;
    for (const kind of POST_KINDS) {
      const s = saved?.[kind];
      if (s && typeof s === "object") {
        if (typeof s.feed === "boolean") settings[kind].feed = s.feed;
        if (typeof s.social === "boolean") settings[kind].social = s.social;
      }
    }
  } catch {
    // Unreadable settings: fall back to the defaults
  }
  return settings;
}

export interface MatchContext {
  brand: Brand;
  opponent: string;
  opponentBadgeUrl: string | null;
  homeAway: "home" | "away";
  ourScore: number;
  theirScore: number;
  competition: string | null;
  /** Display date, e.g. "SAT 4 OCT" */
  date: string | null;
  time: string | null;
  venue: string | null;
}

export interface PostPerson { name: string; photoUrl: string | null }
export interface LineupPerson { name: string; number: number | null }

export interface PostInput {
  kind: MatchKind;
  minute: number | null;
  player?: PostPerson | null;   // scorer, booked player, player coming on, MOTM winner
  player2?: PostPerson | null;  // assist, player going off, joint MOTM winner
  /** Half/full time: our goals so far (full names), in order */
  scorers?: Array<{ name: string; minute: number | null }>;
  goalNumber?: number;          // goals: this scorer's goals so far this match, counting this one (2 = brace, 3 = hat-trick)
  lineup?: { starters: LineupPerson[]; subs: LineupPerson[]; teamSize: number; kickOff: string | null; venue: string | null };
}

const COUNT_WORDS = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN"];

/** Headline and caption lead for a scorer's nth goal of the match. */
export function goalMilestone(n: number): { headline: string; lead: string } {
  if (n >= 4) return { headline: `${COUNT_WORDS[n] ?? n} GOALS!`, lead: `🔥 ${COUNT_WORDS[n] ?? n} GOALS!` };
  if (n === 3) return { headline: "HAT-TRICK!", lead: "🎩 HAT-TRICK!" };
  if (n === 2) return { headline: "BRACE!", lead: "⚽⚽ BRACE!" };
  return { headline: "GOAL!", lead: "⚽ GOAL!" };
}

/** "SAT 4 OCT" from "2026-10-04" (null if unreadable). */
export function displayDate(iso: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const day = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][d.getUTCDay()];
  const month = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][d.getUTCMonth()];
  return `${day} ${d.getUTCDate()} ${month}`;
}

/** "Sam S. 2, Will J." from full names, in the club's name style. */
export function scorerSummary(policy: PublicNamePolicy, scorers: string[]): string {
  const counts = new Map<string, number>();
  for (const s of scorers) counts.set(s, (counts.get(s) ?? 0) + 1);
  return [...counts].map(([name, n]) => `${publicName(policy, name)}${n === 3 ? " (hat-trick)" : n > 1 ? ` ${n}` : ""}`).join(", ");
}

/** Graphic lines per scorer with their minutes: "SAM S. 23', 41'". */
export function scorerLines(policy: PublicNamePolicy, scorers: Array<{ name: string; minute: number | null }>): string[] {
  const byName = new Map<string, Array<number | null>>();
  for (const s of scorers) byName.set(s.name, [...(byName.get(s.name) ?? []), s.minute]);
  return [...byName].map(([name, minutes]) => {
    const times = minutes.filter((m): m is number => m !== null).map((m) => `${m}'`).join(", ");
    return `${publicName(policy, name)}${times ? ` ${times}` : ""}`;
  });
}

const HEADLINES: Record<MatchKind, string> = {
  lineup: "STARTING XI", goal: "GOAL!", opp_goal: "GOAL", kick_off: "KICK OFF", half_time: "HALF TIME", second_half: "SECOND HALF",
  full_time: "FULL TIME", yellow: "YELLOW CARD", red: "RED CARD", sub: "SUBSTITUTION", motm: "MAN OF THE MATCH",
};

function sides(m: MatchContext, ourScorers: string[] = []): { home: TeamSide; away: TeamSide } {
  const us: TeamSide = { name: m.brand.clubName, badgeUrl: m.brand.badgeUrl, score: m.ourScore, scorers: ourScorers, isUs: true };
  const them: TeamSide = { name: m.opponent, badgeUrl: m.opponentBadgeUrl, score: m.theirScore, scorers: [], isUs: false };
  return m.homeAway === "home" ? { home: us, away: them } : { home: them, away: us };
}

export function buildPost(policy: PublicNamePolicy, match: MatchContext, input: PostInput): { caption: string; graphic: Graphic } {
  const { home, away } = sides(match);
  const score = `${home.name} ${home.score}–${away.score} ${away.name}`;
  const name = input.player ? publicName(policy, input.player.name) : null;
  const name2 = input.player2 ? publicName(policy, input.player2.name) : null;
  const at = input.minute !== null ? ` ${input.minute}'` : "";
  const photo = (p: PostPerson | null | undefined) => (policy.photos ? p?.photoUrl ?? null : null);
  const base = { v: 2 as const, kind: input.kind, brand: match.brand, footer: match.competition };
  const moment = { ...base, layout: "moment" as const, minute: input.minute, home, away };

  switch (input.kind) {
    case "lineup": {
      const l = input.lineup ?? { starters: [], subs: [], teamSize: 11, kickOff: null, venue: null };
      const players = l.starters.map((p) => ({ number: p.number, name: publicName(policy, p.name) }));
      const subs = l.subs.map((p) => publicName(policy, p.name));
      const when = [l.kickOff ? `Kick-off ${l.kickOff}` : null, l.venue].filter(Boolean).join(" · ");
      const list = players.map((p) => `${p.number ?? "-"} ${p.name}`).join("\n");
      return {
        caption: `📋 Team news: here's our starting ${l.teamSize} v ${match.opponent}${when ? ` (${when})` : ""}\n\n${list}${subs.length ? `\n\nSubs: ${subs.join(", ")}` : ""}`,
        graphic: { ...base, layout: "lineup", headline: l.teamSize === 11 ? "STARTING XI" : `STARTING ${l.teamSize}`, players, subs, home, away, date: match.date, time: l.kickOff ?? match.time, venue: l.venue ?? match.venue },
      };
    }
    case "goal": {
      const goalCount = name && (input.goalNumber ?? 1) > 1 ? Math.floor(input.goalNumber ?? 1) : undefined;
      const milestone = goalMilestone(goalCount ?? 1);
      return {
        caption: `${milestone.lead} ${name ?? match.brand.clubName}${at}${name2 ? ` (assist ${name2})` : ""}${goalCount ? ` – ${goalCount} goals today!` : ""}\n${score}`,
        graphic: { ...moment, headline: milestone.headline, playerName: name, secondary: name2 ? `Assist: ${name2}` : null, photoUrl: photo(input.player), ...(goalCount ? { goalCount } : {}) },
      };
    }
    case "opp_goal":
      return {
        caption: `${match.opponent} score${at}.\n${score}`,
        graphic: { ...moment, headline: HEADLINES.opp_goal, playerName: match.opponent, secondary: null, photoUrl: null },
      };
    case "yellow":
    case "red":
      return {
        caption: `${input.kind === "yellow" ? "🟨 Yellow" : "🟥 Red"} card: ${name ?? ""}${at}`,
        graphic: { ...moment, headline: HEADLINES[input.kind], playerName: name, secondary: null, photoUrl: photo(input.player), card: input.kind },
      };
    case "sub":
      return {
        caption: `🔁 Substitution${at}: ${name ?? ""} on${name2 ? ` for ${name2}` : ""}`,
        graphic: { ...moment, headline: HEADLINES.sub, playerName: name, secondary: name2 ? `On for ${name2}` : null, photoUrl: photo(input.player) },
      };
    case "kick_off":
      return {
        caption: `We're under way! ${home.name} v ${away.name}${match.competition ? ` (${match.competition})` : ""}`,
        graphic: { ...base, layout: "score", headline: HEADLINES.kick_off, home, away, minute: null, showScore: false, detail: match.venue ? `Under way at ${match.venue}` : "We're under way" },
      };
    case "second_half":
      return {
        caption: `Second half under way. ${score}`,
        graphic: { ...base, layout: "score", headline: HEADLINES.second_half, home, away, minute: input.minute, showScore: true, detail: "Under way" },
      };
    case "half_time":
    case "full_time": {
      const scorers = input.scorers ?? [];
      const lines = scorerLines(policy, scorers);
      const withScorers = sides(match, lines);
      const summary = scorers.length ? scorerSummary(policy, scorers.map((s) => s.name)) : "";
      const lead = input.kind === "half_time" ? "Half time" : "Full time";
      return {
        caption: `${lead}: ${score}${summary ? `\n⚽ ${summary}` : ""}`,
        graphic: { ...base, layout: "score", headline: HEADLINES[input.kind], home: withScorers.home, away: withScorers.away, minute: input.kind === "half_time" ? input.minute : null, showScore: true, detail: null },
      };
    }
    case "motm": {
      const who = [name, name2].filter(Boolean).join(" & ");
      return {
        caption: `⭐ Man of the Match: ${who} vs ${match.opponent}. Voted for by our players and parents.`,
        graphic: { ...base, layout: "person", headline: HEADLINES.motm, playerName: who || match.brand.clubName, photoUrl: name2 ? null : photo(input.player), stat: null, secondary: `vs ${match.opponent} · voted by parents & players` },
      };
    }
  }
}
