/**
 * @fileoverview Shared HTTP response helpers for the API surface.
 * Provides consistent CORS handling, pagination headers, and
 * structured JSON error formatting for all feature handlers.
 */

/**
 * Builds a JSON response with common headers applied.
 * @param {number} statusCode HTTP status code.
 * @param {*} body JSON-serialisable payload.
 * @param {!Object<string, string>=} headers Extra headers to apply.
 * @param {string=} origin Allowed origin for CORS header.
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function createJsonResponse(statusCode, body, headers, origin) {
  const output = ContentService.createTextOutput(JSON.stringify(body || {}))
    .setMimeType(ContentService.MimeType.JSON)
    .setStatusCode(statusCode);

  const baseHeaders = Object.assign({
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type,Idempotency-Key,X-Page,X-Per-Page',
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
    'Vary': 'Origin'
  }, headers || {});

  Object.keys(baseHeaders).forEach(function(name) {
    output.setHeader(name, baseHeaders[name]);
  });

  return output;
}

/**
 * Creates a standardised error payload.
 * @param {number} statusCode HTTP status code.
 * @param {string} message Human readable message.
 * @param {!Array<string>=} errors Validation or processing errors.
 * @param {string=} origin Origin override for CORS.
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function createErrorResponse(statusCode, message, errors, origin) {
  const payload = {
    success: false,
    status: statusCode,
    message: message,
    errors: errors || []
  };
  return createJsonResponse(statusCode, payload, { 'Cache-Control': 'no-store' }, origin);
}

/**
 * Generates a response for OPTIONS pre-flight checks.
 * @param {string=} origin Resolved origin value.
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function createOptionsResponse(origin) {
  return createJsonResponse(204, {}, {
    'Access-Control-Max-Age': '3600',
    'Content-Length': '0'
  }, origin);
}

/**
 * Applies pagination metadata headers to an existing response.
 * @param {GoogleAppsScript.Content.TextOutput} response Response to mutate.
 * @param {{page:number, perPage:number, total:number, totalPages:number}} info Pagination metadata.
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function applyPaginationHeaders(response, info) {
  if (!response || !info) {
    return response;
  }

  response.setHeader('X-Page', String(info.page));
  response.setHeader('X-Per-Page', String(info.perPage));
  response.setHeader('X-Total-Count', String(info.total));
  response.setHeader('X-Total-Pages', String(info.totalPages));
  return response;
}

/**
 * Applies rate limit headers to a response instance.
 * @param {GoogleAppsScript.Content.TextOutput} response Response output.
 * @param {{limit:number, remaining:number, reset:number}=} info Rate limit metadata.
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function applyRateLimitHeaders(response, info) {
  if (!response || !info) {
    return response;
  }

  response.setHeader('X-RateLimit-Limit', String(info.limit));
  response.setHeader('X-RateLimit-Remaining', String(Math.max(0, info.remaining)));
  response.setHeader('X-RateLimit-Reset', String(info.reset));
  return response;
}
