/**
 * Comprehensive Feature Toggle System
 * Advanced feature flag management with user permissions, A/B testing, and rollout control
 * @version 6.2.0
 * @author Claude Code Assistant
 */

class FeatureToggleSystem {
  static getToggleTypes() {
    return {
      BOOLEAN: 'boolean',           // Simple on/off
      PERCENTAGE: 'percentage',     // Rollout percentage (0-100)
      USER_LIST: 'user_list',      // Specific user allowlist
      TIME_WINDOW: 'time_window',   // Active during specific times
      AB_TEST: 'ab_test',          // A/B testing variant
      CONDITIONAL: 'conditional'    // Complex condition-based
    };
  }

  static getRolloutStrategies() {
    return {
      INSTANT: 'instant',           // Immediate activation
      GRADUAL: 'gradual',          // Slow percentage increase
      CANARY: 'canary',            // Test with small group first
      BLUE_GREEN: 'blue_green',    // Switch between versions
      SCHEDULED: 'scheduled'        // Activate at specific time
    };
  }

  static getEnvironments() {
    return {
      DEVELOPMENT: 'development',
      STAGING: 'staging',
      PRODUCTION: 'production'
    };
  }

  /**
   * Initialize feature toggle system with default features
   */
  static initializeSystem() {
    const defaultFeatures = this.getDefaultFeatures();

    defaultFeatures.forEach(feature => {
      this.createFeatureToggle(feature);
    });

    // Set up monitoring
    this.initializeMonitoring();

    return { success: true, featuresInitialized: defaultFeatures.length };
  }

  /**
   * Gets default feature set for football automation system
   */
  static getDefaultFeatures() {
    return [
      // Core Match Features
      {
        key: 'live_match_processing',
        name: 'Live Match Event Processing',
        description: 'Real-time processing of goals, cards, substitutions during matches',
        type: this.getToggleTypes().BOOLEAN,
        category: 'core',
        defaultValue: true,
        environment: this.getEnvironments().PRODUCTION,
        permissions: ['admin', 'match_official'],
        dependencies: [],
        killSwitch: true
      },

      // Social Media Integration
      {
        key: 'make_webhooks',
        name: 'Make.com Webhook Integration',
        description: 'Send events to Make.com for social media automation',
        type: this.getToggleTypes().PERCENTAGE,
        category: 'integration',
        defaultValue: 100,
        environment: this.getEnvironments().PRODUCTION,
        permissions: ['admin'],
        dependencies: ['live_match_processing'],
        killSwitch: true
      },

      {
        key: 'social_media_posting',
        name: 'Automated Social Media Posts',
        description: 'Automatic posting to Facebook, Twitter, Instagram',
        type: this.getToggleTypes().BOOLEAN,
        category: 'social',
        defaultValue: true,
        environment: this.getEnvironments().PRODUCTION,
        permissions: ['admin', 'social_manager'],
        dependencies: ['make_webhooks'],
        killSwitch: true
      },

      // Video Processing
      {
        key: 'video_clip_generation',
        name: 'Video Clip Generation',
        description: 'Create highlight clips from match events',
        type: this.getToggleTypes().BOOLEAN,
        category: 'video',
        defaultValue: false,
        environment: this.getEnvironments().PRODUCTION,
        permissions: ['admin', 'video_manager'],
        dependencies: ['live_match_processing'],
        killSwitch: false
      },

      {
        key: 'highlights_bot_integration',
        name: 'Highlights Bot Integration',
        description: 'External Python highlights bot for professional video editing',
        type: this.getToggleTypes().BOOLEAN,
        category: 'video',
        defaultValue: false,
        environment: this.getEnvironments().PRODUCTION,
        permissions: ['admin'],
        dependencies: ['video_clip_generation'],
        killSwitch: false
      },

      // Analytics & Tracking
      {
        key: 'player_statistics_tracking',
        name: 'Player Statistics Tracking',
        description: 'Track goals, assists, minutes, cards for all players',
        type: this.getToggleTypes().BOOLEAN,
        category: 'analytics',
        defaultValue: true,
        environment: this.getEnvironments().PRODUCTION,
        permissions: ['admin', 'coach', 'match_official'],
        dependencies: [],
        killSwitch: false
      },

      {
        key: 'advanced_analytics',
        name: 'Advanced Analytics',
        description: 'Heat maps, possession data, xG calculations',
        type: this.getToggleTypes().PERCENTAGE,
        category: 'analytics',
        defaultValue: 0,
        environment: this.getEnvironments().DEVELOPMENT,
        permissions: ['admin'],
        dependencies: ['player_statistics_tracking'],
        killSwitch: false
      },

      // Privacy & Compliance
      {
        key: 'consent_gate_active',
        name: 'ConsentGate Privacy System',
        description: 'GDPR compliance system blocking posts for minors without consent',
        type: this.getToggleTypes().BOOLEAN,
        category: 'privacy',
        defaultValue: true,
        environment: this.getEnvironments().PRODUCTION,
        permissions: ['admin'],
        dependencies: [],
        killSwitch: true
      },

      {
        key: 'gdpr_audit_logging',
        name: 'GDPR Audit Logging',
        description: 'Comprehensive audit trail for data processing activities',
        type: this.getToggleTypes().BOOLEAN,
        category: 'privacy',
        defaultValue: true,
        environment: this.getEnvironments().PRODUCTION,
        permissions: ['admin', 'data_protection'],
        dependencies: ['consent_gate_active'],
        killSwitch: false
      },

      // Performance Features
      {
        key: 'multi_tier_caching',
        name: 'Multi-Tier Caching System',
        description: 'Advanced caching for improved performance',
        type: this.getToggleTypes().BOOLEAN,
        category: 'performance',
        defaultValue: true,
        environment: this.getEnvironments().PRODUCTION,
        permissions: ['admin'],
        dependencies: [],
        killSwitch: false
      },

      {
        key: 'performance_monitoring',
        name: 'Performance Monitoring',
        description: 'Real-time monitoring of system performance and alerts',
        type: this.getToggleTypes().BOOLEAN,
        category: 'monitoring',
        defaultValue: true,
        environment: this.getEnvironments().PRODUCTION,
        permissions: ['admin'],
        dependencies: [],
        killSwitch: false
      },

      // Experimental Features
      {
        key: 'ai_content_generation',
        name: 'AI Content Generation',
        description: 'GPT-powered match reports and social content',
        type: this.getToggleTypes().PERCENTAGE,
        category: 'experimental',
        defaultValue: 0,
        environment: this.getEnvironments().DEVELOPMENT,
        permissions: ['admin'],
        dependencies: ['social_media_posting'],
        killSwitch: true
      },

      {
        key: 'xbotgo_scoreboard',
        name: 'XbotGo Scoreboard Integration',
        description: 'Live scoreboard updates via XbotGo API',
        type: this.getToggleTypes().BOOLEAN,
        category: 'hardware',
        defaultValue: false,
        environment: this.getEnvironments().PRODUCTION,
        permissions: ['admin', 'match_official'],
        dependencies: ['live_match_processing'],
        killSwitch: false
      },

      // Weekly Content
      {
        key: 'weekly_content_scheduler',
        name: 'Weekly Content Scheduler',
        description: 'Automated Monday-Sunday content calendar',
        type: this.getToggleTypes().BOOLEAN,
        category: 'content',
        defaultValue: true,
        environment: this.getEnvironments().PRODUCTION,
        permissions: ['admin', 'content_manager'],
        dependencies: ['make_webhooks'],
        killSwitch: false
      },

      {
        key: 'batch_fixture_posting',
        name: 'Batch Fixture Posting',
        description: 'Weekly and monthly fixture/result summaries',
        type: this.getToggleTypes().BOOLEAN,
        category: 'content',
        defaultValue: true,
        environment: this.getEnvironments().PRODUCTION,
        permissions: ['admin', 'content_manager'],
        dependencies: ['weekly_content_scheduler'],
        killSwitch: false
      }
    ];
  }

  /**
   * Creates a new feature toggle
   */
  static createFeatureToggle(featureConfig) {
    try {
      const feature = {
        ...featureConfig,
        id: Utilities.getUuid(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: Session.getActiveUser().getEmail(),
        version: 1,
        status: 'active',
        rolloutStrategy: featureConfig.rolloutStrategy || this.getRolloutStrategies().INSTANT,
        rolloutStarted: null,
        rolloutCompleted: null,
        metrics: {
          evaluations: 0,
          activations: 0,
          errors: 0
        }
      };

      this.storeFeatureToggle(feature);
      this.auditFeatureAction(feature.key, 'created', feature);

      return { success: true, featureId: feature.id };

    } catch (error) {
      console.error('Failed to create feature toggle:', error);
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Evaluates if a feature is enabled for current context
   */
  static isFeatureEnabled(featureKey, context = {}) {
    try {
      const feature = this.getFeatureToggle(featureKey);

      if (!feature) {
        console.warn(`Feature toggle not found: ${featureKey}`);
        return false;
      }

      // Increment evaluation metric
      this.incrementMetric(featureKey, 'evaluations');

      // Check dependencies first
      if (!this.checkDependencies(feature, context)) {
        return false;
      }

      // Evaluate based on toggle type
      const enabled = this.evaluateFeature(feature, context);

      if (enabled) {
        this.incrementMetric(featureKey, 'activations');
      }

      return enabled;

    } catch (error) {
      console.error(`Error evaluating feature ${featureKey}:`, error);
      this.incrementMetric(featureKey, 'errors');
      return false;
    }
  }

  /**
   * Evaluates feature based on its type and configuration
   */
  static evaluateFeature(feature, context) {
    switch (feature.type) {
      case this.getToggleTypes().BOOLEAN:
        return this.evaluateBooleanToggle(feature, context);

      case this.getToggleTypes().PERCENTAGE:
        return this.evaluatePercentageToggle(feature, context);

      case this.getToggleTypes().USER_LIST:
        return this.evaluateUserListToggle(feature, context);

      case this.getToggleTypes().TIME_WINDOW:
        return this.evaluateTimeWindowToggle(feature, context);

      case this.getToggleTypes().AB_TEST:
        return this.evaluateABTestToggle(feature, context);

      case this.getToggleTypes().CONDITIONAL:
        return this.evaluateConditionalToggle(feature, context);

      default:
        console.warn(`Unknown toggle type: ${feature.type}`);
        return false;
    }
  }

  /**
   * Simple boolean toggle evaluation
   */
  static evaluateBooleanToggle(feature, context) {
    return Boolean(feature.defaultValue);
  }

  /**
   * Percentage-based rollout evaluation
   */
  static evaluatePercentageToggle(feature, context) {
    const percentage = feature.defaultValue || 0;
    const userId = context.userId || Session.getActiveUser().getEmail();

    // Use consistent hash for user to ensure same user always gets same result
    const hash = this.generateUserHash(userId + feature.key);
    const userPercentile = hash % 100;

    return userPercentile < percentage;
  }

  /**
   * User allowlist evaluation
   */
  static evaluateUserListToggle(feature, context) {
    const userId = context.userId || Session.getActiveUser().getEmail();
    const allowedUsers = feature.allowedUsers || [];

    return allowedUsers.includes(userId);
  }

  /**
   * Time window evaluation
   */
  static evaluateTimeWindowToggle(feature, context) {
    const now = new Date();
    const startTime = feature.timeWindow?.start ? new Date(feature.timeWindow.start) : null;
    const endTime = feature.timeWindow?.end ? new Date(feature.timeWindow.end) : null;

    if (startTime && now < startTime) return false;
    if (endTime && now > endTime) return false;

    return true;
  }

  /**
   * A/B test evaluation
   */
  static evaluateABTestToggle(feature, context) {
    const userId = context.userId || Session.getActiveUser().getEmail();
    const hash = this.generateUserHash(userId + feature.key);
    const variant = hash % 2 === 0 ? 'A' : 'B';

    // Store variant for consistent experience
    this.storeUserVariant(feature.key, userId, variant);

    return variant === 'A'; // Return true for variant A
  }

  /**
   * Complex conditional evaluation
   */
  static evaluateConditionalToggle(feature, context) {
    try {
      const condition = feature.condition;
      if (!condition) return false;

      // Simple condition evaluation (can be extended)
      return this.evaluateCondition(condition, context);

    } catch (error) {
      console.error('Conditional evaluation failed:', error);
      return false;
    }
  }

  /**
   * Checks if feature dependencies are satisfied
   */
  static checkDependencies(feature, context) {
    if (!feature.dependencies || feature.dependencies.length === 0) {
      return true;
    }

    return feature.dependencies.every(dep => {
      return this.isFeatureEnabled(dep, context);
    });
  }

  /**
   * Updates feature toggle configuration
   */
  static updateFeatureToggle(featureKey, updates) {
    try {
      const feature = this.getFeatureToggle(featureKey);
      if (!feature) {
        return { success: false, error: 'Feature not found' };
      }

      const updatedFeature = {
        ...feature,
        ...updates,
        updatedAt: new Date().toISOString(),
        updatedBy: Session.getActiveUser().getEmail(),
        version: (feature.version || 1) + 1
      };

      this.storeFeatureToggle(updatedFeature);
      this.auditFeatureAction(featureKey, 'updated', updates);

      return { success: true, feature: updatedFeature };

    } catch (error) {
      console.error('Failed to update feature toggle:', error);
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Performs gradual rollout of a feature
   */
  static startGradualRollout(featureKey, options = {}) {
    const {
      startPercentage = 10,
      endPercentage = 100,
      incrementStep = 10,
      incrementInterval = 'hourly' // hourly, daily, weekly
    } = options;

    try {
      const feature = this.getFeatureToggle(featureKey);
      if (!feature) {
        return { success: false, error: 'Feature not found' };
      }

      // Update feature for gradual rollout
      const rolloutConfig = {
        type: this.getToggleTypes().PERCENTAGE,
        defaultValue: startPercentage,
        rolloutStrategy: this.getRolloutStrategies().GRADUAL,
        rolloutConfig: {
          startPercentage,
          endPercentage,
          incrementStep,
          incrementInterval,
          currentPercentage: startPercentage,
          nextIncrement: this.calculateNextIncrement(incrementInterval)
        },
        rolloutStarted: new Date().toISOString()
      };

      this.updateFeatureToggle(featureKey, rolloutConfig);
      this.auditFeatureAction(featureKey, 'rollout_started', rolloutConfig);

      return { success: true, rolloutConfig };

    } catch (error) {
      console.error('Failed to start gradual rollout:', error);
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Emergency feature kill switch
   */
  static emergencyKillSwitch(featureKey, reason) {
    try {
      const feature = this.getFeatureToggle(featureKey);
      if (!feature) {
        return { success: false, error: 'Feature not found' };
      }

      if (!feature.killSwitch) {
        return { success: false, error: 'Kill switch not available for this feature' };
      }

      const killUpdate = {
        defaultValue: false,
        status: 'killed',
        killReason: reason,
        killedAt: new Date().toISOString(),
        killedBy: Session.getActiveUser().getEmail()
      };

      this.updateFeatureToggle(featureKey, killUpdate);
      this.auditFeatureAction(featureKey, 'emergency_kill', { reason });

      // Send alerts
      this.sendKillSwitchAlert(featureKey, reason);

      return { success: true, message: 'Feature killed successfully' };

    } catch (error) {
      console.error('Failed to activate kill switch:', error);
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Gets feature toggle from storage
   */
  static getFeatureToggle(featureKey) {
    const sheet = SheetUtils.getSheet('Feature Toggles');
    if (!sheet) return null;

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const keyCol = headers.indexOf('Key');
    const configCol = headers.indexOf('Configuration');

    for (let i = 1; i < data.length; i++) {
      if (data[i][keyCol] === featureKey) {
        return JSON.parse(data[i][configCol] || '{}');
      }
    }

    return null;
  }

  /**
   * Stores feature toggle in sheet
   */
  static storeFeatureToggle(feature) {
    const sheet = SheetUtils.getOrCreateSheet('Feature Toggles', [
      'Key', 'Name', 'Type', 'Category', 'Status', 'Environment',
      'Created At', 'Updated At', 'Configuration'
    ]);

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const keyCol = headers.indexOf('Key');

    // Find existing row or append new
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][keyCol] === feature.key) {
        rowIndex = i + 1;
        break;
      }
    }

    const row = [
      feature.key,
      feature.name,
      feature.type,
      feature.category,
      feature.status,
      feature.environment,
      feature.createdAt,
      feature.updatedAt,
      JSON.stringify(feature)
    ];

    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }
  }

  /**
   * Increments metric for a feature
   */
  static incrementMetric(featureKey, metric) {
    const feature = this.getFeatureToggle(featureKey);
    if (!feature) return;

    if (!feature.metrics) feature.metrics = {};
    feature.metrics[metric] = (feature.metrics[metric] || 0) + 1;

    this.storeFeatureToggle(feature);
  }

  /**
   * Generates consistent hash for user
   */
  static generateUserHash(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Creates audit log entry
   */
  static auditFeatureAction(featureKey, action, details) {
    const auditSheet = SheetUtils.getOrCreateSheet('Feature Audit', [
      'Timestamp', 'Feature Key', 'Action', 'User', 'Details'
    ]);

    auditSheet.appendRow([
      new Date().toISOString(),
      featureKey,
      action,
      Session.getActiveUser().getEmail(),
      JSON.stringify(details)
    ]);
  }

  /**
   * Sends kill switch alert
   */
  static sendKillSwitchAlert(featureKey, reason) {
    try {
      const config = getDynamicConfig();
      const alertEmail = config.ADMIN_EMAIL || config.CONTACT_EMAIL;

      if (alertEmail) {
        MailApp.sendEmail({
          to: alertEmail,
          subject: `🚨 EMERGENCY: Feature Kill Switch Activated - ${featureKey}`,
          body: `
            EMERGENCY KILL SWITCH ACTIVATED

            Feature: ${featureKey}
            Reason: ${reason}
            Time: ${new Date().toISOString()}
            User: ${Session.getActiveUser().getEmail()}

            The feature has been immediately disabled across all environments.
            Please investigate and resolve the issue before re-enabling.
          `
        });
      }
    } catch (error) {
      console.error('Failed to send kill switch alert:', error);
    }
  }

  /**
   * Gets feature toggle dashboard data
   */
  static getDashboardData() {
    const sheet = SheetUtils.getSheet('Feature Toggles');
    if (!sheet) return { features: [], categories: {}, metrics: {} };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const features = [];
    const categories = {};
    const metrics = { total: 0, enabled: 0, disabled: 0 };

    for (let i = 1; i < data.length; i++) {
      const configCol = headers.indexOf('Configuration');
      const feature = JSON.parse(data[i][configCol] || '{}');

      features.push({
        key: feature.key,
        name: feature.name,
        type: feature.type,
        category: feature.category,
        status: feature.status,
        enabled: this.isFeatureEnabled(feature.key),
        metrics: feature.metrics || {}
      });

      // Category grouping
      if (!categories[feature.category]) {
        categories[feature.category] = [];
      }
      categories[feature.category].push(feature);

      // Metrics
      metrics.total++;
      if (this.isFeatureEnabled(feature.key)) {
        metrics.enabled++;
      } else {
        metrics.disabled++;
      }
    }

    return { features, categories, metrics };
  }

  /**
   * Initializes monitoring for feature toggles
   */
  static initializeMonitoring() {
    // Set up daily monitoring trigger
    const trigger = ScriptApp.newTrigger('runFeatureToggleMonitoring')
      .timeBased()
      .everyDays(1)
      .atHour(9) // 9 AM daily
      .create();

    console.log('Feature toggle monitoring initialized');
  }

  /**
   * Calculates next increment time
   */
  static calculateNextIncrement(interval) {
    const now = new Date();
    switch (interval) {
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 60 * 60 * 1000);
    }
  }
}

/**
 * Daily monitoring function for feature toggles
 */
function runFeatureToggleMonitoring() {
  console.log('Running feature toggle monitoring...');

  // Process gradual rollouts
  FeatureToggleSystem.processGradualRollouts();

  // Generate metrics report
  const dashboard = FeatureToggleSystem.getDashboardData();
  console.log('Feature toggle metrics:', dashboard.metrics);
}

/**
 * Convenience functions for common feature checks
 */
function isLiveMatchProcessingEnabled() {
  return FeatureToggleSystem.isFeatureEnabled('live_match_processing');
}

function isMakeWebhooksEnabled() {
  return FeatureToggleSystem.isFeatureEnabled('make_webhooks');
}

function isSocialMediaPostingEnabled() {
  return FeatureToggleSystem.isFeatureEnabled('social_media_posting');
}

function isConsentGateActive() {
  return FeatureToggleSystem.isFeatureEnabled('consent_gate_active');
}

function isVideoClipGenerationEnabled() {
  return FeatureToggleSystem.isFeatureEnabled('video_clip_generation');
}

function isPerformanceMonitoringEnabled() {
  return FeatureToggleSystem.isFeatureEnabled('performance_monitoring');
}

/**
 * Emergency kill switch functions for critical features
 */
function emergencyKillSocialMedia(reason = 'Emergency stop') {
  return FeatureToggleSystem.emergencyKillSwitch('social_media_posting', reason);
}

function emergencyKillMakeWebhooks(reason = 'Emergency stop') {
  return FeatureToggleSystem.emergencyKillSwitch('make_webhooks', reason);
}

function emergencyKillLiveProcessing(reason = 'Emergency stop') {
  return FeatureToggleSystem.emergencyKillSwitch('live_match_processing', reason);
}