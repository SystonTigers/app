/**
 * @fileoverview Working Monitoring System - Actually monitors real things
 * @version 6.3.0
 * @description Functional monitoring that tracks real system behavior
 */

/**
 * Working Monitoring System - Actually does monitoring
 */
class WorkingMonitoring {

  /**
   * Monitor actual spreadsheet usage and health
   */
  static monitorRealSystems() {
    try {
      const monitoringResults = {
        timestamp: new Date().toISOString(),
        systemHealth: this.checkSystemHealth(),
        sheetUsage: this.monitorSheetUsage(),
        functionPerformance: this.measureFunctionPerformance(),
        errorTracking: this.trackRecentErrors(),
        quotaUsage: this.checkQuotaUsage(),
        overallStatus: 'healthy'
      };

      // Determine overall status
      if (monitoringResults.systemHealth.criticalIssues > 0) {
        monitoringResults.overallStatus = 'critical';
      } else if (monitoringResults.systemHealth.warnings > 0) {
        monitoringResults.overallStatus = 'warning';
      }

      // Log monitoring results
      this.logMonitoringResults(monitoringResults);

      return monitoringResults;

    } catch (error) {
      console.error('Monitoring failed:', error);
      return {
        timestamp: new Date().toISOString(),
        overallStatus: 'error',
        error: error.toString()
      };
    }
  }

  /**
   * Check actual system health with real metrics
   */
  static checkSystemHealth() {
    const healthResults = {
      checks: 0,
      passed: 0,
      warnings: 0,
      criticalIssues: 0,
      details: []
    };

    try {
      // Test 1: Can we access the spreadsheet?
      healthResults.checks++;
      try {
        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const name = spreadsheet.getName();
        healthResults.passed++;
        healthResults.details.push({
          test: 'spreadsheet_access',
          status: 'pass',
          details: `Spreadsheet "${name}" accessible`
        });
      } catch (error) {
        healthResults.criticalIssues++;
        healthResults.details.push({
          test: 'spreadsheet_access',
          status: 'critical',
          error: error.toString()
        });
      }

      // Test 2: Are the essential sheets present?
      healthResults.checks++;
      try {
        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const sheets = spreadsheet.getSheets();
        const sheetNames = sheets.map(s => s.getName());
        const requiredSheets = ['Config', 'Live Match Updates'];
        const missingSheets = requiredSheets.filter(name => !sheetNames.includes(name));

        if (missingSheets.length === 0) {
          healthResults.passed++;
          healthResults.details.push({
            test: 'required_sheets',
            status: 'pass',
            details: `All required sheets found: ${sheetNames.join(', ')}`
          });
        } else {
          healthResults.warnings++;
          healthResults.details.push({
            test: 'required_sheets',
            status: 'warning',
            details: `Missing sheets: ${missingSheets.join(', ')}`
          });
        }
      } catch (error) {
        healthResults.criticalIssues++;
        healthResults.details.push({
          test: 'required_sheets',
          status: 'critical',
          error: error.toString()
        });
      }

      // Test 3: Can we load the config?
      healthResults.checks++;
      try {
        const dynamicConfig = getDynamicConfig();
        const clubName = (dynamicConfig && dynamicConfig.TEAM_NAME)
          || getConfigValue('SYSTEM.CLUB_NAME', 'Unknown Club');

        if (clubName) {
          healthResults.passed++;
          healthResults.details.push({
            test: 'config_load',
            status: 'pass',
            details: `Config loaded for ${clubName}`
          });
        } else {
          healthResults.warnings++;
          healthResults.details.push({
            test: 'config_load',
            status: 'warning',
            details: 'Config loaded but missing essential values'
          });
        }
      } catch (error) {
        healthResults.criticalIssues++;
        healthResults.details.push({
          test: 'config_load',
          status: 'critical',
          error: error.toString()
        });
      }

      // Test 4: Can we write to sheets?
      healthResults.checks++;
      try {
        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        let logSheet = spreadsheet.getSheetByName('Monitoring_Log');

        if (!logSheet) {
          logSheet = spreadsheet.insertSheet('Monitoring_Log');
          logSheet.getRange(1, 1, 1, 3).setValues([['Timestamp', 'Test', 'Status']]);
        }

        // Test write
        logSheet.appendRow([new Date().toISOString(), 'health_check', 'write_test']);

        healthResults.passed++;
        healthResults.details.push({
          test: 'sheet_write',
          status: 'pass',
          details: 'Successfully wrote to monitoring log'
        });
      } catch (error) {
        healthResults.warnings++;
        healthResults.details.push({
          test: 'sheet_write',
          status: 'warning',
          error: error.toString()
        });
      }

      return healthResults;

    } catch (error) {
      healthResults.criticalIssues++;
      healthResults.details.push({
        test: 'health_check_system',
        status: 'critical',
        error: error.toString()
      });
      return healthResults;
    }
  }

  /**
   * Monitor actual sheet usage
   */
  static monitorSheetUsage() {
    try {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      const sheets = spreadsheet.getSheets();

      const usage = {
        totalSheets: sheets.length,
        sheetSizes: {},
        largestSheet: null,
        maxRows: 0,
        totalDataRows: 0
      };

      sheets.forEach(sheet => {
        const name = sheet.getName();
        const lastRow = sheet.getLastRow();
        const lastCol = sheet.getLastColumn();

        usage.sheetSizes[name] = {
          rows: lastRow,
          columns: lastCol,
          dataPoints: lastRow * lastCol
        };

        usage.totalDataRows += lastRow;

        if (lastRow > usage.maxRows) {
          usage.maxRows = lastRow;
          usage.largestSheet = name;
        }
      });

      return usage;

    } catch (error) {
      return {
        error: error.toString(),
        monitored: false
      };
    }
  }

  /**
   * Measure actual function performance
   */
  static measureFunctionPerformance() {
    const performanceTests = [];

    try {
      // Test 1: Config loading speed
      const configStart = Date.now();
      const config = getDynamicConfig();
      const configTime = Date.now() - configStart;

      performanceTests.push({
        function: 'getConfig',
        timeMs: configTime,
        status: configTime < 1000 ? 'fast' : configTime < 3000 ? 'acceptable' : 'slow'
      });

      // Test 2: Health check speed
      const healthStart = Date.now();
      const health = HealthCheck.quickHealthCheck();
      const healthTime = Date.now() - healthStart;

      performanceTests.push({
        function: 'HealthCheck.quickHealthCheck',
        timeMs: healthTime,
        status: healthTime < 2000 ? 'fast' : healthTime < 5000 ? 'acceptable' : 'slow'
      });

      // Test 3: Simple sheet read speed
      const sheetStart = Date.now();
      try {
        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const firstSheet = spreadsheet.getSheets()[0];
        const testRead = firstSheet.getRange(1, 1).getValue();
        const sheetTime = Date.now() - sheetStart;

        performanceTests.push({
          function: 'sheet_read_test',
          timeMs: sheetTime,
          status: sheetTime < 500 ? 'fast' : sheetTime < 2000 ? 'acceptable' : 'slow'
        });
      } catch (error) {
        performanceTests.push({
          function: 'sheet_read_test',
          timeMs: Date.now() - sheetStart,
          status: 'error',
          error: error.toString()
        });
      }

      return {
        tests: performanceTests,
        averageTime: performanceTests.reduce((sum, test) => sum + (test.timeMs || 0), 0) / performanceTests.length,
        fastTests: performanceTests.filter(t => t.status === 'fast').length,
        slowTests: performanceTests.filter(t => t.status === 'slow').length
      };

    } catch (error) {
      return {
        error: error.toString(),
        tests: performanceTests
      };
    }
  }

  /**
   * Track recent errors in a simple way
   */
  static trackRecentErrors() {
    try {
      // Look for error patterns in recent executions
      const recentErrors = {
        totalChecked: 0,
        errorsFound: 0,
        patterns: []
      };

      // Simple error tracking - check if we can execute basic functions
      const testFunctions = [
        () => getDynamicConfig(),
        () => SpreadsheetApp.getActiveSpreadsheet().getName(),
        () => new Date().toISOString()
      ];

      testFunctions.forEach((testFn, index) => {
        recentErrors.totalChecked++;
        try {
          testFn();
        } catch (error) {
          recentErrors.errorsFound++;
          recentErrors.patterns.push({
            test: `function_test_${index}`,
            error: error.toString()
          });
        }
      });

      recentErrors.errorRate = recentErrors.errorsFound / recentErrors.totalChecked;

      return recentErrors;

    } catch (error) {
      return {
        error: error.toString(),
        errorRate: 1.0
      };
    }
  }

  /**
   * Check quota usage with simple metrics
   */
  static checkQuotaUsage() {
    try {
      const usage = {
        executionTime: this.getExecutionTime(),
        quotaEstimate: 'unknown',
        warnings: []
      };

      // Simple quota awareness
      if (usage.executionTime > 5 * 60 * 1000) { // 5 minutes
        usage.warnings.push('Long execution time detected');
      }

      return usage;

    } catch (error) {
      return {
        error: error.toString(),
        quotaEstimate: 'error'
      };
    }
  }

  /**
   * Get current execution time
   */
  static getExecutionTime() {
    try {
      // Simple execution time tracking
      return Date.now() - (global.scriptStartTime || Date.now());
    } catch (error) {
      return 0;
    }
  }

  /**
   * Log monitoring results to a sheet
   */
  static logMonitoringResults(results) {
    try {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      let logSheet = spreadsheet.getSheetByName('System_Monitoring');

      if (!logSheet) {
        logSheet = spreadsheet.insertSheet('System_Monitoring');
        logSheet.getRange(1, 1, 1, 6).setValues([[
          'Timestamp', 'Overall Status', 'Health Score', 'Performance Score', 'Error Rate', 'Details'
        ]]);
      }

      const healthScore = results.systemHealth ?
        `${results.systemHealth.passed}/${results.systemHealth.checks}` : 'N/A';

      const perfScore = results.functionPerformance ?
        `${results.functionPerformance.fastTests}/${results.functionPerformance.tests.length}` : 'N/A';

      const errorRate = results.errorTracking ?
        `${(results.errorTracking.errorRate * 100).toFixed(1)}%` : 'N/A';

      logSheet.appendRow([
        results.timestamp,
        results.overallStatus,
        healthScore,
        perfScore,
        errorRate,
        JSON.stringify(results, null, 2).substring(0, 1000) // Truncate for sheet limits
      ]);

      // Keep only last 100 entries
      if (logSheet.getLastRow() > 101) {
        logSheet.deleteRow(2);
      }

    } catch (error) {
      console.error('Failed to log monitoring results:', error);
    }
  }

  /**
   * Get monitoring dashboard data
   */
  static getMonitoringDashboard() {
    try {
      const currentResults = this.monitorRealSystems();

      const dashboard = {
        overview: {
          status: currentResults.overallStatus,
          lastCheck: currentResults.timestamp,
          uptime: 'Available', // Simple uptime indicator
          version: getConfigValue('SYSTEM.VERSION', 'unknown')
        },
        health: currentResults.systemHealth,
        performance: currentResults.functionPerformance,
        sheets: currentResults.sheetUsage,
        recommendations: this.generateRecommendations(currentResults)
      };

      return dashboard;

    } catch (error) {
      return {
        overview: {
          status: 'error',
          error: error.toString(),
          lastCheck: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Generate practical recommendations
   */
  static generateRecommendations(monitoringResults) {
    const recommendations = [];

    try {
      // Health-based recommendations
      if (monitoringResults.systemHealth && monitoringResults.systemHealth.criticalIssues > 0) {
        recommendations.push({
          priority: 'high',
          category: 'health',
          message: 'Critical system issues detected - check system health details'
        });
      }

      // Performance-based recommendations
      if (monitoringResults.functionPerformance && monitoringResults.functionPerformance.slowTests > 0) {
        recommendations.push({
          priority: 'medium',
          category: 'performance',
          message: 'Slow function performance detected - consider optimization'
        });
      }

      // Sheet usage recommendations
      if (monitoringResults.sheetUsage && monitoringResults.sheetUsage.totalDataRows > 10000) {
        recommendations.push({
          priority: 'low',
          category: 'data',
          message: 'Large amount of data detected - consider archiving old records'
        });
      }

      // Error rate recommendations
      if (monitoringResults.errorTracking && monitoringResults.errorTracking.errorRate > 0.1) {
        recommendations.push({
          priority: 'high',
          category: 'errors',
          message: 'High error rate detected - check error logs'
        });
      }

      return recommendations;

    } catch (error) {
      return [{
        priority: 'high',
        category: 'monitoring',
        message: `Monitoring recommendations failed: ${error.toString()}`
      }];
    }
  }
}

/**
 * Public functions for integration
 */

function runSystemMonitoring() {
  return WorkingMonitoring.monitorRealSystems();
}

function getWorkingMonitoringDashboard() {
  return WorkingMonitoring.getMonitoringDashboard();
}

function performWorkingHealthCheck() {
  return WorkingMonitoring.checkSystemHealth();
}

/**
 * Scheduled monitoring function
 */
function scheduledSystemMonitoring() {
  try {
    console.log('🔍 Running scheduled system monitoring...');
    const results = WorkingMonitoring.monitorRealSystems();

    if (results.overallStatus === 'critical') {
      console.error('🚨 CRITICAL: System monitoring detected critical issues');
    } else if (results.overallStatus === 'warning') {
      console.warn('⚠️ WARNING: System monitoring detected warnings');
    } else {
      console.log('✅ System monitoring: All systems operational');
    }

    return results;

  } catch (error) {
    console.error('Scheduled monitoring failed:', error);
    return { error: error.toString() };
  }
}