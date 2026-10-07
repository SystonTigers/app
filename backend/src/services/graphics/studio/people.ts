/**
 * Line-ups, player posts (Man of the Match, player of the week, birthdays,
 * milestones, Goal of the Month), quotes, throwback photos, and cards and
 * subs during a match.
 */
import { coverImage, r, rect, text, type Canvas } from "../svg";
import { measure, wrap } from "../text";
import type { LineupGraphic, MomentGraphic, PersonGraphic, PhotoGraphic, QuoteGraphic } from "../types";
import {
  brushStroke, chevrons, clubColours, crestDisc, duotoneFilter, fadeMask, ghosted, grain, halftone, letters, mix,
  randomFor, shadowFilter, tornPanel, vignette,
} from "./kit";
import { posterFooter, scoreBar, type Frame } from "./poster";
import { darkScene, stadiumScene } from "./scenes";

const fitTall = (v: string, width: number, max: number, scaleX = 1) => Math.min(max, (width / ((measure(v, "Anton", 100) || 1) * scaleX)) * 100);
const fitWide = (v: string, width: number, max: number) => Math.min(max, (width / (measure(v, "Archivo Black", 100) || 1)) * 100);

/** STARTING XI: club name, a tall headline, then the numbered team in two columns over the stadium. */
export function studioLineup(c: Canvas, g: LineupGraphic, f: Frame): string {
  const k = clubColours(g.brand);
  const { w, h } = f;
  const story = h > w * 1.5;
  let out = stadiumScene(c, k, w, h, `lineup:${g.date}`);
  out += crestDisc(c, g.brand, w - 140, story ? 200 : 140, story ? 160 : 130, k.main, 0.85, -16);
  let y = story ? 150 : 90;
  out += text(g.brand.clubName.toUpperCase(), 70, y, { font: "Barlow Condensed ExtraBold", size: 40, fill: "#FFFFFF", letterSpacing: 2, maxWidth: w - 360, minSize: 24 });
  const head = g.headline.toUpperCase();
  const s = fitTall(head, w - 330, story ? 300 : 210, 0.9);
  y += s * 0.92;
  out += letters(head, 64, y, { font: "Anton", size: s, fill: "#FFFFFF", scaleX: 0.9 });
  const opp = g.home.isUs ? g.away.name : g.home.name;
  const meta = [`V ${opp}`, g.date, g.time, g.venue].filter(Boolean).join("  ·  ").toUpperCase();
  y += 64;
  out += text(meta, 70, y, { font: "Barlow Condensed ExtraBold", size: 38, fill: k.pop, letterSpacing: 2, maxWidth: w - 140, minSize: 22 });
  y += story ? 80 : 50;
  const half = Math.ceil(g.players.length / 2);
  const rowH = Math.min(story ? 100 : 80, (h - (story ? 400 : 280) - y) / Math.max(half, 1));
  const colW = (w - 160) / 2;
  g.players.forEach((p, i) => {
    const x = 70 + (i < half ? 0 : colW + 20);
    const py = y + (i % half) * rowH;
    const num = p.number != null ? String(p.number) : "";
    out += `<polygon points="${r(x + 10)},${r(py)} ${r(x + 74)},${r(py)} ${r(x + 64)},${r(py + rowH - 12)} ${r(x)},${r(py + rowH - 12)}" fill="${k.main}"/>`;
    out += text(num, x + 37, py + (rowH - 12) * 0.76, { font: "Archivo Black", size: (rowH - 12) * 0.62, fill: k.onMain, anchor: "middle" });
    out += text(p.name.toUpperCase(), x + 88, py + (rowH - 12) * 0.78, { font: "Barlow Condensed ExtraBold", size: (rowH - 12) * 0.8, fill: "#FFFFFF", maxWidth: colW - 100, minSize: 20, letterSpacing: 1 });
  });
  y += half * rowH + 30;
  if (g.subs.length) {
    out += text("SUBS", 70, y + 10, { font: "Archivo Black", size: 32, fill: k.pop });
    out += text(g.subs.join(", ").toUpperCase(), 180, y + 10, { font: "Barlow Condensed ExtraBold", size: 34, fill: "#FFFFFF", maxWidth: w - 250, minSize: 18, letterSpacing: 1 });
  }
  return out + posterFooter(c, g, f, "#FFFFFF");
}

/** One player in the spotlight, on the club colour like the goal post. */
export function studioPerson(c: Canvas, g: PersonGraphic, f: Frame): string {
  const k = clubColours(g.brand);
  const { w, h } = f;
  const story = h > w * 1.5;
  const rand = randomFor(g.kind, g.playerName);
  const light = k.onMain !== "#FFFFFF";
  const ink = light ? "#0B0B0C" : "#FFFFFF";
  let out = rect(0, 0, w, h, k.main);
  out += halftone(w, 0, -1, 1, 520, mix(k.main, "#000000", 0.3), 0.45) + halftone(0, h, 1, -1, 460, mix(k.main, "#000000", 0.3), 0.45);
  out += tornPanel(c, -60, h * 0.55, 230, h * 0.6, k.dark, Math.floor(rand() * 90), `transform="rotate(-4 0 ${r(h)})"`);
  if (g.photoUrl && c.images.get(g.photoUrl)) {
    const duo = duotoneFilter(c, k.dark, mix(k.main, "#FFFFFF", 0.45));
    const px = w * 0.18;
    const py = h * 0.12;
    const m = fadeMask(c, px, py, w - px, h * 0.62, { left: 0.3, bottom: 0.35, top: 0.1 });
    out += `<g mask="url(#${m})"><g filter="url(#${duo})">${coverImage(c, g.photoUrl, px, py, w - px, h * 0.62)}</g></g>`;
  }
  out += brushStroke(c, `M -40 ${r(h * 0.05)} C ${r(w * 0.3)} ${r(h * 0.02)}, ${r(w * 0.6)} ${r(h * 0.08)}, ${r(w * 0.85)} ${r(h * 0.04)}`, 90, k.dark, 13 + Math.floor(rand() * 40));
  out += crestDisc(c, g.brand, w - 150, story ? 260 : 200, story ? 160 : 140, light ? k.dark : k.main, 0.9);
  // Headline (MAN OF THE MATCH) stacked, the name huge on a dark brush
  const words = g.headline.toUpperCase().split(/\s+/);
  const lines = words.length > 2 ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")] : [words.join(" ")];
  // Lift the block when there are more lines, so nothing runs into the sponsor box
  const extra = (g.stat ? 60 : 0) + (g.secondary ? 50 : 0);
  let y = h * (story ? 0.58 : 0.54) - extra;
  const hs = Math.min(...lines.map((l) => fitTall(l, w - 160, story ? 200 : 160, 0.9)));
  for (const line of lines) {
    out += ghosted(line, w / 2, y, { font: "Anton", size: hs, fill: ink, anchor: "middle", scaleX: 0.9, rotate: -3 }, ink, [10, 9], 1);
    y += hs * 0.95;
  }
  y += 20;
  const name = g.playerName.toUpperCase();
  const ns = Math.min(110, ((w - 240) / (measure(name, "Barlow Condensed ExtraBold", 100) || 1)) * 100);
  out += brushStroke(c, `M ${r(w / 2 - measure(name, "Barlow Condensed ExtraBold", ns) / 2 - 40)} ${r(y + ns * 0.45)} L ${r(w / 2 + measure(name, "Barlow Condensed ExtraBold", ns) / 2 + 40)} ${r(y + ns * 0.4)}`, ns * 1.15, k.dark, 41 + Math.floor(rand() * 40));
  out += text(name, w / 2, y + ns * 0.78, { font: "Barlow Condensed ExtraBold", size: ns, fill: "#FFFFFF", anchor: "middle", letterSpacing: 2 });
  y += ns + 70;
  if (g.stat) { out += text(g.stat.toUpperCase(), w / 2, y, { font: "Archivo Black", size: 46, fill: ink, anchor: "middle", maxWidth: w - 200, minSize: 26 }); y += 60; }
  if (g.secondary) out += text(g.secondary.toUpperCase(), w / 2, y, { font: "Barlow Condensed ExtraBold", size: 34, fill: ink, anchor: "middle", letterSpacing: 2, maxWidth: w - 200, minSize: 20 });
  out += chevrons(52, story ? 236 : 176, 3, 26, 34, 8, ink, 0.9);
  return out + posterFooter(c, g, f, ink) + grain(c, w, h, 0.2);
}

/** A quote over the stadium, big and centred. */
export function studioQuote(c: Canvas, g: QuoteGraphic, f: Frame): string {
  const k = clubColours(g.brand);
  const { w, h } = f;
  let out = stadiumScene(c, k, w, h, `quote:${g.text.slice(0, 20)}`);
  out += `<rect x="0" y="0" width="${w}" height="${h}" fill="#000000" opacity="0.35"/>`;
  out += letters("“", w / 2, h * 0.3, { font: "Archivo Black", size: 300, fill: k.pop, anchor: "middle", opacity: 0.9 });
  const { lines, size } = wrap(g.text.toUpperCase(), "Anton", 110, 48, w - 200, 6);
  let y = h * 0.36 + size;
  for (const line of lines) { out += text(line, w / 2, y, { font: "Anton", size, fill: "#FFFFFF", anchor: "middle", letterSpacing: 1 }); y += size * 1.12; }
  if (g.author) out += text(`— ${g.author.toUpperCase()}`, w / 2, y + 40, { font: "Barlow Condensed ExtraBold", size: 40, fill: k.pop, anchor: "middle", letterSpacing: 3, maxWidth: w - 200, minSize: 24 });
  out += text(g.headline.toUpperCase(), w / 2, h * 0.12, { font: "Barlow Condensed ExtraBold", size: 38, fill: "#FFFFFF", anchor: "middle", letterSpacing: 4 });
  return out + posterFooter(c, g, f, "#FFFFFF");
}

/** Throwback: the photo in a torn frame on the dark poster. */
export function studioPhoto(c: Canvas, g: PhotoGraphic, f: Frame): string {
  const k = clubColours(g.brand);
  const { w, h } = f;
  const story = h > w * 1.5;
  let out = darkScene(c, g.brand, k, w, h, `photo:${g.caption}`, false);
  const s = fitWide(g.headline.toUpperCase().split(" ")[0], w - 200, 140);
  out += letters(g.headline.toUpperCase().split(" ")[0], w / 2, (story ? 200 : 130) + s, { font: "Archivo Black", size: s, fill: "#FFFFFF", anchor: "middle" });
  const rest = g.headline.toUpperCase().split(" ").slice(1).join(" ");
  if (rest) out += text(rest, w / 2, (story ? 200 : 130) + s + 70, { font: "Archivo Black", size: 60, fill: "none", anchor: "middle", stroke: k.pop, strokeWidth: 3, maxWidth: w - 200, minSize: 30 });
  const py = (story ? 200 : 130) + s + 120;
  const ph = h - py - (story ? 380 : 260);
  if (g.photoUrl && c.images.get(g.photoUrl)) {
    const sid = shadowFilter(c, 20, 0.6, 14);
    out += `<g filter="url(#${sid})" transform="rotate(-2 ${w / 2} ${r(py + ph / 2)})"><rect x="70" y="${r(py)}" width="${w - 140}" height="${r(ph)}" fill="#FFFFFF"/>${coverImage(c, g.photoUrl, 88, py + 18, w - 176, ph - 36)}</g>`;
  }
  if (g.caption) out += text(g.caption.toUpperCase(), w / 2, py + ph + 80, { font: "Barlow Condensed ExtraBold", size: 42, fill: k.pop, anchor: "middle", letterSpacing: 2, maxWidth: w - 160, minSize: 24 });
  return out + posterFooter(c, g, f, "#FFFFFF") + grain(c, w, h, 0.14);
}

/** Yellow/red cards, subs and other match moments that aren't goals. */
export function studioMoment(c: Canvas, g: MomentGraphic, f: Frame): string {
  const k = clubColours(g.brand);
  const { w, h } = f;
  const story = h > w * 1.5;
  const rand = randomFor(g.kind, g.playerName, g.minute);
  let out = rect(0, 0, w, h, k.dark);
  out += tornPanel(c, -80, -40, 150 + rand() * 40, h + 80, k.main, Math.floor(rand() * 90));
  out += vignette(c, w, h, 0.4);
  const cardColour = g.card === "red" ? "#E5252A" : g.card === "yellow" ? "#FFD21F" : null;
  let y = h * (story ? 0.3 : 0.24);
  if (cardColour) {
    const sid = shadowFilter(c, 24, 0.6, 16);
    out += `<g filter="url(#${sid})" transform="rotate(-10 ${w / 2} ${r(y)})"><rect x="${w / 2 - 95}" y="${r(y - 140)}" width="190" height="270" rx="16" fill="${cardColour}"/></g>`;
    y += 230;
  }
  const head = g.headline.toUpperCase();
  const s = fitTall(head, w - 220, story ? 260 : 210, 0.9);
  out += letters(head, w / 2, y + s * 0.8, { font: "Anton", size: s, fill: "#FFFFFF", anchor: "middle", scaleX: 0.9 });
  y += s * 0.8 + 90;
  if (g.playerName) {
    out += text(g.playerName.toUpperCase(), w / 2, y, { font: "Barlow Condensed ExtraBold", size: 80, fill: k.pop, anchor: "middle", maxWidth: w - 200, minSize: 36, letterSpacing: 2 });
    y += 64;
  }
  if (g.secondary) out += text(g.secondary.toUpperCase(), w / 2, y, { font: "Barlow Condensed ExtraBold", size: 40, fill: "#FFFFFF", anchor: "middle", letterSpacing: 2, maxWidth: w - 200, minSize: 22, opacity: 0.85 });
  if (g.minute !== null) out += letters(`${g.minute}'`, w - 90, story ? 260 : 170, { font: "Anton", size: 110, fill: k.pop, anchor: "end" });
  out += scoreBar(c, g.home, g.away, w / 2, h - (story ? 360 : 260), w - 200, k);
  return out + posterFooter(c, g, f, "#FFFFFF") + grain(c, w, h, 0.14);
}
