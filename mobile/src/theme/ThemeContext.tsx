import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, ColorScheme, TenantThemeConfig, ThemeContextValue } from './types';
import { lightTheme, darkTheme, createCustomTheme } from './defaultThemes';

const THEME_STORAGE_KEY = '@theme_preference';
const TENANT_THEME_STORAGE_KEY = '@tenant_theme_config';

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [colorScheme, setColorScheme] = useState<ColorScheme>('auto');
  const [tenantConfig, setTenantConfig] = useState<TenantThemeConfig | null>(null);
  const [theme, setTheme] = useState<Theme>(lightTheme);

  // Determine if dark mode should be active
  const isDark = colorScheme === 'dark' || (colorScheme === 'auto' && systemColorScheme === 'dark');

  // Load saved theme preference on mount
  useEffect(() => {
    loadThemePreference();
    loadTenantThemeConfig();
  }, []);

  // Update theme when color scheme or tenant config changes
  useEffect(() => {
    updateTheme();
  }, [colorScheme, systemColorScheme, tenantConfig]);

  // Load theme preference from storage
  const loadThemePreference = async () => {
    try {
      const savedScheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedScheme) {
        setColorScheme(savedScheme as ColorScheme);
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    }
  };

  // Load tenant theme config from storage
  const loadTenantThemeConfig = async () => {
    try {
      const savedConfig = await AsyncStorage.getItem(TENANT_THEME_STORAGE_KEY);
      if (savedConfig) {
        setTenantConfig(JSON.parse(savedConfig));
      }
    } catch (error) {
      console.error('Failed to load tenant theme config:', error);
    }
  };

  // Update active theme based on current settings
  const updateTheme = () => {
    const baseTheme = isDark ? darkTheme : lightTheme;

    if (tenantConfig) {
      // Apply tenant customization
      const customTheme = createCustomTheme(
        baseTheme,
        tenantConfig.primaryColor,
        tenantConfig.secondaryColor,
        tenantConfig.accentColor
      );

      // Apply additional custom colors if provided
      if (tenantConfig.customColors) {
        customTheme.colors = {
          ...customTheme.colors,
          ...tenantConfig.customColors,
        };
      }

      // Apply custom font family if provided
      if (tenantConfig.fontFamily) {
        customTheme.typography.fontFamily = {
          regular: tenantConfig.fontFamily,
          medium: tenantConfig.fontFamily,
          semibold: tenantConfig.fontFamily,
          bold: tenantConfig.fontFamily,
          black: tenantConfig.fontFamily,
        };
      }

      setTheme(customTheme);
    } else {
      // Use default theme
      setTheme(baseTheme);
    }
  };

  // Set and persist color scheme
  const handleSetColorScheme = async (scheme: ColorScheme) => {
    setColorScheme(scheme);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, scheme);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  // Toggle between light and dark
  const toggleColorScheme = () => {
    const newScheme = isDark ? 'light' : 'dark';
    handleSetColorScheme(newScheme);
  };

  // Load tenant theme from API config
  const loadTenantTheme = async (config: TenantThemeConfig) => {
    setTenantConfig(config);
    try {
      await AsyncStorage.setItem(TENANT_THEME_STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save tenant theme config:', error);
    }
  };

  // Reset to default theme
  const resetTheme = async () => {
    setTenantConfig(null);
    try {
      await AsyncStorage.removeItem(TENANT_THEME_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to remove tenant theme config:', error);
    }
  };

  const value: ThemeContextValue = {
    theme,
    colorScheme,
    setColorScheme: handleSetColorScheme,
    isDark,
    toggleColorScheme,
    loadTenantTheme,
    resetTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
