/**
 * @fileoverview Monthly summaries public API and initialization
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Public API functions and module initialization (split from monthly-summaries.gs)
 */

// ==================== PUBLIC API FUNCTIONS ====================

/**
 * Initialize monthly summaries system
 * @returns {Object} Initialization result
 */
function initializeMonthlySummaries() {
  try {
    const manager = new MonthlySummariesManager();

    // Test basic functionality
    const testResult = manager.buildMonthKey(2024, 1);

    return {
      success: true,
      manager: 'MonthlySummariesManager',
      modules: ['monthly-core.gs', 'monthly-fixtures.gs', 'monthly-gotm.gs', 'monthly-api.gs'],
      testKey: testResult,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Post monthly fixtures summary - Public API
 * @param {number|null} month - Optional month override (1-12)
 * @param {number|null} year - Optional year override
 * @returns {Object} Posting result
 */
function postMonthlyFixturesSummary(month = null, year = null) {
  try {
    // Record quota usage for this operation
    if (typeof QuotaMonitor !== 'undefined') {
      QuotaMonitor.recordUsage('URL_FETCH', 1);
      QuotaMonitor.recordUsage('PROPERTIES_READ', 5);
      QuotaMonitor.recordUsage('PROPERTIES_WRITE', 2);
    }

    const manager = new MonthlySummariesManager();
    return manager.postMonthlyFixturesSummary(month, year);

  } catch (error) {
    console.error('Monthly fixtures summary failed:', error);
    return {
      success: false,
      error: error.toString(),
      operation: 'postMonthlyFixturesSummary',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Post monthly results summary - Public API
 * @param {number|null} month - Optional month override (1-12)
 * @param {number|null} year - Optional year override
 * @returns {Object} Posting result
 */
function postMonthlyResultsSummary(month = null, year = null) {
  try {
    // Record quota usage for this operation
    if (typeof QuotaMonitor !== 'undefined') {
      QuotaMonitor.recordUsage('URL_FETCH', 1);
      QuotaMonitor.recordUsage('PROPERTIES_READ', 5);
      QuotaMonitor.recordUsage('PROPERTIES_WRITE', 2);
    }

    const manager = new MonthlySummariesManager();
    return manager.postMonthlyResultsSummary(month, year);

  } catch (error) {
    console.error('Monthly results summary failed:', error);
    return {
      success: false,
      error: error.toString(),
      operation: 'postMonthlyResultsSummary',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Run monthly scheduling check - Determines what content to post
 * @returns {Object} Scheduling result
 */
function runMonthlySchedulingCheck() {
  try {
    const today = new Date();
    const dayOfMonth = today.getDate();
    const results = [];

    // 1st of month: Monthly fixtures summary
    if (dayOfMonth === 1) {
      results.push({
        type: 'fixtures',
        result: postMonthlyFixturesSummary()
      });
    }

    // Last day of month: Monthly results summary
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    if (dayOfMonth === lastDay) {
      results.push({
        type: 'results',
        result: postMonthlyResultsSummary()
      });
    }

    // GOTM scheduling (if enabled)
    if (isFeatureEnabled('GOTM')) {
      // 1st of month: Start GOTM voting for previous month
      if (dayOfMonth === 1) {
        const prevMonth = today.getMonth() === 0 ? 12 : today.getMonth();
        const prevYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();

        results.push({
          type: 'gotm_voting',
          result: startGOTMVoting(prevMonth, prevYear)
        });
      }

      // 6th of month: GOTM winner announcement
      const gotmConfig = getConfigValue('MONTHLY.GOTM', {});
      const winnerDay = gotmConfig.WINNER_ANNOUNCE_DAY || 6;
      if (dayOfMonth === winnerDay) {
        const prevMonth = today.getMonth() === 0 ? 12 : today.getMonth();
        const prevYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();

        results.push({
          type: 'gotm_winner',
          result: announceGOTMWinner(prevMonth, prevYear)
        });
      }
    }

    return {
      success: true,
      date: today.toISOString().split('T')[0],
      dayOfMonth: dayOfMonth,
      tasks: results,
      totalTasks: results.length
    };

  } catch (error) {
    console.error('Monthly scheduling check failed:', error);
    return {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Start GOTM voting - Public API
 * @param {number|null} month - Optional month override (1-12)
 * @param {number|null} year - Optional year override
 * @returns {Object} Voting start result
 */
function startGOTMVoting(month = null, year = null) {
  try {
    // Record quota usage for this operation
    if (typeof QuotaMonitor !== 'undefined') {
      QuotaMonitor.recordUsage('URL_FETCH', 1);
      QuotaMonitor.recordUsage('PROPERTIES_READ', 3);
      QuotaMonitor.recordUsage('PROPERTIES_WRITE', 2);
    }

    const manager = new MonthlySummariesManager();
    return manager.startGOTMVoting(month, year);

  } catch (error) {
    console.error('GOTM voting start failed:', error);
    return {
      success: false,
      error: error.toString(),
      operation: 'startGOTMVoting',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Announce GOTM winner - Public API
 * @param {number|null} month - Optional month override (1-12)
 * @param {number|null} year - Optional year override
 * @returns {Object} Winner announcement result
 */
function announceGOTMWinner(month = null, year = null) {
  try {
    // Record quota usage for this operation
    if (typeof QuotaMonitor !== 'undefined') {
      QuotaMonitor.recordUsage('URL_FETCH', 1);
      QuotaMonitor.recordUsage('PROPERTIES_READ', 3);
      QuotaMonitor.recordUsage('PROPERTIES_WRITE', 2);
    }

    const manager = new MonthlySummariesManager();
    return manager.announceGOTMWinner(month, year);

  } catch (error) {
    console.error('GOTM winner announcement failed:', error);
    return {
      success: false,
      error: error.toString(),
      operation: 'announceGOTMWinner',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Run all monthly scheduled tasks - Master scheduler
 * @returns {Object} Comprehensive results
 */
function runMonthlyScheduledTasks() {
  try {
    const today = new Date();
    const dayOfMonth = today.getDate();
    const results = {};

    // Run the scheduling check
    const scheduleResult = runMonthlySchedulingCheck();
    results.schedule = scheduleResult;

    // Additional special tasks
    if (dayOfMonth === 15) {
      // Mid-month: Clean expired cache
      if (typeof monthlySummariesManager !== 'undefined') {
        monthlySummariesManager.cleanExpiredCache();
        results.maintenance = { cache_cleaned: true };
      }
    }

    return {
      success: true,
      date: today.toISOString().split('T')[0],
      dayOfMonth: dayOfMonth,
      results: results,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Monthly scheduled tasks failed:', error);
    return {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

// ==================== SPECIAL EVENT HANDLERS ====================

/**
 * Post postponed match notification
 * @param {Object} matchData - Match information
 * @returns {Object} Posting result
 */
function postPostponed(matchData) {
  try {
    // Record quota usage
    if (typeof QuotaMonitor !== 'undefined') {
      QuotaMonitor.recordUsage('URL_FETCH', 1);
      QuotaMonitor.recordUsage('PROPERTIES_WRITE', 1);
    }

    const eventType = 'match_postponed';
    const payload = {
      event_type: eventType,
      opposition: matchData.opposition || 'Unknown',
      original_date: matchData.date || null,
      venue: matchData.venue || null,
      competition: matchData.competition || getConfigValue('SYSTEM.LEAGUE'),
      club_info: {
        name: getConfigValue('SYSTEM.CLUB_NAME'),
        season: getConfigValue('SYSTEM.SEASON')
      },
      timestamp: DateUtils.formatISO(DateUtils.now()),
      system_version: getConfigValue('SYSTEM.VERSION')
    };

    const manager = new MonthlySummariesManager();
    const webhookResult = manager.makeIntegration.sendWebhook(payload);

    return {
      success: webhookResult.success,
      webhook: webhookResult,
      payload: payload,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Postponed match posting failed:', error);
    return {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Post second half kick-off notification
 * @param {Object} matchData - Match information
 * @returns {Object} Posting result
 */
function postSecondHalfKickoff(matchData) {
  try {
    // Record quota usage
    if (typeof QuotaMonitor !== 'undefined') {
      QuotaMonitor.recordUsage('URL_FETCH', 1);
    }

    const eventType = 'match_second_half';
    const payload = {
      event_type: eventType,
      opposition: matchData.opposition || 'Unknown',
      current_score: matchData.halftimeScore || { home: 0, away: 0 },
      venue: matchData.venue || null,
      competition: matchData.competition || getConfigValue('SYSTEM.LEAGUE'),
      club_info: {
        name: getConfigValue('SYSTEM.CLUB_NAME'),
        season: getConfigValue('SYSTEM.SEASON')
      },
      timestamp: DateUtils.formatISO(DateUtils.now()),
      system_version: getConfigValue('SYSTEM.VERSION')
    };

    const manager = new MonthlySummariesManager();
    const webhookResult = manager.makeIntegration.sendWebhook(payload);

    return {
      success: webhookResult.success,
      webhook: webhookResult,
      payload: payload,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Second half kickoff posting failed:', error);
    return {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

// ==================== MODULE HEALTH CHECK ====================

/**
 * Test monthly summaries modules
 * @returns {Object} Test results
 */
function testMonthlySummariesModules() {
  const tests = [];

  try {
    // Test 1: Core class instantiation
    const manager = new MonthlySummariesManager();
    tests.push({
      name: 'Core class instantiation',
      success: !!manager,
      result: 'MonthlySummariesManager created successfully'
    });

    // Test 2: Method availability
    const requiredMethods = [
      'postMonthlyFixturesSummary',
      'postMonthlyResultsSummary',
      'startGOTMVoting',
      'announceGOTMWinner'
    ];

    requiredMethods.forEach(method => {
      tests.push({
        name: `Method: ${method}`,
        success: typeof manager[method] === 'function',
        result: typeof manager[method] === 'function' ? 'Available' : 'Missing'
      });
    });

    // Test 3: Configuration access
    const config = getConfigValue('MONTHLY_SUMMARIES', {});
    tests.push({
      name: 'Configuration access',
      success: typeof config === 'object',
      result: `Config loaded: ${Object.keys(config).length} keys`
    });

    return {
      success: tests.every(t => t.success),
      tests: tests,
      modulesLoaded: [
        'monthly-core.gs',
        'monthly-fixtures.gs',
        'monthly-gotm.gs',
        'monthly-api.gs'
      ],
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      tests: tests,
      timestamp: new Date().toISOString()
    };
  }
}