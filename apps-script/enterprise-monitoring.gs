/**
 * @fileoverview Enterprise Monitoring & Health Check System
 * @version 6.2.0
 * @description Comprehensive monitoring, health checks, and performance tracking
 */

/**
 * Enterprise Monitoring System with real-time health tracking
 */
class EnterpriseMonitoring {

  /**
   * Perform comprehensive system health check
   * @returns {Object} Complete health status
   */
  static performHealthCheck() {
    const startTime = Date.now();
    const healthResults = {
      overall_status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {},
      performance: {},
      summary: {
        total_checks: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      },
      response_time_ms: 0
    };

    try {
      // Core system checks
      healthResults.checks.configuration = this.checkConfiguration();
      healthResults.checks.script_properties = this.checkScriptProperties();
      healthResults.checks.webhooks = this.checkWebhookConnectivity();
      healthResults.checks.sheets_access = this.checkSheetsAccess();
      healthResults.checks.quota_status = this.checkQuotaStatus();
      healthResults.checks.security_systems = this.checkSecuritySystems();
      healthResults.checks.caching_systems = this.checkCachingSystems();
      healthResults.checks.rate_limiting = this.checkRateLimiting();

      // Performance metrics
      healthResults.performance = this.getPerformanceMetrics();

      // Calculate summary
      Object.values(healthResults.checks).forEach(check => {
        healthResults.summary.total_checks++;

        switch (check.status) {
          case 'healthy':
            healthResults.summary.passed++;
            break;
          case 'unhealthy':
            healthResults.summary.failed++;
            break;
          case 'warning':
            healthResults.summary.warnings++;
            break;
        }
      });

      // Determine overall status
      if (healthResults.summary.failed > 0) {
        healthResults.overall_status = 'unhealthy';
      } else if (healthResults.summary.warnings > 0) {
        healthResults.overall_status = 'warning';
      }

      healthResults.response_time_ms = Date.now() - startTime;

      // Store health check result
      this.recordHealthCheck(healthResults);

      return healthResults;

    } catch (error) {
      console.error('Health check failed:', error);
      return {
        overall_status: 'critical',
        error: error.toString(),
        timestamp: new Date().toISOString(),
        response_time_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Check system configuration health
   * @returns {Object} Configuration health status
   */
  static checkConfiguration() {
    try {
      const validation = EnterpriseConfig.validateSystemConfiguration();

      return {
        status: validation.valid ? 'healthy' : 'unhealthy',
        message: validation.valid ? 'Configuration valid' : 'Configuration issues found',
        details: {
          checks_performed: validation.checked,
          errors: validation.errors,
          warnings: validation.warnings
        },
        checked_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Configuration check failed',
        error: error.toString(),
        checked_at: new Date().toISOString()
      };
    }
  }

  /**
   * Check Script Properties accessibility
   * @returns {Object} Script Properties health status
   */
  static checkScriptProperties() {
    try {
      const properties = PropertiesService.getScriptProperties();
      const testKey = 'health_check_test';
      const testValue = Date.now().toString();

      // Test write
      properties.setProperty(testKey, testValue);

      // Test read
      const retrieved = properties.getProperty(testKey);

      // Test delete
      properties.deleteProperty(testKey);

      if (retrieved === testValue) {
        return {
          status: 'healthy',
          message: 'Script Properties accessible',
          checked_at: new Date().toISOString()
        };
      } else {
        return {
          status: 'unhealthy',
          message: 'Script Properties read/write failed',
          checked_at: new Date().toISOString()
        };
      }

    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Script Properties inaccessible',
        error: error.toString(),
        checked_at: new Date().toISOString()
      };
    }
  }

  /**
   * Check webhook connectivity
   * @returns {Object} Webhook health status
   */
  static checkWebhookConnectivity() {
    try {
      // Get configured webhook URL
      const webhookUrl = EnterpriseConfig.getWebhookUrl('default');

      if (!webhookUrl) {
        return {
          status: 'unhealthy',
          message: 'No webhook URL configured',
          checked_at: new Date().toISOString()
        };
      }

      // Validate URL format
      if (!EnterpriseConfig.isValidWebhookUrl(webhookUrl)) {
        return {
          status: 'unhealthy',
          message: 'Invalid webhook URL format',
          url_configured: true,
          checked_at: new Date().toISOString()
        };
      }

      return {
        status: 'healthy',
        message: 'Webhook URL configured and valid',
        url_configured: true,
        url_format_valid: true,
        checked_at: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Webhook connectivity check failed',
        error: error.toString(),
        checked_at: new Date().toISOString()
      };
    }
  }

  /**
   * Check Google Sheets access
   * @returns {Object} Sheets access health status
   */
  static checkSheetsAccess() {
    try {
      const properties = PropertiesService.getScriptProperties();
      const spreadsheetId = properties.getProperty('SYSTEM.SPREADSHEET_ID') ||
                           properties.getProperty('SPREADSHEET_ID');

      if (!spreadsheetId) {
        return {
          status: 'unhealthy',
          message: 'No spreadsheet ID configured',
          checked_at: new Date().toISOString()
        };
      }

      // Test sheet access
      const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      const sheets = spreadsheet.getSheets();

      return {
        status: 'healthy',
        message: 'Spreadsheet accessible',
        spreadsheet_id: spreadsheetId.substring(0, 10) + '...',
        sheet_count: sheets.length,
        checked_at: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Spreadsheet access failed',
        error: error.toString(),
        checked_at: new Date().toISOString()
      };
    }
  }

  /**
   * Check quota status
   * @returns {Object} Quota health status
   */
  static checkQuotaStatus() {
    try {
      const quotaStatus = QuotaMonitor.checkQuotaLimits();

      if (!quotaStatus.allowed) {
        return {
          status: 'unhealthy',
          message: 'Quota limits exceeded',
          violations: quotaStatus.violations,
          checked_at: new Date().toISOString()
        };
      }

      // Check if approaching limits
      const warningViolations = quotaStatus.violations.filter(v => v.severity === 'warning');
      if (warningViolations.length > 0) {
        return {
          status: 'warning',
          message: 'Approaching quota limits',
          warnings: warningViolations,
          checked_at: new Date().toISOString()
        };
      }

      return {
        status: 'healthy',
        message: 'Quota usage within limits',
        usage: quotaStatus.usage,
        checked_at: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Quota check failed',
        error: error.toString(),
        checked_at: new Date().toISOString()
      };
    }
  }

  /**
   * Check security systems
   * @returns {Object} Security systems health status
   */
  static checkSecuritySystems() {
    try {
      const securityChecks = {
        rate_limiting: false,
        input_validation: false,
        configuration_security: false,
        logging_systems: false
      };

      // Test rate limiting system
      try {
        const testLimit = RateLimiter.checkLimit('health_check_test', 1, 60000);
        securityChecks.rate_limiting = testLimit && typeof testLimit.allowed === 'boolean';
      } catch (error) {
        console.warn('Rate limiting check failed:', error);
      }

      // Test input validation
      try {
        const validatedData = EnterpriseValidator.sanitizePlayerName('Test Player');
        securityChecks.input_validation = validatedData === 'Test Player';
      } catch (error) {
        console.warn('Input validation check failed:', error);
      }

      // Test configuration security
      try {
        const secureConfig = EnterpriseConfig.getSecure('SYSTEM.VERSION', '6.2.0');
        securityChecks.configuration_security = !!secureConfig;
      } catch (error) {
        console.warn('Configuration security check failed:', error);
      }

      // Test logging systems
      try {
        console.log('Health check: Security systems test');
        securityChecks.logging_systems = true;
      } catch (error) {
        console.warn('Logging systems check failed:', error);
      }

      const workingSystems = Object.values(securityChecks).filter(working => working).length;
      const totalSystems = Object.keys(securityChecks).length;

      return {
        status: workingSystems === totalSystems ? 'healthy' :
                workingSystems > totalSystems / 2 ? 'warning' : 'unhealthy',
        message: `${workingSystems}/${totalSystems} security systems operational`,
        systems: securityChecks,
        checked_at: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Security systems check failed',
        error: error.toString(),
        checked_at: new Date().toISOString()
      };
    }
  }

  /**
   * Check caching systems
   * @returns {Object} Caching systems health status
   */
  static checkCachingSystems() {
    try {
      const properties = PropertiesService.getScriptProperties();

      // Test cache write/read
      const testKey = 'cache_health_test';
      const testData = { test: true, timestamp: Date.now() };

      properties.setProperty(testKey, JSON.stringify(testData));
      const retrieved = JSON.parse(properties.getProperty(testKey) || '{}');
      properties.deleteProperty(testKey);

      const cacheWorking = retrieved.test === true && retrieved.timestamp === testData.timestamp;

      return {
        status: cacheWorking ? 'healthy' : 'unhealthy',
        message: cacheWorking ? 'Caching systems operational' : 'Caching systems failed',
        cache_test_passed: cacheWorking,
        checked_at: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Caching systems check failed',
        error: error.toString(),
        checked_at: new Date().toISOString()
      };
    }
  }

  /**
   * Check rate limiting systems
   * @returns {Object} Rate limiting health status
   */
  static checkRateLimiting() {
    try {
      // Test rate limiting functionality
      const testId = 'health_check_rate_test';
      const result1 = RateLimiter.checkLimit(testId, 2, 60000);
      const result2 = RateLimiter.checkLimit(testId, 2, 60000);
      const result3 = RateLimiter.checkLimit(testId, 2, 60000); // Should be blocked

      const workingCorrectly = result1.allowed && result2.allowed && !result3.allowed;

      // Clean up test data
      RateLimiter.clearLimit(testId);

      return {
        status: workingCorrectly ? 'healthy' : 'warning',
        message: workingCorrectly ? 'Rate limiting operational' : 'Rate limiting behavior abnormal',
        test_results: {
          first_request: result1.allowed,
          second_request: result2.allowed,
          third_request_blocked: !result3.allowed
        },
        checked_at: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Rate limiting check failed',
        error: error.toString(),
        checked_at: new Date().toISOString()
      };
    }
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  static getPerformanceMetrics() {
    try {
      const properties = PropertiesService.getScriptProperties();

      // Get recent operation metrics
      const allProps = properties.getProperties();
      const operationKeys = Object.keys(allProps).filter(key =>
        key.startsWith('completed_op_') || key.startsWith('failed_op_')
      );

      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      let recentOperations = 0;
      let totalResponseTime = 0;
      let successfulOperations = 0;
      let failedOperations = 0;

      operationKeys.forEach(key => {
        try {
          const data = JSON.parse(allProps[key]);
          const operationTime = key.startsWith('completed_op_') ?
            new Date(data.completed_at).getTime() :
            new Date(data.failed_at).getTime();

          if (now - operationTime < oneHour) {
            recentOperations++;

            if (data.execution_time_ms) {
              totalResponseTime += data.execution_time_ms;
            }

            if (key.startsWith('completed_op_')) {
              successfulOperations++;
            } else {
              failedOperations++;
            }
          }
        } catch (error) {
          // Skip invalid operation data
        }
      });

      const averageResponseTime = recentOperations > 0 ? totalResponseTime / recentOperations : 0;
      const successRate = recentOperations > 0 ? (successfulOperations / recentOperations) * 100 : 0;

      return {
        recent_operations_1h: recentOperations,
        average_response_time_ms: Math.round(averageResponseTime),
        success_rate_percent: Math.round(successRate * 100) / 100,
        successful_operations: successfulOperations,
        failed_operations: failedOperations,
        system_uptime: this.getSystemUptime(),
        memory_usage: this.estimateMemoryUsage()
      };

    } catch (error) {
      return {
        error: error.toString(),
        metrics_available: false
      };
    }
  }

  /**
   * Get system uptime estimate
   * @returns {string} Uptime description
   */
  static getSystemUptime() {
    try {
      const properties = PropertiesService.getScriptProperties();
      const installDate = properties.getProperty('INSTALL.COMPLETED_AT');

      if (!installDate) return 'unknown';

      const installed = new Date(installDate);
      const now = new Date();
      const uptimeMs = now.getTime() - installed.getTime();

      const days = Math.floor(uptimeMs / (24 * 60 * 60 * 1000));
      const hours = Math.floor((uptimeMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

      return `${days}d ${hours}h`;

    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Estimate memory usage from stored properties
   * @returns {Object} Memory usage estimate
   */
  static estimateMemoryUsage() {
    try {
      const properties = PropertiesService.getScriptProperties();
      const allProps = properties.getProperties();

      let totalSize = 0;
      let propertyCount = 0;

      Object.entries(allProps).forEach(([key, value]) => {
        totalSize += key.length + (value ? value.length : 0);
        propertyCount++;
      });

      return {
        estimated_size_bytes: totalSize,
        estimated_size_kb: Math.round(totalSize / 1024),
        property_count: propertyCount,
        status: totalSize < 500000 ? 'healthy' : totalSize < 900000 ? 'warning' : 'critical'
      };

    } catch (error) {
      return {
        error: error.toString(),
        status: 'unknown'
      };
    }
  }

  /**
   * Record health check result for historical tracking
   * @param {Object} healthResults - Health check results
   */
  static recordHealthCheck(healthResults) {
    try {
      const properties = PropertiesService.getScriptProperties();
      const timestamp = Date.now();
      const healthKey = `health_check_${timestamp}`;

      // Store compressed health record
      const healthRecord = {
        timestamp: healthResults.timestamp,
        overall_status: healthResults.overall_status,
        response_time_ms: healthResults.response_time_ms,
        summary: healthResults.summary,
        failed_checks: Object.entries(healthResults.checks)
          .filter(([_, check]) => check.status === 'unhealthy')
          .map(([name, _]) => name)
      };

      properties.setProperty(healthKey, JSON.stringify(healthRecord));

      // Clean up old health records (keep last 100)
      this.cleanupHealthRecords();

    } catch (error) {
      console.error('Failed to record health check:', error);
    }
  }

  /**
   * Clean up old health check records
   */
  static cleanupHealthRecords() {
    try {
      const properties = PropertiesService.getScriptProperties();
      const allProps = properties.getProperties();

      const healthKeys = Object.keys(allProps)
        .filter(key => key.startsWith('health_check_'))
        .sort(); // Chronological order

      if (healthKeys.length > 100) {
        const keysToDelete = healthKeys.slice(0, healthKeys.length - 100);
        keysToDelete.forEach(key => {
          properties.deleteProperty(key);
        });
      }

    } catch (error) {
      console.error('Failed to cleanup health records:', error);
    }
  }

  /**
   * Get health check history
   * @param {number} limit - Maximum number of records to return
   * @returns {Array} Health check history
   */
  static getHealthHistory(limit = 10) {
    try {
      const properties = PropertiesService.getScriptProperties();
      const allProps = properties.getProperties();

      const healthRecords = Object.entries(allProps)
        .filter(([key, _]) => key.startsWith('health_check_'))
        .map(([key, value]) => {
          try {
            return JSON.parse(value);
          } catch (error) {
            return null;
          }
        })
        .filter(record => record !== null)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);

      return healthRecords;

    } catch (error) {
      console.error('Failed to get health history:', error);
      return [];
    }
  }

  /**
   * Check if system is ready for production traffic
   * @returns {Object} Production readiness assessment
   */
  static checkProductionReadiness() {
    const health = this.performHealthCheck();

    const readinessChecks = {
      configuration_valid: health.checks.configuration?.status === 'healthy',
      webhooks_configured: health.checks.webhooks?.status === 'healthy',
      sheets_accessible: health.checks.sheets_access?.status === 'healthy',
      security_operational: health.checks.security_systems?.status === 'healthy',
      quota_available: health.checks.quota_status?.status !== 'unhealthy',
      caching_working: health.checks.caching_systems?.status === 'healthy',
      rate_limiting_working: health.checks.rate_limiting?.status !== 'unhealthy'
    };

    const passedChecks = Object.values(readinessChecks).filter(passed => passed).length;
    const totalChecks = Object.keys(readinessChecks).length;
    const readinessScore = (passedChecks / totalChecks) * 100;

    return {
      ready_for_production: readinessScore >= 85, // 85% threshold
      readiness_score: Math.round(readinessScore),
      passed_checks: passedChecks,
      total_checks: totalChecks,
      checks: readinessChecks,
      recommendation: readinessScore >= 95 ? 'fully_ready' :
                     readinessScore >= 85 ? 'ready_with_monitoring' :
                     readinessScore >= 70 ? 'needs_fixes' : 'not_ready',
      timestamp: new Date().toISOString()
    };
  }
}

// Export for global use
globalThis.EnterpriseMonitoring = EnterpriseMonitoring;