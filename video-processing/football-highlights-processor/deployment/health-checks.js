import fetch from 'node-fetch';
import winston from 'winston';

class HealthCheckSystem {
  constructor(config = {}) {
    this.config = {
      endpoints: config.endpoints || [],
      interval: config.interval || 30000, // 30 seconds
      timeout: config.timeout || 10000,   // 10 seconds
      retries: config.retries || 3,
      alertThreshold: config.alertThreshold || 3, // Consecutive failures before alert
      ...config
    };

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/health-checks.log' })
      ]
    });

    this.healthStatus = new Map();
    this.checkHistory = new Map();
    this.alerts = new Map();
    this.isRunning = false;

    this.initializeEndpoints();
  }

  initializeEndpoints() {
    const defaultEndpoints = [
      {
        name: 'main_api',
        url: process.env.API_URL || 'http://localhost:8080/health',
        critical: true,
        timeout: 5000
      },
      {
        name: 'video_processing',
        url: (process.env.API_URL || 'http://localhost:8080') + '/stats',
        critical: true,
        timeout: 10000
      },
      {
        name: 'storage_status',
        url: (process.env.API_URL || 'http://localhost:8080') + '/storage/status',
        critical: false,
        timeout: 15000
      },
      {
        name: 'queue_dashboard',
        url: (process.env.API_URL || 'http://localhost:8080') + '/admin/queues',
        critical: false,
        timeout: 5000
      }
    ];

    // Add external service endpoints if configured
    if (process.env.RAILWAY_URL) {
      defaultEndpoints.push({
        name: 'railway_deployment',
        url: process.env.RAILWAY_URL + '/health',
        critical: true,
        timeout: 10000
      });
    }

    if (process.env.RENDER_URL) {
      defaultEndpoints.push({
        name: 'render_deployment',
        url: process.env.RENDER_URL + '/health',
        critical: true,
        timeout: 10000
      });
    }

    if (process.env.CLOUDFLARE_WORKER_URL) {
      defaultEndpoints.push({
        name: 'cloudflare_worker',
        url: process.env.CLOUDFLARE_WORKER_URL,
        critical: false,
        timeout: 5000
      });
    }

    this.config.endpoints = [...defaultEndpoints, ...this.config.endpoints];

    // Initialize health status for all endpoints
    this.config.endpoints.forEach(endpoint => {
      this.healthStatus.set(endpoint.name, {
        healthy: true,
        lastCheck: null,
        lastSuccess: null,
        lastFailure: null,
        consecutiveFailures: 0,
        uptime: 100,
        averageResponseTime: 0,
        endpoint: endpoint
      });
    });
  }

  async start() {
    if (this.isRunning) {
      this.logger.warn('Health check system already running');
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting health check system', {
      endpoints: this.config.endpoints.length,
      interval: this.config.interval
    });

    // Initial health check
    await this.runHealthChecks();

    // Schedule periodic checks
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.runHealthChecks();
      } catch (error) {
        this.logger.error('Error during scheduled health checks', error);
      }
    }, this.config.interval);

    // Schedule uptime calculation every 5 minutes
    this.uptimeInterval = setInterval(() => {
      this.calculateUptimeMetrics();
    }, 300000); // 5 minutes
  }

  async stop() {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.uptimeInterval) {
      clearInterval(this.uptimeInterval);
      this.uptimeInterval = null;
    }

    this.logger.info('Health check system stopped');
  }

  async runHealthChecks() {
    const checkPromises = this.config.endpoints.map(endpoint =>
      this.checkEndpoint(endpoint)
    );

    const results = await Promise.allSettled(checkPromises);

    let healthyCount = 0;
    let criticalFailures = 0;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const checkResult = result.value;
        if (checkResult.healthy) {
          healthyCount++;
        } else if (checkResult.endpoint.critical) {
          criticalFailures++;
        }
        this.updateHealthStatus(checkResult);
      } else {
        const endpoint = this.config.endpoints[index];
        this.logger.error('Health check promise failed', {
          endpoint: endpoint.name,
          error: result.reason
        });
      }
    });

    const overallHealth = {
      timestamp: new Date().toISOString(),
      totalEndpoints: this.config.endpoints.length,
      healthyEndpoints: healthyCount,
      criticalFailures,
      overallHealthy: criticalFailures === 0
    };

    this.logger.info('Health check cycle completed', overallHealth);

    return overallHealth;
  }

  async checkEndpoint(endpoint) {
    const startTime = Date.now();
    let attempt = 0;
    let lastError;

    while (attempt < this.config.retries) {
      try {
        const response = await fetch(endpoint.url, {
          timeout: endpoint.timeout || this.config.timeout,
          headers: {
            'User-Agent': 'HealthCheck/1.0',
            'Accept': 'application/json'
          }
        });

        const responseTime = Date.now() - startTime;

        // Check if response is successful
        const healthy = response.ok;
        let details = {};

        // Try to parse response body for additional details
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            details = await response.json();
          }
        } catch (parseError) {
          // Ignore JSON parsing errors for health checks
        }

        return {
          endpoint,
          healthy,
          responseTime,
          status: response.status,
          statusText: response.statusText,
          details,
          timestamp: new Date().toISOString(),
          attempt: attempt + 1
        };

      } catch (error) {
        lastError = error;
        attempt++;

        if (attempt < this.config.retries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }

    // All retries failed
    return {
      endpoint,
      healthy: false,
      error: lastError.message,
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      attempt
    };
  }

  updateHealthStatus(checkResult) {
    const status = this.healthStatus.get(checkResult.endpoint.name);
    if (!status) return;

    status.lastCheck = checkResult.timestamp;

    if (checkResult.healthy) {
      status.lastSuccess = checkResult.timestamp;
      status.consecutiveFailures = 0;

      // Update average response time
      if (status.averageResponseTime === 0) {
        status.averageResponseTime = checkResult.responseTime;
      } else {
        status.averageResponseTime =
          (status.averageResponseTime + checkResult.responseTime) / 2;
      }
    } else {
      status.lastFailure = checkResult.timestamp;
      status.consecutiveFailures++;

      this.logger.warn('Endpoint health check failed', {
        endpoint: checkResult.endpoint.name,
        consecutiveFailures: status.consecutiveFailures,
        error: checkResult.error,
        status: checkResult.status
      });
    }

    status.healthy = checkResult.healthy;

    // Store check history
    this.addToHistory(checkResult);

    // Check for alerts
    this.checkForAlerts(checkResult, status);
  }

  addToHistory(checkResult) {
    const endpointName = checkResult.endpoint.name;

    if (!this.checkHistory.has(endpointName)) {
      this.checkHistory.set(endpointName, []);
    }

    const history = this.checkHistory.get(endpointName);
    history.push({
      timestamp: checkResult.timestamp,
      healthy: checkResult.healthy,
      responseTime: checkResult.responseTime,
      status: checkResult.status
    });

    // Keep only last 100 checks
    if (history.length > 100) {
      history.shift();
    }
  }

  checkForAlerts(checkResult, status) {
    const endpointName = checkResult.endpoint.name;

    // Alert on consecutive failures reaching threshold
    if (status.consecutiveFailures >= this.config.alertThreshold) {
      if (!this.alerts.has(endpointName)) {
        this.triggerAlert({
          type: 'endpoint_down',
          endpoint: checkResult.endpoint,
          consecutiveFailures: status.consecutiveFailures,
          lastError: checkResult.error,
          critical: checkResult.endpoint.critical
        });

        this.alerts.set(endpointName, {
          type: 'endpoint_down',
          triggeredAt: new Date(),
          consecutiveFailures: status.consecutiveFailures
        });
      }
    } else if (checkResult.healthy && this.alerts.has(endpointName)) {
      // Endpoint recovered
      this.triggerAlert({
        type: 'endpoint_recovered',
        endpoint: checkResult.endpoint,
        downtime: Date.now() - this.alerts.get(endpointName).triggeredAt.getTime()
      });

      this.alerts.delete(endpointName);
    }

    // Alert on slow response times
    if (checkResult.healthy && checkResult.responseTime > 10000) { // 10 seconds
      this.triggerAlert({
        type: 'slow_response',
        endpoint: checkResult.endpoint,
        responseTime: checkResult.responseTime
      });
    }
  }

  triggerAlert(alertInfo) {
    const alertMessage = this.formatAlertMessage(alertInfo);

    this.logger.warn('Health check alert triggered', {
      type: alertInfo.type,
      endpoint: alertInfo.endpoint.name,
      message: alertMessage
    });

    // Send webhook notifications if configured
    if (this.config.webhookUrl) {
      this.sendWebhookAlert(alertInfo, alertMessage);
    }

    // Send email notifications if configured
    if (this.config.emailConfig) {
      this.sendEmailAlert(alertInfo, alertMessage);
    }
  }

  formatAlertMessage(alertInfo) {
    switch (alertInfo.type) {
      case 'endpoint_down':
        return `🚨 ${alertInfo.endpoint.name} is DOWN (${alertInfo.consecutiveFailures} consecutive failures)${alertInfo.critical ? ' - CRITICAL SERVICE' : ''}`;

      case 'endpoint_recovered':
        const downMinutes = Math.floor(alertInfo.downtime / 60000);
        return `✅ ${alertInfo.endpoint.name} has RECOVERED (was down for ${downMinutes} minutes)`;

      case 'slow_response':
        return `⚠️ ${alertInfo.endpoint.name} is responding slowly (${alertInfo.responseTime}ms)`;

      default:
        return `ℹ️ Health check alert: ${alertInfo.type} for ${alertInfo.endpoint.name}`;
    }
  }

  async sendWebhookAlert(alertInfo, message) {
    try {
      await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message,
          alert: alertInfo,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      this.logger.error('Failed to send webhook alert', error);
    }
  }

  async sendEmailAlert(alertInfo, message) {
    // Email alert implementation would go here
    this.logger.info('Email alert would be sent', { message });
  }

  calculateUptimeMetrics() {
    for (const [endpointName, status] of this.healthStatus) {
      const history = this.checkHistory.get(endpointName) || [];

      if (history.length === 0) continue;

      // Calculate uptime percentage for last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 86400000);
      const recentHistory = history.filter(check =>
        new Date(check.timestamp) >= twentyFourHoursAgo
      );

      if (recentHistory.length > 0) {
        const successfulChecks = recentHistory.filter(check => check.healthy).length;
        status.uptime = (successfulChecks / recentHistory.length) * 100;
      }
    }
  }

  // Public API methods
  getSystemHealth() {
    const endpoints = [];
    let criticalDown = 0;
    let totalDown = 0;

    for (const [name, status] of this.healthStatus) {
      endpoints.push({
        name,
        healthy: status.healthy,
        uptime: status.uptime,
        lastCheck: status.lastCheck,
        consecutiveFailures: status.consecutiveFailures,
        averageResponseTime: status.averageResponseTime,
        critical: status.endpoint.critical
      });

      if (!status.healthy) {
        totalDown++;
        if (status.endpoint.critical) {
          criticalDown++;
        }
      }
    }

    return {
      overall: criticalDown === 0 ? 'healthy' : 'unhealthy',
      criticalDown,
      totalDown,
      totalEndpoints: endpoints.length,
      endpoints,
      lastUpdate: new Date().toISOString()
    };
  }

  getEndpointHealth(endpointName) {
    const status = this.healthStatus.get(endpointName);
    const history = this.checkHistory.get(endpointName) || [];

    if (!status) {
      return null;
    }

    return {
      ...status,
      history: history.slice(-20), // Last 20 checks
      alerts: this.alerts.get(endpointName) || null
    };
  }

  getHealthHistory(endpointName, hours = 24) {
    const history = this.checkHistory.get(endpointName) || [];
    const cutoffTime = new Date(Date.now() - (hours * 3600000));

    return history.filter(check =>
      new Date(check.timestamp) >= cutoffTime
    );
  }

  getUptimeStats() {
    const stats = {};

    for (const [name, status] of this.healthStatus) {
      const history = this.checkHistory.get(name) || [];

      stats[name] = {
        current: status.uptime,
        averageResponseTime: status.averageResponseTime,
        totalChecks: history.length,
        critical: status.endpoint.critical
      };
    }

    return stats;
  }

  // Manual health check trigger
  async checkEndpointNow(endpointName) {
    const endpoint = this.config.endpoints.find(ep => ep.name === endpointName);
    if (!endpoint) {
      throw new Error(`Endpoint ${endpointName} not found`);
    }

    const result = await this.checkEndpoint(endpoint);
    this.updateHealthStatus(result);

    return result;
  }

  // Configuration management
  addEndpoint(endpoint) {
    // Validate endpoint configuration
    if (!endpoint.name || !endpoint.url) {
      throw new Error('Endpoint must have name and url');
    }

    this.config.endpoints.push(endpoint);
    this.healthStatus.set(endpoint.name, {
      healthy: true,
      lastCheck: null,
      lastSuccess: null,
      lastFailure: null,
      consecutiveFailures: 0,
      uptime: 100,
      averageResponseTime: 0,
      endpoint: endpoint
    });

    this.logger.info('New endpoint added for health monitoring', {
      name: endpoint.name,
      url: endpoint.url,
      critical: endpoint.critical || false
    });
  }

  removeEndpoint(endpointName) {
    const index = this.config.endpoints.findIndex(ep => ep.name === endpointName);
    if (index === -1) return false;

    this.config.endpoints.splice(index, 1);
    this.healthStatus.delete(endpointName);
    this.checkHistory.delete(endpointName);
    this.alerts.delete(endpointName);

    this.logger.info('Endpoint removed from health monitoring', { name: endpointName });
    return true;
  }

  // Express middleware for health endpoint
  middleware() {
    return (req, res) => {
      const health = this.getSystemHealth();
      const statusCode = health.overall === 'healthy' ? 200 : 503;

      res.status(statusCode).json(health);
    };
  }
}

export { HealthCheckSystem };