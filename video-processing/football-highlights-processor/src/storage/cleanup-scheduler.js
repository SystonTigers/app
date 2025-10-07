import cron from 'node-cron';
import { EventEmitter } from 'events';
import fs from 'fs-extra';
import path from 'path';

export class CleanupScheduler extends EventEmitter {
  constructor(logger, driveManager, youtubeManager) {
    super();
    this.logger = logger;
    this.driveManager = driveManager;
    this.youtubeManager = youtubeManager;
    this.jobs = new Map();
    this.isRunning = false;
    this.statsFile = path.join(process.cwd(), 'data', 'cleanup-stats.json');
    this.configFile = path.join(process.cwd(), 'data', 'cleanup-config.json');

    // Default configuration
    this.config = {
      dailyCleanupTime: '02:00', // 2:00 AM
      weeklyAnalyticsTime: '06:00', // 6:00 AM on Sundays
      monthlyReportTime: '09:00', // 9:00 AM on 1st of month
      cleanupRetentionDays: 30,
      emergencyCleanupThreshold: 95, // Percentage
      enableNotifications: true,
      notificationEmails: [],
      timeZone: 'UTC'
    };

    this.stats = {
      lastRun: null,
      totalFilesProcessed: 0,
      totalFilesDeleted: 0,
      totalFailures: 0,
      storageFreed: 0,
      averageProcessingTime: 0,
      runs: []
    };

    this.loadConfiguration();
    this.loadStats();
  }

  async start() {
    if (this.isRunning) {
      this.logger.warn('Cleanup scheduler already running');
      return;
    }

    this.logger.info('Starting cleanup scheduler');

    // Daily cleanup at 2:00 AM
    const dailyJob = cron.schedule(
      `0 ${this.config.dailyCleanupTime.split(':')[1]} ${this.config.dailyCleanupTime.split(':')[0]} * * *`,
      () => this.runDailyCleanup(),
      {
        scheduled: false,
        timezone: this.config.timeZone
      }
    );

    // Weekly analytics on Sundays at 6:00 AM
    const weeklyJob = cron.schedule(
      `0 ${this.config.weeklyAnalyticsTime.split(':')[1]} ${this.config.weeklyAnalyticsTime.split(':')[0]} * * 0`,
      () => this.runWeeklyAnalytics(),
      {
        scheduled: false,
        timezone: this.config.timeZone
      }
    );

    // Monthly report on 1st at 9:00 AM
    const monthlyJob = cron.schedule(
      `0 ${this.config.monthlyReportTime.split(':')[1]} ${this.config.monthlyReportTime.split(':')[0]} 1 * *`,
      () => this.runMonthlyReport(),
      {
        scheduled: false,
        timezone: this.config.timeZone
      }
    );

    // Emergency cleanup check every 6 hours
    const emergencyJob = cron.schedule(
      '0 0 */6 * * *',
      () => this.checkEmergencyCleanup(),
      {
        scheduled: false,
        timezone: this.config.timeZone
      }
    );

    this.jobs.set('daily', dailyJob);
    this.jobs.set('weekly', weeklyJob);
    this.jobs.set('monthly', monthlyJob);
    this.jobs.set('emergency', emergencyJob);

    // Start all jobs
    this.jobs.forEach(job => job.start());

    this.isRunning = true;
    this.logger.info('Cleanup scheduler started successfully', {
      dailyTime: this.config.dailyCleanupTime,
      weeklyTime: this.config.weeklyAnalyticsTime,
      monthlyTime: this.config.monthlyReportTime,
      timezone: this.config.timeZone
    });

    this.emit('schedulerStarted');
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping cleanup scheduler');

    this.jobs.forEach((job, name) => {
      job.stop();
      job.destroy();
      this.logger.debug(`Stopped ${name} job`);
    });

    this.jobs.clear();
    this.isRunning = false;

    this.logger.info('Cleanup scheduler stopped');
    this.emit('schedulerStopped');
  }

  async runDailyCleanup() {
    const startTime = Date.now();
    this.logger.info('Starting daily cleanup process');

    try {
      const result = await this.driveManager.processScheduledCleanup();

      const runStats = {
        timestamp: new Date().toISOString(),
        type: 'daily',
        duration: Date.now() - startTime,
        filesProcessed: result.processed,
        filesDeleted: result.deleted,
        filesFailed: result.failed,
        success: result.failed === 0
      };

      // Update overall stats
      this.stats.lastRun = new Date().toISOString();
      this.stats.totalFilesProcessed += result.processed;
      this.stats.totalFilesDeleted += result.deleted;
      this.stats.totalFailures += result.failed;

      // Keep last 30 runs
      this.stats.runs.push(runStats);
      if (this.stats.runs.length > 30) {
        this.stats.runs = this.stats.runs.slice(-30);
      }

      // Calculate average processing time
      const totalDuration = this.stats.runs.reduce((sum, run) => sum + run.duration, 0);
      this.stats.averageProcessingTime = Math.round(totalDuration / this.stats.runs.length);

      await this.saveStats();

      this.logger.info('Daily cleanup completed', {
        processed: result.processed,
        deleted: result.deleted,
        failed: result.failed,
        duration: `${Math.round((Date.now() - startTime) / 1000)}s`
      });

      this.emit('dailyCleanupComplete', result);

      // Send notification if enabled
      if (this.config.enableNotifications && result.failed > 0) {
        await this.sendNotification('cleanup_failed', {
          failed: result.failed,
          processed: result.processed
        });
      }

      // Check if emergency cleanup is needed
      if (result.failed > result.processed * 0.5) {
        this.logger.warn('High failure rate detected, checking storage status');
        await this.checkEmergencyCleanup();
      }

    } catch (error) {
      this.logger.error('Daily cleanup failed', error);

      this.stats.runs.push({
        timestamp: new Date().toISOString(),
        type: 'daily',
        duration: Date.now() - startTime,
        filesProcessed: 0,
        filesDeleted: 0,
        filesFailed: 0,
        success: false,
        error: error.message
      });

      await this.saveStats();
      this.emit('cleanupError', error);

      if (this.config.enableNotifications) {
        await this.sendNotification('cleanup_error', { error: error.message });
      }
    }
  }

  async runWeeklyAnalytics() {
    this.logger.info('Running weekly analytics');

    try {
      const storageUsage = await this.driveManager.getStorageUsage();
      const cleanupStats = await this.driveManager.getCleanupStats();
      const youtubeStats = await this.youtubeManager.getChannelStats();

      const weeklyReport = {
        timestamp: new Date().toISOString(),
        type: 'weekly',
        storage: storageUsage,
        cleanup: cleanupStats,
        youtube: youtubeStats,
        recentRuns: this.stats.runs.slice(-7), // Last 7 runs
        performance: {
          averageProcessingTime: this.stats.averageProcessingTime,
          totalProcessed: this.stats.totalFilesProcessed,
          totalDeleted: this.stats.totalFilesDeleted,
          successRate: this.calculateSuccessRate()
        }
      };

      // Save weekly report
      const reportsDir = path.join(process.cwd(), 'data', 'reports');
      await fs.ensureDir(reportsDir);

      const reportFile = path.join(reportsDir, `weekly-${new Date().toISOString().split('T')[0]}.json`);
      await fs.writeJson(reportFile, weeklyReport, { spaces: 2 });

      this.logger.info('Weekly analytics completed', {
        reportFile,
        storageUsage: storageUsage?.usage,
        scheduledCleanups: cleanupStats.scheduled
      });

      this.emit('weeklyAnalyticsComplete', weeklyReport);

      // Send summary if enabled
      if (this.config.enableNotifications) {
        await this.sendNotification('weekly_report', weeklyReport);
      }

    } catch (error) {
      this.logger.error('Weekly analytics failed', error);
      this.emit('analyticsError', error);
    }
  }

  async runMonthlyReport() {
    this.logger.info('Generating monthly report');

    try {
      const storageUsage = await this.driveManager.getStorageUsage();
      const cleanupStats = await this.driveManager.getCleanupStats();
      const youtubeStats = await this.youtubeManager.getChannelStats();

      // Calculate monthly statistics
      const monthlyRuns = this.stats.runs.filter(run => {
        const runDate = new Date(run.timestamp);
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return runDate >= lastMonth;
      });

      const monthlyReport = {
        timestamp: new Date().toISOString(),
        type: 'monthly',
        period: {
          from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString()
        },
        storage: storageUsage,
        cleanup: cleanupStats,
        youtube: youtubeStats,
        statistics: {
          totalRuns: monthlyRuns.length,
          successfulRuns: monthlyRuns.filter(run => run.success).length,
          totalFilesProcessed: monthlyRuns.reduce((sum, run) => sum + run.filesProcessed, 0),
          totalFilesDeleted: monthlyRuns.reduce((sum, run) => sum + run.filesDeleted, 0),
          totalStorageFreed: this.estimateStorageFreed(monthlyRuns),
          averageProcessingTime: this.stats.averageProcessingTime,
          successRate: this.calculateSuccessRate(monthlyRuns)
        },
        trends: this.analyzeTrends(monthlyRuns),
        recommendations: this.generateRecommendations(storageUsage, cleanupStats)
      };

      // Save monthly report
      const reportsDir = path.join(process.cwd(), 'data', 'reports');
      await fs.ensureDir(reportsDir);

      const reportFile = path.join(reportsDir, `monthly-${new Date().toISOString().split('T')[0]}.json`);
      await fs.writeJson(reportFile, monthlyReport, { spaces: 2 });

      this.logger.info('Monthly report generated', {
        reportFile,
        runsAnalyzed: monthlyRuns.length,
        storageUsage: storageUsage?.usage
      });

      this.emit('monthlyReportComplete', monthlyReport);

      // Send comprehensive report
      if (this.config.enableNotifications) {
        await this.sendNotification('monthly_report', monthlyReport);
      }

    } catch (error) {
      this.logger.error('Monthly report generation failed', error);
      this.emit('reportError', error);
    }
  }

  async checkEmergencyCleanup() {
    try {
      const storageUsage = await this.driveManager.getStorageUsage();

      if (!storageUsage || storageUsage.unlimited) {
        this.logger.debug('Storage is unlimited, no emergency cleanup needed');
        return;
      }

      if (storageUsage.usagePercent >= this.config.emergencyCleanupThreshold) {
        this.logger.warn('Emergency cleanup triggered', {
          usage: storageUsage.usage,
          threshold: `${this.config.emergencyCleanupThreshold}%`
        });

        // Perform aggressive cleanup
        const oldFiles = await this.driveManager.getFilesByAge(7); // Files older than 7 days

        if (oldFiles.length > 0) {
          this.logger.info(`Emergency cleanup: processing ${oldFiles.length} files older than 7 days`);

          const result = await this.driveManager.cleanupOldFiles(7);

          this.logger.info('Emergency cleanup completed', result);
          this.emit('emergencyCleanupComplete', result);

          // Send emergency notification
          if (this.config.enableNotifications) {
            await this.sendNotification('emergency_cleanup', {
              trigger: `Storage usage: ${storageUsage.usage}`,
              result
            });
          }
        } else {
          this.logger.warn('No files available for emergency cleanup');

          if (this.config.enableNotifications) {
            await this.sendNotification('storage_critical', {
              usage: storageUsage.usage,
              available: storageUsage.available
            });
          }
        }
      }

    } catch (error) {
      this.logger.error('Emergency cleanup check failed', error);
      this.emit('emergencyError', error);
    }
  }

  async loadConfiguration() {
    try {
      if (await fs.pathExists(this.configFile)) {
        const savedConfig = await fs.readJson(this.configFile);
        this.config = { ...this.config, ...savedConfig };
        this.logger.info('Cleanup configuration loaded from file');
      } else {
        await this.saveConfiguration();
        this.logger.info('Created default cleanup configuration');
      }
    } catch (error) {
      this.logger.error('Failed to load cleanup configuration', error);
    }
  }

  async saveConfiguration() {
    try {
      await fs.ensureDir(path.dirname(this.configFile));
      await fs.writeJson(this.configFile, this.config, { spaces: 2 });
    } catch (error) {
      this.logger.error('Failed to save cleanup configuration', error);
    }
  }

  async loadStats() {
    try {
      if (await fs.pathExists(this.statsFile)) {
        const savedStats = await fs.readJson(this.statsFile);
        this.stats = { ...this.stats, ...savedStats };
        this.logger.info('Cleanup statistics loaded from file');
      }
    } catch (error) {
      this.logger.error('Failed to load cleanup statistics', error);
    }
  }

  async saveStats() {
    try {
      await fs.ensureDir(path.dirname(this.statsFile));
      await fs.writeJson(this.statsFile, this.stats, { spaces: 2 });
    } catch (error) {
      this.logger.error('Failed to save cleanup statistics', error);
    }
  }

  calculateSuccessRate(runs = null) {
    const runsToAnalyze = runs || this.stats.runs;
    if (runsToAnalyze.length === 0) return 100;

    const successfulRuns = runsToAnalyze.filter(run => run.success).length;
    return Math.round((successfulRuns / runsToAnalyze.length) * 100);
  }

  estimateStorageFreed(runs) {
    // Rough estimation: assume average video file is 50MB
    const averageFileSize = 50 * 1024 * 1024; // 50MB in bytes
    const totalFilesDeleted = runs.reduce((sum, run) => sum + run.filesDeleted, 0);
    return totalFilesDeleted * averageFileSize;
  }

  analyzeTrends(runs) {
    if (runs.length < 7) {
      return { insufficient_data: true };
    }

    const recentRuns = runs.slice(-7);
    const olderRuns = runs.slice(-14, -7);

    const recentAvg = recentRuns.reduce((sum, run) => sum + run.filesDeleted, 0) / recentRuns.length;
    const olderAvg = olderRuns.reduce((sum, run) => sum + run.filesDeleted, 0) / olderRuns.length;

    const trend = recentAvg > olderAvg ? 'increasing' :
                  recentAvg < olderAvg ? 'decreasing' : 'stable';

    return {
      deletion_trend: trend,
      recent_average: Math.round(recentAvg * 100) / 100,
      previous_average: Math.round(olderAvg * 100) / 100,
      change_percent: olderAvg > 0 ? Math.round(((recentAvg - olderAvg) / olderAvg) * 100) : 0
    };
  }

  generateRecommendations(storageUsage, cleanupStats) {
    const recommendations = [];

    if (storageUsage && !storageUsage.unlimited) {
      if (storageUsage.usagePercent > 80) {
        recommendations.push({
          type: 'warning',
          message: 'Storage usage is high. Consider reducing retention period.',
          action: 'Reduce cleanup retention days from 30 to 21 days'
        });
      }

      if (storageUsage.usagePercent > 95) {
        recommendations.push({
          type: 'critical',
          message: 'Storage critically full. Immediate action required.',
          action: 'Run emergency cleanup for files older than 7 days'
        });
      }
    }

    if (cleanupStats.failed > 5) {
      recommendations.push({
        type: 'warning',
        message: 'High number of failed cleanup operations detected.',
        action: 'Check Drive API permissions and network connectivity'
      });
    }

    const successRate = this.calculateSuccessRate();
    if (successRate < 90) {
      recommendations.push({
        type: 'info',
        message: `Cleanup success rate is ${successRate}%. Consider investigating failures.`,
        action: 'Review failed cleanup logs and retry mechanisms'
      });
    }

    return recommendations;
  }

  async sendNotification(type, data) {
    try {
      // This would integrate with email service, webhooks, etc.
      this.logger.info(`Notification: ${type}`, data);

      // Emit event for external notification handlers
      this.emit('notification', { type, data, timestamp: new Date().toISOString() });

    } catch (error) {
      this.logger.error('Failed to send notification', error);
    }
  }

  // Configuration management methods
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.saveConfiguration();

    // Restart scheduler to apply new times
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  getConfig() {
    return { ...this.config };
  }

  getStats() {
    return { ...this.stats };
  }

  async getStatus() {
    const storageUsage = await this.driveManager.getStorageUsage();
    const cleanupStats = await this.driveManager.getCleanupStats();

    return {
      running: this.isRunning,
      lastRun: this.stats.lastRun,
      nextRun: cleanupStats.nextCleanup,
      storage: storageUsage,
      cleanup: cleanupStats,
      performance: {
        totalProcessed: this.stats.totalFilesProcessed,
        totalDeleted: this.stats.totalFilesDeleted,
        successRate: this.calculateSuccessRate(),
        averageTime: `${Math.round(this.stats.averageProcessingTime / 1000)}s`
      }
    };
  }
}