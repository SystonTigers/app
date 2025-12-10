/**
 * @fileoverview Simple Health Check for Football Automation System
 * @version 6.2.0
 * @description Practical system health monitoring
 */

/**
 * Simple Health Check System
 */
class HealthCheck {

  /**
   * Perform basic system health check
   */
  static performHealthCheck() {
    const results = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {},
      warnings: [],
      errors: []
    };

    try {
      // Check 1: Spreadsheet access
      results.checks.spreadsheet = this.checkSpreadsheetAccess();

      // Check 2: Essential sheets exist
      results.checks.sheets = this.checkRequiredSheets();

      // Check 3: Configuration loaded
      results.checks.config = this.checkConfiguration();

      // Check 4: Make.com webhook URL configured
      results.checks.webhooks = this.checkWebhookConfig();

      // Check 5: Script permissions
      results.checks.permissions = this.checkPermissions();

      // Determine overall status
      const hasErrors = Object.values(results.checks).some(check => check.status === 'error');
      const hasWarnings = Object.values(results.checks).some(check => check.status === 'warning');

      if (hasErrors) {
        results.status = 'error';
      } else if (hasWarnings) {
        results.status = 'warning';
      }

      // Collect warnings and errors
      Object.values(results.checks).forEach(check => {
        if (check.status === 'warning' && check.message) {
          results.warnings.push(check.message);
        }
        if (check.status === 'error' && check.message) {
          results.errors.push(check.message);
        }
      });

      console.log('Health check completed:', results.status);
      return results;

    } catch (error) {
      console.error('Health check failed:', error);
      results.status = 'error';
      results.errors.push(`Health check failed: ${error.toString()}`);
      return results;
    }
  }

  /**
   * Check spreadsheet access
   */
  static checkSpreadsheetAccess() {
    try {
      const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const spreadsheet = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
      const id = spreadsheet.getId();
      const name = spreadsheet.getName();

      return {
        status: 'healthy',
        message: `Spreadsheet accessible: ${name}`,
        details: { id: id, name: name }
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Cannot access spreadsheet: ${error.toString()}`
      };
    }
  }

  /**
   * Check required sheets exist
   */
  static checkRequiredSheets() {
    try {
      const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const spreadsheet = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
      const requiredSheets = ['Config', 'Live Match Updates', 'Fixtures', 'Players'];

      const existingSheets = spreadsheet.getSheets().map(sheet => sheet.getName());
      const missingSheets = requiredSheets.filter(name => !existingSheets.includes(name));

      if (missingSheets.length === 0) {
        return {
          status: 'healthy',
          message: `All required sheets found (${existingSheets.length} total)`,
          details: { existing: existingSheets }
        };
      } else {
        return {
          status: 'warning',
          message: `Missing sheets: ${missingSheets.join(', ')}`,
          details: { missing: missingSheets, existing: existingSheets }
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: `Cannot check sheets: ${error.toString()}`
      };
    }
  }

  /**
   * Check configuration
   */
  static checkConfiguration() {
    try {
      const dynamicConfig = getDynamicConfig();
      const staticSystem = getConfigValue('SYSTEM', {});
      const missingKeys = [];

      if (!staticSystem.CLUB_NAME) missingKeys.push('SYSTEM.CLUB_NAME');
      if (!staticSystem.VERSION) missingKeys.push('SYSTEM.VERSION');
      if (!dynamicConfig || !dynamicConfig.TEAM_NAME) missingKeys.push('DYNAMIC.TEAM_NAME');

      if (missingKeys.length === 0) {
        return {
          status: 'healthy',
          message: 'Configuration loaded successfully',
          details: {
            version: staticSystem.VERSION,
            clubName: staticSystem.CLUB_NAME,
            dynamicTeamName: dynamicConfig.TEAM_NAME
          }
        };
      } else {
        return {
          status: 'warning',
          message: `Missing config keys: ${missingKeys.join(', ')}`,
          details: { missing: missingKeys }
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: `Configuration error: ${error.toString()}`
      };
    }
  }

  /**
   * Check webhook configuration
   */
  static checkWebhookConfig() {
    try {
      const webhookUrl = getConfigValue('MAKE.WEBHOOK_URL_PROPERTY');

      if (webhookUrl && webhookUrl.startsWith('https://')) {
        return {
          status: 'healthy',
          message: 'Webhook URL configured',
          details: { configured: true }
        };
      } else {
        return {
          status: 'warning',
          message: 'Webhook URL not configured or invalid',
          details: { configured: false }
        };
      }
    } catch (error) {
      return {
        status: 'warning',
        message: `Webhook check failed: ${error.toString()}`
      };
    }
  }

  /**
   * Check script permissions
   */
  static checkPermissions() {
    try {
      // Test basic permissions
      const user = Session.getActiveUser().getEmail();
      const timeZone = Session.getScriptTimeZone();

      return {
        status: 'healthy',
        message: 'Script permissions OK',
        details: {
          user: user || 'anonymous',
          timeZone: timeZone
        }
      };
    } catch (error) {
      return {
        status: 'warning',
        message: `Permission issues: ${error.toString()}`
      };
    }
  }

  /**
   * Helper to get nested object values
   */
  static getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  /**
   * Quick health check for API endpoints
   */
  static quickHealthCheck() {
    try {
      const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const spreadsheet = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
      const dynamicConfig = getDynamicConfig();
      const version = getConfigValue('SYSTEM.VERSION', 'unknown');

      return {
        status: 'healthy',
        version: version,
        timestamp: new Date().toISOString(),
        config: {
          teamName: dynamicConfig?.TEAM_NAME || null
        }
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.toString(),
        timestamp: new Date().toISOString()
      };
    }
  }
}

/**
 * Public function for webapp health endpoint
 */
function doHealthCheck() {
  return HealthCheck.performHealthCheck();
}

// Disabled function removed - routing handled in main.gs

/**
 * Monitor system health and log warnings
 */
function monitorSystemHealth() {
  try {
    const health = HealthCheck.performHealthCheck();

    if (health.status === 'error') {
      console.error('System health check failed:', health.errors);
    } else if (health.status === 'warning') {
      console.warn('System health warnings:', health.warnings);
    } else {
      console.log('System health check passed');
    }

    return health;

  } catch (error) {
    console.error('Health monitoring failed:', error);
    return {
      status: 'error',
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}