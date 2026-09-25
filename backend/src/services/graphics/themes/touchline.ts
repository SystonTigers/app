/**
 * Touchline: black, torn brush edges and halftone dots in the club colour,
 * white poster headlines. Based on the club's original Canva set.
 */
import { containImage, coverImage, hasImage, r, rect, roundRect, seeded, text, textSize } from "../svg";
import type { Theme } from "../theme";
import { GRAPHIC_HEIGHT as H, GRAPHIC_WIDTH as W } from "../types";
import { accentOnDark, inkOn, slanted } from "./shared";

/** Halftone dots shrinking away from a corner (dx/dy point into the page). */
function halftone(cx: number, cy: number, dx: number, dy: number, reach: number, fill: string): string {
  const step = 24;
  let dots = "";
  for (let i = 0; i * step < reach; i++) {
    for (let j = 0; j * step < reach; j++) {
      const offset = j % 2 ? step / 2 : 0;
      const x = i * step + offset;
      const y = j * step;
      const radius = 7.5 * (1 - Math.hypot(x, y) / reach);
      if (radius < 1.2) continue;
      dots += `<circle cx="${r(cx + dx * x)}" cy="${r(cy + dy * y)}" r="${r(radius)}"/>`;
    }
  }
  return `<g fill="${fill}" opacity="0.6">${dots}</g>`;
}

export const touchline: Theme = {
  id: "touchline",
  fonts: { display: "Anton", strong: "Barlow Condensed ExtraBold", body: "Barlow Condensed SemiBold" },
  badgeTiles: true,

  palette(brand) {
    const accent = accentOnDark(brand);
    return { bg: "#0A0A0B", ink: "#FFFFFF", muted: "#B9BEC6", accent, accentInk: inkOn(accent), scoreInk: inkOn(accent), panel: "#17191C", panelInk: "#FFFFFF", line: "#34383E" };
  },

  background(c, g, p) {
    const rand = seeded(`${g.kind}:${g.headline}`);
    const rough = c.id("rough");
    c.defs.push(
      `<filter id="${rough}" filterUnits="userSpaceOnUse" x="-80" y="-80" width="${W + 160}" height="${H + 160}"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="${Math.floor(rand() * 90)}"/><feDisplacementMap in="SourceGraphic" scale="46" xChannelSelector="R" yChannelSelector="G"/></filter>`,
    );
    let out = rect(0, 0, W, H, p.bg);
    out += halftone(0, 0, 1, 1, 560, p.accent) + halftone(W, H, -1, -1, 560, p.accent);
    // Torn club-colour edge down the left and brush sweeps top and bottom right
    out += `<g filter="url(#${rough})" fill="${p.accent}">`;
    out += `<rect x="-60" y="-40" width="${r(70 + rand() * 30)}" height="${H + 80}"/>`;
    out += `<rect x="${W - 60}" y="${H * 0.62}" width="120" height="${H * 0.45}"/>`;
    out += `<path d="M${W * 0.52} -30 L${W + 40} -30 L${W + 40} ${r(40 + rand() * 30)} Q${W * 0.8} 30 ${W * 0.55} 20 Z"/>`;
    out += `</g>`;
    // Hazard stripes in the top-left and bottom-right corners
    for (let i = 0; i < 3; i++) {
      out += `<polygon points="${slanted(-40 + i * 70, 0, 60, 60, 60, "right")}" fill="${p.accent}" opacity="${0.9 - i * 0.25}"/>`;
      out += `<polygon points="${slanted(W - 180 + i * 70, H - 60, 60, 60, 60, "right")}" fill="${p.accent}" opacity="${0.4 + i * 0.25}"/>`;
    }
    // Big faded badge top-right
    out += `<circle cx="${W - 130}" cy="200" r="230" fill="${p.accent}" opacity="0.14"/>`;
    if (hasImage(c, g.brand.badgeUrl)) out += `<g opacity="0.16">${containImage(c, g.brand.badgeUrl, W - 330, 0, 400, 400)}</g>`;
    return out;
  },

  overlay() {
    return "";
  },

  headline(c, value, cx, y, maxWidth, maxSize, p) {
    const o = { font: "Anton" as const, size: maxSize, anchor: "middle" as const, maxWidth, minSize: 56, letterSpacing: 2 };
    const size = textSize(value.toUpperCase(), o);
    const svg = text(value.toUpperCase(), cx + 7, y + 7, { ...o, fill: p.accent }) + text(value.toUpperCase(), cx, y, { ...o, fill: p.ink });
    return { svg, size };
  },

  scorePanel(c, x, y, w, h, p) {
    const tab = 70;
    return `<path d="M${x + 16} ${y} H${x + w - 16} Q${x + w} ${y} ${x + w} ${y + 16} V${y + h - 16} Q${x + w} ${y + h} ${x + w - 16} ${y + h} H${W / 2 + tab + 20} L${W / 2 + tab} ${y + h + 28} H${W / 2 - tab} L${W / 2 - tab - 20} ${y + h} H${x + 16} Q${x} ${y + h} ${x} ${y + h - 16} V${y + 16} Q${x} ${y} ${x + 16} ${y} Z" fill="${p.accent}"/>`;
  },

  photo(c, url, x, y, w, h, p) {
    return rect(x + 16, y + 16, w, h, p.accent) + coverImage(c, url, x, y, w, h) + rect(x, y, w, h, "none", `stroke="#FFFFFF" stroke-width="6"`);
  },

  bar(c, x, y, w, h, p, side) {
    return `<polygon points="${slanted(x, y, w, h, 28, side)}" fill="${p.accent}"/>`;
  },

  row(c, x, y, w, h, p, highlight) {
    return roundRect(x, y, w, h, 6, highlight ? p.accent : p.panel);
  },
};
