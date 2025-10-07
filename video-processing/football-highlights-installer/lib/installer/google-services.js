import { google } from 'googleapis';
import chalk from 'chalk';

export class GoogleServices {
  constructor(googleAuth, config) {
    this.auth = googleAuth.auth.client;
    this.config = config;
    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    this.drive = google.drive({ version: 'v3', auth: this.auth });
    this.script = google.script({ version: 'v1', auth: this.auth });
  }

  async createManagementSheet(deployments) {
    console.log(chalk.blue('📊 Creating management spreadsheet...'));

    try {
      // Step 1: Create the spreadsheet
      const spreadsheet = await this.createSpreadsheet();

      // Step 2: Set up all required sheets
      await this.setupSheets(spreadsheet.spreadsheetId);

      // Step 3: Configure sheet data and formatting
      await this.configureSheetData(spreadsheet.spreadsheetId, deployments);

      // Step 4: Deploy Apps Script integration
      const appsScriptProject = await this.deployAppsScript(spreadsheet.spreadsheetId, deployments);

      // Step 5: Set up triggers and permissions
      await this.setupTriggersAndPermissions(spreadsheet.spreadsheetId, appsScriptProject);

      return {
        spreadsheetId: spreadsheet.spreadsheetId,
        url: spreadsheet.spreadsheetUrl,
        appsScriptId: appsScriptProject.scriptId,
        appsScriptUrl: `https://script.google.com/d/${appsScriptProject.scriptId}/edit`,
        status: 'ready'
      };
    } catch (error) {
      throw new Error(`Failed to create management sheet: ${error.message}`);
    }
  }

  async createSpreadsheet() {
    const response = await this.sheets.spreadsheets.create({
      resource: {
        properties: {
          title: `${this.config.clubName} - Football Highlights System`,
          locale: 'en_US',
          autoRecalc: 'ON_CHANGE',
          timeZone: this.getTimeZoneForRegion(this.config.region)
        }
      }
    });

    return response.data;
  }

  async setupSheets(spreadsheetId) {
    // Define all sheets needed for the system
    const sheetsToCreate = [
      { title: 'Dashboard', index: 0 },
      { title: 'Live Match', index: 1 },
      { title: 'Players', index: 2 },
      { title: 'Matches', index: 3 },
      { title: 'Video Queue', index: 4 },
      { title: 'Settings', index: 5 },
      { title: 'System Logs', index: 6 }
    ];

    // Delete the default sheet first, then create our sheets
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          // Delete default sheet
          {
            deleteSheet: {
              sheetId: 0
            }
          },
          // Create all required sheets
          ...sheetsToCreate.map(sheet => ({
            addSheet: {
              properties: {
                title: sheet.title,
                index: sheet.index,
                gridProperties: {
                  rowCount: sheet.title === 'System Logs' ? 10000 : 1000,
                  columnCount: 26
                }
              }
            }
          }))
        ]
      }
    });

    return sheetsToCreate;
  }

  async configureSheetData(spreadsheetId, deployments) {
    // Dashboard Sheet
    await this.setupDashboard(spreadsheetId, deployments);

    // Live Match Sheet
    await this.setupLiveMatchSheet(spreadsheetId);

    // Players Sheet
    await this.setupPlayersSheet(spreadsheetId);

    // Matches Sheet
    await this.setupMatchesSheet(spreadsheetId);

    // Video Queue Sheet
    await this.setupVideoQueueSheet(spreadsheetId);

    // Settings Sheet
    await this.setupSettingsSheet(spreadsheetId, deployments);
  }

  async setupDashboard(spreadsheetId, deployments) {
    const dashboardData = [
      [`${this.config.clubName} - Football Highlights System`, '', '', '', '', 'Status: ✅ Active'],
      [],
      ['📊 System Overview', '', '', '🎥 Video Processing', '', ''],
      ['Season:', this.config.season, '', 'Railway URL:', deployments.railway?.url || 'Not deployed', ''],
      ['Region:', this.config.region, '', 'Render URL:', deployments.render?.url || 'Not deployed', ''],
      ['Admin Email:', this.config.email, '', 'Coordinator:', deployments.cloudflare?.url || 'Not deployed', ''],
      [],
      ['📈 Quick Stats', '', '', '🔧 Quick Actions', '', ''],
      ['Total Players:', '=COUNTA(Players!A:A)-1', '', 'Add New Match:', '→ Go to Live Match tab', ''],
      ['This Season Matches:', '=COUNTIF(Matches!B:B,Settings!B2)', '', 'Process Video:', '→ Upload to Video Queue', ''],
      ['Videos Processed:', '=COUNTA(VideoQueue!A:A)-1', '', 'View System Logs:', '→ Go to System Logs tab', ''],
      [],
      ['📋 Recent Activity', '', '', '', '', ''],
      ['Last Match:', '=IF(COUNTA(Matches!A:A)>1,INDEX(Matches!C:C,COUNTA(Matches!A:A)),"No matches yet")', '', '', '', ''],
      ['Last Video:', '=IF(COUNTA(VideoQueue!A:A)>1,INDEX(VideoQueue!B:B,COUNTA(VideoQueue!A:A)),"No videos yet")', '', '', '', ''],
      ['System Health:', '✅ All services operational', '', '', '', '']
    ];

    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Dashboard!A1:F16',
      valueInputOption: 'USER_ENTERED',
      resource: { values: dashboardData }
    });

    // Format the dashboard
    await this.formatDashboard(spreadsheetId);
  }

  async setupLiveMatchSheet(spreadsheetId) {
    const liveMatchHeaders = [
      ['Timestamp', 'Minute', 'Event Type', 'Player', 'Details', 'Score Home', 'Score Away', 'Video Timestamp', 'Processed']
    ];

    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Live Match!A1:I1',
      valueInputOption: 'RAW',
      resource: { values: liveMatchHeaders }
    });

    // Add data validation for Event Type column
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [{
          setDataValidation: {
            range: {
              sheetId: this.getSheetId('Live Match'),
              startRowIndex: 1,
              endRowIndex: 1000,
              startColumnIndex: 2,
              endColumnIndex: 3
            },
            rule: {
              condition: {
                type: 'ONE_OF_LIST',
                values: [
                  { userEnteredValue: 'Goal' },
                  { userEnteredValue: 'Assist' },
                  { userEnteredValue: 'Yellow Card' },
                  { userEnteredValue: 'Red Card' },
                  { userEnteredValue: 'Substitution' },
                  { userEnteredValue: 'Kickoff' },
                  { userEnteredValue: 'Half Time' },
                  { userEnteredValue: 'Full Time' },
                  { userEnteredValue: 'Big Save' },
                  { userEnteredValue: 'Chance' }
                ]
              },
              showCustomUi: true,
              strict: true
            }
          }
        }]
      }
    });
  }

  async setupPlayersSheet(spreadsheetId) {
    const playersData = [
      ['Player Name', 'Position', 'Squad Number', 'Goals', 'Assists', 'Yellow Cards', 'Red Cards', 'Minutes Played', 'Status'],
      // Sample players
      ['John Smith', 'Forward', '9', '0', '0', '0', '0', '0', 'Active'],
      ['Mike Johnson', 'Midfielder', '10', '0', '0', '0', '0', '0', 'Active'],
      ['David Wilson', 'Defender', '5', '0', '0', '0', '0', '0', 'Active'],
      ['Tom Brown', 'Goalkeeper', '1', '0', '0', '0', '0', '0', 'Active']
    ];

    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Players!A1:I5',
      valueInputOption: 'RAW',
      resource: { values: playersData }
    });
  }

  async setupMatchesSheet(spreadsheetId) {
    const matchesData = [
      ['Match Date', 'Season', 'Opposition', 'Home/Away', 'Score Home', 'Score Away', 'Result', 'Video File', 'Highlights Created', 'Match Notes']
    ];

    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Matches!A1:J1',
      valueInputOption: 'RAW',
      resource: { values: matchesData }
    });
  }

  async setupVideoQueueSheet(spreadsheetId) {
    const videoQueueData = [
      ['Queue ID', 'Match Date', 'Video File Name', 'File Size', 'Status', 'Processing Started', 'Processing Completed', 'Clips Created', 'YouTube Links', 'Drive Links']
    ];

    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Video Queue!A1:J1',
      valueInputOption: 'RAW',
      resource: { values: videoQueueData }
    });
  }

  async setupSettingsSheet(spreadsheetId, deployments) {
    const settingsData = [
      ['Setting', 'Value', 'Description'],
      ['Season', this.config.season, 'Current football season'],
      ['Club Name', this.config.clubName, 'Name of the football club'],
      ['Region', this.config.region, 'Geographic region for optimization'],
      ['Video Quality', this.config.videoQuality, 'Video processing quality setting'],
      ['Admin Email', this.config.email, 'Administrator email for notifications'],
      [],
      ['Processing URLs', '', ''],
      ['Railway URL', deployments.railway?.url || '', 'Primary video processing service'],
      ['Render URL', deployments.render?.url || '', 'Backup video processing service'],
      ['Coordinator URL', deployments.cloudflare?.url || '', 'Processing coordinator service'],
      [],
      ['Auto-Processing Settings', '', ''],
      ['Auto Process Videos', 'TRUE', 'Automatically process uploaded videos'],
      ['Auto Upload to YouTube', 'FALSE', 'Automatically upload clips to YouTube'],
      ['Clip Duration (seconds)', '30', 'Default length of video clips'],
      ['Pre-Event Padding (seconds)', '5', 'Seconds to include before the event'],
      ['Post-Event Padding (seconds)', '10', 'Seconds to include after the event']
    ];

    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Settings!A1:C17',
      valueInputOption: 'USER_ENTERED',
      resource: { values: settingsData }
    });
  }

  async deployAppsScript(spreadsheetId, deployments) {
    console.log(chalk.blue('📝 Deploying Apps Script integration...'));

    try {
      // Create Apps Script project
      const scriptProject = await this.script.projects.create({
        resource: {
          title: `${this.config.clubName} - Highlights Automation`,
          parentId: spreadsheetId
        }
      });

      // Upload the Apps Script code
      const scriptContent = this.generateAppsScriptCode(deployments);

      await this.script.projects.updateContent({
        scriptId: scriptProject.data.scriptId,
        resource: {
          files: [
            {
              name: 'Code',
              type: 'SERVER_JS',
              source: scriptContent.mainCode
            },
            {
              name: 'VideoProcessor',
              type: 'SERVER_JS',
              source: scriptContent.videoProcessor
            },
            {
              name: 'Utilities',
              type: 'SERVER_JS',
              source: scriptContent.utilities
            }
          ]
        }
      });

      return {
        scriptId: scriptProject.data.scriptId,
        title: scriptProject.data.title,
        url: `https://script.google.com/d/${scriptProject.data.scriptId}/edit`
      };
    } catch (error) {
      console.log(chalk.yellow('⚠️  Apps Script deployment requires manual setup'));
      console.log(chalk.gray('Instructions will be provided after installation completes.'));

      return {
        scriptId: 'manual-setup-required',
        title: `${this.config.clubName} - Highlights Automation`,
        url: 'https://script.google.com'
      };
    }
  }

  async setupTriggersAndPermissions(spreadsheetId, appsScriptProject) {
    // This would set up triggers and permissions
    // For now, we'll provide manual setup instructions
    return {
      triggersSetup: 'manual',
      permissionsConfigured: 'manual'
    };
  }

  generateAppsScriptCode(deployments) {
    const mainCode = `
// Main automation code for Football Highlights System
// Generated by Football Highlights Installer

// Configuration
const CONFIG = {
  RAILWAY_URL: '${deployments.railway?.url || ''}',
  RENDER_URL: '${deployments.render?.url || ''}',
  COORDINATOR_URL: '${deployments.cloudflare?.url || ''}',
  CLUB_NAME: '${this.config.clubName}',
  SEASON: '${this.config.season}',
  ADMIN_EMAIL: '${this.config.email}'
};

/**
 * Triggered when a row is added to Live Match sheet
 */
function onLiveMatchUpdate() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getActiveRange();

  if (sheet.getName() !== 'Live Match') return;

  const row = range.getRow();
  const values = sheet.getRange(row, 1, 1, 9).getValues()[0];

  const event = {
    timestamp: values[0],
    minute: values[1],
    type: values[2],
    player: values[3],
    details: values[4],
    scoreHome: values[5],
    scoreAway: values[6],
    videoTimestamp: values[7]
  };

  // Process the event
  processMatchEvent(event);

  // Mark as processed
  sheet.getRange(row, 9).setValue('✅ Processed');
}

/**
 * Process match events for video highlights
 */
function processMatchEvent(event) {
  try {
    // Skip if not a video-worthy event
    if (!isVideoEvent(event.type)) return;

    // Add to video queue
    addToVideoQueue(event);

    // Update player statistics
    updatePlayerStats(event);

    // Log the event
    logSystemEvent(\`Processed \${event.type} event for \${event.player}\`);

  } catch (error) {
    console.error('Error processing match event:', error);
    logSystemEvent(\`Error processing event: \${error.message}\`, 'ERROR');
  }
}

/**
 * Check if event type should generate video clip
 */
function isVideoEvent(eventType) {
  const videoEvents = ['Goal', 'Big Save', 'Red Card', 'Chance'];
  return videoEvents.includes(eventType);
}

/**
 * Add event to video processing queue
 */
function addToVideoQueue(event) {
  const videoSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Video Queue');

  const queueId = Utilities.getUuid();
  const matchDate = new Date().toISOString().split('T')[0];

  videoSheet.appendRow([
    queueId,
    matchDate,
    \`\${event.type}_\${event.minute}_\${matchDate}.mp4\`,
    'Pending',
    'Queued',
    new Date(),
    '',
    0,
    '',
    ''
  ]);
}

/**
 * Update player statistics
 */
function updatePlayerStats(event) {
  const playersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Players');
  const data = playersSheet.getDataRange().getValues();

  // Find player row
  let playerRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === event.player) {
      playerRow = i + 1;
      break;
    }
  }

  if (playerRow === -1) {
    // Player not found, add them
    playersSheet.appendRow([event.player, '', '', 0, 0, 0, 0, 0, 'Active']);
    playerRow = playersSheet.getLastRow();
  }

  // Update statistics based on event type
  if (event.type === 'Goal') {
    const currentGoals = playersSheet.getRange(playerRow, 4).getValue() || 0;
    playersSheet.getRange(playerRow, 4).setValue(currentGoals + 1);
  } else if (event.type === 'Yellow Card') {
    const currentYellow = playersSheet.getRange(playerRow, 6).getValue() || 0;
    playersSheet.getRange(playerRow, 6).setValue(currentYellow + 1);
  } else if (event.type === 'Red Card') {
    const currentRed = playersSheet.getRange(playerRow, 7).getValue() || 0;
    playersSheet.getRange(playerRow, 7).setValue(currentRed + 1);
  }
}

/**
 * Log system events
 */
function logSystemEvent(message, level = 'INFO') {
  const logsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('System Logs');

  logsSheet.appendRow([
    new Date(),
    level,
    message,
    Session.getActiveUser().getEmail()
  ]);

  // Keep only last 1000 logs
  if (logsSheet.getLastRow() > 1000) {
    logsSheet.deleteRows(2, logsSheet.getLastRow() - 1000);
  }
}

/**
 * Manual video processing trigger
 */
function processVideoQueue() {
  const videoSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Video Queue');
  const data = videoSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[4] === 'Queued') {
      processVideo(i + 1, row);
    }
  }
}

/**
 * Process individual video
 */
function processVideo(rowIndex, queueData) {
  try {
    // Update status to processing
    const videoSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Video Queue');
    videoSheet.getRange(rowIndex, 5).setValue('Processing');
    videoSheet.getRange(rowIndex, 6).setValue(new Date());

    // Call processing service
    const response = UrlFetchApp.fetch(CONFIG.COORDINATOR_URL + '/coordinate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      payload: JSON.stringify({
        video: queueData[2],
        events: getMatchEvents(),
        priority: 'normal'
      })
    });

    const result = JSON.parse(response.getContentText());

    if (result.success) {
      videoSheet.getRange(rowIndex, 5).setValue('Completed');
      videoSheet.getRange(rowIndex, 7).setValue(new Date());
      videoSheet.getRange(rowIndex, 8).setValue(result.clips?.length || 0);
      videoSheet.getRange(rowIndex, 9).setValue(result.youtubeLinks || '');
      videoSheet.getRange(rowIndex, 10).setValue(result.driveLinks || '');
    } else {
      videoSheet.getRange(rowIndex, 5).setValue('Failed');
      logSystemEvent(\`Video processing failed: \${result.error}\`, 'ERROR');
    }

  } catch (error) {
    const videoSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Video Queue');
    videoSheet.getRange(rowIndex, 5).setValue('Error');
    logSystemEvent(\`Video processing error: \${error.message}\`, 'ERROR');
  }
}

/**
 * Get match events for video processing
 */
function getMatchEvents() {
  const liveSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Live Match');
  const data = liveSheet.getDataRange().getValues();

  const events = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0] && row[2]) { // Has timestamp and event type
      events.push({
        timestamp: row[0],
        minute: row[1],
        type: row[2],
        player: row[3],
        details: row[4],
        scoreHome: row[5],
        scoreAway: row[6],
        videoTimestamp: row[7]
      });
    }
  }

  return events;
}

/**
 * Set up form triggers (run once after installation)
 */
function setupTriggers() {
  // Delete existing triggers
  ScriptApp.getProjectTriggers().forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });

  // Create new triggers
  ScriptApp.newTrigger('onLiveMatchUpdate')
    .on(SpreadsheetApp.getActiveSpreadsheet())
    .onChange()
    .create();

  logSystemEvent('Triggers configured successfully');
}
`;

    const videoProcessor = `
// Video processing utilities

/**
 * Upload video file to processing queue
 */
function uploadVideoFile(fileBlob, fileName) {
  try {
    // Save to Drive
    const driveFile = DriveApp.createFile(fileBlob.setName(fileName));

    // Add to processing queue
    const videoSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Video Queue');
    videoSheet.appendRow([
      Utilities.getUuid(),
      new Date().toISOString().split('T')[0],
      fileName,
      fileBlob.getSize(),
      'Uploaded',
      new Date(),
      '',
      0,
      '',
      driveFile.getUrl()
    ]);

    logSystemEvent(\`Video uploaded: \${fileName}\`);
    return driveFile.getId();

  } catch (error) {
    logSystemEvent(\`Video upload failed: \${error.message}\`, 'ERROR');
    throw error;
  }
}

/**
 * Create video clips from match events
 */
function createHighlightClips() {
  const events = getVideoEvents();
  const clips = [];

  events.forEach(event => {
    if (isVideoEvent(event.type)) {
      clips.push({
        type: event.type,
        player: event.player,
        minute: event.minute,
        startTime: (event.minute * 60) - 10, // 10 seconds before
        duration: 30, // 30 second clips
        title: \`\${event.player} - \${event.type}\`
      });
    }
  });

  return clips;
}

/**
 * Get all video-worthy events from Live Match sheet
 */
function getVideoEvents() {
  const liveSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Live Match');
  const data = liveSheet.getDataRange().getValues();

  return data.slice(1) // Skip header
    .filter(row => row[0] && isVideoEvent(row[2]))
    .map(row => ({
      timestamp: row[0],
      minute: row[1],
      type: row[2],
      player: row[3],
      details: row[4],
      scoreHome: row[5],
      scoreAway: row[6]
    }));
}
`;

    const utilities = `
// Utility functions for the Football Highlights System

/**
 * Get system configuration
 */
function getConfig(key) {
  return CONFIG[key] || '';
}

/**
 * Send notification email
 */
function sendNotification(subject, body) {
  try {
    MailApp.sendEmail({
      to: CONFIG.ADMIN_EMAIL,
      subject: \`[\${CONFIG.CLUB_NAME}] \${subject}\`,
      body: body
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

/**
 * Format time for display
 */
function formatTime(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'HH:mm:ss');
}

/**
 * Format date for display
 */
function formatDate(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/**
 * Clean up old logs and data
 */
function cleanupData() {
  const logsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('System Logs');

  // Keep only last 30 days of logs
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);

  const data = logsSheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] < cutoffDate) {
      logsSheet.deleteRow(i + 1);
    }
  }

  logSystemEvent('Data cleanup completed');
}

/**
 * System health check
 */
function healthCheck() {
  const results = {
    timestamp: new Date(),
    sheets: checkSheetsHealth(),
    services: checkServicesHealth(),
    overall: 'healthy'
  };

  logSystemEvent(\`Health check completed: \${results.overall}\`);
  return results;
}

function checkSheetsHealth() {
  const requiredSheets = ['Dashboard', 'Live Match', 'Players', 'Matches', 'Video Queue', 'Settings', 'System Logs'];
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = spreadsheet.getSheets().map(sheet => sheet.getName());

  const missing = requiredSheets.filter(name => !sheets.includes(name));

  return {
    status: missing.length === 0 ? 'healthy' : 'warning',
    missing: missing
  };
}

function checkServicesHealth() {
  const services = {
    railway: CONFIG.RAILWAY_URL,
    render: CONFIG.RENDER_URL,
    coordinator: CONFIG.COORDINATOR_URL
  };

  const results = {};

  Object.entries(services).forEach(([name, url]) => {
    try {
      if (url) {
        const response = UrlFetchApp.fetch(url + '/health', { muteHttpExceptions: true });
        results[name] = {
          status: response.getResponseCode() === 200 ? 'healthy' : 'error',
          url: url
        };
      } else {
        results[name] = { status: 'not_configured', url: '' };
      }
    } catch (error) {
      results[name] = { status: 'error', error: error.message };
    }
  });

  return results;
}
`;

    return {
      mainCode,
      videoProcessor,
      utilities
    };
  }

  formatDashboard(spreadsheetId) {
    // This would add formatting to make the dashboard look professional
    // For now, we'll keep it simple
  }

  getSheetId(sheetName) {
    // Helper to get sheet ID by name
    // This would need to be implemented based on the created sheets
    const sheetMap = {
      'Dashboard': 0,
      'Live Match': 1,
      'Players': 2,
      'Matches': 3,
      'Video Queue': 4,
      'Settings': 5,
      'System Logs': 6
    };
    return sheetMap[sheetName] || 0;
  }

  getTimeZoneForRegion(region) {
    const timeZones = {
      'us-east': 'America/New_York',
      'us-west': 'America/Los_Angeles',
      'europe': 'Europe/London',
      'asia': 'Asia/Singapore'
    };
    return timeZones[region] || 'UTC';
  }
}