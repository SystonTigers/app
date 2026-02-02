import { Theme } from './types';

// Default spacing values (in pixels)
const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Boost Huddle "Chamfered" look - much sharper
const borderRadius = {
  none: 0,
  sm: 2,   // Was 4
  md: 4,   // Was 8
  lg: 8,   // Was 12
  xl: 12,  // Was 16
  full: 9999,
};

// Default typography
const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
    black: 'System',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    black: '900' as const,
  },
};

// Default shadows - slightly sharper
const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
  md: '0 4px 6px rgba(0, 0, 0, 0.4)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.5)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.6)',
};

// Light theme (Force Obsidian/Dark mode look even in light mode for brand consistency)
// The user wants "Boost Huddle" look, which is dark.
export const lightTheme: Theme = {
  colors: {
    // Primary brand colors (Electric Cyan)
    primary: '#00FFFF',
    primaryLight: '#80FFFF',
    primaryDark: '#00CCCC',

    // Secondary brand colors (Brushed Chrome)
    secondary: '#C0C0C0',
    secondaryLight: '#E0E0E0',
    secondaryDark: '#A0A0A0',

    // Accent colors (Cyan)
    accent: '#00FFFF',
    accentLight: '#80FFFF',
    accentDark: '#00CCCC',

    // Background colors (Obsidian)
    background: '#0B0D0F',
    backgroundSecondary: '#15181C',
    backgroundTertiary: '#1F2329',

    // Surface colors (Glass/Obsidian)
    surface: '#1A1D23',
    surfaceSecondary: '#252930',
    surfaceTertiary: '#2F3439',

    // Text colors
    text: '#FFFFFF',
    textSecondary: '#C0C0C0', // Chrome
    textTertiary: '#808891',
    textDisabled: '#4B5563',
    textInverse: '#000000',

    // Border colors
    border: '#2F3439',
    borderLight: '#3F4449',
    borderDark: '#1A1D23',

    // Status colors
    success: '#00FFFF', // Cyan for success too in this theme
    successLight: '#80FFFF',
    successDark: '#00CCCC',

    warning: '#F59E0B',
    warningLight: '#FBBF24',
    warningDark: '#D97706',

    error: '#FF0055', // Sharp Pink/Red
    errorLight: '#FF4D88',
    errorDark: '#CC0044',

    info: '#00FFFF',
    infoLight: '#80FFFF',
    infoDark: '#00CCCC',

    // Overlay colors
    overlay: 'rgba(11, 13, 15, 0.8)',
    overlayLight: 'rgba(11, 13, 15, 0.6)',
    overlayDark: 'rgba(11, 13, 15, 0.9)',

    // Shadow color
    shadow: 'rgba(0, 255, 255, 0.1)', // Subtle cyan glow
  },
  spacing,
  borderRadius,
  typography,
  shadows,
  isDark: true, // Force dark mode behavior
};

// Dark theme (Same as light - enforced consistency)
export const darkTheme: Theme = {
  colors: lightTheme.colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  isDark: true,
};

// Helper function to create custom theme from tenant config
// Overrides with tenant colors but keeps the dark base
export const createCustomTheme = (
  baseTheme: Theme,
  primaryColor: string,
  secondaryColor: string,
  accentColor?: string
): Theme => {
  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      // We keep the background obsidian (#0B0D0F) regardless of tenant config
      // We only override primary/accent if they are provided, but strongly prefer Cyan
      primary: primaryColor || '#00FFFF',
      primaryLight: lightenColor(primaryColor || '#00FFFF', 20),
      primaryDark: darkenColor(primaryColor || '#00FFFF', 20),
      secondary: secondaryColor || '#C0C0C0',
      secondaryLight: lightenColor(secondaryColor || '#C0C0C0', 20),
      secondaryDark: darkenColor(secondaryColor || '#C0C0C0', 20),
      accent: accentColor || primaryColor || '#00FFFF',
      accentLight: lightenColor(accentColor || primaryColor || '#00FFFF', 20),
      accentDark: darkenColor(accentColor || primaryColor || '#00FFFF', 20),
    },
  };
};

// Helper to lighten a color
function lightenColor(color: string, percent: number): string {
  if (!color) return '#000000';
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}

// Helper to darken a color
function darkenColor(color: string, percent: number): string {
  if (!color) return '#000000';
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) - amt;
  const G = ((num >> 8) & 0x00ff) - amt;
  const B = (num & 0x0000ff) - amt;
  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}
