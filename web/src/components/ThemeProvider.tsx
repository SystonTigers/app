'use client';

import { useEffect, useState } from 'react';
import { createClientSDK } from '@/lib/sdk';
import type { BrandKit } from '@team-platform/sdk';

interface ThemeProviderProps {
  children: React.ReactNode;
  tenant: string;
}

export function ThemeProvider({ children, tenant }: ThemeProviderProps) {
  const [, setLoaded] = useState(false);

  useEffect(() => {
    const storageKey = `brand:${tenant}`;
    const storedBrand = readBrandFromStorage(storageKey);

    if (storedBrand) {
      applyBrandTheme(storedBrand);
      setLoaded(true);
    }

    let cancelled = false;

    async function loadBrand() {
      try {
        const sdk = createClientSDK(tenant);
        const brand = await sdk.getBrand();

        // Apply brand colors to CSS variables
        if (!cancelled) {
          applyBrandTheme(brand);
          setLoaded(true);

          try {
            localStorage.setItem(storageKey, JSON.stringify(brand));
          } catch (e) {
            // Ignore storage errors
          }
        }
      } catch (error) {
        console.error('Failed to load brand:', error);
        // Continue with default theme
        if (!cancelled) {
          setLoaded(true);
        }
      }
    }

    loadBrand();

    return () => {
      cancelled = true;
    };
  }, [tenant]);

  return <>{children}</>;
}

/**
 * Apply brand kit to CSS variables
 */
function applyBrandTheme(brand: BrandKit) {
  const root = document.documentElement;

  if (brand.primaryColor) {
    const ramp = createColorRamp(brand.primaryColor);
    setRamp(root, 'brand', ramp);
    root.style.setProperty('--brand', ramp['500']);
    root.style.setProperty('--surface-accent', hexToRgba(ramp['100'], 0.35));
  }

  if (brand.secondaryColor) {
    const ramp = createColorRamp(brand.secondaryColor);
    setRamp(root, 'secondary', ramp);
    root.style.setProperty('--brand-2', ramp['500']);
  }

  if (brand.onPrimary) {
    root.style.setProperty('--text-on-brand', brand.onPrimary);
    root.style.setProperty('--on-brand', brand.onPrimary);
  }

  if (brand.onSecondary) {
    root.style.setProperty('--on-brand-2', brand.onSecondary);
  }

  const accentColor = (brand as { accentColor?: string }).accentColor ?? brand.primaryColor;
  if (accentColor) {
    setRamp(root, 'accent', createColorRamp(accentColor));
  }
}

const LIGHTEN_STOPS: Record<'50' | '100' | '200' | '300' | '400', number> = {
  '50': 45,
  '100': 35,
  '200': 25,
  '300': 15,
  '400': 7,
};

const DARKEN_STOPS: Record<'600' | '700' | '800' | '900', number> = {
  '600': -7,
  '700': -15,
  '800': -25,
  '900': -35,
};

type RampStop = keyof typeof LIGHTEN_STOPS | '500' | keyof typeof DARKEN_STOPS;

function createColorRamp(color: string): Record<RampStop, string> {
  const base = normaliseHex(color);
  const ramp: Partial<Record<RampStop, string>> = { '500': base };

  (Object.entries(LIGHTEN_STOPS) as Array<[RampStop, number]>).forEach(([stop, pct]) => {
    ramp[stop] = adjustColor(base, pct);
  });

  (Object.entries(DARKEN_STOPS) as Array<[RampStop, number]>).forEach(([stop, pct]) => {
    ramp[stop] = adjustColor(base, pct);
  });

  return ramp as Record<RampStop, string>;
}

function setRamp(root: HTMLElement, prefix: string, ramp: Record<RampStop, string>) {
  (Object.entries(ramp) as Array<[RampStop, string]>).forEach(([stop, value]) => {
    root.style.setProperty(`--${prefix}-${stop}`, value);
  });
}

function adjustColor(color: string, percent: number): string {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  if (Number.isNaN(num)) {
    return color;
  }

  const amt = Math.round(2.55 * percent);
  const r = clamp((num >> 16) + amt);
  const g = clamp(((num >> 8) & 0xff) + amt);
  const b = clamp((num & 0xff) + amt);

  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`.toUpperCase();
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, value));
}

function normaliseHex(color: string): string {
  if (!color) {
    return color;
  }

  let hex = color.trim();
  if (!hex.startsWith('#')) {
    hex = `#${hex}`;
  }

  if (hex.length === 4) {
    const [, r, g, b] = hex;
    hex = `#${r}${r}${g}${g}${b}${b}`;
  }

  return hex.slice(0, 7).toUpperCase();
}

function hexToRgba(hex: string, alpha: number): string {
  const normalised = normaliseHex(hex).replace('#', '');
  const num = parseInt(normalised, 16);
  if (Number.isNaN(num)) {
    return hex;
  }
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function readBrandFromStorage(key: string): BrandKit | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw) as BrandKit;
    }
  } catch (error) {
    console.warn('Unable to read cached brand theme', error);
  }

  return null;
}
