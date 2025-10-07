import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs-extra';
import { YouTubeManager } from './youtube-manager.js';
import { DriveStorageManager } from './drive-storage-manager.js';
import { CleanupScheduler } from './cleanup-scheduler.js';
import { StorageAnalytics } from './storage-analytics.js';

export class StorageCoordinator extends EventEmitter {
  constructor(logger, credentials) {
    super();
    this.logger = logger;
    this.credentials = credentials;

    // Initialize storage managers
    this.youtubeManager = new YouTubeManager(logger, credentials.google);
    this.driveManager = new DriveStorageManager(logger, credentials.google);
    this.analytics = new StorageAnalytics(logger, this.driveManager, this.youtubeManager);
    this.cleanupScheduler = new CleanupScheduler(logger, this.driveManager, this.youtubeManager);

    // Upload configuration
    this.uploadConfig = {
      defaultPrivacy: 'unlisted',
      enableDriveUpload: true,
      enableYouTubeUpload: true,
      maxRetries: 3,
      parallelUploads: false, // Upload sequentially by default for stability
      generateThumbnails: true,
      organizeFolders: true
    };

    this.setupEventListeners();
    this.init();
  }

  async init() {
    try {
      this.logger.info('Initializing storage coordinator');

      // Load cleanup schedule
      await this.driveManager.loadCleanupSchedule();

      // Start cleanup scheduler
      await this.cleanupScheduler.start();

      // Load initial metrics
      await this.analytics.collectStorageMetrics();

      this.logger.info('Storage coordinator initialized successfully');
      this.emit('initialized');

    } catch (error) {
      this.logger.error('Failed to initialize storage coordinator', error);
      this.emit('initializationError', error);
      throw error;
    }
  }

  setupEventListeners() {
    // YouTube events
    this.youtubeManager.on('uploadComplete', (result) => {
      this.analytics.recordUpload({
        success: true,
        duration: Date.now() - result.startTime,
        fileSize: result.fileSize,
        fileName: result.title,
        service: 'youtube'
      });
    });

    this.youtubeManager.on('uploadError', ({ title, error }) => {
      this.analytics.recordUpload({
        success: false,
        duration: 0,
        fileName: title,
        service: 'youtube',
        error
      });
    });

    // Drive events
    this.driveManager.on('uploadComplete', (result) => {
      this.analytics.recordUpload({
        success: true,
        duration: Date.now() - result.startTime,
        fileSize: result.size,
        fileName: result.name,
        service: 'drive'
      });
    });

    this.driveManager.on('uploadError', ({ fileName, error }) => {
      this.analytics.recordUpload({
        success: false,
        duration: 0,
        fileName,
        service: 'drive',
        error
      });
    });

    this.driveManager.on('fileDeleted', (data) => {
      this.logger.info('File deleted from Drive', data);
    });

    // Cleanup events
    this.cleanupScheduler.on('dailyCleanupComplete', (result) => {
      this.analytics.recordCleanup(result);
    });

    this.cleanupScheduler.on('emergencyCleanupComplete', (result) => {
      this.logger.warn('Emergency cleanup completed', result);
      this.analytics.recordCleanup(result);
    });

    // Analytics events
    this.analytics.on('alertCreated', (alert) => {
      this.logger.warn('Storage alert created', alert);
      this.emit('storageAlert', alert);
    });
  }

  async uploadHighlights(videoData) {
    const {
      teamHighlight,
      playerHighlights = [],
      individualClips = [],
      metadata
    } = videoData;

    const uploadStartTime = Date.now();
    const results = {
      teamHighlight: null,
      playerHighlights: [],
      individualClips: [],
      uploadSummary: {
        total: 0,
        successful: 0,
        failed: 0,
        duration: 0
      }
    };

    try {
      this.logger.info('Starting comprehensive highlight upload', {
        teamHighlight: !!teamHighlight,
        playerHighlights: playerHighlights.length,
        individualClips: individualClips.length
      });

      // Upload team highlight
      if (teamHighlight && teamHighlight.filePath) {
        results.teamHighlight = await this.uploadSingleHighlight(
          teamHighlight.filePath,
          {
            title: this.generateTeamTitle(metadata),
            description: this.generateTeamDescription(metadata),
            folder: 'Matches',
            tags: this.generateTags(metadata, 'team'),
            playlistName: this.generatePlaylistName(metadata, 'team'),
            type: 'team'
          }
        );
        results.uploadSummary.total++;
      }

      // Upload player highlights
      for (const playerHighlight of playerHighlights) {
        if (playerHighlight.filePath) {
          try {
            const playerResult = await this.uploadSingleHighlight(
              playerHighlight.filePath,
              {
                title: this.generatePlayerTitle(playerHighlight, metadata),
                description: this.generatePlayerDescription(playerHighlight, metadata),
                folder: `Players/${playerHighlight.player}`,
                tags: this.generateTags(metadata, 'player', playerHighlight.player),
                playlistName: this.generatePlaylistName(metadata, 'player', playerHighlight.player),
                type: 'player'
              }
            );

            results.playerHighlights.push({
              player: playerHighlight.player,
              ...playerResult
            });
            results.uploadSummary.total++;

          } catch (error) {
            this.logger.error(`Failed to upload player highlight for ${playerHighlight.player}`, error);
            results.uploadSummary.failed++;
          }
        }
      }

      // Upload individual clips (optional, for archive purposes)
      if (this.uploadConfig.enableDriveUpload && individualClips.length > 0) {
        const clipResults = await this.uploadIndividualClips(individualClips, metadata);
        results.individualClips = clipResults;
        results.uploadSummary.total += clipResults.length;
      }

      results.uploadSummary.duration = Date.now() - uploadStartTime;
      results.uploadSummary.successful = results.uploadSummary.total - results.uploadSummary.failed;

      this.logger.info('Highlight upload completed', {
        total: results.uploadSummary.total,
        successful: results.uploadSummary.successful,
        failed: results.uploadSummary.failed,
        duration: `${Math.round(results.uploadSummary.duration / 1000)}s`
      });

      this.emit('uploadComplete', results);
      return results;

    } catch (error) {
      this.logger.error('Highlight upload failed', error);
      this.emit('uploadError', error);
      throw error;
    }
  }

  async uploadSingleHighlight(filePath, options) {
    const { title, description, folder, tags, playlistName, type, privacy } = options;
    const uploadStartTime = Date.now();

    const results = {
      youtube: null,
      drive: null,
      uploadTime: null
    };

    try {
      // Upload to YouTube (permanent storage)
      if (this.uploadConfig.enableYouTubeUpload) {
        this.logger.info(`Uploading to YouTube: ${title}`);

        results.youtube = await this.youtubeManager.uploadVideo(filePath, {
          title,
          description,
          tags,
          privacy: privacy || this.uploadConfig.defaultPrivacy,
          playlistName
        });

        // Generate and upload thumbnail if enabled
        if (this.uploadConfig.generateThumbnails) {
          await this.generateAndUploadThumbnail(filePath, results.youtube.id);
        }
      }

      // Upload to Drive (temporary storage with 30-day cleanup)
      if (this.uploadConfig.enableDriveUpload) {
        this.logger.info(`Uploading to Drive: ${title}`);

        results.drive = await this.driveManager.uploadFile(
          filePath,
          `${title}.mp4`,
          {
            folder: this.generateDriveFolder(folder, type),
            description: this.generateDriveDescription(description),
            metadata: {
              originalTitle: title,
              uploadType: type,
              youtubeId: results.youtube?.id
            }
          }
        );
      }

      results.uploadTime = Date.now() - uploadStartTime;

      this.logger.info(`Upload completed: ${title}`, {
        youtube: !!results.youtube,
        drive: !!results.drive,
        duration: `${Math.round(results.uploadTime / 1000)}s`
      });

      return results;

    } catch (error) {
      this.logger.error(`Upload failed: ${title}`, error);
      throw error;
    }
  }

  async uploadIndividualClips(clips, metadata) {
    const results = [];

    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];

      if (!clip.filePath || !fs.existsSync(clip.filePath)) {
        continue;
      }

      try {
        const clipTitle = `${metadata.clubName} vs ${metadata.opponent} - Clip ${i + 1}`;
        const driveResult = await this.driveManager.uploadFile(
          clip.filePath,
          `${clipTitle}.mp4`,
          {
            folder: `Matches/${metadata.matchDate}/Individual_Clips`,
            description: `Individual clip: ${clip.description}`,
            metadata: {
              clipIndex: i + 1,
              originalDescription: clip.description,
              startTime: clip.startTime,
              endTime: clip.endTime,
              source: clip.source
            }
          }
        );

        results.push({
          index: i + 1,
          description: clip.description,
          drive: driveResult
        });

      } catch (error) {
        this.logger.error(`Failed to upload clip ${i + 1}`, error);
      }
    }

    return results;
  }

  async generateAndUploadThumbnail(videoPath, youtubeId) {
    try {
      // This would generate a thumbnail from the video
      // For now, we'll skip thumbnail generation
      this.logger.debug(`Thumbnail generation skipped for ${youtubeId}`);
    } catch (error) {
      this.logger.warn(`Thumbnail generation failed for ${youtubeId}`, error);
    }
  }

  generateTeamTitle(metadata) {
    return `${metadata.clubName} vs ${metadata.opponent} - Match Highlights (${metadata.matchDate})`;
  }

  generatePlayerTitle(playerHighlight, metadata) {
    return `${playerHighlight.player} - Individual Highlights vs ${metadata.opponent} (${metadata.matchDate})`;
  }

  generateTeamDescription(metadata) {
    return [
      `Match highlights: ${metadata.clubName} vs ${metadata.opponent}`,
      `Date: ${metadata.matchDate}`,
      '',
      '🎥 Automatically generated using AI-powered video analysis',
      '⚽ Features goals, key moments, and match action',
      '🤖 Processed with smart timing and scene detection',
      '',
      '#Football #Soccer #Highlights #MatchHighlights'
    ].join('\\n');
  }

  generatePlayerDescription(playerHighlight, metadata) {
    return [
      `Individual highlights for ${playerHighlight.player}`,
      `Match: ${metadata.clubName} vs ${metadata.opponent}`,
      `Date: ${metadata.matchDate}`,
      `Actions: ${playerHighlight.actions?.join(', ') || 'Various'}`,
      '',
      '🎥 Automatically curated from match footage',
      '🏃 Individual player focus with smart editing',
      '🤖 AI-powered highlight detection',
      '',
      `#${playerHighlight.player.replace(/\\s+/g, '')} #Football #PlayerHighlights`
    ].join('\\n');
  }

  generateDriveDescription(originalDescription) {
    return [
      originalDescription,
      '',
      '⏰ Temporary storage - Auto-deleted in 30 days',
      '📺 Permanent copy available on YouTube',
      '🎥 Football highlights system'
    ].join('\\n');
  }

  generateTags(metadata, type, playerName = null) {
    const baseTags = [
      metadata.clubName.replace(/\\s+/g, ''),
      'football',
      'soccer',
      'highlights',
      metadata.matchDate.replace(/-/g, '')
    ];

    if (type === 'team') {
      baseTags.push('match', 'team', 'goals');
    } else if (type === 'player' && playerName) {
      baseTags.push('player', playerName.replace(/\\s+/g, ''), 'individual');
    }

    return baseTags;
  }

  generatePlaylistName(metadata, type, playerName = null) {
    const season = this.extractSeason(metadata.matchDate);

    if (type === 'team') {
      return `${metadata.clubName} ${season} Matches`;
    } else if (type === 'player' && playerName) {
      return `${playerName} ${season} Highlights`;
    }

    return `${metadata.clubName} ${season}`;
  }

  generateDriveFolder(folder, type) {
    const date = new Date().toISOString().split('T')[0];

    if (type === 'team') {
      return `Matches/${date}`;
    } else if (type === 'player') {
      return folder; // Already formatted as Players/{PlayerName}
    }

    return `Highlights/${date}`;
  }

  extractSeason(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    // Football season typically runs Aug-May
    if (month >= 8) {
      return `${year}-${(year + 1).toString().slice(-2)}`;
    } else {
      return `${year - 1}-${year.toString().slice(-2)}`;
    }
  }

  // Privacy and organization management
  async updateVideoPrivacy(videoId, privacy) {
    return await this.youtubeManager.updateVideoPrivacy(videoId, privacy);
  }

  async updatePlaylistPrivacy(playlistId, privacy) {
    return await this.youtubeManager.updatePlaylistPrivacy(playlistId, privacy);
  }

  async makePublic(uploadResults) {
    const results = { youtube: [], playlists: [] };

    try {
      // Update YouTube video privacy
      if (uploadResults.teamHighlight?.youtube?.id) {
        const success = await this.updateVideoPrivacy(uploadResults.teamHighlight.youtube.id, 'public');
        results.youtube.push({
          id: uploadResults.teamHighlight.youtube.id,
          type: 'team',
          success
        });
      }

      for (const playerHighlight of uploadResults.playerHighlights || []) {
        if (playerHighlight.youtube?.id) {
          const success = await this.updateVideoPrivacy(playerHighlight.youtube.id, 'public');
          results.youtube.push({
            id: playerHighlight.youtube.id,
            type: 'player',
            player: playerHighlight.player,
            success
          });
        }
      }

      this.logger.info('Videos made public', {
        updated: results.youtube.filter(r => r.success).length,
        failed: results.youtube.filter(r => !r.success).length
      });

      return results;

    } catch (error) {
      this.logger.error('Failed to make videos public', error);
      throw error;
    }
  }

  // Analytics and monitoring
  async getStorageStatus() {
    return await this.analytics.getDashboardData();
  }

  async generateStorageReport(timeframe = '24h') {
    return await this.analytics.generateReport(timeframe);
  }

  getActiveAlerts() {
    return this.analytics.getActiveAlerts();
  }

  async resolveAlert(alertId) {
    return await this.analytics.resolveAlert(alertId);
  }

  // Manual cleanup operations
  async runManualCleanup(olderThanDays = 30) {
    return await this.driveManager.cleanupOldFiles(olderThanDays);
  }

  async previewCleanup(olderThanDays = 30) {
    return await this.driveManager.cleanupOldFiles(olderThanDays, true);
  }

  // Configuration management
  updateUploadConfig(newConfig) {
    this.uploadConfig = { ...this.uploadConfig, ...newConfig };
    this.logger.info('Upload configuration updated', newConfig);
  }

  getUploadConfig() {
    return { ...this.uploadConfig };
  }

  updateCleanupConfig(newConfig) {
    this.cleanupScheduler.updateConfig(newConfig);
  }

  getCleanupConfig() {
    return this.cleanupScheduler.getConfig();
  }

  // System control
  async stop() {
    this.logger.info('Stopping storage coordinator');

    await this.cleanupScheduler.stop();

    this.logger.info('Storage coordinator stopped');
    this.emit('stopped');
  }

  async restart() {
    this.logger.info('Restarting storage coordinator');

    await this.stop();
    await this.init();

    this.logger.info('Storage coordinator restarted');
    this.emit('restarted');
  }
}