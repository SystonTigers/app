/**
 * STORAGE MONITORING AND NOTIFICATIONS
 */

function updateStorageAlert(level, message, usage) {
  const sheet = getOrCreateSheet(SHEET_NAMES.STORAGE);

  // Add headers if needed
  if (sheet.getLastRow() <= 1) {
    setupStorageSheet(sheet);
  }

  // Find or add storage alert row
  const alertRow = findStorageAlertRow(sheet) || (sheet.getLastRow() + 1);

  const alertData = [
    'Drive Storage Alert',
    level.toUpperCase(),
    message,
    usage?.usage || 'Unknown',
    usage?.available || 'Unknown',
    new Date()
  ];

  sheet.getRange(alertRow, 1, 1, 6).setValues([alertData]);

  // Color code by alert level
  let backgroundColor = '#ffffff';
  switch (level) {
    case 'critical':
    case 'emergency':
      backgroundColor = '#ffebee';
      break;
    case 'warning':
      backgroundColor = '#fff3e0';
      break;
    default:
      backgroundColor = '#e8f5e8';
  }

  sheet.getRange(alertRow, 1, 1, 6).setBackground(backgroundColor);
}

function updateCleanupInfo(filesDeleted, storageFreed, nextCleanup) {
  const sheet = getOrCreateSheet(SHEET_NAMES.STORAGE);

  if (sheet.getLastRow() <= 1) {
    setupStorageSheet(sheet);
  }

  // Update cleanup summary
  const cleanupRow = findCleanupSummaryRow(sheet) || (sheet.getLastRow() + 1);

  const cleanupData = [
    'Last Cleanup',
    'Completed',
    `${filesDeleted} files deleted, ${storageFreed} freed`,
    'N/A',
    `Next: ${nextCleanup}`,
    new Date()
  ];

  sheet.getRange(cleanupRow, 1, 1, 6).setValues([cleanupData]);
  sheet.getRange(cleanupRow, 1, 1, 6).setBackground('#e8f5e8');
}

function setupStorageSheet(sheet) {
  const headers = [
    'Component', 'Status', 'Details', 'Usage', 'Available', 'Last Updated'
  ];

  sheet.getRange(1, 1, 1, 6).setValues([headers]);
  sheet.getRange(1, 1, 1, 6)
    .setFontWeight('bold')
    .setBackground('#4a90e2')
    .setFontColor('white');

  // Add initial storage info
  const initialData = [
    ['YouTube Storage', 'Active', 'Unlimited storage for all highlights', 'N/A', 'Unlimited', new Date()],
    ['Google Drive', 'Active', '30-day temporary storage with auto-cleanup', '0%', 'Checking...', new Date()],
    ['Processing Services', 'Active', 'Railway + Render + Cloudflare endpoints', 'N/A', 'Available', new Date()]
  ];

  sheet.getRange(2, 1, 3, 6).setValues(initialData);
  sheet.autoResizeColumns(1, 6);
}

function refreshStorageInfo() {
  try {
    const sheet = getOrCreateSheet(SHEET_NAMES.STORAGE);

    // Get current storage status from processing services
    const storageStatus = fetchStorageStatus();

    if (storageStatus) {
      updateStorageDisplay(sheet, storageStatus);
      logActivity('✅ Storage info refreshed', 'success');
    } else {
      logActivity('⚠️ Could not fetch storage status', 'warning');
    }

    // Show user notification
    showUserAlert('Storage Info', 'Storage information has been refreshed.', 'info');

  } catch (error) {
    Logger.log('refreshStorageInfo error: ' + error.toString());
    logActivity(`Storage refresh failed: ${error.message}`, 'error');
  }
}

function fetchStorageStatus() {
  const endpoints = [
    CONFIG.RAILWAY_URL + '/storage/status',
    CONFIG.RENDER_URL + '/storage/status'
  ];

  for (const endpoint of endpoints) {
    try {
      const response = UrlFetchApp.fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${CONFIG.API_KEY}`
        },
        muteHttpExceptions: true
      });

      if (response.getResponseCode() === 200) {
        return JSON.parse(response.getContentText());
      }
    } catch (error) {
      Logger.log(`Storage status fetch failed: ${endpoint} - ${error.toString()}`);
    }
  }

  return null;
}

function updateStorageDisplay(sheet, storageStatus) {
  const { storage, alerts, performance } = storageStatus;

  // Update Drive storage info
  if (storage?.drive) {
    const driveRow = findStorageRow(sheet, 'Google Drive') || 3;
    sheet.getRange(driveRow, 2, 1, 4).setValues([[
      'Active',
      `${storage.drive.usage} used, auto-cleanup enabled`,
      storage.drive.usage,
      storage.drive.available
    ]]);

    // Color code based on usage
    const usagePercent = storage.drive.usagePercent || 0;
    let color = '#e8f5e8';
    if (usagePercent > 90) color = '#ffebee';
    else if (usagePercent > 75) color = '#fff3e0';

    sheet.getRange(driveRow, 1, 1, 6).setBackground(color);
  }

  // Update YouTube info
  if (storage?.youtube) {
    const youtubeRow = findStorageRow(sheet, 'YouTube Storage') || 2;
    sheet.getRange(youtubeRow, 3).setValue(
      `${storage.youtube.videoCount || 0} videos uploaded, ${storage.youtube.subscribers || 0} subscribers`
    );
  }
}

function findStorageRow(sheet, component) {
  const data = sheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === component) {
      return i + 1;
    }
  }
  return null;
}

function findStorageAlertRow(sheet) {
  return findStorageRow(sheet, 'Drive Storage Alert');
}

function findCleanupSummaryRow(sheet) {
  return findStorageRow(sheet, 'Last Cleanup');
}

/**
 * AUTOMATED TRIGGERS AND MAINTENANCE
 */

function setupAutomatedTriggers() {
  try {
    // Clear existing triggers to avoid duplicates
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction().startsWith('automated') ||
          trigger.getHandlerFunction().startsWith('daily') ||
          trigger.getHandlerFunction().startsWith('weekly')) {
        ScriptApp.deleteTrigger(trigger);
      }
    });

    // Daily maintenance at 6 AM
    ScriptApp.newTrigger('automatedDailyMaintenance')
      .timeBased()
      .everyDays(1)
      .atHour(6)
      .create();

    // Weekly statistics update on Sundays at 9 AM
    ScriptApp.newTrigger('automatedWeeklyUpdate')
      .timeBased()
      .everyWeeks(1)
      .onWeekDay(ScriptApp.WeekDay.SUNDAY)
      .atHour(9)
      .create();

    // Monthly report on first day at 10 AM
    ScriptApp.newTrigger('automatedMonthlyReport')
      .timeBased()
      .onMonthDay(1)
      .atHour(10)
      .create();

    // Hourly health check
    ScriptApp.newTrigger('automatedHealthCheck')
      .timeBased()
      .everyHours(1)
      .create();

    Logger.log('✅ Automated triggers configured');
    logActivity('Automated triggers set up successfully', 'success');

  } catch (error) {
    Logger.log('setupAutomatedTriggers error: ' + error.toString());
    logActivity(`Trigger setup failed: ${error.message}`, 'error');
  }
}

function automatedDailyMaintenance() {
  try {
    Logger.log('Starting daily maintenance');

    // Update storage information
    refreshStorageInfo();

    // Clean up old activity logs
    cleanupActivityLogs();

    // Update dashboard
    updateDashboard();

    // Check for stuck processing jobs
    checkStuckJobs();

    logActivity('✅ Daily maintenance completed', 'success');

  } catch (error) {
    Logger.log('automatedDailyMaintenance error: ' + error.toString());
    logActivity(`Daily maintenance failed: ${error.message}`, 'error');
  }
}

function automatedWeeklyUpdate() {
  try {
    Logger.log('Starting weekly update');

    // Update season statistics
    updateWeeklyStats();

    // Generate playlist updates
    updateAllPlayerPlaylists();

    // Send weekly summary email
    sendWeeklySummary();

    logActivity('✅ Weekly update completed', 'success');

  } catch (error) {
    Logger.log('automatedWeeklyUpdate error: ' + error.toString());
    logActivity(`Weekly update failed: ${error.message}`, 'error');
  }
}

function automatedMonthlyReport() {
  try {
    Logger.log('Starting monthly report');

    // Generate comprehensive monthly report
    const report = generateMonthlyReport();

    // Email report to administrators
    emailMonthlyReport(report);

    // Archive old player highlight sheets if needed
    archiveOldHighlights();

    logActivity('✅ Monthly report completed', 'success');

  } catch (error) {
    Logger.log('automatedMonthlyReport error: ' + error.toString());
    logActivity(`Monthly report failed: ${error.message}`, 'error');
  }
}

function automatedHealthCheck() {
  try {
    // Check if processing services are responding
    const healthStatus = checkSystemHealth();

    if (!healthStatus.allHealthy) {
      logActivity(`⚠️ System health issue: ${healthStatus.issues.join(', ')}`, 'warning');

      // Send alert if critical issues
      if (healthStatus.criticalIssues.length > 0) {
        sendHealthAlert(healthStatus);
      }
    }

  } catch (error) {
    Logger.log('automatedHealthCheck error: ' + error.toString());
    logActivity(`Health check failed: ${error.message}`, 'error');
  }
}

function checkSystemHealth() {
  const endpoints = [
    { url: CONFIG.RAILWAY_URL + '/health', name: 'Railway' },
    { url: CONFIG.RENDER_URL + '/health', name: 'Render' },
    { url: CONFIG.CLOUDFLARE_URL + '/status', name: 'Cloudflare' }
  ];

  const results = {
    allHealthy: true,
    issues: [],
    criticalIssues: [],
    services: {}
  };

  endpoints.forEach(endpoint => {
    try {
      const response = UrlFetchApp.fetch(endpoint.url, {
        method: 'GET',
        muteHttpExceptions: true
      });

      const isHealthy = response.getResponseCode() === 200;
      results.services[endpoint.name] = isHealthy;

      if (!isHealthy) {
        results.allHealthy = false;
        const issue = `${endpoint.name} endpoint down (${response.getResponseCode()})`;
        results.issues.push(issue);

        // Consider Railway and Render as critical
        if (endpoint.name === 'Railway' || endpoint.name === 'Render') {
          results.criticalIssues.push(issue);
        }
      }

    } catch (error) {
      results.allHealthy = false;
      const issue = `${endpoint.name} connection failed`;
      results.issues.push(issue);
      results.criticalIssues.push(issue);
      results.services[endpoint.name] = false;
    }
  });

  return results;
}

function checkStuckJobs() {
  const queueSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.QUEUE);
  if (!queueSheet) return;

  const data = queueSheet.getDataRange().getValues();
  const now = new Date();
  const stuckThreshold = 2 * 60 * 60 * 1000; // 2 hours

  for (let i = 1; i < data.length; i++) {
    const [videoUrl, matchDate, opponent, notes, cuts, status, details, updated, jobId] = data[i];

    if (status === STATUS.PROCESSING && updated) {
      const updateTime = new Date(updated);
      const timeDiff = now.getTime() - updateTime.getTime();

      if (timeDiff > stuckThreshold) {
        // Mark as stuck and ready for retry
        updateCellStatus(queueSheet, i + 1, 6, STATUS.READY);
        updateCellStatus(queueSheet, i + 1, 7, '⚠️ Stuck job - ready for retry');

        logActivity(`Job marked as stuck: ${opponent} (${Math.round(timeDiff / 60000)} minutes)`, 'warning');
      }
    }
  }
}

function cleanupActivityLogs() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.ACTIVITY);
  if (!sheet) return;

  const maxRows = 200;
  const currentRows = sheet.getLastRow();

  if (currentRows > maxRows + 1) { // +1 for header
    const rowsToDelete = currentRows - maxRows - 1;
    sheet.deleteRows(2, rowsToDelete); // Keep header, delete from row 2

    logActivity(`Cleaned up ${rowsToDelete} old activity log entries`, 'info');
  }
}

/**
 * DASHBOARD AND STATISTICS
 */

function updateDashboard() {
  try {
    const sheet = getOrCreateSheet(SHEET_NAMES.DASHBOARD);

    if (sheet.getLastRow() <= 1) {
      setupDashboard(sheet);
    }

    // Collect current statistics
    const stats = collectCurrentStats();

    // Update dashboard sections
    updateDashboardOverview(sheet, stats);
    updateDashboardMatchInfo(stats);
    updateDashboardProcessingStatus(sheet, stats);

    // Add last updated timestamp
    sheet.getRange(1, 8).setValue(`Updated: ${new Date().toLocaleString()}`);

    logActivity('📊 Dashboard updated', 'info');

  } catch (error) {
    Logger.log('updateDashboard error: ' + error.toString());
    logActivity(`Dashboard update failed: ${error.message}`, 'error');
  }
}

function setupDashboard(sheet) {
  // Set up dashboard layout
  sheet.getRange(1, 1, 1, 8).merge();
  sheet.getRange(1, 1)
    .setValue(`🏈 ${CONFIG.CLUB_NAME} - Football Highlights Dashboard`)
    .setFontSize(18)
    .setFontWeight('bold')
    .setBackground('#4a90e2')
    .setFontColor('white')
    .setHorizontalAlignment('center');

  // Create sections
  const sections = [
    ['SEASON OVERVIEW', '', '', '', 'CURRENT MATCH', '', '', ''],
    ['Total Videos Processed', '0', '', '', 'Next Opponent', 'TBD', '', ''],
    ['Player Highlights Created', '0', '', '', 'Match Notes Ready', 'NO', '', ''],
    ['Total Processing Time', '0 min', '', '', 'Videos in Queue', '0', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['PROCESSING STATUS', '', '', '', 'STORAGE STATUS', '', '', ''],
    ['Queue Status', 'Ready', '', '', 'Drive Usage', '0%', '', ''],
    ['Last Processing', 'Never', '', '', 'YouTube Videos', '0', '', ''],
    ['Success Rate', '100%', '', '', 'Next Cleanup', 'TBD', '', '']
  ];

  sheet.getRange(3, 1, sections.length, 8).setValues(sections);

  // Format section headers
  sheet.getRange(3, 1, 1, 4).setBackground('#e6f3ff').setFontWeight('bold');
  sheet.getRange(3, 5, 1, 4).setBackground('#e6f3ff').setFontWeight('bold');
  sheet.getRange(8, 1, 1, 4).setBackground('#f0f0f0').setFontWeight('bold');
  sheet.getRange(8, 5, 1, 4).setBackground('#f0f0f0').setFontWeight('bold');

  // Auto-resize columns
  sheet.autoResizeColumns(1, 8);
}

function collectCurrentStats() {
  const stats = {
    totalProcessed: 0,
    playerHighlights: 0,
    totalProcessingTime: 0,
    queueCount: 0,
    lastProcessing: 'Never',
    successRate: 100,
    currentMatch: {
      opponent: 'TBD',
      notesReady: false
    }
  };

  try {
    // Collect from video queue
    const queueSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.QUEUE);
    if (queueSheet && queueSheet.getLastRow() > 1) {
      const queueData = queueSheet.getDataRange().getValues();

      for (let i = 1; i < queueData.length; i++) {
        const [videoUrl, matchDate, opponent, notes, cuts, status] = queueData[i];

        if (status === STATUS.COMPLETE) {
          stats.totalProcessed++;
          stats.lastProcessing = matchDate || stats.lastProcessing;
        } else if (status === STATUS.READY || status === STATUS.QUEUED) {
          stats.queueCount++;
        }

        // Get current match info
        if (opponent && opponent !== 'Unknown Opponent') {
          stats.currentMatch.opponent = opponent;
        }
      }
    }

    // Count player highlight sheets
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();
    stats.playerHighlights = sheets.filter(sheet =>
      sheet.getName().includes('Highlights') &&
      !sheet.getName().includes('Dashboard') &&
      sheet.getName() !== SHEET_NAMES.QUEUE
    ).length;

    // Check match notes
    const notesSheet = ss.getSheetByName(SHEET_NAMES.NOTES);
    if (notesSheet && notesSheet.getLastRow() > 1) {
      stats.currentMatch.notesReady = true;
    }

  } catch (error) {
    Logger.log('collectCurrentStats error: ' + error.toString());
  }

  return stats;
}

function updateDashboardOverview(sheet, stats) {
  // Update season overview section
  sheet.getRange(4, 2).setValue(stats.totalProcessed);
  sheet.getRange(5, 2).setValue(stats.playerHighlights);
  sheet.getRange(6, 2).setValue(`${stats.totalProcessingTime} min`);
}

function updateDashboardMatchInfo(stats) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.DASHBOARD);
  if (!sheet) return;

  sheet.getRange(4, 6).setValue(stats.currentMatch.opponent);
  sheet.getRange(5, 6).setValue(stats.currentMatch.notesReady ? 'YES' : 'NO');
  sheet.getRange(6, 6).setValue(stats.queueCount);

  // Color code the notes status
  const notesCell = sheet.getRange(5, 6);
  if (stats.currentMatch.notesReady) {
    notesCell.setBackground('#e8f5e8');
  } else {
    notesCell.setBackground('#fff3e0');
  }
}

function updateDashboardProcessingStatus(sheet, stats) {
  const queueStatus = stats.queueCount > 0 ? 'Videos Waiting' : 'Ready';
  sheet.getRange(9, 2).setValue(queueStatus);
  sheet.getRange(10, 2).setValue(stats.lastProcessing);
  sheet.getRange(11, 2).setValue(`${stats.successRate}%`);
}

/**
 * NOTIFICATION SYSTEM
 */

function sendCompletionNotification(uploadResults, stats, metadata) {
  if (!CONFIG.NOTIFICATION_EMAIL) return;

  try {
    const subject = `✅ Highlights Ready: ${CONFIG.CLUB_NAME} vs ${metadata?.opponent || 'Unknown'}`;

    const teamUrl = uploadResults?.teamHighlight?.youtube?.url || 'Not available';
    const playerCount = uploadResults?.playerHighlights?.length || 0;

    let playerLinks = '';
    if (uploadResults?.playerHighlights) {
      playerLinks = uploadResults.playerHighlights.map(ph =>
        `• ${ph.player}: ${ph.youtube?.url || 'Processing...'}`
      ).join('\\n');
    }

    const body = `
🎬 Your football highlights are ready!

📊 MATCH: ${CONFIG.CLUB_NAME} vs ${metadata?.opponent || 'Unknown'}
📅 DATE: ${metadata?.matchDate || 'Today'}

🎥 RESULTS:
• Team Highlight: ${teamUrl}
• Player Highlights: ${playerCount} created
• Total Actions: ${stats?.totalHighlights || 0}

${playerLinks ? '\\n👤 PLAYER HIGHLIGHTS:\\n' + playerLinks : ''}

📱 Access your Google Sheet: ${SpreadsheetApp.getActiveSpreadsheet().getUrl()}

📺 All videos are initially uploaded as "unlisted" for privacy.
🔄 Use the dashboard to make them public when ready.
🗑️ Drive copies auto-delete in 30 days (YouTube copies remain forever).

Questions? Reply to this email.
    `;

    MailApp.sendEmail({
      to: CONFIG.NOTIFICATION_EMAIL,
      subject: subject,
      body: body
    });

    logActivity(`📧 Completion notification sent to ${CONFIG.NOTIFICATION_EMAIL}`, 'info');

  } catch (error) {
    Logger.log('sendCompletionNotification error: ' + error.toString());
    logActivity(`Notification email failed: ${error.message}`, 'error');
  }
}

function sendErrorNotification(title, error, metadata) {
  if (!CONFIG.NOTIFICATION_EMAIL) return;

  try {
    const subject = `❌ ${title}: ${CONFIG.CLUB_NAME}`;

    const body = `
⚠️ There was an issue processing your football highlights.

🚫 ERROR: ${error}

📊 MATCH DETAILS:
• Club: ${CONFIG.CLUB_NAME}
• Opponent: ${metadata?.opponent || 'Unknown'}
• Date: ${metadata?.matchDate || 'Today'}

🔧 WHAT TO DO:
1. Check your video URL is a valid Google Drive link
2. Ensure the video file is accessible
3. Try processing again from your sheet
4. Contact support if the issue persists

📱 Your Google Sheet: ${SpreadsheetApp.getActiveSpreadsheet().getUrl()}

Need help? Reply to this email with details.
    `;

    MailApp.sendEmail({
      to: CONFIG.NOTIFICATION_EMAIL,
      subject: subject,
      body: body
    });

    logActivity(`📧 Error notification sent to ${CONFIG.NOTIFICATION_EMAIL}`, 'info');

  } catch (error) {
    Logger.log('sendErrorNotification error: ' + error.toString());
  }
}

function sendStorageAlert(level, message, usage, recommendedAction) {
  if (!CONFIG.NOTIFICATION_EMAIL) return;

  try {
    const subject = `🚨 Storage Alert (${level.toUpperCase()}): ${CONFIG.CLUB_NAME}`;

    const body = `
📦 Storage Alert for your Football Highlights system.

⚠️ ALERT LEVEL: ${level.toUpperCase()}
📊 MESSAGE: ${message}
💾 CURRENT USAGE: ${usage?.usage || 'Unknown'}
🆓 AVAILABLE SPACE: ${usage?.available || 'Unknown'}

🔧 RECOMMENDED ACTION:
${recommendedAction || 'Monitor storage usage and consider cleanup.'}

📱 Manage storage: ${SpreadsheetApp.getActiveSpreadsheet().getUrl()}

ℹ️ Remember: Drive files auto-delete after 30 days.
📺 All your videos are permanently stored on YouTube.

Questions? Reply to this email.
    `;

    MailApp.sendEmail({
      to: CONFIG.NOTIFICATION_EMAIL,
      subject: subject,
      body: body
    });

    logActivity(`📧 Storage alert sent to ${CONFIG.NOTIFICATION_EMAIL}`, 'info');

  } catch (error) {
    Logger.log('sendStorageAlert error: ' + error.toString());
  }
}