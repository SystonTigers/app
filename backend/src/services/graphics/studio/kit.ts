/**
 * Effects for the Studio designs (based on the club's Canva set): grain,
 * dry-brush strokes, torn edges, halftone dots, chevrons, the crest
 * watermark and outlined "ghost" headlines. Everything takes the club's own
 * colours, so every club gets its own look. Brushes and torn edges are drawn
 * as shapes rather than filters so posts render quickly in the Worker.
 */
import { containImage, hasImage, r, seeded, type Canvas } from "../svg";
import { escapeXml, initials, luminance, type FontName } from "../text";
import type { Brand } from "../types";

/** The colours a club's graphics are built from. */
export interface ClubColours {
  /** The club's main colour (fills, big shapes) */
  main: string;
  /** Text and shapes on the main colour */
  onMain: string;
  /** The dark base the club's colour sits on */
  dark: string;
  /** The club colour made bright enough to read on the dark base */
  pop: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r1, g, b]: [number, number, number]): string {
  return `#${[r1, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

/** Mix two colours (t = 0 gives a, 1 gives b). */
export function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

/**
 * Pick the club's colours. The primary colour is the "main" one unless it's
 * near-white or near-black, so white-shirted clubs still get their real
 * colour on the big shapes.
 */
export function clubColours(brand: Brand): ClubColours {
  const a = brand.primaryColor;
  const b = brand.secondaryColor;
  const nearWhite = (c: string) => luminance(c) > 0.85;
  const nearBlack = (c: string) => luminance(c) < 0.02;
  let main = a;
  if (nearWhite(a) || nearBlack(a)) main = nearWhite(b) || nearBlack(b) ? "#E5252A" : b;
  const dark = mix("#08090B", main, 0.06);
  let pop = main;
  for (let i = 0; i < 6 && luminance(pop) < 0.18; i++) pop = mix(pop, "#FFFFFF", 0.22);
  const onMain = luminance(main) > 0.4 ? "#0B0B0C" : "#FFFFFF";
  return { main, onMain, dark, pop };
}

/** Film grain over everything, so flat colour reads like print (one small noise tile, repeated). */
export function grain(c: Canvas, w: number, h: number, strength = 0.18): string {
  const f = c.id("grainf");
  const p = c.id("grain");
  const t = 180;
  c.defs.push(
    `<filter id="${f}" x="0" y="0" width="${t}" height="${t}" filterUnits="userSpaceOnUse"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" stitchTiles="stitch" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 ${strength * 2.2} -${strength * 0.6}"/></filter>`,
    `<pattern id="${p}" x="0" y="0" width="${t}" height="${t}" patternUnits="userSpaceOnUse"><rect width="${t}" height="${t}" filter="url(#${f})"/></pattern>`,
  );
  return `<rect x="0" y="0" width="${w}" height="${h}" fill="url(#${p})" style="mix-blend-mode:overlay"/>`;
}

/** Dark corners pulling the eye to the middle. */
export function vignette(c: Canvas, w: number, h: number, strength = 0.55): string {
  const id = c.id("vig");
  c.defs.push(`<radialGradient id="${id}" cx="50%" cy="45%" r="75%"><stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="${strength}"/></radialGradient>`);
  return `<rect x="0" y="0" width="${w}" height="${h}" fill="url(#${id})"/>`;
}

/** Points along a ragged edge from (x1,y1) to (x2,y2): small jitter with the odd deeper tear. */
function raggedEdge(x1: number, y1: number, x2: number, y2: number, rand: () => number, depth: number, step = 9): string[] {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = -(y2 - y1) / len;
  const ny = (x2 - x1) / len;
  const pts: string[] = [];
  let drift = 0;
  for (let d = 0; d <= len; d += step * (0.6 + rand() * 0.8)) {
    drift = drift * 0.7 + (rand() - 0.5) * depth;
    const tear = rand() < 0.04 ? (rand() - 0.3) * depth * 4 : 0;
    const off = drift + (rand() - 0.5) * depth * 0.6 + tear;
    pts.push(`${r(x1 + ((x2 - x1) * d) / len + nx * off)},${r(y1 + ((y2 - y1) * d) / len + ny * off)}`);
  }
  return pts;
}

/** A torn-paper panel: a rectangle whose edges are ripped. */
export function tornPanel(_c: Canvas, x: number, y: number, w: number, h: number, colour: string, seed: number, extra = ""): string {
  const rand = seeded(`torn:${seed}:${Math.round(x)}:${Math.round(y)}`);
  const depth = 16;
  const pts = [
    ...raggedEdge(x, y, x + w, y, rand, depth),
    ...raggedEdge(x + w, y, x + w, y + h, rand, depth),
    ...raggedEdge(x + w, y + h, x, y + h, rand, depth),
    ...raggedEdge(x, y + h, x, y, rand, depth),
  ];
  return `<polygon points="${pts.join(" ")}" fill="${colour}" ${extra}/>`;
}

/** Points along a path of one move and a cubic curve or a line ("M x y C x1 y1, x2 y2, x y" / "M x y L x y"). */
function samplePath(d: string, steps = 60): Array<[number, number]> {
  const nums = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  const pts: Array<[number, number]> = [];
  const [sx, sy] = [nums[0], nums[1]];
  if (/C/i.test(d) && nums.length >= 8) {
    const [x1, y1, x2, y2, x3, y3] = nums.slice(2, 8);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = (1 - t) ** 3;
      const b = 3 * (1 - t) ** 2 * t;
      const cc = 3 * (1 - t) * t ** 2;
      const e = t ** 3;
      pts.push([a * sx + b * x1 + cc * x2 + e * x3, a * sy + b * y1 + cc * y2 + e * y3]);
    }
  } else {
    const [ex, ey] = [nums[2] ?? sx, nums[3] ?? sy];
    for (let i = 0; i <= steps; i++) pts.push([sx + ((ex - sx) * i) / steps, sy + ((ey - sy) * i) / steps]);
  }
  return pts;
}

/**
 * A thick dry-brush stroke along a path: a ribbon with ragged edges that
 * tapers at the ends, bristle streaks where the paint runs thin, and flecks.
 */
export function brushStroke(_c: Canvas, d: string, width: number, colour: string, seed: number, opacity = 1): string {
  const rand = seeded(`brush:${seed}:${d}`);
  const pts = samplePath(d);
  const n = pts.length;
  const half = width / 2;
  const normals = pts.map((_, i) => {
    const [ax, ay] = pts[Math.max(0, i - 1)];
    const [bx, by] = pts[Math.min(n - 1, i + 1)];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    return [-(by - ay) / len, (bx - ax) / len] as const;
  });
  const top: string[] = [];
  const bottom: string[] = [];
  let jt = 0;
  let jb = 0;
  pts.forEach(([x, y], i) => {
    const taper = Math.min(1, (i + 1) / 6, (n - i) / 9);
    jt = jt * 0.6 + (rand() - 0.5) * width * 0.22;
    jb = jb * 0.6 + (rand() - 0.5) * width * 0.22;
    const [nx, ny] = normals[i];
    top.push(`${r(x + nx * (half * taper + jt))},${r(y + ny * (half * taper + jt))}`);
    bottom.push(`${r(x - nx * (half * taper + jb))},${r(y - ny * (half * taper + jb))}`);
  });
  let out = `<polygon points="${[...top, ...bottom.reverse()].join(" ")}" fill="${colour}"/>`;
  // Bristle streaks along the stroke
  const streaks = Math.round(width / 8);
  for (let s = 0; s < streaks; s++) {
    const off = (rand() - 0.5) * width * 0.8;
    const from = Math.floor(rand() * n * 0.7);
    const to = Math.min(n, from + 6 + Math.floor(rand() * n * 0.5));
    const line = pts.slice(from, to).map(([x, y], i) => {
      const [nx, ny] = normals[from + i];
      return `${r(x + nx * off)},${r(y + ny * off)}`;
    });
    out += `<polyline points="${line.join(" ")}" fill="none" stroke="${mix(colour, "#FFFFFF", 0.14)}" stroke-width="${r(1 + rand() * 2.5)}" stroke-linecap="round" opacity="${r(0.25 + rand() * 0.35)}"/>`;
  }
  // Flecks flicked off the brush
  for (let i = 0; i < 8; i++) {
    const k = Math.floor(rand() * n);
    const [x, y] = pts[k];
    const [nx, ny] = normals[k];
    const dist = (half + 4 + rand() * width * 0.22) * (rand() < 0.5 ? 1 : -1);
    out += `<ellipse cx="${r(x + nx * dist)}" cy="${r(y + ny * dist)}" rx="${r(2 + rand() * 9)}" ry="${r(1.5 + rand() * 4)}" fill="${colour}"/>`;
  }
  return `<g opacity="${opacity}">${out}</g>`;
}

/** A soft fade so a photo melts into the page: solid in the middle, gone at the given edges. */
export function fadeMask(c: Canvas, x: number, y: number, w: number, h: number, edges: { left?: number; right?: number; top?: number; bottom?: number }): string {
  const id = c.id("fade");
  const gx = c.id("gx");
  const gy = c.id("gy");
  const l = edges.left ?? 0;
  const rr = edges.right ?? 0;
  const t = edges.top ?? 0;
  const b = edges.bottom ?? 0;
  c.defs.push(
    `<linearGradient id="${gx}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="${l ? 0 : 1}"/><stop offset="${r(l)}" stop-color="#fff"/><stop offset="${r(1 - rr)}" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="${rr ? 0 : 1}"/></linearGradient>`,
    `<linearGradient id="${gy}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="${t ? 0 : 1}"/><stop offset="${r(t)}" stop-color="#fff"/><stop offset="${r(1 - b)}" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="${b ? 0 : 1}"/></linearGradient>`,
    `<mask id="${id}y" maskUnits="userSpaceOnUse" x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}"><rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" fill="url(#${gy})"/></mask>`,
    `<mask id="${id}" maskUnits="userSpaceOnUse" x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}"><rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" fill="url(#${gx})" mask="url(#${id}y)"/></mask>`,
  );
  return id;
}

/** A proper football (white with black patches) with a coloured ring. */
export function ball(cx: number, cy: number, radius: number, outline = "#0B0B0C"): string {
  const patch = radius * 0.4;
  const pts: string[] = [];
  let seams = "";
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    pts.push(`${r(cx + patch * Math.cos(a))},${r(cy + patch * Math.sin(a))}`);
    seams += `<line x1="${r(cx + patch * Math.cos(a))}" y1="${r(cy + patch * Math.sin(a))}" x2="${r(cx + radius * Math.cos(a))}" y2="${r(cy + radius * Math.sin(a))}" stroke="#0B0B0C" stroke-width="${r(Math.max(2, radius * 0.09))}"/>`;
  }
  return `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(radius * 1.12)}" fill="${outline}"/><circle cx="${r(cx)}" cy="${r(cy)}" r="${r(radius)}" fill="#FFFFFF"/><polygon points="${pts.join(" ")}" fill="#0B0B0C"/>${seams}`;
}

/** Halftone dots fading out from a corner (dx, dy point into the page). */
export function halftone(cx: number, cy: number, dx: number, dy: number, reach: number, colour: string, opacity = 0.75, step = 22): string {
  let dots = "";
  for (let i = 0; i * step < reach; i++) {
    for (let j = 0; j * step < reach; j++) {
      const x = i * step + (j % 2 ? step / 2 : 0);
      const y = j * step;
      const radius = step * 0.42 * (1 - Math.hypot(x, y) / reach);
      if (radius < 1) continue;
      dots += `<circle cx="${r(cx + dx * x)}" cy="${r(cy + dy * y)}" r="${r(radius)}"/>`;
    }
  }
  return `<g fill="${colour}" opacity="${opacity}">${dots}</g>`;
}

/** A band of halftone dots along a diagonal, biggest in the middle. */
export function halftoneBand(x1: number, y1: number, x2: number, y2: number, width: number, colour: string, opacity = 0.6, step = 20): string {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  let dots = "";
  for (let s = 0; s < len; s += step) {
    for (let t = -width / 2, row = 0; t <= width / 2; t += step, row++) {
      const fall = 1 - Math.abs(t) / (width / 2);
      const radius = step * 0.45 * fall * (0.35 + 0.65 * Math.sin((Math.PI * s) / len));
      if (radius < 0.9) continue;
      const off = row % 2 ? step / 2 : 0;
      dots += `<circle cx="${r(x1 + ux * (s + off) - uy * t)}" cy="${r(y1 + uy * (s + off) + ux * t)}" r="${r(radius)}"/>`;
    }
  }
  return `<g fill="${colour}" opacity="${opacity}">${dots}</g>`;
}

/** Chevron stripes (hazard style) leaning right. */
export function chevrons(x: number, y: number, count: number, w: number, h: number, gap: number, colour: string, opacity = 1): string {
  let out = "";
  for (let i = 0; i < count; i++) {
    const left = x + i * (w + gap);
    out += `<polygon points="${r(left)},${r(y + h)} ${r(left + h * 0.6)},${r(y)} ${r(left + w + h * 0.6)},${r(y)} ${r(left + w)},${r(y + h)}" fill="${colour}" opacity="${r(opacity * (1 - i * 0.18))}"/>`;
  }
  return out;
}

/**
 * The club's crest as a big watermark disc (like the STJ monogram in the
 * Canva set). Falls back to the club's initials.
 */
export function crestDisc(c: Canvas, brand: Brand, cx: number, cy: number, radius: number, colour: string, opacity: number, rotate = -14): string {
  let out = `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(radius)}" fill="${colour}" opacity="${opacity}"/>`;
  const size = radius * 1.35;
  if (hasImage(c, brand.badgeUrl)) {
    out += `<g opacity="${r(Math.min(1, opacity * 1.6))}" transform="rotate(${rotate} ${r(cx)} ${r(cy)})">${containImage(c, brand.badgeUrl, cx - size / 2, cy - size / 2, size, size)}</g>`;
  } else {
    const label = escapeXml(initials(brand.clubName));
    out += `<text x="${r(cx)}" y="${r(cy + radius * 0.3)}" font-family="Anton" font-size="${r(radius * 0.95)}" fill="none" stroke="${luminance(colour) > 0.4 ? "#0B0B0C" : "#FFFFFF"}" stroke-width="${r(radius * 0.045)}" text-anchor="middle" transform="rotate(${rotate} ${r(cx)} ${r(cy)})">${label}</text>`;
  }
  return out;
}

/** Text options for the poster helpers. */
export interface Lettering {
  font: FontName;
  size: number;
  fill: string;
  anchor?: "start" | "middle" | "end";
  letterSpacing?: number;
  /** Horizontal stretch (1 = normal); condensed type looks taller when squeezed */
  scaleX?: number;
  skew?: number;
  rotate?: number;
  opacity?: number;
  stroke?: string;
  strokeWidth?: number;
}

/** One line of text with stretch, skew and rotation around its anchor point. */
export function letters(value: string, x: number, y: number, o: Lettering): string {
  const parts: string[] = [];
  if (o.rotate) parts.push(`rotate(${o.rotate} ${r(x)} ${r(y)})`);
  parts.push(`translate(${r(x)} ${r(y)})`);
  if (o.skew) parts.push(`skewX(${o.skew})`);
  if (o.scaleX && o.scaleX !== 1) parts.push(`scale(${o.scaleX} 1)`);
  const attrs = [
    `x="0" y="0"`, `font-family="${o.font}"`, `font-size="${r(o.size)}"`, `fill="${o.fill}"`,
    o.anchor && o.anchor !== "start" ? `text-anchor="${o.anchor}"` : "",
    o.letterSpacing ? `letter-spacing="${o.letterSpacing}"` : "",
    o.opacity !== undefined ? `opacity="${o.opacity}"` : "",
    o.stroke ? `stroke="${o.stroke}" stroke-width="${o.strokeWidth ?? 2}" stroke-linejoin="round"` : "",
  ].filter(Boolean).join(" ");
  return `<text ${attrs} transform="${parts.join(" ")}">${escapeXml(value)}</text>`;
}

/** A headline with outlined "ghost" copies stepped behind it. */
export function ghosted(value: string, x: number, y: number, o: Lettering, ghost: string, step: [number, number], copies = 2): string {
  let out = "";
  for (let i = copies; i >= 1; i--) {
    out += letters(value, x + step[0] * i, y + step[1] * i, { ...o, fill: "none", stroke: ghost, strokeWidth: Math.max(3, o.size * 0.012), opacity: 0.55 - i * 0.12 });
  }
  return out + letters(value, x, y, o);
}

/** A soft drop shadow for small things like badges (keep it off big areas: blurs are slow). */
export function shadowFilter(c: Canvas, blur = 14, opacity = 0.55, dy = 10): string {
  const id = c.id("shadow");
  c.defs.push(`<filter id="${id}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceAlpha" stdDeviation="${blur}"/><feOffset dy="${dy}" result="b"/><feComponentTransfer><feFuncA type="linear" slope="${opacity}"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
  return id;
}

/**
 * A photo in the club's colours (duotone): shadows go to the dark base,
 * highlights to a light tint of the club colour. Makes any phone photo look
 * like part of the design.
 */
export function duotoneFilter(c: Canvas, dark: string, light: string): string {
  const id = c.id("duo");
  const [dr, dg, db] = hexToRgb(dark).map((v) => v / 255);
  const [lr, lg, lb] = hexToRgb(light).map((v) => v / 255);
  c.defs.push(
    `<filter id="${id}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0 0 0 1 0"/>` +
      `<feComponentTransfer><feFuncR type="table" tableValues="${dr.toFixed(3)} ${lr.toFixed(3)}"/><feFuncG type="table" tableValues="${dg.toFixed(3)} ${lg.toFixed(3)}"/><feFuncB type="table" tableValues="${db.toFixed(3)} ${lb.toFixed(3)}"/></feComponentTransfer></filter>`,
  );
  return id;
}

/** Same post, same scatter: a seeded random source from the post's content. */
export function randomFor(...parts: Array<string | number | null | undefined>): () => number {
  return seeded(parts.join("|"));
}
