/**
 * @fileoverview Configuration management for SystonAutomationLib
 * @version 1.0.0
 * @description Read config from Script Properties with validation
 */

/**
 * Read configuration from Script Properties or from passed overrides
 * REQUIRED KEYS: TEAM_NAME, PRIMARY_COLOR, SECONDARY_COLOR, TIMEZONE
 * @param {Object} overrides - Optional config overrides
 * @return {Object} Complete configuration object
 * @throws {Error} If required configuration is missing
 */
function SA_cfg_(overrides) {
  const sp = PropertiesService.getScriptProperties().getProperties();

  const cfg = Object.assign({
    // Required fields
    TEAM_NAME: '',
    PRIMARY_COLOR: '#FFD100',
    SECONDARY_COLOR: '#000000',
    TIMEZONE: 'Europe/London',

    // Optional fields with defaults
    LEAGUE_URL: '',
    MAKE_WEBHOOK_RESULTS: '',
    MAKE_WEBHOOK_GOALS: '',
    MAKE_WEBHOOK_CARDS: '',
    BADGE_URL: '',
    HOME_VENUE: '',
    SEASON: new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),

    // System settings
    ENABLE_PRIVACY_CHECKS: 'true',
    ENABLE_MONITORING: 'true',
    CACHE_TTL_MINUTES: '30',
    LOG_LEVEL: 'INFO'
  }, sp, overrides || {});

  // Validate required configuration
  const required = ['TEAM_NAME', 'PRIMARY_COLOR', 'SECONDARY_COLOR', 'TIMEZONE'];
  const missing = required.filter(k => !cfg[k] || cfg[k].trim() === '');

  if (missing.length) {
    throw new Error('Configuration missing required fields: ' + missing.join(', '));
  }

  // Validate color formats
  const colorFields = ['PRIMARY_COLOR', 'SECONDARY_COLOR'];
  colorFields.forEach(field => {
    if (cfg[field] && !cfg[field].match(/^#[0-9A-Fa-f]{6}$/)) {
      throw new Error(`${field} must be a valid hex color (e.g., #FFD100)`);
    }
  });

  return cfg;
}

/**
 * Get a specific configuration value with fallback
 * @param {string} key - Configuration key
 * @param {*} defaultValue - Default value if key not found
 * @return {*} Configuration value or default
 */
function SA_getConfig_(key, defaultValue) {
  try {
    const cfg = SA_cfg_();
    return cfg[key] !== undefined ? cfg[key] : defaultValue;
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Update configuration values
 * @param {Object} updates - Key-value pairs to update
 * @return {Object} Updated configuration
 */
function SA_updateConfig_(updates) {
  const sp = PropertiesService.getScriptProperties();

  // Validate updates first
  const testCfg = Object.assign(sp.getProperties(), updates);
  SA_cfg_(testCfg); // This will throw if invalid

  // Update if validation passes
  sp.setProperties(updates, false);

  return SA_cfg_();
}

/**
 * Get configuration for UI display (safe, no sensitive data)
 * @return {Object} UI-safe configuration
 */
function SA_getConfigForUI_() {
  try {
    const cfg = SA_cfg_();
    return {
      TEAM_NAME: cfg.TEAM_NAME,
      PRIMARY_COLOR: cfg.PRIMARY_COLOR,
      SECONDARY_COLOR: cfg.SECONDARY_COLOR,
      TIMEZONE: cfg.TIMEZONE,
      LEAGUE_URL: cfg.LEAGUE_URL,
      HOME_VENUE: cfg.HOME_VENUE,
      SEASON: cfg.SEASON,
      hasWebhooks: !!(cfg.MAKE_WEBHOOK_RESULTS || cfg.MAKE_WEBHOOK_GOALS),
      privacyEnabled: cfg.ENABLE_PRIVACY_CHECKS === 'true',
      monitoringEnabled: cfg.ENABLE_MONITORING === 'true'
    };
  } catch (error) {
    return {
      error: error.message,
      needsSetup: true
    };
  }
}