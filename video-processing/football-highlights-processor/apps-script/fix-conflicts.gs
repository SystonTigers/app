// Fix for Google Apps Script conflicts - Standalone Script Configuration
// This file contains the corrected code to resolve the merge conflicts

// ==================== UPDATED .clasp.json ====================
// Replace your .clasp.json with:
/*
{
  "scriptId": "1x4MvHn9BTvlKQmUi2KcQuNdkPck5FeECBkiaKol7oy0VKcfHsneBNjA-",
  "rootDir": "./src",
  "fileExtension": "gs"
}
*/

// ==================== SPREADSHEET ID CONFIGURATION ====================
// In your config.gs file, update the SHEETS configuration:

const SYSTEM_CONFIG = {
  // ... other config ...
  SHEETS: {
    // Set your actual spreadsheet ID here - REQUIRED
    PRIMARY_SPREADSHEET_ID: 'YOUR_ACTUAL_SPREADSHEET_ID_HERE', // Replace with your Sheet ID
    SPREADSHEET_ID: 'YOUR_ACTUAL_SPREADSHEET_ID_HERE', // Legacy support

    SCRIPT_PROPERTY_KEYS: {
      PRIMARY_SPREADSHEET_ID: 'SPREADSHEET_ID'
    },

    TAB_NAMES: {
      // Core sheets
      LIVE_MATCH: 'Live Match Updates',
      FIXTURES: 'Fixtures',
      RESULTS: 'Results',
      PLAYER_STATS: 'Player Stats',
      PLAYERS: 'Players',
      EVENTS: 'Events',
      LIVE_MATCH_UPDATES: 'Live Match Updates',
      FIXTURES_RESULTS: 'Fixtures & Results',
      PLAYER_MINUTES: 'Player Minutes',

      // Enhanced sheets from spec
      SUBS_LOG: 'Subs Log',
      OPPOSITION_EVENTS: 'Opposition Events',
      VIDEO_CLIPS: 'Video Clips',
      MONTHLY_CONTENT: 'Monthly Content',
      MONTHLY_SUMMARIES: 'Monthly Summaries',
      WEEKLY_SCHEDULE: 'Weekly Schedule',
      WEEKLY_CONTENT: 'Weekly Content Calendar',

      // System sheets
      CONTROL_PANEL: 'Control Panel',
      CONFIG: 'Config',
      LOGS: 'Logs',
      NOTES: 'Notes',
      QUOTES: 'Quotes',
      HISTORICAL_DATA: 'Historical Data',

      PRIVACY_PLAYERS: 'Privacy Players',
      PRIVACY_CONSENTS: 'Privacy Consents',
      PRIVACY_AUDIT: 'Privacy Audit Log'
    }
  }
  // ... rest of config ...
};

// ==================== FIXED HELPER FUNCTIONS ====================

/**
 * Initialize the script with proper spreadsheet ID
 * Call this function first to set up the spreadsheet ID
 */
function initializeSpreadsheetId(spreadsheetId) {
  if (!spreadsheetId || typeof spreadsheetId !== 'string') {
    throw new Error('Valid spreadsheet ID must be provided');
  }

  try {
    PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', spreadsheetId);

    // Test access to the spreadsheet
    const testSpreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const testName = testSpreadsheet.getName();

    console.log(`✅ Spreadsheet initialized: ${testName} (${spreadsheetId})`);
    return { success: true, name: testName, id: spreadsheetId };

  } catch (error) {
    console.error('Failed to initialize spreadsheet:', error);
    throw new Error(`Cannot access spreadsheet with ID: ${spreadsheetId}. Please check the ID and permissions.`);
  }
}

/**
 * Get the primary spreadsheet ID from config or properties
 */
function getPrimarySpreadsheetId() {
  try {
    // First try from Script Properties
    let spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');

    // If not found, try from config (but config should have placeholder)
    if (!spreadsheetId) {
      spreadsheetId = getConfig('SHEETS.PRIMARY_SPREADSHEET_ID', '');
      if (spreadsheetId && spreadsheetId !== '<<REQUIRED_SPREADSHEET_ID>>' && spreadsheetId !== 'YOUR_ACTUAL_SPREADSHEET_ID_HERE') {
        // Save to properties for future use
        PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', spreadsheetId);
      } else {
        spreadsheetId = '';
      }
    }

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID not configured. Please run initializeSpreadsheetId() first or set SHEETS.PRIMARY_SPREADSHEET_ID in config.');
    }

    return spreadsheetId;
  } catch (error) {
    console.error('Error getting spreadsheet ID:', error);
    throw error;
  }
}

/**
 * Get the primary spreadsheet object
 */
function getSpreadsheet() {
  try {
    const spreadsheetId = getPrimarySpreadsheetId();
    return SpreadsheetApp.openById(spreadsheetId);
  } catch (error) {
    console.error('Failed to open spreadsheet:', error);
    throw error;
  }
}

/**
 * Get a specific sheet by name with enhanced error handling
 */
function getSheet(sheetName, options = {}) {
  const createIfMissing = options.createIfMissing || false;
  const requiredColumns = options.requiredColumns || [];

  try {
    if (!sheetName || typeof sheetName !== 'string') {
      throw new Error('Sheet name must be provided as a string');
    }

    const spreadsheet = getSpreadsheet();
    let sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet && createIfMissing) {
      sheet = spreadsheet.insertSheet(sheetName);

      if (requiredColumns.length > 0) {
        const headerRange = sheet.getRange(1, 1, 1, requiredColumns.length);
        headerRange.setValues([requiredColumns]);
        headerRange.setFontWeight('bold');
        headerRange.setBackground('#f0f0f0');
      }

      console.log(`✅ Created sheet: ${sheetName}`);
    }

    if (!sheet) {
      throw new Error(`Sheet not found: ${sheetName}`);
    }

    // Ensure required columns exist if sheet already exists
    if (!createIfMissing && requiredColumns.length > 0) {
      const lastColumn = sheet.getLastColumn();
      const existingHeaders = lastColumn > 0
        ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
        : [];

      const missingColumns = requiredColumns.filter(col => !existingHeaders.includes(col));

      if (missingColumns.length > 0) {
        const startColumn = existingHeaders.length + 1;
        const range = sheet.getRange(1, startColumn, 1, missingColumns.length);
        range.setValues([missingColumns]);
        range.setFontWeight('bold');
        range.setBackground('#f0f0f0');
      }
    }

    return sheet;
  } catch (error) {
    console.error(`Failed to get sheet: ${sheetName}`, error);
    throw error;
  }
}

// ==================== FIXED CODE SEGMENTS ====================

/**
 * Fixed version of getPlayersForWeb
 */
function getPlayersForWeb() {
  try {
    if (typeof getActivePlayers === 'function') {
      return getActivePlayers();
    }

    const playersTabName = getConfig('SHEETS.TAB_NAMES.PLAYERS', 'Players');

    try {
      const sheet = getSheet(playersTabName);
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const players = [];

      for (let i = 1; i < data.length; i++) {
        const player = {};
        headers.forEach((header, index) => {
          player[header] = data[i][index];
        });
        if (player.IsActive !== false) {
          players.push(player);
        }
      }

      return players.sort((a, b) => (a.Number || 0) - (b.Number || 0));

    } catch (sheetError) {
      console.warn('Players sheet not available for web fetch', sheetError);
      return [];
    }

  } catch (error) {
    console.error('Error getting players for web', error);
    return [];
  }
}

/**
 * Fixed version of savePlayersFromWeb
 */
function savePlayersFromWeb(players) {
  try {
    if (typeof savePlayersData === 'function') {
      return savePlayersData(players);
    }

    const playersTabName = getConfig('SHEETS.TAB_NAMES.PLAYERS', 'Players');
    const sheet = getSheet(playersTabName, {
      createIfMissing: true,
      requiredColumns: ['Number', 'Name', 'Position', 'IsActive', 'Notes', 'ShortName']
    });

    // Clear existing data
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clear();
    }

    // Write player data
    if (players.length > 0) {
      const values = players.map(player => [
        player.Number || '',
        player.Name || '',
        player.Position || '',
        player.IsActive !== false,
        player.Notes || '',
        player.ShortName || ''
      ]);

      sheet.getRange(2, 1, values.length, 6).setValues(values);
    }

    console.log('Players saved from web', { count: players.length });
    return { success: true };

  } catch (error) {
    console.error('Error saving players from web', error);
    throw error;
  }
}

/**
 * Fixed version of getRecentEventsForWeb
 */
function getRecentEventsForWeb(limit = 10) {
  try {
    if (typeof getRecentEvents === 'function') {
      return getRecentEvents(limit);
    }

    const eventsTabName = getConfig('SHEETS.TAB_NAMES.EVENTS', 'Events');

    try {
      const sheet = getSheet(eventsTabName);

      if (sheet.getLastRow() <= 1) {
        return [];
      }

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const events = [];

      // Get recent events (up to limit)
      const startRow = Math.max(1, data.length - limit);
      for (let i = data.length - 1; i >= startRow; i--) {
        const event = {};
        headers.forEach((header, index) => {
          event[header] = data[i][index];
        });
        events.push(event);
      }

      return events;

    } catch (sheetError) {
      console.warn('Events sheet not available for web fetch', sheetError);
      return [];
    }

  } catch (error) {
    console.error('Error getting recent events for web', error);
    return [];
  }
}

// ==================== BATCH FIXTURES FIXES ====================

class BatchFixturesManager {
  // ... existing code ...

  getFixturesSheet() {
    try {
      const fixturesTabName = getConfig('SHEETS.TAB_NAMES.FIXTURES', 'Fixtures');
      return getSheet(fixturesTabName);
    } catch (e) {
      console.error('Failed to open Fixtures sheet', e);
      return null;
    }
  }

  getResultsSheet() {
    try {
      const resultsTabName = getConfig('SHEETS.TAB_NAMES.RESULTS', 'Results');
      return getSheet(resultsTabName);
    } catch (e) {
      console.error('Failed to open Results sheet', e);
      return null;
    }
  }
}

/**
 * Fixed version of initBatchFixtures
 */
function initBatchFixtures() {
  try {
    const tabs = getConfig('SHEETS.TAB_NAMES', {});
    const spreadsheet = getSpreadsheet();

    const results = {
      fixtures: !!(tabs.FIXTURES ? spreadsheet.getSheetByName(tabs.FIXTURES) : null),
      results: !!(tabs.RESULTS ? spreadsheet.getSheetByName(tabs.RESULTS) : null)
    };

    const webhookConfigured = !!getWebhookUrl();

    return {
      success: true,
      sheets_validated: results,
      webhook_configured: webhookConfigured,
      features_enabled: {
        batch_posting: isFeatureEnabled('BATCH_POSTING'),
        monthly_summaries: isFeatureEnabled('MONTHLY_SUMMARIES'),
        postponed_handling: isFeatureEnabled('POSTPONED_MATCH_HANDLING')
      }
    };

  } catch (error) {
    console.error('Batch fixtures initialization failed', error);
    return { success: false, error: error.toString() };
  }
}

// ==================== SYSTEM HEALTH FIXES ====================

/**
 * Fixed version of checkSheets
 */
function checkSheets() {
  try {
    const ss = getSpreadsheet();
    if (!ss) throw new Error("Spreadsheet not found.");
    console.log("✅ Spreadsheet accessible: " + ss.getName());
  } catch (e) {
    console.log("❌ Spreadsheet access error: " + e.message);
  }
}

/**
 * Fixed version of checkSheetTabs
 */
function checkSheetTabs() {
  const requiredTabs = [
    "Control Panel",
    "Fixtures",
    "Results",
    "Live Match Updates",
    "League Raw",
    "League Sorted",
    "League Canva Map"
  ];

  let ss;
  try {
    ss = getSpreadsheet();
  } catch (error) {
    console.log("❌ Spreadsheet access error: " + (error && error.message ? error.message : error));
    return;
  }

  requiredTabs.forEach(tabName => {
    const sheet = ss.getSheetByName(tabName);
    if (sheet) {
      console.log(`✅ Tab found: ${tabName}`);
    } else {
      console.log(`❌ Missing tab: ${tabName}`);
    }
  });

  const liveUpdateSheet = ss.getSheetByName("Live Match Updates");
  if (liveUpdateSheet) {
    const headers = liveUpdateSheet.getRange(1, 1, 1, liveUpdateSheet.getLastColumn()).getValues()[0];
    const requiredHeaders = ["Match Date", "Opponent", "Scorer", "Assister", "Minute", "Send"];
    requiredHeaders.forEach(h => {
      if (headers.includes(h)) {
        console.log(`✅ Column "${h}" exists in Live Match Updates`);
      } else {
        console.log(`❌ Missing column "${h}" in Live Match Updates`);
      }
    });
  }
}

/**
 * Fixed version of simulateLiveMatchUpdate
 */
function simulateLiveMatchUpdate() {
  try {
    const liveMatchTabName = getConfig('SHEETS.TAB_NAMES.LIVE_MATCH_UPDATES', 'Live Match Updates');
    const sheet = getSheet(liveMatchTabName);

    const lastRow = sheet.getLastRow() + 1;
    const fakeData = ["2099-12-31", "Test United", "Test Player", "Assist Player", "12", true];
    sheet.getRange(lastRow, 1, 1, fakeData.length).setValues([fakeData]);
    console.log("✅ Simulated match update added.");

  } catch (e) {
    console.log("❌ Failed to simulate live update: " + e.message);
  }
}

// ==================== MONITORING FIXES ====================

/**
 * Fixed version of checkSheetAccess for monitoring
 */
function checkSheetAccess() {
  const startTime = Date.now();

  try {
    const testSpreadsheet = getSpreadsheet();
    if (!testSpreadsheet) {
      throw new Error('Cannot access spreadsheet');
    }

    const sheetNames = testSpreadsheet.getSheets().map(sheet => sheet.getName());
    const accessTime = Date.now() - startTime;

    return {
      name: 'Sheet Access',
      status: accessTime < 2000 ? 'healthy' : 'warning',
      metrics: {
        accessTime: accessTime,
        sheetCount: sheetNames.length
      },
      message: `Sheet access time: ${accessTime}ms, ${sheetNames.length} sheets`
    };

  } catch (error) {
    return {
      name: 'Sheet Access',
      status: 'critical',
      error: error.toString(),
      message: 'Sheet access failed'
    };
  }
}

// ==================== UTILS FIXES ====================

const SheetUtils = {
  /**
   * Fixed version of getOrCreateSheet
   */
  getOrCreateSheet(sheetName, requiredColumns = []) {
    try {
      const spreadsheet = getSpreadsheet();
      let sheet = spreadsheet.getSheetByName(sheetName);
      let sheetCreated = false;

      if (!sheet) {
        sheet = spreadsheet.insertSheet(sheetName);
        sheetCreated = true;

        if (requiredColumns.length > 0) {
          const headerRange = sheet.getRange(1, 1, 1, requiredColumns.length);
          headerRange.setValues([requiredColumns]);
          headerRange.setFontWeight('bold');
          headerRange.setBackground('#f0f0f0');
        }
      } else if (requiredColumns.length > 0) {
        this.ensureColumnsExist(sheet, requiredColumns);
      }

      return sheet;
    } catch (error) {
      console.error(`Failed to get or create sheet: ${sheetName}`, error);
      return null;
    }
  }

  // ... rest of SheetUtils methods ...
};

// ==================== TESTING FIXES ====================

/**
 * Fixed version of testSheetOperations
 */
function testSheetOperations() {
  try {
    const testSheetName = 'TEST_SHEET_' + Date.now();
    const testColumns = ['Test Column 1', 'Test Column 2', 'Test Column 3'];

    const sheet = SheetUtils.getOrCreateSheet(testSheetName, testColumns);
    if (!sheet) {
      return { success: false, error: 'Could not create test sheet' };
    }

    const testData = {
      'Test Column 1': 'Test Value 1',
      'Test Column 2': 'Test Value 2',
      'Test Column 3': 'Test Value 3'
    };

    const addResult = SheetUtils.addRowFromObject(sheet, testData);
    if (!addResult) {
      return { success: false, error: 'Could not add test row' };
    }

    const retrievedData = SheetUtils.getAllDataAsObjects(sheet);
    if (retrievedData.length === 0) {
      return { success: false, error: 'Could not retrieve test data' };
    }

    // Clean up test sheet
    try {
      const spreadsheet = getSpreadsheet();
      spreadsheet.deleteSheet(sheet);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    return {
      success: true,
      details: {
        sheet_created: true,
        data_added: true,
        data_retrieved: retrievedData.length > 0
      }
    };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ==================== INSTALLATION HELPER ====================

/**
 * Auto-installation function that sets up all required components
 * Call this once after setting up your spreadsheet ID
 */
function installAllTriggers() {
  try {
    console.log('🔧 Installing all triggers...');

    // Delete existing triggers to avoid duplicates
    const existingTriggers = ScriptApp.getProjectTriggers();
    existingTriggers.forEach(trigger => {
      ScriptApp.deleteTrigger(trigger);
    });

    // Install onEdit trigger for live match updates
    ScriptApp.newTrigger('onEdit')
      .onEdit()
      .create();

    // Install time-based triggers
    ScriptApp.newTrigger('refreshToday')
      .timeBased()
      .everyHours(1)
      .create();

    ScriptApp.newTrigger('runDailyMaintenance')
      .timeBased()
      .everyDays(1)
      .atHour(2) // 2 AM
      .create();

    console.log('✅ All triggers installed successfully');
    return { success: true, message: 'All triggers installed' };

  } catch (error) {
    console.error('❌ Failed to install triggers:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * Complete setup function - run this after setting spreadsheet ID
 */
function completeSetup() {
  try {
    console.log('🚀 Running complete setup...');

    // 1. Verify spreadsheet access
    const spreadsheet = getSpreadsheet();
    console.log('✅ Spreadsheet accessible:', spreadsheet.getName());

    // 2. Install triggers
    const triggerResult = installAllTriggers();
    if (!triggerResult.success) {
      throw new Error('Failed to install triggers: ' + triggerResult.error);
    }

    // 3. Validate configuration
    const configResult = validateConfiguration();
    if (!configResult.valid) {
      console.warn('⚠️ Configuration warnings:', configResult.issues);
    }

    // 4. Run system health check
    runSystemHealthCheck();

    console.log('🎉 Setup complete! Your script is ready to use.');
    return { success: true, message: 'Complete setup finished successfully' };

  } catch (error) {
    console.error('❌ Setup failed:', error);
    return { success: false, error: error.toString() };
  }
}

// ==================== WEB APP FUNCTIONS ====================

/**
 * Handle GET requests (if you need a web interface)
 */
function doGet(e) {
  try {
    return HtmlService.createHtmlOutput(`
      <html>
        <body>
          <h1>Football Highlights Automation</h1>
          <p>Web App is active and running.</p>
          <p>Script ID: ${ScriptApp.getScriptId()}</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        </body>
      </html>
    `);
  } catch (error) {
    return HtmlService.createHtmlOutput(`Error: ${error.toString()}`);
  }
}

/**
 * Handle POST requests (for webhooks from Make.com)
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    console.log('Received webhook data:', data);

    // Process the webhook data as needed
    // This is where you'd handle incoming data from Make.com

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, received: data }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('Webhook error:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==================== INSTRUCTIONS FOR SETUP ====================

/**
 * SETUP INSTRUCTIONS:
 *
 * 1. First, update your spreadsheet ID:
 *    - Replace 'YOUR_ACTUAL_SPREADSHEET_ID_HERE' in config with your real Sheet ID
 *    - OR run: initializeSpreadsheetId('your-spreadsheet-id-here')
 *
 * 2. Run complete setup:
 *    - Execute: completeSetup()
 *
 * 3. Deploy as web app (if needed):
 *    - Go to Deploy > New Deployment
 *    - Choose "Web app"
 *    - Set access to "Anyone" or "Anyone with the link"
 *    - Copy the web app URL for Make.com
 *
 * 4. Test the installation:
 *    - Run: runSystemHealthCheck()
 *    - Check that all sheets and triggers are working
 *
 * 5. Update Make.com webhooks:
 *    - Use the new web app URL in your Make.com scenarios
 *    - Test the webhook integration
 */

console.log('🔧 Football Highlights Automation - Conflict Resolution Applied');
console.log('📋 Next steps:');
console.log('1. Update SHEETS.PRIMARY_SPREADSHEET_ID in config with your Sheet ID');
console.log('2. Run: completeSetup()');
console.log('3. Deploy as Web App if using webhooks');
console.log('4. Test with: runSystemHealthCheck()');