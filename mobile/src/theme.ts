import { useState, useEffect } from 'react';
import { COLORS as DEFAULT_COLORS, API_BASE_URL, TENANT_ID } from './config';

/**
 * Theme System with Dynamic Colors
 *
 * This module provides a dynamic theme system that can load colors
 * from the backend API based on the tenant configuration.
 *
 * Features:
 * - Dynamic color loading from API
 * - Fallback to default colors
 * - Type-safe color definitions
 * - Support for light/dark modes
 */

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textLight: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  border: string;
  disabled: string;
  placeholder: string;
  backdrop: string;
}

export interface Theme {
  colors: ThemeColors;
  isDark: boolean;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    round: number;
  };
  typography: {
    fontSizes: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
      xxl: number;
    };
    fontWeights: {
      regular: '400';
      medium: '500';
      semibold: '600';
      bold: '700';
    };
  };
}

/**
 * Default theme configuration
 */
export const defaultTheme: Theme = {
  colors: {
    primary: DEFAULT_COLORS.primary,
    secondary: DEFAULT_COLORS.secondary,
    accent: DEFAULT_COLORS.accent,
    background: DEFAULT_COLORS.background,
    surface: DEFAULT_COLORS.surface,
    text: DEFAULT_COLORS.text,
    textLight: DEFAULT_COLORS.textLight,
    error: DEFAULT_COLORS.error,
    success: DEFAULT_COLORS.success,
    warning: DEFAULT_COLORS.warning,
    info: '#2196F3',
    border: '#E0E0E0',
    disabled: '#BDBDBD',
    placeholder: '#9E9E9E',
    backdrop: 'rgba(0, 0, 0, 0.5)',
  },
  isDark: false,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    round: 9999,
  },
  typography: {
    fontSizes: {
      xs: 10,
      sm: 12,
      md: 14,
      lg: 16,
      xl: 20,
      xxl: 24,
    },
    fontWeights: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
};

/**
 * Dark theme configuration
 */
export const darkTheme: Theme = {
  ...defaultTheme,
  colors: {
    ...defaultTheme.colors,
    background: '#121212',
    surface: '#1E1E1E',
    text: '#FFFFFF',
    textLight: '#B0B0B0',
    border: '#2C2C2C',
    backdrop: 'rgba(0, 0, 0, 0.7)',
  },
  isDark: true,
};

/**
 * Tenant theme configuration from API response
 */
export interface TenantThemeConfig {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  darkMode?: boolean;
}

/**
 * Load theme from API
 */
export async function loadThemeFromAPI(): Promise<Theme> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/tenant/config?tenant=${TENANT_ID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load theme: ${response.status}`);
    }

    const data = await response.json();
    const tenantConfig: TenantThemeConfig = data.theme || {};

    // Merge tenant colors with default theme
    const baseTheme = tenantConfig.darkMode ? darkTheme : defaultTheme;

    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        ...(tenantConfig.primaryColor && { primary: tenantConfig.primaryColor }),
        ...(tenantConfig.secondaryColor && { secondary: tenantConfig.secondaryColor }),
        ...(tenantConfig.accentColor && { accent: tenantConfig.accentColor }),
      },
      isDark: tenantConfig.darkMode || false,
    };
  } catch (error) {
    console.error('Error loading theme from API:', error);
    return defaultTheme; // Fallback to default theme
  }
}

/**
 * React hook to use theme
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { theme, loading } = useTheme();
 *
 *   return (
 *     <View style={{ backgroundColor: theme.colors.background }}>
 *       <Text style={{ color: theme.colors.text }}>Hello</Text>
 *     </View>
 *   );
 * }
 * ```
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadThemeFromAPI()
      .then((loadedTheme) => {
        setTheme(loadedTheme);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load theme:', err);
        setError(err);
        setTheme(defaultTheme); // Use default theme on error
        setLoading(false);
      });
  }, []);

  return { theme, loading, error };
}

/**
 * Get theme synchronously (uses default theme, doesn't load from API)
 */
export function getTheme(isDark: boolean = false): Theme {
  return isDark ? darkTheme : defaultTheme;
}

/**
 * Export default theme colors for backwards compatibility
 */
export const colors = defaultTheme.colors;

/**
 * Export spacing for convenient use
 */
export const spacing = defaultTheme.spacing;

/**
 * Export border radius for convenient use
 */
export const borderRadius = defaultTheme.borderRadius;

/**
 * Export typography for convenient use
 */
export const typography = defaultTheme.typography;
