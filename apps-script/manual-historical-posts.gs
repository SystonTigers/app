/**
 * Manual Historical Posts Interface
 * Provides easy functions to manually trigger historical comparison posts
 * @version 6.2.0
 */

/**
 * Manual function to post historical comparison for next match
 * Use this to test the historical feature
 */
function postHistoricalForNextMatch() {
  const logger = new Logger('ManualHistoricalPosts');
  logger.enterFunction('postHistoricalForNextMatch');

  try {
    const manager = new HistoricalFixturesManager();
    const result = manager.checkAndPostHistoricalResults();

    if (result.success) {
      logger.info('Manual historical post completed', {
        processedFixtures: result.totalProcessed,
        postsCreated: result.totalPosted
      });

      // Return user-friendly summary
      const summary = {
        success: true,
        message: `Historical check completed successfully`,
        details: {
          fixturesChecked: result.totalProcessed,
          postsCreated: result.totalPosted,
          fixtures: result.processedFixtures
        }
      };

      console.log('Historical Results:', JSON.stringify(summary, null, 2));
      return summary;

    } else {
      logger.error('Manual historical post failed', { error: result.error });
      return {
        success: false,
        message: 'Historical post failed',
        error: result.error
      };
    }

  } catch (error) {
    logger.error('Manual historical post crashed', { error: error.toString() });
    return {
      success: false,
      message: 'Function crashed',
      error: error.toString()
    };
  }
}

/**
 * Post historical data for a specific opponent
 * @param {string} opponentName - Name of the opposition team
 */
function postHistoricalForOpponent(opponentName) {
  const logger = new Logger('ManualHistoricalPosts');
  logger.enterFunction('postHistoricalForOpponent', { opponent: opponentName });

  if (!opponentName) {
    return {
      success: false,
      message: 'Please provide an opponent name',
      example: 'postHistoricalForOpponent("Leicester City FC")'
    };
  }

  try {
    const manager = new HistoricalFixturesManager();
    const result = manager.postSpecificOpponentHistory(opponentName);

    if (result.success) {
      logger.info(`Historical post for ${opponentName} completed`, {
        posted: result.posted,
        message: result.message
      });

      const summary = {
        success: true,
        opponent: opponentName,
        posted: result.posted,
        message: result.message || 'Historical comparison posted successfully'
      };

      console.log('Historical Results:', JSON.stringify(summary, null, 2));
      return summary;

    } else {
      logger.error(`Historical post for ${opponentName} failed`, { error: result.error });
      return {
        success: false,
        opponent: opponentName,
        message: result.error || 'Failed to post historical comparison',
        error: result.error
      };
    }

  } catch (error) {
    logger.error('Manual opponent historical post crashed', { error: error.toString() });
    return {
      success: false,
      opponent: opponentName,
      message: 'Function crashed',
      error: error.toString()
    };
  }
}

/**
 * Get a report of historical data availability for all opponents
 */
function getHistoricalDataReport() {
  const logger = new Logger('ManualHistoricalPosts');
  logger.enterFunction('getHistoricalDataReport');

  try {
    const manager = new HistoricalFixturesManager();
    const result = manager.getHistoricalStatsReport();

    if (result.success) {
      logger.info('Historical data report generated', {
        totalOpponents: result.report.totalOpponents,
        withHistory: result.report.opponentsWithHistory,
        withoutHistory: result.report.opponentsWithoutHistory
      });

      console.log('Historical Data Report:', JSON.stringify(result.report, null, 2));
      return result.report;

    } else {
      logger.error('Historical data report failed', { error: result.error });
      return {
        success: false,
        message: 'Failed to generate historical data report',
        error: result.error
      };
    }

  } catch (error) {
    logger.error('Historical data report crashed', { error: error.toString() });
    return {
      success: false,
      message: 'Function crashed',
      error: error.toString()
    };
  }
}

/**
 * Test the historical fixtures system with sample data
 */
function testHistoricalSystem() {
  const logger = new Logger('ManualHistoricalPosts');
  logger.enterFunction('testHistoricalSystem');

  try {
    const manager = new HistoricalFixturesManager();

    // Test 1: Get upcoming fixtures
    const upcomingFixtures = manager.getUpcomingFixtures();
    console.log('Test 1 - Upcoming Fixtures:', upcomingFixtures);

    // Test 2: Check historical data for first opponent
    if (upcomingFixtures.length > 0) {
      const testOpponent = upcomingFixtures[0].opponent;
      const historicalData = manager.getHistoricalResults(testOpponent);
      console.log(`Test 2 - Historical Data for ${testOpponent}:`, {
        hasHistory: historicalData.hasHistory,
        totalMatches: historicalData.stats.totalMatches,
        record: `${historicalData.stats.wins}W-${historicalData.stats.draws}D-${historicalData.stats.losses}L`
      });
    }

    // Test 3: Generate report
    const report = manager.getHistoricalStatsReport();
    console.log('Test 3 - Data Availability Report:', {
      success: report.success,
      totalOpponents: report.success ? report.report.totalOpponents : 0,
      withHistory: report.success ? report.report.opponentsWithHistory : 0
    });

    logger.info('Historical system test completed successfully');

    return {
      success: true,
      message: 'All tests completed successfully',
      results: {
        upcomingFixtures: upcomingFixtures.length,
        reportGenerated: report.success,
        systemWorking: true
      }
    };

  } catch (error) {
    logger.error('Historical system test failed', { error: error.toString() });
    return {
      success: false,
      message: 'Test failed',
      error: error.toString()
    };
  }
}

/**
 * Helper function to show available manual functions
 */
function showHistoricalFunctions() {
  const functions = {
    description: 'Historical Fixtures - Manual Functions',
    functions: [
      {
        name: 'postHistoricalForNextMatch()',
        description: 'Posts historical comparison for upcoming fixtures (if historical data exists)',
        example: 'postHistoricalForNextMatch()'
      },
      {
        name: 'postHistoricalForOpponent(opponentName)',
        description: 'Posts historical comparison for a specific opponent',
        example: 'postHistoricalForOpponent("Leicester City FC")'
      },
      {
        name: 'getHistoricalDataReport()',
        description: 'Shows which opponents have historical data available',
        example: 'getHistoricalDataReport()'
      },
      {
        name: 'testHistoricalSystem()',
        description: 'Runs test suite for the historical fixtures system',
        example: 'testHistoricalSystem()'
      }
    ],
    automaticIntegration: {
      description: 'The system automatically posts historical comparisons on Wednesdays',
      schedule: 'Wednesday: Player stats (Monthly) / Previous matches vs opponent',
      behavior: 'If historical data exists for upcoming opponent, posts comparison. If not, posts general stats.'
    }
  };

  console.log('Historical Fixtures Functions:', JSON.stringify(functions, null, 2));
  return functions;
}