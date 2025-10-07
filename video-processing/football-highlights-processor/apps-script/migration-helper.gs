/**
 * Migration Helper for Existing Customers
 *
 * This script helps customers migrate from the old hardcoded CONFIG system
 * to the new sheet-based configuration system without losing any data.
 */

/**
 * Main migration function - converts old CONFIG to sheet-based config
 */
function migrateToSheetBasedConfig() {
  try {
    const ui = SpreadsheetApp.getUi();

    // Check if this is already a sheet-based system
    const configSheet = getCurrentSpreadsheet().getSheetByName('Config');
    if (configSheet && configSheet.getLastRow() > 5) {
      const response = ui.alert(
        'Migration Status',
        'It appears your system is already using sheet-based configuration.\n\n' +
        'Would you like to:\n' +
        'YES - Run migration anyway (will update Config sheet)\n' +
        'NO - Cancel migration',
        ui.ButtonSet.YES_NO
      );

      if (response !== ui.Button.YES) {
        return;
      }
    }

    // Welcome message
    ui.alert(
      'Configuration Migration',
      'This wizard will migrate your system from code-based configuration to sheet-based configuration.\n\n' +
      'Benefits:\n' +
      '✓ No more code editing required\n' +
      '✓ Easy configuration through spreadsheet\n' +
      '✓ Better validation and error checking\n' +
      '✓ Support for new features\n\n' +
      'Your existing data will be preserved.',
      ui.ButtonSet.OK
    );

    // Step 1: Detect existing configuration
    const existingConfig = detectExistingConfiguration();

    // Step 2: Create Config sheet
    createOrUpdateConfigSheet(existingConfig);

    // Step 3: Validate migration
    const validationResult = validateMigration();

    // Step 4: Show results
    showMigrationResults(existingConfig, validationResult);

    logActivity('System migrated to sheet-based configuration', 'info');

  } catch (error) {
    Logger.log('Migration error: ' + error.toString());
    SpreadsheetApp.getUi().alert('Migration Error', 'Migration failed: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Detect existing configuration from code or previous setup
 */
function detectExistingConfiguration() {
  const detected = {
    source: 'unknown',
    values: {},
    found: 0,
    total: 0
  };

  try {
    // Try to detect from legacy CONFIG object (if it exists in the code)
    if (typeof CONFIG !== 'undefined') {
      detected.source = 'legacy_config_object';
      detected.values = { ...CONFIG };
      detected.found = Object.keys(CONFIG).length;
      detected.total = Object.keys(CONFIG).length;
    }
    // Try to detect from script properties
    else {
      detected.source = 'script_properties';
      const properties = PropertiesService.getScriptProperties().getProperties();

      // Common property keys we might find
      const configKeys = [
        'RAILWAY_URL', 'RENDER_URL', 'CLOUDFLARE_URL', 'WEBHOOK_URL',
        'CLUB_NAME', 'SEASON', 'REGION', 'DRIVE_FOLDER_ID',
        'NOTIFICATION_EMAIL', 'API_KEY', 'YOUTUBE_CHANNEL_ID'
      ];

      configKeys.forEach(key => {
        detected.total++;
        if (properties[key]) {
          detected.values[key] = properties[key];
          detected.found++;
        }
      });
    }

    // Try to detect from spreadsheet data (existing sheets)
    const spreadsheet = getCurrentSpreadsheet();

    // Check for settings in other sheets
    try {
      const settingsSheet = spreadsheet.getSheetByName('Settings');
      if (settingsSheet) {
        const settingsData = settingsSheet.getDataRange().getValues();
        settingsData.forEach(row => {
          if (row[0] && row[1]) {
            const key = row[0].toString().toUpperCase().replace(/\s+/g, '_');
            if (!detected.values[key]) {
              detected.values[key] = row[1];
              detected.found++;
            }
          }
        });
      }
    } catch (error) {
      Logger.log('Error reading Settings sheet: ' + error.toString());
    }

    Logger.log(`Configuration detection complete: ${detected.found}/${detected.total} values found from ${detected.source}`);
    return detected;

  } catch (error) {
    Logger.log('Error detecting existing configuration: ' + error.toString());
    return detected;
  }
}

/**
 * Create or update Config sheet with detected values
 */
function createOrUpdateConfigSheet(existingConfig) {
  try {
    // Create the Config sheet structure
    const configSheet = createConfigSheet();

    // Map detected values to Config sheet format
    const mappedValues = mapLegacyToNewConfig(existingConfig.values);

    // Update Config sheet with detected values
    Object.entries(mappedValues).forEach(([key, value]) => {
      try {
        setConfigValue(key, value);
      } catch (error) {
        Logger.log(`Error setting config value ${key}: ${error.toString()}`);
      }
    });

    // Add migration timestamp
    try {
      setConfigValue('MIGRATION_DATE', new Date().toISOString());
    } catch (error) {
      // Ignore if this field doesn't exist
    }

    Logger.log('Config sheet updated with migrated values');

  } catch (error) {
    Logger.log('Error creating/updating Config sheet: ' + error.toString());
    throw error;
  }
}

/**
 * Map legacy configuration keys to new system
 */
function mapLegacyToNewConfig(legacyConfig) {
  const mapped = {};

  // Direct mappings
  const directMappings = {
    'RAILWAY_URL': 'RAILWAY_URL',
    'RENDER_URL': 'RENDER_URL',
    'CLOUDFLARE_URL': 'CLOUDFLARE_URL',
    'WEBHOOK_URL': 'WEBHOOK_URL',
    'CLUB_NAME': 'CLUB_NAME',
    'SEASON': 'SEASON',
    'REGION': 'REGION',
    'DRIVE_FOLDER_ID': 'DRIVE_FOLDER_ID',
    'NOTIFICATION_EMAIL': 'NOTIFICATION_EMAIL',
    'API_KEY': 'API_KEY',
    'YOUTUBE_CHANNEL_ID': 'YOUTUBE_CHANNEL_ID'
  };

  // Apply direct mappings
  Object.entries(directMappings).forEach(([legacyKey, newKey]) => {
    if (legacyConfig[legacyKey] && legacyConfig[legacyKey] !== '{{' + legacyKey + '}}') {
      mapped[newKey] = legacyConfig[legacyKey];
    }
  });

  // Handle special cases and transformations

  // Default values for new settings
  if (!mapped['ENABLE_EMAIL_NOTIFICATIONS'] && mapped['NOTIFICATION_EMAIL']) {
    mapped['ENABLE_EMAIL_NOTIFICATIONS'] = 'YES';
  }

  if (!mapped['NOTIFICATION_LEVEL']) {
    mapped['NOTIFICATION_LEVEL'] = 'NORMAL';
  }

  if (!mapped['MAX_CONCURRENT_JOBS']) {
    mapped['MAX_CONCURRENT_JOBS'] = 2;
  }

  if (!mapped['CLEANUP_RETENTION_DAYS']) {
    mapped['CLEANUP_RETENTION_DAYS'] = 30;
  }

  if (!mapped['DEBUG_MODE']) {
    mapped['DEBUG_MODE'] = 'NO';
  }

  // Set timezone if not present
  if (!mapped['TIMEZONE']) {
    mapped['TIMEZONE'] = 'America/New_York'; // Default timezone
  }

  return mapped;
}

/**
 * Validate the migration was successful
 */
function validateMigration() {
  try {
    const validation = {
      configSheetExists: false,
      configurationValid: false,
      valuesTransferred: 0,
      errors: [],
      warnings: []
    };

    // Check Config sheet exists
    const configSheet = getCurrentSpreadsheet().getSheetByName('Config');
    if (configSheet) {
      validation.configSheetExists = true;
    } else {
      validation.errors.push('Config sheet was not created');
      return validation;
    }

    // Validate configuration
    const configStatus = getConfigStatus();
    validation.configurationValid = configStatus.valid;
    validation.valuesTransferred = configStatus.configured;

    if (!configStatus.valid) {
      validation.warnings.push(`Configuration incomplete: ${configStatus.missing.join(', ')} still need to be set`);
    }

    // Check specific critical values
    const criticalValues = ['CLUB_NAME', 'SEASON'];
    criticalValues.forEach(key => {
      const value = getConfigValue(key);
      if (!value) {
        validation.warnings.push(`${key} not set - please configure manually`);
      }
    });

    // Test configuration reader
    try {
      const testValue = getConfigValue('CLUB_NAME', 'test');
      validation.warnings.push('Configuration reader is working');
    } catch (error) {
      validation.errors.push('Configuration reader not working: ' + error.message);
    }

    return validation;

  } catch (error) {
    Logger.log('Migration validation error: ' + error.toString());
    return {
      configSheetExists: false,
      configurationValid: false,
      valuesTransferred: 0,
      errors: ['Validation failed: ' + error.message],
      warnings: []
    };
  }
}

/**
 * Show migration results to user
 */
function showMigrationResults(existingConfig, validationResult) {
  try {
    const ui = SpreadsheetApp.getUi();

    let message = 'Configuration Migration Complete!\n\n';

    // Migration summary
    message += `📊 Migration Summary:\n`;
    message += `• Found ${existingConfig.found} existing settings\n`;
    message += `• Transferred ${validationResult.valuesTransferred} values\n`;
    message += `• Config sheet created: ${validationResult.configSheetExists ? '✅' : '❌'}\n`;
    message += `• System ready: ${validationResult.configurationValid ? '✅' : '⚠️'}\n\n`;

    // Errors
    if (validationResult.errors.length > 0) {
      message += `❌ Errors:\n`;
      validationResult.errors.forEach(error => {
        message += `• ${error}\n`;
      });
      message += '\n';
    }

    // Warnings
    if (validationResult.warnings.length > 0) {
      message += `⚠️ Next Steps:\n`;
      validationResult.warnings.forEach(warning => {
        message += `• ${warning}\n`;
      });
      message += '\n';
    }

    // Next steps
    if (validationResult.configurationValid) {
      message += `🎉 Your system is ready to use!\n\n`;
      message += `Next steps:\n`;
      message += `1. Review the Config sheet to verify all settings\n`;
      message += `2. Test your system with the "Test Video Processing" menu\n`;
      message += `3. Process your first video!\n`;
    } else {
      message += `📝 Configuration Required:\n\n`;
      message += `Please complete the following:\n`;
      message += `1. Open the Config sheet\n`;
      message += `2. Fill in any missing required settings\n`;
      message += `3. Run "Check System Status" to verify\n`;
    }

    ui.alert('Migration Complete', message, ui.ButtonSet.OK);

    // Switch to Config sheet for review
    const configSheet = getCurrentSpreadsheet().getSheetByName('Config');
    if (configSheet) {
      getCurrentSpreadsheet().setActiveSheet(configSheet);
    }

  } catch (error) {
    Logger.log('Error showing migration results: ' + error.toString());
  }
}

/**
 * Create backup of existing system before migration
 */
function createMigrationBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `Migration-Backup-${timestamp}`;

    // Store current system state
    const backup = {
      timestamp: new Date().toISOString(),
      scriptProperties: PropertiesService.getScriptProperties().getProperties(),
      sheets: []
    };

    // Backup sheet data
    const spreadsheet = getCurrentSpreadsheet();
    const sheets = spreadsheet.getSheets();

    sheets.forEach(sheet => {
      try {
        backup.sheets.push({
          name: sheet.getName(),
          data: sheet.getDataRange().getValues()
        });
      } catch (error) {
        Logger.log(`Error backing up sheet ${sheet.getName()}: ${error.toString()}`);
      }
    });

    // Store backup in script properties
    PropertiesService.getScriptProperties().setProperty(
      'MIGRATION_BACKUP',
      JSON.stringify(backup)
    );

    Logger.log('Migration backup created');
    return true;

  } catch (error) {
    Logger.log('Error creating migration backup: ' + error.toString());
    return false;
  }
}

/**
 * Restore from migration backup (emergency function)
 */
function restoreFromMigrationBackup() {
  try {
    const ui = SpreadsheetApp.getUi();

    const response = ui.alert(
      '⚠️ Restore from Backup',
      'This will restore your system to the state before migration.\n\n' +
      '⚠️ WARNING: All changes since migration will be lost!\n\n' +
      'Continue with restore?',
      ui.ButtonSet.YES_NO
    );

    if (response !== ui.Button.YES) {
      return;
    }

    // Get backup data
    const backupData = PropertiesService.getScriptProperties().getProperty('MIGRATION_BACKUP');
    if (!backupData) {
      ui.alert('No Backup', 'No migration backup found.', ui.ButtonSet.OK);
      return;
    }

    const backup = JSON.parse(backupData);

    // Restore script properties
    PropertiesService.getScriptProperties().setProperties(backup.scriptProperties);

    // Note: We cannot restore sheet data from Apps Script due to limitations
    // This would require manual intervention

    ui.alert(
      'Backup Restored',
      'Script properties have been restored.\n\n' +
      'Note: Sheet data must be restored manually if needed.\n' +
      'Backup timestamp: ' + backup.timestamp,
      ui.ButtonSet.OK
    );

    logActivity('System restored from migration backup', 'warning');

  } catch (error) {
    Logger.log('Error restoring from backup: ' + error.toString());
    SpreadsheetApp.getUi().alert('Restore Error', 'Restore failed: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Check if system needs migration
 */
function checkMigrationStatus() {
  try {
    const configSheet = getCurrentSpreadsheet().getSheetByName('Config');
    const setupCompleted = PropertiesService.getScriptProperties().getProperty('SETUP_COMPLETED');

    // If no Config sheet and no setup completed, this is a new installation
    if (!configSheet && !setupCompleted) {
      return 'new_installation';
    }

    // If Config sheet exists and has data, already migrated
    if (configSheet && configSheet.getLastRow() > 5) {
      return 'already_migrated';
    }

    // If setup completed but no Config sheet, needs migration
    if (setupCompleted && !configSheet) {
      return 'needs_migration';
    }

    // If legacy CONFIG object exists in code, needs migration
    if (typeof CONFIG !== 'undefined') {
      return 'needs_migration';
    }

    return 'unknown';

  } catch (error) {
    Logger.log('Error checking migration status: ' + error.toString());
    return 'error';
  }
}

/**
 * Auto-migration check on system startup
 */
function checkAndOfferMigration() {
  try {
    const migrationStatus = checkMigrationStatus();

    if (migrationStatus === 'needs_migration') {
      const ui = SpreadsheetApp.getUi();

      const response = ui.alert(
        'System Update Available',
        'Your Football Highlights system can be upgraded to the new sheet-based configuration.\n\n' +
        'Benefits:\n' +
        '✓ No more code editing required\n' +
        '✓ Easier configuration management\n' +
        '✓ Better error handling\n' +
        '✓ Support for new features\n\n' +
        'Upgrade now?',
        ui.ButtonSet.YES_NO
      );

      if (response === ui.Button.YES) {
        migrateToSheetBasedConfig();
      }
    }

  } catch (error) {
    Logger.log('Auto-migration check error: ' + error.toString());
  }
}

/**
 * Enhanced onOpen that checks for migration needs
 */
function onOpenWithMigrationCheck() {
  try {
    // Run standard onOpen
    onOpen();

    // Check if migration is needed (but don't interrupt the user immediately)
    Utilities.sleep(1000); // Brief delay
    checkAndOfferMigration();

  } catch (error) {
    Logger.log('onOpen with migration check error: ' + error.toString());
    // Fall back to standard onOpen
    try {
      onOpen();
    } catch (fallbackError) {
      Logger.log('Fallback onOpen error: ' + fallbackError.toString());
    }
  }
}