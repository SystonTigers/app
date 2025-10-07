import { google } from 'googleapis';
import fs from 'fs-extra';
import path from 'path';
import { EventEmitter } from 'events';
import { Readable } from 'stream';

export class DriveStorageManager extends EventEmitter {
  constructor(logger, credentials) {
    super();
    this.logger = logger;
    this.drive = null;
    this.auth = null;
    this.uploadRetries = 3;
    this.chunkSize = 8 * 1024 * 1024; // 8MB chunks for resumable upload
    this.rateLimitDelay = 200; // 200ms between requests
    this.lastRequestTime = 0;
    this.cleanupSchedule = new Map(); // In-memory cleanup schedule
    this.cleanupDays = 30;
    this.init(credentials);
  }

  async init(credentials) {
    try {
      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/drive.file'
        ]
      });

      const authClient = await this.auth.getClient();
      this.drive = google.drive({ version: 'v3', auth: authClient });

      this.logger.info('Google Drive client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Google Drive client', error);
      throw error;
    }
  }

  async uploadFile(filePath, fileName, options = {}) {
    const {
      folder = '',
      description = '',
      mimeType = 'video/mp4',
      parents = [],
      metadata = {},
      resumable = true
    } = options;

    try {
      this.logger.info('Starting Google Drive upload', { fileName, folder });

      const fileStats = await fs.stat(filePath);
      const fileSize = fileStats.size;

      // Create folder structure if needed
      let parentFolders = [...parents];
      if (folder) {
        const folderId = await this.createFolderStructure(folder);
        parentFolders.push(folderId);
      }

      const fileMetadata = {
        name: fileName,
        description: this.generateFileDescription(description),
        parents: parentFolders.length > 0 ? parentFolders : undefined,
        ...metadata
      };

      let uploadResult;

      if (resumable && fileSize > this.chunkSize) {
        uploadResult = await this.performResumableUpload(filePath, fileMetadata, mimeType);
      } else {
        uploadResult = await this.performSimpleUpload(filePath, fileMetadata, mimeType);
      }

      // Schedule cleanup
      await this.scheduleCleanup(uploadResult.id, fileName, this.cleanupDays);

      const result = {
        id: uploadResult.id,
        name: uploadResult.name,
        webViewLink: uploadResult.webViewLink,
        webContentLink: uploadResult.webContentLink,
        size: fileSize,
        mimeType: uploadResult.mimeType,
        createdTime: uploadResult.createdTime,
        folder,
        cleanupDate: this.calculateCleanupDate(this.cleanupDays)
      };

      this.emit('uploadComplete', result);
      this.logger.info('Google Drive upload completed', {
        id: result.id,
        name: result.name,
        size: this.formatBytes(result.size)
      });

      return result;

    } catch (error) {
      this.logger.error('Google Drive upload failed', {
        fileName,
        error: error.message,
        stack: error.stack
      });

      this.emit('uploadError', { fileName, error });
      throw error;
    }
  }

  async performResumableUpload(filePath, metadata, mimeType) {
    let attempt = 0;
    let lastError = null;

    while (attempt < this.uploadRetries) {
      try {
        this.logger.debug(`Drive resumable upload attempt ${attempt + 1}/${this.uploadRetries}`);

        await this.respectRateLimit();

        const response = await this.drive.files.create({
          requestBody: metadata,
          media: {
            mimeType,
            body: fs.createReadStream(filePath)
          },
          fields: 'id,name,webViewLink,webContentLink,size,mimeType,createdTime',
          uploadType: 'resumable'
        });

        return response.data;

      } catch (error) {
        lastError = error;
        attempt++;

        if (this.isRetryableError(error) && attempt < this.uploadRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          this.logger.warn(`Resumable upload failed, retrying in ${delay}ms`, {
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

  async performSimpleUpload(filePath, metadata, mimeType) {
    await this.respectRateLimit();

    const response = await this.drive.files.create({
      requestBody: metadata,
      media: {
        mimeType,
        body: fs.createReadStream(filePath)
      },
      fields: 'id,name,webViewLink,webContentLink,size,mimeType,createdTime'
    });

    return response.data;
  }

  async createFolderStructure(folderPath) {
    const folders = folderPath.split('/').filter(f => f.trim());
    let currentParent = null;

    for (const folderName of folders) {
      currentParent = await this.findOrCreateFolder(folderName, currentParent);
    }

    return currentParent;
  }

  async findOrCreateFolder(name, parentId = null) {
    try {
      // Search for existing folder
      await this.respectRateLimit();

      let query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      if (parentId) {
        query += ` and '${parentId}' in parents`;
      } else {
        query += ` and 'root' in parents`;
      }

      const searchResponse = await this.drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive'
      });

      if (searchResponse.data.files.length > 0) {
        return searchResponse.data.files[0].id;
      }

      // Create new folder
      await this.respectRateLimit();

      const createResponse = await this.drive.files.create({
        requestBody: {
          name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: parentId ? [parentId] : undefined
        },
        fields: 'id'
      });

      this.logger.info(`Created Drive folder: ${name}`, { id: createResponse.data.id });
      return createResponse.data.id;

    } catch (error) {
      this.logger.error(`Failed to create folder ${name}`, error);
      throw error;
    }
  }

  async scheduleCleanup(fileId, fileName, daysFromNow) {
    const cleanupDate = this.calculateCleanupDate(daysFromNow);

    const cleanupItem = {
      fileId,
      fileName,
      scheduledDate: cleanupDate,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      retryCount: 0
    };

    this.cleanupSchedule.set(fileId, cleanupItem);

    // Persist to storage (in production, use database)
    await this.persistCleanupSchedule();

    this.logger.info(`Scheduled cleanup for ${fileName}`, {
      fileId,
      cleanupDate: cleanupDate.toISOString()
    });
  }

  calculateCleanupDate(days) {
    const cleanupDate = new Date();
    cleanupDate.setDate(cleanupDate.getDate() + days);
    return cleanupDate;
  }

  async persistCleanupSchedule() {
    try {
      const scheduleArray = Array.from(this.cleanupSchedule.entries()).map(([fileId, item]) => ({
        fileId,
        ...item
      }));

      const scheduleFile = path.join(process.cwd(), 'data', 'cleanup-schedule.json');
      await fs.ensureDir(path.dirname(scheduleFile));
      await fs.writeJson(scheduleFile, scheduleArray, { spaces: 2 });
    } catch (error) {
      this.logger.error('Failed to persist cleanup schedule', error);
    }
  }

  async loadCleanupSchedule() {
    try {
      const scheduleFile = path.join(process.cwd(), 'data', 'cleanup-schedule.json');

      if (await fs.pathExists(scheduleFile)) {
        const scheduleArray = await fs.readJson(scheduleFile);

        this.cleanupSchedule.clear();
        scheduleArray.forEach(item => {
          this.cleanupSchedule.set(item.fileId, {
            fileName: item.fileName,
            scheduledDate: new Date(item.scheduledDate),
            status: item.status,
            createdAt: item.createdAt,
            retryCount: item.retryCount || 0
          });
        });

        this.logger.info(`Loaded ${scheduleArray.length} cleanup items from storage`);
      }
    } catch (error) {
      this.logger.error('Failed to load cleanup schedule', error);
    }
  }

  async processScheduledCleanup() {
    const now = new Date();
    const itemsToCleanup = Array.from(this.cleanupSchedule.entries()).filter(
      ([fileId, item]) => item.status === 'scheduled' && item.scheduledDate <= now
    );

    if (itemsToCleanup.length === 0) {
      this.logger.debug('No items due for cleanup');
      return { processed: 0, deleted: 0, failed: 0 };
    }

    this.logger.info(`Processing ${itemsToCleanup.length} items for cleanup`);

    let deleted = 0;
    let failed = 0;

    for (const [fileId, item] of itemsToCleanup) {
      try {
        await this.deleteFile(fileId, item.fileName);

        item.status = 'completed';
        item.deletedAt = new Date().toISOString();
        deleted++;

        this.emit('fileDeleted', {
          fileId,
          fileName: item.fileName,
          originalDate: item.createdAt
        });

      } catch (error) {
        this.logger.error(`Failed to delete file ${fileId}`, error);

        item.retryCount += 1;

        if (item.retryCount >= 3) {
          item.status = 'failed';
          item.error = error.message;
        } else {
          // Reschedule for tomorrow
          item.scheduledDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
        }

        failed++;
      }
    }

    await this.persistCleanupSchedule();

    const result = {
      processed: itemsToCleanup.length,
      deleted,
      failed
    };

    this.logger.info('Cleanup processing completed', result);
    this.emit('cleanupComplete', result);

    return result;
  }

  async deleteFile(fileId, fileName) {
    try {
      await this.respectRateLimit();

      // First check if file exists
      try {
        await this.drive.files.get({ fileId, fields: 'id' });
      } catch (error) {
        if (error.status === 404) {
          this.logger.info(`File ${fileId} already deleted`);
          return true;
        }
        throw error;
      }

      // Delete the file
      await this.drive.files.delete({ fileId });

      this.logger.info(`Successfully deleted file from Drive`, {
        fileId,
        fileName
      });

      return true;

    } catch (error) {
      this.logger.error(`Failed to delete file ${fileId}`, error);
      throw error;
    }
  }

  async getStorageUsage() {
    try {
      await this.respectRateLimit();

      const response = await this.drive.about.get({
        fields: 'storageQuota,user'
      });

      const quota = response.data.storageQuota;

      if (!quota) {
        return null;
      }

      const used = parseInt(quota.usage) || 0;
      const limit = parseInt(quota.limit) || 0;
      const usagePercent = limit > 0 ? Math.round((used / limit) * 100) : 0;

      return {
        used: this.formatBytes(used),
        usedBytes: used,
        limit: this.formatBytes(limit),
        limitBytes: limit,
        usage: `${usagePercent}%`,
        usagePercent,
        available: this.formatBytes(Math.max(0, limit - used)),
        availableBytes: Math.max(0, limit - used),
        unlimited: limit === 0
      };

    } catch (error) {
      this.logger.error('Failed to get storage usage', error);
      return null;
    }
  }

  async getFilesByAge(olderThanDays = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      await this.respectRateLimit();

      const response = await this.drive.files.list({
        q: `createdTime < '${cutoffDate.toISOString()}' and mimeType='video/mp4' and trashed=false`,
        fields: 'files(id,name,createdTime,size)',
        orderBy: 'createdTime',
        pageSize: 100
      });

      const oldFiles = response.data.files || [];

      return oldFiles.map(file => ({
        id: file.id,
        name: file.name,
        createdTime: file.createdTime,
        size: parseInt(file.size) || 0,
        age: Math.floor((Date.now() - new Date(file.createdTime)) / (1000 * 60 * 60 * 24))
      }));

    } catch (error) {
      this.logger.error('Failed to get files by age', error);
      return [];
    }
  }

  async cleanupOldFiles(olderThanDays = 30, dryRun = false) {
    const oldFiles = await this.getFilesByAge(olderThanDays);

    if (oldFiles.length === 0) {
      this.logger.info('No old files found for cleanup');
      return { found: 0, deleted: 0, failed: 0, dryRun };
    }

    this.logger.info(`Found ${oldFiles.length} files older than ${olderThanDays} days`);

    if (dryRun) {
      return {
        found: oldFiles.length,
        deleted: 0,
        failed: 0,
        dryRun: true,
        files: oldFiles
      };
    }

    let deleted = 0;
    let failed = 0;

    for (const file of oldFiles) {
      try {
        await this.deleteFile(file.id, file.name);
        deleted++;
      } catch (error) {
        failed++;
      }
    }

    const result = {
      found: oldFiles.length,
      deleted,
      failed,
      dryRun: false
    };

    this.logger.info('Manual cleanup completed', result);
    return result;
  }

  generateFileDescription(description) {
    const timestamp = new Date().toISOString();
    return [
      description,
      '',
      `⏰ Uploaded: ${timestamp}`,
      `🗑️ Auto-cleanup: ${this.cleanupDays} days`,
      '🎥 Football highlights - temporary storage',
      '📺 Permanent archive available on YouTube'
    ].filter(line => line.trim()).join('\\n');
  }

  isRetryableError(error) {
    const retryableCodes = [
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNREFUSED'
    ];

    const retryableStatuses = [429, 500, 502, 503, 504];

    return retryableCodes.includes(error.code) ||
           retryableStatuses.includes(error.status) ||
           error.message.includes('timeout') ||
           error.message.includes('Rate Limit Exceeded');
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
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async getCleanupStats() {
    const scheduledCount = Array.from(this.cleanupSchedule.values())
      .filter(item => item.status === 'scheduled').length;

    const completedCount = Array.from(this.cleanupSchedule.values())
      .filter(item => item.status === 'completed').length;

    const failedCount = Array.from(this.cleanupSchedule.values())
      .filter(item => item.status === 'failed').length;

    return {
      scheduled: scheduledCount,
      completed: completedCount,
      failed: failedCount,
      total: this.cleanupSchedule.size,
      nextCleanup: this.getNextCleanupDate()
    };
  }

  getNextCleanupDate() {
    const scheduledItems = Array.from(this.cleanupSchedule.values())
      .filter(item => item.status === 'scheduled')
      .map(item => item.scheduledDate)
      .sort();

    return scheduledItems.length > 0 ? scheduledItems[0] : null;
  }
}