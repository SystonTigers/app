/** Pieces the club-design layouts share: text in a slot, badges, sponsor and player photos. */
import { badge, containImage, hasImage, r, text, type Canvas } from "../svg";
import type { FontName } from "../text";
import type { Brand } from "../types";
import { duotoneFilter, fadeMask, shadowFilter } from "../studio/kit";

export const NAME_FONT: FontName = "Barlow Condensed ExtraBold";
export const NUMBER_FONT: FontName = "Anton";

/** Text centred in a slot (x is the slot's centre, y the baseline), shrunk to fit its width. */
export function slot(value: string, cx: number, y: number, width: number, size: number, fill: string, font: FontName = NAME_FONT, anchor: "start" | "middle" | "end" = "middle"): string {
  if (!value) return "";
  return text(value.toUpperCase(), cx, y, { font, size, fill, anchor, maxWidth: width, minSize: Math.round(size * 0.45), letterSpacing: font === NAME_FONT ? 1 : 0 });
}

/** Like slot(), with a dark outline so it reads over busy or bright artwork. */
export function outlinedSlot(value: string, cx: number, y: number, width: number, size: number, fill: string, font: FontName = NAME_FONT): string {
  if (!value) return "";
  return text(value.toUpperCase(), cx, y, { font, size, fill, anchor: "middle", maxWidth: width, minSize: Math.round(size * 0.45), letterSpacing: 1, stroke: "#0B0B0C", strokeWidth: Math.max(4, size * 0.16) });
}

/** A team badge (initials in a disc when there isn't one) with a soft shadow. */
export function teamBadge(c: Canvas, url: string | null, name: string, cx: number, cy: number, size: number, fallback = "#1B2230"): string {
  const sid = shadowFilter(c, 10, 0.45, 6);
  return `<g filter="url(#${sid})">${badge(c, url, name, cx, cy, size, fallback)}</g>`;
}

/** The club's sponsor in a white box (a logo if uploaded, else the name). Nothing when there's no sponsor. */
export function sponsorBox(c: Canvas, brand: Brand, x: number, y: number, w: number, h: number): string {
  if (hasImage(c, brand.sponsorLogoUrl)) {
    return `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="8" fill="#FFFFFF"/>` + containImage(c, brand.sponsorLogoUrl, x + 6, y + 6, w - 12, h - 12);
  }
  if (brand.sponsorName) {
    return `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="8" fill="#FFFFFF"/>` +
      text("SPONSORED BY", x + w / 2, y + h * 0.36, { font: NAME_FONT, size: Math.min(14, w / 9), fill: "#555555", anchor: "middle" }) +
      text(brand.sponsorName.toUpperCase(), x + w / 2, y + h * 0.72, { font: NAME_FONT, size: h * 0.26, fill: "#0B0B0C", anchor: "middle", maxWidth: w - 12, minSize: 10 });
  }
  return "";
}

/**
 * A player's photo. A cut-out (PNG with the background removed) stands in
 * the design like the Canva set; an ordinary photo is tinted and faded in so
 * it never sits as a hard rectangle.
 */
export function playerPhoto(c: Canvas, url: string | null, x: number, y: number, w: number, h: number, tint: { dark: string; light: string }): string {
  const data = url ? c.images.get(url) : null;
  if (!data) return "";
  if (isCutOut(data)) {
    return `<image href="${data}" x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" preserveAspectRatio="xMidYMax meet"/>`;
  }
  const duo = duotoneFilter(c, tint.dark, tint.light);
  const m = fadeMask(c, x, y, w, h, { left: 0.3, top: 0.1, bottom: 0.3, right: 0.05 });
  return `<g mask="url(#${m})"><g filter="url(#${duo})"><image href="${data}" x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" preserveAspectRatio="xMidYMid slice"/></g></g>`;
}

/** A PNG with see-through parts (colour type 4 or 6): a cut-out, not an ordinary photo. */
export function isCutOut(dataUri: string): boolean {
  if (!dataUri.startsWith("data:image/png;base64,")) return false;
  const head = atob(dataUri.slice(22, 22 + 44));
  return head.length > 25 && (head.charCodeAt(25) === 4 || head.charCodeAt(25) === 6);
}

/** "SAT 4 OCT" → ["SAT", "4 OCT"]. */
export function dayAndDate(date: string | null): [string, string] {
  if (!date) return ["", ""];
  const [day, ...rest] = date.split(" ");
  return rest.length ? [day, rest.join(" ")] : ["", date];
}
