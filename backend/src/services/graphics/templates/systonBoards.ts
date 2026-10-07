/**
 * Syston Tigers' own Canva set: results and fixtures (slanted yellow bars),
 * the league table (yellow cut-corner pills), the starting line-up, player
 * stats and quotes. Positions come from the placeholders in the club's designs.
 */
import { r, text, type Canvas } from "../svg";
import { wrap } from "../text";
import type { Graphic, LeadersGraphic, LineupGraphic, ListGraphic, QuoteGraphic, TableGraphic } from "../types";
import { letters } from "../studio/kit";
import { NAME_FONT, NUMBER_FONT, slot, sponsorBox } from "./parts";
import type { Template } from "./index";

const SQUARE = { w: 1080, h: 1080 };
const BAR = "#F7F408";
const PILL = "#F2D900";
const PILL_INK = "#030108";

/** The slanted bars from the design (64×48 view box). */
function bar(x: number, y: number, w: number, h: number, side: "home" | "away", fill = BAR): string {
  const d = side === "home" ? "M48 0H0L16 48H64L48 0Z" : "M16 0H64L48 48H0L16 0Z";
  return `<path d="${d}" transform="translate(${r(x)} ${r(y)}) scale(${r(w / 64)} ${(h / 48).toFixed(3)})" fill="${fill}"/>`;
}

/** Row tops for n rows within the design's five slots, centred when there are fewer. */
function rowTops(first: number, pitch: number, n: number): number[] {
  const offset = ((5 - n) * pitch) / 2;
  return Array.from({ length: n }, (_, i) => first + offset + i * pitch);
}

/** League line, then a date/subtitle line under the baked-in headline. */
function heading(g: ListGraphic, leagueY: number, subY: number): string {
  return slot((g.footer ?? "").split(/\s+·\s+/)[0] ?? "", 549, leagueY, 560, 28, "#ECEEEE") + slot(g.subtitle ?? "", 549, subY, 600, 40, "#ECEEEE");
}

export const systonResults: Template = {
  file: "results.jpg", ...SQUARE,
  draw(c: Canvas, g: Graphic) {
    const l = g as ListGraphic;
    let o = heading(l, 210, 400);
    for (const [i, top] of rowTops(439, 116, Math.min(l.rows.length, 5)).entries()) {
      const row = l.rows[i];
      o += bar(22, top, 396, 72, "home") + bar(665, top, 393, 72, "away");
      o += slot(row.home, 220, top + 47, 300, 30, "#0B0B0C") + slot(row.away, 862, top + 47, 300, 30, "#0B0B0C");
      o += letters(`${row.homeScore ?? ""}`, 488, top + 56, { font: NUMBER_FONT, size: 56, fill: "#FFFFFF", anchor: "middle" });
      o += letters("-", 540, top + 52, { font: NUMBER_FONT, size: 44, fill: "#FFFFFF", anchor: "middle" });
      o += letters(`${row.awayScore ?? ""}`, 592, top + 56, { font: NUMBER_FONT, size: 56, fill: "#FFFFFF", anchor: "middle" });
    }
    return o + sponsorBox(c, l.brand, 22, 1001, 63, 62);
  },
};

export const systonFixtures: Template = {
  file: "fixtures.jpg", ...SQUARE,
  draw(c: Canvas, g: Graphic) {
    const l = g as ListGraphic;
    let o = heading(l, 182, 419);
    for (const [i, top] of rowTops(474, 100.5, Math.min(l.rows.length, 5)).entries()) {
      const row = l.rows[i];
      o += bar(13, top, 490, 82, "home") + bar(577, top, 490, 82, "away");
      o += slot(row.home, 258, top + 54, 380, 34, "#0B0B0C") + slot(row.away, 822, top + 54, 380, 34, "#0B0B0C");
      o += letters("VS", 540, top + 46, { font: "Archivo Black", size: 36, fill: "#FFFFFF", anchor: "middle" });
      o += slot([row.date, row.time].filter(Boolean).join(" "), 540, top + 72, 74, 15, "#FFFFFF", "Barlow Condensed SemiBold");
    }
    return o + sponsorBox(c, l.brand, 22, 1000, 63, 62);
  },
};

const TABLE_COLS: Array<[number, number, (t: TableGraphic["rows"][number]) => string]> = [
  [54.8, 74.2, (t) => String(t.position)], [129.5, 307.1, (t) => t.team], [436.7, 74.2, (t) => String(t.played)],
  [510.8, 74.2, (t) => String(t.won)], [585.1, 74.2, (t) => String(t.drawn)], [659.4, 74.2, (t) => String(t.lost)],
  [733.7, 74.2, (t) => (t.goalsFor ?? "").toString()], [808, 74.2, (t) => (t.goalsAgainst ?? "").toString()],
  [882.3, 74.2, (t) => (t.goalDifference > 0 ? `+${t.goalDifference}` : String(t.goalDifference))], [956.5, 74.2, (t) => String(t.points)],
];

/** A cut-corner pill like the design's (13px chamfer). */
function pill(x: number, y: number, w: number, h: number, fill: string): string {
  const k = 13;
  return `<path d="M${r(x + k)} ${r(y)}H${r(x + w - k)}L${r(x + w)} ${r(y + k)}V${r(y + h - k)}L${r(x + w - k)} ${r(y + h)}H${r(x + k)}L${r(x)} ${r(y + h - k)}V${r(y + k)}Z" fill="${fill}"/>`;
}

export const systonTable: Template = {
  file: "table.jpg", ...SQUARE,
  draw(c: Canvas, g: Graphic) {
    const t = g as TableGraphic;
    let o = slot(t.competition, 540, 333, 640, 32, "#E0DDE0");
    // Ten rows fit: the top ten, or ten around us if we're lower down
    const us = t.rows.findIndex((row) => row.isUs);
    const start = t.rows.length <= 10 || us < 10 ? 0 : Math.min(us - 5, t.rows.length - 10);
    t.rows.slice(start, start + 10).forEach((row, i) => {
      const top = 419 + i * 52.49;
      const fill = row.isUs ? "#FFFFFF" : PILL;
      for (const [x, w, value] of TABLE_COLS) {
        o += pill(x + 0.5, top, w - 1, 47.8, fill);
        const wide = w > 100;
        o += text(value(row).toUpperCase(), wide ? x + 16 : x + w / 2, top + 34, { font: wide ? NAME_FONT : NUMBER_FONT, size: wide ? 28 : 26, fill: PILL_INK, anchor: wide ? "start" : "middle", maxWidth: w - 20, minSize: 14 });
      }
    });
    return o + sponsorBox(c, t.brand, 16, 985, 81, 79);
  },
};

export const systonLineup: Template = {
  file: "lineup.jpg", ...SQUARE,
  draw(c: Canvas, g: Graphic) {
    const l = g as LineupGraphic;
    let o = slot(l.brand.clubName, 440, 116, 600, 52, "#FFFFFF");
    const opp = l.home.isUs ? l.away.name : l.home.name;
    o += slot(`V ${opp}`, 415, 356, 460, 44, "#FFFFFF") + slot(l.date ?? "", 750, 356, 230, 44, "#FFFFFF");
    const pitch = Math.min(55.3, 608 / Math.max(l.players.length, 1));
    l.players.slice(0, 11).forEach((p, i) => {
      const y = 470 + i * pitch;
      o += text(p.number != null ? `${p.number}.` : "", 300, y, { font: NAME_FONT, size: 40, fill: "#FFFFFF", anchor: "end" });
      o += text(p.name.toUpperCase(), 319, y, { font: NAME_FONT, size: 40, fill: "#FFFFFF", maxWidth: 320, minSize: 22, letterSpacing: 1 });
    });
    l.subs.slice(0, 4).forEach((name, i) => { o += text(name.toUpperCase(), 690, 812 + i * 54, { font: NAME_FONT, size: 38, fill: "#FFFFFF", maxWidth: 360, minSize: 20 }); });
    return o;
  },
};

export const systonLeaders: Template = {
  file: "stats.jpg", ...SQUARE,
  draw(_c: Canvas, g: Graphic) {
    const s = g as LeadersGraphic;
    const col = (label: string) => s.columns.findIndex((x) => x.toUpperCase().startsWith(label));
    const [goals, assists, apps] = [col("GOAL"), col("ASSIST"), col("APP")];
    let o = "";
    s.rows.slice(0, 15).forEach((row, i) => {
      const y = 350 + i * 45;
      const v = (k: number) => (k >= 0 ? String(row.values[k]) : "–");
      o += text(row.name.toUpperCase(), 130, y, { font: NAME_FONT, size: 33, fill: "#FFFFFF", maxWidth: 250, minSize: 18, letterSpacing: 1 });
      o += text(v(apps), 442, y, { font: NAME_FONT, size: 33, fill: "#FFFFFF", anchor: "middle" });
      o += text(v(assists), 623, y, { font: NAME_FONT, size: 33, fill: "#FFFFFF", anchor: "middle" });
      o += text(v(goals), 823, y, { font: NAME_FONT, size: 33, fill: "#FFFFFF", anchor: "middle" });
    });
    return o;
  },
};

export const systonQuote: Template = {
  file: "quote.jpg", ...SQUARE,
  draw(_c: Canvas, g: Graphic) {
    const q = g as QuoteGraphic;
    const { lines, size } = wrap(`“${q.text}”`.toUpperCase(), NUMBER_FONT, 64, 30, 600, 7);
    let y = 440 - ((lines.length - 1) * size * 1.15) / 2;
    let o = "";
    for (const line of lines) { o += text(line, 540, y, { font: NUMBER_FONT, size, fill: "#FFFFFF", anchor: "middle", letterSpacing: 1 }); y += size * 1.15; }
    if (q.author) o += text(`— ${q.author.toUpperCase()}`, 540, y + 30, { font: NAME_FONT, size: 30, fill: "#FFFFFF", anchor: "middle", letterSpacing: 2, maxWidth: 600, minSize: 18 });
    return o;
  },
};

