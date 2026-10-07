/**
 * Backgrounds for the Studio packs: a dark poster (results, fixtures, table)
 * and a floodlit stadium at night (match day, kick-off, line-ups). Both are
 * drawn, tinted with the club's colours, so no stock photos are needed.
 */
import { r, rect, type Canvas } from "../svg";
import type { Brand } from "../types";
import { crestDisc, grain, halftoneBand, mix, randomFor, vignette, type ClubColours } from "./kit";

/** Dark poster: black with club-colour slashes, a halftone band and the crest watermark. */
export function darkScene(c: Canvas, brand: Brand, k: ClubColours, w: number, h: number, seed: string, crest = true): string {
  const rand = randomFor(seed);
  const story = h > w * 1.5;
  const glow = c.id("glow");
  c.defs.push(`<radialGradient id="${glow}" cx="30%" cy="25%" r="80%"><stop offset="0" stop-color="${mix(k.dark, k.main, 0.16)}"/><stop offset="1" stop-color="${k.dark}"/></radialGradient>`);
  let out = rect(0, 0, w, h, `url(#${glow})`);
  // A wide band of halftone dots running corner to corner
  out += halftoneBand(-80, h * 0.92, w + 80, h * 0.18, w * 0.55, k.main, 0.5, 22);
  // Club-colour slashes top-left and bottom-right
  const slash = (x: number, y: number, len: number, thick: number, opacity: number) =>
    `<polygon points="${r(x)},${r(y)} ${r(x + thick)},${r(y)} ${r(x + thick - len)},${r(y + len)} ${r(x - len)},${r(y + len)}" fill="${k.main}" opacity="${opacity}"/>`;
  out += slash(150, -20, 260, 70, 1) + slash(250, -20, 260, 40, 0.85) + slash(320, -20, 260, 18, 0.7);
  const by = h - (story ? 300 : 230);
  out += slash(w + 30, by, 300, 70, 1) + slash(w - 70, by, 300, 40, 0.85) + slash(w - 140, by, 300, 18, 0.7);
  // The crest as a big watermark disc top-right
  if (crest) out += crestDisc(c, brand, w - 120, story ? 170 : 130, story ? 200 : 170, k.main, 0.85, -12 - rand() * 6);
  return out + vignette(c, w, h, 0.5);
}

/** Floodlit stadium at night, sky and stands tinted with the club colour (gradients only: blurs are slow). */
export function stadiumScene(c: Canvas, k: ClubColours, w: number, h: number, seed: string): string {
  const rand = randomFor(seed);
  const horizon = h * 0.56;
  const sky = c.id("sky");
  const pitch = c.id("pitch");
  const pool = c.id("pool");
  const glow = c.id("glow");
  const core = c.id("core");
  const beam = c.id("beam");
  const tintDark = mix("#05070C", k.main, 0.22);
  c.defs.push(
    `<linearGradient id="${sky}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix("#020306", k.main, 0.1)}"/><stop offset="0.55" stop-color="${tintDark}"/><stop offset="1" stop-color="${mix(tintDark, "#FFFFFF", 0.18)}"/></linearGradient>`,
    `<linearGradient id="${pitch}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1F5E2A"/><stop offset="0.5" stop-color="#2E7D32"/><stop offset="1" stop-color="#173F1D"/></linearGradient>`,
    `<radialGradient id="${pool}" cx="50%" cy="20%" r="70%"><stop offset="0" stop-color="#E8FFD8" stop-opacity="0.38"/><stop offset="1" stop-color="#E8FFD8" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="${glow}"><stop offset="0" stop-color="${mix(k.main, "#FFFFFF", 0.75)}" stop-opacity="0.55"/><stop offset="0.35" stop-color="${mix(k.main, "#FFFFFF", 0.6)}" stop-opacity="0.18"/><stop offset="1" stop-color="${k.main}" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="${core}"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.3" stop-color="#FFFFFF" stop-opacity="0.9"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>`,
    `<linearGradient id="${beam}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.16"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>`,
  );
  let out = rect(0, 0, w, horizon + 4, `url(#${sky})`);

  // The stand: a dark tier with a crowd of soft little lights and shirts
  const standTop = horizon - h * 0.2;
  out += `<polygon points="0,${r(standTop + 40)} ${w},${r(standTop)} ${w},${r(horizon)} 0,${r(horizon)}" fill="${mix(tintDark, "#000000", 0.35)}"/>`;
  const crowdColours = ["#FFFFFF", k.main, "#9AA7B8", "#3B4656", mix(k.main, "#FFFFFF", 0.4)];
  let crowd = "";
  for (let i = 0; i < 700; i++) {
    const x = rand() * w;
    const top = standTop + 40 - (x / w) * 40;
    const y = top + rand() * (horizon - top);
    crowd += `<circle cx="${r(x)}" cy="${r(y)}" r="${r(1.6 + rand() * 3)}" fill="${crowdColours[Math.floor(rand() * crowdColours.length)]}" opacity="${r(0.1 + rand() * 0.3)}"/>`;
  }
  out += crowd;
  out += `<rect x="0" y="${r(horizon - 16)}" width="${w}" height="16" fill="${mix(k.main, "#000000", 0.35)}" opacity="0.9"/>`;

  // Floodlights: a wide glow, long beams onto the pitch and a bright starburst
  const lights: Array<[number, number]> = [[w * 0.12, standTop - h * 0.12], [w * 0.88, standTop - h * 0.16]];
  for (const [lx, ly] of lights) {
    const fx = w / 2 + (lx - w / 2) * 0.2;
    out += `<polygon points="${r(lx - 30)},${r(ly)} ${r(lx + 30)},${r(ly)} ${r(fx + 300)},${r(h)} ${r(fx - 300)},${r(h)}" fill="url(#${beam})"/>`;
    out += `<circle cx="${r(lx)}" cy="${r(ly)}" r="260" fill="url(#${glow})"/>`;
    out += `<ellipse cx="${r(lx)}" cy="${r(ly)}" rx="90" ry="5" fill="url(#${core})"/><ellipse cx="${r(lx)}" cy="${r(ly)}" rx="5" ry="55" fill="url(#${core})"/>`;
    out += `<circle cx="${r(lx)}" cy="${r(ly)}" r="34" fill="url(#${core})"/>`;
  }

  // The pitch in perspective with mowing stripes and lines
  out += rect(0, horizon, w, h - horizon, `url(#${pitch})`);
  const vx = w / 2;
  const vy = horizon - h * 0.55;
  const at = (x: number, y: number) => vx + (x - vx) * ((y - vy) / (h - vy));
  const stripes = 9;
  for (let i = 0; i < stripes; i += 2) {
    const y1 = horizon + (h - horizon) * (i / stripes) ** 1.6;
    const y2 = horizon + (h - horizon) * ((i + 1) / stripes) ** 1.6;
    out += `<polygon points="0,${r(y1)} ${w},${r(y1)} ${w},${r(y2)} 0,${r(y2)}" fill="#FFFFFF" opacity="0.06"/>`;
  }
  const line = (x1: number, y1: number, x2: number, y2: number) => `<line x1="${r(at(x1, y1))}" y1="${r(y1)}" x2="${r(at(x2, y2))}" y2="${r(y2)}" stroke="#FFFFFF" stroke-width="4" opacity="0.55"/>`;
  const boxY = horizon + (h - horizon) * 0.16;
  out += line(-w * 0.6, horizon + 6, w * 1.6, horizon + 6);
  out += line(w * 0.2, horizon + 6, w * 0.2, boxY) + line(w * 0.8, horizon + 6, w * 0.8, boxY) + line(w * 0.2, boxY, w * 0.8, boxY);
  out += `<ellipse cx="${w / 2}" cy="${r(h * 0.94)}" rx="${r(w * 0.42)}" ry="${r(h * 0.07)}" fill="none" stroke="#FFFFFF" stroke-width="4" opacity="0.4"/>`;
  out += rect(0, horizon, w, h - horizon, `url(#${pool})`);
  return out + vignette(c, w, h, 0.62) + grain(c, w, h, 0.16);
}
