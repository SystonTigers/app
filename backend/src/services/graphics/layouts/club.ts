/** Club layouts: fixture/result lists, league table, player spotlights, quotes and photos. */
import { badge, hasImage, containImage, rect, text } from "../svg";
import { inkOn, wrap } from "../text";
import { GRAPHIC_WIDTH as W, type ListGraphic, type PersonGraphic, type PhotoGraphic, type QuoteGraphic, type TableGraphic } from "../types";
import { footerTop, MARGIN, type DrawContext } from "./common";

const OUTCOME_COLOURS = { W: "#22C55E", D: "#A3A3A3", L: "#EF4444" };

export function drawList(d: DrawContext, g: ListGraphic): string {
  const { c, t, p } = d;
  const bottom = footerTop(d);
  let out = t.headline(c, g.headline, W / 2, 290, W - 2 * MARGIN, 190, p).svg;
  if (g.subtitle) {
    out += text(g.subtitle.toUpperCase(), W / 2, 360, { font: t.fonts.strong, size: 38, fill: p.accent, anchor: "middle", maxWidth: W - 2 * MARGIN, minSize: 22, letterSpacing: 3 });
  }
  const rows = g.rows.slice(0, 6);
  const top = 410;
  const slot = Math.min(190, (bottom - top) / Math.max(rows.length, 1));
  const barH = Math.min(96, slot - 50);
  const gap = 150;
  const barW = (W - 2 * MARGIN - gap) / 2;
  rows.forEach((row, i) => {
    const y = top + i * slot + Math.max(0, (bottom - top - rows.length * slot) / 2 - 20);
    const when = [row.date, g.mode === "fixtures" ? row.time : null, g.mode === "fixtures" ? row.venue : null].filter(Boolean).join("  ·  ");
    out += text(when.toUpperCase(), W / 2, y + 30, { font: t.fonts.body, size: 26, fill: p.muted, anchor: "middle", maxWidth: W - 2 * MARGIN, minSize: 16, letterSpacing: 2 });
    const barY = y + 44;
    out += t.bar(c, MARGIN, barY, barW, barH, p, "left");
    out += t.bar(c, W - MARGIN - barW, barY, barW, barH, p, "right");
    const nameSize = Math.round(barH * 0.42);
    const badgeSize = barH - 20;
    for (const [name, url, x, align] of [[row.home, row.homeBadgeUrl, MARGIN, "left"], [row.away, row.awayBadgeUrl, W - MARGIN - barW, "right"]] as const) {
      const hasBadge = hasImage(c, url);
      const bx = align === "left" ? x + 20 : x + barW - 20 - badgeSize;
      if (hasBadge) out += containImage(c, url, bx, barY + 10, badgeSize, badgeSize);
      const room = barW - 50 - (hasBadge ? badgeSize + 16 : 0);
      const tx = align === "left" ? x + 26 + (hasBadge ? badgeSize + 16 : 0) : x + barW - 26 - (hasBadge ? badgeSize + 16 : 0);
      out += text(name.toUpperCase(), tx, barY + barH / 2 + nameSize * 0.36, { font: t.fonts.strong, size: nameSize, fill: p.accentInk, anchor: align === "left" ? "start" : "end", maxWidth: room, minSize: 16 });
    }
    const middle = g.mode === "results" && row.homeScore !== null && row.awayScore !== null ? `${row.homeScore}-${row.awayScore}` : "VS";
    out += text(middle, W / 2, barY + barH / 2 + barH * 0.22, { font: t.fonts.display, size: Math.round(barH * 0.62), fill: p.ink, anchor: "middle", maxWidth: gap - 10, minSize: 24 });
    if (row.outcome) {
      out += `<circle cx="${W / 2}" cy="${barY + barH + 22}" r="16" fill="${OUTCOME_COLOURS[row.outcome]}"/>`;
      out += text(row.outcome, W / 2, barY + barH + 30, { font: t.fonts.strong, size: 22, fill: "#FFFFFF", anchor: "middle" });
    }
  });
  return out;
}

export function drawTable(d: DrawContext, g: TableGraphic): string {
  const { c, t, p } = d;
  const bottom = footerTop(d);
  let out = t.headline(c, g.headline, W / 2, 270, W - 2 * MARGIN, 170, p).svg;
  out += text(g.competition.toUpperCase(), W / 2, 336, { font: t.fonts.strong, size: 34, fill: p.accent, anchor: "middle", maxWidth: W - 2 * MARGIN, minSize: 20, letterSpacing: 2 });
  const rows = g.rows.slice(0, 14);
  const cols = [["P", 600], ["W", 668], ["D", 736], ["L", 804], ["GD", 884], ["PTS", 976]] as const;
  const headY = 400;
  cols.forEach(([label, x]) => { out += text(label, x, headY, { font: t.fonts.body, size: 26, fill: p.muted, anchor: "middle", letterSpacing: 2 }); });
  const top = headY + 18;
  const rowH = Math.min(62, (bottom - top) / Math.max(rows.length, 1));
  rows.forEach((row, i) => {
    const y = top + i * rowH;
    out += t.row(c, MARGIN, y + 3, W - 2 * MARGIN, rowH - 6, p, row.isUs);
    const ink = row.isUs ? p.accentInk : p.panelInk;
    const size = Math.round(rowH * 0.46);
    const base = y + rowH / 2 + size * 0.36;
    out += text(String(row.position), MARGIN + 40, base, { font: t.fonts.display, size, fill: row.isUs ? ink : p.accent, anchor: "middle" });
    out += text(row.team.toUpperCase(), MARGIN + 84, base, { font: t.fonts.strong, size, fill: ink, maxWidth: 440, minSize: 16 });
    const values = [row.played, row.won, row.drawn, row.lost, row.goalDifference > 0 ? `+${row.goalDifference}` : String(row.goalDifference), row.points];
    cols.forEach(([, x], j) => {
      out += text(String(values[j]), x, base, { font: j === 5 ? t.fonts.display : t.fonts.body, size: j === 5 ? size + 2 : size, fill: ink, anchor: "middle" });
    });
  });
  return out;
}

export function drawPerson(d: DrawContext, g: PersonGraphic): string {
  const { c, t, p } = d;
  const bottom = footerTop(d);
  let out = t.headline(c, g.headline, W / 2, 270, W - 2 * MARGIN, 160, p).svg;
  let y: number;
  if (g.photoUrl && hasImage(c, g.photoUrl)) {
    out += t.photo(c, g.photoUrl, W / 2 - 290, 320, 580, 560, p);
    y = 980;
  } else if (hasImage(c, g.brand.badgeUrl)) {
    out += containImage(c, g.brand.badgeUrl, W / 2 - 200, 340, 400, 400);
    y = 880;
  } else {
    out += badge(c, null, g.brand.clubName, W / 2, 540, 360, p.accent, t.fonts.display);
    y = 880;
  }
  out += text(g.playerName.toUpperCase(), W / 2, y, { font: t.fonts.strong, size: 100, fill: p.ink, anchor: "middle", maxWidth: W - 2 * MARGIN, minSize: 44, letterSpacing: 1 });
  if (g.stat) {
    y += 76;
    out += text(g.stat.toUpperCase(), W / 2, Math.min(y, bottom - 50), { font: t.fonts.display, size: 60, fill: p.accent, anchor: "middle", maxWidth: W - 2 * MARGIN, minSize: 28, letterSpacing: 2 });
  }
  if (g.secondary) {
    y += 56;
    out += text(g.secondary.toUpperCase(), W / 2, Math.min(y, bottom), { font: t.fonts.body, size: 36, fill: p.muted, anchor: "middle", maxWidth: W - 2 * MARGIN, minSize: 20, letterSpacing: 2 });
  }
  return out;
}

export function drawQuote(d: DrawContext, g: QuoteGraphic): string {
  const { t, p } = d;
  const bottom = footerTop(d);
  let out = text(g.headline.toUpperCase(), W / 2, 230, { font: t.fonts.strong, size: 40, fill: p.accent, anchor: "middle", letterSpacing: 4, maxWidth: W - 2 * MARGIN });
  out += text("“", MARGIN - 10, 520, { font: t.fonts.display, size: 360, fill: p.accent, opacity: 0.9 });
  const block = wrap(`${g.text}`.toUpperCase(), t.fonts.strong, 92, 44, W - 2 * MARGIN - 110, 6);
  const lineH = block.size * 1.12;
  let y = Math.max(460, (bottom + 300) / 2 - (block.lines.length * lineH) / 2);
  for (const line of block.lines) {
    out += text(line.toUpperCase(), MARGIN + 20, y, { font: t.fonts.strong, size: block.size, fill: p.ink, letterSpacing: 1 });
    y += lineH;
  }
  if (g.author) {
    out += rect(MARGIN + 20, y, 80, 6, p.accent);
    out += text(g.author.toUpperCase(), MARGIN + 20, y + 60, { font: t.fonts.body, size: 38, fill: p.muted, letterSpacing: 3, maxWidth: W - 2 * MARGIN });
  }
  return out;
}

export function drawPhoto(d: DrawContext, g: PhotoGraphic): string {
  const { c, t, p } = d;
  const bottom = footerTop(d);
  let out = t.headline(c, g.headline, W / 2, 250, W - 2 * MARGIN, 150, p).svg;
  const photoBottom = g.caption ? bottom - 90 : bottom - 20;
  if (g.photoUrl && hasImage(c, g.photoUrl)) {
    out += t.photo(c, g.photoUrl, MARGIN, 300, W - 2 * MARGIN, photoBottom - 300, p);
  } else {
    out += t.row(c, MARGIN, 300, W - 2 * MARGIN, photoBottom - 300, p, false);
    out += badge(c, g.brand.badgeUrl, g.brand.clubName, W / 2, (300 + photoBottom) / 2, 300, p.accent, t.fonts.display);
  }
  if (g.caption) {
    out += text(g.caption.toUpperCase(), W / 2, photoBottom + 64, { font: t.fonts.strong, size: 40, fill: p.ink, anchor: "middle", maxWidth: W - 2 * MARGIN, minSize: 22, letterSpacing: 1 });
  }
  return out;
}

export { inkOn };
