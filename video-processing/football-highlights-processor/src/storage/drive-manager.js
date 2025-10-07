import { google } from 'googleapis';
import fs from 'fs-extra';
import path from 'path';
import { pipeline } from 'stream/promises';
import archiver from 'archiver';

export class DriveManager {
  constructor(logger) {
    this.logger = logger;
    this.drive = null;
    this.auth = null;
    this.downloadDir = '/tmp/downloads';
    this.uploadDir = '/tmp/uploads';
    this.init();
  }

  async init() {
    try {
      await fs.ensureDir(this.downloadDir);
      await fs.ensureDir(this.uploadDir);

      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');

      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: [
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/drive.readonly'
        ]
      });

      const authClient = await this.auth.getClient();
      this.drive = google.drive({ version: 'v3', auth: authClient });

      this.logger.info('Google Drive client initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Google Drive client', error);
    }
  }

  async downloadVideo(driveUrl) {
    try {
      const fileId = this.extractFileId(driveUrl);
      if (!fileId) {
        throw new Error('Invalid Google Drive URL format');
      }

      this.logger.info(`Starting download from Google Drive: ${fileId}`);

      const fileMetadata = await this.drive.files.get({
        fileId,
        fields: 'name, size, mimeType'
      });

      const fileName = fileMetadata.data.name;
      const fileSize = parseInt(fileMetadata.data.size);
      const outputPath = path.join(this.downloadDir, `${Date.now()}_${fileName}`);

      this.logger.info(`Downloading ${fileName} (${this.formatBytes(fileSize)})`);

      const response = await this.drive.files.get({
        fileId,
        alt: 'media'
      }, {
        responseType: 'stream'
      });

      const writeStream = fs.createWriteStream(outputPath);

      let downloadedBytes = 0;
      response.data.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        const progress = (downloadedBytes / fileSize) * 100;
        if (downloadedBytes % (1024 * 1024 * 50) === 0) { // Log every 50MB
          this.logger.debug(`Download progress: ${progress.toFixed(1)}%`);
        }
      });

      await pipeline(response.data, writeStream);

      this.logger.info(`Download completed: ${outputPath}`);
      return outputPath;

    } catch (error) {
      this.logger.error('Video download failed', error);
      throw error;
    }
  }

  async uploadResults(results, metadata) {
    try {
      this.logger.info('Starting results upload to Google Drive');

      const folderName = `${metadata.clubName}_vs_${metadata.opponent}_${metadata.matchDate}_${Date.now()}`;
      const folderId = await this.createFolder(folderName);

      const uploadResults = {
        folderId,
        folderName,
        files: []
      };

      if (results.teamHighlight?.filePath) {
        const teamFile = await this.uploadFile(
          results.teamHighlight.filePath,
          `Team_Highlights_${metadata.clubName}_vs_${metadata.opponent}.mp4`,
          folderId
        );
        uploadResults.files.push({
          type: 'team_highlight',
          ...teamFile
        });
      }

      for (const playerHighlight of results.playerHighlights || []) {
        if (playerHighlight.filePath) {
          const playerFile = await this.uploadFile(
            playerHighlight.filePath,
            `${playerHighlight.player}_Highlights.mp4`,
            folderId
          );
          uploadResults.files.push({
            type: 'player_highlight',
            player: playerHighlight.player,
            ...playerFile
          });
        }
      }

      const zipPath = await this.createIndividualClipsZip(results.individualClips, metadata);
      if (zipPath) {
        const zipFile = await this.uploadFile(
          zipPath,
          'Individual_Clips.zip',
          folderId
        );
        uploadResults.files.push({
          type: 'individual_clips_archive',
          ...zipFile
        });
      }

      const statsPath = await this.createStatsReport(results.stats, metadata);
      if (statsPath) {
        const statsFile = await this.uploadFile(
          statsPath,
          'Processing_Stats.json',
          folderId
        );
        uploadResults.files.push({
          type: 'stats_report',
          ...statsFile
        });
      }

      await this.shareFolder(folderId);

      this.logger.info(`Upload completed. Folder: ${folderName}`);
      return uploadResults;

    } catch (error) {
      this.logger.error('Results upload failed', error);
      throw error;
    }
  }

  async createFolder(name) {
    try {
      const response = await this.drive.files.create({
        requestBody: {
          name,
          mimeType: 'application/vnd.google-apps.folder'
        }
      });

      this.logger.info(`Created folder: ${name} (${response.data.id})`);
      return response.data.id;

    } catch (error) {
      this.logger.error(`Failed to create folder: ${name}`, error);
      throw error;
    }
  }

  async uploadFile(filePath, fileName, folderId) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const fileSize = (await fs.stat(filePath)).size;
      this.logger.info(`Uploading ${fileName} (${this.formatBytes(fileSize)})`);

      const response = await this.drive.files.create({
        requestBody: {
          name: fileName,
          parents: [folderId]
        },
        media: {
          body: fs.createReadStream(filePath)
        },
        fields: 'id, name, size, webViewLink, webContentLink'
      });

      this.logger.info(`Uploaded: ${fileName}`);

      return {
        id: response.data.id,
        name: response.data.name,
        size: response.data.size,
        webViewLink: response.data.webViewLink,
        webContentLink: response.data.webContentLink
      };

    } catch (error) {
      this.logger.error(`Failed to upload ${fileName}`, error);
      throw error;
    }
  }

  async shareFolder(folderId) {
    try {
      await this.drive.permissions.create({
        fileId: folderId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      const folderData = await this.drive.files.get({
        fileId: folderId,
        fields: 'webViewLink'
      });

      this.logger.info(`Folder shared publicly: ${folderData.data.webViewLink}`);
      return folderData.data.webViewLink;

    } catch (error) {
      this.logger.warn('Failed to share folder publicly', error);
      return null;
    }
  }

  async createIndividualClipsZip(clips, metadata) {
    try {
      const zipPath = path.join(
        this.uploadDir,
        `individual_clips_${metadata.clubName}_${Date.now()}.zip`
      );

      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.pipe(output);

      const validClips = clips.filter(clip =>
        clip.filePath && fs.existsSync(clip.filePath)
      );

      for (let i = 0; i < validClips.length; i++) {
        const clip = validClips[i];
        const clipName = `${String(i + 1).padStart(2, '0')}_${clip.description.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}.mp4`;

        archive.file(clip.filePath, { name: clipName });
      }

      const manifestData = {
        created: new Date().toISOString(),
        match: {
          clubName: metadata.clubName,
          opponent: metadata.opponent,
          date: metadata.matchDate
        },
        clips: validClips.map((clip, i) => ({
          index: i + 1,
          filename: `${String(i + 1).padStart(2, '0')}_${clip.description.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}.mp4`,
          description: clip.description,
          startTime: clip.startTime,
          endTime: clip.endTime,
          duration: clip.duration,
          source: clip.source,
          confidence: clip.confidence,
          priority: clip.priority
        }))
      };

      archive.append(JSON.stringify(manifestData, null, 2), { name: 'manifest.json' });

      await archive.finalize();

      return new Promise((resolve, reject) => {
        output.on('close', () => {
          this.logger.info(`Individual clips archive created: ${zipPath} (${archive.pointer()} bytes)`);
          resolve(zipPath);
        });
        output.on('error', reject);
        archive.on('error', reject);
      });

    } catch (error) {
      this.logger.error('Failed to create clips archive', error);
      return null;
    }
  }

  async createStatsReport(stats, metadata) {
    try {
      const statsPath = path.join(
        this.uploadDir,
        `stats_${metadata.clubName}_${Date.now()}.json`
      );

      const report = {
        metadata: {
          ...metadata,
          generatedAt: new Date().toISOString(),
          processingVersion: '2.0.0'
        },
        statistics: stats,
        summary: {
          totalClips: stats.processing?.totalHighlights || 0,
          totalDuration: `${Math.round((stats.content?.totalDuration || 0) / 60)}m ${Math.round((stats.content?.totalDuration || 0) % 60)}s`,
          aiDetectionRate: stats.ai?.highConfidenceDetections || 0,
          averageClipConfidence: Math.round((stats.processing?.averageConfidence || 0) * 100) + '%'
        }
      };

      await fs.writeJson(statsPath, report, { spaces: 2 });

      this.logger.info(`Stats report created: ${statsPath}`);
      return statsPath;

    } catch (error) {
      this.logger.error('Failed to create stats report', error);
      return null;
    }
  }

  extractFileId(url) {
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9-_]+)\//,
      /id=([a-zA-Z0-9-_]+)/,
      /\/([a-zA-Z0-9-_]+)\/view/,
      /drive\.google\.com.*\/([a-zA-Z0-9-_]{28,})/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async cleanup() {
    try {
      await fs.emptyDir(this.downloadDir);
      await fs.emptyDir(this.uploadDir);
      this.logger.info('Temporary files cleaned up');
    } catch (error) {
      this.logger.warn('Cleanup failed', error);
    }
  }
}