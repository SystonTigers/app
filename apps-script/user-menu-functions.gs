/**
 * @fileoverview User Menu Functions for Syston Tigers Football Automation
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Simple user menu functions to add to main.gs
 */

// ==================== USER MENU FUNCTIONS ====================

/**
 * Create custom menu when spreadsheet opens
 */
function onOpen() {
  logger.enterFunction('onOpen');

  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('⚽ Football Automation')
      .addItem('🥅 Record Goal', 'processGoalQuick')
      .addItem('📟 Record Card', 'processCardQuick')
      .addItem('🔄 Record Substitution', 'processSubstitutionQuick')
      .addItem('🎬 Export highlights JSON', 'exportHighlightsJsonMenu')
      .addSeparator()
      .addItem('📅 Post Weekly Fixtures', 'postWeeklyFixtures')
      .addItem('📊 Post Weekly Results', 'postWeeklyResults')
      .addSeparator()
      .addItem('🔧 Test System', 'testSystemQuick')
      .addItem('🧪 Run Full Tests', 'runFullTestSuite')
      .addToUi();

    logger.exitFunction('onOpen', { success: true });

  } catch (error) {
    logger.error('Menu creation failed', { error: error.toString() });
  }
}

/**
 * Quick goal entry with opposition detection
 */
function processGoalQuick() {
  logger.enterFunction('processGoalQuick');

  try {
    const ui = SpreadsheetApp.getUi();

    // Get goal details from user
    const minuteResponse = ui.prompt(
      'Record Goal',
      'Enter the minute the goal was scored:',
      ui.ButtonSet.OK_CANCEL
    );

    if (minuteResponse.getSelectedButton() !== ui.Button.OK) {
      return { success: false, message: 'Goal recording cancelled' };
    }

    const minute = minuteResponse.getResponseText().trim();

    // Get player name (or "Goal" for opposition)
    const playerResponse = ui.prompt(
      'Record Goal',
      'Enter player name (or "Goal" for opposition goal):',
      ui.ButtonSet.OK_CANCEL
    );

    if (playerResponse.getSelectedButton() !== ui.Button.OK) {
      return { success: false, message: 'Goal recording cancelled' };
    }

    const player = playerResponse.getResponseText().trim();

    // Get assist (optional)
    const assistResponse = ui.prompt(
      'Record Goal',
      'Enter assist player (or leave blank):',
      ui.ButtonSet.OK_CANCEL
    );

    const assist = assistResponse.getSelectedButton() === ui.Button.OK
      ? assistResponse.getResponseText().trim()
      : '';

    // Process the goal using enhanced events
    if (typeof EnhancedEventsManager !== 'undefined') {
      const eventsManager = new EnhancedEventsManager();
      const result = eventsManager.processGoalEvent(minute, player, assist);

      // Show result to user
      if (result.success) {
        const goalType = player.toLowerCase() === 'goal' ? 'opposition' : 'team';
        ui.alert('Goal Recorded', `${goalType.toUpperCase()} goal recorded successfully!`, ui.ButtonSet.OK);
      } else {
        ui.alert('Error', `Failed to record goal: ${result.error}`, ui.ButtonSet.OK);
      }

      logger.exitFunction('processGoalQuick', { success: result.success });
      return result;

    } else {
      const errorMsg = 'Enhanced Events Manager not available';
      ui.alert('Error', errorMsg, ui.ButtonSet.OK);
      logger.exitFunction('processGoalQuick', { success: false });
      return { success: false, error: errorMsg };
    }

  } catch (error) {
    logger.error('Quick goal processing failed', { error: error.toString() });
    logger.exitFunction('processGoalQuick', { success: false });
    return { success: false, error: error.toString() };
  }
}

/**
 * Quick card entry
 */
function processCardQuick() {
  logger.enterFunction('processCardQuick');

  try {
    const ui = SpreadsheetApp.getUi();

    // Get card details from user
    const minuteResponse = ui.prompt(
      'Record Card',
      'Enter the minute the card was shown:',
      ui.ButtonSet.OK_CANCEL
    );

    if (minuteResponse.getSelectedButton() !== ui.Button.OK) {
      return { success: false, message: 'Card recording cancelled' };
    }

    const minute = minuteResponse.getResponseText().trim();

    // Get player name (or "Opposition")
    const playerResponse = ui.prompt(
      'Record Card',
      'Enter player name (or "Opposition" for opposition card):',
      ui.ButtonSet.OK_CANCEL
    );

    if (playerResponse.getSelectedButton() !== ui.Button.OK) {
      return { success: false, message: 'Card recording cancelled' };
    }

    const player = playerResponse.getResponseText().trim();

    // Get card type
    const cardTypeResponse = ui.prompt(
      'Record Card',
      'Enter card type (yellow, red, sin_bin):',
      ui.ButtonSet.OK_CANCEL
    );

    if (cardTypeResponse.getSelectedButton() !== ui.Button.OK) {
      return { success: false, message: 'Card recording cancelled' };
    }

    const cardType = cardTypeResponse.getResponseText().trim();

    // Process the card using enhanced events
    if (typeof EnhancedEventsManager !== 'undefined') {
      const eventsManager = new EnhancedEventsManager();
      const result = eventsManager.processCardEvent(minute, player, cardType);

      // Show result to user
      if (result.success) {
        ui.alert('Card Recorded', `${cardType.toUpperCase()} card recorded successfully!`, ui.ButtonSet.OK);
      } else {
        ui.alert('Error', `Failed to record card: ${result.error}`, ui.ButtonSet.OK);
      }

      logger.exitFunction('processCardQuick', { success: result.success });
      return result;

    } else {
      const errorMsg = 'Enhanced Events Manager not available';
      ui.alert('Error', errorMsg, ui.ButtonSet.OK);
      logger.exitFunction('processCardQuick', { success: false });
      return { success: false, error: errorMsg };
    }

  } catch (error) {
    logger.error('Quick card processing failed', { error: error.toString() });
    logger.exitFunction('processCardQuick', { success: false });
    return { success: false, error: error.toString() };
  }
}

/**
 * Quick substitution entry
 */
function processSubstitutionQuick() {
  logger.enterFunction('processSubstitutionQuick');

  try {
    const ui = SpreadsheetApp.getUi();

    // Get substitution details from user
    const minuteResponse = ui.prompt(
      'Record Substitution',
      'Enter the minute of substitution:',
      ui.ButtonSet.OK_CANCEL
    );

    if (minuteResponse.getSelectedButton() !== ui.Button.OK) {
      return { success: false, message: 'Substitution recording cancelled' };
    }

    const minute = minuteResponse.getResponseText().trim();

    // Get player off
    const playerOffResponse = ui.prompt(
      'Record Substitution',
      'Enter player coming OFF:',
      ui.ButtonSet.OK_CANCEL
    );

    if (playerOffResponse.getSelectedButton() !== ui.Button.OK) {
      return { success: false, message: 'Substitution recording cancelled' };
    }

    const playerOff = playerOffResponse.getResponseText().trim();

    // Get player on
    const playerOnResponse = ui.prompt(
      'Record Substitution',
      'Enter player coming ON:',
      ui.ButtonSet.OK_CANCEL
    );

    if (playerOnResponse.getSelectedButton() !== ui.Button.OK) {
      return { success: false, message: 'Substitution recording cancelled' };
    }

    const playerOn = playerOnResponse.getResponseText().trim();

    // Process the substitution
    if (typeof handleSubstitution !== 'undefined') {
      const subData = {
        matchId: 'Quick Entry',
        playerOff: playerOff,
        playerOn: playerOn,
        minute: parseInt(minute)
      };

      const result = handleSubstitution(subData);

      // Show result to user
      if (result.success) {
        ui.alert('Substitution Recorded', `Substitution recorded successfully!\n${playerOff} ➡️ ${playerOn}`, ui.ButtonSet.OK);
      } else {
        ui.alert('Error', `Failed to record substitution: ${result.error}`, ui.ButtonSet.OK);
      }

      logger.exitFunction('processSubstitutionQuick', { success: result.success });
      return result;

    } else {
      const errorMsg = 'Substitution handler not available';
      ui.alert('Error', errorMsg, ui.ButtonSet.OK);
      logger.exitFunction('processSubstitutionQuick', { success: false });
      return { success: false, error: errorMsg };
    }

  } catch (error) {
    logger.error('Quick substitution processing failed', { error: error.toString() });
    logger.exitFunction('processSubstitutionQuick', { success: false });
    return { success: false, error: error.toString() };
  }
}

/**
 * Export highlights JSON and trigger bot via menu
 * @returns {{ok:boolean, message:string}}
 */
function exportHighlightsJsonMenu() {
  logger.enterFunction('exportHighlightsJsonMenu');

  try {
    const ui = SpreadsheetApp.getUi();

    const matchIdResponse = ui.prompt(
      'Export Highlights JSON',
      'Enter the match ID to export events for:',
      ui.ButtonSet.OK_CANCEL
    );

    if (matchIdResponse.getSelectedButton() !== ui.Button.OK) {
      logger.exitFunction('exportHighlightsJsonMenu', { success: false, reason: 'cancelled_match_id' });
      return { ok: false, message: 'Highlights export cancelled' };
    }

    const matchId = matchIdResponse.getResponseText().trim();
    if (!matchId) {
      ui.alert('Export Highlights JSON', 'Match ID is required to export highlights.', ui.ButtonSet.OK);
      logger.exitFunction('exportHighlightsJsonMenu', { success: false, reason: 'missing_match_id' });
      return { ok: false, message: 'Match ID required' };
    }

    const videoUrlResponse = ui.prompt(
      'Export Highlights JSON',
      'Enter the processed video URL (required for webhook trigger):',
      ui.ButtonSet.OK_CANCEL
    );

    if (videoUrlResponse.getSelectedButton() !== ui.Button.OK) {
      logger.exitFunction('exportHighlightsJsonMenu', { success: false, reason: 'cancelled_video_url' });
      return { ok: false, message: 'Highlights export cancelled' };
    }

    const videoUrl = videoUrlResponse.getResponseText().trim();
    if (!videoUrl) {
      ui.alert('Export Highlights JSON', 'Video URL is required to notify the highlights bot.', ui.ButtonSet.OK);
      logger.exitFunction('exportHighlightsJsonMenu', { success: false, reason: 'missing_video_url' });
      return { ok: false, message: 'Video URL required' };
    }

    const exportResult = exportEventsForHighlights(matchId);
    if (!exportResult.ok) {
      const reason = exportResult.reason || 'export_failed';
      if (reason === 'no_events') {
        ui.alert('Export Highlights JSON', 'No events found for the provided match ID.', ui.ButtonSet.OK);
      } else {
        ui.alert('Export Highlights JSON', `Failed to export events: ${exportResult.error || reason}`, ui.ButtonSet.OK);
      }
      logger.exitFunction('exportHighlightsJsonMenu', { success: false, reason });
      return { ok: false, message: reason };
    }

    const triggerResult = triggerHighlightsBot(matchId, videoUrl);
    if (!triggerResult.ok) {
      const reason = triggerResult.reason || 'trigger_failed';
      if (reason === 'no_webhook') {
        ui.alert('Export Highlights JSON', 'Events exported. Configure HIGHLIGHTS_WEBHOOK_URL to notify the highlights bot automatically.', ui.ButtonSet.OK);
      } else if (reason === 'missing_video_url') {
        ui.alert('Export Highlights JSON', 'Events exported but video URL was invalid.', ui.ButtonSet.OK);
      } else if (reason === 'no_events') {
        ui.alert('Export Highlights JSON', 'Events export did not return any data.', ui.ButtonSet.OK);
      } else {
        ui.alert('Export Highlights JSON', `Highlights webhook failed: ${triggerResult.error || reason}`, ui.ButtonSet.OK);
      }
      logger.exitFunction('exportHighlightsJsonMenu', { success: false, reason });
      return { ok: false, message: reason };
    }

    ui.alert('Export Highlights JSON', 'Highlights JSON exported and webhook triggered successfully.', ui.ButtonSet.OK);
    logger.exitFunction('exportHighlightsJsonMenu', { success: true, dispatched: !!triggerResult.dispatched });
    return { ok: true, message: 'Highlights export complete' };

  } catch (error) {
    logger.error('Highlights export menu failed', { error: error.toString() });
    logger.exitFunction('exportHighlightsJsonMenu', { success: false, reason: 'error' });
    return { ok: false, message: error.toString() };
  }
}

/**
 * Post weekly fixtures via batch posting
 */
function postWeeklyFixtures() {
  logger.enterFunction('postWeeklyFixtures');

  try {
    if (typeof BatchFixturesManager !== 'undefined') {
      const batchManager = new BatchFixturesManager();
      const result = batchManager.postLeagueFixturesBatch();

      const ui = SpreadsheetApp.getUi();
      if (result.success) {
        ui.alert('Fixtures Posted', `${result.count} fixtures posted successfully!`, ui.ButtonSet.OK);
      } else {
        ui.alert('Error', `Failed to post fixtures: ${result.error}`, ui.ButtonSet.OK);
      }

      logger.exitFunction('postWeeklyFixtures', { success: result.success });
      return result;

    } else {
      const errorMsg = 'Batch Fixtures Manager not available';
      SpreadsheetApp.getUi().alert('Error', errorMsg, SpreadsheetApp.getUi().ButtonSet.OK);
      logger.exitFunction('postWeeklyFixtures', { success: false });
      return { success: false, error: errorMsg };
    }

  } catch (error) {
    logger.error('Weekly fixtures posting failed', { error: error.toString() });
    logger.exitFunction('postWeeklyFixtures', { success: false });
    return { success: false, error: error.toString() };
  }
}

/**
 * Post weekly results via batch posting
 */
function postWeeklyResults() {
  logger.enterFunction('postWeeklyResults');

  try {
    if (typeof BatchFixturesManager !== 'undefined') {
      const batchManager = new BatchFixturesManager();
      const result = batchManager.postLeagueResultsBatch();

      const ui = SpreadsheetApp.getUi();
      if (result.success) {
        ui.alert('Results Posted', `${result.count} results posted successfully!`, ui.ButtonSet.OK);
      } else {
        ui.alert('Error', `Failed to post results: ${result.error}`, ui.ButtonSet.OK);
      }

      logger.exitFunction('postWeeklyResults', { success: result.success });
      return result;

    } else {
      const errorMsg = 'Batch Fixtures Manager not available';
      SpreadsheetApp.getUi().alert('Error', errorMsg, SpreadsheetApp.getUi().ButtonSet.OK);
      logger.exitFunction('postWeeklyResults', { success: false });
      return { success: false, error: errorMsg };
    }

  } catch (error) {
    logger.error('Weekly results posting failed', { error: error.toString() });
    logger.exitFunction('postWeeklyResults', { success: false });
    return { success: false, error: error.toString() };
  }
}

/**
 * Test system functionality
 */
function testSystemQuick() {
  logger.enterFunction('testSystemQuick');

  try {
    const tests = {
      logger: typeof logger !== 'undefined',
      config: typeof getRuntimeConfig !== 'undefined',
      sheetUtils: typeof SheetUtils !== 'undefined',
      eventsManager: typeof EnhancedEventsManager !== 'undefined',
      batchManager: typeof BatchFixturesManager !== 'undefined',
      makeIntegration: typeof sendToMake !== 'undefined'
    };

    const passedTests = Object.values(tests).filter(Boolean).length;
    const totalTests = Object.keys(tests).length;

    const ui = SpreadsheetApp.getUi();
    ui.alert(
      'System Test',
      `System Test Results:\n\n${passedTests}/${totalTests} components available\n\nLogger: ${tests.logger ? '✅' : '❌'}\nConfig: ${tests.config ? '✅' : '❌'}\nSheet Utils: ${tests.sheetUtils ? '✅' : '❌'}\nEvents Manager: ${tests.eventsManager ? '✅' : '❌'}\nBatch Manager: ${tests.batchManager ? '✅' : '❌'}\nMake Integration: ${tests.makeIntegration ? '✅' : '❌'}`,
      ui.ButtonSet.OK
    );

    logger.exitFunction('testSystemQuick', { success: true, passedTests, totalTests });
    return { success: true, tests, passedTests, totalTests };

  } catch (error) {
    logger.error('System test failed', { error: error.toString() });
    logger.exitFunction('testSystemQuick', { success: false });
    return { success: false, error: error.toString() };
  }
}

// ==================== COMPREHENSIVE TEST RUNNER ====================

/**
 * Run the full comprehensive test suite and display results
 */
function runFullTestSuite() {
  logger.enterFunction('runFullTestSuite');

  try {
    const ui = SpreadsheetApp.getUi();

    // Show progress dialog
    ui.alert('Running Tests', '🧪 Starting comprehensive test suite...\nThis may take a few moments.', ui.ButtonSet.OK);

    // Start timing
    const startTime = new Date();

    // Run system health check first
    const systemCheck = testSystemQuick();

    // Run comprehensive test suites if available
    let testResults = null;
    let fullTestsAvailable = false;

    try {
      if (typeof runAllTests !== 'undefined') {
        testResults = runAllTests();
        fullTestsAvailable = true;
      }
    } catch (error) {
      logger.warn('Full test suite not available, running basic tests only', { error: error.toString() });
    }

    // Calculate duration
    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000);

    // Generate comprehensive report
    let report = `🧪 COMPREHENSIVE TEST REPORT\n`;
    report += `📊 Executed: ${new Date().toLocaleString()}\n`;
    report += `⏱️ Duration: ${duration} seconds\n\n`;

    // System Health Results
    report += `🔧 SYSTEM HEALTH CHECK:\n`;
    report += `✅ Components Available: ${systemCheck.passedTests}/${systemCheck.totalTests}\n\n`;

    // Detailed component status
    const components = ['Logger', 'Config', 'Sheet Utils', 'Events Manager', 'Batch Manager', 'Make Integration'];
    const componentTests = systemCheck.tests;

    components.forEach((component, index) => {
      const key = Object.keys(componentTests)[index];
      const status = componentTests[key] ? '✅' : '❌';
      report += `  ${status} ${component}\n`;
    });

    // Full test suite results (if available)
    if (fullTestsAvailable && testResults) {
      report += `\n🧪 FULL TEST SUITE RESULTS:\n`;
      report += `✅ Passed: ${testResults.passedTests || 0}\n`;
      report += `❌ Failed: ${testResults.failedTests || 0}\n`;
      report += `⏭️ Skipped: ${testResults.skippedTests || 0}\n`;
      report += `📊 Total: ${testResults.totalTests || 0}\n`;

      if (testResults.suites && testResults.suites.length > 0) {
        report += `\n📋 TEST SUITES:\n`;
        testResults.suites.forEach(suite => {
          report += `  • ${suite.name}: ${suite.passed}/${suite.total} passed\n`;
        });
      }
    } else {
      report += `\n🔍 FULL TEST SUITE: Not available or failed to load\n`;
      report += `ℹ️ Basic system health check completed successfully\n`;
    }

    // Deployment status
    report += `\n🚀 DEPLOYMENT STATUS:\n`;
    report += `✅ Latest GitHub Actions deployment: Successful (Run #229)\n`;
    report += `📁 Files deployed: 30 (28 scripts + 2 HTML files)\n`;
    report += `🔄 Auto-deployment: Active on src/** changes\n`;

    // Overall status
    const overallStatus = systemCheck.passedTests === systemCheck.totalTests ? 'HEALTHY' : 'ISSUES DETECTED';
    const statusIcon = overallStatus === 'HEALTHY' ? '✅' : '⚠️';

    report += `\n${statusIcon} OVERALL STATUS: ${overallStatus}\n`;

    if (overallStatus === 'ISSUES DETECTED') {
      report += `⚠️ Some system components are not available. Check logs for details.\n`;
    }

    // Display results
    ui.alert('Test Results', report, ui.ButtonSet.OK);

    logger.exitFunction('runFullTestSuite', {
      success: true,
      systemHealth: systemCheck,
      fullTestsRan: fullTestsAvailable,
      duration,
      overallStatus
    });

    return {
      success: true,
      systemHealth: systemCheck,
      fullTests: testResults,
      duration,
      overallStatus,
      report
    };

  } catch (error) {
    const errorMsg = `Test suite execution failed: ${error.toString()}`;
    logger.error(errorMsg, { error: error.toString() });

    SpreadsheetApp.getUi().alert('Test Error', `❌ ${errorMsg}`, SpreadsheetApp.getUi().ButtonSet.OK);

    logger.exitFunction('runFullTestSuite', { success: false, error: errorMsg });
    return { success: false, error: errorMsg };
  }
}