/**
 * @fileoverview Enterprise Input Validation System
 * @version 6.2.0
 * @description Comprehensive input sanitization and validation for enterprise security
 */

/**
 * Enterprise-grade input validation with XSS/injection protection
 */
class EnterpriseValidator {

  /**
   * Validate and sanitize goal event data
   * @param {Object} eventData - Raw event data from user input
   * @returns {Object} Validated and sanitized event data
   */
  static validateGoalEvent(eventData) {
    const errors = [];
    const sanitized = {};

    try {
      // Validate match ID
      if (!eventData.matchId) {
        errors.push('Match ID is required');
      } else {
        sanitized.matchId = this.sanitizeMatchId(eventData.matchId);
      }

      // Validate and sanitize player name
      if (!eventData.player || typeof eventData.player !== 'string') {
        errors.push('Player name is required and must be a string');
      } else {
        sanitized.player = this.sanitizePlayerName(eventData.player);

        if (!sanitized.player) {
          errors.push('Player name cannot be empty after sanitization');
        }
      }

      // Validate minute
      if (eventData.minute === undefined || eventData.minute === null) {
        errors.push('Minute is required');
      } else {
        sanitized.minute = this.validateMinute(eventData.minute);
      }

      // Validate optional assist
      if (eventData.assist) {
        sanitized.assist = this.sanitizePlayerName(eventData.assist);
      }

      // Validate optional scores
      if (eventData.homeScore !== undefined) {
        sanitized.homeScore = this.validateScore(eventData.homeScore);
      }

      if (eventData.awayScore !== undefined) {
        sanitized.awayScore = this.validateScore(eventData.awayScore);
      }

      // Validate opponent name if provided
      if (eventData.opponent) {
        sanitized.opponent = this.sanitizeTeamName(eventData.opponent);
      }

      if (errors.length > 0) {
        throw new ValidationError(`Goal event validation failed: ${errors.join(', ')}`);
      }

      // Add validation metadata
      sanitized._validated = {
        timestamp: new Date().toISOString(),
        validator_version: '6.2.0',
        validation_id: Utilities.getUuid().substring(0, 8)
      };

      return sanitized;

    } catch (error) {
      console.error('Goal event validation failed:', error);
      throw error;
    }
  }

  /**
   * Validate card event data
   * @param {Object} eventData - Raw card event data
   * @returns {Object} Validated card event data
   */
  static validateCardEvent(eventData) {
    const errors = [];
    const sanitized = {};

    try {
      // Match ID validation
      if (!eventData.matchId) {
        errors.push('Match ID is required');
      } else {
        sanitized.matchId = this.sanitizeMatchId(eventData.matchId);
      }

      // Player validation
      if (!eventData.player) {
        errors.push('Player name is required for card events');
      } else {
        sanitized.player = this.sanitizePlayerName(eventData.player);
      }

      // Card type validation
      const validCardTypes = ['yellow', 'red', 'second_yellow'];
      if (!eventData.cardType || !validCardTypes.includes(eventData.cardType)) {
        errors.push(`Card type must be one of: ${validCardTypes.join(', ')}`);
      } else {
        sanitized.cardType = eventData.cardType;
      }

      // Minute validation
      if (eventData.minute === undefined) {
        errors.push('Minute is required');
      } else {
        sanitized.minute = this.validateMinute(eventData.minute);
      }

      // Optional reason
      if (eventData.reason) {
        sanitized.reason = this.sanitizeText(eventData.reason, 200);
      }

      if (errors.length > 0) {
        throw new ValidationError(`Card event validation failed: ${errors.join(', ')}`);
      }

      sanitized._validated = {
        timestamp: new Date().toISOString(),
        validator_version: '6.2.0',
        validation_id: Utilities.getUuid().substring(0, 8)
      };

      return sanitized;

    } catch (error) {
      console.error('Card event validation failed:', error);
      throw error;
    }
  }

  /**
   * Sanitize player name with comprehensive security checks
   * @param {string} name - Raw player name
   * @returns {string} Sanitized player name
   */
  static sanitizePlayerName(name) {
    if (!name || typeof name !== 'string') return '';

    // Security: Remove potentially dangerous characters
    let sanitized = name
      .replace(/[<>&"']/g, '')           // XSS prevention
      .replace(/[{}[\]]/g, '')          // Template injection prevention
      .replace(/\$\{[^}]*\}/g, '')      // Template literal prevention
      .replace(/javascript:/gi, '')      // JavaScript URL prevention
      .replace(/data:/gi, '')           // Data URL prevention
      .replace(/vbscript:/gi, '')       // VBScript prevention
      .replace(/on\w+\s*=/gi, '')       // Event handler prevention

    // Normalize whitespace
    sanitized = sanitized
      .replace(/\s+/g, ' ')             // Multiple spaces to single space
      .trim();                          // Remove leading/trailing spaces

    // Length validation
    if (sanitized.length > 100) {
      sanitized = sanitized.substring(0, 100);
    }

    // Content validation - must contain at least one letter
    if (!/[a-zA-Z]/.test(sanitized)) {
      throw new ValidationError('Player name must contain at least one letter');
    }

    // Profanity/inappropriate content check (basic)
    const inappropriatePatterns = [
      /\b(admin|administrator|system|root|test)\b/gi,
      /\b(script|eval|function|alert|prompt|confirm)\b/gi
    ];

    inappropriatePatterns.forEach(pattern => {
      if (pattern.test(sanitized)) {
        throw new ValidationError('Player name contains inappropriate content');
      }
    });

    return sanitized;
  }

  /**
   * Sanitize team name (similar to player name but with team-specific rules)
   * @param {string} name - Raw team name
   * @returns {string} Sanitized team name
   */
  static sanitizeTeamName(name) {
    if (!name || typeof name !== 'string') return '';

    let sanitized = name
      .replace(/[<>&"']/g, '')
      .replace(/[{}[\]]/g, '')
      .replace(/\$\{[^}]*\}/g, '')
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Team names can be longer
    if (sanitized.length > 150) {
      sanitized = sanitized.substring(0, 150);
    }

    return sanitized;
  }

  /**
   * Validate match minute
   * @param {any} minute - Raw minute input
   * @returns {number} Validated minute
   */
  static validateMinute(minute) {
    let validatedMinute;

    // Handle string inputs
    if (typeof minute === 'string') {
      validatedMinute = parseInt(minute.replace(/[^0-9]/g, ''), 10);
    } else {
      validatedMinute = parseInt(minute, 10);
    }

    if (isNaN(validatedMinute)) {
      throw new ValidationError('Minute must be a valid number');
    }

    // Extended time validation (includes extra time)
    if (validatedMinute < 0 || validatedMinute > 120) {
      throw new ValidationError('Minute must be between 0 and 120');
    }

    return validatedMinute;
  }

  /**
   * Validate score
   * @param {any} score - Raw score input
   * @returns {number} Validated score
   */
  static validateScore(score) {
    let validatedScore;

    if (typeof score === 'string') {
      validatedScore = parseInt(score.replace(/[^0-9]/g, ''), 10);
    } else {
      validatedScore = parseInt(score, 10);
    }

    if (isNaN(validatedScore)) {
      throw new ValidationError('Score must be a valid number');
    }

    // Reasonable score limits
    if (validatedScore < 0 || validatedScore > 50) {
      throw new ValidationError('Score must be between 0 and 50');
    }

    return validatedScore;
  }

  /**
   * Sanitize match ID
   * @param {string} matchId - Raw match ID
   * @returns {string} Sanitized match ID
   */
  static sanitizeMatchId(matchId) {
    if (!matchId || typeof matchId !== 'string') {
      throw new ValidationError('Match ID is required and must be a string');
    }

    // Allow only alphanumeric, hyphens, and underscores
    const sanitized = matchId
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .substring(0, 50);

    if (!sanitized) {
      throw new ValidationError('Match ID contains no valid characters');
    }

    return sanitized;
  }

  /**
   * Generic text sanitization
   * @param {string} text - Raw text input
   * @param {number} maxLength - Maximum allowed length
   * @returns {string} Sanitized text
   */
  static sanitizeText(text, maxLength = 500) {
    if (!text || typeof text !== 'string') return '';

    let sanitized = text
      .replace(/[<>&"']/g, '')
      .replace(/[{}[\]]/g, '')
      .replace(/\$\{[^}]*\}/g, '')
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  /**
   * Validate webhook data payload
   * @param {Object} payload - Raw payload data
   * @returns {Object} Validated payload
   */
  static validateWebhookPayload(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new ValidationError('Payload must be an object');
    }

    const sanitized = {};

    // Sanitize all string values recursively
    Object.keys(payload).forEach(key => {
      const sanitizedKey = key.replace(/[<>&"']/g, '').substring(0, 100);

      if (typeof payload[key] === 'string') {
        sanitized[sanitizedKey] = this.sanitizeText(payload[key]);
      } else if (typeof payload[key] === 'number') {
        sanitized[sanitizedKey] = payload[key];
      } else if (typeof payload[key] === 'boolean') {
        sanitized[sanitizedKey] = payload[key];
      } else if (payload[key] === null || payload[key] === undefined) {
        sanitized[sanitizedKey] = payload[key];
      } else if (typeof payload[key] === 'object' && payload[key] !== null) {
        // Recursive sanitization for nested objects (limited depth)
        sanitized[sanitizedKey] = this.sanitizeObject(payload[key], 1);
      }
    });

    return sanitized;
  }

  /**
   * Sanitize nested objects (with depth limit to prevent deep recursion)
   * @param {Object} obj - Object to sanitize
   * @param {number} depth - Current depth (max 3)
   * @returns {Object} Sanitized object
   */
  static sanitizeObject(obj, depth = 0) {
    if (depth > 3 || !obj || typeof obj !== 'object') {
      return {};
    }

    const sanitized = {};

    Object.keys(obj).forEach(key => {
      const sanitizedKey = key.replace(/[<>&"']/g, '').substring(0, 50);

      if (typeof obj[key] === 'string') {
        sanitized[sanitizedKey] = this.sanitizeText(obj[key]);
      } else if (typeof obj[key] === 'number' || typeof obj[key] === 'boolean') {
        sanitized[sanitizedKey] = obj[key];
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitized[sanitizedKey] = this.sanitizeObject(obj[key], depth + 1);
      }
    });

    return sanitized;
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid email format
   */
  static validateEmail(email) {
    if (!email || typeof email !== 'string') return false;

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailPattern.test(email) && email.length <= 254;
  }

  /**
   * Validate URL format and security
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid and secure URL
   */
  static validateUrl(url) {
    if (!url || typeof url !== 'string') return false;

    try {
      const urlObj = new URL(url);

      // Must be HTTPS for security
      if (urlObj.protocol !== 'https:') return false;

      // Block suspicious domains/IPs
      const hostname = urlObj.hostname.toLowerCase();

      // Block localhost and private IPs
      if (hostname === 'localhost' ||
          hostname.startsWith('127.') ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.') ||
          hostname.startsWith('172.')) {
        return false;
      }

      return true;

    } catch (error) {
      return false;
    }
  }

  /**
   * Create validation summary for audit logs
   * @param {Object} originalData - Original input data
   * @param {Object} sanitizedData - Sanitized output data
   * @returns {Object} Validation summary
   */
  static createValidationSummary(originalData, sanitizedData) {
    return {
      validation_timestamp: new Date().toISOString(),
      original_keys: Object.keys(originalData || {}),
      sanitized_keys: Object.keys(sanitizedData || {}),
      changes_made: this.detectChanges(originalData, sanitizedData),
      security_level: 'enterprise',
      validator_version: '6.2.0'
    };
  }

  /**
   * Detect changes made during sanitization
   * @param {Object} original - Original data
   * @param {Object} sanitized - Sanitized data
   * @returns {Array} List of changes made
   */
  static detectChanges(original, sanitized) {
    const changes = [];

    if (!original || !sanitized) return changes;

    Object.keys(original).forEach(key => {
      if (original[key] !== sanitized[key]) {
        changes.push({
          field: key,
          action: 'sanitized',
          original_length: typeof original[key] === 'string' ? original[key].length : 'n/a',
          sanitized_length: typeof sanitized[key] === 'string' ? sanitized[key].length : 'n/a'
        });
      }
    });

    return changes;
  }
}

// Export for global use
globalThis.EnterpriseValidator = EnterpriseValidator;