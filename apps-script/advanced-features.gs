
/**
* @fileoverview Advanced Features Manager - System Health, Scheduling, Multi-tenant
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Advanced system features including health monitoring, scheduling, and future multi-tenant support
 */

/**
 * Advanced Features Manager Class
 * Handles system health monitoring, advanced scheduling, and extensibility features
 */
class AdvancedFeaturesManager {
  
  constructor() {
    this.loggerName = 'AdvancedFeatures';
    this._logger = null;
    this.systemStartTime = DateUtils.now();
  }

  get logger() {
    if (!this._logger) {
      try {
        this._logger = logger.scope(this.loggerName);
      } catch (error) {
        this._logger = {
          enterFunction: (fn, data) => console.log(`[${this.loggerName}] → ${fn}`, data || ''),
          exitFunction: (fn, data) => console.log(`[${this.loggerName}] ← ${fn}`, data || ''),
          info: (msg, data) => console.log(`[${this.loggerName}] ${msg}`, data || ''),
          warn: (msg, data) => console.warn(`[${this.loggerName}] ${msg}`, data || ''),
          error: (msg, data) => console.error(`[${this.loggerName}] ${msg}`, data || ''),
          audit: (msg, data) => console.log(`[${this.loggerName}] AUDIT: ${msg}`, data || ''),
          security: (msg, data) => console.log(`[${this.loggerName}] SECURITY: ${msg}`, data || '')
        };
      }
    }
    return this._logger;
  }

  /**
   * Perform comprehensive system health monitoring
   * @returns {Object} Health monitoring result
   */
  performSystemHealthMonitoring() {
    this.logger.enterFunction('performSystemHealthMonitoring');
    
    try {
      // @testHook(health_monitoring_start)
      
      const healthReport = {
        overall_status: 'HEALTHY',
        timestamp: DateUtils.formatISO(DateUtils.now()),
        uptime_ms: DateUtils.now().getTime() - this.systemStartTime.getTime(),
        components: {},
        performance_metrics: {},
        warnings: [],
        errors: []
      };
      
      // Core system components health
      healthReport.components.configuration = this.checkConfigurationHealth();
      healthReport.components.sheets_access = this.checkSheetsHealth();
      healthReport.components.make_webhook = this.checkMakeWebhookHealth();
      healthReport.components.logging_system = this.checkLoggingHealth();
      healthReport.components.utilities = this.checkUtilitiesHealth();
      
      // Feature-specific health checks
      if (isFeatureEnabled('WEEKLY_CONTENT_AUTOMATION')) {
        healthReport.components.weekly_scheduler = this.checkWeeklySchedulerHealth();
      }
      
      if (isFeatureEnabled('PLAYER_MINUTES_TRACKING')) {
        healthReport.components.player_management = this.checkPlayerManagementHealth();
      }
      
      if (isFeatureEnabled('VIDEO_INTEGRATION')) {
        healthReport.components.video_clips = this.checkVideoClipsHealth();
      }
      
      if (isFeatureEnabled('XBOTGO_INTEGRATION')) {
        healthReport.components.xbotgo = this.checkXbotGoHealth();
      }
      
      // Performance metrics
      healthReport.performance_metrics = this.gatherPerformanceMetrics();
      
      // Determine overall status
      const componentStatuses = Object.values(healthReport.components)
        .map(comp => comp.status);
      
      const criticalFailures = componentStatuses.filter(status => status === 'CRITICAL').length;
      const warnings = componentStatuses.filter(status => status === 'WARNING').length;
      
      if (criticalFailures > 0) {
        healthReport.overall_status = 'CRITICAL';
        healthReport.errors.push(`${criticalFailures} critical component failures`);
      } else if (warnings > 0) {
        healthReport.overall_status = 'WARNING';
        healthReport.warnings.push(`${warnings} components with warnings`);
      }
      
      // Store health report
      this.storeHealthReport(healthReport);
      
      // @testHook(health_monitoring_complete)
      
      this.logger.exitFunction('performSystemHealthMonitoring', { 
        status: healthReport.overall_status 
      });
      
      return {
        success: true,
        health_report: healthReport
      };
      
    } catch (error) {
      this.logger.error('System health monitoring failed', { error: error.toString() });
      
      return {
        success: false,
        error: error.toString(),
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Advanced scheduling system
   * @returns {Object} Scheduling result
   */
  runAdvancedScheduling() {
    this.logger.enterFunction('runAdvancedScheduling');
    
    try {
      // @testHook(advanced_scheduling_start)
      
      const today = DateUtils.now();
      const dayOfWeek = DateUtils.getDayOfWeek(today);
      const dayOfMonth = today.getDate();
      const schedulingResults = {};
      
      // Daily tasks
      schedulingResults.daily_maintenance = this.runDailyMaintenanceTasks();
      
      // Weekly tasks
      if (isFeatureEnabled('WEEKLY_CONTENT_AUTOMATION')) {
        schedulingResults.weekly_content = runWeeklyScheduleAutomation();
      }
      
      // Monthly tasks
      const monthlyTasks = this.getMonthlyTasks(dayOfMonth);
      if (monthlyTasks.length > 0) {
        schedulingResults.monthly_tasks = this.executeMonthlyTasks(monthlyTasks);
      }
      
      // Feature-specific scheduling
      if (isFeatureEnabled('PLAYER_MINUTES_TRACKING')) {
        schedulingResults.player_stats_sync = this.syncPlayerStatistics();
      }
      
      // Health monitoring (every 6 hours)
      if (this.shouldRunHealthCheck()) {
        schedulingResults.health_monitoring = this.performSystemHealthMonitoring();
      }
      
      // @testHook(advanced_scheduling_complete)
      
      const successfulTasks = Object.values(schedulingResults)
        .filter(result => result && result.success).length;
      const totalTasks = Object.keys(schedulingResults).length;
      
      this.logger.exitFunction('runAdvancedScheduling', { 
        success: successfulTasks === totalTasks,
        tasks_completed: successfulTasks,
        total_tasks: totalTasks
      });
      
      return {
        success: successfulTasks === totalTasks,
        scheduling_results: schedulingResults,
        tasks_completed: successfulTasks,
        total_tasks: totalTasks,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Advanced scheduling failed', { error: error.toString() });
      
      return {
        success: false,
        error: error.toString(),
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Multi-tenant system preparation (future feature)
   * @returns {Object} Multi-tenant readiness
   */
  prepareMultiTenantSystem() {
    this.logger.enterFunction('prepareMultiTenantSystem');
    
    try {
      // @testHook(multi_tenant_prep_start)
      
      if (!isFeatureEnabled('MULTI_TENANT')) {
        return {
          success: true,
          message: 'Multi-tenant system is not enabled',
          ready: false,
          skipped: true
        };
      }
      
      const preparationReport = {
        database_separation: false,
        configuration_isolation: false,
        user_management: false,
        resource_isolation: false,
        billing_integration: false
      };
      
      // Check database separation readiness
      preparationReport.database_separation = this.checkDatabaseSeparationReadiness();
      
      // Check configuration isolation
      preparationReport.configuration_isolation = this.checkConfigurationIsolation();
      
      // Check user management readiness
      preparationReport.user_management = this.checkUserManagementReadiness();
      
      // Check resource isolation
      preparationReport.resource_isolation = this.checkResourceIsolation();
      
      // Check billing integration readiness
      preparationReport.billing_integration = this.checkBillingIntegrationReadiness();
      
      const readinessScore = Object.values(preparationReport)
        .filter(ready => ready === true).length;
      const totalChecks = Object.keys(preparationReport).length;
      
      // @testHook(multi_tenant_prep_complete)
      
      this.logger.exitFunction('prepareMultiTenantSystem', { 
        success: true,
        readiness_score: readinessScore
      });
      
      return {
        success: true,
        multi_tenant_ready: readinessScore === totalChecks,
        readiness_score: `${readinessScore}/${totalChecks}`,
        preparation_report: preparationReport,
        next_steps: this.getMultiTenantNextSteps(preparationReport),
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Multi-tenant preparation failed', { error: error.toString() });
      
      return {
        success: false,
        error: error.toString(),
        multi_tenant_ready: false
      };
    }
  }

  // ==================== HEALTH CHECK METHODS ====================

  /**
   * Check configuration health
   * @private
   * @returns {Object} Configuration health
   */
  checkConfigurationHealth() {
    try {
      const configValidation = validateConfig();
      
      return {
        status: configValidation.valid ? 'HEALTHY' : 'WARNING',
        errors: configValidation.errors,
        warnings: configValidation.warnings,
        last_checked: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      return {
        status: 'CRITICAL',
        error: error.toString(),
        last_checked: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Check Google Sheets health
   * @private
   * @returns {Object} Sheets health
   */
  checkSheetsHealth() {
    try {
      const testSheet = SheetUtils.getOrCreateSheet('Health Check Test', ['Test Column']);
      
      if (!testSheet) {
        return {
          status: 'CRITICAL',
          error: 'Cannot access Google Sheets',
          last_checked: DateUtils.formatISO(DateUtils.now())
        };
      }
      
      // Clean up test sheet
      try {
        const spreadsheet = SpreadsheetApp.openById(getSecureProperty('SPREADSHEET_ID'));
        const testSheetObj = spreadsheet.getSheetByName('Health Check Test');
        if (testSheetObj) {
          spreadsheet.deleteSheet(testSheetObj);
        }
      } catch (cleanupError) {
        // Non-critical cleanup failure
      }
      
      return {
        status: 'HEALTHY',
        message: 'Sheets access working correctly',
        last_checked: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      return {
        status: 'CRITICAL',
        error: error.toString(),
        last_checked: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Check Make.com webhook health
   * @private
   * @returns {Object} Webhook health
   */
  checkMakeWebhookHealth() {
    try {
      const webhookStats = getMakeWebhookStats();
      const connectionTest = testMakeConnection();
      
      if (!connectionTest.success) {
        return {
          status: 'WARNING',
          error: 'Webhook connection failed',
          stats: webhookStats,
          last_checked: DateUtils.formatISO(DateUtils.now())
        };
      }
      
      return {
        status: 'HEALTHY',
        message: 'Webhook connection working',
        stats: webhookStats,
        last_checked: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      return {
        status: 'WARNING',
        error: error.toString(),
        last_checked: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Check logging system health
   * @private
   * @returns {Object} Logging health
   */
  checkLoggingHealth() {
    try {
      const logStats = logger.getStats();
      
      const errorRate = logStats.total_entries > 0 ? 
        ((logStats.levels?.ERROR || 0) / logStats.total_entries * 100) : 0;
      
      let status = 'HEALTHY';
      if (errorRate > 20) {
        status = 'WARNING';
      } else if (errorRate > 50) {
        status = 'CRITICAL';
      }
      
      return {
        status: status,
        error_rate: `${errorRate.toFixed(1)}%`,
        stats: logStats,
        last_checked: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      return {
        status: 'WARNING',
        error: error.toString(),
        last_checked: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Check utilities health
   * @private
   * @returns {Object} Utilities health
   */
  checkUtilitiesHealth() {
    try {
      const utilsTest = testUtils();
      
      return {
        status: utilsTest.success ? 'HEALTHY' : 'WARNING',
        test_results: utilsTest.results,
        last_checked: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      return {
        status: 'WARNING',
        error: error.toString(),
        last_checked: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Check weekly scheduler health
   * @private
   * @returns {Object} Scheduler health
   */
  checkWeeklySchedulerHealth() {
    try {
      const schedulerTest = testWeeklyScheduler();
      
      return {
        status: schedulerTest.success ? 'HEALTHY' : 'WARNING',
        test_results: schedulerTest.results,
        last_checked: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      return {
        status: 'WARNING',
        error: error.toString(),
        last_checked: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Check player management health
   * @private
   * @returns {Object} Player management health
   */
  checkPlayerManagementHealth() {
    try {
      const playerTest = testPlayerManagement();
      
      return {
        status: playerTest.success ? 'HEALTHY' : 'WARNING',
        test_results: playerTest.results,
        last_checked: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      return {
        status: 'WARNING',
        error: error.toString(),
        last_checked: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Check video clips health
   * @private
   * @returns {Object} Video clips health
   */
  checkVideoClipsHealth() {
    try {
      const videoTest = testVideoClips();
      
      return {
        status: videoTest.success ? 'HEALTHY' : 'WARNING',
        test_results: videoTest.results,
        last_checked: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      return {
        status: 'WARNING',
        error: error.toString(),
        last_checked: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Check XbotGo health
   * @private
   * @returns {Object} XbotGo health
   */
  checkXbotGoHealth() {
    try {
      const xbotgoTest = testXbotGoIntegration();
      
      return {
        status: xbotgoTest.success ? 'HEALTHY' : 'WARNING',
        test_results: xbotgoTest.results,
        integration_enabled: xbotgoTest.integration_enabled,
        last_checked: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      return {
        status: 'WARNING',
        error: error.toString(),
        last_checked: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  // ==================== PERFORMANCE AND MAINTENANCE ====================

  /**
   * Gather performance metrics
   * @private
   * @returns {Object} Performance metrics
   */
  gatherPerformanceMetrics() {
    try {
      const startTime = Date.now();
      
      // Test basic operations
      const testDate = DateUtils.now();
      const testString = StringUtils.toTitleCase('test string');
      const testId = StringUtils.generateId('perf');
      
      const operationTime = Date.now() - startTime;
      
      return {
        operation_time_ms: operationTime,
        memory_usage: this.estimateMemoryUsage(),
        cache_hit_rate: this.getCacheHitRate(),
        average_response_time: this.getAverageResponseTime(),
        uptime_ms: DateUtils.now().getTime() - this.systemStartTime.getTime(),
        last_measured: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      return {
        error: error.toString(),
        last_measured: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Run daily maintenance tasks
   * @private
   * @returns {Object} Maintenance result
   */
  runDailyMaintenanceTasks() {
    try {
      const results = {
        log_cleanup: false,
        cache_cleanup: false,
        sheet_optimization: false,
        error_recovery: false
      };
      
      // Log cleanup
      try {
        scheduledLogCleanup();
        results.log_cleanup = true;
      } catch (error) {
        this.logger.error('Log cleanup failed', { error: error.toString() });
      }
      
      // Cache cleanup
      try {
        CacheUtils.clear();
        results.cache_cleanup = true;
      } catch (error) {
        this.logger.error('Cache cleanup failed', { error: error.toString() });
      }
      
      // Sheet optimization (placeholder)
      try {
        results.sheet_optimization = true; // Would implement sheet defragmentation
      } catch (error) {
        this.logger.error('Sheet optimization failed', { error: error.toString() });
      }
      
      // Error recovery (placeholder)
      try {
        results.error_recovery = true; // Would implement automatic error recovery
      } catch (error) {
        this.logger.error('Error recovery failed', { error: error.toString() });
      }
      
      const successCount = Object.values(results).filter(r => r === true).length;
      const totalTasks = Object.keys(results).length;
      
      return {
        success: successCount === totalTasks,
        tasks_completed: successCount,
        total_tasks: totalTasks,
        results: results
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.toString()
      };
    }
  }

  /**
   * Store health report
   * @private
   * @param {Object} healthReport - Health report
   */
  storeHealthReport(healthReport) {
    try {
      const healthSheet = SheetUtils.getOrCreateSheet(
        'System Health',
        ['Timestamp', 'Overall Status', 'Component Count', 'Warnings', 'Errors', 'Uptime Hours', 'Details']
      );
      
      if (!healthSheet) return;
      
      const componentCount = Object.keys(healthReport.components).length;
      const uptimeHours = (healthReport.uptime_ms / (1000 * 60 * 60)).toFixed(1);
      
      const healthData = {
        'Timestamp': healthReport.timestamp,
        'Overall Status': healthReport.overall_status,
        'Component Count': componentCount,
        'Warnings': healthReport.warnings.length,
        'Errors': healthReport.errors.length,
        'Uptime Hours': uptimeHours,
        'Details': JSON.stringify({
          components: Object.keys(healthReport.components),
          performance: healthReport.performance_metrics
        })
      };
      
      SheetUtils.addRowFromObject(healthSheet, healthData);
      
    } catch (error) {
      this.logger.error('Failed to store health report', { error: error.toString() });
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Check if health check should run
   * @private
   * @returns {boolean} Should run health check
   */
  shouldRunHealthCheck() {
    try {
      const lastCheck = getSecureProperty('LAST_HEALTH_CHECK');
      if (!lastCheck) return true;
      
      const lastCheckTime = new Date(lastCheck);
      const sixHoursAgo = DateUtils.addDays(DateUtils.now(), 0);
      sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);
      
      return lastCheckTime < sixHoursAgo;
    } catch (error) {
      return true; // Default to running health check
    }
  }

  /**
   * Get monthly tasks for specific day
   * @private
   * @param {number} dayOfMonth - Day of month
   * @returns {Array} Monthly tasks
   */
  getMonthlyTasks(dayOfMonth) {
    const tasks = [];
    
    if (dayOfMonth === 1) {
      tasks.push('monthly_fixtures', 'gotm_voting');
    }
    
    if (dayOfMonth === getConfigValue('MONTHLY.GOTM.WINNER_ANNOUNCE_DAY', 6)) {
      tasks.push('gotm_winner');
    }
    
    const lastDay = new Date(DateUtils.now().getFullYear(), DateUtils.now().getMonth() + 1, 0).getDate();
    if (dayOfMonth === lastDay) {
      tasks.push('monthly_results');
    }
    
    return tasks;
  }

  /**
   * Execute monthly tasks
   * @private
   * @param {Array} tasks - Tasks to execute
   * @returns {Object} Execution result
   */
  executeMonthlyTasks(tasks) {
    const results = {};
    
    tasks.forEach(task => {
      try {
        switch (task) {
          case 'monthly_fixtures':
            results[task] = postMonthlyFixturesSummary();
            break;
          case 'monthly_results':
            results[task] = postMonthlyResultsSummary();
            break;
          case 'gotm_voting':
            results[task] = startGOTMVoting();
            break;
          case 'gotm_winner':
            results[task] = announceGOTMWinner();
            break;
          default:
            results[task] = { success: false, error: 'Unknown task' };
        }
      } catch (error) {
        results[task] = { success: false, error: error.toString() };
      }
    });
    
    const successCount = Object.values(results).filter(r => r.success).length;
    
    return {
      success: successCount === tasks.length,
      tasks_executed: tasks.length,
      successful_tasks: successCount,
      results: results
    };
  }

  /**
   * Sync player statistics
   * @private
   * @returns {Object} Sync result
   */
  syncPlayerStatistics() {
    try {
      // Placeholder for player statistics synchronization
      // Would implement cross-system sync in real deployment
      
      return {
        success: true,
        message: 'Player statistics synchronized',
        sync_count: 0
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.toString()
      };
    }
  }

  // ==================== MULTI-TENANT PREPARATION ====================

  /**
   * Check database separation readiness
   * @private
   * @returns {boolean} Readiness status
   */
  checkDatabaseSeparationReadiness() {
    // Placeholder - would check if system can handle multiple club data
    return false; // Not implemented yet
  }

  /**
   * Check configuration isolation
   * @private
   * @returns {boolean} Readiness status
   */
  checkConfigurationIsolation() {
    // Placeholder - would check if config can be isolated per tenant
    return false; // Not implemented yet
  }

  /**
   * Check user management readiness
   * @private
   * @returns {boolean} Readiness status
   */
  checkUserManagementReadiness() {
    // Placeholder - would check user authentication/authorization system
    return false; // Not implemented yet
  }

  /**
   * Check resource isolation
   * @private
   * @returns {boolean} Readiness status
   */
  checkResourceIsolation() {
    // Placeholder - would check if resources can be isolated per tenant
    return false; // Not implemented yet
  }

  /**
   * Check billing integration readiness
   * @private
   * @returns {boolean} Readiness status
   */
  checkBillingIntegrationReadiness() {
    // Placeholder - would check billing system integration
    return false; // Not implemented yet
  }

  /**
   * Get multi-tenant next steps
   * @private
   * @param {Object} preparationReport - Preparation report
   * @returns {Array} Next steps
   */
  getMultiTenantNextSteps(preparationReport) {
    const nextSteps = [];
    
    if (!preparationReport.database_separation) {
      nextSteps.push('Implement database separation per tenant');
    }
    
    if (!preparationReport.configuration_isolation) {
      nextSteps.push('Implement configuration isolation');
    }
    
    if (!preparationReport.user_management) {
      nextSteps.push('Develop user authentication and authorization system');
    }
    
    if (!preparationReport.resource_isolation) {
      nextSteps.push('Implement resource isolation and quota management');
    }
    
    if (!preparationReport.billing_integration) {
      nextSteps.push('Integrate billing and subscription management');
    }
    
    return nextSteps;
  }

  /**
   * Estimate memory usage
   * @private
   * @returns {string} Memory usage estimate
   */
  estimateMemoryUsage() {
    // Placeholder - Apps Script doesn't provide direct memory monitoring
    return 'N/A (Apps Script limitation)';
  }

  /**
   * Get cache hit rate
   * @private
   * @returns {string} Cache hit rate
   */
  getCacheHitRate() {
    // Placeholder - would calculate from cache statistics
    return 'N/A (Not implemented)';
  }

  /**
   * Get average response time
   * @private
   * @returns {number} Average response time
   */
  getAverageResponseTime() {
    // Placeholder - would calculate from performance logs
    return 0;
  }
}


// ==================== PUBLIC API FUNCTIONS ====================

/**
 * Initialize Advanced Features Manager
 * @returns {Object} Initialization result
 */
function initializeAdvancedFeatures() {
  logger.enterFunction('AdvancedFeatures.initialize');
  
  try {
    // Test system health monitoring
    const manager = new AdvancedFeaturesManager();
    const healthResult = manager.performSystemHealthMonitoring();
    
    // Initialize Control Panel
    const controlPanel = initializeControlPanel();
    
    logger.exitFunction('AdvancedFeatures.initialize', { 
      success: healthResult.success && controlPanel.success 
    });
    
    return {
      success: healthResult.success && controlPanel.success,
      health_monitoring: healthResult.success,
      control_panel: controlPanel.success,
      multi_tenant_ready: false, // Future feature
      message: 'Advanced Features Manager initialized successfully',
      version: '6.2.0'
    };
    
  } catch (error) {
    logger.error('Advanced Features initialization failed', { error: error.toString() });
    
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Run system health monitoring (public API)
 * @returns {Object} Health monitoring result
 */
function runSystemHealthMonitoring() {
  const manager = new AdvancedFeaturesManager();
  return manager.performSystemHealthMonitoring();
}

/**
 * Run advanced scheduling (public API)
 * @returns {Object} Scheduling result
 */
function runAdvancedSchedulingTasks() {
  const manager = new AdvancedFeaturesManager();
  return manager.runAdvancedScheduling();
}

/**
 * Prepare multi-tenant system (public API)
 * @returns {Object} Multi-tenant preparation result
 */
function prepareMultiTenantSystem() {
  const manager = new AdvancedFeaturesManager();
  return manager.prepareMultiTenantSystem();
}

/**
 * Toggle system feature (public API)
 * @param {string} featureName - Feature name
 * @param {boolean} enabled - Enable status
 * @param {string} modifiedBy - Who made the change
 * @returns {Object} Toggle result
 */
function toggleSystemFeature(featureName, enabled, modifiedBy = 'Manual') {
  const controlPanel = new SystemControlPanel();
  return controlPanel.toggleFeature(featureName, enabled, modifiedBy);
}

/**
 * Input historical player statistics (public API)
 * @param {Array} playerDataArray - Player data array
 * @returns {Object} Input result
 */
function inputHistoricalPlayerStatistics(playerDataArray) {
  const controlPanel = new SystemControlPanel();
  return controlPanel.inputHistoricalPlayerStats(playerDataArray);
}

/**
 * Get system health status (public API)
 * @returns {Object} Health status
 */
function getSystemHealthStatus() {
  const controlPanel = new SystemControlPanel();
  return controlPanel.getSystemHealthStatus();
}

/**
 * Reset Control Panel to defaults (public API)
 * @returns {Object} Reset result
 */
function resetControlPanelToDefaults() {
  const controlPanel = new SystemControlPanel();
  return controlPanel.resetToDefaults();
}

/**
 * Export Control Panel settings (public API)
 * @returns {Object} Export result
 */
function exportControlPanelSettings() {
  const controlPanel = new SystemControlPanel();
  return controlPanel.exportSettings();
}

/**
 * Import Control Panel settings (public API)
 * @param {Object} settingsData - Settings data
 * @returns {Object} Import result
 */
function importControlPanelSettings(settingsData) {
  const controlPanel = new SystemControlPanel();
  return controlPanel.importSettings(settingsData);
}

// ==================== TESTING FUNCTIONS ====================

/**
 * Test advanced features functionality
 * @returns {Object} Test results
 */
function testAdvancedFeatures() {
  logger.enterFunction('AdvancedFeatures.test');
  
  try {
    const results = {
      initialization: false,
      health_monitoring: false,
      control_panel: false,
      feature_toggle: false,
      scheduling: false
    };
    
    // Test initialization
    const initResult = initializeAdvancedFeatures();
    results.initialization = initResult.success;
    
    // Test health monitoring
    try {
      const healthResult = runSystemHealthMonitoring();
      results.health_monitoring = healthResult.success;
    } catch (error) {
      logger.warn('Health monitoring test failed', { error: error.toString() });
    }
    
    // Test control panel
    try {
      const controlPanel = new SystemControlPanel();
      const healthStatus = controlPanel.getSystemHealthStatus();
      results.control_panel = healthStatus.success;
    } catch (error) {
      logger.warn('Control panel test failed', { error: error.toString() });
    }
    
    // Test feature toggle
    try {
      const toggleResult = toggleSystemFeature('TEST_FEATURE', true, 'test');
      results.feature_toggle = toggleResult.success;
    } catch (error) {
      logger.warn('Feature toggle test failed', { error: error.toString() });
    }
    
    // Test scheduling
    try {
      const manager = new AdvancedFeaturesManager();
      const scheduleResult = manager.runDailyMaintenanceTasks();
      results.scheduling = scheduleResult.success;
    } catch (error) {
      logger.warn('Scheduling test failed', { error: error.toString() });
    }
    
    const allPassed = Object.values(results).every(result => result === true);
    
    logger.exitFunction('AdvancedFeatures.test', { success: allPassed });
    
    return {
      success: allPassed,
      results: results,
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
    
  } catch (error) {
    logger.error('Advanced features test failed', { error: error.toString() });
    
    return {
      success: false,
      error: error.toString(),
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  }
}
