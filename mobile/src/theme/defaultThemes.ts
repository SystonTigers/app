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

// Default border radius values
const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
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

// Default shadows
const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
};

// Light theme (default - neutral base)
export const lightTheme: Theme = {
  colors: {
    // Primary brand colors (Neutral blue)
    primary: '#6CC5FF',
    primaryLight: '#8FD4FF',
    primaryDark: '#49B7FF',

    // Secondary brand colors (Muted gray)
    secondary: '#9AA1AC',
    secondaryLight: '#B4BCC7',
    secondaryDark: '#808891',

    // Accent colors (Neutral green)
    accent: '#A0FF9C',
    accentLight: '#B8FFB4',
    accentDark: '#88FF84',

    // Background colors
    background: '#FFFFFF',
    backgroundSecondary: '#F5F5F5',
    backgroundTertiary: '#EEEEEE',

    // Surface colors
    surface: '#FFFFFF',
    surfaceSecondary: '#F9F9F9',
    surfaceTertiary: '#F0F0F0',

    // Text colors
    text: '#000000',
    textSecondary: '#666666',
    textTertiary: '#999999',
    textDisabled: '#CCCCCC',
    textInverse: '#FFFFFF',

    // Border colors
    border: '#E0E0E0',
    borderLight: '#F0F0F0',
    borderDark: '#CCCCCC',

    // Status colors
    success: '#4CAF50',
    successLight: '#81C784',
    successDark: '#388E3C',

    warning: '#FF9800',
    warningLight: '#FFB74D',
    warningDark: '#F57C00',

    error: '#F44336',
    errorLight: '#E57373',
    errorDark: '#D32F2F',

    info: '#2196F3',
    infoLight: '#64B5F6',
    infoDark: '#1976D2',

    // Overlay colors
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(0, 0, 0, 0.3)',
    overlayDark: 'rgba(0, 0, 0, 0.7)',

    // Shadow color
    shadow: 'rgba(0, 0, 0, 0.1)',
  },
  spacing,
  borderRadius,
  typography,
  shadows,
  isDark: false,
};

// Dark theme (neutral base)
export const darkTheme: Theme = {
  colors: {
    // Primary brand colors (Neutral blue)
    primary: '#6CC5FF',
    primaryLight: '#8FD4FF',
    primaryDark: '#49B7FF',

    // Secondary brand colors (Light gray in dark mode)
    secondary: '#E6E8EB',
    secondaryLight: '#F5F7FA',
    secondaryDark: '#D1D5DA',

    // Accent colors
    accent: '#A0FF9C',
    accentLight: '#B8FFB4',
    accentDark: '#88FF84',

    // Background colors (Dark grays/blacks)
    background: '#0D0F12',
    backgroundSecondary: '#1A1D23',
    backgroundTertiary: '#252930',

    // Surface colors
    surface: '#1A1D23',
    surfaceSecondary: '#252930',
    surfaceTertiary: '#2F3439',

    // Text colors
    text: '#F5F7FA',
    textSecondary: '#A8B0BD',
    textTertiary: '#6B7280',
    textDisabled: '#4B5563',
    textInverse: '#000000',

    // Border colors
    border: '#2F3439',
    borderLight: '#252930',
    borderDark: '#3F4449',

    // Status colors (slightly adjusted for dark backgrounds)
    success: '#4CAF50',
    successLight: '#66BB6A',
    successDark: '#388E3C',

    warning: '#FF9800',
    warningLight: '#FFA726',
    warningDark: '#F57C00',

    error: '#F44336',
    errorLight: '#EF5350',
    errorDark: '#D32F2F',

    info: '#2196F3',
    infoLight: '#42A5F5',
    infoDark: '#1976D2',

    // Overlay colors
    overlay: 'rgba(0, 0, 0, 0.7)',
    overlayLight: 'rgba(0, 0, 0, 0.5)',
    overlayDark: 'rgba(0, 0, 0, 0.85)',

    // Shadow color
    shadow: 'rgba(0, 0, 0, 0.3)',
  },
  spacing,
  borderRadius,
  typography,
  shadows,
  isDark: true,
};

// Helper function to create custom theme from tenant config
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
      primary: primaryColor,
      primaryLight: lightenColor(primaryColor, 20),
      primaryDark: darkenColor(primaryColor, 20),
      secondary: secondaryColor,
      secondaryLight: lightenColor(secondaryColor, 20),
      secondaryDark: darkenColor(secondaryColor, 20),
      accent: accentColor || primaryColor,
      accentLight: lightenColor(accentColor || primaryColor, 20),
      accentDark: darkenColor(accentColor || primaryColor, 20),
    },
  };
};

// Helper to lighten a color
function lightenColor(color: string, percent: number): string {
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
