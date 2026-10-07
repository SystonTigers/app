/**
 * Poster: the club's Canva "graphic" style. Club-colour or dark grounds with
 * dry-brush strokes, torn panels, halftone dots, chevrons, the crest as a
 * watermark and giant condensed headlines with outlined ghosts.
 */
import { badge, containImage, coverImage, hasImage, r, rect, text, type Canvas } from "../svg";
import { measure } from "../text";
import type { MomentGraphic, TeamSide } from "../types";
import {
  ball, brushStroke, chevrons, clubColours, crestDisc, duotoneFilter, fadeMask, ghosted, grain, halftone, letters, mix,
  isCutOut, playerPhoto, randomFor, shadowFilter, tornPanel, vignette, type ClubColours,
} from "./kit";

export interface Frame {
  w: number;
  h: number;
  /** Free packs show a small Boost Huddle credit */
  credit: boolean;
}

/** Fit a single word or phrase to a width in Anton (size for the given stretch). */
function fitAnton(value: string, width: number, maxSize: number, scaleX = 1): number {
  const at100 = measure(value, "Anton", 100) * scaleX;
  return Math.min(maxSize, (width / at100) * 100);
}

/** Sponsor box bottom-left ("Kindly sponsored by") and the credit line. */
export function posterFooter(c: Canvas, g: { brand: MomentGraphic["brand"]; footer: string | null }, f: Frame, ink: string): string {
  let out = "";
  const y = f.h - 40;
  if (hasImage(c, g.brand.sponsorLogoUrl)) {
    const sid = shadowFilter(c, 8, 0.35, 4);
    out += `<g filter="url(#${sid})"><rect x="40" y="${y - 120}" width="190" height="120" rx="8" fill="#FFFFFF"/></g>`;
    out += text("KINDLY SPONSORED BY", 135, y - 100, { font: "Barlow Condensed ExtraBold", size: 15, fill: "#333333", anchor: "middle", letterSpacing: 1 });
    out += containImage(c, g.brand.sponsorLogoUrl, 52, y - 92, 166, 80);
  } else if (g.brand.sponsorName) {
    out += text(`SPONSORED BY ${g.brand.sponsorName.toUpperCase()}`, 44, y, { font: "Barlow Condensed ExtraBold", size: 24, fill: ink, letterSpacing: 2, maxWidth: f.w * 0.55, minSize: 16 });
  }
  if (f.credit) {
    out += `<rect x="${f.w - 262}" y="${y - 24}" width="230" height="34" rx="17" fill="#000000" opacity="0.55"/>`;
    out += text("MADE WITH BOOST HUDDLE", f.w - 147, y, { font: "Barlow Condensed SemiBold", size: 18, fill: "#FFFFFF", anchor: "middle", letterSpacing: 3, opacity: 0.85 });
  }
  return out;
}

/** A slanted bar with both badges and the score (or "V"). */
export function scoreBar(c: Canvas, home: TeamSide, away: TeamSide, cx: number, cy: number, width: number, k: ClubColours, showScore = true, onMain = false, scale = 1): string {
  const h = 150 * scale;
  const slant = 40;
  const sid = shadowFilter(c, 16, 0.5, 12);
  const barFill = onMain ? k.dark : k.dark;
  let out = `<g filter="url(#${sid})"><polygon points="${r(cx - width / 2 + slant)},${r(cy - h / 2)} ${r(cx + width / 2)},${r(cy - h / 2)} ${r(cx + width / 2 - slant)},${r(cy + h / 2)} ${r(cx - width / 2)},${r(cy + h / 2)}" fill="${barFill}"/></g>`;
  // Club-colour score block in the middle
  const bw = 270 * scale;
  out += `<polygon points="${r(cx - bw / 2 + 24)},${r(cy - h / 2 - 14)} ${r(cx + bw / 2 + 24)},${r(cy - h / 2 - 14)} ${r(cx + bw / 2 - 24)},${r(cy + h / 2 + 14)} ${r(cx - bw / 2 - 24)},${r(cy + h / 2 + 14)}" fill="${k.main}"/>`;
  const score = showScore ? `${home.score ?? 0}-${away.score ?? 0}` : "V";
  const size = Math.min(150 * scale, (bw - 40) / (measure(score, "Anton", 100) / 100));
  out += letters(score, cx, cy + size * 0.36, { font: "Anton", size, fill: k.onMain, anchor: "middle", letterSpacing: 4 });
  const bs = 112 * scale;
  out += badge(c, home.badgeUrl, home.name, cx - width / 2 + 40 + bs / 2 + 20, cy, bs, mix(k.dark, "#FFFFFF", 0.15));
  out += badge(c, away.badgeUrl, away.name, cx + width / 2 - 40 - bs / 2 - 20, cy, bs, mix(k.dark, "#FFFFFF", 0.15));
  return out;
}

/** GOAL! / BRACE! / HAT-TRICK!: the headline fills the page, the shirt number looms behind. */
export function posterGoal(c: Canvas, g: MomentGraphic, f: Frame): string {
  const k = clubColours(g.brand);
  const rand = randomFor(g.kind, g.playerName, g.minute);
  const { w, h } = f;
  const story = h > w * 1.5;
  const ground = k.main;
  const lightGround = k.onMain !== "#FFFFFF";
  // Headline ink: dark on light club colours, white on dark ones
  const ink = lightGround ? "#0B0B0C" : "#FFFFFF";
  const ghost = lightGround ? "#0B0B0C" : "#FFFFFF";
  const goals = Math.min(g.goalCount ?? 0, 10);
  const gold = "#F2C230";
  let out = rect(0, 0, w, h, ground);
  out += halftone(w, 0, -1, 1, 520, mix(ground, "#000000", 0.3), 0.45);
  out += halftone(0, h, 1, -1, 460, mix(ground, "#000000", 0.3), 0.45);

  // Torn dark panels down the sides
  out += tornPanel(c, -60, h * (story ? 0.28 : 0.22), 200 + rand() * 60, h * 0.95, k.dark, Math.floor(rand() * 99), `transform="rotate(-3 0 ${r(h / 2)})"`);
  out += tornPanel(c, w - 150 - rand() * 50, -60, 260, h * (story ? 0.5 : 0.6), k.dark, Math.floor(rand() * 99), `transform="rotate(2 ${w} 0)"`);

  // The player in the club's colours, fading into the page behind the headline
  const centreY = h * (story ? 0.47 : 0.5);
  const photoData = g.photoUrl ? c.images.get(g.photoUrl) : undefined;
  const photo = Boolean(photoData);
  if (photoData && isCutOut(photoData)) {
    // A cut-out stands on the bottom edge, full colour, behind the headline
    const sid = shadowFilter(c, 18, 0.45, 8);
    out += `<g filter="url(#${sid})">${playerPhoto(c, g.photoUrl, w * 0.36, h * (story ? 0.2 : 0.1), w * 0.64, h * (story ? 0.8 : 0.9), { dark: k.dark, light: ground })}</g>`;
  } else if (photo) {
    const duo = duotoneFilter(c, k.dark, mix(ground, "#FFFFFF", 0.45));
    const pw = w * 0.78;
    const ph = h * (story ? 0.62 : 0.74);
    const px = w - pw;
    const py = h * (story ? 0.12 : 0.08);
    const m = fadeMask(c, px, py, pw, ph, { left: 0.35, top: 0.12, bottom: 0.3 });
    out += `<g mask="url(#${m})"><g filter="url(#${duo})">${coverImage(c, g.photoUrl, px, py, pw, ph)}</g></g>`;
  }

  // Brush sweeps top and bottom, over the photo's edges
  out += brushStroke(c, `M -40 ${r(h * 0.06)} C ${r(w * 0.3)} ${r(h * 0.03)}, ${r(w * 0.55)} ${r(h * 0.09)}, ${r(w * 0.8)} ${r(h * 0.05)}`, story ? 120 : 96, k.dark, 11 + Math.floor(rand() * 40));
  out += brushStroke(c, `M ${r(w * 0.25)} ${r(h * 0.958)} C ${r(w * 0.5)} ${r(h * 0.935)}, ${r(w * 0.8)} ${r(h * 0.978)}, ${r(w + 60)} ${r(h * 0.945)}`, story ? 110 : 90, k.dark, 31 + Math.floor(rand() * 40));

  // Crest watermark top-right
  out += crestDisc(c, g.brand, w - 150, story ? 300 : 230, story ? 175 : 150, lightGround ? k.dark : k.main, lightGround ? 0.9 : 0.95);

  // The shirt number, huge and outlined behind the headline
  if (g.shirtNumber != null) {
    const numberText = String(g.shirtNumber);
    const ns = h * (story ? 0.5 : 0.66);
    for (let i = 2; i >= 0; i--) {
      out += letters(numberText, w * 0.62 + i * 26, centreY + ns * 0.36 + i * 18, { font: "Anton", size: ns, fill: "none", stroke: ghost, strokeWidth: 8, anchor: "middle", rotate: -9, opacity: 0.42 - i * 0.1 });
    }
  }

  // GOAL! with stepped outline ghosts
  const head = g.headline.toUpperCase();
  // Stories have room to stretch the headline taller
  const scaleX = story ? 0.72 : 0.92;
  const size = fitAnton(head, w - 120, story ? 700 : 440, scaleX);
  const base = centreY + size * 0.3;
  out += ghosted(head, w / 2, base, { font: "Anton", size, fill: ink, anchor: "middle", scaleX, rotate: -4 }, ghost, [18, 16]);

  // One ball per goal for braces and hat-tricks (gold ring from a hat-trick)
  let y = base + 74;
  if (goals >= 2) {
    const rad = 28;
    const total = goals * rad * 2.3 + (goals - 1) * 12;
    for (let i = 0; i < goals; i++) out += ball(w / 2 - total / 2 + rad * 1.15 + i * (rad * 2.3 + 12), y, rad, goals >= 3 ? gold : k.dark);
    y += 64;
  }

  // Scorer tag: name on a white label, minute beside it
  if (g.playerName) {
    const name = g.playerName.toUpperCase();
    const ns = 66;
    const nw = Math.min(w - 300, measure(name, "Barlow Condensed ExtraBold", ns) + 48);
    const minute = g.minute !== null ? `${g.minute}'` : "";
    const mw = minute ? measure(minute, "Anton", 64) + 24 : 0;
    const left = w / 2 - (nw + mw) / 2;
    out += `<polygon points="${r(left + 10)},${r(y)} ${r(left + nw)},${r(y)} ${r(left + nw - 10)},${r(y + 88)} ${r(left)},${r(y + 88)}" fill="#FFFFFF"/>`;
    out += text(name, left + nw / 2, y + 66, { font: "Barlow Condensed ExtraBold", size: ns, fill: "#0B0B0C", anchor: "middle", maxWidth: nw - 40, minSize: 34, letterSpacing: 1 });
    if (minute) out += text(minute, left + nw + 18, y + 70, { font: "Anton", size: 64, fill: ink });
    y += 88;
  }
  if (g.secondary) {
    y += 54;
    out += text(g.secondary.toUpperCase(), w / 2, y, { font: "Barlow Condensed ExtraBold", size: 40, fill: ink, anchor: "middle", letterSpacing: 3, maxWidth: w - 200, minSize: 24 });
  }

  // Teams across the top, score bar near the bottom
  out += text(`${g.home.name.toUpperCase()}   V   ${g.away.name.toUpperCase()}`, w / 2 - 60, story ? 250 : 190, {
    font: "Barlow Condensed ExtraBold", size: 38, fill: ink, anchor: "middle", letterSpacing: 3, maxWidth: w - 420, minSize: 22,
  });
  out += chevrons(52, story ? 236 : 176, 3, 26, 34, 8, ink, 0.9);
  const barY = h - (story ? 330 : 250);
  out += scoreBar(c, g.home, g.away, w / 2, Math.max(barY, y + 110), w - 140, k);
  out += posterFooter(c, g, f, ink);
  if (!lightGround) out += vignette(c, w, h, 0.35);
  out += grain(c, w, h, 0.2);
  return out;
}
