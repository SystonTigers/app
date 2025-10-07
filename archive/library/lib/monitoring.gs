/**
 * @fileoverview System monitoring and health checks for SystonAutomationLib
 * @version 1.0.0
 * @description Health monitoring, system status, and diagnostics
 */

/**
 * Perform comprehensive system health check
 * @return {Object} Health check results
 */
function SA_health_() {
  const startTime = Date.now();

  try {
    const ss = SpreadsheetApp.getActive();
    const results = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      libVersion: LIB_VERSION,
      checks: {},
      warnings: [],
      errors: [],
      performance: {}
    };

    // Check 1: Spreadsheet access
    results.checks.spreadsheet = SA_checkSpreadsheetAccess_();

    // Check 2: Required sheets
    results.checks.sheets = SA_checkRequiredSheets_();

    // Check 3: Configuration
    results.checks.config = SA_checkConfiguration_();

    // Check 4: Triggers
    results.checks.triggers = SA_checkTriggers_();

    // Check 5: Privacy system
    results.checks.privacy = SA_checkPrivacySystem_();

    // Determine overall status
    const checkResults = Object.values(results.checks);
    const hasErrors = checkResults.some(check => check.status === 'ERROR');
    const hasWarnings = checkResults.some(check => check.status === 'WARN');

    if (hasErrors) {
      results.status = 'FAIL';
    } else if (hasWarnings) {
      results.status = 'WARN';
    }

    // Collect warnings and errors
    checkResults.forEach(check => {
      if (check.status === 'WARN' && check.message) {
        results.warnings.push(check.message);
      }
      if (check.status === 'ERROR' && check.message) {
        results.errors.push(check.message);
      }
    });

    // Performance metrics
    results.performance.healthCheckTime = Date.now() - startTime;
    results.performance.lastUpdate = new Date().toISOString();

    SA_log_('INFO', 'Health check completed', {
      status: results.status,
      checkCount: Object.keys(results.checks).length,
      duration: results.performance.healthCheckTime
    });

    return results;

  } catch (error) {
    SA_log_('ERROR', 'Health check failed', { error: error.toString() });
    return {
      status: 'FAIL',
      timestamp: new Date().toISOString(),
      error: error.toString(),
      performance: { healthCheckTime: Date.now() - startTime }
    };
  }
}

/**
 * Check spreadsheet accessibility
 * @return {Object} Check result
 * @private
 */
function SA_checkSpreadsheetAccess_() {
  try {
    const ss = SpreadsheetApp.getActive();
    const id = ss.getId();
    const name = ss.getName();

    return {
      status: 'OK',
      message: `Spreadsheet accessible: ${name}`,
      details: { id: id.substring(0, 8) + '...', name: name }
    };
  } catch (error) {
    return {
      status: 'ERROR',
      message: `Cannot access spreadsheet: ${error.toString()}`
    };
  }
}

/**
 * Check required sheets exist
 * @return {Object} Check result
 * @private
 */
function SA_checkRequiredSheets_() {
  try {
    const ss = SpreadsheetApp.getActive();
    const required = [
      'Config', 'Player_Consents', 'Privacy_Requests', 'Data_Processing_Log',
      'Consent_Audit_Trail', 'Live_Match_Updates', 'Fixtures', 'Players', 'System_Log'
    ];

    const existing = ss.getSheets().map(sheet => sheet.getName());
    const missing = required.filter(name => !existing.includes(name));

    if (missing.length === 0) {
      return {
        status: 'OK',
        message: `All required sheets found (${existing.length} total)`,
        details: { existing: existing, required: required.length }
      };
    } else {
      return {
        status: 'WARN',
        message: `Missing sheets: ${missing.join(', ')}`,
        details: { missing: missing, existing: existing }
      };
    }
  } catch (error) {
    return {
      status: 'ERROR',
      message: `Cannot check sheets: ${error.toString()}`
    };
  }
}

/**
 * Check configuration status
 * @return {Object} Check result
 * @private
 */
function SA_checkConfiguration_() {
  try {
    const cfg = SA_cfg_();
    const required = ['TEAM_NAME', 'PRIMARY_COLOR', 'SECONDARY_COLOR', 'TIMEZONE'];

    const missing = required.filter(key => !cfg[key] || cfg[key].trim() === '');

    if (missing.length === 0) {
      return {
        status: 'OK',
        message: 'Configuration complete',
        details: {
          teamName: cfg.TEAM_NAME,
          hasWebhooks: !!(cfg.MAKE_WEBHOOK_RESULTS || cfg.MAKE_WEBHOOK_GOALS)
        }
      };
    } else {
      return {
        status: 'ERROR',
        message: `Missing required config: ${missing.join(', ')}`,
        details: { missing: missing }
      };
    }
  } catch (error) {
    return {
      status: 'ERROR',
      message: `Configuration error: ${error.toString()}`
    };
  }
}

/**
 * Check installed triggers
 * @return {Object} Check result
 * @private
 */
function SA_checkTriggers_() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    const functions = triggers.map(t => t.getHandlerFunction());
    const required = ['SA_hourlyRefresh', 'SA_onEditHandler'];
    const missing = required.filter(fn => !functions.includes(fn));

    if (missing.length === 0) {
      return {
        status: 'OK',
        message: `All triggers installed (${triggers.length} total)`,
        details: { installed: functions }
      };
    } else {
      return {
        status: 'WARN',
        message: `Missing triggers: ${missing.join(', ')}`,
        details: { missing: missing, installed: functions }
      };
    }
  } catch (error) {
    return {
      status: 'ERROR',
      message: `Cannot check triggers: ${error.toString()}`
    };
  }
}

/**
 * Check privacy system status
 * @return {Object} Check result
 * @private
 */
function SA_checkPrivacySystem_() {
  try {
    const ss = SpreadsheetApp.getActive();
    const consentSheet = ss.getSheetByName('Player_Consents');

    if (!consentSheet) {
      return {
        status: 'WARN',
        message: 'Privacy system not configured (missing Player_Consents sheet)'
      };
    }

    const rowCount = consentSheet.getLastRow();
    const hasData = rowCount > 1;

    return {
      status: 'OK',
      message: hasData ?
        `Privacy system active (${rowCount - 1} consent records)` :
        'Privacy system ready (no consent records yet)',
      details: { consentRecords: Math.max(0, rowCount - 1) }
    };

  } catch (error) {
    return {
      status: 'ERROR',
      message: `Privacy system error: ${error.toString()}`
    };
  }
}

/**
 * Get system metrics for monitoring dashboard
 * @return {Object} System metrics
 */
function SA_getMetrics_() {
  try {
    const ss = SpreadsheetApp.getActive();
    const startTime = Date.now();

    const metrics = {
      timestamp: new Date().toISOString(),
      spreadsheet: {
        name: ss.getName(),
        sheetCount: ss.getSheets().length,
        lastModified: ss.getLastUpdated()
      },
      sheets: {},
      performance: {
        queryTime: 0
      }
    };

    // Get sheet sizes
    ss.getSheets().forEach(sheet => {
      const name = sheet.getName();
      metrics.sheets[name] = {
        rows: sheet.getLastRow(),
        columns: sheet.getLastColumn(),
        lastModified: sheet.getLastUpdated()
      };
    });

    metrics.performance.queryTime = Date.now() - startTime;

    return metrics;

  } catch (error) {
    return {
      timestamp: new Date().toISOString(),
      error: error.toString()
    };
  }
}

/**
 * Run performance benchmarks
 * @return {Object} Performance results
 */
function SA_runBenchmarks_() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: []
  };

  try {
    // Test 1: Configuration loading
    const configStart = Date.now();
    const cfg = SA_cfg_();
    results.tests.push({
      name: 'config_load',
      duration: Date.now() - configStart,
      status: 'OK'
    });

    // Test 2: Sheet access
    const sheetStart = Date.now();
    const ss = SpreadsheetApp.getActive();
    const sheets = ss.getSheets();
    results.tests.push({
      name: 'sheet_access',
      duration: Date.now() - sheetStart,
      status: 'OK',
      details: { sheetCount: sheets.length }
    });

    // Test 3: Privacy check
    const privacyStart = Date.now();
    SA_canPublishPlayer_('test_player');
    results.tests.push({
      name: 'privacy_check',
      duration: Date.now() - privacyStart,
      status: 'OK'
    });

    // Calculate averages
    results.summary = {
      totalTests: results.tests.length,
      averageDuration: results.tests.reduce((sum, test) => sum + test.duration, 0) / results.tests.length,
      allPassed: results.tests.every(test => test.status === 'OK')
    };

  } catch (error) {
    results.error = error.toString();
  }

  return results;
}