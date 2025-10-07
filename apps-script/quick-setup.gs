/**
 * Quick Setup Functions
 * Helps configure script properties and initial setup
 * @version 6.2.0
 */

/**
 * Quick setup function - Run this once to configure your system
 * This will prompt you for the required information
 */
function runQuickSetup() {
  const ui = SpreadsheetApp.getUi();

  try {
    // Welcome message
    const welcome = ui.alert(
      '🏈 Syston Tigers Setup',
      'Welcome to the Syston Tigers Football Automation Setup!\n\n' +
      'This will configure your system with the required settings.\n\n' +
      'Ready to start?',
      ui.ButtonSet.YES_NO
    );

    if (welcome !== ui.Button.YES) {
      ui.alert('Setup cancelled. You can run this again anytime.');
      return;
    }

    // Get Spreadsheet ID
    const spreadsheetResponse = ui.prompt(
      'Step 1: Google Sheets Setup',
      'Please enter your Google Sheets ID:\n\n' +
      '(Find this in your sheet URL: docs.google.com/spreadsheets/d/[ID]/edit)',
      ui.ButtonSet.OK_CANCEL
    );

    if (spreadsheetResponse.getSelectedButton() !== ui.Button.OK) {
      ui.alert('Setup cancelled.');
      return;
    }

    const spreadsheetId = spreadsheetResponse.getResponseText();

    // Validate spreadsheet ID
    if (!spreadsheetId || spreadsheetId.length < 20) {
      ui.alert('Invalid Spreadsheet ID. Please try again.');
      return;
    }

    // Test spreadsheet access
    try {
      const testSheet = SpreadsheetApp.openById(spreadsheetId);
      const sheetName = testSheet.getName();
      ui.alert('✅ Spreadsheet Connected', `Successfully connected to: "${sheetName}"`, ui.ButtonSet.OK);
    } catch (error) {
      ui.alert('❌ Spreadsheet Error', `Cannot access spreadsheet. Please check the ID and permissions.\n\nError: ${error.toString()}`, ui.ButtonSet.OK);
      return;
    }

    // Get Make.com webhook (optional)
    const webhookResponse = ui.prompt(
      'Step 2: Make.com Webhook (Optional)',
      'Enter your Make.com webhook URL (or leave blank to skip):\n\n' +
      'Example: https://hook.integromat.com/abc123...',
      ui.ButtonSet.OK_CANCEL
    );

    let webhookUrl = '';
    if (webhookResponse.getSelectedButton() === ui.Button.OK) {
      webhookUrl = webhookResponse.getResponseText();
    }

    // Save properties
    const properties = PropertiesService.getScriptProperties();
    properties.setProperties({
      'SPREADSHEET_ID': spreadsheetId,
      'MAKE_WEBHOOK_URL': webhookUrl || '',
      'SETUP_COMPLETED': 'true',
      'SETUP_DATE': new Date().toISOString(),
      'CLUB_NAME': 'Syston Tigers'
    });

    // Success message
    ui.alert(
      '🎉 Setup Complete!',
      'Your Syston Tigers automation is now configured!\n\n' +
      '✅ Google Sheets: Connected\n' +
      `${webhookUrl ? '✅' : '⏭️'} Make.com: ${webhookUrl ? 'Connected' : 'Skipped'}\n\n` +
      'Your web app should now work correctly.',
      ui.ButtonSet.OK
    );

    return {
      success: true,
      spreadsheetId: spreadsheetId,
      webhookUrl: webhookUrl,
      message: 'Setup completed successfully'
    };

  } catch (error) {
    ui.alert('Setup Error', `Setup failed: ${error.toString()}`, ui.ButtonSet.OK);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Check current configuration
 */
function checkConfiguration() {
  try {
    const properties = PropertiesService.getScriptProperties();
    const config = {
      spreadsheetId: properties.getProperty('SPREADSHEET_ID'),
      webhookUrl: properties.getProperty('MAKE_WEBHOOK_URL'),
      setupCompleted: properties.getProperty('SETUP_COMPLETED'),
      setupDate: properties.getProperty('SETUP_DATE'),
      clubName: properties.getProperty('CLUB_NAME')
    };

    console.log('Current Configuration:', JSON.stringify(config, null, 2));

    // Test spreadsheet access
    if (config.spreadsheetId) {
      try {
        const sheet = SpreadsheetApp.openById(config.spreadsheetId);
        config.spreadsheetStatus = `✅ Connected to "${sheet.getName()}"`;
      } catch (error) {
        config.spreadsheetStatus = `❌ Error: ${error.toString()}`;
      }
    } else {
      config.spreadsheetStatus = '❌ Not configured';
    }

    return config;

  } catch (error) {
    console.error('Configuration check failed:', error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Configure Backend API Integration
 * Run this function to connect Apps Script to your backend
 */
function configureBackendIntegration() {
  const ui = SpreadsheetApp.getUi();

  try {
    // Welcome message
    const welcome = ui.alert(
      '🔗 Backend API Integration Setup',
      'This will connect your Apps Script to the backend API.\n\n' +
      'You need:\n' +
      '1. Backend API URL\n' +
      '2. Automation JWT (from signup response)\n' +
      '3. Tenant ID\n\n' +
      'Ready to configure?',
      ui.ButtonSet.YES_NO
    );

    if (welcome !== ui.Button.YES) {
      ui.alert('Setup cancelled.');
      return { success: false, cancelled: true };
    }

    // Get Backend API URL
    const backendUrlResponse = ui.prompt(
      'Step 1: Backend API URL',
      'Enter your backend API URL:\n\n' +
      'Example: https://syston-postbus.team-platform-2025.workers.dev',
      ui.ButtonSet.OK_CANCEL
    );

    if (backendUrlResponse.getSelectedButton() !== ui.Button.OK) {
      ui.alert('Setup cancelled.');
      return { success: false, cancelled: true };
    }

    const backendUrl = backendUrlResponse.getResponseText().trim();

    // Validate URL format
    if (!backendUrl.startsWith('https://')) {
      ui.alert('❌ Invalid URL', 'Backend URL must start with https://', ui.ButtonSet.OK);
      return { success: false, error: 'Invalid URL format' };
    }

    // Get Automation JWT
    const jwtResponse = ui.prompt(
      'Step 2: Automation JWT',
      'Paste your automationJWT:\n\n' +
      '(This was provided in the signup response)',
      ui.ButtonSet.OK_CANCEL
    );

    if (jwtResponse.getSelectedButton() !== ui.Button.OK) {
      ui.alert('Setup cancelled.');
      return { success: false, cancelled: true };
    }

    const automationJWT = jwtResponse.getResponseText().trim();

    // Validate JWT format (basic check)
    if (!automationJWT || automationJWT.split('.').length !== 3) {
      ui.alert('❌ Invalid JWT', 'The JWT token appears to be invalid. It should have 3 parts separated by dots.', ui.ButtonSet.OK);
      return { success: false, error: 'Invalid JWT format' };
    }

    // Get Tenant ID
    const tenantIdResponse = ui.prompt(
      'Step 3: Tenant ID',
      'Enter your tenant ID:\n\n' +
      'Example: syston',
      ui.ButtonSet.OK_CANCEL
    );

    if (tenantIdResponse.getSelectedButton() !== ui.Button.OK) {
      ui.alert('Setup cancelled.');
      return { success: false, cancelled: true };
    }

    const tenantId = tenantIdResponse.getResponseText().trim().toLowerCase();

    // Test the connection
    ui.alert('Testing Connection', 'Testing connection to backend API...', ui.ButtonSet.OK);

    try {
      const testResponse = UrlFetchApp.fetch(`${backendUrl}/healthz`, {
        method: 'GET',
        muteHttpExceptions: true
      });

      const testCode = testResponse.getResponseCode();

      if (testCode !== 200) {
        ui.alert('❌ Connection Test Failed', `Backend health check returned ${testCode}. Please verify the URL.`, ui.ButtonSet.OK);
        return { success: false, error: `Health check failed with code ${testCode}` };
      }

      ui.alert('✅ Connection Successful', 'Successfully connected to backend API!', ui.ButtonSet.OK);

    } catch (testError) {
      ui.alert('❌ Connection Test Failed', `Could not connect to backend:\n\n${testError.toString()}`, ui.ButtonSet.OK);
      return { success: false, error: testError.toString() };
    }

    // Save properties
    const properties = PropertiesService.getScriptProperties();
    properties.setProperties({
      'BACKEND_API_URL': backendUrl,
      'AUTOMATION_JWT': automationJWT,
      'TENANT_ID': tenantId,
      'BACKEND_INTEGRATION_CONFIGURED': 'true',
      'BACKEND_CONFIG_DATE': new Date().toISOString()
    });

    // Success message
    ui.alert(
      '🎉 Backend Integration Complete!',
      'Your Apps Script is now connected to the backend!\n\n' +
      '✅ Backend URL: ' + backendUrl + '\n' +
      '✅ Tenant ID: ' + tenantId + '\n' +
      '✅ Authentication: Configured\n\n' +
      'All events will now be routed through your backend API.',
      ui.ButtonSet.OK
    );

    return {
      success: true,
      backendUrl: backendUrl,
      tenantId: tenantId,
      message: 'Backend integration configured successfully'
    };

  } catch (error) {
    ui.alert('Setup Error', `Backend integration failed:\n\n${error.toString()}`, ui.ButtonSet.OK);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Check backend integration status
 */
function checkBackendIntegration() {
  try {
    const properties = PropertiesService.getScriptProperties();
    const backendUrl = properties.getProperty('BACKEND_API_URL');
    const automationJWT = properties.getProperty('AUTOMATION_JWT');
    const tenantId = properties.getProperty('TENANT_ID');

    const config = {
      backendUrl: backendUrl || '❌ Not configured',
      tenantId: tenantId || '❌ Not configured',
      jwtConfigured: automationJWT ? '✅ Configured' : '❌ Not configured',
      configDate: properties.getProperty('BACKEND_CONFIG_DATE') || 'Never',
      status: (backendUrl && automationJWT && tenantId) ? '✅ Ready' : '❌ Incomplete'
    };

    console.log('Backend Integration Status:', JSON.stringify(config, null, 2));
    return config;

  } catch (error) {
    console.error('Backend integration check failed:', error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Manual property setter (for advanced users)
 */
function setScriptProperty(key, value) {
  try {
    PropertiesService.getScriptProperties().setProperty(key, value);
    console.log(`✅ Set ${key} = ${value}`);
    return { success: true, key: key, value: value };
  } catch (error) {
    console.error(`❌ Failed to set ${key}:`, error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Get all script properties
 */
function getAllScriptProperties() {
  try {
    const properties = PropertiesService.getScriptProperties().getProperties();
    console.log('All Script Properties:', JSON.stringify(properties, null, 2));
    return properties;
  } catch (error) {
    console.error('Failed to get properties:', error.toString());
    return { error: error.toString() };
  }
}

/**
 * Clear all script properties (reset)
 */
function clearAllScriptProperties() {
  try {
    PropertiesService.getScriptProperties().deleteAll();
    console.log('✅ All script properties cleared');
    return { success: true, message: 'All properties cleared' };
  } catch (error) {
    console.error('❌ Failed to clear properties:', error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Quick fix for web app - set minimum required properties
 */
function quickFixWebApp(spreadsheetId) {
  if (!spreadsheetId) {
    console.error('❌ Please provide a spreadsheet ID');
    return { success: false, error: 'Spreadsheet ID required' };
  }

  try {
    // Test the spreadsheet ID
    const sheet = SpreadsheetApp.openById(spreadsheetId);

    // Set minimum properties
    PropertiesService.getScriptProperties().setProperties({
      'SPREADSHEET_ID': spreadsheetId,
      'SETUP_COMPLETED': 'true',
      'CLUB_NAME': 'Syston Tigers'
    });

    console.log('✅ Quick fix completed - Web app should now work');
    console.log(`✅ Connected to spreadsheet: "${sheet.getName()}"`);

    return {
      success: true,
      spreadsheetId: spreadsheetId,
      spreadsheetName: sheet.getName(),
      message: 'Quick fix completed successfully'
    };

  } catch (error) {
    console.error('❌ Quick fix failed:', error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * SIMPLE AUTONOMOUS SETUP - No heavy dependencies
 * Creates Config sheet and autonomous trigger for customers
 * BYPASSES monitoring/excellence systems to avoid initialization errors
 */
function setupAutonomousCustomer() {
  try {
    console.log('🚀 Setting up autonomous customer system (simple mode)...');

    // Step 1: Create Config sheet in current spreadsheet (direct approach)
    const configSheet = createConfigSheetDirect();
    if (!configSheet.success) {
      throw new Error('Config sheet creation failed: ' + configSheet.error);
    }

    // Step 2: Create the autonomous trigger (direct approach)
    const triggerResult = createCustomerTriggerDirect();
    if (!triggerResult.success) {
      console.warn('Trigger setup failed but continuing...', triggerResult.error);
    }

    // Step 3: Set minimal properties for immediate functionality
    const properties = PropertiesService.getScriptProperties();
    properties.setProperties({
      'AUTONOMOUS_SETUP_ENABLED': 'true',
      'SETUP_DATE': new Date().toISOString(),
      'SYSTEM_STATUS': 'READY_FOR_CUSTOMER_CONFIG',
      'SPREADSHEET_ID': SpreadsheetApp.getActiveSpreadsheet().getId(),
      'SETUP_COMPLETED': 'true'
    });

    console.log('🎉 Simple autonomous setup complete!');

    return {
      success: true,
      message: 'Autonomous customer system ready (simple mode)',
      configSheetCreated: configSheet.success,
      triggerInstalled: triggerResult.success,
      webAppUrl: `https://script.google.com/macros/s/${ScriptApp.getScriptId()}/exec`,
      instructions: [
        '✅ System ready for autonomous customer setup',
        '📝 Customer can now edit Config sheet values',
        '⚡ When customer sets SETUP_TRIGGER = TRUE, full setup runs automatically',
        '🎯 No developer intervention needed!',
        '🔗 Web app URL available immediately'
      ]
    };

  } catch (error) {
    console.error('❌ Autonomous setup failed:', error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * DIRECT CONFIG SHEET CREATION - No SheetUtils dependency
 */
function createConfigSheetDirect() {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const spreadsheet = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
    let configSheet = spreadsheet.getSheetByName('Config');

    if (!configSheet) {
      configSheet = spreadsheet.insertSheet('Config');
      console.log('✅ Created new Config sheet');
    } else {
      console.log('📋 Using existing Config sheet');
    }

    // Set up the structure (simplified)
    const configData = [
      ['Key', 'Value', 'Description'],
      ['CLUB_NAME', 'Your Club Name', 'Enter your football club name'],
      ['LEAGUE_NAME', 'Your League', 'Enter your league name'],
      ['MAKE_WEBHOOK_URL', '', 'Your Make.com webhook URL (optional)'],
      ['SETUP_TRIGGER', 'FALSE', '⚡ Set to TRUE to start automatic setup'],
      ['SETUP_STATUS', 'Ready', 'Current setup status'],
      ['WEB_APP_URL', `https://script.google.com/macros/s/${ScriptApp.getScriptId()}/exec`, 'Your web app URL']
    ];

    // Clear and populate
    configSheet.clear();
    configSheet.getRange(1, 1, configData.length, 3).setValues(configData);

    // Basic formatting
    try {
      configSheet.getRange(1, 1, 1, 3)
        .setFontWeight('bold')
        .setBackground('#4285f4')
        .setFontColor('white');

      configSheet.getRange(5, 1, 1, 3).setBackground('#fff3cd'); // Highlight trigger row
    } catch (formatError) {
      console.warn('Formatting failed but continuing...', formatError.toString());
    }

    return { success: true, sheet: configSheet };

  } catch (error) {
    console.error('Direct config sheet creation failed:', error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * DIRECT TRIGGER CREATION - No complex dependencies
 */
function createCustomerTriggerDirect() {
  try {
    // Clean up existing triggers
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'onCustomerConfigEdit') {
        ScriptApp.deleteTrigger(trigger);
      }
    });

    // Create new trigger
    ScriptApp.newTrigger('onCustomerConfigEdit')
      .onEdit()
      .create();

    console.log('✅ Customer trigger created');
    return { success: true };

  } catch (error) {
    console.error('Trigger creation failed:', error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Create Config sheet in current spreadsheet
 */
function createConfigSheetInCurrentSpreadsheet() {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const spreadsheet = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
    let configSheet = spreadsheet.getSheetByName('Config');

    if (!configSheet) {
      configSheet = spreadsheet.insertSheet('Config');
      console.log('✅ Created new Config sheet');
    } else {
      console.log('📋 Using existing Config sheet');
    }

    // Set up the structure
    const configData = [
      ['Key', 'Value', 'Description'],
      ['CLUB_NAME', 'Your Club Name', 'Enter your football club name'],
      ['LEAGUE_NAME', 'Your League', 'Enter your league name'],
      ['MAKE_WEBHOOK_URL', '', 'Your Make.com webhook URL (optional)'],
      ['SETUP_TRIGGER', 'FALSE', '⚡ Set to TRUE to start automatic setup'],
      ['SETUP_STATUS', 'Not Started', 'Current setup status'],
      ['WEB_APP_URL', '', 'Your web app URL (generated automatically)']
    ];

    configSheet.clear();
    configSheet.getRange(1, 1, configData.length, 3).setValues(configData);

    // Format nicely
    configSheet.getRange(1, 1, 1, 3)
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('white');

    configSheet.getRange(5, 1, 1, 3).setBackground('#fff3cd'); // Highlight trigger row

    return { success: true, sheet: configSheet };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Create trigger for autonomous setup
 */
function createCustomerTrigger() {
  try {
    // Delete existing triggers
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'onCustomerConfigEdit') {
        ScriptApp.deleteTrigger(trigger);
      }
    });

    // Create new trigger
    ScriptApp.newTrigger('onCustomerConfigEdit')
      .onEdit()
      .create();

    return { success: true };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Autonomous trigger - runs when customer edits Config sheet
 */
function onCustomerConfigEdit(e) {
  try {
    if (!e || e.source.getActiveSheet().getName() !== 'Config') {
      return;
    }

    const range = e.range;
    const value = range.getValue();

    // Check if SETUP_TRIGGER was set to TRUE
    if (range.getColumn() === 2 && String(value).toUpperCase() === 'TRUE') {
      const configKey = range.offset(0, -1).getValue();

      if (configKey === 'SETUP_TRIGGER') {
        console.log('🎯 Customer triggered autonomous setup!');

        // Mark as processing
        range.setValue('PROCESSING...');
        Utilities.sleep(1000);

        // Run the existing setup functions
        const result = runAutonomousSetup();

        if (result.success) {
          range.setValue('COMPLETED');

          // Update WEB_APP_URL in Config sheet
          const urlRow = findConfigRowByKey('WEB_APP_URL');
          if (urlRow && result.webAppUrl) {
            e.source.getActiveSheet().getRange(urlRow, 2).setValue(result.webAppUrl);
          }

          SpreadsheetApp.getUi().alert(
            'Setup Complete!',
            `🎉 Your system is ready!\n\n🔗 Web App URL: ${result.webAppUrl || 'Check Config sheet'}\n\n✅ You can now use this for live match updates!`,
            SpreadsheetApp.getUi().ButtonSet.OK
          );

        } else {
          range.setValue('FAILED');
          SpreadsheetApp.getUi().alert('Setup Failed', `❌ Error: ${result.error}`, SpreadsheetApp.getUi().ButtonSet.OK);
        }
      }
    }

  } catch (error) {
    console.error('❌ Autonomous setup trigger failed:', error.toString());
  }
}

/**
 * Run autonomous setup using direct approach (no heavy dependencies)
 */
function runAutonomousSetup() {
  try {
    console.log('🚀 Running autonomous setup (simple mode)...');

    // Get config from sheet (direct approach)
    const config = readConfigFromCurrentSheetDirect();

    // Set script properties (direct approach - no complex config system)
    const properties = PropertiesService.getScriptProperties();
    properties.setProperties({
      'SPREADSHEET_ID': SpreadsheetApp.getActiveSpreadsheet().getId(),
      'CLUB_NAME': config.CLUB_NAME || 'Your Club',
      'LEAGUE_NAME': config.LEAGUE_NAME || 'Your League',
      'MAKE_WEBHOOK_URL': config.MAKE_WEBHOOK_URL || '',
      'SETUP_COMPLETED': 'true',
      'SETUP_DATE': new Date().toISOString(),
      'AUTONOMOUS_SETUP_SUCCESS': 'true'
    });

    // Generate web app URL
    const webAppUrl = `https://script.google.com/macros/s/${ScriptApp.getScriptId()}/exec`;

    console.log('✅ Autonomous setup completed successfully');

    return {
      success: true,
      message: 'Autonomous setup completed (simple mode)',
      webAppUrl: webAppUrl,
      config: config,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Autonomous setup failed:', error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Read config from current sheet (direct approach - no dependencies)
 */
function readConfigFromCurrentSheetDirect() {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const spreadsheet = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
    const configSheet = spreadsheet.getSheetByName('Config');

    if (!configSheet) {
      console.warn('Config sheet not found, using defaults');
      return {};
    }

    const data = configSheet.getDataRange().getValues();
    const config = {};

    for (let i = 1; i < data.length; i++) {
      const key = data[i][0];
      const value = data[i][1];
      if (key && value && value !== '') {
        config[key] = value;
      }
    }

    console.log(`✅ Config read: ${Object.keys(config).length} values`);
    return config;

  } catch (error) {
    console.error('Config reading failed:', error.toString());
    return {};
  }
}

/**
 * Read config from current sheet
 */
function readConfigFromCurrentSheet() {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const spreadsheet = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
    const configSheet = spreadsheet.getSheetByName('Config');
    const data = configSheet.getDataRange().getValues();

    const config = {};
    for (let i = 1; i < data.length; i++) {
      const key = data[i][0];
      const value = data[i][1];
      if (key && value) {
        config[key] = value;
      }
    }

    return config;
  } catch (error) {
    return {};
  }
}

/**
 * Find config row by key
 */
function findConfigRowByKey(key) {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const spreadsheet = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
    const configSheet = spreadsheet.getSheetByName('Config');
    const data = configSheet.getDataRange().getValues();

    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === key) {
        return i + 1;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}