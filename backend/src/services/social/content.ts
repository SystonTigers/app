/**
 * What gets posted for each match event: which places it goes (club app feed,
 * social media) and the caption and graphic contents. Pure functions.
 */
import { publicName, type PublicNamePolicy } from "../publicNames";

export const POST_KINDS = [
  "lineup", "goal", "opp_goal", "kick_off", "half_time", "second_half", "full_time", "yellow", "red", "sub", "motm",
] as const;
export type PostKind = (typeof POST_KINDS)[number];

export interface KindSetting { feed: boolean; social: boolean }
export type EventSettings = Record<PostKind, KindSetting>;

/** Line-ups, goals, half time, full time and MOTM go everywhere; the rest only to the club app. */
export const DEFAULT_EVENT_SETTINGS: EventSettings = {
  lineup: { feed: true, social: true },
  goal: { feed: true, social: true },
  opp_goal: { feed: true, social: false },
  kick_off: { feed: true, social: false },
  half_time: { feed: true, social: true },
  second_half: { feed: false, social: false },
  full_time: { feed: true, social: true },
  yellow: { feed: true, social: false },
  red: { feed: true, social: false },
  sub: { feed: true, social: false },
  motm: { feed: true, social: true },
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
  clubName: string;
  opponent: string;
  homeAway: "home" | "away";
  ourScore: number;
  theirScore: number;
  competition: string | null;
  badgeUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
}

export interface PostPerson { name: string; photoUrl: string | null }

export interface PostInput {
  kind: PostKind;
  minute: number | null;
  player?: PostPerson | null;   // scorer, booked player, player coming on, MOTM winner
  player2?: PostPerson | null;  // assist, player going off, joint MOTM winner
  scorers?: string[];           // full time: our scorers (full names, in order)
  lineup?: { starters: LineupPerson[]; subs: LineupPerson[]; teamSize: number; kickOff: string | null; venue: string | null };
}

export interface LineupPerson { name: string; number: number | null }

/** What the app draws on the graphic. Names are already in the club's chosen style. */
export interface GraphicSpec {
  kind: PostKind;
  headline: string;
  playerName: string | null;
  secondary: string | null;
  minute: number | null;
  photoUrl: string | null;
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
  clubName: string;
  competition: string | null;
  badgeUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  /** Line-up posts: the starting players and subs, names in the club's style */
  players?: Array<{ number: number | null; name: string }>;
  subs?: string[];
}

const HEADLINES: Record<PostKind, string> = {
  lineup: "STARTING LINE-UP", goal: "GOAL!", opp_goal: "GOAL", kick_off: "KICK-OFF", half_time: "HALF TIME", second_half: "SECOND HALF",
  full_time: "FULL TIME", yellow: "YELLOW CARD", red: "RED CARD", sub: "SUBSTITUTION", motm: "MAN OF THE MATCH",
};

function scoreline(m: MatchContext): { home: string; away: string; homeScore: number; awayScore: number } {
  return m.homeAway === "home"
    ? { home: m.clubName, away: m.opponent, homeScore: m.ourScore, awayScore: m.theirScore }
    : { home: m.opponent, away: m.clubName, homeScore: m.theirScore, awayScore: m.ourScore };
}

/** "Sam S. 2, Ben J." from full names, in the club's name style. */
export function scorerSummary(policy: PublicNamePolicy, scorers: string[]): string {
  const counts = new Map<string, number>();
  for (const s of scorers) counts.set(s, (counts.get(s) ?? 0) + 1);
  return [...counts].map(([name, n]) => `${publicName(policy, name)}${n > 1 ? ` ${n}` : ""}`).join(", ");
}

export function buildPost(policy: PublicNamePolicy, match: MatchContext, input: PostInput): { caption: string; graphic: GraphicSpec } {
  const s = scoreline(match);
  const score = `${s.home} ${s.homeScore}–${s.awayScore} ${s.away}`;
  const name = input.player ? publicName(policy, input.player.name) : null;
  const name2 = input.player2 ? publicName(policy, input.player2.name) : null;
  const at = input.minute !== null ? ` ${input.minute}'` : "";

  let caption: string;
  let secondary: string | null = null;
  let players: GraphicSpec["players"];
  let subs: string[] | undefined;
  switch (input.kind) {
    case "lineup": {
      const l = input.lineup ?? { starters: [], subs: [], teamSize: 11, kickOff: null, venue: null };
      players = l.starters.map((p) => ({ number: p.number, name: publicName(policy, p.name) }));
      subs = l.subs.map((p) => publicName(policy, p.name));
      secondary = [l.kickOff ? `Kick-off ${l.kickOff}` : null, l.venue].filter(Boolean).join(" · ") || null;
      const list = players.map((p) => `${p.number ?? "-"} ${p.name}`).join("\n");
      caption = `📋 Team news: here's our starting ${l.teamSize} v ${match.opponent}${secondary ? ` (${secondary})` : ""}\n\n${list}${subs.length ? `\n\nSubs: ${subs.join(", ")}` : ""}`;
      break;
    }
    case "goal":
      secondary = name2 ? `Assist: ${name2}` : null;
      caption = `⚽ GOAL! ${name ?? match.clubName}${at}${name2 ? ` (assist ${name2})` : ""}\n${score}`;
      break;
    case "opp_goal":
      caption = `${match.opponent} score${at}.\n${score}`;
      break;
    case "kick_off":
      caption = `We're under way! ${s.home} v ${s.away}${match.competition ? ` (${match.competition})` : ""}`;
      break;
    case "half_time":
      caption = `Half time: ${score}`;
      break;
    case "second_half":
      caption = `Second half under way. ${score}`;
      break;
    case "full_time": {
      const scorers = input.scorers?.length ? scorerSummary(policy, input.scorers) : "";
      secondary = scorers ? `⚽ ${scorers}` : null;
      caption = `Full time: ${score}${scorers ? `\n⚽ ${scorers}` : ""}`;
      break;
    }
    case "yellow":
      caption = `🟨 Yellow card: ${name ?? ""}${at}`;
      break;
    case "red":
      caption = `🟥 Red card: ${name ?? ""}${at}`;
      break;
    case "sub":
      secondary = name2 ? `On for ${name2}` : null;
      caption = `🔁 Substitution${at}: ${name ?? ""} on${name2 ? ` for ${name2}` : ""}`;
      break;
    case "motm": {
      const who = [name, name2].filter(Boolean).join(" & ");
      secondary = `vs ${match.opponent}`;
      caption = `⭐ Man of the Match: ${who} vs ${match.opponent}. Voted for by our players and parents.`;
      break;
    }
  }

  const showPhoto = policy.photos && ["goal", "yellow", "red", "sub", "motm"].includes(input.kind);
  return {
    caption,
    graphic: {
      kind: input.kind,
      headline: HEADLINES[input.kind],
      playerName: input.kind === "motm" ? [name, name2].filter(Boolean).join(" & ") || null : name,
      secondary,
      minute: input.minute,
      photoUrl: showPhoto ? input.player?.photoUrl ?? null : null,
      homeName: s.home,
      awayName: s.away,
      homeScore: s.homeScore,
      awayScore: s.awayScore,
      clubName: match.clubName,
      competition: match.competition,
      badgeUrl: match.badgeUrl,
      primaryColor: match.primaryColor || "#00E5E5",
      secondaryColor: match.secondaryColor || "#0B0D0F",
      ...(players ? { players, subs } : {}),
    },
  };
}
