/**
 * @fileoverview Simple caching system for SystonAutomationLib
 * @version 1.0.0
 * @description Basic caching with TTL support
 */

/**
 * Simple cache implementation using Script Properties
 */
class SA_Cache_ {

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @return {*} Cached value or null if not found/expired
   */
  static get(key) {
    try {
      const sp = PropertiesService.getScriptProperties();
      const cached = sp.getProperty(`cache_${key}`);

      if (!cached) {
        return null;
      }

      const data = JSON.parse(cached);
      const now = Date.now();

      // Check if expired
      if (data.expires && now > data.expires) {
        this.delete(key);
        return null;
      }

      SA_log_('DEBUG', 'Cache hit', { key });
      return data.value;

    } catch (error) {
      SA_log_('WARN', 'Cache get failed', { key, error: error.toString() });
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttlMinutes - Time to live in minutes
   * @return {boolean} Success status
   */
  static set(key, value, ttlMinutes = 30) {
    try {
      const sp = PropertiesService.getScriptProperties();
      const expires = ttlMinutes > 0 ? Date.now() + (ttlMinutes * 60 * 1000) : null;

      const cacheData = {
        value: value,
        created: Date.now(),
        expires: expires
      };

      sp.setProperty(`cache_${key}`, JSON.stringify(cacheData));
      SA_log_('DEBUG', 'Cache set', { key, ttlMinutes });
      return true;

    } catch (error) {
      SA_log_('WARN', 'Cache set failed', { key, error: error.toString() });
      return false;
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @return {boolean} Success status
   */
  static delete(key) {
    try {
      const sp = PropertiesService.getScriptProperties();
      sp.deleteProperty(`cache_${key}`);
      SA_log_('DEBUG', 'Cache delete', { key });
      return true;
    } catch (error) {
      SA_log_('WARN', 'Cache delete failed', { key, error: error.toString() });
      return false;
    }
  }

  /**
   * Clear all cache entries
   * @return {Object} Cleanup result
   */
  static clear() {
    try {
      const sp = PropertiesService.getScriptProperties();
      const all = sp.getProperties();
      let deleted = 0;

      Object.keys(all).forEach(key => {
        if (key.startsWith('cache_')) {
          sp.deleteProperty(key);
          deleted++;
        }
      });

      SA_log_('INFO', 'Cache cleared', { deleted });
      return { success: true, deleted };

    } catch (error) {
      SA_log_('ERROR', 'Cache clear failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Clean up expired cache entries
   * @return {Object} Cleanup result
   */
  static cleanup() {
    try {
      const sp = PropertiesService.getScriptProperties();
      const all = sp.getProperties();
      const now = Date.now();
      let cleaned = 0;

      Object.keys(all).forEach(key => {
        if (key.startsWith('cache_')) {
          try {
            const data = JSON.parse(all[key]);
            if (data.expires && now > data.expires) {
              sp.deleteProperty(key);
              cleaned++;
            }
          } catch (parseError) {
            // Remove invalid cache entries
            sp.deleteProperty(key);
            cleaned++;
          }
        }
      });

      SA_log_('INFO', 'Cache cleanup completed', { cleaned });
      return { success: true, cleaned };

    } catch (error) {
      SA_log_('ERROR', 'Cache cleanup failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Get cache statistics
   * @return {Object} Cache stats
   */
  static getStats() {
    try {
      const sp = PropertiesService.getScriptProperties();
      const all = sp.getProperties();
      const now = Date.now();

      let total = 0;
      let expired = 0;
      let totalSize = 0;

      Object.keys(all).forEach(key => {
        if (key.startsWith('cache_')) {
          total++;
          totalSize += all[key].length;

          try {
            const data = JSON.parse(all[key]);
            if (data.expires && now > data.expires) {
              expired++;
            }
          } catch (parseError) {
            expired++; // Count invalid entries as expired
          }
        }
      });

      return {
        total: total,
        expired: expired,
        active: total - expired,
        totalSizeBytes: totalSize,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      SA_log_('ERROR', 'Cache stats failed', { error: error.toString() });
      return { error: error.toString() };
    }
  }
}

/**
 * Get or compute cached value
 * @param {string} key - Cache key
 * @param {function} computeFn - Function to compute value if not cached
 * @param {number} ttlMinutes - Cache TTL in minutes
 * @return {*} Cached or computed value
 */
function SA_cached_(key, computeFn, ttlMinutes = 30) {
  try {
    // Try to get from cache first
    let value = SA_Cache_.get(key);

    if (value !== null) {
      return value;
    }

    // Not in cache, compute value
    SA_log_('DEBUG', 'Cache miss, computing value', { key });
    value = computeFn();

    // Store in cache
    SA_Cache_.set(key, value, ttlMinutes);

    return value;

  } catch (error) {
    SA_log_('ERROR', 'Cached function failed', { key, error: error.toString() });
    // Try to compute directly if caching fails
    try {
      return computeFn();
    } catch (computeError) {
      SA_log_('ERROR', 'Compute function failed', { key, error: computeError.toString() });
      throw computeError;
    }
  }
}

/**
 * Cache a function result based on its parameters
 * @param {function} fn - Function to cache
 * @param {Array} args - Function arguments
 * @param {number} ttlMinutes - Cache TTL in minutes
 * @return {*} Function result
 */
function SA_cacheFunction_(fn, args, ttlMinutes = 30) {
  try {
    // Create cache key from function name and arguments
    const fnName = fn.name || 'anonymous';
    const argsString = JSON.stringify(args);
    const key = `fn_${fnName}_${Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, argsString)}`;

    return SA_cached_(key, () => fn.apply(null, args), ttlMinutes);

  } catch (error) {
    SA_log_('ERROR', 'Function caching failed', { error: error.toString() });
    // Fall back to direct function call
    return fn.apply(null, args);
  }
}

/**
 * Invalidate cache entries by pattern
 * @param {string} pattern - Pattern to match (simple string contains)
 * @return {Object} Invalidation result
 */
function SA_invalidateCache_(pattern) {
  try {
    const sp = PropertiesService.getScriptProperties();
    const all = sp.getProperties();
    let invalidated = 0;

    Object.keys(all).forEach(key => {
      if (key.startsWith('cache_') && key.includes(pattern)) {
        sp.deleteProperty(key);
        invalidated++;
      }
    });

    SA_log_('INFO', 'Cache invalidated', { pattern, invalidated });
    return { success: true, invalidated };

  } catch (error) {
    SA_log_('ERROR', 'Cache invalidation failed', { pattern, error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

// Export cache class for direct use
const SA_Cache = SA_Cache_;