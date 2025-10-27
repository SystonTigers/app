// Theme system type definitions

export type ColorScheme = 'light' | 'dark' | 'auto';

export interface ThemeColors {
  // Primary brand colors
  primary: string;
  primaryLight: string;
  primaryDark: string;

  // Secondary brand colors
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;

  // Accent colors
  accent: string;
  accentLight: string;
  accentDark: string;

  // Background colors
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;

  // Surface colors (cards, modals, etc.)
  surface: string;
  surfaceSecondary: string;
  surfaceTertiary: string;

  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  textDisabled: string;
  textInverse: string;

  // Border colors
  border: string;
  borderLight: string;
  borderDark: string;

  // Status colors
  success: string;
  successLight: string;
  successDark: string;

  warning: string;
  warningLight: string;
  warningDark: string;

  error: string;
  errorLight: string;
  errorDark: string;

  info: string;
  infoLight: string;
  infoDark: string;

  // Overlay colors
  overlay: string;
  overlayLight: string;
  overlayDark: string;

  // Shadow colors
  shadow: string;
}

export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export interface ThemeBorderRadius {
  none: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  full: number;
}

export interface ThemeTypography {
  fontFamily: {
    regular: string;
    medium: string;
    semibold: string;
    bold: string;
    black: string;
  };

  fontSize: {
    xs: number;
    sm: number;
    base: number;
    lg: number;
    xl: number;
    '2xl': number;
    '3xl': number;
    '4xl': number;
    '5xl': number;
  };

  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };

  fontWeight: {
    regular: '400';
    medium: '500';
    semibold: '600';
    bold: '700';
    black: '900';
  };
}

export interface ThemeShadows {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface Theme {
  colors: ThemeColors;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
  typography: ThemeTypography;
  shadows: ThemeShadows;
  isDark: boolean;
}

export interface TenantThemeConfig {
  // Basic branding
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;

  // Logo and badge
  logoUrl?: string;
  badgeUrl?: string;

  // Additional customization
  customColors?: Partial<ThemeColors>;

  // Font family override
  fontFamily?: string;
}

export interface ThemeContextValue {
  theme: Theme;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  isDark: boolean;
  toggleColorScheme: () => void;
  loadTenantTheme: (config: TenantThemeConfig) => void;
  resetTheme: () => void;
}
