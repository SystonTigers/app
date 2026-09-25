/**
 * Captions and graphics for scheduled club posts: countdown, match day,
 * postponed, weekly fixtures and results, league table, birthdays, player of
 * the week/month, milestones, throwback and quotes. Pure functions.
 */
import { publicName, type PublicNamePolicy } from "../publicNames";
import type { Brand, Graphic, ListRow, TableRow, TeamSide } from "../graphics/types";
import { displayDate } from "./content";

export interface FixtureFacts {
  id: string;
  opponent: string;
  opponentBadgeUrl: string | null;
  homeAway: "home" | "away";
  date: string; // ISO yyyy-mm-dd
  time: string | null;
  venue: string | null;
  competition: string | null;
}

export interface ResultFacts {
  date: string;
  opponent: string;
  opponentBadgeUrl: string | null;
  homeAway: "home" | "away";
  ourScore: number;
  theirScore: number;
  competition: string | null;
}

type Built = { caption: string; graphic: Graphic };

function base(brand: Brand, kind: string, headline: string, footer: string | null = null) {
  return { v: 2 as const, kind, headline, brand, footer };
}

function sidesFor(brand: Brand, f: { opponent: string; opponentBadgeUrl: string | null; homeAway: "home" | "away" }): { home: TeamSide; away: TeamSide } {
  const us: TeamSide = { name: brand.clubName, badgeUrl: brand.badgeUrl, score: null, scorers: [], isUs: true };
  const them: TeamSide = { name: f.opponent, badgeUrl: f.opponentBadgeUrl, score: null, scorers: [], isUs: false };
  return f.homeAway === "home" ? { home: us, away: them } : { home: them, away: us };
}

function when(f: FixtureFacts): string {
  return [displayDate(f.date), f.time ? `KO ${f.time}` : null, f.venue].filter(Boolean).join(" · ");
}

export function countdownPost(brand: Brand, f: FixtureFacts, daysToGo: number): Built {
  const { home, away } = sidesFor(brand, f);
  return {
    caption: `⏳ ${daysToGo} day${daysToGo === 1 ? "" : "s"} to go! ${home.name} v ${away.name}\n${when(f)}`,
    graphic: { ...base(brand, "countdown", daysToGo === 1 ? "DAY TO GO" : "DAYS TO GO", f.competition), layout: "fixture", home, away, date: displayDate(f.date) ?? f.date, time: f.time, venue: f.venue, tagline: null, countdown: daysToGo },
  };
}

export function matchdayPost(brand: Brand, f: FixtureFacts): Built {
  const { home, away } = sidesFor(brand, f);
  return {
    caption: `🏟️ MATCH DAY! ${home.name} v ${away.name}\n${when(f)}\nCome down and support the team! 💪`,
    graphic: { ...base(brand, "matchday", "MATCH DAY", f.competition), layout: "fixture", home, away, date: displayDate(f.date) ?? f.date, time: f.time, venue: f.venue, tagline: f.competition, countdown: null },
  };
}

export function postponedPost(brand: Brand, f: FixtureFacts): Built {
  const { home, away } = sidesFor(brand, f);
  return {
    caption: `⚠️ POSTPONED: ${home.name} v ${away.name} on ${displayDate(f.date) ?? f.date} is off. New date to be confirmed.`,
    graphic: { ...base(brand, "postponed", "POSTPONED", f.competition), layout: "fixture", home, away, date: displayDate(f.date) ?? f.date, time: f.time, venue: f.venue, tagline: "New date to be confirmed", countdown: null },
  };
}

function listRow(brand: Brand, x: { opponent: string; opponentBadgeUrl: string | null; homeAway: "home" | "away"; date: string }, extra: Partial<ListRow>): ListRow {
  const { home, away } = sidesFor(brand, x);
  return {
    date: displayDate(x.date) ?? x.date, home: home.name, away: away.name, homeBadgeUrl: home.badgeUrl, awayBadgeUrl: away.badgeUrl,
    homeScore: null, awayScore: null, outcome: null, time: null, venue: null, ...extra,
  };
}

export function fixturesPost(brand: Brand, fixtures: FixtureFacts[], rangeLabel: string): Built {
  const rows = fixtures.map((f) => listRow(brand, f, { time: f.time, venue: f.venue }));
  const lines = rows.map((r) => `• ${r.date}: ${r.home} v ${r.away}${r.time ? ` (${r.time}${r.venue ? `, ${r.venue}` : ""})` : ""}`);
  const comps = [...new Set(fixtures.map((f) => f.competition).filter(Boolean))];
  return {
    caption: `📅 This week's fixtures\n${lines.join("\n")}`,
    graphic: { ...base(brand, "fixtures", "FIXTURES", comps.length === 1 ? comps[0] : null), layout: "list", mode: "fixtures", subtitle: rangeLabel, rows },
  };
}

export function resultsPost(brand: Brand, results: ResultFacts[], rangeLabel: string): Built {
  const rows = results.map((r) => {
    const outcome = r.ourScore > r.theirScore ? "W" : r.ourScore === r.theirScore ? "D" : "L";
    return listRow(brand, r, {
      homeScore: r.homeAway === "home" ? r.ourScore : r.theirScore,
      awayScore: r.homeAway === "home" ? r.theirScore : r.ourScore,
      outcome,
    });
  });
  const icon = { W: "✅", D: "🤝", L: "❌" } as const;
  const lines = rows.map((r) => `• ${r.home} ${r.homeScore}–${r.awayScore} ${r.away} ${icon[r.outcome as "W" | "D" | "L"]}`);
  const comps = [...new Set(results.map((r) => r.competition).filter(Boolean))];
  return {
    caption: `📊 This week's results\n${lines.join("\n")}`,
    graphic: { ...base(brand, "results", "RESULTS", comps.length === 1 ? comps[0] : null), layout: "list", mode: "results", subtitle: rangeLabel, rows },
  };
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

export function tablePost(brand: Brand, competition: string, rows: TableRow[]): Built {
  const us = rows.find((r) => r.isUs);
  return {
    caption: us
      ? `📈 League table: we're ${ordinal(us.position)} in ${competition} with ${us.points} point${us.points === 1 ? "" : "s"} from ${us.played} game${us.played === 1 ? "" : "s"}.`
      : `📈 The latest ${competition} table.`,
    graphic: { ...base(brand, "table", "LEAGUE TABLE"), layout: "table", competition, rows },
  };
}

export interface PersonFacts { name: string; photoUrl: string | null }

function person(policy: PublicNamePolicy, p: PersonFacts): { name: string; photo: string | null } {
  return { name: publicName(policy, p.name), photo: policy.photos ? p.photoUrl : null };
}

/** Birthdays never show the player's age: most players are children. */
export function birthdayPost(brand: Brand, policy: PublicNamePolicy, p: PersonFacts): Built {
  const { name, photo } = person(policy, p);
  return {
    caption: `🎂 Happy birthday ${name}! Have a brilliant day from everyone at ${brand.clubName}.`,
    graphic: { ...base(brand, "birthday", "HAPPY BIRTHDAY"), layout: "person", playerName: name, photoUrl: photo, stat: null, secondary: "Have a brilliant day from everyone at the club" },
  };
}

export function statLine(goals: number, assists: number, motm: number): string {
  return [
    goals ? `${goals} goal${goals === 1 ? "" : "s"}` : null,
    assists ? `${assists} assist${assists === 1 ? "" : "s"}` : null,
    motm ? `${motm} MOTM` : null,
  ].filter(Boolean).join(" · ");
}

export function playerOfPeriodPost(brand: Brand, policy: PublicNamePolicy, period: "week" | "month", p: PersonFacts & { goals: number; assists: number; motm: number }, label: string): Built {
  const { name, photo } = person(policy, p);
  const stat = statLine(p.goals, p.assists, p.motm);
  const title = period === "week" ? "Player of the Week" : `Player of the Month for ${label}`;
  return {
    caption: `🌟 ${title}: ${name}!${stat ? ` ${stat}.` : ""}`,
    graphic: { ...base(brand, period === "week" ? "player_of_week" : "player_of_month", period === "week" ? "PLAYER OF THE WEEK" : "PLAYER OF THE MONTH"), layout: "person", playerName: name, photoUrl: photo, stat: stat || null, secondary: period === "month" ? label : null },
  };
}

export function milestonePost(brand: Brand, policy: PublicNamePolicy, p: PersonFacts, count: number, stat: "appearances" | "goals"): Built {
  const { name, photo } = person(policy, p);
  return {
    caption: `🎉 Milestone! ${name} has reached ${count} ${stat} for ${brand.clubName}. Well done!`,
    graphic: { ...base(brand, "milestone", "MILESTONE"), layout: "person", playerName: name, photoUrl: photo, stat: `${count} ${stat}`, secondary: `for ${brand.clubName}` },
  };
}

export function throwbackPost(brand: Brand, photoUrl: string, caption: string | null): Built {
  return {
    caption: `📸 Throwback Thursday${caption ? `: ${caption}` : ""} #TBT`,
    graphic: { ...base(brand, "throwback", "THROWBACK THURSDAY"), layout: "photo", photoUrl, caption },
  };
}

export function quotePost(brand: Brand, quote: { text: string; author: string }): Built {
  return {
    caption: `💬 "${quote.text}" – ${quote.author}`,
    graphic: { ...base(brand, "quote", "Quote of the week"), layout: "quote", text: quote.text, author: quote.author },
  };
}

/** Short, well-known sporting quotes suitable for youth clubs. */
export const QUOTES: Array<{ text: string; author: string }> = [
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { text: "The more difficult the victory, the greater the happiness in winning.", author: "Pelé" },
  { text: "You have to fight to reach your dream.", author: "Lionel Messi" },
  { text: "Talent without working hard is nothing.", author: "Cristiano Ronaldo" },
  { text: "Success is no accident.", author: "Pelé" },
  { text: "The team is more important than the individual.", author: "Unknown" },
  { text: "Winners never quit and quitters never win.", author: "Vince Lombardi" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Play for the name on the front of the shirt.", author: "Unknown" },
  { text: "Don't practise until you get it right. Practise until you can't get it wrong.", author: "Unknown" },
  { text: "Every champion was once a contender who refused to give up.", author: "Rocky Balboa" },
  { text: "The harder the battle, the sweeter the victory.", author: "Les Brown" },
  { text: "Great things come from hard work and perseverance.", author: "Kobe Bryant" },
  { text: "Together everyone achieves more.", author: "Unknown" },
];
