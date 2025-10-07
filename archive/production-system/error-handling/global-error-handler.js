import winston from 'winston';
import nodemailer from 'nodemailer';
import { EventEmitter } from 'events';

class GlobalErrorHandler extends EventEmitter {
  constructor(logger, alertConfig, metricsCollector) {
    super();

    this.logger = logger || winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' })
      ]
    });

    this.metrics = metricsCollector;
    this.alertConfig = alertConfig || {};
    this.errorCounts = new Map();
    this.circuitBreakers = new Map();
    this.retryQueues = new Map();

    // Email transporter for critical alerts
    this.emailTransporter = alertConfig.email ?
      nodemailer.createTransporter(alertConfig.email) : null;

    // Initialize error tracking
    this.initializeErrorTracking();

    // Set up process handlers
    this.setupProcessHandlers();
  }

  initializeErrorTracking() {
    // Clean error counts every hour
    setInterval(() => {
      this.cleanOldErrorCounts();
    }, 3600000); // 1 hour

    // Reset circuit breakers every 5 minutes if conditions allow
    setInterval(() => {
      this.checkCircuitBreakerRecovery();
    }, 300000); // 5 minutes

    // Process retry queues every minute
    setInterval(() => {
      this.processRetryQueues();
    }, 60000); // 1 minute
  }

  setupProcessHandlers() {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.handleCriticalError('uncaughtException', error);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      const error = new Error(`Unhandled Promise Rejection: ${reason}`);
      error.promise = promise;
      this.handleCriticalError('unhandledRejection', error);
    });

    // Handle SIGTERM gracefully
    process.on('SIGTERM', () => {
      this.logger.info('Received SIGTERM, initiating graceful shutdown');
      this.gracefulShutdown();
    });

    // Handle SIGINT gracefully
    process.on('SIGINT', () => {
      this.logger.info('Received SIGINT, initiating graceful shutdown');
      this.gracefulShutdown();
    });
  }

  // Main error handling method
  handleError(error, context = {}) {
    const errorInfo = this.enrichErrorInfo(error, context);
    const severity = this.determineSeverity(error, context);

    // Log the error
    this.logError(errorInfo, severity);

    // Track metrics
    if (this.metrics) {
      this.updateErrorMetrics(errorInfo, severity);
    }

    // Increment error count for circuit breaker logic
    this.incrementErrorCount(errorInfo.type || 'unknown', errorInfo.service || 'unknown');

    // Handle based on severity
    switch (severity) {
      case 'critical':
        this.handleCriticalError(errorInfo.type, error, context);
        break;
      case 'high':
        this.handleHighSeverityError(errorInfo.type, error, context);
        break;
      case 'medium':
        this.handleMediumSeverityError(errorInfo.type, error, context);
        break;
      case 'low':
        this.handleLowSeverityError(errorInfo.type, error, context);
        break;
      default:
        this.handleUnknownError(error, context);
    }

    // Check if circuit breaker should be triggered
    this.checkCircuitBreaker(errorInfo.service || 'unknown', errorInfo.type);

    // Emit error event for other components to handle
    this.emit('error', { error, context, severity, errorInfo });

    return {
      handled: true,
      severity,
      errorId: errorInfo.id,
      recovery: errorInfo.recovery
    };
  }

  enrichErrorInfo(error, context) {
    const errorId = this.generateErrorId();
    const timestamp = new Date().toISOString();

    return {
      id: errorId,
      timestamp,
      message: error.message,
      stack: error.stack,
      type: this.classifyError(error),
      service: context.service || 'unknown',
      userId: context.userId,
      jobId: context.jobId,
      requestId: context.requestId,
      userAgent: context.userAgent,
      ip: context.ip,
      url: context.url,
      method: context.method,
      parameters: context.parameters,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || 'unknown',
      recovery: this.determineRecoveryStrategy(error, context)
    };
  }

  classifyError(error) {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorName = error.name?.toLowerCase() || '';

    // Network/API errors
    if (errorMessage.includes('network') || errorMessage.includes('timeout') ||
        errorMessage.includes('econnrefused') || errorMessage.includes('enotfound')) {
      return 'network_error';
    }

    // Database errors
    if (errorMessage.includes('database') || errorMessage.includes('connection') ||
        errorMessage.includes('query') || errorName.includes('sequelize')) {
      return 'database_error';
    }

    // File system errors
    if (errorMessage.includes('enoent') || errorMessage.includes('file') ||
        errorMessage.includes('directory') || errorName.includes('fs')) {
      return 'filesystem_error';
    }

    // Video processing errors
    if (errorMessage.includes('ffmpeg') || errorMessage.includes('video') ||
        errorMessage.includes('codec') || errorMessage.includes('processing')) {
      return 'video_processing_error';
    }

    // API quota/rate limit errors
    if (errorMessage.includes('quota') || errorMessage.includes('rate limit') ||
        errorMessage.includes('too many requests')) {
      return 'api_quota_error';
    }

    // YouTube API errors
    if (errorMessage.includes('youtube') || errorMessage.includes('google api')) {
      return 'youtube_api_error';
    }

    // Drive API errors
    if (errorMessage.includes('drive') || errorMessage.includes('google drive')) {
      return 'drive_api_error';
    }

    // Memory errors
    if (errorMessage.includes('memory') || errorMessage.includes('heap')) {
      return 'memory_error';
    }

    // Authentication errors
    if (errorMessage.includes('auth') || errorMessage.includes('permission') ||
        errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
      return 'auth_error';
    }

    // Validation errors
    if (errorMessage.includes('validation') || errorMessage.includes('invalid') ||
        errorName.includes('validation')) {
      return 'validation_error';
    }

    return 'unknown_error';
  }

  determineSeverity(error, context) {
    const errorType = this.classifyError(error);

    // Critical errors that can bring down the system
    if (errorType === 'memory_error' ||
        error.name === 'Error' && error.message.includes('Cannot read property')) {
      return 'critical';
    }

    // High severity - affects core functionality
    if (errorType === 'database_error' ||
        errorType === 'video_processing_error' ||
        error.code === 'ECONNREFUSED') {
      return 'high';
    }

    // Medium severity - affects some functionality
    if (errorType === 'network_error' ||
        errorType === 'api_quota_error' ||
        errorType === 'youtube_api_error' ||
        errorType === 'drive_api_error') {
      return 'medium';
    }

    // Low severity - minor issues
    if (errorType === 'validation_error' ||
        errorType === 'filesystem_error') {
      return 'low';
    }

    // Check context for severity indicators
    if (context.critical) return 'critical';
    if (context.userFacing) return 'medium';

    return 'low';
  }

  determineRecoveryStrategy(error, context) {
    const errorType = this.classifyError(error);

    const strategies = {
      network_error: 'retry_with_backoff',
      api_quota_error: 'wait_and_retry',
      youtube_api_error: 'retry_with_fallback',
      drive_api_error: 'retry_with_fallback',
      video_processing_error: 'retry_with_different_params',
      database_error: 'reconnect_and_retry',
      filesystem_error: 'recreate_and_retry',
      memory_error: 'restart_process',
      auth_error: 'refresh_credentials',
      validation_error: 'sanitize_and_retry',
      unknown_error: 'log_and_continue'
    };

    return strategies[errorType] || 'log_and_continue';
  }

  logError(errorInfo, severity) {
    const logLevel = severity === 'critical' ? 'error' :
                    severity === 'high' ? 'error' :
                    severity === 'medium' ? 'warn' : 'info';

    this.logger[logLevel]('Application error occurred', {
      errorId: errorInfo.id,
      type: errorInfo.type,
      message: errorInfo.message,
      severity,
      service: errorInfo.service,
      userId: errorInfo.userId,
      jobId: errorInfo.jobId,
      stack: errorInfo.stack,
      recovery: errorInfo.recovery,
      context: {
        url: errorInfo.url,
        method: errorInfo.method,
        userAgent: errorInfo.userAgent
      }
    });
  }

  updateErrorMetrics(errorInfo, severity) {
    // Update general error metrics
    this.metrics.trackUserError(errorInfo.type);

    // Update API-specific metrics
    if (errorInfo.type === 'youtube_api_error') {
      this.metrics.trackYouTubeAPIError(errorInfo.message);
    } else if (errorInfo.type === 'drive_api_error') {
      this.metrics.trackDriveAPIError(errorInfo.message);
    }

    // Track critical errors separately
    if (severity === 'critical') {
      this.emit('criticalError', errorInfo);
    }
  }

  // Specific error handlers
  handleCriticalError(type, error, context = {}) {
    this.logger.error('CRITICAL ERROR DETECTED', {
      type,
      message: error.message,
      stack: error.stack,
      context
    });

    // Send immediate alert
    this.sendCriticalAlert(type, error, context);

    // For certain critical errors, initiate shutdown
    if (type === 'uncaughtException' || type === 'memory_error') {
      setTimeout(() => {
        this.logger.error('Shutting down due to critical error');
        process.exit(1);
      }, 5000); // Give 5 seconds for cleanup
    }
  }

  handleHighSeverityError(type, error, context) {
    this.logger.error('High severity error', { type, message: error.message, context });

    // Attempt recovery based on error type
    this.attemptRecovery(error, context);

    // Send alert to team
    this.sendHighSeverityAlert(type, error, context);
  }

  handleMediumSeverityError(type, error, context) {
    this.logger.warn('Medium severity error', { type, message: error.message, context });

    // Add to retry queue if applicable
    if (this.shouldRetry(error, context)) {
      this.addToRetryQueue(error, context);
    }

    // Notify monitoring systems
    this.emit('mediumSeverityError', { type, error, context });
  }

  handleLowSeverityError(type, error, context) {
    this.logger.info('Low severity error', { type, message: error.message, context });

    // Just track for patterns
    this.emit('lowSeverityError', { type, error, context });
  }

  handleUnknownError(error, context) {
    this.logger.warn('Unknown error type', {
      message: error.message,
      stack: error.stack,
      context
    });

    this.emit('unknownError', { error, context });
  }

  // Recovery mechanisms
  attemptRecovery(error, context) {
    const recovery = this.determineRecoveryStrategy(error, context);

    switch (recovery) {
      case 'retry_with_backoff':
        this.retryWithBackoff(error, context);
        break;
      case 'retry_with_fallback':
        this.retryWithFallback(error, context);
        break;
      case 'reconnect_and_retry':
        this.reconnectAndRetry(error, context);
        break;
      case 'refresh_credentials':
        this.refreshCredentials(error, context);
        break;
      default:
        this.logger.info('No automatic recovery available', { recovery });
    }
  }

  retryWithBackoff(error, context, attempt = 1) {
    if (attempt > 3) {
      this.logger.error('Max retry attempts reached', { error: error.message, context });
      return;
    }

    const backoffDelay = Math.pow(2, attempt) * 1000; // Exponential backoff

    setTimeout(() => {
      this.logger.info('Retrying operation with backoff', {
        attempt,
        delay: backoffDelay,
        operation: context.operation
      });

      // Emit retry event for the original caller to handle
      this.emit('retryOperation', { error, context, attempt });
    }, backoffDelay);
  }

  retryWithFallback(error, context) {
    this.logger.info('Attempting fallback strategy', {
      error: error.message,
      fallback: context.fallback
    });

    this.emit('attemptFallback', { error, context });
  }

  reconnectAndRetry(error, context) {
    this.logger.info('Attempting to reconnect', { service: context.service });
    this.emit('reconnectService', { error, context });
  }

  refreshCredentials(error, context) {
    this.logger.info('Refreshing credentials', { service: context.service });
    this.emit('refreshCredentials', { error, context });
  }

  // Circuit breaker implementation
  incrementErrorCount(errorType, service) {
    const key = `${service}:${errorType}`;
    const count = this.errorCounts.get(key) || { count: 0, firstError: Date.now() };
    count.count++;
    this.errorCounts.set(key, count);
  }

  checkCircuitBreaker(service, errorType) {
    const key = `${service}:${errorType}`;
    const errorCount = this.errorCounts.get(key);

    if (!errorCount) return;

    // Circuit breaker thresholds
    const threshold = 5; // 5 errors
    const timeWindow = 300000; // 5 minutes

    if (errorCount.count >= threshold) {
      const timeSinceFirst = Date.now() - errorCount.firstError;

      if (timeSinceFirst <= timeWindow) {
        this.triggerCircuitBreaker(service, errorType);
      }
    }
  }

  triggerCircuitBreaker(service, errorType) {
    const key = `${service}:${errorType}`;

    if (this.circuitBreakers.has(key)) return; // Already triggered

    this.circuitBreakers.set(key, {
      triggeredAt: Date.now(),
      service,
      errorType,
      state: 'open'
    });

    this.logger.warn('Circuit breaker triggered', { service, errorType });
    this.emit('circuitBreakerTriggered', { service, errorType });

    // Send alert
    this.sendCircuitBreakerAlert(service, errorType);
  }

  checkCircuitBreakerRecovery() {
    const recoveryTime = 300000; // 5 minutes

    for (const [key, breaker] of this.circuitBreakers) {
      const timeSinceTriggered = Date.now() - breaker.triggeredAt;

      if (timeSinceTriggered >= recoveryTime) {
        // Move to half-open state for testing
        if (breaker.state === 'open') {
          breaker.state = 'half-open';
          this.logger.info('Circuit breaker moved to half-open', {
            service: breaker.service,
            errorType: breaker.errorType
          });
        }
      }
    }
  }

  isCircuitBreakerOpen(service, errorType) {
    const key = `${service}:${errorType}`;
    const breaker = this.circuitBreakers.get(key);
    return breaker && breaker.state === 'open';
  }

  // Retry queue management
  addToRetryQueue(error, context) {
    const queueKey = context.operation || 'default';

    if (!this.retryQueues.has(queueKey)) {
      this.retryQueues.set(queueKey, []);
    }

    const retryItem = {
      error,
      context,
      addedAt: Date.now(),
      attempts: 0,
      maxAttempts: context.maxRetries || 3
    };

    this.retryQueues.get(queueKey).push(retryItem);

    this.logger.info('Added to retry queue', {
      queue: queueKey,
      queueSize: this.retryQueues.get(queueKey).length
    });
  }

  processRetryQueues() {
    for (const [queueKey, queue] of this.retryQueues) {
      if (queue.length === 0) continue;

      // Process items that are ready for retry
      const readyItems = queue.filter(item => {
        const waitTime = Math.pow(2, item.attempts) * 60000; // Exponential backoff in minutes
        return Date.now() - item.addedAt >= waitTime;
      });

      readyItems.forEach(item => {
        if (item.attempts >= item.maxAttempts) {
          // Remove from queue - max attempts reached
          const index = queue.indexOf(item);
          if (index > -1) queue.splice(index, 1);

          this.logger.error('Max retry attempts reached, giving up', {
            queue: queueKey,
            error: item.error.message,
            attempts: item.attempts
          });

          return;
        }

        item.attempts++;
        this.logger.info('Processing retry queue item', {
          queue: queueKey,
          attempt: item.attempts,
          maxAttempts: item.maxAttempts
        });

        this.emit('retryQueueItem', { item, queueKey });
      });
    }
  }

  shouldRetry(error, context) {
    const retryableErrors = [
      'network_error',
      'api_quota_error',
      'youtube_api_error',
      'drive_api_error'
    ];

    const errorType = this.classifyError(error);
    return retryableErrors.includes(errorType) && !this.isCircuitBreakerOpen(context.service, errorType);
  }

  // Alert methods
  async sendCriticalAlert(type, error, context) {
    const alert = {
      level: 'CRITICAL',
      type,
      message: error.message,
      timestamp: new Date().toISOString(),
      service: context.service || 'unknown',
      stack: error.stack,
      context
    };

    this.logger.error('CRITICAL ALERT', alert);

    if (this.emailTransporter && this.alertConfig.criticalEmails) {
      try {
        await this.emailTransporter.sendMail({
          from: this.alertConfig.fromEmail,
          to: this.alertConfig.criticalEmails,
          subject: `🚨 CRITICAL ERROR: ${type} - ${context.service || 'Football Highlights'}`,
          html: this.formatCriticalAlertEmail(alert)
        });
      } catch (emailError) {
        this.logger.error('Failed to send critical alert email', emailError);
      }
    }

    // Webhook notifications
    if (this.alertConfig.webhookUrl) {
      this.sendWebhookAlert(alert);
    }
  }

  async sendHighSeverityAlert(type, error, context) {
    if (this.alertConfig.highSeverityEmails) {
      const alert = {
        level: 'HIGH',
        type,
        message: error.message,
        timestamp: new Date().toISOString(),
        service: context.service || 'unknown'
      };

      try {
        await this.emailTransporter.sendMail({
          from: this.alertConfig.fromEmail,
          to: this.alertConfig.highSeverityEmails,
          subject: `⚠️ High Severity Error: ${type}`,
          html: this.formatHighSeverityAlertEmail(alert)
        });
      } catch (emailError) {
        this.logger.error('Failed to send high severity alert email', emailError);
      }
    }
  }

  async sendCircuitBreakerAlert(service, errorType) {
    const alert = {
      level: 'WARNING',
      type: 'circuit_breaker_triggered',
      message: `Circuit breaker triggered for ${service}:${errorType}`,
      timestamp: new Date().toISOString(),
      service
    };

    if (this.emailTransporter && this.alertConfig.alertEmails) {
      try {
        await this.emailTransporter.sendMail({
          from: this.alertConfig.fromEmail,
          to: this.alertConfig.alertEmails,
          subject: `🔌 Circuit Breaker Triggered: ${service}`,
          html: this.formatCircuitBreakerAlertEmail(alert, service, errorType)
        });
      } catch (emailError) {
        this.logger.error('Failed to send circuit breaker alert email', emailError);
      }
    }
  }

  formatCriticalAlertEmail(alert) {
    return `
      <h2 style="color: red;">🚨 CRITICAL ERROR ALERT</h2>
      <p><strong>Time:</strong> ${alert.timestamp}</p>
      <p><strong>Service:</strong> ${alert.service}</p>
      <p><strong>Type:</strong> ${alert.type}</p>
      <p><strong>Message:</strong> ${alert.message}</p>
      <h3>Stack Trace:</h3>
      <pre style="background: #f5f5f5; padding: 10px; overflow-x: auto;">
${alert.stack}
      </pre>
      <p><em>This requires immediate attention.</em></p>
    `;
  }

  formatHighSeverityAlertEmail(alert) {
    return `
      <h2 style="color: orange;">⚠️ High Severity Error</h2>
      <p><strong>Time:</strong> ${alert.timestamp}</p>
      <p><strong>Service:</strong> ${alert.service}</p>
      <p><strong>Type:</strong> ${alert.type}</p>
      <p><strong>Message:</strong> ${alert.message}</p>
      <p><em>Please investigate when possible.</em></p>
    `;
  }

  formatCircuitBreakerAlertEmail(alert, service, errorType) {
    return `
      <h2 style="color: orange;">🔌 Circuit Breaker Triggered</h2>
      <p><strong>Time:</strong> ${alert.timestamp}</p>
      <p><strong>Service:</strong> ${service}</p>
      <p><strong>Error Type:</strong> ${errorType}</p>
      <p>The circuit breaker has been triggered due to repeated errors. The service will be temporarily disabled.</p>
      <p><em>The system will attempt to recover automatically in 5 minutes.</em></p>
    `;
  }

  async sendWebhookAlert(alert) {
    if (!this.alertConfig.webhookUrl) return;

    try {
      await fetch(this.alertConfig.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert)
      });
    } catch (error) {
      this.logger.error('Failed to send webhook alert', error);
    }
  }

  // Utility methods
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  cleanOldErrorCounts() {
    const oneHourAgo = Date.now() - 3600000;

    for (const [key, errorCount] of this.errorCounts) {
      if (errorCount.firstError < oneHourAgo) {
        this.errorCounts.delete(key);
      }
    }
  }

  gracefulShutdown() {
    this.logger.info('Initiating graceful shutdown');

    // Close connections, save state, etc.
    this.emit('shutdown');

    setTimeout(() => {
      this.logger.info('Graceful shutdown complete');
      process.exit(0);
    }, 10000); // Give 10 seconds for cleanup
  }

  // Public API
  getErrorStats() {
    const stats = {
      errorCounts: Object.fromEntries(this.errorCounts),
      circuitBreakers: Array.from(this.circuitBreakers.values()),
      retryQueues: {}
    };

    for (const [queueKey, queue] of this.retryQueues) {
      stats.retryQueues[queueKey] = {
        size: queue.length,
        oldestItem: queue[0]?.addedAt,
        averageAttempts: queue.length > 0 ?
          queue.reduce((sum, item) => sum + item.attempts, 0) / queue.length : 0
      };
    }

    return stats;
  }

  clearCircuitBreaker(service, errorType) {
    const key = `${service}:${errorType}`;
    const removed = this.circuitBreakers.delete(key);

    if (removed) {
      this.logger.info('Circuit breaker manually cleared', { service, errorType });
    }

    return removed;
  }

  clearRetryQueue(queueKey) {
    const queue = this.retryQueues.get(queueKey);
    if (queue) {
      const count = queue.length;
      this.retryQueues.set(queueKey, []);
      this.logger.info('Retry queue cleared', { queueKey, itemsRemoved: count });
      return count;
    }
    return 0;
  }
}

export { GlobalErrorHandler };