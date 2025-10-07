/**
 * @fileoverview Trigger Management Service
 * @version 6.2.0
 * @description Prevents duplicate triggers and manages system triggers safely
 */

/**
 * Trigger Management Service
 * Enforces one trigger per function and prevents duplication
 */
class TriggerManager {

  // Whitelist of allowed trigger functions (prevents orphaned triggers)
  static getAllowedTriggers() {
    return [
      'runWeeklyScheduleAutomation',
      'runDailyBirthdayAutomation',
      'runMonthlyScheduledTasks',
      'scheduledHealthCheck',
      'cleanupExpiredCache',
      'processLiveEventQueue',
      'onEditTrigger',
      'processGoalOfTheMonth'
    ];
  }

  /**
   * Ensure exactly one trigger exists for a given function
   * Uses LockService to prevent concurrent modifications
   */
  static ensureSingleTrigger(functionName, triggerType, options = {}) {
    const lock = LockService.getScriptLock();

    try {
      // Acquire lock for 30 seconds
      if (!lock.tryLock(30000)) {
        throw new Error('Could not acquire lock for trigger management');
      }

      console.log(`🔧 Managing trigger for function: ${functionName}`);

      // Get all existing triggers for this function
      const existingTriggers = ScriptApp.getProjectTriggers()
        .filter(trigger => trigger.getHandlerFunction() === functionName);

      console.log(`📊 Found ${existingTriggers.length} existing triggers for ${functionName}`);

      // Remove excess triggers (keep only the first one if any exist)
      if (existingTriggers.length > 1) {
        console.log(`🗑️ Removing ${existingTriggers.length - 1} duplicate triggers`);
        existingTriggers.slice(1).forEach(trigger => {
          ScriptApp.deleteTrigger(trigger);
          console.log(`   Deleted duplicate trigger: ${trigger.getUniqueId()}`);
        });
      }

      // Create trigger if none exist
      if (existingTriggers.length === 0) {
        console.log(`➕ Creating new ${triggerType} trigger for ${functionName}`);
        this.createTrigger(functionName, triggerType, options);
      } else {
        console.log(`✅ Single trigger already exists for ${functionName}`);
      }

      return {
        success: true,
        functionName: functionName,
        action: existingTriggers.length === 0 ? 'created' : 'verified',
        removedDuplicates: Math.max(0, existingTriggers.length - 1)
      };

    } catch (error) {
      console.error(`❌ Failed to manage trigger for ${functionName}:`, error);
      return {
        success: false,
        functionName: functionName,
        error: error.toString()
      };
    } finally {
      lock.releaseLock();
    }
  }

  /**
   * Create a trigger based on type and options
   */
  static createTrigger(functionName, triggerType, options) {
    let trigger;

    switch (triggerType) {
      case 'time':
        if (options.everyMinutes) {
          trigger = ScriptApp.newTrigger(functionName)
            .timeBased()
            .everyMinutes(options.everyMinutes)
            .create();
        } else if (options.everyHours) {
          trigger = ScriptApp.newTrigger(functionName)
            .timeBased()
            .everyHours(options.everyHours)
            .create();
        } else if (options.everyDays) {
          trigger = ScriptApp.newTrigger(functionName)
            .timeBased()
            .everyDays(options.everyDays)
            .create();
        } else if (options.everyWeeks) {
          trigger = ScriptApp.newTrigger(functionName)
            .timeBased()
            .everyWeeks(options.everyWeeks)
            .create();
        } else if (options.cron) {
          // For specific times
          trigger = ScriptApp.newTrigger(functionName)
            .timeBased()
            .everyDays(1)
            .atHour(options.hour || 9)
            .nearMinute(options.minute || 0)
            .create();
        } else {
          // Default: every 5 minutes
          trigger = ScriptApp.newTrigger(functionName)
            .timeBased()
            .everyMinutes(5)
            .create();
        }
        break;

      case 'edit':
        const spreadsheetId = options.spreadsheetId ||
          PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');

        if (spreadsheetId) {
          trigger = ScriptApp.newTrigger(functionName)
            .forSpreadsheet(spreadsheetId)
            .onEdit()
            .create();
        } else {
          trigger = ScriptApp.newTrigger(functionName)
            .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
            .onEdit()
            .create();
        }
        break;

      case 'form':
        if (options.formId) {
          trigger = ScriptApp.newTrigger(functionName)
            .forForm(options.formId)
            .onFormSubmit()
            .create();
        }
        break;

      default:
        throw new Error(`Unknown trigger type: ${triggerType}`);
    }

    if (trigger) {
      console.log(`✅ Created ${triggerType} trigger: ${trigger.getUniqueId()}`);
      return trigger;
    } else {
      throw new Error(`Failed to create ${triggerType} trigger for ${functionName}`);
    }
  }

  /**
   * Remove all triggers for a specific function
   */
  static removeTriggers(functionName) {
    const triggers = ScriptApp.getProjectTriggers()
      .filter(trigger => trigger.getHandlerFunction() === functionName);

    triggers.forEach(trigger => {
      ScriptApp.deleteTrigger(trigger);
      console.log(`🗑️ Removed trigger: ${trigger.getUniqueId()}`);
    });

    return {
      success: true,
      functionName: functionName,
      removedCount: triggers.length
    };
  }

  /**
   * Reconcile all triggers - remove orphaned/unknown triggers
   * Keep only triggers for functions in the allowed list
   */
  static reconcileTriggers() {
    console.log('🔄 Starting trigger reconciliation...');

    const allTriggers = ScriptApp.getProjectTriggers();
    const results = {
      total: allTriggers.length,
      kept: 0,
      removed: 0,
      orphaned: []
    };

    allTriggers.forEach(trigger => {
      const functionName = trigger.getHandlerFunction();

      if (this.getAllowedTriggers().includes(functionName)) {
        results.kept++;
        console.log(`✅ Keeping trigger for allowed function: ${functionName}`);
      } else {
        results.removed++;
        results.orphaned.push(functionName);
        ScriptApp.deleteTrigger(trigger);
        console.log(`🗑️ Removed orphaned trigger for: ${functionName}`);
      }
    });

    console.log(`📊 Reconciliation complete: ${results.kept} kept, ${results.removed} removed`);

    if (results.orphaned.length > 0) {
      console.log(`🧹 Removed orphaned triggers for: ${results.orphaned.join(', ')}`);
    }

    return results;
  }

  /**
   * Install all standard system triggers
   */
  static installSystemTriggers() {
    console.log('🚀 Installing standard system triggers...');

    const triggerConfigs = [
      {
        function: 'runWeeklyScheduleAutomation',
        type: 'time',
        options: { everyDays: 1, hour: 9, minute: 0 }, // Daily at 9 AM
        description: 'Weekly content automation'
      },
      {
        function: 'runMonthlyScheduledTasks',
        type: 'time',
        options: { everyDays: 1, hour: 10, minute: 0 }, // Daily at 10 AM
        description: 'Monthly tasks automation'
      },
      {
        function: 'scheduledHealthCheck',
        type: 'time',
        options: { everyHours: 1 }, // Hourly health checks
        description: 'System health monitoring'
      },
      {
        function: 'cleanupExpiredCache',
        type: 'time',
        options: { everyHours: 6 }, // Cache cleanup every 6 hours
        description: 'Cache maintenance'
      },
      {
        function: 'processLiveEventQueue',
        type: 'time',
        options: { everyMinutes: 1 }, // Process events every minute
        description: 'Live event processing'
      },
      {
        function: 'onEditTrigger',
        type: 'edit',
        options: {}, // Will use spreadsheet ID from properties
        description: 'Sheet edit detection'
      }
    ];

    const results = [];

    triggerConfigs.forEach(config => {
      console.log(`🔧 Installing trigger: ${config.description}`);
      const result = this.ensureSingleTrigger(config.function, config.type, config.options);
      result.description = config.description;
      results.push(result);
    });

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    console.log(`📊 Trigger installation complete: ${successCount} successful, ${failCount} failed`);

    return {
      success: failCount === 0,
      results: results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failCount
      }
    };
  }

  /**
   * Get current trigger status
   */
  static getTriggerStatus() {
    const allTriggers = ScriptApp.getProjectTriggers();
    const triggerInfo = {};

    allTriggers.forEach(trigger => {
      const functionName = trigger.getHandlerFunction();

      if (!triggerInfo[functionName]) {
        triggerInfo[functionName] = {
          count: 0,
          triggers: []
        };
      }

      triggerInfo[functionName].count++;
      triggerInfo[functionName].triggers.push({
        id: trigger.getUniqueId(),
        type: this.getTriggerTypeString(trigger),
        source: this.getTriggerSourceString(trigger)
      });
    });

    // Check for problems
    const problems = [];
    const duplicates = [];

    Object.entries(triggerInfo).forEach(([functionName, info]) => {
      if (info.count > 1) {
        duplicates.push(functionName);
        problems.push(`${functionName} has ${info.count} duplicate triggers`);
      }

      if (!this.getAllowedTriggers().includes(functionName)) {
        problems.push(`${functionName} is not in allowed triggers list`);
      }
    });

    return {
      totalTriggers: allTriggers.length,
      functions: Object.keys(triggerInfo).length,
      triggerInfo: triggerInfo,
      problems: problems,
      duplicates: duplicates,
      needsReconciliation: problems.length > 0
    };
  }

  /**
   * Helper: Get trigger type as string
   */
  static getTriggerTypeString(trigger) {
    if (trigger.getEventType() === ScriptApp.EventType.CLOCK) {
      return 'time-based';
    } else if (trigger.getEventType() === ScriptApp.EventType.ON_EDIT) {
      return 'edit';
    } else if (trigger.getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT) {
      return 'form-submit';
    } else {
      return 'unknown';
    }
  }

  /**
   * Helper: Get trigger source as string
   */
  static getTriggerSourceString(trigger) {
    try {
      if (trigger.getTriggerSource() === ScriptApp.TriggerSource.SPREADSHEETS) {
        return 'spreadsheet';
      } else if (trigger.getTriggerSource() === ScriptApp.TriggerSource.FORMS) {
        return 'form';
      } else if (trigger.getTriggerSource() === ScriptApp.TriggerSource.CLOCK) {
        return 'clock';
      }
    } catch (e) {
      // Some trigger types don't have sources
    }
    return 'system';
  }
}

// Export for global use
globalThis.TriggerManager = TriggerManager;

/**
 * Menu functions for easy access
 */

function installAllTriggers() {
  return TriggerManager.installSystemTriggers();
}

function reconcileAllTriggers() {
  return TriggerManager.reconcileTriggers();
}

function checkTriggerStatus() {
  const status = TriggerManager.getTriggerStatus();
  console.log('📊 Trigger Status:', status);
  return status;
}

function removeDuplicateTriggers() {
  const status = TriggerManager.getTriggerStatus();
  const results = [];

  status.duplicates.forEach(functionName => {
    const result = TriggerManager.ensureSingleTrigger(functionName, 'time');
    results.push(result);
  });

  console.log(`🧹 Removed duplicates for ${status.duplicates.length} functions`);
  return results;
}