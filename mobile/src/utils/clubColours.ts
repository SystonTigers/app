/**
 * Club colours (Club Settings → Club colours): the kit colours offered as
 * swatches, and checks on a typed colour. The main colour is the app's accent
 * (buttons, highlights) and graphics' main colour; the second colour is used
 * alongside it in graphics. Tested by test/clubColours.test.js.
 */

export const KIT_COLOURS: Array<{ name: string; hex: string }> = [
  { name: 'Yellow', hex: '#FFD700' },
  { name: 'Amber', hex: '#F5B800' },
  { name: 'Orange', hex: '#FF7A00' },
  { name: 'Red', hex: '#D7141A' },
  { name: 'Claret', hex: '#7A1F3D' },
  { name: 'Pink', hex: '#E8559A' },
  { name: 'Purple', hex: '#6B2C91' },
  { name: 'Royal blue', hex: '#0055B8' },
  { name: 'Sky blue', hex: '#5BC2E7' },
  { name: 'Navy', hex: '#1B2A5C' },
  { name: 'Green', hex: '#00873E' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Black', hex: '#111111' },
];

/** "#ffd700", "ffd700" or "#FFD700" → "#FFD700"; anything else → null. */
export function normaliseHex(value: string): string | null {
  const v = value.trim().replace(/^#?/, '#').toUpperCase();
  return /^#[0-9A-F]{6}$/.test(v) ? v : null;
}

/** Relative brightness 0 (black) .. 1 (white). */
export function brightness(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** A warning for a main colour that would be hard to see on the app's dark screens, or null. */
export function mainColourWarning(hex: string): string | null {
  return brightness(hex) < 0.03
    ? "That's very dark, so buttons and highlights will be hard to see on the app's dark screens. If your kit is dark, use your brighter kit colour as the main one."
    : null;
}

export function colourName(hex: string | null | undefined): string {
  if (!hex) return 'Not set';
  return KIT_COLOURS.find((k) => k.hex === hex.toUpperCase())?.name ?? hex.toUpperCase();
}
