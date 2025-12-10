/**
 * @fileoverview Video Clip Metadata Enhancement for configurable club automation
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Additional video clip functions to add to video-clips.gs
 */

/**
 * Create goal video clip metadata
 * @param {Object} goalData - Goal event data
 * @returns {Object} Processing result
 */

function getVideoClipHashtags_(context = '') {
  if (typeof getDynamicConfig === 'function') {
    const dynamicConfig = getDynamicConfig();
    if (dynamicConfig) {
      if (dynamicConfig.SOCIAL_HASHTAGS) {
        return dynamicConfig.SOCIAL_HASHTAGS;
      }
      const teamShort = dynamicConfig.TEAM_SHORT || dynamicConfig.TEAM_NAME;
      if (teamShort) {
        return `#${String(teamShort).replace(/\s+/g, '')} #FootballClub #LocalFootball${context === 'goal' ? ' #Goal' : ''}`;
      }
    }
  }

  if (typeof getConfigValue === 'function') {
    const configuredHashtags = getConfigValue('BRANDING.SOCIAL_HASHTAGS', '');
    if (configuredHashtags) {
      return configuredHashtags;
    }
    const shortName = getConfigValue('SYSTEM.CLUB_SHORT_NAME', getConfigValue('SYSTEM.CLUB_NAME', 'Club'));
    if (shortName) {
      return `#${String(shortName).replace(/\s+/g, '')} #FootballClub #LocalFootball${context === 'goal' ? ' #Goal' : ''}`;
    }
  }

  return context === 'goal'
    ? '#FootballClub #LocalFootball #Goal'
    : '#FootballClub #LocalFootball';
}

function createGoalVideoClip(goalData) {
  logger.enterFunction('createGoalVideoClip', {
    player: goalData.player,
    minute: goalData.minute,
    matchId: goalData.matchId
  });

  try {
    // @testHook(goal_video_clip_start)

    const { player, minute, assist, matchId, opposition } = goalData;

    // Calculate start time (goal minute - 3 minutes)
    const goalMinuteNumber = parseInt(minute) || 0;
    const startTimeSeconds = Math.max(0, (goalMinuteNumber * 60) - 180); // 3 minutes before
    const durationSeconds = 360; // 6 minutes total (3 before + 3 after)

    // Create clip title and caption
    const assistText = assist ? ` (assist: ${assist})` : '';
    const clipTitle = `Goal - ${player} - ${minute}' vs ${opposition || 'Opposition'}`;
    const hashtags = getVideoClipHashtags_('goal');
    const clipCaption = `⚽ GOAL! ${player} scores in the ${minute}' minute${assistText}

${hashtags}`;

    // Get Video Clips sheet
    const videoClipsColumns = [
      'Match ID', 'Event Type', 'Player', 'Minute', 'Start Time (seconds)',
      'Duration (seconds)', 'Title', 'Caption', 'Created Date', 'Status'
    ];
    const clipsSheet = SheetUtils.getOrCreateSheet('Video Clips', videoClipsColumns);

    if (!clipsSheet) {
      return { success: false, error: 'Failed to create Video Clips sheet' };
    }

    // Create clip metadata
    const clipData = {
      matchId: matchId || 'Unknown',
      eventType: 'Goal',
      player: player,
      minute: minute,
      startTimeSeconds: startTimeSeconds,
      durationSeconds: durationSeconds,
      title: clipTitle,
      caption: clipCaption,
      createdDate: DateUtils.formatISO(DateUtils.now()),
      status: 'Pending'
    };

    // Add row to sheet
    const rowData = [
      clipData.matchId,
      clipData.eventType,
      clipData.player,
      clipData.minute,
      clipData.startTimeSeconds,
      clipData.durationSeconds,
      clipData.title,
      clipData.caption,
      clipData.createdDate,
      clipData.status
    ];

    SheetUtils.appendRow(clipsSheet, rowData);

    // Create payload for Make.com video processing
    const payload = {
      event_type: 'video_clip_request',
      match_id: matchId,
      clip_type: 'goal',
      player: player,
      minute: minute,
      start_time_seconds: startTimeSeconds,
      duration_seconds: durationSeconds,
      title: clipTitle,
      caption: clipCaption,
      timestamp: DateUtils.formatISO(DateUtils.now()),
      system_version: getConfigValue('SYSTEM.VERSION')
    };

    // @testHook(goal_video_clip_webhook)
    const webhookResult = sendToMake(payload);

    logger.exitFunction('createGoalVideoClip', { success: true });
    return {
      success: true,
      clipData: clipData,
      webhook_sent: webhookResult.success
    };

  } catch (error) {
    logger.error('Goal video clip creation failed', { error: error.toString() });
    logger.exitFunction('createGoalVideoClip', { success: false });
    return { success: false, error: error.toString() };
  }
}

/**
 * Create video clip metadata for any event type
 * @param {Object} eventData - Event data
 * @param {string} eventType - Type of event (Goal, Card, Substitution, etc.)
 * @returns {Object} Processing result
 */
function createEventVideoClip(eventData, eventType) {
  logger.enterFunction('createEventVideoClip', {
    eventType: eventType,
    player: eventData.player,
    minute: eventData.minute
  });

  try {
    const { player, minute, matchId, opposition } = eventData;

    // Calculate start time (event minute - 2 minutes for non-goals)
    const eventMinuteNumber = parseInt(minute) || 0;
    const startTimeSeconds = Math.max(0, (eventMinuteNumber * 60) - 120); // 2 minutes before
    const durationSeconds = 240; // 4 minutes total (2 before + 2 after)

    // Create event-specific title and caption
    let clipTitle, clipCaption;
    const hashtags = getVideoClipHashtags_();

    switch (eventType.toLowerCase()) {
      case 'card':
      case 'yellow':
      case 'red':
        clipTitle = `${eventData.cardType || 'Card'} - ${player} - ${minute}' vs ${opposition || 'Opposition'}`;
        clipCaption = `📟 ${eventData.cardType || 'Card'} card for ${player} in the ${minute}' minute

${hashtags}`;
        break;

      case 'substitution':
        clipTitle = `Substitution - ${minute}' vs ${opposition || 'Opposition'}`;
        clipCaption = `🔄 Substitution in the ${minute}' minute: ${eventData.playerOff} ➡️ ${eventData.playerOn}

${hashtags}`;
        break;

      default:
        clipTitle = `${eventType} - ${minute}' vs ${opposition || 'Opposition'}`;
        clipCaption = `⚽ ${eventType} in the ${minute}' minute

${hashtags}`;
    }

    // Get Video Clips sheet
    const videoClipsColumns = [
      'Match ID', 'Event Type', 'Player', 'Minute', 'Start Time (seconds)',
      'Duration (seconds)', 'Title', 'Caption', 'Created Date', 'Status'
    ];
    const clipsSheet = SheetUtils.getOrCreateSheet('Video Clips', videoClipsColumns);

    if (!clipsSheet) {
      return { success: false, error: 'Failed to create Video Clips sheet' };
    }

    // Create clip metadata
    const clipData = {
      matchId: matchId || 'Unknown',
      eventType: eventType,
      player: player,
      minute: minute,
      startTimeSeconds: startTimeSeconds,
      durationSeconds: durationSeconds,
      title: clipTitle,
      caption: clipCaption,
      createdDate: DateUtils.formatISO(DateUtils.now()),
      status: 'Pending'
    };

    // Add row to sheet
    const rowData = [
      clipData.matchId,
      clipData.eventType,
      clipData.player,
      clipData.minute,
      clipData.startTimeSeconds,
      clipData.durationSeconds,
      clipData.title,
      clipData.caption,
      clipData.createdDate,
      clipData.status
    ];

    SheetUtils.appendRow(clipsSheet, rowData);

    logger.exitFunction('createEventVideoClip', { success: true });
    return {
      success: true,
      clipData: clipData
    };

  } catch (error) {
    logger.error('Event video clip creation failed', { error: error.toString() });
    logger.exitFunction('createEventVideoClip', { success: false });
    return { success: false, error: error.toString() };
  }
}
