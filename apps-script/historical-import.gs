/**
 * @fileoverview Historical CSV import utilities for backfilling match data.
 */

function importHistoricalCSV(input, additionalOptions) {
  const args = normalizeHistoricalImportArgs_(input, additionalOptions);
  const deps = buildHistoricalImportDependencies_(args.options);
  const logger = getHistoricalImporterLogger_();
  const summaryBase = {
    success: false,
    fileId: args.fileId || null,
    rowsInFile: 0,
    duplicatesInFile: 0,
    results: { inserted: 0, updated: 0, skipped: 0 },
    events: { inserted: 0, skipped: 0 },
    seasons: [],
    dryRun: Boolean(deps.dryRun),
    errors: []
  };

  invokeTestHookSafely_('historical.csv.import.start', {
    file_id: summaryBase.fileId,
    dry_run: summaryBase.dryRun
  }, deps.testHooks);

  logger.enterFunction('importHistoricalCSV', {
    file_id_provided: Boolean(args.fileId),
    dry_run: summaryBase.dryRun
  });

  let summary = { ...summaryBase };

  try {
    const fileId = args.fileId || deps.options.fileId || '';
    if (!fileId && !deps.options.fileContent) {
      throw new Error('Provide a Google Drive file ID to import historical data.');
    }

    const csvText = readHistoricalCsvContent_(fileId, deps);
    const parsed = parseHistoricalCsv_(csvText, deps);

    if (!parsed.records.length) {
      summary.rowsInFile = parsed.rowCount;
      summary.duplicatesInFile = parsed.duplicates;
      summary.error = 'CSV contains no importable rows.';
      return summary;
    }

    summary.rowsInFile = parsed.rowCount;
    summary.duplicatesInFile = parsed.duplicates;
    summary.seasons = Object.keys(parsed.recordsBySeason).sort();

    if (deps.dryRun) {
      summary.success = true;
      summary.results = {
        inserted: parsed.records.length,
        updated: 0,
        skipped: parsed.duplicates
      };
      summary.events = {
        inserted: parsed.projectedEventCount,
        skipped: 0
      };
      return summary;
    }

    const resultOutcome = persistHistoricalResults_(parsed.recordsBySeason, deps);
    const eventOutcome = persistHistoricalEvents_(parsed.eventsBySeason, deps);
    summary.results = {
      inserted: resultOutcome.inserted,
      updated: resultOutcome.updated,
      skipped: resultOutcome.skipped
    };
    summary.events = {
      inserted: eventOutcome.inserted,
      skipped: eventOutcome.skipped
    };

    summary.errors = resultOutcome.errors.concat(eventOutcome.errors);
    summary.recompute = triggerHistoricalRecompute_(deps);
    if (summary.recompute && summary.recompute.errors) {
      summary.errors = summary.errors.concat(summary.recompute.errors);
    }
    summary.success = summary.errors.length === 0;

    logger.exitFunction('importHistoricalCSV', {
      success: summary.success,
      dry_run: summary.dryRun,
      rows_in_file: summary.rowsInFile,
      results_inserted: summary.results.inserted,
      results_updated: summary.results.updated,
      results_skipped: summary.results.skipped,
      events_inserted: summary.events.inserted,
      events_skipped: summary.events.skipped
    });

    return summary;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Historical CSV import failed', { message: message });
    summary = { ...summary, success: false, error: message };
    return summary;
  } finally {
    invokeTestHookSafely_('historical.csv.import.end', summary, deps.testHooks);
  }
}

function normalizeHistoricalImportArgs_(input, additionalOptions) {
  let fileId = '';
  let options = {};
  if (typeof input === 'string') {
    fileId = input.trim();
    if (additionalOptions && typeof additionalOptions === 'object') {
      options = additionalOptions;
    }
  } else if (input && typeof input === 'object') {
    options = input;
    if (typeof input.fileId === 'string') {
      fileId = input.fileId.trim();
    }
  }
  return { fileId: fileId, options: options || {} };
}

function getHistoricalImporterLogger_() {
  if (typeof logger !== 'undefined' && logger && typeof logger.scope === 'function') {
    return logger.scope('HistoricalCSVImporter');
  }
  return {
    enterFunction: function() {},
    exitFunction: function() {},
    info: function() {},
    warn: function() {},
    error: function() {}
  };
}

function buildHistoricalImportDependencies_(options) {
  const opts = options || {};
  const dependencies = {
    options: opts,
    dryRun: Boolean(opts.dryRun),
    driveApp: opts.driveApp || (typeof DriveApp !== 'undefined' ? DriveApp : null),
    spreadsheetApp: opts.spreadsheetApp || (typeof SpreadsheetApp !== 'undefined' ? SpreadsheetApp : null),
    sheetUtils: opts.sheetUtils || (typeof SheetUtils !== 'undefined' ? SheetUtils : null),
    utilities: opts.utilities || (typeof Utilities !== 'undefined' ? Utilities : null),
    stringUtils: opts.stringUtils || (typeof StringUtils !== 'undefined' ? StringUtils : null),
    now: typeof opts.now === 'function'
      ? opts.now
      : (typeof DateUtils !== 'undefined' && DateUtils && typeof DateUtils.now === 'function'
        ? function() { return DateUtils.now(); }
        : function() { return new Date(); }),
    testHooks: opts.testHooks,
    clubName: typeof opts.clubName === 'string'
      ? opts.clubName
      : getConfigValue('SYSTEM.CLUB_NAME', 'Our Club')
  };

  dependencies.resultsTabBaseName = typeof opts.resultsTabBaseName === 'string'
    ? opts.resultsTabBaseName
    : getConfigValue('SHEETS.TAB_NAMES.RESULTS', 'Results');

  dependencies.playerEventsTabBaseName = typeof opts.playerEventsTabBaseName === 'string'
    ? opts.playerEventsTabBaseName
    : getConfigValue('SHEETS.TAB_NAMES.PLAYER_EVENTS', 'Player Events');

  const defaultResultsColumns = [
    'Date', 'Home Team', 'Away Team', 'Opposition', 'Competition', 'Venue',
    'Home Score', 'Away Score', 'Our Score', 'Opposition Score', 'Home/Away',
    'Result', 'Season', 'Match Key', 'Scorers', 'Cards'
  ];
  const configuredResultsColumns = getConfigValue('SHEETS.REQUIRED_COLUMNS.RESULTS', []);
  dependencies.resultsColumns = typeof mergeUniqueArrays === 'function'
    ? mergeUniqueArrays(configuredResultsColumns, defaultResultsColumns)
    : defaultResultsColumns;

  const configuredEventColumns = getConfigValue('SHEETS.REQUIRED_COLUMNS.PLAYER_EVENTS', []);
  const extraEventColumns = ['Card Type', 'Season', 'Source', 'Event Key'];
  dependencies.playerEventColumns = typeof mergeUniqueArrays === 'function'
    ? mergeUniqueArrays(configuredEventColumns, extraEventColumns)
    : configuredEventColumns.concat(extraEventColumns);

  dependencies.clubNameNormalized = normalizeTeamName_(dependencies.clubName);
  dependencies.getSpreadsheet = function() {
    if (opts.spreadsheet) {
      return opts.spreadsheet;
    }
    if (this._spreadsheet) {
      return this._spreadsheet;
    }
    if (typeof getSheet === 'function') {
      this._spreadsheet = getSheet();
      return this._spreadsheet;
    }
    if (this.spreadsheetApp && typeof this.spreadsheetApp.openById === 'function') {
      const sheetId = PropertiesService
        && PropertiesService.getScriptProperties()
        && PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      if (!sheetId) {
        throw new Error('SPREADSHEET_ID script property is not configured.');
      }
      this._spreadsheet = this.spreadsheetApp.openById(sheetId);
      return this._spreadsheet;
    }
    throw new Error('Spreadsheet service is not available.');
  };

  return dependencies;
}

function invokeTestHookSafely_(name, payload, localHooks) {
  if (typeof invokeTestHook_ !== 'function') {
    return;
  }
  try {
    invokeTestHook_(name, payload, localHooks);
  } catch (error) {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn('Failed to invoke test hook', {
        hook: name,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

function readHistoricalCsvContent_(fileId, deps) {
  if (deps.options && typeof deps.options.fileContent === 'string') {
    return deps.options.fileContent;
  }
  if (!fileId) {
    throw new Error('Historical import requires a Drive file ID.');
  }
  if (!deps.driveApp || typeof deps.driveApp.getFileById !== 'function') {
    throw new Error('DriveApp service is not available.');
  }
  const file = deps.driveApp.getFileById(fileId);
  const blob = file.getBlob();
  const content = blob.getDataAsString('UTF-8');
  if (!content) {
    throw new Error('CSV file is empty.');
  }
  return content;
}

function parseHistoricalCsv_(csvText, deps) {
  const utilities = deps.utilities;
  if (!utilities || typeof utilities.parseCsv !== 'function') {
    throw new Error('Utilities.parseCsv is required to process CSV content.');
  }
  const rows = utilities.parseCsv(csvText || '');
  if (!rows || !rows.length) {
    throw new Error('CSV file contains no data.');
  }
  const headerMap = buildHistoricalHeaderMap_(rows[0] || []);
  const required = ['date', 'home', 'away', 'comp', 'venue', 'hs', 'as', 'scorers', 'cards'];
  const missing = required.filter(function(key) { return !headerMap[key]; });
  if (missing.length) {
    throw new Error('CSV missing required headers: ' + missing.join(', '));
  }

  const seenKeys = {};
  const records = [];
  const recordsBySeason = {};
  const eventsBySeason = {};
  let duplicates = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(function(value) { return String(value || '').trim() === ''; })) {
      continue;
    }
    const record = buildHistoricalRecord_(row, headerMap, deps);
    if (!record) {
      continue;
    }
    if (seenKeys[record.matchKey]) {
      duplicates++;
      continue;
    }
    seenKeys[record.matchKey] = true;
    records.push(record);
    if (!recordsBySeason[record.season]) {
      recordsBySeason[record.season] = [];
    }
    recordsBySeason[record.season].push(record);
    if (record.events && record.events.length) {
      if (!eventsBySeason[record.season]) {
        eventsBySeason[record.season] = [];
      }
      Array.prototype.push.apply(eventsBySeason[record.season], record.events);
    }
  }

  return {
    records: records,
    recordsBySeason: recordsBySeason,
    eventsBySeason: eventsBySeason,
    duplicates: duplicates,
    rowCount: rows.length - 1,
    projectedEventCount: Object.keys(eventsBySeason).reduce(function(total, season) {
      return total + eventsBySeason[season].length;
    }, 0)
  };
}

function buildHistoricalHeaderMap_(headers) {
  const map = {};
  const aliases = {
    date: ['date', 'matchdate'],
    home: ['home', 'hometeam', 'home_team', 'homeclub'],
    away: ['away', 'awayteam', 'away_team'],
    comp: ['comp', 'competition', 'league', 'tournament'],
    venue: ['venue', 'location', 'ground'],
    hs: ['hs', 'homescore', 'home_score', 'ourscore', 'gf'],
    as: ['as', 'awayscore', 'away_score', 'theirscore', 'ga'],
    scorers: ['scorers', 'goal_scorers', 'goalscorers', 'goals'],
    cards: ['cards', 'discipline', 'bookings']
  };
  headers.forEach(function(header, index) {
    const normalized = normalizeHeaderKey_(header);
    Object.keys(aliases).forEach(function(key) {
      if (aliases[key].indexOf(normalized) !== -1 && !map[key]) {
        map[key] = { index: index, header: header };
      }
    });
  });
  return map;
}

function normalizeHeaderKey_(header) {
  return String(header || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function buildHistoricalRecord_(row, headerMap, deps) {
  const dateValue = parseHistoricalDate_(row[headerMap.date.index]);
  if (!dateValue) {
    return null;
  }

  const homeTeam = String(row[headerMap.home.index] || '').trim();
  const awayTeam = String(row[headerMap.away.index] || '').trim();
  const competition = String(row[headerMap.comp.index] || '').trim();
  const venue = String(row[headerMap.venue.index] || '').trim();
  const homeScore = parseScore_(row[headerMap.hs.index]);
  const awayScore = parseScore_(row[headerMap.as.index]);
  const scorers = String(row[headerMap.scorers.index] || '').trim();
  const cards = String(row[headerMap.cards.index] || '').trim();

  const season = determineSeasonFromDate_(dateValue);
  const matchKey = buildMatchKey_(dateValue, homeTeam, awayTeam, deps.utilities);

  const homeNormalized = normalizeTeamName_(homeTeam);
  const awayNormalized = normalizeTeamName_(awayTeam);
  const isHomeClub = homeNormalized === deps.clubNameNormalized;
  const isAwayClub = awayNormalized === deps.clubNameNormalized;

  let ourScore = homeScore;
  let opponentScore = awayScore;
  let opponent = awayTeam;
  let homeAway = 'Unknown';

  if (isHomeClub) {
    ourScore = homeScore;
    opponentScore = awayScore;
    opponent = awayTeam;
    homeAway = 'Home';
  } else if (isAwayClub) {
    ourScore = awayScore;
    opponentScore = homeScore;
    opponent = homeTeam;
    homeAway = 'Away';
  }

  let result = 'Unknown';
  if (homeAway !== 'Unknown') {
    if (ourScore > opponentScore) {
      result = 'W';
    } else if (ourScore < opponentScore) {
      result = 'L';
    } else {
      result = 'D';
    }
  }

  const record = {
    matchKey: matchKey,
    season: season,
    date: dateValue,
    homeTeam: homeTeam,
    awayTeam: awayTeam,
    competition: competition,
    venue: venue,
    homeScore: homeScore,
    awayScore: awayScore,
    ourScore: ourScore,
    opponentScore: opponentScore,
    opponent: opponent,
    homeAway: homeAway,
    result: result,
    scorers: scorers,
    cards: cards,
    events: []
  };

  const goals = parseGoalEvents_(record, deps);
  const cardsEvents = parseCardEvents_(record, deps);
  record.events = goals.concat(cardsEvents);

  return record;
}

function parseScore_(value) {
  const num = parseInt(String(value || '').trim(), 10);
  if (isNaN(num) || num < 0) {
    return 0;
  }
  return num;
}

function parseHistoricalDate_(value) {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return null;
  }
  const direct = new Date(trimmed);
  if (!isNaN(direct.getTime())) {
    return direct;
  }
  if (typeof DateUtils !== 'undefined' && DateUtils && typeof DateUtils.parseUK === 'function') {
    const uk = DateUtils.parseUK(trimmed);
    if (uk && !isNaN(uk.getTime())) {
      return uk;
    }
  }
  const parts = trimmed.split(/[\/\-]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  return null;
}

function determineSeasonFromDate_(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  if (month >= 7) {
    const endYear = (year + 1).toString().slice(-2);
    return year + '/' + endYear;
  }
  const startYear = year - 1;
  return startYear + '/' + year.toString().slice(-2);
}

function buildMatchKey_(date, homeTeam, awayTeam, utilities) {
  const dateKey = formatDateKey_(date, utilities);
  return [dateKey, normalizeTeamName_(homeTeam), normalizeTeamName_(awayTeam)].join('#');
}

function normalizeTeamName_(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function formatDateKey_(date, utilities) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }
  if (utilities && typeof utilities.formatDate === 'function') {
    try {
      return utilities.formatDate(date, 'UTC', 'yyyy-MM-dd');
    } catch (error) {
      // Fallback handled below
    }
  }
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function parseGoalEvents_(record, deps) {
  if (!record.scorers) {
    return [];
  }
  const parts = splitEventEntries_(record.scorers);
  const cleaner = deps.stringUtils && typeof deps.stringUtils.cleanPlayerName === 'function'
    ? deps.stringUtils.cleanPlayerName
    : function(value) { return String(value || '').trim(); };
  const events = [];
  parts.forEach(function(entry) {
    const trimmed = entry.trim();
    if (!trimmed) {
      return;
    }
    const minuteMatch = trimmed.match(/(\d+)\s*(?:'|mins?|minute)/i);
    const minute = minuteMatch ? parseInt(minuteMatch[1], 10) : '';
    let player = trimmed;
    if (minuteMatch) {
      player = trimmed.slice(0, minuteMatch.index).trim();
    }
    player = player.replace(/[()]/g, '').trim();
    if (!player && minuteMatch) {
      player = trimmed.replace(minuteMatch[0], '').trim();
    }
    const cleanName = cleaner(player);
    events.push({
      matchKey: record.matchKey,
      season: record.season,
      date: record.date,
      competition: record.competition,
      opponent: record.opponent,
      player: cleanName,
      eventType: 'Goal',
      minute: minute || '',
      details: trimmed,
      cardType: '',
      eventKey: buildEventKey_(record.matchKey, 'goal', cleanName, minute || '', '')
    });
  });
  return events;
}

function parseCardEvents_(record, deps) {
  if (!record.cards) {
    return [];
  }
  const parts = splitEventEntries_(record.cards);
  const cleaner = deps.stringUtils && typeof deps.stringUtils.cleanPlayerName === 'function'
    ? deps.stringUtils.cleanPlayerName
    : function(value) { return String(value || '').trim(); };
  const events = [];
  parts.forEach(function(entry) {
    const trimmed = entry.trim();
    if (!trimmed) {
      return;
    }
    const minuteMatch = trimmed.match(/(\d+)\s*(?:'|mins?|minute)/i);
    const minute = minuteMatch ? parseInt(minuteMatch[1], 10) : '';
    let player = trimmed;
    if (minuteMatch) {
      player = trimmed.slice(0, minuteMatch.index).trim();
    }
    player = player.replace(/[()]/g, '').trim();
    if (!player && minuteMatch) {
      player = trimmed.replace(minuteMatch[0], '').trim();
    }
    const type = determineCardType_(trimmed);
    const cleanName = cleaner(player);
    events.push({
      matchKey: record.matchKey,
      season: record.season,
      date: record.date,
      competition: record.competition,
      opponent: record.opponent,
      player: cleanName,
      eventType: 'Card',
      minute: minute || '',
      details: trimmed,
      cardType: type,
      eventKey: buildEventKey_(record.matchKey, 'card', cleanName, minute || '', type)
    });
  });
  return events;
}

function determineCardType_(entry) {
  const lower = entry.toLowerCase();
  if (lower.indexOf('red') !== -1) {
    return 'Red Card';
  }
  if (lower.indexOf('sin') !== -1) {
    return 'Sin Bin';
  }
  if (lower.indexOf('yellow') !== -1) {
    return 'Yellow Card';
  }
  return 'Card';
}

function splitEventEntries_(value) {
  if (value.indexOf(';') !== -1) {
    return value.split(';');
  }
  if (value.indexOf('\n') !== -1) {
    return value.split(/\n+/);
  }
  return value.split(',');
}

function buildEventKey_(matchKey, type, player, minute, cardType) {
  return [
    matchKey || '',
    String(type || '').toLowerCase(),
    normalizeTeamName_(player),
    minute || '',
    String(cardType || '').toLowerCase()
  ].join('#');
}

function persistHistoricalResults_(recordsBySeason, deps) {
  const utils = deps.sheetUtils;
  if (!utils || typeof utils.getOrCreateSheet !== 'function') {
    throw new Error('Sheet utilities are unavailable.');
  }
  const spreadsheet = deps.getSpreadsheet();
  const outcome = { inserted: 0, updated: 0, skipped: 0, errors: [] };

  Object.keys(recordsBySeason).forEach(function(season) {
    try {
      const sheetName = resolveResultsSheetName_(season, spreadsheet, deps);
      const sheet = utils.getOrCreateSheet(sheetName, deps.resultsColumns);
      const data = getSheetData_(sheet);
      const existingMap = buildExistingResultsMap_(data.headers, data.rows, deps);
      const newRows = [];

      recordsBySeason[season].forEach(function(record) {
        const rowValues = buildResultRow_(data.headers, record, deps);
        const existing = existingMap[record.matchKey];
        if (existing) {
          if (!rowsEqual_(rowValues, existing.values)) {
            sheet.getRange(existing.rowNumber, 1, 1, data.headers.length).setValues([rowValues]);
            outcome.updated++;
          } else {
            outcome.skipped++;
          }
        } else {
          newRows.push(rowValues);
          outcome.inserted++;
        }
      });

      if (newRows.length) {
        const startRow = sheet.getLastRow() + 1;
        sheet.getRange(startRow, 1, newRows.length, data.headers.length).setValues(newRows);
      }
    } catch (error) {
      outcome.errors.push('Failed to write results for ' + season + ': ' + (error instanceof Error ? error.message : String(error)));
    }
  });

  return outcome;
}

function persistHistoricalEvents_(eventsBySeason, deps) {
  const utils = deps.sheetUtils;
  if (!utils || typeof utils.getOrCreateSheet !== 'function') {
    throw new Error('Sheet utilities are unavailable.');
  }
  const spreadsheet = deps.getSpreadsheet();
  const outcome = { inserted: 0, skipped: 0, errors: [] };

  Object.keys(eventsBySeason).forEach(function(season) {
    const events = eventsBySeason[season];
    if (!events || !events.length) {
      return;
    }

    try {
      const sheetName = resolvePlayerEventsSheetName_(season, spreadsheet, deps);
      const sheet = utils.getOrCreateSheet(sheetName, deps.playerEventColumns);
      const data = getSheetData_(sheet);
      const existingKeys = buildExistingEventKeyMap_(data.headers, data.rows);
      const newRows = [];

      events.forEach(function(event) {
        if (existingKeys[event.eventKey]) {
          outcome.skipped++;
          return;
        }
        const rowValues = buildEventRow_(data.headers, event, deps);
        existingKeys[event.eventKey] = true;
        newRows.push(rowValues);
        outcome.inserted++;
      });

      if (newRows.length) {
        const startRow = sheet.getLastRow() + 1;
        sheet.getRange(startRow, 1, newRows.length, data.headers.length).setValues(newRows);
      }
    } catch (error) {
      outcome.errors.push('Failed to write player events for ' + season + ': ' + (error instanceof Error ? error.message : String(error)));
    }
  });

  return outcome;
}

function resolveResultsSheetName_(season, spreadsheet, deps) {
  const base = deps.resultsTabBaseName || 'Results';
  const suffix = season || '';
  const candidates = [
    'Team Results ' + suffix,
    base + ' ' + suffix,
    base + ' ' + suffix.replace('/', '-'),
    'Team Results',
    base
  ];
  for (let i = 0; i < candidates.length; i++) {
    if (spreadsheet.getSheetByName(candidates[i])) {
      return candidates[i];
    }
  }
  return candidates[0];
}

function resolvePlayerEventsSheetName_(season, spreadsheet, deps) {
  const base = deps.playerEventsTabBaseName || 'Player Events';
  const suffix = season || '';
  const candidates = [
    'Player_Events ' + suffix,
    base + ' ' + suffix,
    base + ' ' + suffix.replace('/', '-'),
    'Player_Events',
    base
  ];
  for (let i = 0; i < candidates.length; i++) {
    if (spreadsheet.getSheetByName(candidates[i])) {
      return candidates[i];
    }
  }
  return candidates[0];
}

function getSheetData_(sheet) {
  const lastColumn = sheet.getLastColumn();
  const lastRow = sheet.getLastRow();
  const headers = lastColumn > 0 ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0] : [];
  const rows = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues() : [];
  return { headers: headers, rows: rows };
}

function buildExistingResultsMap_(headers, rows, deps) {
  const index = buildHeaderIndex_(headers);
  const map = {};
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const key = deriveMatchKeyFromRow_(row, index, deps);
    if (key) {
      map[key] = { rowNumber: i + 2, values: row.slice() };
    }
  }
  return map;
}

function buildExistingEventKeyMap_(headers, rows) {
  const index = buildHeaderIndex_(headers);
  const map = {};
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let key = '';
    if (index.event_key) {
      key = String(row[index.event_key.index] || '').trim();
    }
    if (!key) {
      const matchId = index.match_id ? row[index.match_id.index] : '';
      const eventType = index.event_type ? row[index.event_type.index] : '';
      const player = index.player ? row[index.player.index] : '';
      const minute = index.minute ? row[index.minute.index] : '';
      const cardType = index.card_type ? row[index.card_type.index] : '';
      key = buildEventKey_(matchId, eventType, player, minute, cardType);
    }
    if (key) {
      map[key] = true;
    }
  }
  return map;
}

function buildHeaderIndex_(headers) {
  const index = {};
  headers.forEach(function(header, idx) {
    const normalized = normalizeHeaderKey_(header);
    if (!index[normalized]) {
      index[normalized] = { index: idx, header: header };
    }
    const camel = normalized.replace(/_([a-z])/g, function(match, letter) { return letter.toUpperCase(); });
    if (!index[camel]) {
      index[camel] = index[normalized];
    }
  });
  // Friendly aliases
  if (index.matchkey && !index.match_key) index.match_key = index.matchkey;
  if (index.matchid && !index.match_id) index.match_id = index.matchid;
  if (index.homeaway && !index['home/away']) index['home/away'] = index.homeaway;
  return index;
}

function deriveMatchKeyFromRow_(row, index, deps) {
  let key = '';
  if (index.match_key) {
    key = String(row[index.match_key.index] || '').trim();
    if (key) {
      return key;
    }
  }
  const dateIndex = index.date || index.matchdate;
  const homeIndex = index.hometeam || index.home_team || index.home;
  const awayIndex = index.awayteam || index.away_team || index.away;

  const dateValue = dateIndex ? row[dateIndex.index] : null;
  let homeTeam = homeIndex ? row[homeIndex.index] : '';
  let awayTeam = awayIndex ? row[awayIndex.index] : '';

  if ((!homeTeam || !awayTeam) && index.opposition && (index['home/away'] || index.homeaway)) {
    const opposition = row[index.opposition.index];
    const homeAwayValue = index['home/away'] ? row[index['home/away'].index] : row[index.homeaway.index];
    const isHome = String(homeAwayValue || '').toLowerCase().indexOf('home') !== -1;
    if (isHome) {
      homeTeam = deps.clubName;
      awayTeam = opposition;
    } else {
      homeTeam = opposition;
      awayTeam = deps.clubName;
    }
  }

  if (!dateValue || !homeTeam || !awayTeam) {
    return '';
  }
  const parsedDate = parseHistoricalDate_(dateValue);
  return buildMatchKey_(parsedDate, homeTeam, awayTeam, deps.utilities);
}

function buildResultRow_(headers, record, deps) {
  return headers.map(function(header, index) {
    const normalized = normalizeHeaderKey_(header);
    switch (normalized) {
      case 'date':
      case 'matchdate':
        return record.date;
      case 'hometeam':
      case 'home_team':
      case 'home':
        return record.homeTeam;
      case 'awayteam':
      case 'away_team':
      case 'away':
        return record.awayTeam;
      case 'opposition':
        return record.opponent;
      case 'competition':
      case 'comp':
        return record.competition;
      case 'venue':
      case 'location':
        return record.venue;
      case 'homescore':
      case 'home_score':
      case 'hs':
        return record.homeScore;
      case 'awayscore':
      case 'away_score':
      case 'as':
        return record.awayScore;
      case 'ourscore':
        return record.ourScore;
      case 'oppositionscore':
      case 'theirscore':
        return record.opponentScore;
      case 'homeaway':
      case 'home/away':
        return record.homeAway;
      case 'result':
        return record.result;
      case 'season':
        return record.season;
      case 'matchkey':
      case 'match_key':
      case 'matchid':
      case 'match_id':
        return record.matchKey;
      case 'scorers':
      case 'goalscorers':
      case 'goal_scorers':
        return record.scorers;
      case 'cards':
      case 'discipline':
        return record.cards;
      default:
        return '';
    }
  });
}

function buildEventRow_(headers, event, deps) {
  const now = deps.now();
  const timestamp = (typeof DateUtils !== 'undefined' && DateUtils && typeof DateUtils.formatISO === 'function')
    ? DateUtils.formatISO(now)
    : (now instanceof Date ? now.toISOString() : String(now));

  return headers.map(function(header) {
    const normalized = normalizeHeaderKey_(header);
    switch (normalized) {
      case 'matchid':
      case 'match_id':
        return event.matchKey;
      case 'date':
      case 'matchdate':
        return event.date;
      case 'player':
      case 'name':
        return event.player;
      case 'eventtype':
      case 'type':
        return event.eventType;
      case 'minute':
        return event.minute;
      case 'details':
        return event.details;
      case 'cardtype':
        return event.cardType;
      case 'competition':
        return event.competition;
      case 'opposition':
        return event.opponent;
      case 'season':
        return event.season;
      case 'source':
        return 'historical_csv_import';
      case 'eventkey':
      case 'event_key':
        return event.eventKey;
      case 'timestamp':
        return timestamp;
      default:
        return '';
    }
  });
}

function rowsEqual_(rowA, rowB) {
  if (rowA.length !== rowB.length) {
    return false;
  }
  for (let i = 0; i < rowA.length; i++) {
    const a = rowA[i];
    const b = rowB[i];
    if (a === b) {
      continue;
    }
    if (a instanceof Date && b instanceof Date) {
      if (a.getTime() !== b.getTime()) {
        return false;
      }
      continue;
    }
    if (a instanceof Date || b instanceof Date) {
      const parsedA = a instanceof Date ? a : parseHistoricalDate_(a);
      const parsedB = b instanceof Date ? b : parseHistoricalDate_(b);
      const aTime = parsedA && !isNaN(parsedA.getTime()) ? parsedA.getTime() : NaN;
      const bTime = parsedB && !isNaN(parsedB.getTime()) ? parsedB.getTime() : NaN;
      if (aTime !== bTime) {
        return false;
      }
      continue;
    }
    if (String(a === undefined ? '' : a).trim() !== String(b === undefined ? '' : b).trim()) {
      return false;
    }
  }
  return true;
}

function triggerHistoricalRecompute_(deps) {
  const globalScope = typeof globalThis !== 'undefined' ? globalThis : this;
  const candidates = [
    'runSeasonStatisticsPipeline',
    'runSeasonAutomationPipeline',
    'recalculateSeasonStatistics',
    'refreshSeasonStatistics',
    'runSeasonStats',
    'runWeeklyJobs'
  ];
  const summary = { attempted: false, success: true, invoked: [], errors: [] };

  for (let i = 0; i < candidates.length; i++) {
    const fn = candidates[i];
    if (typeof globalScope[fn] === 'function') {
      summary.attempted = true;
      try {
        globalScope[fn]();
        summary.invoked.push(fn);
        return summary;
      } catch (error) {
        summary.success = false;
        summary.errors.push('Pipeline ' + fn + ' failed: ' + (error instanceof Error ? error.message : String(error)));
      }
    }
  }

  if (typeof globalScope.PlayerManagementManager === 'function') {
    try {
      const manager = new globalScope.PlayerManagementManager();
      if (manager && typeof manager.rebuildSeasonStatistics === 'function') {
        summary.attempted = true;
        manager.rebuildSeasonStatistics();
        summary.invoked.push('PlayerManagementManager.rebuildSeasonStatistics');
        summary.success = true;
        summary.errors = [];
        return summary;
      }
    } catch (error) {
      summary.attempted = true;
      summary.success = false;
      summary.errors.push('PlayerManagementManager.rebuildSeasonStatistics failed: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  return summary;
}

