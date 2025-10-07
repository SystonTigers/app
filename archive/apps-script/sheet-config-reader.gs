/**
 * Sheet-Based Configuration Reader
 *
 * This system replaces hardcoded configuration values with dynamic reading
 * from the Config sheet, enabling customers to configure the system entirely
 * through the spreadsheet interface without touching code.
 */

// Configuration cache to avoid repeated sheet reads
let configCache = {};
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Automatic spreadsheet ID detection
 * This eliminates the need for customers to manually set spreadsheet IDs
 */
function getSpreadsheetId() {
  try {
    // First, try to get the current spreadsheet ID
    const currentSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (currentSpreadsheet) {
      return currentSpreadsheet.getId();
    }

    // Fallback: try to get from script properties (for triggers/webhooks)
    const storedId = PropertiesService.getScriptProperties().getProperty('CURRENT_SPREADSHEET_ID');
    if (storedId) {
      return storedId;
    }

    // Last resort: try to find spreadsheet by script binding
    const scriptId = ScriptApp.getScriptId();
    // Note: This would require the script to be bound to the spreadsheet
    // For standalone scripts, we rely on the first two methods

    throw new Error('Unable to detect spreadsheet ID automatically');

  } catch (error) {
    Logger.log('Error detecting spreadsheet ID: ' + error.toString());
    throw error;
  }
}

/**
 * Get the current spreadsheet object with automatic detection
 */
function getCurrentSpreadsheet() {
  try {
    const currentSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (currentSpreadsheet) {
      // Store the ID for future use (triggers, webhooks, etc.)
      PropertiesService.getScriptProperties().setProperty(
        'CURRENT_SPREADSHEET_ID',
        currentSpreadsheet.getId()
      );
      return currentSpreadsheet;
    }

    // If no active spreadsheet, try opening by stored ID
    const storedId = PropertiesService.getScriptProperties().getProperty('CURRENT_SPREADSHEET_ID');
    if (storedId) {
      return SpreadsheetApp.openById(storedId);
    }

    throw new Error('No spreadsheet context available');

  } catch (error) {
    Logger.log('Error getting current spreadsheet: ' + error.toString());
    throw error;
  }
}

/**
 * Get a sheet by name with enhanced error handling
 */
function getSheetByName(sheetName, options = {}) {
  const createIfMissing = options.createIfMissing || false;
  const spreadsheet = getCurrentSpreadsheet();

  try {
    let sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet && createIfMissing) {
      Logger.log(`Creating missing sheet: ${sheetName}`);
      sheet = spreadsheet.insertSheet(sheetName);
    }

    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }

    return sheet;

  } catch (error) {
    Logger.log(`Error accessing sheet "${sheetName}": ${error.toString()}`);
    throw error;
  }
}

/**
 * Main configuration value getter - replaces all CONFIG.* calls
 */
function getConfigValue(key, defaultValue = null) {
  try {
    // Check cache first
    if (isCacheValid() && configCache[key] !== undefined) {
      return configCache[key];
    }

    // Special handling for system-detected values
    if (key === 'SPREADSHEET_ID') {
      const value = getSpreadsheetId();
      cacheConfigValue(key, value);
      return value;
    }

    if (key === 'SCRIPT_ID') {
      const value = ScriptApp.getScriptId();
      cacheConfigValue(key, value);
      return value;
    }

    // Read from Config sheet
    const configSheet = getSheetByName('Config');
    if (!configSheet) {
      Logger.log('Config sheet not found, using default value for: ' + key);
      return defaultValue;
    }

    // Find the configuration item
    const data = configSheet.getDataRange().getValues();
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row[0] && findConfigKeyByLabel(row[0]) === key) {
        let value = row[1];

        // Handle different data types
        if (typeof value === 'string') {
          value = value.trim();

          // Handle boolean strings
          if (value.toLowerCase() === 'yes' || value.toLowerCase() === 'true') {
            value = true;
          } else if (value.toLowerCase() === 'no' || value.toLowerCase() === 'false') {
            value = false;
          }

          // Handle empty strings
          if (value === '') {
            value = defaultValue;
          }
        }

        // Cache the value
        cacheConfigValue(key, value);
        return value;
      }
    }

    // If not found in config sheet, return default
    Logger.log(`Config key "${key}" not found, using default: ${defaultValue}`);
    return defaultValue;

  } catch (error) {
    Logger.log(`Error reading config value "${key}": ${error.toString()}`);
    return defaultValue;
  }
}

/**
 * Get multiple configuration values at once (more efficient)
 */
function getConfigValues(keys, defaults = {}) {
  try {
    // Check if we can serve from cache
    if (isCacheValid()) {
      const result = {};
      let allCached = true;

      keys.forEach(key => {
        if (configCache[key] !== undefined) {
          result[key] = configCache[key];
        } else {
          allCached = false;
        }
      });

      if (allCached) {
        return result;
      }
    }

    // Read from Config sheet
    const configSheet = getSheetByName('Config');
    if (!configSheet) {
      Logger.log('Config sheet not found, using default values');
      return defaults;
    }

    const data = configSheet.getDataRange().getValues();
    const result = {};

    keys.forEach(key => {
      // Handle system values
      if (key === 'SPREADSHEET_ID') {
        result[key] = getSpreadsheetId();
        return;
      }
      if (key === 'SCRIPT_ID') {
        result[key] = ScriptApp.getScriptId();
        return;
      }

      // Find in sheet data
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (row[0] && findConfigKeyByLabel(row[0]) === key) {
          let value = row[1];

          if (typeof value === 'string') {
            value = value.trim();
            if (value.toLowerCase() === 'yes') value = true;
            if (value.toLowerCase() === 'no') value = false;
            if (value === '') value = defaults[key] || null;
          }

          result[key] = value;
          cacheConfigValue(key, value);
          break;
        }
      }

      // Use default if not found
      if (result[key] === undefined) {
        result[key] = defaults[key] || null;
      }
    });

    return result;

  } catch (error) {
    Logger.log(`Error reading config values: ${error.toString()}`);
    return defaults;
  }
}

/**
 * Update a configuration value in the sheet
 */
function setConfigValue(key, value) {
  try {
    const configSheet = getSheetByName('Config');
    if (!configSheet) {
      throw new Error('Config sheet not found');
    }

    // Find the row for this configuration key
    const data = configSheet.getDataRange().getValues();
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row[0] && findConfigKeyByLabel(row[0]) === key) {
        // Update the value
        configSheet.getRange(i + 1, 2).setValue(value);

        // Update cache
        cacheConfigValue(key, value);

        // Validate the updated config
        validateConfigSheet();

        Logger.log(`Updated config: ${key} = ${value}`);
        return true;
      }
    }

    throw new Error(`Configuration key "${key}" not found`);

  } catch (error) {
    Logger.log(`Error setting config value "${key}": ${error.toString()}`);
    throw error;
  }
}

/**
 * Helper function to map config labels to keys
 */
function findConfigKeyByLabel(label) {
  const keyMapping = {
    'Spreadsheet ID': 'SPREADSHEET_ID',
    'Apps Script ID': 'SCRIPT_ID',
    'Config Last Updated': 'LAST_UPDATED',
    'Railway API URL': 'RAILWAY_URL',
    'Render API URL': 'RENDER_URL',
    'Webhook URL (Make.com)': 'WEBHOOK_URL',
    'API Authentication Key': 'API_KEY',
    'Club Name': 'CLUB_NAME',
    'Current Season': 'SEASON',
    'Region/League': 'REGION',
    'Timezone': 'TIMEZONE',
    'Google Drive Folder ID': 'DRIVE_FOLDER_ID',
    'YouTube Channel ID': 'YOUTUBE_CHANNEL_ID',
    'Sheet Template ID': 'SHEETS_TEMPLATE_ID',
    'Notification Email': 'NOTIFICATION_EMAIL',
    'Enable Email Notifications': 'ENABLE_EMAIL_NOTIFICATIONS',
    'Notification Level': 'NOTIFICATION_LEVEL',
    'Max Concurrent Jobs': 'MAX_CONCURRENT_JOBS',
    'File Retention (Days)': 'CLEANUP_RETENTION_DAYS',
    'Debug Mode': 'DEBUG_MODE'
  };

  return keyMapping[label] || label.toUpperCase().replace(/\s+/g, '_');
}

/**
 * Cache management functions
 */
function isCacheValid() {
  return (Date.now() - cacheTimestamp) < CACHE_DURATION;
}

function cacheConfigValue(key, value) {
  configCache[key] = value;
  cacheTimestamp = Date.now();
}

function clearConfigCache() {
  configCache = {};
  cacheTimestamp = 0;
}

/**
 * Get current API endpoint with fallback logic
 */
function getApiEndpoint() {
  try {
    // Try Railway first (primary)
    let endpoint = getConfigValue('RAILWAY_URL');
    if (endpoint && endpoint !== 'https://your-railway-app.railway.app' && isValidUrl(endpoint)) {
      return endpoint.replace(/\/$/, ''); // Remove trailing slash
    }

    // Try Render as backup
    endpoint = getConfigValue('RENDER_URL');
    if (endpoint && endpoint !== '' && isValidUrl(endpoint)) {
      return endpoint.replace(/\/$/, '');
    }

    // Try legacy Cloudflare URL
    endpoint = getConfigValue('CLOUDFLARE_URL');
    if (endpoint && isValidUrl(endpoint)) {
      return endpoint.replace(/\/$/, '');
    }

    throw new Error('No valid API endpoint configured');

  } catch (error) {
    Logger.log('Error getting API endpoint: ' + error.toString());
    throw error;
  }
}

/**
 * Helper function to validate URLs
 */
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Get configuration status for system health checks
 */
function getConfigStatus() {
  try {
    const requiredConfigs = [
      'RAILWAY_URL',
      'API_KEY',
      'CLUB_NAME',
      'SEASON',
      'DRIVE_FOLDER_ID',
      'NOTIFICATION_EMAIL'
    ];

    const status = {
      configured: 0,
      total: requiredConfigs.length,
      missing: [],
      valid: true
    };

    requiredConfigs.forEach(key => {
      const value = getConfigValue(key);
      if (value && value !== '' && value !== 'https://your-railway-app.railway.app') {
        status.configured++;
      } else {
        status.missing.push(key);
        status.valid = false;
      }
    });

    status.percentage = Math.round((status.configured / status.total) * 100);

    return status;

  } catch (error) {
    Logger.log('Error checking config status: ' + error.toString());
    return {
      configured: 0,
      total: 0,
      missing: ['ERROR'],
      valid: false,
      percentage: 0
    };
  }
}

/**
 * Initialize configuration system
 * This function should be called when the system first starts
 */
function initializeConfigSystem() {
  try {
    Logger.log('Initializing configuration system...');

    // Ensure we can detect the current spreadsheet
    const spreadsheet = getCurrentSpreadsheet();
    Logger.log(`Detected spreadsheet: ${spreadsheet.getName()} (${spreadsheet.getId()})`);

    // Check if Config sheet exists
    let configSheet = spreadsheet.getSheetByName('Config');
    if (!configSheet) {
      Logger.log('Config sheet not found, creating...');
      configSheet = createConfigSheet();
    }

    // Validate current configuration
    const validation = validateConfigSheet();
    Logger.log(`Configuration validation: ${validation.valid ? 'PASSED' : 'FAILED'}`);

    if (!validation.valid) {
      Logger.log('Configuration errors: ' + validation.errors.join(', '));
    }

    // Clear cache to ensure fresh reads
    clearConfigCache();

    Logger.log('Configuration system initialized successfully');
    return true;

  } catch (error) {
    Logger.log('Error initializing config system: ' + error.toString());
    throw error;
  }
}

/**
 * Legacy support function - maps old CONFIG object calls to new system
 * This allows existing code to work without modification during migration
 */
function createLegacyConfigObject() {
  return {
    RAILWAY_URL: getConfigValue('RAILWAY_URL', '{{RAILWAY_URL}}'),
    RENDER_URL: getConfigValue('RENDER_URL', '{{RENDER_URL}}'),
    CLOUDFLARE_URL: getConfigValue('CLOUDFLARE_URL', '{{CLOUDFLARE_URL}}'),
    WEBHOOK_URL: getConfigValue('WEBHOOK_URL', '{{WEBHOOK_URL}}'),
    CLUB_NAME: getConfigValue('CLUB_NAME', '{{CLUB_NAME}}'),
    SEASON: getConfigValue('SEASON', '{{SEASON}}'),
    REGION: getConfigValue('REGION', '{{REGION}}'),
    DRIVE_FOLDER_ID: getConfigValue('DRIVE_FOLDER_ID', '{{DRIVE_FOLDER_ID}}'),
    NOTIFICATION_EMAIL: getConfigValue('NOTIFICATION_EMAIL', '{{NOTIFICATION_EMAIL}}'),
    API_KEY: getConfigValue('API_KEY', '{{API_KEY}}')
  };
}