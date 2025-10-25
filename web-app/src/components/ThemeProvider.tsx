'use client';

import { useEffect, useState } from 'react';
import { createClientSDK } from '@/lib/sdk';
import type { BrandKit } from '@team-platform/sdk';

interface ThemeProviderProps {
  children: React.ReactNode;
  tenant: string;
}

export function ThemeProvider({ children, tenant }: ThemeProviderProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadBrand() {
      try {
        const sdk = createClientSDK(tenant);
        const brand = await sdk.getBrand();

        // Apply brand colors to CSS variables
        applyBrandTheme(brand);
        setLoaded(true);
      } catch (error) {
        console.error('Failed to load brand:', error);
        // Continue with default theme
        setLoaded(true);
      }
    }

    loadBrand();
  }, [tenant]);

  return <>{children}</>;
}

/**
 * Apply brand kit to CSS variables
 */
function applyBrandTheme(brand: BrandKit) {
  const root = document.documentElement;

  if (brand.primaryColor) {
    root.style.setProperty('--brand', brand.primaryColor);
  }

  if (brand.secondaryColor) {
    root.style.setProperty('--brand-2', brand.secondaryColor);
  }

  if (brand.onPrimary) {
    root.style.setProperty('--on-brand', brand.onPrimary);
  }

  if (brand.onSecondary) {
    root.style.setProperty('--on-brand-2', brand.onSecondary);
  }

  // Store brand in localStorage for faster subsequent loads
  try {
    localStorage.setItem('brand', JSON.stringify(brand));
  } catch (e) {
    // Ignore storage errors
  }
}
