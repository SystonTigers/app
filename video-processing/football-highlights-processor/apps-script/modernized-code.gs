/**
 * Modernized Football Highlights Google Apps Script
 * Updated to use sheet-based configuration system
 *
 * This version eliminates the need for customers to modify code by reading
 * all configuration values from the Config sheet dynamically.
 */

// Legacy sheet names - now configurable through Config sheet
const SHEET_NAMES = {
  QUEUE: 'Video Queue',
  NOTES: 'Match Notes',
  SETTINGS: 'Settings',
  ACTIVITY: 'Activity Log',
  STORAGE: 'Storage Info',
  STATS: 'Season Statistics',
  DASHBOARD: 'Dashboard',
  CONFIG: 'Config'
};

const STATUS = {
  READY: 'READY',
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  COMPLETE: 'COMPLETE',
  FAILED: 'FAILED',
  ERROR: 'ERROR'
};

/**
 * MAIN EVENT HANDLERS
 */

function onEdit(e) {
  try {
    // Use the new sheet access method
    const sheet = e.source.getActiveSheet();
    const range = e.range;

    Logger.log(`Edit detected: ${sheet.getName()}, Row: ${range.getRow()}, Col: ${range.getColumn()}`);

    switch (sheet.getName()) {
      case SHEET_NAMES.QUEUE:
        handleVideoQueueEdit(range);
        break;

      case SHEET_NAMES.NOTES:
        handleMatchNotesEdit(range);
        break;

      case SHEET_NAMES.CONFIG:
        handleConfigEdit(range);
        break;

      case SHEET_NAMES.SETTINGS:
        handleSettingsEdit(range);
        break;
    }
  } catch (error) {
    Logger.log('Edit handler failed: ' + error.toString());
    logActivity(`Edit handler error: ${error.message}`, 'error');
  }
}

function onOpen() {
  try {
    // Initialize configuration system on first open
    initializeConfigSystem();

    const ui = SpreadsheetApp.getUi();

    ui.createMenu('🏈 Football Highlights')
      .addItem('🎬 Process Video Queue', 'processVideoQueue')
      .addSeparator()
      .addItem('📝 Validate Match Notes', 'validateAllMatchNotes')
      .addItem('📊 Update Dashboard', 'updateDashboard')
      .addSeparator()
      .addItem('🔧 System Setup', 'runSystemSetup')
      .addItem('⚙️ Validate Configuration', 'validateConfiguration')
      .addItem('🧪 Test System', 'runSystemTests')
      .addSeparator()
      .addItem('📧 Send Test Email', 'sendTestNotification')
      .addItem('🔄 Refresh Storage Info', 'refreshStorageInfo')
      .addToUi();

    // Show welcome message for new users or configuration issues
    checkAndShowWelcomeMessage();

  } catch (error) {
    Logger.log('onOpen error: ' + error.toString());
  }
}

/**
 * CONFIG EDIT HANDLER
 * Handles changes to the Config sheet and validates them
 */
function handleConfigEdit(range) {
  try {
    const sheet = range.getSheet();
    const row = range.getRow();
    const col = range.getColumn();

    // Only handle edits to the Value column (column 2)
    if (col !== 2) return;

    // Clear cache when config changes
    clearConfigCache();

    // Update last modified timestamp
    const timestampRow = findConfigItemRow(sheet, 'Config Last Updated');
    if (timestampRow) {
      sheet.getRange(timestampRow, 2).setValue(new Date());
    }

    // Validate the configuration
    Utilities.sleep(500); // Small delay to ensure value is saved
    validateConfigSheet();

    // Log the change
    const label = sheet.getRange(row, 1).getValue();
    const newValue = range.getValue();
    logActivity(`Configuration updated: ${label} = ${newValue}`, 'info');

  } catch (error) {
    Logger.log('Config edit handler error: ' + error.toString());
  }
}

/**
 * ENHANCED SYSTEM SETUP
 * Now includes automatic configuration detection and setup
 */
function runSystemSetup() {
  try {
    const ui = SpreadsheetApp.getUi();

    // Check if Config sheet exists
    let configSheet;
    try {
      configSheet = getSheetByName(SHEET_NAMES.CONFIG);
    } catch (error) {
      // Config sheet doesn't exist, create it
      ui.alert(
        'Welcome! 🏈',
        'This appears to be your first time using the Football Highlights system. ' +
        'I\'ll create the configuration sheet for you.',
        ui.ButtonSet.OK
      );

      configSheet = createConfigSheet();
    }

    // Validate current configuration
    const configStatus = getConfigStatus();

    if (configStatus.percentage < 100) {
      const response = ui.alert(
        'Configuration Required',
        `Your system is ${configStatus.percentage}% configured. ` +
        `Please complete the Config sheet before proceeding.\n\n` +
        `Missing settings: ${configStatus.missing.join(', ')}\n\n` +
        `Would you like to open the Config sheet now?`,
        ui.ButtonSet.YES_NO
      );

      if (response === ui.Button.YES) {
        // Switch to Config sheet
        getCurrentSpreadsheet().setActiveSheet(configSheet);
        return;
      }
    }

    // Run full system setup
    setupAllSheets();
    initializeSystemData();
    testSystemConnectivity();

    ui.alert(
      'Setup Complete! ✅',
      'Your Football Highlights system is now ready to use!\n\n' +
      'Next steps:\n' +
      '1. Add videos to the Video Queue sheet\n' +
      '2. Fill in match notes\n' +
      '3. Process your first video\n\n' +
      'Check the Dashboard for system status.',
      ui.ButtonSet.OK
    );

  } catch (error) {
    SpreadsheetApp.getUi().alert('Setup Error', 'Setup failed: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
    Logger.log('System setup error: ' + error.toString());
  }
}

/**
 * CONFIGURATION VALIDATION FUNCTION
 */
function validateConfiguration() {
  try {
    const result = validateConfigSheet();
    const ui = SpreadsheetApp.getUi();

    if (result.valid) {
      ui.alert(
        'Configuration Valid ✅',
        'All configuration settings are valid and the system is ready to use!',
        ui.ButtonSet.OK
      );
    } else {
      ui.alert(
        'Configuration Issues ❌',
        `Found ${result.errors.length} configuration problem(s):\n\n` +
        result.errors.join('\n') +
        '\n\nPlease fix these issues in the Config sheet.',
        ui.ButtonSet.OK
      );

      // Switch to Config sheet
      const configSheet = getSheetByName(SHEET_NAMES.CONFIG);
      getCurrentSpreadsheet().setActiveSheet(configSheet);
    }

  } catch (error) {
    Logger.log('Configuration validation error: ' + error.toString());
    SpreadsheetApp.getUi().alert('Validation Error', error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * ENHANCED WELCOME MESSAGE
 */
function checkAndShowWelcomeMessage() {
  try {
    // Check if this is a new installation
    const configStatus = getConfigStatus();

    if (configStatus.percentage < 50) {
      const ui = SpreadsheetApp.getUi();

      ui.alert(
        '👋 Welcome to Football Highlights!',
        'It looks like this is your first time using the system.\n\n' +
        '📋 To get started:\n' +
        '1. Fill out the Config sheet with your details\n' +
        '2. Run "System Setup" from the menu\n' +
        '3. Start processing videos!\n\n' +
        'Click OK to open the Config sheet.',
        ui.ButtonSet.OK
      );

      // Ensure Config sheet exists and open it
      const configSheet = getSheetByName(SHEET_NAMES.CONFIG, { createIfMissing: true });
      if (!configSheet.getRange(1, 1).getValue()) {
        // Sheet is empty, populate it
        createConfigSheet();
      }

      getCurrentSpreadsheet().setActiveSheet(configSheet);
    }

  } catch (error) {
    Logger.log('Welcome message error: ' + error.toString());
  }
}

/**
 * MODERNIZED API CALL FUNCTIONS
 * Now use dynamic configuration instead of hardcoded values
 */
function makeApiCall(endpoint, method = 'POST', payload = {}) {
  try {
    const baseUrl = getApiEndpoint();
    const apiKey = getConfigValue('API_KEY');

    if (!baseUrl) {
      throw new Error('API endpoint not configured. Please set Railway URL in the Config sheet.');
    }

    if (!apiKey) {
      throw new Error('API key not configured. Please set API Authentication Key in the Config sheet.');
    }

    const url = `${baseUrl}${endpoint}`;

    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'GoogleAppsScript-FootballHighlights/1.0'
      }
    };

    if (method !== 'GET' && Object.keys(payload).length > 0) {
      options.payload = JSON.stringify(payload);
    }

    Logger.log(`Making API call: ${method} ${url}`);

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode < 200 || responseCode >= 300) {
      throw new Error(`API call failed: ${responseCode} - ${responseText}`);
    }

    return JSON.parse(responseText);

  } catch (error) {
    Logger.log(`API call error: ${error.toString()}`);
    throw error;
  }
}

/**
 * ENHANCED VIDEO PROCESSING
 * Now uses configuration from Config sheet
 */
function processVideoQueue() {
  try {
    const ui = SpreadsheetApp.getUi();

    // Validate configuration first
    const configStatus = getConfigStatus();
    if (!configStatus.valid) {
      ui.alert(
        'Configuration Required',
        'Please complete the system configuration before processing videos.\n\n' +
        `Missing: ${configStatus.missing.join(', ')}`,
        ui.ButtonSet.OK
      );
      return;
    }

    const queueSheet = getSheetByName(SHEET_NAMES.QUEUE);
    const data = queueSheet.getDataRange().getValues();

    if (data.length <= 1) {
      ui.alert('No Videos', 'No videos found in the queue to process.', ui.ButtonSet.OK);
      return;
    }

    let processedCount = 0;
    const clubName = getConfigValue('CLUB_NAME', 'Unknown Club');
    const season = getConfigValue('SEASON', '2024-25');

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = row[4]; // Status column

      if (status === STATUS.READY) {
        try {
          const videoData = {
            id: row[0],
            matchName: row[1],
            videoUrl: row[2],
            notes: row[3],
            clubName: clubName,
            season: season,
            timestamp: new Date().toISOString()
          };

          // Update status to QUEUED
          queueSheet.getRange(i + 1, 5).setValue(STATUS.QUEUED);

          // Make API call to process video
          const result = makeApiCall('/api/process-video', 'POST', videoData);

          // Update status to PROCESSING
          queueSheet.getRange(i + 1, 5).setValue(STATUS.PROCESSING);
          queueSheet.getRange(i + 1, 6).setValue(new Date()); // Last updated

          processedCount++;
          logActivity(`Video queued for processing: ${videoData.matchName}`, 'info');

        } catch (error) {
          // Update status to ERROR
          queueSheet.getRange(i + 1, 5).setValue(STATUS.ERROR);
          queueSheet.getRange(i + 1, 7).setValue(error.message); // Error column

          logActivity(`Video processing failed: ${row[1]} - ${error.message}`, 'error');
        }
      }
    }

    if (processedCount > 0) {
      ui.alert(
        'Videos Queued',
        `Successfully queued ${processedCount} video(s) for processing.\n\n` +
        'You will receive notifications when processing is complete.',
        ui.ButtonSet.OK
      );
    } else {
      ui.alert('No Videos Ready', 'No videos with READY status found in the queue.', ui.ButtonSet.OK);
    }

  } catch (error) {
    Logger.log('Process video queue error: ' + error.toString());
    SpreadsheetApp.getUi().alert('Processing Error', error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * WEBHOOK HANDLER - Updated to use sheet-based config
 */
function handleWebhook(e) {
  try {
    const postData = e.postData;
    if (!postData || !postData.contents) {
      throw new Error('No webhook data received');
    }

    const data = JSON.parse(postData.contents);
    Logger.log('Webhook received: ' + JSON.stringify(data));

    switch (data.type) {
      case 'video_processing_complete':
        handleVideoProcessingComplete(data);
        break;

      case 'storage_alert':
        handleStorageAlert(data);
        break;

      case 'system_status':
        handleSystemStatus(data);
        break;

      default:
        Logger.log('Unknown webhook type: ' + data.type);
    }

    return ContentService.createTextOutput('OK');

  } catch (error) {
    Logger.log('Webhook handler error: ' + error.toString());
    return ContentService.createTextOutput('ERROR: ' + error.message);
  }
}

/**
 * ENHANCED NOTIFICATION SYSTEM
 */
function sendNotification(subject, message, level = 'info') {
  try {
    const emailEnabled = getConfigValue('ENABLE_EMAIL_NOTIFICATIONS', false);
    const notificationEmail = getConfigValue('NOTIFICATION_EMAIL');
    const notificationLevel = getConfigValue('NOTIFICATION_LEVEL', 'NORMAL');
    const clubName = getConfigValue('CLUB_NAME', 'Football Club');

    if (!emailEnabled || !notificationEmail) {
      Logger.log('Email notifications disabled or no email configured');
      return;
    }

    // Check notification level
    if (notificationLevel === 'MINIMAL' && level === 'info') {
      Logger.log('Skipping info notification due to MINIMAL level setting');
      return;
    }

    const fullSubject = `[${clubName}] ${subject}`;
    const fullMessage = `${message}\n\n---\nFootball Highlights System\nTime: ${new Date().toLocaleString()}`;

    MailApp.sendEmail({
      to: notificationEmail,
      subject: fullSubject,
      body: fullMessage
    });

    Logger.log(`Notification sent to ${notificationEmail}: ${subject}`);

  } catch (error) {
    Logger.log('Notification error: ' + error.toString());
  }
}

/**
 * SYSTEM STATUS DASHBOARD UPDATE
 */
function updateDashboard() {
  try {
    const dashboardSheet = getSheetByName(SHEET_NAMES.DASHBOARD, { createIfMissing: true });

    // Clear and rebuild dashboard
    dashboardSheet.clear();

    // Header
    dashboardSheet.getRange(1, 1, 1, 4).merge();
    dashboardSheet.getRange(1, 1).setValue('🏈 Football Highlights System Dashboard');
    dashboardSheet.getRange(1, 1).setFontSize(16).setFontWeight('bold').setHorizontalAlignment('center');

    let row = 3;

    // System Status
    dashboardSheet.getRange(row, 1).setValue('System Status');
    dashboardSheet.getRange(row, 1).setFontWeight('bold');

    const configStatus = getConfigStatus();
    const statusText = configStatus.valid ? '✅ Operational' : '⚠️ Configuration Required';
    const configText = `${configStatus.configured}/${configStatus.total} settings configured (${configStatus.percentage}%)`;

    dashboardSheet.getRange(row, 2).setValue(statusText);
    dashboardSheet.getRange(row + 1, 1).setValue('Configuration');
    dashboardSheet.getRange(row + 1, 2).setValue(configText);
    row += 3;

    // Club Information
    dashboardSheet.getRange(row, 1).setValue('Club Information');
    dashboardSheet.getRange(row, 1).setFontWeight('bold');

    const clubInfo = getConfigValues([
      'CLUB_NAME', 'SEASON', 'REGION'
    ]);

    dashboardSheet.getRange(row + 1, 1).setValue('Club');
    dashboardSheet.getRange(row + 1, 2).setValue(clubInfo.CLUB_NAME || 'Not set');
    dashboardSheet.getRange(row + 2, 1).setValue('Season');
    dashboardSheet.getRange(row + 2, 2).setValue(clubInfo.SEASON || 'Not set');
    dashboardSheet.getRange(row + 3, 1).setValue('Region');
    dashboardSheet.getRange(row + 3, 2).setValue(clubInfo.REGION || 'Not set');
    row += 5;

    // Video Queue Status
    dashboardSheet.getRange(row, 1).setValue('Video Queue');
    dashboardSheet.getRange(row, 1).setFontWeight('bold');

    try {
      const queueSheet = getSheetByName(SHEET_NAMES.QUEUE);
      const queueData = queueSheet.getDataRange().getValues();
      const queueStats = analyzeVideoQueue(queueData);

      dashboardSheet.getRange(row + 1, 1).setValue('Total Videos');
      dashboardSheet.getRange(row + 1, 2).setValue(queueStats.total);
      dashboardSheet.getRange(row + 2, 1).setValue('Ready to Process');
      dashboardSheet.getRange(row + 2, 2).setValue(queueStats.ready);
      dashboardSheet.getRange(row + 3, 1).setValue('Processing');
      dashboardSheet.getRange(row + 3, 2).setValue(queueStats.processing);
      dashboardSheet.getRange(row + 4, 1).setValue('Completed');
      dashboardSheet.getRange(row + 4, 2).setValue(queueStats.completed);

    } catch (error) {
      dashboardSheet.getRange(row + 1, 1).setValue('Queue Status');
      dashboardSheet.getRange(row + 1, 2).setValue('Queue sheet not found');
    }

    // Auto-resize columns
    dashboardSheet.autoResizeColumns(1, 2);

    logActivity('Dashboard updated successfully', 'info');

  } catch (error) {
    Logger.log('Dashboard update error: ' + error.toString());
    logActivity(`Dashboard update failed: ${error.message}`, 'error');
  }
}

/**
 * HELPER FUNCTION: Analyze video queue
 */
function analyzeVideoQueue(data) {
  const stats = {
    total: Math.max(0, data.length - 1), // Subtract header row
    ready: 0,
    processing: 0,
    completed: 0,
    failed: 0
  };

  for (let i = 1; i < data.length; i++) {
    const status = data[i][4]; // Status column
    switch (status) {
      case STATUS.READY:
        stats.ready++;
        break;
      case STATUS.PROCESSING:
      case STATUS.QUEUED:
        stats.processing++;
        break;
      case STATUS.COMPLETE:
        stats.completed++;
        break;
      case STATUS.FAILED:
      case STATUS.ERROR:
        stats.failed++;
        break;
    }
  }

  return stats;
}

/**
 * ACTIVITY LOGGING - Enhanced
 */
function logActivity(message, level = 'info', details = null) {
  try {
    const activitySheet = getSheetByName(SHEET_NAMES.ACTIVITY, { createIfMissing: true });

    // Add headers if needed
    if (activitySheet.getLastRow() <= 1) {
      activitySheet.getRange(1, 1, 1, 4).setValues([
        ['Timestamp', 'Level', 'Message', 'Details']
      ]);
      activitySheet.getRange(1, 1, 1, 4).setFontWeight('bold');
    }

    // Add new log entry
    const newRow = activitySheet.getLastRow() + 1;
    activitySheet.getRange(newRow, 1, 1, 4).setValues([
      [new Date(), level.toUpperCase(), message, details || '']
    ]);

    // Color code by level
    const range = activitySheet.getRange(newRow, 1, 1, 4);
    switch (level) {
      case 'error':
        range.setBackground('#ffebee');
        break;
      case 'warning':
        range.setBackground('#fff3e0');
        break;
      case 'info':
      default:
        range.setBackground('#e8f5e8');
        break;
    }

    // Keep only last 1000 entries
    const totalRows = activitySheet.getLastRow();
    if (totalRows > 1001) {
      activitySheet.deleteRows(2, totalRows - 1001);
    }

    // Also log to console
    Logger.log(`[${level.toUpperCase()}] ${message}${details ? ` - ${details}` : ''}`);

  } catch (error) {
    Logger.log(`Activity logging error: ${error.toString()}`);
  }
}