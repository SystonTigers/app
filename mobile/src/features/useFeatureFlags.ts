import { useContext } from 'react';
import { FeatureFlagsContext } from './FeatureFlagsContext';
import { FeatureFlagsContextValue, FeatureFlags } from './types';

/**
 * Hook to access feature flags context
 *
 * @example
 * ```tsx
 * const { isFeatureEnabled, config } = useFeatureFlags();
 *
 * if (isFeatureEnabled('chat')) {
 *   return <ChatScreen />;
 * }
 * ```
 */
export const useFeatureFlags = (): FeatureFlagsContextValue => {
  const context = useContext(FeatureFlagsContext);

  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider');
  }

  return context;
};

/**
 * Hook to check if a specific feature is enabled
 *
 * @example
 * ```tsx
 * const chatEnabled = useFeature('chat');
 *
 * if (chatEnabled) {
 *   return <ChatButton />;
 * }
 * ```
 */
export const useFeature = (feature: keyof FeatureFlags): boolean => {
  const { isFeatureEnabled } = useFeatureFlags();
  return isFeatureEnabled(feature);
};

/**
 * Hook to check multiple features at once
 *
 * @example
 * ```tsx
 * const { chat, gallery } = useFeatures(['chat', 'gallery']);
 *
 * return (
 *   <View>
 *     {chat && <ChatButton />}
 *     {gallery && <GalleryButton />}
 *   </View>
 * );
 * ```
 */
export const useFeatures = (features: Array<keyof FeatureFlags>): Record<string, boolean> => {
  const { flags } = useFeatureFlags();

  return features.reduce((acc, feature) => {
    acc[feature] = flags[feature] === true;
    return acc;
  }, {} as Record<string, boolean>);
};

/**
 * Hook to check if user is within a specific limit
 *
 * @example
 * ```tsx
 * const canAddEvent = useLimit('maxEvents', currentEventCount);
 *
 * if (!canAddEvent) {
 *   return <UpgradePrompt />;
 * }
 * ```
 */
export const useLimit = (
  limitName: keyof NonNullable<import('./types').PlanFeatures['limits']>,
  currentValue: number
): boolean => {
  const { isWithinLimit } = useFeatureFlags();
  return isWithinLimit(limitName, currentValue);
};

/**
 * Hook to get current plan information
 *
 * @example
 * ```tsx
 * const { plan, limits } = usePlan();
 *
 * return (
 *   <View>
 *     <Text>Current Plan: {plan}</Text>
 *     <Text>Max Events: {limits.maxEvents}</Text>
 *   </View>
 * );
 * ```
 */
export const usePlan = () => {
  const { config } = useFeatureFlags();

  return {
    plan: config?.plan || 'free',
    limits: config?.limits || {},
    customization: config?.customization || {},
  };
};

/**
 * Hook to get all enabled features
 *
 * @example
 * ```tsx
 * const enabledFeatures = useEnabledFeatures();
 * // Returns: ['eventRsvp', 'newsFeeds', ...]
 * ```
 */
export const useEnabledFeatures = (): Array<keyof FeatureFlags> => {
  const { flags } = useFeatureFlags();

  return (Object.keys(flags) as Array<keyof FeatureFlags>).filter(
    (feature) => flags[feature] === true
  );
};

/**
 * Hook to check if user has premium features
 *
 * @example
 * ```tsx
 * const isPremium = useIsPremium();
 *
 * if (isPremium) {
 *   return <PremiumBadge />;
 * }
 * ```
 */
export const useIsPremium = (): boolean => {
  const { config } = useFeatureFlags();
  return config?.plan === 'premium' || config?.plan === 'enterprise';
};

/**
 * Hook to check if user has enterprise features
 */
export const useIsEnterprise = (): boolean => {
  const { config } = useFeatureFlags();
  return config?.plan === 'enterprise';
};

/**
 * Hook to check if user is on free plan
 */
export const useIsFree = (): boolean => {
  const { config } = useFeatureFlags();
  return config?.plan === 'free';
};
