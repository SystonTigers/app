/**
 * The app's look (see CLAUDE.md "App look"): dark ink background, raised
 * cards and the club's own colour as the accent. Screens take their colours
 * from here so every page matches the home screen and follows the club.
 *
 *   const useStyles = themedStyles((c) => ({ title: { color: c.primary } }));
 *   function Screen() { const styles = useStyles(); const c = useBrandColors(); ... }
 */
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { COLORS } from '../config';
import { useTheme } from './useTheme';
import { getContrastColor, withOpacity } from './utils';

export const INK = '#07090C';
export const CARD = '#12161B';
export const CARD_RAISED = '#1A1F26';
export const CARD_BORDER = 'rgba(255,255,255,0.08)';
export const TEXT = '#F2F5F7';
export const TEXT_MUTED = 'rgba(242,245,247,0.62)';
export const RADIUS = 18;

export interface BrandColors {
  primary: string;
  /** Text and icons drawn on top of the club colour */
  onPrimary: string;
  /** The club colour, faint: selected rows, chips, highlights */
  primarySoft: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  text: string;
  textLight: string;
  error: string;
  success: string;
  warning: string;
}

const HEX = /^#[0-9a-f]{6}$/i;

/** Colours for a club accent (falls back to the Boost Huddle cyan). */
export function brandColors(accent: string | null | undefined): BrandColors {
  const primary = accent && HEX.test(accent) ? accent : COLORS.primary;
  return {
    primary,
    onPrimary: getContrastColor(primary) === '#000000' ? '#06080B' : '#FFFFFF',
    primarySoft: withOpacity(primary, 0.14),
    secondary: COLORS.secondary,
    accent: primary,
    background: INK,
    surface: CARD,
    surfaceRaised: CARD_RAISED,
    border: CARD_BORDER,
    text: TEXT,
    textLight: TEXT_MUTED,
    error: COLORS.error,
    success: '#2BD576',
    warning: COLORS.warning,
  };
}

/** The current club's colours. */
export function useBrandColors(): BrandColors {
  const accent = useTheme().theme.colors.primary;
  return useMemo(() => brandColors(accent), [accent]);
}

/**
 * A stylesheet that follows the club colour. The factory runs once per accent
 * colour, so it costs the same as a normal StyleSheet.
 */
export function themedStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (c: BrandColors) => T & StyleSheet.NamedStyles<T>,
): () => T {
  const cache = new Map<string, T>();
  return function useStyles(): T {
    const c = useBrandColors();
    let styles = cache.get(c.primary);
    if (!styles) {
      styles = StyleSheet.create(factory(c));
      cache.set(c.primary, styles);
    }
    return styles;
  };
}
