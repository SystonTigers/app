/**
 * @fileoverview Validates that required configuration, triggers, and properties
 * are in place before executing automation routines.
 */

/**
 * Validates Script Properties, Sheet configuration, and trigger health.
 * @return {{ok: boolean, timestamp: string, checks: Array<object>, warnings: Array<string>}}
 */
function validateEnvironment() {
  const timestamp = new Date().toISOString();
  const checks = [];
  const warnings = [];

  const scriptPropsService = PropertiesService.getScriptProperties();
  const scriptProps = scriptPropsService.getProperties();
  const requiredProps = ['SHEET_ID', 'ENV', 'SYSTEM_VERSION', 'WEBHOOK_MAKE_URL'];
  const optionalProps = ['CACHE_TTL_MINUTES', 'ALLOWED_TRIGGERS', 'VIDEO_DRIVE_ROOT_ID'];

  const missingRequiredProps = requiredProps.filter(function(key) {
    return !scriptProps[key];
  });
  const missingOptionalProps = optionalProps.filter(function(key) {
    return !scriptProps[key];
  });

  if (missingOptionalProps.length) {
    warnings.push('Optional properties missing: ' + missingOptionalProps.join(', '));
  }

  checks.push({
    name: 'Script Properties',
    status: missingRequiredProps.length ? 'FAIL' : 'PASS',
    details: {
      present: Object.keys(scriptProps).length,
      missing: missingRequiredProps
    }
  });

  checks.push(validateConfigSheet_(scriptProps));
  checks.push(validateTriggers_());
  checks.push(validateEnvironmentTag_(scriptProps));

  const ok = checks.every(function(check) {
    return check.status === 'PASS';
  });

  const report = {
    ok: ok,
    timestamp: timestamp,
    checks: checks,
    warnings: warnings
  };

  console.log('Environment validation report', report);
  return report;
}

function validateConfigSheet_(scriptProps) {
  if (!scriptProps.SHEET_ID) {
    return {
      name: 'Config Sheet',
      status: 'FAIL',
      details: { message: 'SHEET_ID Script Property not set.' }
    };
  }

  try {
    const spreadsheet = SpreadsheetApp.openById(scriptProps.SHEET_ID);
    const sheet = spreadsheet.getSheetByName('CONFIG');
    if (!sheet) {
      return {
        name: 'Config Sheet',
        status: 'FAIL',
        details: { message: 'CONFIG sheet tab not found.' }
      };
    }

    const values = sheet.getDataRange().getValues();
    if (!values.length) {
      return {
        name: 'Config Sheet',
        status: 'FAIL',
        details: { message: 'CONFIG sheet contains no data.' }
      };
    }

    const headerRow = values[0].map(function(value) {
      return String(value).trim().toLowerCase();
    });
    const keyColumnIndex = headerRow.indexOf('configuration key');
    const valueColumnIndex = headerRow.indexOf('value');

    if (keyColumnIndex === -1 || valueColumnIndex === -1) {
      return {
        name: 'Config Sheet',
        status: 'FAIL',
        details: { message: 'CONFIG sheet headers missing "Configuration Key" or "Value".' }
      };
    }

    const rows = values.slice(1).filter(function(row) {
      return row[keyColumnIndex] && row[valueColumnIndex];
    });
    const configMap = rows.reduce(function(acc, row) {
      acc[String(row[keyColumnIndex]).trim()] = String(row[valueColumnIndex]).trim();
      return acc;
    }, {});

    var requiredKeys = ['TEAM_NAME', 'LEAGUE_NAME', 'BADGE_URL', 'SEASON'];
    if (typeof CustomerInstaller !== 'undefined' && CustomerInstaller.getConfigKeys) {
      requiredKeys = CustomerInstaller.getConfigKeys().nonSecrets;
    }

    const missingConfigKeys = requiredKeys.filter(function(key) {
      return !configMap[key];
    });

    return {
      name: 'Config Sheet',
      status: missingConfigKeys.length ? 'FAIL' : 'PASS',
      details: {
        missingKeys: missingConfigKeys,
        populatedKeys: Object.keys(configMap).length
      }
    };
  } catch (error) {
    return {
      name: 'Config Sheet',
      status: 'FAIL',
      details: { message: error.message }
    };
  }
}

function validateTriggers_() {
  const expectedTriggers = ['runHealthCheck', 'runWeeklyJobs'];
  const triggers = ScriptApp.getProjectTriggers();
  const triggerNames = triggers.map(function(trigger) {
    return trigger.getHandlerFunction();
  });

  const missingTriggers = expectedTriggers.filter(function(name) {
    return triggerNames.indexOf(name) === -1;
  });

  const duplicateTriggers = expectedTriggers.filter(function(name) {
    var count = triggerNames.filter(function(triggerName) {
      return triggerName === name;
    }).length;
    return count > 1;
  });

  const status = missingTriggers.length ? 'FAIL' : 'PASS';

  return {
    name: 'Triggers',
    status: status,
    details: {
      total: triggers.length,
      missing: missingTriggers,
      duplicates: duplicateTriggers
    }
  };
}

function validateEnvironmentTag_(scriptProps) {
  var allowedEnvs = ['production', 'staging', 'development'];
  var envValue = scriptProps.ENV || '';
  if (!envValue) {
    return {
      name: 'Environment Tag',
      status: 'FAIL',
      details: { message: 'ENV Script Property not set.' }
    };
  }

  const normalizedEnv = envValue.toString().toLowerCase();
  if (allowedEnvs.indexOf(normalizedEnv) === -1) {
    return {
      name: 'Environment Tag',
      status: 'FAIL',
      details: {
        message: 'ENV must be one of production, staging, development.',
        current: envValue
      }
    };
  }

  return {
    name: 'Environment Tag',
    status: 'PASS',
    details: {
      env: normalizedEnv
    }
  };
}
