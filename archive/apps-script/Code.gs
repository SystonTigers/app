/**
 * Football Highlights Google Apps Script
 * Complete integration for video processing and storage management
 *
 * This script provides:
 * - Customer-facing spreadsheet interface
 * - Live match notes with validation
 * - Video processing job management
 * - Webhook handlers for completion notifications
 * - Automated player highlight sheets
 * - Storage monitoring and cleanup
 */

// Configuration (replaced by installer during deployment)
const CONFIG = {
  RAILWAY_URL: '{{RAILWAY_URL}}',
  RENDER_URL: '{{RENDER_URL}}',
  CLOUDFLARE_URL: '{{CLOUDFLARE_URL}}',
  WEBHOOK_URL: '{{WEBHOOK_URL}}',
  CLUB_NAME: '{{CLUB_NAME}}',
  SEASON: '{{SEASON}}',
  REGION: '{{REGION}}',
  DRIVE_FOLDER_ID: '{{DRIVE_FOLDER_ID}}',
  NOTIFICATION_EMAIL: '{{NOTIFICATION_EMAIL}}',
  API_KEY: '{{API_KEY}}'
};

// Global constants
const SHEET_NAMES = {
  QUEUE: 'Video Queue',
  NOTES: 'Match Notes',
  SETTINGS: 'Settings',
  ACTIVITY: 'Activity Log',
  STORAGE: 'Storage Info',
  STATS: 'Season Statistics',
  DASHBOARD: 'Dashboard'
};

const STATUS = {
  READY: 'READY',
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  COMPLETE: 'COMPLETE',
  FAILED: 'FAILED',
  ERROR: 'ERROR'
};

/**
 * MAIN EVENT HANDLERS
 */

function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  const range = e.range;

  try {
    Logger.log(`Edit detected: ${sheet.getName()}, Row: ${range.getRow()}, Col: ${range.getColumn()}`);

    switch (sheet.getName()) {
      case SHEET_NAMES.QUEUE:
        handleVideoQueueEdit(range);
        break;

      case SHEET_NAMES.NOTES:
        handleMatchNotesEdit(range);
        break;

      case SHEET_NAMES.SETTINGS:
        handleSettingsEdit(range);
        break;
    }
  } catch (error) {
    Logger.log('Edit handler failed: ' + error.toString());
    logActivity(`Edit handler error: ${error.message}`, 'error');
  }
}

function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();

    ui.createMenu('🏈 Football Highlights')
      .addItem('🎬 Process Video Queue', 'processVideoQueue')
      .addSeparator()
      .addItem('📝 Validate Match Notes', 'validateAllMatchNotes')
      .addItem('📊 Update Dashboard', 'updateDashboard')
      .addSeparator()
      .addItem('🔧 System Setup', 'runSystemSetup')
      .addItem('🧪 Test System', 'runSystemTests')
      .addSeparator()
      .addItem('📧 Send Test Email', 'sendTestNotification')
      .addItem('🔄 Refresh Storage Info', 'refreshStorageInfo')
      .addToUi();

    // Show welcome message for new users
    showWelcomeMessage();

  } catch (error) {
    Logger.log('onOpen error: ' + error.toString());
  }
}

/**
 * VIDEO QUEUE MANAGEMENT
 */

function handleVideoQueueEdit(range) {
  const row = range.getRow();
  const col = range.getColumn();

  // Skip header row
  if (row <= 1) return;

  // Video URL column (column 1)
  if (col === 1) {
    const videoUrl = range.getValue();
    if (videoUrl && videoUrl.toString().trim()) {
      processNewVideoRequest(row);
    }
  }

  // Manual processing trigger (column 11)
  if (col === 11) {
    const triggerValue = range.getValue();
    if (triggerValue === 'PROCESS NOW' || triggerValue === 'GO') {
      processVideoRow(row);
      range.setValue(''); // Clear trigger
    }
  }
}

function processNewVideoRequest(row) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.QUEUE);
  const videoData = getVideoDataFromRow(sheet, row);

  if (!videoData || !videoData.videoUrl) {
    logActivity('Invalid video data provided', 'error');
    return;
  }

  // Validate video URL
  if (!isValidDriveUrl(videoData.videoUrl)) {
    updateCellStatus(sheet, row, 6, STATUS.ERROR);
    updateCellStatus(sheet, row, 7, '❌ Invalid Drive URL format');
    logActivity(`Invalid Drive URL: ${videoData.videoUrl}`, 'error');
    showUserAlert('Invalid Video URL', 'Please provide a valid Google Drive video URL.', 'error');
    return;
  }

  // Set initial status
  updateCellStatus(sheet, row, 6, STATUS.READY);
  updateCellStatus(sheet, row, 7, '✅ Ready for processing');
  updateCellStatus(sheet, row, 8, new Date());

  logActivity(`New video queued: ${videoData.opponent}`, 'info');

  // Auto-process if enabled in settings
  if (getSettingValue('Auto Process', 'YES') === 'YES') {
    Utilities.sleep(1000); // Brief delay to ensure UI updates
    processVideoRow(row);
  }
}

function processVideoRow(row) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.QUEUE);
  const videoData = getVideoDataFromRow(sheet, row);

  if (!videoData) {
    logActivity('No video data found for processing', 'error');
    return;
  }

  try {
    // Update status to queued
    updateCellStatus(sheet, row, 6, STATUS.QUEUED);
    updateCellStatus(sheet, row, 7, '⏳ Sending to processing...');

    // Submit to processing service
    const result = submitVideoForProcessing(videoData, row);

    if (result.success) {
      updateCellStatus(sheet, row, 6, STATUS.PROCESSING);
      updateCellStatus(sheet, row, 7, `🎬 Processing on ${result.service}`);
      updateCellStatus(sheet, row, 9, result.jobId);

      logActivity(`Processing started: ${videoData.opponent} (Job: ${result.jobId})`, 'success');
    } else {
      updateCellStatus(sheet, row, 6, STATUS.FAILED);
      updateCellStatus(sheet, row, 7, `❌ ${result.error}`);

      logActivity(`Processing failed: ${result.error}`, 'error');
      sendErrorNotification('Video Processing Failed', result.error, videoData);
    }

  } catch (error) {
    updateCellStatus(sheet, row, 6, STATUS.ERROR);
    updateCellStatus(sheet, row, 7, `❌ System error: ${error.message}`);

    logActivity(`Processing error: ${error.message}`, 'error');
    Logger.log('processVideoRow error: ' + error.toString());
  }
}

function submitVideoForProcessing(videoData, row) {
  const matchNotes = getCurrentMatchNotes();
  const jobId = generateJobId();

  const jobPayload = {
    jobId: jobId,
    videoUrl: videoData.videoUrl,
    matchNotes: matchNotes,
    clubName: CONFIG.CLUB_NAME,
    matchDate: formatDate(videoData.matchDate),
    opponent: videoData.opponent,
    manualCuts: videoData.manualCuts,
    createPlayerHighlights: videoData.createPlayerHighlights,
    privacy: videoData.privacy,
    notificationUrl: CONFIG.WEBHOOK_URL,
    requestId: `${CONFIG.CLUB_NAME}_${Date.now()}`,
    metadata: {
      sheetRow: row,
      region: CONFIG.REGION,
      season: CONFIG.SEASON
    }
  };

  // Try processing endpoints in order of preference
  const endpoints = [
    { url: CONFIG.CLOUDFLARE_URL, name: 'Cloudflare', primary: true },
    { url: CONFIG.RAILWAY_URL, name: 'Railway', primary: false },
    { url: CONFIG.RENDER_URL, name: 'Render', primary: false }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = UrlFetchApp.fetch(`${endpoint.url}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.API_KEY}`,
          'User-Agent': 'Football-Highlights-Apps-Script/1.0'
        },
        payload: JSON.stringify(jobPayload),
        muteHttpExceptions: true
      });

      if (response.getResponseCode() === 200) {
        const result = JSON.parse(response.getContentText());

        return {
          success: true,
          jobId: jobId,
          service: endpoint.name,
          estimatedTime: result.estimatedTime,
          statusUrl: result.statusUrl
        };
      } else {
        Logger.log(`${endpoint.name} failed with status: ${response.getResponseCode()}`);
      }

    } catch (error) {
      Logger.log(`${endpoint.name} error: ${error.toString()}`);
    }
  }

  return {
    success: false,
    error: 'All processing services unavailable'
  };
}

function getVideoDataFromRow(sheet, row) {
  try {
    const data = sheet.getRange(row, 1, 1, 12).getValues()[0];
    const [videoUrl, matchDate, opponent, notes, manualCuts, status, details, updated, jobId, completed, trigger, playerHighlights] = data;

    if (!videoUrl) return null;

    return {
      videoUrl: videoUrl.toString().trim(),
      matchDate: matchDate || new Date(),
      opponent: opponent || 'Unknown Opponent',
      notes: notes || '',
      manualCuts: parseManualCuts(manualCuts),
      createPlayerHighlights: (playerHighlights === 'YES' || playerHighlights === true),
      privacy: getSettingValue('Default Privacy', 'unlisted'),
      row: row
    };
  } catch (error) {
    Logger.log('getVideoDataFromRow error: ' + error.toString());
    return null;
  }
}

function parseManualCuts(cutsString) {
  if (!cutsString) return [];

  try {
    return cutsString.toString().split(',').map(cut => {
      const trimmed = cut.trim();
      const [start, end] = trimmed.split('-');
      return {
        startTime: start ? start.trim() : '0:00',
        endTime: end ? end.trim() : '0:30',
        description: 'Manual cut'
      };
    }).filter(cut => cut.startTime && cut.endTime);
  } catch (error) {
    Logger.log('parseManualCuts error: ' + error.toString());
    return [];
  }
}

/**
 * MATCH NOTES MANAGEMENT
 */

function handleMatchNotesEdit(range) {
  const row = range.getRow();
  const col = range.getColumn();

  // Skip header row
  if (row <= 1) return;

  // Validate and format match notes in real-time
  if (col <= 5) { // Timestamp, Player, Action, Description, Include columns
    validateMatchNote(row);
    updateMatchSummary();

    // Auto-save every 10 edits to prevent data loss
    if (Math.random() < 0.1) {
      SpreadsheetApp.flush();
    }
  }
}

function validateMatchNote(row) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.NOTES);
  const data = sheet.getRange(row, 1, 1, 5).getValues()[0];
  const [timestamp, player, action, description, include] = data;

  let isValid = true;
  let validationMessage = '';

  // Validate timestamp format (MM:SS or HH:MM:SS)
  if (timestamp) {
    const timeStr = timestamp.toString().trim();
    if (!/^\d{1,3}:\d{2}(:\d{2})?$/.test(timeStr)) {
      sheet.getRange(row, 1).setBackground('#ffebee').setNote('Invalid time format. Use MM:SS or HH:MM:SS');
      isValid = false;
      validationMessage += 'Invalid timestamp format. ';
    } else {
      sheet.getRange(row, 1).setBackground('#ffffff').clearNote();

      // Auto-format timestamp
      const parts = timeStr.split(':');
      if (parts.length === 2) {
        const formatted = `${parts[0].padStart(2, '0')}:${parts[1]}`;
        if (formatted !== timeStr) {
          sheet.getRange(row, 1).setValue(formatted);
        }
      }
    }
  }

  // Validate player name
  if (player) {
    const playerStr = player.toString().trim();
    if (!/^[A-Za-z\s'-]+$/.test(playerStr)) {
      sheet.getRange(row, 2).setBackground('#ffebee').setNote('Player name should only contain letters, spaces, hyphens, and apostrophes');
      isValid = false;
      validationMessage += 'Invalid player name. ';
    } else {
      sheet.getRange(row, 2).setBackground('#ffffff').clearNote();

      // Auto-format player name (Title Case)
      const formatted = playerStr.replace(/\w\S*/g, (txt) =>
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );
      if (formatted !== playerStr) {
        sheet.getRange(row, 2).setValue(formatted);
      }
    }
  }

  // Validate action
  if (action) {
    const actionStr = action.toString().toLowerCase().trim();
    const validActions = [
      'goal', 'assist', 'save', 'tackle', 'pass', 'cross', 'shot',
      'yellow card', 'red card', 'foul', 'offside', 'corner',
      'free kick', 'penalty', 'substitution', 'throw-in'
    ];

    const isValidAction = validActions.some(validAction =>
      actionStr.includes(validAction)
    );

    if (!isValidAction) {
      sheet.getRange(row, 3).setBackground('#fff3e0').setNote('Consider using: goal, assist, save, tackle, card, foul, etc.');
    } else {
      sheet.getRange(row, 3).setBackground('#ffffff').clearNote();
    }
  }

  // Set default include value
  if (!include && timestamp && player && action) {
    sheet.getRange(row, 5).setValue('YES');
  }

  // Log validation result
  if (!isValid) {
    logActivity(`Match note validation failed (Row ${row}): ${validationMessage}`, 'warning');
  }

  return isValid;
}

function getCurrentMatchNotes() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.NOTES);
  if (!sheet) return '';

  try {
    const data = sheet.getDataRange().getValues();
    let notes = '';

    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const [timestamp, player, action, description, include] = data[i];

      // Only include notes marked for highlights (default YES if empty)
      if (timestamp && player && action && include !== 'NO' && include !== false) {
        const timeStr = timestamp.toString().trim();
        const playerStr = player.toString().trim();
        const actionStr = action.toString().trim();

        notes += `${timeStr} - ${playerStr} ${actionStr}`;
        if (description && description.toString().trim()) {
          notes += ` (${description.toString().trim()})`;
        }
        notes += '\\n';
      }
    }

    return notes.trim();
  } catch (error) {
    Logger.log('getCurrentMatchNotes error: ' + error.toString());
    return '';
  }
}

function updateMatchSummary() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.NOTES);
  if (!sheet) return;

  try {
    const data = sheet.getDataRange().getValues();

    let summary = {
      totalActions: 0,
      players: new Set(),
      actions: {},
      timeline: []
    };

    // Analyze match notes
    for (let i = 1; i < data.length; i++) {
      const [timestamp, player, action, description, include] = data[i];

      if (timestamp && player && action && include !== 'NO') {
        summary.totalActions++;
        summary.players.add(player.toString().trim());

        const actionStr = action.toString().toLowerCase();
        summary.actions[actionStr] = (summary.actions[actionStr] || 0) + 1;

        summary.timeline.push({
          time: timestamp.toString(),
          player: player.toString(),
          action: actionStr
        });
      }
    }

    // Update summary section in the sheet
    updateMatchSummarySection(sheet, summary);

    // Update dashboard
    updateDashboardMatchInfo(summary);

  } catch (error) {
    Logger.log('updateMatchSummary error: ' + error.toString());
  }
}

function updateMatchSummarySection(sheet, summary) {
  try {
    // Find or create summary section
    const summaryRow = findOrCreateSummaryRow(sheet);

    const summaryData = [
      ['MATCH SUMMARY', '', '', '', ''],
      ['Total Actions', summary.totalActions, '', '', ''],
      ['Players Involved', summary.players.size, '', '', ''],
      ['Top Actions', Object.keys(summary.actions).slice(0, 3).join(', '), '', '', '']
    ];

    sheet.getRange(summaryRow, 1, 4, 5).setValues(summaryData);
    sheet.getRange(summaryRow, 1, 1, 5)
      .setBackground('#4a90e2')
      .setFontColor('white')
      .setFontWeight('bold');

  } catch (error) {
    Logger.log('updateMatchSummarySection error: ' + error.toString());
  }
}

function findOrCreateSummaryRow(sheet) {
  const data = sheet.getDataRange().getValues();

  // Look for existing summary section
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().includes('MATCH SUMMARY')) {
      return i + 1;
    }
  }

  // Create new summary section
  const lastRow = sheet.getLastRow();
  sheet.insertRows(lastRow + 2, 4);
  return lastRow + 3;
}

/**
 * WEBHOOK HANDLERS
 */

function doPost(e) {
  try {
    if (!e.postData) {
      return createJsonResponse({ status: 'error', message: 'No data received' });
    }

    const data = JSON.parse(e.postData.contents);
    Logger.log('Webhook received: ' + JSON.stringify(data));

    let result;
    switch (data.type) {
      case 'video_complete':
        result = handleVideoCompletion(data);
        break;
      case 'video_failed':
        result = handleVideoFailure(data);
        break;
      case 'storage_alert':
        result = handleStorageAlert(data);
        break;
      case 'cleanup_notification':
        result = handleCleanupNotification(data);
        break;
      case 'test':
        result = handleTestWebhook(data);
        break;
      default:
        result = { status: 'unknown_type', type: data.type };
    }

    return createJsonResponse({
      status: 'success',
      timestamp: new Date().toISOString(),
      result: result
    });

  } catch (error) {
    Logger.log('Webhook processing failed: ' + error.toString());
    logActivity(`Webhook error: ${error.message}`, 'error');

    return createJsonResponse({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

function handleVideoCompletion(data) {
  const { jobId, status, uploadResults, stats, metadata, processingTime } = data;

  try {
    // Find the video in the queue by job ID
    const queueSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.QUEUE);
    const targetRow = findVideoByJobId(queueSheet, jobId);

    if (targetRow === -1) {
      Logger.log(`Video completion webhook: job ID ${jobId} not found`);
      logActivity(`Completion webhook received but job ID ${jobId} not found`, 'warning');
      return { status: 'job_not_found', jobId };
    }

    // Update video queue with completion
    updateCellStatus(queueSheet, targetRow, 6, STATUS.COMPLETE);
    updateCellStatus(queueSheet, targetRow, 10, new Date());

    const teamUrl = uploadResults?.teamHighlight?.youtube?.url || 'N/A';
    const playerCount = uploadResults?.playerHighlights?.length || 0;

    updateCellStatus(queueSheet, targetRow, 7,
      `✅ Complete: Team video + ${playerCount} player highlights`);

    // Create or update player highlight sheets
    if (uploadResults?.playerHighlights?.length > 0) {
      createPlayerHighlightEntries(uploadResults.playerHighlights, metadata);
    }

    // Update season statistics
    updateSeasonStatistics(stats, metadata);

    // Update dashboard
    updateDashboard();

    // Send completion notification
    sendCompletionNotification(uploadResults, stats, metadata);

    // Log success
    const processingTimeMin = Math.round(processingTime / 60000);
    logActivity(`✅ Video completed: ${metadata?.opponent || 'Unknown'} (${processingTimeMin}min)`, 'success');

    return {
      status: 'processed',
      jobId,
      teamUrl,
      playerHighlights: playerCount
    };

  } catch (error) {
    Logger.log('handleVideoCompletion error: ' + error.toString());
    logActivity(`Video completion handler error: ${error.message}`, 'error');
    throw error;
  }
}

function handleVideoFailure(data) {
  const { jobId, error, metadata } = data;

  try {
    const queueSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.QUEUE);
    const targetRow = findVideoByJobId(queueSheet, jobId);

    if (targetRow !== -1) {
      updateCellStatus(queueSheet, targetRow, 6, STATUS.FAILED);
      updateCellStatus(queueSheet, targetRow, 7, `❌ ${error}`);
      updateCellStatus(queueSheet, targetRow, 10, new Date());
    }

    // Send failure notification
    sendErrorNotification('Video Processing Failed', error, metadata);

    logActivity(`❌ Video processing failed: ${error}`, 'error');

    return { status: 'failure_logged', jobId, error };

  } catch (err) {
    Logger.log('handleVideoFailure error: ' + err.toString());
    throw err;
  }
}

function handleStorageAlert(data) {
  const { level, message, usage, recommended_action } = data;

  try {
    // Update storage info sheet
    updateStorageAlert(level, message, usage);

    // Send notification if critical
    if (level === 'critical' || level === 'emergency') {
      sendStorageAlert(level, message, usage, recommended_action);
    }

    logActivity(`📦 Storage alert (${level}): ${message}`, level === 'critical' ? 'error' : 'warning');

    return { status: 'alert_processed', level };

  } catch (error) {
    Logger.log('handleStorageAlert error: ' + error.toString());
    throw error;
  }
}

function handleCleanupNotification(data) {
  const { files_deleted, storage_freed, next_cleanup } = data;

  try {
    // Update storage info
    updateCleanupInfo(files_deleted, storage_freed, next_cleanup);

    logActivity(`🗑️ Cleanup completed: ${files_deleted} files deleted, ${storage_freed} freed`, 'info');

    return { status: 'cleanup_logged', files_deleted };

  } catch (error) {
    Logger.log('handleCleanupNotification error: ' + error.toString());
    throw error;
  }
}

function handleTestWebhook(data) {
  logActivity('🧪 Test webhook received successfully', 'info');
  return { status: 'test_received', timestamp: data.timestamp };
}

/**
 * PLAYER HIGHLIGHT SHEETS
 */

function createPlayerHighlightEntries(playerHighlights, metadata) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  playerHighlights.forEach(player => {
    try {
      let sheet = ss.getSheetByName(`${player.player} Highlights`);

      if (!sheet) {
        sheet = createPlayerHighlightSheet(ss, player.player);
      }

      addPlayerHighlightEntry(sheet, player, metadata);

    } catch (error) {
      Logger.log(`Error creating player highlight for ${player.player}: ${error.toString()}`);
      logActivity(`Error creating ${player.player} highlights: ${error.message}`, 'error');
    }
  });
}

function createPlayerHighlightSheet(spreadsheet, playerName) {
  try {
    const sheet = spreadsheet.insertSheet(`${playerName} Highlights`);

    // Set up sheet formatting
    sheet.setTabColor('#4a90e2');

    // Create header section
    sheet.insertRows(1, 3);
    sheet.getRange(1, 1, 1, 8).merge();
    sheet.getRange(1, 1)
      .setValue(`🏃 ${playerName} - ${CONFIG.SEASON} Season Highlights`)
      .setFontSize(16)
      .setFontWeight('bold')
      .setBackground('#4a90e2')
      .setFontColor('white')
      .setHorizontalAlignment('center');

    // Add season summary row
    sheet.getRange(2, 1, 1, 8).merge();
    sheet.getRange(2, 1)
      .setValue(`${CONFIG.CLUB_NAME} • Season ${CONFIG.SEASON}`)
      .setFontStyle('italic')
      .setHorizontalAlignment('center')
      .setBackground('#e6f3ff');

    // Add column headers
    const headers = [
      'Date', 'Match', 'Actions', 'Duration',
      'Drive Link (30 days)', 'YouTube Link', 'Playlist', 'Status'
    ];

    sheet.getRange(3, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(3, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#f0f0f0')
      .setBorder(true, true, true, true, true, true);

    // Set column widths
    sheet.setColumnWidths(1, 8, [100, 200, 80, 80, 150, 150, 150, 100]);

    // Add data validation for Status column
    const statusValidation = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Active', 'Archived', 'Deleted'])
      .setAllowInvalid(false)
      .build();

    sheet.getRange(4, 8, 1000, 1).setDataValidation(statusValidation);

    return sheet;

  } catch (error) {
    Logger.log('createPlayerHighlightSheet error: ' + error.toString());
    throw error;
  }
}

function addPlayerHighlightEntry(sheet, playerData, metadata) {
  try {
    const nextRow = sheet.getLastRow() + 1;

    const opponent = metadata?.opponent || 'Unknown Opponent';
    const matchDate = metadata?.matchDate || new Date().toISOString().split('T')[0];

    // Prepare row data
    const rowData = [
      new Date(),                                    // Date
      `${CONFIG.CLUB_NAME} vs ${opponent}`,          // Match
      playerData.actions?.join(', ') || 'Various',   // Actions
      formatDuration(playerData.duration || 0),      // Duration
      playerData.drive?.webViewLink || 'N/A',        // Drive Link
      playerData.youtube?.url || 'N/A',              // YouTube Link
      playerData.youtube?.playlistUrl || 'N/A',      // Playlist
      'Active'                                       // Status
    ];

    // Add the data
    sheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);

    // Format the Drive link with warning color and note
    if (playerData.drive?.webViewLink) {
      sheet.getRange(nextRow, 5)
        .setFontColor('#ff6600')
        .setNote('⚠️ This Drive link will be automatically deleted in 30 days. Use YouTube link for permanent access.');
    }

    // Format YouTube links as clickable
    if (playerData.youtube?.url) {
      sheet.getRange(nextRow, 6)
        .setFontColor('#1155cc')
        .setFontStyle('underline');
    }

    if (playerData.youtube?.playlistUrl) {
      sheet.getRange(nextRow, 7)
        .setFontColor('#1155cc')
        .setFontStyle('underline');
    }

    // Add alternating row colors
    if (nextRow % 2 === 0) {
      sheet.getRange(nextRow, 1, 1, rowData.length).setBackground('#f9f9f9');
    }

    // Update playlist link in header if available
    if (playerData.youtube?.playlistUrl) {
      updatePlayerSheetPlaylist(sheet, playerData.player, playerData.youtube.playlistUrl);
    }

    Logger.log(`Added highlight entry for ${playerData.player}`);

  } catch (error) {
    Logger.log('addPlayerHighlightEntry error: ' + error.toString());
    throw error;
  }
}

function updatePlayerSheetPlaylist(sheet, playerName, playlistUrl) {
  try {
    // Create rich text with playlist link
    const richText = SpreadsheetApp.newRichTextValue()
      .setText(`🏃 ${playerName} - ${CONFIG.SEASON} Season Highlights • `)
      .setTextStyle(SpreadsheetApp.newTextStyle().setFontSize(16).setFontWeight('bold').build())
      .setText('View YouTube Playlist')
      .setLinkUrl(playlistUrl)
      .setTextStyle(SpreadsheetApp.newTextStyle()
        .setFontSize(14)
        .setUnderline(true)
        .setForegroundColor('#1155cc')
        .build())
      .build();

    sheet.getRange(1, 1).setRichTextValue(richText);

  } catch (error) {
    Logger.log('updatePlayerSheetPlaylist error: ' + error.toString());
  }
}