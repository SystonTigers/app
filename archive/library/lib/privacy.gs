/**
 * @fileoverview Privacy and GDPR compliance for SystonAutomationLib
 * @version 1.0.0
 * @description Player consent management and privacy protection
 */

/**
 * Check if a player can be published in posts
 * @param {string} playerId - Player identifier
 * @return {boolean} True if player can be published
 */
function SA_canPublishPlayer_(playerId) {
  try {
    if (!playerId || playerId.trim() === '') {
      return false;
    }

    // Check if privacy checks are enabled
    const cfg = SA_cfg_();
    if (cfg.ENABLE_PRIVACY_CHECKS !== 'true') {
      return true; // Privacy checks disabled, allow all
    }

    const ss = SpreadsheetApp.getActive();
    const consentSheet = ss.getSheetByName('Player_Consents');

    if (!consentSheet) {
      SA_log_('WARN', 'Privacy check failed: Player_Consents sheet not found');
      return false; // Fail safe - no consent sheet means no permission
    }

    const lastRow = consentSheet.getLastRow();
    if (lastRow <= 1) {
      SA_log_('WARN', 'Privacy check failed: No consent data found', { playerId });
      return false; // No consent data
    }

    // Get all consent data
    const data = consentSheet.getRange(2, 1, lastRow - 1, 6).getValues();

    // Find player record
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const recordPlayerId = String(row[0] || '').trim();
      const consent = String(row[2] || '').toLowerCase().trim();
      const expires = row[3];

      if (recordPlayerId === String(playerId).trim()) {
        // Check if consent is given
        if (consent !== 'yes' && consent !== 'true' && consent !== '1') {
          SA_log_('INFO', 'Player consent denied', { playerId, consent });
          return false;
        }

        // Check if consent has expired
        if (expires && expires instanceof Date && expires < new Date()) {
          SA_log_('INFO', 'Player consent expired', { playerId, expires });
          return false;
        }

        // Log successful consent check
        SA_logConsentCheck_(playerId, 'consent_verified');
        return true;
      }
    }

    // Player not found in consent records
    SA_log_('WARN', 'Player not found in consent records', { playerId });
    return false;

  } catch (error) {
    SA_log_('ERROR', 'Privacy check failed', { playerId, error: error.toString() });
    return false; // Fail safe
  }
}

/**
 * Add or update player consent
 * @param {string} playerId - Player identifier
 * @param {string} playerName - Player name
 * @param {boolean} consentGiven - Whether consent is given
 * @param {Date} expiryDate - Optional expiry date
 * @param {string} notes - Optional notes
 * @return {Object} Result of the operation
 */
function SA_updatePlayerConsent_(playerId, playerName, consentGiven, expiryDate, notes) {
  try {
    const ss = SpreadsheetApp.getActive();
    const consentSheet = ss.getSheetByName('Player_Consents');

    if (!consentSheet) {
      throw new Error('Player_Consents sheet not found');
    }

    const now = new Date();
    const consentValue = consentGiven ? 'Yes' : 'No';

    // Check if player already exists
    const data = consentSheet.getDataRange().getValues();
    let existingRow = -1;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(playerId).trim()) {
        existingRow = i + 1; // +1 for 1-based indexing
        break;
      }
    }

    if (existingRow > 0) {
      // Update existing record
      consentSheet.getRange(existingRow, 1, 1, 6).setValues([[
        playerId,
        playerName,
        consentValue,
        expiryDate || '',
        notes || '',
        now
      ]]);

      SA_log_('INFO', 'Player consent updated', {
        playerId, playerName, consent: consentValue, row: existingRow
      });

    } else {
      // Add new record
      consentSheet.appendRow([
        playerId,
        playerName,
        consentValue,
        expiryDate || '',
        notes || '',
        now
      ]);

      SA_log_('INFO', 'Player consent added', {
        playerId, playerName, consent: consentValue
      });
    }

    // Log to audit trail
    SA_logConsentAudit_(playerId, consentGiven ? 'consent_granted' : 'consent_revoked', Session.getActiveUser().getEmail());

    return {
      success: true,
      playerId: playerId,
      consent: consentValue,
      updated: now
    };

  } catch (error) {
    SA_log_('ERROR', 'Failed to update player consent', {
      playerId, error: error.toString()
    });
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Handle GDPR data request (export, delete, etc.)
 * @param {string} playerId - Player identifier
 * @param {string} requestType - Type of request (export, delete, rectify)
 * @param {string} requestDetails - Additional details
 * @return {Object} Request result
 */
function SA_handleGDPRRequest_(playerId, requestType, requestDetails) {
  try {
    const requestId = 'REQ_' + Date.now();
    const now = new Date();

    // Log the request
    SA_logPrivacyRequest_(requestId, playerId, requestType, 'In Progress', requestDetails);

    let result;

    switch (requestType.toLowerCase()) {
      case 'export':
      case 'access':
        result = SA_exportPlayerData_(playerId);
        break;

      case 'delete':
      case 'erasure':
        result = SA_deletePlayerData_(playerId);
        break;

      case 'rectify':
      case 'correction':
        result = SA_rectifyPlayerData_(playerId, requestDetails);
        break;

      default:
        throw new Error(`Unknown request type: ${requestType}`);
    }

    // Update request status
    SA_updatePrivacyRequestStatus_(requestId, result.success ? 'Completed' : 'Failed');

    SA_log_('INFO', 'GDPR request processed', {
      requestId, playerId, type: requestType, success: result.success
    });

    return {
      requestId: requestId,
      success: result.success,
      result: result,
      processed: now
    };

  } catch (error) {
    SA_log_('ERROR', 'GDPR request failed', {
      playerId, requestType, error: error.toString()
    });
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Export all data for a player
 * @param {string} playerId - Player identifier
 * @return {Object} Exported data
 * @private
 */
function SA_exportPlayerData_(playerId) {
  try {
    const ss = SpreadsheetApp.getActive();
    const playerData = {
      playerId: playerId,
      exportDate: new Date().toISOString(),
      dataCategories: {}
    };

    // Search all sheets for player data
    const sheets = ss.getSheets();
    sheets.forEach(sheet => {
      const sheetName = sheet.getName();
      const data = sheet.getDataRange().getValues();

      if (data.length <= 1) return; // Skip empty sheets

      const headers = data[0];
      const playerRows = [];

      // Find rows containing player data
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const rowText = row.join(' ').toLowerCase();

        if (rowText.includes(String(playerId).toLowerCase())) {
          const rowObject = {};
          headers.forEach((header, index) => {
            rowObject[header] = row[index];
          });
          playerRows.push(rowObject);
        }
      }

      if (playerRows.length > 0) {
        playerData.dataCategories[sheetName] = playerRows;
      }
    });

    SA_logDataProcessing_(playerId, 'data_export', 'GDPR Article 15', 'Data access request');

    return {
      success: true,
      data: playerData,
      recordsFound: Object.keys(playerData.dataCategories).length
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Delete all player data (GDPR Right to Erasure)
 * @param {string} playerId - Player identifier
 * @return {Object} Deletion result
 * @private
 */
function SA_deletePlayerData_(playerId) {
  try {
    const ss = SpreadsheetApp.getActive();
    const deletionResults = {
      playerId: playerId,
      deletionDate: new Date().toISOString(),
      sheetsProcessed: [],
      recordsDeleted: 0
    };

    const sheets = ss.getSheets();

    // Process each sheet (except system sheets)
    const systemSheets = ['System_Log', 'Data_Processing_Log', 'Consent_Audit_Trail'];

    sheets.forEach(sheet => {
      const sheetName = sheet.getName();

      // Skip system/audit sheets
      if (systemSheets.includes(sheetName)) return;

      try {
        const data = sheet.getDataRange().getValues();
        if (data.length <= 1) return; // Skip empty sheets

        let deletedCount = 0;

        // Delete from bottom to top to avoid index issues
        for (let i = data.length - 1; i >= 1; i--) {
          const row = data[i];
          const rowText = row.join(' ').toLowerCase();

          if (rowText.includes(String(playerId).toLowerCase())) {
            sheet.deleteRow(i + 1);
            deletedCount++;
          }
        }

        if (deletedCount > 0) {
          deletionResults.sheetsProcessed.push({
            sheet: sheetName,
            recordsDeleted: deletedCount
          });
          deletionResults.recordsDeleted += deletedCount;
        }

      } catch (error) {
        SA_log_('ERROR', `Failed to delete from ${sheetName}`, { error: error.toString() });
      }
    });

    SA_logDataProcessing_(playerId, 'data_deletion', 'GDPR Article 17', 'Right to erasure request');

    return {
      success: true,
      result: deletionResults
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Log a consent check for audit purposes
 * @param {string} playerId - Player identifier
 * @param {string} action - Action performed
 * @private
 */
function SA_logConsentCheck_(playerId, action) {
  try {
    const ss = SpreadsheetApp.getActive();
    const auditSheet = ss.getSheetByName('Consent_Audit_Trail');

    if (auditSheet) {
      auditSheet.appendRow([
        new Date(),
        playerId,
        action,
        Session.getActiveUser().getEmail() || 'system',
        '', // Previous value
        ''  // New value
      ]);
    }
  } catch (error) {
    // Silent fail - don't break consent checking
  }
}

/**
 * Log consent audit event
 * @param {string} playerId - Player identifier
 * @param {string} change - Change description
 * @param {string} by - User making change
 * @private
 */
function SA_logConsentAudit_(playerId, change, by) {
  try {
    const ss = SpreadsheetApp.getActive();
    const auditSheet = ss.getSheetByName('Consent_Audit_Trail');

    if (auditSheet) {
      auditSheet.appendRow([
        new Date(),
        playerId,
        change,
        by || 'system',
        '', // Previous value
        ''  // New value
      ]);
    }
  } catch (error) {
    SA_log_('ERROR', 'Failed to log consent audit', { error: error.toString() });
  }
}

/**
 * Log privacy request
 * @param {string} requestId - Request identifier
 * @param {string} playerId - Player identifier
 * @param {string} type - Request type
 * @param {string} status - Request status
 * @param {string} details - Request details
 * @private
 */
function SA_logPrivacyRequest_(requestId, playerId, type, status, details) {
  try {
    const ss = SpreadsheetApp.getActive();
    const requestSheet = ss.getSheetByName('Privacy_Requests');

    if (requestSheet) {
      requestSheet.appendRow([
        requestId,
        playerId,
        type,
        status,
        new Date(),
        '', // CompletedAt - filled when status changes to Completed
        details || ''
      ]);
    }
  } catch (error) {
    SA_log_('ERROR', 'Failed to log privacy request', { error: error.toString() });
  }
}

/**
 * Update privacy request status
 * @param {string} requestId - Request identifier
 * @param {string} status - New status
 * @private
 */
function SA_updatePrivacyRequestStatus_(requestId, status) {
  try {
    const ss = SpreadsheetApp.getActive();
    const requestSheet = ss.getSheetByName('Privacy_Requests');

    if (requestSheet) {
      const data = requestSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === requestId) {
          requestSheet.getRange(i + 1, 4).setValue(status);
          if (status === 'Completed') {
            requestSheet.getRange(i + 1, 6).setValue(new Date());
          }
          break;
        }
      }
    }
  } catch (error) {
    SA_log_('ERROR', 'Failed to update privacy request status', { error: error.toString() });
  }
}

/**
 * Log data processing activity
 * @param {string} entity - Entity being processed
 * @param {string} action - Action performed
 * @param {string} legalBasis - Legal basis for processing
 * @param {string} notes - Additional notes
 * @private
 */
function SA_logDataProcessing_(entity, action, legalBasis, notes) {
  try {
    const ss = SpreadsheetApp.getActive();
    const logSheet = ss.getSheetByName('Data_Processing_Log');

    if (logSheet) {
      logSheet.appendRow([
        new Date(),
        Session.getActiveUser().getEmail() || 'system',
        action,
        entity,
        notes || '',
        legalBasis
      ]);
    }
  } catch (error) {
    SA_log_('ERROR', 'Failed to log data processing', { error: error.toString() });
  }
}