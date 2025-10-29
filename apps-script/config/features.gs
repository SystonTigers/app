/**
 * Feature Flags Configuration
 * Controls which features are enabled/disabled per tenant
 */

// ============================================================================
// FEATURE FLAGS
// ============================================================================

const FEATURE_FLAGS = {
  VIDEO_PROCESSING: {
    enabled: true,
    highlightGeneration: true,
    autoUploadToYouTube: false
  },

  ATTENDANCE_TRACKING: {
    enabled: true,
    requireGeofence: false
  },

  VOTING: {
    enabled: true,
    playerOfMatch: true,
    goalOfMonth: true
  },

  CALENDAR_INTEGRATION: {
    enabled: true,
    autoCreateEvents: true
  },

  FA_FULL_TIME_SYNC: {
    enabled: true,
    autoSync: true,
    syncInterval: 60 // minutes
  },

  MAKE_WEBHOOKS: {
    enabled: true,
    retryOnFailure: true,
    maxRetries: 3
  }
};

/**
 * Check if a feature is enabled
 */
function isFeatureEnabled(featureName, subFeature) {
  const feature = FEATURE_FLAGS[featureName];
  if (!feature) return false;

  if (subFeature) {
    return feature.enabled && feature[subFeature];
  }

  return feature.enabled;
}

/**
 * Get all enabled features
 */
function getEnabledFeatures() {
  return Object.keys(FEATURE_FLAGS).filter(key => FEATURE_FLAGS[key].enabled);
}
