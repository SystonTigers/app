/**
 * @fileoverview Environment validation for production deployment
 * @version 1.0.0
 * @description Validates all required configurations, credentials, and dependencies
 *
 * Run this before deploying to production to ensure everything is configured correctly.
 */

/**
 * Main validation function - checks all environment requirements
 * @returns {Object} Validation results with status and errors
 */
function validateEnvironment() {
  Logger.log('🔍 Starting environment validation...');

  const results = {
    overall_status: 'PASS',
    timestamp: new Date().toISOString(),
    checks: [],
    errors: [],
    warnings: [],
    summary: {}
  };

  // Run all validation checks
  validateScriptProperties(results);
  validateSheetStructure(results);
  validateBackendConnectivity(results);
  validateWebhooks(results);
  validateTriggers(results);
  validateDependencies(results);
  validatePermissions(results);

  // Calculate summary
  results.summary = {
    total_checks: results.checks.length,
    passed: results.checks.filter(c => c.status === 'PASS').length,
    failed: results.checks.filter(c => c.status === 'FAIL').length,
    warnings: results.warnings.length
  };

  // Set overall status
  if (results.summary.failed > 0) {
    results.overall_status = 'FAIL';
  } else if (results.summary.warnings > 0) {
    results.overall_status = 'WARN';
  }

  // Log results
  logValidationResults(results);

  return results;
}

/**
 * Validate Script Properties are set
 */
function validateScriptProperties(results) {
  const requiredProps = [
    { key: 'BACKEND_API_URL', description: 'Backend API endpoint', example: 'https://syston-postbus.workers.dev' },
    { key: 'BACKEND_API_KEY', description: 'Backend API authentication key', sensitive: true },
    { key: 'TENANT_ID', description: 'Tenant identifier', example: 'syston-tigers' },
    { key: 'WEBHOOK_URL', description: 'Make.com webhook URL', sensitive: true },
    { key: 'YOUTUBE_CHANNEL_ID', description: 'YouTube channel ID', example: 'UCxxxxxx' }
  ];

  const optionalProps = [
    { key: 'YT_CLIENT_ID', description: 'YouTube OAuth client ID (for video uploads)' },
    { key: 'YT_CLIENT_SECRET', description: 'YouTube OAuth secret (for video uploads)', sensitive: true },
    { key: 'PRINTIFY_API_KEY', description: 'Printify API key (for store)', sensitive: true }
  ];

  Logger.log('\n📋 Checking Script Properties...');

  // Check required properties
  requiredProps.forEach(prop => {
    const value = PropertiesService.getScriptProperties().getProperty(prop.key);
    const check = {
      category: 'Script Properties',
      name: prop.key,
      description: prop.description,
      status: value ? 'PASS' : 'FAIL',
      message: value ? (prop.sensitive ? '✓ Set (hidden)' : `✓ Set: ${value}`) : '✗ Not set'
    };

    results.checks.push(check);

    if (!value) {
      results.errors.push({
        code: 'ERR_SCRIPT_300',
        property: prop.key,
        message: `Missing required property: ${prop.key}`,
        resolution: `Set via Project Settings → Script Properties`,
        example: prop.example || null
      });
    }

    Logger.log(`  ${check.status === 'PASS' ? '✓' : '✗'} ${prop.key}: ${check.message}`);
  });

  // Check optional properties (warnings only)
  optionalProps.forEach(prop => {
    const value = PropertiesService.getScriptProperties().getProperty(prop.key);
    if (!value) {
      results.warnings.push({
        property: prop.key,
        message: `Optional property not set: ${prop.key} - ${prop.description}`,
        impact: 'Some features may not work'
      });
      Logger.log(`  ⚠ ${prop.key}: Not set (optional)`);
    }
  });
}

/**
 * Validate Google Sheet structure
 */
function validateSheetStructure(results) {
  Logger.log('\n📊 Checking Sheet Structure...');

  const requiredSheets = [
    { name: 'Roster', required_columns: ['Name', 'Position', 'Number', 'DOB'] },
    { name: 'Fixtures', required_columns: ['Date', 'Opposition', 'Venue', 'Competition'] },
    { name: 'Results', required_columns: ['Date', 'Opposition', 'Score', 'Competition'] },
    { name: 'Quotes', required_columns: ['Quote', 'Author', 'Used'] },
    { name: 'Birthday Log', required_columns: ['Player', 'Date', 'Sent'] }
  ];

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  requiredSheets.forEach(sheetDef => {
    const sheet = ss.getSheetByName(sheetDef.name);
    const check = {
      category: 'Sheet Structure',
      name: sheetDef.name,
      status: sheet ? 'PASS' : 'FAIL',
      message: sheet ? '✓ Sheet exists' : '✗ Sheet missing'
    };

    if (sheet) {
      // Check columns
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const missingColumns = sheetDef.required_columns.filter(col => !headers.includes(col));

      if (missingColumns.length > 0) {
        check.status = 'FAIL';
        check.message = `✗ Missing columns: ${missingColumns.join(', ')}`;
        results.errors.push({
          code: 'ERR_SCRIPT_003',
          sheet: sheetDef.name,
          message: `Missing required columns in ${sheetDef.name}: ${missingColumns.join(', ')}`,
          resolution: 'Add missing columns to sheet'
        });
      }
    } else {
      results.errors.push({
        code: 'ERR_SCRIPT_300',
        sheet: sheetDef.name,
        message: `Missing required sheet: ${sheetDef.name}`,
        resolution: `Create sheet named "${sheetDef.name}" with columns: ${sheetDef.required_columns.join(', ')}`
      });
    }

    results.checks.push(check);
    Logger.log(`  ${check.status === 'PASS' ? '✓' : '✗'} ${sheetDef.name}: ${check.message}`);
  });
}

/**
 * Validate backend API connectivity
 */
function validateBackendConnectivity(results) {
  Logger.log('\n🌐 Checking Backend Connectivity...');

  const apiUrl = PropertiesService.getScriptProperties().getProperty('BACKEND_API_URL');
  const apiKey = PropertiesService.getScriptProperties().getProperty('BACKEND_API_KEY');

  if (!apiUrl) {
    results.checks.push({
      category: 'Backend',
      name: 'API Reachability',
      status: 'FAIL',
      message: '✗ No API URL configured'
    });
    return;
  }

  try {
    // Test health endpoint
    const healthUrl = `${apiUrl}/health`;
    const response = UrlFetchApp.fetch(healthUrl, {
      method: 'get',
      muteHttpExceptions: true,
      headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}
    });

    const status = response.getResponseCode();
    const check = {
      category: 'Backend',
      name: 'API Reachability',
      status: status === 200 ? 'PASS' : 'FAIL',
      message: status === 200 ? `✓ Backend reachable (${status})` : `✗ Backend returned ${status}`
    };

    results.checks.push(check);
    Logger.log(`  ${check.status === 'PASS' ? '✓' : '✗'} Backend API: ${check.message}`);

    if (status !== 200) {
      results.errors.push({
        code: 'ERR_SCRIPT_301',
        message: `Backend API returned status ${status}`,
        url: healthUrl,
        resolution: 'Verify backend is deployed and BACKEND_API_URL is correct'
      });
    }

  } catch (error) {
    results.checks.push({
      category: 'Backend',
      name: 'API Reachability',
      status: 'FAIL',
      message: `✗ Connection failed: ${error.message}`
    });

    results.errors.push({
      code: 'ERR_SCRIPT_301',
      message: `Cannot connect to backend: ${error.message}`,
      url: apiUrl,
      resolution: 'Check BACKEND_API_URL, verify backend deployed, check network'
    });

    Logger.log(`  ✗ Backend API: Connection failed - ${error.message}`);
  }
}

/**
 * Validate webhook connectivity
 */
function validateWebhooks(results) {
  Logger.log('\n🔗 Checking Webhook Connectivity...');

  const webhookUrl = PropertiesService.getScriptProperties().getProperty('WEBHOOK_URL');

  if (!webhookUrl) {
    results.checks.push({
      category: 'Webhooks',
      name: 'Make.com Webhook',
      status: 'FAIL',
      message: '✗ No webhook URL configured'
    });

    results.errors.push({
      code: 'ERR_SCRIPT_302',
      message: 'WEBHOOK_URL not set',
      resolution: 'Set WEBHOOK_URL in Script Properties with Make.com webhook'
    });

    return;
  }

  try {
    // Test webhook with ping payload
    const payload = {
      type: 'validation_test',
      timestamp: new Date().toISOString(),
      message: 'Environment validation test'
    };

    const response = UrlFetchApp.fetch(webhookUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const status = response.getResponseCode();
    const check = {
      category: 'Webhooks',
      name: 'Make.com Webhook',
      status: status === 200 ? 'PASS' : 'FAIL',
      message: status === 200 ? `✓ Webhook reachable (${status})` : `✗ Webhook returned ${status}`
    };

    results.checks.push(check);
    Logger.log(`  ${check.status === 'PASS' ? '✓' : '✗'} Make.com Webhook: ${check.message}`);

    if (status !== 200) {
      results.errors.push({
        code: 'ERR_SCRIPT_201',
        message: `Webhook returned status ${status}`,
        url: webhookUrl,
        resolution: 'Verify Make.com scenario is active and webhook URL is correct'
      });
    }

  } catch (error) {
    results.checks.push({
      category: 'Webhooks',
      name: 'Make.com Webhook',
      status: 'FAIL',
      message: `✗ Connection failed: ${error.message}`
    });

    results.errors.push({
      code: 'ERR_SCRIPT_201',
      message: `Cannot connect to webhook: ${error.message}`,
      url: webhookUrl,
      resolution: 'Check WEBHOOK_URL, verify Make.com scenario active'
    });

    Logger.log(`  ✗ Make.com Webhook: Connection failed - ${error.message}`);
  }
}

/**
 * Validate triggers are set up
 */
function validateTriggers(results) {
  Logger.log('\n⏰ Checking Triggers...');

  const requiredTriggers = [
    { functionName: 'runWeeklyScheduler', type: 'TIME_DRIVEN', description: 'Weekly content scheduler' },
    { functionName: 'runDailyBirthdayAutomation', type: 'TIME_DRIVEN', description: 'Daily birthday checks' }
  ];

  const triggers = ScriptApp.getProjectTriggers();

  requiredTriggers.forEach(triggerDef => {
    const exists = triggers.some(t =>
      t.getHandlerFunction() === triggerDef.functionName &&
      t.getEventType() === ScriptApp.EventType.CLOCK
    );

    const check = {
      category: 'Triggers',
      name: triggerDef.functionName,
      description: triggerDef.description,
      status: exists ? 'PASS' : 'FAIL',
      message: exists ? '✓ Trigger configured' : '✗ Trigger missing'
    };

    results.checks.push(check);
    Logger.log(`  ${check.status === 'PASS' ? '✓' : '✗'} ${triggerDef.functionName}: ${check.message}`);

    if (!exists) {
      results.warnings.push({
        trigger: triggerDef.functionName,
        message: `Trigger not configured: ${triggerDef.description}`,
        impact: 'Automated features will not run',
        resolution: 'Set up time-driven trigger in Apps Script UI'
      });
    }
  });
}

/**
 * Validate required dependencies and libraries
 */
function validateDependencies(results) {
  Logger.log('\n📦 Checking Dependencies...');

  // Check if key functions exist
  const requiredFunctions = [
    'runWeeklyScheduler',
    'runDailyBirthdayAutomation',
    'importHistoricalData',
    'exportVideoHighlights'
  ];

  requiredFunctions.forEach(funcName => {
    let exists = false;
    try {
      exists = typeof eval(funcName) === 'function';
    } catch (e) {
      exists = false;
    }

    const check = {
      category: 'Dependencies',
      name: funcName,
      status: exists ? 'PASS' : 'FAIL',
      message: exists ? '✓ Function available' : '✗ Function missing'
    };

    results.checks.push(check);
    Logger.log(`  ${check.status === 'PASS' ? '✓' : '✗'} ${funcName}: ${check.message}`);

    if (!exists) {
      results.errors.push({
        code: 'ERR_SCRIPT_300',
        message: `Required function missing: ${funcName}`,
        resolution: 'Verify all script files are deployed via clasp push'
      });
    }
  });
}

/**
 * Validate permissions and access
 */
function validatePermissions(results) {
  Logger.log('\n🔐 Checking Permissions...');

  try {
    // Test spreadsheet access
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    results.checks.push({
      category: 'Permissions',
      name: 'Spreadsheet Access',
      status: 'PASS',
      message: '✓ Can access spreadsheet'
    });
    Logger.log('  ✓ Spreadsheet Access: Granted');

  } catch (error) {
    results.checks.push({
      category: 'Permissions',
      name: 'Spreadsheet Access',
      status: 'FAIL',
      message: `✗ Cannot access spreadsheet: ${error.message}`
    });
    results.errors.push({
      code: 'ERR_SCRIPT_300',
      message: 'No spreadsheet access',
      resolution: 'Run script from spreadsheet-bound context'
    });
  }

  try {
    // Test URL fetch capability
    UrlFetchApp.fetch('https://www.google.com', { muteHttpExceptions: true });
    results.checks.push({
      category: 'Permissions',
      name: 'External Requests',
      status: 'PASS',
      message: '✓ Can make external requests'
    });
    Logger.log('  ✓ External Requests: Granted');

  } catch (error) {
    results.checks.push({
      category: 'Permissions',
      name: 'External Requests',
      status: 'FAIL',
      message: `✗ Cannot make external requests: ${error.message}`
    });
    results.errors.push({
      code: 'ERR_SCRIPT_300',
      message: 'Cannot make external requests',
      resolution: 'Grant UrlFetchApp permissions when prompted'
    });
  }
}

/**
 * Log validation results in a readable format
 */
function logValidationResults(results) {
  Logger.log('\n' + '='.repeat(60));
  Logger.log('📊 VALIDATION SUMMARY');
  Logger.log('='.repeat(60));
  Logger.log(`Overall Status: ${getStatusEmoji(results.overall_status)} ${results.overall_status}`);
  Logger.log(`Timestamp: ${results.timestamp}`);
  Logger.log(`Total Checks: ${results.summary.total_checks}`);
  Logger.log(`  ✓ Passed: ${results.summary.passed}`);
  Logger.log(`  ✗ Failed: ${results.summary.failed}`);
  Logger.log(`  ⚠ Warnings: ${results.summary.warnings}`);

  if (results.errors.length > 0) {
    Logger.log('\n❌ ERRORS:');
    results.errors.forEach((err, i) => {
      Logger.log(`\n${i + 1}. ${err.code || 'ERROR'}`);
      Logger.log(`   Message: ${err.message}`);
      if (err.resolution) Logger.log(`   Resolution: ${err.resolution}`);
      if (err.example) Logger.log(`   Example: ${err.example}`);
    });
  }

  if (results.warnings.length > 0) {
    Logger.log('\n⚠️  WARNINGS:');
    results.warnings.forEach((warn, i) => {
      Logger.log(`\n${i + 1}. ${warn.message}`);
      if (warn.impact) Logger.log(`   Impact: ${warn.impact}`);
      if (warn.resolution) Logger.log(`   Resolution: ${warn.resolution}`);
    });
  }

  Logger.log('\n' + '='.repeat(60));

  if (results.overall_status === 'PASS') {
    Logger.log('✅ Environment validation PASSED - Ready for production!');
  } else if (results.overall_status === 'WARN') {
    Logger.log('⚠️  Environment validation PASSED with warnings - Review warnings before production');
  } else {
    Logger.log('❌ Environment validation FAILED - Fix errors before deploying to production');
  }

  Logger.log('='.repeat(60));
}

/**
 * Get emoji for status
 */
function getStatusEmoji(status) {
  switch (status) {
    case 'PASS': return '✅';
    case 'WARN': return '⚠️';
    case 'FAIL': return '❌';
    default: return '❓';
  }
}

/**
 * Create a validation report in a new sheet
 */
function createValidationReport() {
  const results = validateEnvironment();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Create or clear report sheet
  let reportSheet = ss.getSheetByName('Validation Report');
  if (reportSheet) {
    reportSheet.clear();
  } else {
    reportSheet = ss.insertSheet('Validation Report');
  }

  // Write header
  reportSheet.getRange(1, 1, 1, 5).setValues([[
    'Category', 'Check', 'Status', 'Message', 'Description'
  ]]).setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');

  // Write checks
  const data = results.checks.map(check => [
    check.category,
    check.name,
    check.status,
    check.message,
    check.description || ''
  ]);

  if (data.length > 0) {
    reportSheet.getRange(2, 1, data.length, 5).setValues(data);
  }

  // Format based on status
  for (let i = 0; i < results.checks.length; i++) {
    const status = results.checks[i].status;
    const row = i + 2;
    const range = reportSheet.getRange(row, 1, 1, 5);

    if (status === 'PASS') {
      range.setBackground('#d4edda');
    } else if (status === 'FAIL') {
      range.setBackground('#f8d7da');
    } else if (status === 'WARN') {
      range.setBackground('#fff3cd');
    }
  }

  // Add summary
  const summaryRow = data.length + 3;
  reportSheet.getRange(summaryRow, 1, 1, 2).setValues([['Overall Status:', results.overall_status]]).setFontWeight('bold');
  reportSheet.getRange(summaryRow + 1, 1, 1, 2).setValues([['Total Checks:', results.summary.total_checks]]);
  reportSheet.getRange(summaryRow + 2, 1, 1, 2).setValues([['Passed:', results.summary.passed]]);
  reportSheet.getRange(summaryRow + 3, 1, 1, 2).setValues([['Failed:', results.summary.failed]]);
  reportSheet.getRange(summaryRow + 4, 1, 1, 2).setValues([['Warnings:', results.summary.warnings]]);
  reportSheet.getRange(summaryRow + 5, 1, 1, 2).setValues([['Timestamp:', results.timestamp]]);

  // Auto-resize columns
  reportSheet.autoResizeColumns(1, 5);

  Logger.log('✅ Validation report created in "Validation Report" sheet');
  SpreadsheetApp.getActiveSpreadsheet().toast('Validation report created!', 'Success', 5);

  return reportSheet;
}
