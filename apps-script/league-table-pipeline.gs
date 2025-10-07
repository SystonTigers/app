/**
 * @fileoverview FA League table pipeline automation
 * @version 6.2.0
 * @description Builds Sorted and Canva mapping sheets and publishes table.html
 */

class LeagueTablePipeline {

  constructor() {
    this.loggerName = 'LeagueTablePipeline';
    this._logger = null;
    this.config = getConfigValue('LEAGUE_TABLE_PIPELINE', {}) || {};
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
          error: (msg, data) => console.error(`[${this.loggerName}] ${msg}`, data || '')
        };
      }
    }
    return this._logger;
  }

  refreshAndMap() {
    this.logger.enterFunction('refreshAndMap');

    try {
      const rawRows = this.loadRawRows();
      const normalizedRows = this.normalizeRows(rawRows);
      const sortedRows = this.sortRows(normalizedRows);

      const sortedResult = this.writeSortedSheet(sortedRows);
      const canvaResult = this.writeCanvaSheet(sortedRows);
      const htmlResult = this.generateHtml(sortedRows);

      this.logger.exitFunction('refreshAndMap', {
        success: sortedResult.success && canvaResult.success && htmlResult.success,
        rows: sortedRows.length
      });

      return {
        success: sortedResult.success && canvaResult.success && htmlResult.success,
        rows: sortedRows.length,
        sorted: sortedResult,
        canva: canvaResult,
        html: htmlResult
      };

    } catch (error) {
      this.logger.error('League pipeline refresh failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  generateHtml(sortedRows = null) {
    this.logger.enterFunction('generateHtml');

    try {
      const dataRows = Array.isArray(sortedRows) ? sortedRows : this.loadSortedRows();
      const htmlContent = this.buildHtmlContent(dataRows);
      const fileResult = this.writeHtmlFile(htmlContent);
      this.updateBuildMetadata(dataRows.length, htmlContent, fileResult);

      this.logger.exitFunction('generateHtml', {
        success: fileResult.success,
        rows: dataRows.length
      });

      return {
        success: fileResult.success,
        rows: dataRows.length,
        fileId: fileResult.fileId || null,
        html: htmlContent,
        skipped: fileResult.skipped || false,
        reason: fileResult.reason || null
      };

    } catch (error) {
      this.logger.error('League HTML generation failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  loadRawRows() {
    const sheetName = this.config.RAW_SHEET_NAME || 'League Raw';
    const requiredColumns = Array.isArray(this.config.REQUIRED_COLUMNS)
      ? this.config.REQUIRED_COLUMNS
      : ['Team', 'Played', 'Won', 'Drawn', 'Lost', 'Goals For', 'Goals Against', 'Goal Difference', 'Points'];

    const sheet = SheetUtils.getOrCreateSheet(sheetName, requiredColumns);
    if (!sheet) {
      throw new Error(`Missing sheet: ${sheetName}`);
    }

    const rows = SheetUtils.getAllDataAsObjects(sheet);
    return Array.isArray(rows) ? rows : [];
  }

  loadSortedRows() {
    const sheetName = this.config.SORTED_SHEET_NAME || 'League Sorted';
    const sheet = SheetUtils.getOrCreateSheet(sheetName, this.getSortedHeaders());
    if (!sheet) {
      return [];
    }

    const data = SheetUtils.getAllDataAsObjects(sheet);
    const headers = this.getSortedHeaders();

    return data.map(row => ({
      team: row[headers[1]] || row.Team || '',
      played: this.toNumber(row[headers[2]]),
      won: this.toNumber(row[headers[3]]),
      drawn: this.toNumber(row[headers[4]]),
      lost: this.toNumber(row[headers[5]]),
      goalsFor: this.toNumber(row[headers[6]]),
      goalsAgainst: this.toNumber(row[headers[7]]),
      goalDifference: this.toNumber(row[headers[8]]),
      points: this.toNumber(row[headers[9]])
    }));
  }

  normalizeRows(rows) {
    return rows
      .map(row => this.normalizeRow(row))
      .filter(row => row && row.team);
  }

  normalizeRow(row) {
    if (!row) {
      return null;
    }

    const team = this.getValue(row, ['Team', 'Club', 'Name']);
    if (!team) {
      return null;
    }

    const played = this.toNumber(this.getValue(row, ['Played', 'P']));
    const won = this.toNumber(this.getValue(row, ['Won', 'W']));
    const drawn = this.toNumber(this.getValue(row, ['Drawn', 'D']));
    const lost = this.toNumber(this.getValue(row, ['Lost', 'L']));
    const goalsFor = this.toNumber(this.getValue(row, ['Goals For', 'GF', 'For']));
    const goalsAgainst = this.toNumber(this.getValue(row, ['Goals Against', 'GA', 'Against']));

    const goalDifference = this.toNumber(this.getValue(row, ['Goal Difference', 'GD']), goalsFor - goalsAgainst);
    const points = this.toNumber(this.getValue(row, ['Points', 'Pts', 'Point']));

    return {
      team: String(team).trim(),
      played,
      won,
      drawn,
      lost,
      goalsFor,
      goalsAgainst,
      goalDifference,
      points
    };
  }

  sortRows(rows) {
    const sorted = rows.slice();
    sorted.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.team.localeCompare(b.team);
    });
    return sorted;
  }

  writeSortedSheet(rows) {
    const sheetName = this.config.SORTED_SHEET_NAME || 'League Sorted';
    const headers = this.getSortedHeaders();
    const sheet = SheetUtils.getOrCreateSheet(sheetName, headers);
    if (!sheet) {
      return { success: false, error: `Missing sheet: ${sheetName}` };
    }

    this.clearSheetData(sheet);

    const values = rows.map((row, index) => [
      index + 1,
      row.team,
      row.played,
      row.won,
      row.drawn,
      row.lost,
      row.goalsFor,
      row.goalsAgainst,
      row.goalDifference,
      row.points
    ]);

    if (values.length > 0) {
      sheet.getRange(2, 1, values.length, headers.length).setValues(values);
    }

    return { success: true, rows: values.length };
  }

  writeCanvaSheet(rows) {
    const sheetName = this.config.CANVA_SHEET_NAME || 'League Canva Map';
    const headers = Array.isArray(this.config.CANVA_HEADERS)
      ? this.config.CANVA_HEADERS
      : ['Position', 'Team', 'Played', 'Points', 'Goal Difference'];

    const sheet = SheetUtils.getOrCreateSheet(sheetName, headers);
    if (!sheet) {
      return { success: false, error: `Missing sheet: ${sheetName}` };
    }

    this.clearSheetData(sheet);

    const values = rows.map((row, index) => [
      index + 1,
      row.team,
      row.played,
      row.points,
      row.goalDifference
    ]);

    if (values.length > 0) {
      sheet.getRange(2, 1, values.length, headers.length).setValues(values);
    }

    return { success: true, rows: values.length };
  }

  buildHtmlContent(rows) {
    const title = this.config.TITLE_TEXT || 'League Table';
    const generatedAt = DateUtils.formatISO(DateUtils.now());
    const headers = this.getSortedHeaders();

    const headerHtml = headers.map(header => `<th>${this.escapeHtml(header)}</th>`).join('');
    const rowsHtml = rows.map((row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${this.escapeHtml(row.team)}</td>
        <td>${row.played}</td>
        <td>${row.won}</td>
        <td>${row.drawn}</td>
        <td>${row.lost}</td>
        <td>${row.goalsFor}</td>
        <td>${row.goalsAgainst}</td>
        <td>${row.goalDifference}</td>
        <td>${row.points}</td>
      </tr>`).join('');

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${this.escapeHtml(title)}</title>
    <meta name="generated-at" content="${generatedAt}" />
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 24px; background: #f7f7f7; }
      h1 { margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; background: #ffffff; }
      th, td { padding: 8px 12px; border-bottom: 1px solid #e0e0e0; text-align: left; }
      th { background: #222; color: #ffffff; position: sticky; top: 0; }
      tr:nth-child(even) { background: #f2f2f2; }
    </style>
  </head>
  <body>
    <h1>${this.escapeHtml(title)}</h1>
    <table>
      <thead>
        <tr>${headerHtml}</tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </body>
</html>`;
  }

  writeHtmlFile(htmlContent) {
    if (typeof DriveApp === 'undefined') {
      this.logger.warn('DriveApp unavailable, skipping table.html write');
      return { success: false, skipped: true, reason: 'drive_unavailable' };
    }

    const fileName = this.config.HTML_FILE_NAME || 'table.html';
    const folderId = this.config.DRIVE_FOLDER_PROPERTY
      ? this.getScriptProperties().getProperty(this.config.DRIVE_FOLDER_PROPERTY)
      : null;

    let folder;
    try {
      folder = folderId ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder();
    } catch (error) {
      this.logger.warn('Failed to resolve configured folder, defaulting to root', { error: error.toString() });
      folder = DriveApp.getRootFolder();
    }

    const existingFiles = folder.getFilesByName(fileName);
    if (existingFiles.hasNext()) {
      const file = existingFiles.next();
      file.setContent(htmlContent);
      return { success: true, fileId: file.getId(), updated: true };
    }

    const file = folder.createFile(fileName, htmlContent, MimeType.HTML);
    return { success: true, fileId: file.getId(), created: true };
  }

  updateBuildMetadata(rowCount, htmlContent, fileResult) {
    try {
      const scriptProperties = this.getScriptProperties();
      const lastBuildProperty = this.config.LAST_BUILD_PROPERTY || 'LEAGUE_TABLE_LAST_BUILD';
      scriptProperties.setProperty(lastBuildProperty, DateUtils.formatISO(DateUtils.now()));

      if (this.config.STAMP_PROPERTY && typeof Utilities !== 'undefined') {
        const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, htmlContent, Utilities.Charset.UTF_8);
        const hash = digest.map(x => (x + 256) % 256).map(x => x.toString(16).padStart(2, '0')).join('');
        scriptProperties.setProperty(this.config.STAMP_PROPERTY, JSON.stringify({ hash, rows: rowCount, updated: DateUtils.formatISO(DateUtils.now()) }));
      }

      if (fileResult && fileResult.fileId) {
        scriptProperties.setProperty('LEAGUE_TABLE_FILE_ID', fileResult.fileId);
      }

    } catch (error) {
      this.logger.warn('Failed to update league table metadata', { error: error.toString() });
    }
  }

  getSortedHeaders() {
    return Array.isArray(this.config.SORT_HEADERS)
      ? this.config.SORT_HEADERS
      : ['Position', 'Team', 'Played', 'Won', 'Drawn', 'Lost', 'Goals For', 'Goals Against', 'Goal Difference', 'Points'];
  }

  clearSheetData(sheet) {
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    if (lastRow > 1 && lastColumn > 0) {
      sheet.getRange(2, 1, lastRow - 1, lastColumn).clearContent();
    }
  }

  getValue(row, keys) {
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key in row && row[key] !== '') {
        return row[key];
      }
    }
    return '';
  }

  toNumber(value, fallback = 0) {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  getScriptProperties() {
    if (typeof PropertiesService !== 'undefined' && PropertiesService.getScriptProperties) {
      return PropertiesService.getScriptProperties();
    }
    return {
      getProperty() { return ''; },
      setProperty() {},
      getProperties() { return {}; }
    };
  }
}

function refreshAndMapLeague() {
  const pipeline = new LeagueTablePipeline();
  return pipeline.refreshAndMap();
}

function generateLeagueTable() {
  const pipeline = new LeagueTablePipeline();
  return pipeline.generateHtml();
}
