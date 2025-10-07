# Apps Script Integration Guide

This guide shows how to export events from your Google Apps Script to the Highlights Bot.

## Export Function for Apps Script

Add this function to your Apps Script project to export events at full-time:

```javascript
/**
 * Export events for highlights bot processing
 * Call this function at full-time to generate highlights
 */
function exportEventsForHighlights() {
  try {
    logger.enterFunction('exportEventsForHighlights');

    const matchId = getActiveMatchId();
    if (!matchId) {
      throw new Error('No active match found');
    }

    // Get live events from sheet
    const liveSheet = SheetUtils.getSheet('Live Match Updates');
    if (!liveSheet) {
      throw new Error('Live Match Updates sheet not found');
    }

    const events = [];
    const data = liveSheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue; // Skip empty rows

      const event = {
        type: mapEventType(row[headers.indexOf('Event')]),
        half: determineHalf(row[headers.indexOf('Minute')]),
        clock: formatMatchClock(row[headers.indexOf('Minute')]),
        team: row[headers.indexOf('Player')] === 'Goal' ? 'Opposition' : getConfig('SYSTEM.CLUB_NAME'),
        player: row[headers.indexOf('Player')],
        assist: row[headers.indexOf('Assist')] || null,
        score: {
          home: parseInt(row[headers.indexOf('Home Score')] || 0),
          away: parseInt(row[headers.indexOf('Away Score')] || 0)
        },
        notes: row[headers.indexOf('Notes')] || '',
        consent_given: true // Add consent flag
      };

      // Only include valid events
      if (event.type && event.clock) {
        events.push(event);
      }
    }

    // Add status markers
    events.push({
      status: 'HT',
      half: 1,
      clock: '45:00'
    });

    events.push({
      status: 'FT',
      half: 2,
      clock: '90:00'
    });

    // Save to Drive
    const eventsJson = JSON.stringify(events, null, 2);
    const fileName = `events_${matchId}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;

    const blob = Utilities.newBlob(eventsJson, 'application/json', fileName);
    const file = DriveApp.createFile(blob);

    logger.info(`Events exported: ${fileName}`, { eventCount: events.length });

    // Optional: Trigger highlights bot via webhook
    if (getConfig('FEATURES.AUTO_HIGHLIGHTS')) {
      triggerHighlightsBot(file.getId(), matchId);
    }

    logger.exitFunction('exportEventsForHighlights', { success: true });
    return { success: true, fileId: file.getId(), fileName: fileName };

  } catch (error) {
    logger.error('Failed to export events for highlights', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

/**
 * Map internal event types to highlights bot format
 */
function mapEventType(eventType) {
  const mapping = {
    'Goal': 'goal',
    'Save': 'big_save',
    'Chance': 'chance',
    'Yellow Card': 'card',
    'Red Card': 'card',
    'Foul': 'foul'
  };

  return mapping[eventType] || null;
}

/**
 * Determine half from minute
 */
function determineHalf(minute) {
  if (typeof minute === 'string' && minute.includes(':')) {
    const mins = parseInt(minute.split(':')[0]);
    return mins <= 45 ? 1 : 2;
  }
  return minute <= 45 ? 1 : 2;
}

/**
 * Format minute as MM:SS
 */
function formatMatchClock(minute) {
  if (typeof minute === 'string' && minute.includes(':')) {
    return minute; // Already formatted
  }

  const mins = Math.floor(minute);
  return `${mins.toString().padStart(2, '0')}:00`;
}

/**
 * Trigger highlights bot processing
 */
function triggerHighlightsBot(eventsFileId, matchId) {
  try {
    const webhookUrl = getConfig('HIGHLIGHTS_BOT.WEBHOOK_URL');
    if (!webhookUrl) {
      logger.warn('Highlights bot webhook URL not configured');
      return;
    }

    const payload = {
      events_file_id: eventsFileId,
      match_id: matchId,
      timestamp: new Date().toISOString(),
      callback_url: getConfig('HIGHLIGHTS_BOT.CALLBACK_URL')
    };

    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      payload: JSON.stringify(payload)
    };

    const response = UrlFetchApp.fetch(webhookUrl, options);

    if (response.getResponseCode() === 200) {
      logger.info('Highlights bot triggered successfully');
    } else {
      logger.warn('Highlights bot trigger failed', {
        statusCode: response.getResponseCode(),
        response: response.getContentText()
      });
    }

  } catch (error) {
    logger.error('Failed to trigger highlights bot', { error: error.toString() });
  }
}
```

## Configuration

Add these settings to your Apps Script config:

```javascript
HIGHLIGHTS_BOT: {
  ENABLED: true,
  WEBHOOK_URL: 'http://your-server:8080/',
  CALLBACK_URL: 'https://hook.make.com/your-webhook-id',
  AUTO_EXPORT_ON_FT: true
},

FEATURES: {
  AUTO_HIGHLIGHTS: true,
  // ... other features
}
```

## Make.com Integration

Create a Make.com scenario that:

1. **Webhook Trigger**: Receives callback from highlights bot
2. **Google Drive**: Downloads generated clips
3. **Social Media Modules**: Posts clips to platforms
4. **Filter**: Uses manifest.json to customize posts per platform

### Example Make.com Scenario Structure:

```
Webhook → Parse JSON → For Each Clip → [
  Download from Drive →
  Generate Caption →
  Post to Facebook/Instagram/Twitter
] → Send Completion Email
```

## Usage

1. **During Match**: Use your live match interface as normal
2. **At Full Time**: Run `exportEventsForHighlights()` manually or automatically
3. **Processing**: Bot generates highlights automatically
4. **Publishing**: Make.com receives clips and posts to social media

## Testing

Test the export with sample data:

```javascript
function testHighlightsExport() {
  // Create test match data
  const testMatchId = 'TEST_' + new Date().getTime();
  PropertiesService.getScriptProperties().setProperty('LIVE_MATCH_ACTIVE_ID', testMatchId);

  // Run export
  const result = exportEventsForHighlights();

  console.log('Export result:', result);
  return result;
}
```

This integration ensures seamless flow from your live match updates to automatic highlights generation and social media posting.