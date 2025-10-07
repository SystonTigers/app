/**
 * @fileoverview UI functions for Syston Automation Template
 * @version 1.0.0
 * @description Menu system and Setup Wizard for customer template
 */

/**
 * Create menu when spreadsheet opens
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⚽ Syston Automation')
    .addItem('🔧 Setup Wizard', 'openSetupWizard')
    .addItem('🏥 Health Check', 'showHealth')
    .addItem('📊 Dashboard', 'showDashboard')
    .addItem('🔄 Check for Updates', 'showLibVersion')
    .addSeparator()
    .addItem('📝 Test Post', 'testPost')
    .addItem('🔐 Privacy Manager', 'showPrivacyManager')
    .addToUi();

  // Auto-open setup wizard if not configured
  if (!PropertiesService.getDocumentProperties().getProperty('SETUP_DONE')) {
    Utilities.sleep(1000); // Brief delay to let UI load
    openSetupWizard();
  }
}

/**
 * Open the Setup Wizard
 */
function openSetupWizard() {
  try {
    const template = HtmlService.createTemplateFromFile('wizard');

    // Get current config for pre-filling form
    let currentConfig = {};
    try {
      currentConfig = SystonAutomationLib.SA_getConfigForUI_();
    } catch (error) {
      // If library not available or config not set, use defaults
      currentConfig = {
        needsSetup: true
      };
    }

    template.config = {
      TEAM_NAME: currentConfig.TEAM_NAME || 'Your Football Club',
      PRIMARY_COLOR: currentConfig.PRIMARY_COLOR || '#FFD100',
      SECONDARY_COLOR: currentConfig.SECONDARY_COLOR || '#000000',
      TIMEZONE: currentConfig.TIMEZONE || 'Europe/London',
      LEAGUE_URL: currentConfig.LEAGUE_URL || '',
      MAKE_WEBHOOK_RESULTS: '', // Never pre-fill webhooks for security
      HOME_VENUE: currentConfig.HOME_VENUE || '',
      needsSetup: currentConfig.needsSetup || false
    };

    const htmlOutput = template.evaluate()
      .setTitle('⚽ Setup Wizard')
      .setWidth(500)
      .setHeight(600);

    SpreadsheetApp.getUi().showSidebar(htmlOutput);

  } catch (error) {
    SpreadsheetApp.getUi().alert('Setup Wizard Error: ' + error.toString());
  }
}

/**
 * Show system health status
 */
function showHealth() {
  try {
    const health = SystonAutomationLib.SA_health_();

    let message = `🏥 System Health Check\n\n`;
    message += `Status: ${health.status === 'OK' ? '✅ Healthy' : '❌ Issues Found'}\n`;
    message += `Version: ${health.libVersion}\n`;
    message += `Time: ${health.timestamp}\n\n`;

    if (health.warnings && health.warnings.length > 0) {
      message += `⚠️ Warnings:\n${health.warnings.join('\n')}\n\n`;
    }

    if (health.errors && health.errors.length > 0) {
      message += `❌ Errors:\n${health.errors.join('\n')}\n\n`;
    }

    if (health.status === 'OK') {
      message += `All systems operational! 🎉`;
    } else {
      message += `Please run the Setup Wizard to fix issues.`;
    }

    SpreadsheetApp.getUi().alert(message);

  } catch (error) {
    SpreadsheetApp.getUi().alert('Health check failed: ' + error.toString());
  }
}

/**
 * Show monitoring dashboard
 */
function showDashboard() {
  try {
    const template = HtmlService.createTemplateFromFile('dashboard');

    // Get dashboard data
    template.health = SystonAutomationLib.SA_health_();
    template.metrics = SystonAutomationLib.SA_getMetrics_();
    template.version = SystonAutomationLib.getLibraryVersion();

    const htmlOutput = template.evaluate()
      .setTitle('📊 System Dashboard')
      .setWidth(600)
      .setHeight(500);

    SpreadsheetApp.getUi().showSidebar(htmlOutput);

  } catch (error) {
    SpreadsheetApp.getUi().alert('Dashboard error: ' + error.toString());
  }
}

/**
 * Show current library version
 */
function showLibVersion() {
  try {
    const version = SystonAutomationLib.getLibraryVersion();
    const versionInfo = SystonAutomationLib.SA_getVersionInfo();

    let message = `📦 Syston Automation Library\n\n`;
    message += `Current Version: ${version}\n`;
    message += `Release Date: ${versionInfo.releaseDate}\n\n`;
    message += `Features:\n`;
    versionInfo.features.forEach(feature => {
      message += `• ${feature}\n`;
    });

    message += `\n💡 To update: Extensions → Apps Script → Libraries → Select newer version`;

    SpreadsheetApp.getUi().alert(message);

  } catch (error) {
    SpreadsheetApp.getUi().alert('Version check failed: ' + error.toString());
  }
}

/**
 * Test the posting system
 */
function testPost() {
  try {
    const ui = SpreadsheetApp.getUi();

    // Ask user for test details
    const response = ui.prompt(
      'Test Post',
      'Enter a test player name (or leave blank for system test):',
      ui.ButtonSet.OK_CANCEL
    );

    if (response.getSelectedButton() !== ui.Button.OK) {
      return;
    }

    const playerName = response.getResponseText().trim();

    // Create test event
    const testEvent = {
      type: 'test',
      player: playerName || 'Test Player',
      minute: '90',
      details: `Test post from ${SpreadsheetApp.getActive().getName()}`,
      timestamp: new Date().toISOString()
    };

    // Process the test
    const result = SystonAutomationLib.SA_processMatchEvent_(testEvent);

    let message = `🧪 Test Post Results\n\n`;
    message += `Success: ${result.success ? '✅ Yes' : '❌ No'}\n`;

    if (result.success) {
      message += `Event processed successfully!\n`;
      message += `Player: ${testEvent.player}\n`;
      message += `Type: ${testEvent.type}\n`;
    } else {
      message += `Error: ${result.error}\n`;
      if (result.error.includes('consent')) {
        message += `\nℹ️ Note: Test failed due to privacy consent. This is normal - add player consent in Privacy Manager.`;
      }
    }

    ui.alert(message);

  } catch (error) {
    SpreadsheetApp.getUi().alert('Test post failed: ' + error.toString());
  }
}

/**
 * Show privacy manager
 */
function showPrivacyManager() {
  try {
    const template = HtmlService.createTemplateFromFile('privacy');

    // Get consent data
    const consentSheet = SpreadsheetApp.getActive().getSheetByName('Player_Consents');
    template.hasConsentSheet = !!consentSheet;

    if (consentSheet && consentSheet.getLastRow() > 1) {
      const data = consentSheet.getRange(2, 1, consentSheet.getLastRow() - 1, 6).getValues();
      template.consents = data.map(row => ({
        playerId: row[0],
        name: row[1],
        consent: row[2],
        expires: row[3],
        notes: row[4],
        updated: row[5]
      }));
    } else {
      template.consents = [];
    }

    const htmlOutput = template.evaluate()
      .setTitle('🔐 Privacy Manager')
      .setWidth(700)
      .setHeight(500);

    SpreadsheetApp.getUi().showSidebar(htmlOutput);

  } catch (error) {
    SpreadsheetApp.getUi().alert('Privacy manager error: ' + error.toString());
  }
}

/**
 * Include HTML file content (for HtmlService templates)
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}