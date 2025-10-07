import client from 'prom-client';
import winston from 'winston';

class MetricsCollector {
  constructor(logger) {
    this.logger = logger || winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [new winston.transports.Console()]
    });

    // Initialize Prometheus metrics
    this.initializeMetrics();

    // Start collecting default metrics
    client.collectDefaultMetrics({
      timeout: 5000,
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
      register: client.register,
    });
  }

  initializeMetrics() {
    // HTTP Request metrics
    this.httpRequestsTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status']
    });

    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
    });

    // Video processing metrics
    this.videoProcessingTotal = new client.Counter({
      name: 'video_processing_total',
      help: 'Total number of video processing jobs',
      labelNames: ['status', 'type']
    });

    this.videoProcessingDuration = new client.Histogram({
      name: 'video_processing_duration_seconds',
      help: 'Duration of video processing in seconds',
      labelNames: ['type'],
      buckets: [30, 60, 120, 300, 600, 1200, 1800] // 30s to 30m
    });

    this.videoProcessingCompleted = new client.Counter({
      name: 'video_processing_completed_total',
      help: 'Total number of completed video processing jobs'
    });

    // Queue metrics
    this.queueWaitingJobs = new client.Gauge({
      name: 'video_queue_waiting_jobs',
      help: 'Number of jobs waiting in the video processing queue'
    });

    this.queueActiveJobs = new client.Gauge({
      name: 'video_queue_active_jobs',
      help: 'Number of active jobs in the video processing queue'
    });

    this.queueCompletedJobs = new client.Counter({
      name: 'video_queue_completed_jobs_total',
      help: 'Total number of completed queue jobs'
    });

    this.queueFailedJobs = new client.Counter({
      name: 'video_queue_failed_jobs_total',
      help: 'Total number of failed queue jobs'
    });

    this.queueTotalJobs = new client.Counter({
      name: 'video_queue_total_jobs_total',
      help: 'Total number of all queue jobs'
    });

    // Storage metrics
    this.storageDriveUsage = new client.Gauge({
      name: 'storage_drive_usage_bytes',
      help: 'Current Drive storage usage in bytes'
    });

    this.storageDriveUsagePercent = new client.Gauge({
      name: 'storage_drive_usage_percent',
      help: 'Current Drive storage usage percentage'
    });

    this.storageCleanupRuns = new client.Counter({
      name: 'storage_cleanup_runs_total',
      help: 'Total number of storage cleanup runs'
    });

    this.storageCleanupFailures = new client.Counter({
      name: 'storage_cleanup_failures_total',
      help: 'Total number of storage cleanup failures'
    });

    this.storageFilesDeleted = new client.Counter({
      name: 'storage_files_deleted_total',
      help: 'Total number of files deleted by cleanup'
    });

    // Upload metrics
    this.videoUploadsTotal = new client.Counter({
      name: 'video_uploads_total',
      help: 'Total number of video uploads',
      labelNames: ['service', 'status']
    });

    this.videoUploadFailures = new client.Counter({
      name: 'video_upload_failures_total',
      help: 'Total number of video upload failures',
      labelNames: ['service', 'reason']
    });

    this.videoUploadDuration = new client.Histogram({
      name: 'video_upload_duration_seconds',
      help: 'Duration of video uploads in seconds',
      labelNames: ['service'],
      buckets: [10, 30, 60, 120, 300, 600, 1200] // 10s to 20m
    });

    // API Error metrics
    this.youtubeAPIErrors = new client.Counter({
      name: 'youtube_api_errors_total',
      help: 'Total number of YouTube API errors',
      labelNames: ['error_type']
    });

    this.driveAPIErrors = new client.Counter({
      name: 'drive_api_errors_total',
      help: 'Total number of Google Drive API errors',
      labelNames: ['error_type']
    });

    this.sheetsAPIQuotaExceeded = new client.Gauge({
      name: 'sheets_api_quota_exceeded',
      help: 'Google Sheets API quota exceeded flag'
    });

    // Customer Success metrics
    this.customerSatisfactionScore = new client.Gauge({
      name: 'customer_satisfaction_score',
      help: 'Current customer satisfaction score (1-5)'
    });

    this.userErrorsTotal = new client.Counter({
      name: 'user_errors_total',
      help: 'Total number of user-facing errors',
      labelNames: ['error_type']
    });

    this.weeklyActiveUsers = new client.Gauge({
      name: 'weekly_active_users',
      help: 'Number of weekly active users'
    });

    this.customerChurnRate = new client.Gauge({
      name: 'customer_churn_rate_weekly',
      help: 'Weekly customer churn rate'
    });

    // Business metrics
    this.videoProcessingRevenue = new client.Counter({
      name: 'video_processing_revenue_cents',
      help: 'Revenue from video processing in cents'
    });

    this.newCustomerSignups = new client.Counter({
      name: 'customer_signups_total',
      help: 'Total number of new customer signups'
    });
  }

  // HTTP Request tracking
  trackHTTPRequest(method, route, status, duration) {
    this.httpRequestsTotal.labels(method, route, status).inc();
    this.httpRequestDuration.labels(method, route, status).observe(duration);
  }

  // Video processing tracking
  trackVideoProcessingStart(type) {
    this.videoProcessingTotal.labels('started', type).inc();
    this.queueTotalJobs.inc();
  }

  trackVideoProcessingComplete(type, duration) {
    this.videoProcessingTotal.labels('completed', type).inc();
    this.videoProcessingCompleted.inc();
    this.videoProcessingDuration.labels(type).observe(duration);
    this.queueCompletedJobs.inc();
  }

  trackVideoProcessingFailed(type, reason) {
    this.videoProcessingTotal.labels('failed', type).inc();
    this.queueFailedJobs.inc();
    this.logger.warn('Video processing failed', { type, reason });
  }

  // Queue metrics
  updateQueueMetrics(waiting, active) {
    this.queueWaitingJobs.set(waiting);
    this.queueActiveJobs.set(active);
  }

  // Storage tracking
  updateStorageMetrics(usedBytes, totalBytes) {
    this.storageDriveUsage.set(usedBytes);
    const percentage = (usedBytes / totalBytes) * 100;
    this.storageDriveUsagePercent.set(percentage);
  }

  trackStorageCleanup(filesDeleted, success = true) {
    this.storageCleanupRuns.inc();
    if (success) {
      this.storageFilesDeleted.inc(filesDeleted);
    } else {
      this.storageCleanupFailures.inc();
    }
  }

  // Upload tracking
  trackVideoUpload(service, success, duration, reason = null) {
    const status = success ? 'success' : 'failure';
    this.videoUploadsTotal.labels(service, status).inc();

    if (success) {
      this.videoUploadDuration.labels(service).observe(duration);
    } else {
      this.videoUploadFailures.labels(service, reason || 'unknown').inc();
    }
  }

  // API Error tracking
  trackYouTubeAPIError(errorType) {
    this.youtubeAPIErrors.labels(errorType).inc();
  }

  trackDriveAPIError(errorType) {
    this.driveAPIErrors.labels(errorType).inc();
  }

  trackSheetsAPIQuotaExceeded() {
    this.sheetsAPIQuotaExceeded.set(1);
  }

  clearSheetsAPIQuotaExceeded() {
    this.sheetsAPIQuotaExceeded.set(0);
  }

  // Customer success tracking
  updateCustomerSatisfaction(score) {
    this.customerSatisfactionScore.set(score);
  }

  trackUserError(errorType) {
    this.userErrorsTotal.labels(errorType).inc();
  }

  updateWeeklyActiveUsers(count) {
    this.weeklyActiveUsers.set(count);
  }

  updateCustomerChurnRate(rate) {
    this.customerChurnRate.set(rate);
  }

  // Business metrics
  trackRevenue(cents) {
    this.videoProcessingRevenue.inc(cents);
  }

  trackNewCustomer() {
    this.newCustomerSignups.inc();
  }

  // Express middleware for automatic HTTP tracking
  httpMetricsMiddleware() {
    return (req, res, next) => {
      const start = Date.now();

      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route ? req.route.path : req.path;
        this.trackHTTPRequest(req.method, route, res.statusCode, duration);
      });

      next();
    };
  }

  // Get all metrics for Prometheus endpoint
  async getMetrics() {
    return client.register.metrics();
  }

  // Get specific metric groups
  async getProcessMetrics() {
    const metrics = await client.register.getMetricsAsJSON();
    return metrics.filter(metric =>
      metric.name.startsWith('process_') ||
      metric.name.startsWith('nodejs_')
    );
  }

  async getQueueMetrics() {
    const metrics = await client.register.getMetricsAsJSON();
    return metrics.filter(metric => metric.name.includes('queue'));
  }

  async getStorageMetrics() {
    const metrics = await client.register.getMetricsAsJSON();
    return metrics.filter(metric => metric.name.includes('storage'));
  }

  async getCustomerMetrics() {
    const metrics = await client.register.getMetricsAsJSON();
    return metrics.filter(metric =>
      metric.name.includes('customer') ||
      metric.name.includes('user') ||
      metric.name.includes('satisfaction')
    );
  }

  // Health check based on metrics
  async getHealthMetrics() {
    const metrics = await client.register.getMetricsAsJSON();

    // Extract key health indicators
    const errorRate = this.calculateErrorRate(metrics);
    const queueHealth = this.calculateQueueHealth(metrics);
    const storageHealth = this.calculateStorageHealth(metrics);

    return {
      errorRate,
      queueHealth,
      storageHealth,
      overall: this.calculateOverallHealth(errorRate, queueHealth, storageHealth)
    };
  }

  calculateErrorRate(metrics) {
    const requestsMetric = metrics.find(m => m.name === 'http_requests_total');
    if (!requestsMetric) return { healthy: true, rate: 0 };

    let totalRequests = 0;
    let errorRequests = 0;

    requestsMetric.values.forEach(value => {
      totalRequests += value.value;
      if (parseInt(value.labels.status) >= 400) {
        errorRequests += value.value;
      }
    });

    const rate = totalRequests > 0 ? errorRequests / totalRequests : 0;

    return {
      healthy: rate < 0.05, // Less than 5% error rate
      rate: rate,
      totalRequests,
      errorRequests
    };
  }

  calculateQueueHealth(metrics) {
    const waitingMetric = metrics.find(m => m.name === 'video_queue_waiting_jobs');
    const activeMetric = metrics.find(m => m.name === 'video_queue_active_jobs');

    const waiting = waitingMetric ? waitingMetric.values[0]?.value || 0 : 0;
    const active = activeMetric ? activeMetric.values[0]?.value || 0 : 0;

    return {
      healthy: waiting < 10 && active < 5, // Less than 10 waiting, 5 active
      waiting,
      active,
      backlogged: waiting > 10
    };
  }

  calculateStorageHealth(metrics) {
    const usageMetric = metrics.find(m => m.name === 'storage_drive_usage_percent');
    const usage = usageMetric ? usageMetric.values[0]?.value || 0 : 0;

    return {
      healthy: usage < 80, // Less than 80% usage
      usage,
      critical: usage > 90
    };
  }

  calculateOverallHealth(errorRate, queueHealth, storageHealth) {
    const issues = [];

    if (!errorRate.healthy) issues.push('high_error_rate');
    if (!queueHealth.healthy) issues.push('queue_issues');
    if (!storageHealth.healthy) issues.push('storage_issues');

    if (issues.length === 0) return { status: 'healthy', issues: [] };
    if (issues.length === 1) return { status: 'degraded', issues };
    return { status: 'unhealthy', issues };
  }

  // Reset all metrics (useful for testing)
  reset() {
    client.register.clear();
    this.initializeMetrics();
  }
}

export { MetricsCollector };