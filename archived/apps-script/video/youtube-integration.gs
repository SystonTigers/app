/**
 * @fileoverview Handles YouTube automation for processed video clips.
 */

var Video = Video || {};

Video.YouTubeIntegration = class {
  constructor(options = {}) {
    this.logger = options.logger || (options.loggerFactory ? options.loggerFactory('VideoYouTube') : logger.scope('VideoYouTube'));
    this.youtubeService = options.youtubeService || null;
  }

  uploadClip(clipId, filePath, clipData) {
    this.logger.enterFunction('uploadClip', { clipId, hasFilePath: !!filePath });

    try {
      const uploadParams = {
        title: clipData.title,
        description: clipData.description,
        tags: clipData.tags,
        privacy: getConfigValue('VIDEO.YOUTUBE_DEFAULT_PRIVACY', 'unlisted'),
        category: 'Sports'
      };

      const uploadResult = this.executeUpload(filePath, uploadParams);

      this.logger.exitFunction('uploadClip', {
        success: uploadResult.success,
        video_id: uploadResult.video_id || null
      });

      return uploadResult;
    } catch (error) {
      this.logger.error('Upload clip to YouTube failed', { error: error.toString(), clipId });
      return {
        success: false,
        error: error.toString(),
        clip_id: clipId,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  executeUpload(filePath, params) {
    if (!this.youtubeService || typeof this.youtubeService.upload !== 'function') {
      this.logger.warn('YouTube service not configured; skipping upload', { filePath });
      return {
        success: false,
        error: 'YouTube service not configured',
        skipped: true
      };
    }

    const response = this.youtubeService.upload(filePath, params);
    if (response && response.success) {
      return response;
    }

    return {
      success: false,
      error: response && response.error ? response.error : 'Unknown YouTube upload failure'
    };
  }
};
