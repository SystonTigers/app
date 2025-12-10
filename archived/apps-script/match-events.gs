/**
 * match-events.gs - Complete Match Event Logger
 * @version 6.2.0
 * Logs ALL match events with timestamps for video editing
 */

/**
 * Log match kick-off
 */
function logMatchKickOff(matchId, opponent, venue, competition) {
  const logger = getLogger();
  logger.enterFunction('logMatchKickOff', { matchId });
  try {
    const timestamp = new Date();
    logMatchEvent(matchId, {
      timestamp: timestamp,
      minute: 0,
      eventType: 'KICK_OFF',
      description: 'Kick Off',
      videoTimestamp: '00:00:00',
      clipMarker: true
    });
    logger.exitFunction('logMatchKickOff', { success: true });
    return { success: true };
  } catch (error) {
    logger.error('logMatchKickOff failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

/**
 * Log goal with video timestamps
 */
function logGoalWithTimestamp(matchId, scorer, minute, assist = null, isPenalty = false) {
  const logger = getLogger();
  logger.enterFunction('logGoalWithTimestamp', { matchId, scorer, minute });
  try {
    const timestamp = new Date();
    const videoTime = calculateVideoTimestamp(matchId, minute);
    logMatchEvent(matchId, {
      timestamp: timestamp,
      minute: minute,
      eventType: 'GOAL',
      player: scorer,
      assist: assist,
      isPenalty: isPenalty,
      description: `âš½ GOAL - ${scorer}${assist ? ` (Assist: ${assist})` : ''}${isPenalty ? ' [PEN]' : ''}`,
      videoTimestamp: videoTime,
      clipMarker: true,
      clipStart: Math.max(0, minute * 60 - 5),
      clipEnd: minute * 60 + 10
    });
    logger.exitFunction('logGoalWithTimestamp', { success: true });
    return { success: true };
  } catch (error) {
    logger.error('logGoalWithTimestamp failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

/**
 * Log half-time
 */
function logHalfTime(matchId, homeScore, awayScore) {
  const logger = getLogger();
  logger.enterFunction('logHalfTime', { matchId });
  try {
    logMatchEvent(matchId, {
      timestamp: new Date(),
      minute: 45,
      eventType: 'HALF_TIME',
      description: `Half Time - Score: ${homeScore}-${awayScore}`,
      videoTimestamp: calculateVideoTimestamp(matchId, 45),
      clipMarker: false
    });
    logger.exitFunction('logHalfTime', { success: true });
    return { success: true };
  } catch (error) {
    logger.error('logHalfTime failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

/**
 * Log full-time
 */
function logFullTime(matchId, finalHomeScore, finalAwayScore) {
  const logger = getLogger();
  logger.enterFunction('logFullTime', { matchId });
  try {
    logMatchEvent(matchId, {
      timestamp: new Date(),
      minute: 90,
      eventType: 'FULL_TIME',
      description: `FULL TIME - Final Score: ${finalHomeScore}-${finalAwayScore}`,
      videoTimestamp: calculateVideoTimestamp(matchId, 90),
      clipMarker: false
    });
    logger.exitFunction('logFullTime', { success: true });
    return { success: true };
  } catch (error) {
    logger.error('logFullTime failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

/**
 * Log to Match Events sheet
 * @private
 */
function logMatchEvent(matchId, event) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Match Events');
  if (!sheet) {
    sheet = ss.insertSheet('Match Events');
    sheet.getRange('A1:M1').setValues([[
      'Timestamp', 'Match ID', 'Minute', 'Event Type', 'Player',
      'Assist', 'Is Penalty', 'Card Type', 'Description',
      'Video Timestamp', 'Clip Marker', 'Clip Start (sec)', 'Clip End (sec)'
    ]]);
    sheet.getRange('A1:M1').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  sheet.appendRow([
    event.timestamp || new Date(),
    matchId,
    event.minute || '',
    event.eventType || '',
    event.player || '',
    event.assist || '',
    event.isPenalty || false,
    event.cardType || '',
    event.description || '',
    event.videoTimestamp || '',
    event.clipMarker || false,
    event.clipStart || '',
    event.clipEnd || ''
  ]);
}

/**
 * Calculate video timestamp from match minute
 * @private
 */
function calculateVideoTimestamp(matchId, minute) {
  const matchSeconds = minute * 60;
  const hours = Math.floor(matchSeconds / 3600);
  const minutes = Math.floor((matchSeconds % 3600) / 60);
  const seconds = matchSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Export match events for video editor (CSV)
 */
function exportMatchEventsForVideo(matchId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Match Events');
  if (!sheet) return '';
  const data = sheet.getDataRange().getValues();
  let csv = 'Minute,Event,Player,Description,Video Start,Duration\n';
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === matchId && data[i][10]) {
      const minute = data[i][2];
      const eventType = data[i][3];
      const player = data[i][4];
      const description = data[i][8];
      const clipStart = data[i][11];
      const clipEnd = data[i][12];
      const duration = clipEnd - clipStart;
      csv += `${minute},${eventType},${player},"${description}",${clipStart},${duration}\n`;
    }
  }
  return csv;
}

/**
 * Get all match events
 */
function getMatchEvents(matchId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Match Events');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const events = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === matchId) {
      events.push({
        timestamp: data[i][0],
        matchId: data[i][1],
        minute: data[i][2],
        eventType: data[i][3],
        player: data[i][4],
        assist: data[i][5],
        isPenalty: data[i][6],
        cardType: data[i][7],
        description: data[i][8],
        videoTimestamp: data[i][9],
        clipMarker: data[i][10],
        clipStart: data[i][11],
        clipEnd: data[i][12]
      });
    }
  }
  return events;
}
