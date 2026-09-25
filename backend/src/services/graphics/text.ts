/**
 * Text helpers for building SVG graphics. The Worker can't measure text, so
 * widths come from the bundled fonts' advance widths (fonts/metrics.ts).
 */
import { FONT_METRICS } from "./fonts/metrics";

export type FontName = keyof typeof FONT_METRICS;

/** Width of `text` in pixels at `size` in `font` (kerning ignored; close enough to fit). */
export function measure(text: string, font: FontName, size: number, letterSpacing = 0): number {
  const metrics = FONT_METRICS[font];
  if (!metrics) return text.length * size * 0.6;
  let ems = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 32;
    ems += metrics.advances[cp] ?? metrics.fallback;
  }
  return ems * size + Math.max(0, [...text].length - 1) * letterSpacing;
}

/** Largest size between min and max at which the text fits `width`. */
export function fitSize(text: string, font: FontName, max: number, min: number, width: number, letterSpacing = 0): number {
  let size = max;
  while (size > min && measure(text, font, size, letterSpacing) > width) size -= 2;
  return size;
}

/**
 * Break text into at most `maxLines` lines that fit `width`, shrinking the
 * font until it fits. Words longer than a line are kept whole.
 */
export function wrap(text: string, font: FontName, max: number, min: number, width: number, maxLines: number): { lines: string[]; size: number } {
  const words = text.split(/\s+/).filter(Boolean);
  for (let size = max; size >= min; size -= 2) {
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (!line || measure(next, font, size) <= width) {
        line = next;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    if (lines.length <= maxLines && lines.every((l) => measure(l, font, size) <= width)) return { lines, size };
  }
  // Still too long at the smallest size: cut it down to fit
  const size = min;
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (!line || measure(next, font, size) <= width) line = next;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  const kept = lines.slice(0, maxLines);
  if (lines.length > maxLines) kept[maxLines - 1] = truncate(`${kept[maxLines - 1]} ${lines.slice(maxLines).join(" ")}`, font, size, width);
  return { lines: kept, size };
}

/** Shorten text with an ellipsis so it fits. */
export function truncate(text: string, font: FontName, size: number, width: number): string {
  if (measure(text, font, size) <= width) return text;
  let out = text;
  while (out.length > 1 && measure(`${out}…`, font, size) > width) out = out.slice(0, -1);
  return `${out.trimEnd()}…`;
}

export function escapeXml(text: string): string {
  return text.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c] as string);
}

/** Initials for a badge placeholder: "Hillside Rangers" → "HR". */
export function initials(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter((w) => w && !/^(fc|afc|jfc|u\d+s?)$/i.test(w));
  return (words.length > 1 ? words.slice(0, 2).map((w) => w[0]) : [words[0]?.slice(0, 2) ?? "?"]).join("").toUpperCase();
}

/** Relative luminance 0–1 of a #rrggbb colour (0.5 when unreadable). */
export function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0.5;
  const n = parseInt(m[1], 16);
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** Black or white, whichever reads better on `hex`. */
export function inkOn(hex: string): string {
  return luminance(hex) > 0.4 ? "#0B0B0C" : "#FFFFFF";
}

/** A valid #rrggbb colour or the fallback. */
export function safeColor(value: string | null | undefined, fallback: string): string {
  return value && /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim() : fallback;
}
