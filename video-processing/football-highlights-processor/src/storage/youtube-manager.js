import { google } from 'googleapis';
import fs from 'fs-extra';
import path from 'path';
import { EventEmitter } from 'events';

export class YouTubeManager extends EventEmitter {
  constructor(logger, credentials) {
    super();
    this.logger = logger;
    this.youtube = null;
    this.auth = null;
    this.uploadRetries = 3;
    this.uploadTimeout = 1800000; // 30 minutes
    this.rateLimitDelay = 1000; // 1 second between requests
    this.lastRequestTime = 0;
    this.init(credentials);
  }

  async init(credentials) {
    try {
      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: [
          'https://www.googleapis.com/auth/youtube.upload',
          'https://www.googleapis.com/auth/youtube',
          'https://www.googleapis.com/auth/youtube.force-ssl'
        ]
      });

      const authClient = await this.auth.getClient();
      this.youtube = google.youtube({ version: 'v3', auth: authClient });

      this.logger.info('YouTube client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize YouTube client', error);
      throw error;
    }
  }

  async uploadVideo(videoPath, options = {}) {
    const {
      title,
      description = '',
      tags = [],
      categoryId = '17', // Sports
      privacy = 'unlisted',
      folder = '',
      thumbnail = null,
      playlistName = null,
      language = 'en',
      publishAt = null
    } = options;

    try {
      this.logger.info('Starting YouTube upload', { title, privacy, folder });

      await this.respectRateLimit();

      const uploadMetadata = {
        snippet: {
          title: this.sanitizeTitle(title),
          description: this.enhanceDescription(description, tags),
          tags: this.processTags(tags),
          categoryId,
          defaultLanguage: language,
          defaultAudioLanguage: language
        },
        status: {
          privacyStatus: privacy,
          selfDeclaredMadeForKids: false,
          embeddable: true,
          publicStatsViewable: true
        }
      };

      if (publishAt) {
        uploadMetadata.status.publishAt = publishAt;
      }

      const fileSize = (await fs.stat(videoPath)).size;
      this.logger.info(`Uploading ${this.formatBytes(fileSize)} video to YouTube`);

      const uploadResult = await this.performResumableUpload(videoPath, uploadMetadata);

      this.logger.info('YouTube upload completed', {
        videoId: uploadResult.id,
        title: uploadResult.snippet.title
      });

      // Add custom thumbnail if provided
      if (thumbnail && fs.existsSync(thumbnail)) {
        await this.uploadThumbnail(uploadResult.id, thumbnail);
      }

      // Add to playlist if specified
      let playlistUrl = null;
      if (playlistName) {
        playlistUrl = await this.addToPlaylist(uploadResult.id, playlistName, folder);
      }

      const result = {
        id: uploadResult.id,
        title: uploadResult.snippet.title,
        url: `https://www.youtube.com/watch?v=${uploadResult.id}`,
        embedUrl: `https://www.youtube.com/embed/${uploadResult.id}`,
        channelUrl: `https://www.youtube.com/channel/${uploadResult.snippet.channelId}`,
        privacy,
        playlistUrl,
        uploadedAt: new Date().toISOString(),
        fileSize
      };

      this.emit('uploadComplete', result);
      return result;

    } catch (error) {
      this.logger.error('YouTube upload failed', {
        title,
        error: error.message,
        stack: error.stack
      });

      this.emit('uploadError', { title, error });
      throw error;
    }
  }

  async performResumableUpload(videoPath, metadata) {
    let attempt = 0;
    let lastError = null;

    while (attempt < this.uploadRetries) {
      try {
        this.logger.debug(`YouTube upload attempt ${attempt + 1}/${this.uploadRetries}`);

        const response = await this.youtube.videos.insert({
          part: ['snippet', 'status', 'contentDetails'],
          requestBody: metadata,
          media: {
            body: fs.createReadStream(videoPath)
          }
        });

        return response.data;

      } catch (error) {
        lastError = error;
        attempt++;

        if (this.isRetryableError(error) && attempt < this.uploadRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          this.logger.warn(`Upload failed, retrying in ${delay}ms`, {
            attempt,
            error: error.message
          });
          await this.sleep(delay);
        } else {
          break;
        }
      }
    }

    throw lastError;
  }

  async uploadThumbnail(videoId, thumbnailPath) {
    try {
      await this.respectRateLimit();

      await this.youtube.thumbnails.set({
        videoId,
        media: {
          mimeType: 'image/jpeg',
          body: fs.createReadStream(thumbnailPath)
        }
      });

      this.logger.info(`Thumbnail uploaded for video ${videoId}`);
    } catch (error) {
      this.logger.warn(`Thumbnail upload failed for ${videoId}`, error);
    }
  }

  async createPlaylist(title, description = '', privacy = 'unlisted') {
    try {
      await this.respectRateLimit();

      const response = await this.youtube.playlists.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title: this.sanitizeTitle(title),
            description
          },
          status: {
            privacyStatus: privacy
          }
        }
      });

      this.logger.info(`Created playlist: ${title}`, { id: response.data.id });

      return {
        id: response.data.id,
        title: response.data.snippet.title,
        url: `https://www.youtube.com/playlist?list=${response.data.id}`,
        privacy
      };

    } catch (error) {
      this.logger.error(`Failed to create playlist: ${title}`, error);
      throw error;
    }
  }

  async findPlaylist(title) {
    try {
      await this.respectRateLimit();

      const response = await this.youtube.playlists.list({
        part: ['snippet'],
        mine: true,
        maxResults: 50
      });

      const playlist = response.data.items.find(
        p => p.snippet.title === title
      );

      return playlist ? {
        id: playlist.id,
        title: playlist.snippet.title,
        url: `https://www.youtube.com/playlist?list=${playlist.id}`
      } : null;

    } catch (error) {
      this.logger.error(`Failed to find playlist: ${title}`, error);
      return null;
    }
  }

  async addToPlaylist(videoId, playlistName, folder = '') {
    try {
      const fullPlaylistName = this.generatePlaylistName(playlistName, folder);

      let playlist = await this.findPlaylist(fullPlaylistName);

      if (!playlist) {
        const description = this.generatePlaylistDescription(playlistName, folder);
        playlist = await this.createPlaylist(fullPlaylistName, description);
      }

      await this.respectRateLimit();

      await this.youtube.playlistItems.insert({
        part: ['snippet'],
        requestBody: {
          snippet: {
            playlistId: playlist.id,
            resourceId: {
              kind: 'youtube#video',
              videoId: videoId
            }
          }
        }
      });

      this.logger.info(`Added video ${videoId} to playlist: ${fullPlaylistName}`);
      return playlist.url;

    } catch (error) {
      this.logger.error(`Failed to add video to playlist`, {
        videoId,
        playlistName,
        error: error.message
      });
      return null;
    }
  }

  generatePlaylistName(baseName, folder) {
    if (folder === 'Matches') {
      return `⚽ ${baseName}`;
    } else if (folder.startsWith('Players/')) {
      const playerName = folder.replace('Players/', '');
      return `🏃 ${playerName} - ${baseName}`;
    }
    return baseName;
  }

  generatePlaylistDescription(baseName, folder) {
    if (folder === 'Matches') {
      return `Match highlights collection - ${baseName}. All match videos are automatically organized and updated.`;
    } else if (folder.startsWith('Players/')) {
      const playerName = folder.replace('Players/', '');
      return `Individual player highlights for ${playerName}. Automatically curated from match footage.`;
    }
    return `Football highlights - ${baseName}`;
  }

  async updateVideoPrivacy(videoId, privacy) {
    try {
      await this.respectRateLimit();

      await this.youtube.videos.update({
        part: ['status'],
        requestBody: {
          id: videoId,
          status: {
            privacyStatus: privacy
          }
        }
      });

      this.logger.info(`Updated video ${videoId} privacy to: ${privacy}`);
      return true;

    } catch (error) {
      this.logger.error(`Failed to update privacy for ${videoId}`, error);
      return false;
    }
  }

  async updatePlaylistPrivacy(playlistId, privacy) {
    try {
      await this.respectRateLimit();

      await this.youtube.playlists.update({
        part: ['status'],
        requestBody: {
          id: playlistId,
          status: {
            privacyStatus: privacy
          }
        }
      });

      this.logger.info(`Updated playlist ${playlistId} privacy to: ${privacy}`);
      return true;

    } catch (error) {
      this.logger.error(`Failed to update playlist privacy for ${playlistId}`, error);
      return false;
    }
  }

  async getChannelStats() {
    try {
      await this.respectRateLimit();

      const response = await this.youtube.channels.list({
        part: ['statistics', 'snippet', 'contentDetails'],
        mine: true
      });

      const channel = response.data.items[0];

      if (!channel) {
        throw new Error('No channel found');
      }

      return {
        id: channel.id,
        title: channel.snippet.title,
        description: channel.snippet.description,
        subscriberCount: parseInt(channel.statistics.subscriberCount) || 0,
        videoCount: parseInt(channel.statistics.videoCount) || 0,
        viewCount: parseInt(channel.statistics.viewCount) || 0,
        publishedAt: channel.snippet.publishedAt,
        uploadsPlaylistId: channel.contentDetails.relatedPlaylists.uploads
      };

    } catch (error) {
      this.logger.error('Failed to get channel stats', error);
      return null;
    }
  }

  async getVideoAnalytics(videoId) {
    try {
      await this.respectRateLimit();

      const response = await this.youtube.videos.list({
        part: ['statistics', 'snippet', 'status'],
        id: [videoId]
      });

      const video = response.data.items[0];

      if (!video) {
        return null;
      }

      return {
        id: videoId,
        title: video.snippet.title,
        publishedAt: video.snippet.publishedAt,
        privacy: video.status.privacyStatus,
        viewCount: parseInt(video.statistics.viewCount) || 0,
        likeCount: parseInt(video.statistics.likeCount) || 0,
        commentCount: parseInt(video.statistics.commentCount) || 0,
        duration: video.contentDetails?.duration,
        url: `https://www.youtube.com/watch?v=${videoId}`
      };

    } catch (error) {
      this.logger.error(`Failed to get analytics for video ${videoId}`, error);
      return null;
    }
  }

  sanitizeTitle(title) {
    // YouTube title limitations: max 100 characters
    return title.slice(0, 100).replace(/[<>]/g, '');
  }

  enhanceDescription(description, tags) {
    const enhanced = [
      description,
      '',
      '🎥 Automatically generated football highlights',
      '⚽ Powered by AI-driven video analysis',
      '',
      `#${tags.join(' #')}`
    ].filter(line => line !== undefined && line !== '').join('\\n');

    // YouTube description limit: 5000 characters
    return enhanced.slice(0, 5000);
  }

  processTags(tags) {
    const defaultTags = ['football', 'soccer', 'highlights', 'sports', 'goals'];
    const combinedTags = [...defaultTags, ...tags];

    // YouTube allows max 500 characters total for tags
    const processedTags = [];
    let totalLength = 0;

    for (const tag of combinedTags) {
      const cleanTag = tag.replace(/[^a-zA-Z0-9\s]/g, '').trim();
      if (cleanTag && totalLength + cleanTag.length < 450) { // Leave some buffer
        processedTags.push(cleanTag);
        totalLength += cleanTag.length;
      }
    }

    return processedTags;
  }

  isRetryableError(error) {
    const retryableCodes = [
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNREFUSED'
    ];

    const retryableStatuses = [500, 502, 503, 504, 429];

    return retryableCodes.includes(error.code) ||
           retryableStatuses.includes(error.status) ||
           error.message.includes('timeout') ||
           error.message.includes('network');
  }

  async respectRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimitDelay) {
      await this.sleep(this.rateLimitDelay - timeSinceLastRequest);
    }

    this.lastRequestTime = Date.now();
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}