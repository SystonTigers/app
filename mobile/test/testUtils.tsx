/**
 * Test Utilities for React Native Components
 *
 * Provides render wrapper with theme context and other common test utilities.
 */
import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { ThemeContext } from '../src/theme/ThemeContext';
import { Theme, ThemeContextValue } from '../src/theme/types';

// Default mock theme for testing
const mockTheme: Theme = {
  colors: {
    primary: '#FFD700',
    primaryLight: '#FFF3CD',
    primaryDark: '#CC9A00',
    secondary: '#000000',
    accent: '#FFA500',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    text: '#000000',
    textLight: '#666666',
    textDisabled: '#999999',
    textInverse: '#FFFFFF',
    border: '#E0E0E0',
    borderLight: '#EEEEEE',
    error: '#F44336',
    errorLight: '#FFEBEE',
    errorDark: '#C62828',
    success: '#4CAF50',
    successLight: '#E8F5E9',
    successDark: '#2E7D32',
    warning: '#FF9800',
    warningLight: '#FFF3E0',
    warningDark: '#E65100',
    info: '#2196F3',
    infoLight: '#E3F2FD',
    infoDark: '#1565C0',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  typography: {
    fontFamily: {
      regular: 'System',
      medium: 'System',
      semibold: 'System',
      bold: 'System',
      black: 'System',
    },
    fontSize: {
      xs: 10,
      sm: 12,
      base: 14,
      lg: 16,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
    },
    fontWeight: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      black: '900',
    },
  },
  shadows: {
    none: {},
    sm: { elevation: 2 },
    md: { elevation: 4 },
    lg: { elevation: 8 },
  },
} as Theme;

// Default mock theme context value
const mockThemeContextValue: ThemeContextValue = {
  theme: mockTheme,
  colorScheme: 'light',
  setColorScheme: jest.fn(),
  isDark: false,
  toggleColorScheme: jest.fn(),
  loadTenantTheme: jest.fn(),
  resetTheme: jest.fn(),
};

interface WrapperProps {
  children: ReactNode;
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  themeContext?: Partial<ThemeContextValue>;
}

/**
 * Create a wrapper component with theme context
 */
function createWrapper(customContext?: Partial<ThemeContextValue>) {
  return function Wrapper({ children }: WrapperProps) {
    const contextValue = {
      ...mockThemeContextValue,
      ...customContext,
    };

    return (
      <ThemeContext.Provider value={contextValue}>
        {children}
      </ThemeContext.Provider>
    );
  };
}

/**
 * Custom render function that wraps components with necessary providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  const { themeContext, ...renderOptions } = options ?? {};

  return render(ui, {
    wrapper: createWrapper(themeContext),
    ...renderOptions,
  });
}

/**
 * Re-export everything from testing library
 */
export * from '@testing-library/react-native';

/**
 * Export custom render as default render
 */
export { renderWithProviders as render };

/**
 * Export mock theme for assertions
 */
export { mockTheme, mockThemeContextValue };

/**
 * Helper to create a dark theme context
 */
export function createDarkThemeContext(): Partial<ThemeContextValue> {
  return {
    isDark: true,
    colorScheme: 'dark',
    theme: {
      ...mockTheme,
      colors: {
        ...mockTheme.colors,
        background: '#121212',
        surface: '#1E1E1E',
        text: '#FFFFFF',
        textLight: '#AAAAAA',
      },
    } as Theme,
  };
}

/**
 * Helper to simulate press events
 */
export function createMockPressEvent() {
  return {
    nativeEvent: {
      timestamp: Date.now(),
    },
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
  };
}

/**
 * Helper to wait for async operations
 */
export async function waitForAsync(ms: number = 100) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
