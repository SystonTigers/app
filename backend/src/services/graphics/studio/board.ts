/**
 * Dark poster layouts: half time / full time (torn club-colour edges and a
 * giant condensed title), results and fixtures lists with slanted team bars,
 * the league table and the top scorers board.
 */
import { containImage, hasImage, r, rect, text, type Canvas } from "../svg";
import { measure } from "../text";
import type { Brand, LeadersGraphic, ListGraphic, ScoreGraphic, TableGraphic } from "../types";
import { brushStroke, clubColours, crestDisc, grain, letters, mix, randomFor, shadowFilter, tornPanel, vignette, type ClubColours } from "./kit";
import { leagueLines } from "./fixture";
import { posterFooter, scoreBar, type Frame } from "./poster";
import { darkScene, stadiumScene } from "./scenes";

const fitWide = (v: string, width: number, max: number) => Math.min(max, (width / (measure(v, "Archivo Black", 100) || 1)) * 100);
const fitTall = (v: string, width: number, max: number, scaleX = 1) => Math.min(max, (width / ((measure(v, "Anton", 100) || 1) * scaleX)) * 100);

/** Crest top-centre, league lines, a wide white title and a subtitle in the club colour. Returns the SVG and where content can start. */
function boardHeader(c: Canvas, g: { brand: Brand; footer: string | null; headline: string }, k: ClubColours, w: number, story: boolean, subtitle: string | null): { svg: string; y: number } {
  let y = story ? 110 : 60;
  let out = "";
  if (hasImage(c, g.brand.badgeUrl)) {
    out += containImage(c, g.brand.badgeUrl, w / 2 - 55, y, 110, 110);
    y += 140;
  }
  out += leagueLines(g, w, y + 10);
  y += (g.footer?.includes("·") ? 70 : 40) + 20;
  const s = fitWide(g.headline.toUpperCase(), w - 220, story ? 150 : 120);
  out += letters(g.headline.toUpperCase(), w / 2, y + s, { font: "Archivo Black", size: s, fill: "#FFFFFF", anchor: "middle" });
  y += s + 20;
  if (subtitle) {
    out += text(subtitle.toUpperCase(), w / 2, y + 48, { font: "Barlow Condensed ExtraBold", size: 52, fill: k.pop, anchor: "middle", letterSpacing: 2, maxWidth: w - 200, minSize: 28 });
    y += 80;
  }
  return { svg: out, y: y + 30 };
}

/** A slanted club-colour bar holding a team name (leans left or right). */
function teamBar(x: number, y: number, w: number, h: number, name: string, k: ClubColours, side: "left" | "right", us: boolean): string {
  const s = h * 0.45;
  const pts = side === "left"
    ? `${r(x + s)},${r(y)} ${r(x + w)},${r(y)} ${r(x + w - s)},${r(y + h)} ${r(x)},${r(y + h)}`
    : `${r(x + s)},${r(y)} ${r(x + w)},${r(y)} ${r(x + w - s)},${r(y + h)} ${r(x)},${r(y + h)}`;
  const fill = us ? k.main : "#FFFFFF";
  const ink = us ? k.onMain : "#0B0B0C";
  return `<polygon points="${pts}" fill="${fill}"/>` + text(name.toUpperCase(), x + w / 2, y + h * 0.66, { font: "Barlow Condensed ExtraBold", size: h * 0.5, fill: ink, anchor: "middle", maxWidth: w - s * 2 - 16, minSize: 18, letterSpacing: 1 });
}

/** HALF TIME / FULL TIME / KICK OFF / CORRECTION. */
export function studioScore(c: Canvas, g: ScoreGraphic, f: Frame): string {
  const k = clubColours(g.brand);
  const { w, h } = f;
  const story = h > w * 1.5;
  const rand = randomFor(g.kind, g.home.score, g.away.score);
  let out: string;
  if (g.kind === "kick_off") {
    out = stadiumScene(c, k, w, h, `${g.kind}:${g.home.name}`);
  } else {
    out = rect(0, 0, w, h, k.dark);
    // Torn club-colour edges down both sides, brush sweep across the top
    out += tornPanel(c, -80, -40, 170 + rand() * 50, h + 80, k.main, Math.floor(rand() * 90));
    out += tornPanel(c, w - 90 - rand() * 50, -40, 200, h + 80, k.main, Math.floor(rand() * 90));
    out += brushStroke(c, `M ${r(w * 0.1)} ${r(h * 0.05)} C ${r(w * 0.4)} ${r(h * 0.02)}, ${r(w * 0.7)} ${r(h * 0.07)}, ${r(w + 40)} ${r(h * 0.03)}`, 80, k.main, 21 + Math.floor(rand() * 50), 0.9);
    out += crestDisc(c, g.brand, w - 150, story ? 230 : 170, story ? 160 : 135, k.main, 1, -14);
    out += vignette(c, w, h, 0.4);
  }
  const head = g.headline.toUpperCase();
  const tall = g.kind !== "kick_off";
  const top = tall ? (story ? 420 : 330) : (story ? 300 : 210);
  let y: number;
  if (tall) {
    const s = fitTall(head, w - 300, story ? 380 : 300, 0.86);
    out += letters(head, w / 2, top + s * 0.86, { font: "Anton", size: s, fill: "#FFFFFF", anchor: "middle", scaleX: 0.86 });
    y = top + s * 0.86 + 40;
  } else {
    // KICK OFF: italic wide type, one word per line
    const words = head.split(/\s+/);
    y = top - 40;
    for (const word of words) {
      const s = fitWide(word, w - 300, story ? 230 : 190);
      out += letters(word, w / 2, y + s, { font: "Archivo Black", size: s, fill: "#FFFFFF", anchor: "middle", skew: -12 });
      y += s * 0.98;
    }
    y += 30;
  }
  if (g.footer || g.detail) {
    out += text((g.detail ?? g.footer ?? "").toUpperCase(), w / 2, y + 30, { font: "Barlow Condensed ExtraBold", size: 40, fill: g.kind === "kick_off" ? "#FFFFFF" : k.pop, anchor: "middle", letterSpacing: 3, maxWidth: w - 280, minSize: 22 });
    y += 70;
  }
  const barY = Math.max(y + 150, h * (story ? 0.58 : 0.62));
  out += scoreBar(c, g.home, g.away, w / 2, barY, w - 200, k, g.showScore, false, story ? 1.35 : 1.2);
  // Scorers under each side
  const sy = barY + (story ? 170 : 150);
  const colW = (w - 300) / 2;
  for (const [side, cx] of [[g.home, w / 2 - colW / 2 - 20], [g.away, w / 2 + colW / 2 + 20]] as const) {
    let ly = sy;
    out += text(side.name.toUpperCase(), cx, ly, { font: "Barlow Condensed ExtraBold", size: 46, fill: "#FFFFFF", anchor: "middle", maxWidth: colW, minSize: 22, letterSpacing: 1 });
    for (const line of side.scorers.slice(0, 4)) {
      ly += 48;
      out += text(line.toUpperCase(), cx, ly, { font: "Barlow Condensed ExtraBold", size: 38, fill: mix("#FFFFFF", k.main, 0.25), anchor: "middle", maxWidth: colW, minSize: 18 });
    }
  }
  return out + posterFooter(c, g, f, "#FFFFFF") + grain(c, w, h, 0.16);
}

/** This week's (or month's) fixtures or results: slanted team bars with VS or the score. */
export function studioList(c: Canvas, g: ListGraphic, f: Frame): string {
  const k = clubColours(g.brand);
  const { w, h } = f;
  const story = h > w * 1.5;
  let out = darkScene(c, g.brand, k, w, h, `${g.kind}:${g.subtitle}`);
  const head = boardHeader(c, g, k, w, story, g.subtitle);
  out += head.svg;
  const rows = g.rows.slice(0, story ? 8 : 6);
  const bottom = h - (story ? 260 : 190);
  const gap = 22;
  const rowH = Math.min(story ? 130 : 110, (bottom - head.y - gap * (rows.length - 1)) / Math.max(rows.length, 1) - 30);
  const barW = (w - 120 - 170) / 2;
  const blockH = rows.length * (rowH + 34 + gap);
  let y = head.y + 10 + Math.max(0, (bottom - head.y - blockH) / 2.4);
  const sid = shadowFilter(c, 10, 0.45, 6);
  for (const row of rows) {
    out += text(`${row.date}${g.mode === "fixtures" && row.time ? ` · ${row.time}` : ""}${g.mode === "fixtures" && row.venue ? ` · ${row.venue}` : ""}`.toUpperCase(), w / 2, y + 22, { font: "Barlow Condensed SemiBold", size: 24, fill: mix("#FFFFFF", k.main, 0.2), anchor: "middle", letterSpacing: 2, maxWidth: w - 160, minSize: 16 });
    const by = y + 34;
    const usHome = row.home === g.brand.clubName;
    out += `<g filter="url(#${sid})">${teamBar(60, by, barW, rowH, row.home, k, "left", usHome)}${teamBar(w - 60 - barW, by, barW, rowH, row.away, k, "right", !usHome && row.away === g.brand.clubName)}</g>`;
    const mid = g.mode === "results" && row.homeScore !== null ? `${row.homeScore}-${row.awayScore}` : "VS";
    out += letters(mid, w / 2, by + rowH * 0.72, { font: "Archivo Black", size: Math.min(rowH * 0.6, 64), fill: "#FFFFFF", anchor: "middle" });
    y = by + rowH + gap;
  }
  if (!rows.length) out += text("NOTHING THIS WEEK", w / 2, head.y + 100, { font: "Archivo Black", size: 48, fill: "#FFFFFF", anchor: "middle" });
  return out + posterFooter(c, g, f, "#FFFFFF") + grain(c, w, h, 0.14);
}

/** The league table: club-colour pills per cell, our row highlighted. */
export function studioTable(c: Canvas, g: TableGraphic, f: Frame): string {
  const k = clubColours(g.brand);
  const { w, h } = f;
  const story = h > w * 1.5;
  let out = darkScene(c, g.brand, k, w, h, `table:${g.competition}`);
  const head = boardHeader(c, { ...g, footer: g.footer }, k, w, story, g.competition);
  out += head.svg;
  const rows = g.rows.slice(0, story ? 14 : 10);
  const bottom = h - (story ? 230 : 170);
  const rowH = Math.min(story ? 84 : 66, (bottom - head.y - 50) / Math.max(rows.length, 1));
  const cols: Array<[string, number, (t: TableGraphic["rows"][number]) => string]> = [
    ["P", 66, (t) => String(t.played)], ["W", 66, (t) => String(t.won)], ["D", 66, (t) => String(t.drawn)],
    ["L", 66, (t) => String(t.lost)], ["GD", 80, (t) => (t.goalDifference > 0 ? `+${t.goalDifference}` : String(t.goalDifference))], ["PTS", 90, (t) => String(t.points)],
  ];
  const statsW = cols.reduce((a, [, cw]) => a + cw, 0);
  const left = 50;
  const nameX = left + 70;
  const nameW = w - 100 - statsW - 80;
  let y = head.y + Math.max(0, (bottom - head.y - 50 - rowH * rows.length) / 2.4);
  out += text("CLUB", nameX + 14, y + 30, { font: "Archivo Black", size: 26, fill: "#FFFFFF" });
  let cx = nameX + nameW + 10;
  for (const [label, cw] of cols) { out += text(label, cx + cw / 2, y + 30, { font: "Archivo Black", size: 26, fill: "#FFFFFF", anchor: "middle" }); cx += cw; }
  y += 50;
  for (const t of rows) {
    const fill = t.isUs ? "#FFFFFF" : k.main;
    const ink = t.isUs ? "#0B0B0C" : k.onMain;
    const ph = rowH - 10;
    out += `<rect x="${left}" y="${r(y)}" width="60" height="${r(ph)}" rx="${r(ph / 2)}" fill="${fill}"/>` + text(String(t.position), left + 30, y + ph * 0.7, { font: "Archivo Black", size: ph * 0.5, fill: ink, anchor: "middle" });
    out += `<rect x="${nameX}" y="${r(y)}" width="${r(nameW)}" height="${r(ph)}" rx="${r(ph / 2)}" fill="${fill}"/>` + text(t.team.toUpperCase(), nameX + 22, y + ph * 0.7, { font: "Barlow Condensed ExtraBold", size: ph * 0.6, fill: ink, maxWidth: nameW - 40, minSize: 16, letterSpacing: 1 });
    let x = nameX + nameW + 10;
    for (const [, cw, value] of cols) {
      out += `<rect x="${r(x + 3)}" y="${r(y)}" width="${cw - 6}" height="${r(ph)}" rx="${r(ph / 2)}" fill="${fill}"/>` + text(value(t), x + cw / 2, y + ph * 0.7, { font: "Archivo Black", size: ph * 0.46, fill: ink, anchor: "middle" });
      x += cw;
    }
    y += rowH;
  }
  return out + posterFooter(c, g, f, "#FFFFFF") + grain(c, w, h, 0.14);
}

/** Top scorers: a stadium background with a ranked board (his PLAYER STATS design). */
export function studioLeaders(c: Canvas, g: LeadersGraphic, f: Frame): string {
  const k = clubColours(g.brand);
  const { w, h } = f;
  const story = h > w * 1.5;
  let out = stadiumScene(c, k, w, h, `leaders:${g.subtitle}`);
  out += `<rect x="0" y="0" width="${w}" height="${h}" fill="#000000" opacity="0.45"/>`;
  const head = boardHeader(c, { ...g, footer: g.footer }, k, w, story, g.subtitle);
  out += head.svg;
  const rows = g.rows.slice(0, story ? 12 : 8);
  const colW = 150;
  const nameW = w - 120 - colW * g.columns.length - 90;
  let y = head.y + 10;
  let x = 60 + 90 + nameW;
  for (const col of g.columns) { out += letters(col, x + colW / 2, y + 30, { font: "Archivo Black", size: Math.min(26, (colW - 16) / ((measure(col, "Archivo Black", 100) || 1) / 100)), fill: k.pop, anchor: "middle", skew: -8 }); x += colW; }
  y += 54;
  const rowH = Math.min(story ? 92 : 80, (h - (story ? 260 : 190) - y) / Math.max(rows.length, 1));
  rows.forEach((row, i) => {
    if (i % 2 === 0) out += `<rect x="50" y="${r(y - 6)}" width="${w - 100}" height="${r(rowH - 8)}" rx="12" fill="#FFFFFF" opacity="0.07"/>`;
    const lead = i === 0 || row.rank === rows[0].rank;
    out += letters(String(row.rank), 100, y + rowH * 0.6, { font: "Archivo Black", size: rowH * 0.5, fill: lead ? k.pop : "#FFFFFF", anchor: "middle", skew: -8 });
    out += text(row.name.toUpperCase(), 150, y + rowH * 0.6, { font: "Barlow Condensed ExtraBold", size: rowH * 0.55, fill: "#FFFFFF", maxWidth: nameW - 20, minSize: 20, letterSpacing: 1 });
    let vx = 60 + 90 + nameW;
    row.values.forEach((v, j) => {
      out += text(String(v), vx + colW / 2, y + rowH * 0.6, { font: "Archivo Black", size: rowH * (j === 0 ? 0.55 : 0.45), fill: j === 0 ? k.pop : "#FFFFFF", anchor: "middle" });
      vx += colW;
    });
    y += rowH;
  });
  return out + posterFooter(c, g, f, "#FFFFFF");
}

