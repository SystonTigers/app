/**
 * @fileoverview Runtime configuration helpers for the API surface.
 * Reads Script Properties once per execution and exposes common
 * configuration values such as CORS origins, JWT secret, and
 * rate limiting defaults.
 */

var API_CONFIG_CACHE_KEY = 'api_config_v1';
var API_CONFIG_CACHE_TTL = 300; // seconds

/**
 * Returns the merged runtime configuration for the API.
 * @returns {{allowedOrigins: !Array<string>, jwtSecret: string, rateLimit: {ipLimit: number, userLimit: number, windowSeconds: number}, idempotencySheetName: string}}
 */
function getApiConfig() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get(API_CONFIG_CACHE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (err) {
      cache.remove && cache.remove(API_CONFIG_CACHE_KEY);
    }
  }

  var props = PropertiesService.getScriptProperties();
  var allowedOriginsProperty = props.getProperty('API_ALLOWED_ORIGINS');
  var allowedOrigins = (allowedOriginsProperty || '').split(',')
    .map(function(origin) { return origin && origin.trim(); })
    .filter(function(origin) { return !!origin; });
  if (!allowedOrigins.length) {
    allowedOrigins = ['*'];
  }

  var rateLimitWindow = parseInt(props.getProperty('API_RATE_LIMIT_WINDOW_SECONDS'), 10);
  var rateLimitIp = parseInt(props.getProperty('API_RATE_LIMIT_IP'), 10);
  var rateLimitUser = parseInt(props.getProperty('API_RATE_LIMIT_USER'), 10);

  var config = {
    allowedOrigins: allowedOrigins,
    jwtSecret: props.getProperty('API_JWT_SECRET') || '',
    rateLimit: {
      ipLimit: isFinite(rateLimitIp) && rateLimitIp > 0 ? rateLimitIp : 120,
      userLimit: isFinite(rateLimitUser) && rateLimitUser > 0 ? rateLimitUser : 240,
      windowSeconds: isFinite(rateLimitWindow) && rateLimitWindow > 0 ? rateLimitWindow : 60
    },
    idempotencySheetName: props.getProperty('API_IDEMPOTENCY_SHEET') || 'API_Idempotency_Log'
  };

  cache.put(API_CONFIG_CACHE_KEY, JSON.stringify(config), API_CONFIG_CACHE_TTL);
  return config;
}

/**
 * Resolves whether the provided origin is allowed.
 * @param {string} requestOrigin Origin header from the request.
 * @returns {{origin:string, allowed:boolean}}
 */
function resolveAllowedOrigin(requestOrigin) {
  var config = getApiConfig();
  if (!requestOrigin) {
    return { origin: config.allowedOrigins.indexOf('*') !== -1 ? '*' : config.allowedOrigins[0], allowed: true };
  }
  if (config.allowedOrigins.indexOf('*') !== -1) {
    return { origin: '*', allowed: true };
  }
  var match = config.allowedOrigins.indexOf(requestOrigin) !== -1;
  return { origin: match ? requestOrigin : config.allowedOrigins[0], allowed: match };
}
