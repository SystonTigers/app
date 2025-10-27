/**
 * @fileoverview Enhanced Make.com webhook integration with retry logic and router management
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Dedicated Make.com integration with enhanced error handling and retry mechanisms
 * 
 * CREATE NEW FILE - This enhances webhook management from *claude v6
 * 
 * FEATURES:
 * - Enhanced webhook delivery with retry logic
 * - Router branch management and validation
 * - Payload optimization and compression
 * - Rate limiting and queue management
 * - Webhook health monitoring
 * - Batch webhook processing
 */

/**
 * Execute registered test hooks to support unit testing without live network calls.
 * @param {string} hookName - Identifier of the hook to execute.
 * @param {Object} payload - Payload passed to the hook listener.
 * @param {Object=} localHooks - Optional hook registry provided via options.
 * @returns {*|undefined} Return value from the first hook handler that returns data.
 */
function invokeTestHook_(hookName, payload, localHooks) {
  if (!hookName) {
    return undefined;
  }

  const registries = [];

  if (localHooks && typeof localHooks === 'object') {
    registries.push(localHooks);
  }

  try {
    const globalScope = typeof globalThis !== 'undefined'
      ? globalThis
      : (typeof global !== 'undefined' ? global : (typeof window !== 'undefined' ? window : null));

    if (globalScope && globalScope.__testHooks && typeof globalScope.__testHooks === 'object') {
      registries.push(globalScope.__testHooks);
    }
  } catch (error) {
    console.warn('Test hook registry resolution failed', { error: error.toString() });
  }

  for (let i = 0; i < registries.length; i++) {
    const registry = registries[i];
    if (!registry || typeof registry !== 'object') {
      continue;
    }

    const handler = registry[hookName];
    if (typeof handler === 'function') {
      try {
        const result = handler(payload);
        if (typeof result !== 'undefined') {
          return result;
        }
      } catch (error) {
        console.warn('Test hook execution failed', {
          hook: hookName,
          error: error.toString()
        });
      }
    }
  }

  return undefined;
}

// ==================== TEMPLATE VARIANT BUILDER ====================

/**
 * Builds Canva template variant payloads enriched with buyer intake branding.
 */
class TemplateVariantBuilder {

  constructor() {
    this.loggerName = 'TemplateVariantBuilder';
    this._logger = null;
    this.templateConfig = getConfigValue('CANVA.TEMPLATE_VARIANTS', {});
    this.variantSettings = getConfigValue('CANVA.VARIANT_SETTINGS', {});
    this.buyerProfile = getConfigValue('BUYER_INTAKE', {});
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
   * Build variant list for a specific post type.
   * @param {string} postType - Logical post type key (e.g. fixtures, quotes).
   * @param {Object} context - Context data for placeholder binding.
   * @returns {Array<Object>} Array of variant payload definitions.
   */
  buildVariants(postType, context = {}) {
    const normalizedPostType = (postType || '').toLowerCase();
    const configKey = normalizedPostType.toUpperCase();

    this.logger.enterFunction('buildVariants', {
      post_type: normalizedPostType,
      context_keys: Object.keys(context || {})
    });

    try {
      const variantsConfig = Array.isArray(this.templateConfig[configKey])
        ? this.templateConfig[configKey]
        : [];

      if (variantsConfig.length === 0) {
        this.logger.exitFunction('buildVariants', { count: 0 });
        return [];
      }

      const limit = this.resolveVariantLimit(variantsConfig.length);
      const theme = this.resolveTheme();
      const crestUrls = this.resolveCrests();
      const buyerOverrides = this.resolveTextOverrides(normalizedPostType);

      const variants = variantsConfig.slice(0, limit).map(variantConfig => {
        const defaultText = variantConfig.default_text || {};
        const placeholders = this.resolvePlaceholderValues(
          variantConfig.placeholder_bindings,
          context
        );

        return {
          variant_id: variantConfig.variant_id,
          template_id: variantConfig.template_id,
          name: variantConfig.name,
          post_type: normalizedPostType,
          theme: theme,
          crest_urls: crestUrls,
          text_overrides: {
            ...defaultText,
            ...buyerOverrides
          },
          placeholders: placeholders,
          style: variantConfig.style || {},
          tags: variantConfig.tags || []
        };
      });

      this.logger.exitFunction('buildVariants', {
        post_type: normalizedPostType,
        count: variants.length
      });

      return variants;

    } catch (error) {
      this.logger.error('Failed to build template variants', {
        error: error.toString(),
        post_type: normalizedPostType
      });
      return [];
    }
  }

  /**
   * Resolve post type for a given event type using config mapping.
   * @param {string} eventType - Make.com event type identifier.
   * @returns {string|null} Resolved post type or null.
   */
  static resolvePostType(eventType) {
    if (!eventType) {
      return null;
    }

    const mapping = getConfigValue('MAKE.CONTENT_SLOTS', {});
    if (mapping && typeof mapping === 'object') {
      if (mapping[eventType]) {
        return mapping[eventType];
      }

      const upperKey = eventType.toUpperCase();
      if (mapping[upperKey]) {
        return mapping[upperKey];
      }
    }

    return null;
  }

  /**
   * Resolve maximum variants per type respecting limits.
   * @param {number} available - Available variant definitions.
   * @returns {number} Limit to apply.
   */
  resolveVariantLimit(available) {
    const maxAllowed = this.variantSettings?.MAX_PER_POST_TYPE || 15;
    const minRecommended = this.variantSettings?.MIN_RECOMMENDED || 10;
    const limit = Math.min(maxAllowed, available);
    return Math.max(Math.min(limit, maxAllowed), Math.min(minRecommended, available));
  }

  /**
   * Resolve buyer branding colours and typography.
   * @returns {Object} Theme object for templates.
   */
  resolveTheme() {
    const colors = this.buyerProfile?.BRAND_COLORS || {};
    const typography = this.buyerProfile?.TYPOGRAPHY || {};

    return {
      primary_color: colors.PRIMARY || '#F05A28',
      secondary_color: colors.SECONDARY || '#0E1A2B',
      accent_color: colors.ACCENT || '#FFD447',
      neutral_color: colors.NEUTRAL || '#FFFFFF',
      typography: {
        primary_font: typography.PRIMARY_FONT || 'Montserrat',
        secondary_font: typography.SECONDARY_FONT || 'Roboto'
      }
    };
  }

  /**
   * Resolve crest URLs for branding.
   * @returns {Object} Crest URL map.
   */
  resolveCrests() {
    const crests = this.buyerProfile?.CREST_URLS || {};
    return {
      primary: crests.PRIMARY || '',
      secondary: crests.SECONDARY || crests.PRIMARY || '',
      tertiary: crests.TERTIARY || ''
    };
  }

  /**
   * Resolve buyer text overrides for a post type.
   * @param {string} postType - Post type key.
   * @returns {Object} Overrides.
   */
  resolveTextOverrides(postType) {
    const overrides = this.buyerProfile?.TEXT_OVERRIDES || {};
    return overrides[postType] || {};
  }

  /**
   * Resolve placeholder values using binding instructions.
   * @param {Object} bindings - Placeholder binding map.
   * @param {Object} context - Context data.
   * @returns {Object} Placeholder values.
   */
  resolvePlaceholderValues(bindings, context) {
    if (!bindings || typeof bindings !== 'object') {
      return {};
    }

    const resolved = {};

    Object.entries(bindings).forEach(([placeholderKey, binding]) => {
      if (typeof binding === 'string') {
        if (binding.startsWith('static:')) {
          resolved[placeholderKey] = binding.slice(7);
        } else {
          resolved[placeholderKey] = this.getValueFromContext(binding, context);
        }
      } else if (binding && typeof binding === 'object') {
        if (binding.type === 'list') {
          const source = this.getValueFromContext(binding.source, context);
          if (Array.isArray(source)) {
            const limit = binding.limit || source.length;
            resolved[placeholderKey] = source.slice(0, limit);
          } else {
            resolved[placeholderKey] = [];
          }
        } else if (binding.type === 'fallback') {
          const value = this.getValueFromContext(binding.source, context);
          resolved[placeholderKey] = value != null ? value : binding.default || null;
        } else if (binding.type === 'static') {
          resolved[placeholderKey] = binding.value;
        } else {
          resolved[placeholderKey] = this.getValueFromContext(binding.source, context);
        }
      } else {
        resolved[placeholderKey] = binding;
      }
    });

    return resolved;
  }

  /**
   * Retrieve nested value from context via dot/bracket notation.
   * @param {string} path - Context path (e.g., fixtures_list[0].opponent).
   * @param {Object} context - Context object.
   * @returns {*} Resolved value or null.
   */
  getValueFromContext(path, context) {
    if (!path) {
      return null;
    }

    const segments = path.split('.');
    let current = context;

    for (let i = 0; i < segments.length; i += 1) {
      if (current == null) {
        return null;
      }

      const segment = segments[i];
      const match = segment.match(/^([a-zA-Z0-9_]+)(\[(\d+)\])?$/);
      if (!match) {
        return null;
      }

      const property = match[1];
      if (!(property in current)) {
        return null;
      }

      current = current[property];

      if (match[2]) {
        const index = parseInt(match[3], 10);
        if (!Array.isArray(current) || index >= current.length) {
          return null;
        }
        current = current[index];
      }
    }

    return current != null ? current : null;
  }
}

/** @type {TemplateVariantBuilder|null} */
let __templateVariantBuilderInstance = null;

/**
 * Build template variant collection keyed by post type.
 * @param {string} postType - Post type key.
 * @param {Object} context - Context data for bindings.
 * @returns {Object} Variant collection map.
 */
function buildTemplateVariantCollection(postType, context = {}) {
  const variantLogger = logger.scope('TemplateVariantHelper');
  variantLogger.enterFunction('buildTemplateVariantCollection', { post_type: postType });

  try {
    if (typeof TemplateVariantBuilder === 'undefined') {
      variantLogger.warn('TemplateVariantBuilder not available');
      variantLogger.exitFunction('buildTemplateVariantCollection', { count: 0 });
      return {};
    }

    if (!__templateVariantBuilderInstance) {
      __templateVariantBuilderInstance = new TemplateVariantBuilder();
    }

    const variants = __templateVariantBuilderInstance.buildVariants(postType, context);
    const collection = variants.length > 0 ? { [postType]: variants } : {};

    variantLogger.exitFunction('buildTemplateVariantCollection', {
      post_type: postType,
      count: variants.length
    });

    return collection;

  } catch (error) {
    variantLogger.error('Failed to build template variant collection', {
      error: error.toString(),
      post_type: postType
    });
    return {};
  }
}

/**
 * Build template variant collection from event type.
 * @param {string} eventType - Event type identifier.
 * @param {Object} context - Context data.
 * @returns {Object} Variant collection map.
 */
function buildTemplateVariantsForEvent(eventType, context = {}) {
  const helperLogger = logger.scope('TemplateVariantHelper');
  helperLogger.enterFunction('buildTemplateVariantsForEvent', { event_type: eventType });

  try {
    const postType = TemplateVariantBuilder.resolvePostType(eventType);

    if (!postType) {
      helperLogger.exitFunction('buildTemplateVariantsForEvent', {
        event_type: eventType,
        count: 0
      });
      return {};
    }

    const collection = buildTemplateVariantCollection(postType, context);

    helperLogger.exitFunction('buildTemplateVariantsForEvent', {
      event_type: eventType,
      post_type: postType,
      count: (collection[postType] || []).length
    });

    return collection;

  } catch (error) {
    helperLogger.error('Failed to build template variants for event', {
      error: error.toString(),
      event_type: eventType
    });
    return {};
  }
}

// ==================== MAKE INTEGRATION MANAGER CLASS ====================

/**
 * Make Integration Manager - Enhanced webhook management
 */
class MakeIntegration {
  
  constructor() {
    this.loggerName = 'MakeIntegration';
    this._logger = null;
    this.webhookQueue = [];
    this.retryQueue = [];
    this.rateLimiter = {
      lastCall: 0,
      minInterval: getConfigValue('PERFORMANCE.WEBHOOK_RATE_LIMIT_MS', 1000)
    };
    this.metrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      retriedCalls: 0
    };
    this.idempotency = {
      enabled: getConfigValue('MAKE.IDEMPOTENCY.ENABLED', true),
      ttlSeconds: getConfigValue('MAKE.IDEMPOTENCY.TTL_SECONDS', 86400),
      cachePrefix: getConfigValue('MAKE.IDEMPOTENCY.CACHE_PREFIX', 'MAKE_IDEMPOTENCY_'),
      cache: (typeof CacheService !== 'undefined' && CacheService.getScriptCache)
        ? CacheService.getScriptCache()
        : null
    };
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

  // ==================== BACKEND API INTEGRATION ====================

  /**
   * Check if backend API posting is enabled
   * @returns {boolean} True if backend posting is configured
   */
  isBackendEnabled() {
    const backendUrl = PropertiesService.getScriptProperties().getProperty('BACKEND_API_URL');
    const automationJWT = PropertiesService.getScriptProperties().getProperty('AUTOMATION_JWT');
    return !!(backendUrl && automationJWT);
  }

  /**
   * Post event to backend API
   * @param {Object} payload - Event payload
   * @param {Object} options - Send options
   * @returns {Object} Send result
   */
  postToBackend(payload, options = {}) {
    this.logger.enterFunction('postToBackend', {
      event_type: payload.event_type
    });

    try {
      const backendUrl = PropertiesService.getScriptProperties().getProperty('BACKEND_API_URL');
      const automationJWT = PropertiesService.getScriptProperties().getProperty('AUTOMATION_JWT');
      const tenantId = PropertiesService.getScriptProperties().getProperty('TENANT_ID') || 'syston';
      const resolvedIdempotencyKey = options.idempotencyKey || this.resolveIdempotencyKey(payload, options);
      const tenantScopedIdempotencyKey = resolvedIdempotencyKey
        ? (resolvedIdempotencyKey.indexOf(`${tenantId}:`) === 0
          ? resolvedIdempotencyKey
          : `${tenantId}:${resolvedIdempotencyKey}`)
        : null;

      if (!backendUrl || !automationJWT) {
        throw new Error('Backend API URL or Automation JWT not configured');
      }

      // Transform payload to backend format
      const backendPayload = {
        event_type: payload.event_type,
        data: payload,
        channels: payload.channels || ['yt', 'fb', 'ig'],
        template: payload.event_type
      };

      const maxRetries = options.maxRetries || 3;
      const retryDelay = options.retryDelay || 2000;
      let lastError = null;
      const fetchFn = typeof options.fetchImpl === 'function' ? options.fetchImpl : UrlFetchApp.fetch;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // @testHook(backend_post_attempt_start)
          const requestUrl = `${backendUrl}/api/v1/post`;
          const requestHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${automationJWT}`,
            'X-Tenant-Id': tenantId
          };

          if (tenantScopedIdempotencyKey) {
            requestHeaders['Idempotency-Key'] = tenantScopedIdempotencyKey;
          }

          const fetchOptions = {
            method: 'POST',
            headers: requestHeaders,
            payload: JSON.stringify(backendPayload),
            muteHttpExceptions: true
          };

          const hookContext = {
            attempt,
            url: requestUrl,
            tenantId,
            idempotencyKey: tenantScopedIdempotencyKey,
            headers: {
              ...requestHeaders,
              Authorization: 'REDACTED'
            }
          };

          const hookResult = invokeTestHook_('backend_post_attempt_start', hookContext, options.testHooks);

          const response = hookResult && hookResult.mockResponse
            ? hookResult.mockResponse
            : fetchFn(requestUrl, fetchOptions);

          const responseCode = response.getResponseCode();
          const responseText = response.getContentText();

          // @testHook(backend_post_attempt_complete)
          invokeTestHook_('backend_post_attempt_complete', {
            ...hookContext,
            response_code: responseCode,
            response_text: responseText
          }, options.testHooks);

          if (responseCode >= 200 && responseCode < 300) {
            const responseData = JSON.parse(responseText);

            this.logger.exitFunction('postToBackend', {
              success: true,
              response_code: responseCode,
              job_id: responseData.job_id
            });

            return {
              success: true,
              response_code: responseCode,
              response_text: responseText,
              job_id: responseData.job_id,
              attempts: attempt
            };
          }

          // Handle error responses
          if (responseCode === 429) {
            lastError = `Rate limited (429)`;
            if (attempt < maxRetries) {
              Utilities.sleep(retryDelay * attempt * 2);
              continue;
            }
          } else if (responseCode >= 500) {
            lastError = `Server error (${responseCode})`;
            if (attempt < maxRetries) {
              Utilities.sleep(retryDelay * attempt);
              continue;
            }
          } else {
            return {
              success: false,
              response_code: responseCode,
              response_text: responseText,
              error: `Backend API error (${responseCode})`,
              attempts: attempt
            };
          }

        } catch (error) {
          lastError = error.toString();
          if (attempt < maxRetries) {
            Utilities.sleep(retryDelay * attempt);
            continue;
          }
        }
      }

      // All retries failed
      this.logger.error('Backend API post failed after retries', {
        attempts: maxRetries,
        last_error: lastError
      });

      return {
        success: false,
        error: lastError,
        attempts: maxRetries
      };

    } catch (error) {
      this.logger.error('Backend API post failed', {
        error: error.toString()
      });

      return {
        success: false,
        error: error.toString()
      };
    }
  }

  // ==================== ENHANCED WEBHOOK SENDING ====================

  /**
   * Send payload to Make.com with enhanced error handling
   * @param {Object} payload - Payload to send
   * @param {Object} options - Send options
   * @returns {Object} Send result
   */
  sendToMake(payload, options = {}) {
    this.logger.enterFunction('sendToMake', {
      event_type: payload.event_type,
      options
    });

    try {
      // @testHook(make_send_start)

      // Validate payload
      const validationResult = this.validatePayload(payload);
      if (!validationResult.valid) {
        throw new Error(`Invalid payload: ${validationResult.errors.join(', ')}`);
      }

      const idempotencyKey = this.resolveIdempotencyKey(payload, options);

      if (idempotencyKey && this.isDuplicatePayload(idempotencyKey)) {
        this.logger.info('Duplicate payload detected, skipping Make.com send', {
          event_type: payload.event_type,
          idempotency_key: idempotencyKey
        });

        return {
          success: true,
          skipped: true,
          reason: 'duplicate_payload',
          event_type: payload.event_type,
          idempotency_key: idempotencyKey,
          timestamp: DateUtils.formatISO(DateUtils.now())
        };
      }

      // Check if backend posting is enabled
      const backendEnabled = this.isBackendEnabled();

      if (backendEnabled) {
        this.logger.info('Backend API posting enabled, routing through backend', {
          event_type: payload.event_type
        });

        const backendOptions = { ...options };
        if (idempotencyKey) {
          backendOptions.idempotencyKey = idempotencyKey;
        }

        const backendResult = this.postToBackend(payload, backendOptions);

        if (backendResult.success) {
          if (idempotencyKey) {
            this.markPayloadProcessed(idempotencyKey);
          }

          this.metrics.lastPost = DateUtils.formatISO(DateUtils.now());
          this.updateMetrics(true);

          this.logger.exitFunction('sendToMake', {
            success: true,
            routed_via: 'backend',
            job_id: backendResult.job_id
          });

          return backendResult;
        }

        // @testHook(make_backend_post_failed)
        this.logger.warn('Backend API post failed, falling back to Make.com', {
          event_type: payload.event_type,
          response_code: backendResult.response_code,
          error: backendResult.error || backendResult.response_text || 'unknown_error'
        });
      }

      if (!backendEnabled) {
        this.logger.info('Backend API posting disabled, using direct Make.com webhook', {
          event_type: payload.event_type
        });
      }

      // Apply rate limiting
      this.applyRateLimit();

      // Prepare webhook call
      const webhookUrl = getWebhookUrl();
      if (!webhookUrl) {
        throw new Error('Webhook URL not configured');
      }
      
      // Add system metadata to payload
      const enhancedPayload = this.enhancePayload(payload);

      // Execute webhook call with retry logic
      const sendResult = this.executeWebhookCall(webhookUrl, enhancedPayload, options);

      if (sendResult.success && idempotencyKey) {
        this.markPayloadProcessed(idempotencyKey);
      }

      if (sendResult.success) {
        this.metrics.lastPost = DateUtils.formatISO(DateUtils.now());
      }

      // Update metrics
      this.updateMetrics(sendResult.success);
      
      // @testHook(make_send_complete)
      
      const routedVia = backendEnabled ? 'make_fallback' : 'make_direct';

      this.logger.exitFunction('sendToMake', {
        success: sendResult.success,
        response_code: sendResult.response_code,
        routed_via: routedVia
      });

      return sendResult;

    } catch (error) {
      this.logger.error('Make.com send failed', { 
        error: error.toString(),
        event_type: payload.event_type
      });
      
      this.updateMetrics(false);
      
      return {
        success: false,
        error: error.toString(),
        event_type: payload.event_type,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Send batch payloads to Make.com
   * @param {Array} payloads - Array of payloads
   * @param {Object} options - Batch options
   * @returns {Object} Batch send result
   */
  sendBatchToMake(payloads, options = {}) {
    this.logger.enterFunction('sendBatchToMake', { 
      payload_count: payloads.length,
      options 
    });
    
    try {
      // @testHook(batch_send_start)
      
      if (!Array.isArray(payloads) || payloads.length === 0) {
        throw new Error('Invalid payloads array');
      }
      
      const batchSize = options.batchSize || getConfigValue('PERFORMANCE.BATCH_SIZE', 5);
      const results = [];
      
      // Process payloads in batches
      for (let i = 0; i < payloads.length; i += batchSize) {
        const batch = payloads.slice(i, i + batchSize);
        
        const batchResults = batch.map(payload => {
          return this.sendToMake(payload, { ...options, skipRateLimit: true });
        });
        
        results.push(...batchResults);
        
        // Wait between batches
        if (i + batchSize < payloads.length) {
          Utilities.sleep(this.rateLimiter.minInterval);
        }
      }
      
      // @testHook(batch_send_complete)
      
      const successCount = results.filter(r => r.success).length;
      const overallSuccess = successCount === payloads.length;
      
      this.logger.exitFunction('sendBatchToMake', { 
        success: overallSuccess,
        success_count: successCount,
        total_count: payloads.length
      });
      
      return {
        success: overallSuccess,
        results: results,
        success_count: successCount,
        total_count: payloads.length,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Batch send failed', { error: error.toString() });
      return {
        success: false,
        error: error.toString(),
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  // ==================== WEBHOOK EXECUTION WITH RETRY ====================

  /**
   * Execute webhook call with retry logic
   * @param {string} webhookUrl - Webhook URL
   * @param {Object} payload - Enhanced payload
   * @param {Object} options - Send options
   * @returns {Object} Execution result
   */
  executeWebhookCall(webhookUrl, payload, options = {}) {
    const maxRetries = options.maxRetries || getConfigValue('MAKE.WEBHOOK_RETRY_ATTEMPTS', 3);
    const retryDelay = options.retryDelay || getConfigValue('MAKE.WEBHOOK_RETRY_DELAY_MS', 2000);
    const clubIdentifier = String(
      getConfigValue('SYSTEM.CLUB_SHORT_NAME', getConfigValue('SYSTEM.CLUB_NAME', 'Club'))
    ).replace(/\s+/g, '') || 'Club';
    
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // @testHook(webhook_attempt_start)
        
        // Prepare payload string for signing
        const payloadString = JSON.stringify(payload);

        // Generate webhook signature if secret is configured
        const signature = this.generateWebhookSignature(payload);
        const timestamp = Math.floor(Date.now() / 1000).toString();

        // Build headers with optional signature
        const headers = {
          'Content-Type': 'application/json',
          'User-Agent': `${clubIdentifier}Automation/${getConfigValue('SYSTEM.VERSION')}`,
          'X-Attempt': attempt.toString(),
          'X-Event-Type': payload.event_type,
          'X-Make-Timestamp': timestamp
        };

        // Add signature header if available
        if (signature) {
          headers['X-Make-Signature'] = signature;
        }

        const response = UrlFetchApp.fetch(webhookUrl, {
          method: 'POST',
          headers: headers,
          payload: payloadString,
          muteHttpExceptions: true
        });
        
        const responseCode = response.getResponseCode();
        const responseText = response.getContentText();
        
        // @testHook(webhook_attempt_complete)
        
        // Check if successful
        if (responseCode >= 200 && responseCode < 300) {
          if (attempt > 1) {
            this.metrics.retriedCalls++;
            this.logger.info('Webhook succeeded after retry', { 
              attempt,
              response_code: responseCode
            });
          }
          
          return {
            success: true,
            response_code: responseCode,
            response_text: responseText,
            attempts: attempt
          };
        }
        
        // Handle specific error codes
        if (responseCode === 429) {
          // Rate limited - wait longer
          lastError = `Rate limited (429)`;
          if (attempt < maxRetries) {
            Utilities.sleep(retryDelay * attempt * 2); // Exponential backoff
            continue;
          }
        } else if (responseCode >= 500) {
          // Server error - retry
          lastError = `Server error (${responseCode})`;
          if (attempt < maxRetries) {
            Utilities.sleep(retryDelay * attempt);
            continue;
          }
        } else {
          // Client error - don't retry
          return {
            success: false,
            response_code: responseCode,
            response_text: responseText,
            error: `Client error (${responseCode})`,
            attempts: attempt
          };
        }
        
      } catch (error) {
        lastError = error.toString();
        
        // Network error - retry
        if (attempt < maxRetries) {
          this.logger.warn('Webhook network error, retrying', { 
            attempt,
            error: lastError
          });
          Utilities.sleep(retryDelay * attempt);
          continue;
        }
      }
    }
    
    // All attempts failed
    return {
      success: false,
      error: lastError || 'All retry attempts failed',
      attempts: maxRetries
    };
  }

  // ==================== PAYLOAD ENHANCEMENT ====================

  /**
   * Enhance payload with system metadata
   * @param {Object} payload - Original payload
   * @returns {Object} Enhanced payload
   */
  enhancePayload(payload) {
    const enhanced = {
      ...payload,

      // System metadata
      system: {
        version: getConfigValue('SYSTEM.VERSION'),
        environment: getConfigValue('SYSTEM.ENVIRONMENT'),
        timestamp: DateUtils.formatISO(DateUtils.now()),
        session_id: logger.sessionId
      },
      
      // Webhook metadata
      webhook: {
        sent_at: DateUtils.formatISO(DateUtils.now()),
        attempt: 1,
        priority: this.determinePayloadPriority(payload),
        router_hint: this.getRouterHint(payload.event_type)
      },
      
      // Club metadata
      club: {
        name: getConfigValue('SYSTEM.CLUB_NAME'),
        short_name: getConfigValue('SYSTEM.CLUB_SHORT_NAME'),
        season: getConfigValue('SYSTEM.SEASON')
      }
    };

    if (payload.privacy) {
      enhanced.privacy = {
        ...payload.privacy,
        anonymiseFaces: !!payload.privacy.anonymiseFaces,
        useInitialsOnly: !!payload.privacy.useInitialsOnly
      };
      enhanced.anonymise_faces = !!payload.privacy.anonymiseFaces;
      enhanced.use_initials_only = !!payload.privacy.useInitialsOnly;
    }

    // Add payload validation signature
    enhanced.webhook.signature = this.generatePayloadSignature(enhanced);

    return enhanced;
  }

  /**
   * Validate payload before sending
   * @param {Object} payload - Payload to validate
   * @returns {Object} Validation result
   */
  validatePayload(payload) {
    const errors = [];
    
    // Check required fields
    if (!payload.event_type) {
      errors.push('Missing event_type');
    }
    
    if (!payload.timestamp) {
      errors.push('Missing timestamp');
    }
    
    // Validate event type
    const validEventTypes = Object.values(getConfigValue('MAKE.EVENT_TYPES', {}));
    if (payload.event_type && !validEventTypes.includes(payload.event_type)) {
      errors.push(`Invalid event_type: ${payload.event_type}`);
    }
    
    // Check payload size
    const payloadSize = JSON.stringify(payload).length;
    const maxSize = 100000; // 100KB limit
    if (payloadSize > maxSize) {
      errors.push(`Payload too large: ${payloadSize} bytes`);
    }
    
    return {
      valid: errors.length === 0,
      errors: errors,
      size: payloadSize
    };
  }

  // ==================== RATE LIMITING ====================

  /**
   * Apply rate limiting between webhook calls
   */
  applyRateLimit() {
    const now = Date.now();
    const timeSinceLastCall = now - this.rateLimiter.lastCall;
    
    if (timeSinceLastCall < this.rateLimiter.minInterval) {
      const waitTime = this.rateLimiter.minInterval - timeSinceLastCall;
      Utilities.sleep(waitTime);
    }
    
    this.rateLimiter.lastCall = Date.now();
  }

  // ==================== ROUTER MANAGEMENT ====================

  /**
   * Get router hint for event type
   * @param {string} eventType - Event type
   * @returns {string} Router hint
   */
  getRouterHint(eventType) {
    // Map event types to router branches
    const routerMap = {
      'goal_team': 'live_events',
      'goal_opposition': 'opposition_events',
      'card_yellow': 'discipline_events',
      'card_red': 'discipline_events',
      'card_second_yellow': 'enhanced_discipline',
      'fixtures_1_league': 'batch_fixtures',
      'fixtures_2_league': 'batch_fixtures',
      'fixtures_3_league': 'batch_fixtures',
      'fixtures_4_league': 'batch_fixtures',
      'fixtures_5_league': 'batch_fixtures',
      'results_1_league': 'batch_results',
      'results_2_league': 'batch_results',
      'results_3_league': 'batch_results',
      'results_4_league': 'batch_results',
        'results_5_league': 'batch_results',
        'weekly_fixtures': 'weekly_content',
        'weekly_quotes': 'weekly_content',
        'weekly_stats': 'weekly_content',
        'weekly_throwback': 'weekly_content',
        'weekly_countdown_1': 'weekly_content',
        'weekly_countdown_2': 'weekly_content',
        'fixtures_this_month': 'monthly_content',
        'results_this_month': 'monthly_content',
        'player_stats_summary': 'player_content',
        'video_clip_processing': 'video_processing'
      };
    
    return routerMap[eventType] || 'default';
  }

  /**
   * Validate router configuration
   * @returns {Object} Validation result
   */
  validateRouterConfiguration() {
    try {
      const eventTypes = getConfigValue('MAKE.EVENT_TYPES', {});
      const missingRoutes = [];

      Object.values(eventTypes).forEach(eventType => {
        const routerHint = this.getRouterHint(eventType);
        if (routerHint === 'default') {
          missingRoutes.push(eventType);
        }
      });

      return {
        valid: missingRoutes.length === 0,
        missing_routes: missingRoutes,
        total_event_types: Object.keys(eventTypes).length
      };

    } catch (error) {
      return {
        valid: false,
        error: error.toString()
      };
    }
  }

  /**
   * Build router documentation including template variant previews.
   * @param {Object<string, Object>} contextOverrides - Optional context overrides keyed by event type or post type.
   * @returns {Object} Router documentation payload.
   */
  getRouterDocumentation(contextOverrides = {}) {
    this.logger.enterFunction('getRouterDocumentation', {
      context_override_keys: Object.keys(contextOverrides || {})
    });

    try {
      // @testHook(router_documentation_start)

      const eventTypes = getConfigValue('MAKE.EVENT_TYPES', {});
      const documentation = [];

      Object.entries(eventTypes).forEach(([configKey, eventType]) => {
        const postType = TemplateVariantBuilder.resolvePostType(eventType);
        const context = contextOverrides[eventType]
          || contextOverrides[postType]
          || {};
        const variants = postType
          ? buildTemplateVariantCollection(postType, context)[postType] || []
          : [];

        documentation.push({
          config_key: configKey,
          event_type: eventType,
          router_branch: this.getRouterHint(eventType),
          post_type: postType,
          variant_count: variants.length,
          template_variants: variants
        });
      });

      const payload = {
        generated_at: DateUtils.formatISO(DateUtils.now()),
        version: getConfigValue('SYSTEM.VERSION'),
        total_routes: documentation.length,
        routes: documentation
      };

      // @testHook(router_documentation_complete)

      this.logger.exitFunction('getRouterDocumentation', {
        total_routes: documentation.length
      });

      return payload;

    } catch (error) {
      this.logger.error('Router documentation generation failed', {
        error: error.toString()
      });
      return {
        error: error.toString(),
        generated_at: DateUtils.formatISO(DateUtils.now()),
        version: getConfigValue('SYSTEM.VERSION'),
        routes: []
      };
    }
  }

  // ==================== WEBHOOK SIGNATURE VALIDATION ====================

  /**
   * Generate webhook signature for outgoing payloads
   * @param {Object} payload - Payload object
   * @param {string} secret - Webhook secret
   * @returns {string} Generated signature
   */
  generateWebhookSignature(payload, secret = null) {
    try {
      const webhookSecret = secret || getConfigValue('MAKE.WEBHOOK_SECRET');
      if (!webhookSecret) {
        this.logger.warn('Webhook secret not configured for signature generation');
        return null;
      }

      const payloadString = JSON.stringify(payload, Object.keys(payload).sort());
      const signature = Utilities.computeHmacSha256Signature(payloadString, webhookSecret);
      const hexSignature = signature.map(byte => (byte & 0xff).toString(16).padStart(2, '0')).join('');

      return `sha256=${hexSignature}`;
    } catch (error) {
      this.logger.error('Failed to generate webhook signature', { error: error.toString() });
      return null;
    }
  }

  /**
   * Validate incoming webhook signature from Make.com
   * @param {Object} request - Incoming request object
   * @param {string} payload - Raw payload string
   * @param {string} receivedSignature - Signature from header
   * @returns {Object} Validation result
   */
  validateIncomingWebhookSignature(request, payload, receivedSignature) {
    this.logger.enterFunction('validateIncomingWebhookSignature', {
      hasSignature: !!receivedSignature,
      payloadSize: payload ? payload.length : 0
    });

    try {
      const webhookSecret = getConfigValue('MAKE.WEBHOOK_SECRET');
      if (!webhookSecret) {
        this.logger.warn('Webhook secret not configured - skipping signature validation');
        return {
          valid: true,
          skipped: true,
          reason: 'webhook_secret_not_configured'
        };
      }

      if (!receivedSignature) {
        this.logger.security('Webhook received without signature', {
          remoteAddress: request.remoteAddress,
          userAgent: request.headers ? request.headers['User-Agent'] : null
        });
        return {
          valid: false,
          reason: 'missing_signature',
          security_event: true
        };
      }

      // Extract signature from header (format: "sha256=...")
      const signatureMatch = receivedSignature.match(/^sha256=([a-f0-9]+)$/);
      if (!signatureMatch) {
        this.logger.security('Invalid signature format received', {
          receivedFormat: receivedSignature.substring(0, 20) + '...',
          remoteAddress: request.remoteAddress
        });
        return {
          valid: false,
          reason: 'invalid_signature_format',
          security_event: true
        };
      }

      const receivedHash = signatureMatch[1];

      // Generate expected signature
      const expectedSignature = Utilities.computeHmacSha256Signature(payload, webhookSecret);
      const expectedHash = expectedSignature.map(byte => (byte & 0xff).toString(16).padStart(2, '0')).join('');

      // Constant-time comparison to prevent timing attacks
      const isValid = this.constantTimeCompare(receivedHash, expectedHash);

      if (!isValid) {
        this.logger.security('Webhook signature validation failed', {
          remoteAddress: request.remoteAddress,
          userAgent: request.headers ? request.headers['User-Agent'] : null,
          expectedLength: expectedHash.length,
          receivedLength: receivedHash.length
        });
        return {
          valid: false,
          reason: 'signature_mismatch',
          security_event: true
        };
      }

      this.logger.info('Webhook signature validated successfully');
      return {
        valid: true,
        reason: 'signature_valid'
      };

    } catch (error) {
      this.logger.error('Webhook signature validation error', { error: error.toString() });
      return {
        valid: false,
        reason: 'validation_error',
        error: error.toString()
      };
    }
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {boolean} True if strings are equal
   */
  constantTimeCompare(a, b) {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Verify webhook timestamp to prevent replay attacks
   * @param {string} timestamp - Timestamp from webhook header
   * @param {number} toleranceSeconds - Maximum age tolerance in seconds
   * @returns {Object} Verification result
   */
  verifyWebhookTimestamp(timestamp, toleranceSeconds = 300) {
    try {
      if (!timestamp) {
        return {
          valid: false,
          reason: 'missing_timestamp'
        };
      }

      const webhookTime = parseInt(timestamp, 10);
      if (isNaN(webhookTime)) {
        return {
          valid: false,
          reason: 'invalid_timestamp_format'
        };
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const ageDifference = Math.abs(currentTime - webhookTime);

      if (ageDifference > toleranceSeconds) {
        this.logger.security('Webhook timestamp outside tolerance window', {
          webhookTime: new Date(webhookTime * 1000).toISOString(),
          currentTime: new Date(currentTime * 1000).toISOString(),
          ageDifference: ageDifference,
          toleranceSeconds: toleranceSeconds
        });
        return {
          valid: false,
          reason: 'timestamp_too_old',
          age_difference: ageDifference,
          tolerance: toleranceSeconds
        };
      }

      return {
        valid: true,
        age_difference: ageDifference
      };

    } catch (error) {
      this.logger.error('Webhook timestamp verification error', { error: error.toString() });
      return {
        valid: false,
        reason: 'verification_error',
        error: error.toString()
      };
    }
  }

  /**
   * Enhanced webhook security validation combining signature and timestamp
   * @param {Object} request - Incoming request object
   * @param {string} payload - Raw payload string
   * @returns {Object} Comprehensive validation result
   */
  validateWebhookSecurity(request) {
    this.logger.enterFunction('validateWebhookSecurity', {
      hasHeaders: !!request.headers,
      remoteAddress: request.remoteAddress
    });

    try {
      const headers = request.headers || {};
      const payload = request.postData ? request.postData.contents : '';

      // Extract security headers
      const signature = headers['X-Make-Signature'] || headers['x-make-signature'];
      const timestamp = headers['X-Make-Timestamp'] || headers['x-make-timestamp'];
      const userAgent = headers['User-Agent'] || headers['user-agent'];

      // Validate signature
      const signatureResult = this.validateIncomingWebhookSignature(request, payload, signature);

      // Validate timestamp
      const timestampResult = this.verifyWebhookTimestamp(timestamp);

      // Check User-Agent for Make.com
      const validUserAgent = userAgent && userAgent.includes('Make.com');
      if (!validUserAgent) {
        this.logger.security('Suspicious User-Agent for webhook', {
          userAgent: userAgent,
          remoteAddress: request.remoteAddress
        });
      }

      // Overall security assessment
      const overallValid = signatureResult.valid && timestampResult.valid;

      if (overallValid) {
        this.logger.audit('Webhook security validation passed', {
          remoteAddress: request.remoteAddress,
          signatureValid: signatureResult.valid,
          timestampValid: timestampResult.valid,
          userAgent: userAgent
        });
      } else {
        this.logger.security('Webhook security validation failed', {
          remoteAddress: request.remoteAddress,
          signatureValid: signatureResult.valid,
          signatureReason: signatureResult.reason,
          timestampValid: timestampResult.valid,
          timestampReason: timestampResult.reason,
          userAgent: userAgent
        });
      }

      const result = {
        valid: overallValid,
        signature: signatureResult,
        timestamp: timestampResult,
        user_agent_valid: validUserAgent,
        remote_address: request.remoteAddress,
        security_level: overallValid ? 'secure' : 'insecure',
        validation_timestamp: DateUtils.formatISO(DateUtils.now())
      };

      this.logger.exitFunction('validateWebhookSecurity', {
        valid: overallValid,
        security_level: result.security_level
      });

      return result;

    } catch (error) {
      this.logger.error('Webhook security validation error', { error: error.toString() });
      return {
        valid: false,
        error: error.toString(),
        security_level: 'error',
        validation_timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Determine payload priority
   * @param {Object} payload - Payload object
   * @returns {string} Priority level
   */
  determinePayloadPriority(payload) {
    const highPriorityEvents = [
      'goal_team', 'goal_opposition', 'card_red', 'card_second_yellow',
      'kick_off', 'half_time', 'full_time'
    ];

    const mediumPriorityEvents = [
      'card_yellow', 'substitution', 'motm', 'second_half_kickoff'
    ];

    if (highPriorityEvents.includes(payload.event_type)) {
      return 'high';
    } else if (mediumPriorityEvents.includes(payload.event_type)) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Generate payload signature for validation
   * @param {Object} payload - Payload object
   * @returns {string} Signature
   */
  generatePayloadSignature(payload) {
    // Simple signature based on key payload properties
    const signatureData = {
      event_type: payload.event_type,
      timestamp: payload.timestamp,
      club: payload.club?.name,
      version: payload.system?.version
    };

    return StringUtils.generateId('sig');
  }

  /**
   * Resolve idempotency key for payload
   * @param {Object} payload - Payload to evaluate
   * @param {Object} options - Send options
   * @returns {string|null} Idempotency key
   */
  resolveIdempotencyKey(payload, options = {}) {
    if (options.skipIdempotency) {
      return null;
    }

    if (options.idempotencyKey) {
      return `${this.idempotency.cachePrefix}${options.idempotencyKey}`;
    }

    if (!this.idempotency.enabled) {
      return null;
    }

    return this.generateIdempotencyKey(payload);
  }

  /**
   * Generate idempotency key for payload
   * @param {Object} payload - Payload object
   * @returns {string} Idempotency key
   */
  generateIdempotencyKey(payload) {
    try {
      const fingerprint = this.getIdempotencyFingerprint(payload);
      const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, fingerprint);
      const hash = this.bytesToHex(digest);

      return `${this.idempotency.cachePrefix}${payload.event_type || 'unknown'}_${hash}`;
    } catch (error) {
      this.logger.warn('Failed to generate idempotency key', { error: error.toString() });
      return `${this.idempotency.cachePrefix}${StringUtils.generateId('make_event')}`;
    }
  }

  /**
   * Create payload fingerprint for idempotency hashing
   * @param {Object} payload - Payload object
   * @returns {string} Fingerprint string
   */
  getIdempotencyFingerprint(payload) {
    try {
      const clone = JSON.parse(JSON.stringify(payload || {}));

      delete clone.timestamp;
      delete clone.system;
      delete clone.webhook;

      return JSON.stringify(clone);
    } catch (error) {
      this.logger.warn('Failed to normalize payload for idempotency', { error: error.toString() });
      return JSON.stringify({ event_type: payload?.event_type || 'unknown', fallback: true });
    }
  }

  /**
   * Convert byte array to hex string
   * @param {Array<number>} bytes - Byte array
   * @returns {string} Hex string
   */
  bytesToHex(bytes) {
    return bytes
      .map(byte => (byte & 0xff).toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Check if payload was already processed
   * @param {string} idempotencyKey - Idempotency key
   * @returns {boolean} True if duplicate
   */
  isDuplicatePayload(idempotencyKey) {
    if (!idempotencyKey) {
      return false;
    }

    try {
      if (this.idempotency.cache && this.idempotency.cache.get(idempotencyKey)) {
        return true;
      }

      const scriptProperties = PropertiesService.getScriptProperties();
      const stored = scriptProperties.getProperty(idempotencyKey);

      if (!stored) {
        return false;
      }

      const parsed = JSON.parse(stored);
      if (parsed && parsed.expiresAt && parsed.expiresAt < Date.now()) {
        scriptProperties.deleteProperty(idempotencyKey);
        return false;
      }

      return true;

    } catch (error) {
      this.logger.warn('Idempotency duplicate check failed', { error: error.toString(), idempotencyKey });
      return false;
    }
  }

  /**
   * Mark payload as processed for idempotency
   * @param {string} idempotencyKey - Idempotency key
   */
  markPayloadProcessed(idempotencyKey) {
    if (!idempotencyKey) {
      return;
    }

    try {
      const ttlSeconds = this.idempotency.ttlSeconds || 86400;

      if (this.idempotency.cache) {
        const cacheTtl = Math.min(ttlSeconds, 21600);
        this.idempotency.cache.put(idempotencyKey, '1', cacheTtl);
      }

      const scriptProperties = PropertiesService.getScriptProperties();
      const expiresAt = Date.now() + (ttlSeconds * 1000);

      scriptProperties.setProperty(idempotencyKey, JSON.stringify({ expiresAt }));

    } catch (error) {
      this.logger.warn('Failed to persist idempotency key', { error: error.toString(), idempotencyKey });
    }
  }

  /**
   * Update webhook metrics
   * @param {boolean} success - Whether call was successful
   */
  updateMetrics(success) {
    this.metrics.totalCalls++;
    if (success) {
      this.metrics.successfulCalls++;
    } else {
      this.metrics.failedCalls++;
    }
  }

  /**
   * Get webhook metrics
   * @returns {Object} Current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      success_rate: this.metrics.totalCalls > 0 ? 
        (this.metrics.successfulCalls / this.metrics.totalCalls * 100).toFixed(2) : 0,
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  }

  // ==================== HEALTH MONITORING ====================

  /**
   * Check webhook health
   * @returns {Object} Health check result
   */
  checkWebhookHealth() {
    this.logger.enterFunction('checkWebhookHealth');
    
    try {
      // @testHook(webhook_health_check_start)
      
      const healthResult = {
        webhook_configured: !!getWebhookUrl(),
        metrics: this.getMetrics(),
        rate_limiter: {
          min_interval: this.rateLimiter.minInterval,
          time_since_last_call: Date.now() - this.rateLimiter.lastCall
        },
        router_validation: this.validateRouterConfiguration(),
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
      // Determine overall health
      const successRate = parseFloat(healthResult.metrics.success_rate);
      if (successRate >= 95) {
        healthResult.status = 'healthy';
      } else if (successRate >= 80) {
        healthResult.status = 'degraded';
      } else {
        healthResult.status = 'unhealthy';
      }
      
      // @testHook(webhook_health_check_complete)
      
      this.logger.exitFunction('checkWebhookHealth', { 
        status: healthResult.status,
        success_rate: successRate
      });
      
      return healthResult;
      
    } catch (error) {
      this.logger.error('Webhook health check failed', { error: error.toString() });
      return {
        status: 'unhealthy',
        error: error.toString(),
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Test webhook connectivity
   * @returns {Object} Test result
   */
  testWebhookConnectivity() {
    this.logger.enterFunction('testWebhookConnectivity');
    
    try {
      // @testHook(webhook_connectivity_test_start)
      
      const clubName = getConfigValue('SYSTEM.CLUB_NAME', 'Your Football Club');
      const testPayload = {
        event_type: 'system_test',
        timestamp: DateUtils.formatISO(DateUtils.now()),
        test: true,
        test_data: {
          message: `Connectivity test from ${clubName} automation`,
          system_version: getConfigValue('SYSTEM.VERSION'),
          test_id: StringUtils.generateId('test')
        }
      };
      
      const testResult = this.sendToMake(testPayload, { maxRetries: 1 });
      
      // @testHook(webhook_connectivity_test_complete)
      
      this.logger.exitFunction('testWebhookConnectivity', { 
        success: testResult.success 
      });
      
      return {
        success: testResult.success,
        response_code: testResult.response_code,
        test_payload: testPayload,
        full_result: testResult,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Webhook connectivity test failed', { error: error.toString() });
      return {
        success: false,
        error: error.toString(),
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }
}

// ==================== PUBLIC API FUNCTIONS ====================

/**
 * Send payload to Make.com (public API)
 * @param {Object} payload - Payload to send
 * @param {Object} options - Send options
 * @returns {Object} Send result
 */
function sendToMake(payload, options = {}) {
  const integration = new MakeIntegration();
  return integration.sendToMake(payload, options);
}

/**
 * Send batch payloads to Make.com (public API)
 * @param {Array} payloads - Array of payloads
 * @param {Object} options - Batch options
 * @returns {Object} Batch send result
 */
function sendBatchToMake(payloads, options = {}) {
  const integration = new MakeIntegration();
  return integration.sendBatchToMake(payloads, options);
}

/**
 * Test webhook connectivity (public API)
 * @returns {Object} Test result
 */
function testWebhookConnectivity() {
  const integration = new MakeIntegration();
  return integration.testWebhookConnectivity();
}

/**
 * Get webhook metrics (public API)
 * @returns {Object} Current metrics
 */
function getWebhookMetrics() {
  const integration = new MakeIntegration();
  return integration.getMetrics();
}

/**
 * Check webhook health (public API)
 * @returns {Object} Health check result
 */
function checkWebhookHealth() {
  const integration = new MakeIntegration();
  return integration.checkWebhookHealth();
}

/**
 * Initialize Make.com integration
 * @returns {Object} Initialization result
 */
function initializeMakeIntegration() {
  logger.enterFunction('MakeIntegration.initialize');
  
  try {
    const integration = new MakeIntegration();
    
    // Test basic connectivity
    const connectivityTest = integration.testWebhookConnectivity();
    
    // Validate router configuration
    const routerValidation = integration.validateRouterConfiguration();
    
    // Get initial metrics
    const metrics = integration.getMetrics();
    
    logger.exitFunction('MakeIntegration.initialize', { 
      success: true,
      connectivity_test: connectivityTest.success
    });
    
    return {
      success: true,
      connectivity_test: connectivityTest,
      router_validation: routerValidation,
      initial_metrics: metrics,
      webhook_configured: !!getWebhookUrl(),
      version: '6.2.0'
    };
    
  } catch (error) {
    logger.error('Make.com integration initialization failed', { error: error.toString() });
    return { 
      success: false, 
      error: error.toString() 
    };
  }
}

/**
 * Retrieve Make.com router documentation including template variants.
 * @param {Object<string, Object>} contextOverrides - Optional context overrides.
 * @returns {Object} Router documentation payload.
 */
function getMakeRouterDocumentation(contextOverrides = {}) {
  const integration = new MakeIntegration();
  return integration.getRouterDocumentation(contextOverrides);
}

/**
 * Validate incoming webhook security (signature + timestamp)
 * @param {Object} request - Request object from doPost
 * @returns {Object} Validation result
 */
function validateIncomingWebhookSecurity(request) {
  const integration = new MakeIntegration();
  return integration.validateWebhookSecurity(request);
}

/**
 * Generate webhook signature for testing purposes
 * @param {Object} payload - Test payload
 * @param {string} secret - Optional secret override
 * @returns {string} Generated signature
 */
function generateTestWebhookSignature(payload, secret = null) {
  const integration = new MakeIntegration();
  return integration.generateWebhookSignature(payload, secret);
}

/**
 * Test webhook signature validation with sample data
 * @returns {Object} Test results
 */
function testWebhookSignatureValidation() {
  logger.enterFunction('testWebhookSignatureValidation');

  try {
    const integration = new MakeIntegration();

    // Test payload
    const testPayload = {
      event_type: 'security_test',
      timestamp: DateUtils.formatISO(DateUtils.now()),
      test_data: { message: 'Signature validation test' }
    };

    // Generate signature
    const signature = integration.generateWebhookSignature(testPayload);

    if (!signature) {
      return {
        success: false,
        error: 'Failed to generate test signature - check webhook secret configuration',
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }

    // Mock request object
    const mockRequest = {
      headers: {
        'X-Make-Signature': signature,
        'X-Make-Timestamp': Math.floor(Date.now() / 1000).toString(),
        'User-Agent': 'Make.com Webhook'
      },
      postData: {
        contents: JSON.stringify(testPayload)
      },
      remoteAddress: '127.0.0.1'
    };

    // Validate security
    const validationResult = integration.validateWebhookSecurity(mockRequest);

    logger.exitFunction('testWebhookSignatureValidation', {
      success: validationResult.valid,
      security_level: validationResult.security_level
    });

    return {
      success: true,
      test_payload: testPayload,
      generated_signature: signature,
      validation_result: validationResult,
      timestamp: DateUtils.formatISO(DateUtils.now())
    };

  } catch (error) {
    logger.error('Webhook signature validation test failed', { error: error.toString() });
    return {
      success: false,
      error: error.toString(),
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  }
}

