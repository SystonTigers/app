import { useState, useEffect } from 'react';
import {
  API_BASE_URL,
  TENANT_ID,
  COLORS as FALLBACK_COLORS,
} from './config';
import {
  lightTheme as baseLightTheme,
  darkTheme as baseDarkTheme,
  createCustomTheme,
} from './theme/defaultThemes';
import type {
  Theme as BaseTheme,
  ThemeColors,
  TenantThemeConfig,
} from './theme';

/**
 * Additional design tokens layered on top of the shared theme contract.
 */
export type RampStop =
  | '50'
  | '100'
  | '200'
  | '300'
  | '400'
  | '500'
  | '600'
  | '700'
  | '800'
  | '900';

export type ColorRamp = Record<RampStop, string>;

export interface ThemeColorRamps {
  primary: ColorRamp;
  secondary: ColorRamp;
  accent: ColorRamp;
  neutral: ColorRamp;
  success: ColorRamp;
  warning: ColorRamp;
  info: ColorRamp;
  error: ColorRamp;
}

export interface ThemeSpacingScale {
  '3xs': number;
  '2xs': number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
  '3xl': number;
  '4xl': number;
}

export interface TypographyScaleEntry {
  fontSize: number;
  lineHeight: number;
  fontWeight: keyof BaseTheme['typography']['fontWeight'];
  letterSpacing?: number;
}

export interface TypographyScale {
  display: TypographyScaleEntry;
  headline: TypographyScaleEntry;
  title: TypographyScaleEntry;
  subtitle: TypographyScaleEntry;
  body: TypographyScaleEntry;
  bodySm: TypographyScaleEntry;
  caption: TypographyScaleEntry;
  overline: TypographyScaleEntry;
}

export interface ThemeMetadata {
  brandName?: string;
  source: 'default' | 'tenant';
}

export interface Theme extends BaseTheme {
  ramps: ThemeColorRamps;
  spacingScale: ThemeSpacingScale;
  typographyScale: TypographyScale;
  metadata: ThemeMetadata;
}

interface TenantThemePayload extends TenantThemeConfig {
  brandName?: string;
  darkMode?: boolean;
}

interface TenantConfigResponse {
  branding?: Partial<TenantThemeConfig> & { brandName?: string };
  theme?: Partial<TenantThemeConfig> & { brandName?: string; darkMode?: boolean };
  data?: TenantConfigResponse;
}

const DEFAULT_METADATA: ThemeMetadata = {
  source: 'default',
};

const RAMP_LIGHTEN: Record<Exclude<RampStop, '500' | '600' | '700' | '800' | '900'>, number> = {
  '50': 45,
  '100': 35,
  '200': 25,
  '300': 15,
  '400': 7,
};

const RAMP_DARKEN: Record<Exclude<RampStop, '50' | '100' | '200' | '300' | '400' | '500'>, number> = {
  '600': 7,
  '700': 15,
  '800': 25,
  '900': 35,
};

/**
 * Deep clone of a base theme so downstream enrichment does not mutate the source object.
 */
function cloneTheme(theme: BaseTheme): BaseTheme {
  return {
    ...theme,
    colors: { ...theme.colors },
    spacing: { ...theme.spacing },
    borderRadius: { ...theme.borderRadius },
    typography: {
      fontFamily: { ...theme.typography.fontFamily },
      fontSize: { ...theme.typography.fontSize },
      lineHeight: { ...theme.typography.lineHeight },
      fontWeight: { ...theme.typography.fontWeight },
    },
    shadows: { ...theme.shadows },
  };
}

/**
 * Create a richer theme object by attaching ramps, spacing scale and typography scale.
 */
function enrichTheme(
  theme: BaseTheme,
  metadata: Partial<ThemeMetadata> = {}
): Theme {
  const ramps = createRamps(theme.colors);
  const spacingScale = createSpacingScale(theme.spacing);
  const typographyScale = createTypographyScale(theme);

  return {
    ...theme,
    ramps,
    spacingScale,
    typographyScale,
    metadata: {
      ...DEFAULT_METADATA,
      ...metadata,
    },
  };
}

/**
 * Build the theme used at application start.
 */
export const defaultTheme: Theme = enrichTheme(cloneTheme(baseLightTheme));

/**
 * Dark mode counterpart to the default theme.
 */
export const darkTheme: Theme = enrichTheme(cloneTheme(baseDarkTheme));

/**
 * Generate a color ramp from a base color.
 */
export function createColorRamp(color: string): ColorRamp {
  const ramp: Partial<ColorRamp> = {
    '500': color,
  };

  (Object.keys(RAMP_LIGHTEN) as Array<keyof typeof RAMP_LIGHTEN>).forEach((stop) => {
    ramp[stop] = lightenColor(color, RAMP_LIGHTEN[stop]);
  });

  (Object.keys(RAMP_DARKEN) as Array<keyof typeof RAMP_DARKEN>).forEach((stop) => {
    ramp[stop] = darkenColor(color, RAMP_DARKEN[stop]);
  });

  return ramp as ColorRamp;
}

/**
 * Compute theme ramps based on the base color palette.
 */
function createRamps(colors: ThemeColors): ThemeColorRamps {
  return {
    primary: createColorRamp(colors.primary),
    secondary: createColorRamp(colors.secondary),
    accent: createColorRamp(colors.accent),
    neutral: createColorRamp(colors.textSecondary ?? FALLBACK_COLORS.textLight),
    success: createColorRamp(colors.success),
    warning: createColorRamp(colors.warning),
    info: createColorRamp(colors.info),
    error: createColorRamp(colors.error),
  };
}

/**
 * Extend spacing scale beyond MD3 defaults.
 */
function createSpacingScale(spacing: BaseTheme['spacing']): ThemeSpacingScale {
  const xs = spacing.xs;
  return {
    '3xs': Math.max(2, Math.round(xs / 2)),
    '2xs': Math.max(3, Math.round((xs * 3) / 4)),
    xs: spacing.xs,
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
    xl: spacing.xl,
    '2xl': spacing.xxl,
    '3xl': spacing.xxl + spacing.md,
    '4xl': spacing.xxl + spacing.lg,
  };
}

/**
 * Build a typography scale using the base theme's font sizes.
 */
function createTypographyScale(theme: BaseTheme): TypographyScale {
  const fontSize = theme.typography.fontSize;
  return {
    display: {
      fontSize: fontSize['4xl'],
      lineHeight: Math.round(fontSize['4xl'] * 1.1),
      fontWeight: 'bold',
    },
    headline: {
      fontSize: fontSize['3xl'],
      lineHeight: Math.round(fontSize['3xl'] * 1.2),
      fontWeight: 'bold',
    },
    title: {
      fontSize: fontSize['2xl'],
      lineHeight: Math.round(fontSize['2xl'] * 1.25),
      fontWeight: 'semibold',
    },
    subtitle: {
      fontSize: fontSize.xl,
      lineHeight: Math.round(fontSize.xl * 1.3),
      fontWeight: 'medium',
    },
    body: {
      fontSize: fontSize.base,
      lineHeight: Math.round(fontSize.base * 1.5),
      fontWeight: 'regular',
    },
    bodySm: {
      fontSize: fontSize.sm,
      lineHeight: Math.round(fontSize.sm * 1.45),
      fontWeight: 'regular',
    },
    caption: {
      fontSize: fontSize.xs,
      lineHeight: Math.round(fontSize.xs * 1.4),
      fontWeight: 'medium',
      letterSpacing: 0.2,
    },
    overline: {
      fontSize: Math.max(10, fontSize.xs - 2),
      lineHeight: Math.round(Math.max(10, fontSize.xs - 2) * 1.4),
      fontWeight: 'medium',
      letterSpacing: 0.4,
    },
  };
}

/**
 * Load the tenant theme configuration from the API and build a rich theme.
 */
export async function loadThemeFromAPI(): Promise<Theme> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/tenant/config?tenant=${TENANT_ID}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to load theme: ${response.status}`);
    }

    const raw = (await response.json()) as TenantConfigResponse;
    const payload = normaliseTenantTheme(raw);

    if (payload) {
      return buildTenantTheme(payload);
    }
  } catch (error) {
    console.error('Error loading theme from tenant config API:', error);
  }

  try {
    // Fallback to brand endpoint for older deployments
    const brandResponse = await fetch(
      `${API_BASE_URL}/api/v1/brand?tenant=${TENANT_ID}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (brandResponse.ok) {
      const brandPayload = await brandResponse.json();
      const brand = brandPayload?.data || brandPayload;

      if (brand?.primaryColor || brand?.secondaryColor) {
        const tenantPayload: TenantThemePayload = {
          primaryColor: brand.primaryColor,
          secondaryColor: brand.secondaryColor,
          accentColor: brand.accentColor ?? brand.primaryColor,
          brandName: brand.clubName ?? brand.clubShortName,
        };

        if (brand.onPrimary) {
          tenantPayload.customColors = {
            textInverse: brand.onPrimary,
          } as Partial<ThemeColors>;
        }

        if (brand.onSecondary) {
          tenantPayload.customColors = {
            ...(tenantPayload.customColors || {}),
            text: brand.onSecondary,
          } as Partial<ThemeColors>;
        }

        return buildTenantTheme(tenantPayload);
      }
    }
  } catch (error) {
    console.error('Error loading theme from brand API:', error);
  }

  return defaultTheme;
}

/**
 * Normalise various tenant theme payload shapes.
 */
function normaliseTenantTheme(payload?: TenantConfigResponse | null): TenantThemePayload | null {
  if (!payload) {
    return null;
  }

  if (payload.data) {
    const nested = normaliseTenantTheme(payload.data);
    if (nested) {
      return nested;
    }
  }

  const raw = payload.theme ?? payload.branding ?? (payload as unknown as TenantThemePayload);
  if (!raw) {
    return null;
  }

  const {
    primaryColor,
    secondaryColor,
    accentColor,
    customColors,
    fontFamily,
    brandName,
    darkMode,
    clubName,
    clubShortName,
    mode,
    onPrimary,
    onSecondary,
  } = raw as TenantThemePayload & {
    clubName?: string;
    clubShortName?: string;
    mode?: string;
    onPrimary?: string;
    onSecondary?: string;
  };

  const cleaned: TenantThemePayload = {};

  if (primaryColor) cleaned.primaryColor = primaryColor;
  if (secondaryColor) cleaned.secondaryColor = secondaryColor;
  if (accentColor) cleaned.accentColor = accentColor;
  if (customColors) cleaned.customColors = customColors;
  if (fontFamily) cleaned.fontFamily = fontFamily;
  if (brandName) cleaned.brandName = brandName;
  if (!cleaned.brandName && clubName) cleaned.brandName = clubName;
  if (!cleaned.brandName && clubShortName) cleaned.brandName = clubShortName;
  if (typeof darkMode === 'boolean') cleaned.darkMode = darkMode;
  if (typeof darkMode !== 'boolean' && typeof mode === 'string') {
    cleaned.darkMode = mode.toLowerCase() === 'dark';
  }
  if (onPrimary || onSecondary) {
    cleaned.customColors = {
      ...(cleaned.customColors || {}),
      ...(onPrimary ? { textInverse: onPrimary } : {}),
      ...(onSecondary ? { text: onSecondary } : {}),
    };
  }

  return Object.keys(cleaned).length > 0 ? cleaned : null;
}

/**
 * Build a tenant specific theme using the supplied payload.
 */
export function buildTenantTheme(payload: TenantThemePayload): Theme {
  const base = payload.darkMode ? cloneTheme(baseDarkTheme) : cloneTheme(baseLightTheme);

  const primary = payload.primaryColor ?? base.colors.primary ?? FALLBACK_COLORS.primary;
  const secondary = payload.secondaryColor ?? base.colors.secondary ?? FALLBACK_COLORS.secondary;
  const accent = payload.accentColor ?? primary;

  let themed: BaseTheme = createCustomTheme(base, primary, secondary, accent);

  if (payload.customColors) {
    themed = {
      ...themed,
      colors: {
        ...themed.colors,
        ...payload.customColors,
      },
    };
  }

  if (payload.fontFamily) {
    themed = {
      ...themed,
      typography: {
        ...themed.typography,
        fontFamily: {
          regular: payload.fontFamily,
          medium: payload.fontFamily,
          semibold: payload.fontFamily,
          bold: payload.fontFamily,
          black: payload.fontFamily,
        },
      },
    };
  }

  const metadata: ThemeMetadata = {
    brandName: payload.brandName,
    source: 'tenant',
  };

  return enrichTheme(themed, metadata);
}

/**
 * React hook that loads the tenant theme once and exposes loading status.
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
        setError(err as Error);
        setTheme(defaultTheme);
        setLoading(false);
      });
  }, []);

  return { theme, loading, error };
}

/**
 * Provide synchronous theme access when network lookups are unavailable.
 */
export function getTheme(isDark: boolean = false): Theme {
  return isDark ? darkTheme : defaultTheme;
}

export const colors = defaultTheme.colors;
export const spacing = defaultTheme.spacing;
export const spacingScale = defaultTheme.spacingScale;
export const borderRadius = defaultTheme.borderRadius;
export const typography = defaultTheme.typography;
export const typographyScale = defaultTheme.typographyScale;
export const ramps = defaultTheme.ramps;

/**
 * Lighten a hex color by a percentage.
 */
function lightenColor(color: string, percent: number): string {
  return adjustColor(color, percent);
}

/**
 * Darken a hex color by a percentage.
 */
function darkenColor(color: string, percent: number): string {
  return adjustColor(color, -percent);
}

function adjustColor(color: string, percent: number): string {
  const hex = color.replace('#', '');
  if (!/^([0-9a-f]{6})$/i.test(hex)) {
    return color;
  }

  const num = parseInt(hex, 16);
  const amt = Math.round(2.55 * percent);
  const r = clamp((num >> 16) + amt);
  const g = clamp(((num >> 8) & 0x00ff) + amt);
  const b = clamp((num & 0x0000ff) + amt);

  const adjusted = (r << 16) | (g << 8) | b;
  return `#${adjusted.toString(16).padStart(6, '0')}`;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, value));
}
