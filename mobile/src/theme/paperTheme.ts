/**
 * react-native-paper's theme built from the brand: every Card, Button, Chip,
 * Switch and text field picks up the club colour and the dark card look.
 */
import { MD3DarkTheme, configureFonts } from 'react-native-paper';
import { FONTS } from './brandFonts';
import { CARD, CARD_RAISED, INK, TEXT, TEXT_MUTED, type BrandColors } from './brand';

const display = { fontFamily: FONTS.display, letterSpacing: 0.5, fontWeight: 'normal' as const };

const fonts = configureFonts({
  config: {
    displaySmall: { ...display, fontSize: 36, lineHeight: 42 },
    headlineLarge: { ...display, fontSize: 32, lineHeight: 38 },
    headlineMedium: { ...display, fontSize: 28, lineHeight: 34 },
    headlineSmall: { ...display, fontSize: 24, lineHeight: 30 },
    titleLarge: { ...display, fontSize: 22, lineHeight: 28 },
  },
});

export function buildPaperTheme(c: BrandColors) {
  return {
    ...MD3DarkTheme,
    roundness: 4,
    fonts,
    colors: {
      ...MD3DarkTheme.colors,
      primary: c.primary,
      onPrimary: c.onPrimary,
      primaryContainer: c.primarySoft,
      onPrimaryContainer: c.primary,
      secondary: c.primary,
      onSecondary: c.onPrimary,
      secondaryContainer: c.primarySoft,
      onSecondaryContainer: TEXT,
      tertiary: c.primary,
      background: INK,
      onBackground: TEXT,
      surface: CARD,
      onSurface: TEXT,
      surfaceVariant: CARD_RAISED,
      onSurfaceVariant: TEXT_MUTED,
      surfaceDisabled: 'rgba(242,245,247,0.12)',
      onSurfaceDisabled: 'rgba(242,245,247,0.38)',
      outline: 'rgba(255,255,255,0.18)',
      outlineVariant: 'rgba(255,255,255,0.08)',
      error: c.error,
      elevation: {
        level0: 'transparent',
        level1: CARD,
        level2: CARD_RAISED,
        level3: CARD_RAISED,
        level4: CARD_RAISED,
        level5: CARD_RAISED,
      },
      // Used by the navigation header and drawer below
      border: 'rgba(255,255,255,0.08)',
      text: TEXT,
      textSecondary: TEXT_MUTED,
    },
  };
}
