import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, TENANT_ID, IS_DEV } from './config';

/**
 * Feature Flags System
 *
 * This module provides a dynamic feature flag system that can load flags
 * from the backend API based on tenant configuration.
 *
 * Features:
 * - Dynamic flag loading from API
 * - Local storage caching
 * - Local overrides for development/testing
 * - Type-safe flag definitions
 * - Fallback to default values
 */

export interface FeatureFlags {
  // Core Features
  enableOfflineMode: boolean;
  enablePushNotifications: boolean;
  enableLocationTracking: boolean;
  enableGeoFencing: boolean;

  // Social Features
  enableChat: boolean;
  enableComments: boolean;
  enableLikes: boolean;
  enableSharing: boolean;

  // Match Features
  enableLiveMatch: boolean;
  enableMatchPredictions: boolean;
  enablePlayerRatings: boolean;
  enableMOTMVoting: boolean;

  // Media Features
  enableGallery: boolean;
  enableVideoHighlights: boolean;
  enableVideoRecording: boolean;
  enableVideoUpload: boolean;

  // Training Features
  enableTrainingDrills: boolean;
  enableTacticsBoard: boolean;
  enableSessionPlanner: boolean;

  // Shop Features
  enableShop: boolean;
  enablePrintify: boolean;
  enableCustomOrders: boolean;

  // Admin Features
  enableFixtureManagement: boolean;
  enableSquadManagement: boolean;
  enableEventManagement: boolean;
  enableAutoPosting: boolean;

  // Experimental Features
  enableBetaFeatures: boolean;
  enableDebugMode: boolean;
  enablePerformanceMonitoring: boolean;
}

/**
 * Default feature flags (safe defaults)
 */
export const defaultFeatureFlags: FeatureFlags = {
  // Core Features
  enableOfflineMode: false,
  enablePushNotifications: true,
  enableLocationTracking: false,
  enableGeoFencing: false,

  // Social Features
  enableChat: false,
  enableComments: true,
  enableLikes: true,
  enableSharing: true,

  // Match Features
  enableLiveMatch: true,
  enableMatchPredictions: false,
  enablePlayerRatings: true,
  enableMOTMVoting: true,

  // Media Features
  enableGallery: true,
  enableVideoHighlights: true,
  enableVideoRecording: true,
  enableVideoUpload: true,

  // Training Features
  enableTrainingDrills: true,
  enableTacticsBoard: false,
  enableSessionPlanner: false,

  // Shop Features
  enableShop: true,
  enablePrintify: true,
  enableCustomOrders: true,

  // Admin Features
  enableFixtureManagement: true,
  enableSquadManagement: true,
  enableEventManagement: true,
  enableAutoPosting: true,

  // Experimental Features
  enableBetaFeatures: false,
  enableDebugMode: IS_DEV,
  enablePerformanceMonitoring: false,
};

/**
 * Local storage keys
 */
const STORAGE_KEY = '@feature_flags';
const STORAGE_OVERRIDES_KEY = '@feature_flags_overrides';

/**
 * Load feature flags from API
 */
export async function loadFeatureFlagsFromAPI(): Promise<FeatureFlags> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/tenant/feature-flags?tenant=${TENANT_ID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load feature flags: ${response.status}`);
    }

    const data = await response.json();
    const flags: FeatureFlags = {
      ...defaultFeatureFlags,
      ...data.flags,
    };

    // Cache flags locally
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(flags));

    return flags;
  } catch (error) {
    console.error('Error loading feature flags from API:', error);

    // Try to load from cache
    const cached = await loadFeatureFlagsFromCache();
    if (cached) {
      return cached;
    }

    // Fall back to defaults
    return defaultFeatureFlags;
  }
}

/**
 * Load feature flags from local cache
 */
export async function loadFeatureFlagsFromCache(): Promise<FeatureFlags | null> {
  try {
    const cached = await AsyncStorage.getItem(STORAGE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  } catch (error) {
    console.error('Error loading feature flags from cache:', error);
    return null;
  }
}

/**
 * Load local overrides (for development/testing)
 */
export async function loadLocalOverrides(): Promise<Partial<FeatureFlags> | null> {
  try {
    const overrides = await AsyncStorage.getItem(STORAGE_OVERRIDES_KEY);
    if (overrides) {
      return JSON.parse(overrides);
    }
    return null;
  } catch (error) {
    console.error('Error loading local overrides:', error);
    return null;
  }
}

/**
 * Set local override for a feature flag (development only)
 */
export async function setLocalOverride(flag: keyof FeatureFlags, value: boolean): Promise<void> {
  if (!IS_DEV) {
    console.warn('Local overrides are only available in development mode');
    return;
  }

  try {
    const overrides = await loadLocalOverrides() || {};
    overrides[flag] = value;
    await AsyncStorage.setItem(STORAGE_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch (error) {
    console.error('Error setting local override:', error);
  }
}

/**
 * Clear all local overrides
 */
export async function clearLocalOverrides(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_OVERRIDES_KEY);
  } catch (error) {
    console.error('Error clearing local overrides:', error);
  }
}

/**
 * Apply local overrides to feature flags
 */
async function applyLocalOverrides(flags: FeatureFlags): Promise<FeatureFlags> {
  if (!IS_DEV) {
    return flags;
  }

  const overrides = await loadLocalOverrides();
  if (!overrides) {
    return flags;
  }

  return {
    ...flags,
    ...overrides,
  };
}

/**
 * React hook to use feature flags
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { flags, loading, isEnabled } = useFeatureFlags();
 *
 *   if (isEnabled('enableChat')) {
 *     return <ChatScreen />;
 *   }
 *
 *   return <Text>Chat is disabled</Text>;
 * }
 * ```
 */
export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags>(defaultFeatureFlags);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadFeatureFlagsFromAPI()
      .then(async (loadedFlags) => {
        const flagsWithOverrides = await applyLocalOverrides(loadedFlags);
        setFlags(flagsWithOverrides);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load feature flags:', err);
        setError(err);
        setFlags(defaultFeatureFlags);
        setLoading(false);
      });
  }, []);

  /**
   * Check if a feature is enabled
   */
  const isEnabled = (flag: keyof FeatureFlags): boolean => {
    return flags[flag];
  };

  /**
   * Refresh feature flags from API
   */
  const refresh = async () => {
    setLoading(true);
    try {
      const loadedFlags = await loadFeatureFlagsFromAPI();
      const flagsWithOverrides = await applyLocalOverrides(loadedFlags);
      setFlags(flagsWithOverrides);
      setError(null);
    } catch (err: any) {
      console.error('Failed to refresh feature flags:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return {
    flags,
    loading,
    error,
    isEnabled,
    refresh,
  };
}

/**
 * Get feature flags synchronously (uses defaults, doesn't load from API/cache)
 */
export function getFeatureFlags(): FeatureFlags {
  return defaultFeatureFlags;
}

/**
 * Check if a feature is enabled (synchronous, uses defaults)
 */
export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  return defaultFeatureFlags[flag];
}

/**
 * Feature flag utility: conditionally render components
 *
 * @example
 * ```tsx
 * <FeatureGate flag="enableChat">
 *   <ChatScreen />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({
  flag,
  children,
  fallback = null,
}: {
  flag: keyof FeatureFlags;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isEnabled } = useFeatureFlags();

  if (isEnabled(flag)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

/**
 * Export default flags for convenient access
 */
export default defaultFeatureFlags;
