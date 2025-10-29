/**
 * Config Index
 * Central export point for all configuration modules
 *
 * Usage in other files:
 * const tenant = getTenantConfig('syston-tigers');
 * const apiUrl = getApiEndpoint('CLOUDFLARE_WORKER', '/videos/upload');
 * const features = getFeatureFlags();
 */

// ============================================================================
// CENTRAL CONFIG API
// ============================================================================

/**
 * Get complete tenant configuration
 * @param {string} tenantId - The tenant identifier
 * @returns {object|null} Tenant configuration or null if not found
 */
function getTenantConfig(tenantId) {
  return getTenantConfigByKey(tenantId);
}

/**
 * Get feature flags
 * @returns {object} All feature flags
 */
function getFeatureFlags() {
  return FEATURE_FLAGS;
}

/**
 * Check if feature is enabled
 * @param {string} featureName - Feature to check
 * @param {string} subFeature - Optional sub-feature
 * @returns {boolean}
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
 * Validate that all required environment configuration is present
 * Call this from your main initialization to catch config issues early
 * @returns {object} { valid: boolean, errors: string[] }
 */
function validateEnvironment() {
  const errors = [];

  // Check Script Properties
  const props = PropertiesService.getScriptProperties();
  const requiredProps = ['YOUTUBE_API_KEY'];

  requiredProps.forEach(prop => {
    if (!props.getProperty(prop)) {
      errors.push(`Missing script property: ${prop}`);
    }
  });

  // Check tenant configs
  const tenants = getAllTenantIds();
  if (tenants.length === 0) {
    errors.push('No tenants configured');
  }

  // Check API endpoints
  try {
    getApiEndpoint('CLOUDFLARE_WORKER', '/test');
  } catch (err) {
    errors.push(`API config error: ${err.message}`);
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Get configuration summary for debugging
 * @returns {object}
 */
function getConfigSummary() {
  return {
    tenants: getAllTenantIds(),
    enabledFeatures: getEnabledFeatures(),
    apiEndpoints: Object.keys(API_CONFIG),
    webhooks: Object.keys(WEBHOOK_CONFIG),
    environment: validateEnvironment()
  };
}

/**
 * Log configuration summary (useful for debugging)
 */
function logConfigSummary() {
  const summary = getConfigSummary();
  Logger.log('=== Configuration Summary ===');
  Logger.log(JSON.stringify(summary, null, 2));
  return summary;
}
