// mobile/src/services/brandService.ts
// Service for loading and applying dynamic branding

import api from './api';
import { fetchClubInfo, getTenantId } from './club';


export interface BrandKit {
  primaryColor: string;
  secondaryColor: string;
  onPrimary?: string;
  onSecondary?: string;
  clubBadge?: string;
  sponsorLogos?: string[];
  clubName?: string;
  clubShortName?: string;
}

/**
 * The current club's colours, name and badge.
 */
export async function fetchBrand(): Promise<BrandKit | null> {
  const slug = getTenantId();
  if (!slug) return null;
  try {
    const club = await fetchClubInfo(slug);
    if (!club?.primaryColor || !club.secondaryColor) {
      return null;
    }
    return {
      primaryColor: club.primaryColor,
      secondaryColor: club.secondaryColor,
      clubBadge: club.badgeUrl ?? undefined,
      clubName: club.name,
    };
  } catch (error) {
    console.warn('Failed to fetch club colours:', error);
    return null;
  }
}

/**
 * Update brand kit (admin only)
 */
export async function updateBrand(brand: Partial<BrandKit>): Promise<BrandKit | null> {
  try {
    const response = await api.patch('/api/v1/tenants/me', {
      ...(brand.primaryColor ? { primaryColor: brand.primaryColor } : {}),
      ...(brand.secondaryColor ? { secondaryColor: brand.secondaryColor } : {}),
      ...(brand.clubBadge ? { badgeUrl: brand.clubBadge } : {}),
    });
    return response.data?.success ? await fetchBrand() : null;
  } catch (error) {
    console.error('Failed to update brand:', error);
    return null;
  }
}

/**
 * Lighten a color by a percentage
 */
function lightenColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

/**
 * Darken a color by a percentage
 */
function darkenColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
  const B = Math.max(0, (num & 0x0000ff) - amt);
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

/**
 * Convert brand kit to theme colors
 */
export function brandToTheme(brand: BrandKit) {
  return {
    primary: brand.primaryColor,
    primaryLight: lightenColor(brand.primaryColor, 20),
    primaryDark: darkenColor(brand.primaryColor, 20),
    secondary: brand.secondaryColor,
    secondaryLight: lightenColor(brand.secondaryColor, 20),
    secondaryDark: darkenColor(brand.secondaryColor, 20),
    // Accent can be derived or use a default
    accent: brand.primaryColor, // Could also be a separate field
    accentLight: lightenColor(brand.primaryColor, 20),
    accentDark: darkenColor(brand.primaryColor, 20),
  };
}
