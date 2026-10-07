/**
 * Match day, countdown and postponed posts on the floodlit stadium: league
 * line, a wide headline, both badges with a VS disc, and the date, kick-off
 * and ground (left out when the club hides them).
 */
import { badge, r, text, type Canvas } from "../svg";
import { measure } from "../text";
import type { FixtureGraphic } from "../types";
import { clubColours, letters, mix, shadowFilter } from "./kit";
import { posterFooter, type Frame } from "./poster";
import { stadiumScene } from "./scenes";

/** The biggest size at which `value` fits `width` in Archivo Black. */
function fitWide(value: string, width: number, max: number): number {
  return Math.min(max, (width / (measure(value, "Archivo Black", 100) || 1)) * 100);
}

/** League / competition lines at the top. */
export function leagueLines(g: { footer: string | null; brand: FixtureGraphic["brand"] }, w: number, y: number): string {
  const parts = (g.footer ?? g.brand.clubName).toUpperCase().split(/\s+·\s+/);
  let out = "";
  parts.slice(0, 2).forEach((line, i) => {
    out += text(line, w / 2, y + i * 44, { font: "Barlow Condensed ExtraBold", size: i === 0 ? 40 : 34, fill: "#FFFFFF", anchor: "middle", letterSpacing: 2, maxWidth: w - 160, minSize: 22, opacity: i === 0 ? 1 : 0.85 });
  });
  return out;
}

/** Two badges with a VS disc between them and the team names underneath. */
export function versus(c: Canvas, g: Pick<FixtureGraphic, "home" | "away">, cx: number, cy: number, size: number, accent: string): string {
  const sid = shadowFilter(c, 18, 0.6, 12);
  const gap = size * 1.25;
  let out = "";
  for (const [side, x] of [[g.home, cx - gap], [g.away, cx + gap]] as const) {
    out += `<g filter="url(#${sid})">${badge(c, side.badgeUrl, side.name, x, cy, size, mix("#1B2230", accent, 0.3))}</g>`;
    out += text(side.name.toUpperCase(), x, cy + size / 2 + 62, { font: "Barlow Condensed ExtraBold", size: 40, fill: "#FFFFFF", anchor: "middle", maxWidth: size * 1.6, minSize: 24, letterSpacing: 1 });
  }
  out += `<circle cx="${cx}" cy="${cy}" r="${r(size * 0.2)}" fill="#FFFFFF"/>`;
  out += text("VS", cx, cy + size * 0.075, { font: "Archivo Black", size: Math.round(size * 0.2), fill: "#0B0B0C", anchor: "middle" });
  return out;
}

/** The white info pill: day | date | kick-off, with the ground under it. */
function infoPill(g: FixtureGraphic, w: number, y: number, accent: string): string {
  const cells = [g.date.split(" ")[0], g.date.split(" ").slice(1).join(" "), g.time ?? ""].filter(Boolean);
  const pw = w - 260;
  const x = (w - pw) / 2;
  let out = `<rect x="${r(x)}" y="${r(y)}" width="${r(pw)}" height="104" rx="22" fill="#FFFFFF"/>`;
  const cell = pw / cells.length;
  cells.forEach((value, i) => {
    out += text(value.toUpperCase(), x + cell * i + cell / 2, y + 68, { font: "Barlow Condensed ExtraBold", size: 46, fill: mix(accent, "#0B0B0C", 0.25), anchor: "middle", maxWidth: cell - 30, minSize: 24, letterSpacing: 1 });
    if (i) out += `<rect x="${r(x + cell * i - 2)}" y="${r(y + 18)}" width="4" height="68" fill="${accent}" opacity="0.6"/>`;
  });
  if (g.venue) {
    out += text(g.venue.toUpperCase(), w / 2, y + 168, { font: "Barlow Condensed ExtraBold", size: 40, fill: "#FFFFFF", anchor: "middle", letterSpacing: 2, maxWidth: w - 200, minSize: 24 });
  }
  return out;
}

export function studioFixture(c: Canvas, g: FixtureGraphic, f: Frame): string {
  const k = clubColours(g.brand);
  const { w, h } = f;
  const story = h > w * 1.5;
  let out = stadiumScene(c, k, w, h, `${g.kind}:${g.date}`);
  const top = story ? 150 : 90;
  out += leagueLines(g, w, top);
  let y = top + 110;

  if (g.countdown !== null) {
    // A giant number over outlined DAYS and solid TO GO
    const n = String(g.countdown);
    const word = g.countdown === 1 ? "DAY" : "DAYS";
    const ws = fitWide(word, w - 200, 230);
    out += letters(word, w / 2, y + ws * 0.95, { font: "Archivo Black", size: ws, fill: "none", stroke: "#FFFFFF", strokeWidth: 6, anchor: "middle" });
    out += letters(n, w / 2, y + ws * 1.35, { font: "Archivo Black", size: ws * 2.2, fill: "#FFFFFF", anchor: "middle", opacity: 0.96 });
    const ts = fitWide("TO GO", w - 120, 250);
    out += letters("TO GO", w / 2 + 6, y + ws * 1.35 + ts * 0.85 + 6, { font: "Archivo Black", size: ts, fill: k.pop, anchor: "middle", opacity: 0.6 });
    out += letters("TO GO", w / 2, y + ws * 1.35 + ts * 0.85, { font: "Archivo Black", size: ts, fill: "#FFFFFF", anchor: "middle" });
    y += ws * 1.35 + ts * 0.85 + (story ? 120 : 40);
  } else {
    // MATCH DAY / MATCH POSTPONED: first word solid, the rest outlined in the club colour
    const words = g.headline.toUpperCase().split(/\s+/);
    const first = words[0];
    const rest = words.slice(1).join(" ");
    const one = rest && measure(g.headline.toUpperCase(), "Archivo Black", 100) * 1.4 < w - 140;
    if (one) {
      const s = fitWide(`${first} ${rest}`, w - 140, 150);
      const fw = measure(`${first} `, "Archivo Black", s);
      const total = measure(`${first} ${rest}`, "Archivo Black", s);
      out += letters(first, w / 2 - total / 2, y + s, { font: "Archivo Black", size: s, fill: "#FFFFFF" });
      out += letters(rest, w / 2 - total / 2 + fw, y + s, { font: "Archivo Black", size: s, fill: "none", stroke: k.pop, strokeWidth: 4 });
      y += s + 30;
    } else {
      const s1 = fitWide(first, w - 160, 170);
      out += letters(first, w / 2, y + s1, { font: "Archivo Black", size: s1, fill: "#FFFFFF", anchor: "middle" });
      y += s1 + 10;
      if (rest) {
        const s2 = fitWide(rest, w - 160, 170);
        out += letters(rest, w / 2, y + s2, { font: "Archivo Black", size: s2, fill: "none", stroke: k.pop, strokeWidth: 5, anchor: "middle" });
        y += s2 + 10;
      }
    }
    if (g.tagline && g.kind === "postponed") {
      y += 40;
      out += text(g.tagline.toUpperCase(), w / 2, y, { font: "Barlow Condensed ExtraBold", size: 40, fill: k.pop, anchor: "middle", letterSpacing: 3, maxWidth: w - 200, minSize: 24 });
    }
    y += story ? 160 : 70;
  }

  // Badges and details sit in the lower part of the page, below the headline
  const size = story ? 260 : 200;
  const details = g.kind !== "postponed" ? 104 + (g.venue ? 70 : 0) + 90 : 0;
  const blockH = size + 110 + details;
  const floor = h - (story ? 300 : 190);
  const start = Math.max(y, floor - blockH);
  out += versus(c, g, w / 2, start + size / 2, size, k.main);
  if (g.kind !== "postponed") out += infoPill(g, w, start + size + 110, k.main);
  return out + posterFooter(c, g, f, "#FFFFFF");
}
