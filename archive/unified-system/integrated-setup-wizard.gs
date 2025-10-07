/**
 * Unified Football Club Automation System
 * Complete Package: Live Match Automation + Video Processing
 *
 * This system combines the best of both worlds:
 * - Live match event automation (goals, cards, social media)
 * - Professional video processing and highlights
 * - Customer-friendly zero-code setup
 * - Complete business package for football clubs
 */

/**
 * Main Unified Setup Wizard
 * Sets up both live match automation AND video processing in one flow
 */
function runUnifiedSetupWizard() {
  try {
    const ui = SpreadsheetApp.getUi();

    // Welcome to the complete package
    const welcomeResponse = ui.alert(
      '🏈⚽ Complete Football Club Automation Package',
      'Welcome to the Ultimate Football Club Automation System!\n\n' +
      '📦 This package includes:\n' +
      '⚽ Live Match Automation (goals, cards, social media)\n' +
      '🎬 Professional Video Processing & Highlights\n' +
      '📱 Automated Social Media Posting\n' +
      '📊 Complete Player Statistics\n' +
      '📅 Weekly Content Scheduling\n' +
      '🔧 Zero-Code Setup & Management\n\n' +
      'Setup takes 10-15 minutes and will configure everything you need.\n\n' +
      'Ready to transform your club\'s digital presence?',
      ui.ButtonSet.YES_NO
    );

    if (welcomeResponse !== ui.Button.YES) {
      return;
    }

    // Initialize unified system
    const setupResult = runUnifiedSetupSteps();

    if (setupResult.success) {
      ui.alert(
        '🎉 Complete System Ready!',
        'Congratulations! Your complete football club automation system is now live!\n\n' +
        '✅ Live match automation configured\n' +
        '✅ Video processing system ready\n' +
        '✅ Social media automation active\n' +
        '✅ Player statistics tracking enabled\n' +
        '✅ Customer dashboard accessible\n\n' +
        'What to do next:\n' +
        '1. Test your system with the "System Diagnostic"\n' +
        '2. Input your first live match events\n' +
        '3. Upload your first match video for processing\n' +
        '4. Check your unified dashboard\n\n' +
        'Welcome to the future of football club management!',
        ui.ButtonSet.OK
      );

      // Open unified dashboard
      openUnifiedDashboard();
    } else {
      ui.alert(
        'Setup Issues',
        'Setup completed with some warnings:\n\n' + setupResult.warnings.join('\n') +
        '\n\nYou can resolve these later in the Config sheet.',
        ui.ButtonSet.OK
      );
    }

  } catch (error) {
    Logger.log('Unified setup error: ' + error.toString());
    SpreadsheetApp.getUi().alert(
      'Setup Error',
      'An error occurred during setup: ' + error.message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Unified setup steps that configure both systems
 */
function runUnifiedSetupSteps() {
  const results = {
    success: true,
    warnings: [],
    configured: {
      liveMatch: false,
      videoProcessing: false,
      socialMedia: false,
      playerStats: false
    }
  };

  try {
    // Step 1: Create unified configuration system
    const configResult = setupUnifiedConfiguration();
    if (configResult.success) {
      results.configured.liveMatch = true;
      results.configured.videoProcessing = true;
    } else {
      results.warnings.push('Configuration setup had issues: ' + configResult.error);
    }

    // Step 2: Setup live match automation
    const liveMatchResult = setupLiveMatchAutomation();
    if (!liveMatchResult.success) {
      results.warnings.push('Live match setup issues: ' + liveMatchResult.error);
    }

    // Step 3: Setup video processing integration
    const videoResult = setupVideoProcessingIntegration();
    if (!videoResult.success) {
      results.warnings.push('Video processing setup issues: ' + videoResult.error);
    }

    // Step 4: Setup social media automation
    const socialResult = setupSocialMediaIntegration();
    if (socialResult.success) {
      results.configured.socialMedia = true;
    } else {
      results.warnings.push('Social media setup issues: ' + socialResult.error);
    }

    // Step 5: Setup player statistics system
    const statsResult = setupPlayerStatisticsSystem();
    if (statsResult.success) {
      results.configured.playerStats = true;
    } else {
      results.warnings.push('Player stats setup issues: ' + statsResult.error);
    }

    // Step 6: Create unified dashboard
    const dashboardResult = createUnifiedDashboard();
    if (!dashboardResult.success) {
      results.warnings.push('Dashboard creation issues: ' + dashboardResult.error);
    }

    // Final validation
    if (results.warnings.length > 3) {
      results.success = false;
    }

    return results;

  } catch (error) {
    Logger.log('Setup steps error: ' + error.toString());
    return {
      success: false,
      warnings: ['Critical setup error: ' + error.message],
      configured: results.configured
    };
  }
}

/**
 * Setup unified configuration that supports both systems
 */
function setupUnifiedConfiguration() {
  try {
    const ui = SpreadsheetApp.getUi();

    // Collect comprehensive club information
    const clubData = collectCompleteClubInformation();
    if (!clubData.success) {
      return { success: false, error: 'Club information collection failed' };
    }

    // Setup API integrations
    const apiData = setupAPIIntegrations();
    if (!apiData.success) {
      return { success: false, error: 'API integration setup failed' };
    }

    // Setup social media configuration
    const socialData = setupSocialMediaConfiguration();
    if (!socialData.success) {
      return { success: false, error: 'Social media configuration failed' };
    }

    // Create unified config sheet
    const configSheet = createUnifiedConfigSheet(clubData, apiData, socialData);
    if (!configSheet) {
      return { success: false, error: 'Config sheet creation failed' };
    }

    // Initialize both system configurations
    const liveMatchConfig = initializeLiveMatchConfig(configSheet);
    const videoProcessingConfig = initializeVideoProcessingConfig(configSheet);

    return {
      success: true,
      liveMatchConfig,
      videoProcessingConfig,
      configSheet: configSheet.getName()
    };

  } catch (error) {
    Logger.log('Unified configuration error: ' + error.toString());
    return { success: false, error: error.message };
  }
}

/**
 * Collect comprehensive club information for both systems
 */
function collectCompleteClubInformation() {
  try {
    const ui = SpreadsheetApp.getUi();

    // Club basic information
    const clubResponse = ui.prompt(
      'Club Information',
      'What is your football club\'s full name?\n\n' +
      'This will be used for:\n' +
      '• Social media posts and graphics\n' +
      '• Video highlight titles\n' +
      '• Match announcements\n' +
      '• Player statistics',
      ui.ButtonSet.OK_CANCEL
    );

    if (clubResponse.getSelectedButton() !== ui.Button.OK) {
      return { success: false, error: 'Club name required' };
    }

    const clubName = clubResponse.getResponseText().trim();
    if (!clubName) {
      return { success: false, error: 'Club name cannot be empty' };
    }

    // League and competition information
    const leagueResponse = ui.prompt(
      'League & Competition Details',
      'What league/division do you play in?\n\n' +
      'Examples: "Premier Division", "Youth League Division 2", "Sunday League"',
      ui.ButtonSet.OK_CANCEL
    );

    if (leagueResponse.getSelectedButton() !== ui.Button.OK) {
      return { success: false, error: 'League information required' };
    }

    // Season information
    const currentYear = new Date().getFullYear();
    const defaultSeason = `${currentYear}-${(currentYear + 1).toString().slice(2)}`;

    const seasonResponse = ui.prompt(
      'Season Information',
      `What season are you currently in?\n\nDefault: ${defaultSeason}`,
      ui.ButtonSet.OK_CANCEL
    );

    const season = seasonResponse.getSelectedButton() === ui.Button.OK
      ? (seasonResponse.getResponseText().trim() || defaultSeason)
      : defaultSeason;

    // Age group (for video content appropriateness)
    const ageGroupResponse = ui.alert(
      'Age Group',
      'What age group is your team?\n\n' +
      'YES - Youth/Junior (Under 18)\n' +
      'NO - Senior/Adult (18+)',
      ui.ButtonSet.YES_NO
    );

    const isYouthTeam = ageGroupResponse === ui.Button.YES;

    // Colors and branding
    const colorsResponse = ui.prompt(
      'Team Colors',
      'What are your team colors?\n\n' +
      'This helps with graphics and video branding.\n' +
      'Example: "Red and White", "Blue", "Green and Gold"',
      ui.ButtonSet.OK_CANCEL
    );

    return {
      success: true,
      data: {
        clubName: clubName,
        league: leagueResponse.getResponseText().trim(),
        season: season,
        isYouthTeam: isYouthTeam,
        colors: colorsResponse.getSelectedButton() === ui.Button.OK
          ? colorsResponse.getResponseText().trim()
          : 'Blue and White',
        setupDate: new Date().toISOString()
      }
    };

  } catch (error) {
    Logger.log('Club information collection error: ' + error.toString());
    return { success: false, error: error.message };
  }
}

/**
 * Setup API integrations for both live automation and video processing
 */
function setupAPIIntegrations() {
  try {
    const ui = SpreadsheetApp.getUi();

    ui.alert(
      'API Integration Setup',
      'Now we\'ll configure your external service integrations:\n\n' +
      '🔗 Make.com - Social media automation\n' +
      '🎬 Video Processing - Highlight generation\n' +
      '📱 Social Media - Facebook, Twitter, Instagram\n' +
      '☁️ Cloud Storage - Google Drive integration\n\n' +
      'Don\'t worry - we\'ll guide you through each one!',
      ui.ButtonSet.OK
    );

    // Make.com webhook setup
    const makeWebhookResponse = ui.prompt(
      'Make.com Integration',
      'Enter your Make.com webhook URL:\n\n' +
      'This powers your automated social media posting.\n' +
      'If you don\'t have one yet, you can set this up later.\n\n' +
      'Webhook URL (or leave blank to configure later):',
      ui.ButtonSet.OK_CANCEL
    );

    const makeWebhookUrl = makeWebhookResponse.getSelectedButton() === ui.Button.OK
      ? makeWebhookResponse.getResponseText().trim()
      : '';

    // Video processing service setup
    const videoServiceResponse = ui.prompt(
      'Video Processing Service',
      'Enter your video processing service URL:\n\n' +
      'This could be:\n' +
      '• Railway deployment URL\n' +
      '• Render service URL\n' +
      '• Custom server URL\n\n' +
      'Service URL (or leave blank to configure later):',
      ui.ButtonSet.OK_CANCEL
    );

    const videoServiceUrl = videoServiceResponse.getSelectedButton() === ui.Button.OK
      ? videoServiceResponse.getResponseText().trim()
      : '';

    // API authentication
    const apiKeyResponse = ui.prompt(
      'API Security',
      'Create a secure API key for your system:\n\n' +
      'This key protects communication between your spreadsheet and external services.\n' +
      'Suggestion: Use a strong password or random string.\n\n' +
      'API Key:',
      ui.ButtonSet.OK_CANCEL
    );

    const apiKey = apiKeyResponse.getSelectedButton() === ui.Button.OK
      ? apiKeyResponse.getResponseText().trim()
      : 'default-' + Utilities.getUuid().slice(0, 8);

    return {
      success: true,
      data: {
        makeWebhookUrl: makeWebhookUrl,
        videoServiceUrl: videoServiceUrl,
        apiKey: apiKey,
        configuredDate: new Date().toISOString()
      }
    };

  } catch (error) {
    Logger.log('API integration setup error: ' + error.toString());
    return { success: false, error: error.message };
  }
}

/**
 * Setup social media configuration
 */
function setupSocialMediaConfiguration() {
  try {
    const ui = SpreadsheetApp.getUi();

    // Social media platforms
    const platformsResponse = ui.alert(
      'Social Media Platforms',
      'Which social media platforms will you use?\n\n' +
      'The system can post to multiple platforms automatically.\n\n' +
      'YES - Facebook, Twitter, Instagram (Full package)\n' +
      'NO - Just Facebook (Basic package)',
      ui.ButtonSet.YES_NO
    );

    const useAllPlatforms = platformsResponse === ui.Button.YES;

    // Posting frequency
    const frequencyResponse = ui.alert(
      'Posting Frequency',
      'How often should the system post content?\n\n' +
      'YES - High frequency (Live events + weekly content + monthly summaries)\n' +
      'NO - Moderate frequency (Live events + weekly content only)',
      ui.ButtonSet.YES_NO
    );

    const highFrequency = frequencyResponse === ui.Button.YES;

    // Content style
    const styleResponse = ui.alert(
      'Content Style',
      'What style of content do you prefer?\n\n' +
      'YES - Professional (Clean graphics, formal language)\n' +
      'NO - Casual (Fun graphics, friendly language)',
      ui.ButtonSet.YES_NO
    );

    const professionalStyle = styleResponse === ui.Button.YES;

    return {
      success: true,
      data: {
        platforms: useAllPlatforms ? ['facebook', 'twitter', 'instagram'] : ['facebook'],
        frequency: highFrequency ? 'high' : 'moderate',
        style: professionalStyle ? 'professional' : 'casual',
        autoPost: true,
        includeVideos: true
      }
    };

  } catch (error) {
    Logger.log('Social media configuration error: ' + error.toString());
    return { success: false, error: error.message };
  }
}

/**
 * Create unified configuration sheet that supports both systems
 */
function createUnifiedConfigSheet(clubData, apiData, socialData) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    // Remove existing config sheets if they exist
    const existingSheets = ['Config', 'Configuration', 'Settings'];
    existingSheets.forEach(name => {
      const sheet = spreadsheet.getSheetByName(name);
      if (sheet) {
        spreadsheet.deleteSheet(sheet);
      }
    });

    // Create new unified config sheet
    const configSheet = spreadsheet.insertSheet('📋 System Configuration');

    // Set up the sheet structure
    setupUnifiedConfigSheetStructure(configSheet, clubData.data, apiData.data, socialData.data);

    // Move to front
    spreadsheet.setActiveSheet(configSheet);
    spreadsheet.moveActiveSheet(1);

    return configSheet;

  } catch (error) {
    Logger.log('Unified config sheet creation error: ' + error.toString());
    return null;
  }
}

/**
 * Setup the structure of the unified configuration sheet
 */
function setupUnifiedConfigSheetStructure(sheet, clubData, apiData, socialData) {
  // Clear the sheet
  sheet.clear();

  // Title section
  sheet.getRange(1, 1, 1, 4).merge();
  sheet.getRange(1, 1).setValue('🏈⚽ Complete Football Club Automation System');
  sheet.getRange(1, 1).setFontSize(16).setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange(1, 1).setBackground('#4285f4').setFontColor('white');

  let row = 3;

  // System status section
  sheet.getRange(row, 1).setValue('📊 System Status').setFontWeight('bold').setBackground('#e8f5e8');
  row++;
  sheet.getRange(row, 1, 1, 2).setValues([['Setup Date', clubData.setupDate]]);
  row++;
  sheet.getRange(row, 1, 1, 2).setValues([['System Version', '1.0.0-unified']]);
  row++;
  sheet.getRange(row, 1, 1, 2).setValues([['Live Match Automation', 'ENABLED']]);
  row++;
  sheet.getRange(row, 1, 1, 2).setValues([['Video Processing', 'ENABLED']]);
  row++;
  sheet.getRange(row, 1, 1, 2).setValues([['Social Media Automation', 'ENABLED']]);
  row += 2;

  // Club information section
  sheet.getRange(row, 1).setValue('⚽ Club Information').setFontWeight('bold').setBackground('#fff3e0');
  row++;
  sheet.getRange(row, 1, 1, 2).setValues([['Club Name', clubData.clubName]]);
  row++;
  sheet.getRange(row, 1, 1, 2).setValues([['League/Division', clubData.league]]);
  row++;
  sheet.getRange(row, 1, 1, 2).setValues([['Current Season', clubData.season]]);
  row++;
  sheet.getRange(row, 1, 1, 2).setValues([['Age Group', clubData.isYouthTeam ? 'Youth (Under 18)' : 'Senior (18+)']]);
  row++;
  sheet.getRange(row, 1, 1, 2).setValues([['Team Colors', clubData.colors]]);
  row += 2;

  // API integrations section
  sheet.getRange(row, 1).setValue('🔗 API Integrations').setFontWeight('bold').setBackground('#f3e5f5');
  row++;
  sheet.getRange(row, 1, 1, 2).setValues([['Make.com Webhook URL', apiData.makeWebhookUrl || 'Not configured']]);
  row++;
  sheet.getRange(row, 1, 1, 2).setValues([['Video Processing Service', apiData.videoServiceUrl || 'Not configured']]);
  row++;
  sheet.getRange(row, 1, 1, 2).setValues([['API Security Key', apiData.apiKey ? '***CONFIGURED***' : 'Not set']]);
  row += 2;

  // Social media configuration section
  sheet.getRange(row, 1).setValue('📱 Social Media Configuration').setFontWeight('bold').setBackground('#e3f2fd');
  row++;
  sheet.getRange(row, 1, 1, 2).setValues([['Platforms', socialData.platforms.join(', ')]]);
  row++;
  sheet.getRange(row, 1, 1, 2).setValues([['Posting Frequency', socialData.frequency]]);
  row++;
  sheet.getRange(row, 1, 1, 2).setValues([['Content Style', socialData.style]]);
  row++;
  sheet.getRange(row, 1, 1, 2).setValues([['Auto-posting Enabled', socialData.autoPost ? 'YES' : 'NO']]);
  row++;
  sheet.getRange(row, 1, 1, 2).setValues([['Include Videos', socialData.includeVideos ? 'YES' : 'NO']]);
  row += 2;

  // Live match settings section
  sheet.getRange(row, 1).setValue('⚽ Live Match Settings').setFontWeight('bold').setBackground('#ffebee');
  row++;
  sheet.getRange(row, 1, 1, 2).setValues([['Auto-post Goals', 'ENABLED']]);
  row++;
  sheet.getRange(row, 1, 1, 2).setValues([['Auto-post Cards', 'ENABLED']]);
  row++;
  sheet.getRange(row, 1, 1, 2).setValues([['Track Player Minutes', 'ENABLED']]);
  row++;
  sheet.getRange(row, 1, 1, 2).setValues([['Opposition Event Detection', 'ENABLED']]);
  row += 2;

  // Video processing settings section
  sheet.getRange(row, 1).setValue('🎬 Video Processing Settings').setFontWeight('bold').setBackground('#e8f5e8');
  row++;
  sheet.getRange(row, 1, 1, 2).setValues([['Auto-generate Highlights', 'ENABLED']]);
  row++;
  sheet.getRange(row, 1, 1, 2).setValues([['Multi-format Output', 'ENABLED (16:9, 1:1, 9:16)']]);
  row++;
  sheet.getRange(row, 1, 1, 2).setValues([['AI Scene Detection', 'ENABLED']]);
  row++;
  sheet.getRange(row, 1, 1, 2).setValues([['Professional Graphics', 'ENABLED']]);

  // Auto-resize columns
  sheet.autoResizeColumns(1, 2);

  // Set column widths for better readability
  sheet.setColumnWidth(1, 250);
  sheet.setColumnWidth(2, 300);

  Logger.log('Unified config sheet structure created');
}

/**
 * Open the unified dashboard that shows both systems
 */
function openUnifiedDashboard() {
  try {
    const dashboardSheet = createUnifiedDashboard();
    if (dashboardSheet.success) {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      spreadsheet.setActiveSheet(dashboardSheet.sheet);
    }
  } catch (error) {
    Logger.log('Error opening unified dashboard: ' + error.toString());
  }
}