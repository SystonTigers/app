import { useContext } from 'react';
import { ThemeContext } from './ThemeContext';
import { ThemeContextValue } from './types';

/**
 * Hook to access theme context
 *
 * @example
 * ```tsx
 * const { theme, isDark, toggleColorScheme } = useTheme();
 *
 * <View style={{ backgroundColor: theme.colors.background }}>
 *   <Text style={{ color: theme.colors.text }}>Hello</Text>
 * </View>
 * ```
 */
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};

/**
 * Hook to get just the theme object (for convenience)
 *
 * @example
 * ```tsx
 * const theme = useThemeColors();
 *
 * const styles = StyleSheet.create({
 *   container: {
 *     backgroundColor: theme.colors.background,
 *   },
 * });
 * ```
 */
export const useThemeColors = () => {
  const { theme } = useTheme();
  return theme.colors;
};

/**
 * Hook to get spacing values
 */
export const useThemeSpacing = () => {
  const { theme } = useTheme();
  return theme.spacing;
};

/**
 * Hook to get typography values
 */
export const useThemeTypography = () => {
  const { theme } = useTheme();
  return theme.typography;
};

/**
 * Hook to get border radius values
 */
export const useThemeBorderRadius = () => {
  const { theme } = useTheme();
  return theme.borderRadius;
};

/**
 * Hook to get shadow values
 */
export const useThemeShadows = () => {
  const { theme } = useTheme();
  return theme.shadows;
};
