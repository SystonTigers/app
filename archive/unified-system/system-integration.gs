/**
 * System Integration Layer
 *
 * This module connects the live match automation system with the video processing system,
 * creating a seamless experience where live events automatically trigger video creation
 * and enhanced social media content.
 */

/**
 * Unified Event Processor
 * Handles events from live matches and triggers appropriate video processing
 */
class UnifiedEventProcessor {
  constructor() {
    this.loggerName = 'UnifiedEvents';
    this.liveMatchManager = null;
    this.videoProcessor = null;
    this.socialMediaManager = null;
  }

  /**
   * Process a live match event and coordinate both social media and video processing
   */
  processUnifiedEvent(eventData) {
    try {
      Logger.log(`Processing unified event: ${eventData.type} - ${eventData.player}`);

      // Validate event data
      if (!this.validateEventData(eventData)) {
        return { success: false, error: 'Invalid event data' };
      }

      // Process the live event (social media posting)
      const liveResult = this.processLiveEvent(eventData);

      // If it's a video-worthy event, trigger video processing
      const videoResult = this.processVideoEvent(eventData);

      // Update unified statistics
      const statsResult = this.updateUnifiedStatistics(eventData);

      // Create comprehensive result
      const result = {
        success: liveResult.success && (videoResult.success || !videoResult.applicable),
        liveEvent: liveResult,
        videoProcessing: videoResult,
        statistics: statsResult,
        timestamp: new Date().toISOString()
      };

      // Log the unified result
      this.logUnifiedEvent(eventData, result);

      return result;

    } catch (error) {
      Logger.log(`Unified event processing error: ${error.toString()}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate event data before processing
   */
  validateEventData(eventData) {
    const required = ['type', 'player', 'minute'];
    return required.every(field => eventData.hasOwnProperty(field) && eventData[field]);
  }

  /**
   * Process the live event for social media
   */
  processLiveEvent(eventData) {
    try {
      // Use existing enhanced events system
      const enhancedEvents = new EnhancedEventsManager();

      switch (eventData.type.toLowerCase()) {
        case 'goal':
          return enhancedEvents.processGoalEvent(eventData);
        case 'card':
          return enhancedEvents.processCardEvent(eventData);
        case 'substitution':
          return enhancedEvents.processSubstitution(eventData);
        default:
          return enhancedEvents.processGenericEvent(eventData);
      }

    } catch (error) {
      Logger.log(`Live event processing error: ${error.toString()}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process video-worthy events
   */
  processVideoEvent(eventData) {
    try {
      // Check if this event should trigger video processing
      const videoWorthy = this.isVideoWorthyEvent(eventData);

      if (!videoWorthy) {
        return { success: true, applicable: false, reason: 'Event not video-worthy' };
      }

      // Create video clip metadata
      const clipMetadata = this.createVideoClipMetadata(eventData);

      // Add to video processing queue
      const queueResult = this.addToVideoQueue(clipMetadata);

      // If video processing is enabled, trigger immediate processing
      const processingResult = this.triggerVideoProcessing(clipMetadata);

      return {
        success: true,
        applicable: true,
        metadata: clipMetadata,
        queued: queueResult.success,
        processing: processingResult
      };

    } catch (error) {
      Logger.log(`Video event processing error: ${error.toString()}`);
      return { success: false, applicable: true, error: error.message };
    }
  }

  /**
   * Determine if an event should trigger video processing
   */
  isVideoWorthyEvent(eventData) {
    const videoWorthyEvents = ['goal', 'penalty', 'free_kick_goal', 'red_card', 'penalty_save'];
    return videoWorthyEvents.includes(eventData.type.toLowerCase()) ||
           (eventData.type.toLowerCase() === 'card' && eventData.cardType === 'red');
  }

  /**
   * Create video clip metadata from live event
   */
  createVideoClipMetadata(eventData) {
    const metadata = {
      id: `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType: eventData.type,
      player: eventData.player,
      minute: eventData.minute,
      timestamp: new Date().toISOString(),
      priority: this.getEventPriority(eventData.type),
      description: this.generateClipDescription(eventData),
      tags: this.generateClipTags(eventData),
      socialMediaReady: true,
      multiFormat: true, // Generate 16:9, 1:1, and 9:16 versions
      branding: {
        includeClubLogo: true,
        includePlayerName: true,
        includeMatchTime: true,
        includeScore: eventData.homeScore !== undefined && eventData.awayScore !== undefined
      }
    };

    // Add score information if available
    if (eventData.homeScore !== undefined && eventData.awayScore !== undefined) {
      metadata.score = {
        home: eventData.homeScore,
        away: eventData.awayScore
      };
    }

    // Add assist information for goals
    if (eventData.type.toLowerCase() === 'goal' && eventData.assist) {
      metadata.assist = eventData.assist;
    }

    return metadata;
  }

  /**
   * Get event priority for video processing
   */
  getEventPriority(eventType) {
    const priorities = {
      'goal': 'high',
      'penalty': 'high',
      'red_card': 'high',
      'penalty_save': 'medium',
      'yellow_card': 'low',
      'substitution': 'low'
    };

    return priorities[eventType.toLowerCase()] || 'medium';
  }

  /**
   * Generate clip description
   */
  generateClipDescription(eventData) {
    const templates = {
      goal: `⚽ GOAL! ${eventData.player} scores in the ${eventData.minute}th minute!`,
      penalty: `🥅 PENALTY GOAL! ${eventData.player} converts from the spot!`,
      red_card: `🟥 RED CARD! ${eventData.player} is sent off in the ${eventData.minute}th minute!`,
      yellow_card: `🟨 Yellow card for ${eventData.player} (${eventData.minute}')`
    };

    return templates[eventData.type.toLowerCase()] ||
           `⚽ ${eventData.type}: ${eventData.player} (${eventData.minute}')`;
  }

  /**
   * Generate tags for the clip
   */
  generateClipTags(eventData) {
    const baseTags = ['football', 'soccer', 'highlights'];

    const eventTags = {
      goal: ['goal', 'scoring', 'celebration'],
      penalty: ['penalty', 'spot_kick', 'conversion'],
      red_card: ['red_card', 'discipline', 'sending_off'],
      yellow_card: ['yellow_card', 'booking']
    };

    const tags = [...baseTags, ...(eventTags[eventData.type.toLowerCase()] || [])];

    // Add player name as tag
    if (eventData.player && eventData.player !== 'Goal' && eventData.player !== 'Opposition') {
      tags.push(eventData.player.toLowerCase().replace(/\s+/g, '_'));
    }

    return tags;
  }

  /**
   * Add clip metadata to video processing queue
   */
  addToVideoQueue(clipMetadata) {
    try {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      let videoSheet = spreadsheet.getSheetByName('Video Queue');

      // Create Video Queue sheet if it doesn't exist
      if (!videoSheet) {
        videoSheet = this.createVideoQueueSheet(spreadsheet);
      }

      // Add headers if sheet is empty
      if (videoSheet.getLastRow() <= 1) {
        const headers = [
          'Clip ID', 'Event Type', 'Player', 'Minute', 'Priority',
          'Description', 'Status', 'Created', 'Processed', 'Output Files'
        ];
        videoSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        videoSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      }

      // Add the clip to the queue
      const newRow = videoSheet.getLastRow() + 1;
      const rowData = [
        clipMetadata.id,
        clipMetadata.eventType,
        clipMetadata.player,
        clipMetadata.minute,
        clipMetadata.priority,
        clipMetadata.description,
        'QUEUED',
        clipMetadata.timestamp,
        '', // Processed timestamp
        '' // Output files
      ];

      videoSheet.getRange(newRow, 1, 1, rowData.length).setValues([rowData]);

      // Color code by priority
      const backgroundColor = {
        'high': '#ffebee',
        'medium': '#fff3e0',
        'low': '#f1f8e9'
      }[clipMetadata.priority] || '#ffffff';

      videoSheet.getRange(newRow, 1, 1, rowData.length).setBackground(backgroundColor);

      Logger.log(`Added clip to video queue: ${clipMetadata.id}`);

      return { success: true, clipId: clipMetadata.id, row: newRow };

    } catch (error) {
      Logger.log(`Error adding to video queue: ${error.toString()}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create Video Queue sheet
   */
  createVideoQueueSheet(spreadsheet) {
    const sheet = spreadsheet.insertSheet('Video Queue');

    // Set up column widths
    sheet.setColumnWidth(1, 150); // Clip ID
    sheet.setColumnWidth(2, 100); // Event Type
    sheet.setColumnWidth(3, 150); // Player
    sheet.setColumnWidth(4, 80);  // Minute
    sheet.setColumnWidth(5, 100); // Priority
    sheet.setColumnWidth(6, 300); // Description
    sheet.setColumnWidth(7, 100); // Status
    sheet.setColumnWidth(8, 150); // Created
    sheet.setColumnWidth(9, 150); // Processed
    sheet.setColumnWidth(10, 200); // Output Files

    Logger.log('Created Video Queue sheet');
    return sheet;
  }

  /**
   * Trigger video processing for high-priority events
   */
  triggerVideoProcessing(clipMetadata) {
    try {
      // Only auto-process high priority events
      if (clipMetadata.priority !== 'high') {
        return { triggered: false, reason: 'Priority not high enough for auto-processing' };
      }

      // Check if video processing service is configured
      const videoServiceUrl = this.getVideoProcessingServiceUrl();
      if (!videoServiceUrl) {
        return { triggered: false, reason: 'Video processing service not configured' };
      }

      // Create processing request
      const processingRequest = {
        clipId: clipMetadata.id,
        eventType: clipMetadata.eventType,
        player: clipMetadata.player,
        minute: clipMetadata.minute,
        priority: clipMetadata.priority,
        formats: ['16:9', '1:1', '9:16'],
        branding: clipMetadata.branding,
        timestamp: clipMetadata.timestamp
      };

      // Send to video processing service
      const response = this.callVideoProcessingService(videoServiceUrl, processingRequest);

      return {
        triggered: true,
        response: response,
        processingId: response.processingId || null
      };

    } catch (error) {
      Logger.log(`Error triggering video processing: ${error.toString()}`);
      return { triggered: false, error: error.message };
    }
  }

  /**
   * Get video processing service URL from configuration
   */
  getVideoProcessingServiceUrl() {
    try {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      const configSheet = spreadsheet.getSheetByName('📋 System Configuration');

      if (!configSheet) {
        return null;
      }

      const data = configSheet.getDataRange().getValues();

      // Find video processing service URL
      for (let i = 0; i < data.length; i++) {
        if (data[i][0] === 'Video Processing Service') {
          const url = data[i][1];
          return url && url !== 'Not configured' ? url : null;
        }
      }

      return null;

    } catch (error) {
      Logger.log(`Error getting video service URL: ${error.toString()}`);
      return null;
    }
  }

  /**
   * Call video processing service
   */
  callVideoProcessingService(serviceUrl, requestData) {
    try {
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Football-Club-Automation/1.0'
        },
        payload: JSON.stringify(requestData)
      };

      const response = UrlFetchApp.fetch(`${serviceUrl}/api/process-clip`, options);
      const responseCode = response.getResponseCode();

      if (responseCode >= 200 && responseCode < 300) {
        return JSON.parse(response.getContentText());
      } else {
        throw new Error(`HTTP ${responseCode}: ${response.getContentText()}`);
      }

    } catch (error) {
      Logger.log(`Video processing service call error: ${error.toString()}`);
      throw error;
    }
  }

  /**
   * Update unified statistics
   */
  updateUnifiedStatistics(eventData) {
    try {
      // Update both live match stats and video processing stats
      const liveStats = this.updateLiveMatchStats(eventData);
      const videoStats = this.updateVideoProcessingStats(eventData);

      return {
        liveMatch: liveStats,
        videoProcessing: videoStats
      };

    } catch (error) {
      Logger.log(`Error updating unified statistics: ${error.toString()}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update live match statistics
   */
  updateLiveMatchStats(eventData) {
    try {
      // This would integrate with existing player management system
      const playerManager = new PlayerManagementManager();
      return playerManager.updatePlayerStats(eventData);

    } catch (error) {
      Logger.log(`Error updating live match stats: ${error.toString()}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update video processing statistics
   */
  updateVideoProcessingStats(eventData) {
    try {
      if (!this.isVideoWorthyEvent(eventData)) {
        return { success: true, applicable: false };
      }

      // Update video processing metrics
      const metrics = {
        totalClipsRequested: 1,
        clipsByType: {},
        clipsByPriority: {}
      };

      metrics.clipsByType[eventData.type] = 1;
      metrics.clipsByPriority[this.getEventPriority(eventData.type)] = 1;

      // Store in properties for later aggregation
      this.updateVideoMetrics(metrics);

      return { success: true, metrics: metrics };

    } catch (error) {
      Logger.log(`Error updating video processing stats: ${error.toString()}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update video metrics in properties
   */
  updateVideoMetrics(newMetrics) {
    try {
      const properties = PropertiesService.getDocumentProperties();
      const existingMetrics = JSON.parse(properties.getProperty('VIDEO_METRICS') || '{}');

      // Aggregate metrics
      existingMetrics.totalClipsRequested = (existingMetrics.totalClipsRequested || 0) + 1;
      existingMetrics.lastUpdated = new Date().toISOString();

      // Update clip type counts
      if (!existingMetrics.clipsByType) existingMetrics.clipsByType = {};
      Object.keys(newMetrics.clipsByType).forEach(type => {
        existingMetrics.clipsByType[type] = (existingMetrics.clipsByType[type] || 0) + 1;
      });

      // Update priority counts
      if (!existingMetrics.clipsByPriority) existingMetrics.clipsByPriority = {};
      Object.keys(newMetrics.clipsByPriority).forEach(priority => {
        existingMetrics.clipsByPriority[priority] = (existingMetrics.clipsByPriority[priority] || 0) + 1;
      });

      properties.setProperty('VIDEO_METRICS', JSON.stringify(existingMetrics));

    } catch (error) {
      Logger.log(`Error updating video metrics: ${error.toString()}`);
    }
  }

  /**
   * Log unified event for audit trail
   */
  logUnifiedEvent(eventData, result) {
    try {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      let logSheet = spreadsheet.getSheetByName('System Activity Log');

      if (!logSheet) {
        logSheet = this.createSystemActivityLogSheet(spreadsheet);
      }

      // Add headers if needed
      if (logSheet.getLastRow() <= 1) {
        const headers = [
          'Timestamp', 'Event Type', 'Player', 'Minute', 'Live Result',
          'Video Processing', 'Social Media', 'Success', 'Notes'
        ];
        logSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        logSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      }

      const newRow = logSheet.getLastRow() + 1;
      const rowData = [
        new Date().toLocaleString(),
        eventData.type,
        eventData.player,
        eventData.minute,
        result.liveEvent.success ? 'Success' : 'Failed',
        result.videoProcessing.applicable ? 'Processed' : 'Skipped',
        result.liveEvent.success ? 'Posted' : 'Failed',
        result.success ? 'Yes' : 'No',
        result.success ? 'All systems processed successfully' : 'Some systems failed'
      ];

      logSheet.getRange(newRow, 1, 1, rowData.length).setValues([rowData]);

      // Color code by success
      const backgroundColor = result.success ? '#d4edda' : '#f8d7da';
      logSheet.getRange(newRow, 1, 1, rowData.length).setBackground(backgroundColor);

    } catch (error) {
      Logger.log(`Error logging unified event: ${error.toString()}`);
    }
  }

  /**
   * Create System Activity Log sheet
   */
  createSystemActivityLogSheet(spreadsheet) {
    const sheet = spreadsheet.insertSheet('System Activity Log');

    // Set up column widths
    sheet.setColumnWidth(1, 150); // Timestamp
    sheet.setColumnWidth(2, 100); // Event Type
    sheet.setColumnWidth(3, 150); // Player
    sheet.setColumnWidth(4, 80);  // Minute
    sheet.setColumnWidth(5, 100); // Live Result
    sheet.setColumnWidth(6, 120); // Video Processing
    sheet.setColumnWidth(7, 120); // Social Media
    sheet.setColumnWidth(8, 80);  // Success
    sheet.setColumnWidth(9, 300); // Notes

    Logger.log('Created System Activity Log sheet');
    return sheet;
  }
}

/**
 * Public function to process a unified event
 * This is the main entry point for the integrated system
 */
function processUnifiedEvent(eventData) {
  const processor = new UnifiedEventProcessor();
  return processor.processUnifiedEvent(eventData);
}

/**
 * Enhanced goal processing that triggers both social media and video
 */
function processGoalWithVideo(player, minute, assist = null, homeScore = null, awayScore = null) {
  const eventData = {
    type: 'goal',
    player: player,
    minute: minute,
    assist: assist,
    homeScore: homeScore,
    awayScore: awayScore,
    timestamp: new Date().toISOString()
  };

  return processUnifiedEvent(eventData);
}

/**
 * Enhanced card processing that triggers both social media and video (for red cards)
 */
function processCardWithVideo(player, cardType, minute, reason = null) {
  const eventData = {
    type: cardType.toLowerCase().includes('red') ? 'red_card' : 'yellow_card',
    player: player,
    minute: minute,
    cardType: cardType,
    reason: reason,
    timestamp: new Date().toISOString()
  };

  return processUnifiedEvent(eventData);
}

/**
 * Process video queue manually
 */
function processVideoQueue() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const videoSheet = spreadsheet.getSheetByName('Video Queue');

    if (!videoSheet) {
      return { success: false, error: 'Video Queue sheet not found' };
    }

    const data = videoSheet.getDataRange().getValues();
    const headers = data[0];
    let processedCount = 0;

    const processor = new UnifiedEventProcessor();

    // Process queued items
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = row[headers.indexOf('Status')];

      if (status === 'QUEUED') {
        try {
          const clipMetadata = {
            id: row[headers.indexOf('Clip ID')],
            eventType: row[headers.indexOf('Event Type')],
            player: row[headers.indexOf('Player')],
            minute: row[headers.indexOf('Minute')],
            priority: row[headers.indexOf('Priority')],
            description: row[headers.indexOf('Description')]
          };

          const result = processor.triggerVideoProcessing(clipMetadata);

          if (result.triggered) {
            // Update status to PROCESSING
            videoSheet.getRange(i + 1, headers.indexOf('Status') + 1).setValue('PROCESSING');
            videoSheet.getRange(i + 1, headers.indexOf('Processed') + 1).setValue(new Date().toLocaleString());
            processedCount++;
          }

        } catch (error) {
          Logger.log(`Error processing queued video: ${error.toString()}`);
          videoSheet.getRange(i + 1, headers.indexOf('Status') + 1).setValue('ERROR');
        }
      }
    }

    return {
      success: true,
      processedCount: processedCount,
      message: `Processed ${processedCount} video(s) from queue`
    };

  } catch (error) {
    Logger.log(`Error processing video queue: ${error.toString()}`);
    return { success: false, error: error.message };
  }
}