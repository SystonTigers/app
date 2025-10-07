/**
 * Complete Customer Onboarding System
 *
 * This system provides a comprehensive onboarding experience for customers
 * purchasing the complete football club automation package.
 */

/**
 * Main customer onboarding function
 * This is what new customers run to get started
 */
function startCustomerOnboarding() {
  try {
    const ui = SpreadsheetApp.getUi();

    // Welcome message for new customers
    const welcomeResponse = ui.alert(
      '🎉 Welcome to Your Football Club Automation System!',
      'Thank you for choosing our Complete Football Club Automation Package!\n\n' +
      '📦 Your package includes:\n' +
      '⚽ Live Match Event Automation\n' +
      '🎬 Professional Video Highlights\n' +
      '📱 Automated Social Media Posting\n' +
      '📊 Complete Player Statistics\n' +
      '📅 Weekly Content Scheduling\n' +
      '🔧 Customer Success Support\n\n' +
      'This onboarding will take 15-20 minutes and will set up everything you need.\n\n' +
      'Ready to transform your club\'s digital presence?',
      ui.ButtonSet.YES_NO
    );

    if (welcomeResponse !== ui.Button.YES) {
      ui.alert(
        'Onboarding Paused',
        'No problem! You can restart onboarding anytime by running this function again.\n\n' +
        'When you\'re ready, we\'ll be here to help you get started!',
        ui.ButtonSet.OK
      );
      return;
    }

    // Run comprehensive onboarding
    const onboardingResult = runCompleteOnboarding();

    if (onboardingResult.success) {
      // Show success message and next steps
      showOnboardingSuccess(onboardingResult);

      // Set up customer success tracking
      initializeCustomerSuccessTracking();

      // Open the unified dashboard
      openUnifiedDashboard();

    } else {
      // Show partial success or failure message
      showOnboardingIssues(onboardingResult);
    }

  } catch (error) {
    Logger.log('Customer onboarding error: ' + error.toString());
    SpreadsheetApp.getUi().alert(
      'Onboarding Error',
      'We encountered an issue during onboarding: ' + error.message + '\n\n' +
      'Please contact our support team for assistance.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Run the complete onboarding process
 */
function runCompleteOnboarding() {
  const results = {
    success: true,
    completed: [],
    warnings: [],
    failed: [],
    customerData: {}
  };

  try {
    // Step 1: Collect customer information
    const customerInfo = collectCustomerInformation();
    if (customerInfo.success) {
      results.completed.push('Customer Information');
      results.customerData = customerInfo.data;
    } else {
      results.failed.push('Customer Information: ' + customerInfo.error);
      results.success = false;
    }

    // Step 2: Set up club configuration
    const clubSetup = setupClubConfiguration(results.customerData);
    if (clubSetup.success) {
      results.completed.push('Club Configuration');
    } else {
      results.warnings.push('Club Configuration: ' + clubSetup.error);
    }

    // Step 3: Configure integrations
    const integrations = setupIntegrations();
    if (integrations.success) {
      results.completed.push('System Integrations');
    } else {
      results.warnings.push('System Integrations: ' + integrations.error);
    }

    // Step 4: Set up live match system
    const liveMatch = setupLiveMatchSystem();
    if (liveMatch.success) {
      results.completed.push('Live Match Automation');
    } else {
      results.warnings.push('Live Match System: ' + liveMatch.error);
    }

    // Step 5: Set up video processing
    const videoProcessing = setupVideoProcessingSystem();
    if (videoProcessing.success) {
      results.completed.push('Video Processing System');
    } else {
      results.warnings.push('Video Processing: ' + videoProcessing.error);
    }

    // Step 6: Configure social media automation
    const socialMedia = setupSocialMediaAutomation();
    if (socialMedia.success) {
      results.completed.push('Social Media Automation');
    } else {
      results.warnings.push('Social Media: ' + socialMedia.error);
    }

    // Step 7: Create customer dashboard
    const dashboard = createCustomerDashboard();
    if (dashboard.success) {
      results.completed.push('Customer Dashboard');
    } else {
      results.warnings.push('Dashboard: ' + dashboard.error);
    }

    // Step 8: Set up support and documentation
    const support = setupCustomerSupport();
    if (support.success) {
      results.completed.push('Customer Support');
    } else {
      results.warnings.push('Customer Support: ' + support.error);
    }

    // Final validation
    results.successRate = results.completed.length / 8 * 100;
    if (results.successRate < 75) {
      results.success = false;
    }

    return results;

  } catch (error) {
    Logger.log('Complete onboarding error: ' + error.toString());
    results.success = false;
    results.failed.push('Critical Error: ' + error.message);
    return results;
  }
}

/**
 * Collect comprehensive customer information
 */
function collectCustomerInformation() {
  try {
    const ui = SpreadsheetApp.getUi();

    // Customer and club information
    const clubName = promptForValue(ui, 'Club Information',
      'What is your football club\'s name?\n\n' +
      'This will appear on all your automated content and videos.',
      true);

    if (!clubName) return { success: false, error: 'Club name is required' };

    const contactPerson = promptForValue(ui, 'Contact Person',
      'Who is the main contact person for this system?\n\n' +
      'This helps us provide better support.',
      false);

    const contactEmail = promptForValue(ui, 'Contact Email',
      'What email should we use for system notifications and support?',
      true);

    const league = promptForValue(ui, 'League/Division',
      'What league or division does your club play in?\n\n' +
      'Examples: "Premier Division", "Youth League", "Sunday League"',
      true);

    const ageGroup = ui.alert(
      'Age Group',
      'What age group is your team?\n\n' +
      'This affects video content guidelines and social media compliance.\n\n' +
      'YES - Youth/Junior (Under 18)\n' +
      'NO - Senior/Adult (18+)',
      ui.ButtonSet.YES_NO
    );

    const teamSize = promptForValue(ui, 'Team Size',
      'How many players are typically in your squad?\n\n' +
      'This helps us optimize the player management system.',
      false);

    const currentSeason = promptForValue(ui, 'Current Season',
      'What season are you in?\n\n' +
      'Example: "2024-25"',
      true, new Date().getFullYear() + '-' + (new Date().getFullYear() + 1).toString().slice(2));

    return {
      success: true,
      data: {
        clubName: clubName,
        contactPerson: contactPerson || 'Not specified',
        contactEmail: contactEmail,
        league: league,
        isYouthTeam: ageGroup === ui.Button.YES,
        teamSize: parseInt(teamSize) || 20,
        currentSeason: currentSeason,
        onboardingDate: new Date().toISOString(),
        systemVersion: '1.0.0-unified'
      }
    };

  } catch (error) {
    Logger.log('Error collecting customer information: ' + error.toString());
    return { success: false, error: error.message };
  }
}

/**
 * Helper function to prompt for values with validation
 */
function promptForValue(ui, title, message, required = false, defaultValue = '') {
  const response = ui.prompt(title, message, ui.ButtonSet.OK_CANCEL);

  if (response.getSelectedButton() !== ui.Button.OK) {
    return required ? null : defaultValue;
  }

  const value = response.getResponseText().trim();

  if (required && !value) {
    ui.alert('Required Field', `${title} is required. Please provide a value.`, ui.ButtonSet.OK);
    return null;
  }

  return value || defaultValue;
}

/**
 * Set up club configuration based on customer data
 */
function setupClubConfiguration(customerData) {
  try {
    // Create the unified configuration using existing function
    const configResult = setupUnifiedConfiguration();

    if (!configResult.success) {
      return { success: false, error: 'Failed to create unified configuration' };
    }

    // Update configuration with customer data
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const configSheet = spreadsheet.getSheetByName('📋 System Configuration');

    if (configSheet) {
      // Update customer-specific values
      updateConfigValue(configSheet, 'Club Name', customerData.clubName);
      updateConfigValue(configSheet, 'League/Division', customerData.league);
      updateConfigValue(configSheet, 'Current Season', customerData.currentSeason);
      updateConfigValue(configSheet, 'Age Group', customerData.isYouthTeam ? 'Youth (Under 18)' : 'Senior (18+)');
      updateConfigValue(configSheet, 'Setup Date', customerData.onboardingDate);
    }

    return { success: true, configSheet: configSheet };

  } catch (error) {
    Logger.log('Error setting up club configuration: ' + error.toString());
    return { success: false, error: error.message };
  }
}

/**
 * Helper function to update configuration values
 */
function updateConfigValue(sheet, label, value) {
  try {
    const data = sheet.getDataRange().getValues();

    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === label) {
        sheet.getRange(i + 1, 2).setValue(value);
        break;
      }
    }
  } catch (error) {
    Logger.log(`Error updating config value ${label}: ${error.toString()}`);
  }
}

/**
 * Set up all necessary system integrations
 */
function setupIntegrations() {
  try {
    // This would call the existing integration setup functions
    const result = setupAPIIntegrations();

    return {
      success: result.success,
      integrations: result.data || {},
      error: result.error
    };

  } catch (error) {
    Logger.log('Error setting up integrations: ' + error.toString());
    return { success: false, error: error.message };
  }
}

/**
 * Set up the live match system with all necessary sheets
 */
function setupLiveMatchSystem() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheetsCreated = [];

    // Create Live Match Updates sheet
    const liveMatchSheet = createLiveMatchSheet(spreadsheet);
    if (liveMatchSheet) sheetsCreated.push('Live Match Updates');

    // Create Player Management sheets
    const playersSheet = createPlayersSheet(spreadsheet);
    if (playersSheet) sheetsCreated.push('Players');

    // Create Fixtures & Results sheet
    const fixturesSheet = createFixturesSheet(spreadsheet);
    if (fixturesSheet) sheetsCreated.push('Fixtures & Results');

    return {
      success: true,
      sheetsCreated: sheetsCreated,
      totalSheets: sheetsCreated.length
    };

  } catch (error) {
    Logger.log('Error setting up live match system: ' + error.toString());
    return { success: false, error: error.message };
  }
}

/**
 * Create Live Match Updates sheet
 */
function createLiveMatchSheet(spreadsheet) {
  try {
    let sheet = spreadsheet.getSheetByName('Live Match Updates');

    if (!sheet) {
      sheet = spreadsheet.insertSheet('Live Match Updates');
    } else {
      sheet.clear();
    }

    // Set up headers
    const headers = [
      'Minute', 'Event', 'Player', 'Assist', 'Home Score', 'Away Score',
      'Notes', 'Processed', 'Social Media', 'Video Clip'
    ];

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');

    // Set column widths
    sheet.setColumnWidth(1, 80);   // Minute
    sheet.setColumnWidth(2, 120);  // Event
    sheet.setColumnWidth(3, 150);  // Player
    sheet.setColumnWidth(4, 120);  // Assist
    sheet.setColumnWidth(5, 100);  // Home Score
    sheet.setColumnWidth(6, 100);  // Away Score
    sheet.setColumnWidth(7, 200);  // Notes
    sheet.setColumnWidth(8, 100);  // Processed
    sheet.setColumnWidth(9, 120);  // Social Media
    sheet.setColumnWidth(10, 100); // Video Clip

    return sheet;

  } catch (error) {
    Logger.log('Error creating live match sheet: ' + error.toString());
    return null;
  }
}

/**
 * Create Players sheet
 */
function createPlayersSheet(spreadsheet) {
  try {
    let sheet = spreadsheet.getSheetByName('Players');

    if (!sheet) {
      sheet = spreadsheet.insertSheet('Players');
    } else {
      sheet.clear();
    }

    // Set up headers
    const headers = [
      'Player Name', 'Position', 'Number', 'Goals', 'Assists', 'Yellow Cards',
      'Red Cards', 'Minutes Played', 'Appearances', 'Status'
    ];

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#28a745').setFontColor('white');

    // Add some example players to get started
    const examplePlayers = [
      ['John Smith', 'GK', '1', 0, 0, 0, 0, 0, 0, 'Active'],
      ['Mike Johnson', 'DF', '2', 0, 0, 0, 0, 0, 0, 'Active'],
      ['David Wilson', 'MF', '8', 0, 0, 0, 0, 0, 0, 'Active'],
      ['Tom Brown', 'FW', '9', 0, 0, 0, 0, 0, 0, 'Active']
    ];

    sheet.getRange(2, 1, examplePlayers.length, headers.length).setValues(examplePlayers);

    // Auto-resize columns
    sheet.autoResizeColumns(1, headers.length);

    return sheet;

  } catch (error) {
    Logger.log('Error creating players sheet: ' + error.toString());
    return null;
  }
}

/**
 * Create Fixtures & Results sheet
 */
function createFixturesSheet(spreadsheet) {
  try {
    let sheet = spreadsheet.getSheetByName('Fixtures & Results');

    if (!sheet) {
      sheet = spreadsheet.insertSheet('Fixtures & Results');
    } else {
      sheet.clear();
    }

    // Set up headers
    const headers = [
      'Date', 'Opposition', 'Home/Away', 'Result', 'Score', 'Competition',
      'Venue', 'Notes', 'Match Report', 'Video Highlights'
    ];

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#ffc107').setFontColor('black');

    // Auto-resize columns
    sheet.autoResizeColumns(1, headers.length);

    return sheet;

  } catch (error) {
    Logger.log('Error creating fixtures sheet: ' + error.toString());
    return null;
  }
}

/**
 * Set up video processing system
 */
function setupVideoProcessingSystem() {
  try {
    // Video Queue sheet is created by the integration system when needed
    // This function validates video processing configuration

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const configSheet = spreadsheet.getSheetByName('📋 System Configuration');

    if (!configSheet) {
      return { success: false, error: 'Configuration sheet not found' };
    }

    // Check if video processing service is configured
    const data = configSheet.getDataRange().getValues();
    let videoServiceConfigured = false;

    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === 'Video Processing Service') {
        const url = data[i][1];
        videoServiceConfigured = url && url !== 'Not configured';
        break;
      }
    }

    return {
      success: true,
      videoServiceConfigured: videoServiceConfigured,
      message: videoServiceConfigured
        ? 'Video processing service is configured and ready'
        : 'Video processing available but service URL not configured'
    };

  } catch (error) {
    Logger.log('Error setting up video processing system: ' + error.toString());
    return { success: false, error: error.message };
  }
}

/**
 * Set up social media automation
 */
function setupSocialMediaAutomation() {
  try {
    // This would integrate with the existing Make.com integration system
    const result = setupSocialMediaConfiguration();

    return {
      success: result.success,
      platforms: result.data?.platforms || [],
      frequency: result.data?.frequency || 'moderate',
      error: result.error
    };

  } catch (error) {
    Logger.log('Error setting up social media automation: ' + error.toString());
    return { success: false, error: error.message };
  }
}

/**
 * Create customer-specific dashboard
 */
function createCustomerDashboard() {
  try {
    // Use the existing unified dashboard creation
    const result = createUnifiedDashboard();

    return {
      success: result.success,
      dashboardSheet: result.sheet?.getName() || null,
      error: result.error
    };

  } catch (error) {
    Logger.log('Error creating customer dashboard: ' + error.toString());
    return { success: false, error: error.message };
  }
}

/**
 * Set up customer support and documentation
 */
function setupCustomerSupport() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let supportSheet = spreadsheet.getSheetByName('📞 Support & Help');

    if (!supportSheet) {
      supportSheet = spreadsheet.insertSheet('📞 Support & Help');
    } else {
      supportSheet.clear();
    }

    // Create comprehensive help documentation
    const helpContent = [
      ['🏈⚽ Football Club Automation - Support & Help'],
      [''],
      ['🚀 Getting Started'],
      ['• Use the Dashboard to monitor your system'],
      ['• Add players to the Players sheet'],
      ['• Input live match events in Live Match Updates'],
      ['• Check Video Queue for highlight processing'],
      [''],
      ['📱 Live Match Events'],
      ['• Goals: Enter minute, player name, and any assist'],
      ['• Cards: Specify yellow or red card with player'],
      ['• Substitutions: Use the player management system'],
      ['• Opposition events: Use "Goal" or "Opposition" as player name'],
      [''],
      ['🎬 Video Processing'],
      ['• High-priority events (goals, red cards) process automatically'],
      ['• Check Video Queue sheet for processing status'],
      ['• Videos generate in multiple formats (16:9, 1:1, 9:16)'],
      ['• All clips include professional branding'],
      [''],
      ['📊 Statistics & Reports'],
      ['• Player stats update automatically from live events'],
      ['• View season summaries in the Dashboard'],
      ['• Export data for external analysis'],
      [''],
      ['🔧 System Settings'],
      ['• All configuration in "System Configuration" sheet'],
      ['• Test connections using system diagnostics'],
      ['• Update API URLs and keys as needed'],
      [''],
      ['💬 Support Contact'],
      ['• Email: support@footballautomation.com'],
      ['• Discord: Football Automation Community'],
      ['• Documentation: docs.footballautomation.com'],
      ['• Video Tutorials: youtube.com/footballautomation'],
      [''],
      ['🔄 System Updates'],
      ['• Updates are automatic and backward-compatible'],
      ['• New features announced via email and dashboard'],
      ['• Backup your data before major updates'],
      [''],
      ['❓ Troubleshooting'],
      ['• Run "System Diagnostic" from the menu'],
      ['• Check Activity Log for recent errors'],
      ['• Verify internet connection for external services'],
      ['• Contact support with diagnostic results if issues persist']
    ];

    // Add content to sheet
    helpContent.forEach((row, index) => {
      supportSheet.getRange(index + 1, 1).setValue(row[0]);

      // Format headers
      if (row[0].includes('🏈⚽') || row[0].includes('🚀') || row[0].includes('📱') ||
          row[0].includes('🎬') || row[0].includes('📊') || row[0].includes('🔧') ||
          row[0].includes('💬') || row[0].includes('🔄') || row[0].includes('❓')) {
        supportSheet.getRange(index + 1, 1).setFontWeight('bold');

        if (row[0].includes('🏈⚽')) {
          supportSheet.getRange(index + 1, 1).setFontSize(16).setBackground('#4285f4').setFontColor('white');
        } else {
          supportSheet.getRange(index + 1, 1).setFontSize(12).setBackground('#f0f8ff');
        }
      }
    });

    // Set column width
    supportSheet.setColumnWidth(1, 600);

    return { success: true, supportSheet: supportSheet };

  } catch (error) {
    Logger.log('Error setting up customer support: ' + error.toString());
    return { success: false, error: error.message };
  }
}

/**
 * Show onboarding success message
 */
function showOnboardingSuccess(results) {
  const ui = SpreadsheetApp.getUi();

  let message = '🎉 Onboarding Complete!\n\n';
  message += `✅ Successfully configured: ${results.completed.join(', ')}\n\n`;

  if (results.warnings.length > 0) {
    message += `⚠️ Some items need attention:\n`;
    results.warnings.forEach(warning => message += `• ${warning}\n`);
    message += '\n';
  }

  message += '🚀 What to do next:\n';
  message += '1. Explore your Dashboard to see system status\n';
  message += '2. Add your players to the Players sheet\n';
  message += '3. Test the system with a practice match event\n';
  message += '4. Configure social media and video processing URLs\n';
  message += '5. Check the Support & Help sheet for detailed guidance\n\n';
  message += 'Welcome to the future of football club management!';

  ui.alert('Onboarding Complete! 🎉', message, ui.ButtonSet.OK);
}

/**
 * Show onboarding issues message
 */
function showOnboardingIssues(results) {
  const ui = SpreadsheetApp.getUi();

  let message = '⚠️ Onboarding Completed with Issues\n\n';

  if (results.completed.length > 0) {
    message += `✅ Successfully configured: ${results.completed.join(', ')}\n\n`;
  }

  if (results.warnings.length > 0) {
    message += `⚠️ Issues to resolve:\n`;
    results.warnings.forEach(warning => message += `• ${warning}\n`);
    message += '\n';
  }

  if (results.failed.length > 0) {
    message += `❌ Failed components:\n`;
    results.failed.forEach(failure => message += `• ${failure}\n`);
    message += '\n';
  }

  message += 'You can resolve these issues later and your system will still work for configured components.\n\n';
  message += 'Contact support if you need assistance resolving these issues.';

  ui.alert('Onboarding Issues', message, ui.ButtonSet.OK);
}

/**
 * Initialize customer success tracking
 */
function initializeCustomerSuccessTracking() {
  try {
    const customerData = {
      onboardingCompleted: new Date().toISOString(),
      systemVersion: '1.0.0-unified',
      initialConfiguration: 'complete',
      supportTickets: 0,
      lastActivity: new Date().toISOString(),
      satisfactionScore: null,
      churnRisk: 'low'
    };

    // Store in document properties for tracking
    PropertiesService.getDocumentProperties().setProperty(
      'CUSTOMER_SUCCESS_DATA',
      JSON.stringify(customerData)
    );

    Logger.log('Customer success tracking initialized');

  } catch (error) {
    Logger.log('Error initializing customer success tracking: ' + error.toString());
  }
}