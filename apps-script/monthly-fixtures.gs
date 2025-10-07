/**
 * @fileoverview Monthly fixtures and results processing module
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Handles monthly fixtures/results gathering and payload building (split from monthly-summaries.gs)
 */

// ==================== MONTHLY FIXTURES & RESULTS ====================

/**
 * Extends MonthlySummariesManager with fixtures/results functionality
 */
if (typeof MonthlySummariesManager !== 'undefined') {

  // ==================== PUBLIC SUMMARIES ====================

  /**
   * Post monthly fixtures summary (preview for upcoming fixtures)
   */
  MonthlySummariesManager.prototype.postMonthlyFixturesSummary = function(month = null, year = null) {
    this.logger.enterFunction('postMonthlyFixturesSummary', { month, year });

    try {
      if (!isFeatureEnabled('MONTHLY_SUMMARIES')) {
        const disabled = {
          success: true,
          skipped: true,
          reason: 'MONTHLY_SUMMARIES feature disabled'
        };
        this.logger.exitFunction('postMonthlyFixturesSummary', disabled);
        return disabled;
      }

      const fixturesConfig = getConfigValue('MONTHLY_CONTENT.FIXTURES_SUMMARY', {});
      if (fixturesConfig && fixturesConfig.enabled === false) {
        const disabled = {
          success: true,
          skipped: true,
          reason: 'Monthly fixtures summary disabled in config'
        };
        this.logger.exitFunction('postMonthlyFixturesSummary', disabled);
        return disabled;
      }

      const { targetDate, monthNumber, yearNumber } = this.resolveMonthParameters(month, year, 'fixtures');
      const monthKey = this.buildMonthKey(yearNumber, monthNumber);

      if (this.isDuplicateRequest('fixtures', monthKey)) {
        const duplicate = {
          success: true,
          skipped: true,
          duplicate: true,
          month_key: monthKey,
          message: 'Fixtures summary already processed'
        };
        this.logger.exitFunction('postMonthlyFixturesSummary', duplicate);
        return duplicate;
      }

      const fixturesData = this.gatherMonthlyFixtures(targetDate);
      const statistics = this.buildFixtureStatistics(fixturesData);
      const idempotencyKey = this.generateIdempotencyKey('fixtures', monthKey);
      const payload = this.buildMonthlyFixturesPayload(fixturesData, statistics, monthKey, idempotencyKey);

      const webhookResult = this.makeIntegration.sendWebhook(payload);

      if (webhookResult.success) {
        this.markRequestProcessed('fixtures', monthKey);
        this.logMonthlyContent('fixtures', monthKey, payload);
      }

      const result = this.createSuccessResponse({
        webhook: webhookResult,
        fixtures: fixturesData,
        statistics: statistics,
        monthKey: monthKey
      }, 'postMonthlyFixturesSummary');

      this.logger.exitFunction('postMonthlyFixturesSummary', result);
      return result;

    } catch (error) {
      return this.handleError('postMonthlyFixturesSummary', error, { month, year });
    }
  };

  /**
   * Post monthly results summary
   */
  MonthlySummariesManager.prototype.postMonthlyResultsSummary = function(month = null, year = null) {
    this.logger.enterFunction('postMonthlyResultsSummary', { month, year });

    try {
      if (!isFeatureEnabled('MONTHLY_SUMMARIES')) {
        const disabled = {
          success: true,
          skipped: true,
          reason: 'MONTHLY_SUMMARIES feature disabled'
        };
        this.logger.exitFunction('postMonthlyResultsSummary', disabled);
        return disabled;
      }

      const resultsConfig = getConfigValue('MONTHLY_CONTENT.RESULTS_SUMMARY', {});
      if (resultsConfig && resultsConfig.enabled === false) {
        const disabled = {
          success: true,
          skipped: true,
          reason: 'Monthly results summary disabled in config'
        };
        this.logger.exitFunction('postMonthlyResultsSummary', disabled);
        return disabled;
      }

      const { targetDate, monthNumber, yearNumber } = this.resolveMonthParameters(month, year, 'results');
      const monthKey = this.buildMonthKey(yearNumber, monthNumber);

      if (this.isDuplicateRequest('results', monthKey)) {
        const duplicate = {
          success: true,
          skipped: true,
          duplicate: true,
          month_key: monthKey,
          message: 'Results summary already processed'
        };
        this.logger.exitFunction('postMonthlyResultsSummary', duplicate);
        return duplicate;
      }

      const resultsData = this.gatherMonthlyResults(targetDate);
      const statistics = this.buildResultStatistics(resultsData);
      const idempotencyKey = this.generateIdempotencyKey('results', monthKey);
      const payload = this.buildMonthlyResultsPayload(resultsData, statistics, monthKey, idempotencyKey);

      const webhookResult = this.makeIntegration.sendWebhook(payload);

      if (webhookResult.success) {
        this.markRequestProcessed('results', monthKey);
        this.logMonthlyContent('results', monthKey, payload);
      }

      const result = this.createSuccessResponse({
        webhook: webhookResult,
        results: resultsData,
        statistics: statistics,
        monthKey: monthKey
      }, 'postMonthlyResultsSummary');

      this.logger.exitFunction('postMonthlyResultsSummary', result);
      return result;

    } catch (error) {
      return this.handleError('postMonthlyResultsSummary', error, { month, year });
    }
  };

  // ==================== DATA GATHERING ====================

  /**
   * Gather monthly fixtures data
   */
  MonthlySummariesManager.prototype.gatherMonthlyFixtures = function(targetDate) {
    const cacheKey = `fixtures_${targetDate.getFullYear()}_${targetDate.getMonth()}`;
    let cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const fixturesSheet = this.getFixturesSheet();
      if (!fixturesSheet) return [];

      const data = SheetUtils.getAllDataAsObjects(fixturesSheet);
      const monthlyFixtures = data.filter(row => {
        if (!row.Date) return false;

        const fixtureDate = new Date(row.Date);
        return fixtureDate.getMonth() === targetDate.getMonth() &&
               fixtureDate.getFullYear() === targetDate.getFullYear();
      });

      this.setCachedData(cacheKey, monthlyFixtures);
      return monthlyFixtures;

    } catch (error) {
      this.logger.error('Failed to gather monthly fixtures', { error: error.toString() });
      return [];
    }
  };

  /**
   * Gather monthly results data
   */
  MonthlySummariesManager.prototype.gatherMonthlyResults = function(targetDate) {
    const cacheKey = `results_${targetDate.getFullYear()}_${targetDate.getMonth()}`;
    let cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const resultsSheet = this.getResultsSheet();
      if (!resultsSheet) return [];

      const data = SheetUtils.getAllDataAsObjects(resultsSheet);
      const monthlyResults = data.filter(row => {
        if (!row.Date) return false;

        const resultDate = new Date(row.Date);
        return resultDate.getMonth() === targetDate.getMonth() &&
               resultDate.getFullYear() === targetDate.getFullYear();
      });

      this.setCachedData(cacheKey, monthlyResults);
      return monthlyResults;

    } catch (error) {
      this.logger.error('Failed to gather monthly results', { error: error.toString() });
      return [];
    }
  };

  // ==================== STATISTICS BUILDERS ====================

  /**
   * Build fixture statistics
   */
  MonthlySummariesManager.prototype.buildFixtureStatistics = function(fixtures) {
    return {
      total_fixtures: fixtures.length,
      home_fixtures: fixtures.filter(f => f.Venue && f.Venue.toLowerCase().includes('home')).length,
      away_fixtures: fixtures.filter(f => f.Venue && f.Venue.toLowerCase().includes('away')).length,
      competitions: [...new Set(fixtures.map(f => f.Competition).filter(c => c))],
      upcoming_count: fixtures.filter(f => new Date(f.Date) > new Date()).length
    };
  };

  /**
   * Build result statistics
   */
  MonthlySummariesManager.prototype.buildResultStatistics = function(results) {
    let wins = 0, draws = 0, losses = 0;
    let goalsFor = 0, goalsAgainst = 0;

    results.forEach(result => {
      const homeScore = parseInt(result.HomeScore) || 0;
      const awayScore = parseInt(result.AwayScore) || 0;

      goalsFor += homeScore;
      goalsAgainst += awayScore;

      if (homeScore > awayScore) wins++;
      else if (homeScore === awayScore) draws++;
      else losses++;
    });

    return {
      total_results: results.length,
      wins: wins,
      draws: draws,
      losses: losses,
      goals_for: goalsFor,
      goals_against: goalsAgainst,
      goal_difference: goalsFor - goalsAgainst,
      competitions: [...new Set(results.map(r => r.Competition).filter(c => c))]
    };
  };

  // ==================== PAYLOAD BUILDERS ====================

  /**
   * Build monthly fixtures payload
   */
  MonthlySummariesManager.prototype.buildMonthlyFixturesPayload = function(fixturesData, statistics, monthKey, idempotencyKey) {
    const [yearString, monthString] = monthKey.split('-');
    const monthNumber = parseInt(monthString, 10);
    const yearNumber = parseInt(yearString, 10);

    const fixturesList = fixturesData.map(fixture => ({
      date: fixture.Date,
      opponent: fixture.Opposition || fixture.Opponent,
      venue: fixture.Venue,
      competition: fixture.Competition,
      kick_off: fixture.KickOff || fixture.Time,
      notes: fixture.Notes
    }));

    return {
      event_type: getConfigValue('MAKE.EVENT_TYPES.FIXTURES_THIS_MONTH', 'fixtures_this_month'),
      idempotency_key: idempotencyKey,
      system_version: getConfigValue('SYSTEM.VERSION'),
      club_name: getConfigValue('SYSTEM.CLUB_NAME'),
      month_key: monthKey,
      month_name: DateUtils.getMonthName(monthNumber),
      month_number: monthNumber,
      year: yearNumber,
      fixture_count: fixturesData.length,
      fixtures_list: fixturesList,
      statistics: statistics,
      content_title: `${DateUtils.getMonthName(monthNumber)} Fixtures`,
      timestamp: DateUtils.formatISO(DateUtils.now()),
      template_variants: this.variantBuilderAvailable ? this.buildTemplateVariants('fixtures', fixturesList) : null
    };
  };

  /**
   * Build monthly results payload
   */
  MonthlySummariesManager.prototype.buildMonthlyResultsPayload = function(resultsData, statistics, monthKey, idempotencyKey) {
    const [yearString, monthString] = monthKey.split('-');
    const monthNumber = parseInt(monthString, 10);
    const yearNumber = parseInt(yearString, 10);

    const resultsList = resultsData.map(result => ({
      date: result.Date,
      opponent: result.Opposition || result.Opponent,
      home_score: result.HomeScore,
      away_score: result.AwayScore,
      venue: result.Venue,
      competition: result.Competition,
      result: this.determineResult(result.HomeScore, result.AwayScore)
    }));

    return {
      event_type: getConfigValue('MAKE.EVENT_TYPES.RESULTS_THIS_MONTH', 'results_this_month'),
      idempotency_key: idempotencyKey,
      system_version: getConfigValue('SYSTEM.VERSION'),
      club_name: getConfigValue('SYSTEM.CLUB_NAME'),
      month_key: monthKey,
      month_name: DateUtils.getMonthName(monthNumber),
      month_number: monthNumber,
      year: yearNumber,
      result_count: resultsData.length,
      results_list: resultsList,
      statistics: statistics,
      content_title: `${DateUtils.getMonthName(monthNumber)} Results`,
      timestamp: DateUtils.formatISO(DateUtils.now()),
      template_variants: this.variantBuilderAvailable ? this.buildTemplateVariants('results', resultsList) : null
    };
  };

  // ==================== HELPER METHODS ====================

  /**
   * Determine match result
   */
  MonthlySummariesManager.prototype.determineResult = function(homeScore, awayScore) {
    const home = parseInt(homeScore) || 0;
    const away = parseInt(awayScore) || 0;

    if (home > away) return 'W';
    if (home < away) return 'L';
    return 'D';
  };

  /**
   * Generate idempotency key
   */
  MonthlySummariesManager.prototype.generateIdempotencyKey = function(type, monthKey) {
    return `monthly_${type}_${monthKey}_${Date.now()}`;
  };

  /**
   * Log monthly content
   */
  MonthlySummariesManager.prototype.logMonthlyContent = function(type, monthKey, payload) {
    try {
      if (!this.monthlyContentSheetName) return;

      const sheet = SheetUtils.getOrCreateSheet(this.monthlyContentSheetName, this.monthlyContentColumns);
      if (!sheet) return;

      const logData = {
        'Type': type,
        'Month Key': monthKey,
        'Event Type': payload.event_type,
        'Created': DateUtils.formatISO(DateUtils.now()),
        'Status': 'sent'
      };

      SheetUtils.appendRow(sheet, logData);
    } catch (error) {
      this.logger.warn('Failed to log monthly content', { error: error.toString() });
    }
  };

  /**
   * Build template variants (if available)
   */
  MonthlySummariesManager.prototype.buildTemplateVariants = function(type, data) {
    if (!this.variantBuilderAvailable) return null;

    try {
      return buildTemplateVariantCollection(type, {
        items: data,
        club_name: getConfigValue('SYSTEM.CLUB_NAME'),
        content_type: `monthly_${type}`
      });
    } catch (error) {
      this.logger.warn('Failed to build template variants', { error: error.toString() });
      return null;
    }
  };
}