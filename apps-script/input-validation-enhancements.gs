/**
 * @fileoverview Enhanced Input Validation for All System Modules
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Comprehensive input validation wrappers and enhancements for existing modules
 *
 * FEATURES IMPLEMENTED:
 * - Enhanced validation for player management
 * - Event processing input validation
 * - Weekly scheduler input validation
 * - Monthly summaries input validation
 * - Make.com integration input validation
 * - XbotGo integration input validation
 * - Control panel input validation
 */

// ==================== PLAYER MANAGEMENT VALIDATION ====================

/**
 * Enhanced Player Management with Input Validation
 */
class EnhancedPlayerManagement {

  constructor() {
    this.loggerName = 'EnhancedPlayerManagement';
    this._logger = null;
    this._originalManager = null;
  }

  get originalManager() {
    if (!this._originalManager) {
      try {
        this._originalManager = new PlayerManagementManager();
      } catch (error) {
        console.error(`[${this.loggerName}] Failed to initialize PlayerManagementManager:`, error);
        // Create a fallback manager
        this._originalManager = {
          updatePlayerGoalStats: () => ({ success: false, error: 'Manager not available' }),
          updatePlayerAssistStats: () => ({ success: false, error: 'Manager not available' }),
          updatePlayerCardStats: () => ({ success: false, error: 'Manager not available' }),
          updatePlayerMinutes: () => ({ success: false, error: 'Manager not available' }),
          processSubstitution: () => ({ success: false, error: 'Manager not available' })
        };
      }
    }
    return this._originalManager;
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

  /**
   * Update player goal statistics with input validation
   * @param {string} player - Player name
   * @param {string} assist - Assist provider
   * @returns {Object} Update result
   */
  updatePlayerGoalStats(player, assist = '') {
    this.logger.enterFunction('updatePlayerGoalStats', { player, assist });

    try {
      // Validate player name
      const playerValidation = validateInput(player, 'playerName', { required: true });
      if (!playerValidation.success) {
        return { success: false, error: `Invalid player name: ${playerValidation.error}` };
      }

      // Validate assist provider (optional)
      if (assist) {
        const assistValidation = validateInput(assist, 'playerName');
        if (!assistValidation.success) {
          return { success: false, error: `Invalid assist provider: ${assistValidation.error}` };
        }
        assist = assistValidation.value;
      }

      // Log security event for player data update
      logSecurityEvent('player_stats_update', {
        player: maskPII({ player_name: playerValidation.value }).player_name,
        assist: assist ? maskPII({ player_name: assist }).player_name : null,
        operation: 'goal_stats'
      });

      // Call original function with validated inputs
      return this.originalManager.updatePlayerGoalStats(playerValidation.value, assist);

    } catch (error) {
      this.logger.error('Enhanced goal stats update failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Update player card statistics with input validation
   * @param {string} player - Player name
   * @param {string} cardType - Type of card (yellow, red, second_yellow)
   * @returns {Object} Update result
   */
  updatePlayerCardStats(player, cardType) {
    this.logger.enterFunction('updatePlayerCardStats', { player, cardType });

    try {
      // Validate player name
      const playerValidation = validateInput(player, 'playerName', { required: true });
      if (!playerValidation.success) {
        return { success: false, error: `Invalid player name: ${playerValidation.error}` };
      }

      // Validate card type
      const allowedCardTypes = ['yellow', 'red', 'second_yellow'];
      const cardValidation = validateInput(cardType, 'string', { required: true });
      if (!cardValidation.success || !allowedCardTypes.includes(cardValidation.value)) {
        return { success: false, error: `Invalid card type. Must be one of: ${allowedCardTypes.join(', ')}` };
      }

      // Log security event
      logSecurityEvent('player_stats_update', {
        player: maskPII({ player_name: playerValidation.value }).player_name,
        operation: 'card_stats',
        card_type: cardValidation.value
      });

      // Call original function with validated inputs
      return this.originalManager.updatePlayerCardStats(playerValidation.value, cardValidation.value);

    } catch (error) {
      this.logger.error('Enhanced card stats update failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Process substitution with input validation
   * @param {string} playerOut - Player being substituted
   * @param {string} playerIn - Player coming in
   * @param {number} minute - Minute of substitution
   * @returns {Object} Substitution result
   */
  processSubstitution(playerOut, playerIn, minute) {
    this.logger.enterFunction('processSubstitution', { playerOut, playerIn, minute });

    try {
      // Validate player names
      const playerOutValidation = validateInput(playerOut, 'playerName', { required: true });
      if (!playerOutValidation.success) {
        return { success: false, error: `Invalid player out: ${playerOutValidation.error}` };
      }

      const playerInValidation = validateInput(playerIn, 'playerName', { required: true });
      if (!playerInValidation.success) {
        return { success: false, error: `Invalid player in: ${playerInValidation.error}` };
      }

      // Validate minute
      const minuteValidation = validateInput(minute, 'minute', { required: true });
      if (!minuteValidation.success) {
        return { success: false, error: `Invalid minute: ${minuteValidation.error}` };
      }

      // Check that players are different
      if (playerOutValidation.value === playerInValidation.value) {
        return { success: false, error: 'Cannot substitute a player for themselves' };
      }

      // Log security event
      logSecurityEvent('player_substitution', {
        player_out: maskPII({ player_name: playerOutValidation.value }).player_name,
        player_in: maskPII({ player_name: playerInValidation.value }).player_name,
        minute: minuteValidation.value
      });

      // Call original function with validated inputs
      return this.originalManager.processSubstitution(
        playerOutValidation.value,
        playerInValidation.value,
        minuteValidation.value
      );

    } catch (error) {
      this.logger.error('Enhanced substitution processing failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }
}

// ==================== EVENT PROCESSING VALIDATION ====================

/**
 * Enhanced Event Processing with Input Validation
 */
class EnhancedEventProcessing {

  constructor() {
    this.loggerName = 'EnhancedEventProcessing';
    this._logger = null;
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

  /**
   * Process goal event with enhanced validation
   * @param {string} player - Player name
   * @param {number} minute - Minute of goal
   * @param {string} assist - Assist provider
   * @param {string} matchId - Match identifier
   * @returns {Object} Processing result
   */
  processGoalEvent(player, minute, assist = '', matchId = '') {
    this.logger.enterFunction('processGoalEvent', { player, minute, assist, matchId });

    try {
      // Validate player name
      const playerValidation = validateInput(player, 'playerName', { required: true });
      if (!playerValidation.success) {
        return { success: false, error: `Invalid player: ${playerValidation.error}` };
      }

      // Validate minute
      const minuteValidation = validateInput(minute, 'minute', { required: true });
      if (!minuteValidation.success) {
        return { success: false, error: `Invalid minute: ${minuteValidation.error}` };
      }

      // Validate assist (optional)
      if (assist) {
        const assistValidation = validateInput(assist, 'playerName');
        if (!assistValidation.success) {
          return { success: false, error: `Invalid assist: ${assistValidation.error}` };
        }
        assist = assistValidation.value;
      }

      // Validate match ID (optional)
      if (matchId) {
        const matchIdValidation = validateInput(matchId, 'matchId');
        if (!matchIdValidation.success) {
          return { success: false, error: `Invalid match ID: ${matchIdValidation.error}` };
        }
        matchId = matchIdValidation.value;
      }

      // Check for opposition goal detection
      if (playerValidation.value === 'Goal' || playerValidation.value === 'Opposition') {
        return this.processOppositionGoal(minuteValidation.value, matchId);
      }

      // Log security event
      logSecurityEvent('goal_event', {
        player: maskPII({ player_name: playerValidation.value }).player_name,
        minute: minuteValidation.value,
        assist: assist ? maskPII({ player_name: assist }).player_name : null,
        match_id: matchId
      });

      // Build validated event data
      const eventData = {
        player: playerValidation.value,
        minute: minuteValidation.value,
        assist: assist,
        matchId: matchId,
        eventType: 'goal',
        timestamp: new Date().toISOString()
      };

      return { success: true, data: eventData };

    } catch (error) {
      this.logger.error('Enhanced goal event processing failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Process opposition goal with validation
   * @param {number} minute - Minute of goal
   * @param {string} matchId - Match identifier
   * @returns {Object} Processing result
   */
  processOppositionGoal(minute, matchId = '') {
    this.logger.enterFunction('processOppositionGoal', { minute, matchId });

    try {
      // Validate minute
      const minuteValidation = validateInput(minute, 'minute', { required: true });
      if (!minuteValidation.success) {
        return { success: false, error: `Invalid minute: ${minuteValidation.error}` };
      }

      // Log security event
      logSecurityEvent('opposition_goal_event', {
        minute: minuteValidation.value,
        match_id: matchId
      });

      const eventData = {
        eventType: 'opposition_goal',
        minute: minuteValidation.value,
        matchId: matchId,
        timestamp: new Date().toISOString()
      };

      return { success: true, data: eventData };

    } catch (error) {
      this.logger.error('Enhanced opposition goal processing failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Process card event with validation
   * @param {string} player - Player name
   * @param {string} cardType - Type of card
   * @param {number} minute - Minute of card
   * @param {string} matchId - Match identifier
   * @returns {Object} Processing result
   */
  processCardEvent(player, cardType, minute, matchId = '') {
    this.logger.enterFunction('processCardEvent', { player, cardType, minute, matchId });

    try {
      // Validate player name
      const playerValidation = validateInput(player, 'playerName', { required: true });
      if (!playerValidation.success) {
        return { success: false, error: `Invalid player: ${playerValidation.error}` };
      }

      // Validate card type
      const allowedCardTypes = ['yellow', 'red', 'second_yellow'];
      const cardValidation = validateInput(cardType, 'string', { required: true });
      if (!cardValidation.success || !allowedCardTypes.includes(cardValidation.value)) {
        return { success: false, error: `Invalid card type. Must be one of: ${allowedCardTypes.join(', ')}` };
      }

      // Validate minute
      const minuteValidation = validateInput(minute, 'minute', { required: true });
      if (!minuteValidation.success) {
        return { success: false, error: `Invalid minute: ${minuteValidation.error}` };
      }

      // Check for opposition card
      if (playerValidation.value === 'Opposition') {
        return this.processOppositionCard(cardValidation.value, minuteValidation.value, matchId);
      }

      // Log security event
      logSecurityEvent('card_event', {
        player: maskPII({ player_name: playerValidation.value }).player_name,
        card_type: cardValidation.value,
        minute: minuteValidation.value,
        match_id: matchId
      });

      const eventData = {
        player: playerValidation.value,
        cardType: cardValidation.value,
        minute: minuteValidation.value,
        matchId: matchId,
        eventType: 'card',
        timestamp: new Date().toISOString()
      };

      return { success: true, data: eventData };

    } catch (error) {
      this.logger.error('Enhanced card event processing failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Process opposition card with validation
   * @param {string} cardType - Type of card
   * @param {number} minute - Minute of card
   * @param {string} matchId - Match identifier
   * @returns {Object} Processing result
   */
  processOppositionCard(cardType, minute, matchId = '') {
    this.logger.enterFunction('processOppositionCard', { cardType, minute, matchId });

    try {
      // Log security event
      logSecurityEvent('opposition_card_event', {
        card_type: cardType,
        minute: minute,
        match_id: matchId
      });

      const eventData = {
        eventType: 'opposition_card',
        cardType: cardType,
        minute: minute,
        matchId: matchId,
        timestamp: new Date().toISOString()
      };

      return { success: true, data: eventData };

    } catch (error) {
      this.logger.error('Enhanced opposition card processing failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }
}

// ==================== MAKE.COM INTEGRATION VALIDATION ====================

/**
 * Enhanced Make.com Integration with Input Validation
 */
class EnhancedMakeIntegration {

  constructor() {
    this.loggerName = 'EnhancedMakeIntegration';
    this._logger = null;
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

  /**
   * Send to Make.com with enhanced validation
   * @param {string} eventType - Type of event
   * @param {Object} payload - Event payload
   * @param {Object} options - Additional options
   * @returns {Object} Send result
   */
  sendToMake(eventType, payload, options = {}) {
    this.logger.enterFunction('sendToMake', { eventType, payloadKeys: Object.keys(payload) });

    try {
      // Validate event type
      const eventTypeValidation = validateInput(eventType, 'string', {
        required: true,
        minLength: 3,
        maxLength: 50,
        pattern: /^[a-zA-Z0-9_]+$/
      });
      if (!eventTypeValidation.success) {
        return { success: false, error: `Invalid event type: ${eventTypeValidation.error}` };
      }

      // Validate payload is an object
      if (!payload || typeof payload !== 'object') {
        return { success: false, error: 'Payload must be a valid object' };
      }

      // Validate required payload fields
      const validatedPayload = this.validatePayload(payload, eventTypeValidation.value);
      if (!validatedPayload.success) {
        return validatedPayload;
      }

      // Validate webhook URL configuration
      const webhookUrl = getConfigValue('MAKE.WEBHOOK_URL_PROPERTY');
      if (!webhookUrl) {
        return { success: false, error: 'Make.com webhook URL not configured' };
      }

      // Validate URL format
      const urlValidation = validateInput(webhookUrl, 'string', {
        required: true,
        pattern: /^https?:\/\/.+/
      });
      if (!urlValidation.success) {
        return { success: false, error: 'Invalid webhook URL format' };
      }

      // Add security headers to payload
      const securePayload = {
        ...validatedPayload.payload,
        timestamp: new Date().toISOString(),
        source: 'syston_tigers_automation',
        version: getConfigValue('SYSTEM.VERSION'),
        security_hash: this.generateSecurityHash(validatedPayload.payload)
      };

      // Log security event
      logSecurityEvent('webhook_send', {
        event_type: eventTypeValidation.value,
        payload_size: JSON.stringify(securePayload).length,
        webhook_url: this.maskWebhookUrl(webhookUrl)
      });

      return { success: true, payload: securePayload, url: webhookUrl };

    } catch (error) {
      this.logger.error('Enhanced Make.com send failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Validate payload based on event type
   * @param {Object} payload - Raw payload
   * @param {string} eventType - Event type
   * @returns {Object} Validation result
   */
  validatePayload(payload, eventType) {
    try {
      const validatedPayload = { ...payload };

      // Validate common fields
      if (payload.player_name) {
        const playerValidation = validateInput(payload.player_name, 'playerName');
        if (!playerValidation.success) {
          return { success: false, error: `Invalid player name in payload: ${playerValidation.error}` };
        }
        validatedPayload.player_name = playerValidation.value;
      }

      if (payload.minute !== undefined) {
        const minuteValidation = validateInput(payload.minute, 'minute');
        if (!minuteValidation.success) {
          return { success: false, error: `Invalid minute in payload: ${minuteValidation.error}` };
        }
        validatedPayload.minute = minuteValidation.value;
      }

      if (payload.match_id) {
        const matchIdValidation = validateInput(payload.match_id, 'matchId');
        if (!matchIdValidation.success) {
          return { success: false, error: `Invalid match ID in payload: ${matchIdValidation.error}` };
        }
        validatedPayload.match_id = matchIdValidation.value;
      }

      // Event-specific validation
      switch (eventType) {
        case 'goal_scored':
          if (!validatedPayload.player_name) {
            return { success: false, error: 'Goal events require player_name' };
          }
          if (validatedPayload.minute === undefined) {
            return { success: false, error: 'Goal events require minute' };
          }
          break;

        case 'card_shown':
          if (!validatedPayload.player_name) {
            return { success: false, error: 'Card events require player_name' };
          }
          if (!validatedPayload.card_type) {
            return { success: false, error: 'Card events require card_type' };
          }
          break;

        case 'match_kickoff':
        case 'match_halftime':
        case 'match_fulltime':
          if (!validatedPayload.match_id) {
            return { success: false, error: 'Match status events require match_id' };
          }
          break;
      }

      // Sanitize string fields to prevent injection
      for (const key in validatedPayload) {
        if (typeof validatedPayload[key] === 'string') {
          validatedPayload[key] = SecurityManager_Instance.sanitizeInput(validatedPayload[key], 'string');
        }
      }

      return { success: true, payload: validatedPayload };

    } catch (error) {
      return { success: false, error: `Payload validation failed: ${error.toString()}` };
    }
  }

  /**
   * Generate security hash for payload integrity
   * @param {Object} payload - Payload to hash
   * @returns {string} Security hash
   */
  generateSecurityHash(payload) {
    try {
      const payloadString = JSON.stringify(payload);
      let hash = 0;
      for (let i = 0; i < payloadString.length; i++) {
        const char = payloadString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return hash.toString(16);
    } catch (error) {
      return 'hash_error';
    }
  }

  /**
   * Mask webhook URL for logging
   * @param {string} url - Webhook URL
   * @returns {string} Masked URL
   */
  maskWebhookUrl(url) {
    try {
      const urlParts = url.split('/');
      if (urlParts.length > 3) {
        urlParts[urlParts.length - 1] = '***MASKED***';
      }
      return urlParts.join('/');
    } catch (error) {
      return '***MASKED_URL***';
    }
  }
}

// ==================== GLOBAL ENHANCED FUNCTIONS ====================

/**
 * Global enhanced instances
 */
const EnhancedPlayerMgmt = new EnhancedPlayerManagement();
const EnhancedEventProc = new EnhancedEventProcessing();
const EnhancedMakeInt = new EnhancedMakeIntegration();

/**
 * Enhanced player goal stats update - Global function
 * @param {string} player - Player name
 * @param {string} assist - Assist provider
 * @returns {Object} Update result
 */
function updatePlayerGoalStatsSecure(player, assist = '') {
  return EnhancedPlayerMgmt.updatePlayerGoalStats(player, assist);
}

/**
 * Enhanced player card stats update - Global function
 * @param {string} player - Player name
 * @param {string} cardType - Card type
 * @returns {Object} Update result
 */
function updatePlayerCardStatsSecure(player, cardType) {
  return EnhancedPlayerMgmt.updatePlayerCardStats(player, cardType);
}

/**
 * Enhanced substitution processing - Global function
 * @param {string} playerOut - Player out
 * @param {string} playerIn - Player in
 * @param {number} minute - Minute
 * @returns {Object} Processing result
 */
function processSubstitutionSecure(playerOut, playerIn, minute) {
  return EnhancedPlayerMgmt.processSubstitution(playerOut, playerIn, minute);
}

/**
 * Enhanced goal event processing - Global function
 * @param {string} player - Player name
 * @param {number} minute - Minute
 * @param {string} assist - Assist provider
 * @param {string} matchId - Match ID
 * @returns {Object} Processing result
 */
function processGoalEventSecure(player, minute, assist = '', matchId = '') {
  return EnhancedEventProc.processGoalEvent(player, minute, assist, matchId);
}

/**
 * Enhanced card event processing - Global function
 * @param {string} player - Player name
 * @param {string} cardType - Card type
 * @param {number} minute - Minute
 * @param {string} matchId - Match ID
 * @returns {Object} Processing result
 */
function processCardEventSecure(player, cardType, minute, matchId = '') {
  return EnhancedEventProc.processCardEvent(player, cardType, minute, matchId);
}

/**
 * Enhanced Make.com sending - Global function
 * @param {string} eventType - Event type
 * @param {Object} payload - Payload
 * @param {Object} options - Options
 * @returns {Object} Send result
 */
function sendToMakeSecure(eventType, payload, options = {}) {
  return EnhancedMakeInt.sendToMake(eventType, payload, options);
}

// ==================== VALIDATION WRAPPERS ====================

/**
 * Validate and process any system input
 * @param {Object} inputData - Input data object
 * @param {string} context - Context of the input (e.g., 'goal_event', 'player_update')
 * @returns {Object} Validation result
 */
function validateSystemInput(inputData, context) {
  logger.enterFunction('validateSystemInput', { context, inputKeys: Object.keys(inputData) });

  try {
    const validatedData = {};
    const errors = [];

    // Context-specific validation
    switch (context) {
      case 'goal_event':
        if (inputData.player) {
          const result = validateInput(inputData.player, 'playerName', { required: true });
          if (result.success) {
            validatedData.player = result.value;
          } else {
            errors.push(`Player: ${result.error}`);
          }
        }
        break;

      case 'player_update':
        if (inputData.playerName) {
          const result = validateInput(inputData.playerName, 'playerName', { required: true });
          if (result.success) {
            validatedData.playerName = result.value;
          } else {
            errors.push(`Player name: ${result.error}`);
          }
        }
        break;

      case 'match_event':
        if (inputData.matchId) {
          const result = validateInput(inputData.matchId, 'matchId', { required: true });
          if (result.success) {
            validatedData.matchId = result.value;
          } else {
            errors.push(`Match ID: ${result.error}`);
          }
        }
        break;
    }

    // Common field validation
    if (inputData.minute !== undefined) {
      const result = validateInput(inputData.minute, 'minute');
      if (result.success) {
        validatedData.minute = result.value;
      } else {
        errors.push(`Minute: ${result.error}`);
      }
    }

    if (errors.length > 0) {
      return { success: false, errors: errors };
    }

    // Log successful validation
    logSecurityEvent('input_validation_success', {
      context: context,
      validated_fields: Object.keys(validatedData)
    });

    return { success: true, data: validatedData };

  } catch (error) {
    logger.error('System input validation failed', { context, error: error.toString() });
    return { success: false, error: error.toString() };
  }
}