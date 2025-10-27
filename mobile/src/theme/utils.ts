import { Theme } from './types';

/**
 * Create themed styles with proper typing
 *
 * @example
 * ```tsx
 * const useStyles = createThemedStyles((theme) => ({
 *   container: {
 *     backgroundColor: theme.colors.background,
 *     padding: theme.spacing.md,
 *   },
 * }));
 *
 * // In component:
 * const styles = useStyles();
 * ```
 */
export const createThemedStyles = <T extends Record<string, any>>(
  stylesFn: (theme: Theme) => T
) => {
  return (theme: Theme) => stylesFn(theme);
};

/**
 * Get color with opacity
 *
 * @example
 * ```tsx
 * const backgroundColor = withOpacity(theme.colors.primary, 0.5);
 * // Returns: rgba(255, 215, 0, 0.5)
 * ```
 */
export const withOpacity = (color: string, opacity: number): string => {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  // Handle rgb/rgba colors
  if (color.startsWith('rgb')) {
    const match = color.match(/\d+/g);
    if (match && match.length >= 3) {
      return `rgba(${match[0]}, ${match[1]}, ${match[2]}, ${opacity})`;
    }
  }

  return color;
};

/**
 * Get contrast color (black or white) based on background
 *
 * @example
 * ```tsx
 * const textColor = getContrastColor(theme.colors.primary);
 * // Returns: '#000000' or '#FFFFFF' depending on primary color brightness
 * ```
 */
export const getContrastColor = (backgroundColor: string): string => {
  // Remove # if present
  const hex = backgroundColor.replace('#', '');

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black or white based on luminance
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

/**
 * Mix two colors
 *
 * @example
 * ```tsx
 * const blendedColor = mixColors('#FFD700', '#000000', 0.5);
 * // Returns: color that's 50% between gold and black
 * ```
 */
export const mixColors = (color1: string, color2: string, weight: number): string => {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');

  const r1 = parseInt(hex1.substring(0, 2), 16);
  const g1 = parseInt(hex1.substring(2, 4), 16);
  const b1 = parseInt(hex1.substring(4, 6), 16);

  const r2 = parseInt(hex2.substring(0, 2), 16);
  const g2 = parseInt(hex2.substring(2, 4), 16);
  const b2 = parseInt(hex2.substring(4, 6), 16);

  const r = Math.round(r1 * (1 - weight) + r2 * weight);
  const g = Math.round(g1 * (1 - weight) + g2 * weight);
  const b = Math.round(b1 * (1 - weight) + b2 * weight);

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

/**
 * Create elevation shadow for platform-specific shadows
 *
 * @example
 * ```tsx
 * const shadowStyle = createElevation(4);
 * // Returns platform-specific shadow styles
 * ```
 */
export const createElevation = (elevation: number) => {
  return {
    elevation, // Android
    shadowColor: '#000', // iOS
    shadowOffset: {
      width: 0,
      height: elevation / 2,
    },
    shadowOpacity: 0.1 + elevation * 0.02,
    shadowRadius: elevation,
  };
};

/**
 * Get status bar style based on theme
 */
export const getStatusBarStyle = (isDark: boolean): 'light-content' | 'dark-content' => {
  return isDark ? 'light-content' : 'dark-content';
};

/**
 * Interpolate between two colors based on a value between 0 and 1
 */
export const interpolateColor = (
  startColor: string,
  endColor: string,
  value: number
): string => {
  const clampedValue = Math.max(0, Math.min(1, value));
  return mixColors(startColor, endColor, clampedValue);
};

/**
 * Generate gradient colors
 */
export const generateGradient = (
  baseColor: string,
  steps: number = 5
): string[] => {
  const colors: string[] = [];
  for (let i = 0; i < steps; i++) {
    const lightness = (i / (steps - 1)) * 100;
    colors.push(adjustColorLightness(baseColor, lightness));
  }
  return colors;
};

/**
 * Adjust color lightness (0 = black, 50 = original, 100 = white)
 */
function adjustColorLightness(color: string, lightness: number): string {
  const targetColor = lightness > 50 ? '#FFFFFF' : '#000000';
  const weight = Math.abs(lightness - 50) / 50;
  return mixColors(color, targetColor, weight);
}
