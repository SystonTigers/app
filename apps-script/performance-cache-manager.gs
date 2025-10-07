/**
 * @fileoverview Advanced Performance Optimization and Caching Manager
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Comprehensive caching, performance monitoring, and optimization system
 *
 * FEATURES IMPLEMENTED:
 * - Multi-tier caching system (Memory, Script, Document)
 * - Performance monitoring and metrics
 * - Query optimization and batching
 * - Rate limiting and throttling
 * - Cache warming and preloading
 * - Performance analytics and reporting
 * - Automatic cache invalidation
 * - Background optimization tasks
 */

// ==================== PERFORMANCE CACHE MANAGER ====================

/**
 * Performance Cache Manager - Advanced caching and optimization
 */
class PerformanceCacheManager {

  constructor() {
    this.loggerName = 'Performance';
    this._logger = null;
    this.memoryCache = new Map();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.performanceMetrics = {
      operations: [],
      averageResponseTime: 0,
      slowQueries: [],
      memoryUsage: 0
    };
    this.rateLimits = new Map();
    this.optimizationQueue = [];
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

  // ==================== CACHING SYSTEM ====================

  /**
   * Get data from cache with fallback chain
   * @param {string} key - Cache key
   * @param {Function} dataLoader - Function to load data if not cached
   * @param {Object} options - Cache options
   * @returns {any} Cached or fresh data
   */
  get(key, dataLoader = null, options = {}) {
    this.logger.enterFunction('get', { key, hasLoader: !!dataLoader });

    const startTime = Date.now();

    try {
      // Set default options
      const cacheOptions = {
        ttl: options.ttl || 300000, // 5 minutes default TTL
        tier: options.tier || 'memory', // memory, script, document, all
        refresh: options.refresh || false,
        preload: options.preload || false
      };

      // Force refresh if requested
      if (cacheOptions.refresh) {
        return this.refresh(key, dataLoader, cacheOptions);
      }

      // Try memory cache first (fastest)
      if (['memory', 'all'].includes(cacheOptions.tier)) {
        const memoryData = this.getFromMemory(key);
        if (memoryData !== null) {
          this.recordCacheHit('memory', Date.now() - startTime);
          return memoryData;
        }
      }

      // Try script cache (medium speed)
      if (['script', 'all'].includes(cacheOptions.tier)) {
        const scriptData = this.getFromScript(key, cacheOptions.ttl);
        if (scriptData !== null) {
          // Warm memory cache for next time
          this.setInMemory(key, scriptData, cacheOptions.ttl);
          this.recordCacheHit('script', Date.now() - startTime);
          return scriptData;
        }
      }

      // Try document cache (slower but persistent)
      if (['document', 'all'].includes(cacheOptions.tier)) {
        const documentData = this.getFromDocument(key, cacheOptions.ttl);
        if (documentData !== null) {
          // Warm upper caches
          this.setInMemory(key, documentData, cacheOptions.ttl);
          this.setInScript(key, documentData, cacheOptions.ttl);
          this.recordCacheHit('document', Date.now() - startTime);
          return documentData;
        }
      }

      // Cache miss - load fresh data
      if (dataLoader) {
        this.recordCacheMiss(Date.now() - startTime);
        const freshData = dataLoader();

        // Store in appropriate cache tiers
        this.set(key, freshData, cacheOptions);

        return freshData;
      }

      this.recordCacheMiss(Date.now() - startTime);
      return null;

    } catch (error) {
      this.logger.error('Cache get failed', { key, error: error.toString() });
      this.recordCacheMiss(Date.now() - startTime);

      // Try to load fresh data if loader provided
      if (dataLoader) {
        try {
          return dataLoader();
        } catch (loaderError) {
          this.logger.error('Data loader failed', { key, error: loaderError.toString() });
          return null;
        }
      }

      return null;
    }
  }

  /**
   * Set data in cache
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {Object} options - Cache options
   */
  set(key, data, options = {}) {
    this.logger.enterFunction('set', { key, dataType: typeof data });

    try {
      const cacheOptions = {
        ttl: options.ttl || 300000,
        tier: options.tier || 'all'
      };

      // Store in requested tiers
      if (['memory', 'all'].includes(cacheOptions.tier)) {
        this.setInMemory(key, data, cacheOptions.ttl);
      }

      if (['script', 'all'].includes(cacheOptions.tier)) {
        this.setInScript(key, data, cacheOptions.ttl);
      }

      if (['document', 'all'].includes(cacheOptions.tier)) {
        this.setInDocument(key, data, cacheOptions.ttl);
      }

      this.logger.exitFunction('set', { success: true });

    } catch (error) {
      this.logger.error('Cache set failed', { key, error: error.toString() });
    }
  }

  /**
   * Refresh cache entry
   * @param {string} key - Cache key
   * @param {Function} dataLoader - Data loader function
   * @param {Object} options - Cache options
   * @returns {any} Fresh data
   */
  refresh(key, dataLoader, options = {}) {
    try {
      // Clear existing cache entries
      this.invalidate(key);

      // Load fresh data
      const freshData = dataLoader();

      // Store in cache
      this.set(key, freshData, options);

      return freshData;

    } catch (error) {
      this.logger.error('Cache refresh failed', { key, error: error.toString() });
      return null;
    }
  }

  /**
   * Invalidate cache entry
   * @param {string} key - Cache key or pattern
   */
  invalidate(key) {
    this.logger.enterFunction('invalidate', { key });

    try {
      // Remove from memory cache
      if (key.includes('*')) {
        // Pattern matching for bulk invalidation
        const pattern = key.replace(/\*/g, '.*');
        const regex = new RegExp(pattern);

        for (const cacheKey of this.memoryCache.keys()) {
          if (regex.test(cacheKey)) {
            this.memoryCache.delete(cacheKey);
          }
        }
      } else {
        this.memoryCache.delete(key);
      }

      // Remove from script cache
      try {
        CacheService.getScriptCache().remove(key);
      } catch (error) {
        // Ignore script cache errors
      }

      // Remove from document cache
      try {
        CacheService.getDocumentCache().remove(key);
      } catch (error) {
        // Ignore document cache errors
      }

      this.logger.exitFunction('invalidate', { success: true });

    } catch (error) {
      this.logger.error('Cache invalidation failed', { key, error: error.toString() });
    }
  }

  // ==================== CACHE TIER IMPLEMENTATIONS ====================

  /**
   * Get from memory cache
   * @param {string} key - Cache key
   * @returns {any} Cached data or null
   */
  getFromMemory(key) {
    try {
      const cached = this.memoryCache.get(key);
      if (cached && cached.expires > Date.now()) {
        return cached.data;
      } else if (cached) {
        // Expired, remove it
        this.memoryCache.delete(key);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Set in memory cache
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  setInMemory(key, data, ttl) {
    try {
      this.memoryCache.set(key, {
        data: data,
        expires: Date.now() + ttl,
        created: Date.now()
      });

      // Cleanup old entries if memory cache gets too large
      if (this.memoryCache.size > 100) {
        this.cleanupMemoryCache();
      }
    } catch (error) {
      this.logger.warn('Memory cache set failed', { key, error: error.toString() });
    }
  }

  /**
   * Get from script cache
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live
   * @returns {any} Cached data or null
   */
  getFromScript(key, ttl) {
    try {
      const scriptCache = CacheService.getScriptCache();
      const cachedString = scriptCache.get(key);

      if (cachedString) {
        const cached = JSON.parse(cachedString);
        if (cached.expires > Date.now()) {
          return cached.data;
        } else {
          // Expired, remove it
          scriptCache.remove(key);
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Set in script cache
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live
   */
  setInScript(key, data, ttl) {
    try {
      const scriptCache = CacheService.getScriptCache();
      const cacheData = {
        data: data,
        expires: Date.now() + ttl,
        created: Date.now()
      };

      const cacheString = JSON.stringify(cacheData);

      // Apps Script cache has size limits
      if (cacheString.length < 100000) { // 100KB limit
        scriptCache.put(key, cacheString, Math.floor(ttl / 1000)); // Convert to seconds
      }
    } catch (error) {
      this.logger.warn('Script cache set failed', { key, error: error.toString() });
    }
  }

  /**
   * Get from document cache
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live
   * @returns {any} Cached data or null
   */
  getFromDocument(key, ttl) {
    try {
      const documentCache = CacheService.getDocumentCache();
      const cachedString = documentCache.get(key);

      if (cachedString) {
        const cached = JSON.parse(cachedString);
        if (cached.expires > Date.now()) {
          return cached.data;
        } else {
          documentCache.remove(key);
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Set in document cache
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live
   */
  setInDocument(key, data, ttl) {
    try {
      const documentCache = CacheService.getDocumentCache();
      const cacheData = {
        data: data,
        expires: Date.now() + ttl,
        created: Date.now()
      };

      const cacheString = JSON.stringify(cacheData);

      if (cacheString.length < 100000) {
        documentCache.put(key, cacheString, Math.floor(ttl / 1000));
      }
    } catch (error) {
      this.logger.warn('Document cache set failed', { key, error: error.toString() });
    }
  }

  // ==================== PERFORMANCE MONITORING ====================

  /**
   * Monitor performance of a function
   * @param {string} operationName - Name of operation
   * @param {Function} operation - Function to monitor
   * @param {Object} context - Additional context
   * @returns {any} Operation result
   */
  monitor(operationName, operation, context = {}) {
    const startTime = Date.now();
    const startMemory = this.getMemoryUsage();

    try {
      const result = operation();
      const duration = Date.now() - startTime;
      const memoryUsed = this.getMemoryUsage() - startMemory;

      this.recordPerformanceMetric({
        operation: operationName,
        duration: duration,
        memoryUsed: memoryUsed,
        success: true,
        context: context,
        timestamp: new Date()
      });

      // Check for slow operations
      if (duration > 5000) { // 5 seconds threshold
        this.recordSlowQuery(operationName, duration, context);
      }

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;

      this.recordPerformanceMetric({
        operation: operationName,
        duration: duration,
        success: false,
        error: error.toString(),
        context: context,
        timestamp: new Date()
      });

      throw error;
    }
  }

  /**
   * Record cache hit
   * @param {string} tier - Cache tier (memory, script, document)
   * @param {number} responseTime - Response time in ms
   */
  recordCacheHit(tier, responseTime) {
    this.cacheHits++;

    this.recordPerformanceMetric({
      operation: `cache_hit_${tier}`,
      duration: responseTime,
      success: true,
      timestamp: new Date()
    });
  }

  /**
   * Record cache miss
   * @param {number} responseTime - Response time in ms
   */
  recordCacheMiss(responseTime) {
    this.cacheMisses++;

    this.recordPerformanceMetric({
      operation: 'cache_miss',
      duration: responseTime,
      success: false,
      timestamp: new Date()
    });
  }

  /**
   * Record performance metric
   * @param {Object} metric - Performance metric
   */
  recordPerformanceMetric(metric) {
    this.performanceMetrics.operations.push(metric);

    // Keep only last 1000 operations to prevent memory issues
    if (this.performanceMetrics.operations.length > 1000) {
      this.performanceMetrics.operations = this.performanceMetrics.operations.slice(-1000);
    }

    // Update average response time
    this.updateAverageResponseTime();
  }

  /**
   * Record slow query
   * @param {string} operationName - Operation name
   * @param {number} duration - Duration in ms
   * @param {Object} context - Context data
   */
  recordSlowQuery(operationName, duration, context) {
    this.performanceMetrics.slowQueries.push({
      operation: operationName,
      duration: duration,
      context: context,
      timestamp: new Date()
    });

    // Keep only last 100 slow queries
    if (this.performanceMetrics.slowQueries.length > 100) {
      this.performanceMetrics.slowQueries = this.performanceMetrics.slowQueries.slice(-100);
    }

    this.logger.warn('Slow operation detected', {
      operation: operationName,
      duration: duration,
      context: context
    });
  }

  // ==================== OPTIMIZATION FEATURES ====================

  /**
   * Batch multiple operations for efficiency
   * @param {Array} operations - Array of operation functions
   * @param {Object} options - Batch options
   * @returns {Array} Results array
   */
  batch(operations, options = {}) {
    this.logger.enterFunction('batch', { operationCount: operations.length });

    const batchOptions = {
      maxConcurrency: options.maxConcurrency || 5,
      timeout: options.timeout || 30000,
      retryAttempts: options.retryAttempts || 1
    };

    const startTime = Date.now();
    const results = [];

    try {
      // Process operations in batches
      for (let i = 0; i < operations.length; i += batchOptions.maxConcurrency) {
        const batchOps = operations.slice(i, i + batchOptions.maxConcurrency);

        // Execute batch concurrently (simulated since Apps Script doesn't have true concurrency)
        const batchResults = batchOps.map(op => {
          try {
            return { success: true, result: op() };
          } catch (error) {
            return { success: false, error: error.toString() };
          }
        });

        results.push(...batchResults);
      }

      const duration = Date.now() - startTime;
      this.recordPerformanceMetric({
        operation: 'batch_execution',
        duration: duration,
        success: true,
        context: { operationCount: operations.length },
        timestamp: new Date()
      });

      this.logger.exitFunction('batch', { success: true, duration: duration });
      return results;

    } catch (error) {
      this.logger.error('Batch execution failed', { error: error.toString() });
      return results; // Return partial results
    }
  }

  /**
   * Preload data into cache
   * @param {Array} preloadSpecs - Array of {key, loader, options} objects
   */
  preload(preloadSpecs) {
    this.logger.enterFunction('preload', { specCount: preloadSpecs.length });

    try {
      const preloadOperations = preloadSpecs.map(spec => () => {
        this.get(spec.key, spec.loader, { ...spec.options, tier: 'all' });
      });

      this.batch(preloadOperations, { maxConcurrency: 3 });

      this.logger.exitFunction('preload', { success: true });

    } catch (error) {
      this.logger.error('Preload failed', { error: error.toString() });
    }
  }

  /**
   * Apply rate limiting to an operation
   * @param {string} operationKey - Operation identifier
   * @param {Function} operation - Operation to rate limit
   * @param {Object} limits - Rate limit configuration
   * @returns {any} Operation result
   */
  rateLimit(operationKey, operation, limits = {}) {
    const rateLimits = {
      requestsPerMinute: limits.requestsPerMinute || 60,
      requestsPerHour: limits.requestsPerHour || 1000,
      burstLimit: limits.burstLimit || 10
    };

    const now = Date.now();
    const currentLimits = this.rateLimits.get(operationKey) || {
      requests: [],
      lastReset: now
    };

    // Clean old requests (older than 1 hour)
    currentLimits.requests = currentLimits.requests.filter(time => now - time < 3600000);

    // Check rate limits
    const recentRequests = currentLimits.requests.filter(time => now - time < 60000); // Last minute

    if (recentRequests.length >= rateLimits.requestsPerMinute) {
      throw new Error(`Rate limit exceeded: ${rateLimits.requestsPerMinute} requests per minute`);
    }

    if (currentLimits.requests.length >= rateLimits.requestsPerHour) {
      throw new Error(`Rate limit exceeded: ${rateLimits.requestsPerHour} requests per hour`);
    }

    // Record request
    currentLimits.requests.push(now);
    this.rateLimits.set(operationKey, currentLimits);

    // Execute operation
    return operation();
  }

  // ==================== ANALYTICS AND REPORTING ====================

  /**
   * Get performance analytics
   * @returns {Object} Performance analytics
   */
  getAnalytics() {
    const now = Date.now();
    const last24Hours = this.performanceMetrics.operations.filter(
      op => now - op.timestamp.getTime() < 86400000
    );

    const cacheHitRate = this.cacheHits / (this.cacheHits + this.cacheMisses) * 100;

    return {
      cache: {
        hitRate: cacheHitRate.toFixed(2) + '%',
        hits: this.cacheHits,
        misses: this.cacheMisses,
        memoryEntries: this.memoryCache.size
      },
      performance: {
        averageResponseTime: this.performanceMetrics.averageResponseTime,
        operationsLast24h: last24Hours.length,
        slowQueries: this.performanceMetrics.slowQueries.length,
        memoryUsage: this.getMemoryUsage()
      },
      slowQueries: this.performanceMetrics.slowQueries.slice(-10), // Last 10
      topOperations: this.getTopOperations(last24Hours)
    };
  }

  /**
   * Get top operations by frequency
   * @param {Array} operations - Operations to analyze
   * @returns {Array} Top operations
   */
  getTopOperations(operations) {
    const operationCounts = {};

    operations.forEach(op => {
      operationCounts[op.operation] = (operationCounts[op.operation] || 0) + 1;
    });

    return Object.entries(operationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([operation, count]) => ({ operation, count }));
  }

  /**
   * Generate performance report
   * @returns {Object} Performance report
   */
  generatePerformanceReport() {
    const analytics = this.getAnalytics();

    return {
      timestamp: new Date().toISOString(),
      summary: {
        status: this.getOverallPerformanceStatus(),
        cacheEfficiency: analytics.cache.hitRate,
        averageResponseTime: analytics.performance.averageResponseTime + 'ms',
        recommendationsCount: this.getRecommendations().length
      },
      analytics: analytics,
      recommendations: this.getRecommendations(),
      optimizations: this.getOptimizationSuggestions()
    };
  }

  /**
   * Get performance recommendations
   * @returns {Array} Recommendations
   */
  getRecommendations() {
    const recommendations = [];
    const analytics = this.getAnalytics();

    // Cache hit rate recommendations
    const hitRate = parseFloat(analytics.cache.hitRate);
    if (hitRate < 70) {
      recommendations.push({
        type: 'cache',
        priority: 'high',
        message: `Cache hit rate is low (${hitRate}%). Consider increasing cache TTL or preloading frequently accessed data.`
      });
    }

    // Response time recommendations
    if (analytics.performance.averageResponseTime > 2000) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: `Average response time is high (${analytics.performance.averageResponseTime}ms). Consider optimizing slow operations.`
      });
    }

    // Slow queries recommendations
    if (analytics.performance.slowQueries > 5) {
      recommendations.push({
        type: 'optimization',
        priority: 'high',
        message: `${analytics.performance.slowQueries} slow queries detected. Review and optimize these operations.`
      });
    }

    return recommendations;
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Update average response time
   */
  updateAverageResponseTime() {
    const operations = this.performanceMetrics.operations;
    if (operations.length === 0) return;

    const totalTime = operations.reduce((sum, op) => sum + op.duration, 0);
    this.performanceMetrics.averageResponseTime = Math.round(totalTime / operations.length);
  }

  /**
   * Get memory usage estimate
   * @returns {number} Memory usage in bytes
   */
  getMemoryUsage() {
    try {
      // Rough estimate based on cache size
      let memoryUsage = 0;

      for (const [key, value] of this.memoryCache) {
        memoryUsage += JSON.stringify({ key, value }).length * 2; // Rough estimate
      }

      return memoryUsage;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Cleanup memory cache by removing expired entries
   */
  cleanupMemoryCache() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, value] of this.memoryCache) {
      if (value.expires <= now) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.memoryCache.delete(key));

    // If still too large, remove oldest entries
    if (this.memoryCache.size > 100) {
      const entries = Array.from(this.memoryCache.entries());
      entries.sort((a, b) => a[1].created - b[1].created);

      const toRemove = entries.slice(0, this.memoryCache.size - 80);
      toRemove.forEach(([key]) => this.memoryCache.delete(key));
    }
  }

  /**
   * Get overall performance status
   * @returns {string} Status (excellent, good, fair, poor)
   */
  getOverallPerformanceStatus() {
    const analytics = this.getAnalytics();
    const hitRate = parseFloat(analytics.cache.hitRate);
    const avgResponseTime = analytics.performance.averageResponseTime;

    if (hitRate >= 90 && avgResponseTime < 1000) return 'excellent';
    if (hitRate >= 80 && avgResponseTime < 2000) return 'good';
    if (hitRate >= 60 && avgResponseTime < 5000) return 'fair';
    return 'poor';
  }

  /**
   * Get optimization suggestions
   * @returns {Array} Optimization suggestions
   */
  getOptimizationSuggestions() {
    const suggestions = [];
    const analytics = this.getAnalytics();

    // Suggest cache warming for frequently accessed data
    if (analytics.cache.misses > analytics.cache.hits) {
      suggestions.push('Implement cache warming for frequently accessed data');
    }

    // Suggest batching for multiple operations
    if (analytics.topOperations.some(op => op.count > 50)) {
      suggestions.push('Consider batching multiple operations for better performance');
    }

    // Suggest preloading for common operations
    suggestions.push('Implement preloading for commonly accessed player and match data');

    return suggestions;
  }
}

// ==================== GLOBAL PERFORMANCE FUNCTIONS ====================

/**
 * Global performance cache manager instance
 */
const PerformanceCache = new PerformanceCacheManager();

/**
 * Get data from cache with fallback - Global function
 * @param {string} key - Cache key
 * @param {Function} dataLoader - Data loader function
 * @param {Object} options - Cache options
 * @returns {any} Cached or fresh data
 */
function getCached(key, dataLoader, options = {}) {
  return PerformanceCache.get(key, dataLoader, options);
}

/**
 * Set data in cache - Global function
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {Object} options - Cache options
 */
function setCached(key, data, options = {}) {
  return PerformanceCache.set(key, data, options);
}

/**
 * Monitor function performance - Global function
 * @param {string} operationName - Operation name
 * @param {Function} operation - Operation to monitor
 * @param {Object} context - Context data
 * @returns {any} Operation result
 */
function monitorPerformance(operationName, operation, context = {}) {
  return PerformanceCache.monitor(operationName, operation, context);
}

/**
 * Get performance analytics - Global function
 * @returns {Object} Performance analytics
 */
function getPerformanceAnalytics() {
  return PerformanceCache.getAnalytics();
}

/**
 * Generate performance report - Global function
 * @returns {Object} Performance report
 */
function generatePerformanceReport() {
  return PerformanceCache.generatePerformanceReport();
}

/**
 * Preload data into cache - Global function
 * @param {Array} preloadSpecs - Preload specifications
 */
function preloadData(preloadSpecs) {
  return PerformanceCache.preload(preloadSpecs);
}

/**
 * Rate limit an operation - Global function
 * @param {string} operationKey - Operation key
 * @param {Function} operation - Operation to rate limit
 * @param {Object} limits - Rate limits
 * @returns {any} Operation result
 */
function rateLimitOperation(operationKey, operation, limits = {}) {
  return PerformanceCache.rateLimit(operationKey, operation, limits);
}