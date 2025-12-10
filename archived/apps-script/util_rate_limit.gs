/**
 * @fileoverview Rate limiting helpers leveraging CacheService.
 */

/**
 * Evaluates request rate limits for IP and user.
 * @param {{ip:string, userId:(string|undefined)}} context Request context.
 * @returns {{allowed:boolean, limit:number, remaining:number, reset:number, reason:string}}
 */
function evaluateRateLimit(context) {
  var config = getApiConfig();
  var windowSeconds = config.rateLimit.windowSeconds;
  var now = Date.now();
  var windowStart = Math.floor(now / (windowSeconds * 1000));

  var cache = CacheService.getScriptCache();

  var ipKey = ['rate', 'ip', context.ip || '0.0.0.0', windowStart].join(':');
  var userKey = ['rate', 'user', context.userId || 'anonymous', windowStart].join(':');

  var ipCount = parseInt(cache.get(ipKey), 10);
  if (!isFinite(ipCount)) {
    ipCount = 0;
  }
  var userCount = parseInt(cache.get(userKey), 10);
  if (!isFinite(userCount)) {
    userCount = 0;
  }

  if (ipCount >= config.rateLimit.ipLimit) {
    return {
      allowed: false,
      limit: config.rateLimit.ipLimit,
      remaining: 0,
      reset: windowStart * windowSeconds + windowSeconds,
      reason: 'IP limit exceeded.'
    };
  }

  if (userCount >= config.rateLimit.userLimit) {
    return {
      allowed: false,
      limit: config.rateLimit.userLimit,
      remaining: 0,
      reset: windowStart * windowSeconds + windowSeconds,
      reason: 'User limit exceeded.'
    };
  }

  cache.put(ipKey, String(ipCount + 1), windowSeconds);
  cache.put(userKey, String(userCount + 1), windowSeconds);

  return {
    allowed: true,
    limit: Math.min(config.rateLimit.ipLimit, config.rateLimit.userLimit),
    remaining: Math.min(config.rateLimit.ipLimit - (ipCount + 1), config.rateLimit.userLimit - (userCount + 1)),
    reset: windowStart * windowSeconds + windowSeconds,
    reason: 'OK'
  };
}
