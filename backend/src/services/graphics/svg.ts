/** Small SVG building blocks shared by the design packs. */
import { escapeXml, fitSize, initials, inkOn, measure, truncate, type FontName } from "./text";
import type { ImageMap } from "./types";

export interface Canvas {
  images: ImageMap;
  /** Unique ids for clip paths, gradients and filters within one SVG */
  id(prefix: string): string;
  defs: string[];
}

export function createCanvas(images: ImageMap): Canvas {
  let n = 0;
  return { images, defs: [], id: (prefix) => `${prefix}${++n}` };
}

export function svgDocument(width: number, height: number, canvas: Canvas, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${canvas.defs.join("")}</defs>${body}</svg>`;
}

type Anchor = "start" | "middle" | "end";

export interface TextOptions {
  font: FontName;
  size: number;
  fill: string;
  anchor?: Anchor;
  letterSpacing?: number;
  opacity?: number;
  /** Shrink to fit this width (down to minSize), then cut with an ellipsis */
  maxWidth?: number;
  minSize?: number;
  stroke?: string;
  strokeWidth?: number;
  transform?: string;
}

/** A single line of text; `y` is the baseline. Returns the SVG and the size used. */
export function text(value: string, x: number, y: number, o: TextOptions): string {
  let size = o.size;
  let content = value;
  if (o.maxWidth) {
    size = fitSize(value, o.font, o.size, o.minSize ?? Math.round(o.size * 0.5), o.maxWidth, o.letterSpacing ?? 0);
    content = truncate(value, o.font, size, o.maxWidth);
  }
  const attrs = [
    `x="${r(x)}"`, `y="${r(y)}"`, `font-family="${o.font}"`, `font-size="${size}"`, `fill="${o.fill}"`,
    o.anchor && o.anchor !== "start" ? `text-anchor="${o.anchor}"` : "",
    o.letterSpacing ? `letter-spacing="${o.letterSpacing}"` : "",
    o.opacity !== undefined ? `opacity="${o.opacity}"` : "",
    o.stroke ? `stroke="${o.stroke}" stroke-width="${o.strokeWidth ?? 2}" paint-order="stroke"` : "",
    o.transform ? `transform="${o.transform}"` : "",
  ].filter(Boolean).join(" ");
  return `<text ${attrs}>${escapeXml(content)}</text>`;
}

/** The size `text()` would use for these options. */
export function textSize(value: string, o: Omit<TextOptions, "fill">): number {
  return o.maxWidth ? fitSize(value, o.font, o.size, o.minSize ?? Math.round(o.size * 0.5), o.maxWidth, o.letterSpacing ?? 0) : o.size;
}

export function rect(x: number, y: number, w: number, h: number, fill: string, extra = ""): string {
  return `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" fill="${fill}" ${extra}/>`;
}

export function roundRect(x: number, y: number, w: number, h: number, radius: number, fill: string, extra = ""): string {
  return `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="${radius}" fill="${fill}" ${extra}/>`;
}

/** An image cropped to fill a box (rounded corners optional). Nothing if it didn't load. */
export function coverImage(c: Canvas, url: string | null, x: number, y: number, w: number, h: number, radius = 0, extra = ""): string {
  const data = url ? c.images.get(url) : null;
  if (!data) return "";
  const clip = c.id("clip");
  c.defs.push(`<clipPath id="${clip}"><rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="${radius}"/></clipPath>`);
  return `<image href="${data}" x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clip})" ${extra}/>`;
}

/** An image scaled to fit inside a box without cropping. */
export function containImage(c: Canvas, url: string | null, x: number, y: number, w: number, h: number): string {
  const data = url ? c.images.get(url) : null;
  if (!data) return "";
  return `<image href="${data}" x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" preserveAspectRatio="xMidYMid meet"/>`;
}

export function hasImage(c: Canvas, url: string | null): boolean {
  return Boolean(url && c.images.get(url));
}

/**
 * A team badge in a square of `size` centred on (cx, cy). Falls back to the
 * team's initials in a circle when there's no badge.
 */
export function badge(c: Canvas, url: string | null, name: string, cx: number, cy: number, size: number, fallbackFill: string, font: FontName = "Anton"): string {
  if (hasImage(c, url)) return containImage(c, url, cx - size / 2, cy - size / 2, size, size);
  const label = initials(name);
  const ink = inkOn(fallbackFill);
  return `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(size / 2)}" fill="${fallbackFill}"/>` +
    text(label, cx, cy + size * 0.17, { font, size: Math.round(size * 0.44), fill: ink, anchor: "middle", maxWidth: size * 0.8 });
}

/** Deterministic random numbers so the same post always draws the same way. */
export function seeded(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Round to 1 decimal place for compact SVG. */
export function r(n: number): string {
  return String(Math.round(n * 10) / 10);
}

export { measure };
