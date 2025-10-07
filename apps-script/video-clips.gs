/**
 * @fileoverview Video clips public API and orchestration utilities.
 * @version 6.2.0
 * @description Exposes the video integration entrypoints and delegates core logic to feature modules.
 */

var Video = Video || {};

function getVideoClipsManager_() {
  return new Video.ClipsManager();
}

function createGoalClipMetadata(minute, player, assist = '', opponent = '', matchId = null) {
  return getVideoClipsManager_().createGoalClip(minute, player, assist, opponent, matchId);
}

function markVideoEventForEditor(minute, eventType, player = '', description = '') {
  return getVideoClipsManager_().markVideoEvent(minute, eventType, player, description);
}

function organizeClipsInPlayerFolder(player, clipId) {
  return getVideoClipsManager_().organizePlayerClips(player, clipId);
}

function generateMatchOverlayGraphics(matchId, matchInfo = {}) {
  return getVideoClipsManager_().generateMatchGraphics(matchId, matchInfo);
}

function uploadClipToYouTube(clipId, filePath) {
  return getVideoClipsManager_().uploadToYouTube(clipId, filePath);
}

function getAllVideoClips() {
  try {
    const videoSheet = SheetUtils.getOrCreateSheet(
      getConfigValue('SHEETS.TAB_NAMES.VIDEO_CLIPS')
    );

    if (!videoSheet) {
      return {
        success: false,
        error: 'Cannot access Video Clips sheet'
      };
    }

    const allClips = SheetUtils.getAllDataAsObjects(videoSheet);

    return {
      success: true,
      clips: allClips,
      count: allClips.length,
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

function exportEventsForHighlights(matchId) {
  const highlightsLogger = logger.scope('VideoHighlights');
  highlightsLogger.enterFunction('exportEventsForHighlights', { matchId });

  // @testHook('video.export.events.start')

  const normalizedMatchId = (matchId || '').toString().trim();
  if (!normalizedMatchId) {
    highlightsLogger.warn('Match ID is required for highlights export');
    highlightsLogger.exitFunction('exportEventsForHighlights', { success: false, reason: 'missing_match_id' });
    return { ok: false, path: '', count: 0, reason: 'missing_match_id' };
  }

  try {
    const spreadsheet = getSheet();
    const sheetNames = Array.from(new Set([
      getConfigValue('SHEETS.TAB_NAMES.LIVE_MATCH_UPDATES', ''),
      getConfigValue('SHEETS.TAB_NAMES.PLAYER_EVENTS', '')
    ].filter(Boolean)));

    const events = [];
    const seen = new Set();

    sheetNames.forEach(sheetName => {
      const sheet = spreadsheet.getSheetByName(sheetName);
      if (!sheet) {
        highlightsLogger.warn('Sheet not found for highlights export', { sheetName });
        return;
      }

      const lastRow = sheet.getLastRow();
      const lastColumn = sheet.getLastColumn();

      if (lastRow < 2 || lastColumn === 0) {
        return;
      }

      const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
        .map(header => (header || '').toString().trim());
      const headerMap = headers.reduce((acc, header, index) => {
        const key = header.toLowerCase();
        if (!acc[key]) {
          acc[key] = index;
        }
        return acc;
      }, {});

      const matchColumnIndex = getFirstAvailableIndex_(headerMap, ['match id', 'matchid', 'fixture id', 'fixture', 'game id']);
      if (typeof matchColumnIndex !== 'number') {
        highlightsLogger.warn('Skipping sheet without match column for highlights export', { sheetName });
        return;
      }

      const batchSize = 250;
      for (let startRow = 2; startRow <= lastRow; startRow += batchSize) {
        const rowCount = Math.min(batchSize, lastRow - startRow + 1);
        const rows = sheet.getRange(startRow, 1, rowCount, lastColumn).getValues();

        rows.forEach(row => {
          const rowMatchId = (row[matchColumnIndex] || '').toString().trim();
          if (rowMatchId !== normalizedMatchId) {
            return;
          }

          const minute = extractValueFromRow_(row, headerMap, ['minute']);
          const type = extractValueFromRow_(row, headerMap, ['event type', 'event', 'type']);
          const player = extractValueFromRow_(row, headerMap, ['player', 'player name']);
          const assist = extractValueFromRow_(row, headerMap, ['assist', 'assisted by']);
          const team = extractValueFromRow_(row, headerMap, ['team', 'side', 'squad', 'opponent', 'opposition']);
          const notes = extractValueFromRow_(row, headerMap, ['notes', 'details', 'description']);

          if (!minute && !type && !player) {
            return;
          }

          const eventRecord = {
            minute: minute,
            type: type,
            player: player,
            assist: assist,
            team: team,
            notes: notes
          };

          const dedupeKey = [
            minute || '',
            type || '',
            player || '',
            assist || '',
            team || '',
            notes || ''
          ].map(value => value.toString().toLowerCase()).join('||');

          if (!seen.has(dedupeKey)) {
            seen.add(dedupeKey);
            events.push(eventRecord);
          }
        });
      }
    });

    if (events.length === 0) {
      highlightsLogger.warn('No events found for highlights export', { matchId: normalizedMatchId });
      highlightsLogger.exitFunction('exportEventsForHighlights', { success: false, reason: 'no_events' });
      return { ok: false, path: '', count: 0, reason: 'no_events' };
    }

    const fileName = `events_${normalizedMatchId}.json`;
    const jsonPayload = JSON.stringify({
      matchId: normalizedMatchId,
      generatedAt: new Date().toISOString(),
      events: events
    });

    const folderId = getConfigValue('VIDEO.HIGHLIGHTS_FOLDER_ID', null) || getConfigValue('VIDEO.DRIVE_FOLDER_ID', null);
    let folder = null;
    if (folderId) {
      try {
        folder = DriveApp.getFolderById(folderId);
      } catch (folderError) {
        highlightsLogger.warn('Unable to access configured highlights folder, using root', {
          error: folderError instanceof Error ? folderError.message : String(folderError)
        });
        folder = null;
      }
    }

    let file = null;
    const fileIterator = folder
      ? folder.getFilesByName(fileName)
      : DriveApp.getFilesByName(fileName);

    if (fileIterator && fileIterator.hasNext()) {
      file = fileIterator.next();
      file.setContent(jsonPayload);
    } else {
      file = folder
        ? folder.createFile(fileName, jsonPayload)
        : DriveApp.createFile(fileName, jsonPayload);
    }

    const eventsUrl = `https://drive.google.com/uc?export=download&id=${file.getId()}`;
    const path = folder ? `${folder.getName()}/${fileName}` : fileName;

    const result = {
      ok: true,
      path: path,
      count: events.length,
      fileId: file.getId(),
      url: eventsUrl,
      events: events
    };

    highlightsLogger.exitFunction('exportEventsForHighlights', {
      success: true,
      count: events.length,
      fileId: file.getId()
    });

    // @testHook('video.export.events.end')

    return result;
  } catch (error) {
    highlightsLogger.error('Failed to export highlights events', {
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      matchId: normalizedMatchId
    });
    highlightsLogger.exitFunction('exportEventsForHighlights', { success: false, reason: 'error' });
    return { ok: false, path: '', count: 0, reason: 'error', error: error instanceof Error ? error.message : String(error) };
  }
}

function triggerHighlightsBot(matchId, videoUrl, webhookUrl) {
  const highlightsLogger = logger.scope('VideoHighlights');
  highlightsLogger.enterFunction('triggerHighlightsBot', {
    matchId,
    hasVideoUrl: !!videoUrl,
    hasWebhookOverride: !!webhookUrl
  });

  const normalizedMatchId = (matchId || '').toString().trim();
  const normalizedVideoUrl = (videoUrl || '').toString().trim();

  if (!normalizedMatchId) {
    highlightsLogger.warn('Cannot trigger highlights bot without match ID');
    highlightsLogger.exitFunction('triggerHighlightsBot', { success: false, reason: 'missing_match_id' });
    return { ok: false, reason: 'missing_match_id' };
  }

  if (!normalizedVideoUrl) {
    highlightsLogger.warn('Cannot trigger highlights bot without video URL');
    highlightsLogger.exitFunction('triggerHighlightsBot', { success: false, reason: 'missing_video_url' });
    return { ok: false, reason: 'missing_video_url' };
  }

  try {
    const exportResult = exportEventsForHighlights(normalizedMatchId);
    if (!exportResult.ok) {
      highlightsLogger.warn('Highlights export did not return events', {
        matchId: normalizedMatchId,
        reason: exportResult.reason
      });
      highlightsLogger.exitFunction('triggerHighlightsBot', { success: false, reason: exportResult.reason || 'export_failed' });
      return { ok: false, reason: exportResult.reason || 'export_failed' };
    }

    const scriptProperties = PropertiesService.getScriptProperties();
    const configuredWebhook = (scriptProperties.getProperty('HIGHLIGHTS_WEBHOOK_URL') || '').trim();
    const resolvedWebhook = (webhookUrl || '').trim() || configuredWebhook;

    if (!resolvedWebhook) {
      highlightsLogger.warn('No highlights webhook configured');
      highlightsLogger.exitFunction('triggerHighlightsBot', { success: true, dispatched: false, reason: 'no_webhook' });
      return { ok: true, dispatched: false, reason: 'no_webhook', events: exportResult };
    }

    const requestId = typeof StringUtils !== 'undefined' && StringUtils && typeof StringUtils.generateId === 'function'
      ? StringUtils.generateId('req')
      : Utilities.getUuid();

    const payload = {
      matchId: normalizedMatchId,
      eventsUrl: exportResult.url || exportResult.path,
      videoUrl: normalizedVideoUrl
    };

    const requestOptions = {
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
        'X-Request-Source': 'video_highlights_exporter'
      },
      maxRetries: 4,
      retryDelay: 1000,
      muteHttpExceptions: true,
      timeout: 20000
    };

    // @testHook('video.trigger.webhook.pre')
    const response = httpPost(resolvedWebhook, payload, requestOptions);
    // @testHook('video.trigger.webhook.post')

    const success = response && response.success && response.statusCode >= 200 && response.statusCode < 300;

    if (!success) {
      highlightsLogger.error('Highlights webhook failed', {
        statusCode: response ? response.statusCode : null,
        error: response ? response.error : 'unknown',
        matchId: normalizedMatchId
      });
      highlightsLogger.exitFunction('triggerHighlightsBot', {
        success: false,
        dispatched: false,
        reason: 'webhook_failed',
        statusCode: response ? response.statusCode : null
      });
      return {
        ok: false,
        dispatched: false,
        reason: 'webhook_failed',
        status: response ? response.statusCode : null,
        events: exportResult
      };
    }

    highlightsLogger.exitFunction('triggerHighlightsBot', {
      success: true,
      dispatched: true,
      statusCode: response.statusCode
    });

    return {
      ok: true,
      dispatched: true,
      status: response.statusCode,
      events: exportResult
    };
  } catch (error) {
    highlightsLogger.error('Failed to trigger highlights webhook', {
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      matchId: normalizedMatchId
    });
    highlightsLogger.exitFunction('triggerHighlightsBot', { success: false, reason: 'error' });
    return { ok: false, reason: 'error', error: error instanceof Error ? error.message : String(error) };
  }
}

function getFirstAvailableIndex_(headerMap, candidates) {
  for (let i = 0; i < candidates.length; i += 1) {
    const key = candidates[i];
    if (Object.prototype.hasOwnProperty.call(headerMap, key)) {
      return headerMap[key];
    }
  }
  return undefined;
}

function extractValueFromRow_(row, headerMap, keys) {
  const index = getFirstAvailableIndex_(headerMap, keys);
  if (typeof index !== 'number') {
    return '';
  }
  const value = row[index];
  if (value === null || typeof value === 'undefined') {
    return '';
  }
  return value instanceof Date ? value.toISOString() : value.toString().trim();
}

function initializeVideoClips() {
  logger.enterFunction('VideoClips.initialize');

  try {
    if (!isFeatureEnabled('VIDEO_INTEGRATION')) {
      return {
        success: true,
        message: 'Video integration disabled',
        enabled: false
      };
    }

    const requiredSheets = ['VIDEO_CLIPS'];
    const results = {};

    requiredSheets.forEach(sheetKey => {
      const tabName = getConfigValue(`SHEETS.TAB_NAMES.${sheetKey}`);
      const columns = getConfigValue(`SHEETS.REQUIRED_COLUMNS.${sheetKey}`);

      if (tabName && columns) {
        const sheet = SheetUtils.getOrCreateSheet(tabName, columns);
        results[sheetKey] = { success: !!sheet, name: tabName };
      }
    });

    const driveFolderId = getConfigValue('VIDEO.DRIVE_FOLDER_ID');
    const driveConfigured = !!driveFolderId;

    logger.exitFunction('VideoClips.initialize', { success: true });

    return {
      success: true,
      sheets_created: results,
      drive_configured: driveConfigured,
      features_enabled: {
        video_integration: isFeatureEnabled('VIDEO_INTEGRATION'),
        youtube_automation: isFeatureEnabled('YOUTUBE_AUTOMATION'),
        clip_creation: isFeatureEnabled('VIDEO_CLIP_CREATION')
      },
      version: '6.2.0'
    };
  } catch (error) {
    logger.error('Video clips initialization failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}
