/**
 * Customer Installation Setup Wizard
 *
 * This wizard guides customers through the complete setup process
 * without requiring any code modifications. It creates all necessary
 * sheets, validates configuration, and tests system connectivity.
 */

/**
 * Main setup wizard entry point
 */
function runSetupWizard() {
  try {
    const ui = SpreadsheetApp.getUi();

    // Welcome screen
    const welcomeResponse = ui.alert(
      '🏈 Welcome to Football Highlights Setup!',
      'This wizard will guide you through setting up your Football Highlights system.\n\n' +
      'The setup process includes:\n' +
      '✓ Creating configuration sheets\n' +
      '✓ Guiding you through essential settings\n' +
      '✓ Testing system connectivity\n' +
      '✓ Creating all necessary sheets\n\n' +
      'This will take about 5-10 minutes. Ready to start?',
      ui.ButtonSet.YES_NO
    );

    if (welcomeResponse !== ui.Button.YES) {
      return;
    }

    // Run setup steps
    const setupSteps = [
      { name: 'Detecting Spreadsheet', action: detectSpreadsheetInfo },
      { name: 'Creating Config Sheet', action: createConfigurationSheet },
      { name: 'Collecting Basic Information', action: collectBasicInformation },
      { name: 'Configuring API Connection', action: configureApiConnection },
      { name: 'Setting up Google Services', action: setupGoogleServices },
      { name: 'Configuring Notifications', action: setupNotifications },
      { name: 'Creating System Sheets', action: createSystemSheets },
      { name: 'Testing Connectivity', action: testSystemConnectivity },
      { name: 'Finalizing Setup', action: finalizeSetup }
    ];

    let currentStep = 1;
    const totalSteps = setupSteps.length;

    for (const step of setupSteps) {
      try {
        showProgressMessage(`Step ${currentStep}/${totalSteps}: ${step.name}...`);

        const result = step.action();
        if (result === false) {
          // User cancelled or step failed
          ui.alert(
            'Setup Cancelled',
            'Setup was cancelled. You can run the setup wizard again at any time from the menu.',
            ui.ButtonSet.OK
          );
          return;
        }

        currentStep++;
        Utilities.sleep(500); // Brief pause for user experience

      } catch (error) {
        Logger.log(`Setup step error: ${step.name} - ${error.toString()}`);

        const retryResponse = ui.alert(
          'Setup Error',
          `An error occurred during: ${step.name}\n\nError: ${error.message}\n\nWould you like to retry this step?`,
          ui.ButtonSet.YES_NO
        );

        if (retryResponse === ui.Button.YES) {
          currentStep--; // Retry this step
        } else {
          ui.alert(
            'Setup Incomplete',
            'Setup was not completed. Please check the configuration manually or contact support.',
            ui.ButtonSet.OK
          );
          return;
        }
      }
    }

    // Setup complete
    ui.alert(
      '🎉 Setup Complete!',
      'Congratulations! Your Football Highlights system is now fully configured and ready to use.\n\n' +
      'Next steps:\n' +
      '1. Check the Dashboard sheet for system status\n' +
      '2. Add your first video to the Video Queue\n' +
      '3. Fill in match notes and process your video\n\n' +
      'Need help? Check the Activity Log for any issues.',
      ui.ButtonSet.OK
    );

    // Open dashboard
    const dashboardSheet = getSheetByName(SHEET_NAMES.DASHBOARD);
    getCurrentSpreadsheet().setActiveSheet(dashboardSheet);
    updateDashboard();

  } catch (error) {
    Logger.log('Setup wizard error: ' + error.toString());
    SpreadsheetApp.getUi().alert(
      'Setup Error',
      'An unexpected error occurred during setup: ' + error.message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Step 1: Detect spreadsheet information
 */
function detectSpreadsheetInfo() {
  try {
    const spreadsheet = getCurrentSpreadsheet();
    const spreadsheetId = spreadsheet.getId();
    const spreadsheetName = spreadsheet.getName();

    Logger.log(`Detected spreadsheet: ${spreadsheetName} (${spreadsheetId})`);

    // Store information for later use
    PropertiesService.getScriptProperties().setProperties({
      'CURRENT_SPREADSHEET_ID': spreadsheetId,
      'SPREADSHEET_NAME': spreadsheetName,
      'SETUP_TIMESTAMP': new Date().toISOString()
    });

    return true;
  } catch (error) {
    Logger.log('Error detecting spreadsheet info: ' + error.toString());
    throw error;
  }
}

/**
 * Step 2: Create configuration sheet
 */
function createConfigurationSheet() {
  try {
    const spreadsheet = getCurrentSpreadsheet();

    // Check if Config sheet already exists
    let configSheet = spreadsheet.getSheetByName('Config');
    if (configSheet) {
      const ui = SpreadsheetApp.getUi();
      const response = ui.alert(
        'Config Sheet Exists',
        'A Config sheet already exists. Would you like to:\n\n' +
        'YES - Keep existing configuration\n' +
        'NO - Reset and create new configuration',
        ui.ButtonSet.YES_NO
      );

      if (response === ui.Button.NO) {
        configSheet.clear();
        createConfigSheet();
      }
    } else {
      createConfigSheet();
    }

    return true;
  } catch (error) {
    Logger.log('Error creating config sheet: ' + error.toString());
    throw error;
  }
}

/**
 * Step 3: Collect basic information
 */
function collectBasicInformation() {
  try {
    const ui = SpreadsheetApp.getUi();

    // Club name
    const clubResponse = ui.prompt(
      'Club Information',
      'What is your football club name?\n\nThis will appear in notifications and video titles.',
      ui.ButtonSet.OK_CANCEL
    );

    if (clubResponse.getSelectedButton() !== ui.Button.OK) {
      return false;
    }

    const clubName = clubResponse.getResponseText().trim();
    if (!clubName) {
      ui.alert('Error', 'Club name is required.', ui.ButtonSet.OK);
      return false;
    }

    // Season
    const currentYear = new Date().getFullYear();
    const defaultSeason = `${currentYear}-${(currentYear + 1).toString().slice(2)}`;

    const seasonResponse = ui.prompt(
      'Season Information',
      `What season are you tracking?\n\nDefault: ${defaultSeason}`,
      ui.ButtonSet.OK_CANCEL
    );

    if (seasonResponse.getSelectedButton() !== ui.Button.OK) {
      return false;
    }

    const season = seasonResponse.getResponseText().trim() || defaultSeason;

    // Region/League
    const regionResponse = ui.prompt(
      'League Information',
      'What league or region do you play in?\n\nExample: "Local Youth League", "Division 2", etc.',
      ui.ButtonSet.OK_CANCEL
    );

    if (regionResponse.getSelectedButton() !== ui.Button.OK) {
      return false;
    }

    const region = regionResponse.getResponseText().trim();

    // Save to config
    setConfigValue('CLUB_NAME', clubName);
    setConfigValue('SEASON', season);
    setConfigValue('REGION', region);

    return true;
  } catch (error) {
    Logger.log('Error collecting basic information: ' + error.toString());
    throw error;
  }
}

/**
 * Step 4: Configure API connection
 */
function configureApiConnection() {
  try {
    const ui = SpreadsheetApp.getUi();

    ui.alert(
      'API Configuration',
      'Now we need to configure your video processing service.\n\n' +
      'You should have received deployment URLs when you set up your Railway/Render service.\n\n' +
      'If you haven\'t deployed the backend service yet, you can skip this step and configure it later.',
      ui.ButtonSet.OK
    );

    // Railway URL
    const railwayResponse = ui.prompt(
      'Railway Configuration',
      'Enter your Railway app URL:\n\nExample: https://your-app.railway.app\n\n(Leave blank to skip)',
      ui.ButtonSet.OK_CANCEL
    );

    if (railwayResponse.getSelectedButton() !== ui.Button.OK) {
      return false;
    }

    const railwayUrl = railwayResponse.getResponseText().trim();

    if (railwayUrl && !isValidUrl(railwayUrl)) {
      ui.alert('Error', 'Please enter a valid URL starting with https://', ui.ButtonSet.OK);
      return false;
    }

    // API Key
    const apiKeyResponse = ui.prompt(
      'API Authentication',
      'Enter your API authentication key:\n\n' +
      'This is the secret key used to secure communication between your spreadsheet and the processing service.\n\n' +
      '(You can generate one or use any secure string)',
      ui.ButtonSet.OK_CANCEL
    );

    if (apiKeyResponse.getSelectedButton() !== ui.Button.OK) {
      return false;
    }

    const apiKey = apiKeyResponse.getResponseText().trim();

    // Save configuration
    if (railwayUrl) {
      setConfigValue('RAILWAY_URL', railwayUrl);
    }
    if (apiKey) {
      setConfigValue('API_KEY', apiKey);
    }

    return true;
  } catch (error) {
    Logger.log('Error configuring API connection: ' + error.toString());
    throw error;
  }
}

/**
 * Step 5: Setup Google Services
 */
function setupGoogleServices() {
  try {
    const ui = SpreadsheetApp.getUi();

    ui.alert(
      'Google Drive Setup',
      'Now we need to configure Google Drive for video storage.\n\n' +
      'You\'ll need to create a Google Drive folder for storing your processed videos.\n\n' +
      'Instructions:\n' +
      '1. Go to drive.google.com\n' +
      '2. Create a new folder (e.g., "Football Highlights 2024")\n' +
      '3. Right-click the folder and select "Share"\n' +
      '4. Copy the folder ID from the URL',
      ui.ButtonSet.OK
    );

    // Drive Folder ID
    const driveResponse = ui.prompt(
      'Google Drive Folder',
      'Enter your Google Drive folder ID:\n\n' +
      'The folder ID is the long string in the URL after /folders/\n\n' +
      'Example: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms\n\n' +
      '(Leave blank to configure later)',
      ui.ButtonSet.OK_CANCEL
    );

    if (driveResponse.getSelectedButton() !== ui.Button.OK) {
      return false;
    }

    const driveFolderId = driveResponse.getResponseText().trim();

    // Validate folder ID format
    if (driveFolderId && !/^[a-zA-Z0-9_-]{25,}$/.test(driveFolderId)) {
      const continueResponse = ui.alert(
        'Invalid Folder ID?',
        'The folder ID format looks unusual. It should be a long string of letters, numbers, and dashes.\n\n' +
        'Continue anyway?',
        ui.ButtonSet.YES_NO
      );

      if (continueResponse !== ui.Button.YES) {
        return false;
      }
    }

    // Test folder access if ID provided
    if (driveFolderId) {
      try {
        const folder = DriveApp.getFolderById(driveFolderId);
        const folderName = folder.getName();

        ui.alert(
          'Folder Access Confirmed',
          `Successfully accessed folder: "${folderName}"\n\nThis folder will be used for video storage.`,
          ui.ButtonSet.OK
        );

        setConfigValue('DRIVE_FOLDER_ID', driveFolderId);

      } catch (error) {
        ui.alert(
          'Folder Access Error',
          `Cannot access the specified folder. Please check:\n\n` +
          `1. The folder ID is correct\n` +
          `2. The folder is shared with this account\n` +
          `3. You have permission to access it\n\n` +
          `Error: ${error.message}`,
          ui.ButtonSet.OK
        );

        // Allow user to continue without setting folder ID
        const continueResponse = ui.alert(
          'Continue Setup?',
          'Would you like to continue setup without configuring Drive storage?\n\nYou can configure this later.',
          ui.ButtonSet.YES_NO
        );

        if (continueResponse !== ui.Button.YES) {
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    Logger.log('Error setting up Google services: ' + error.toString());
    throw error;
  }
}

/**
 * Step 6: Setup notifications
 */
function setupNotifications() {
  try {
    const ui = SpreadsheetApp.getUi();

    // Notification email
    const emailResponse = ui.prompt(
      'Email Notifications',
      'Enter your email address for system notifications:\n\n' +
      'You\'ll receive alerts when:\n' +
      '• Videos finish processing\n' +
      '• System errors occur\n' +
      '• Storage alerts trigger\n\n' +
      'Email address:',
      ui.ButtonSet.OK_CANCEL
    );

    if (emailResponse.getSelectedButton() !== ui.Button.OK) {
      return false;
    }

    const email = emailResponse.getResponseText().trim();

    if (email && !validateEmail(email)) {
      ui.alert('Error', 'Please enter a valid email address.', ui.ButtonSet.OK);
      return false;
    }

    // Notification level
    const levelResponse = ui.alert(
      'Notification Level',
      'How many notifications would you like to receive?\n\n' +
      'YES - Normal (recommended): Important events and errors\n' +
      'NO - Minimal: Only critical errors and completions',
      ui.ButtonSet.YES_NO
    );

    const notificationLevel = levelResponse === ui.Button.YES ? 'NORMAL' : 'MINIMAL';

    // Save settings
    if (email) {
      setConfigValue('NOTIFICATION_EMAIL', email);
      setConfigValue('ENABLE_EMAIL_NOTIFICATIONS', 'YES');
      setConfigValue('NOTIFICATION_LEVEL', notificationLevel);
    }

    return true;
  } catch (error) {
    Logger.log('Error setting up notifications: ' + error.toString());
    throw error;
  }
}

/**
 * Step 7: Create system sheets
 */
function createSystemSheets() {
  try {
    const sheetsToCreate = [
      { name: 'Video Queue', setup: setupVideoQueueSheet },
      { name: 'Match Notes', setup: setupMatchNotesSheet },
      { name: 'Activity Log', setup: setupActivityLogSheet },
      { name: 'Storage Info', setup: setupStorageInfoSheet },
      { name: 'Dashboard', setup: setupDashboardSheet }
    ];

    const spreadsheet = getCurrentSpreadsheet();

    sheetsToCreate.forEach(sheetInfo => {
      let sheet = spreadsheet.getSheetByName(sheetInfo.name);

      if (!sheet) {
        Logger.log(`Creating sheet: ${sheetInfo.name}`);
        sheet = spreadsheet.insertSheet(sheetInfo.name);
      }

      // Set up the sheet structure
      sheetInfo.setup(sheet);
    });

    return true;
  } catch (error) {
    Logger.log('Error creating system sheets: ' + error.toString());
    throw error;
  }
}

/**
 * Step 8: Test system connectivity
 */
function testSystemConnectivity() {
  try {
    const ui = SpreadsheetApp.getUi();

    const railwayUrl = getConfigValue('RAILWAY_URL');
    const apiKey = getConfigValue('API_KEY');

    if (!railwayUrl || !apiKey) {
      ui.alert(
        'Connectivity Test Skipped',
        'API configuration is incomplete. Connectivity test will be skipped.\n\n' +
        'You can test the connection later after configuring your API settings.',
        ui.ButtonSet.OK
      );
      return true;
    }

    showProgressMessage('Testing API connection...');

    try {
      // Test basic connectivity
      const response = makeApiCall('/health', 'GET');

      ui.alert(
        'Connection Test Successful ✅',
        `Successfully connected to your video processing service!\n\n` +
        `Service Status: ${response.status || 'Online'}\n` +
        `Version: ${response.version || 'Unknown'}\n\n` +
        `Your system is ready to process videos.`,
        ui.ButtonSet.OK
      );

      logActivity('API connectivity test successful', 'info');

    } catch (error) {
      Logger.log('Connectivity test failed: ' + error.toString());

      const continueResponse = ui.alert(
        'Connection Test Failed ⚠️',
        `Could not connect to your video processing service.\n\n` +
        `Error: ${error.message}\n\n` +
        `This might be because:\n` +
        `• The service is not deployed yet\n` +
        `• The URL is incorrect\n` +
        `• The API key is wrong\n\n` +
        `Continue setup anyway?`,
        ui.ButtonSet.YES_NO
      );

      if (continueResponse !== ui.Button.YES) {
        return false;
      }

      logActivity('API connectivity test failed: ' + error.message, 'warning');
    }

    return true;
  } catch (error) {
    Logger.log('Error testing connectivity: ' + error.toString());
    throw error;
  }
}

/**
 * Step 9: Finalize setup
 */
function finalizeSetup() {
  try {
    // Update configuration timestamp
    const configSheet = getSheetByName('Config');
    const timestampRow = findConfigItemRow(configSheet, 'Config Last Updated');
    if (timestampRow) {
      configSheet.getRange(timestampRow, 2).setValue(new Date());
    }

    // Validate final configuration
    const configStatus = getConfigStatus();

    // Log setup completion
    logActivity(`Setup wizard completed - ${configStatus.percentage}% configured`, 'info');

    // Set up initial dashboard
    updateDashboard();

    // Store setup completion flag
    PropertiesService.getScriptProperties().setProperty('SETUP_COMPLETED', 'true');

    return true;
  } catch (error) {
    Logger.log('Error finalizing setup: ' + error.toString());
    throw error;
  }
}

/**
 * Helper Functions
 */

function showProgressMessage(message) {
  Logger.log(`Setup Progress: ${message}`);
  // Note: Google Apps Script doesn't have a built-in progress dialog
  // This would show in the execution log
}

function setupVideoQueueSheet(sheet) {
  sheet.clear();
  const headers = [
    'Video ID', 'Match Name', 'Video URL', 'Notes', 'Status', 'Last Updated', 'Error Message'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f0f0f0');

  // Set column widths
  sheet.setColumnWidth(1, 100);
  sheet.setColumnWidth(2, 200);
  sheet.setColumnWidth(3, 300);
  sheet.setColumnWidth(4, 300);
  sheet.setColumnWidth(5, 100);
  sheet.setColumnWidth(6, 150);
  sheet.setColumnWidth(7, 200);
}

function setupMatchNotesSheet(sheet) {
  sheet.clear();
  const headers = [
    'Match Date', 'Opposition', 'Home/Away', 'Score', 'Notes', 'Key Events', 'Players'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f0f0f0');

  sheet.autoResizeColumns(1, headers.length);
}

function setupActivityLogSheet(sheet) {
  sheet.clear();
  const headers = ['Timestamp', 'Level', 'Message', 'Details'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f0f0f0');

  sheet.autoResizeColumns(1, headers.length);
}

function setupStorageInfoSheet(sheet) {
  sheet.clear();
  const headers = ['Storage Item', 'Value', 'Last Updated', 'Status'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f0f0f0');

  sheet.autoResizeColumns(1, headers.length);
}

function setupDashboardSheet(sheet) {
  sheet.clear();
  // Dashboard content will be populated by updateDashboard()
}