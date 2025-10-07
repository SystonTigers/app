/**
 * @fileoverview Request parsing utilities for API handlers.
 */

/**
 * Builds a normalized request context from the Apps Script event object.
 * @param {GoogleAppsScript.Events.DoPost} e Raw event from doPost.
 * @returns {{method:string, headers:!Object<string,string>, origin:string, authHeader:string, idempotencyKey:string, rawBody:string, body:(!Object|!Array|string), parseError:(Error|null), query:!Object<string,string>, path:string, pathSegments:!Array<string>, ip:string, pagination:{page:number, perPage:number}}}
 */
function buildApiRequest(e) {
  var headers = {};
  if (e && e.headers) {
    Object.keys(e.headers).forEach(function(key) {
      headers[key.toLowerCase()] = e.headers[key];
    });
  }

  var origin = headers['origin'] || headers['x-forwarded-origin'] || '';
  var methodOverride = (e && e.parameter && e.parameter._method) ? String(e.parameter._method).toUpperCase() : '';
  var method = methodOverride || (e && e.parameter && e.parameter.method ? String(e.parameter.method).toUpperCase() : 'POST');
  if (!method) {
    method = 'POST';
  }

  var rawBody = '';
  if (e && e.postData && typeof e.postData.contents === 'string') {
    rawBody = e.postData.contents;
  }

  var body = {};
  var parseError = null;
  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch (err) {
      parseError = err;
    }
  }

  var path = '';
  if (e && typeof e.pathInfo === 'string') {
    path = e.pathInfo.replace(/^\/+|\/+$/g, '');
  }
  var pathSegments = path ? path.split('/').filter(function(segment) { return segment; }) : [];

  var ip = (e && e.context && e.context.clientIp) ? e.context.clientIp : '0.0.0.0';

  var pagination = extractPagination(headers, e && e.parameter ? e.parameter : {});

  return {
    method: method,
    headers: headers,
    origin: origin,
    authHeader: headers['authorization'] || '',
    idempotencyKey: headers['idempotency-key'] || '',
    rawBody: rawBody,
    body: body,
    parseError: parseError,
    query: (e && e.parameter) ? e.parameter : {},
    path: path,
    pathSegments: pathSegments,
    ip: ip,
    pagination: pagination
  };
}
