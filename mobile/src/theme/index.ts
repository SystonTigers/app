// Theme system exports

import { lightTheme as defaultLightTheme } from './defaultThemes';

export * from './types';
export * from './defaultThemes';
export * from './ThemeContext';
export * from './useTheme';
export * from './utils';

// Re-export common items for convenience
export { ThemeProvider } from './ThemeContext';
export { useTheme, useThemeColors } from './useTheme';
export { lightTheme, darkTheme } from './defaultThemes';

// Export theme constants for convenience
export const colors = defaultLightTheme.colors;
export const spacing = defaultLightTheme.spacing;
export const radii = defaultLightTheme.borderRadius;
export const fonts = defaultLightTheme.typography;
export const shadow = defaultLightTheme.shadows;
