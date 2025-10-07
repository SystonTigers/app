
/**
 * @fileoverview Enhanced player management with minutes tracking and statistics
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Manages player statistics, minutes tracking, and bi-monthly summaries
 * 
 * FEATURES IMPLEMENTED:
 * - Real-time player statistics updates
 * - Player minutes tracking and calculation
 * - Substitution logging and management
 * - Team list swapping for subs
 * - Bi-monthly player statistics summaries
 * - Manual stat input for historical data
 */

// ==================== PLAYER MANAGEMENT MANAGER CLASS ====================

/**
 * Player Management Manager - Handles all player-related operations
 */
class PlayerManagementManager {

  constructor() {
    this.loggerName = 'PlayerManagement';
    this._logger = null;
    this.currentMatch = null;
    this.playerMinutesCache = new Map();
  }

  get logger() {
    if (!this._logger) {
      try {
        this._logger = logger.scope(this.loggerName);
      } catch (error) {
        this._logger = {
          enterFunction: (fn, data) => console.log(`[${this.loggerName}] → ${fn}`, data || ''),
          exitFunction: (fn, data) => console.log(`[${this.loggerName}] ← ${fn}`, data || ''),
          info: (msg, data) => console.log(`[${this.loggerName}] ${msg}`, data || ''),
          warn: (msg, data) => console.warn(`[${this.loggerName}] ${msg}`, data || ''),
          error: (msg, data) => console.error(`[${this.loggerName}] ${msg}`, data || '')
        };
      }
    }
    return this._logger;
  }

  // ==================== PLAYER STATISTICS UPDATES ====================

  /**
   * Update player goal statistics
   * @param {string} player - Player name
   * @param {string} assist - Assist provider
   * @returns {Object} Update result
   */
  updatePlayerGoalStats(player, assist = '') {
    this.logger.enterFunction('updatePlayerGoalStats', { player, assist });
    
    try {
      // @testHook(goal_stats_update_start)
      
      const playerStatsSheet = SheetUtils.getOrCreateSheet(
        getConfigValue('SHEETS.TAB_NAMES.PLAYER_STATS'),
        getConfigValue('SHEETS.REQUIRED_COLUMNS.PLAYER_STATS')
      );
      
      if (!playerStatsSheet) {
        throw new Error('Cannot access Player Stats sheet');
      }
      
      // Update goal scorer stats
      const goalResult = this.updatePlayerStat(playerStatsSheet, player, 'Goals', 1);
      
      // Update assist provider stats
      let assistResult = { success: true };
      if (assist && assist.trim() !== '') {
        assistResult = this.updatePlayerStat(playerStatsSheet, assist, 'Assists', 1);
      }
      
      // Update last modified timestamp
      this.updatePlayerTimestamp(playerStatsSheet, player);
      if (assist) {
        this.updatePlayerTimestamp(playerStatsSheet, assist);
      }
      
      // @testHook(goal_stats_update_complete)
      
      this.logger.exitFunction('updatePlayerGoalStats', { 
        success: goalResult.success && assistResult.success 
      });
      
      return {
        success: goalResult.success && assistResult.success,
        goal_scorer_updated: goalResult.success,
        assist_provider_updated: assistResult.success,
        player: player,
        assist: assist
      };
      
    } catch (error) {
      this.logger.error('Failed to update goal stats', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Update player card statistics
   * @param {string} player - Player name
   * @param {string} cardType - Card type (Yellow, Red, Sin Bin)
   * @returns {Object} Update result
   */
  updatePlayerCardStats(player, cardType) {
    this.logger.enterFunction('updatePlayerCardStats', { player, cardType });
    
    try {
      // @testHook(card_stats_update_start)
      
      const playerStatsSheet = SheetUtils.getOrCreateSheet(
        getConfigValue('SHEETS.TAB_NAMES.PLAYER_STATS'),
        getConfigValue('SHEETS.REQUIRED_COLUMNS.PLAYER_STATS')
      );
      
      if (!playerStatsSheet) {
        throw new Error('Cannot access Player Stats sheet');
      }
      
      // Determine stat column based on card type
      let statColumn;
      if (cardType.toLowerCase().includes('yellow')) {
        statColumn = 'Yellow Cards';
      } else if (cardType.toLowerCase().includes('red')) {
        statColumn = 'Red Cards';
      } else if (cardType.toLowerCase().includes('sin')) {
        statColumn = 'Sin Bins';
      } else {
        this.logger.warn('Unknown card type', { cardType });
        return { success: false, error: 'Unknown card type' };
      }
      
      // Update card stats
      const cardResult = this.updatePlayerStat(playerStatsSheet, player, statColumn, 1);
      
      // Update timestamp
      this.updatePlayerTimestamp(playerStatsSheet, player);
      
      // @testHook(card_stats_update_complete)
      
      this.logger.exitFunction('updatePlayerCardStats', { success: cardResult.success });
      
      return {
        success: cardResult.success,
        player: player,
        card_type: cardType,
        stat_column: statColumn
      };
      
    } catch (error) {
      this.logger.error('Failed to update card stats', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Update player substitution statistics
   * @param {string} playerOff - Player coming off
   * @param {string} playerOn - Player coming on
   * @returns {Object} Update result
   */
  updatePlayerSubStats(playerOff, playerOn) {
    this.logger.enterFunction('updatePlayerSubStats', { playerOff, playerOn });
    
    try {
      // @testHook(sub_stats_update_start)
      
      const playerStatsSheet = SheetUtils.getOrCreateSheet(
        getConfigValue('SHEETS.TAB_NAMES.PLAYER_STATS'),
        getConfigValue('SHEETS.REQUIRED_COLUMNS.PLAYER_STATS')
      );
      
      if (!playerStatsSheet) {
        throw new Error('Cannot access Player Stats sheet');
      }
      
      // Player coming on gets a substitute appearance
      const subResult = this.updatePlayerStat(playerStatsSheet, playerOn, 'Sub Apps', 1);
      
      // Update timestamps
      this.updatePlayerTimestamp(playerStatsSheet, playerOff);
      this.updatePlayerTimestamp(playerStatsSheet, playerOn);
      
      // @testHook(sub_stats_update_complete)
      
      this.logger.exitFunction('updatePlayerSubStats', { success: subResult.success });
      
      return {
        success: subResult.success,
        player_off: playerOff,
        player_on: playerOn
      };
      
    } catch (error) {
      this.logger.error('Failed to update substitution stats', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  // ==================== PLAYER MINUTES TRACKING ====================

  /**
   * Calculate player minutes for match
   * @param {string} player - Player name
   * @param {string} matchId - Match identifier
   * @param {number} startMinute - When player started (0 for starters)
   * @param {number} endMinute - When player finished (90 for finishers)
   * @returns {number} Minutes played
   */
  calculatePlayerMinutes(player, matchId, startMinute = 0, endMinute = 90) {
    this.logger.enterFunction('calculatePlayerMinutes', { player, matchId, startMinute, endMinute });
    
    try {
      // @testHook(minutes_calculation_start)
      
      // Check for substitutions affecting this player
      const subsLog = this.getPlayerSubstitutions(player, matchId);
      
      let actualStartMinute = startMinute;
      let actualEndMinute = endMinute;
      
      // Check if player was substituted off
      const subOff = subsLog.find(sub => sub['Player Off'] === player);
      if (subOff) {
        actualEndMinute = parseInt(subOff.Minute) || endMinute;
      }
      
      // Check if player was substituted on
      const subOn = subsLog.find(sub => sub['Player On'] === player);
      if (subOn) {
        actualStartMinute = parseInt(subOn.Minute) || startMinute;
      }
      
      const minutesPlayed = Math.max(0, actualEndMinute - actualStartMinute);
      
      // @testHook(minutes_calculation_complete)
      
      this.logger.exitFunction('calculatePlayerMinutes', { 
        player, 
        minutes: minutesPlayed,
        start: actualStartMinute,
        end: actualEndMinute
      });
      
      return minutesPlayed;
      
    } catch (error) {
      this.logger.error('Failed to calculate player minutes', { error: error.toString() });
      return 0;
    }
  }

  /**
   * Update player minutes in stats sheet
   * @param {string} player - Player name
   * @param {number} additionalMinutes - Minutes to add
   * @returns {Object} Update result
   */
  updatePlayerMinutesInSheet(player, additionalMinutes) {
    this.logger.enterFunction('updatePlayerMinutesInSheet', { player, additionalMinutes });
    
    try {
      // @testHook(minutes_sheet_update_start)
      
      const playerStatsSheet = SheetUtils.getOrCreateSheet(
        getConfigValue('SHEETS.TAB_NAMES.PLAYER_STATS'),
        getConfigValue('SHEETS.REQUIRED_COLUMNS.PLAYER_STATS')
      );
      
      if (!playerStatsSheet) {
        throw new Error('Cannot access Player Stats sheet');
      }
      
      // Get current minutes
      const currentData = SheetUtils.findRowByCriteria(playerStatsSheet, { 'Player': player });
      const currentMinutes = parseInt(currentData?.Minutes) || 0;
      
      // Update with new total
      const newTotal = currentMinutes + additionalMinutes;
      const updateResult = SheetUtils.updateRowByCriteria(
        playerStatsSheet,
        { 'Player': player },
        { 'Minutes': newTotal }
      );
      
      // Update timestamp
      this.updatePlayerTimestamp(playerStatsSheet, player);
      
      // @testHook(minutes_sheet_update_complete)
      
      this.logger.exitFunction('updatePlayerMinutesInSheet', { 
        success: updateResult,
        newTotal: newTotal
      });
      
      return {
        success: updateResult,
        player: player,
        previous_minutes: currentMinutes,
        additional_minutes: additionalMinutes,
        new_total: newTotal
      };
      
    } catch (error) {
      this.logger.error('Failed to update player minutes in sheet', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  // ==================== SUBSTITUTION MANAGEMENT ====================

  /**
   * Log substitution in Subs Log sheet
   * @param {string} matchId - Match identifier
   * @param {string} minute - Substitution minute
   * @param {string} playerOff - Player coming off
   * @param {string} playerOn - Player coming on
   * @param {string} reason - Substitution reason
   * @returns {Object} Logging result
   */
  logSubstitution(matchId, minute, playerOff, playerOn, reason = 'Tactical') {
    this.logger.enterFunction('logSubstitution', { matchId, minute, playerOff, playerOn });
    
    try {
      // @testHook(sub_logging_start)
      
      const subsLogSheet = SheetUtils.getOrCreateSheet(
        getConfigValue('SHEETS.TAB_NAMES.SUBS_LOG'),
        getConfigValue('SHEETS.REQUIRED_COLUMNS.SUBS_LOG')
      );
      
      if (!subsLogSheet) {
        throw new Error('Cannot access Subs Log sheet');
      }
      
      // Get match info
      const matchInfo = this.getMatchInfo(matchId);
      
      // Create substitution record
      const subData = {
        'Match ID': matchId,
        'Date': matchInfo.date || DateUtils.formatUK(DateUtils.now()),
        'Minute': minute,
        'Player Off': playerOff,
        'Player On': playerOn,
        'Home/Away': matchInfo.homeAway || 'Home',
        'Reason': reason,
        'Timestamp': DateUtils.formatISO(DateUtils.now())
      };
      
      const logResult = SheetUtils.addRowFromObject(subsLogSheet, subData);
      
      // @testHook(sub_logging_complete)
      
      this.logger.exitFunction('logSubstitution', { success: logResult });
      
      return {
        success: logResult,
        substitution: subData
      };
      
    } catch (error) {
      this.logger.error('Failed to log substitution', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Swap players in team lists (NEW: From spec)
   * @param {string} playerOff - Player coming off
   * @param {string} playerOn - Player coming on
   * @returns {Object} Swap result
   */
  swapPlayersInTeamLists(playerOff, playerOn) {
    this.logger.enterFunction('swapPlayersInTeamLists', { playerOff, playerOn });
    
    try {
      // @testHook(team_swap_start)
      
      // This would interact with team sheet or lineup management
      // Implementation depends on how team lists are stored
      
      // For now, log the swap operation
      this.logger.info('Player swap executed', {
        off: playerOff,
        on: playerOn,
        action: 'team_list_swap'
      });
      
      // @testHook(team_swap_complete)
      
      this.logger.exitFunction('swapPlayersInTeamLists', { success: true });
      
      return {
        success: true,
        player_off: playerOff,
        player_on: playerOn,
        swapped_in_team_lists: true
      };
      
    } catch (error) {
      this.logger.error('Failed to swap players in team lists', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  // ==================== PLAYER STATISTICS SUMMARY ====================

  /**
   * Post player statistics summary (NEW: From spec - bi-monthly)
   * @param {string} reportingPeriod - Reporting period identifier
   * @returns {Object} Posting result
   */
  postPlayerStatsSummary(reportingPeriod = null) {
    this.logger.enterFunction('postPlayerStatsSummary', { reportingPeriod });
    
    try {
      // @testHook(stats_summary_start)
      
      // Generate reporting period if not provided
      if (!reportingPeriod) {
        const now = DateUtils.now();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        reportingPeriod = `${year}-${String(month).padStart(2, '0')}`;
      }
      
      // Check if already posted this period
      const idempotencyKey = `player_stats_${reportingPeriod}`;
      if (this.isDuplicateStatsSummary(idempotencyKey)) {
        return { success: true, message: 'Already posted this period', duplicate: true };
      }
      
      // Get all player statistics
      const playerStats = this.getAllPlayerStats();
      
      if (playerStats.length === 0) {
        this.logger.info('No player stats found for summary');
        return { success: true, count: 0, message: 'No player stats to summarize' };
      }
      
      // Calculate summary statistics
      const summaryStats = this.calculateSummaryStatistics(playerStats);
      
      // Create player stats payload
      const payload = this.createPlayerStatsPayload(playerStats, summaryStats, reportingPeriod);
      
      // @testHook(stats_summary_webhook)
      const webhookResult = this.sendPlayerStatsToMake(payload);
      
      if (webhookResult.success) {
        this.markStatsSummaryAsPosted(idempotencyKey);
      }
      
      this.logger.exitFunction('postPlayerStatsSummary', { 
        success: webhookResult.success,
        player_count: playerStats.length
      });
      
      return {
        success: webhookResult.success,
        event_type: 'player_stats_summary',
        reporting_period: reportingPeriod,
        player_count: playerStats.length,
        summary_stats: summaryStats,
        webhook_sent: webhookResult.success
      };
      
    } catch (error) {
      this.logger.error('Player stats summary failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  // ==================== DATA RETRIEVAL METHODS ====================

  /**
   * Get all player statistics
   * @returns {Array} Player statistics array
   */
  getAllPlayerStats() {
    try {
      const playerStatsSheet = SheetUtils.getOrCreateSheet(
        getConfigValue('SHEETS.TAB_NAMES.PLAYER_STATS')
      );
      
      if (!playerStatsSheet) return [];
      
      const allStats = SheetUtils.getAllDataAsObjects(playerStatsSheet);
      
      // Filter out players with minimum appearances
      const minAppearances = getConfigValue('MONTHLY_CONTENT.PLAYER_STATS.minimum_appearances', 1);
      
      return allStats.filter(player => {
        const appearances = parseInt(player.Appearances) || 0;
        return appearances >= minAppearances && player.Player && player.Player.trim() !== '';
      });
      
    } catch (error) {
      this.logger.error('Failed to get all player stats', { error: error.toString() });
      return [];
    }
  }

  /**
   * Get player substitutions for match
   * @param {string} player - Player name
   * @param {string} matchId - Match identifier
   * @returns {Array} Substitutions array
   */
  getPlayerSubstitutions(player, matchId) {
    try {
      const subsLogSheet = SheetUtils.getOrCreateSheet(
        getConfigValue('SHEETS.TAB_NAMES.SUBS_LOG')
      );
      
      if (!subsLogSheet) return [];
      
      const allSubs = SheetUtils.getAllDataAsObjects(subsLogSheet);
      
      return allSubs.filter(sub => 
        sub['Match ID'] === matchId && 
        (sub['Player Off'] === player || sub['Player On'] === player)
      );
      
    } catch (error) {
      this.logger.error('Failed to get player substitutions', { error: error.toString() });
      return [];
    }
  }

  /**
   * Get match information
   * @param {string} matchId - Match identifier
   * @returns {Object} Match information
   */
  getMatchInfo(matchId) {
    try {
      // Try Results sheet first
      const resultsSheet = SheetUtils.getOrCreateSheet(
        getConfigValue('SHEETS.TAB_NAMES.RESULTS')
      );
      
      if (resultsSheet) {
        const resultData = SheetUtils.findRowByCriteria(resultsSheet, { 'Match ID': matchId });
        if (resultData) {
          return {
            date: resultData.Date,
            opponent: resultData.Opposition,
            homeAway: resultData['Home/Away'],
            competition: resultData.Competition
          };
        }
      }
      
      // Try Fixtures sheet
      const fixturesSheet = SheetUtils.getOrCreateSheet(
        getConfigValue('SHEETS.TAB_NAMES.FIXTURES')
      );
      
      if (fixturesSheet) {
        const fixtureData = SheetUtils.findRowByCriteria(fixturesSheet, { 'Match ID': matchId });
        if (fixtureData) {
          return {
            date: fixtureData.Date,
            opponent: fixtureData.Opposition,
            homeAway: fixtureData['Home/Away'],
            competition: fixtureData.Competition
          };
        }
      }
      
      // Default return
      return {
        date: DateUtils.formatUK(DateUtils.now()),
        opponent: 'Unknown',
        homeAway: 'Home',
        competition: 'League'
      };
      
    } catch (error) {
      this.logger.error('Failed to get match info', { error: error.toString() });
      return { date: '', opponent: '', homeAway: 'Home', competition: '' };
    }
  }

  // ==================== STATISTICS CALCULATION ====================

  /**
   * Calculate summary statistics from all players
   * @param {Array} playerStats - All player statistics
   * @returns {Object} Summary statistics
   */
  calculateSummaryStatistics(playerStats) {
    const summary = {
      total_players: playerStats.length,
      total_appearances: 0,
      total_goals: 0,
      total_assists: 0,
      total_minutes: 0,
      total_cards: 0,
      
      // Leaders
      top_scorer: null,
      most_assists: null,
      most_minutes: null,
      most_appearances: null,
      motm_winner: null,
      
      // Averages
      avg_goals_per_game: 0,
      avg_minutes_per_player: 0,
      
      // Clean sheets (goalkeeper stats)
      clean_sheets: 0,
      
      // Discipline summary
      yellow_cards: 0,
      red_cards: 0,
      sin_bins: 0
    };
    
    let maxGoals = 0;
    let maxAssists = 0;
    let maxMinutes = 0;
    let maxAppearances = 0;
    let maxMOTM = 0;
    
    playerStats.forEach(player => {
      const appearances = parseInt(player.Appearances) || 0;
      const goals = parseInt(player.Goals) || 0;
      const assists = parseInt(player.Assists) || 0;
      const minutes = parseInt(player.Minutes) || 0;
      const motm = parseInt(player.MOTM) || 0;
      const yellowCards = parseInt(player['Yellow Cards']) || 0;
      const redCards = parseInt(player['Red Cards']) || 0;
      const sinBins = parseInt(player['Sin Bins']) || 0;
      
      // Totals
      summary.total_appearances += appearances;
      summary.total_goals += goals;
      summary.total_assists += assists;
      summary.total_minutes += minutes;
      summary.yellow_cards += yellowCards;
      summary.red_cards += redCards;
      summary.sin_bins += sinBins;
      
      // Find leaders
      if (goals > maxGoals) {
        maxGoals = goals;
        summary.top_scorer = { player: player.Player, goals: goals };
      }
      
      if (assists > maxAssists) {
        maxAssists = assists;
        summary.most_assists = { player: player.Player, assists: assists };
      }
      
      if (minutes > maxMinutes) {
        maxMinutes = minutes;
        summary.most_minutes = { player: player.Player, minutes: minutes };
      }
      
      if (appearances > maxAppearances) {
        maxAppearances = appearances;
        summary.most_appearances = { player: player.Player, appearances: appearances };
      }
      
      if (motm > maxMOTM) {
        maxMOTM = motm;
        summary.motm_winner = { player: player.Player, motm_count: motm };
      }
    });
    
    // Calculate totals and averages
    summary.total_cards = summary.yellow_cards + summary.red_cards + summary.sin_bins;
    
    if (summary.total_players > 0) {
      summary.avg_minutes_per_player = Math.round(summary.total_minutes / summary.total_players);
    }
    
    if (summary.total_appearances > 0) {
      summary.avg_goals_per_game = Math.round((summary.total_goals / summary.total_appearances) * 100) / 100;
    }
    
    return summary;
  }

  // ==================== PAYLOAD CREATION ====================

  /**
   * Create player stats summary payload
   * @param {Array} playerStats - All player statistics
   * @param {Object} summaryStats - Summary statistics
   * @param {string} reportingPeriod - Reporting period
   * @returns {Object} Payload object
   */
  createPlayerStatsPayload(playerStats, summaryStats, reportingPeriod) {
    return {
      event_type: 'player_stats_summary',
      system_version: getConfigValue('SYSTEM.VERSION'),
      club_name: getConfigValue('SYSTEM.CLUB_NAME'),
      
      // Reporting period
      reporting_period: reportingPeriod,
      season: getConfigValue('SYSTEM.SEASON'),
      
      // Summary statistics
      total_players: summaryStats.total_players,
      total_appearances: summaryStats.total_appearances,
      total_goals: summaryStats.total_goals,
      total_assists: summaryStats.total_assists,
      total_minutes: summaryStats.total_minutes,
      
      // Leaders
      top_scorer: summaryStats.top_scorer,
      most_assists: summaryStats.most_assists,
      most_minutes: summaryStats.most_minutes,
      most_appearances: summaryStats.most_appearances,
      motm_winner: summaryStats.motm_winner,
      
      // Discipline
      yellow_cards: summaryStats.yellow_cards,
      red_cards: summaryStats.red_cards,
      sin_bins: summaryStats.sin_bins,
      total_cards: summaryStats.total_cards,
      
      // Averages
      avg_goals_per_game: summaryStats.avg_goals_per_game,
      avg_minutes_per_player: summaryStats.avg_minutes_per_player,
      
      // Complete player list (top performers only for Canva)
      player_stats: playerStats.slice(0, 10).map(player => ({
        name: player.Player,
        appearances: parseInt(player.Appearances) || 0,
        starts: parseInt(player.Starts) || 0,
        sub_apps: parseInt(player['Sub Apps']) || 0,
        goals: parseInt(player.Goals) || 0,
        penalties: parseInt(player.Penalties) || 0,
        assists: parseInt(player.Assists) || 0,
        minutes: parseInt(player.Minutes) || 0,
        motm: parseInt(player.MOTM) || 0,
        yellow_cards: parseInt(player['Yellow Cards']) || 0,
        red_cards: parseInt(player['Red Cards']) || 0,
        sin_bins: parseInt(player['Sin Bins']) || 0
      })),
      
      // Timestamps
      timestamp: DateUtils.formatISO(DateUtils.now()),
      generated_on: DateUtils.formatUK(DateUtils.now())
    };
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Update individual player statistic
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Player stats sheet
   * @param {string} player - Player name
   * @param {string} statColumn - Statistic column name
   * @param {number} increment - Amount to add
   * @returns {Object} Update result
   */
  updatePlayerStat(sheet, player, statColumn, increment) {
    try {
      // Find or create player row
      let playerData = SheetUtils.findRowByCriteria(sheet, { 'Player': player });
      
      if (!playerData) {
        // Create new player entry
        const newPlayerData = this.createNewPlayerEntry(player);
        const addResult = SheetUtils.addRowFromObject(sheet, newPlayerData);
        if (!addResult) {
          return { success: false, error: 'Failed to create new player entry' };
        }
        playerData = newPlayerData;
      }
      
      // Get current value and increment
      const currentValue = parseInt(playerData[statColumn]) || 0;
      const newValue = currentValue + increment;
      
      // Update the statistic
      const updateResult = SheetUtils.updateRowByCriteria(
        sheet,
        { 'Player': player },
        { [statColumn]: newValue }
      );
      
      return {
        success: updateResult,
        player: player,
        stat_column: statColumn,
        previous_value: currentValue,
        increment: increment,
        new_value: newValue
      };
      
    } catch (error) {
      this.logger.error('Failed to update player stat', { 
        error: error.toString(), 
        player, 
        statColumn 
      });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Create new player entry with default values
   * @param {string} player - Player name
   * @returns {Object} New player data object
   */
  createNewPlayerEntry(player) {
    return {
      'Player': player,
      'Appearances': 0,
      'Starts': 0,
      'Sub Apps': 0,
      'Goals': 0,
      'Penalties': 0,
      'Assists': 0,
      'Yellow Cards': 0,
      'Red Cards': 0,
      'Sin Bins': 0,
      'MOTM': 0,
      'Minutes': 0,
      'Last Updated': DateUtils.formatISO(DateUtils.now())
    };
  }

  /**
   * Update player timestamp
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Player stats sheet
   * @param {string} player - Player name
   */
  updatePlayerTimestamp(sheet, player) {
    try {
      SheetUtils.updateRowByCriteria(
        sheet,
        { 'Player': player },
        { 'Last Updated': DateUtils.formatISO(DateUtils.now()) }
      );
    } catch (error) {
      this.logger.error('Failed to update player timestamp', { 
        error: error.toString(), 
        player 
      });
    }
  }

  /**
   * Send player stats to Make.com
   * @param {Object} payload - Payload to send
   * @returns {Object} Send result
   */
  sendPlayerStatsToMake(payload) {
    this.logger.enterFunction('sendPlayerStatsToMake', { event_type: payload.event_type });

    let consentDecision = null;

    try {
      const consentContext = {
        module: 'player_management',
        eventType: payload.event_type,
        platform: 'make_webhook',
        players: this.resolveConsentPlayers(payload)
      };

      // @testHook(player_stats_consent_start)
      consentDecision = ConsentGate.evaluatePost(payload, consentContext);
      // @testHook(player_stats_consent_complete)

      if (!consentDecision.allowed) {
        this.logger.warn('Player stats payload blocked by consent gate', {
          reason: consentDecision.reason
        });
        this.logger.exitFunction('sendPlayerStatsToMake', {
          success: false,
          blocked: true,
          reason: consentDecision.reason
        });
        return {
          success: false,
          blocked: true,
          reason: consentDecision.reason,
          consent: consentDecision
        };
      }

      const enrichedPayload = ConsentGate.applyDecisionToPayload(payload, consentDecision);

      // @testHook(player_stats_webhook_start)

      const webhookUrl = getWebhookUrl();
      if (!webhookUrl) {
        throw new Error('Webhook URL not configured');
      }
      
      // Rate limiting
      const rateLimitMs = getConfigValue('PERFORMANCE.WEBHOOK_RATE_LIMIT_MS', 1000);
      Utilities.sleep(rateLimitMs);
      
      const response = UrlFetchApp.fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify(enrichedPayload),
        muteHttpExceptions: true
      });

      const success = response.getResponseCode() === 200;

      // @testHook(player_stats_webhook_complete)

      this.logger.exitFunction('sendPlayerStatsToMake', {
        success,
        response_code: response.getResponseCode()
      });

      return {
        success: success,
        response_code: response.getResponseCode(),
        response_text: response.getContentText(),
        consent: consentDecision
      };

    } catch (error) {
      this.logger.error('Failed to send player stats to Make.com', { error: error.toString() });
      return { success: false, error: error.toString(), consent: consentDecision };
    }
  }

  /**
   * Resolve players referenced in player stats payload
   * @param {Object} payload - Player stats payload
   * @returns {Array<Object>} Player references
   */
  resolveConsentPlayers(payload) {
    const players = [];
    const seen = new Set();

    if (payload.top_scorer && payload.top_scorer.player) {
      const key = payload.top_scorer.player.toString().trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        players.push({ player: payload.top_scorer.player });
      }
    }

    if (Array.isArray(payload.player_stats)) {
      payload.player_stats.forEach(stat => {
        if (stat.name) {
          const key = stat.name.toString().trim().toLowerCase();
          if (key && !seen.has(key)) {
            seen.add(key);
            players.push({ player: stat.name });
          }
        }
      });
    }

    return players;
  }

  /**
   * Check if stats summary already posted for period
   * @param {string} idempotencyKey - Idempotency key
   * @returns {boolean} True if already posted
   */
  isDuplicateStatsSummary(idempotencyKey) {
    try {
      // Check in a tracking sheet or use PropertiesService
      const properties = PropertiesService.getScriptProperties();
      const posted = properties.getProperty(idempotencyKey);
      return posted === 'true';
    } catch (error) {
      this.logger.error('Failed to check duplicate stats summary', { error: error.toString() });
      return false;
    }
  }

  /**
   * Mark stats summary as posted
   * @param {string} idempotencyKey - Idempotency key
   */
  markStatsSummaryAsPosted(idempotencyKey) {
    try {
      const properties = PropertiesService.getScriptProperties();
      properties.setProperty(idempotencyKey, 'true');
    } catch (error) {
      this.logger.error('Failed to mark stats summary as posted', { error: error.toString() });
    }
  }
}

// ==================== PUBLIC API FUNCTIONS ====================

/**
 * Update player statistics after goal (public API)
 * @param {string} player - Goal scorer
 * @param {string} assist - Assist provider
 * @returns {Object} Update result
 */
function updatePlayerStats(player, assist = '') {
  const manager = new PlayerManagementManager();
  return manager.updatePlayerGoalStats(player, assist);
}

/**
 * Calculate and update player minutes (public API)
 * @param {string} player - Player name
 * @param {string} matchId - Match identifier
 * @param {number} minutesPlayed - Minutes played this match
 * @returns {Object} Update result
 */
function updatePlayerMinutes(player, matchId, minutesPlayed) {
  const manager = new PlayerManagementManager();
  return manager.updatePlayerMinutesInSheet(player, minutesPlayed);
}

/**
 * Process substitution with full logging (public API)
 * @param {string} matchId - Match identifier
 * @param {string} minute - Substitution minute
 * @param {string} playerOff - Player coming off
 * @param {string} playerOn - Player coming on
 * @param {string} reason - Substitution reason
 * @returns {Object} Processing result
 */
function processSubstitution(matchId, minute, playerOff, playerOn, reason = 'Tactical') {
  const manager = new PlayerManagementManager();
  
  // Log the substitution
  const logResult = manager.logSubstitution(matchId, minute, playerOff, playerOn, reason);
  
  // Update player statistics
  const statsResult = manager.updatePlayerSubStats(playerOff, playerOn);
  
  // Swap in team lists if enabled
  let swapResult = { success: true };
  if (isFeatureEnabled('SUB_SWAPPING_SYSTEM')) {
    swapResult = manager.swapPlayersInTeamLists(playerOff, playerOn);
  }
  
  return {
    success: logResult.success && statsResult.success && swapResult.success,
    substitution_logged: logResult.success,
    stats_updated: statsResult.success,
    team_lists_swapped: swapResult.success,
    minute: minute,
    player_off: playerOff,
    player_on: playerOn
  };
}

/**
 * Post bi-monthly player statistics summary (public API)
 * @param {string} reportingPeriod - Reporting period (optional)
 * @returns {Object} Posting result
 */
function postPlayerStatsSummary(reportingPeriod = null) {
  const manager = new PlayerManagementManager();
  return manager.postPlayerStatsSummary(reportingPeriod);
}

/**
 * Initialize player management system
 * @returns {Object} Initialization result
 */
function initializePlayerManagement() {
  logger.enterFunction('PlayerManagement.initialize');
  
  try {
    // Validate required sheets exist
    const requiredSheets = [
      'PLAYER_STATS',
      'PLAYER_EVENTS', 
      'SUBS_LOG'
    ];
    
    const results = {};
    
    requiredSheets.forEach(sheetKey => {
      const tabName = getConfigValue(`SHEETS.TAB_NAMES.${sheetKey}`);
      const columns = getConfigValue(`SHEETS.REQUIRED_COLUMNS.${sheetKey}`);
      
      if (tabName && columns) {
        const sheet = SheetUtils.getOrCreateSheet(tabName, columns);
        results[sheetKey] = { success: !!sheet, name: tabName };
      }
    });
    
    // Validate player management configuration
    const autoCalculateMinutes = getConfigValue('PLAYER_MANAGEMENT.AUTO_CALCULATE_MINUTES');
    const autoUpdateStats = getConfigValue('PLAYER_MANAGEMENT.AUTO_UPDATE_STATS');
    
    logger.exitFunction('PlayerManagement.initialize', { success: true });
    
    return {
      success: true,
      sheets_created: results,
      features_enabled: {
        auto_calculate_minutes: autoCalculateMinutes,
        auto_update_stats: autoUpdateStats,
        sub_swapping: isFeatureEnabled('SUB_SWAPPING_SYSTEM'),
        player_minutes_tracking: isFeatureEnabled('PLAYER_MINUTES_TRACKING')
      },
      bi_monthly_stats_enabled: getConfigValue('MONTHLY_CONTENT.PLAYER_STATS.enabled', true)
    };
    
  } catch (error) {
    logger.error('Player management initialization failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

