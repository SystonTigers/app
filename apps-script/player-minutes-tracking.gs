/**
 * @fileoverview Player Minutes Tracking Functions for Syston Tigers Football Automation
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Additional player minutes tracking functions to add to player-management-svc.gs
 */

// ==================== PLAYER MINUTES TRACKING ====================

/**
 * Track player minutes for a match
 * @param {string} matchId - Match identifier
 * @param {Array<string>} startingPlayers - Starting XI player names
 * @param {Array<Object>} substitutions - Substitution events
 * @returns {Object} Processing result
 */
function trackPlayerMinutes(matchId, startingPlayers = [], substitutions = []) {
  logger.enterFunction('trackPlayerMinutes', { matchId, startingCount: startingPlayers.length, subCount: substitutions.length });

  try {
    // @testHook(player_minutes_start)

    // Get or create Player Minutes sheet
    const minutesColumns = [
      'Match ID', 'Player', 'Minutes Played', 'Start Time', 'End Time',
      'Was Starter', 'Sub In', 'Sub Out', 'Date', 'Opposition'
    ];
    const minutesSheet = SheetUtils.getOrCreateSheet('Player Minutes', minutesColumns);

    if (!minutesSheet) {
      return { success: false, error: 'Failed to create Player Minutes sheet' };
    }

    const matchStartTime = 0; // Match starts at minute 0
    const fullTimeMinute = getConfigValue('MATCH.FULL_TIME_MINUTES', 90);
    const playerMinutesData = [];

    // Track starting players
    startingPlayers.forEach(player => {
      const minutesPlayed = calculatePlayerMinutes(player, matchStartTime, fullTimeMinute, substitutions);
      const subOut = findSubOut(player, substitutions);

      playerMinutesData.push({
        matchId: matchId,
        player: player,
        minutesPlayed: minutesPlayed,
        startTime: matchStartTime,
        endTime: subOut ? subOut.minute : fullTimeMinute,
        wasStarter: true,
        subIn: null,
        subOut: subOut ? subOut.minute : null,
        date: DateUtils.formatISO(DateUtils.now()),
        opposition: getOppositionTeam({ id: matchId })
      });
    });

    // Track substitute players
    substitutions.forEach(sub => {
      if (sub.playerOn && !startingPlayers.includes(sub.playerOn)) {
        const minutesPlayed = calculatePlayerMinutes(sub.playerOn, sub.minute, fullTimeMinute, substitutions);
        const subOut = findSubOut(sub.playerOn, substitutions);

        playerMinutesData.push({
          matchId: matchId,
          player: sub.playerOn,
          minutesPlayed: minutesPlayed,
          startTime: sub.minute,
          endTime: subOut ? subOut.minute : fullTimeMinute,
          wasStarter: false,
          subIn: sub.minute,
          subOut: subOut ? subOut.minute : null,
          date: DateUtils.formatISO(DateUtils.now()),
          opposition: getOppositionTeam({ id: matchId })
        });
      }
    });

    // Write data to sheet
    playerMinutesData.forEach(data => {
      const rowData = [
        data.matchId, data.player, data.minutesPlayed, data.startTime, data.endTime,
        data.wasStarter, data.subIn, data.subOut, data.date, data.opposition
      ];
      SheetUtils.appendRow(minutesSheet, rowData);
    });

    // Update total minutes for each player
    const updateResults = [];
    playerMinutesData.forEach(data => {
      const updateResult = updatePlayerTotalMinutes(data);
      updateResults.push(updateResult);
    });

    logger.exitFunction('trackPlayerMinutes', { success: true, playersTracked: playerMinutesData.length });
    return {
      success: true,
      playersTracked: playerMinutesData.length,
      minutesData: playerMinutesData,
      updateResults: updateResults
    };

  } catch (error) {
    logger.error('Player minutes tracking failed', { error: error.toString() });
    logger.exitFunction('trackPlayerMinutes', { success: false });
    return { success: false, error: error.toString() };
  }
}

/**
 * Handle substitution event
 * @param {Object} subData - Substitution data
 * @returns {Object} Processing result
 */
function handleSubstitution(subData) {
  logger.enterFunction('handleSubstitution', { playerOff: subData.playerOff, playerOn: subData.playerOn });

  try {
    // @testHook(substitution_start)

    const { matchId, playerOff, playerOn, minute } = subData;

    // Swap players in team sheets
    const swapResult = swapPlayersInTeamSheets(matchId, playerOff, playerOn);

    // Create substitution payload for Make.com
    const payload = {
      event_type: 'substitution',
      match_id: matchId,
      player_off: playerOff,
      player_on: playerOn,
      minute: minute,
      timestamp: DateUtils.formatISO(DateUtils.now()),
      system_version: getConfigValue('SYSTEM.VERSION')
    };

    // @testHook(substitution_webhook)
    const webhookResult = sendToMake(payload);

    logger.exitFunction('handleSubstitution', { success: true });
    return {
      success: true,
      swapResult: swapResult,
      webhook_sent: webhookResult.success
    };

  } catch (error) {
    logger.error('Substitution handling failed', { error: error.toString() });
    logger.exitFunction('handleSubstitution', { success: false });
    return { success: false, error: error.toString() };
  }
}

/**
 * Swap players in team sheets
 * @param {string} matchId - Match identifier
 * @param {string} playerOff - Player being substituted off
 * @param {string} playerOn - Player being substituted on
 * @returns {Object} Processing result
 */
function swapPlayersInTeamSheets(matchId, playerOff, playerOn) {
  logger.enterFunction('swapPlayersInTeamSheets', { matchId, playerOff, playerOn });

  try {
    // @testHook(team_sheets_swap_start)

    const teamSheetsTabName = getConfigValue('SHEETS.TAB_NAMES.TEAM_SHEETS', 'Team Sheets');
    const teamSheet = SheetUtils.getSheet(teamSheetsTabName);

    if (!teamSheet) {
      return { success: false, error: 'Team Sheets tab not found' };
    }

    // Find and update the relevant match row
    const data = teamSheet.getDataRange().getValues();
    const headers = data[0];
    const matchIdCol = headers.indexOf('Match ID');

    if (matchIdCol === -1) {
      return { success: false, error: 'Match ID column not found in Team Sheets' };
    }

    let updatedRows = 0;
    for (let i = 1; i < data.length; i++) {
      if (data[i][matchIdCol] === matchId) {
        // Replace playerOff with playerOn in this row
        for (let j = 0; j < data[i].length; j++) {
          if (data[i][j] === playerOff) {
            teamSheet.getRange(i + 1, j + 1).setValue(playerOn);
            updatedRows++;
          }
        }
      }
    }

    logger.exitFunction('swapPlayersInTeamSheets', { success: true, updatedRows });
    return {
      success: true,
      updatedRows: updatedRows,
      playerOff: playerOff,
      playerOn: playerOn
    };

  } catch (error) {
    logger.error('Team sheets swap failed', { error: error.toString() });
    logger.exitFunction('swapPlayersInTeamSheets', { success: false });
    return { success: false, error: error.toString() };
  }
}

/**
 * Update player total minutes in stats sheet
 * @param {Object} playerMinutes - Player minutes data
 * @returns {Object} Processing result
 */
function updatePlayerTotalMinutes(playerMinutes) {
  logger.enterFunction('updatePlayerTotalMinutes', { player: playerMinutes.player });

  try {
    const statsTabName = getConfigValue('SHEETS.TAB_NAMES.PLAYER_STATS', 'Player Stats');
    const statsSheet = SheetUtils.getSheet(statsTabName);

    if (!statsSheet) {
      return { success: false, error: 'Player Stats sheet not found' };
    }

    const data = statsSheet.getDataRange().getValues();
    const headers = data[0];
    const playerCol = headers.indexOf('Player');
    const minutesCol = headers.indexOf('Total Minutes') || headers.indexOf('Minutes');

    if (playerCol === -1 || minutesCol === -1) {
      return { success: false, error: 'Required columns not found in Player Stats' };
    }

    // Find player row and update minutes
    for (let i = 1; i < data.length; i++) {
      if (data[i][playerCol] === playerMinutes.player) {
        const currentMinutes = parseInt(data[i][minutesCol]) || 0;
        const newTotal = currentMinutes + playerMinutes.minutesPlayed;
        statsSheet.getRange(i + 1, minutesCol + 1).setValue(newTotal);

        logger.exitFunction('updatePlayerTotalMinutes', { success: true, newTotal });
        return {
          success: true,
          player: playerMinutes.player,
          minutesAdded: playerMinutes.minutesPlayed,
          newTotal: newTotal
        };
      }
    }

    // Player not found - add new row if needed
    const newRow = new Array(headers.length);
    newRow[playerCol] = playerMinutes.player;
    newRow[minutesCol] = playerMinutes.minutesPlayed;
    statsSheet.appendRow(newRow);

    logger.exitFunction('updatePlayerTotalMinutes', { success: true, newPlayer: true });
    return {
      success: true,
      player: playerMinutes.player,
      minutesAdded: playerMinutes.minutesPlayed,
      newPlayer: true
    };

  } catch (error) {
    logger.error('Player total minutes update failed', { error: error.toString() });
    logger.exitFunction('updatePlayerTotalMinutes', { success: false });
    return { success: false, error: error.toString() };
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate minutes played for a player
 * @param {string} player - Player name
 * @param {number} startMinute - When player started playing
 * @param {number} endMinute - When player stopped playing
 * @param {Array<Object>} substitutions - All substitutions in match
 * @returns {number} Minutes played
 */
function calculatePlayerMinutes(player, startMinute, endMinute, substitutions) {
  const subOut = findSubOut(player, substitutions);
  const actualEndMinute = subOut ? subOut.minute : endMinute;
  return Math.max(0, actualEndMinute - startMinute);
}

/**
 * Find when a player was substituted out
 * @param {string} player - Player name
 * @param {Array<Object>} substitutions - All substitutions
 * @returns {Object|null} Substitution data or null
 */
function findSubOut(player, substitutions) {
  return substitutions.find(sub => sub.playerOff === player) || null;
}