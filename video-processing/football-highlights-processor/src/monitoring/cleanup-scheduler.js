/**
 * Storage Cleanup Scheduler
 * Automated cleanup of temp files to prevent disk full issues
 */

import cron from 'node-cron';
import fs from 'fs-extra';
import path from 'path';

export class CleanupScheduler {
    constructor(logger, storageCoordinator) {
        this.logger = logger;
        this.storageCoordinator = storageCoordinator;
        this.isRunning = false;
    }

    /**
     * Start scheduled cleanup jobs
     */
    start() {
        // Clean temp uploads every hour
        cron.schedule('0 * * * *', async () => {
            await this.cleanTempUploads();
        });

        // Clean old job outputs daily at 3am
        cron.schedule('0 3 * * *', async () => {
            await this.cleanOldOutputs();
        });

        // Storage health check every 15 minutes
        cron.schedule('*/15 * * * *', async () => {
            await this.checkStorageHealth();
        });

        this.logger.info('📅 Cleanup scheduler started');
        this.logger.info('  - Temp cleanup: every hour');
        this.logger.info('  - Old outputs: daily at 3am');
        this.logger.info('  - Health check: every 15 min');
    }

    /**
     * Clean temporary upload files older than 6 hours
     */
    async cleanTempUploads() {
        const tempDir = '/tmp/uploads';
        const maxAgeHours = 6;
        const cutoff = Date.now() - (maxAgeHours * 60 * 60 * 1000);

        try {
            if (!await fs.pathExists(tempDir)) {
                return { cleaned: 0, sizeFreed: 0 };
            }

            const files = await fs.readdir(tempDir);
            let cleaned = 0;
            let sizeFreed = 0;

            for (const file of files) {
                const filePath = path.join(tempDir, file);
                try {
                    const stats = await fs.stat(filePath);

                    if (stats.mtimeMs < cutoff) {
                        sizeFreed += stats.size;
                        await fs.remove(filePath);
                        cleaned++;
                    }
                } catch (err) {
                    // File might have been deleted already
                }
            }

            if (cleaned > 0) {
                this.logger.info('🧹 Temp cleanup complete', {
                    filesRemoved: cleaned,
                    sizeFreed: this.formatBytes(sizeFreed)
                });
            }

            return { cleaned, sizeFreed };
        } catch (error) {
            this.logger.error('Temp cleanup failed', { error: error.message });
            return { cleaned: 0, sizeFreed: 0, error: error.message };
        }
    }

    /**
     * Clean completed job outputs older than 7 days
     */
    async cleanOldOutputs() {
        if (this.isRunning) {
            this.logger.warn('Cleanup already running, skipping');
            return;
        }

        this.isRunning = true;

        try {
            if (this.storageCoordinator) {
                const result = await this.storageCoordinator.runManualCleanup(7);
                this.logger.info('🧹 Old outputs cleanup complete', result);
                return result;
            }
            return { skipped: true, reason: 'No storage coordinator' };
        } catch (error) {
            this.logger.error('Old outputs cleanup failed', { error: error.message });
            return { error: error.message };
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Check storage health and alert if issues found
     */
    async checkStorageHealth() {
        try {
            const tempDir = '/tmp';

            // Check available space
            const stats = await fs.stat(tempDir);

            // Check storage coordinator if available
            if (this.storageCoordinator) {
                const status = await this.storageCoordinator.getStorageStatus();

                // Alert if over 90% capacity
                if (status.usagePercent > 90) {
                    this.logger.warn('⚠️ Storage usage critical', {
                        usagePercent: status.usagePercent,
                        action: 'Running emergency cleanup'
                    });

                    // Run emergency cleanup for files older than 1 day
                    await this.storageCoordinator.runManualCleanup(1);
                }
            }
        } catch (error) {
            this.logger.error('Storage health check failed', { error: error.message });
        }
    }

    /**
     * Format bytes to human readable
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get cleanup stats
     */
    getStats() {
        return {
            isRunning: this.isRunning,
            scheduledJobs: {
                tempCleanup: 'Every hour',
                outputCleanup: 'Daily at 3am',
                healthCheck: 'Every 15 minutes'
            }
        };
    }
}

export default CleanupScheduler;
