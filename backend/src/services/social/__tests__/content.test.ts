import { describe, it, expect } from "vitest";
import { buildPost, displayDate, parseEventSettings, DEFAULT_EVENT_SETTINGS, type MatchContext } from "../content";

const match: MatchContext = {
  brand: { clubName: "Syston Tigers", badgeUrl: "https://x/badge.png", primaryColor: "#FFD700", secondaryColor: "#000000", sponsorName: null, sponsorLogoUrl: null },
  opponent: "Hillside", opponentBadgeUrl: "https://x/hillside.png", homeAway: "home", ourScore: 2, theirScore: 1,
  competition: "League", date: "SAT 4 OCT", time: "10:30", venue: "Home Ground",
};
const sam = { name: "Sam Smith", photoUrl: "https://x/sam.jpg" };
const will = { name: "Will Jones", photoUrl: null };

describe("social post content", () => {
  it("writes a goal post in the club's name style", () => {
    const { caption, graphic } = buildPost({ style: "first_initial", photos: false }, match, { kind: "goal", minute: 23, player: sam, player2: will });
    expect(caption).toBe("⚽ GOAL! Sam S. 23' (assist Will J.)\nSyston Tigers 2–1 Hillside");
    expect(graphic).toMatchObject({
      v: 2, layout: "moment", headline: "GOAL!", playerName: "Sam S.", secondary: "Assist: Will J.", minute: 23, photoUrl: null, footer: "League",
      home: { name: "Syston Tigers", badgeUrl: "https://x/badge.png", score: 2, isUs: true },
      away: { name: "Hillside", badgeUrl: "https://x/hillside.png", score: 1, isUs: false },
    });
  });

  it("celebrates a brace, a hat-trick and more", () => {
    const post = (goalNumber: number, player = sam) => buildPost({ style: "first_initial", photos: false }, match, { kind: "goal", minute: 40, player, goalNumber });
    expect(post(1).graphic.headline).toBe("GOAL!");
    expect(post(1).graphic).not.toHaveProperty("goalCount");
    expect(post(2).caption).toBe("⚽⚽ BRACE! Sam S. 40' – 2 goals today!\nSyston Tigers 2–1 Hillside");
    expect(post(2).graphic).toMatchObject({ headline: "BRACE!", goalCount: 2 });
    expect(post(3).caption).toMatch(/^🎩 HAT-TRICK! Sam S\. 40' – 3 goals today!/);
    expect(post(3).graphic).toMatchObject({ headline: "HAT-TRICK!", goalCount: 3 });
    expect(post(4).graphic.headline).toBe("FOUR GOALS!");
    expect(post(12).graphic.headline).toBe("12 GOALS!");
    // Without a named scorer there's nothing to count
    expect(buildPost({ style: "full", photos: false }, match, { kind: "goal", minute: 40, player: null, goalNumber: 3 }).graphic)
      .toMatchObject({ headline: "GOAL!" });
  });

  it("uses the player's photo only when the club allows it", () => {
    expect(buildPost({ style: "full", photos: true }, match, { kind: "goal", minute: 5, player: sam }).graphic)
      .toMatchObject({ playerName: "Sam Smith", photoUrl: "https://x/sam.jpg" });
    expect(buildPost({ style: "initial_last", photos: false }, match, { kind: "goal", minute: 5, player: sam }).graphic)
      .toMatchObject({ playerName: "S. Smith", photoUrl: null });
  });

  it("puts the home side first when we're away", () => {
    const { caption, graphic } = buildPost({ style: "full", photos: false }, { ...match, homeAway: "away" }, { kind: "half_time", minute: 30 });
    expect(caption).toBe("Half time: Hillside 1–2 Syston Tigers");
    expect(graphic).toMatchObject({ layout: "score", home: { name: "Hillside", score: 1 }, away: { name: "Syston Tigers", score: 2 } });
  });

  it("lists scorers at full time and names the MOTM winner", () => {
    const goals = (...names: string[]) => names.map((name, i) => ({ name, minute: 10 + i * 10 }));
    const ft = buildPost({ style: "first_initial", photos: false }, match, { kind: "full_time", minute: null, scorers: goals("Sam Smith", "Will Jones", "Sam Smith") });
    expect(ft.caption).toBe("Full time: Syston Tigers 2–1 Hillside\n⚽ Sam S. 2, Will J.");
    // The graphic lists our scorers with their minutes under our team
    expect(ft.graphic).toMatchObject({ layout: "score", headline: "FULL TIME", home: { scorers: ["Sam S. 10', 30'", "Will J. 20'"] }, away: { scorers: [] } });
    expect(buildPost({ style: "first_initial", photos: false }, match, { kind: "full_time", minute: null, scorers: goals("Sam Smith", "Sam Smith", "Sam Smith") }).caption)
      .toMatch(/⚽ Sam S\. \(hat-trick\)$/);
    expect(buildPost({ style: "full", photos: false }, match, { kind: "motm", minute: null, player: sam }).caption)
      .toBe("⭐ Man of the Match: Sam Smith vs Hillside. Voted for by our players and parents.");
  });

  it("starts from sensible defaults and keeps valid saved choices", () => {
    expect(parseEventSettings(null)).toEqual(DEFAULT_EVENT_SETTINGS);
    const saved = parseEventSettings(JSON.stringify({ yellow: { social: true }, goal: { feed: "yes" }, nonsense: { feed: true } }));
    expect(saved.yellow).toEqual({ feed: true, social: true });
    expect(saved.goal).toEqual({ feed: true, social: true });
    expect(parseEventSettings("{broken")).toEqual(DEFAULT_EVENT_SETTINGS);
  });
});

describe("dates", () => {
  it("shows fixture dates the way the graphics do", () => {
    expect(displayDate("2026-10-04")).toBe("SUN 4 OCT");
    expect(displayDate("2026-09-26T00:00:00Z")).toBe("SAT 26 SEP");
    expect(displayDate(null)).toBeNull();
  });
});

describe("line-up posts", () => {
  it("lists the starting players and subs in the club's name style", () => {
    const { caption, graphic } = buildPost({ style: "first_initial", photos: false }, match, {
      kind: "lineup", minute: null,
      lineup: {
        teamSize: 7, kickOff: "10:30", venue: "Home Ground",
        starters: [{ name: "Kev Keeper", number: 1 }, { name: "Sam Smith", number: 9 }],
        subs: [{ name: "Sid Sub", number: 14 }],
      },
    });
    expect(caption).toBe("📋 Team news: here's our starting 7 v Hillside (Kick-off 10:30 · Home Ground)\n\n1 Kev K.\n9 Sam S.\n\nSubs: Sid S.");
    expect(graphic).toMatchObject({
      layout: "lineup", headline: "STARTING 7", date: "SAT 4 OCT", time: "10:30", venue: "Home Ground",
      players: [{ number: 1, name: "Kev K." }, { number: 9, name: "Sam S." }], subs: ["Sid S."],
    });
  });
});
