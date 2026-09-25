/**
 * Sample graphics for every layout: used for the style previews clubs see in
 * settings and by scripts/preview-graphics.ts. Opponent badges and photos use
 * "sample:" URLs, which only the preview script fills in.
 */
import type { Brand, Graphic, ListRow, TeamSide } from "./types";

const DEFAULT_BRAND: Brand = {
  clubName: "Syston Tigers",
  primaryColor: "#FFD21F",
  secondaryColor: "#0B0B0C",
  badgeUrl: "sample:club-badge",
  sponsorName: "Cherry Tree Nursery",
  sponsorLogoUrl: "sample:sponsor",
};

export function sampleGraphics(brand: Brand = DEFAULT_BRAND): Record<string, Graphic> {
  const us = (score: number | null, scorers: string[] = []): TeamSide => ({ name: brand.clubName, badgeUrl: brand.badgeUrl, score, scorers, isUs: true });
  const them = (score: number | null): TeamSide => ({ name: "Hillside Rangers", badgeUrl: "sample:away-badge", score, scorers: [], isUs: false });
  const base = { v: 2 as const, brand, footer: "Leicestershire Youth League · U12 Division 1" };
  const row = (over: Partial<ListRow>): ListRow => ({ date: "SAT 4 OCT", home: brand.clubName, away: "Hillside Rangers", homeBadgeUrl: brand.badgeUrl, awayBadgeUrl: "sample:away-badge", homeScore: null, awayScore: null, outcome: null, time: "10:30", venue: "Syston Park", ...over });
  return {
    goal: { ...base, layout: "moment", kind: "goal", headline: "GOAL!", playerName: "Sam S.", secondary: "Assist: Will J.", minute: 23, photoUrl: "sample:photo", home: us(2), away: them(1) },
    hattrick: { ...base, layout: "moment", kind: "goal", headline: "HAT-TRICK!", playerName: "Sam S.", secondary: "3 goals today", minute: 61, photoUrl: null, home: us(4), away: them(1), goalCount: 3 },
    card: { ...base, layout: "moment", kind: "yellow", headline: "YELLOW CARD", playerName: "Ben T.", secondary: null, minute: 38, photoUrl: null, home: us(1), away: them(0), card: "yellow" },
    kickoff: { ...base, layout: "score", kind: "kick_off", headline: "KICK OFF", home: us(0), away: them(0), minute: null, showScore: false, detail: "We're under way at Syston Park" },
    halftime: { ...base, layout: "score", kind: "half_time", headline: "HALF TIME", home: us(1, ["Sam S. 23'"]), away: them(0), minute: 25, showScore: true, detail: null },
    fulltime: { ...base, layout: "score", kind: "full_time", headline: "FULL TIME", home: us(3, ["Sam S. 23', 41'", "Will J. 52'"]), away: them(1), minute: null, showScore: true, detail: null },
    lineup: {
      ...base, layout: "lineup", kind: "lineup", headline: "STARTING XI", home: us(null), away: them(null), date: "SAT 4 OCT", time: "10:30", venue: "Syston Park",
      players: ["Alfie B.", "Ben T.", "Charlie D.", "Dan E.", "Ethan F.", "Finn G.", "George H.", "Harry I.", "Isaac J.", "Jack K.", "Sam S."].map((name, i) => ({ number: i + 1, name })),
      subs: ["Leo M.", "Max N.", "Noah O."],
    },
    matchday: { ...base, layout: "fixture", kind: "matchday", headline: "MATCH DAY", home: us(null), away: them(null), date: "SAT 4 OCT", time: "10:30", venue: "Syston Park", tagline: "League", countdown: null },
    countdown: { ...base, layout: "fixture", kind: "countdown", headline: "DAYS TO GO", home: us(null), away: them(null), date: "SAT 4 OCT", time: "10:30", venue: "Syston Park", tagline: null, countdown: 3 },
    postponed: { ...base, layout: "fixture", kind: "postponed", headline: "POSTPONED", home: us(null), away: them(null), date: "SAT 4 OCT", time: "10:30", venue: "Syston Park", tagline: "New date to be confirmed", countdown: null },
    fixtures: {
      ...base, layout: "list", kind: "fixtures", headline: "FIXTURES", mode: "fixtures", subtitle: "Mon 29 Sep – Sun 5 Oct",
      rows: [row({}), row({ date: "WED 1 OCT", home: "Anstey Nomads", away: brand.clubName, homeBadgeUrl: null, awayBadgeUrl: brand.badgeUrl, time: "18:30", venue: "Anstey" })],
    },
    results: {
      ...base, layout: "list", kind: "results", headline: "RESULTS", mode: "results", subtitle: "This week",
      rows: [row({ homeScore: 3, awayScore: 1, outcome: "W" }), row({ date: "WED 1 OCT", home: "Anstey Nomads", away: brand.clubName, homeBadgeUrl: null, awayBadgeUrl: brand.badgeUrl, homeScore: 2, awayScore: 2, outcome: "D" })],
    },
    table: {
      ...base, layout: "table", kind: "table", headline: "LEAGUE TABLE", competition: "U12 Division 1",
      rows: [
        ["Hillside Rangers", 6, 5, 1, 0, 14, 16], [brand.clubName, 6, 4, 1, 1, 9, 13], ["Anstey Nomads", 6, 3, 2, 1, 4, 11], ["Birstall United", 6, 3, 0, 3, 1, 9],
        ["Quorn Juniors", 6, 2, 1, 3, -2, 7], ["Thurmaston Town", 6, 1, 2, 3, -5, 5], ["Rothley Imperial", 6, 1, 1, 4, -8, 4], ["Sileby Saints", 6, 0, 2, 4, -13, 2],
      ].map(([team, played, won, drawn, lost, gd, pts], i) => ({ position: i + 1, team: String(team), played: Number(played), won: Number(won), drawn: Number(drawn), lost: Number(lost), goalDifference: Number(gd), points: Number(pts), isUs: team === brand.clubName })),
    },
    birthday: { ...base, layout: "person", kind: "birthday", headline: "HAPPY BIRTHDAY", playerName: "Sam S.", photoUrl: null, stat: null, secondary: "Have a brilliant day from everyone at the club" },
    potw: { ...base, layout: "person", kind: "player_of_week", headline: "PLAYER OF THE WEEK", playerName: "Sam S.", photoUrl: "sample:photo", stat: "3 goals · 1 assist", secondary: null },
    milestone: { ...base, layout: "person", kind: "milestone", headline: "MILESTONE", playerName: "Will J.", photoUrl: null, stat: "50 appearances", secondary: "What a servant to the club" },
    motm: { ...base, layout: "person", kind: "motm", headline: "MAN OF THE MATCH", playerName: "Sam S.", photoUrl: "sample:photo", stat: null, secondary: "vs Hillside Rangers · voted by parents" },
    quote: { ...base, layout: "quote", kind: "quote", headline: "Quote of the week", text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
    throwback: { ...base, layout: "photo", kind: "throwback", headline: "THROWBACK THURSDAY", photoUrl: "sample:photo", caption: "Cup final day, May 2025" },
  };
}

/** Draw sample badges, a sponsor logo and a photo (preview script only). */
export async function sampleImages(toPng: (svg: string) => Promise<string>): Promise<Map<string, string>> {
  const shield = (fill: string, stripe: string, label: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><path d="M200 20 L360 70 V200 Q360 320 200 385 Q40 320 40 200 V70 Z" fill="${fill}" stroke="#FFFFFF" stroke-width="14"/><path d="M200 20 L240 32 V372 L200 385 L160 372 V32 Z" fill="${stripe}"/><text x="200" y="250" font-family="Anton" font-size="120" fill="#FFFFFF" text-anchor="middle" stroke="#000" stroke-width="4" paint-order="stroke">${label}</text></svg>`;
  const photo = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="900"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5B7A99"/><stop offset="1" stop-color="#1D2B38"/></linearGradient></defs><rect width="800" height="900" fill="url(#g)"/><circle cx="400" cy="330" r="150" fill="#E8C4A0"/><path d="M130 900 Q150 560 400 540 Q650 560 670 900 Z" fill="#FFD21F"/><path d="M330 560 L400 660 L470 560 Z" fill="#0B0B0C"/></svg>`;
  const sponsor = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="140"><rect width="400" height="140" fill="#FFFFFF"/><circle cx="60" cy="70" r="34" fill="#C2185B"/><text x="110" y="88" font-family="Barlow Condensed ExtraBold" font-size="54" fill="#2E7D32">Cherry Tree</text></svg>`;
  return new Map([
    ["sample:club-badge", await toPng(shield("#111111", "#FFD21F", "ST"))],
    ["sample:away-badge", await toPng(shield("#1E4FA3", "#FFFFFF", "HR"))],
    ["sample:photo", await toPng(photo)],
    ["sample:sponsor", await toPng(sponsor)],
  ]);
}
