
/**
 * @fileoverview Enhanced utility functions with additional functionality from *claude v6
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Extended utilities including string handling, validation, and enhanced date operations
 * 
 * REPLACE EXISTING utils.js - This contains everything from Script 6.1 plus additional functions
 */

// ==================== SHEET UTILITIES ====================

const sheetLogger = logger.scope('SheetUtils');

/**
 * Sheet utilities for safe Google Sheets operations
 */
const sheetLoggerFallback = {
  enterFunction() {},
  exitFunction() {},
  error(message, context = {}) {
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
      console.error('[SheetUtils] ' + message, context);
    }
  }
};

let sheetLoggerInstance = null;

function getSheetLogger() {
  if (sheetLoggerInstance) {
    return sheetLoggerInstance;
  }

  if (typeof logger !== 'undefined' && logger && typeof logger.scope === 'function') {
    sheetLoggerInstance = logger.scope('SheetUtils');
    return sheetLoggerInstance;
  }

  return sheetLoggerFallback;
}

const SheetUtils = {
  
  /**
   * Get or create sheet with specified columns
   * @param {string} sheetName - Sheet name
   * @param {Array<string>} requiredColumns - Required column headers
   * @returns {GoogleAppsScript.Spreadsheet.Sheet|null} Sheet object or null
   */
  getOrCreateSheet(sheetName, requiredColumns = []) {
    const sheetLogger = getSheetLogger();
    const normalizedColumns = Array.isArray(requiredColumns) ? requiredColumns : [];

    sheetLogger.enterFunction('getOrCreateSheet', {
      sheetName,
      requiredColumnsCount: normalizedColumns.length
    });

    let sheet = null;
    let sheetCreated = false;
    let failure = null;

    try {
      const spreadsheet = getSheet();
      sheet = spreadsheet.getSheetByName(sheetName);

      if (!sheet) {
        sheet = spreadsheet.insertSheet(sheetName);
        sheetCreated = true;

        if (normalizedColumns.length > 0) {
          const headerRange = sheet.getRange(1, 1, 1, normalizedColumns.length);
          headerRange.setValues([normalizedColumns]);
          headerRange.setFontWeight('bold');
          headerRange.setBackground('#f0f0f0');
        }
      } else if (normalizedColumns.length > 0) {
        this.ensureColumnsExist(sheet, normalizedColumns);
      }
    } catch (error) {
      failure = error;
      sheetLogger.error(`Failed to get or create sheet: ${sheetName}`, {
        sheetName,
        requiredColumns: normalizedColumns,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error
      });
      sheet = null;
    }

    sheetLogger.exitFunction('getOrCreateSheet', {
      sheetName,
      created: sheetCreated,
      success: sheet !== null,
      ...(failure ? { errorMessage: failure.message || String(failure) } : {})
    });

    return sheet;
  },

  /**
   * Ensure required columns exist in sheet
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet object
   * @param {Array<string>} requiredColumns - Required columns
  */
  ensureColumnsExist(sheet, requiredColumns) {
    const sheetLogger = getSheetLogger();
    const sheetName = (sheet && typeof sheet.getName === 'function') ? sheet.getName() : 'UnknownSheet';
    const normalizedColumns = Array.isArray(requiredColumns) ? requiredColumns : [];

    sheetLogger.enterFunction('ensureColumnsExist', {
      sheetName,
      requiredColumnsCount: normalizedColumns.length
    });

    let missingColumns = [];
    let failure = null;

    try {
      if (!sheet || typeof sheet.getLastColumn !== 'function') {
        throw new Error('Invalid sheet reference provided');
      }

      const lastColumn = sheet.getLastColumn();
      const currentHeaders = lastColumn > 0
        ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
        : [];

      missingColumns = normalizedColumns.filter(col => !currentHeaders.includes(col));

      if (missingColumns.length > 0) {
        const startColumn = currentHeaders.length + 1;
        const range = sheet.getRange(1, startColumn, 1, missingColumns.length);
        range.setValues([missingColumns]);
        range.setFontWeight('bold');
        range.setBackground('#f0f0f0');
      }
    } catch (error) {
      failure = error;
      sheetLogger.error('Failed to ensure columns exist', {
        sheetName,
        requiredColumns: normalizedColumns,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error
      });
    }

    sheetLogger.exitFunction('ensureColumnsExist', {
      sheetName,
      missingColumnsCount: missingColumns.length,
      ...(failure ? { errorMessage: failure.message || String(failure) } : {})
    });
  },

  /**
   * Add row from object to sheet
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet object
   * @param {Object} dataObject - Data object with column names as keys
   * @returns {boolean} Success status
   */
  addRowFromObject(sheet, dataObject) {
    const sheetLogger = getSheetLogger();
    const sheetName = (sheet && typeof sheet.getName === 'function') ? sheet.getName() : 'UnknownSheet';

    sheetLogger.enterFunction('addRowFromObject', {
      sheetName,
      dataKeys: Object.keys(dataObject || {})
    });

    let success = false;
    let failure = null;

    try {
      if (!sheet || typeof sheet.getLastColumn !== 'function') {
        throw new Error('Invalid sheet reference provided');
      }

      const lastColumn = sheet.getLastColumn();
      if (lastColumn === 0) {
        throw new Error('Cannot add row without headers');
      }

      const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
      const rowData = headers.map(header => (dataObject && Object.prototype.hasOwnProperty.call(dataObject, header)) ? dataObject[header] : '');

      const nextRow = sheet.getLastRow() + 1;
      sheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);
      success = true;
    } catch (error) {
      failure = error;
      sheetLogger.error('Failed to add row from object', {
        sheetName,
        dataKeys: Object.keys(dataObject || {}),
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error
      });
    }

    sheetLogger.exitFunction('addRowFromObject', {
      sheetName,
      success,
      ...(failure ? { errorMessage: failure.message || String(failure) } : {})
    });

    return success;
  },

  /**
   * Find row by criteria
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet object
   * @param {Object} criteria - Search criteria
   * @returns {Object|null} Found row object or null
   */
  findRowByCriteria(sheet, criteria) {
    const sheetLogger = getSheetLogger();
    const sheetName = (sheet && typeof sheet.getName === 'function') ? sheet.getName() : 'UnknownSheet';
    const normalizedCriteria = criteria && typeof criteria === 'object' ? criteria : {};

    sheetLogger.enterFunction('findRowByCriteria', {
      sheetName,
      criteriaKeys: Object.keys(normalizedCriteria)
    });

    let result = null;
    let failure = null;

    try {
      const data = this.getAllDataAsObjects(sheet);

      result = data.find(row => {
        return Object.keys(normalizedCriteria).every(key => {
          return String(row[key]).trim() === String(normalizedCriteria[key]).trim();
        });
      }) || null;
    } catch (error) {
      failure = error;
      sheetLogger.error('Failed to find row by criteria', {
        sheetName,
        criteria: normalizedCriteria,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error
      });
      result = null;
    }

    sheetLogger.exitFunction('findRowByCriteria', {
      sheetName,
      found: result !== null,
      ...(failure ? { errorMessage: failure.message || String(failure) } : {})
    });

    return result;
  },

  /**
   * Update row by criteria
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet object
   * @param {Object} criteria - Search criteria
   * @param {Object} updates - Updates to apply
   * @returns {boolean} Success status
   */
  updateRowByCriteria(sheet, criteria, updates) {
    const sheetLogger = getSheetLogger();
    const sheetName = (sheet && typeof sheet.getName === 'function') ? sheet.getName() : 'UnknownSheet';
    const normalizedCriteria = criteria && typeof criteria === 'object' ? criteria : {};
    const normalizedUpdates = updates && typeof updates === 'object' ? updates : {};

    sheetLogger.enterFunction('updateRowByCriteria', {
      sheetName,
      criteriaKeys: Object.keys(normalizedCriteria),
      updateKeys: Object.keys(normalizedUpdates)
    });

    let success = false;
    let rowsEvaluated = 0;
    let exitReason = 'completed';
    let failure = null;

    try {
      if (!sheet || typeof sheet.getLastRow !== 'function') {
        throw new Error('Invalid sheet reference provided');
      }

      const lastRow = sheet.getLastRow();
      const lastColumn = sheet.getLastColumn();

      if (lastRow <= 1 || lastColumn === 0) {
        exitReason = 'no_data';
      } else {
        const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
        const data = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();

        for (let i = 0; i < data.length && !success; i++) {
          const row = {};
          headers.forEach((header, index) => {
            row[header] = data[i][index];
          });

          rowsEvaluated++;

          const matches = Object.keys(normalizedCriteria).every(key => {
            return String(row[key]).trim() === String(normalizedCriteria[key]).trim();
          });

          if (matches) {
            Object.keys(normalizedUpdates).forEach(key => {
              const columnIndex = headers.indexOf(key);
              if (columnIndex !== -1) {
                sheet.getRange(i + 2, columnIndex + 1).setValue(normalizedUpdates[key]);
              }
            });
            success = true;
            exitReason = 'updated';
          }
        }
      }
    } catch (error) {
      failure = error;
      sheetLogger.error('Failed to update row by criteria', {
        sheetName,
        criteria: normalizedCriteria,
        updates: normalizedUpdates,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error
      });
      success = false;
    }

    sheetLogger.exitFunction('updateRowByCriteria', {
      sheetName,
      success,
      rowsEvaluated,
      exitReason,
      ...(failure ? { errorMessage: failure.message || String(failure) } : {})
    });

    return success;
  },

  /**
   * Get all data as objects
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet object
   * @param {number} startRow - Starting row (default: 2)
   * @returns {Array<Object>} Array of row objects
   */
  getAllDataAsObjects(sheet, startRow = 2) {
    const sheetLogger = getSheetLogger();
    const sheetName = (sheet && typeof sheet.getName === 'function') ? sheet.getName() : 'UnknownSheet';

    sheetLogger.enterFunction('getAllDataAsObjects', {
      sheetName,
      startRow
    });

    let result = [];
    let failure = null;

    try {
      if (!sheet || typeof sheet.getLastRow !== 'function') {
        throw new Error('Invalid sheet reference provided');
      }

      const lastRow = sheet.getLastRow();
      const lastColumn = sheet.getLastColumn();

      if (lastRow >= startRow && lastColumn > 0) {
        const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
        const data = sheet.getRange(startRow, 1, lastRow - startRow + 1, lastColumn).getValues();

        result = data.map(row => {
          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = row[index];
          });
          return obj;
        });
      }
    } catch (error) {
      failure = error;
      sheetLogger.error('Failed to get all data as objects', {
        sheetName,
        startRow,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error
      });
      result = [];
    }

    sheetLogger.exitFunction('getAllDataAsObjects', {
      sheetName,
      rowsReturned: result.length,
      ...(failure ? { errorMessage: failure.message || String(failure) } : {})
    });

    return result;
  },

  /**
   * Clear sheet data but keep headers
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet object
   * @returns {boolean} Success status
   */
  clearDataKeepHeaders(sheet) {
    const sheetLogger = getSheetLogger();
    const sheetName = (sheet && typeof sheet.getName === 'function') ? sheet.getName() : 'UnknownSheet';

    sheetLogger.enterFunction('clearDataKeepHeaders', {
      sheetName
    });

    let success = true;
    let failure = null;
    let clearedRows = 0;

    try {
      if (!sheet || typeof sheet.getLastRow !== 'function') {
        throw new Error('Invalid sheet reference provided');
      }

      const lastRow = sheet.getLastRow();
      const lastColumn = sheet.getLastColumn();

      if (lastRow > 1 && lastColumn > 0) {
        const range = sheet.getRange(2, 1, lastRow - 1, lastColumn);
        clearedRows = range.getNumRows();
        range.clear();
      }
    } catch (error) {
      failure = error;
      sheetLogger.error('Failed to clear sheet data', {
        sheetName,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error
      });
      success = false;
    }

    sheetLogger.exitFunction('clearDataKeepHeaders', {
      sheetName,
      success,
      clearedRows,
      ...(failure ? { errorMessage: failure.message || String(failure) } : {})
    });

    return success;
  },

  /**
   * Get column index by header name
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet object
   * @param {string} headerName - Header name
   * @returns {number} Column index (1-based) or -1 if not found
   */
  getColumnIndex(sheet, headerName) {
    const sheetLogger = getSheetLogger();
    const sheetName = (sheet && typeof sheet.getName === 'function') ? sheet.getName() : 'UnknownSheet';

    sheetLogger.enterFunction('getColumnIndex', {
      sheetName,
      headerName
    });

    let index = -1;
    let failure = null;

    try {
      if (!sheet || typeof sheet.getLastColumn !== 'function') {
        throw new Error('Invalid sheet reference provided');
      }

      const lastColumn = sheet.getLastColumn();
      if (lastColumn > 0) {
        const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
        const foundIndex = headers.indexOf(headerName);
        index = foundIndex === -1 ? -1 : foundIndex + 1;
      }
    } catch (error) {
      failure = error;
      sheetLogger.error('Failed to get column index', {
        sheetName,
        headerName,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error
      });
      index = -1;
    }

    sheetLogger.exitFunction('getColumnIndex', {
      sheetName,
      headerName,
      columnIndex: index,
      ...(failure ? { errorMessage: failure.message || String(failure) } : {})
    });

    return index;
  },

  /**
   * Sort sheet by column
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet object
   * @param {string} columnHeader - Column header to sort by
   * @param {boolean} ascending - Sort order (default: true)
   * @returns {boolean} Success status
   */
  sortByColumn(sheet, columnHeader, ascending = true) {
    const sheetLogger = getSheetLogger();
    const sheetName = (sheet && typeof sheet.getName === 'function') ? sheet.getName() : 'UnknownSheet';

    sheetLogger.enterFunction('sortByColumn', {
      sheetName,
      columnHeader,
      ascending
    });

    let success = false;
    let failure = null;
    let rowsSorted = 0;

    try {
      if (!sheet || typeof sheet.getLastRow !== 'function') {
        throw new Error('Invalid sheet reference provided');
      }

      const columnIndex = this.getColumnIndex(sheet, columnHeader);
      if (columnIndex !== -1) {
        const lastRow = sheet.getLastRow();
        const lastColumn = sheet.getLastColumn();

        if (lastRow <= 2 || lastColumn === 0) {
          success = true;
          rowsSorted = Math.max(0, lastRow - 1);
        } else {
          const range = sheet.getRange(2, 1, lastRow - 1, lastColumn);
          rowsSorted = range.getNumRows();
          range.sort({ column: columnIndex, ascending });
          success = true;
        }
      }
    } catch (error) {
      failure = error;
      sheetLogger.error('Failed to sort by column', {
        sheetName,
        columnHeader,
        ascending,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error
      });
      success = false;
    }

    sheetLogger.exitFunction('sortByColumn', {
      sheetName,
      columnHeader,
      ascending,
      success,
      rowsSorted,
      ...(failure ? { errorMessage: failure.message || String(failure) } : {})
    });

    return success;
  }
};

// ==================== DATE UTILITIES ====================

/**
 * Enhanced date utilities for consistent date handling
 */
const DateUtils = {
  
  /**
   * Get current date/time
   * @returns {Date} Current date
   */
  now() {
    return new Date();
  },

  /**
   * Format date for UK format (DD/MM/YYYY)
   * @param {Date} date - Date to format
   * @returns {string} Formatted date string
   */
  formatUK(date) {
    if (!(date instanceof Date)) return '';
    return Utilities.formatDate(date, getConfigValue('SYSTEM.TIMEZONE'), 'dd/MM/yyyy');
  },

  /**
   * Format time for UK format (HH:mm)
   * @param {Date} date - Date to format
   * @returns {string} Formatted time string
   */
  formatTime(date) {
    if (!(date instanceof Date)) return '';
    return Utilities.formatDate(date, getConfigValue('SYSTEM.TIMEZONE'), 'HH:mm');
  },

  /**
   * Format date and time for UK format
   * @param {Date} date - Date to format
   * @returns {string} Formatted date/time string
   */
  formatDateTime(date) {
    if (!(date instanceof Date)) return '';
    return Utilities.formatDate(date, getConfigValue('SYSTEM.TIMEZONE'), 'dd/MM/yyyy HH:mm');
  },

  /**
   * Format date for ISO string
   * @param {Date} date - Date to format
   * @returns {string} ISO formatted string
   */
  formatISO(date) {
    if (!(date instanceof Date)) return '';
    return date.toISOString();
  },

  /**
   * Parse UK format date string
   * @param {string} dateString - Date string in DD/MM/YYYY format
   * @returns {Date|null} Parsed date or null
   */
  parseUK(dateString) {
    try {
      if (!dateString || typeof dateString !== 'string') return null;
      
      const parts = dateString.split('/');
      if (parts.length !== 3) return null;
      
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // Month is 0-based
      const year = parseInt(parts[2]);
      
      const date = new Date(year, month, day);
      
      // Validate the date
      if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
        return null;
      }
      
      return date;
    } catch (error) {
      console.error('Failed to parse UK date:', error);
      return null;
    }
  },

  /**
   * Add days to date
   * @param {Date} date - Base date
   * @param {number} days - Days to add (can be negative)
   * @returns {Date} New date
   */
  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },

  /**
   * Get day of week (0 = Sunday, 1 = Monday, etc.)
   * @param {Date} date - Date to check
   * @returns {number} Day of week
   */
  getDayOfWeek(date) {
    return date.getDay();
  },

  /**
   * Get week start date (Monday)
   * @param {Date} date - Date within the week
   * @returns {Date} Week start date
   */
  getWeekStart(date) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(date.setDate(diff));
  },

  /**
   * Get week end date (Sunday)
   * @param {Date} date - Date within the week
   * @returns {Date} Week end date
   */
  getWeekEnd(date) {
    const weekStart = this.getWeekStart(new Date(date));
    return this.addDays(weekStart, 6);
  },

  /**
   * Get month name
   * @param {number} month - Month number (1-12)
   * @returns {string} Month name
   */
  getMonthName(month) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || '';
  },

  /**
   * Check if date is today
   * @param {Date} date - Date to check
   * @returns {boolean} True if date is today
   */
  isToday(date) {
    const today = this.now();
    return date.toDateString() === today.toDateString();
  },

  /**
   * Check if date is this week
   * @param {Date} date - Date to check
   * @returns {boolean} True if date is this week
   */
  isThisWeek(date) {
    const today = this.now();
    const weekStart = this.getWeekStart(new Date(today));
    const weekEnd = this.getWeekEnd(new Date(today));
    
    return date >= weekStart && date <= weekEnd;
  },

  /**
   * Get days until date
   * @param {Date} date - Target date
   * @returns {number} Days until date (negative if past)
   */
  getDaysUntil(date) {
    const today = this.now();
    const timeDiff = date.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }
};

// ==================== STRING UTILITIES ====================

/**
 * String utilities for text processing and validation
 */
const StringUtils = {
  
  /**
   * Clean player name (remove extra spaces, standardize case)
   * @param {string} name - Player name
   * @returns {string} Cleaned name
   */
  cleanPlayerName(name) {
    if (!name || typeof name !== 'string') return '';
    
    return name.trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  },

  /**
   * Generate safe filename from string
   * @param {string} text - Input text
   * @returns {string} Safe filename
   */
  toSafeFilename(text) {
    if (!text || typeof text !== 'string') return '';
    
    return text.trim()
      .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .toLowerCase();
  },

  /**
   * Generate unique ID
   * @param {string} prefix - ID prefix
   * @returns {string} Unique ID
   */
  generateId(prefix = 'id') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}_${timestamp}_${random}`;
  },

  /**
   * Truncate text to specified length
   * @param {string} text - Input text
   * @param {number} maxLength - Maximum length
   * @param {string} suffix - Suffix for truncated text
   * @returns {string} Truncated text
   */
  truncate(text, maxLength = 100, suffix = '...') {
    if (!text || typeof text !== 'string') return '';
    
    if (text.length <= maxLength) return text;
    
    return text.substr(0, maxLength - suffix.length) + suffix;
  },

  /**
   * Capitalize first letter
   * @param {string} text - Input text
   * @returns {string} Capitalized text
   */
  capitalize(text) {
    if (!text || typeof text !== 'string') return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  },

  /**
   * Convert to title case
   * @param {string} text - Input text
   * @returns {string} Title case text
   */
  toTitleCase(text) {
    if (!text || typeof text !== 'string') return '';
    
    return text.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  },

  /**
   * Slugify text for URLs
   * @param {string} text - Input text
   * @returns {string} Slugified text
   */
  slugify(text) {
    if (!text || typeof text !== 'string') return '';
    
    return text.toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  },

  /**
   * Extract initials from name
   * @param {string} name - Full name
   * @returns {string} Initials
   */
  getInitials(name) {
    if (!name || typeof name !== 'string') return '';
    
    return name.split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('');
  }
};

// ==================== VALIDATION UTILITIES ====================

/**
 * Validation utilities for data checking
 */
const ValidationUtils = {
  
  /**
   * Validate email address
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid email
   */
  isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  },

  /**
   * Validate UK phone number
   * @param {string} phone - Phone number to validate
   * @returns {boolean} True if valid UK phone
   */
  isValidUKPhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    
    const ukPhoneRegex = /^(\+44\s?7\d{3}|\(?07\d{3}\)?\s?)\s?\d{3}\s?\d{3}$/;
    return ukPhoneRegex.test(phone.replace(/\s/g, ''));
  },

  /**
   * Validate match minute (1-120)
   * @param {string|number} minute - Minute to validate
   * @returns {boolean} True if valid minute
   */
  isValidMinute(minute) {
    const num = parseInt(minute);
    return !isNaN(num) && num >= 1 && num <= 120;
  },

  /**
   * Validate score (0-99)
   * @param {string|number} score - Score to validate
   * @returns {boolean} True if valid score
   */
  isValidScore(score) {
    const num = parseInt(score);
    return !isNaN(num) && num >= 0 && num <= 99;
  },

  /**
   * Validate date string (DD/MM/YYYY)
   * @param {string} dateString - Date string to validate
   * @returns {boolean} True if valid date format
   */
  isValidDate(dateString) {
    return DateUtils.parseUK(dateString) !== null;
  },

  /**
   * Validate required fields in object
   * @param {Object} obj - Object to validate
   * @param {Array<string>} requiredFields - Required field names
   * @returns {Object} Validation result
   */
  validateRequiredFields(obj, requiredFields) {
    const missing = requiredFields.filter(field => {
      const value = obj[field];
      return value === undefined || value === null || value === '';
    });
    
    return {
      isValid: missing.length === 0,
      missingFields: missing
    };
  },

  /**
   * Sanitize HTML content
   * @param {string} html - HTML content
   * @returns {string} Sanitized content
   */
  sanitizeHtml(html) {
    if (!html || typeof html !== 'string') return '';
    
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
               .replace(/<[^>]*>/g, '')
               .trim();
  }
};

// ==================== ARRAY UTILITIES ====================

/**
 * Array utilities for data manipulation
 */
const ArrayUtils = {
  
  /**
   * Remove duplicates from array
   * @param {Array} array - Input array
   * @returns {Array} Array without duplicates
   */
  removeDuplicates(array) {
    return [...new Set(array)];
  },

  /**
   * Group array by property
   * @param {Array} array - Input array
   * @param {string} property - Property to group by
   * @returns {Object} Grouped object
   */
  groupBy(array, property) {
    return array.reduce((groups, item) => {
      const key = item[property];
      groups[key] = groups[key] || [];
      groups[key].push(item);
      return groups;
    }, {});
  },

  /**
   * Sort array by property
   * @param {Array} array - Input array
   * @param {string} property - Property to sort by
   * @param {boolean} ascending - Sort order
   * @returns {Array} Sorted array
   */
  sortBy(array, property, ascending = true) {
    return array.sort((a, b) => {
      const aVal = a[property];
      const bVal = b[property];
      
      if (aVal < bVal) return ascending ? -1 : 1;
      if (aVal > bVal) return ascending ? 1 : -1;
      return 0;
    });
  },

  /**
   * Find max value in array by property
   * @param {Array} array - Input array
   * @param {string} property - Property to compare
   * @returns {*} Item with max value
   */
  maxBy(array, property) {
    if (array.length === 0) return null;
    
    return array.reduce((max, item) => {
      return item[property] > max[property] ? item : max;
    });
  },

  /**
   * Find min value in array by property
   * @param {Array} array - Input array
   * @param {string} property - Property to compare
   * @returns {*} Item with min value
   */
  minBy(array, property) {
    if (array.length === 0) return null;
    
    return array.reduce((min, item) => {
      return item[property] < min[property] ? item : min;
    });
  },

  /**
   * Calculate sum of property values
   * @param {Array} array - Input array
   * @param {string} property - Property to sum
   * @returns {number} Sum of values
   */
  sumBy(array, property) {
    return array.reduce((sum, item) => {
      const value = parseFloat(item[property]) || 0;
      return sum + value;
    }, 0);
  },

  /**
   * Chunk array into smaller arrays
   * @param {Array} array - Input array
   * @param {number} size - Chunk size
   * @returns {Array<Array>} Chunked arrays
   */
  chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
};

// ==================== UTILITY INITIALIZATION ====================

/**
 * Initialize utilities system
 * @returns {Object} Initialization result
 */
function initializeUtils() {
  try {
    // Test basic functionality
    const testDate = DateUtils.now();
    const testString = StringUtils.cleanPlayerName(' John  SMITH ');
    const testValidation = ValidationUtils.isValidMinute(45);
    
    return {
      success: true,
      version: '6.2.0',
      components: {
        SheetUtils: 'ready',
        DateUtils: 'ready',
        StringUtils: 'ready',
        ValidationUtils: 'ready',
        ArrayUtils: 'ready'
      },
      test_results: {
        date_formatting: !!testDate,
        string_cleaning: testString === 'John Smith',
        validation: testValidation === true
      }
    };
    
  } catch (error) {
    console.error('Utilities initialization failed:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

