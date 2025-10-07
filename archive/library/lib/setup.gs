/**
 * @fileoverview Setup and installation for SystonAutomationLib
 * @version 1.0.0
 * @description Idempotent installer for sheets, triggers, and configuration
 */

/**
 * Ensure a sheet exists with proper headers
 * @param {string} name - Sheet name
 * @param {Array<Array>} headers - Header rows to create if sheet is empty
 * @return {GoogleAppsScript.Spreadsheet.Sheet} The sheet
 */
function SA_ensureSheet_(name, headers) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(name);

  if (!sh) {
    sh = ss.insertSheet(name);
  }

  // Add headers if sheet is empty
  if (headers && sh.getLastRow() === 0) {
    sh.getRange(1, 1, headers.length, headers[0].length).setValues(headers);

    // Format header row
    const headerRange = sh.getRange(1, 1, 1, headers[0].length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#e8f0fe');
    headerRange.setBorder(true, true, true, true, true, true);

    // Set column widths
    for (let i = 1; i <= headers[0].length; i++) {
      sh.setColumnWidth(i, 150);
    }
  }

  return sh;
}

/**
 * Idempotent installer for required sheets and triggers
 * @param {Object} initialConfig - Initial configuration to persist
 * @return {Object} Health check result after installation
 */
function SA_install_(initialConfig) {
  try {
    SA_log_('INFO', 'Starting system installation', { config: !!initialConfig });

    // Create required sheets
    SA_ensureSheet_('Config', [['Key', 'Value', 'Description', 'Last Updated']]);

    SA_ensureSheet_('Player_Consents', [
      ['PlayerId', 'Name', 'Consent', 'Expires', 'Notes', 'Updated']
    ]);

    SA_ensureSheet_('Privacy_Requests', [
      ['RequestId', 'PlayerId', 'Type', 'Status', 'CreatedAt', 'CompletedAt', 'Details']
    ]);

    SA_ensureSheet_('Data_Processing_Log', [
      ['When', 'Actor', 'Action', 'Entity', 'Notes', 'LegalBasis']
    ]);

    SA_ensureSheet_('Consent_Audit_Trail', [
      ['When', 'PlayerId', 'Change', 'By', 'Previous', 'New']
    ]);

    SA_ensureSheet_('Live_Match_Updates', [
      ['Minute', 'Event', 'Player', 'Details', 'Home_Score', 'Away_Score', 'Timestamp']
    ]);

    SA_ensureSheet_('Fixtures', [
      ['Date', 'Opposition', 'Venue', 'Competition', 'Result', 'Notes']
    ]);

    SA_ensureSheet_('Players', [
      ['Name', 'Position', 'Squad_Number', 'Active', 'Privacy_Consent']
    ]);

    SA_ensureSheet_('System_Log', [
      ['Timestamp', 'Level', 'Component', 'Message', 'Data']
    ]);

    // Persist initial configuration
    if (initialConfig) {
      PropertiesService.getScriptProperties().setProperties(initialConfig, true);
      SA_log_('INFO', 'Configuration updated', { keys: Object.keys(initialConfig) });
    }

    // Install triggers (idempotent)
    SA_installTriggers_();

    // Run post-install health check
    const health = SA_health_();

    SA_log_('INFO', 'Installation completed', health);

    return health;

  } catch (error) {
    SA_log_('ERROR', 'Installation failed', { error: error.toString() });
    throw error;
  }
}

/**
 * Install required triggers (idempotent)
 * @private
 */
function SA_installTriggers_() {
  const existing = ScriptApp.getProjectTriggers().map(t => t.getHandlerFunction());

  const required = [
    ['SA_hourlyRefresh', () => ScriptApp.newTrigger('SA_hourlyRefresh').timeBased().everyHours(1)],
    ['SA_onEditHandler', () => ScriptApp.newTrigger('SA_onEditHandler')
      .forSpreadsheet(SpreadsheetApp.getActive()).onEdit()]
  ];

  let installed = 0;

  required.forEach(([functionName, builder]) => {
    if (!existing.includes(functionName)) {
      try {
        builder().create();
        installed++;
        SA_log_('INFO', `Trigger installed: ${functionName}`);
      } catch (error) {
        SA_log_('WARN', `Failed to install trigger: ${functionName}`, { error: error.toString() });
      }
    }
  });

  SA_log_('INFO', `Triggers checked, ${installed} new triggers installed`);
}

/**
 * Hourly refresh trigger handler
 */
function SA_hourlyRefresh() {
  try {
    SA_log_('INFO', 'Running hourly refresh');

    // Clean up old logs (keep last 1000 entries)
    SA_cleanupLogs_();

    // Check system health
    const health = SA_health_();
    if (health.status !== 'OK') {
      SA_log_('WARN', 'System health check failed', health);
    }

    // Run any scheduled tasks here
    SA_log_('INFO', 'Hourly refresh completed');

  } catch (error) {
    SA_log_('ERROR', 'Hourly refresh failed', { error: error.toString() });
  }
}

/**
 * Edit trigger handler for live updates
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e - Edit event
 */
function SA_onEditHandler(e) {
  if (!e || !e.range) return;

  try {
    const sheetName = e.range.getSheet().getName();
    const editedRange = e.range.getA1Notation();

    // Log the edit for audit purposes
    SA_log_('DEBUG', 'Sheet edited', {
      sheet: sheetName,
      range: editedRange,
      user: Session.getActiveUser().getEmail()
    });

    // Handle specific sheet edits
    if (sheetName === 'Live_Match_Updates') {
      SA_handleLiveMatchEdit_(e);
    } else if (sheetName === 'Player_Consents') {
      SA_handleConsentEdit_(e);
    }

  } catch (error) {
    SA_log_('ERROR', 'Edit handler failed', { error: error.toString() });
  }
}

/**
 * Handle edits to Live Match Updates sheet
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e - Edit event
 * @private
 */
function SA_handleLiveMatchEdit_(e) {
  // This would trigger posting logic based on new events
  SA_log_('INFO', 'Live match update detected', {
    range: e.range.getA1Notation()
  });
}

/**
 * Handle edits to Player Consents sheet
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e - Edit event
 * @private
 */
function SA_handleConsentEdit_(e) {
  const range = e.range;
  const sheet = range.getSheet();
  const row = range.getRow();

  if (row > 1) { // Not header row
    // Update the timestamp in the 'Updated' column
    const lastCol = sheet.getLastColumn();
    sheet.getRange(row, lastCol).setValue(new Date());

    SA_log_('INFO', 'Player consent updated', {
      row: row,
      range: range.getA1Notation()
    });
  }
}

/**
 * Clean up old log entries
 * @private
 */
function SA_cleanupLogs_() {
  try {
    const logSheet = SpreadsheetApp.getActive().getSheetByName('System_Log');
    if (!logSheet) return;

    const maxRows = 1000;
    const currentRows = logSheet.getLastRow();

    if (currentRows > maxRows + 1) { // +1 for header
      const rowsToDelete = currentRows - maxRows;
      logSheet.deleteRows(2, rowsToDelete); // Start from row 2 (after header)
      SA_log_('INFO', `Cleaned up ${rowsToDelete} old log entries`);
    }

  } catch (error) {
    console.error('Log cleanup failed:', error);
  }
}