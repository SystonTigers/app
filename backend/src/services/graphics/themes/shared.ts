/** Helpers the themes share. */
import { inkOn, luminance, safeColor } from "../text";
import type { Brand } from "../types";

/** The club colour that stands out on a dark background (falls back to the second colour, then gold). */
export function accentOnDark(brand: Brand, fallback = "#FFD21F"): string {
  for (const colour of [brand.primaryColor, brand.secondaryColor]) {
    const c = safeColor(colour, "");
    if (c && luminance(c) >= 0.1) return c;
  }
  return fallback;
}

/** A club colour dark enough to sit behind white text. */
export function deepClubColour(brand: Brand, fallback = "#0B2545"): string {
  for (const colour of [brand.primaryColor, brand.secondaryColor]) {
    const c = safeColor(colour, "");
    if (c && luminance(c) < 0.35) return c;
  }
  return fallback;
}

export { inkOn };

/** Parallelogram points leaning left or right. */
export function slanted(x: number, y: number, w: number, h: number, skew: number, side: "left" | "right"): string {
  return side === "left"
    ? `${x},${y + h} ${x + skew},${y} ${x + w},${y} ${x + w - skew},${y + h}`
    : `${x + skew},${y + h} ${x},${y} ${x + w - skew},${y} ${x + w},${y + h}`;
}
