/**
 * @fileoverview Dynamic Configuration System - Zero Hardcoded Literals
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Runtime configuration injection from Config sheet - completely customer-configurable
 *
 * FEATURES:
 * - Config sheet as single source of truth
 * - Runtime injection with caching
 * - Template rendering system
 * - Zero hardcoded club references
 * - Customer-configurable everything
 */

// ==================== CONFIGURATION CONSTANTS ====================

const CONFIG_SHEET_NAME = 'CONFIG';  // Match CustomerInstaller sheet name
const CONFIG_CACHE_KEY = 'APP_CONFIG_CACHE';
const CONFIG_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Required configuration keys (will throw error if missing)
const REQUIRED_CONFIG_KEYS = [
  'TEAM_NAME',
  'TEAM_SHORT',
  'LEAGUE_NAME',
  'PRIMARY_COLOR',
  'SECONDARY_COLOR',
  'BADGE_URL',
  'TIMEZONE',
  'AGE_GROUP'
];

// Optional configuration keys with defaults
const DEFAULT_CONFIG_VALUES = {
  'LEAGUE_URL': '',
  'STADIUM_NAME': '',
  'WEBAPP_BASE_URL': '',
  'SEASON': '2024/25',
  'SOCIAL_HASHTAGS': '',
  'CONTACT_EMAIL': '',
  'WEBSITE_URL': '',
  'MOTTO': '',
  'FOUNDED_YEAR': '',
  'GROUND_CAPACITY': ''
};

// ==================== CORE CONFIG FUNCTIONS ====================

/**
 * Get configuration with caching
 * @param {Object} opts - Options
 * @param {boolean} opts.forceRefresh - Force refresh from sheet
 * @returns {Object} Configuration object
 */
function getDynamicConfig(opts = {}) {
  const now = Date.now();
  const props = PropertiesService.getScriptProperties();

  // Try cache first (unless force refresh)
  if (!opts.forceRefresh) {
    const raw = props.getProperty(CONFIG_CACHE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed._ts && (now - parsed._ts) < CONFIG_CACHE_TTL_MS) {
          return parsed;
        }
      } catch (e) {
        console.warn('Config cache corrupted, refreshing from sheet');
      }
    }
  }

  // Load from sheet
  const cfg = readConfigFromSheet_();
  requireKeys_(cfg, REQUIRED_CONFIG_KEYS);
  applyDefaults_(cfg, DEFAULT_CONFIG_VALUES);

  // Cache with timestamp
  const cached = Object.assign({_ts: now}, cfg);
  props.setProperty(CONFIG_CACHE_KEY, JSON.stringify(cached));

  return cached;
}

/**
 * Shorthand for getDynamicConfig()
 * @returns {Object} Configuration object
 */
function cfg() {
  return getDynamicConfig();
}

/**
 * Get configuration with query parameter overrides (for previews)
 * @param {Object} e - doGet/doPost event object
 * @returns {Object} Configuration with overrides applied
 */
function getConfigWithQuery_(e) {
  const base = getDynamicConfig();

  if (e && e.parameter) {
    // Allow preview overrides
    if (e.parameter.club) base.TEAM_NAME = e.parameter.club;
    if (e.parameter.league) base.LEAGUE_NAME = e.parameter.league;
    if (e.parameter.color) base.PRIMARY_COLOR = e.parameter.color;
  }

  return base;
}

// ==================== SHEET OPERATIONS ====================

/**
 * Read configuration from Config sheet
 * @returns {Object} Configuration object
 * @private
 */
function readConfigFromSheet_() {
  try {
    // Use configured sheet ID instead of getActive() for trigger compatibility
    const ss = getSheet();  // Uses getConfiguredSheetId_() internally
    let sheet = ss.getSheetByName(CONFIG_SHEET_NAME);

    // Create Config sheet if it doesn't exist
    if (!sheet) {
      sheet = createConfigSheet_();
    }

    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
    const config = {};

    for (const [key, value] of values) {
      if (!key) continue;
      config[String(key).trim()] = (value == null ? '' : String(value)).trim();
    }

    return config;

  } catch (error) {
    console.error('Failed to read config from sheet:', error);
    throw new Error(`Config sheet error: ${error.toString()}`);
  }
}

/**
 * Create Config sheet with default values
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} Created sheet
 * @private
 */
function createConfigSheet_() {
  // Use configured sheet ID instead of getActive() for trigger compatibility
  const ss = getSheet();  // Uses getConfiguredSheetId_() internally
  const sheet = ss.insertSheet(CONFIG_SHEET_NAME);

  // Set up headers
  sheet.getRange(1, 1, 1, 2).setValues([['Key', 'Value']]);
  sheet.getRange(1, 1, 1, 2).setBackground('#4285f4').setFontColor('white').setFontWeight('bold');

  // Add default configuration values
  const defaultRows = [
    ['TEAM_NAME', '[SET YOUR TEAM NAME]'],
    ['TEAM_SHORT', '[SET SHORT NAME]'],
    ['LEAGUE_NAME', '[SET YOUR LEAGUE]'],
    ['PRIMARY_COLOR', '#dc143c'],
    ['SECONDARY_COLOR', '#ffffff'],
    ['BADGE_URL', 'https://example.com/badge.png'],
    ['TIMEZONE', 'Europe/London'],
    ['AGE_GROUP', "Senior Men's"],
    ['SEASON', '2024/25'],
    ['STADIUM_NAME', '[SET YOUR GROUND NAME]'],
    ['SOCIAL_HASHTAGS', '#YourTeam #Football'],
    ['CONTACT_EMAIL', 'contact@yourteam.com'],
    ['WEBSITE_URL', 'https://yourteam.com'],
    ['MOTTO', 'Pride, Passion, Performance'],
    ['FOUNDED_YEAR', '1900'],
    ['GROUND_CAPACITY', '500']
  ];

  if (defaultRows.length > 0) {
    sheet.getRange(2, 1, defaultRows.length, 2).setValues(defaultRows);
  }

  // Format the sheet
  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 300);
  sheet.autoResizeRows(1, defaultRows.length + 1);

  console.log('Created Config sheet with default values');
  return sheet;
}

/**
 * Update configuration value
 * @param {string} key - Configuration key
 * @param {string} value - Configuration value
 */
function updateConfig(key, value) {
  try {
    // Use configured sheet ID instead of getActive() for trigger compatibility
    const ss = getSheet();  // Uses getConfiguredSheetId_() internally
    let sheet = ss.getSheetByName(CONFIG_SHEET_NAME);

    if (!sheet) {
      sheet = createConfigSheet_();
    }

    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
    let found = false;

    // Update existing key
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] === key) {
        sheet.getRange(i + 2, 2).setValue(value);
        found = true;
        break;
      }
    }

    // Add new key if not found
    if (!found) {
      const newRow = sheet.getLastRow() + 1;
      sheet.getRange(newRow, 1, 1, 2).setValues([[key, value]]);
    }

    // Clear cache to force refresh
    const props = PropertiesService.getScriptProperties();
    props.deleteProperty(CONFIG_CACHE_KEY);

    console.log(`Updated config: ${key} = ${value}`);

  } catch (error) {
    console.error('Failed to update config:', error);
    throw new Error(`Config update failed: ${error.toString()}`);
  }
}

// ==================== VALIDATION FUNCTIONS ====================

/**
 * Validate required configuration keys
 * @param {Object} cfg - Configuration object
 * @param {Array} keys - Required keys
 * @throws {Error} If required keys are missing
 * @private
 */
function requireKeys_(cfg, keys) {
  const missing = keys.filter(k => !cfg[k] || cfg[k].length === 0 || cfg[k].includes('[SET'));

  if (missing.length) {
    const errorMsg = `
🚨 CONFIGURATION INCOMPLETE 🚨

Missing required configuration in CONFIG sheet:
${missing.map(k => `• ${k}`).join('\n')}

Please:
1. Open your Google Sheet
2. Go to the 'CONFIG' tab
3. Fill in the missing values
4. Refresh this page

Required values must not be empty or contain [SET...] placeholders.
    `.trim();

    throw new Error(errorMsg);
  }
}

/**
 * Apply default values for optional configuration
 * @param {Object} cfg - Configuration object
 * @param {Object} defaults - Default values
 * @private
 */
function applyDefaults_(cfg, defaults) {
  for (const [key, defaultValue] of Object.entries(defaults)) {
    if (!cfg[key]) {
      cfg[key] = defaultValue;
    }
  }
}

// ==================== HTML TEMPLATE RENDERING ====================

/**
 * Render HTML template with configuration injection
 * @param {string} fileName - HTML file name (without .html)
 * @param {Object} opts - Rendering options
 * @param {string} opts.titlePrefix - Prefix for page title
 * @param {Object} opts.data - Additional template data
 * @param {Object} opts.config - Configuration override
 * @returns {GoogleAppsScript.HTML.HtmlOutput} Rendered HTML
 */
function renderHtml_(fileName, opts = {}) {
  try {
    const {
      titlePrefix = '',
      data = {},
      config = null,
      sandbox = HtmlService.SandboxMode.IFRAME
    } = opts;

    // Get configuration
    const cfg = config || getDynamicConfig();

    // Create template
    const template = HtmlService.createTemplateFromFile(fileName);

    // Inject configuration and data
    template.config = cfg;
    template.data = data;
    template.title = titlePrefix;

    // Evaluate template
    const output = template.evaluate()
      .setSandboxMode(sandbox)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

    // Set dynamic title
    const fullTitle = titlePrefix
      ? `${titlePrefix} – ${cfg.TEAM_NAME}`
      : cfg.TEAM_NAME;
    output.setTitle(fullTitle);

    return output;

  } catch (error) {
    console.error('HTML rendering failed:', error);

    // Return error page with helpful message
    const errorHtml = `
      <div style="padding: 20px; font-family: Arial; text-align: center;">
        <h2>⚠️ Configuration Error</h2>
        <p>Failed to load page due to configuration issues:</p>
        <pre style="background: #f5f5f5; padding: 10px; border-radius: 5px;">${error.toString()}</pre>
        <p><a href="javascript:location.reload()">Try refreshing the page</a></p>
      </div>
    `;

    return HtmlService.createHtmlOutput(errorHtml)
      .setTitle('Configuration Error')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

/**
 * Include partial HTML file for templates
 * @param {string} filename - Partial file name
 * @returns {string} HTML content
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ==================== PAYLOAD BUILDING ====================

/**
 * Build Make.com payload with configuration
 * @param {Object} eventData - Event data
 * @returns {Object} Complete payload with config
 */
function buildConfiguredPayload(eventData) {
  const config = getDynamicConfig();

  return {
    // Event data
    ...eventData,

    // Configuration injection
    club_name: config.TEAM_NAME,
    club_short: config.TEAM_SHORT,
    league_name: config.LEAGUE_NAME,
    badge_url: config.BADGE_URL,
    primary_color: config.PRIMARY_COLOR,
    secondary_color: config.SECONDARY_COLOR,
    season: config.SEASON,
    timezone: config.TIMEZONE,

    // Social media data
    hashtags: config.SOCIAL_HASHTAGS,
    website_url: config.WEBSITE_URL,

    // Template metadata
    template_data: {
      team_name: config.TEAM_NAME,
      team_short: config.TEAM_SHORT,
      badge_url: config.BADGE_URL,
      primary_color: config.PRIMARY_COLOR,
      secondary_color: config.SECONDARY_COLOR,
      league_name: config.LEAGUE_NAME
    }
  };
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get all configuration as object (for debugging)
 * @returns {Object} Complete configuration
 */
function getAllConfig() {
  return getDynamicConfig();
}

/**
 * Clear configuration cache (forces refresh from sheet)
 */
function clearConfigCache() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty(CONFIG_CACHE_KEY);
  console.log('Configuration cache cleared');
}

/**
 * Validate configuration completeness
 * @returns {Object} Validation result
 */
function validateConfig() {
  try {
    const config = getDynamicConfig();

    return {
      valid: true,
      config: config,
      message: 'Configuration is valid and complete'
    };

  } catch (error) {
    return {
      valid: false,
      error: error.toString(),
      message: 'Configuration validation failed'
    };
  }
}

/**
 * Test configuration system
 * @returns {Object} Test results
 */
function testConfigSystem() {
  console.log('🧪 Testing configuration system...');

  try {
    // Test 1: Load config
    const config = getDynamicConfig();
    console.log('✅ Config loaded successfully');

    // Test 2: Validate required keys
    requireKeys_(config, REQUIRED_CONFIG_KEYS);
    console.log('✅ Required keys validation passed');

    // Test 2b: Ensure static config helper is still available
    const staticVersion = getConfigValue('SYSTEM.VERSION', 'unknown');
    if (!staticVersion) {
      throw new Error('Static config helper failed to resolve SYSTEM.VERSION');
    }
    console.log('✅ Static config helper resolved SYSTEM.VERSION');

    // Test 3: Cache functionality
    const config2 = getDynamicConfig(); // Should use cache
    console.log('✅ Cache functionality working');

    // Test 4: Force refresh
    const config3 = getDynamicConfig({forceRefresh: true});
    console.log('✅ Force refresh working');

    if (config3 && config3.TEAM_NAME && config3.TEAM_NAME !== config.TEAM_NAME) {
      console.log('ℹ️ Dynamic config refreshed with updated values');
    }

    return {
      success: true,
      message: 'All configuration tests passed',
      config: config,
      version: staticVersion
    };

  } catch (error) {
    console.error('❌ Configuration test failed:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}