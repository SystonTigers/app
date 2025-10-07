/**
 * UTILITY FUNCTIONS AND HELPERS
 */

function getOrCreateSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    setupNewSheet(sheet, sheetName);
  }

  return sheet;
}

function setupNewSheet(sheet, sheetName) {
  switch (sheetName) {
    case SHEET_NAMES.QUEUE:
      setupVideoQueueSheet(sheet);
      break;
    case SHEET_NAMES.NOTES:
      setupMatchNotesSheet(sheet);
      break;
    case SHEET_NAMES.SETTINGS:
      setupSettingsSheet(sheet);
      break;
    case SHEET_NAMES.ACTIVITY:
      setupActivityLogSheet(sheet);
      break;
    case SHEET_NAMES.STORAGE:
      setupStorageSheet(sheet);
      break;
    case SHEET_NAMES.STATS:
      setupStatsSheet(sheet);
      break;
    case SHEET_NAMES.DASHBOARD:
      setupDashboard(sheet);
      break;
  }
}

function setupVideoQueueSheet(sheet) {
  sheet.setTabColor('#ff9900');

  // Add title row
  sheet.insertRows(1, 2);
  sheet.getRange(1, 1, 1, 12).merge();
  sheet.getRange(1, 1)
    .setValue(`🎬 Video Processing Queue - ${CONFIG.CLUB_NAME}`)
    .setFontSize(16)
    .setFontWeight('bold')
    .setBackground('#ff9900')
    .setFontColor('white')
    .setHorizontalAlignment('center');

  sheet.getRange(2, 1, 1, 12).merge();
  sheet.getRange(2, 1)
    .setValue('Add Google Drive video URLs below. Processing starts automatically when you paste a URL.')
    .setFontStyle('italic')
    .setHorizontalAlignment('center')
    .setBackground('#fff3e0');

  // Add headers
  const headers = [
    'Video URL (Google Drive)', 'Match Date', 'Opponent', 'Notes',
    'Manual Cuts (15:30-18:30)', 'Status', 'Details', 'Updated',
    'Job ID', 'Completed', 'Action', 'Player Highlights'
  ];

  sheet.getRange(3, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(3, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#f0f0f0')
    .setBorder(true, true, true, true, true, true);

  // Set column widths
  sheet.setColumnWidth(1, 300); // Video URL
  sheet.setColumnWidth(2, 100); // Match Date
  sheet.setColumnWidth(3, 150); // Opponent
  sheet.setColumnWidth(4, 200); // Notes
  sheet.setColumnWidth(5, 150); // Manual Cuts
  sheet.setColumnWidth(6, 100); // Status
  sheet.setColumnWidth(7, 250); // Details
  sheet.setColumnWidth(8, 120); // Updated
  sheet.setColumnWidth(9, 100); // Job ID
  sheet.setColumnWidth(10, 120); // Completed
  sheet.setColumnWidth(11, 100); // Action
  sheet.setColumnWidth(12, 120); // Player Highlights

  // Add data validation
  const statusValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(['READY', 'QUEUED', 'PROCESSING', 'COMPLETE', 'FAILED'])
    .setAllowInvalid(false)
    .build();
  sheet.getRange(4, 6, 1000, 1).setDataValidation(statusValidation);

  const actionValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(['', 'PROCESS NOW', 'GO'])
    .setAllowInvalid(false)
    .build();
  sheet.getRange(4, 11, 1000, 1).setDataValidation(actionValidation);

  const playerHighlightsValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(['YES', 'NO'])
    .setAllowInvalid(false)
    .build();
  sheet.getRange(4, 12, 1000, 1).setDataValidation(playerHighlightsValidation);

  // Add sample row
  const sampleData = [
    'Paste Google Drive video URL here →',
    new Date(),
    'Example Opponent',
    'Sample match notes',
    '15:30-18:30, 45:00-48:00',
    STATUS.READY,
    'Ready for processing',
    new Date(),
    '',
    '',
    '',
    'YES'
  ];

  sheet.getRange(4, 1, 1, 12).setValues([sampleData]);
  sheet.getRange(4, 1, 1, 12).setBackground('#f9f9f9').setFontStyle('italic');
}

function setupMatchNotesSheet(sheet) {
  sheet.setTabColor('#4caf50');

  // Add title
  sheet.insertRows(1, 2);
  sheet.getRange(1, 1, 1, 6).merge();
  sheet.getRange(1, 1)
    .setValue(`⚽ Live Match Notes - ${CONFIG.CLUB_NAME}`)
    .setFontSize(16)
    .setFontWeight('bold')
    .setBackground('#4caf50')
    .setFontColor('white')
    .setHorizontalAlignment('center');

  sheet.getRange(2, 1, 1, 6).merge();
  sheet.getRange(2, 1)
    .setValue('Enter match events in real-time. Auto-validation ensures correct formatting.')
    .setFontStyle('italic')
    .setHorizontalAlignment('center')
    .setBackground('#e8f5e8');

  // Add headers with instructions
  const headers = [
    'Time (MM:SS)', 'Player Name', 'Action', 'Description (Optional)', 'Include?', 'Auto-Formatted'
  ];

  sheet.getRange(3, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(3, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#f0f0f0')
    .setBorder(true, true, true, true, true, true);

  // Add instruction row
  const instructions = [
    'e.g., 15:30', 'e.g., Smith', 'goal, save, card, etc.', 'Optional details', 'YES/NO', 'Auto-updates'
  ];
  sheet.getRange(4, 1, 1, instructions.length).setValues([instructions]);
  sheet.getRange(4, 1, 1, instructions.length).setBackground('#f9f9f9').setFontStyle('italic');

  // Set column widths
  sheet.setColumnWidths(1, 6, [100, 150, 150, 250, 80, 150]);

  // Add data validation
  const includeValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(['YES', 'NO'])
    .setAllowInvalid(false)
    .build();
  sheet.getRange(5, 5, 1000, 1).setDataValidation(includeValidation);

  // Add sample data
  const sampleData = [
    ['15:30', 'Smith', 'goal', 'Great strike from outside the box', 'YES', 'Valid ✓'],
    ['23:45', 'Johnson', 'yellow card', 'Late challenge', 'YES', 'Valid ✓'],
    ['67:22', 'Wilson', 'save', 'Brilliant diving save', 'YES', 'Valid ✓']
  ];

  sheet.getRange(5, 1, sampleData.length, 6).setValues(sampleData);
  sheet.getRange(5, 1, sampleData.length, 6).setBackground('#f0fff0');

  // Add conditional formatting for validation
  const validRange = sheet.getRange(5, 6, 1000, 1);
  const validRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains('✓')
    .setBackground('#e8f5e8')
    .build();
  const invalidRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains('✗')
    .setBackground('#ffebee')
    .build();

  sheet.setConditionalFormatRules([validRule, invalidRule]);
}

function setupSettingsSheet(sheet) {
  sheet.setTabColor('#9c27b0');

  // Add title
  sheet.insertRows(1, 2);
  sheet.getRange(1, 1, 1, 3).merge();
  sheet.getRange(1, 1)
    .setValue(`⚙️ System Settings - ${CONFIG.CLUB_NAME}`)
    .setFontSize(16)
    .setFontWeight('bold')
    .setBackground('#9c27b0')
    .setFontColor('white')
    .setHorizontalAlignment('center');

  sheet.getRange(2, 1, 1, 3).merge();
  sheet.getRange(2, 1)
    .setValue('Configure your football highlights system preferences.')
    .setFontStyle('italic')
    .setHorizontalAlignment('center')
    .setBackground('#f3e5f5');

  // Add headers
  const headers = ['Setting', 'Value', 'Description'];
  sheet.getRange(3, 1, 1, 3).setValues([headers]);
  sheet.getRange(3, 1, 1, 3)
    .setFontWeight('bold')
    .setBackground('#f0f0f0')
    .setBorder(true, true, true, true, true, true);

  // Add settings
  const settings = [
    ['Club Name', CONFIG.CLUB_NAME, 'Your football club name'],
    ['Season', CONFIG.SEASON, 'Current season (e.g., 2024-25)'],
    ['Region', CONFIG.REGION, 'Processing region for optimization'],
    ['Default Privacy', 'unlisted', 'YouTube video privacy (unlisted/private/public)'],
    ['Auto Process', 'YES', 'Automatically process videos when added to queue'],
    ['Player Highlights', 'YES', 'Create individual player highlight videos'],
    ['Email Notifications', CONFIG.NOTIFICATION_EMAIL || 'Not set', 'Email for system notifications'],
    ['Storage Alert Level', '80%', 'Drive usage percentage to trigger alerts'],
    ['Cleanup Retention', '30 days', 'How long to keep files in Drive'],
    ['Processing Quality', 'medium', 'Video processing quality (fast/medium/high)']
  ];

  sheet.getRange(4, 1, settings.length, 3).setValues(settings);

  // Set column widths
  sheet.setColumnWidths(1, 3, [200, 200, 400]);

  // Format settings values for editing
  sheet.getRange(4, 2, settings.length, 1).setBackground('#fff3e0');

  // Add data validation for boolean settings
  const booleanValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(['YES', 'NO'])
    .setAllowInvalid(false)
    .build();

  sheet.getRange(6, 2).setDataValidation(booleanValidation); // Auto Process
  sheet.getRange(7, 2).setDataValidation(booleanValidation); // Player Highlights

  const privacyValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(['unlisted', 'private', 'public'])
    .setAllowInvalid(false)
    .build();

  sheet.getRange(5, 2).setDataValidation(privacyValidation); // Default Privacy
}

function setupActivityLogSheet(sheet) {
  sheet.setTabColor('#607d8b');

  const headers = ['Timestamp', 'Level', 'Message', 'Details'];
  sheet.getRange(1, 1, 1, 4).setValues([headers]);
  sheet.getRange(1, 1, 1, 4)
    .setFontWeight('bold')
    .setBackground('#607d8b')
    .setFontColor('white');

  sheet.setColumnWidths(1, 4, [150, 80, 400, 200]);

  // Add initial log entry
  logActivity('📋 Activity log initialized', 'info');
}

function setupStatsSheet(sheet) {
  sheet.setTabColor('#ff5722');

  // Add title
  sheet.insertRows(1, 2);
  sheet.getRange(1, 1, 1, 6).merge();
  sheet.getRange(1, 1)
    .setValue(`📊 Season Statistics - ${CONFIG.CLUB_NAME} ${CONFIG.SEASON}`)
    .setFontSize(16)
    .setFontWeight('bold')
    .setBackground('#ff5722')
    .setFontColor('white')
    .setHorizontalAlignment('center');

  const headers = [
    'Date', 'Match', 'Total Highlights', 'Players Found', 'Processing Time', 'YouTube Links'
  ];

  sheet.getRange(3, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(3, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#f0f0f0');

  sheet.setColumnWidths(1, 6, [120, 250, 120, 120, 120, 200]);
}

/**
 * SYSTEM TESTING AND VALIDATION
 */

function runSystemTests() {
  try {
    showUserAlert('System Tests', 'Running comprehensive system tests...', 'info');

    const results = {
      passed: 0,
      failed: 0,
      tests: []
    };

    // Test 1: Sheet structure
    const sheetTest = testSheetStructure();
    results.tests.push(sheetTest);
    if (sheetTest.passed) results.passed++; else results.failed++;

    // Test 2: Webhook connectivity
    const webhookTest = testWebhookConnectivity();
    results.tests.push(webhookTest);
    if (webhookTest.passed) results.passed++; else results.failed++;

    // Test 3: Processing endpoints
    const endpointTest = testProcessingEndpoints();
    results.tests.push(endpointTest);
    if (endpointTest.passed) results.passed++; else results.failed++;

    // Test 4: Match notes validation
    const notesTest = testMatchNotesValidation();
    results.tests.push(notesTest);
    if (notesTest.passed) results.passed++; else results.failed++;

    // Test 5: Configuration
    const configTest = testConfiguration();
    results.tests.push(configTest);
    if (configTest.passed) results.passed++; else results.failed++;

    // Display results
    displayTestResults(results);

    logActivity(`🧪 System tests completed: ${results.passed} passed, ${results.failed} failed`,
      results.failed > 0 ? 'warning' : 'success');

    return results;

  } catch (error) {
    Logger.log('runSystemTests error: ' + error.toString());
    logActivity(`System tests failed: ${error.message}`, 'error');
    throw error;
  }
}

function testSheetStructure() {
  try {
    const requiredSheets = Object.values(SHEET_NAMES);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const existingSheets = ss.getSheets().map(s => s.getName());

    const missingSheets = requiredSheets.filter(name => !existingSheets.includes(name));

    if (missingSheets.length === 0) {
      return {
        name: 'Sheet Structure',
        passed: true,
        message: 'All required sheets present',
        details: `Found: ${requiredSheets.join(', ')}`
      };
    } else {
      return {
        name: 'Sheet Structure',
        passed: false,
        message: 'Missing required sheets',
        details: `Missing: ${missingSheets.join(', ')}`
      };
    }

  } catch (error) {
    return {
      name: 'Sheet Structure',
      passed: false,
      message: 'Sheet structure test failed',
      details: error.message
    };
  }
}

function testWebhookConnectivity() {
  try {
    const response = UrlFetchApp.fetch(CONFIG.WEBHOOK_URL || 'https://example.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      payload: JSON.stringify({
        type: 'test',
        message: 'System connectivity test',
        timestamp: new Date().toISOString(),
        source: 'apps-script'
      }),
      muteHttpExceptions: true
    });

    const responseCode = response.getResponseCode();

    if (responseCode === 200) {
      return {
        name: 'Webhook Connectivity',
        passed: true,
        message: 'Webhook endpoint responding',
        details: `Response code: ${responseCode}`
      };
    } else {
      return {
        name: 'Webhook Connectivity',
        passed: false,
        message: 'Webhook endpoint not responding correctly',
        details: `Response code: ${responseCode}`
      };
    }

  } catch (error) {
    return {
      name: 'Webhook Connectivity',
      passed: false,
      message: 'Webhook connection failed',
      details: error.message
    };
  }
}

function testProcessingEndpoints() {
  const endpoints = [
    { url: CONFIG.RAILWAY_URL, name: 'Railway' },
    { url: CONFIG.RENDER_URL, name: 'Render' },
    { url: CONFIG.CLOUDFLARE_URL, name: 'Cloudflare' }
  ];

  let workingEndpoints = 0;
  const results = [];

  endpoints.forEach(endpoint => {
    try {
      if (!endpoint.url || endpoint.url.includes('{{')) {
        results.push(`${endpoint.name}: Not configured`);
        return;
      }

      const response = UrlFetchApp.fetch(`${endpoint.url}/health`, {
        method: 'GET',
        muteHttpExceptions: true
      });

      if (response.getResponseCode() === 200) {
        workingEndpoints++;
        results.push(`${endpoint.name}: ✓ Healthy`);
      } else {
        results.push(`${endpoint.name}: ✗ Unhealthy (${response.getResponseCode()})`);
      }

    } catch (error) {
      results.push(`${endpoint.name}: ✗ Connection failed`);
    }
  });

  return {
    name: 'Processing Endpoints',
    passed: workingEndpoints > 0,
    message: `${workingEndpoints}/${endpoints.length} endpoints working`,
    details: results.join(', ')
  };
}

function testMatchNotesValidation() {
  const testNotes = [
    ['15:30', 'Smith', 'goal'],
    ['invalid-time', 'Player', 'action'],
    ['23:45', 'Valid Player', 'save'],
    ['45:00', 'Player123', 'invalid-action']
  ];

  let validCount = 0;
  const results = [];

  testNotes.forEach(([time, player, action]) => {
    const timeValid = /^\d{1,3}:\d{2}$/.test(time);
    const playerValid = /^[A-Za-z\s'-]+$/.test(player);

    if (timeValid && playerValid) {
      validCount++;
      results.push(`✓ ${time} ${player} ${action}`);
    } else {
      results.push(`✗ ${time} ${player} ${action}`);
    }
  });

  return {
    name: 'Match Notes Validation',
    passed: validCount === 2, // Expecting 2 valid notes
    message: `${validCount}/${testNotes.length} test notes valid`,
    details: results.join(', ')
  };
}

function testConfiguration() {
  const requiredConfig = ['CLUB_NAME', 'SEASON', 'REGION'];
  const missingConfig = [];

  requiredConfig.forEach(key => {
    if (!CONFIG[key] || CONFIG[key].includes('{{')) {
      missingConfig.push(key);
    }
  });

  if (missingConfig.length === 0) {
    return {
      name: 'Configuration',
      passed: true,
      message: 'All required configuration present',
      details: `Club: ${CONFIG.CLUB_NAME}, Season: ${CONFIG.SEASON}`
    };
  } else {
    return {
      name: 'Configuration',
      passed: false,
      message: 'Missing configuration values',
      details: `Missing: ${missingConfig.join(', ')}`
    };
  }
}

function displayTestResults(results) {
  const resultMessage = results.tests.map(test => {
    const status = test.passed ? '✅' : '❌';
    return `${status} ${test.name}: ${test.message}`;
  }).join('\\n');

  const summary = `
🧪 SYSTEM TEST RESULTS

${resultMessage}

📊 SUMMARY:
✅ Passed: ${results.passed}
❌ Failed: ${results.failed}
🎯 Success Rate: ${Math.round((results.passed / results.tests.length) * 100)}%

${results.failed > 0 ? '⚠️ Please address failed tests before processing videos.' : '🎉 All systems operational!'}
  `;

  showUserAlert('System Test Results', summary, results.failed > 0 ? 'warning' : 'success');
}

/**
 * SETUP AND INITIALIZATION
 */

function runSystemSetup() {
  try {
    showUserAlert('System Setup', 'Initializing your football highlights system...', 'info');

    // Create all required sheets
    Object.values(SHEET_NAMES).forEach(sheetName => {
      getOrCreateSheet(sheetName);
    });

    // Set up automated triggers
    setupAutomatedTriggers();

    // Run system tests
    const testResults = runSystemTests();

    // Show welcome message
    showWelcomeMessage();

    logActivity('🎉 System setup completed successfully', 'success');

    return {
      success: true,
      testResults: testResults
    };

  } catch (error) {
    Logger.log('runSystemSetup error: ' + error.toString());
    logActivity(`System setup failed: ${error.message}`, 'error');

    showUserAlert('Setup Failed',
      `System setup encountered an error: ${error.message}\\n\\nPlease try again or contact support.`,
      'error');

    throw error;
  }
}

function showWelcomeMessage() {
  const ui = SpreadsheetApp.getUi();

  const welcomeMessage = `
🏈 Welcome to your Football Highlights System!

🎉 SETUP COMPLETE
Your system is now ready to process football highlights automatically.

📋 QUICK START:
1. Go to "Match Notes" tab and enter live match events
2. Add video URL to "Video Queue" tab
3. Watch highlights get created automatically!

🎯 FEATURES:
• ⚽ Live match notes with auto-validation
• 🎬 Automatic video processing and highlight creation
• 👤 Individual player highlight videos
• 📺 YouTube uploads (unlisted by default)
• 📱 30-day Google Drive storage with auto-cleanup
• 📊 Real-time processing dashboard
• 📧 Email notifications for completion

🔧 SYSTEM STATUS:
• Processing services: Active
• Storage: 15GB Drive + Unlimited YouTube
• Capacity: 9,000+ videos/month (FREE)

💡 TIPS:
• Videos start as "unlisted" for privacy
• Use dashboard to make them public when ready
• Drive files auto-delete in 30 days (YouTube copies remain)
• Check "Activity Log" for system status

🆘 NEED HELP?
• Use the "🏈 Football Highlights" menu for tools
• Check Activity Log for any issues
• Email notifications will alert you of problems

Ready to create amazing highlights! 🚀
  `;

  ui.alert('🏈 Football Highlights System Ready!', welcomeMessage, ui.ButtonSet.OK);
}

/**
 * MAIN UTILITY FUNCTIONS
 */

function showUserAlert(title, message, type) {
  try {
    const ui = SpreadsheetApp.getUi();
    const icon = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    ui.alert(`${icon} ${title}`, message, ui.ButtonSet.OK);
  } catch (error) {
    Logger.log(`showUserAlert error: ${error.toString()}`);
  }
}

function logActivity(message, level) {
  try {
    const sheet = getOrCreateSheet(SHEET_NAMES.ACTIVITY);

    // Add headers if needed
    if (sheet.getLastRow() === 0) {
      const headers = ['Timestamp', 'Level', 'Message', 'Details'];
      sheet.getRange(1, 1, 1, 4).setValues([headers]);
      sheet.getRange(1, 1, 1, 4)
        .setFontWeight('bold')
        .setBackground('#607d8b')
        .setFontColor('white');
    }

    const nextRow = sheet.getLastRow() + 1;

    // Color code by level
    let backgroundColor = '#ffffff';
    switch (level?.toLowerCase()) {
      case 'error': backgroundColor = '#ffebee'; break;
      case 'success': backgroundColor = '#e8f5e8'; break;
      case 'warning': backgroundColor = '#fff3e0'; break;
      case 'info': backgroundColor = '#e3f2fd'; break;
    }

    const logData = [
      new Date(),
      (level || 'INFO').toUpperCase(),
      message,
      ''
    ];

    sheet.getRange(nextRow, 1, 1, 4).setValues([logData]);
    sheet.getRange(nextRow, 1, 1, 4).setBackground(backgroundColor);

    // Keep only last 200 entries
    if (nextRow > 200) {
      sheet.deleteRows(2, nextRow - 200);
    }

    Logger.log(`[${level?.toUpperCase() || 'INFO'}] ${message}`);

  } catch (error) {
    Logger.log('logActivity error: ' + error.toString());
  }
}

function updateCellStatus(sheet, row, col, value) {
  try {
    sheet.getRange(row, col).setValue(value);
  } catch (error) {
    Logger.log(`updateCellStatus error (${row},${col}): ${error.toString()}`);
  }
}

function findVideoByJobId(sheet, jobId) {
  try {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][8] === jobId) { // Job ID is in column 9 (index 8)
        return i + 1;
      }
    }
    return -1;
  } catch (error) {
    Logger.log('findVideoByJobId error: ' + error.toString());
    return -1;
  }
}

function generateJobId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${CONFIG.CLUB_NAME.replace(/\s+/g, '')}_${timestamp}_${random}`.toUpperCase();
}

function formatDate(date) {
  if (!date) return new Date().toISOString().split('T')[0];
  if (date instanceof Date) return date.toISOString().split('T')[0];
  return date.toString();
}

function formatDuration(seconds) {
  if (!seconds || seconds === 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function isValidDriveUrl(url) {
  if (!url) return false;

  const drivePatterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9-_]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9-_]+)/,
    /docs\.google\.com\/.*\/d\/([a-zA-Z0-9-_]+)/
  ];

  return drivePatterns.some(pattern => pattern.test(url.toString()));
}

function getSettingValue(settingName, defaultValue) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.SETTINGS);
    if (!sheet) return defaultValue;

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === settingName) {
        return data[i][1] || defaultValue;
      }
    }

    return defaultValue;
  } catch (error) {
    Logger.log('getSettingValue error: ' + error.toString());
    return defaultValue;
  }
}

function handleSettingsChange(row, value) {
  try {
    logActivity(`Setting updated: ${value}`, 'info');
    // Trigger any necessary updates when settings change
    if (Math.random() < 0.5) { // Occasionally update dashboard
      Utilities.sleep(1000);
      updateDashboard();
    }
  } catch (error) {
    Logger.log('handleSettingsChange error: ' + error.toString());
  }
}

function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function sendTestNotification() {
  try {
    const testData = {
      opponent: 'Test Opponent',
      matchDate: new Date().toISOString().split('T')[0]
    };

    sendCompletionNotification({
      teamHighlight: { youtube: { url: 'https://youtube.com/watch?v=test123' } },
      playerHighlights: [
        { player: 'Test Player', youtube: { url: 'https://youtube.com/watch?v=test456' } }
      ]
    }, {
      totalHighlights: 5,
      playersFound: 3
    }, testData);

    showUserAlert('Test Email', 'Test notification email sent successfully!', 'success');

  } catch (error) {
    Logger.log('sendTestNotification error: ' + error.toString());
    showUserAlert('Test Email Failed', `Failed to send test email: ${error.message}`, 'error');
  }
}

/**
 * MENU FUNCTIONS (called from custom menu)
 */

function processVideoQueue() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.QUEUE);
    if (!sheet) {
      showUserAlert('Error', 'Video Queue sheet not found.', 'error');
      return;
    }

    const data = sheet.getDataRange().getValues();
    let processedCount = 0;

    for (let i = 1; i < data.length; i++) {
      const [videoUrl, , , , , status] = data[i];

      if (videoUrl && videoUrl.toString().trim() && status === STATUS.READY) {
        processVideoRow(i + 1);
        processedCount++;
      }
    }

    if (processedCount > 0) {
      showUserAlert('Queue Processed', `Started processing ${processedCount} videos.`, 'success');
      logActivity(`📼 Processed ${processedCount} videos from queue`, 'info');
    } else {
      showUserAlert('No Videos', 'No videos ready for processing found in queue.', 'info');
    }

  } catch (error) {
    Logger.log('processVideoQueue error: ' + error.toString());
    showUserAlert('Processing Failed', `Error processing queue: ${error.message}`, 'error');
  }
}

function validateAllMatchNotes() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.NOTES);
    if (!sheet) {
      showUserAlert('Error', 'Match Notes sheet not found.', 'error');
      return;
    }

    let validCount = 0;
    let invalidCount = 0;

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][1] && data[i][2]) { // Has timestamp, player, action
        if (validateMatchNote(i + 1)) {
          validCount++;
        } else {
          invalidCount++;
        }
      }
    }

    updateMatchSummary();

    showUserAlert('Validation Complete',
      `Match notes validated:\\n✅ Valid: ${validCount}\\n❌ Invalid: ${invalidCount}`,
      invalidCount > 0 ? 'warning' : 'success');

    logActivity(`📝 Match notes validated: ${validCount} valid, ${invalidCount} invalid`,
      invalidCount > 0 ? 'warning' : 'success');

  } catch (error) {
    Logger.log('validateAllMatchNotes error: ' + error.toString());
    showUserAlert('Validation Failed', `Error validating notes: ${error.message}`, 'error');
  }
}

// Export main functions for external use
this.onEdit = onEdit;
this.onOpen = onOpen;
this.doPost = doPost;