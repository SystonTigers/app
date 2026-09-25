/** Match layouts: moments (goals, cards, subs), scores, fixtures and line-ups. */
import { rect, roundRect, text } from "../svg";
import { measure, wrap } from "../text";
import { GRAPHIC_WIDTH as W, type FixtureGraphic, type LineupGraphic, type MomentGraphic, type ScoreGraphic } from "../types";
import { badge } from "../svg";
import { football, footerTop, MARGIN, scorePanel, teamColumns, type DrawContext } from "./common";

const CARD_COLOURS = { yellow: "#FFD21F", red: "#E5252A" };

export function drawMoment(d: DrawContext, g: MomentGraphic): string {
  const { c, t, p } = d;
  const bottom = footerTop(d);
  const hasPhoto = Boolean(g.photoUrl && c.images.get(g.photoUrl));
  let out = "";
  let y: number;
  if (hasPhoto) {
    out += t.photo(c, g.photoUrl as string, MARGIN, 160, W - 2 * MARGIN, 560, p);
    y = 860;
  } else {
    // Centre the headline block between the header and the score strip
    const block = 240 + (g.playerName ? 130 : 0) + (g.secondary ? 64 : 0) + ((g.goalCount ?? 0) >= 2 ? 100 : 0) + (g.card ? 200 : 0);
    y = 160 + (g.card ? 200 : 0) + Math.max(0, (bottom - 200 - 160 - block) / 2) + 210;
  }
  if (g.card) {
    const cardH = hasPhoto ? 0 : 170;
    if (cardH) {
      out += `<g transform="rotate(-8 ${W / 2} ${y - 260})">${roundRect(W / 2 - 60, y - 260 - cardH / 2, 120, cardH, 12, CARD_COLOURS[g.card])}</g>`;
    }
  }
  const head = t.headline(c, g.headline, W / 2, y, W - 2 * MARGIN, hasPhoto ? 170 : 240, p);
  out += head.svg;
  if (g.playerName) {
    y += hasPhoto ? 96 : 130;
    out += text(g.playerName.toUpperCase(), W / 2, y, { font: t.fonts.strong, size: hasPhoto ? 84 : 110, fill: p.ink, anchor: "middle", maxWidth: W - 2 * MARGIN, minSize: 44, letterSpacing: 1 });
  }
  if (g.secondary) {
    y += 64;
    out += text(g.secondary.toUpperCase(), W / 2, y, { font: t.fonts.body, size: 44, fill: p.muted, anchor: "middle", maxWidth: W - 2 * MARGIN, minSize: 24, letterSpacing: 2 });
  }
  const goals = Math.min(g.goalCount ?? 0, 10);
  if (goals >= 2) {
    const radius = Math.min(34, (W - 2 * MARGIN) / goals / 2 - 8);
    const total = goals * radius * 2 + (goals - 1) * 16;
    y += 30 + radius;
    for (let i = 0; i < goals; i++) out += football(W / 2 - total / 2 + radius + i * (radius * 2 + 16), y, radius);
    y += radius;
  }
  // Score strip: small badges either side of the score
  const stripTop = Math.max(y + 40, bottom - 170);
  out += scorePanel(d, g.home, g.away, stripTop, true, 150).svg;
  return out;
}

export function drawScore(d: DrawContext, g: ScoreGraphic): string {
  const { c, t, p } = d;
  const bottom = footerTop(d);
  const lines = Math.min(4, Math.max(g.home.scorers.length, g.away.scorers.length));
  const total = 210 + (g.detail ? 90 : 50) + 240 + 70 + 40 * lines;
  const top = 160 + Math.max(0, (bottom - 160 - total) / 2);
  const baseline = top + 190;
  let out = t.headline(c, g.headline, W / 2, baseline, W - 2 * MARGIN, 220, p).svg;
  if (g.detail) {
    out += text(g.detail.toUpperCase(), W / 2, baseline + 74, { font: t.fonts.strong, size: 40, fill: p.accent, anchor: "middle", maxWidth: W - 2 * MARGIN, minSize: 24, letterSpacing: 3 });
  }
  const panel = scorePanel(d, g.home, g.away, baseline + (g.detail ? 120 : 70), g.showScore, 240);
  out += panel.svg;
  out += teamColumns(d, g.home, g.away, panel.bottom + 20, bottom);
  return out;
}

export function drawFixture(d: DrawContext, g: FixtureGraphic): string {
  const { c, t, p } = d;
  let out = "";
  let badgeY: number;
  if (g.countdown !== null) {
    const n = String(g.countdown);
    out += text(n, W / 2, 560, { font: t.fonts.display, size: 440, fill: p.accent, anchor: "middle" });
    out += t.headline(c, g.headline, W / 2, 680, W - 2 * MARGIN, 110, p).svg;
    badgeY = 830;
  } else {
    out += t.headline(c, g.headline, W / 2, 360, W - 2 * MARGIN, 200, p).svg;
    if (g.tagline) {
      out += text(g.tagline.toUpperCase(), W / 2, 440, { font: t.fonts.strong, size: 42, fill: p.accent, anchor: "middle", maxWidth: W - 2 * MARGIN, minSize: 24, letterSpacing: 3 });
    }
    badgeY = 640;
  }
  const size = g.countdown !== null ? 170 : 250;
  const hx = W / 2 - 280;
  const ax = W / 2 + 280;
  out += badge(c, g.home.badgeUrl, g.home.name, hx, badgeY, size, "#1E2328", t.fonts.display);
  out += badge(c, g.away.badgeUrl, g.away.name, ax, badgeY, size, "#1E2328", t.fonts.display);
  out += text("VS", W / 2, badgeY + 30, { font: t.fonts.display, size: 90, fill: p.accent, anchor: "middle" });
  const nameY = badgeY + size / 2 + 60;
  out += text(g.home.name.toUpperCase(), hx, nameY, { font: t.fonts.strong, size: 40, fill: p.ink, anchor: "middle", maxWidth: 400, minSize: 22 });
  out += text(g.away.name.toUpperCase(), ax, nameY, { font: t.fonts.strong, size: 40, fill: p.ink, anchor: "middle", maxWidth: 400, minSize: 22 });
  // Date · kick-off · venue
  const cells = [["DATE", g.date], ["KICK-OFF", g.time ?? "TBC"], ["VENUE", g.venue ?? "TBC"]] as const;
  const top = nameY + 40;
  const h = 130;
  out += t.row(c, MARGIN, top, W - 2 * MARGIN, h, p, false);
  const cellW = (W - 2 * MARGIN) / 3;
  cells.forEach(([label, value], i) => {
    const cx = MARGIN + cellW * i + cellW / 2;
    out += text(label, cx, top + 46, { font: t.fonts.body, size: 24, fill: p.muted, anchor: "middle", letterSpacing: 3 });
    out += text(value.toUpperCase(), cx, top + 100, { font: t.fonts.strong, size: 40, fill: p.panelInk, anchor: "middle", maxWidth: cellW - 30, minSize: 20 });
    if (i > 0) out += rect(MARGIN + cellW * i - 1, top + 22, 2, h - 44, p.line);
  });
  return out;
}

export function drawLineup(d: DrawContext, g: LineupGraphic): string {
  const { c, t, p } = d;
  const bottom = footerTop(d);
  let out = t.headline(c, g.headline, W / 2, 290, W - 2 * MARGIN, 170, p).svg;
  const opponent = g.home.isUs ? g.away.name : g.home.name;
  const sub = [`V ${opponent}`, g.date, g.time].filter(Boolean).join("  ·  ");
  out += text(sub.toUpperCase(), W / 2, 360, { font: t.fonts.strong, size: 38, fill: p.accent, anchor: "middle", maxWidth: W - 2 * MARGIN, minSize: 22, letterSpacing: 2 });
  const subsText = g.subs.length ? g.subs.join(", ").toUpperCase() : "";
  const subsBlock = subsText ? wrap(subsText, t.fonts.body, 32, 22, W - 2 * MARGIN - 130, 2) : null;
  const listTop = 410;
  const listBottom = bottom - (subsBlock ? 40 + subsBlock.lines.length * (subsBlock.size + 8) : 10);
  const cols = g.players.length > 6 ? 2 : 1;
  const rows = Math.ceil(g.players.length / cols);
  const rowH = Math.min(cols === 1 ? 110 : 104, (listBottom - listTop) / Math.max(rows, 1));
  const colW = (W - 2 * MARGIN) / cols;
  g.players.forEach((player, i) => {
    const col = Math.floor(i / rows);
    const row = i % rows;
    const x = MARGIN + col * colW + (cols === 1 ? colW / 2 - 300 : 0);
    const y = listTop + row * rowH;
    out += t.row(c, x, y + 6, (cols === 1 ? 600 : colW - 16), rowH - 12, p, false);
    const num = player.number !== null ? String(player.number) : "–";
    out += text(num, x + 58, y + rowH * 0.68, { font: t.fonts.display, size: Math.round(rowH * 0.52), fill: p.accent, anchor: "middle" });
    out += text(player.name.toUpperCase(), x + 110, y + rowH * 0.66, { font: t.fonts.strong, size: Math.round(rowH * 0.44), fill: p.panelInk, maxWidth: (cols === 1 ? 600 : colW - 16) - 130, minSize: 18, letterSpacing: 1 });
  });
  if (subsBlock) {
    let y = listBottom + 30 + subsBlock.size;
    out += text("SUBS", MARGIN, y, { font: t.fonts.display, size: subsBlock.size + 4, fill: p.accent });
    const x = MARGIN + measure("SUBS", t.fonts.display, subsBlock.size + 4) + 24;
    for (const line of subsBlock.lines) {
      out += text(line, x, y, { font: t.fonts.body, size: subsBlock.size, fill: p.ink, letterSpacing: 1 });
      y += subsBlock.size + 8;
    }
  }
  return out;
}
