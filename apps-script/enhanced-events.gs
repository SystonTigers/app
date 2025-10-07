/**
 * @fileoverview Enhanced event processing for live match automation
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Handles all live match events including opposition events and 2nd yellows
 * 
 * FEATURES IMPLEMENTED:
 * - Opposition goal detection ("Goal" player = opposition goal)
 * - Opposition card handling ("Opposition" player = opposition card)
 * - 2nd yellow card processing with enhanced logic
 * - Player minutes tracking and substitution handling
 * - Video clip metadata creation
 * - Real-time player statistics updates
 * - XbotGo scoreboard integration
 */

// ==================== ENHANCED EVENTS MANAGER CLASS ====================

/**
 * Enhanced Events Manager - Handles all live match event processing
 */
class EnhancedEventsManager {

  constructor() {
    this.loggerName = 'EnhancedEvents';
    this._logger = null;
    this.playerManager = new PlayerManagementManager();
    this.makeIntegration = new MakeIntegration();
    this.currentMatch = null;
    this.playerMinutes = new Map(); // Track player time on pitch
    this.matchStartTime = null;
    this.halftimeMinute = 45;
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

  // ==================== GOAL EVENT PROCESSING ====================

  /**
   * Process goal event - Auto-detects team vs opposition goals
   * @param {string} minute - Match minute
   * @param {string} player - Player name (or "Goal" for opposition)
   * @param {string} assist - Assist provider
   * @param {string} matchId - Match identifier
   * @returns {Object} Processing result
   */
  processGoalEvent(minute, player, assist = '', matchId = null) {
    this.logger.enterFunction('processGoalEvent', { minute, player, assist, matchId });

    let result = null;
    let branch = 'team';

    try {
      // @testHook(goal_event_start)

      // Bible compliance: Auto-detect opposition goals
      const isOppositionGoal = this.detectOppositionGoal(player);

      if (isOppositionGoal) {
        branch = 'opposition';
        result = this.processOppositionGoal(minute, matchId);
        // @testHook(goal_event_exit_opposition)
      } else {
        branch = 'team';
        result = this.processTeamGoal(minute, player, assist, matchId);
        // @testHook(goal_event_exit_team)
      }

      const resultContext = Object.assign({ branch: branch }, result);
      this.logger.exitFunction('processGoalEvent', resultContext);
      return result;

    } catch (error) {
      const errorResponse = { success: false, error: error.toString() };
      this.logger.error('Goal event processing failed', { error: error.toString() });

      this.logger.exitFunction('processGoalEvent', errorResponse);
      return errorResponse;

    }
  }

  /**
   * Detect if this is an opposition goal
   * @param {string} player - Player name
   * @returns {boolean} True if opposition goal
   */
  detectOppositionGoal(player) {
    const goalKeywords = getConfigValue('OPPOSITION_HANDLING.GOAL_KEYWORDS', ['Goal']);
    return goalKeywords.includes(player);
  }

  /**
   * Process team goal
   * @param {string} minute - Match minute
   * @param {string} player - Goal scorer
   * @param {string} assist - Assist provider
   * @param {string} matchId - Match identifier
   * @returns {Object} Processing result
   */
  processTeamGoal(minute, player, assist = '', matchId = null) {
    this.logger.enterFunction('processTeamGoal', { minute, player, assist });
    
    try {
      // @testHook(team_goal_start)

      // Update player statistics
      this.playerManager.updatePlayerGoalStats(player, assist);
      
      // Update match score
      const currentScores = this.getCurrentScores(matchId);
      const isHomeTeam = this.isHomeTeam(matchId);
      
      if (isHomeTeam) {
        currentScores.home++;
      } else {
        currentScores.away++;
      }
      
      // Create video clip metadata if enabled
      if (isFeatureEnabled('VIDEO_CLIP_CREATION')) {
        this.createGoalClipMetadata(minute, player, assist, matchId);
      }
      
      // Update XbotGo scoreboard if enabled
      if (isFeatureEnabled('XBOTGO_INTEGRATION')) {
        this.updateXbotGoScoreboard(currentScores, matchId);
      }
      
      // Create Make.com payload
      const payload = this.createGoalPayload(minute, player, assist, currentScores, matchId, 'goal_team');
      
      // @testHook(team_goal_webhook)
      const webhookResult = this.sendToMake(payload);
      
      // Log event
      this.logPlayerEvent(matchId, player, 'Goal', minute, { assist: assist });
      
      this.logger.exitFunction('processTeamGoal', { success: true });
      return {
        success: true,
        event_type: 'goal_team',
        player: player,
        assist: assist,
        minute: minute,
        new_score: currentScores,
        webhook_sent: webhookResult.success
      };
      
    } catch (error) {
      this.logger.error('Team goal processing failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Process opposition goal (NEW: From spec)
   * @param {string} minute - Match minute
   * @param {string} matchId - Match identifier
   * @returns {Object} Processing result
   */
  processOppositionGoal(minute, matchId = null) {
    this.logger.enterFunction('processOppositionGoal', { minute, matchId });
    
    try {
      // @testHook(opposition_goal_start)
      
      // Update ONLY opposition score (not our player stats)
      const currentScores = this.getCurrentScores(matchId);
      const isHomeTeam = this.isHomeTeam(matchId);
      
      if (isHomeTeam) {
        currentScores.away++; // Opposition scored
      } else {
        currentScores.home++; // Opposition scored
      }
      
      // Update XbotGo scoreboard if enabled
      if (isFeatureEnabled('XBOTGO_INTEGRATION')) {
        this.updateXbotGoScoreboard(currentScores, matchId);
      }
      
      // Create opposition goal payload
      const payload = this.createGoalPayload(minute, 'Opposition', '', currentScores, matchId, 'goal_opposition');
      
      // @testHook(opposition_goal_webhook)
      const webhookResult = this.sendToMake(payload);
      
      // Log opposition event separately
      this.logOppositionEvent(matchId, 'Goal', minute);
      
      this.logger.exitFunction('processOppositionGoal', { success: true });
      return {
        success: true,
        event_type: 'goal_opposition',
        minute: minute,
        new_score: currentScores,
        webhook_sent: webhookResult.success
      };
      
    } catch (error) {
      this.logger.error('Opposition goal processing failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  // ==================== CARD EVENT PROCESSING ====================

  /**
   * Process card event - Auto-detects team vs opposition cards
   * @param {string} minute - Match minute
   * @param {string} player - Player name (or "Opposition")
   * @param {string} cardType - Card type (Yellow, Red, etc.)
   * @param {string} matchId - Match identifier
   * @returns {Object} Processing result
   */
  processCardEvent(minute, player, cardType, matchId = null) {
    this.logger.enterFunction('processCardEvent', { minute, player, cardType, matchId });

    let result = null;
    let branch = 'team';

    try {
      // @testHook(card_event_start)

      // Auto-detect opposition cards
      const isOppositionCard = this.detectOppositionCard(player);

      if (isOppositionCard) {
        branch = 'opposition';
        result = this.processOppositionCard(minute, cardType, matchId);
        // @testHook(card_event_exit_opposition)
      } else if (this.isSecondYellow(player, cardType, matchId)) {
        branch = 'second_yellow';
        result = this.processSecondYellow(minute, player, matchId);
        // @testHook(card_event_exit_second_yellow)
      } else {
        branch = 'team';
        result = this.processTeamCard(minute, player, cardType, matchId);
        // @testHook(card_event_exit_team)
      }

      const resultContext = Object.assign({ branch: branch }, result);
      this.logger.exitFunction('processCardEvent', resultContext);
      return result;

    } catch (error) {
      const errorResponse = { success: false, error: error.toString() };
      this.logger.error('Card event processing failed', { error: error.toString() });

      this.logger.exitFunction('processCardEvent', errorResponse);
      return errorResponse;

    }
  }

  /**
   * Detect if this is an opposition card
   * @param {string} player - Player name
   * @returns {boolean} True if opposition card
   */
  detectOppositionCard(player) {
    const oppositionKeywords = getConfigValue('OPPOSITION_HANDLING.OPPOSITION_KEYWORDS', ['Opposition']);
    return oppositionKeywords.includes(player);
  }

  /**
   * Check if this is a second yellow card
   * @param {string} player - Player name
   * @param {string} cardType - Card type
   * @param {string} matchId - Match identifier
   * @returns {boolean} True if second yellow
   */
  isSecondYellow(player, cardType, matchId) {
    if (!isFeatureEnabled('SECOND_YELLOW_PROCESSING')) {
      return false;
    }

    if (cardType.toLowerCase().includes('red') && cardType.toLowerCase().includes('yellow')) {
      return true;
    }
    
    // Check if player already has yellow card this match
    if (cardType.toLowerCase() === 'red') {
      const playerEvents = this.getPlayerEventsThisMatch(player, matchId);
      return playerEvents.some(event => 
        event.event_type === 'Yellow Card' || event.event_type === 'card_yellow'
      );
    }
    
    return false;
  }

  /**
   * Process team card
   * @param {string} minute - Match minute
   * @param {string} player - Player name
   * @param {string} cardType - Card type
   * @param {string} matchId - Match identifier
   * @returns {Object} Processing result
   */
  processTeamCard(minute, player, cardType, matchId = null) {
    this.logger.enterFunction('processTeamCard', { minute, player, cardType });
    
    try {
      // @testHook(team_card_start)

      // Update player statistics
      this.playerManager.updatePlayerCardStats(player, cardType);
      
      // Determine Make.com event type
      const eventType = this.getCardEventType(cardType);
      
      // Create card payload
      const payload = this.createCardPayload(minute, player, cardType, matchId, eventType);
      
      // @testHook(team_card_webhook)
      const webhookResult = this.sendToMake(payload);
      
      // Log event
      this.logPlayerEvent(matchId, player, 'Card', minute, { card_type: cardType });
      
      this.logger.exitFunction('processTeamCard', { success: true });
      return {
        success: true,
        event_type: eventType,
        player: player,
        card_type: cardType,
        minute: minute,
        webhook_sent: webhookResult.success
      };
      
    } catch (error) {
      this.logger.error('Team card processing failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Process opposition card (NEW: From spec)
   * @param {string} minute - Match minute
   * @param {string} cardType - Card type
   * @param {string} matchId - Match identifier
   * @returns {Object} Processing result
   */
  processOppositionCard(minute, cardType, matchId = null) {
    this.logger.enterFunction('processOppositionCard', { minute, cardType });
    
    try {
      // @testHook(opposition_card_start)
      
      // Create opposition card payload
      const payload = this.createCardPayload(minute, 'Opposition', cardType, matchId, 'discipline_opposition');
      
      // @testHook(opposition_card_webhook)
      const webhookResult = this.sendToMake(payload);
      
      // Log opposition event
      this.logOppositionEvent(matchId, 'Card', minute, { card_type: cardType });
      
      this.logger.exitFunction('processOppositionCard', { success: true });
      return {
        success: true,
        event_type: 'discipline_opposition',
        card_type: cardType,
        minute: minute,
        webhook_sent: webhookResult.success
      };
      
    } catch (error) {
      this.logger.error('Opposition card processing failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Process second yellow card (NEW: Enhanced from spec)
   * @param {string} minute - Match minute
   * @param {string} player - Player name
   * @param {string} matchId - Match identifier
   * @returns {Object} Processing result
   */
  processSecondYellow(minute, player, matchId = null) {
    this.logger.enterFunction('processSecondYellow', { minute, player });
    
    try {
      // @testHook(second_yellow_start)
      
      // Find first yellow card minute
      const playerEvents = this.getPlayerEventsThisMatch(player, matchId);
      const firstYellow = playerEvents.find(event => 
        event.event_type === 'Yellow Card' || event.event_type === 'card_yellow'
      );
      
      // Update player statistics (red card)
      this.playerManager.updatePlayerCardStats(player, 'Red');
      
      // Create 2nd yellow payload with special card type
      const payload = this.createCardPayload(minute, player, 'Red card (2nd yellow)', matchId, 'card_second_yellow');
      payload.first_yellow_minute = firstYellow ? firstYellow.minute : null;
      payload.is_second_yellow = true;
      
      // @testHook(second_yellow_webhook)
      const webhookResult = this.sendToMake(payload);
      
      // Log event
      this.logPlayerEvent(matchId, player, 'Red Card (2nd Yellow)', minute, {
        first_yellow_minute: firstYellow ? firstYellow.minute : null
      });
      
      this.logger.exitFunction('processSecondYellow', { success: true });
      return {
        success: true,
        event_type: 'card_second_yellow',
        player: player,
        minute: minute,
        first_yellow_minute: firstYellow ? firstYellow.minute : null,
        webhook_sent: webhookResult.success
      };
      
    } catch (error) {
      this.logger.error('Second yellow processing failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  // ==================== SUBSTITUTION PROCESSING ====================

  /**
   * Process substitution with player swapping (NEW: Enhanced from spec)
   * @param {string} minute - Match minute
   * @param {string} playerOff - Player coming off
   * @param {string} playerOn - Player coming on
   * @param {string} matchId - Match identifier
   * @returns {Object} Processing result
   */
  processSubstitution(minute, playerOff, playerOn, matchId = null) {
    this.logger.enterFunction('processSubstitution', { minute, playerOff, playerOn });
    
    try {
      // @testHook(substitution_start)
      
      // Update player minutes
      this.updatePlayerMinutesOnSub(playerOff, playerOn, minute, matchId);
      
      // Swap players in team lists
      if (isFeatureEnabled('SUB_SWAPPING_SYSTEM')) {
        this.swapPlayersInTeamLists(playerOff, playerOn);
      }
      
      // Log substitution
      this.logSubstitution(matchId, minute, playerOff, playerOn);
      
      // Update player statistics
      this.playerManager.updatePlayerSubStats(playerOff, playerOn);
      
      // Create substitution payload
      const payload = this.createSubstitutionPayload(minute, playerOff, playerOn, matchId);
      
      // @testHook(substitution_webhook)
      const webhookResult = this.sendToMake(payload);
      
      this.logger.exitFunction('processSubstitution', { success: true });
      return {
        success: true,
        event_type: 'substitution',
        player_off: playerOff,
        player_on: playerOn,
        minute: minute,
        webhook_sent: webhookResult.success
      };
      
    } catch (error) {
      this.logger.error('Substitution processing failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  // ==================== MATCH STATUS EVENTS ====================

  /**
   * Process kick-off event
   * @param {string} matchId - Match identifier
   * @returns {Object} Processing result
   */
  processKickOff(matchId = null) {
    this.logger.enterFunction('processKickOff', { matchId });
    
    try {
      // @testHook(kickoff_start)
      
      // Initialize match tracking
      this.matchStartTime = DateUtils.now();
      this.currentMatch = matchId;
      
      // Initialize player minutes for starters
      this.initializePlayerMinutes(matchId);
      
      // Create kick-off payload
      const payload = this.createMatchStatusPayload('kick_off', matchId);
      
      // @testHook(kickoff_webhook)
      const webhookResult = this.sendToMake(payload);
      
      this.logger.exitFunction('processKickOff', { success: true });
      return {
        success: true,
        event_type: 'kick_off',
        match_id: matchId,
        webhook_sent: webhookResult.success
      };
      
    } catch (error) {
      this.logger.error('Kick-off processing failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Process half-time event
   * @param {string} matchId - Match identifier
   * @returns {Object} Processing result
   */
  processHalfTime(matchId = null) {
    this.logger.enterFunction('processHalfTime', { matchId });
    
    try {
      // @testHook(halftime_start)
      
      // Update player minutes at half-time
      this.updateAllPlayerMinutes(45, matchId);
      
      // Create half-time payload
      const currentScores = this.getCurrentScores(matchId);
      const payload = this.createMatchStatusPayload('half_time', matchId, currentScores);
      
      // @testHook(halftime_webhook)
      const webhookResult = this.sendToMake(payload);
      
      this.logger.exitFunction('processHalfTime', { success: true });
      return {
        success: true,
        event_type: 'half_time',
        match_id: matchId,
        score: currentScores,
        webhook_sent: webhookResult.success
      };
      
    } catch (error) {
      this.logger.error('Half-time processing failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Process second half kick-off (NEW: From spec)
   * @param {string} matchId - Match identifier
   * @returns {Object} Processing result
   */
  processSecondHalfKickOff(matchId = null) {
    this.logger.enterFunction('processSecondHalfKickOff', { matchId });
    
    try {
      // @testHook(second_half_start)
      
      // Resume player minute tracking
      this.resumePlayerMinutes(matchId);
      
      // Create second half kick-off payload
      const payload = this.createMatchStatusPayload('second_half_kickoff', matchId);
      
      // @testHook(second_half_webhook)
      const webhookResult = this.sendToMake(payload);
      
      this.logger.exitFunction('processSecondHalfKickOff', { success: true });
      return {
        success: true,
        event_type: 'second_half_kickoff',
        match_id: matchId,
        webhook_sent: webhookResult.success
      };
      
    } catch (error) {
      this.logger.error('Second half kick-off processing failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Process full-time event
   * @param {string} matchId - Match identifier
   * @returns {Object} Processing result
   */
  processFullTime(matchId = null) {
    this.logger.enterFunction('processFullTime', { matchId });
    
    try {
      // @testHook(fulltime_start)
      
      // Finalize player minutes
      this.finalizeAllPlayerMinutes(matchId);
      
      // Get final scores
      const finalScores = this.getCurrentScores(matchId);
      
      // Update XbotGo with final score
      if (isFeatureEnabled('XBOTGO_INTEGRATION')) {
        this.updateXbotGoScoreboard(finalScores, matchId, true);
      }
      
      // Create full-time payload
      const payload = this.createMatchStatusPayload('full_time', matchId, finalScores);
      
      // @testHook(fulltime_webhook)
      const webhookResult = this.sendToMake(payload);
      
      // Reset match tracking
      this.currentMatch = null;
      this.matchStartTime = null;
      this.playerMinutes.clear();
      
      this.logger.exitFunction('processFullTime', { success: true });
      return {
        success: true,
        event_type: 'full_time',
        match_id: matchId,
        final_score: finalScores,
        webhook_sent: webhookResult.success
      };
      
    } catch (error) {
      this.logger.error('Full-time processing failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  // ==================== PLAYER MINUTES TRACKING ====================

  /**
   * Initialize player minutes tracking at kick-off
   * @param {string} matchId - Match identifier
   */
  initializePlayerMinutes(matchId) {
    this.logger.enterFunction('initializePlayerMinutes', { matchId });

    try {
      // Get starting XI from team sheet
      const starters = this.getStartingEleven(matchId);

      starters.forEach(player => {
        this.playerMinutes.set(player, {
          totalMinutes: 0,
          isOnPitch: true,
          subOnMinute: 0,
          projectedMinutes: 0
        });
      });

      this.logger.exitFunction('initializePlayerMinutes', { 
        players_initialized: starters.length 
      });
      
    } catch (error) {
      this.logger.error('Failed to initialize player minutes', { error: error.toString() });
    }
  }

  /**
   * Update player minutes on substitution
   * @param {string} playerOff - Player coming off
   * @param {string} playerOn - Player coming on
   * @param {string} minute - Substitution minute
   * @param {string} matchId - Match identifier
   */
  updatePlayerMinutesOnSub(playerOff, playerOn, minute, matchId) {
    const subMinute = parseInt(minute, 10);

    if (!Number.isFinite(subMinute)) {
      return;
    }

    const offData = this.playerMinutes.get(playerOff) || {
      totalMinutes: 0,
      isOnPitch: false,
      subOnMinute: null,
      projectedMinutes: 0
    };

    if (offData.isOnPitch && offData.subOnMinute !== null) {
      const segmentMinutes = Math.max(0, subMinute - offData.subOnMinute);
      offData.totalMinutes += segmentMinutes;
    }

    offData.isOnPitch = false;
    offData.subOnMinute = null;
    offData.projectedMinutes = offData.totalMinutes;
    this.playerMinutes.set(playerOff, offData);

    const onData = this.playerMinutes.get(playerOn) || {
      totalMinutes: 0,
      isOnPitch: false,
      subOnMinute: null,
      projectedMinutes: 0
    };

    onData.isOnPitch = true;
    onData.subOnMinute = subMinute;
    onData.projectedMinutes = onData.totalMinutes;
    this.playerMinutes.set(playerOn, onData);
  }

  /**
   * Update all player minutes at specific time
   * @param {number} currentMinute - Current match minute
   * @param {string} matchId - Match identifier
   */
  updateAllPlayerMinutes(currentMinute, matchId) {
    this.playerMinutes.forEach((data, player) => {
      if (data.isOnPitch && data.subOnMinute !== null) {
        data.projectedMinutes = data.totalMinutes + Math.max(0, currentMinute - data.subOnMinute);
      } else {
        data.projectedMinutes = data.totalMinutes;
      }
    });
  }

  /**
   * Finalize player minutes at full-time
   * @param {string} matchId - Match identifier
   */
  finalizeAllPlayerMinutes(matchId) {
    this.logger.enterFunction('finalizeAllPlayerMinutes', { matchId });

    try {
      const fullTimeMinute = this.fullTimeMinute;

      // Finalize minutes for all players
      this.playerMinutes.forEach((data, player) => {
        if (data.isOnPitch && data.subOnMinute !== null) {
          data.totalMinutes += Math.max(0, fullTimeMinute - data.subOnMinute);
          data.isOnPitch = false;
          data.subOnMinute = null;
        }

        data.projectedMinutes = data.totalMinutes;

        this.playerManager.updatePlayerMinutesInSheet(player, data.totalMinutes);
      });

      this.logger.exitFunction('finalizeAllPlayerMinutes', {
        players_updated: this.playerMinutes.size
      });
      
    } catch (error) {
      this.logger.error('Failed to finalize player minutes', { error: error.toString() });
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get current match scores
   * @param {string} matchId - Match identifier
   * @returns {Object} Current scores
   */
  getCurrentScores(matchId) {
    try {
      // Get from Results sheet or Live Match sheet
      const resultsSheet = SheetUtils.getOrCreateSheet(
        getConfigValue('SHEETS.TAB_NAMES.RESULTS')
      );
      
      if (resultsSheet) {
        const matchData = SheetUtils.findRowByCriteria(resultsSheet, { 'Match ID': matchId });
        if (matchData) {
          return {
            home: parseInt(matchData['Home Score']) || 0,
            away: parseInt(matchData['Away Score']) || 0
          };
        }
      }
      
      // Default scores
      return { home: 0, away: 0 };
      
    } catch (error) {
      this.logger.error('Failed to get current scores', { error: error.toString() });
      return { home: 0, away: 0 };
    }
  }

  /**
   * Check if we are the home team
   * @param {string} matchId - Match identifier
   * @returns {boolean} True if home team
   */
  isHomeTeam(matchId) {
    try {
      const fixturesSheet = SheetUtils.getOrCreateSheet(
        getConfigValue('SHEETS.TAB_NAMES.FIXTURES')
      );
      
      if (fixturesSheet) {
        const matchData = SheetUtils.findRowByCriteria(fixturesSheet, { 'Match ID': matchId });
        if (matchData) {
          return matchData['Home/Away'] === 'Home';
        }
      }
      
      return true; // Default to home
      
    } catch (error) {
      this.logger.error('Failed to determine home/away status', { error: error.toString() });
      return true;
    }
  }

  /**
   * Create goal payload for Make.com
   * @param {string} minute - Match minute
   * @param {string} player - Player name
   * @param {string} assist - Assist provider
   * @param {Object} scores - Current scores
   * @param {string} matchId - Match identifier
   * @param {string} eventType - Event type
   * @returns {Object} Payload object
   */
  createGoalPayload(minute, player, assist, scores, matchId, eventType) {
    const matchInfo = this.getMatchInfo(matchId);
    
    return {
      event_type: eventType,
      system_version: getConfigValue('SYSTEM.VERSION'),
      club_name: getConfigValue('SYSTEM.CLUB_NAME'),
      
      // Goal-specific data
      player_name: player,
      assist_by: assist || '',
      minute: minute,
      
      // Match data
      home_score: scores.home,
      away_score: scores.away,
      match_id: matchId,
      match_date: matchInfo.date,
      opponent: matchInfo.opponent,
      venue: matchInfo.venue,
      competition: matchInfo.competition,
      
      // Timestamps
      timestamp: DateUtils.formatISO(DateUtils.now()),
      match_timestamp: DateUtils.formatISO(this.matchStartTime)
    };
  }

  /**
   * Create card payload for Make.com
   * @param {string} minute - Match minute
   * @param {string} player - Player name
   * @param {string} cardType - Card type
   * @param {string} matchId - Match identifier
   * @param {string} eventType - Event type
   * @returns {Object} Payload object
   */
  createCardPayload(minute, player, cardType, matchId, eventType) {
    const matchInfo = this.getMatchInfo(matchId);
    const iconUrl = this.resolveCardIconUrl(cardType, eventType, player);

    return {
      event_type: eventType,
      system_version: getConfigValue('SYSTEM.VERSION'),
      club_name: getConfigValue('SYSTEM.CLUB_NAME'),
      
      // Card-specific data
      player_name: player,
      card_type: cardType,
      minute: minute,
      is_opposition: player === 'Opposition',
      
      // Match data
      match_id: matchId,
      match_date: matchInfo.date,
      opponent: matchInfo.opponent,
      venue: matchInfo.venue,
      competition: matchInfo.competition,

      // Timestamps
      timestamp: DateUtils.formatISO(DateUtils.now()),

      // Visual metadata
      icon_url: iconUrl || null
    };
  }

  /**
   * Resolve the icon URL for a given card event.
   * @param {string} cardType - Card type description
   * @param {string} eventType - Event type key
   * @param {string} player - Player identifier
   * @returns {string} Icon URL or empty string
   */
  resolveCardIconUrl(cardType, eventType, player) {
    try {
      const defaults = getConfigValue('MATCHDAY_ASSETS.CARD_ICONS.DEFAULTS', {}) || {};
      const propertyKey = getConfigValue('MATCHDAY_ASSETS.CARD_ICONS.PROPERTY_KEY', 'MATCHDAY_CARD_ICON_MAP');
      const normalizedMap = this.normalizeCardIconMap(defaults);

      if (typeof PropertiesService !== 'undefined' && PropertiesService.getScriptProperties) {
        try {
          const scriptProperties = PropertiesService.getScriptProperties();
          const stored = scriptProperties.getProperty(propertyKey);

          if (stored) {
            const parsedMap = this.parseIconConfig(stored);
            Object.assign(normalizedMap, parsedMap);
          }
        } catch (propertyError) {
          this.logger.warn('Failed to load card icon map from script properties', {
            error: propertyError.toString()
          });
        }
      }

      const candidateKeys = [];
      if (eventType) {
        candidateKeys.push(this.normalizeIconKey(eventType));
      }

      if (cardType) {
        candidateKeys.push(this.normalizeIconKey(cardType));
      }

      if (player === 'Opposition') {
        candidateKeys.push(this.normalizeIconKey('discipline_opposition'));
      }

      candidateKeys.push('default');

      for (const key of candidateKeys) {
        if (key && normalizedMap[key]) {
          return normalizedMap[key];
        }
      }

      return '';

    } catch (error) {
      this.logger.warn('Card icon resolution failed', { error: error.toString() });
      return '';
    }
  }

  /**
   * Normalize configured icon map keys.
   * @param {Object} rawMap - Raw map from config or properties
   * @returns {Object} Normalized map
   */
  normalizeCardIconMap(rawMap) {
    const normalized = {};
    if (!rawMap || typeof rawMap !== 'object') {
      return normalized;
    }

    Object.keys(rawMap).forEach(key => {
      const normalizedKey = this.normalizeIconKey(key);
      if (normalizedKey && rawMap[key]) {
        normalized[normalizedKey] = rawMap[key];
      }
    });

    return normalized;
  }

  /**
   * Parse icon configuration stored in script properties.
   * Supports JSON object or key=value newline pairs.
   * @param {string} stored - Stored configuration string
   * @returns {Object} Parsed map
   */
  parseIconConfig(stored) {
    const parsedMap = {};
    if (!stored) {
      return parsedMap;
    }

    try {
      const json = JSON.parse(stored);
      if (json && typeof json === 'object') {
        return this.normalizeCardIconMap(json);
      }
    } catch (jsonError) {
      // Not valid JSON, fall back to key=value parsing
      const lines = String(stored).split(/\r?\n/);
      lines.forEach(line => {
        const [rawKey, rawValue] = line.split('=');
        if (rawKey && rawValue) {
          const normalizedKey = this.normalizeIconKey(rawKey.trim());
          if (normalizedKey) {
            parsedMap[normalizedKey] = rawValue.trim();
          }
        }
      });
    }

    return parsedMap;
  }

  /**
   * Normalize icon map key strings.
   * @param {string} key - Raw key
   * @returns {string} Normalized key
   */
  normalizeIconKey(key) {
    if (!key) {
      return '';
    }
    return String(key).toLowerCase().replace(/[^a-z0-9]+/g, '_');
  }

  /**
   * Send payload to Make.com webhook
   * @param {Object} payload - Payload to send
   * @returns {Object} Send result
   */
  sendToMake(payload) {
    this.logger.enterFunction('sendToMake', { event_type: payload.event_type });

    try {
      const consentContext = {
        module: 'enhanced_events',
        eventType: payload.event_type,
        platform: 'make_webhook',
        players: this.resolveConsentPlayers(payload),
        matchId: payload.match_id || payload.matchId || null
      };

      // @testHook(consent_gate_check_start)
      const consentDecision = ConsentGate.evaluatePost(payload, consentContext);
      // @testHook(consent_gate_check_complete)

      if (!consentDecision.allowed) {
        this.logger.warn('Consent gate blocked Make.com payload', {
          event_type: payload.event_type,
          reason: consentDecision.reason
        });
        this.logger.exitFunction('sendToMake', {
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

      // @testHook(webhook_send_start)

      const makeResult = this.makeIntegration.sendToMake(enrichedPayload, {
        idempotencyKey: payload.idempotency_key,
        consentDecision,
        consentContext
      });

      // @testHook(webhook_send_complete)

      this.logger.exitFunction('sendToMake', {
        success: makeResult.success,
        response_code: makeResult.response_code
      });

      return {
        success: makeResult.success,
        response_code: makeResult.response_code,
        response_text: makeResult.response_text,
        consent: consentDecision
      };

    } catch (error) {
      this.logger.error('Failed to send to Make.com', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Resolve players included in payload for consent evaluation
   * @param {Object} payload - Event payload
   * @returns {Array<Object>} Player references
   */
  resolveConsentPlayers(payload) {
    const players = [];
    const seen = new Set();

    if (payload.player_name && payload.player_name !== 'Opposition') {
      const key = payload.player_name.toString().trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        players.push({ player: payload.player_name });
      }
    }

    if (payload.player && payload.player !== 'Opposition') {
      const key = payload.player.toString().trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        players.push({ player: payload.player });
      }
    }

    return players;
  }

  // ==================== LOGGING METHODS ====================

  /**
   * Log player event
   * @param {string} matchId - Match identifier
   * @param {string} player - Player name
   * @param {string} eventType - Event type
   * @param {string} minute - Match minute
   * @param {Object} details - Additional details
   */
  logPlayerEvent(matchId, player, eventType, minute, details = {}) {
    try {
      const playerEventsSheet = SheetUtils.getOrCreateSheet(
        getConfigValue('SHEETS.TAB_NAMES.PLAYER_EVENTS'),
        getConfigValue('SHEETS.REQUIRED_COLUMNS.PLAYER_EVENTS')
      );
      
      if (playerEventsSheet) {
        const eventData = {
          'Match ID': matchId,
          'Date': DateUtils.formatUK(DateUtils.now()),
          'Player': player,
          'Event Type': eventType,
          'Minute': minute,
          'Details': JSON.stringify(details),
          'Competition': this.getMatchInfo(matchId).competition,
          'Opposition': this.getMatchInfo(matchId).opponent,
          'Timestamp': DateUtils.formatISO(DateUtils.now())
        };
        
        SheetUtils.addRowFromObject(playerEventsSheet, eventData);
      }
    } catch (error) {
      this.logger.error('Failed to log player event', { error: error.toString() });
    }
  }

  /**
   * Log opposition event
   * @param {string} matchId - Match identifier
   * @param {string} eventType - Event type
   * @param {string} minute - Match minute
   * @param {Object} details - Additional details
   */
  logOppositionEvent(matchId, eventType, minute, details = {}) {
    try {
      const oppositionEventsSheet = SheetUtils.getOrCreateSheet(
        getConfigValue('SHEETS.TAB_NAMES.OPPOSITION_EVENTS'),
        getConfigValue('SHEETS.REQUIRED_COLUMNS.OPPOSITION_EVENTS')
      );
      
      if (oppositionEventsSheet) {
        const eventData = {
          'Match ID': matchId,
          'Date': DateUtils.formatUK(DateUtils.now()),
          'Event Type': eventType,
          'Minute': minute,
          'Details': JSON.stringify(details),
          'Posted': 'FALSE',
          'Timestamp': DateUtils.formatISO(DateUtils.now())
        };
        
        SheetUtils.addRowFromObject(oppositionEventsSheet, eventData);
      }
    } catch (error) {
      this.logger.error('Failed to log opposition event', { error: error.toString() });
    }
  }
}

// ==================== PUBLIC API FUNCTIONS ====================

/**
 * Process goal event (public API)
 * @param {string} minute - Match minute
 * @param {string} player - Player name
 * @param {string} assist - Assist provider
 * @param {string} matchId - Match identifier
 * @returns {Object} Processing result
 */
function processGoal(minute, player, assist = '', matchId = null) {
  const manager = new EnhancedEventsManager();
  return manager.processGoalEvent(minute, player, assist, matchId);
}

/**
 * Process card event (public API)
 * @param {string} minute - Match minute
 * @param {string} player - Player name
 * @param {string} cardType - Card type
 * @param {string} matchId - Match identifier
 * @returns {Object} Processing result
 */
function processCard(minute, player, cardType, matchId = null) {
  const manager = new EnhancedEventsManager();
  return manager.processCardEvent(minute, player, cardType, matchId);
}

/**
 * Process substitution (public API)
 * @param {string} minute - Match minute
 * @param {string} playerOff - Player coming off
 * @param {string} playerOn - Player coming on
 * @param {string} matchId - Match identifier
 * @returns {Object} Processing result
 */
function processSubstitution(minute, playerOff, playerOn, matchId = null) {
  const manager = new EnhancedEventsManager();
  return manager.processSubstitution(minute, playerOff, playerOn, matchId);
}

/**
 * Post kick-off status update
 * @param {string} matchId - Match identifier
 * @returns {Object} Processing result
 */
function postKickOff(matchId = null) {
  const manager = new EnhancedEventsManager();
  return manager.processKickOff(matchId);
}

/**
 * Post half-time status update
 * @param {string} matchId - Match identifier
 * @returns {Object} Processing result
 */
function postHalfTime(matchId = null) {
  const manager = new EnhancedEventsManager();
  return manager.processHalfTime(matchId);
}

/**
 * Process second half kick-off (public API)
 * @param {string} matchId - Match identifier
 * @returns {Object} Processing result
 */
function postSecondHalfKickoff(matchId = null) {
  const manager = new EnhancedEventsManager();
  return manager.processSecondHalfKickOff(matchId);
}

/**
 * Post full-time status update
 * @param {string} matchId - Match identifier
 * @returns {Object} Processing result
 */
function postFullTime(matchId = null) {
  const manager = new EnhancedEventsManager();
  return manager.processFullTime(matchId);
}

/**
 * Initialize enhanced events system
 * @returns {Object} Initialization result
 */
function initializeEnhancedEvents() {
  logger.enterFunction('EnhancedEvents.initialize');
  
  try {
    // Validate required sheets exist
    const requiredSheets = [
      'PLAYER_EVENTS',
      'OPPOSITION_EVENTS',
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
    
    logger.exitFunction('EnhancedEvents.initialize', { success: true });
    
    return {
      success: true,
      sheets_created: results,
      features_enabled: {
        opposition_handling: isFeatureEnabled('OPPOSITION_EVENT_HANDLING'),
        second_yellow: isFeatureEnabled('SECOND_YELLOW_PROCESSING'),
        player_minutes: isFeatureEnabled('PLAYER_MINUTES_TRACKING'),
        video_clips: isFeatureEnabled('VIDEO_CLIP_CREATION')
      }
    };

  } catch (error) {
    logger.error('Enhanced events initialization failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }

/**
 * Process score update from sheet edits
 * @param {number} homeScore - Home team score
 * @param {number} awayScore - Away team score
 * @param {string} matchId - Match identifier
 * @returns {Object} Processing result
 */
function processScoreUpdate(homeScore, awayScore, matchId) {
  logger.enterFunction('processScoreUpdate', {
      homeScore,
      awayScore,
      matchId
    });

    try {
      const currentScores = {
        home: parseInt(homeScore) || 0,
        away: parseInt(awayScore) || 0
      };

      // Update XbotGo scoreboard if enabled
      if (isFeatureEnabled('XBOTGO_INTEGRATION')) {
        this.updateXbotGoScoreboard(currentScores, matchId);
      }

      // Log the score update
      this.logger.info('Score updated', {
        homeScore: currentScores.home,
        awayScore: currentScores.away,
        matchId
      });

      const result = {
        success: true,
        event_type: 'score_update',
        home_score: currentScores.home,
        away_score: currentScores.away,
        match_id: matchId,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };

      this.logger.exitFunction('processScoreUpdate', result);
      return result;

    } catch (error) {
      this.logger.error('Score update processing failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }
}
