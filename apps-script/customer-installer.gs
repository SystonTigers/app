/**
 * @fileoverview Customer Installation System
 * @version 6.2.0
 * @description Zero-touch customer setup - customers never need to access Apps Script
 */

/**
 * Main installer function - run this once per customer setup
 * Reads config from customer's Google Sheet and sets up everything automatically
 * @returns {Object} Installation result
 */
function installForCustomer() {
  const installLogger = logger.scope('CustomerInstaller');
  installLogger.enterFunction('installForCustomer');

  try {
    console.log('🚀 Starting customer installation...');

    // Step 1: Read configuration from customer's Sheet
    const config = readConfigFromSheet('CONFIG');
    console.log(`✅ Config loaded: ${Object.keys(config).length} settings`);

    // Step 2: Validate required configuration
    const validation = validateCustomerConfig(config);
    if (!validation.valid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
    }
    console.log('✅ Configuration validated');

    // Step 3: Set up Script Properties (customers never touch these)
    setupScriptProperties(config);
    console.log('✅ Script properties configured');

    // Step 4: Create required triggers (idempotent - safe to run multiple times)
    const triggerResults = setupCustomerTriggers();
    console.log(`✅ Triggers configured: ${triggerResults.created} created, ${triggerResults.existing} already existed`);

    // Step 5: Initialize sheets structure if needed
    const sheetResults = validateAndCreateRequiredSheets();
    console.log(`✅ Sheets validated: ${sheetResults.existing} found, ${sheetResults.created} created`);

    // Step 6: Set up privacy compliance
    const privacyResults = initializePrivacyCompliance();
    console.log('✅ Privacy compliance initialized');

    // Step 7: Test system components
    const healthCheck = performInstallationHealthCheck();
    console.log(`✅ Health check: ${healthCheck.score}/100`);

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      customer: config.CLUB_NAME || 'Unknown Club',
      version: config.SYSTEM_VERSION || '6.2.0',
      components: {
        config: validation,
        triggers: triggerResults,
        sheets: sheetResults,
        privacy: privacyResults,
        health: healthCheck
      },
      nextSteps: [
        'Test the web app URL to ensure it loads correctly',
        'Configure Make.com webhooks with the provided URLs',
        'Test live match updates in the Live Match Updates sheet',
        'Verify social media posting is working'
      ]
    };

    installLogger.exitFunction('installForCustomer', { success: true, customer: result.customer });

    console.log('🎉 Customer installation completed successfully!');
    console.log(`📋 Summary: ${result.customer} - ${result.version}`);

    return result;

  } catch (error) {
    installLogger.error('Customer installation failed', { error: error.toString() });
    console.error('❌ Installation failed:', error.toString());

    return {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString(),
      troubleshooting: [
        'Check that the CONFIG sheet exists and has all required settings',
        'Verify the installing user has edit access to the spreadsheet',
        'Ensure all required sheet tabs exist (Live Match Updates, Players, etc.)',
        'Check the system logs for detailed error information'
      ]
    };
  }
}

/**
 * Read configuration from customer's Google Sheet Config tab
 * @param {string} tabName - Name of the config tab (default: 'Config')
 * @returns {Object} Configuration object
 */
function readConfigFromSheet(tabName = 'CONFIG') {
  try {
    // Get the spreadsheet using stored ID or fallback to active
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const spreadsheet = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
    const configSheet = spreadsheet.getSheetByName(tabName);

    if (!configSheet) {
      throw new Error(`Configuration sheet '${tabName}' not found. Please create it with key-value pairs.`);
    }

    // Read all data from the config sheet
    const range = configSheet.getDataRange();
    const values = range.getValues();

    if (values.length < 2) {
      throw new Error(`Configuration sheet '${tabName}' is empty. Please add configuration key-value pairs.`);
    }

    // Convert to key-value object
    const config = {};

    // Skip header row if it exists
    const startRow = (values[0][0] === 'key' || values[0][0] === 'Key') ? 1 : 0;

    for (let i = startRow; i < values.length; i++) {
      const [key, value] = values[i];
      if (key && value) {
        config[String(key).trim()] = String(value).trim();
      }
    }

    // Add spreadsheet ID to config automatically
    config.SHEET_ID = spreadsheet.getId();
    config.SHEET_URL = spreadsheet.getUrl();

    return config;

  } catch (error) {
    throw new Error(`Failed to read configuration: ${error.toString()}`);
  }
}

/**
 * Validate customer configuration has all required fields
 * @param {Object} config - Configuration object
 * @returns {Object} Validation result
 */
function validateCustomerConfig(config) {
  const required = [
    'CLUB_NAME',
    'LEAGUE_NAME',
    'MAKE_WEBHOOK_URL',
    'SYSTEM_VERSION',
    'ENVIRONMENT'
  ];

  const optional = [
    'CLUB_SHORT_NAME',
    'SEASON',
    'WEBSITE_URL',
    'SOCIAL_MEDIA_HANDLES',
    'CONTACT_EMAIL'
  ];

  const errors = [];
  const warnings = [];

  // Check required fields
  for (const field of required) {
    if (!config[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate specific fields
  if (config.MAKE_WEBHOOK_URL && !config.MAKE_WEBHOOK_URL.startsWith('https://')) {
    errors.push('MAKE_WEBHOOK_URL must start with https://');
  }

  if (config.SYSTEM_VERSION && config.SYSTEM_VERSION !== '6.2.0') {
    warnings.push(`System version ${config.SYSTEM_VERSION} may not match deployed code version`);
  }

  // Check optional but recommended fields
  for (const field of optional) {
    if (!config[field]) {
      warnings.push(`Optional field not set: ${field}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors,
    warnings: warnings,
    required_fields: required,
    optional_fields: optional,
    provided_fields: Object.keys(config)
  };
}

/**
 * Hash email for privacy-compliant storage
 * @param {string} email - Email to hash
 * @returns {string} SHA-256 hash of email
 */
function hashEmail(email) {
  if (!email) return 'anonymous';
  try {
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, email);
    return Utilities.base64Encode(digest).substring(0, 12); // First 12 chars for brevity
  } catch (error) {
    return 'hash_error';
  }
}

/**
 * Set up Script Properties from customer configuration
 * @param {Object} config - Configuration object
 */
function setupScriptProperties(config) {
  try {
    const properties = PropertiesService.getScriptProperties();

    // Map config to script properties - Single Source of Truth pattern
    const propertyMappings = {
      // Primary system properties (canonical keys)
      'SYSTEM.CLUB_NAME': config.CLUB_NAME,
      'SYSTEM.CLUB_SHORT_NAME': config.CLUB_SHORT_NAME || config.CLUB_NAME,
      'SYSTEM.LEAGUE_NAME': config.LEAGUE_NAME,
      'SYSTEM.SEASON': config.SEASON || new Date().getFullYear().toString(),
      'SYSTEM.VERSION': config.SYSTEM_VERSION || '6.2.0',
      'SYSTEM.ENVIRONMENT': config.ENVIRONMENT || 'production',
      'SYSTEM.SPREADSHEET_ID': config.SHEET_ID, // Primary sheet ID key

      // Make.com integration (primary keys)
      'MAKE.WEBHOOK_URL': config.MAKE_WEBHOOK_URL,
      'MAKE.WEBHOOK_URL_LIVE_EVENTS': config.MAKE_WEBHOOK_URL_LIVE_EVENTS || config.MAKE_WEBHOOK_URL,
      'MAKE.WEBHOOK_URL_BATCH_CONTENT': config.MAKE_WEBHOOK_URL_BATCH_CONTENT || config.MAKE_WEBHOOK_URL,

      // Contact & external properties
      'CONTACT.EMAIL': config.CONTACT_EMAIL || '',
      'WEBSITE.URL': config.WEBSITE_URL || '',
      'SOCIAL.HANDLES': config.SOCIAL_MEDIA_HANDLES || '',

      // Installation metadata (anonymized for security)
      'INSTALL.COMPLETED_AT': new Date().toISOString(),
      'INSTALL.INSTALLED_BY_HASH': hashEmail(Session.getActiveUser() ? Session.getActiveUser().getEmail() : 'unknown'),
      'INSTALL.VERSION': '6.2.0',

      // Legacy compatibility keys (TODO: Remove in v7.0)
      'ENV': config.ENVIRONMENT || 'production',
      'SYSTEM_VERSION': config.SYSTEM_VERSION || '6.2.0',
      'WEBHOOK_MAKE_URL': config.MAKE_WEBHOOK_URL,
      'MAKE_WEBHOOK_URL': config.MAKE_WEBHOOK_URL,
      'SPREADSHEET_ID': config.SHEET_ID, // Legacy alias
      'SHEET_ID': config.SHEET_ID,       // Legacy alias
      'SHEET_URL': config.SHEET_URL      // Legacy alias
    };

    // Set all properties
    const validProperties = {};
    Object.entries(propertyMappings).forEach(([key, value]) => {
      if (value) {
        validProperties[key] = String(value);
      }
    });

    properties.setProperties(validProperties, true); // overwrite = true

    console.log(`📝 Set ${Object.keys(validProperties).length} script properties`);

    if (typeof clearConfigOverrideCache_ === 'function') {
      clearConfigOverrideCache_();
    }

  } catch (error) {
    throw new Error(`Failed to set up script properties: ${error.toString()}`);
  }
}

/**
 * Set up required triggers for the customer (idempotent)
 * @returns {Object} Trigger setup results
 */
function setupCustomerTriggers() {
  const results = {
    created: 0,
    existing: 0,
    failed: []
  };

  const requiredTriggers = [
    {
      functionName: 'scheduledHealthCheck',
      type: 'time',
      schedule: { everyHours: 1 },
      description: 'System health monitoring'
    },
    {
      functionName: 'cleanupExpiredCache',
      type: 'time',
      schedule: { everyMinutes: 30 },
      description: 'Cache cleanup and maintenance'
    },
    {
      functionName: 'runWeeklyScheduleAutomation',
      type: 'time',
      schedule: { weekly: { day: 'monday', hour: 9 } },
      description: 'Weekly content scheduling'
    },
    {
      functionName: 'runDailyBirthdayAutomation',
      type: 'time',
      schedule: { daily: { hour: 7, minute: 5 } },
      description: 'Daily birthday content automation'
    },
    {
      functionName: 'runMonthlyScheduledTasks',
      type: 'time',
      schedule: { monthly: { day: 1, hour: 8 } },
      description: 'Monthly content scheduling'
    }
  ];

  for (const trigger of requiredTriggers) {
    try {
      const result = ensureTimeTrigger(trigger.functionName, trigger.schedule, trigger.description);
      if (result.created) {
        results.created++;
      } else {
        results.existing++;
      }
    } catch (error) {
      results.failed.push({
        trigger: trigger.functionName,
        error: error.toString()
      });
    }
  }

  return results;
}

/**
 * Ensure a time-based trigger exists (idempotent)
 * @param {string} functionName - Function to trigger
 * @param {Object} schedule - Schedule configuration
 * @param {string} description - Trigger description
 * @returns {Object} Creation result
 */
function ensureTimeTrigger(functionName, schedule, description = '') {
  // Check if trigger already exists
  const existingTriggers = ScriptApp.getProjectTriggers();
  const exists = existingTriggers.some(trigger =>
    trigger.getHandlerFunction() === functionName &&
    trigger.getTriggerSource() === ScriptApp.TriggerSource.CLOCK
  );

  if (exists) {
    return { created: false, existing: true, functionName: functionName };
  }

  // Create new trigger
  let triggerBuilder = ScriptApp.newTrigger(functionName).timeBased();

  if (schedule.everyMinutes) {
    triggerBuilder = triggerBuilder.everyMinutes(schedule.everyMinutes);
  } else if (schedule.everyHours) {
    triggerBuilder = triggerBuilder.everyHours(schedule.everyHours);
  } else if (schedule.daily) {
    triggerBuilder = triggerBuilder.everyDays(1);
    if (typeof schedule.daily.hour === 'number') {
      triggerBuilder = triggerBuilder.atHour(schedule.daily.hour);
    }
    if (typeof schedule.daily.minute === 'number') {
      triggerBuilder = triggerBuilder.nearMinute(schedule.daily.minute);
    }
  } else if (schedule.weekly) {
    triggerBuilder = triggerBuilder.everyWeeks(1);
    if (schedule.weekly.day) {
      const dayMap = {
        'monday': ScriptApp.WeekDay.MONDAY,
        'tuesday': ScriptApp.WeekDay.TUESDAY,
        'wednesday': ScriptApp.WeekDay.WEDNESDAY,
        'thursday': ScriptApp.WeekDay.THURSDAY,
        'friday': ScriptApp.WeekDay.FRIDAY,
        'saturday': ScriptApp.WeekDay.SATURDAY,
        'sunday': ScriptApp.WeekDay.SUNDAY
      };
      triggerBuilder = triggerBuilder.onWeekDay(dayMap[schedule.weekly.day.toLowerCase()]);
    }
    if (schedule.weekly.hour) {
      triggerBuilder = triggerBuilder.atHour(schedule.weekly.hour);
    }
  } else if (schedule.monthly) {
    triggerBuilder = triggerBuilder.onMonthDay(schedule.monthly.day || 1);
    if (schedule.monthly.hour) {
      triggerBuilder = triggerBuilder.atHour(schedule.monthly.hour);
    }
  }

  const trigger = triggerBuilder.create();

  console.log(`✅ Created trigger: ${functionName} - ${description}`);

  return { created: true, existing: false, functionName: functionName, triggerId: trigger.getUniqueId() };
}

/**
 * Validate and create required sheet tabs
 * @returns {Object} Sheet validation results
 */
function validateAndCreateRequiredSheets() {
  const requiredSheets = [
    {
      name: 'Live Match Updates',
      headers: ['Minute', 'Event', 'Player', 'Assist', 'Home Score', 'Away Score', 'Notes', 'Send']
    },
    {
      name: 'Players',
      headers: ['Player Name', 'Position', 'Squad Number', 'Goals', 'Assists', 'Yellow Cards', 'Red Cards', 'Minutes Played', 'Appearances']
    },
    {
      name: 'Fixtures',
      headers: ['Date', 'Time', 'Opponent', 'Home/Away', 'Competition', 'Venue', 'Result', 'Home Score', 'Away Score']
    },
    {
      name: 'Results',
      headers: ['Date', 'Opponent', 'Home/Away', 'Competition', 'Home Score', 'Away Score', 'Result', 'Scorers', 'Assists', 'MOTM']
    },
    {
      name: 'CONFIG',
      headers: ['Key', 'Value'],
      data: [
        ['CLUB_NAME', 'Your Club Name'],
        ['LEAGUE_NAME', 'Your League Name'],
        ['MAKE_WEBHOOK_URL', 'https://hook.integromat.com/your-webhook'],
        ['SYSTEM_VERSION', '6.2.0'],
        ['ENVIRONMENT', 'production']
      ]
    }
  ];

  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const spreadsheet = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
  const results = {
    existing: 0,
    created: 0,
    failed: []
  };

  for (const sheetConfig of requiredSheets) {
    try {
      let sheet = spreadsheet.getSheetByName(sheetConfig.name);

      if (sheet) {
        results.existing++;
        console.log(`✅ Sheet exists: ${sheetConfig.name}`);
      } else {
        // Create new sheet
        sheet = spreadsheet.insertSheet(sheetConfig.name);

        // Add headers
        if (sheetConfig.headers) {
          sheet.getRange(1, 1, 1, sheetConfig.headers.length).setValues([sheetConfig.headers]);
          sheet.getRange(1, 1, 1, sheetConfig.headers.length).setFontWeight('bold');
        }

        // Add sample data if provided
        if (sheetConfig.data) {
          sheet.getRange(2, 1, sheetConfig.data.length, sheetConfig.data[0].length).setValues(sheetConfig.data);
        }

        results.created++;
        console.log(`✅ Created sheet: ${sheetConfig.name}`);
      }
    } catch (error) {
      results.failed.push({
        sheet: sheetConfig.name,
        error: error.toString()
      });
    }
  }

  return results;
}

/**
 * Initialize privacy compliance system
 * @returns {Object} Privacy setup results
 */
function initializePrivacyCompliance() {
  try {
    // Initialize privacy sheets if the system supports it
    if (typeof setupPrivacySheets === 'function') {
      const privacyResult = setupPrivacySheets();
      console.log('✅ Privacy compliance system initialized');
      return { enabled: true, result: privacyResult };
    } else {
      console.log('⚠️  Privacy compliance system not available in this version');
      return { enabled: false, reason: 'Privacy system not available' };
    }
  } catch (error) {
    console.log(`⚠️  Privacy compliance initialization failed: ${error.toString()}`);
    return { enabled: false, error: error.toString() };
  }
}

/**
 * Perform installation health check
 * @returns {Object} Health check results
 */
function performInstallationHealthCheck() {
  const checks = [];
  let score = 0;

  // Check 1: Script Properties
  try {
    const properties = PropertiesService.getScriptProperties().getProperties();
    const hasRequiredProps = properties['SYSTEM.CLUB_NAME'] && properties['MAKE.WEBHOOK_URL'];
    checks.push({ name: 'Script Properties', pass: hasRequiredProps, weight: 20 });
    if (hasRequiredProps) score += 20;
  } catch (error) {
    checks.push({ name: 'Script Properties', pass: false, error: error.toString(), weight: 20 });
  }

  // Check 2: Triggers
  try {
    const triggers = ScriptApp.getProjectTriggers();
    const hasTriggers = triggers.length > 0;
    checks.push({ name: 'Triggers', pass: hasTriggers, count: triggers.length, weight: 15 });
    if (hasTriggers) score += 15;
  } catch (error) {
    checks.push({ name: 'Triggers', pass: false, error: error.toString(), weight: 15 });
  }

  // Check 3: Required Sheets
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const spreadsheet = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
    const requiredSheets = ['Live Match Updates', 'Players', 'Fixtures', 'Results', 'CONFIG'];
    const existingSheets = requiredSheets.filter(name => spreadsheet.getSheetByName(name));
    const allSheetsExist = existingSheets.length === requiredSheets.length;
    checks.push({ name: 'Required Sheets', pass: allSheetsExist, found: existingSheets.length, required: requiredSheets.length, weight: 25 });
    if (allSheetsExist) score += 25;
  } catch (error) {
    checks.push({ name: 'Required Sheets', pass: false, error: error.toString(), weight: 25 });
  }

  // Check 4: System Functions
  try {
    const hasCoreFunction = typeof getRuntimeConfig === 'function';
    checks.push({ name: 'Core Functions', pass: hasCoreFunction, weight: 20 });
    if (hasCoreFunction) score += 20;
  } catch (error) {
    checks.push({ name: 'Core Functions', pass: false, error: error.toString(), weight: 20 });
  }

  // Check 5: Web App
  try {
    const hasWebApp = typeof doGet === 'function' && typeof doPost === 'function';
    checks.push({ name: 'Web App Functions', pass: hasWebApp, weight: 20 });
    if (hasWebApp) score += 20;
  } catch (error) {
    checks.push({ name: 'Web App Functions', pass: false, error: error.toString(), weight: 20 });
  }

  return {
    score: score,
    grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F',
    checks: checks,
    summary: `${checks.filter(c => c.pass).length}/${checks.length} checks passed`
  };
}

/**
 * Get installation status and customer information
 * @returns {Object} Installation status
 */
function getInstallationStatus() {
  try {
    const properties = PropertiesService.getScriptProperties().getProperties();
    const installedAt = properties['INSTALL.COMPLETED_AT'];
    const installedBy = properties['INSTALL.INSTALLED_BY'];

    if (!installedAt) {
      return {
        installed: false,
        message: 'Customer installation not completed. Run installForCustomer() to set up the system.'
      };
    }

    const healthCheck = performInstallationHealthCheck();

    return {
      installed: true,
      customer: properties['SYSTEM.CLUB_NAME'] || 'Unknown Club',
      version: properties['SYSTEM.VERSION'] || 'Unknown',
      installed_at: installedAt,
      installed_by: installedBy,
      health: healthCheck,
      status: healthCheck.score >= 80 ? 'healthy' : 'needs_attention'
    };

  } catch (error) {
    return {
      installed: false,
      error: error.toString(),
      message: 'Error checking installation status'
    };
  }
}

/**
 * Quick setup function for testing
 * Creates a basic CONFIG sheet if it doesn't exist
 * @returns {Object} Setup result
 */
function createBasicCONFIGSheet() {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const spreadsheet = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
    let configSheet = spreadsheet.getSheetByName('CONFIG');

    if (configSheet) {
      return { success: true, message: 'CONFIG sheet already exists', action: 'none' };
    }

    // Create CONFIG sheet with sample data
    configSheet = spreadsheet.insertSheet('CONFIG');

    const sampleConfig = [
      ['Key', 'Value'],
      ['CLUB_NAME', 'Sample Football Club'],
      ['LEAGUE_NAME', 'Sample League'],
      ['MAKE_WEBHOOK_URL', 'https://hook.integromat.com/your-webhook-url-here'],
      ['SYSTEM_VERSION', '6.2.0'],
      ['ENVIRONMENT', 'production'],
      ['CLUB_SHORT_NAME', 'SFC'],
      ['SEASON', new Date().getFullYear().toString()],
      ['CONTACT_EMAIL', 'admin@samplefc.com']
    ];

    configSheet.getRange(1, 1, sampleConfig.length, 2).setValues(sampleConfig);
    configSheet.getRange(1, 1, 1, 2).setFontWeight('bold');
    configSheet.autoResizeColumns(1, 2);

    return {
      success: true,
      message: 'CONFIG sheet created with sample data. Please update the values and run installForCustomer().',
      action: 'created'
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      message: 'Failed to create CONFIG sheet'
    };
  }
}