/**
 * @fileoverview Main Entry Points for Football Automation System
 * @version 6.2.0
 * @description Real integration of all advanced components
 */

/**
 * Get system version and deployment info - Privacy-compliant public API
 * @returns {Object} Sanitized system version and metadata (no sensitive data)
 */
function SA_Version() {
  try {
    const properties = PropertiesService.getScriptProperties();

    // Build privacy-safe response with NO sensitive information
    const versionInfo = {
      version: properties.getProperty('SYSTEM.VERSION') || '6.2.0',
      environment: properties.getProperty('SYSTEM.ENVIRONMENT') || 'production',
      status: 'operational',
      deployed_at: properties.getProperty('INSTALL.COMPLETED_AT') || new Date().toISOString(),
      // REMOVED: installedBy (privacy leak)
      // REMOVED: specific user emails or identifying information
      last_check: new Date().toISOString(),
      system_id: this.getSystemFingerprint(), // Anonymous system identifier
      api_version: 'v1',
      uptime_check: this.calculateUptimeStatus()
    };

    return versionInfo;

  } catch (error) {
    // Fallback with minimal information exposure
    return {
      version: '6.2.0',
      status: 'operational',
      last_check: new Date().toISOString(),
      error: 'limited_info_mode', // Don't expose actual error details
      api_version: 'v1'
    };
  }
}

/**
 * Generate anonymous system fingerprint for tracking without privacy issues
 * @returns {string} Anonymous system identifier
 */
function getSystemFingerprint() {
  try {
    const properties = PropertiesService.getScriptProperties();
    let fingerprint = properties.getProperty('SYSTEM.FINGERPRINT');

    if (!fingerprint) {
      // Generate new anonymous fingerprint
      fingerprint = `sys_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
      properties.setProperty('SYSTEM.FINGERPRINT', fingerprint);
    }

    return fingerprint;
  } catch (error) {
    return 'sys_unknown';
  }
}

/**
 * Calculate system uptime status without exposing sensitive details
 * @returns {string} Uptime status indicator
 */
function calculateUptimeStatus() {
  try {
    const properties = PropertiesService.getScriptProperties();
    const installDate = properties.getProperty('INSTALL.COMPLETED_AT');

    if (!installDate) {
      return 'unknown';
    }

    const installed = new Date(installDate);
    const now = new Date();
    const daysSinceInstall = Math.floor((now - installed) / (1000 * 60 * 60 * 24));

    if (daysSinceInstall < 1) return 'new_installation';
    if (daysSinceInstall < 7) return 'recent';
    if (daysSinceInstall < 30) return 'stable';
    return 'mature';

  } catch (error) {
    return 'unknown';
  }
}

/**
 * Enumerates the whitelisted actions the webapp endpoint supports.
 * Declared at file scope so both security validation and default
 * responses reference the same canonical list during conflict
 * resolution merges.
 * @const {!Array<string>}
 */
const WEBAPP_ALLOWED_ACTIONS = Object.freeze([
  'health',
  'advanced_health',
  'dashboard',
  'monitoring',
  'test',
  'gdpr_init',
  'gdpr_dashboard'
]);

/**
 * WEBAPP ENTRY POINT - Consolidated webapp handler with full integration
 * Handles all routing - replaces conflicting doGet functions in other files
 */
function doGet(e) {
  try {
    // Simple routing without complex dependencies
    const path = (e && e.pathInfo) ? e.pathInfo : '';
    const params = (e && e.parameter) ? e.parameter : {};
    const action = params && params.action ? params.action : '';

    // PUBLIC ROUTES (no authentication required)

    // Progressive Web App assets
    const pwaResponse = handlePwaAssetRequest(path, params);
    if (pwaResponse) {
      return pwaResponse;
    }

    // Landing page - default route
    if (!path && !action) {
      return HtmlService.createTemplateFromFile('index').evaluate()
        .setTitle('Football Club Automation')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    // Status check API
    if (!path && action === 'status') {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        status: 'healthy',
        version: getConfigValue('SYSTEM.VERSION', '6.2.0'),
        timestamp: new Date().toISOString(),
        message: 'Web app is running'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (path === 'widget/latest') {
      const state = (typeof HomepageWidgetService !== 'undefined')
        ? HomepageWidgetService.getWidgetState()
        : { success: true, active: false, data: null };

      return ContentService.createTextOutput(JSON.stringify(state))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeader('Cache-Control', 'no-store, max-age=0');
    }

    // Customer setup/intake (public)
    if (path === 'setup' || path === 'intake') {
      return HtmlService.createTemplateFromFile('buyerIntake').evaluate()
        .setTitle('Customer Setup')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    // SHOP & SUBSCRIPTION ROUTES (public, read-only)
    if (path === 'shop/products') {
      const query = e && e.parameter ? e.parameter : {};
      const options = {
        page: query.page,
        limit: query.limit
      };
      const catalog = ShopOperationsService.fetchCatalog(options);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: catalog
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (path === 'shop/product') {
      const productId = e && e.parameter ? e.parameter.productId : '';
      if (!productId) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'productId is required'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      const product = ShopOperationsService.fetchProduct(String(productId));
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: product
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (path && path.indexOf('subs/') === 0) {
      const params = (e && e.parameter) ? e.parameter : {};
      return SubscriptionService.handleGet(path, params);
    }

    // PROTECTED ROUTES (authentication required)

    // Handle path-based routing
    if (path) {
      return handlePathRouting(path, e);
    }

    // Handle query parameter routing (complex features)
    return handleQueryParameterRouting(e);

  } catch (error) {
    console.error('doGet error:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      stack: error.stack,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle path-based routing (consolidated from Code.gs)
 */
function handlePathRouting(path, e) {
  switch (path) {
    case 'players':
      return createPlayerManagementInterface();
    case 'fixtures':
      return createFixtureManagementInterface();
    case 'season':
      return createSeasonSetupInterface();
    case 'historical':
      return createHistoricalDataInterface();
    case 'live':
      return createEnhancedLiveMatchInterface();
    case 'stats':
      return createStatisticsInterface();
    case 'admin':
      return createMainDashboard();
    case 'control':
      return showControlPanel();
    case 'simple':
      return createMainInterface(); // from simple-webapp.gs
    case 'health':
      return createHealthResponse();
    case 'test':
      return createTestResponse();
    default:
      return createMainDashboard();
  }
}

/**
 * Handle query parameter routing (original main.gs logic)
 */
function handleQueryParameterRouting(e) {
  // 1. SECURITY CHECK - Use advanced security
  const allowedActions = WEBAPP_ALLOWED_ACTIONS;
  const securityCheck = AdvancedSecurity.validateInput(e.parameter || {}, 'webhook_data', {
    source: 'webapp',
    allowQueryParameters: true,
    allowedActions: allowedActions
  });
  if (!securityCheck.valid) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Security validation failed'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 2. RATE LIMITING - Check advanced rate limits
  const userEmail = Session.getActiveUser().getEmail() || 'anonymous';
  const rateCheck = AdvancedSecurity.checkAdvancedRateLimit(userEmail, { perMinute: 30 });
  if (!rateCheck.allowed) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Rate limit exceeded'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    // 3. MONITORING - Start performance tracking
    const startTime = Date.now();
    const queryParams = securityCheck.sanitized || {};
    ProductionMonitoringManager.collectMetric('webapp', 'request', 1, { action: queryParams.action || 'unknown' });

    // 4. ROUTE REQUEST
    let result;
    const action = queryParams.action || 'health';

    switch (action) {
      case 'health':
        result = HealthCheck.performHealthCheck();
        break;

      case 'advanced_health':
        result = ProductionMonitoringManager.performAdvancedHealthCheck();
        break;

      case 'dashboard':
        result = getWorkingMonitoringDashboard();
        break;

      case 'monitoring':
        result = runSystemMonitoring();
        break;

      case 'test':
        result = runPracticalTests();
        break;

      case 'gdpr_init':
        result = initializeGDPRCompliance();
        break;

      case 'gdpr_dashboard':
        result = getGDPRComplianceDashboard();
        break;

      default:
        result = {
          message: 'Football Automation System API',
          version: getConfigValue('SYSTEM.VERSION', '6.3.0'),
          available_actions: allowedActions
        };
    }

    // 5. PERFORMANCE TRACKING - Record response time
    const responseTime = Date.now() - startTime;
    ProductionMonitoringManager.collectMetric('webapp', 'response_time', responseTime, { action: action });

    // 6. RETURN SECURE RESPONSE
    return AdvancedSecurity.addSecurityHeaders(
      ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      }))
    );

  } catch (error) {
    console.error('Webapp error:', error);

    // MONITORING - Record error
    ProductionMonitoringManager.triggerAlert('webapp_error', 'warning',
      `Webapp error: ${error.toString()}`, { error: error.toString() });

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * WEBAPP ENTRY POINT - POST handler with security integration
 */
function doPost(e) {
  try {
    const path = (e && e.pathInfo) ? e.pathInfo : '';

    if (path === 'webhook/stripe') {
      return PaymentWebhookService.handleStripeWebhookRequest(e);
    }

    if (path === 'webhook/paypal') {
      return PaymentWebhookService.handlePayPalWebhookRequest(e);
    }

    if (path === 'subs/verify') {
      const body = parseJsonBody_(e);
      const params = (e && e.parameter) ? e.parameter : {};
      return SubscriptionService.handlePost(path, body, params);
    }

    if (path === 'shop/checkout') {
      return handleShopCheckoutPost_(e);
    }

    // 1. QUOTA CHECK - Prevent quota exhaustion
    const quotaCheck = QuotaMonitor.checkQuotaLimits();
    if (!quotaCheck.allowed) {
      // DO NOT record usage for blocked requests to prevent quota inflation
      console.warn('Request blocked due to quota limits:', quotaCheck);
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'System quota limits exceeded',
        blocked_reason: quotaCheck.blocked_reason,
        retry_after: quotaCheck.retry_after,
        violations: quotaCheck.violations
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var request = buildApiRequest(e);
    var originDecision = resolveAllowedOrigin(request.origin);

    if (request.method === 'OPTIONS') {
      return createOptionsResponse(originDecision.origin);
    }

    if (!originDecision.allowed && request.origin) {
      return createErrorResponse(403, 'Origin not allowed.', [], originDecision.origin);
    }

    if (request.parseError) {
      return createErrorResponse(400, 'Invalid JSON payload.', [request.parseError.message], originDecision.origin);
    }

    var tokenResult = verifyBearerJwt(request.authHeader);
    if (!tokenResult.valid) {
      return createErrorResponse(401, tokenResult.message, [], originDecision.origin);
    }
    request.user = tokenResult.claims;

    var rateLimit = evaluateRateLimit({
      ip: request.ip,
      userId: request.user && request.user.sub
    });
    if (!rateLimit.allowed) {
      var rateLimited = applyRateLimitHeaders(
        createErrorResponse(429, 'Rate limit exceeded.', [rateLimit.reason], originDecision.origin),
        rateLimit
      );
      return rateLimited;
    }

    if (request.idempotencyKey) {
      var stored = getStoredIdempotentResponse(request.idempotencyKey);
      if (stored) {
        var cachedResponse = createJsonResponse(stored.status, stored.body, stored.headers, originDecision.origin);
        return applyRateLimitHeaders(cachedResponse, rateLimit);
      }
    }

    var resource = (request.pathSegments[0] || request.body.resource || '').toLowerCase();
    var result;
    switch (resource) {
      case 'auth':
        result = handleAuthRequest(request);
        break;
      case 'events':
        result = handleEventsRequest(request);
        break;
      case 'attendance':
        result = handleAttendanceRequest(request);
        break;
      case 'votes':
        result = handleVotesRequest(request);
        break;
      case 'streams':
        result = handleStreamsRequest(request);
        break;
      case 'shop':
        result = handleShopRequest(request);
        break;
      case 'subs':
        result = handleSubsRequest(request);
        break;
      default:
        return createErrorResponse(404, 'Unknown API resource.', [], originDecision.origin);
    }

    var response = createJsonResponse(result.status || 200, result.body || {}, result.headers || {}, originDecision.origin);

    if (result.pagination) {
      response = applyPaginationHeaders(response, Object.assign({
        totalPages: 0
      }, result.pagination));
    }

    response = applyRateLimitHeaders(response, rateLimit);

    if (request.idempotencyKey) {
      storeIdempotentResponse(request.idempotencyKey, {
        status: result.status || 200,
        body: result.body || {},
        headers: result.headers || {}
      });
    }

    return response;

  } catch (error) {
    // Standardized error response for doPost
    console.error('doPost error:', error);
    try {
      return createErrorResponse
        ? createErrorResponse(500, 'Internal server error.', [String(error)], (typeof resolveAllowedOrigin === 'function' ? (resolveAllowedOrigin('').origin) : ''))
        : ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: 'Internal server error',
            detail: String(error)
          })).setMimeType(ContentService.MimeType.JSON);
    } catch (fallbackErr) {
      // last-resort fallback
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Internal server error'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
}

/**
 * GOAL PROCESSING - With full privacy and security integration
 */
function processGoal(player, minute, assist = null) {
  let sanitizedMinute = null;
  try {
    // 1. SECURITY - Validate inputs
    const playerValidation = AdvancedSecurity.validateInput(player, 'player_name', { source: 'goal_processing' });
    if (!playerValidation.valid) {
      throw new Error('Invalid player name');
    }

    sanitizedMinute = AdvancedSecurity.validateMinute(minute);

    // 2. PRIVACY - Check consent
    const consent = SimplePrivacy.checkPlayerConsent(playerValidation.sanitized);
    if (!consent.allowed) {
      console.warn(`Goal not posted - no consent for ${player}: ${consent.reason}`);
      return { success: false, blocked: true, reason: consent.reason };
    }

    // 3. PERFORMANCE - Use caching for repeated operations
    const cacheKey = `goal_${player}_${sanitizedMinute}_${Date.now()}`;
    PerformanceOptimizer.set(cacheKey, { player, minute: sanitizedMinute, assist }, 300000); // 5 min cache

    // 4. MONITORING - Track goal processing
    ProductionMonitoringManager.collectMetric('goals', 'processed', 1, {
      player: player,
      minute: sanitizedMinute,
      hasAssist: !!assist
    });

    // 5. PROCESS GOAL - Use existing enhanced events system
    const result = processMatchEvent({
      eventType: 'goal',
      player: playerValidation.sanitized,
      minute: sanitizedMinute,
      additionalData: { assist: assist }
    });

    return result;

  } catch (error) {
    console.error('Goal processing failed:', error);
    ProductionMonitoringManager.triggerAlert('goal_processing_error', 'warning',
      `Goal processing failed: ${error.toString()}`, { player, minute: sanitizedMinute !== null ? sanitizedMinute : minute, assist });

    return { success: false, error: error.toString() };
  }
}

/**
 * HEALTH CHECK - Integrated monitoring
 */
function performSystemHealthCheck() {
  return ProductionMonitoringManager.performAdvancedHealthCheck();
}

/**
 * INITIALIZE SYSTEM - Startup integration
 */
function initializeSystem() {
  try {
    console.log('🚀 Initializing integrated system...');

    // 1. Start monitoring
    const monitoring = ProductionMonitoringManager.startComprehensiveMonitoring();

    // 2. Initialize architecture
    const architecture = ArchitectureBootstrap.initialize();

    // 3. Setup privacy sheets
    const privacy = setupPrivacySheets();

    // 4. Performance optimization
    setupPerformanceMonitoring();

    console.log('✅ System initialization complete');

    return {
      success: true,
      monitoring: monitoring,
      architecture: architecture,
      privacy: privacy,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('System initialization failed:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * RUN TESTS - Integrated test execution
 */
function runPracticalTests() {
  try {
    console.log('🧪 Running integrated test suite...');

    // Run the practical tests
    const testResults = runAllPracticalTests();

    // Also run quick comprehensive check
    const comprehensiveCheck = quickComprehensiveTest();

    return {
      practicalTests: testResults,
      comprehensiveCheck: comprehensiveCheck,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Test execution failed:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * SCHEDULED HEALTH CHECK - For time-based triggers
 */
function scheduledHealthCheck() {
  try {
    const health = ProductionMonitoringManager.performAdvancedHealthCheck();

    if (health.overall === 'critical' || health.overall === 'error') {
      ProductionMonitoringManager.triggerAlert('system_health', 'critical',
        `System health critical: ${health.overall}`, health);
    }

    // Log health metrics
    ProductionMonitoringManager.collectMetric('health', 'check_score', health.score, {
      overall: health.overall
    });

    return health;

  } catch (error) {
    console.error('Scheduled health check failed:', error);
    ProductionMonitoringManager.triggerAlert('health_check_error', 'critical',
      `Health check failed: ${error.toString()}`, { error: error.toString() });
  }
}

/**
 * PRIVACY REQUEST HANDLER - GDPR compliance
 */
function handlePrivacyRequest(playerName, requestType) {
  try {
    // Validate request
    const validation = AdvancedSecurity.validateInput(playerName, 'player_name', { source: 'privacy_request' });
    if (!validation.valid) {
      throw new Error('Invalid player name');
    }

    const sanitizedName = validation.sanitized;

    // Log privacy request
    SimplePrivacy.logPrivacyAction('privacy_request', sanitizedName, {
      requestType: requestType,
      requestedBy: Session.getActiveUser().getEmail()
    });

    let result;
    switch (requestType) {
      case 'export':
        result = SimplePrivacy.exportPlayerData(sanitizedName);
        break;

      case 'delete':
        result = SimplePrivacy.deletePlayerData(sanitizedName, 'User request');
        break;

      case 'consent_status':
        result = SimplePrivacy.checkPlayerConsent(sanitizedName);
        break;

      default:
        throw new Error(`Unknown privacy request type: ${requestType}`);
    }

    return result;

  } catch (error) {
    console.error('Privacy request failed:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * PERFORMANCE DASHBOARD - Real metrics
 */
function getPerformanceDashboard() {
  try {
    const performance = PerformanceOptimizer.getPerformanceAnalytics();
    const monitoring = ProductionMonitoringManager.getMonitoringDashboard();
    const health = HealthCheck.quickHealthCheck();

    return {
      performance: performance,
      monitoring: monitoring,
      health: health,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Performance dashboard failed:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * SETUP TRIGGERS - Install system triggers
 */
function setupSystemTriggers() {
  try {
    const requiredTriggers = [
      {
        functionName: 'scheduledHealthCheck',
        schedule: { everyHours: 1 },
        description: 'Hourly system health check'
      },
      {
        functionName: 'cleanupExpiredCache',
        schedule: { everyMinutes: 30 },
        description: 'Cache cleanup every 30 minutes'
      }
    ];

    const results = requiredTriggers.map(triggerConfig => {
      const ensureResult = ensureTimeTrigger(
        triggerConfig.functionName,
        triggerConfig.schedule,
        triggerConfig.description
      );

      return {
        functionName: triggerConfig.functionName,
        created: ensureResult.created,
        existed: ensureResult.existing,
        schedule: triggerConfig.schedule,
        description: triggerConfig.description
      };
    });

    const response = {
      success: true,
      ensured: results,
      timestamp: new Date().toISOString()
    };

    console.log('✅ System triggers verified', response);
    return response;

  } catch (error) {
    console.error('Trigger setup failed:', error);
    return { success: false, error: error.toString() };
  }
}

function verifyScheduledTriggerIntegrity() {
  try {
    const functionsToVerify = [
      { functionName: 'scheduledHealthCheck', required: true },
      { functionName: 'cleanupExpiredCache', required: true },
      { functionName: 'scheduledSystemMonitoring', required: true },
      { functionName: 'scheduledLogCleanup', required: true }
    ];

    const triggers = ScriptApp.getProjectTriggers();
    const details = functionsToVerify.map(entry => {
      const matchingTriggers = triggers.filter(trigger =>
        trigger.getHandlerFunction() === entry.functionName &&
        trigger.getTriggerSource() === ScriptApp.TriggerSource.CLOCK
      );

      return {
        functionName: entry.functionName,
        required: entry.required,
        exists: matchingTriggers.length > 0,
        triggerCount: matchingTriggers.length
      };
    });

    const response = {
      success: details.every(detail => !detail.required || detail.exists),
      details: details,
      timestamp: new Date().toISOString()
    };

    console.log('ℹ️ Scheduled trigger integrity check', response);
    return response;

  } catch (error) {
    console.error('Trigger integrity verification failed:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * QUICK STATUS CHECK - For external monitoring
 */
function getQuickStatus() {
  try {
    const dynamicConfig = getDynamicConfig();
    const version = getConfigValue('SYSTEM.VERSION', '6.3.0');
    const health = HealthCheck.quickHealthCheck();

    return {
      status: health.status,
      version: version,
      timestamp: new Date().toISOString(),
      components: {
        security: typeof AdvancedSecurity !== 'undefined',
        performance: typeof PerformanceOptimizer !== 'undefined',
        monitoring: typeof ProductionMonitoringManager !== 'undefined',
        privacy: typeof SimplePrivacy !== 'undefined'
      },
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

/**
 * Enhanced input validation for different actions
 * @param {string} action - The action being performed
 * @param {Object} params - The parameters to validate
 * @returns {Object} Validation result with sanitized data
 */
function validateActionParams(action, params) {
  const errors = [];
  const sanitized = {};

  try {
    switch (action) {
      case 'add_player':
        // Validate player name
        if (!params.name || typeof params.name !== 'string') {
          errors.push('Player name is required');
        } else {
          sanitized.name = params.name.replace(/[<>\"'&]/g, '').substring(0, 100);
        }

        // Validate position
        if (params.position) {
          sanitized.position = params.position.replace(/[<>\"'&]/g, '').substring(0, 50);
        }

        // Validate age
        if (params.age) {
          const age = parseInt(params.age);
          if (isNaN(age) || age < 13 || age > 50) {
            errors.push('Age must be between 13 and 50');
          } else {
            sanitized.age = age;
          }
        }
        break;

      case 'add_fixture':
        // Validate opponent
        if (!params.opponent || typeof params.opponent !== 'string') {
          errors.push('Opponent is required');
        } else {
          sanitized.opponent = params.opponent.replace(/[<>\"'&]/g, '').substring(0, 100);
        }

        // Validate date
        if (!params.date) {
          errors.push('Date is required');
        } else {
          const date = new Date(params.date);
          if (isNaN(date.getTime())) {
            errors.push('Invalid date format');
          } else {
            sanitized.date = date.toISOString().split('T')[0];
          }
        }

        // Validate venue
        if (params.venue) {
          sanitized.venue = params.venue.replace(/[<>\"'&]/g, '').substring(0, 200);
        }
        break;

      case 'live_event':
        // Validate event type
        const allowedEvents = ['goal', 'card', 'substitution', 'kick_off', 'half_time', 'full_time'];
        if (!params.eventType || !allowedEvents.includes(params.eventType)) {
          errors.push('Invalid event type');
        } else {
          sanitized.eventType = params.eventType;
        }

        // Validate minute
        if (params.minute !== undefined) {
          const minute = parseInt(params.minute);
          if (isNaN(minute) || minute < 0 || minute > 120) {
            errors.push('Minute must be between 0 and 120');
          } else {
            sanitized.minute = minute;
          }
        }

        // Validate player name
        if (params.player) {
          sanitized.player = params.player.replace(/[<>\"'&]/g, '').substring(0, 100);
        }
        break;

      case 'season_setup':
        // Validate season year
        if (!params.season) {
          errors.push('Season is required');
        } else {
          sanitized.season = params.season.replace(/[<>\"'&]/g, '').substring(0, 20);
        }
        break;

      case 'add_historical_match':
        // Similar validation to add_fixture but for historical data
        if (!params.opponent) {
          errors.push('Opponent is required');
        } else {
          sanitized.opponent = params.opponent.replace(/[<>\"'&]/g, '').substring(0, 100);
        }

        if (!params.date) {
          errors.push('Date is required');
        } else {
          const date = new Date(params.date);
          if (isNaN(date.getTime()) || date > new Date()) {
            errors.push('Invalid date or future date not allowed');
          } else {
            sanitized.date = date.toISOString().split('T')[0];
          }
        }

        // Validate scores
        if (params.homeScore !== undefined) {
          const score = parseInt(params.homeScore);
          if (isNaN(score) || score < 0 || score > 20) {
            errors.push('Home score must be between 0 and 20');
          } else {
            sanitized.homeScore = score;
          }
        }

        if (params.awayScore !== undefined) {
          const score = parseInt(params.awayScore);
          if (isNaN(score) || score < 0 || score > 20) {
            errors.push('Away score must be between 0 and 20');
          } else {
            sanitized.awayScore = score;
          }
        }
        break;

      default:
        errors.push('Unknown action type');
    }

    // Copy over the action
    sanitized.action = action;

    return {
      valid: errors.length === 0,
      errors: errors,
      sanitized: sanitized
    };

  } catch (error) {
    return {
      valid: false,
      errors: ['Validation error: ' + error.toString()],
      sanitized: {}
    };
  }
}

function handleShopCheckoutPost_(e) {
  const quotaCheck = QuotaMonitor.checkQuotaLimits();
  if (!quotaCheck.allowed) {
    console.warn('Shop checkout blocked due to quota limits:', quotaCheck);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'System quota limits exceeded',
      blocked_reason: quotaCheck.blocked_reason,
      retry_after: quotaCheck.retry_after
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const userEmail = Session.getActiveUser().getEmail() || 'anonymous';
  const rateCheck = AdvancedSecurity.checkAdvancedRateLimit(userEmail, { perMinute: 5 });
  if (!rateCheck.allowed) {
    console.warn('Shop checkout blocked due to rate limiting:', rateCheck);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Rate limit exceeded',
      retry_after: rateCheck.resetTime
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const body = parseJsonBody_(e);
  const checkoutRequest = validateShopCheckoutRequest_(body);

  const session = ShopOperationsService.createHostedCheckout(checkoutRequest);

  QuotaMonitor.recordUsage('URL_FETCH', 1);

  return AdvancedSecurity.addSecurityHeaders(
    ContentService.createTextOutput(JSON.stringify({
      success: true,
      checkout: session
    })).setMimeType(ContentService.MimeType.JSON)
  );
}

function validateShopCheckoutRequest_(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Checkout payload missing');
  }

  const provider = String(payload.provider || '').trim().toLowerCase();
  if (!provider || ['stripe', 'paypal'].indexOf(provider) === -1) {
    throw new Error('Unsupported checkout provider');
  }

  const successUrl = String(payload.successUrl || '').trim();
  const cancelUrl = String(payload.cancelUrl || '').trim();
  if (!successUrl || !cancelUrl) {
    throw new Error('Checkout success and cancel URLs are required');
  }

  const metadata = (payload.metadata && typeof payload.metadata === 'object') ? payload.metadata : {};
  const sanitizedMetadata = ShopOperationsService.sanitizeMetadata_(metadata);

  const base = {
    provider,
    successUrl,
    cancelUrl,
    metadata: sanitizedMetadata
  };

  if (payload.customerEmail) {
    base.customerEmail = String(payload.customerEmail).trim();
  }

  if (provider === 'stripe') {
    const priceId = String(payload.priceId || '').trim();
    const quantity = Math.max(1, Math.min(99, parseInt(payload.quantity, 10) || 1));
    if (!priceId) {
      throw new Error('Stripe priceId is required');
    }
    base.priceId = priceId;
    base.quantity = quantity;
    base.mode = payload.mode ? String(payload.mode) : 'payment';
    if (Array.isArray(payload.lineItems)) {
      base.lineItems = payload.lineItems
        .filter(item => item && item.priceId && item.quantity)
        .map(item => ({
          priceId: String(item.priceId),
          quantity: Math.max(1, Math.min(99, parseInt(item.quantity, 10) || 1))
        }));
    }
  } else if (provider === 'paypal') {
    const amount = Number(payload.amount);
    const currency = String(payload.currency || '').trim();
    if (!currency || isNaN(amount) || amount <= 0) {
      throw new Error('PayPal amount and currency are required');
    }
    base.amount = amount.toFixed(2);
    base.currency = currency.toUpperCase();
    if (payload.customId) {
      base.customId = String(payload.customId).substring(0, 64);
    }
    base.requireShipping = !!payload.requireShipping;
  }

  return base;
}

function parseJsonBody_(e) {
  if (e && e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (error) {
      throw new Error('Invalid JSON payload');
    }
  }
  return {};
}

/**
 * Quota monitoring and rate limiting system
 */
class QuotaMonitor {
  static getDailyLimits() {
    return {
      SCRIPT_RUNTIME: 360, // 6 hours in minutes
      URL_FETCH: 20000,
      EMAIL_QUOTA: 100,
      PROPERTIES_READ: 50000,
      PROPERTIES_WRITE: 50000
    };
  }

  static getWarningThresholds() {
    return {
      SCRIPT_RUNTIME: 300, // 5 hours warning
      URL_FETCH: 18000, // 90% warning
      EMAIL_QUOTA: 90,
      PROPERTIES_READ: 45000,
      PROPERTIES_WRITE: 45000
    };
  }

  /**
   * Check current quota usage and PROPERLY enforce limits
   */
  static checkQuotaLimits() {
    try {
      const usage = this.getCurrentUsage();
      const violations = [];

      // Check each quota type
      Object.keys(this.getDailyLimits()).forEach(quotaType => {
        const current = usage[quotaType] || 0;
        const limit = this.getDailyLimits()[quotaType];
        const warning = this.getWarningThresholds()[quotaType];

        if (current >= limit) {
          violations.push({
            type: quotaType,
            current: current,
            limit: limit,
            severity: 'critical'
          });
        } else if (current >= warning) {
          violations.push({
            type: quotaType,
            current: current,
            limit: limit,
            severity: 'warning'
          });
        }
      });

      // FIXED: Properly enforce quota limits
      if (violations.length > 0) {
        const critical = violations.filter(v => v.severity === 'critical');
        if (critical.length > 0) {
          logger.error('Quota limits exceeded - BLOCKING REQUEST', { violations: critical });

          // CRITICAL FIX: Actually block the request when quota exceeded
          return {
            allowed: false,
            violations: violations,
            blocked_reason: 'quota_exceeded',
            retry_after: this.getQuotaResetTime()
          };
        } else {
          logger.warn('Quota warning thresholds reached', { violations: violations });
        }
      }

      return { allowed: true, violations: violations, usage: usage };

    } catch (error) {
      logger.error('Quota check failed', { error: error.toString() });
      // SECURITY FIX: Fail closed when quota check fails
      return {
        allowed: false,
        error: 'Quota validation failed',
        blocked_reason: 'quota_check_error'
      };
    }
  }

  /**
   * Get time when quota will reset (next day)
   * @returns {string} ISO timestamp when quota resets
   */
  static getQuotaResetTime() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // Midnight
    return tomorrow.toISOString();
  }

  /**
   * Get current quota usage (estimated)
   */
  static getCurrentUsage() {
    try {
      const properties = PropertiesService.getScriptProperties();
      const today = new Date().toISOString().split('T')[0];
      const usageKey = `quota_usage_${today}`;

      const storedUsage = properties.getProperty(usageKey);
      return storedUsage ? JSON.parse(storedUsage) : {
        SCRIPT_RUNTIME: 0,
        URL_FETCH: 0,
        EMAIL_QUOTA: 0,
        PROPERTIES_READ: 0,
        PROPERTIES_WRITE: 0
      };

    } catch (error) {
      logger.warn('Could not retrieve quota usage', { error: error.toString() });
      return {};
    }
  }

  /**
   * Record quota usage
   */
  static recordUsage(quotaType, amount = 1) {
    try {
      const properties = PropertiesService.getScriptProperties();
      const today = new Date().toISOString().split('T')[0];
      const usageKey = `quota_usage_${today}`;

      let usage = this.getCurrentUsage();
      usage[quotaType] = (usage[quotaType] || 0) + amount;

      properties.setProperty(usageKey, JSON.stringify(usage));

      // Check if we're approaching limits
      const limit = this.getDailyLimits()[quotaType];
      const warning = this.getWarningThresholds()[quotaType];

      if (usage[quotaType] >= warning && usage[quotaType] < warning + amount) {
        logger.warn(`Quota warning: ${quotaType} usage ${usage[quotaType]}/${limit}`);
      }

    } catch (error) {
      logger.error('Failed to record quota usage', {
        quotaType: quotaType,
        amount: amount,
        error: error.toString()
      });
    }
  }

  /**
   * Rate limiting for webhook calls
   */
  static checkWebhookRateLimit() {
    try {
      const properties = PropertiesService.getScriptProperties();
      const now = Date.now();
      const windowStart = now - (60 * 1000); // 1 minute window

      // Get recent webhook calls
      const recentCallsKey = 'webhook_rate_limit';
      const recentCallsData = properties.getProperty(recentCallsKey);
      let recentCalls = recentCallsData ? JSON.parse(recentCallsData) : [];

      // Clean old calls
      recentCalls = recentCalls.filter(timestamp => timestamp > windowStart);

      // Check rate limit (max 30 per minute)
      if (recentCalls.length >= 30) {
        logger.warn('Webhook rate limit exceeded', {
          recentCalls: recentCalls.length,
          limit: 30
        });
        return false;
      }

      // Record this call
      recentCalls.push(now);
      properties.setProperty(recentCallsKey, JSON.stringify(recentCalls));

      return true;

    } catch (error) {
      logger.error('Rate limit check failed', { error: error.toString() });
      return true; // Allow on error to prevent system lockup
    }
  }
}

// ==================== SERVICE ENTRY POINTS ====================

/**
 * Customer Configuration Installer Entry Point
 * Safe installation that only uses Google Sheets CONFIG tab
 */
function SA_INSTALL() {
  try {
    console.log('🚀 Starting customer configuration installation...');
    const result = CustomerInstaller.installFromSheet();

    if (result.success) {
      console.log('✅ Installation completed successfully!');
      console.log(`📊 Configured ${result.configKeys} settings, found ${result.secretsFound} secrets`);
    } else {
      console.error('❌ Installation failed:', result.error);
      console.log('💡 Help:', result.help);
    }

    return result;
  } catch (error) {
    console.error('❌ Installation entry point failed:', error);
    return {
      success: false,
      error: error.toString(),
      help: 'Check that CustomerInstaller service is available'
    };
  }
}

/**
 * Trigger Management Service Entry Point
 * Ensures single triggers and removes orphaned triggers
 */
function SA_TRIG_RECONCILE() {
  try {
    console.log('🔧 Starting trigger reconciliation...');
    const result = TriggerManager.reconcileTriggers();

    console.log(`📊 Reconciliation complete: ${result.kept} kept, ${result.removed} removed`);
    if (result.orphaned.length > 0) {
      console.log(`🗑️ Removed orphaned triggers: ${result.orphaned.join(', ')}`);
    }

    return result;
  } catch (error) {
    console.error('❌ Trigger reconciliation failed:', error);
    return {
      success: false,
      error: error.toString(),
      total: 0,
      kept: 0,
      removed: 0,
      orphaned: []
    };
  }
}

/**
 * Install All System Triggers Entry Point
 * Sets up all required system triggers
 */
function SA_INSTALL_TRIGGERS() {
  try {
    console.log('🚀 Installing all system triggers...');
    const result = TriggerManager.installSystemTriggers();

    console.log(`📊 Trigger installation: ${result.summary.successful} successful, ${result.summary.failed} failed`);

    return result;
  } catch (error) {
    console.error('❌ Trigger installation failed:', error);
    return {
      success: false,
      error: error.toString(),
      summary: { total: 0, successful: 0, failed: 1 }
    };
  }
}

/**
 * Admin Secret Configuration Panel Entry Point
 * Opens secure sidebar for webhook URL configuration
 */
function SA_ADMIN_SECRETS() {
  try {
    console.log('🔐 Opening admin secrets panel...');
    CustomerInstaller.showAdminPanel();
    return { success: true, message: 'Admin panel opened' };
  } catch (error) {
    console.error('❌ Failed to open admin panel:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Event Queue Status Entry Point
 * Check live event debouncer queue status
 */
function SA_QUEUE_STATUS() {
  try {
    console.log('📊 Checking event queue status...');
    const status = LiveEventDebouncer.getQueueStatus();

    console.log(`📈 Queue: ${status.queueSize} events, ${status.processedCount} processed total`);
    if (status.needsProcessing) {
      console.log('⚠️ Queue needs processing');
    }

    return status;
  } catch (error) {
    console.error('❌ Failed to get queue status:', error);
    return {
      success: false,
      error: error.toString(),
      queueSize: 0,
      processedCount: 0,
      needsProcessing: false
    };
  }
}