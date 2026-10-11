/**
 * Pure helpers for the web app's pull-to-refresh (RefreshControl.web.tsx).
 * No react-native imports (tested in Node by test/pullToRefresh.test.js).
 */

/** How far (after damping) the list must be pulled to refresh, in px */
export const PULL_TRIGGER = 64;
/** The furthest the spinner follows the finger, in px */
export const PULL_MAX = 110;

/** Finger travel → how far the spinner moves: half speed, capped. */
export function pullDistance(fingerDy: number): number {
  if (!(fingerDy > 0)) return 0;
  return Math.min(PULL_MAX, Math.round(fingerDy * 0.5));
}

export interface ScrollerLike { scrollTop: number }

/** True when any list under the finger is scrolled down (then a pull is just scrolling up). */
export function scrolledAwayFromTop(scrollers: ScrollerLike[]): boolean {
  return scrollers.some((s) => s.scrollTop > 0);
}
