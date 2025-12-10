/**
 * @fileoverview Enterprise Configuration Manager
 * @version 6.2.0
 * @description Secure, validated, enterprise-grade configuration management
 */

/**
 * Enterprise Configuration Manager with security, validation, and rollback
 */
class EnterpriseConfig {

  /**
   * Get webhook URL with security validation
   * @param {string} type - Webhook type (live_events, batch_content, etc.)
   * @returns {string} Validated webhook URL
   */
  static getWebhookUrl(type = 'default') {
    try {
      const properties = PropertiesService.getScriptProperties();
      const configKey = `MAKE.WEBHOOK_URL_${type.toUpperCase()}`;
      let url = properties.getProperty(configKey);

      // Fallback to default webhook URL if specific type not found
      if (!url && type !== 'default') {
        url = properties.getProperty('MAKE.WEBHOOK_URL');
      }

      if (!url) {
        throw new ConfigurationError(`No webhook URL configured for type: ${type}`);
      }

      // Security validation
      if (!this.isValidWebhookUrl(url)) {
        throw new SecurityError(`Invalid webhook URL format for type: ${type}`);
      }

      return url;

    } catch (error) {
      console.error(`Failed to get webhook URL for ${type}:`, error);
      throw error;
    }
  }

  /**
   * Validate webhook URL security
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid and secure
   */
  static isValidWebhookUrl(url) {
    if (!url || typeof url !== 'string') return false;

    // Must be HTTPS
    if (!url.startsWith('https://')) return false;

    // Must be a valid Make.com webhook
    const allowedDomains = [
      'hook.eu1.make.com',
      'hook.eu2.make.com',
      'hook.us1.make.com',
      'hook.us2.make.com'
    ];

    try {
      const urlObj = new URL(url);
      return allowedDomains.includes(urlObj.hostname);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get secure configuration value with validation
   * @param {string} key - Configuration key
   * @param {any} defaultValue - Default value if not found
   * @param {Object} options - Validation options
   * @returns {any} Configuration value
   */
  static getSecure(key, defaultValue = null, options = {}) {
    try {
      const properties = PropertiesService.getScriptProperties();
      let value = properties.getProperty(key) || defaultValue;

      // Type validation
      if (options.type) {
        value = this.validateType(value, options.type, key);
      }

      // Range validation for numbers
      if (options.min !== undefined && value < options.min) {
        throw new ValidationError(`${key} value ${value} below minimum ${options.min}`);
      }

      if (options.max !== undefined && value > options.max) {
        throw new ValidationError(`${key} value ${value} above maximum ${options.max}`);
      }

      // Pattern validation for strings
      if (options.pattern && !options.pattern.test(value)) {
        throw new ValidationError(`${key} value does not match required pattern`);
      }

      return value;

    } catch (error) {
      console.error(`Configuration error for key ${key}:`, error);

      if (options.required && !defaultValue) {
        throw new ConfigurationError(`Required configuration missing: ${key}`);
      }

      return defaultValue;
    }
  }

  /**
   * Validate configuration value type
   * @param {any} value - Value to validate
   * @param {string} expectedType - Expected type
   * @param {string} key - Configuration key for error messages
   * @returns {any} Validated and converted value
   */
  static validateType(value, expectedType, key) {
    switch (expectedType) {
      case 'string':
        return String(value);

      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          throw new ValidationError(`${key} must be a number, got: ${value}`);
        }
        return num;

      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (value === 'true') return true;
        if (value === 'false') return false;
        throw new ValidationError(`${key} must be a boolean, got: ${value}`);

      case 'url':
        try {
          new URL(value);
          return value;
        } catch (error) {
          throw new ValidationError(`${key} must be a valid URL, got: ${value}`);
        }

      case 'email':
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(value)) {
          throw new ValidationError(`${key} must be a valid email, got: ${value}`);
        }
        return value;

      default:
        return value;
    }
  }

  /**
   * Set configuration with validation and backup
   * @param {string} key - Configuration key
   * @param {any} value - Configuration value
   * @param {Object} options - Validation options
   */
  static setSecure(key, value, options = {}) {
    try {
      // Validate the new value
      const validatedValue = options.type ?
        this.validateType(value, options.type, key) : value;

      // Create backup before change
      const backup = this.createConfigBackup([key]);

      try {
        const properties = PropertiesService.getScriptProperties();
        properties.setProperty(key, validatedValue.toString());

        // Verify the change worked
        const retrieved = properties.getProperty(key);
        if (retrieved !== validatedValue.toString()) {
          throw new Error('Configuration verification failed');
        }

        console.log(`Configuration updated successfully: ${key}`);

      } catch (error) {
        // Rollback on failure
        this.restoreFromBackup(backup);
        throw error;
      }

    } catch (error) {
      console.error(`Failed to set configuration ${key}:`, error);
      throw error;
    }
  }

  /**
   * Create backup of specified configuration keys
   * @param {string[]} keys - Keys to backup
   * @returns {Object} Backup information
   */
  static createConfigBackup(keys = null) {
    try {
      const properties = PropertiesService.getScriptProperties();
      const allProps = properties.getProperties();

      // Backup only specified keys or all if none specified
      const backupData = {};
      if (keys) {
        keys.forEach(key => {
          if (allProps[key] !== undefined) {
            backupData[key] = allProps[key];
          }
        });
      } else {
        Object.assign(backupData, allProps);
      }

      const backupId = `config_backup_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const backupEntry = {
        id: backupId,
        timestamp: new Date().toISOString(),
        keys: keys || Object.keys(allProps),
        data: backupData
      };

      // Store backup
      properties.setProperty(`BACKUP_${backupId}`, JSON.stringify(backupEntry));

      // Clean old backups (keep last 10)
      this.cleanupOldBackups();

      console.log(`Configuration backup created: ${backupId}`);
      return backupEntry;

    } catch (error) {
      console.error('Failed to create configuration backup:', error);
      throw new BackupError('Configuration backup failed');
    }
  }

  /**
   * Restore configuration from backup
   * @param {Object} backup - Backup to restore from
   */
  static restoreFromBackup(backup) {
    try {
      const properties = PropertiesService.getScriptProperties();

      // Restore each backed up property
      Object.entries(backup.data).forEach(([key, value]) => {
        properties.setProperty(key, value);
      });

      console.log(`Configuration restored from backup: ${backup.id}`);

    } catch (error) {
      console.error('Failed to restore from backup:', error);
      throw new BackupError('Configuration restore failed');
    }
  }

  /**
   * Clean up old configuration backups
   */
  static cleanupOldBackups() {
    try {
      const properties = PropertiesService.getScriptProperties();
      const allProps = properties.getProperties();

      const backupKeys = Object.keys(allProps)
        .filter(key => key.startsWith('BACKUP_'))
        .sort(); // Chronological order due to timestamp in key

      // Keep only the last 10 backups
      if (backupKeys.length > 10) {
        const keysToDelete = backupKeys.slice(0, backupKeys.length - 10);
        keysToDelete.forEach(key => {
          properties.deleteProperty(key);
        });
        console.log(`Cleaned up ${keysToDelete.length} old configuration backups`);
      }

    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }

  /**
   * Validate entire system configuration
   * @returns {Object} Validation results
   */
  static validateSystemConfiguration() {
    const results = {
      valid: true,
      errors: [],
      warnings: [],
      checked: 0
    };

    try {
      const requiredConfigs = [
        { key: 'SYSTEM.VERSION', type: 'string', required: true },
        { key: 'SYSTEM.CLUB_NAME', type: 'string', required: true },
        { key: 'SYSTEM.SPREADSHEET_ID', type: 'string', required: true },
        { key: 'MAKE.WEBHOOK_URL', type: 'url', required: true },
        { key: 'SYSTEM.ENVIRONMENT', type: 'string', pattern: /^(development|staging|production)$/ }
      ];

      requiredConfigs.forEach(config => {
        results.checked++;

        try {
          const value = this.getSecure(config.key, null, config);

          if (config.required && !value) {
            results.errors.push(`Required configuration missing: ${config.key}`);
            results.valid = false;
          }

          // Special validation for webhook URLs
          if (config.key.includes('WEBHOOK_URL') && value && !this.isValidWebhookUrl(value)) {
            results.errors.push(`Invalid webhook URL format: ${config.key}`);
            results.valid = false;
          }

        } catch (error) {
          results.errors.push(`Configuration error for ${config.key}: ${error.message}`);
          results.valid = false;
        }
      });

      // Check for deprecated configurations
      const properties = PropertiesService.getScriptProperties();
      const allProps = properties.getProperties();

      Object.keys(allProps).forEach(key => {
        if (key.includes('_OLD') || key.includes('_DEPRECATED')) {
          results.warnings.push(`Deprecated configuration found: ${key}`);
        }
      });

      console.log(`System configuration validation completed: ${results.valid ? 'PASSED' : 'FAILED'}`);
      return results;

    } catch (error) {
      results.valid = false;
      results.errors.push(`Validation system error: ${error.message}`);
      return results;
    }
  }
}

/**
 * Configuration-related error classes
 */
class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

class SecurityError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SecurityError';
  }
}

class BackupError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BackupError';
  }
}

// Export for use in other modules
globalThis.EnterpriseConfig = EnterpriseConfig;
globalThis.ConfigurationError = ConfigurationError;
globalThis.ValidationError = ValidationError;
globalThis.SecurityError = SecurityError;
globalThis.BackupError = BackupError;