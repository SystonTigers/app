/**
 * @fileoverview Posting and automation for SystonAutomationLib
 * @version 1.0.0
 * @description Build posts, check privacy, and trigger automation
 */

/**
 * Build a post payload for Make.com integration
 * @param {Object} eventObj - Event data object
 * @return {Object} Complete post payload
 * @throws {Error} If privacy consent is blocked
 */
function SA_buildPostPayload_(eventObj) {
  try {
    SA_log_('INFO', 'Building post payload', { eventType: eventObj.type });

    const cfg = SA_cfg_();

    // Privacy check if player is involved
    if (eventObj.playerId && !SA_canPublishPlayer_(eventObj.playerId)) {
      const error = `Privacy consent blocked for player: ${eventObj.playerId}`;
      SA_log_('WARN', error, eventObj);
      throw new Error(error);
    }

    // Base payload with club configuration
    const payload = {
      // Club information
      club: cfg.TEAM_NAME,
      clubShort: SA_getShortClubName_(cfg.TEAM_NAME),
      season: cfg.SEASON,
      homeVenue: cfg.HOME_VENUE,

      // Branding
      colors: {
        primary: cfg.PRIMARY_COLOR,
        secondary: cfg.SECONDARY_COLOR
      },
      badge: cfg.BADGE_URL,

      // Event data
      event: eventObj,

      // Metadata
      timestamp: new Date().toISOString(),
      source: 'syston_automation_lib',
      version: LIB_VERSION,

      // Make.com routing
      webhookType: SA_determineWebhookType_(eventObj.type),
      automation: true
    };

    // Add competition/league info if available
    if (cfg.LEAGUE_URL) {
      payload.league = {
        url: cfg.LEAGUE_URL,
        name: SA_extractLeagueName_(cfg.LEAGUE_URL)
      };
    }

    // Add match context if available
    if (eventObj.matchId) {
      payload.match = SA_getMatchContext_(eventObj.matchId);
    }

    // Log data processing for GDPR compliance
    if (eventObj.playerId) {
      SA_logDataProcessing_(eventObj.playerId, 'social_media_post', 'Legitimate Interest',
        `${eventObj.type} post for ${cfg.TEAM_NAME}`);
    }

    SA_log_('INFO', 'Post payload built successfully', {
      eventType: eventObj.type,
      hasPlayer: !!eventObj.playerId,
      webhookType: payload.webhookType
    });

    return payload;

  } catch (error) {
    SA_log_('ERROR', 'Failed to build post payload', {
      eventObj, error: error.toString()
    });
    throw error;
  }
}

/**
 * Send post to Make.com webhook
 * @param {Object} payload - Post payload
 * @return {Object} Send result
 */
function SA_sendToMake_(payload) {
  try {
    const cfg = SA_cfg_();
    const webhookUrl = SA_getWebhookUrl_(payload.webhookType);

    if (!webhookUrl) {
      SA_log_('WARN', 'No webhook URL configured', { type: payload.webhookType });
      return {
        success: false,
        error: 'No webhook URL configured for ' + payload.webhookType
      };
    }

    SA_log_('INFO', 'Sending to Make.com', {
      url: webhookUrl.substring(0, 50) + '...',
      eventType: payload.event.type
    });

    const response = UrlFetchApp.fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `SystonAutomationLib/${LIB_VERSION}`
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode >= 200 && responseCode < 300) {
      SA_log_('INFO', 'Post sent successfully', {
        responseCode,
        eventType: payload.event.type
      });
      return {
        success: true,
        responseCode: responseCode,
        response: responseText
      };
    } else {
      SA_log_('ERROR', 'Post failed', {
        responseCode,
        response: responseText,
        eventType: payload.event.type
      });
      return {
        success: false,
        responseCode: responseCode,
        error: responseText
      };
    }

  } catch (error) {
    SA_log_('ERROR', 'Failed to send to Make.com', {
      error: error.toString(),
      eventType: payload.event?.type
    });
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Process a match event (goal, card, etc.)
 * @param {Object} eventData - Event data
 * @return {Object} Processing result
 */
function SA_processMatchEvent_(eventData) {
  try {
    SA_log_('INFO', 'Processing match event', { type: eventData.type });

    // Validate event data
    if (!eventData.type) {
      throw new Error('Event type is required');
    }

    // Build the payload
    const payload = SA_buildPostPayload_(eventData);

    // Send to Make.com
    const result = SA_sendToMake_(payload);

    // Log the event to match sheet if successful
    if (result.success && eventData.type !== 'test') {
      SA_logMatchEvent_(eventData);
    }

    SA_log_('INFO', 'Match event processed', {
      type: eventData.type,
      success: result.success
    });

    return {
      success: result.success,
      event: eventData,
      payload: payload,
      makeResponse: result
    };

  } catch (error) {
    SA_log_('ERROR', 'Match event processing failed', {
      eventData,
      error: error.toString()
    });
    return {
      success: false,
      error: error.toString(),
      event: eventData
    };
  }
}

/**
 * Get the appropriate webhook URL for event type
 * @param {string} webhookType - Type of webhook needed
 * @return {string} Webhook URL
 * @private
 */
function SA_getWebhookUrl_(webhookType) {
  const cfg = SA_cfg_();

  switch (webhookType) {
    case 'goals':
      return cfg.MAKE_WEBHOOK_GOALS || cfg.MAKE_WEBHOOK_RESULTS;
    case 'cards':
      return cfg.MAKE_WEBHOOK_CARDS || cfg.MAKE_WEBHOOK_RESULTS;
    case 'results':
      return cfg.MAKE_WEBHOOK_RESULTS;
    default:
      return cfg.MAKE_WEBHOOK_RESULTS;
  }
}

/**
 * Determine webhook type from event type
 * @param {string} eventType - Event type
 * @return {string} Webhook type
 * @private
 */
function SA_determineWebhookType_(eventType) {
  const goalEvents = ['goal', 'goal_scored', 'goal_opposition'];
  const cardEvents = ['card', 'yellow_card', 'red_card', 'card_shown'];

  if (goalEvents.includes(eventType)) {
    return 'goals';
  } else if (cardEvents.includes(eventType)) {
    return 'cards';
  } else {
    return 'results';
  }
}

/**
 * Get short club name for display
 * @param {string} fullName - Full club name
 * @return {string} Short name
 * @private
 */
function SA_getShortClubName_(fullName) {
  if (!fullName) return '';

  // Extract first word or abbreviation
  const words = fullName.split(' ');
  if (words.length === 1) {
    return fullName.substring(0, 8); // Max 8 chars
  }

  // Try to create abbreviation
  const abbrev = words.map(word => word.charAt(0).toUpperCase()).join('');
  if (abbrev.length <= 4) {
    return abbrev;
  }

  // Fall back to first word
  return words[0];
}

/**
 * Extract league name from URL
 * @param {string} leagueUrl - League URL
 * @return {string} League name
 * @private
 */
function SA_extractLeagueName_(leagueUrl) {
  if (!leagueUrl) return '';

  try {
    // Try to extract from common league URL patterns
    if (leagueUrl.includes('fa-full-time')) {
      return 'FA Full-Time';
    } else if (leagueUrl.includes('pitchero')) {
      return 'Pitchero League';
    } else {
      return 'League';
    }
  } catch (error) {
    return 'League';
  }
}

/**
 * Get match context information
 * @param {string} matchId - Match identifier
 * @return {Object} Match context
 * @private
 */
function SA_getMatchContext_(matchId) {
  try {
    const ss = SpreadsheetApp.getActive();
    const fixturesSheet = ss.getSheetByName('Fixtures');

    if (!fixturesSheet) {
      return { matchId: matchId };
    }

    const data = fixturesSheet.getDataRange().getValues();
    const headers = data[0];

    // Find match by ID or other identifier
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      // Simple check - could be more sophisticated
      if (row.some(cell => String(cell).includes(matchId))) {
        const match = {};
        headers.forEach((header, index) => {
          match[header] = row[index];
        });
        return match;
      }
    }

    return { matchId: matchId };

  } catch (error) {
    SA_log_('WARN', 'Failed to get match context', { matchId, error: error.toString() });
    return { matchId: matchId };
  }
}

/**
 * Log match event to Live Match Updates sheet
 * @param {Object} eventData - Event data
 * @private
 */
function SA_logMatchEvent_(eventData) {
  try {
    const ss = SpreadsheetApp.getActive();
    const liveSheet = ss.getSheetByName('Live_Match_Updates');

    if (liveSheet) {
      liveSheet.appendRow([
        eventData.minute || '',
        eventData.type || '',
        eventData.player || '',
        eventData.details || '',
        eventData.homeScore || '',
        eventData.awayScore || '',
        new Date()
      ]);
    }
  } catch (error) {
    SA_log_('WARN', 'Failed to log match event', { error: error.toString() });
  }
}

/**
 * Test the posting system
 * @return {Object} Test results
 */
function SA_testPosting_() {
  try {
    const testEvent = {
      type: 'test',
      playerId: 'test_player',
      details: 'System test - ' + new Date().toISOString()
    };

    const result = SA_processMatchEvent_(testEvent);

    return {
      success: result.success,
      testEvent: testEvent,
      result: result,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}