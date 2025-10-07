/**
 * @fileoverview Helper Utility Functions for Football Automation System
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Additional helper functions to add to utils.gs or enhanced-events.gs
 */

// ==================== CARD NORMALIZATION HELPERS ====================

/**
 * Normalize card type to standard values
 * @param {string} cardType - Raw card type input
 * @returns {string} Normalized card type
 */
function normalizeCardType(cardType) {
  if (!cardType || typeof cardType !== 'string') {
    return 'yellow'; // Default fallback
  }

  const normalized = cardType.toLowerCase().trim();

  // Handle various input formats
  if (normalized.includes('red')) {
    return 'red';
  }
  if (normalized.includes('sin') || normalized.includes('bin')) {
    return 'sin_bin';
  }
  if (normalized.includes('second') && normalized.includes('yellow')) {
    return 'second_yellow';
  }
  if (normalized.includes('yellow') || normalized === 'y') {
    return 'yellow';
  }
  if (normalized === 'r') {
    return 'red';
  }

  // Default to yellow for unrecognized inputs
  return 'yellow';
}

/**
 * Get display name for card type
 * @param {string} cardType - Normalized card type
 * @returns {string} Display name
 */
function getCardDisplayName(cardType) {
  const displayNames = {
    'yellow': 'Yellow Card',
    'red': 'Red Card',
    'sin_bin': 'Sin Bin',
    'second_yellow': 'Second Yellow (Red)'
  };

  return displayNames[cardType] || 'Card';
}

// ==================== TEAM INFORMATION HELPERS ====================

/**
 * Get opposition team name from match data
 * @param {Object} matchData - Match information
 * @returns {string} Opposition team name
 */
function getOppositionTeam(matchData) {
  if (!matchData) {
    return 'Unknown Opposition';
  }

  // Check various possible fields for opposition name
  if (matchData.opposition) {
    return matchData.opposition;
  }
  if (matchData.opponent) {
    return matchData.opponent;
  }
  if (matchData.awayTeam && matchData.homeTeam) {
    const ourTeam = getConfigValue('SYSTEM.CLUB_NAME', 'Football Club');
    return matchData.homeTeam === ourTeam ? matchData.awayTeam : matchData.homeTeam;
  }
  if (matchData.versus) {
    return matchData.versus;
  }

  // Try to get from fixtures sheet using match ID
  if (matchData.id) {
    try {
      const fixturesTabName = getConfigValue('SHEETS.TAB_NAMES.FIXTURES', 'Fixtures');
      const fixturesSheet = SheetUtils.getSheet(fixturesTabName);

      if (fixturesSheet) {
        const data = fixturesSheet.getDataRange().getValues();
        const headers = data[0];
        const matchIdCol = headers.indexOf('Match ID');
        const oppositionCol = headers.indexOf('Opposition') || headers.indexOf('Opponent') || headers.indexOf('Away Team');

        if (matchIdCol !== -1 && oppositionCol !== -1) {
          for (let i = 1; i < data.length; i++) {
            if (data[i][matchIdCol] === matchData.id) {
              return data[i][oppositionCol] || 'Unknown Opposition';
            }
          }
        }
      }
    } catch (error) {
      // Fallback to unknown if sheet lookup fails
    }
  }

  return 'Unknown Opposition';
}

/**
 * Check if we are the home team for a match
 * @param {Object|string} matchData - Match data or match ID
 * @returns {boolean} True if home team
 */
function isHomeTeam(matchData) {
  try {
    const ourTeam = getConfigValue('SYSTEM.CLUB_NAME', 'Football Club');

    if (typeof matchData === 'string') {
      // matchData is just an ID, look up in fixtures
      const fixturesTabName = getConfigValue('SHEETS.TAB_NAMES.FIXTURES', 'Fixtures');
      const fixturesSheet = SheetUtils.getSheet(fixturesTabName);

      if (fixturesSheet) {
        const data = fixturesSheet.getDataRange().getValues();
        const headers = data[0];
        const matchIdCol = headers.indexOf('Match ID');
        const homeTeamCol = headers.indexOf('Home Team');
        const venueCol = headers.indexOf('Venue');

        if (matchIdCol !== -1) {
          for (let i = 1; i < data.length; i++) {
            if (data[i][matchIdCol] === matchData) {
              // Check home team column first
              if (homeTeamCol !== -1 && data[i][homeTeamCol]) {
                return data[i][homeTeamCol] === ourTeam;
              }
              // Fallback to venue check
              if (venueCol !== -1 && data[i][venueCol]) {
                const venue = data[i][venueCol].toLowerCase();
                return venue.includes('home') || venue.includes(ourTeam.toLowerCase());
              }
            }
          }
        }
      }
    } else if (matchData && typeof matchData === 'object') {
      // Check various fields in match data object
      if (matchData.homeTeam) {
        return matchData.homeTeam === ourTeam;
      }
      if (matchData.venue) {
        const venue = matchData.venue.toLowerCase();
        return venue.includes('home') || venue.includes(ourTeam.toLowerCase());
      }
      if (matchData.isHome !== undefined) {
        return matchData.isHome;
      }
    }

    // Default assumption (most matches are away)
    return false;

  } catch (error) {
    return false; // Default to away if error
  }
}

// ==================== SCORE HELPERS ====================

/**
 * Get current scores for a match
 * @param {string} matchId - Match identifier
 * @returns {Object} Score object with home and away scores
 */
function getCurrentScores(matchId) {
  try {
    if (!matchId) {
      return { home: 0, away: 0 };
    }

    // Try to get from results sheet first
    const resultsTabName = getConfigValue('SHEETS.TAB_NAMES.RESULTS', 'Results');
    const resultsSheet = SheetUtils.getSheet(resultsTabName);

    if (resultsSheet) {
      const data = resultsSheet.getDataRange().getValues();
      const headers = data[0];
      const matchIdCol = headers.indexOf('Match ID');
      const homeScoreCol = headers.indexOf('Home Score') || headers.indexOf('Our Score');
      const awayScoreCol = headers.indexOf('Away Score') || headers.indexOf('Opposition Score');

      if (matchIdCol !== -1 && homeScoreCol !== -1 && awayScoreCol !== -1) {
        for (let i = 1; i < data.length; i++) {
          if (data[i][matchIdCol] === matchId) {
            return {
              home: parseInt(data[i][homeScoreCol]) || 0,
              away: parseInt(data[i][awayScoreCol]) || 0
            };
          }
        }
      }
    }

    // Fallback to zero scores if not found
    return { home: 0, away: 0 };

  } catch (error) {
    return { home: 0, away: 0 };
  }
}

/**
 * Update match scores in results sheet
 * @param {string} matchId - Match identifier
 * @param {Object} scores - Score object {home, away}
 * @returns {Object} Update result
 */
function updateMatchScores(matchId, scores) {
  try {
    const resultsTabName = getConfigValue('SHEETS.TAB_NAMES.RESULTS', 'Results');
    const resultsSheet = SheetUtils.getSheet(resultsTabName);

    if (!resultsSheet) {
      return { success: false, error: 'Results sheet not found' };
    }

    const data = resultsSheet.getDataRange().getValues();
    const headers = data[0];
    const matchIdCol = headers.indexOf('Match ID');
    const homeScoreCol = headers.indexOf('Home Score') || headers.indexOf('Our Score');
    const awayScoreCol = headers.indexOf('Away Score') || headers.indexOf('Opposition Score');

    if (matchIdCol === -1 || homeScoreCol === -1 || awayScoreCol === -1) {
      return { success: false, error: 'Required columns not found in Results sheet' };
    }

    // Find and update the match row
    for (let i = 1; i < data.length; i++) {
      if (data[i][matchIdCol] === matchId) {
        resultsSheet.getRange(i + 1, homeScoreCol + 1).setValue(scores.home || 0);
        resultsSheet.getRange(i + 1, awayScoreCol + 1).setValue(scores.away || 0);

        return {
          success: true,
          matchId: matchId,
          scores: scores,
          rowUpdated: i + 1
        };
      }
    }

    // Match not found - could add new row here if needed
    return { success: false, error: 'Match not found in Results sheet' };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ==================== FEATURE CHECK HELPERS ====================

/**
 * Check if a feature is enabled
 * @param {string} featureName - Feature name/key
 * @returns {boolean} True if enabled
 */
function isFeatureEnabled(featureName) {
  try {
    return getConfigValue(`FEATURES.${featureName}`, false);
  } catch (error) {
    return false;
  }
}

/**
 * Get webhook URL for Make.com integration
 * @returns {string|null} Webhook URL or null
 */
function getWebhookUrl() {
  try {
    return getConfigValue('WEBHOOKS.MAKE_URL', null);
  } catch (error) {
    return null;
  }
}

// ==================== LOGGING HELPERS ====================

/**
 * Log opposition event for audit trail
 * @param {string} matchId - Match identifier
 * @param {string} eventType - Event type
 * @param {string} minute - Minute of event
 * @param {Object} details - Additional details
 */
function logOppositionEvent(matchId, eventType, minute, details = {}) {
  try {
    const oppositionLogTabName = getConfigValue('SHEETS.TAB_NAMES.OPPOSITION_LOG', 'Opposition Events');
    const logColumns = ['Match ID', 'Event Type', 'Minute', 'Details', 'Timestamp'];
    const logSheet = SheetUtils.getOrCreateSheet(oppositionLogTabName, logColumns);

    if (logSheet) {
      const logData = [
        matchId || 'Unknown',
        eventType || 'Unknown',
        minute || 'Unknown',
        JSON.stringify(details),
        DateUtils.formatISO(DateUtils.now())
      ];

      SheetUtils.appendRow(logSheet, logData);
    }
  } catch (error) {
    // Fail silently for logging errors
    if (typeof logger !== 'undefined') {
      logger.error('Opposition event logging failed', { error: error.toString() });
    }
  }
}