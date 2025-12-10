/**
 * Match Day Intelligent Scheduler
 * Runs every minute, decides whether to sync based on match schedule
 *
 * LOGIC:
 * - Normal days: Run hourly
 * - Match days: After expected full-time, run every minute until all results in
 */

class MatchDayScheduler {
  constructor() {
    this.config = this.loadConfig_();
    this.lastRunKey = 'last_sync_run';
  }

  /**
   * Load configuration from backend
   */
  loadConfig_() {
    const consolidator = new FixtureConsolidator();
    return consolidator.config;
  }

  /**
   * Main decision function - Should we sync now?
   */
  shouldSyncNow() {
    const now = new Date();

    // Check if today has fixtures
    const todaysFixtures = this.getTodaysFixtures_();

    if (todaysFixtures.length === 0) {
      // No fixtures today - use normal hourly schedule
      return this.shouldSyncNormalSchedule_(now);
    }

    // We have fixtures today!
    Logger.log('Match day detected: ' + todaysFixtures.length + ' fixtures today');

    // Check if we're in "boost mode" (after expected full-time)
    if (this.isInBoostMode_(todaysFixtures, now)) {
      // Match day boost mode - check every minute
      Logger.log('Match day boost mode ACTIVE');

      // Check if all results are in
      if (this.areAllResultsIn_(todaysFixtures)) {
        Logger.log('All results received - exiting boost mode');
        this.markBoostModeComplete_();
        return true; // One final sync
      }

      // Still waiting for results - sync every minute
      return true;
    }

    // Before expected full-time - use normal schedule
    return this.shouldSyncNormalSchedule_(now);
  }

  /**
   * Get today's fixtures
   */
  getTodaysFixtures_() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const consolidator = new FixtureConsolidator();
      const allFixtures = consolidator.gatherFromEmails_();

      return allFixtures.filter(f => {
        const fixtureDate = new Date(f.date);
        fixtureDate.setHours(0, 0, 0, 0);
        return fixtureDate.getTime() === today.getTime() && f.status === 'scheduled';
      });
    } catch (e) {
      Logger.log('Error getting today\'s fixtures: ' + e.message);
      return [];
    }
  }

  /**
   * Check if we're in boost mode (after expected full-time)
   */
  isInBoostMode_(fixtures, now) {
    // Check if boost mode is already complete today
    if (this.isBoostModeComplete_()) {
      return false;
    }

    // Find earliest kick-off time
    const earliestKickOff = this.getEarliestKickOffTime_(fixtures);

    if (!earliestKickOff) {
      return false;
    }

    // Calculate expected full-time based on game format
    const boostStartOffset = this.calculateBoostOffset_();
    const expectedFullTime = new Date(earliestKickOff.getTime() + (boostStartOffset * 60 * 1000));

    Logger.log('Game format: ' + this.config.game_size + ' / Age: ' + this.config.age_group);
    Logger.log('Half length: ' + this.config.half_length + ' mins');
    Logger.log('Calculated boost offset: ' + boostStartOffset + ' mins');
    Logger.log('Earliest kick-off: ' + earliestKickOff.toLocaleTimeString());
    Logger.log('Expected full-time: ' + expectedFullTime.toLocaleTimeString());
    Logger.log('Current time: ' + now.toLocaleTimeString());

    // We're in boost mode if current time is after expected full-time
    return now >= expectedFullTime;
  }

  /**
   * Calculate boost mode start offset based on game format
   * Different age groups and game sizes have different match lengths
   */
  calculateBoostOffset_() {
    // Get game format from config
    const halfLength = this.config.half_length || 40; // Default 40 mins per half
    const quarterLength = this.config.quarter_length; // Optional for younger age groups

    let totalMatchTime;

    if (quarterLength) {
      // Some younger age groups play 4 quarters instead of 2 halves
      totalMatchTime = quarterLength * 4;
    } else {
      // Standard 2 halves
      totalMatchTime = halfLength * 2;
    }

    // Add half-time break (5 mins is standard)
    const breakTime = 5;

    // Add buffer for injury time, stoppages, etc (5 mins is reasonable)
    const buffer = 5;

    const totalTime = totalMatchTime + breakTime + buffer;

    Logger.log('Match calculation: (' + halfLength + ' x 2) + ' + breakTime + ' (break) + ' + buffer + ' (buffer) = ' + totalTime + ' mins');

    return totalTime;
  }

  /**
   * Get earliest kick-off time from fixtures
   */
  getEarliestKickOffTime_(fixtures) {
    const today = new Date();
    let earliestTime = null;

    for (const fixture of fixtures) {
      // Parse kick-off time (e.g., "14:00")
      const timeMatch = (fixture.kickOffTime || '').match(/(\d{1,2}):(\d{2})/);

      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);

        const kickOffTime = new Date(today);
        kickOffTime.setHours(hours, minutes, 0, 0);

        if (!earliestTime || kickOffTime < earliestTime) {
          earliestTime = kickOffTime;
        }
      }
    }

    // If no kick-off times found, use typical time from config
    if (!earliestTime && this.config.typical_kick_off_time) {
      const timeMatch = this.config.typical_kick_off_time.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        earliestTime = new Date(today);
        earliestTime.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]), 0, 0);
      }
    }

    return earliestTime;
  }

  /**
   * Check if all results are in
   */
  areAllResultsIn_(fixtures) {
    try {
      const calculator = new LeagueTableCalculator();
      const results = calculator.gatherAllResults_();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todaysResults = results.filter(r => {
        const resultDate = new Date(r.date);
        resultDate.setHours(0, 0, 0, 0);
        return resultDate.getTime() === today.getTime();
      });

      Logger.log('Fixtures today: ' + fixtures.length);
      Logger.log('Results received: ' + todaysResults.length);

      // All results in if we have at least as many results as fixtures
      return todaysResults.length >= fixtures.length;
    } catch (e) {
      Logger.log('Error checking results: ' + e.message);
      return false;
    }
  }

  /**
   * Normal schedule - hourly
   */
  shouldSyncNormalSchedule_(now) {
    const cache = CacheService.getScriptCache();
    const lastRun = cache.get(this.lastRunKey);

    if (!lastRun) {
      // Never run before - sync now
      this.markLastRun_(now);
      return true;
    }

    const lastRunTime = new Date(parseInt(lastRun));
    const hoursSince = (now.getTime() - lastRunTime.getTime()) / (1000 * 60 * 60);

    if (hoursSince >= 1) {
      // More than an hour - sync now
      this.markLastRun_(now);
      return true;
    }

    // Less than an hour - skip
    return false;
  }

  /**
   * Mark last run time
   */
  markLastRun_(time) {
    const cache = CacheService.getScriptCache();
    cache.put(this.lastRunKey, time.getTime().toString(), 7200); // 2 hours TTL
  }

  /**
   * Check if boost mode is complete for today
   */
  isBoostModeComplete_() {
    const cache = CacheService.getScriptCache();
    const key = 'boost_mode_complete_' + this.getDateKey_();
    return cache.get(key) === 'true';
  }

  /**
   * Mark boost mode as complete for today
   */
  markBoostModeComplete_() {
    const cache = CacheService.getScriptCache();
    const key = 'boost_mode_complete_' + this.getDateKey_();
    cache.put(key, 'true', 86400); // 24 hours TTL
  }

  /**
   * Get date key for today (YYYYMMDD)
   */
  getDateKey_() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return year + month + day;
  }
}

/**
 * Main smart sync function
 * Call this every minute via trigger
 */
function smartSync() {
  Logger.log('=== Smart Sync Check ===');

  const scheduler = new MatchDayScheduler();

  if (scheduler.shouldSyncNow()) {
    Logger.log('✅ Syncing now...');

    // Sync fixtures
    const fixtureResult = consolidateFixtures();
    Logger.log('Fixtures sync: ' + (fixtureResult.success ? 'SUCCESS' : 'FAILED'));

    // Check for league table update
    const todaysFixtures = scheduler.getTodaysFixtures_();
    if (todaysFixtures.length > 0 && scheduler.areAllResultsIn_(todaysFixtures)) {
      Logger.log('All results in - updating league table');
      const leagueResult = calculateLeagueTable();
      Logger.log('League sync: ' + (leagueResult.success ? 'SUCCESS' : 'FAILED'));
    }

    return { synced: true, timestamp: new Date() };
  } else {
    Logger.log('⏭️  Skipping sync (not time yet)');
    return { synced: false, timestamp: new Date() };
  }
}

/**
 * Test function
 */
function testMatchDayScheduler() {
  const scheduler = new MatchDayScheduler();

  Logger.log('=== Match Day Scheduler Test ===');

  const todaysFixtures = scheduler.getTodaysFixtures_();
  Logger.log('Today\'s fixtures: ' + todaysFixtures.length);

  if (todaysFixtures.length > 0) {
    const now = new Date();
    const inBoostMode = scheduler.isInBoostMode_(todaysFixtures, now);
    const allResultsIn = scheduler.areAllResultsIn_(todaysFixtures);

    Logger.log('In boost mode: ' + inBoostMode);
    Logger.log('All results in: ' + allResultsIn);
  }

  const shouldSync = scheduler.shouldSyncNow();
  Logger.log('Should sync now: ' + shouldSync);
}
