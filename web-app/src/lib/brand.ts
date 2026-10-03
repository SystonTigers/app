/**
 * The club's colour as CSS variables for the website, matching the app
 * (mobile/src/theme/brand.ts): the club colour is the accent on the dark ink
 * background, falling back to the Boost Huddle cyan.
 *
 * Tailwind's `brand` colour reads `--brand-rgb`, so `bg-brand`, `text-brand`
 * and `bg-brand/10` all follow the club.
 */

export const DEFAULT_BRAND = '#00FFFF';
const HEX = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i;
/** The page background the accent has to stand out against */
const INK: Rgb = [11, 13, 15];

type Rgb = [number, number, number];

export function parseHex(value: string | null | undefined): Rgb | null {
  const match = value ? HEX.exec(value.trim()) : null;
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Lighten a colour towards white until it reads on the dark background (3:1, like large text). */
export function readableOnInk(rgb: Rgb): Rgb {
  let out = rgb;
  for (let step = 1; contrast(out, INK) < 3 && step <= 10; step++) {
    const t = step / 10;
    out = rgb.map((c) => Math.round(c + (255 - c) * t)) as Rgb;
  }
  return out;
}

export interface BrandVars {
  brand: string;
  brandRgb: string;
  onBrandRgb: string;
}

/** The accent and the text colour to use on it, for a club colour (or the default). */
export function brandVars(primary: string | null | undefined): BrandVars {
  const rgb = readableOnInk(parseHex(primary) ?? (parseHex(DEFAULT_BRAND) as Rgb));
  const on: Rgb = contrast(rgb, [6, 8, 11]) >= contrast(rgb, [255, 255, 255]) ? [6, 8, 11] : [255, 255, 255];
  const hex = `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
  return { brand: hex, brandRgb: rgb.join(' '), onBrandRgb: on.join(' ') };
}

/** CSS that sets the club's colour on the page. */
export function brandCss(primary: string | null | undefined): string {
  const v = brandVars(primary);
  return `:root{--brand:${v.brand};--brand-rgb:${v.brandRgb};--on-brand-rgb:${v.onBrandRgb};--on-brand:rgb(${v.onBrandRgb});}`;
}

/** "Riverside Rovers" -> "RR", for a badge placeholder. */
export function clubInitials(name: string): string {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  const skip = new Set(['fc', 'afc', 'jfc', 'the', 'of', 'and']);
  const main = words.filter((w) => !skip.has(w.toLowerCase()));
  const pick = (main.length ? main : words).slice(0, 2).map((w) => w[0]!.toUpperCase());
  return pick.join('') || '?';
}
