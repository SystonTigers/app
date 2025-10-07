/**
 * @fileoverview Goal of the Month (GOTM) functionality module
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Handles GOTM voting, winner announcements, and Goal of the Season (split from monthly-summaries.gs)
 */

// ==================== GOAL OF THE MONTH (GOTM) ====================

/**
 * Extends MonthlySummariesManager with GOTM functionality
 */
if (typeof MonthlySummariesManager !== 'undefined') {

  /**
   * Start GOTM voting for a specific month
   */
  MonthlySummariesManager.prototype.startGOTMVoting = function(month = null, year = null) {
    this.logger.enterFunction('startGOTMVoting', { month, year });

    try {
      if (!isFeatureEnabled('GOTM')) {
        const disabled = {
          success: true,
          skipped: true,
          reason: 'GOTM feature disabled'
        };
        this.logger.exitFunction('startGOTMVoting', disabled);
        return disabled;
      }

      const gotmConfig = getConfigValue('MONTHLY.GOTM', {});
      if (!gotmConfig.ENABLED) {
        const disabled = {
          success: true,
          skipped: true,
          reason: 'GOTM disabled in config'
        };
        this.logger.exitFunction('startGOTMVoting', disabled);
        return disabled;
      }

      const { monthNumber, yearNumber } = this.resolveMonthParameters(month, year, 'gotm_voting');
      const monthKey = this.buildMonthKey(yearNumber, monthNumber);

      if (this.isDuplicateRequest('gotm_voting', monthKey)) {
        const duplicate = {
          success: true,
          skipped: true,
          duplicate: true,
          month_key: monthKey,
          message: 'GOTM voting already started'
        };
        this.logger.exitFunction('startGOTMVoting', duplicate);
        return duplicate;
      }

      const goals = this.gatherMonthlyGoals(monthNumber, yearNumber);

      if (goals.length === 0) {
        const noGoals = {
          success: true,
          skipped: true,
          reason: 'No goals found for the month',
          month_key: monthKey
        };
        this.logger.exitFunction('startGOTMVoting', noGoals);
        return noGoals;
      }

      const idempotencyKey = this.generateIdempotencyKey('gotm_voting', monthKey);
      const payload = this.createGOTMVotingPayload(goals, monthNumber, yearNumber, idempotencyKey);

      const webhookResult = this.makeIntegration.sendWebhook(payload);

      if (webhookResult.success) {
        this.markRequestProcessed('gotm_voting', monthKey);
        this.storeGOTMVotingData(goals, monthNumber, yearNumber);
      }

      const result = this.createSuccessResponse({
        webhook: webhookResult,
        goals: goals,
        monthKey: monthKey
      }, 'startGOTMVoting');

      this.logger.exitFunction('startGOTMVoting', result);
      return result;

    } catch (error) {
      return this.handleError('startGOTMVoting', error, { month, year });
    }
  };

  /**
   * Announce GOTM winner
   */
  MonthlySummariesManager.prototype.announceGOTMWinner = function(month = null, year = null) {
    this.logger.enterFunction('announceGOTMWinner', { month, year });

    try {
      if (!isFeatureEnabled('GOTM')) {
        const disabled = {
          success: true,
          skipped: true,
          reason: 'GOTM feature disabled'
        };
        this.logger.exitFunction('announceGOTMWinner', disabled);
        return disabled;
      }

      const gotmConfig = getConfigValue('MONTHLY.GOTM', {});
      if (!gotmConfig.ENABLED) {
        const disabled = {
          success: true,
          skipped: true,
          reason: 'GOTM disabled in config'
        };
        this.logger.exitFunction('announceGOTMWinner', disabled);
        return disabled;
      }

      const { monthNumber, yearNumber } = this.resolveMonthParameters(month, year, 'gotm_winner');
      const monthKey = this.buildMonthKey(yearNumber, monthNumber);

      if (this.isDuplicateRequest('gotm_winner', monthKey)) {
        const duplicate = {
          success: true,
          skipped: true,
          duplicate: true,
          month_key: monthKey,
          message: 'GOTM winner already announced'
        };
        this.logger.exitFunction('announceGOTMWinner', duplicate);
        return duplicate;
      }

      const storedVoting = this.getStoredGOTMVotingData(monthNumber, yearNumber);
      if (!storedVoting) {
        const noVoting = {
          success: false,
          error: 'No GOTM voting data found for this month',
          month_key: monthKey
        };
        this.logger.exitFunction('announceGOTMWinner', noVoting);
        return noVoting;
      }

      // Only auto-select winner if there's exactly one goal
      let payload;
      if (storedVoting.goals.length === 1) {
        const winner = storedVoting.goals[0];
        const idempotencyKey = this.generateIdempotencyKey('gotm_winner', monthKey);
        payload = this.createGOTMWinnerPayload(winner, storedVoting.goals, monthNumber, yearNumber, idempotencyKey);
      } else {
        // Multiple goals - require manual winner selection
        const multipleGoalsResult = {
          success: false,
          reason: 'Multiple goals require manual winner selection',
          goalCount: storedVoting.goals.length,
          goals: storedVoting.goals.map(g => ({ player: g.player_name, minute: g.minute })),
          message: 'GOTM voting with multiple goals not yet implemented - please select winner manually'
        };
        this.logger.warn('GOTM auto-announcement skipped - multiple goals', multipleGoalsResult);
        this.logger.exitFunction('announceGOTMWinner', multipleGoalsResult);
        return multipleGoalsResult;
      }

      const webhookResult = this.makeIntegration.sendWebhook(payload);

      if (webhookResult.success) {
        this.markRequestProcessed('gotm_winner', monthKey);
        this.updateGOTSTracking(winner, yearNumber);
      }

      const result = this.createSuccessResponse({
        webhook: webhookResult,
        winner: winner,
        monthKey: monthKey
      }, 'announceGOTMWinner');

      this.logger.exitFunction('announceGOTMWinner', result);
      return result;

    } catch (error) {
      return this.handleError('announceGOTMWinner', error, { month, year });
    }
  };

  // ==================== GOTM DATA GATHERING ====================

  /**
   * Gather monthly goals for GOTM
   */
  MonthlySummariesManager.prototype.gatherMonthlyGoals = function(month, year) {
    const cacheKey = `gotm_goals_${year}_${month}`;
    let cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const liveSheet = SheetUtils.getOrCreateSheet(
        getConfigValue('SHEETS.TAB_NAMES.LIVE_MATCH_UPDATES'),
        getConfigValue('SHEETS.REQUIRED_COLUMNS.LIVE_MATCH_UPDATES', [])
      );

      if (!liveSheet) return [];

      const data = SheetUtils.getAllDataAsObjects(liveSheet);
      const goals = data.filter(row => {
        if (row.Event !== 'Goal' || !row.Date) return false;

        const eventDate = new Date(row.Date);
        return eventDate.getMonth() === month - 1 && eventDate.getFullYear() === year;
      });

      const processedGoals = goals.map((goal, index) => ({
        goal_id: `${year}${month.toString().padStart(2, '0')}_${index + 1}`,
        player: goal.Player,
        opponent: goal.Opponent || 'Unknown',
        minute: goal.Minute,
        date: goal.Date,
        competition: goal.Competition,
        assist: goal.Assist,
        goal_type: goal.GoalType || 'Standard',
        month: month,
        year: year
      }));

      this.setCachedData(cacheKey, processedGoals);
      return processedGoals;

    } catch (error) {
      this.logger.error('Failed to gather monthly goals', { error: error.toString() });
      return [];
    }
  };

  // ==================== GOTM PAYLOAD BUILDERS ====================

  /**
   * Create GOTM voting payload
   */
  MonthlySummariesManager.prototype.createGOTMVotingPayload = function(goals, month, year, idempotencyKey) {
    const monthName = DateUtils.getMonthName(month);

    return {
      event_type: getConfigValue('MAKE.EVENT_TYPES.GOTM_VOTING_OPEN', 'gotm_voting_start'),
      idempotency_key: idempotencyKey,
      system_version: getConfigValue('SYSTEM.VERSION'),
      club_name: getConfigValue('SYSTEM.CLUB_NAME'),
      month: month,
      year: year,
      month_name: monthName,
      goal_count: goals.length,
      goals: goals,
      voting_period_days: getConfigValue('MONTHLY.GOTM.VOTING_PERIOD_DAYS', 5),
      content_title: `${monthName} Goal of the Month - Voting Open`,
      voting_instructions: 'Vote for your favourite goal using the poll in our social media posts',
      metadata: {
        competition_types: [...new Set(goals.map(g => g.competition).filter(c => c))],
        goal_types: [...new Set(goals.map(g => g.goal_type).filter(t => t))],
        unique_scorers: [...new Set(goals.map(g => g.player).filter(p => p))]
      },
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  };

  /**
   * Create GOTM winner payload
   */
  MonthlySummariesManager.prototype.createGOTMWinnerPayload = function(winner, allGoals, month, year, idempotencyKey) {
    const monthName = DateUtils.getMonthName(month);

    return {
      event_type: getConfigValue('MAKE.EVENT_TYPES.GOTM_WINNER', 'gotm_winner_announcement'),
      idempotency_key: idempotencyKey,
      system_version: getConfigValue('SYSTEM.VERSION'),
      club_name: getConfigValue('SYSTEM.CLUB_NAME'),
      month: month,
      year: year,
      month_name: monthName,
      winner_player: winner.player,
      winner_goal: winner,
      total_goals: allGoals.length,
      content_title: `${monthName} Goal of the Month Winner: ${winner.player}`,
      celebration_text: `Congratulations to ${winner.player} for winning ${monthName}'s Goal of the Month!`,
      goal_details: {
        opponent: winner.opponent,
        minute: winner.minute,
        date: winner.date,
        competition: winner.competition,
        assist: winner.assist,
        goal_type: winner.goal_type
      },
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  };

  // ==================== GOTM DATA STORAGE ====================

  /**
   * Store GOTM voting data
   */
  MonthlySummariesManager.prototype.storeGOTMVotingData = function(goals, month, year) {
    try {
      const monthlyStatsSheet = SheetUtils.getOrCreateSheet(
        getConfigValue('SHEETS.TAB_NAMES.MONTHLY_STATS', 'Monthly Stats'),
        ['Month', 'Year', 'Type', 'Data', 'Created']
      );

      if (!monthlyStatsSheet) return;

      const votingData = {
        'Month': month,
        'Year': year,
        'Type': 'GOTM_VOTING',
        'Data': JSON.stringify({
          goals: goals,
          voting_started: DateUtils.formatISO(DateUtils.now()),
          voting_period_days: getConfigValue('MONTHLY.GOTM.VOTING_PERIOD_DAYS', 5)
        }),
        'Created': DateUtils.formatISO(DateUtils.now())
      };

      SheetUtils.appendRow(monthlyStatsSheet, votingData);

    } catch (error) {
      this.logger.error('Failed to store GOTM voting data', { error: error.toString() });
    }
  };

  /**
   * Get stored GOTM voting data
   */
  MonthlySummariesManager.prototype.getStoredGOTMVotingData = function(month, year) {
    try {
      const monthlyStatsSheet = SheetUtils.getOrCreateSheet(
        getConfigValue('SHEETS.TAB_NAMES.MONTHLY_STATS', 'Monthly Stats')
      );

      if (!monthlyStatsSheet) return null;

      const data = SheetUtils.getAllDataAsObjects(monthlyStatsSheet);
      const votingRecord = data.find(row =>
        row.Month == month &&
        row.Year == year &&
        row.Type === 'GOTM_VOTING'
      );

      if (votingRecord && votingRecord.Data) {
        return JSON.parse(votingRecord.Data);
      }

      return null;

    } catch (error) {
      this.logger.error('Failed to get stored GOTM voting data', { error: error.toString() });
      return null;
    }
  };

  // ==================== GOAL OF THE SEASON (GOTS) ====================

  /**
   * Update GOTS tracking with new GOTM winner
   */
  MonthlySummariesManager.prototype.updateGOTSTracking = function(winner, year) {
    try {
      if (!this.properties) return;

      const gotsKey = `gots_tracking_${year}`;
      let gotsData = this.properties.getProperty(gotsKey);

      if (!gotsData) {
        gotsData = {
          year: year,
          season: getConfigValue('SYSTEM.SEASON'),
          goals: [],
          created: DateUtils.formatISO(DateUtils.now())
        };
      } else {
        gotsData = JSON.parse(gotsData);
      }

      // Add winner to GOTS tracking
      gotsData.goals.push({
        ...winner,
        gotm_winner: true,
        place: gotsData.goals.length + 1,
        added_to_gots: DateUtils.formatISO(DateUtils.now())
      });

      this.properties.setProperty(gotsKey, JSON.stringify(gotsData));

      this.logger.info('Updated GOTS tracking', {
        year: year,
        totalGoals: gotsData.goals.length,
        newWinner: winner.player
      });

    } catch (error) {
      this.logger.error('Failed to update GOTS tracking', { error: error.toString() });
    }
  };

  /**
   * Get GOTS data for a year
   */
  MonthlySummariesManager.prototype.getGOTSData = function(year) {
    try {
      if (!this.properties) return null;

      const gotsKey = `gots_tracking_${year}`;
      const gotsData = this.properties.getProperty(gotsKey);

      return gotsData ? JSON.parse(gotsData) : null;

    } catch (error) {
      this.logger.error('Failed to get GOTS data', { error: error.toString() });
      return null;
    }
  };
}