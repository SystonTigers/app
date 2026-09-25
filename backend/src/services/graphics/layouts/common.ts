/** Pieces most layouts share: header, footer, score panel and team columns. */
import { badge, containImage, hasImage, rect, roundRect, text, type Canvas } from "../svg";
import type { Palette, Theme } from "../theme";
import { measure } from "../text";
import { GRAPHIC_HEIGHT as H, GRAPHIC_WIDTH as W, type Graphic, type TeamSide } from "../types";

export const MARGIN = 64;

export interface DrawContext {
  c: Canvas;
  t: Theme;
  p: Palette;
  watermark: boolean;
}

/** Club badge and name top-left, optional pill (minute, date) top-right. */
export function header(d: DrawContext, g: Graphic, pill: string | null): string {
  const { c, t, p } = d;
  let out = "";
  let x = MARGIN;
  if (hasImage(c, g.brand.badgeUrl)) {
    out += containImage(c, g.brand.badgeUrl, MARGIN, 52, 76, 76);
    x += 96;
  }
  const pillW = pill ? measure(pill, t.fonts.display, 42) + 44 : 0;
  out += text(g.brand.clubName.toUpperCase(), x, 104, { font: t.fonts.strong, size: 40, fill: p.ink, letterSpacing: 1, maxWidth: W - x - MARGIN - pillW - 24, minSize: 26 });
  if (pill) {
    out += roundRect(W - MARGIN - pillW, 60, pillW, 62, 31, p.accent);
    out += text(pill, W - MARGIN - pillW / 2, 108, { font: t.fonts.display, size: 42, fill: p.accentInk, anchor: "middle" });
  }
  return out;
}

/** Competition bottom-left, sponsor bottom-right, and the Boost Huddle credit. */
export function footer(d: DrawContext, g: Graphic): string {
  const { c, t, p } = d;
  let out = "";
  const y = H - (d.watermark ? 78 : 56);
  let sponsorW = 0;
  if (hasImage(c, g.brand.sponsorLogoUrl)) {
    sponsorW = 200;
    out += text("SPONSORED BY", W - MARGIN - sponsorW - 16, y + 2, { font: t.fonts.body, size: 20, fill: p.muted, anchor: "end", letterSpacing: 2 });
    out += roundRect(W - MARGIN - sponsorW, y - 58, sponsorW, 80, 10, "#FFFFFF");
    out += containImage(c, g.brand.sponsorLogoUrl, W - MARGIN - sponsorW + 10, y - 52, sponsorW - 20, 68);
    sponsorW += 190;
  } else if (g.brand.sponsorName) {
    const label = `SPONSORED BY ${g.brand.sponsorName.toUpperCase()}`;
    out += text(label, W - MARGIN, y, { font: t.fonts.body, size: 24, fill: p.muted, anchor: "end", letterSpacing: 1, maxWidth: 520, minSize: 16 });
    sponsorW = Math.min(520, measure(label, t.fonts.body, 24)) + 24;
  }
  if (g.footer) {
    out += text(g.footer.toUpperCase(), MARGIN, y, { font: t.fonts.body, size: 26, fill: p.muted, letterSpacing: 2, maxWidth: W - 2 * MARGIN - sponsorW, minSize: 16 });
  }
  if (d.watermark) {
    out += text("MADE WITH BOOST HUDDLE", W / 2, H - 26, { font: t.fonts.body, size: 20, fill: p.muted, anchor: "middle", letterSpacing: 3, opacity: 0.7 });
  }
  return out;
}

/** Height the footer needs so content can stop above it. */
export function footerTop(d: DrawContext): number {
  return H - (d.watermark ? 160 : 140);
}

/**
 * Both badges and the score (or "V") in the pack's panel, centred at y.
 * Returns the SVG and the panel's bottom edge.
 */
export function scorePanel(d: DrawContext, home: TeamSide, away: TeamSide, top: number, showScore: boolean, height = 210): { svg: string; bottom: number } {
  const { c, t, p } = d;
  const w = W - 2 * MARGIN - 40;
  const x = (W - w) / 2;
  const tile = height - 36;
  let out = t.scorePanel(c, x, top, w, height, p);
  const cy = top + height / 2;
  for (const [side, cx] of [[home, x + 18 + tile / 2], [away, x + w - 18 - tile / 2]] as const) {
    if (t.badgeTiles) out += roundRect(cx - tile / 2, cy - tile / 2, tile, tile, 10, "#FFFFFF");
    out += badge(c, side.badgeUrl, side.name, cx, cy, t.badgeTiles ? tile - 24 : tile, p.bg === "#FFFFFF" ? p.accent : "#1E2328", t.fonts.display);
  }
  const middle = showScore ? `${home.score ?? 0}-${away.score ?? 0}` : "V";
  const room = w - 2 * (tile + 36) - 24;
  out += text(middle, W / 2, cy + height * 0.26, { font: t.fonts.display, size: Math.round(height * 0.74), fill: p.scoreInk, anchor: "middle", maxWidth: room, minSize: 60, letterSpacing: showScore ? 4 : 0 });
  return { svg: out, bottom: top + height };
}

/** Team names (and our scorers with minutes) in two columns under the panel. */
export function teamColumns(d: DrawContext, home: TeamSide, away: TeamSide, top: number, maxBottom: number): string {
  const { t, p } = d;
  const colW = (W - 2 * MARGIN) / 2 - 40;
  let out = rect(W / 2 - 2, top + 8, 4, Math.min(maxBottom - top - 8, 150), p.accent);
  for (const [side, cx] of [[home, MARGIN + colW / 2 + 10], [away, W - MARGIN - colW / 2 - 10]] as const) {
    let y = top + 50;
    out += text(side.name.toUpperCase(), cx, y, { font: t.fonts.strong, size: 40, fill: p.ink, anchor: "middle", maxWidth: colW, minSize: 24, letterSpacing: 1 });
    for (const line of side.scorers.slice(0, 4)) {
      y += 40;
      if (y > maxBottom) break;
      out += text(line.toUpperCase(), cx, y, { font: t.fonts.body, size: 34, fill: p.muted, anchor: "middle", maxWidth: colW, minSize: 18, letterSpacing: 1 });
    }
    if (side.scorers.length > 4 && y + 40 <= maxBottom) {
      out += text(`+${side.scorers.length - 4} MORE`, cx, y + 40, { font: t.fonts.body, size: 26, fill: p.muted, anchor: "middle" });
    }
  }
  return out;
}

/** One small football for brace / hat-trick rows. */
export function football(cx: number, cy: number, radius: number): string {
  const patch = radius * 0.38;
  const pts: string[] = [];
  const seams: string[] = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    pts.push(`${(cx + patch * Math.cos(a)).toFixed(1)},${(cy + patch * Math.sin(a)).toFixed(1)}`);
    seams.push(`<line x1="${(cx + patch * Math.cos(a)).toFixed(1)}" y1="${(cy + patch * Math.sin(a)).toFixed(1)}" x2="${(cx + radius * Math.cos(a)).toFixed(1)}" y2="${(cy + radius * Math.sin(a)).toFixed(1)}" stroke="#0B0B0C" stroke-width="${Math.max(2, radius * 0.08).toFixed(1)}"/>`);
  }
  return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="#FFFFFF"/><polygon points="${pts.join(" ")}" fill="#0B0B0C"/>${seams.join("")}`;
}
