/**
 * @fileoverview Robust HTTP fetch utilities with retry logic and security
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Enterprise-grade HTTP utilities for all external API calls
 */

/**
 * Robust HTTP client with retry logic, timeouts, and security features
 */
class HttpClient {
  constructor() {
    this.loggerName = 'HttpClient';
    this._logger = null;
    this.defaultTimeout = 30000; // 30 seconds
    this.defaultMaxRetries = 3;
    this.defaultRetryDelay = 1000; // 1 second
    this.maxRetryDelay = 60000; // 60 seconds
    this.rateLimiter = new Map(); // URL -> last call timestamp
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
          error: (msg, data) => console.error(`[${this.loggerName}] ${msg}`, data || ''),
          security: (msg, data) => console.log(`[${this.loggerName}] SECURITY: ${msg}`, data || '')
        };
      }
    }
    return this._logger;
  }

  /**
   * Make HTTP request with robust error handling and retry logic
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Object} Response object
   */
  fetch(url, options = {}) {
    this.logger.enterFunction('fetch', {
      url: this.sanitizeUrlForLogging(url),
      method: options.method || 'GET'
    });

    try {
      // Validate URL
      const urlValidation = this.validateUrl(url);
      if (!urlValidation.valid) {
        throw new Error(`Invalid URL: ${urlValidation.error}`);
      }

      // Security checks
      this.performSecurityChecks(url, options);

      // Apply rate limiting
      this.applyRateLimit(url);

      // Prepare request options
      const requestOptions = this.prepareRequestOptions(options);

      // Execute with retry logic
      const result = this.executeWithRetry(url, requestOptions, options);

      this.logger.exitFunction('fetch', {
        success: result.success,
        status_code: result.statusCode,
        attempts: result.attempts
      });

      return result;

    } catch (error) {
      this.logger.error('HTTP fetch failed', {
        url: this.sanitizeUrlForLogging(url),
        error: error.toString()
      });

      return {
        success: false,
        error: error.toString(),
        statusCode: null,
        content: null,
        headers: {},
        attempts: 0
      };
    }
  }

  /**
   * Execute HTTP request with retry logic
   * @param {string} url - Request URL
   * @param {Object} requestOptions - Prepared request options
   * @param {Object} originalOptions - Original options with retry settings
   * @returns {Object} Response object
   */
  executeWithRetry(url, requestOptions, originalOptions = {}) {
    const maxRetries = originalOptions.maxRetries || this.defaultMaxRetries;
    const baseRetryDelay = originalOptions.retryDelay || this.defaultRetryDelay;

    let lastError = null;
    let lastResponse = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.info(`HTTP request attempt ${attempt}/${maxRetries}`, {
          url: this.sanitizeUrlForLogging(url),
          method: requestOptions.method
        });

        // Make the request
        const response = UrlFetchApp.fetch(url, requestOptions);
        const statusCode = response.getResponseCode();
        const content = response.getContentText();
        const headers = response.getAllHeaders();

        lastResponse = {
          success: this.isSuccessfulResponse(statusCode),
          statusCode: statusCode,
          content: content,
          headers: headers,
          attempts: attempt
        };

        // Check if successful
        if (lastResponse.success) {
          if (attempt > 1) {
            this.logger.info('Request succeeded after retry', {
              attempt,
              status_code: statusCode
            });
          }
          return lastResponse;
        }

        // Handle specific error codes
        if (this.shouldRetry(statusCode, attempt, maxRetries)) {
          const retryDelay = this.calculateRetryDelay(attempt, baseRetryDelay, statusCode);
          this.logger.warn(`Request failed, retrying in ${retryDelay}ms`, {
            attempt,
            status_code: statusCode,
            retry_delay: retryDelay
          });

          Utilities.sleep(retryDelay);
          continue;
        } else {
          // Don't retry for client errors
          this.logger.warn('Request failed, not retrying', {
            attempt,
            status_code: statusCode,
            reason: 'client_error'
          });
          return lastResponse;
        }

      } catch (error) {
        lastError = error;

        if (this.isNetworkError(error) && attempt < maxRetries) {
          const retryDelay = this.calculateRetryDelay(attempt, baseRetryDelay);
          this.logger.warn(`Network error, retrying in ${retryDelay}ms`, {
            attempt,
            error: error.toString(),
            retry_delay: retryDelay
          });

          Utilities.sleep(retryDelay);
          continue;
        } else {
          // Non-retryable error or max attempts reached
          break;
        }
      }
    }

    // All attempts failed
    return {
      success: false,
      error: lastError ? lastError.toString() : `HTTP ${lastResponse?.statusCode || 'unknown'}`,
      statusCode: lastResponse?.statusCode || null,
      content: lastResponse?.content || null,
      headers: lastResponse?.headers || {},
      attempts: maxRetries
    };
  }

  /**
   * Prepare request options with security defaults
   * @param {Object} options - Original options
   * @returns {Object} Prepared options
   */
  prepareRequestOptions(options) {
    const clubIdentifier = String(
      getConfigValue('SYSTEM.CLUB_SHORT_NAME', getConfigValue('SYSTEM.CLUB_NAME', 'Club'))
    ).replace(/\s+/g, '') || 'Club';
    const prepared = {
      method: options.method || 'GET',
      headers: {
        'User-Agent': `${clubIdentifier}Automation/${getConfigValue('SYSTEM.VERSION', '6.2.0')}`,
        'Accept': 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate',
        ...options.headers
      },
      muteHttpExceptions: true,
      followRedirects: options.followRedirects !== false,
      validateHttpsCertificates: options.validateHttpsCertificates !== false
    };

    // Add timeout if supported
    if (options.timeout || this.defaultTimeout) {
      prepared.timeout = options.timeout || this.defaultTimeout;
    }

    // Add payload for POST/PUT requests
    if (options.payload) {
      prepared.payload = options.payload;
    }

    // Add content type for JSON payloads
    if (options.json) {
      prepared.headers['Content-Type'] = 'application/json';
      prepared.payload = JSON.stringify(options.json);
    }

    return prepared;
  }

  /**
   * Validate URL for security and format
   * @param {string} url - URL to validate
   * @returns {Object} Validation result
   */
  validateUrl(url) {
    if (!url || typeof url !== 'string') {
      return { valid: false, error: 'URL is required and must be a string' };
    }

    // Check URL format
    try {
      const urlObj = new URL(url);

      // Only allow HTTPS for security (except localhost for testing)
      if (urlObj.protocol !== 'https:' && !url.includes('localhost')) {
        return { valid: false, error: 'Only HTTPS URLs are allowed' };
      }

      // Block private/internal IP ranges
      if (this.isPrivateIpOrDomain(urlObj.hostname)) {
        return { valid: false, error: 'Private/internal URLs are not allowed' };
      }

      return { valid: true };

    } catch (error) {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  /**
   * Check if hostname is private/internal
   * @param {string} hostname - Hostname to check
   * @returns {boolean} True if private/internal
   */
  isPrivateIpOrDomain(hostname) {
    // Allow well-known external services
    const allowedDomains = [
      'hooks.make.com',
      'api.render.com',
      'backboard.railway.app',
      'hooks.slack.com',
      'api.canva.com',
      'googleapis.com',
      'google.com',
      'github.com',
      'githubusercontent.com'
    ];

    if (allowedDomains.some(domain => hostname.includes(domain))) {
      return false;
    }

    // Block localhost and private IPs
    const privatePatterns = [
      /^localhost$/,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/
    ];

    return privatePatterns.some(pattern => pattern.test(hostname));
  }

  /**
   * Perform security checks on request
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   */
  performSecurityChecks(url, options) {
    // Log security-relevant requests
    if (url.includes('webhook') || url.includes('api')) {
      this.logger.security('External API request', {
        url: this.sanitizeUrlForLogging(url),
        method: options.method || 'GET',
        has_payload: !!options.payload
      });
    }

    // Check for sensitive data in headers
    if (options.headers) {
      Object.keys(options.headers).forEach(header => {
        if (header.toLowerCase().includes('authorization') ||
            header.toLowerCase().includes('token') ||
            header.toLowerCase().includes('key')) {
          this.logger.security('Request includes sensitive headers', {
            header: header,
            url: this.sanitizeUrlForLogging(url)
          });
        }
      });
    }

    // Validate payload size
    if (options.payload) {
      const payloadSize = typeof options.payload === 'string'
        ? options.payload.length
        : JSON.stringify(options.payload).length;

      if (payloadSize > 1048576) { // 1MB limit
        throw new Error(`Payload too large: ${payloadSize} bytes`);
      }
    }
  }

  /**
   * Apply rate limiting for URL
   * @param {string} url - Request URL
   */
  applyRateLimit(url) {
    const urlKey = new URL(url).hostname;
    const now = Date.now();
    const lastCall = this.rateLimiter.get(urlKey) || 0;
    const minInterval = 500; // 500ms minimum between calls to same host

    if (now - lastCall < minInterval) {
      const waitTime = minInterval - (now - lastCall);
      this.logger.info(`Rate limiting: waiting ${waitTime}ms`, { hostname: urlKey });
      Utilities.sleep(waitTime);
    }

    this.rateLimiter.set(urlKey, Date.now());
  }

  /**
   * Check if response status indicates success
   * @param {number} statusCode - HTTP status code
   * @returns {boolean} True if successful
   */
  isSuccessfulResponse(statusCode) {
    return statusCode >= 200 && statusCode < 300;
  }

  /**
   * Check if request should be retried
   * @param {number} statusCode - HTTP status code
   * @param {number} attempt - Current attempt number
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {boolean} True if should retry
   */
  shouldRetry(statusCode, attempt, maxRetries) {
    if (attempt >= maxRetries) {
      return false;
    }

    // Retry on server errors and rate limiting
    if (statusCode >= 500 || statusCode === 429 || statusCode === 408) {
      return true;
    }

    // Don't retry on client errors
    return false;
  }

  /**
   * Check if error is a network error
   * @param {Error} error - Error object
   * @returns {boolean} True if network error
   */
  isNetworkError(error) {
    const networkErrorMessages = [
      'network',
      'timeout',
      'connection',
      'dns',
      'unreachable',
      'reset'
    ];

    const errorMessage = error.toString().toLowerCase();
    return networkErrorMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * Calculate retry delay with exponential backoff
   * @param {number} attempt - Current attempt number
   * @param {number} baseDelay - Base delay in milliseconds
   * @param {number} statusCode - HTTP status code (optional)
   * @returns {number} Delay in milliseconds
   */
  calculateRetryDelay(attempt, baseDelay, statusCode) {
    // Exponential backoff with jitter
    let delay = baseDelay * Math.pow(2, attempt - 1);

    // Add jitter (±25%)
    const jitter = delay * 0.25 * (Math.random() - 0.5);
    delay += jitter;

    // Special handling for rate limiting
    if (statusCode === 429) {
      delay = Math.max(delay, 5000); // Minimum 5 seconds for rate limiting
    }

    // Cap the maximum delay
    return Math.min(delay, this.maxRetryDelay);
  }

  /**
   * Sanitize URL for logging (remove sensitive parts)
   * @param {string} url - Original URL
   * @returns {string} Sanitized URL
   */
  sanitizeUrlForLogging(url) {
    try {
      const urlObj = new URL(url);

      // Remove query parameters that might contain sensitive data
      urlObj.search = '';

      // Mask the path if it contains sensitive keywords
      if (urlObj.pathname.includes('webhook') || urlObj.pathname.includes('token')) {
        const pathParts = urlObj.pathname.split('/');
        urlObj.pathname = pathParts.map((part, index) => {
          if (index > 0 && part.length > 10) {
            return part.substring(0, 4) + '***' + part.substring(part.length - 4);
          }
          return part;
        }).join('/');
      }

      return urlObj.toString();
    } catch (error) {
      return '[INVALID_URL]';
    }
  }
}

// ==================== GLOBAL HTTP UTILITIES ====================

/** @type {HttpClient|null} */
let __httpClientInstance = null;

/**
 * Get shared HTTP client instance
 * @returns {HttpClient} HTTP client instance
 */
function getHttpClient() {
  if (!__httpClientInstance) {
    __httpClientInstance = new HttpClient();
  }
  return __httpClientInstance;
}

/**
 * Make robust HTTP GET request
 * @param {string} url - Request URL
 * @param {Object} options - Request options
 * @returns {Object} Response object
 */
function httpGet(url, options = {}) {
  const client = getHttpClient();
  return client.fetch(url, { ...options, method: 'GET' });
}

/**
 * Make robust HTTP POST request
 * @param {string} url - Request URL
 * @param {Object} data - Data to send
 * @param {Object} options - Request options
 * @returns {Object} Response object
 */
function httpPost(url, data, options = {}) {
  const client = getHttpClient();
  return client.fetch(url, {
    ...options,
    method: 'POST',
    json: data
  });
}

/**
 * Make robust HTTP PUT request
 * @param {string} url - Request URL
 * @param {Object} data - Data to send
 * @param {Object} options - Request options
 * @returns {Object} Response object
 */
function httpPut(url, data, options = {}) {
  const client = getHttpClient();
  return client.fetch(url, {
    ...options,
    method: 'PUT',
    json: data
  });
}

/**
 * Make robust HTTP DELETE request
 * @param {string} url - Request URL
 * @param {Object} options - Request options
 * @returns {Object} Response object
 */
function httpDelete(url, options = {}) {
  const client = getHttpClient();
  return client.fetch(url, { ...options, method: 'DELETE' });
}

/**
 * Test HTTP client functionality
 * @returns {Object} Test results
 */
function testHttpClient() {
  const testLogger = logger.scope('HttpClientTest');
  testLogger.enterFunction('testHttpClient');

  const tests = [];

  try {
    // Test 1: Simple GET request
    try {
      const result1 = httpGet('https://httpbin.org/get', { timeout: 10000 });
      tests.push({
        name: 'Simple GET request',
        success: result1.success,
        status_code: result1.statusCode,
        details: result1.success ? 'OK' : result1.error
      });
    } catch (error) {
      tests.push({
        name: 'Simple GET request',
        success: false,
        error: error.toString()
      });
    }

    // Test 2: POST request with JSON
    try {
      const testData = { test: true, timestamp: new Date().toISOString() };
      const result2 = httpPost('https://httpbin.org/post', testData, { timeout: 10000 });
      tests.push({
        name: 'POST request with JSON',
        success: result2.success,
        status_code: result2.statusCode,
        details: result2.success ? 'OK' : result2.error
      });
    } catch (error) {
      tests.push({
        name: 'POST request with JSON',
        success: false,
        error: error.toString()
      });
    }

    // Test 3: URL validation
    try {
      const client = getHttpClient();
      const validation1 = client.validateUrl('https://valid-url.com');
      const validation2 = client.validateUrl('http://invalid-url.com');
      const validation3 = client.validateUrl('https://localhost/test');

      tests.push({
        name: 'URL validation',
        success: validation1.valid && !validation2.valid && !validation3.valid,
        details: `HTTPS valid: ${validation1.valid}, HTTP valid: ${validation2.valid}, localhost valid: ${validation3.valid}`
      });
    } catch (error) {
      tests.push({
        name: 'URL validation',
        success: false,
        error: error.toString()
      });
    }

    const successCount = tests.filter(test => test.success).length;
    const result = {
      success: successCount === tests.length,
      tests: tests,
      summary: `${successCount}/${tests.length} tests passed`
    };

    testLogger.exitFunction('testHttpClient', {
      success: result.success,
      passed: successCount,
      total: tests.length
    });

    return result;

  } catch (error) {
    testLogger.error('HTTP client test failed', { error: error.toString() });
    return {
      success: false,
      error: error.toString(),
      tests: tests
    };
  }
}

/**
 * Get HTTP client status and metrics
 * @returns {Object} Status information
 */
function getHttpClientStatus() {
  const client = getHttpClient();
  return {
    instance_created: !!__httpClientInstance,
    default_timeout: client.defaultTimeout,
    default_max_retries: client.defaultMaxRetries,
    rate_limiter_domains: client.rateLimiter.size,
    version: '6.2.0'
  };
}