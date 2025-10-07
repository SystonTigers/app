
/**
 * @fileoverview Enhanced logging system with performance tracking and audit trails
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Extended logging with scoped loggers, performance timers, and audit capabilities
 * 
 * REPLACE EXISTING logger.js - This contains everything from Script 6.1 plus additional features
 */

// ==================== ENHANCED LOGGER CLASS ====================

/**
 * Enhanced Logger Class with comprehensive features
 */
class Logger {
  
  constructor() {
    this.sessionId = StringUtils.generateId('session');
    this.initTime = Date.now();
    
    this.config = {
      enabled: getConfigValue('LOGGING.ENABLED', true),
      level: getConfigValue('LOGGING.LOG_LEVEL', 'INFO'),
      sheetName: getConfigValue('LOGGING.LOG_SHEET_NAME', 'Logs'),
      maxEntries: getConfigValue('LOGGING.MAX_LOG_ENTRIES', 10000),
      retentionDays: getConfigValue('LOGGING.LOG_RETENTION_DAYS', 30),
      
      levels: {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
      },
      
      currentLevel: 1, // INFO by default
      
      // Enhanced features
      performanceTracking: getConfigValue('LOGGING.PERFORMANCE_TIMING', true),
      auditTrail: getConfigValue('LOGGING.AUDIT_TRAIL', true),
      functionTracking: getConfigValue('LOGGING.FUNCTION_ENTRY_EXIT', true)
    };
    
    this.config.currentLevel = this.config.levels[this.config.level] || 1;
    
    // Performance tracking
    this.timers = new Map();
    this.performanceMetrics = {
      totalCalls: 0,
      totalTime: 0,
      slowQueries: []
    };
    
    // Function call stack
    this.callStack = [];
    
    // Audit trail storage
    this.auditEvents = [];
  }

  // ==================== CORE LOGGING METHODS ====================

  /**
   * Log debug message
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   */
  debug(message, context = {}) {
    this._log('DEBUG', message, context);
  }

  /**
   * Log info message
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   */
  info(message, context = {}) {
    this._log('INFO', message, context);
  }

  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   */
  warn(message, context = {}) {
    this._log('WARN', message, context);
  }

  /**
   * Log error message
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   */
  error(message, context = {}) {
    this._log('ERROR', message, context);
  }

  /**
   * Log function entry
   * @param {string} functionName - Function name
   * @param {Object} params - Function parameters
   */
  enterFunction(functionName, params = {}) {
    if (!this.config.functionTracking) return;
    
    const entry = {
      function: functionName,
      type: 'enter',
      timestamp: Date.now(),
      params: this._sanitizeParams(params)
    };
    
    this.callStack.push(entry);
    this._log('DEBUG', `→ ${functionName}`, { 
      type: 'function_enter',
      depth: this.callStack.length,
      params: entry.params
    });
  }

  /**
   * Log function exit
   * @param {string} functionName - Function name
   * @param {Object} result - Function result
   */
  exitFunction(functionName, result = {}) {
    if (!this.config.functionTracking) return;
    
    // Find matching entry
    const entryIndex = this.callStack.findIndex(entry => 
      entry.function === functionName && entry.type === 'enter'
    );
    
    if (entryIndex !== -1) {
      const entry = this.callStack[entryIndex];
      const duration = Date.now() - entry.timestamp;
      
      // Remove from stack
      this.callStack.splice(entryIndex, 1);
      
      // Log performance if enabled
      if (this.config.performanceTracking) {
        this.performanceMetrics.totalCalls++;
        this.performanceMetrics.totalTime += duration;
        
        // Track slow operations
        if (duration > 5000) { // 5 seconds
          this.performanceMetrics.slowQueries.push({
            function: functionName,
            duration: duration,
            timestamp: DateUtils.formatISO(new Date())
          });
        }
      }
      
      this._log('DEBUG', `← ${functionName}`, {
        type: 'function_exit',
        duration_ms: duration,
        depth: this.callStack.length + 1,
        result: this._sanitizeParams(result)
      });
    }
  }

  // ==================== PERFORMANCE TRACKING ====================

  /**
   * Start performance timer
   * @param {string} operation - Operation name
   * @returns {Object} Timer object
   */
  startTimer(operation) {
    if (!this.config.performanceTracking) {
      return { stop: () => {} };
    }
    
    const startTime = Date.now();
    const timerId = StringUtils.generateId('timer');
    
    this.timers.set(timerId, {
      operation: operation,
      startTime: startTime
    });
    
    return {
      stop: (context = {}) => {
        const timer = this.timers.get(timerId);
        if (timer) {
          const duration = Date.now() - timer.startTime;
          this.timers.delete(timerId);
          
          this._log('DEBUG', `Timer: ${operation}`, {
            type: 'performance_timer',
            operation: operation,
            duration_ms: duration,
            ...context
          });
          
          return duration;
        }
        return 0;
      }
    };
  }

  // ==================== AUDIT TRAIL ====================

  /**
   * Log audit event
   * @param {string} action - Action performed
   * @param {string} entity - Entity affected
   * @param {Object} changes - Changes made
   * @param {string} userId - User performing action
   */
  audit(action, entity, changes = {}, userId = 'system') {
    if (!this.config.auditTrail) return;
    
    const auditEvent = {
      action: action,
      entity: entity,
      changes: changes,
      user_id: userId,
      timestamp: DateUtils.formatISO(DateUtils.now()),
      session_id: this.sessionId
    };
    
    this.auditEvents.push(auditEvent);
    
    this._log('INFO', `AUDIT: ${action} on ${entity}`, {
      type: 'audit_event',
      audit_data: auditEvent
    });
  }

  /**
   * Log security event
   * @param {string} event - Security event type
   * @param {Object} details - Event details
   * @param {string} severity - Severity level
   */
  security(event, details = {}, severity = 'medium') {
    this._log('WARN', `SECURITY: ${event}`, {
      type: 'security_event',
      event: event,
      severity: severity,
      details: details,
      requires_attention: severity === 'high'
    });
  }

  // ==================== SCOPED LOGGERS ====================

  /**
   * Create scoped logger for component
   * @param {string} component - Component name
   * @returns {Object} Scoped logger
   */
  scope(component) {
    const parentLogger = this;
    
    return {
      debug: (message, context = {}) => {
        parentLogger.debug(`[${component}] ${message}`, { ...context, component });
      },
      info: (message, context = {}) => {
        parentLogger.info(`[${component}] ${message}`, { ...context, component });
      },
      warn: (message, context = {}) => {
        parentLogger.warn(`[${component}] ${message}`, { ...context, component });
      },
      error: (message, context = {}) => {
        parentLogger.error(`[${component}] ${message}`, { ...context, component });
      },
      enterFunction: (functionName, params = {}) => {
        parentLogger.enterFunction(`${component}.${functionName}`, params);
      },
      exitFunction: (functionName, result = {}) => {
        parentLogger.exitFunction(`${component}.${functionName}`, result);
      },
      startTimer: (operation) => {
        return parentLogger.startTimer(`${component}.${operation}`);
      },
      audit: (action, entity, changes = {}, userId = 'system') => {
        parentLogger.audit(action, `${component}:${entity}`, changes, userId);
      }
    };
  }

  // ==================== INTERNAL METHODS ====================

  /**
   * Internal logging method
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   * @private
   */
  _log(level, message, context = {}) {
    if (!this.config.enabled) return;
    if (this.config.levels[level] < this.config.currentLevel) return;
    
    try {
      const timestamp = DateUtils.now();
      const logEntry = {
        timestamp: DateUtils.formatISO(timestamp),
        level: level,
        message: message,
        context: JSON.stringify(context),
        session_id: this.sessionId,
        call_stack_depth: this.callStack.length,
        memory_usage: this._estimateMemoryUsage()
      };
      
      // Console output
      this._consoleOutput(level, message, context);
      
      // Sheet logging
      this._logToSheet(logEntry);
      
    } catch (error) {
      console.error('Logging failed:', error);
    }
  }

  /**
   * Output to console with proper formatting
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   * @private
   */
  _consoleOutput(level, message, context) {
    const prefix = `[${level}] ${DateUtils.formatTime(DateUtils.now())}`;
    const fullMessage = `${prefix} ${message}`;
    
    switch (level) {
      case 'DEBUG':
        if (Object.keys(context).length > 0) {
          console.log(fullMessage, context);
        } else {
          console.log(fullMessage);
        }
        break;
      case 'INFO':
        if (Object.keys(context).length > 0) {
          console.info(fullMessage, context);
        } else {
          console.info(fullMessage);
        }
        break;
      case 'WARN':
        if (Object.keys(context).length > 0) {
          console.warn(fullMessage, context);
        } else {
          console.warn(fullMessage);
        }
        break;
      case 'ERROR':
        if (Object.keys(context).length > 0) {
          console.error(fullMessage, context);
        } else {
          console.error(fullMessage);
        }
        break;
    }
  }

  /**
   * Log to Google Sheet
   * @param {Object} logEntry - Log entry data
   * @private
   */
  _logToSheet(logEntry) {
    try {
      const logSheet = SheetUtils.getOrCreateSheet(
        this.config.sheetName,
        ['Timestamp', 'Level', 'Message', 'Context', 'Session ID', 'Stack Depth', 'Memory']
      );

      if (!logSheet) return;

      // Check if we need to clean old entries
      const lastRow = logSheet.getLastRow();
      if (lastRow > this.config.maxEntries) {
        this._cleanOldLogs(logSheet);
      }

      // Add new log entry
      const rowData = [
        logEntry.timestamp,
        logEntry.level,
        logEntry.message,
        logEntry.context,
        logEntry.session_id,
        logEntry.call_stack_depth,
        logEntry.memory_usage
      ];

      const nextRow = logSheet.getLastRow() + 1;
      logSheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);

    } catch (error) {
      console.error('Failed to log to sheet:', error);
    }
  }

  /**
   * Clean old log entries
   * @param {GoogleAppsScript.Spreadsheet.Sheet} logSheet - Log sheet
   * @private
   */
  _cleanOldLogs(logSheet) {
    try {
      const cutoffDate = DateUtils.addDays(DateUtils.now(), -this.config.retentionDays);
      const data = SheetUtils.getAllDataAsObjects(logSheet);
      
      const entriesToKeep = data.filter(entry => {
        const entryDate = new Date(entry.Timestamp);
        return entryDate >= cutoffDate;
      });
      
      // Clear sheet and re-add valid entries
      SheetUtils.clearDataKeepHeaders(logSheet);
      
      entriesToKeep.forEach(entry => {
        SheetUtils.addRowFromObject(logSheet, entry);
      });
      
    } catch (error) {
      console.error('Failed to clean old logs:', error);
    }
  }

  /**
   * Sanitize parameters for logging
   * @param {Object} params - Parameters to sanitize
   * @returns {Object} Sanitized parameters
   * @private
   */
  _sanitizeParams(params) {
    try {
      const sanitized = {};
      
      Object.keys(params).forEach(key => {
        const value = params[key];
        
        // Skip functions and large objects
        if (typeof value === 'function') {
          sanitized[key] = '[Function]';
        } else if (typeof value === 'object' && value !== null) {
          const jsonString = JSON.stringify(value);
          if (jsonString.length > 1000) {
            sanitized[key] = '[Large Object]';
          } else {
            sanitized[key] = value;
          }
        } else if (typeof value === 'string' && value.length > 500) {
          sanitized[key] = value.substring(0, 500) + '...';
        } else {
          sanitized[key] = value;
        }
      });
      
      return sanitized;
    } catch (error) {
      return { error: 'Failed to sanitize params' };
    }
  }

  /**
   * Estimate memory usage
   * @returns {string} Memory usage estimate
   * @private
   */
  _estimateMemoryUsage() {
    // Apps Script doesn't provide direct memory monitoring
    // This is a placeholder for future enhancement
    return 'N/A';
  }

  // ==================== PUBLIC UTILITY METHODS ====================

  /**
   * Get logging statistics
   * @returns {Object} Logging statistics
   */
  getStats() {
    try {
      const logSheet = SheetUtils.getOrCreateSheet(this.config.sheetName);
      
      if (!logSheet) {
        return { error: 'Cannot access log sheet' };
      }
      
      const lastRow = logSheet.getLastRow();
      const data = lastRow > 1 ? 
        logSheet.getRange(2, 1, Math.max(0, lastRow - 1), 7).getValues() : [];
      
      const stats = {
        total_entries: data.length,
        session_entries: data.filter(row => row[4] === this.sessionId).length,
        levels: {},
        recent_errors: [],
        session_id: this.sessionId,
        uptime_ms: Date.now() - this.initTime,
        performance: this.performanceMetrics
      };
      
      // Count by levels
      data.forEach(row => {
        const level = row[1];
        stats.levels[level] = (stats.levels[level] || 0) + 1;
        
        // Collect recent errors
        if (level === 'ERROR' && stats.recent_errors.length < 5) {
          stats.recent_errors.push({
            timestamp: row[0],
            message: row[2],
            context: row[3]
          });
        }
      });
      
      return stats;
    } catch (error) {
      return {
        error: 'Failed to get logging stats',
        details: error.toString()
      };
    }
  }

  /**
   * Set log level
   * @param {string|number} level - New log level
   * @returns {boolean} Success status
   */
  setLevel(level) {
    try {
      if (typeof level === 'string') {
        level = this.config.levels[level.toUpperCase()];
      }
      
      if (typeof level === 'number' && level >= 0 && level <= 3) {
        this.config.currentLevel = level;
        this.info('Log level changed', { new_level: level });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to set log level:', error);
      return false;
    }
  }

  /**
   * Export logs for external analysis
   * @param {number} days - Number of days to export
   * @returns {Array} Log entries
   */
  exportLogs(days = 7) {
    try {
      const logSheet = SheetUtils.getOrCreateSheet(this.config.sheetName);
      
      if (!logSheet) {
        return [];
      }
      
      const cutoffDate = DateUtils.addDays(DateUtils.now(), -days);
      const data = SheetUtils.getAllDataAsObjects(logSheet);
      
      return data.filter(entry => {
        const entryDate = new Date(entry.Timestamp);
        return entryDate >= cutoffDate;
      });
    } catch (error) {
      console.error('Failed to export logs:', error);
      return [];
    }
  }

  /**
   * Format duration for human readability
   * @param {number} milliseconds - Duration in milliseconds
   * @returns {string} Formatted duration
   * @private
   */
  _formatDuration(milliseconds) {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    } else if (milliseconds < 60000) {
      return `${(milliseconds / 1000).toFixed(2)}s`;
    } else {
      const minutes = Math.floor(milliseconds / 60000);
      const seconds = ((milliseconds % 60000) / 1000).toFixed(0);
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Clear all logs
   * @returns {boolean} Success status
   */
  clearLogs() {
    try {
      const logSheet = SheetUtils.getOrCreateSheet(this.config.sheetName);
      if (logSheet) {
        SheetUtils.clearDataKeepHeaders(logSheet);
        this.info('Logs cleared', { cleared_by: 'system' });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to clear logs:', error);
      return false;
    }
  }
}

// ==================== GLOBAL LOGGER INSTANCE ====================

/**
 * Global logger instance (lazy initialized)
 */
let _loggerInstance = null;

/**
 * Get or create the global logger instance
 * @returns {Logger} Logger instance
 */
function getLogger() {
  if (!_loggerInstance) {
    try {
      _loggerInstance = new Logger();
    } catch (error) {
      // Fallback logger if initialization fails
      console.warn('Logger initialization failed, using fallback:', error);
      _loggerInstance = {
        scope: function(name) {
          return {
            info: function(msg, data) { console.log(`[${name}] ${msg}`, data || ''); },
            warn: function(msg, data) { console.warn(`[${name}] ${msg}`, data || ''); },
            error: function(msg, data) { console.error(`[${name}] ${msg}`, data || ''); },
            debug: function(msg, data) { console.log(`[DEBUG ${name}] ${msg}`, data || ''); },
            enterFunction: function(fn, data) { console.log(`[${name}] → ${fn}`, data || ''); },
            exitFunction: function(fn, data) { console.log(`[${name}] ← ${fn}`, data || ''); }
          };
        },
        info: function(msg, data) { console.log(msg, data || ''); },
        warn: function(msg, data) { console.warn(msg, data || ''); },
        error: function(msg, data) { console.error(msg, data || ''); },
        debug: function(msg, data) { console.log(`[DEBUG] ${msg}`, data || ''); },
        enterFunction: function(fn, data) { console.log(`→ ${fn}`, data || ''); },
        exitFunction: function(fn, data) { console.log(`← ${fn}`, data || ''); }
      };
    }
  }
  return _loggerInstance;
}

/**
 * Global logger instance (property getter)
 */
const logger = {
  get scope() { return getLogger().scope.bind(getLogger()); },
  get info() { return getLogger().info.bind(getLogger()); },
  get warn() { return getLogger().warn.bind(getLogger()); },
  get error() { return getLogger().error.bind(getLogger()); },
  get debug() { return getLogger().debug.bind(getLogger()); },
  get enterFunction() { return getLogger().enterFunction.bind(getLogger()); },
  get exitFunction() { return getLogger().exitFunction.bind(getLogger()); },
  get performance() { return getLogger().performance.bind(getLogger()); },
  get audit() { return getLogger().audit.bind(getLogger()); },
  get security() { return getLogger().security.bind(getLogger()); },
  get getStats() { return getLogger().getStats.bind(getLogger()); },
  get sessionId() { return getLogger().sessionId; },
  get config() { return getLogger().config; },
  get _formatDuration() { return getLogger()._formatDuration.bind(getLogger()); },
  get _cleanOldLogs() { return getLogger()._cleanOldLogs.bind(getLogger()); }
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Log system startup
 */
function logSystemStartup() {
  logger.info('System startup', {
    type: 'system_startup',
    version: getConfigValue('SYSTEM.VERSION'),
    environment: getConfigValue('SYSTEM.ENVIRONMENT'),
    timezone: getConfigValue('SYSTEM.TIMEZONE'),
    features_enabled: Object.entries(getConfigValue('FEATURES', {}))
      .filter(([key, value]) => value === true)
      .map(([key]) => key)
  });
}

/**
 * Log system shutdown
 */
function logSystemShutdown() {
  const stats = logger.getStats();
  logger.info('System shutdown', {
    type: 'system_shutdown',
    session_duration_ms: stats.uptime_ms,
    session_duration_readable: logger._formatDuration(stats.uptime_ms),
    logs_generated: stats.session_entries
  });
}

/**
 * Create audit trail entry
 * @param {string} action - Action performed
 * @param {string} entity - Entity affected
 * @param {Object} changes - Changes made
 * @param {string} userId - User ID (optional)
 */
function auditTrail(action, entity, changes = {}, userId = 'system') {
  logger.audit(action, entity, changes, userId);
}

/**
 * Log security event
 * @param {string} event - Security event type
 * @param {Object} details - Event details
 */
function securityLog(event, details = {}) {
  logger.security(event, details);
}

// ==================== INITIALIZATION ====================

/**
 * Initialize logging system
 * @returns {Object} Initialization result
 */
function initializeLogger() {
  try {
    logSystemStartup();
    
    // Setup cleanup schedule
    const cleanupTrigger = ScriptApp.getProjectTriggers()
      .find(trigger => trigger.getHandlerFunction() === 'scheduledLogCleanup');
    
    if (!cleanupTrigger) {
      ScriptApp.newTrigger('scheduledLogCleanup')
        .timeBased()
        .everyDays(1)
        .atHour(2) // 2 AM cleanup
        .create();
    }
    
    return {
      success: true,
      session_id: logger.sessionId,
      version: '6.2.0',
      features: {
        performance_tracking: logger.config.performanceTracking,
        audit_trail: logger.config.auditTrail,
        function_tracking: logger.config.functionTracking
      }
    };
    
  } catch (error) {
    console.error('Logger initialization failed:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Scheduled log cleanup function
 */
function scheduledLogCleanup() {
  try {
    const logSheet = SheetUtils.getOrCreateSheet(logger.config.sheetName);
    if (logSheet) {
      logger._cleanOldLogs(logSheet);
      logger.info('Scheduled log cleanup completed');
    }
  } catch (error) {
    logger.error('Scheduled log cleanup failed', { error: error.toString() });
  }
}

