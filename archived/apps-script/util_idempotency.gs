/**
 * @fileoverview Idempotency helpers backed by CacheService with
 * spreadsheet persistence for recovery.
 */

var IDEMPOTENCY_CACHE_PREFIX = 'idempotency:';
var IDEMPOTENCY_CACHE_TTL = 60 * 60 * 24; // 24 hours

/**
 * Attempts to fetch a stored response for the provided key.
 * @param {string} key Idempotency key.
 * @returns {{status:number, body:Object, headers:Object}|null}
 */
function getStoredIdempotentResponse(key) {
  if (!key) {
    return null;
  }
  var cache = CacheService.getScriptCache();
  var cached = cache.get(IDEMPOTENCY_CACHE_PREFIX + key);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (err) {
      cache.remove && cache.remove(IDEMPOTENCY_CACHE_PREFIX + key);
    }
  }

  var sheet = getIdempotencySheet_();
  if (!sheet) {
    return null;
  }

  var range = sheet.getDataRange();
  if (range.getNumRows() < 2) {
    return null;
  }
  var values = range.getValues();
  var headers = values[0];
  var rows = values.slice(1);
  var keyIndex = headers.indexOf('Key');
  var payloadIndex = headers.indexOf('Payload');
  if (keyIndex === -1 || payloadIndex === -1) {
    return null;
  }

  var match = rows.find(function(row) {
    return row[keyIndex] === key;
  });
  if (!match) {
    return null;
  }
  try {
    return JSON.parse(match[payloadIndex]);
  } catch (error) {
    return null;
  }
}

/**
 * Stores an idempotent response in cache and sheet.
 * @param {string} key Idempotency key.
 * @param {{status:number, body:Object, headers:Object}} payload Response payload.
 */
function storeIdempotentResponse(key, payload) {
  if (!key) {
    return;
  }
  var cache = CacheService.getScriptCache();
  cache.put(IDEMPOTENCY_CACHE_PREFIX + key, JSON.stringify(payload), IDEMPOTENCY_CACHE_TTL);

  var sheet = getIdempotencySheet_();
  if (!sheet) {
    return;
  }

  var nowIso = new Date().toISOString();
  var existingRange = sheet.getDataRange();
  var existingValues = existingRange.getNumRows() ? existingRange.getValues() : [];
  var headers;
  var rows;
  if (!existingValues.length) {
    headers = ['Key', 'StoredAt', 'Status', 'Payload'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    rows = [];
  } else {
    headers = existingValues[0];
    rows = existingValues.slice(1);
    if (headers.length < 4) {
      headers = ['Key', 'StoredAt', 'Status', 'Payload'];
      sheet.clear();
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      rows = [];
    }
  }

  var keyIndex = headers.indexOf('Key');
  var storedAtIndex = headers.indexOf('StoredAt');
  var statusIndex = headers.indexOf('Status');
  var payloadIndex = headers.indexOf('Payload');

  var filteredRows = rows.filter(function(row) {
    var storedAt = row[storedAtIndex];
    if (!storedAt) {
      return false;
    }
    var storedDate = new Date(storedAt);
    var hours = (Date.now() - storedDate.getTime()) / (1000 * 60 * 60);
    return hours < 24;
  });

  var existingIndex = filteredRows.findIndex(function(row) {
    return row[keyIndex] === key;
  });
  if (existingIndex !== -1) {
    filteredRows[existingIndex] = [key, nowIso, payload.status, JSON.stringify(payload)];
  } else {
    filteredRows.push([key, nowIso, payload.status, JSON.stringify(payload)]);
  }

  if (filteredRows.length) {
    sheet.getRange(2, 1, filteredRows.length, headers.length).setValues(filteredRows);
    var lastRow = sheet.getLastRow();
    var rowsToClear = lastRow - (filteredRows.length + 1);
    if (rowsToClear > 0) {
      sheet.getRange(filteredRows.length + 2, 1, rowsToClear, headers.length).clearContent();
    }
  } else {
    var existingRows = sheet.getLastRow() - 1;
    if (existingRows > 0) {
      sheet.getRange(2, 1, existingRows, headers.length).clearContent();
    }
  }
}

/**
 * Attempts to fetch the idempotency sheet, creating it if necessary.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet|null}
 * @private
 */
function getIdempotencySheet_() {
  try {
    var props = PropertiesService.getScriptProperties();
    var spreadsheetId = props.getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      return null;
    }
    var ss = SpreadsheetApp.openById(spreadsheetId);
    var config = getApiConfig();
    var sheet = ss.getSheetByName(config.idempotencySheetName);
    if (!sheet) {
      sheet = ss.insertSheet(config.idempotencySheetName);
      sheet.hideSheet();
      sheet.getRange(1, 1, 1, 4).setValues([['Key', 'StoredAt', 'Status', 'Payload']]);
    }
    return sheet;
  } catch (error) {
    return null;
  }
}
