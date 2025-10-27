/**
 * Historical Fixtures Manager
 * Posts previous results against upcoming fixtures
 * Only posts if historical data exists, skips if no previous meetings
 * @version 6.2.0
 */

class HistoricalFixturesManager {
  constructor() {
    this.logger = new Logger('HistoricalFixturesManager');
    this.version = '6.2.0';
    this.currentSeason = new Date().getFullYear();
  }

  /**
   * Main function to check and post historical results for upcoming fixtures
   */
  checkAndPostHistoricalResults() {
    this.logger.enterFunction('checkAndPostHistoricalResults');

    try {
      const upcomingFixtures = this.getUpcomingFixtures();

      if (!upcomingFixtures || upcomingFixtures.length === 0) {
        this.logger.info('No upcoming fixtures found');
        return { success: true, message: 'No upcoming fixtures to process' };
      }

      const processedFixtures = [];

      for (const fixture of upcomingFixtures) {
        const historicalData = this.getHistoricalResults(fixture.opponent);

        if (historicalData.hasHistory) {
          const posted = this.postHistoricalComparison(fixture, historicalData);
          if (posted.success) {
            processedFixtures.push({
              opponent: fixture.opponent,
              fixtureDate: fixture.date,
              historicalMatches: historicalData.matches.length,
              posted: true
            });
          }
        } else {
          this.logger.info(`No historical data for ${fixture.opponent}, skipping post`);
          processedFixtures.push({
            opponent: fixture.opponent,
            fixtureDate: fixture.date,
            historicalMatches: 0,
            posted: false,
            reason: 'No historical data'
          });
        }
      }

      this.logger.exitFunction('checkAndPostHistoricalResults', {
        processed: processedFixtures.length,
        posted: processedFixtures.filter(f => f.posted).length
      });

      return {
        success: true,
        processedFixtures: processedFixtures,
        totalProcessed: processedFixtures.length,
        totalPosted: processedFixtures.filter(f => f.posted).length
      };

    } catch (error) {
      this.logger.error('Failed to check and post historical results', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Get upcoming fixtures from the fixtures sheet
   */
  getUpcomingFixtures() {
    try {
      const fixturesSheet = SheetUtils.getSheet('Fixtures');
      if (!fixturesSheet) {
        this.logger.warn('Fixtures sheet not found');
        return [];
      }

      const allFixtures = SheetUtils.getAllDataAsObjects(fixturesSheet);
      const now = new Date();
      const nextWeek = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

      // Get fixtures in the next 7 days that haven't been played
      const upcomingFixtures = allFixtures.filter(fixture => {
        if (!fixture.Date || !fixture.Opposition) return false;

        const fixtureDate = new Date(fixture.Date);
        const isUpcoming = fixtureDate >= now && fixtureDate <= nextWeek;
        const notPlayed = !fixture.Result || fixture.Result === '';

        return isUpcoming && notPlayed;
      });

      this.logger.info(`Found ${upcomingFixtures.length} upcoming fixtures`);

      return upcomingFixtures.map(fixture => ({
        opponent: fixture.Opposition,
        date: fixture.Date,
        venue: fixture.Venue || 'TBC',
        competition: fixture.Competition || 'League',
        kickoff: fixture.KickOff || 'TBC'
      }));

    } catch (error) {
      this.logger.error('Failed to get upcoming fixtures', { error: error.toString() });
      return [];
    }
  }

  /**
   * Get historical results against a specific opponent
   */
  getHistoricalResults(opponent) {
    try {
      // Check multiple possible sheets for historical data
      const possibleSheets = [
        'Results',
        'Historical Results',
        'Previous Seasons',
        'All Results'
      ];

      let allHistoricalResults = [];

      for (const sheetName of possibleSheets) {
        const sheet = SheetUtils.getSheet(sheetName);
        if (sheet) {
          const results = SheetUtils.getAllDataAsObjects(sheet);
          const opponentResults = results.filter(result =>
            result.Opposition &&
            result.Opposition.toLowerCase() === opponent.toLowerCase() &&
            result.Result &&
            result.Result !== ''
          );
          allHistoricalResults = allHistoricalResults.concat(opponentResults);
        }
      }

      if (allHistoricalResults.length === 0) {
        return {
          hasHistory: false,
          matches: [],
          stats: {
            totalMatches: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0
          }
        };
      }

      // Sort by date (most recent first)
      allHistoricalResults.sort((a, b) => {
        const dateA = new Date(a.Date || '1900-01-01');
        const dateB = new Date(b.Date || '1900-01-01');
        return dateB - dateA;
      });

      // Calculate statistics
      const stats = this.calculateHistoricalStats(allHistoricalResults);

      // Get last few meetings (most recent 5)
      const recentMeetings = allHistoricalResults.slice(0, 5);

      this.logger.info(`Found ${allHistoricalResults.length} historical matches against ${opponent}`);

      return {
        hasHistory: true,
        matches: recentMeetings,
        allMatches: allHistoricalResults,
        stats: stats,
        lastMeeting: recentMeetings[0] || null
      };

    } catch (error) {
      this.logger.error(`Failed to get historical results for ${opponent}`, { error: error.toString() });
      return {
        hasHistory: false,
        matches: [],
        stats: {
          totalMatches: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0
        }
      };
    }
  }

  /**
   * Calculate historical statistics from results
   */
  calculateHistoricalStats(results) {
    const stats = {
      totalMatches: results.length,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0
    };

    results.forEach(result => {
      if (!result.Result) return;

      // Parse result (e.g., "2-1", "0-3", "1-1")
      const scoreMatch = result.Result.match(/(\d+)-(\d+)/);
      if (scoreMatch) {
        const homeScore = parseInt(scoreMatch[1]);
        const awayScore = parseInt(scoreMatch[2]);

        // Determine if this was home or away
        const isHome = result.Venue && result.Venue.toLowerCase().includes('home') ||
                      result.Venue && result.Venue.toLowerCase().includes('syston') ||
                      !result.Venue || result.Venue === '';

        let ourScore, theirScore;
        if (isHome) {
          ourScore = homeScore;
          theirScore = awayScore;
        } else {
          ourScore = awayScore;
          theirScore = homeScore;
        }

        stats.goalsFor += ourScore;
        stats.goalsAgainst += theirScore;

        if (ourScore > theirScore) {
          stats.wins++;
        } else if (ourScore === theirScore) {
          stats.draws++;
        } else {
          stats.losses++;
        }
      }
    });

    return stats;
  }

  /**
   * Post historical comparison to Make.com
   */
  postHistoricalComparison(fixture, historicalData) {
    this.logger.enterFunction('postHistoricalComparison', {
      opponent: fixture.opponent,
      matchCount: historicalData.matches.length
    });

    try {
      // @testHook(make_webhook_start)
      const payload = this.buildHistoricalPayload(fixture, historicalData);

      const webhookUrl = getConfigValue('MAKE.WEBHOOK_URL_PROPERTY');
      if (!webhookUrl) {
        this.logger.warn('Make.com webhook URL not configured');
        return { success: false, error: 'Webhook URL not configured' };
      }

      const response = UrlFetchApp.fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify(payload)
      });
      // @testHook(make_webhook_end)

      if (response.getResponseCode() === 200) {
        this.logger.exitFunction('postHistoricalComparison', { success: true });
        return {
          success: true,
          posted: true,
          payload: payload
        };
      } else {
        this.logger.error('Make.com webhook failed', {
          responseCode: response.getResponseCode(),
          response: response.getContentText()
        });
        return { success: false, error: `Webhook failed: ${response.getResponseCode()}` };
      }

    } catch (error) {
      this.logger.error('Failed to post historical comparison', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Build payload for Make.com with historical data
   */
  buildHistoricalPayload(fixture, historicalData) {
    const clubName = getConfigValue('SYSTEM.CLUB_NAME', 'Your Football Club');
    const stats = historicalData.stats;
    const lastMeeting = historicalData.lastMeeting;

    // Format recent results
    const recentResults = historicalData.matches.slice(0, 3).map(match => {
      const result = match.Result || 'Unknown';
      const date = match.Date ? new Date(match.Date).toLocaleDateString('en-GB') : 'Unknown date';
      const venue = match.Venue || 'Unknown venue';
      return `${result} (${date}) - ${venue}`;
    });

    // Create head-to-head summary
    const h2hSummary = stats.totalMatches > 0 ?
      `Played ${stats.totalMatches}: Won ${stats.wins}, Drew ${stats.draws}, Lost ${stats.losses}` :
      'First meeting between these teams';

    // Form guide (last 3 results)
    const formGuide = recentResults.length > 0 ?
      recentResults.join(' | ') :
      'No recent meetings';

    const payload = {
      timestamp: new Date().toISOString(),
      event_type: 'historical_comparison',
      source: 'apps_script_historical_fixtures',
      version: this.version,

      // Fixture details
      club_name: clubName,
      opponent_name: fixture.opponent,
      fixture_date: fixture.date,
      fixture_venue: fixture.venue,
      fixture_competition: fixture.competition,
      fixture_kickoff: fixture.kickoff,

      // Historical data
      has_history: historicalData.hasHistory,
      total_meetings: stats.totalMatches,
      head_to_head_record: h2hSummary,
      wins: stats.wins,
      draws: stats.draws,
      losses: stats.losses,
      goals_for: stats.goalsFor,
      goals_against: stats.goalsAgainst,

      // Recent form
      recent_meetings_count: recentResults.length,
      recent_meetings: recentResults,
      form_guide: formGuide,

      // Last meeting details
      last_meeting_result: lastMeeting ? lastMeeting.Result : null,
      last_meeting_date: lastMeeting ? lastMeeting.Date : null,
      last_meeting_venue: lastMeeting ? lastMeeting.Venue : null,

      // Canva placeholders
      fixture_preview_title: `${clubName} vs ${fixture.opponent}`,
      historical_stats_text: h2hSummary,
      recent_form_text: formGuide,
      next_match_text: `Next: ${new Date(fixture.date).toLocaleDateString('en-GB')} at ${fixture.venue}`,

      // Additional context
      is_first_meeting: stats.totalMatches === 0,
      dominant_team: this.getDominantTeam(stats, clubName),
      goal_difference: stats.goalsFor - stats.goalsAgainst
    };

    this.logger.info('Historical payload created', {
      opponent: fixture.opponent,
      totalMeetings: stats.totalMatches,
      hasHistory: historicalData.hasHistory
    });

    return payload;
  }

  /**
   * Determine which team has been dominant historically
   */
  getDominantTeam(stats, clubName) {
    if (stats.totalMatches === 0) return 'equal';
    if (stats.wins > stats.losses) return clubName;
    if (stats.losses > stats.wins) return 'opponent';
    return 'equal';
  }

  /**
   * Scheduled function to check for historical posts
   * Run this weekly (e.g., Wednesday for weekend fixtures)
   */
  runWeeklyHistoricalCheck() {
    this.logger.enterFunction('runWeeklyHistoricalCheck');

    try {
      const result = this.checkAndPostHistoricalResults();

      // Log summary for monitoring
      if (result.success) {
        this.logger.info('Weekly historical check completed', {
          processedFixtures: result.totalProcessed,
          postsCreated: result.totalPosted
        });
      }

      return result;

    } catch (error) {
      this.logger.error('Weekly historical check failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Manual function to post specific opponent history
   */
  postSpecificOpponentHistory(opponentName) {
    this.logger.enterFunction('postSpecificOpponentHistory', { opponent: opponentName });

    try {
      const historicalData = this.getHistoricalResults(opponentName);

      if (!historicalData.hasHistory) {
        return {
          success: true,
          message: `No historical data found for ${opponentName}`,
          posted: false
        };
      }

      // Create a mock fixture for the opponent
      const mockFixture = {
        opponent: opponentName,
        date: 'TBC',
        venue: 'TBC',
        competition: 'League',
        kickoff: 'TBC'
      };

      const result = this.postHistoricalComparison(mockFixture, historicalData);

      this.logger.exitFunction('postSpecificOpponentHistory', {
        success: result.success,
        posted: result.posted
      });

      return result;

    } catch (error) {
      this.logger.error('Failed to post specific opponent history', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Get historical statistics for reporting
   */
  getHistoricalStatsReport() {
    try {
      const fixturesSheet = SheetUtils.getSheet('Fixtures');
      if (!fixturesSheet) {
        return { success: false, error: 'Fixtures sheet not found' };
      }

      const allFixtures = SheetUtils.getAllDataAsObjects(fixturesSheet);
      const opponents = [...new Set(allFixtures.map(f => f.Opposition).filter(o => o))];

      const report = {
        totalOpponents: opponents.length,
        opponentsWithHistory: 0,
        opponentsWithoutHistory: 0,
        detailedStats: []
      };

      opponents.forEach(opponent => {
        const historicalData = this.getHistoricalResults(opponent);

        if (historicalData.hasHistory) {
          report.opponentsWithHistory++;
        } else {
          report.opponentsWithoutHistory++;
        }

        report.detailedStats.push({
          opponent: opponent,
          hasHistory: historicalData.hasHistory,
          totalMeetings: historicalData.stats.totalMatches,
          record: historicalData.hasHistory ?
            `${historicalData.stats.wins}W-${historicalData.stats.draws}D-${historicalData.stats.losses}L` :
            'No history'
        });
      });

      return { success: true, report: report };

    } catch (error) {
      this.logger.error('Failed to generate historical stats report', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }
}

/**
 * Public API functions for external access
 */

/**
 * Main function to check and post historical results
 */
function checkAndPostHistoricalResults() {
  const manager = new HistoricalFixturesManager();
  return manager.checkAndPostHistoricalResults();
}

/**
 * Weekly scheduled function (run on Wednesdays)
 */
function runWeeklyHistoricalCheck() {
  const manager = new HistoricalFixturesManager();
  return manager.runWeeklyHistoricalCheck();
}

/**
 * Manual function to post specific opponent history
 */
function postOpponentHistory(opponentName) {
  const manager = new HistoricalFixturesManager();
  return manager.postSpecificOpponentHistory(opponentName);
}

/**
 * Get report of all historical data availability
 */
function getHistoricalStatsReport() {
  const manager = new HistoricalFixturesManager();
  return manager.getHistoricalStatsReport();
}

/**
 * Test function with sample data
 */
function testHistoricalFixtures() {
  const logger = new Logger('TestHistoricalFixtures');
  logger.info('Testing historical fixtures functionality');

  try {
    const manager = new HistoricalFixturesManager();

    // Test getting upcoming fixtures
    const upcomingFixtures = manager.getUpcomingFixtures();
    logger.info('Upcoming fixtures test', { count: upcomingFixtures.length });

    // Test getting historical data for a sample opponent
    if (upcomingFixtures.length > 0) {
      const testOpponent = upcomingFixtures[0].opponent;
      const historicalData = manager.getHistoricalResults(testOpponent);
      logger.info('Historical data test', {
        opponent: testOpponent,
        hasHistory: historicalData.hasHistory,
        totalMatches: historicalData.stats.totalMatches
      });
    }

    // Test the report generation
    const report = manager.getHistoricalStatsReport();
    logger.info('Report generation test', { success: report.success });

    return { success: true, message: 'All tests completed' };

  } catch (error) {
    logger.error('Test failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}