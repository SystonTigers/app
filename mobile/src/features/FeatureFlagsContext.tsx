import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { FeatureFlags, TenantConfig, FeatureFlagsContextValue, PlanFeatures } from './types';
import { DEFAULT_FEATURES, mergeFeatures, getPlanFeatures } from './featureFlags';
import { API_BASE_URL, TENANT_ID, API_ENDPOINTS } from '../config';

const FEATURE_FLAGS_STORAGE_KEY = '@feature_flags';
const TENANT_CONFIG_STORAGE_KEY = '@tenant_config';
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export const FeatureFlagsContext = createContext<FeatureFlagsContextValue | undefined>(undefined);

interface FeatureFlagsProviderProps {
  children: ReactNode;
}

export const FeatureFlagsProvider: React.FC<FeatureFlagsProviderProps> = ({ children }) => {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FEATURES);
  const [config, setConfig] = useState<TenantConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load cached flags on mount
  useEffect(() => {
    loadCachedFlags();
  }, []);

  // Fetch fresh flags after loading cache
  useEffect(() => {
    if (!isLoading) {
      refreshFlags();
    }
  }, []);

  // Load cached flags from storage
  const loadCachedFlags = async () => {
    try {
      const [cachedFlags, cachedConfig] = await Promise.all([
        AsyncStorage.getItem(FEATURE_FLAGS_STORAGE_KEY),
        AsyncStorage.getItem(TENANT_CONFIG_STORAGE_KEY),
      ]);

      if (cachedFlags) {
        const parsedFlags = JSON.parse(cachedFlags);
        setFlags(parsedFlags);
      }

      if (cachedConfig) {
        const parsedConfig = JSON.parse(cachedConfig);

        // Check if cache is still valid
        const cacheAge = Date.now() - parsedConfig.lastUpdated;
        if (cacheAge < CACHE_DURATION) {
          setConfig(parsedConfig);

          // Merge plan features with custom features
          const planFeatures = getPlanFeatures(parsedConfig.plan);
          const mergedFlags = mergeFeatures(planFeatures.features, parsedConfig.features);
          setFlags(mergedFlags);
        }
      }
    } catch (err) {
      console.error('Failed to load cached feature flags:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch fresh flags from API
  const refreshFlags = useCallback(async () => {
    try {
      setError(null);

      const response = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.TENANT_CONFIG}`, {
        params: { tenant: TENANT_ID },
        timeout: 10000,
      });

      if (response.data) {
        const tenantConfig: TenantConfig = {
          tenantId: TENANT_ID,
          plan: response.data.plan || 'free',
          features: response.data.features || {},
          limits: response.data.limits,
          customization: response.data.customization,
          lastUpdated: Date.now(),
        };

        setConfig(tenantConfig);

        // Merge plan features with custom features
        const planFeatures = getPlanFeatures(tenantConfig.plan);
        const mergedFlags = mergeFeatures(planFeatures.features, tenantConfig.features);
        setFlags(mergedFlags);

        // Cache the results
        await Promise.all([
          AsyncStorage.setItem(FEATURE_FLAGS_STORAGE_KEY, JSON.stringify(mergedFlags)),
          AsyncStorage.setItem(TENANT_CONFIG_STORAGE_KEY, JSON.stringify(tenantConfig)),
        ]);
      }
    } catch (err: any) {
      console.error('Failed to fetch feature flags:', err);
      setError(err.message || 'Failed to load features');

      // If API fails, use cached data or defaults
      if (!config) {
        // Use free plan as fallback
        const fallbackPlan = getPlanFeatures('free');
        setFlags(mergeFeatures(fallbackPlan.features));
      }
    }
  }, [config]);

  // Check if a feature is enabled
  const isFeatureEnabled = useCallback(
    (feature: keyof FeatureFlags): boolean => {
      return flags[feature] === true;
    },
    [flags]
  );

  // Alias for isFeatureEnabled
  const hasFeature = isFeatureEnabled;

  // Get limit value
  const getLimit = useCallback(
    (limitName: keyof NonNullable<PlanFeatures['limits']>): number | undefined => {
      return config?.limits?.[limitName];
    },
    [config]
  );

  // Check if current value is within limit
  const isWithinLimit = useCallback(
    (limitName: keyof NonNullable<PlanFeatures['limits']>, currentValue: number): boolean => {
      const limit = getLimit(limitName);

      // If limit is undefined, it's unlimited
      if (limit === undefined) return true;

      return currentValue < limit;
    },
    [getLimit]
  );

  const value: FeatureFlagsContextValue = {
    flags,
    config,
    isLoading,
    error,
    isFeatureEnabled,
    hasFeature,
    refreshFlags,
    getLimit,
    isWithinLimit,
  };

  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
};
