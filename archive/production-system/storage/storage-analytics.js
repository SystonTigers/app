import { EventEmitter } from 'events';
import fs from 'fs-extra';
import path from 'path';

export class StorageAnalytics extends EventEmitter {
  constructor(logger, driveManager, youtubeManager) {
    super();
    this.logger = logger;
    this.driveManager = driveManager;
    this.youtubeManager = youtubeManager;
    this.metricsFile = path.join(process.cwd(), 'data', 'storage-metrics.json');
    this.alertsFile = path.join(process.cwd(), 'data', 'storage-alerts.json');

    // Alert thresholds
    this.thresholds = {
      storageUsage: {
        warning: 75,
        critical: 90,
        emergency: 95
      },
      failureRate: {
        warning: 10,
        critical: 25
      },
      responseTime: {
        warning: 30000, // 30 seconds
        critical: 60000  // 60 seconds
      }
    };

    this.metrics = {
      storage: {
        drive: null,
        youtube: null,
        lastUpdated: null
      },
      uploads: {
        total: 0,
        successful: 0,
        failed: 0,
        avgDuration: 0,
        avgSize: 0,
        history: []
      },
      downloads: {
        total: 0,
        successful: 0,
        failed: 0,
        avgDuration: 0,
        history: []
      },
      cleanup: {
        total: 0,
        successful: 0,
        failed: 0,
        storageFreed: 0,
        history: []
      }
    };

    this.alerts = {
      active: [],
      resolved: [],
      history: []
    };

    this.loadMetrics();
    this.loadAlerts();
  }

  async collectStorageMetrics() {
    try {
      this.logger.debug('Collecting storage metrics');

      const driveUsage = await this.driveManager.getStorageUsage();
      const youtubeStats = await this.youtubeManager.getChannelStats();
      const cleanupStats = await this.driveManager.getCleanupStats();

      this.metrics.storage = {
        drive: driveUsage,
        youtube: youtubeStats,
        cleanup: cleanupStats,
        lastUpdated: new Date().toISOString()
      };

      await this.saveMetrics();

      // Check for alerts
      await this.checkStorageAlerts(driveUsage);

      const summary = {
        driveUsage: driveUsage?.usage || 'Unknown',
        driveAvailable: driveUsage?.available || 'Unknown',
        youtubeVideos: youtubeStats?.videoCount || 0,
        scheduledCleanups: cleanupStats?.scheduled || 0
      };

      this.logger.info('Storage metrics collected', summary);
      this.emit('metricsCollected', { storage: this.metrics.storage, summary });

      return this.metrics.storage;

    } catch (error) {
      this.logger.error('Failed to collect storage metrics', error);
      this.emit('metricsError', error);
      throw error;
    }
  }

  recordUpload(uploadData) {
    const startTime = Date.now();
    const { success, duration, fileSize, error, fileName, service } = uploadData;

    this.metrics.uploads.total++;

    if (success) {
      this.metrics.uploads.successful++;
    } else {
      this.metrics.uploads.failed++;
    }

    // Update averages
    const total = this.metrics.uploads.total;
    this.metrics.uploads.avgDuration =
      (this.metrics.uploads.avgDuration * (total - 1) + duration) / total;

    if (fileSize) {
      this.metrics.uploads.avgSize =
        (this.metrics.uploads.avgSize * (total - 1) + fileSize) / total;
    }

    // Add to history (keep last 100 entries)
    const historyEntry = {
      timestamp: new Date().toISOString(),
      success,
      duration,
      fileSize,
      fileName,
      service,
      error: error?.message
    };

    this.metrics.uploads.history.push(historyEntry);
    if (this.metrics.uploads.history.length > 100) {
      this.metrics.uploads.history = this.metrics.uploads.history.slice(-100);
    }

    this.saveMetrics();

    // Check for performance alerts
    this.checkUploadAlerts(uploadData);

    this.emit('uploadRecorded', historyEntry);
  }

  recordDownload(downloadData) {
    const { success, duration, fileSize, error, fileName } = downloadData;

    this.metrics.downloads.total++;

    if (success) {
      this.metrics.downloads.successful++;
    } else {
      this.metrics.downloads.failed++;
    }

    // Update average duration
    const total = this.metrics.downloads.total;
    this.metrics.downloads.avgDuration =
      (this.metrics.downloads.avgDuration * (total - 1) + duration) / total;

    // Add to history
    const historyEntry = {
      timestamp: new Date().toISOString(),
      success,
      duration,
      fileSize,
      fileName,
      error: error?.message
    };

    this.metrics.downloads.history.push(historyEntry);
    if (this.metrics.downloads.history.length > 100) {
      this.metrics.downloads.history = this.metrics.downloads.history.slice(-100);
    }

    this.saveMetrics();
    this.emit('downloadRecorded', historyEntry);
  }

  recordCleanup(cleanupData) {
    const { processed, deleted, failed, storageFreed } = cleanupData;

    this.metrics.cleanup.total += processed;
    this.metrics.cleanup.successful += deleted;
    this.metrics.cleanup.failed += failed;
    this.metrics.cleanup.storageFreed += storageFreed || 0;

    // Add to history
    const historyEntry = {
      timestamp: new Date().toISOString(),
      processed,
      deleted,
      failed,
      storageFreed: storageFreed || 0,
      successRate: processed > 0 ? Math.round((deleted / processed) * 100) : 0
    };

    this.metrics.cleanup.history.push(historyEntry);
    if (this.metrics.cleanup.history.length > 50) {
      this.metrics.cleanup.history = this.metrics.cleanup.history.slice(-50);
    }

    this.saveMetrics();
    this.emit('cleanupRecorded', historyEntry);
  }

  async checkStorageAlerts(storageUsage) {
    if (!storageUsage || storageUsage.unlimited) {
      return;
    }

    const usagePercent = storageUsage.usagePercent;

    if (usagePercent >= this.thresholds.storageUsage.emergency) {
      await this.createAlert('storage_emergency', {
        level: 'emergency',
        message: `Storage critically full at ${usagePercent}%`,
        usage: storageUsage.usage,
        available: storageUsage.available,
        recommended_action: 'Immediate cleanup required'
      });
    } else if (usagePercent >= this.thresholds.storageUsage.critical) {
      await this.createAlert('storage_critical', {
        level: 'critical',
        message: `Storage usage critical at ${usagePercent}%`,
        usage: storageUsage.usage,
        available: storageUsage.available,
        recommended_action: 'Schedule cleanup soon'
      });
    } else if (usagePercent >= this.thresholds.storageUsage.warning) {
      await this.createAlert('storage_warning', {
        level: 'warning',
        message: `Storage usage high at ${usagePercent}%`,
        usage: storageUsage.usage,
        available: storageUsage.available,
        recommended_action: 'Monitor usage closely'
      });
    }
  }

  checkUploadAlerts(uploadData) {
    const { success, duration, service } = uploadData;

    // Check failure rate over last 10 uploads
    const recentUploads = this.metrics.uploads.history.slice(-10);
    if (recentUploads.length >= 5) {
      const failureCount = recentUploads.filter(upload => !upload.success).length;
      const failureRate = (failureCount / recentUploads.length) * 100;

      if (failureRate >= this.thresholds.failureRate.critical) {
        this.createAlert('upload_failure_critical', {
          level: 'critical',
          message: `High upload failure rate: ${failureRate.toFixed(1)}%`,
          service,
          recent_failures: failureCount,
          total_recent: recentUploads.length
        });
      } else if (failureRate >= this.thresholds.failureRate.warning) {
        this.createAlert('upload_failure_warning', {
          level: 'warning',
          message: `Upload failure rate increasing: ${failureRate.toFixed(1)}%`,
          service,
          recent_failures: failureCount,
          total_recent: recentUploads.length
        });
      }
    }

    // Check response time
    if (duration > this.thresholds.responseTime.critical) {
      this.createAlert('upload_slow_critical', {
        level: 'critical',
        message: `Upload very slow: ${Math.round(duration / 1000)}s`,
        duration,
        service,
        threshold: this.thresholds.responseTime.critical / 1000
      });
    } else if (duration > this.thresholds.responseTime.warning) {
      this.createAlert('upload_slow_warning', {
        level: 'warning',
        message: `Upload slower than usual: ${Math.round(duration / 1000)}s`,
        duration,
        service,
        threshold: this.thresholds.responseTime.warning / 1000
      });
    }
  }

  async createAlert(type, details) {
    // Check if similar alert already exists
    const existingAlert = this.alerts.active.find(alert =>
      alert.type === type && alert.level === details.level
    );

    if (existingAlert) {
      // Update existing alert
      existingAlert.count = (existingAlert.count || 1) + 1;
      existingAlert.lastOccurrence = new Date().toISOString();
      existingAlert.details = details;
    } else {
      // Create new alert
      const alert = {
        id: this.generateAlertId(),
        type,
        level: details.level,
        message: details.message,
        details,
        createdAt: new Date().toISOString(),
        count: 1,
        status: 'active'
      };

      this.alerts.active.push(alert);
      this.alerts.history.push({ ...alert });

      this.logger.warn(`Storage alert created: ${alert.message}`, alert);
      this.emit('alertCreated', alert);
    }

    await this.saveAlerts();
  }

  async resolveAlert(alertId) {
    const alertIndex = this.alerts.active.findIndex(alert => alert.id === alertId);

    if (alertIndex === -1) {
      return false;
    }

    const alert = this.alerts.active[alertIndex];
    alert.status = 'resolved';
    alert.resolvedAt = new Date().toISOString();

    // Move to resolved alerts
    this.alerts.resolved.push(alert);
    this.alerts.active.splice(alertIndex, 1);

    // Keep only last 50 resolved alerts
    if (this.alerts.resolved.length > 50) {
      this.alerts.resolved = this.alerts.resolved.slice(-50);
    }

    await this.saveAlerts();

    this.logger.info(`Alert resolved: ${alert.message}`, { alertId });
    this.emit('alertResolved', alert);

    return true;
  }

  async generateReport(timeframe = '24h') {
    try {
      const now = new Date();
      const timeframes = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      };

      const cutoffTime = new Date(now.getTime() - (timeframes[timeframe] || timeframes['24h']));

      // Filter metrics by timeframe
      const uploads = this.metrics.uploads.history.filter(
        entry => new Date(entry.timestamp) >= cutoffTime
      );

      const downloads = this.metrics.downloads.history.filter(
        entry => new Date(entry.timestamp) >= cutoffTime
      );

      const cleanups = this.metrics.cleanup.history.filter(
        entry => new Date(entry.timestamp) >= cutoffTime
      );

      // Calculate summary statistics
      const uploadStats = this.calculateStats(uploads, 'success');
      const downloadStats = this.calculateStats(downloads, 'success');
      const cleanupStats = this.calculateCleanupStats(cleanups);

      // Get current storage status
      const currentStorage = await this.collectStorageMetrics();

      const report = {
        timeframe,
        period: {
          from: cutoffTime.toISOString(),
          to: now.toISOString()
        },
        storage: currentStorage,
        uploads: {
          total: uploads.length,
          successful: uploadStats.successful,
          failed: uploadStats.failed,
          successRate: uploadStats.successRate,
          avgDuration: uploadStats.avgDuration,
          totalSize: uploads.reduce((sum, upload) => sum + (upload.fileSize || 0), 0)
        },
        downloads: {
          total: downloads.length,
          successful: downloadStats.successful,
          failed: downloadStats.failed,
          successRate: downloadStats.successRate,
          avgDuration: downloadStats.avgDuration
        },
        cleanup: cleanupStats,
        alerts: {
          active: this.alerts.active.length,
          resolved: this.alerts.resolved.filter(
            alert => new Date(alert.resolvedAt || alert.createdAt) >= cutoffTime
          ).length,
          critical: this.alerts.active.filter(alert => alert.level === 'critical').length
        },
        performance: this.analyzePerformance(uploads, downloads, cleanups),
        recommendations: this.generateRecommendations()
      };

      this.emit('reportGenerated', report);
      return report;

    } catch (error) {
      this.logger.error('Failed to generate storage report', error);
      throw error;
    }
  }

  calculateStats(entries, successField) {
    if (entries.length === 0) {
      return { successful: 0, failed: 0, successRate: 0, avgDuration: 0 };
    }

    const successful = entries.filter(entry => entry[successField]).length;
    const failed = entries.length - successful;
    const successRate = Math.round((successful / entries.length) * 100);
    const avgDuration = entries.reduce((sum, entry) => sum + entry.duration, 0) / entries.length;

    return { successful, failed, successRate, avgDuration };
  }

  calculateCleanupStats(cleanups) {
    if (cleanups.length === 0) {
      return { runs: 0, totalProcessed: 0, totalDeleted: 0, storageFreed: 0, avgSuccessRate: 0 };
    }

    const totalProcessed = cleanups.reduce((sum, cleanup) => sum + cleanup.processed, 0);
    const totalDeleted = cleanups.reduce((sum, cleanup) => sum + cleanup.deleted, 0);
    const storageFreed = cleanups.reduce((sum, cleanup) => sum + cleanup.storageFreed, 0);
    const avgSuccessRate = cleanups.reduce((sum, cleanup) => sum + cleanup.successRate, 0) / cleanups.length;

    return {
      runs: cleanups.length,
      totalProcessed,
      totalDeleted,
      storageFreed: this.formatBytes(storageFreed),
      avgSuccessRate: Math.round(avgSuccessRate)
    };
  }

  analyzePerformance(uploads, downloads, cleanups) {
    const performance = {
      upload: 'good',
      download: 'good',
      cleanup: 'good',
      overall: 'good'
    };

    // Analyze upload performance
    const uploadFailures = uploads.filter(u => !u.success).length;
    const uploadFailureRate = uploads.length > 0 ? (uploadFailures / uploads.length) * 100 : 0;

    if (uploadFailureRate > this.thresholds.failureRate.critical) {
      performance.upload = 'poor';
    } else if (uploadFailureRate > this.thresholds.failureRate.warning) {
      performance.upload = 'degraded';
    }

    // Analyze download performance
    const downloadFailures = downloads.filter(d => !d.success).length;
    const downloadFailureRate = downloads.length > 0 ? (downloadFailures / downloads.length) * 100 : 0;

    if (downloadFailureRate > this.thresholds.failureRate.critical) {
      performance.download = 'poor';
    } else if (downloadFailureRate > this.thresholds.failureRate.warning) {
      performance.download = 'degraded';
    }

    // Analyze cleanup performance
    const avgCleanupSuccessRate = cleanups.length > 0
      ? cleanups.reduce((sum, c) => sum + c.successRate, 0) / cleanups.length
      : 100;

    if (avgCleanupSuccessRate < 75) {
      performance.cleanup = 'poor';
    } else if (avgCleanupSuccessRate < 90) {
      performance.cleanup = 'degraded';
    }

    // Overall performance
    const performances = Object.values(performance).slice(0, 3); // Exclude 'overall'
    if (performances.includes('poor')) {
      performance.overall = 'poor';
    } else if (performances.includes('degraded')) {
      performance.overall = 'degraded';
    }

    return performance;
  }

  generateRecommendations() {
    const recommendations = [];

    // Storage recommendations
    if (this.metrics.storage.drive && !this.metrics.storage.drive.unlimited) {
      const usage = this.metrics.storage.drive.usagePercent;
      if (usage > 80) {
        recommendations.push({
          type: 'storage',
          priority: usage > 95 ? 'critical' : 'high',
          message: 'Storage usage is high',
          action: 'Consider reducing retention period or running manual cleanup'
        });
      }
    }

    // Upload performance recommendations
    const recentUploads = this.metrics.uploads.history.slice(-20);
    if (recentUploads.length > 5) {
      const failureRate = (recentUploads.filter(u => !u.success).length / recentUploads.length) * 100;
      if (failureRate > 20) {
        recommendations.push({
          type: 'upload',
          priority: 'medium',
          message: 'Upload failure rate is elevated',
          action: 'Check network connectivity and API credentials'
        });
      }
    }

    // Alert recommendations
    if (this.alerts.active.length > 5) {
      recommendations.push({
        type: 'alerts',
        priority: 'medium',
        message: 'Multiple active alerts detected',
        action: 'Review and resolve outstanding alerts'
      });
    }

    return recommendations;
  }

  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async loadMetrics() {
    try {
      if (await fs.pathExists(this.metricsFile)) {
        const savedMetrics = await fs.readJson(this.metricsFile);
        this.metrics = { ...this.metrics, ...savedMetrics };
        this.logger.debug('Storage metrics loaded from file');
      }
    } catch (error) {
      this.logger.error('Failed to load storage metrics', error);
    }
  }

  async saveMetrics() {
    try {
      await fs.ensureDir(path.dirname(this.metricsFile));
      await fs.writeJson(this.metricsFile, this.metrics, { spaces: 2 });
    } catch (error) {
      this.logger.error('Failed to save storage metrics', error);
    }
  }

  async loadAlerts() {
    try {
      if (await fs.pathExists(this.alertsFile)) {
        const savedAlerts = await fs.readJson(this.alertsFile);
        this.alerts = { ...this.alerts, ...savedAlerts };
        this.logger.debug('Storage alerts loaded from file');
      }
    } catch (error) {
      this.logger.error('Failed to load storage alerts', error);
    }
  }

  async saveAlerts() {
    try {
      await fs.ensureDir(path.dirname(this.alertsFile));
      await fs.writeJson(this.alertsFile, this.alerts, { spaces: 2 });
    } catch (error) {
      this.logger.error('Failed to save storage alerts', error);
    }
  }

  // Public API methods
  getMetrics() {
    return { ...this.metrics };
  }

  getAlerts() {
    return { ...this.alerts };
  }

  getActiveAlerts() {
    return [...this.alerts.active];
  }

  async getDashboardData() {
    const storage = await this.collectStorageMetrics();
    const recentReport = await this.generateReport('24h');

    return {
      storage,
      alerts: {
        active: this.alerts.active.length,
        critical: this.alerts.active.filter(a => a.level === 'critical').length
      },
      performance: recentReport.performance,
      recommendations: recentReport.recommendations.slice(0, 3) // Top 3
    };
  }
}