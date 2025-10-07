/**
 * @fileoverview Logging system for SystonAutomationLib
 * @version 1.0.0
 * @description Centralized logging with sheet persistence
 */

/**
 * Log a message to both console and System_Log sheet
 * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR)
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 */
function SA_log_(level, message, data) {
  try {
    const timestamp = new Date();
    const component = SA_getCallerComponent_();

    // Always log to console
    const logData = data ? JSON.stringify(data) : '';
    const fullMessage = `[${level}] [${component}] ${message} ${logData}`;

    switch (level) {
      case 'DEBUG':
        console.log(fullMessage);
        break;
      case 'INFO':
        console.log(fullMessage);
        break;
      case 'WARN':
        console.warn(fullMessage);
        break;
      case 'ERROR':
        console.error(fullMessage);
        break;
      default:
        console.log(fullMessage);
    }

    // Log to sheet (with error handling)
    try {
      SA_logToSheet_(timestamp, level, component, message, data);
    } catch (sheetError) {
      // Don't break execution if sheet logging fails
      console.warn('Sheet logging failed:', sheetError.toString());
    }

  } catch (error) {
    // Fallback to console only
    console.error('Logging system error:', error.toString());
  }
}

/**
 * Log to the System_Log sheet
 * @param {Date} timestamp - Log timestamp
 * @param {string} level - Log level
 * @param {string} component - Component name
 * @param {string} message - Log message
 * @param {Object} data - Additional data
 * @private
 */
function SA_logToSheet_(timestamp, level, component, message, data) {
  try {
    const ss = SpreadsheetApp.getActive();
    let logSheet = ss.getSheetByName('System_Log');

    if (!logSheet) {
      // Create log sheet if it doesn't exist
      logSheet = ss.insertSheet('System_Log');
      logSheet.getRange(1, 1, 1, 5).setValues([
        ['Timestamp', 'Level', 'Component', 'Message', 'Data']
      ]);

      // Format header
      const headerRange = logSheet.getRange(1, 1, 1, 5);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#e8f0fe');
    }

    // Prepare data for logging
    const dataString = data ? JSON.stringify(data).substring(0, 1000) : ''; // Limit data size

    // Add log entry
    logSheet.appendRow([
      timestamp,
      level,
      component,
      message,
      dataString
    ]);

    // Keep log size manageable (this runs periodically via cleanup)
    const maxRows = 1000;
    const currentRows = logSheet.getLastRow();
    if (currentRows > maxRows + 100) { // +100 buffer before cleanup
      // This will be handled by periodic cleanup, not on every log
    }

  } catch (error) {
    // Silent fail - don't break the application
    console.warn('Failed to log to sheet:', error.toString());
  }
}

/**
 * Get the component name from the call stack
 * @return {string} Component name
 * @private
 */
function SA_getCallerComponent_() {
  try {
    // Try to determine component from stack trace
    const stack = new Error().stack;
    if (stack) {
      const lines = stack.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('SA_') && !line.includes('SA_log_') && !line.includes('SA_getCallerComponent_')) {
          // Extract function name
          const match = line.match(/SA_(\w+)_?/);
          if (match) {
            return match[1];
          }
        }
      }
    }
    return 'Library';
  } catch (error) {
    return 'Unknown';
  }
}

/**
 * Get recent log entries
 * @param {number} limit - Number of entries to return
 * @param {string} level - Optional level filter
 * @return {Array} Log entries
 */
function SA_getRecentLogs_(limit = 50, level = null) {
  try {
    const ss = SpreadsheetApp.getActive();
    const logSheet = ss.getSheetByName('System_Log');

    if (!logSheet) {
      return [];
    }

    const lastRow = logSheet.getLastRow();
    if (lastRow <= 1) {
      return [];
    }

    // Get recent entries
    const startRow = Math.max(2, lastRow - limit + 1);
    const numRows = lastRow - startRow + 1;

    if (numRows <= 0) {
      return [];
    }

    const data = logSheet.getRange(startRow, 1, numRows, 5).getValues();

    // Convert to objects and filter by level if specified
    const logs = data.map(row => ({
      timestamp: row[0],
      level: row[1],
      component: row[2],
      message: row[3],
      data: row[4]
    }));

    if (level) {
      return logs.filter(log => log.level === level);
    }

    return logs.reverse(); // Most recent first

  } catch (error) {
    SA_log_('ERROR', 'Failed to get recent logs', { error: error.toString() });
    return [];
  }
}

/**
 * Clear old log entries
 * @param {number} keepCount - Number of recent entries to keep
 * @return {Object} Cleanup result
 */
function SA_clearOldLogs_(keepCount = 1000) {
  try {
    const ss = SpreadsheetApp.getActive();
    const logSheet = ss.getSheetByName('System_Log');

    if (!logSheet) {
      return { success: true, message: 'No log sheet found' };
    }

    const lastRow = logSheet.getLastRow();
    if (lastRow <= keepCount + 1) { // +1 for header
      return { success: true, message: 'No cleanup needed' };
    }

    const rowsToDelete = lastRow - keepCount - 1; // -1 for header
    logSheet.deleteRows(2, rowsToDelete); // Start from row 2 (after header)

    SA_log_('INFO', 'Log cleanup completed', {
      deletedRows: rowsToDelete,
      remainingRows: keepCount
    });

    return {
      success: true,
      deletedRows: rowsToDelete,
      remainingRows: keepCount
    };

  } catch (error) {
    SA_log_('ERROR', 'Log cleanup failed', { error: error.toString() });
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Export logs to a downloadable format
 * @param {number} days - Number of days to export
 * @return {Object} Export result with data
 */
function SA_exportLogs_(days = 7) {
  try {
    const ss = SpreadsheetApp.getActive();
    const logSheet = ss.getSheetByName('System_Log');

    if (!logSheet) {
      return { success: false, error: 'No log sheet found' };
    }

    const data = logSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: true, logs: [] };
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Filter logs by date
    const filteredLogs = data.slice(1) // Skip header
      .filter(row => row[0] instanceof Date && row[0] >= cutoffDate)
      .map(row => ({
        timestamp: row[0],
        level: row[1],
        component: row[2],
        message: row[3],
        data: row[4]
      }));

    return {
      success: true,
      logs: filteredLogs,
      exportDate: new Date().toISOString(),
      daysCovered: days
    };

  } catch (error) {
    SA_log_('ERROR', 'Log export failed', { error: error.toString() });
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Get log statistics
 * @return {Object} Log statistics
 */
function SA_getLogStats_() {
  try {
    const logs = SA_getRecentLogs_(1000); // Get recent 1000 logs

    const stats = {
      totalLogs: logs.length,
      levels: {},
      components: {},
      recentActivity: {
        lastHour: 0,
        last24Hours: 0,
        lastWeek: 0
      },
      topErrors: []
    };

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const errorMessages = {};

    logs.forEach(log => {
      // Count by level
      stats.levels[log.level] = (stats.levels[log.level] || 0) + 1;

      // Count by component
      stats.components[log.component] = (stats.components[log.component] || 0) + 1;

      // Count recent activity
      const logTime = new Date(log.timestamp);
      if (logTime >= oneHourAgo) stats.recentActivity.lastHour++;
      if (logTime >= oneDayAgo) stats.recentActivity.last24Hours++;
      if (logTime >= oneWeekAgo) stats.recentActivity.lastWeek++;

      // Collect error messages
      if (log.level === 'ERROR') {
        errorMessages[log.message] = (errorMessages[log.message] || 0) + 1;
      }
    });

    // Top errors
    stats.topErrors = Object.entries(errorMessages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([message, count]) => ({ message, count }));

    return stats;

  } catch (error) {
    return {
      error: error.toString(),
      totalLogs: 0
    };
  }
}