/**
 * Floodlights: a stadium under lights at night, glass panels and glowing
 * headlines. Based on the club's original kick-off and match day designs.
 */
import { coverImage, r, rect, roundRect, seeded, text, textSize } from "../svg";
import type { Theme } from "../theme";
import { GRAPHIC_HEIGHT as H, GRAPHIC_WIDTH as W } from "../types";
import { accentOnDark, inkOn } from "./shared";

const LIGHTS = [120, 360, 720, 960];

export const floodlights: Theme = {
  id: "floodlights",
  fonts: { display: "Anton", strong: "Barlow Condensed ExtraBold", body: "Barlow Condensed SemiBold" },
  badgeTiles: false,

  palette(brand) {
    const accent = accentOnDark(brand, "#FFFFFF");
    return { bg: "#061428", ink: "#FFFFFF", muted: "#B4C3D6", accent, accentInk: inkOn(accent), scoreInk: "#FFFFFF", panel: "#FFFFFF", panelInk: "#FFFFFF", line: "#FFFFFF55" };
  },

  background(c, g) {
    const rand = seeded(`${g.kind}:${g.headline}`);
    const sky = c.id("sky");
    const pitch = c.id("pitch");
    const glow = c.id("glow");
    const beam = c.id("beam");
    const shade = c.id("shade");
    c.defs.push(
      `<linearGradient id="${sky}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E3563"/><stop offset="0.55" stop-color="#071A33"/><stop offset="1" stop-color="#040C18"/></linearGradient>`,
      `<linearGradient id="${pitch}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0F4A24"/><stop offset="1" stop-color="#0A3219"/></linearGradient>`,
      `<radialGradient id="${glow}"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.95"/><stop offset="0.12" stop-color="#DDEBFF" stop-opacity="0.6"/><stop offset="1" stop-color="#7FB2FF" stop-opacity="0"/></radialGradient>`,
      `<linearGradient id="${beam}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CFE3FF" stop-opacity="0.22"/><stop offset="1" stop-color="#CFE3FF" stop-opacity="0"/></linearGradient>`,
      `<linearGradient id="${shade}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#030A14" stop-opacity="0.15"/><stop offset="0.45" stop-color="#030A14" stop-opacity="0.5"/><stop offset="1" stop-color="#030A14" stop-opacity="0.72"/></linearGradient>`,
    );
    let out = rect(0, 0, W, H, `url(#${sky})`);
    // Light beams and floodlights
    for (const x of LIGHTS) {
      out += `<polygon points="${x - 40},170 ${x + 40},170 ${x + 260 - (x - W / 2) * 0.3},${H} ${x - 260 - (x - W / 2) * 0.3},${H}" fill="url(#${beam})"/>`;
    }
    // Stands with crowd lights
    out += `<path d="M0 700 Q${W / 2} 610 ${W} 700 V880 H0 Z" fill="#030912"/>`;
    for (let i = 0; i < 140; i++) {
      const x = rand() * W;
      const y = 700 + rand() * 170 - Math.sin((x / W) * Math.PI) * 80;
      out += `<circle cx="${r(x)}" cy="${r(y)}" r="${r(1 + rand() * 2)}" fill="#FFFFFF" opacity="${r(0.08 + rand() * 0.25)}"/>`;
    }
    // Pitch with mowing stripes towards a vanishing point
    out += rect(0, 860, W, H - 860, `url(#${pitch})`);
    const stripes = 14;
    for (let i = 0; i < stripes; i += 2) {
      const x1 = (i / stripes) * W * 3 - W;
      const x2 = ((i + 1) / stripes) * W * 3 - W;
      out += `<polygon points="${r(W / 2 + (x1 - W / 2) * 0.18)},860 ${r(W / 2 + (x2 - W / 2) * 0.18)},860 ${r(x2)},${H} ${r(x1)},${H}" fill="#000000" opacity="0.1"/>`;
    }
    out += `<path d="M${W / 2 - 330} ${H} Q${W / 2} 1060 ${W / 2 + 330} ${H}" fill="none" stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="4"/>`;
    for (const x of LIGHTS) {
      out += `<circle cx="${x}" cy="150" r="190" fill="url(#${glow})"/>`;
      out += roundRect(x - 44, 132, 88, 34, 6, "#EAF3FF");
    }
    // Darken for readable text
    out += rect(0, 0, W, H, `url(#${shade})`);
    return out;
  },

  overlay() {
    return "";
  },

  headline(c, value, cx, y, maxWidth, maxSize, p) {
    const blur = c.id("blur");
    c.defs.push(`<filter id="${blur}" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="16"/></filter>`);
    const o = { font: "Anton" as const, size: maxSize, anchor: "middle" as const, maxWidth, minSize: 56, letterSpacing: 3 };
    const size = textSize(value.toUpperCase(), o);
    const svg = `<g filter="url(#${blur})" opacity="0.8">${text(value.toUpperCase(), cx, y, { ...o, fill: p.accent })}</g>` + text(value.toUpperCase(), cx, y, { ...o, fill: "#FFFFFF" });
    return { svg, size };
  },

  scorePanel(c, x, y, w, h, p) {
    return roundRect(x, y, w, h, 28, "#FFFFFF", `fill-opacity="0.1" stroke="#FFFFFF" stroke-opacity="0.45" stroke-width="2"`) + roundRect(x + w / 2 - 90, y - 4, 180, 8, 4, p.accent);
  },

  photo(c, url, x, y, w, h, p) {
    return coverImage(c, url, x, y, w, h, 28) + roundRect(x, y, w, h, 28, "none", `stroke="${p.accent}" stroke-width="6"`);
  },

  bar(c, x, y, w, h, p) {
    return roundRect(x, y, w, h, h / 2, p.accent);
  },

  row(c, x, y, w, h, p, highlight) {
    return highlight
      ? roundRect(x, y, w, h, Math.min(20, h / 2), p.accent)
      : roundRect(x, y, w, h, Math.min(20, h / 2), "#FFFFFF", `fill-opacity="0.1" stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="2"`);
  },
};
