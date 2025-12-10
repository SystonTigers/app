/**
 * @fileoverview Basic Input Validation for Football Automation System
 * @version 6.2.0
 * @description Practical input sanitization and validation
 */

/**
 * Input Validator - Basic security for user inputs
 */
class InputValidator {

  /**
   * Sanitize player name input
   */
  static sanitizePlayerName(input) {
    if (!input || typeof input !== 'string') return '';

    // Remove HTML/script tags and limit length
    return input
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>&"'/]/g, '') // Remove dangerous characters
      .trim()
      .substring(0, 50); // Limit length
  }

  /**
   * Validate and sanitize minute input
   */
  static validateMinute(input) {
    const minute = parseInt(input);
    if (isNaN(minute) || minute < 0 || minute > 120) {
      throw new Error('Invalid minute: must be between 0 and 120');
    }
    return minute;
  }

  /**
   * Validate score input
   */
  static validateScore(input) {
    const score = parseInt(input);
    if (isNaN(score) || score < 0 || score > 99) {
      throw new Error('Invalid score: must be between 0 and 99');
    }
    return score;
  }

  /**
   * Sanitize text input for sheets
   */
  static sanitizeText(input) {
    if (!input || typeof input !== 'string') return '';

    return input
      .replace(/[<>&"']/g, '') // Remove dangerous characters
      .trim()
      .substring(0, 500); // Reasonable length limit
  }

  /**
   * Validate email format
   */
  static validateEmail(email) {
    if (!email || typeof email !== 'string') return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if user has permission for action
   */
  static checkPermission(action) {
    try {
      const userEmail = Session.getActiveUser().getEmail();

      // Simple permission check - only authenticated users can perform actions
      if (!userEmail) {
        throw new Error('User not authenticated');
      }

      // Log security-relevant actions
      console.log(`Security check: ${userEmail} performing ${action}`);

      return { allowed: true, user: userEmail };

    } catch (error) {
      console.error('Permission check failed:', error);
      return { allowed: false, error: error.toString() };
    }
  }

  /**
   * Generate simple CSRF token
   */
  static generateCSRFToken() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    return `${timestamp}-${random}`;
  }

  /**
   * Validate CSRF token (basic implementation)
   */
  static validateCSRFToken(token, maxAge = 3600000) { // 1 hour default
    if (!token || typeof token !== 'string') return false;

    const parts = token.split('-');
    if (parts.length !== 2) return false;

    const timestamp = parseInt(parts[0]);
    if (isNaN(timestamp)) return false;

    const age = Date.now() - timestamp;
    return age <= maxAge;
  }
}

/**
 * Security helper functions for webapp endpoints
 */

/**
 * Validate and sanitize match event data
 */
function validateMatchEventData(eventData) {
  try {
    const validated = {
      eventType: InputValidator.sanitizeText(eventData.eventType),
      player: InputValidator.sanitizePlayerName(eventData.player),
      minute: InputValidator.validateMinute(eventData.minute),
      additionalData: {}
    };

    // Validate event type
    const validEventTypes = ['goal', 'card', 'substitution', 'half_time', 'full_time'];
    if (!validEventTypes.includes(validated.eventType)) {
      throw new Error(`Invalid event type: ${validated.eventType}`);
    }

    // Sanitize additional data if present
    if (eventData.additionalData && typeof eventData.additionalData === 'object') {
      Object.keys(eventData.additionalData).forEach(key => {
        const value = eventData.additionalData[key];
        if (typeof value === 'string') {
          validated.additionalData[key] = InputValidator.sanitizeText(value);
        } else if (typeof value === 'number') {
          validated.additionalData[key] = value;
        }
      });
    }

    return { valid: true, data: validated };

  } catch (error) {
    console.error('Event data validation failed:', error);
    return { valid: false, error: error.toString() };
  }
}

/**
 * Secure wrapper for webapp responses
 */
function createSecureResponse(data, success = true) {
  const response = {
    success: success,
    timestamp: new Date().toISOString(),
    data: data
  };

  if (!success) {
    response.error = data;
    delete response.data;
  }

  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Enterprise-Grade Rate Limiter with corruption resilience and monitoring
 */
class RateLimiter {

  /**
   * Check rate limit with comprehensive error handling and data validation
   * @param {string} identifier - Unique identifier for the rate limit bucket
   * @param {number} maxRequests - Maximum requests allowed in the window
   * @param {number} windowMs - Time window in milliseconds
   * @returns {Object} Rate limit result with detailed metadata
   */
  static checkLimit(identifier, maxRequests = 10, windowMs = 60000) {
    const startTime = Date.now();
    const limitKey = `rate_limit_${this.sanitizeIdentifier(identifier)}`;

    try {
      const now = Date.now();
      const windowStart = now - windowMs;
      const properties = PropertiesService.getScriptProperties();

      // Get and validate stored data with corruption detection
      let requests = this.getValidatedRequests(properties, limitKey, windowStart);

      // Circuit breaker: If too many validation errors, temporarily disable rate limiting
      if (this.shouldBypassRateLimit(identifier)) {
        this.logRateLimitEvent(identifier, 'bypassed', 'circuit_breaker_active');
        return this.createSuccessResponse(maxRequests, now, windowMs, startTime);
      }

      // Clean expired entries and validate data integrity
      const originalCount = requests.length;
      requests = requests.filter(time => {
        return typeof time === 'number' &&
               time > windowStart &&
               time <= now &&
               !isNaN(time);
      });

      // Log if we had to clean corrupted data
      if (originalCount > requests.length) {
        console.warn(`Rate limiter cleaned ${originalCount - requests.length} invalid entries for ${identifier}`);
      }

      // Check if limit exceeded
      if (requests.length >= maxRequests) {
        this.logRateLimitEvent(identifier, 'blocked', `${requests.length}/${maxRequests}`);
        return {
          allowed: false,
          remaining: 0,
          resetTime: requests[0] + windowMs,
          current: requests.length,
          limit: maxRequests,
          identifier: identifier,
          processing_time_ms: Date.now() - startTime,
          next_window_in_seconds: Math.ceil((requests[0] + windowMs - now) / 1000)
        };
      }

      // Add current request with validation
      requests.push(now);

      // Store with error handling and retry logic
      const saveSuccess = this.saveRequestsWithRetry(properties, limitKey, requests);
      if (!saveSuccess) {
        console.error(`Failed to save rate limit data for ${identifier} after retries`);
        this.incrementFailureCounter(identifier);
      }

      this.logRateLimitEvent(identifier, 'allowed', `${requests.length}/${maxRequests}`);

      return {
        allowed: true,
        remaining: maxRequests - requests.length,
        resetTime: now + windowMs,
        current: requests.length,
        limit: maxRequests,
        identifier: identifier,
        processing_time_ms: Date.now() - startTime,
        window_ms: windowMs
      };

    } catch (error) {
      console.error(`Rate limiting error for ${identifier}:`, error);
      this.incrementFailureCounter(identifier);

      // Fail open - allow request but log the failure
      this.logRateLimitEvent(identifier, 'error_failopen', error.toString());

      return {
        allowed: true,
        remaining: 1,
        resetTime: Date.now() + windowMs,
        error: error.toString(),
        failsafe: true,
        identifier: identifier,
        processing_time_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Get and validate requests from storage with corruption detection
   */
  static getValidatedRequests(properties, limitKey, windowStart) {
    try {
      const storedData = properties.getProperty(limitKey);

      if (!storedData) {
        return [];
      }

      // Parse with error handling
      let parsedData;
      try {
        parsedData = JSON.parse(storedData);
      } catch (parseError) {
        console.error(`Rate limit JSON corruption detected for ${limitKey}:`, parseError);
        // Clear corrupted data
        properties.deleteProperty(limitKey);
        this.incrementCorruptionCounter(limitKey);
        return [];
      }

      // Validate data structure
      if (!Array.isArray(parsedData)) {
        console.warn(`Rate limit data is not an array for ${limitKey}, resetting`);
        properties.deleteProperty(limitKey);
        return [];
      }

      // Validate and clean entries
      const validRequests = parsedData.filter(entry => {
        return typeof entry === 'number' &&
               !isNaN(entry) &&
               entry > 0 &&
               entry <= Date.now(); // No future timestamps
      });

      // If we had to filter out invalid entries, log it
      if (validRequests.length !== parsedData.length) {
        console.warn(`Rate limiter filtered ${parsedData.length - validRequests.length} invalid entries from ${limitKey}`);
        this.incrementCorruptionCounter(limitKey);
      }

      return validRequests;

    } catch (error) {
      console.error(`Failed to validate rate limit data for ${limitKey}:`, error);
      return [];
    }
  }

  /**
   * Save requests with retry logic and error handling
   */
  static saveRequestsWithRetry(properties, limitKey, requests, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const dataToSave = JSON.stringify(requests);

        // Validate JSON before saving
        JSON.parse(dataToSave); // This will throw if invalid

        properties.setProperty(limitKey, dataToSave);
        return true;

      } catch (error) {
        console.warn(`Rate limit save attempt ${attempt}/${maxRetries} failed for ${limitKey}:`, error);

        if (attempt === maxRetries) {
          console.error(`All save attempts failed for ${limitKey}`);
          return false;
        }

        // Brief delay before retry
        Utilities.sleep(50 * attempt); // 50ms, 100ms, 150ms delays
      }
    }
    return false;
  }

  /**
   * Circuit breaker logic - bypass rate limiting if too many failures
   */
  static shouldBypassRateLimit(identifier) {
    try {
      const properties = PropertiesService.getScriptProperties();
      const failureKey = `rate_limit_failures_${this.sanitizeIdentifier(identifier)}`;
      const failures = parseInt(properties.getProperty(failureKey) || '0');

      // If more than 5 failures in recent time, activate circuit breaker
      const bypassThreshold = 5;
      if (failures > bypassThreshold) {
        // Reset failure counter after some time
        const lastResetKey = `rate_limit_last_reset_${this.sanitizeIdentifier(identifier)}`;
        const lastReset = parseInt(properties.getProperty(lastResetKey) || '0');

        // Reset every 5 minutes
        if (Date.now() - lastReset > 300000) {
          properties.setProperty(failureKey, '0');
          properties.setProperty(lastResetKey, Date.now().toString());
          return false;
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Circuit breaker check failed:', error);
      return false;
    }
  }

  /**
   * Increment failure counter for circuit breaker
   */
  static incrementFailureCounter(identifier) {
    try {
      const properties = PropertiesService.getScriptProperties();
      const failureKey = `rate_limit_failures_${this.sanitizeIdentifier(identifier)}`;
      const currentFailures = parseInt(properties.getProperty(failureKey) || '0');
      properties.setProperty(failureKey, (currentFailures + 1).toString());
    } catch (error) {
      console.error('Failed to increment failure counter:', error);
    }
  }

  /**
   * Increment corruption counter for monitoring
   */
  static incrementCorruptionCounter(limitKey) {
    try {
      const properties = PropertiesService.getScriptProperties();
      const corruptionKey = 'rate_limit_corruption_count';
      const currentCount = parseInt(properties.getProperty(corruptionKey) || '0');
      properties.setProperty(corruptionKey, (currentCount + 1).toString());
    } catch (error) {
      console.error('Failed to increment corruption counter:', error);
    }
  }

  /**
   * Sanitize identifier for safe use as property key
   */
  static sanitizeIdentifier(identifier) {
    return identifier.replace(/[^a-zA-Z0-9_@.-]/g, '_').substring(0, 100);
  }

  /**
   * Create standardized success response
   */
  static createSuccessResponse(maxRequests, now, windowMs, startTime) {
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
      current: 1,
      limit: maxRequests,
      processing_time_ms: Date.now() - startTime,
      bypass_reason: 'circuit_breaker'
    };
  }

  /**
   * Log rate limit events for monitoring and debugging
   */
  static logRateLimitEvent(identifier, action, details) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      identifier: this.sanitizeIdentifier(identifier),
      action: action,
      details: details
    };

    console.log(`[RATE_LIMIT] ${action.toUpperCase()}: ${identifier} - ${details}`);

    // Store in rotating log for analysis (optional)
    try {
      const properties = PropertiesService.getScriptProperties();
      const logKey = 'rate_limit_events_log';
      const existingLog = properties.getProperty(logKey);
      let logs = existingLog ? JSON.parse(existingLog) : [];

      logs.push(logEntry);
      if (logs.length > 50) {
        logs = logs.slice(-50); // Keep last 50 events
      }

      properties.setProperty(logKey, JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to log rate limit event:', error);
    }
  }

  /**
   * Clear rate limit data for an identifier (admin function)
   */
  static clearLimit(identifier) {
    try {
      const properties = PropertiesService.getScriptProperties();
      const limitKey = `rate_limit_${identifier}`;
      properties.deleteProperty(limitKey);
      return { success: true, cleared: identifier };
    } catch (error) {
      console.error('Failed to clear rate limit:', error);
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Clean up expired rate limit entries (maintenance function)
   */
  static cleanupExpiredLimits() {
    try {
      const properties = PropertiesService.getScriptProperties();
      const allProperties = properties.getProperties();
      const now = Date.now();
      let cleanedCount = 0;

      Object.keys(allProperties).forEach(key => {
        if (key.startsWith('rate_limit_')) {
          try {
            const requests = JSON.parse(allProperties[key]);
            const validRequests = requests.filter(time => (now - time) < 3600000); // Keep 1 hour history

            if (validRequests.length === 0) {
              properties.deleteProperty(key);
              cleanedCount++;
            } else if (validRequests.length < requests.length) {
              properties.setProperty(key, JSON.stringify(validRequests));
            }
          } catch (e) {
            // Invalid data, delete it
            properties.deleteProperty(key);
            cleanedCount++;
          }
        }
      });

      return { success: true, cleanedCount: cleanedCount };

    } catch (error) {
      console.error('Rate limit cleanup failed:', error);
      return { success: false, error: error.toString() };
    }
  }
}

/**
 * Secure webhook handler wrapper
 */
function secureWebhookHandler(handlerFunction, requireAuth = true) {
  return function(e) {
    try {
      // Basic rate limiting
      const userEmail = Session.getActiveUser().getEmail();
      const rateLimit = RateLimiter.checkLimit(userEmail || 'anonymous', 20, 60000);

      if (!rateLimit.allowed) {
        // IMPORTANT: Don't record quota usage for blocked requests to prevent quota inflation
        console.warn(`Rate limit exceeded for ${userEmail || 'anonymous'}: ${rateLimit.current}/${rateLimit.limit}`);
        return createSecureResponse('Rate limit exceeded', false);
      }

      // Authentication check
      if (requireAuth) {
        const permission = InputValidator.checkPermission('webhook_access');
        if (!permission.allowed) {
          return createSecureResponse('Access denied', false);
        }
      }

      // Input validation
      let requestData = {};
      if (e.postData && e.postData.contents) {
        try {
          requestData = JSON.parse(e.postData.contents);
        } catch (parseError) {
          return createSecureResponse('Invalid JSON data', false);
        }
      }

      // Call the actual handler
      const result = handlerFunction(requestData, e);
      return createSecureResponse(result);

    } catch (error) {
      console.error('Secure webhook handler error:', error);
      return createSecureResponse(error.toString(), false);
    }
  };
}