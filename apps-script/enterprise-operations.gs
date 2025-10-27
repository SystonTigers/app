/**
 * @fileoverview Enterprise Operations Manager
 * @version 6.2.0
 * @description Atomic operations, idempotency, circuit breakers, and distributed locking
 */

/**
 * Enterprise Operations Manager with bulletproof reliability patterns
 */
class EnterpriseOperations {

  /**
   * Execute operation with idempotency protection
   * @param {string} operationKey - Unique key for this operation
   * @param {Function} operation - Operation to execute
   * @param {Object} options - Operation options
   * @returns {Object} Operation result
   */
  static async withIdempotency(operationKey, operation, options = {}) {
    const startTime = Date.now();
    const sanitizedKey = this.sanitizeOperationKey(operationKey);

    try {
      // Check if operation already completed
      const existingResult = this.getCompletedOperation(sanitizedKey);
      if (existingResult && !options.forceRetry) {
        console.log(`Operation already completed: ${sanitizedKey}`);
        return {
          ...existingResult,
          skipped: true,
          reason: 'already_completed',
          cache_hit: true
        };
      }

      // Record operation start
      this.recordOperationStart(sanitizedKey, options);

      // Execute with timeout protection
      const timeout = options.timeout || 30000; // 30 second default
      const result = await this.withTimeout(operation, timeout);

      // Record successful completion
      this.recordOperationCompletion(sanitizedKey, result, Date.now() - startTime);

      return {
        ...result,
        operation_key: sanitizedKey,
        execution_time_ms: Date.now() - startTime,
        idempotent: true
      };

    } catch (error) {
      // Record failure but don't mark as completed (allow retry)
      this.recordOperationFailure(sanitizedKey, error, Date.now() - startTime);
      console.error(`Operation failed: ${sanitizedKey}`, error);
      throw error;
    }
  }

  /**
   * Execute operation with distributed lock
   * @param {string} lockKey - Lock identifier
   * @param {Function} operation - Operation to execute
   * @param {Object} options - Lock options
   * @returns {any} Operation result
   */
  static async withLock(lockKey, operation, options = {}) {
    const sanitizedLockKey = this.sanitizeLockKey(lockKey);
    const lockId = Utilities.getUuid();
    const timeoutMs = options.timeout || 30000;
    const acquired = await this.acquireLock(sanitizedLockKey, lockId, timeoutMs);

    if (!acquired) {
      throw new ConcurrencyError(`Failed to acquire lock: ${sanitizedLockKey}`);
    }

    try {
      console.log(`Lock acquired: ${sanitizedLockKey} (${lockId})`);
      return await operation();
    } finally {
      await this.releaseLock(sanitizedLockKey, lockId);
      console.log(`Lock released: ${sanitizedLockKey} (${lockId})`);
    }
  }

  /**
   * Execute operation with circuit breaker protection
   * @param {string} serviceKey - Service identifier
   * @param {Function} operation - Operation to execute
   * @param {Object} options - Circuit breaker options
   * @returns {any} Operation result
   */
  static async withCircuitBreaker(serviceKey, operation, options = {}) {
    const sanitizedKey = this.sanitizeServiceKey(serviceKey);
    const state = this.getCircuitState(sanitizedKey);

    // Check circuit breaker state
    if (state === 'OPEN') {
      const canTry = this.canAttemptReset(sanitizedKey);
      if (!canTry) {
        throw new CircuitBreakerError(`Circuit breaker OPEN for service: ${sanitizedKey}`);
      }
      // Allow one attempt to test if service is back
      console.log(`Circuit breaker attempting reset for: ${sanitizedKey}`);
    }

    try {
      const result = await operation();

      // Record success
      this.recordCircuitSuccess(sanitizedKey);

      return result;

    } catch (error) {
      // Record failure
      this.recordCircuitFailure(sanitizedKey, error);
      throw error;
    }
  }

  /**
   * Execute webhook call with full enterprise protection
   * @param {string} url - Webhook URL
   * @param {Object} payload - Data to send
   * @param {Object} options - Request options
   * @returns {Object} Response data
   */
  static async executeSecureWebhook(url, payload, options = {}) {
    // Validate webhook URL
    if (!EnterpriseValidator.validateUrl(url)) {
      throw new SecurityError(`Invalid webhook URL: ${url}`);
    }

    // Generate operation key for idempotency
    const operationKey = this.generateWebhookKey(url, payload);

    return await this.withIdempotency(operationKey, async () => {
      return await this.withCircuitBreaker(`webhook_${new URL(url).hostname}`, async () => {
        return await this.makeSecureHttpRequest(url, payload, options);
      });
    }, options);
  }

  /**
   * Make secure HTTP request with comprehensive error handling
   * @param {string} url - Request URL
   * @param {Object} payload - Request payload
   * @param {Object} options - Request options
   * @returns {Object} Response data
   */
  static async makeSecureHttpRequest(url, payload, options = {}) {
    const clubIdentifier = String(
      getConfigValue('SYSTEM.CLUB_SHORT_NAME', getConfigValue('SYSTEM.CLUB_NAME', 'Club'))
    ).replace(/\s+/g, '') || 'Club';
    const requestOptions = {
      method: options.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `${clubIdentifier}-Automation/${getConfigValue('SYSTEM.VERSION', '6.2.0')}`,
        ...options.headers
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true, // Handle errors manually
      validateHttpsCertificates: true, // Security requirement
      followRedirects: false, // Security requirement
      timeout: options.timeout || 15000 // 15 second timeout
    };

    const startTime = Date.now();

    try {
      const response = UrlFetchApp.fetch(url, requestOptions);
      const responseTime = Date.now() - startTime;

      // Log performance metrics
      console.log(`HTTP request completed: ${url} (${responseTime}ms, ${response.getResponseCode()})`);

      if (response.getResponseCode() >= 400) {
        throw new HttpError(`HTTP ${response.getResponseCode()}: ${response.getContentText()}`);
      }

      let responseData;
      try {
        responseData = JSON.parse(response.getContentText());
      } catch (parseError) {
        responseData = { raw_response: response.getContentText() };
      }

      return {
        success: true,
        data: responseData,
        status_code: response.getResponseCode(),
        response_time_ms: responseTime,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`HTTP request failed: ${url}`, error);
      throw new HttpError(`Request failed: ${error.message}`);
    }
  }

  /**
   * Execute operation with timeout protection
   * @param {Function} operation - Operation to execute
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {any} Operation result
   */
  static async withTimeout(operation, timeoutMs) {
    const startTime = Date.now();

    // Apps Script doesn't have native async/await timeouts, so we use a different approach
    try {
      const result = operation();

      // Check if operation took too long
      const elapsed = Date.now() - startTime;
      if (elapsed > timeoutMs) {
        console.warn(`Operation exceeded timeout: ${elapsed}ms > ${timeoutMs}ms`);
      }

      return result;

    } catch (error) {
      const elapsed = Date.now() - startTime;
      if (elapsed > timeoutMs) {
        throw new TimeoutError(`Operation timed out after ${elapsed}ms`);
      }
      throw error;
    }
  }

  /**
   * Sanitize operation key for safe storage
   * @param {string} key - Raw operation key
   * @returns {string} Sanitized key
   */
  static sanitizeOperationKey(key) {
    return key
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 100);
  }

  /**
   * Sanitize lock key
   * @param {string} key - Raw lock key
   * @returns {string} Sanitized key
   */
  static sanitizeLockKey(key) {
    return `lock_${key.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 80)}`;
  }

  /**
   * Sanitize service key for circuit breaker
   * @param {string} key - Raw service key
   * @returns {string} Sanitized key
   */
  static sanitizeServiceKey(key) {
    return key.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
  }

  /**
   * Generate unique key for webhook operations
   * @param {string} url - Webhook URL
   * @param {Object} payload - Payload data
   * @returns {string} Unique operation key
   */
  static generateWebhookKey(url, payload) {
    const urlHash = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      url
    ).slice(0, 8);

    const payloadHash = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      JSON.stringify(payload)
    ).slice(0, 8);

    return `webhook_${urlHash}_${payloadHash}`;
  }

  /**
   * Get completed operation result
   * @param {string} operationKey - Operation key
   * @returns {Object|null} Completed operation result or null
   */
  static getCompletedOperation(operationKey) {
    try {
      const properties = PropertiesService.getScriptProperties();
      const completedKey = `completed_op_${operationKey}`;
      const stored = properties.getProperty(completedKey);

      if (!stored) return null;

      const result = JSON.parse(stored);

      // Check if result is still valid (not expired)
      const expiryTime = new Date(result.expires_at);
      if (new Date() > expiryTime) {
        properties.deleteProperty(completedKey);
        return null;
      }

      return result;

    } catch (error) {
      console.error(`Failed to get completed operation: ${operationKey}`, error);
      return null;
    }
  }

  /**
   * Record operation start
   * @param {string} operationKey - Operation key
   * @param {Object} options - Operation options
   */
  static recordOperationStart(operationKey, options) {
    try {
      const properties = PropertiesService.getScriptProperties();
      const startKey = `started_op_${operationKey}`;

      const startRecord = {
        started_at: new Date().toISOString(),
        options: options,
        status: 'in_progress'
      };

      properties.setProperty(startKey, JSON.stringify(startRecord));

    } catch (error) {
      console.error(`Failed to record operation start: ${operationKey}`, error);
    }
  }

  /**
   * Record successful operation completion
   * @param {string} operationKey - Operation key
   * @param {any} result - Operation result
   * @param {number} executionTime - Execution time in ms
   */
  static recordOperationCompletion(operationKey, result, executionTime) {
    try {
      const properties = PropertiesService.getScriptProperties();
      const completedKey = `completed_op_${operationKey}`;
      const startKey = `started_op_${operationKey}`;

      // Store completed operation (expires after 1 hour)
      const completedRecord = {
        completed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour TTL
        execution_time_ms: executionTime,
        result: result,
        status: 'completed'
      };

      properties.setProperty(completedKey, JSON.stringify(completedRecord));

      // Clean up start record
      properties.deleteProperty(startKey);

      console.log(`Operation completed: ${operationKey} (${executionTime}ms)`);

    } catch (error) {
      console.error(`Failed to record operation completion: ${operationKey}`, error);
    }
  }

  /**
   * Record operation failure
   * @param {string} operationKey - Operation key
   * @param {Error} error - Error that occurred
   * @param {number} executionTime - Execution time in ms
   */
  static recordOperationFailure(operationKey, error, executionTime) {
    try {
      const properties = PropertiesService.getScriptProperties();
      const failureKey = `failed_op_${operationKey}`;
      const startKey = `started_op_${operationKey}`;

      const failureRecord = {
        failed_at: new Date().toISOString(),
        execution_time_ms: executionTime,
        error: error.toString(),
        error_type: error.name || 'Unknown',
        status: 'failed'
      };

      properties.setProperty(failureKey, JSON.stringify(failureRecord));

      // Clean up start record
      properties.deleteProperty(startKey);

      console.error(`Operation failed: ${operationKey} (${executionTime}ms)`, error);

    } catch (logError) {
      console.error(`Failed to record operation failure: ${operationKey}`, logError);
    }
  }

  /**
   * Acquire distributed lock
   * @param {string} lockKey - Lock key
   * @param {string} lockId - Unique lock ID
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {boolean} True if lock acquired
   */
  static async acquireLock(lockKey, lockId, timeoutMs) {
    const startTime = Date.now();
    const expiry = startTime + timeoutMs;

    try {
      const properties = PropertiesService.getScriptProperties();

      while (Date.now() < expiry) {
        const existingLock = properties.getProperty(lockKey);

        if (!existingLock) {
          // Try to acquire lock
          const lockData = {
            lock_id: lockId,
            acquired_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30000).toISOString() // 30 second lock
          };

          properties.setProperty(lockKey, JSON.stringify(lockData));

          // Verify we got the lock (handle race conditions)
          const verifyLock = properties.getProperty(lockKey);
          if (verifyLock) {
            const parsedLock = JSON.parse(verifyLock);
            if (parsedLock.lock_id === lockId) {
              return true; // Successfully acquired lock
            }
          }
        } else {
          // Check if existing lock is expired
          try {
            const lockData = JSON.parse(existingLock);
            const lockExpiry = new Date(lockData.expires_at);

            if (new Date() > lockExpiry) {
              // Clean up expired lock
              properties.deleteProperty(lockKey);
              continue; // Try to acquire on next iteration
            }
          } catch (parseError) {
            // Invalid lock data, clean it up
            properties.deleteProperty(lockKey);
            continue;
          }
        }

        // Wait before retrying
        Utilities.sleep(100 + Math.random() * 200); // 100-300ms with jitter
      }

      return false; // Failed to acquire lock within timeout

    } catch (error) {
      console.error(`Failed to acquire lock ${lockKey}:`, error);
      return false;
    }
  }

  /**
   * Release distributed lock
   * @param {string} lockKey - Lock key
   * @param {string} lockId - Lock ID that was used to acquire
   */
  static async releaseLock(lockKey, lockId) {
    try {
      const properties = PropertiesService.getScriptProperties();
      const existingLock = properties.getProperty(lockKey);

      if (existingLock) {
        const lockData = JSON.parse(existingLock);

        // Only release if we own the lock
        if (lockData.lock_id === lockId) {
          properties.deleteProperty(lockKey);
        }
      }

    } catch (error) {
      console.error(`Failed to release lock ${lockKey}:`, error);
    }
  }

  /**
   * Get circuit breaker state
   * @param {string} serviceKey - Service key
   * @returns {string} Circuit state (CLOSED, OPEN, HALF_OPEN)
   */
  static getCircuitState(serviceKey) {
    try {
      const properties = PropertiesService.getScriptProperties();
      const circuitKey = `circuit_${serviceKey}`;
      const circuitData = properties.getProperty(circuitKey);

      if (!circuitData) {
        return 'CLOSED'; // Default state
      }

      const circuit = JSON.parse(circuitData);
      const now = Date.now();

      // Check if we should reset from OPEN to HALF_OPEN
      if (circuit.state === 'OPEN') {
        const resetTime = new Date(circuit.reset_time).getTime();
        if (now >= resetTime) {
          return 'HALF_OPEN';
        }
      }

      return circuit.state;

    } catch (error) {
      console.error(`Failed to get circuit state for ${serviceKey}:`, error);
      return 'CLOSED'; // Fail to closed state
    }
  }

  /**
   * Check if we can attempt to reset the circuit breaker
   * @param {string} serviceKey - Service key
   * @returns {boolean} True if can attempt reset
   */
  static canAttemptReset(serviceKey) {
    const state = this.getCircuitState(serviceKey);
    return state === 'HALF_OPEN';
  }

  /**
   * Record circuit breaker success
   * @param {string} serviceKey - Service key
   */
  static recordCircuitSuccess(serviceKey) {
    try {
      const properties = PropertiesService.getScriptProperties();
      const circuitKey = `circuit_${serviceKey}`;

      // Reset circuit to CLOSED state
      const circuitData = {
        state: 'CLOSED',
        failure_count: 0,
        last_success: new Date().toISOString(),
        reset_time: null
      };

      properties.setProperty(circuitKey, JSON.stringify(circuitData));

    } catch (error) {
      console.error(`Failed to record circuit success for ${serviceKey}:`, error);
    }
  }

  /**
   * Record circuit breaker failure
   * @param {string} serviceKey - Service key
   * @param {Error} error - Error that occurred
   */
  static recordCircuitFailure(serviceKey, error) {
    try {
      const properties = PropertiesService.getScriptProperties();
      const circuitKey = `circuit_${serviceKey}`;
      const existingData = properties.getProperty(circuitKey);

      let circuit = {
        state: 'CLOSED',
        failure_count: 0,
        last_success: null,
        reset_time: null
      };

      if (existingData) {
        circuit = JSON.parse(existingData);
      }

      circuit.failure_count++;
      circuit.last_failure = new Date().toISOString();
      circuit.last_error = error.toString();

      // Open circuit if failure threshold exceeded
      const failureThreshold = 5;
      if (circuit.failure_count >= failureThreshold) {
        circuit.state = 'OPEN';
        circuit.reset_time = new Date(Date.now() + 60000).toISOString(); // 1 minute
        console.warn(`Circuit breaker OPENED for ${serviceKey} after ${circuit.failure_count} failures`);
      }

      properties.setProperty(circuitKey, JSON.stringify(circuit));

    } catch (logError) {
      console.error(`Failed to record circuit failure for ${serviceKey}:`, logError);
    }
  }

  /**
   * Clean up expired operations and locks
   */
  static cleanupExpiredOperations() {
    try {
      const properties = PropertiesService.getScriptProperties();
      const allProps = properties.getProperties();
      const now = new Date();
      let cleanedCount = 0;

      Object.keys(allProps).forEach(key => {
        try {
          // Clean up expired completed operations
          if (key.startsWith('completed_op_')) {
            const data = JSON.parse(allProps[key]);
            if (data.expires_at && new Date(data.expires_at) < now) {
              properties.deleteProperty(key);
              cleanedCount++;
            }
          }

          // Clean up old failed operations (keep for 24 hours)
          if (key.startsWith('failed_op_')) {
            const data = JSON.parse(allProps[key]);
            const failedAt = new Date(data.failed_at);
            if (now.getTime() - failedAt.getTime() > 24 * 60 * 60 * 1000) {
              properties.deleteProperty(key);
              cleanedCount++;
            }
          }

          // Clean up expired locks
          if (key.startsWith('lock_')) {
            const data = JSON.parse(allProps[key]);
            if (data.expires_at && new Date(data.expires_at) < now) {
              properties.deleteProperty(key);
              cleanedCount++;
            }
          }

        } catch (error) {
          // Clean up corrupted data
          properties.deleteProperty(key);
          cleanedCount++;
        }
      });

      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} expired operations`);
      }

      return { cleaned: cleanedCount };

    } catch (error) {
      console.error('Failed to cleanup expired operations:', error);
      return { cleaned: 0, error: error.toString() };
    }
  }
}

/**
 * Enterprise error classes
 */
class ConcurrencyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConcurrencyError';
  }
}

class CircuitBreakerError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

class HttpError extends Error {
  constructor(message) {
    super(message);
    this.name = 'HttpError';
  }
}

class TimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TimeoutError';
  }
}

// Export for global use
globalThis.EnterpriseOperations = EnterpriseOperations;
globalThis.ConcurrencyError = ConcurrencyError;
globalThis.CircuitBreakerError = CircuitBreakerError;
globalThis.HttpError = HttpError;
globalThis.TimeoutError = TimeoutError;