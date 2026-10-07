/**
 * Syston Tigers' own Canva set (1080×1080). Positions come from the
 * placeholders in the club's designs ("App backgrounds (copies)" in Canva).
 * Match moments here; lists, table, line-up, stats and quotes in systonBoards.ts.
 */
import { text, type Canvas } from "../svg";
import type { FixtureGraphic, Graphic, MomentGraphic, ScoreGraphic } from "../types";
import { ball, letters } from "../studio/kit";
import { dayAndDate, NUMBER_FONT, outlinedSlot, playerPhoto, slot, sponsorBox, teamBadge } from "./parts";
import { systonFixtures, systonLeaders, systonLineup, systonQuote, systonResults, systonTable } from "./systonBoards";
import type { Template, TemplateSet } from "./index";

const INK = "#0B0B0C";
const YELLOW = "#FAFF04";
const SQUARE = { w: 1080, h: 1080 };

/** GOAL! / BRACE! / HAT-TRICK! and their goal, on the yellow torn-paper design. */
function goal(file: string, opposition = false): Template {
  return {
    file, ...SQUARE,
    draw(c: Canvas, g: Graphic) {
      const m = g as MomentGraphic;
      let o = "";
      // The scorer's shirt number, huge and faint behind everything (the {{pn}} layers)
      if (!opposition && m.shirtNumber != null) {
        o += letters(String(m.shirtNumber), 580, 990, { font: NUMBER_FONT, size: 860, fill: "none", stroke: INK, strokeWidth: 10, anchor: "middle", rotate: 14, opacity: 0.2 });
        o += letters(String(m.shirtNumber), 620, 1000, { font: NUMBER_FONT, size: 860, fill: "none", stroke: INK, strokeWidth: 10, anchor: "middle", rotate: -12, opacity: 0.14 });
      }
      // The scorer stands behind the headline
      if (!opposition) o += playerPhoto(c, m.photoUrl, 600, 140, 480, 940, { dark: INK, light: "#FFFFF0" });
      // Teams across the top
      const teamsY = opposition ? 245 : 195;
      o += slot(m.home.name, 330, teamsY, 340, 40, INK) + slot("VS", 545, teamsY, 60, 34, INK) + slot(m.away.name, 760, teamsY, 340, 40, INK);
      // One ball per goal for braces and hat-tricks
      const goals = Math.min(m.goalCount ?? 0, 6);
      for (let i = 0; i < goals && goals >= 2; i++) o += ball(545 - (goals - 1) * 34 + i * 68, 262, 26, goals >= 3 ? "#F2C230" : INK);
      // The headline fills the middle
      const head = m.headline.toUpperCase();
      const size = Math.min(470, 900 / ((head.length * 0.42) || 1));
      o += letters(head, 548, 400 + size * 0.52, { font: NUMBER_FONT, size, fill: INK, anchor: "middle", scaleX: head.length > 6 ? 0.9 : 0.78, rotate: -4 });
      // Scorer on a white tag with the minute beside it, assist underneath
      if (m.playerName) {
        o += `<polygon points="350,700 640,700 630,776 340,776" fill="#FFFFFF"/>`;
        o += slot(m.playerName, 490, 760, 270, 62, INK);
        if (m.minute !== null) o += text(`${m.minute}'`, 660, 762, { font: NUMBER_FONT, size: 64, fill: INK });
      }
      if (m.secondary) o += slot(m.secondary, 545, 830, 600, 40, INK);
      // Badges and the score
      o += teamBadge(c, m.home.badgeUrl, m.home.name, 398, 925, 110) + teamBadge(c, m.away.badgeUrl, m.away.name, 746, 925, 110);
      o += `<polygon points="490,875 640,875 620,975 470,975" fill="${INK}"/>`;
      o += letters(`${m.home.score ?? 0}-${m.away.score ?? 0}`, 555, 958, { font: NUMBER_FONT, size: 92, fill: YELLOW, anchor: "middle" });
      return o;
    },
  };
}

/** HALF TIME / FULL TIME: badges either side of the yellow score box, scorers underneath. */
function whistle(file: string): Template {
  return {
    file, ...SQUARE,
    draw(c: Canvas, g: Graphic) {
      const s = g as ScoreGraphic;
      let o = slot(s.footer ?? "", 552, 410, 760, 48, "#FFFFFF");
      o += teamBadge(c, s.home.badgeUrl, s.home.name, 238, 646, 230) + teamBadge(c, s.away.badgeUrl, s.away.name, 842, 646, 230);
      o += letters(`${s.home.score ?? 0}-${s.away.score ?? 0}`, 540, 715, { font: NUMBER_FONT, size: 200, fill: INK, anchor: "middle", scaleX: 0.9 });
      for (const [side, cx] of [[s.home, 238], [s.away, 842]] as const) {
        o += outlinedSlot(side.name, cx, 812, 300, 34, "#FFFFFF");
        side.scorers.slice(0, 4).forEach((line, i) => { o += outlinedSlot(line, cx, 852 + i * 36, 300, 28, "#FFFFFF"); });
      }
      return o + sponsorBox(c, s.brand, 39, 904, 138, 136);
    },
  };
}

/** KICK OFF on the stadium: competition at the top, badges with a VS box, the detail line underneath. */
const kickOff: Template = {
  file: "kickoff.jpg", ...SQUARE,
  draw(c: Canvas, g: Graphic) {
    const s = g as ScoreGraphic;
    let o = slot(s.footer ?? "", 538, 88, 720, 35, "#FFFFFF");
    o += teamBadge(c, s.home.badgeUrl, s.home.name, 324, 594, 192) + teamBadge(c, s.away.badgeUrl, s.away.name, 739, 594, 192);
    o += `<rect x="492" y="561" width="78" height="66" fill="#FFFFFF"/>` + slot("VS", 531, 607, 60, 40, "#14171A");
    o += slot(s.home.name, 324, 790, 230, 38, "#FFFFFF") + slot(s.away.name, 739, 790, 230, 38, "#FFFFFF");
    return o + slot(s.detail ?? "", 540, 935, 760, 36, "#FFFFFF");
  },
};

/** MATCH DAY: league lines, badges, the white day | date | kick-off box and the ground. */
const matchDay: Template = {
  file: "matchday.jpg", ...SQUARE,
  draw(c: Canvas, g: Graphic) {
    const f = g as FixtureGraphic;
    const [league, division] = (f.footer ?? "").split(/\s+·\s+/);
    let o = slot(league ?? "", 540, 118, 700, 48, "#FFFFFF") + slot(division ?? "", 540, 188, 600, 44, "#FFFFFF");
    o += teamBadge(c, f.home.badgeUrl, f.home.name, 361, 457, 172) + teamBadge(c, f.away.badgeUrl, f.away.name, 719, 454, 172);
    o += slot("VS", 540, 505, 36, 24, "#004AAD");
    o += slot(f.home.name, 362, 625, 240, 30, "#FFFFFF") + slot(f.away.name, 714, 625, 240, 30, "#FFFFFF");
    const [day, date] = dayAndDate(f.date);
    o += slot(day, 345, 802, 150, 38, "#00C2CB") + slot(date, 590, 802, 170, 38, "#00C2CB") + slot(f.time ?? "—", 780, 802, 160, 40, "#00C2CB");
    if (f.venue) o += slot(f.venue, 700, 968, 470, 36, "#FFFFFF");
    return o;
  },
};

/** 3 DAYS TO GO: the number over outlined DAYS and solid TO GO, then the fixture. */
const countdown: Template = {
  file: "countdown.jpg", ...SQUARE,
  draw(c: Canvas, g: Graphic) {
    const f = g as FixtureGraphic;
    const word = f.countdown === 1 ? "DAY" : "DAYS";
    let o = letters(word, 540, 360, { font: "Archivo Black", size: 190, fill: "none", stroke: "#FFFFFF", strokeWidth: 6, anchor: "middle" });
    o += letters(String(f.countdown ?? ""), 532, 470, { font: "Archivo Black", size: 420, fill: "#FFFFFF", anchor: "middle", opacity: 0.97 });
    o += letters("TO GO", 562, 525, { font: "Archivo Black", size: 175, fill: "#FFFFFF", anchor: "middle" });
    o += slot(f.home.name, 255, 640, 230, 46, "#FFFFFF") + teamBadge(c, f.home.badgeUrl, f.home.name, 252, 789, 180);
    o += teamBadge(c, f.away.badgeUrl, f.away.name, 806, 681, 180) + slot(f.away.name, 806, 840, 230, 46, "#FFFFFF");
    o += `<circle cx="531" cy="682" r="51" fill="#FFFFFF"/>` + slot("VS", 531, 703, 70, 56, "#1E1E1E");
    o += slot([f.time, f.venue].filter(Boolean).join(" · "), 531, 990, 520, 40, "#FFFFFF");
    return o + sponsorBox(c, f.brand, 924, 927, 130, 127);
  },
};

/** MATCH POSTPONED: league lines, badges, the original date and the ground. */
const postponed: Template = {
  file: "postponed.jpg", ...SQUARE,
  draw(c: Canvas, g: Graphic) {
    const f = g as FixtureGraphic;
    const [league, division] = (f.footer ?? "").split(/\s+·\s+/);
    let o = slot(league ?? "", 546, 138, 500, 30, "#FFFFFF") + slot(division ?? "", 546, 185, 500, 30, "#FFFFFF");
    o += teamBadge(c, f.home.badgeUrl, f.home.name, 340, 561, 187) + teamBadge(c, f.away.badgeUrl, f.away.name, 752, 561, 187);
    o += `<circle cx="546" cy="590" r="21" fill="#FFFFFF"/>` + slot("VS", 546, 598, 30, 22, "#004AAD");
    o += slot(f.home.name, 340, 752, 220, 32, "#FFFFFF") + slot(f.away.name, 752, 752, 220, 32, "#FFFFFF");
    o += slot(f.tagline ? `${f.date} · ${f.tagline}` : f.date, 547, 840, 640, 38, "#FFFFFF");
    if (f.venue) o += slot(f.venue, 680, 948, 440, 38, "#FFFFFF");
    return o;
  },
};

const TEMPLATES = {
  goal: goal("goal.jpg"), brace: goal("brace.jpg"), hattrick: goal("hattrick.jpg"), oppGoal: goal("oppgoal.jpg", true),
  halfTime: whistle("halftime.jpg"), fullTime: whistle("fulltime.jpg"), kickOff, matchDay, countdown, postponed,
};

export const systonCanva: TemplateSet = {
  id: "syston-canva",
  pick(g) {
    switch (g.kind) {
      case "goal": return (g.layout === "moment" && (g.goalCount ?? 1) >= 3) ? TEMPLATES.hattrick : (g.layout === "moment" && (g.goalCount ?? 1) === 2) ? TEMPLATES.brace : TEMPLATES.goal;
      case "opp_goal": return TEMPLATES.oppGoal;
      case "half_time": return TEMPLATES.halfTime;
      case "full_time": return TEMPLATES.fullTime;
      case "kick_off": return TEMPLATES.kickOff;
      case "matchday": return TEMPLATES.matchDay;
      case "countdown": return g.layout === "fixture" && g.countdown ? TEMPLATES.countdown : null;
      case "postponed": return TEMPLATES.postponed;
      default: break;
    }
    switch (g.layout) {
      case "list": return g.mode === "results" ? systonResults : systonFixtures;
      case "table": return systonTable;
      case "lineup": return systonLineup;
      case "leaders": return systonLeaders;
      case "quote": return systonQuote;
      default: return null;
    }
  },
};

