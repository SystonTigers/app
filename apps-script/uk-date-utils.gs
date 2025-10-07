/**
 * @fileoverview UK Date Formatting Utilities
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Comprehensive UK date formatting for all football automation functions
 *
 * FEATURES:
 * - DD/MM/YYYY format standardization
 * - UK timezone handling (Europe/London)
 * - British date parsing and validation
 * - Match day specific formatting
 * - Fixture date helpers
 */

// ==================== UK DATE FORMATTING CONSTANTS ====================

const UK_DATE_FORMATS = {
  STANDARD: 'DD/MM/YYYY',
  WITH_TIME: 'DD/MM/YYYY HH:mm',
  MATCH_DAY: 'dddd, DD MMMM YYYY',
  FIXTURE_LIST: 'ddd DD/MM',
  MONTH_YEAR: 'MMMM YYYY',
  SHORT_DATE: 'DD/MM/YY',
  FULL_DATE_TIME: 'dddd, DD MMMM YYYY [at] HH:mm'
};

const UK_TIMEZONE = 'Europe/London';

// ==================== CORE UK DATE FUNCTIONS ====================

/**
 * Format date in UK standard DD/MM/YYYY format
 * @param {Date|string|number} date - Date to format
 * @param {string} format - Optional format override
 * @returns {string} UK formatted date
 */
function formatUKDate(date, format = UK_DATE_FORMATS.STANDARD) {
  try {
    if (!date) return '';

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date provided to formatUKDate:', date);
      return '';
    }

    // Use UK timezone
    const ukDate = new Date(dateObj.toLocaleString("en-US", {timeZone: UK_TIMEZONE}));

    switch (format) {
      case UK_DATE_FORMATS.STANDARD:
        return ukDate.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });

      case UK_DATE_FORMATS.WITH_TIME:
        return ukDate.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }) + ' ' + ukDate.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });

      case UK_DATE_FORMATS.MATCH_DAY:
        return ukDate.toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });

      case UK_DATE_FORMATS.FIXTURE_LIST:
        return ukDate.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: '2-digit',
          month: '2-digit'
        });

      case UK_DATE_FORMATS.MONTH_YEAR:
        return ukDate.toLocaleDateString('en-GB', {
          month: 'long',
          year: 'numeric'
        });

      case UK_DATE_FORMATS.SHORT_DATE:
        return ukDate.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit'
        });

      case UK_DATE_FORMATS.FULL_DATE_TIME:
        return ukDate.toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }) + ' at ' + ukDate.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });

      default:
        return ukDate.toLocaleDateString('en-GB');
    }

  } catch (error) {
    console.error('Error formatting UK date:', error, 'Date:', date);
    return '';
  }
}

/**
 * Parse UK date string (DD/MM/YYYY) into Date object
 * @param {string} ukDateString - UK format date string
 * @returns {Date|null} Parsed date or null if invalid
 */
function parseUKDate(ukDateString) {
  try {
    if (!ukDateString || typeof ukDateString !== 'string') {
      return null;
    }

    // Handle DD/MM/YYYY format
    const dateParts = ukDateString.trim().split('/');
    if (dateParts.length === 3) {
      const day = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(dateParts[2], 10);

      // Validate ranges
      if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 1900) {
        const date = new Date(year, month, day);

        // Verify the date is valid (handles invalid dates like 31/02/2024)
        if (date.getDate() === day && date.getMonth() === month && date.getFullYear() === year) {
          return date;
        }
      }
    }

    // Try parsing as ISO date
    const isoDate = new Date(ukDateString);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    return null;

  } catch (error) {
    console.error('Error parsing UK date:', error, 'Input:', ukDateString);
    return null;
  }
}

/**
 * Get current date in UK timezone
 * @returns {Date} Current UK date
 */
function getCurrentUKDate() {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", {timeZone: UK_TIMEZONE}));
}

/**
 * Format match kick-off time for display
 * @param {Date|string} date - Match date
 * @param {string} time - Kick-off time (HH:mm format)
 * @returns {string} Formatted match date and time
 */
function formatMatchDateTime(date, time) {
  try {
    const matchDate = new Date(date);
    if (isNaN(matchDate.getTime())) {
      return 'Date TBC';
    }

    const dateStr = formatUKDate(matchDate, UK_DATE_FORMATS.MATCH_DAY);

    if (time && time.trim()) {
      // Ensure time is in HH:mm format
      const timeFormatted = time.includes(':') ? time : `${time}:00`;
      return `${dateStr}, ${timeFormatted}`;
    }

    return dateStr;

  } catch (error) {
    console.error('Error formatting match date time:', error);
    return 'Date TBC';
  }
}

/**
 * Calculate age from birth date (UK format)
 * @param {Date|string} birthDate - Date of birth
 * @returns {number} Age in years
 */
function calculateAge(birthDate) {
  try {
    const dob = typeof birthDate === 'string' ? parseUKDate(birthDate) : new Date(birthDate);
    if (!dob || isNaN(dob.getTime())) {
      return 0;
    }

    const today = getCurrentUKDate();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    return Math.max(0, age);

  } catch (error) {
    console.error('Error calculating age:', error);
    return 0;
  }
}

/**
 * Check if date is today (UK timezone)
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is today
 */
function isToday(date) {
  try {
    const checkDate = new Date(date);
    const today = getCurrentUKDate();

    return checkDate.getDate() === today.getDate() &&
           checkDate.getMonth() === today.getMonth() &&
           checkDate.getFullYear() === today.getFullYear();

  } catch (error) {
    return false;
  }
}

/**
 * Get fixture display format (day/date for this week, full date for future)
 * @param {Date|string} fixtureDate - Fixture date
 * @returns {string} Formatted fixture date
 */
function formatFixtureDate(fixtureDate) {
  try {
    const date = new Date(fixtureDate);
    const today = getCurrentUKDate();
    const daysDiff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));

    if (daysDiff < 0) {
      // Past fixture
      return formatUKDate(date, UK_DATE_FORMATS.SHORT_DATE);
    } else if (daysDiff === 0) {
      // Today
      return 'Today';
    } else if (daysDiff === 1) {
      // Tomorrow
      return 'Tomorrow';
    } else if (daysDiff <= 7) {
      // This week
      return date.toLocaleDateString('en-GB', { weekday: 'long' });
    } else {
      // Future
      return formatUKDate(date, UK_DATE_FORMATS.FIXTURE_LIST);
    }

  } catch (error) {
    console.error('Error formatting fixture date:', error);
    return 'Date TBC';
  }
}

/**
 * Get start of current football season (August 1st)
 * @returns {Date} Season start date
 */
function getCurrentSeasonStart() {
  const today = getCurrentUKDate();
  const currentYear = today.getFullYear();

  // Season starts August 1st
  const seasonStart = new Date(currentYear, 7, 1); // Month 7 = August (0-indexed)

  // If we're before August, use previous year
  if (today < seasonStart) {
    seasonStart.setFullYear(currentYear - 1);
  }

  return seasonStart;
}

/**
 * Get season string (e.g., "2024/25")
 * @returns {string} Current season string
 */
function getCurrentSeasonString() {
  const seasonStart = getCurrentSeasonStart();
  const startYear = seasonStart.getFullYear();
  const endYear = startYear + 1;

  return `${startYear}/${endYear.toString().slice(-2)}`;
}

// ==================== FOOTBALL-SPECIFIC DATE HELPERS ====================

/**
 * Format match result date for social media
 * @param {Date|string} matchDate - Match date
 * @param {string} opposition - Opposition team name
 * @returns {string} Social media friendly date
 */
function formatResultDate(matchDate, opposition) {
  try {
    const date = new Date(matchDate);
    const today = getCurrentUKDate();
    const daysDiff = Math.ceil((today - date) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
      return 'Today';
    } else if (daysDiff === 1) {
      return 'Yesterday';
    } else if (daysDiff <= 7) {
      return `Last ${date.toLocaleDateString('en-GB', { weekday: 'long' })}`;
    } else {
      return formatUKDate(date, UK_DATE_FORMATS.STANDARD);
    }

  } catch (error) {
    return formatUKDate(matchDate, UK_DATE_FORMATS.STANDARD);
  }
}

/**
 * Get next fixture date text for countdowns
 * @param {Date|string} fixtureDate - Next fixture date
 * @returns {string} Countdown text
 */
function getFixtureCountdownText(fixtureDate) {
  try {
    const date = new Date(fixtureDate);
    const today = getCurrentUKDate();
    const daysDiff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));

    if (daysDiff < 0) {
      return 'Match completed';
    } else if (daysDiff === 0) {
      return 'Match day!';
    } else if (daysDiff === 1) {
      return '1 day to go';
    } else if (daysDiff <= 7) {
      return `${daysDiff} days to go`;
    } else if (daysDiff <= 14) {
      return `${Math.ceil(daysDiff / 7)} week${daysDiff > 7 ? 's' : ''} to go`;
    } else {
      return formatUKDate(date, UK_DATE_FORMATS.MATCH_DAY);
    }

  } catch (error) {
    return 'Date TBC';
  }
}

// ==================== VALIDATION AND UTILITY FUNCTIONS ====================

/**
 * Validate if string is valid UK date format
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid UK date format
 */
function isValidUKDate(dateString) {
  const parsed = parseUKDate(dateString);
  return parsed !== null && !isNaN(parsed.getTime());
}

/**
 * Convert any date format to UK standard
 * @param {Date|string|number} input - Date input
 * @returns {string} UK formatted date string
 */
function toUKDateString(input) {
  return formatUKDate(input, UK_DATE_FORMATS.STANDARD);
}

/**
 * Get UK date input format for HTML forms
 * @param {Date|string} date - Date to format
 * @returns {string} YYYY-MM-DD format for HTML date inputs
 */
function toHTMLDateFormat(date) {
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '';

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;

  } catch (error) {
    return '';
  }
}

/**
 * Convert HTML date format to UK display format
 * @param {string} htmlDate - HTML date format (YYYY-MM-DD)
 * @returns {string} UK display format (DD/MM/YYYY)
 */
function fromHTMLDateFormat(htmlDate) {
  try {
    if (!htmlDate) return '';

    const date = new Date(htmlDate + 'T00:00:00'); // Avoid timezone issues
    return formatUKDate(date, UK_DATE_FORMATS.STANDARD);

  } catch (error) {
    return htmlDate; // Return original if conversion fails
  }
}

// ==================== TESTING FUNCTIONS ====================

/**
 * Test UK date formatting functions
 * @returns {Object} Test results
 */
function testUKDateFormatting() {
  console.log('🧪 Testing UK Date Formatting...');

  const testResults = [];

  try {
    // Test 1: Basic UK date formatting
    const testDate = new Date(2024, 11, 25); // December 25, 2024
    const ukFormatted = formatUKDate(testDate);
    const expected = '25/12/2024';
    testResults.push({
      test: 'Basic UK formatting',
      result: ukFormatted,
      expected: expected,
      passed: ukFormatted === expected
    });

    // Test 2: Date parsing
    const parsed = parseUKDate('25/12/2024');
    const isValid = parsed && parsed.getDate() === 25 && parsed.getMonth() === 11;
    testResults.push({
      test: 'UK date parsing',
      result: parsed,
      expected: 'Valid Date object',
      passed: isValid
    });

    // Test 3: Match date formatting
    const matchFormat = formatMatchDateTime(testDate, '15:00');
    testResults.push({
      test: 'Match date formatting',
      result: matchFormat,
      expected: 'Contains date and time',
      passed: matchFormat.includes('December') && matchFormat.includes('15:00')
    });

    // Test 4: Age calculation
    const dob = new Date(2000, 0, 1); // January 1, 2000
    const age = calculateAge(dob);
    testResults.push({
      test: 'Age calculation',
      result: age,
      expected: 'Around 24 years',
      passed: age >= 24 && age <= 25
    });

    const passed = testResults.filter(t => t.passed).length;
    const total = testResults.length;

    console.log(`✅ UK Date Tests: ${passed}/${total} passed`);

    return {
      success: passed === total,
      passed: passed,
      total: total,
      results: testResults
    };

  } catch (error) {
    console.error('❌ UK Date test failed:', error);
    return {
      success: false,
      error: error.toString(),
      results: testResults
    };
  }
}

// Export functions for global use
const UKDateUtils = {
  format: formatUKDate,
  parse: parseUKDate,
  getCurrentDate: getCurrentUKDate,
  formatMatch: formatMatchDateTime,
  calculateAge: calculateAge,
  isToday: isToday,
  formatFixture: formatFixtureDate,
  formatResult: formatResultDate,
  getCountdown: getFixtureCountdownText,
  isValid: isValidUKDate,
  toUK: toUKDateString,
  toHTML: toHTMLDateFormat,
  fromHTML: fromHTMLDateFormat,
  getCurrentSeason: getCurrentSeasonString
};