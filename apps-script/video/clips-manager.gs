/**
 * @fileoverview Coordinates video clip creation, organization, and publishing workflows.
 */

var Video = Video || {};

Video.ClipsManager = class {
  constructor(options = {}) {
    this.loggerName = options.loggerName || 'VideoClips';
    this._logger = options.logger || null;
    this.makeIntegration = options.makeIntegration || new MakeIntegration();
    this._driveOrganization = options.driveOrganization || null;
    this._youtubeIntegration = options.youtubeIntegration || null;
    this._graphicsGenerator = options.graphicsGenerator || null;
    this._processingQueue = options.processingQueue || null;
  }

  get logger() {
    if (!this._logger) {
      try {
        this._logger = logger.scope(this.loggerName);
      } catch (error) {
        const fallback = this.loggerName;
        this._logger = {
          enterFunction: (fn, data) => console.log(`[${fallback}] → ${fn}`, data || ''),
          exitFunction: (fn, data) => console.log(`[${fallback}] ← ${fn}`, data || ''),
          info: (msg, data) => console.log(`[${fallback}] ${msg}`, data || ''),
          warn: (msg, data) => console.warn(`[${fallback}] ${msg}`, data || ''),
          error: (msg, data) => console.error(`[${fallback}] ${msg}`, data || ''),
          audit: (msg, data) => console.log(`[${fallback}] AUDIT: ${msg}`, data || ''),
          security: (msg, data) => console.log(`[${fallback}] SECURITY: ${msg}`, data || '')
        };
      }
    }
    return this._logger;
  }

  get driveOrganization() {
    if (!this._driveOrganization) {
      const DriveOrganizationCtor = Video && Video.DriveOrganization;
      if (!DriveOrganizationCtor) {
        throw new Error('Video drive organization module not available');
      }
      this._driveOrganization = new DriveOrganizationCtor({
        loggerFactory: () => this.logger
      });
    }
    return this._driveOrganization;
  }

  get youtubeIntegration() {
    if (!this._youtubeIntegration) {
      const YouTubeIntegrationCtor = Video && Video.YouTubeIntegration;
      if (!YouTubeIntegrationCtor) {
        throw new Error('Video YouTube integration module not available');
      }
      this._youtubeIntegration = new YouTubeIntegrationCtor({
        loggerFactory: () => this.logger
      });
    }
    return this._youtubeIntegration;
  }

  get graphicsGenerator() {
    if (!this._graphicsGenerator) {
      const GraphicsGeneratorCtor = Video && Video.GraphicsGenerator;
      if (!GraphicsGeneratorCtor) {
        throw new Error('Video graphics generator module not available');
      }
      this._graphicsGenerator = new GraphicsGeneratorCtor({
        loggerFactory: () => this.logger
      });
    }
    return this._graphicsGenerator;
  }

  get processingQueue() {
    if (!this._processingQueue) {
      const ProcessingQueueCtor = Video && Video.ProcessingQueue;
      if (!ProcessingQueueCtor) {
        throw new Error('Video processing queue module not available');
      }
      this._processingQueue = new ProcessingQueueCtor({
        loggerFactory: () => this.logger,
        makeIntegration: this.makeIntegration
      });
    }
    return this._processingQueue;
  }

  createGoalClip(minute, player, assist = '', opponent = '', matchId = null) {
    this.logger.enterFunction('createGoalClip', { minute, player, assist, opponent });

    try {
      // @testHook(goal_clip_creation_start)
      const goalMinute = parseInt(minute, 10);
      if (!ValidationUtils.isValidMinute(goalMinute)) {
        throw new Error(`Invalid minute: ${minute}`);
      }

      if (!player || player.trim() === '') {
        throw new Error('Player name is required');
      }

      const buffers = getConfigValue('VIDEO.CLIP_BUFFERS.GOAL', { preSeconds: 10, postSeconds: 20 });
      const preBuffer = Number(buffers.preSeconds) || 0;
      const postBuffer = Number(buffers.postSeconds) || 0;
      const defaultDuration = getConfigValue('VIDEO.DEFAULT_CLIP_DURATION', 30);
      const startSeconds = Math.max(0, goalMinute * 60 - preBuffer);
      const durationSeconds = Math.max(preBuffer + postBuffer, defaultDuration);

      const matchInfo = this.getMatchInfo(matchId, { opponent });

      const clipId = StringUtils.generateId('clip');
      const clipMetadata = {
        clip_id: clipId,
        match_id: matchId || StringUtils.generateId('match'),
        event_type: 'goal',
        minute: goalMinute,
        player: StringUtils.cleanPlayerName(player),
        assist_by: assist ? StringUtils.cleanPlayerName(assist) : '',
        opponent: opponent,
        start_time_seconds: startSeconds,
        duration_seconds: durationSeconds,
        title: this.generateClipTitle(player, opponent, goalMinute),
        description: this.generateClipDescription(player, assist, opponent, goalMinute),
        tags: this.generateClipTags(player, opponent),
        match_date: matchInfo.date,
        venue: matchInfo.venue,
        competition: matchInfo.competition,
        status: 'pending_processing',
        processing_service: getConfigValue('VIDEO.PROCESSING_METHOD', 'cloudconvert'),
        created_at: DateUtils.formatISO(DateUtils.now()),
        updated_at: DateUtils.formatISO(DateUtils.now())
      };

      const saveResult = this.saveClipMetadata(clipMetadata);

      if (!saveResult.success) {
        throw new Error(`Failed to save clip metadata: ${saveResult.error}`);
      }

      const folderResult = this.driveOrganization.ensurePlayerFolder(player);

      if (folderResult.success) {
        clipMetadata.player_folder_id = folderResult.folder_id;
        clipMetadata.player_folder_path = folderResult.folder_path || '';
      }

      const matchFolderResult = this.driveOrganization.ensureMatchFolder(clipMetadata.match_id, matchInfo);
      if (matchFolderResult.success) {
        clipMetadata.match_folder_id = matchFolderResult.folder_id;
        clipMetadata.match_folder_path = matchFolderResult.folder_path || '';
      }

      // @testHook(goal_clip_metadata_created)
      if (getConfigValue('VIDEO.PROCESSING_SERVICE') === 'cloudconvert') {
        clipMetadata.processing_request = this.requestCloudConvertProcessing(clipMetadata);
      }

      // @testHook(goal_clip_creation_complete)
      this.logger.exitFunction('createGoalClip', {
        success: true,
        clip_id: clipId
      });

      return {
        success: true,
        clip_metadata: clipMetadata,
        folder_result: folderResult,
        match_folder_result: matchFolderResult,
        clip_id: clipId,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    } catch (error) {
      this.logger.error('Goal clip creation failed', {
        error: error.toString(),
        minute,
        player,
        assist
      });

      return {
        success: false,
        error: error.toString(),
        minute: minute,
        player: player,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  markVideoEvent(minute, eventType, player = '', description = '') {
    this.logger.enterFunction('markVideoEvent', { minute, eventType, player });

    try {
      // @testHook(video_event_marking_start)
      const eventMinute = parseInt(minute, 10);
      if (!ValidationUtils.isValidMinute(eventMinute)) {
        throw new Error(`Invalid minute: ${minute}`);
      }

      const allowedTypes = getConfigValue('VIDEO.NOTE_TYPES', ['big_chance', 'goal', 'skill', 'good_play', 'card', 'other']);
      const normalizedEventType = (eventType || '').toLowerCase();

      if (!allowedTypes.includes(normalizedEventType)) {
        throw new Error(`Invalid event type: ${eventType}`);
      }

      let resolvedPlayer = player ? StringUtils.cleanPlayerName(player) : '';
      if (!resolvedPlayer) {
        resolvedPlayer = this.autoDetectPlayerFromDescription(description);
      }

      const eventData = {
        minute: eventMinute,
        event_type: normalizedEventType,
        player: resolvedPlayer,
        description: description,
        marked_for_editor: true,
        marked_at: DateUtils.formatISO(DateUtils.now()),
        status: 'pending_review'
      };

      const saveResult = this.saveVideoEvent(eventData);

      if (!saveResult.success) {
        throw new Error(`Failed to save video event: ${saveResult.error}`);
      }

      // @testHook(video_event_marked)
      this.logger.exitFunction('markVideoEvent', { success: true });

      return {
        success: true,
        event_data: eventData,
        message: 'Event marked for video editor review'
      };
    } catch (error) {
      this.logger.error('Video event marking failed', {
        error: error.toString(),
        minute,
        eventType,
        player
      });

      return {
        success: false,
        error: error.toString(),
        minute: minute,
        event_type: eventType,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  organizePlayerClips(player, clipId) {
    this.logger.enterFunction('organizePlayerClips', { player, clipId });

    try {
      // @testHook(player_clips_organization_start)
      const cleanPlayerName = StringUtils.cleanPlayerName(player);
      const safeFolderName = StringUtils.toSafeFilename(cleanPlayerName);

      const playerFolder = this.driveOrganization.getOrCreatePlayerFolder(cleanPlayerName);

      if (!playerFolder) {
        throw new Error(`Failed to create folder for player: ${cleanPlayerName}`);
      }

      const updateResult = this.updateClipFolderInfo(clipId, playerFolder.getId(), safeFolderName);

      // @testHook(player_clips_organized)
      this.logger.exitFunction('organizePlayerClips', { success: true });

      return {
        success: true,
        player: cleanPlayerName,
        folder_id: playerFolder.getId(),
        folder_name: safeFolderName,
        clip_id: clipId,
        update_result: updateResult,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    } catch (error) {
      this.logger.error('Player clips organization failed', {
        error: error.toString(),
        player,
        clipId
      });

      return {
        success: false,
        error: error.toString(),
        player: player,
        clip_id: clipId,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  generateMatchGraphics(matchId, matchInfo = {}) {
    this.logger.enterFunction('generateMatchGraphics', { matchId });

    try {
      // @testHook(match_graphics_generation_start)
      if (!matchId) {
        throw new Error('Match ID is required');
      }

      const fullMatchInfo = this.getMatchInfo(matchId, matchInfo);
      const graphics = this.graphicsGenerator.generate(matchId, fullMatchInfo);

      const saveResult = this.saveMatchGraphics(matchId, graphics);

      // @testHook(match_graphics_generated)
      this.logger.exitFunction('generateMatchGraphics', { success: true });

      return {
        success: true,
        match_id: matchId,
        graphics: graphics,
        save_result: saveResult
      };
    } catch (error) {
      this.logger.error('Match graphics generation failed', {
        error: error.toString(),
        matchId
      });

      return {
        success: false,
        error: error.toString(),
        match_id: matchId,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  uploadToYouTube(clipId, filePath) {
    this.logger.enterFunction('uploadToYouTube', { clipId, filePath });

    try {
      // @testHook(youtube_upload_start)
      if (!isFeatureEnabled('YOUTUBE_AUTOMATION')) {
        return {
          success: false,
          error: 'YouTube automation not enabled',
          skipped: true
        };
      }

      const clipData = this.getClipMetadata(clipId);
      if (!clipData) {
        throw new Error(`Clip metadata not found: ${clipId}`);
      }

      const uploadResult = this.youtubeIntegration.uploadClip(clipId, filePath, clipData);

      if (uploadResult.success) {
        this.updateClipWithYouTubeInfo(clipId, uploadResult.youtube_url, uploadResult.video_id);
      }

      // @testHook(youtube_upload_complete)
      this.logger.exitFunction('uploadToYouTube', {
        success: uploadResult.success,
        video_id: uploadResult.video_id
      });

      return uploadResult;
    } catch (error) {
      this.logger.error('YouTube upload failed', {
        error: error.toString(),
        clipId
      });

      return {
        success: false,
        error: error.toString(),
        clip_id: clipId,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  requestCloudConvertProcessing(clipMetadata) {
    return this.processingQueue.requestProcessing(clipMetadata);
  }

  saveClipMetadata(clipMetadata) {
    try {
      const videoClipsSheet = SheetUtils.getOrCreateSheet(
        getConfigValue('SHEETS.TAB_NAMES.VIDEO_CLIPS'),
        getConfigValue('SHEETS.REQUIRED_COLUMNS.VIDEO_CLIPS')
      );

      if (!videoClipsSheet) {
        return { success: false, error: 'Cannot access Video Clips sheet' };
      }

      const rowData = {
        'Match ID': clipMetadata.match_id,
        'Player': clipMetadata.player,
        'Event Type': clipMetadata.event_type,
        'Minute': clipMetadata.minute,
        'Start Time': clipMetadata.start_time_seconds,
        'Duration': clipMetadata.duration_seconds,
        'Title': clipMetadata.title,
        'Caption': clipMetadata.description,
        'Status': clipMetadata.status,
        'YouTube URL': '',
        'Folder Path': clipMetadata.match_folder_path || clipMetadata.player_folder_path || '',
        'Created': clipMetadata.created_at,
        'Match Date': clipMetadata.match_date || '',
        'Local Path': clipMetadata.player_folder_path || '',
        'Notes': clipMetadata.notes || ''
      };

      const addResult = SheetUtils.addRowFromObject(videoClipsSheet, rowData);

      return {
        success: addResult,
        clip_id: clipMetadata.clip_id
      };
    } catch (error) {
      return {
        success: false,
        error: error.toString()
      };
    }
  }

  saveVideoEvent(eventData) {
    try {
      const notesSheet = SheetUtils.getOrCreateSheet(
        'Video Notes',
        ['Timestamp', 'Minute', 'Event Type', 'Player', 'Description', 'Status']
      );

      if (!notesSheet) {
        return { success: false, error: 'Cannot access Video Notes sheet' };
      }

      const rowData = {
        'Timestamp': DateUtils.formatISO(DateUtils.now()),
        'Minute': eventData.minute,
        'Event Type': eventData.event_type,
        'Player': eventData.player || '',
        'Description': eventData.description || '',
        'Status': eventData.status || 'pending_review'
      };

      const addResult = SheetUtils.addRowFromObject(notesSheet, rowData);

      return {
        success: !!addResult,
        row: rowData
      };
    } catch (error) {
      this.logger.error('Failed to save video event', { error: error.toString(), eventData });
      return { success: false, error: error.toString() };
    }
  }

  generateClipTitle(player, opponent, minute) {
    const clubName = getConfigValue('SYSTEM.CLUB_SHORT_NAME', 'FC');

    if (opponent) {
      return `${player} Goal vs ${opponent} (${minute}')`;
    }
    return `${player} Goal - ${minute}' | ${clubName}`;
  }

  generateClipDescription(player, assist, opponent, minute) {
    const clubName = getConfigValue('SYSTEM.CLUB_NAME', 'Football Club');
    const season = getConfigValue('SYSTEM.SEASON', '2024/25');

    let description = `${player} scores in the ${minute}' for ${clubName}`;

    if (assist) {
      description += ` with an assist from ${assist}`;
    }

    if (opponent) {
      description += ` against ${opponent}`;
    }

    description += `.\n\nSeason: ${season}`;
    description += `\n\n#${clubName.replace(/\s+/g, '')} #Football #Goal`;

    return description;
  }

  generateClipTags(player, opponent) {
    const clubName = getConfigValue('SYSTEM.CLUB_NAME', 'Football Club');
    const tags = [
      clubName,
      'Football',
      'Goal',
      'Highlights',
      player
    ];

    if (opponent) {
      tags.push(opponent);
    }

    return tags;
  }

  autoDetectPlayerFromDescription(description) {
    if (!description || typeof description !== 'string') {
      return '';
    }

    const match = description.match(/([A-Z][a-z]+\s[A-Z][a-z]+)/);
    if (match && match[1]) {
      return StringUtils.cleanPlayerName(match[1]);
    }

    return '';
  }

  getMatchInfo(matchId, additionalInfo = {}) {
    try {
      const resultsSheet = SheetUtils.getOrCreateSheet(
        getConfigValue('SHEETS.TAB_NAMES.RESULTS')
      );

      if (resultsSheet) {
        const resultData = SheetUtils.findRowByCriteria(resultsSheet, { 'Match ID': matchId });
        if (resultData) {
          return {
            date: resultData.Date,
            opponent: resultData.Opposition,
            venue: resultData.Venue,
            competition: resultData.Competition,
            home_away: resultData['Home/Away'],
            ...additionalInfo
          };
        }
      }

      const fixturesSheet = SheetUtils.getOrCreateSheet(
        getConfigValue('SHEETS.TAB_NAMES.FIXTURES')
      );

      if (fixturesSheet) {
        const fixtureData = SheetUtils.findRowByCriteria(fixturesSheet, { 'Match ID': matchId });
        if (fixtureData) {
          return {
            date: fixtureData.Date,
            opponent: fixtureData.Opposition,
            venue: fixtureData.Venue,
            competition: fixtureData.Competition,
            home_away: fixtureData['Home/Away'],
            ...additionalInfo
          };
        }
      }

      return {
        date: DateUtils.formatUK(DateUtils.now()),
        opponent: 'Unknown',
        venue: 'Unknown',
        competition: 'League',
        home_away: 'Home',
        ...additionalInfo
      };
    } catch (error) {
      this.logger.error('Failed to get match info', { error: error.toString() });
      return {
        date: DateUtils.formatUK(DateUtils.now()),
        opponent: 'Unknown',
        venue: 'Unknown',
        competition: 'League',
        home_away: 'Home',
        ...additionalInfo
      };
    }
  }

  getClipMetadata(clipId) {
    try {
      const videoClipsSheet = SheetUtils.getOrCreateSheet(
        getConfigValue('SHEETS.TAB_NAMES.VIDEO_CLIPS')
      );

      if (!videoClipsSheet) {
        return null;
      }

      const clipRow = SheetUtils.findRowByCriteria(videoClipsSheet, { 'Clip ID': clipId })
        || SheetUtils.findRowByCriteria(videoClipsSheet, { 'clip_id': clipId })
        || SheetUtils.findRowByCriteria(videoClipsSheet, { 'ID': clipId });

      return clipRow || null;
    } catch (error) {
      this.logger.error('Failed to read clip metadata', { error: error.toString(), clipId });
      return null;
    }
  }

  updateClipWithYouTubeInfo(clipId, youtubeUrl, videoId) {
    try {
      const videoClipsSheet = SheetUtils.getOrCreateSheet(
        getConfigValue('SHEETS.TAB_NAMES.VIDEO_CLIPS'),
        getConfigValue('SHEETS.REQUIRED_COLUMNS.VIDEO_CLIPS')
      );

      if (!videoClipsSheet) {
        return { success: false, error: 'Cannot access Video Clips sheet' };
      }

      const updates = {
        'YouTube URL': youtubeUrl || '',
        'Status': 'youtube_uploaded'
      };

      if (videoId) {
        updates['Video ID'] = videoId;
      }

      updates['Updated'] = DateUtils.formatISO(DateUtils.now());

      const updateResult = SheetUtils.updateRowByCriteria(
        videoClipsSheet,
        { 'Clip ID': clipId },
        updates
      ) || SheetUtils.updateRowByCriteria(
        videoClipsSheet,
        { 'clip_id': clipId },
        updates
      );

      return { success: !!updateResult };
    } catch (error) {
      this.logger.error('Failed to update clip with YouTube info', { error: error.toString(), clipId });
      return { success: false, error: error.toString() };
    }
  }

  updateClipFolderInfo(clipId, folderId, safeFolderName) {
    try {
      const videoClipsSheet = SheetUtils.getOrCreateSheet(
        getConfigValue('SHEETS.TAB_NAMES.VIDEO_CLIPS'),
        getConfigValue('SHEETS.REQUIRED_COLUMNS.VIDEO_CLIPS')
      );

      if (!videoClipsSheet) {
        return { success: false, error: 'Cannot access Video Clips sheet' };
      }

      const folderPath = safeFolderName ? `${safeFolderName}` : '';
      const updates = {
        'Folder Path': folderPath,
        'Local Path': folderPath,
        'Status': 'organized',
        'Updated': DateUtils.formatISO(DateUtils.now())
      };

      if (folderId) {
        updates['Folder ID'] = folderId;
      }

      const updateResult = SheetUtils.updateRowByCriteria(
        videoClipsSheet,
        { 'Clip ID': clipId },
        updates
      ) || SheetUtils.updateRowByCriteria(
        videoClipsSheet,
        { 'clip_id': clipId },
        updates
      );

      return { success: !!updateResult };
    } catch (error) {
      this.logger.error('Failed to update clip folder info', { error: error.toString(), clipId });
      return { success: false, error: error.toString() };
    }
  }

  saveMatchGraphics(matchId, graphics) {
    try {
      const sheet = SheetUtils.getOrCreateSheet(
        getConfigValue('SHEETS.TAB_NAMES.VIDEO_GRAPHICS', 'Video Graphics'),
        ['Match ID', 'Generated At', 'Payload']
      );

      if (!sheet) {
        return { success: false, error: 'Cannot access Video Graphics sheet' };
      }

      const payload = {
        'Match ID': matchId,
        'Generated At': DateUtils.formatISO(DateUtils.now()),
        'Payload': JSON.stringify(graphics)
      };

      const addResult = SheetUtils.addRowFromObject(sheet, payload);
      return { success: !!addResult };
    } catch (error) {
      this.logger.error('Failed to save match graphics metadata', { error: error.toString(), matchId });
      return { success: false, error: error.toString() };
    }
  }
};
