/**
 * @fileoverview Main application functions for Syston Automation Template
 * @version 1.0.0
 * @description Template wrapper functions that call the Library
 */

/**
 * Setup and installation wrapper
 * This is called by the Setup Wizard
 * @param {Object} formData - Configuration data from the wizard
 * @return {Object} Installation result
 */
function app_setupInstall(formData) {
  try {
    // Validate form data
    if (!formData.TEAM_NAME || formData.TEAM_NAME.trim() === '') {
      throw new Error('Team name is required');
    }

    if (!formData.PRIMARY_COLOR || !formData.PRIMARY_COLOR.match(/^#[0-9A-Fa-f]{6}$/)) {
      throw new Error('Valid primary color is required');
    }

    if (!formData.SECONDARY_COLOR || !formData.SECONDARY_COLOR.match(/^#[0-9A-Fa-f]{6}$/)) {
      throw new Error('Valid secondary color is required');
    }

    // Clean and prepare configuration
    const config = {
      TEAM_NAME: formData.TEAM_NAME.trim(),
      HOME_VENUE: formData.HOME_VENUE ? formData.HOME_VENUE.trim() : '',
      TIMEZONE: formData.TIMEZONE || 'Europe/London',
      PRIMARY_COLOR: formData.PRIMARY_COLOR.toUpperCase(),
      SECONDARY_COLOR: formData.SECONDARY_COLOR.toUpperCase(),
      LEAGUE_URL: formData.LEAGUE_URL ? formData.LEAGUE_URL.trim() : '',
      MAKE_WEBHOOK_RESULTS: formData.MAKE_WEBHOOK_RESULTS ? formData.MAKE_WEBHOOK_RESULTS.trim() : '',
      SEASON: formData.SEASON || (new Date().getFullYear() + '/' + (new Date().getFullYear() + 1)),
      ENABLE_PRIVACY_CHECKS: formData.ENABLE_PRIVACY_CHECKS || 'true',
      ENABLE_MONITORING: formData.ENABLE_MONITORING || 'true',
      CACHE_TTL_MINUTES: '30',
      LOG_LEVEL: 'INFO'
    };

    // Persist configuration to Script Properties first
    PropertiesService.getScriptProperties().setProperties(config, true);

    // Call the Library's installation function
    const installResult = SystonAutomationLib.SA_install_(config);

    // Mark setup as complete
    PropertiesService.getDocumentProperties().setProperty('SETUP_DONE', '1');
    PropertiesService.getDocumentProperties().setProperty('SETUP_DATE', new Date().toISOString());

    // Add welcome data to sheets
    app_addWelcomeData(config.TEAM_NAME);

    return {
      success: true,
      status: installResult.status,
      config: config,
      installResult: installResult,
      setupComplete: true
    };

  } catch (error) {
    console.error('Setup installation failed:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Add welcome/sample data to help users get started
 * @param {string} teamName - Team name for personalization
 */
function app_addWelcomeData(teamName) {
  try {
    const ss = SpreadsheetApp.getActive();

    // Add sample players
    const playersSheet = ss.getSheetByName('Players');
    if (playersSheet && playersSheet.getLastRow() <= 1) {
      playersSheet.appendRow(['John Smith', 'Forward', '9', 'Yes', 'Yes']);
      playersSheet.appendRow(['Mike Johnson', 'Midfielder', '8', 'Yes', 'Yes']);
      playersSheet.appendRow(['David Wilson', 'Defender', '5', 'Yes', 'No']);
    }

    // Add sample consent records
    const consentSheet = ss.getSheetByName('Player_Consents');
    if (consentSheet && consentSheet.getLastRow() <= 1) {
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      consentSheet.appendRow(['john_smith', 'John Smith', 'Yes', oneYearFromNow, 'Parent consent given', new Date()]);
      consentSheet.appendRow(['mike_johnson', 'Mike Johnson', 'Yes', oneYearFromNow, 'Adult player consent', new Date()]);
      consentSheet.appendRow(['david_wilson', 'David Wilson', 'No', '', 'Consent declined', new Date()]);
    }

    // Add sample fixture
    const fixturesSheet = ss.getSheetByName('Fixtures');
    if (fixturesSheet && fixturesSheet.getLastRow() <= 1) {
      const nextSaturday = new Date();
      nextSaturday.setDate(nextSaturday.getDate() + (6 - nextSaturday.getDay()));

      fixturesSheet.appendRow([
        nextSaturday,
        'Sample FC',
        'Home',
        'League',
        '',
        'Sample fixture - edit or delete as needed'
      ]);
    }

    console.log('Welcome data added successfully');

  } catch (error) {
    console.error('Failed to add welcome data:', error);
    // Don't fail the setup if this fails
  }
}

/**
 * Update player consent from UI
 * @param {string} playerId - Player ID
 * @param {string} playerName - Player name
 * @param {boolean} consentGiven - Consent status
 * @param {string} notes - Optional notes
 * @return {Object} Update result
 */
function app_updatePlayerConsent(playerId, playerName, consentGiven, notes) {
  try {
    const result = SystonAutomationLib.SA_updatePlayerConsent_(
      playerId,
      playerName,
      consentGiven,
      null, // No expiry date for now
      notes
    );

    return result;

  } catch (error) {
    console.error('Player consent update failed:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Process a match event from the UI or sheets
 * @param {Object} eventData - Event data
 * @return {Object} Processing result
 */
function app_processMatchEvent(eventData) {
  try {
    return SystonAutomationLib.SA_processMatchEvent_(eventData);
  } catch (error) {
    console.error('Match event processing failed:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Get system status for dashboard
 * @return {Object} System status
 */
function app_getSystemStatus() {
  try {
    const health = SystonAutomationLib.SA_health_();
    const metrics = SystonAutomationLib.SA_getMetrics_();
    const config = SystonAutomationLib.SA_getConfigForUI_();

    return {
      health: health,
      metrics: metrics,
      config: config,
      version: SystonAutomationLib.getLibraryVersion(),
      setupComplete: !!PropertiesService.getDocumentProperties().getProperty('SETUP_DONE')
    };

  } catch (error) {
    console.error('System status check failed:', error);
    return {
      error: error.toString(),
      setupComplete: false
    };
  }
}

/**
 * Handle GDPR data request
 * @param {string} playerId - Player ID
 * @param {string} requestType - Request type (export, delete, etc.)
 * @param {string} details - Request details
 * @return {Object} Request result
 */
function app_handleGDPRRequest(playerId, requestType, details) {
  try {
    return SystonAutomationLib.SA_handleGDPRRequest_(playerId, requestType, details);
  } catch (error) {
    console.error('GDPR request failed:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Get recent logs for troubleshooting
 * @param {number} limit - Number of logs to return
 * @return {Array} Recent log entries
 */
function app_getRecentLogs(limit = 20) {
  try {
    return SystonAutomationLib.SA_getRecentLogs_(limit);
  } catch (error) {
    console.error('Failed to get logs:', error);
    return [];
  }
}

/**
 * Test the library connection
 * @return {Object} Test result
 */
function app_testLibrary() {
  try {
    const version = SystonAutomationLib.getLibraryVersion();
    const health = SystonAutomationLib.SA_health_();

    return {
      success: true,
      version: version,
      health: health,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      message: 'Library connection failed. Please check that the SystonAutomationLib library is properly added and enabled.'
    };
  }
}

/**
 * Reset system configuration (admin function)
 * @return {Object} Reset result
 */
function app_resetSystem() {
  try {
    // Clear all configuration
    PropertiesService.getScriptProperties().deleteAllProperties();
    PropertiesService.getDocumentProperties().deleteAllProperties();

    // Clear cache
    SystonAutomationLib.SA_Cache_.clear();

    return {
      success: true,
      message: 'System reset completed. Please run Setup Wizard again.'
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Manual trigger for hourly refresh (for testing)
 * @return {Object} Refresh result
 */
function app_manualRefresh() {
  try {
    SystonAutomationLib.SA_hourlyRefresh();
    return {
      success: true,
      message: 'Manual refresh completed',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}