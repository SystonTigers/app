/**
 * Elite (premium): a bold diagonal split in the club's colours, cut-corner
 * panels and stacked outline headlines.
 */
import { coverImage, r, rect, text, textSize } from "../svg";
import type { Theme } from "../theme";
import { GRAPHIC_HEIGHT as H, GRAPHIC_WIDTH as W } from "../types";
import { accentOnDark, deepClubColour, inkOn } from "./shared";

/** A box with the top-left and bottom-right corners cut off. */
function cut(x: number, y: number, w: number, h: number, k: number): string {
  return `${r(x + k)},${r(y)} ${r(x + w)},${r(y)} ${r(x + w)},${r(y + h - k)} ${r(x + w - k)},${r(y + h)} ${r(x)},${r(y + h)} ${r(x)},${r(y + k)}`;
}

export const elite: Theme = {
  id: "elite",
  fonts: { display: "Bebas Neue", strong: "Barlow Condensed ExtraBold", body: "Barlow Condensed SemiBold" },
  badgeTiles: false,

  palette(brand) {
    const accent = accentOnDark(brand);
    const deep = deepClubColour(brand);
    return { bg: deep, ink: "#FFFFFF", muted: "#C9CED6", accent, accentInk: inkOn(accent), scoreInk: deep, panel: "#FFFFFF", panelInk: "#FFFFFF", line: "#FFFFFF44" };
  },

  background(c, g, p) {
    const lines = c.id("lines");
    const shine = c.id("shine");
    c.defs.push(
      `<pattern id="${lines}" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)"><rect width="2" height="18" fill="#FFFFFF" fill-opacity="0.05"/></pattern>`,
      `<linearGradient id="${shine}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.12"/><stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity="0.35"/></linearGradient>`,
    );
    let out = rect(0, 0, W, H, p.bg);
    // Dark wedge across the lower right, accent slashes in two corners
    out += `<polygon points="${W},${H * 0.28} ${W},${H} 0,${H} 0,${H * 0.86}" fill="#07080A" fill-opacity="0.55"/>`;
    for (let i = 0; i < 3; i++) {
      const o = i * 46;
      out += `<polygon points="${W - 250 + o},0 ${W - 222 + o},0 ${W - 372 + o},${150} ${W - 400 + o},${150}" fill="${p.accent}" fill-opacity="${1 - i * 0.3}"/>`;
    }
    out += `<polygon points="0,0 ${W * 0.42},0 0,${H * 0.3}" fill="#FFFFFF" fill-opacity="0.04"/>`;
    out += rect(0, H - 10, W, 10, p.accent);
    out += rect(0, 0, W, H, `url(#${lines})`) + rect(0, 0, W, H, `url(#${shine})`);
    // Club name in giant outline down the right edge
    out += `<text x="${W - 40}" y="${H / 2}" transform="rotate(90 ${W - 40} ${H / 2})" font-family="Bebas Neue" font-size="230" fill="none" stroke="#FFFFFF" stroke-opacity="0.07" stroke-width="3" text-anchor="middle">${g.brand.clubName.toUpperCase().replace(/[<>&]/g, "")}</text>`;
    return out;
  },

  overlay() {
    return "";
  },

  headline(c, value, cx, y, maxWidth, maxSize, p) {
    const o = { font: "Bebas Neue" as const, size: Math.round(maxSize * 1.15), anchor: "middle" as const, maxWidth: maxWidth - 40, minSize: 60, letterSpacing: 4 };
    const label = value.toUpperCase();
    const size = textSize(label, o);
    const skew = `skewX(-10) translate(${r(y * 0.176)} 0)`;
    const svg = `<g transform="${skew}">` +
      text(label, cx + 24, y + 24, { ...o, fill: "none", stroke: p.accent, strokeWidth: 3, opacity: 0.35 }) +
      text(label, cx + 12, y + 12, { ...o, fill: "none", stroke: p.accent, strokeWidth: 3, opacity: 0.7 }) +
      text(label, cx, y, { ...o, fill: "#FFFFFF" }) + `</g>`;
    return { svg, size };
  },

  scorePanel(c, x, y, w, h, p) {
    return `<polygon points="${cut(x + 12, y + 12, w, h, 36)}" fill="${p.accent}"/><polygon points="${cut(x, y, w, h, 36)}" fill="#FFFFFF"/>`;
  },

  photo(c, url, x, y, w, h, p) {
    const clip = c.id("cut");
    c.defs.push(`<clipPath id="${clip}"><polygon points="${cut(x, y, w, h, 48)}"/></clipPath>`);
    const data = c.images.get(url);
    const img = data ? `<image href="${data}" x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clip})"/>` : coverImage(c, url, x, y, w, h);
    return `<polygon points="${cut(x + 18, y + 18, w, h, 48)}" fill="${p.accent}"/>` + img;
  },

  bar(c, x, y, w, h, p) {
    return `<polygon points="${cut(x, y, w, h, Math.min(24, h / 3))}" fill="${p.accent}"/>`;
  },

  row(c, x, y, w, h, p, highlight) {
    return highlight
      ? `<polygon points="${cut(x, y, w, h, Math.min(18, h / 3))}" fill="${p.accent}"/>`
      : `<polygon points="${cut(x, y, w, h, Math.min(18, h / 3))}" fill="#FFFFFF" fill-opacity="0.09"/>`;
  },
};
