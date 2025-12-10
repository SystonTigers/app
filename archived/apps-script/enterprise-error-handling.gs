/**
 * @fileoverview Enterprise Error Handling System
 * @version 6.2.0
 * @description Standardized error handling, logging, and recovery mechanisms
 */

/**
 * Enterprise Error Handler with consistent patterns and recovery
 */
class EnterpriseErrorHandler {

  /**
   * Standard error response format for all functions
   * @param {Error|string} error - Error object or message
   * @param {string} context - Function/operation context
   * @param {Object} metadata - Additional error metadata
   * @returns {Object} Standardized error response
   */
  static createErrorResponse(error, context, metadata = {}) {
    const errorResponse = {
      success: false,
      error: {
        message: typeof error === 'string' ? error : error.message,
        type: error.name || 'Error',
        context: context,
        timestamp: new Date().toISOString(),
        request_id: Utilities.getUuid().substring(0, 8),
        ...metadata
      }
    };

    // Log error for monitoring
    console.error(`[${context}] ${errorResponse.error.type}: ${errorResponse.error.message}`, errorResponse);

    return errorResponse;
  }

  /**
   * Standard success response format for all functions
   * @param {any} data - Success data
   * @param {string} context - Function/operation context
   * @param {Object} metadata - Additional success metadata
   * @returns {Object} Standardized success response
   */
  static createSuccessResponse(data, context, metadata = {}) {
    return {
      success: true,
      data: data,
      context: context,
      timestamp: new Date().toISOString(),
      ...metadata
    };
  }

  /**
   * Execute operation with standardized error handling
   * @param {Function} operation - Operation to execute
   * @param {string} context - Operation context for logging
   * @param {Object} options - Error handling options
   * @returns {Object} Standardized response
   */
  static async executeWithErrorHandling(operation, context, options = {}) {
    const startTime = Date.now();

    try {
      const result = await operation();

      return this.createSuccessResponse(result, context, {
        execution_time_ms: Date.now() - startTime
      });

    } catch (error) {
      // Handle different error types
      if (error instanceof ValidationError) {
        return this.handleValidationError(error, context, options);
      } else if (error instanceof ConfigurationError) {
        return this.handleConfigurationError(error, context, options);
      } else if (error instanceof SecurityError) {
        return this.handleSecurityError(error, context, options);
      } else if (error instanceof HttpError) {
        return this.handleHttpError(error, context, options);
      } else if (error instanceof TimeoutError) {
        return this.handleTimeoutError(error, context, options);
      } else {
        return this.handleGenericError(error, context, options);
      }
    }
  }

  /**
   * Handle validation errors
   * @param {ValidationError} error - Validation error
   * @param {string} context - Operation context
   * @param {Object} options - Error handling options
   * @returns {Object} Error response
   */
  static handleValidationError(error, context, options) {
    return this.createErrorResponse(error, context, {
      error_category: 'validation',
      user_facing: true,
      retry_recommended: false,
      severity: 'medium'
    });
  }

  /**
   * Handle configuration errors
   * @param {ConfigurationError} error - Configuration error
   * @param {string} context - Operation context
   * @param {Object} options - Error handling options
   * @returns {Object} Error response
   */
  static handleConfigurationError(error, context, options) {
    // Log configuration error for admin attention
    console.error(`CONFIGURATION ERROR in ${context}:`, error);

    return this.createErrorResponse(error, context, {
      error_category: 'configuration',
      user_facing: false,
      retry_recommended: false,
      severity: 'high',
      admin_action_required: true
    });
  }

  /**
   * Handle security errors
   * @param {SecurityError} error - Security error
   * @param {string} context - Operation context
   * @param {Object} options - Error handling options
   * @returns {Object} Error response
   */
  static handleSecurityError(error, context, options) {
    // Log security incident
    console.error(`SECURITY INCIDENT in ${context}:`, error);

    // Trigger security alert if available
    if (typeof AdvancedSecurity !== 'undefined' && AdvancedSecurity.logSecurityEvent) {
      AdvancedSecurity.logSecurityEvent('security_error', {
        context: context,
        error: error.message,
        severity: 'high'
      });
    }

    return this.createErrorResponse('Access denied', context, {
      error_category: 'security',
      user_facing: true,
      retry_recommended: false,
      severity: 'critical',
      security_incident: true
    });
  }

  /**
   * Handle HTTP errors
   * @param {HttpError} error - HTTP error
   * @param {string} context - Operation context
   * @param {Object} options - Error handling options
   * @returns {Object} Error response
   */
  static handleHttpError(error, context, options) {
    const isRetryable = this.isRetryableHttpError(error);

    return this.createErrorResponse(error, context, {
      error_category: 'http',
      user_facing: false,
      retry_recommended: isRetryable,
      severity: isRetryable ? 'medium' : 'high',
      network_issue: true
    });
  }

  /**
   * Handle timeout errors
   * @param {TimeoutError} error - Timeout error
   * @param {string} context - Operation context
   * @param {Object} options - Error handling options
   * @returns {Object} Error response
   */
  static handleTimeoutError(error, context, options) {
    return this.createErrorResponse(error, context, {
      error_category: 'timeout',
      user_facing: false,
      retry_recommended: true,
      severity: 'medium',
      performance_issue: true
    });
  }

  /**
   * Handle generic errors
   * @param {Error} error - Generic error
   * @param {string} context - Operation context
   * @param {Object} options - Error handling options
   * @returns {Object} Error response
   */
  static handleGenericError(error, context, options) {
    return this.createErrorResponse(error, context, {
      error_category: 'system',
      user_facing: false,
      retry_recommended: true,
      severity: 'high'
    });
  }

  /**
   * Check if HTTP error is retryable
   * @param {HttpError} error - HTTP error
   * @returns {boolean} True if retryable
   */
  static isRetryableHttpError(error) {
    const retryablePatterns = [
      /timeout/i,
      /network/i,
      /connection/i,
      /503/,
      /502/,
      /504/,
      /429/ // Rate limited
    ];

    return retryablePatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Execute operation with retry logic
   * @param {Function} operation - Operation to retry
   * @param {string} context - Operation context
   * @param {Object} retryOptions - Retry configuration
   * @returns {Object} Operation result
   */
  static async executeWithRetry(operation, context, retryOptions = {}) {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      backoffFactor = 2,
      retryCondition = (error) => true
    } = retryOptions;

    let lastError;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const result = await operation();

        if (attempt > 1) {
          console.log(`Operation succeeded on attempt ${attempt} for ${context}`);
        }

        return this.createSuccessResponse(result, context, {
          attempts_made: attempt,
          retry_succeeded: attempt > 1
        });

      } catch (error) {
        lastError = error;

        if (attempt === maxRetries + 1) {
          // Final attempt failed
          break;
        }

        if (!retryCondition(error)) {
          // Error type not retryable
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = Math.min(
          baseDelay * Math.pow(backoffFactor, attempt - 1),
          maxDelay
        );
        const jitteredDelay = delay + (Math.random() * delay * 0.1); // 10% jitter

        console.warn(`Attempt ${attempt} failed for ${context}, retrying in ${Math.round(jitteredDelay)}ms:`, error.message);

        // Wait before retry
        await this.sleep(jitteredDelay);
      }
    }

    // All retries exhausted
    return this.createErrorResponse(lastError, context, {
      attempts_made: maxRetries + 1,
      retry_exhausted: true,
      final_error: lastError.message
    });
  }

  /**
   * Sleep utility for retry delays
   * @param {number} ms - Milliseconds to sleep
   */
  static async sleep(ms) {
    return new Promise(resolve => {
      Utilities.sleep(ms);
      resolve();
    });
  }

  /**
   * Graceful degradation handler
   * @param {Function} primaryOperation - Primary operation to try
   * @param {Function} fallbackOperation - Fallback operation
   * @param {string} context - Operation context
   * @returns {Object} Operation result
   */
  static async withGracefulDegradation(primaryOperation, fallbackOperation, context) {
    try {
      const result = await primaryOperation();
      return this.createSuccessResponse(result, context, {
        method: 'primary'
      });

    } catch (primaryError) {
      console.warn(`Primary operation failed for ${context}, trying fallback:`, primaryError.message);

      try {
        const fallbackResult = await fallbackOperation();
        return this.createSuccessResponse(fallbackResult, context, {
          method: 'fallback',
          primary_error: primaryError.message,
          degraded_service: true
        });

      } catch (fallbackError) {
        return this.createErrorResponse(fallbackError, context, {
          primary_error: primaryError.message,
          fallback_error: fallbackError.message,
          total_failure: true
        });
      }
    }
  }

  /**
   * Validate input and handle errors consistently
   * @param {any} input - Input to validate
   * @param {string} validationType - Type of validation
   * @param {string} context - Validation context
   * @returns {Object} Validation result
   */
  static validateInput(input, validationType, context) {
    try {
      let validatedInput;

      switch (validationType) {
        case 'goal_event':
          validatedInput = EnterpriseValidator.validateGoalEvent(input);
          break;
        case 'card_event':
          validatedInput = EnterpriseValidator.validateCardEvent(input);
          break;
        case 'webhook_payload':
          validatedInput = EnterpriseValidator.validateWebhookPayload(input);
          break;
        default:
          throw new ValidationError(`Unknown validation type: ${validationType}`);
      }

      return this.createSuccessResponse(validatedInput, context, {
        validation_type: validationType,
        input_validated: true
      });

    } catch (error) {
      return this.handleValidationError(error, context);
    }
  }

  /**
   * Create HTTP response with standardized error format
   * @param {Object} result - Operation result
   * @param {number} statusCode - HTTP status code
   * @returns {GoogleAppsScript.Content.TextOutput} HTTP response
   */
  static createHttpResponse(result, statusCode = null) {
    // Determine status code if not provided
    if (!statusCode) {
      if (result.success) {
        statusCode = 200;
      } else {
        switch (result.error?.error_category) {
          case 'validation':
            statusCode = 400;
            break;
          case 'security':
            statusCode = 403;
            break;
          case 'configuration':
            statusCode = 500;
            break;
          case 'timeout':
            statusCode = 504;
            break;
          case 'http':
            statusCode = 502;
            break;
          default:
            statusCode = 500;
        }
      }
    }

    const response = ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

    // Add security headers
    if (typeof AdvancedSecurity !== 'undefined' && AdvancedSecurity.addSecurityHeaders) {
      return AdvancedSecurity.addSecurityHeaders(response);
    }

    return response;
  }

  /**
   * Log operation metrics for monitoring
   * @param {string} operation - Operation name
   * @param {Object} result - Operation result
   * @param {number} executionTime - Execution time in ms
   */
  static logOperationMetrics(operation, result, executionTime) {
    try {
      const metrics = {
        operation: operation,
        success: result.success,
        execution_time_ms: executionTime,
        timestamp: new Date().toISOString(),
        error_category: result.error?.error_category,
        retry_count: result.attempts_made || 1
      };

      console.log(`[METRICS] ${operation}: ${result.success ? 'SUCCESS' : 'FAILED'} (${executionTime}ms)`, metrics);

      // Store metrics for analysis (optional)
      this.storeOperationMetrics(metrics);

    } catch (error) {
      console.error('Failed to log operation metrics:', error);
    }
  }

  /**
   * Store operation metrics in properties for analysis
   * @param {Object} metrics - Metrics to store
   */
  static storeOperationMetrics(metrics) {
    try {
      const properties = PropertiesService.getScriptProperties();
      const metricsKey = `metrics_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      properties.setProperty(metricsKey, JSON.stringify(metrics));

      // Clean up old metrics (keep last 1000)
      this.cleanupOldMetrics();

    } catch (error) {
      console.error('Failed to store operation metrics:', error);
    }
  }

  /**
   * Clean up old metrics
   */
  static cleanupOldMetrics() {
    try {
      const properties = PropertiesService.getScriptProperties();
      const allProps = properties.getProperties();

      const metricsKeys = Object.keys(allProps)
        .filter(key => key.startsWith('metrics_'))
        .sort();

      if (metricsKeys.length > 1000) {
        const keysToDelete = metricsKeys.slice(0, metricsKeys.length - 1000);
        keysToDelete.forEach(key => {
          properties.deleteProperty(key);
        });
      }

    } catch (error) {
      console.error('Failed to cleanup metrics:', error);
    }
  }
}

/**
 * Wrapper function to standardize all operation execution
 * @param {Function} operation - Operation to execute
 * @param {string} context - Operation context
 * @param {Object} options - Execution options
 * @returns {Object} Standardized result
 */
async function executeStandardOperation(operation, context, options = {}) {
  const startTime = Date.now();

  try {
    const result = await EnterpriseErrorHandler.executeWithErrorHandling(
      operation,
      context,
      options
    );

    // Log metrics
    const executionTime = Date.now() - startTime;
    EnterpriseErrorHandler.logOperationMetrics(context, result, executionTime);

    return result;

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorResult = EnterpriseErrorHandler.createErrorResponse(error, context);

    EnterpriseErrorHandler.logOperationMetrics(context, errorResult, executionTime);

    return errorResult;
  }
}

// Export for global use
globalThis.EnterpriseErrorHandler = EnterpriseErrorHandler;
globalThis.executeStandardOperation = executeStandardOperation;