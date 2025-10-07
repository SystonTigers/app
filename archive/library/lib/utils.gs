/**
 * @fileoverview Utility functions for SystonAutomationLib
 * @version 1.0.0
 * @description Common utility functions and helpers
 */

/**
 * Retry a function with exponential backoff
 * @param {function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @return {*} Function result
 */
function SA_retry_(fn, maxRetries = 3, baseDelay = 1000) {
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      return fn();
    } catch (error) {
      attempt++;

      if (attempt > maxRetries) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      SA_log_('WARN', `Retry attempt ${attempt}/${maxRetries} after ${delay}ms`, {
        error: error.toString()
      });

      Utilities.sleep(delay);
    }
  }
}

/**
 * Safe sheet access with error handling
 * @param {string} sheetName - Name of sheet to access
 * @return {GoogleAppsScript.Spreadsheet.Sheet|null} Sheet or null if not found
 */
function SA_getSheet_(sheetName) {
  try {
    const ss = SpreadsheetApp.getActive();
    return ss.getSheetByName(sheetName);
  } catch (error) {
    SA_log_('ERROR', `Failed to access sheet: ${sheetName}`, { error: error.toString() });
    return null;
  }
}

/**
 * Safe range read with error handling
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet to read from
 * @param {string} range - A1 notation range
 * @return {Array|null} Values or null if failed
 */
function SA_safeRangeRead_(sheet, range) {
  try {
    if (!sheet) return null;

    const rangeObj = sheet.getRange(range);
    return rangeObj.getValues();
  } catch (error) {
    SA_log_('ERROR', 'Safe range read failed', {
      sheet: sheet.getName(),
      range: range,
      error: error.toString()
    });
    return null;
  }
}

/**
 * Safe range write with error handling
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet to write to
 * @param {string} range - A1 notation range
 * @param {Array} values - Values to write
 * @return {boolean} Success status
 */
function SA_safeRangeWrite_(sheet, range, values) {
  try {
    if (!sheet) return false;

    const rangeObj = sheet.getRange(range);
    rangeObj.setValues(values);
    return true;
  } catch (error) {
    SA_log_('ERROR', 'Safe range write failed', {
      sheet: sheet.getName(),
      range: range,
      error: error.toString()
    });
    return false;
  }
}

/**
 * Format date for display
 * @param {Date} date - Date to format
 * @param {string} format - Format type (short, long, time)
 * @return {string} Formatted date
 */
function SA_formatDate_(date, format = 'short') {
  try {
    if (!(date instanceof Date)) {
      date = new Date(date);
    }

    switch (format) {
      case 'short':
        return Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd/MM/yyyy');
      case 'long':
        return Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd MMMM yyyy');
      case 'time':
        return Utilities.formatDate(date, Session.getScriptTimeZone(), 'HH:mm');
      case 'datetime':
        return Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
      case 'iso':
        return date.toISOString();
      default:
        return date.toString();
    }
  } catch (error) {
    SA_log_('ERROR', 'Date formatting failed', { date, format, error: error.toString() });
    return date ? date.toString() : '';
  }
}

/**
 * Parse date from string with multiple format support
 * @param {string} dateString - Date string to parse
 * @return {Date|null} Parsed date or null if failed
 */
function SA_parseDate_(dateString) {
  try {
    if (!dateString) return null;

    // Try direct parsing first
    let date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date;
    }

    // Try common UK formats
    const formats = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/,  // DD-MM-YYYY
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/   // YYYY-MM-DD
    ];

    for (let format of formats) {
      const match = dateString.match(format);
      if (match) {
        const [, part1, part2, part3] = match;

        if (format === formats[2]) { // YYYY-MM-DD
          date = new Date(parseInt(part1), parseInt(part2) - 1, parseInt(part3));
        } else { // DD/MM/YYYY or DD-MM-YYYY
          date = new Date(parseInt(part3), parseInt(part2) - 1, parseInt(part1));
        }

        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    return null;

  } catch (error) {
    SA_log_('WARN', 'Date parsing failed', { dateString, error: error.toString() });
    return null;
  }
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @return {boolean} Valid email
 */
function SA_isValidEmail_(email) {
  try {
    if (!email || typeof email !== 'string') return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  } catch (error) {
    return false;
  }
}

/**
 * Sanitize text input for safe display
 * @param {string} text - Text to sanitize
 * @param {number} maxLength - Maximum length
 * @return {string} Sanitized text
 */
function SA_sanitizeText_(text, maxLength = 500) {
  try {
    if (!text) return '';

    // Convert to string and trim
    let sanitized = String(text).trim();

    // Remove potentially dangerous characters
    sanitized = sanitized.replace(/[<>\"'&]/g, '');

    // Limit length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength) + '...';
    }

    return sanitized;
  } catch (error) {
    SA_log_('ERROR', 'Text sanitization failed', { error: error.toString() });
    return '';
  }
}

/**
 * Generate unique ID
 * @param {string} prefix - Optional prefix
 * @return {string} Unique ID
 */
function SA_generateId_(prefix = '') {
  try {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${prefix}${timestamp}_${random}`;
  } catch (error) {
    // Fallback to simple timestamp
    return `${prefix}${Date.now()}`;
  }
}

/**
 * Deep clone an object
 * @param {*} obj - Object to clone
 * @return {*} Cloned object
 */
function SA_deepClone_(obj) {
  try {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    if (obj instanceof Array) {
      return obj.map(item => SA_deepClone_(item));
    }

    if (typeof obj === 'object') {
      const cloned = {};
      for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = SA_deepClone_(obj[key]);
        }
      }
      return cloned;
    }

    return obj;
  } catch (error) {
    SA_log_('ERROR', 'Deep clone failed', { error: error.toString() });
    return obj;
  }
}

/**
 * Check if value is empty
 * @param {*} value - Value to check
 * @return {boolean} True if empty
 */
function SA_isEmpty_(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (typeof value === 'number') return isNaN(value);
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 */
function SA_sleep_(ms) {
  try {
    Utilities.sleep(Math.max(0, Math.min(ms, 30000))); // Max 30 seconds
  } catch (error) {
    SA_log_('WARN', 'Sleep failed', { ms, error: error.toString() });
  }
}

/**
 * Get execution time remaining
 * @return {number} Milliseconds remaining
 */
function SA_getExecutionTimeRemaining_() {
  try {
    // Apps Script has a 6-minute execution limit
    const maxExecution = 6 * 60 * 1000; // 6 minutes in ms
    const startTime = global.scriptStartTime || Date.now();
    const elapsed = Date.now() - startTime;
    return Math.max(0, maxExecution - elapsed);
  } catch (error) {
    return 30000; // Default to 30 seconds remaining
  }
}

/**
 * Check if script should continue (time-based)
 * @param {number} requiredMs - Milliseconds required for next operation
 * @return {boolean} True if should continue
 */
function SA_shouldContinue_(requiredMs = 10000) {
  return SA_getExecutionTimeRemaining_() > requiredMs;
}

/**
 * Batch process array items
 * @param {Array} items - Items to process
 * @param {function} processFn - Function to process each item
 * @param {number} batchSize - Items per batch
 * @return {Array} Processing results
 */
function SA_batchProcess_(items, processFn, batchSize = 10) {
  const results = [];

  try {
    for (let i = 0; i < items.length; i += batchSize) {
      if (!SA_shouldContinue_(5000)) {
        SA_log_('WARN', 'Batch processing stopped due to time limit', {
          processed: i,
          total: items.length
        });
        break;
      }

      const batch = items.slice(i, i + batchSize);
      const batchResults = batch.map(item => {
        try {
          return processFn(item);
        } catch (error) {
          SA_log_('ERROR', 'Batch item processing failed', {
            item: item,
            error: error.toString()
          });
          return { error: error.toString() };
        }
      });

      results.push(...batchResults);
    }

    return results;
  } catch (error) {
    SA_log_('ERROR', 'Batch processing failed', { error: error.toString() });
    return results;
  }
}