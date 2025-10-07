/**
 * Customer Integration Script
 *
 * This is the main integration file that customers should use.
 * It provides a complete, zero-code-modification system where all
 * configuration happens through Google Sheets.
 *
 * CUSTOMER INSTRUCTIONS:
 * 1. Copy all .gs files to your Google Apps Script project
 * 2. Run the "Setup Wizard" from the spreadsheet menu
 * 3. Fill out the Config sheet with your settings
 * 4. Start using the system!
 *
 * NO CODE MODIFICATIONS REQUIRED!
 */

/**
 * ==========================================================================
 * CUSTOMER ENTRY POINTS
 * These are the functions customers interact with through the spreadsheet menu
 * ==========================================================================
 */

/**
 * Main menu function - customers should run this first
 */
function startSetup() {
  try {
    const ui = SpreadsheetApp.getUi();

    // Check if already set up
    const isSetup = PropertiesService.getScriptProperties().getProperty('SETUP_COMPLETED');

    if (isSetup === 'true') {
      const response = ui.alert(
        'System Already Set Up',
        'Your Football Highlights system appears to be already configured.\n\n' +
        'Would you like to:\n' +
        'YES - Run setup wizard again (reconfigure)\n' +
        'NO - Open system dashboard',
        ui.ButtonSet.YES_NO
      );

      if (response === ui.Button.YES) {
        runSetupWizard();
      } else {
        openDashboard();
      }
    } else {
      runSetupWizard();
    }

  } catch (error) {
    Logger.log('Start setup error: ' + error.toString());
    SpreadsheetApp.getUi().alert('Setup Error', 'An error occurred: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Quick configuration check
 */
function checkSystemStatus() {
  try {
    const configStatus = getConfigStatus();
    const ui = SpreadsheetApp.getUi();

    let statusMessage = `System Configuration Status:\n\n`;
    statusMessage += `✅ Configured: ${configStatus.configured}/${configStatus.total} settings (${configStatus.percentage}%)\n\n`;

    if (configStatus.missing.length > 0) {
      statusMessage += `❗ Missing Settings:\n`;
      configStatus.missing.forEach(setting => {
        statusMessage += `  • ${setting}\n`;
      });
      statusMessage += `\n`;
    }

    if (configStatus.valid) {
      statusMessage += `🎉 Your system is ready to use!`;
    } else {
      statusMessage += `⚠️ Please complete the missing settings in the Config sheet.`;
    }

    ui.alert('System Status', statusMessage, ui.ButtonSet.OK);

  } catch (error) {
    Logger.log('System status check error: ' + error.toString());
    SpreadsheetApp.getUi().alert('Status Error', 'Could not check system status: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Open the dashboard
 */
function openDashboard() {
  try {
    const dashboardSheet = getSheetByName(SHEET_NAMES.DASHBOARD, { createIfMissing: true });
    updateDashboard();
    getCurrentSpreadsheet().setActiveSheet(dashboardSheet);
  } catch (error) {
    Logger.log('Open dashboard error: ' + error.toString());
    SpreadsheetApp.getUi().alert('Dashboard Error', 'Could not open dashboard: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Test video processing (safe test)
 */
function testVideoProcessing() {
  try {
    const ui = SpreadsheetApp.getUi();

    // Validate configuration first
    const configStatus = getConfigStatus();
    if (!configStatus.valid) {
      ui.alert(
        'Configuration Required',
        'Please complete your system configuration before testing video processing.\n\n' +
        `Missing: ${configStatus.missing.join(', ')}`,
        ui.ButtonSet.OK
      );
      return;
    }

    // Test API connectivity
    const apiEndpoint = getApiEndpoint();
    const apiKey = getConfigValue('API_KEY');

    if (!apiEndpoint || !apiKey) {
      ui.alert(
        'API Not Configured',
        'Please configure your API connection (Railway URL and API Key) before testing video processing.',
        ui.ButtonSet.OK
      );
      return;
    }

    const response = ui.alert(
      'Test Video Processing',
      'This will test your connection to the video processing service.\n\n' +
      'No actual videos will be processed.\n\n' +
      'Continue with test?',
      ui.ButtonSet.YES_NO
    );

    if (response !== ui.Button.YES) {
      return;
    }

    // Perform connectivity test
    try {
      const testResult = makeApiCall('/health', 'GET');

      ui.alert(
        'Test Successful! ✅',
        'Your video processing service is working correctly!\n\n' +
        `Service Status: ${testResult.status || 'Online'}\n` +
        `Response Time: ${testResult.timestamp ? 'Good' : 'N/A'}\n\n` +
        'You\'re ready to process real videos!',
        ui.ButtonSet.OK
      );

      logActivity('Video processing test successful', 'info');

    } catch (error) {
      ui.alert(
        'Test Failed ❌',
        `Could not connect to your video processing service.\n\n` +
        `Error: ${error.message}\n\n` +
        `Please check:\n` +
        `• Railway/Render URL is correct\n` +
        `• API key is correct\n` +
        `• Service is deployed and running`,
        ui.ButtonSet.OK
      );

      logActivity('Video processing test failed: ' + error.message, 'error');
    }

  } catch (error) {
    Logger.log('Test video processing error: ' + error.toString());
    SpreadsheetApp.getUi().alert('Test Error', 'Test failed: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * ==========================================================================
 * SYSTEM HEALTH AND MAINTENANCE
 * ==========================================================================
 */

/**
 * System health check - comprehensive diagnostic
 */
function runSystemDiagnostic() {
  try {
    const ui = SpreadsheetApp.getUi();

    ui.alert(
      'System Diagnostic',
      'This will run a comprehensive check of your Football Highlights system.\n\n' +
      'The diagnostic will check:\n' +
      '• Configuration completeness\n' +
      '• Sheet structure\n' +
      '• Google Services access\n' +
      '• API connectivity\n\n' +
      'Results will be shown in a detailed report.',
      ui.ButtonSet.OK
    );

    const diagnostic = {
      timestamp: new Date(),
      results: [],
      overall: 'PASS',
      score: 0,
      totalChecks: 0
    };

    // Test 1: Configuration Check
    diagnostic.totalChecks++;
    try {
      const configStatus = getConfigStatus();
      if (configStatus.valid) {
        diagnostic.results.push('✅ Configuration: All required settings complete');
        diagnostic.score++;
      } else {
        diagnostic.results.push(`❌ Configuration: ${configStatus.missing.length} missing settings`);
        diagnostic.overall = 'FAIL';
      }
    } catch (error) {
      diagnostic.results.push('❌ Configuration: Error checking config - ' + error.message);
      diagnostic.overall = 'FAIL';
    }

    // Test 2: Sheet Structure
    diagnostic.totalChecks++;
    try {
      const requiredSheets = ['Config', 'Video Queue', 'Dashboard', 'Activity Log'];
      const spreadsheet = getCurrentSpreadsheet();
      const missingSheets = [];

      requiredSheets.forEach(sheetName => {
        if (!spreadsheet.getSheetByName(sheetName)) {
          missingSheets.push(sheetName);
        }
      });

      if (missingSheets.length === 0) {
        diagnostic.results.push('✅ Sheet Structure: All required sheets present');
        diagnostic.score++;
      } else {
        diagnostic.results.push(`❌ Sheet Structure: Missing sheets - ${missingSheets.join(', ')}`);
        diagnostic.overall = 'FAIL';
      }
    } catch (error) {
      diagnostic.results.push('❌ Sheet Structure: Error checking sheets - ' + error.message);
      diagnostic.overall = 'FAIL';
    }

    // Test 3: Google Drive Access
    diagnostic.totalChecks++;
    try {
      const driveFolderId = getConfigValue('DRIVE_FOLDER_ID');
      if (driveFolderId) {
        const folder = DriveApp.getFolderById(driveFolderId);
        diagnostic.results.push(`✅ Google Drive: Access confirmed - "${folder.getName()}"`);
        diagnostic.score++;
      } else {
        diagnostic.results.push('⚠️ Google Drive: No folder configured (optional)');
        diagnostic.score++;
      }
    } catch (error) {
      diagnostic.results.push('❌ Google Drive: Cannot access configured folder - ' + error.message);
    }

    // Test 4: API Connectivity
    diagnostic.totalChecks++;
    try {
      const apiEndpoint = getApiEndpoint();
      const apiKey = getConfigValue('API_KEY');

      if (apiEndpoint && apiKey) {
        const testResult = makeApiCall('/health', 'GET');
        diagnostic.results.push('✅ API Connectivity: Service responding correctly');
        diagnostic.score++;
      } else {
        diagnostic.results.push('⚠️ API Connectivity: Not configured (can configure later)');
        diagnostic.score++;
      }
    } catch (error) {
      diagnostic.results.push('❌ API Connectivity: Cannot reach service - ' + error.message);
    }

    // Test 5: Email Notifications
    diagnostic.totalChecks++;
    try {
      const emailEnabled = getConfigValue('ENABLE_EMAIL_NOTIFICATIONS');
      const notificationEmail = getConfigValue('NOTIFICATION_EMAIL');

      if (emailEnabled && notificationEmail) {
        if (validateEmail(notificationEmail)) {
          diagnostic.results.push('✅ Email Notifications: Configured with valid email');
          diagnostic.score++;
        } else {
          diagnostic.results.push('❌ Email Notifications: Invalid email address');
        }
      } else {
        diagnostic.results.push('⚠️ Email Notifications: Not configured (optional)');
        diagnostic.score++;
      }
    } catch (error) {
      diagnostic.results.push('❌ Email Notifications: Error checking settings - ' + error.message);
    }

    // Calculate final score
    const percentage = Math.round((diagnostic.score / diagnostic.totalChecks) * 100);

    // Display results
    let reportMessage = `System Diagnostic Results\n`;
    reportMessage += `Overall Status: ${diagnostic.overall}\n`;
    reportMessage += `Health Score: ${diagnostic.score}/${diagnostic.totalChecks} (${percentage}%)\n\n`;
    reportMessage += `Detailed Results:\n`;
    diagnostic.results.forEach(result => {
      reportMessage += `${result}\n`;
    });

    ui.alert('Diagnostic Complete', reportMessage, ui.ButtonSet.OK);

    // Log diagnostic results
    logActivity(`System diagnostic completed - ${percentage}% health score`, 'info', JSON.stringify(diagnostic));

  } catch (error) {
    Logger.log('System diagnostic error: ' + error.toString());
    SpreadsheetApp.getUi().alert('Diagnostic Error', 'Diagnostic failed: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * ==========================================================================
 * CUSTOMER SUPPORT AND TROUBLESHOOTING
 * ==========================================================================
 */

/**
 * Generate support information
 */
function generateSupportInfo() {
  try {
    const ui = SpreadsheetApp.getUi();

    const response = ui.alert(
      'Support Information',
      'This will generate a support report with your system configuration.\n\n' +
      'The report will NOT include:\n' +
      '• API keys or passwords\n' +
      '• Personal information\n' +
      '• Video content\n\n' +
      'Generate support report?',
      ui.ButtonSet.YES_NO
    );

    if (response !== ui.Button.YES) {
      return;
    }

    const supportInfo = {
      timestamp: new Date().toISOString(),
      spreadsheetId: getCurrentSpreadsheet().getId(),
      spreadsheetName: getCurrentSpreadsheet().getName(),
      scriptId: ScriptApp.getScriptId(),
      configurationStatus: getConfigStatus(),
      systemInfo: {
        hasConfigSheet: !!getCurrentSpreadsheet().getSheetByName('Config'),
        hasVideoQueue: !!getCurrentSpreadsheet().getSheetByName('Video Queue'),
        hasDashboard: !!getCurrentSpreadsheet().getSheetByName('Dashboard'),
        setupCompleted: PropertiesService.getScriptProperties().getProperty('SETUP_COMPLETED') === 'true'
      },
      publicConfiguration: {
        clubName: getConfigValue('CLUB_NAME', 'Not set'),
        season: getConfigValue('SEASON', 'Not set'),
        region: getConfigValue('REGION', 'Not set'),
        hasApiUrl: !!getConfigValue('RAILWAY_URL'),
        hasApiKey: !!getConfigValue('API_KEY'),
        hasNotificationEmail: !!getConfigValue('NOTIFICATION_EMAIL'),
        hasDriveFolder: !!getConfigValue('DRIVE_FOLDER_ID')
      }
    };

    // Create support sheet
    const spreadsheet = getCurrentSpreadsheet();
    let supportSheet = spreadsheet.getSheetByName('Support Info');
    if (!supportSheet) {
      supportSheet = spreadsheet.insertSheet('Support Info');
    } else {
      supportSheet.clear();
    }

    // Add support information to sheet
    supportSheet.getRange(1, 1).setValue('🔧 Support Information');
    supportSheet.getRange(1, 1).setFontWeight('bold').setFontSize(14);

    let row = 3;
    supportSheet.getRange(row, 1, 1, 2).setValues([['Generated', supportInfo.timestamp]]);
    row++;
    supportSheet.getRange(row, 1, 1, 2).setValues([['Spreadsheet Name', supportInfo.spreadsheetName]]);
    row++;
    supportSheet.getRange(row, 1, 1, 2).setValues([['Configuration Status', `${supportInfo.configurationStatus.percentage}% complete`]]);
    row++;

    if (supportInfo.configurationStatus.missing.length > 0) {
      supportSheet.getRange(row, 1, 1, 2).setValues([['Missing Settings', supportInfo.configurationStatus.missing.join(', ')]]);
      row++;
    }

    row++;
    supportSheet.getRange(row, 1).setValue('System Components').setFontWeight('bold');
    row++;
    Object.entries(supportInfo.systemInfo).forEach(([key, value]) => {
      supportSheet.getRange(row, 1, 1, 2).setValues([[key, value ? '✅ Present' : '❌ Missing']]);
      row++;
    });

    row++;
    supportSheet.getRange(row, 1).setValue('Configuration Summary').setFontWeight('bold');
    row++;
    Object.entries(supportInfo.publicConfiguration).forEach(([key, value]) => {
      let displayValue = value;
      if (typeof value === 'boolean') {
        displayValue = value ? '✅ Configured' : '❌ Not configured';
      }
      supportSheet.getRange(row, 1, 1, 2).setValues([[key, displayValue]]);
      row++;
    });

    // Auto-resize columns
    supportSheet.autoResizeColumns(1, 2);

    // Switch to support sheet
    spreadsheet.setActiveSheet(supportSheet);

    ui.alert(
      'Support Report Generated',
      'A support report has been created in the "Support Info" sheet.\n\n' +
      'If you need help, please share this information with support.',
      ui.ButtonSet.OK
    );

  } catch (error) {
    Logger.log('Generate support info error: ' + error.toString());
    SpreadsheetApp.getUi().alert('Support Error', 'Could not generate support info: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Reset system configuration
 */
function resetSystemConfiguration() {
  try {
    const ui = SpreadsheetApp.getUi();

    const response = ui.alert(
      '⚠️ Reset Configuration',
      'This will reset your system configuration and delete all settings.\n\n' +
      '⚠️ WARNING: This action cannot be undone!\n\n' +
      'Your video queue and activity logs will be preserved.\n\n' +
      'Are you sure you want to reset the configuration?',
      ui.ButtonSet.YES_NO
    );

    if (response !== ui.Button.YES) {
      return;
    }

    const confirmResponse = ui.alert(
      '⚠️ Final Confirmation',
      'This is your final chance to cancel.\n\n' +
      'Clicking YES will:\n' +
      '• Delete all configuration settings\n' +
      '• Reset the Config sheet\n' +
      '• Clear setup status\n\n' +
      'Continue with reset?',
      ui.ButtonSet.YES_NO
    );

    if (confirmResponse !== ui.Button.YES) {
      return;
    }

    // Clear configuration
    clearConfigCache();
    PropertiesService.getScriptProperties().deleteProperty('SETUP_COMPLETED');

    // Reset Config sheet
    const configSheet = getCurrentSpreadsheet().getSheetByName('Config');
    if (configSheet) {
      configSheet.clear();
      createConfigSheet();
    }

    // Log the reset
    logActivity('System configuration was reset by user', 'warning');

    ui.alert(
      'Configuration Reset Complete',
      'Your system configuration has been reset.\n\n' +
      'To set up the system again, run the Setup Wizard from the menu.',
      ui.ButtonSet.OK
    );

  } catch (error) {
    Logger.log('Reset configuration error: ' + error.toString());
    SpreadsheetApp.getUi().alert('Reset Error', 'Could not reset configuration: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * ==========================================================================
 * SYSTEM INITIALIZATION
 * This ensures everything is ready when the spreadsheet opens
 * ==========================================================================
 */

/**
 * Enhanced onOpen - integrates all customer functionality
 */
function onOpen() {
  try {
    // Initialize configuration system
    try {
      initializeConfigSystem();
    } catch (error) {
      Logger.log('Config system initialization error: ' + error.toString());
      // Don't fail onOpen completely if config system has issues
    }

    const ui = SpreadsheetApp.getUi();
    const isSetup = PropertiesService.getScriptProperties().getProperty('SETUP_COMPLETED') === 'true';

    if (isSetup) {
      // Full menu for set up systems
      ui.createMenu('🏈 Football Highlights')
        .addItem('📊 Open Dashboard', 'openDashboard')
        .addItem('🎬 Process Video Queue', 'processVideoQueue')
        .addSeparator()
        .addItem('📝 Validate Match Notes', 'validateAllMatchNotes')
        .addItem('🔄 Update Dashboard', 'updateDashboard')
        .addSeparator()
        .addItem('⚙️ Check System Status', 'checkSystemStatus')
        .addItem('🧪 Test Video Processing', 'testVideoProcessing')
        .addItem('🔍 Run System Diagnostic', 'runSystemDiagnostic')
        .addSeparator()
        .addItem('📧 Send Test Email', 'sendTestNotification')
        .addItem('🔄 Refresh Storage Info', 'refreshStorageInfo')
        .addSeparator()
        .addSubMenu(ui.createMenu('Advanced')
          .addItem('🛠️ Reconfigure System', 'startSetup')
          .addItem('📋 Generate Support Info', 'generateSupportInfo')
          .addItem('⚠️ Reset Configuration', 'resetSystemConfiguration'))
        .addToUi();
    } else {
      // Simplified menu for new installations
      ui.createMenu('🏈 Football Highlights')
        .addItem('🚀 Start Setup', 'startSetup')
        .addItem('⚙️ Check Status', 'checkSystemStatus')
        .addSeparator()
        .addItem('📋 Support Info', 'generateSupportInfo')
        .addToUi();
    }

    // Show appropriate welcome message
    if (!isSetup) {
      checkAndShowWelcomeMessage();
    }

  } catch (error) {
    Logger.log('onOpen error: ' + error.toString());
    // Create basic menu even if there are errors
    try {
      SpreadsheetApp.getUi().createMenu('🏈 Football Highlights')
        .addItem('🚀 Start Setup', 'startSetup')
        .addItem('📋 Support Info', 'generateSupportInfo')
        .addToUi();
    } catch (menuError) {
      Logger.log('Menu creation error: ' + menuError.toString());
    }
  }
}

/**
 * ==========================================================================
 * CUSTOMER DOCUMENTATION AND HELP
 * ==========================================================================
 */

/**
 * Show help information
 */
function showHelp() {
  try {
    const ui = SpreadsheetApp.getUi();

    const helpMessage = `🏈 Football Highlights System Help

Getting Started:
1. Run "Start Setup" from the menu to configure your system
2. Fill out the Config sheet with your details
3. Add videos to the Video Queue
4. Process your first video!

Key Features:
• Automatic video processing and highlights generation
• Match notes and player statistics tracking
• Google Drive integration for storage
• Email notifications for processing completion
• Dashboard with system status and analytics

Need Help?
• Use "Check System Status" to verify your configuration
• Use "Run System Diagnostic" to troubleshoot issues
• Use "Generate Support Info" to get help from support

Configuration:
All settings are in the Config sheet - no code editing required!

Support:
If you need assistance, generate a support report and contact your system administrator.`;

    ui.alert('Help', helpMessage, ui.ButtonSet.OK);

  } catch (error) {
    Logger.log('Show help error: ' + error.toString());
  }
}