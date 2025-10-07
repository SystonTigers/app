
/**
 * Comprehensive Web App - Full Admin Interface
 * Complete management system for football clubs via web interface
 * @version 6.2.0
 */

/**
 * Admin interface functions - routing now handled by main.gs
 * REMOVED: doGet function to prevent conflicts
 */

/**
 * Form submission handlers - doPost routing now handled by main.gs
 * REMOVED: doPost function to prevent conflicts
 */

/**
 * Create main admin dashboard with dynamic configuration
 */
function createMainDashboard() {
  // Use new dynamic config system instead of hardcoded HTML
  return renderHtml_('dashboard', {
    titlePrefix: 'Admin Dashboard',
    data: {
      // Any additional dashboard data goes here
    }
  });
}

/**
 * Legacy function - creates hardcoded dashboard (DEPRECATED)
 * This function is kept for backward compatibility
 */
function createMainDashboard_LEGACY() {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>🏈 Football Club - Admin Dashboard</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh; color: #333;
    }
    .dashboard {
      max-width: 1200px; margin: 0 auto; padding: 20px;
    }
    .header {
      text-align: center; margin-bottom: 40px;
      background: rgba(255,255,255,0.95); padding: 30px; border-radius: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    .cards {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px; margin-bottom: 30px;
    }
    .card {
      background: white; border-radius: 15px; padding: 25px;
      box-shadow: 0 5px 20px rgba(0,0,0,0.1); transition: transform 0.3s;
      cursor: pointer; text-decoration: none; color: inherit;
    }
    .card:hover { transform: translateY(-5px); box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
    .card-icon { font-size: 48px; margin-bottom: 15px; }
    .card-title { font-size: 20px; font-weight: bold; margin-bottom: 10px; }
    .card-desc { color: #666; font-size: 14px; }
    .status-bar {
      background: rgba(255,255,255,0.95); border-radius: 15px; padding: 20px;
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;
    }
    .status-item { text-align: center; }
    .status-value { font-size: 24px; font-weight: bold; color: #28a745; }
    .status-label { font-size: 12px; color: #666; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="dashboard">
    <div class="header">
      <h1>🏈 Football Club Admin</h1>
      <h2>Complete Admin Dashboard</h2>
      <p>Manage everything from one place - no technical skills required!</p>
    </div>

    <div class="cards">
      <a href="?players" class="card">
        <div class="card-icon">👥</div>
        <div class="card-title">Player Management</div>
        <div class="card-desc">Add players, set DOB, positions, manage squad</div>
      </a>

      <a href="?fixtures" class="card">
        <div class="card-icon">📅</div>
        <div class="card-title">Fixture Management</div>
        <div class="card-desc">Add matches, set dates, venues, competitions</div>
      </a>

      <a href="?live" class="card">
        <div class="card-icon">⚽</div>
        <div class="card-title">Enhanced Live Match</div>
        <div class="card-desc">Professional live console with automation</div>
      </a>

      <a href="?season" class="card">
        <div class="card-icon">🏆</div>
        <div class="card-title">Season Setup</div>
        <div class="card-desc">Configure season, leagues, competitions</div>
      </a>

      <a href="?historical" class="card">
        <div class="card-icon">📊</div>
        <div class="card-title">Historical Data</div>
        <div class="card-desc">Import past seasons, results, statistics</div>
      </a>

      <a href="?stats" class="card">
        <div class="card-icon">📈</div>
        <div class="card-title">Statistics Dashboard</div>
        <div class="card-desc">Performance analysis and reports</div>
      </a>

      <a href="?health" class="card">
        <div class="card-icon">🔧</div>
        <div class="card-title">System Health</div>
        <div class="card-desc">Check connections, test automation</div>
      </a>
    </div>

    <div class="status-bar">
      <div class="status-item">
        <div class="status-value" id="playerCount">-</div>
        <div class="status-label">Players</div>
      </div>
      <div class="status-item">
        <div class="status-value" id="fixtureCount">-</div>
        <div class="status-label">Fixtures</div>
      </div>
      <div class="status-item">
        <div class="status-value" id="resultCount">-</div>
        <div class="status-label">Results</div>
      </div>
      <div class="status-item">
        <div class="status-value">✅</div>
        <div class="status-label">System Status</div>
      </div>
    </div>
  </div>

  <script>
    // Load dashboard stats
    function loadStats() {
      // Load actual stats from Google Sheets
      google.script.run
        .withSuccessHandler(function(stats) {
          document.getElementById('playerCount').textContent = stats.playerCount || '0';
          document.getElementById('fixtureCount').textContent = stats.fixtureCount || '0';
          document.getElementById('resultCount').textContent = stats.resultCount || '0';
        })
        .withFailureHandler(function(error) {
          console.error('Failed to load stats:', error);
          // Fallback to default values
          document.getElementById('playerCount').textContent = '0';
          document.getElementById('fixtureCount').textContent = '0';
          document.getElementById('resultCount').textContent = '0';
        })
        .getDashboardStats();
    }

    loadStats();
    console.log('🏈 Football Club Admin Dashboard Ready!');
  </script>
</body>
</html>`;

  return HtmlService.createHtmlOutput(html)
    .setTitle('Football Club - Admin Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Create player management interface with dynamic configuration
 */
function createPlayerManagementInterface() {
  return renderHtml_('player-management-ui', {
    titlePrefix: 'Player Management'
  });
}

/**
 * Legacy player management (DEPRECATED)
 */
function createPlayerManagementInterface_LEGACY() {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>👥 Player Management - Football Club</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background: #f8f9fa; padding: 20px; min-height: 100vh;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header {
      background: white; padding: 30px; border-radius: 15px; margin-bottom: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center;
    }
    .content {
      display: grid; grid-template-columns: 1fr 2fr; gap: 30px;
    }
    .form-section, .list-section {
      background: white; padding: 25px; border-radius: 15px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block; margin-bottom: 5px; font-weight: 600; color: #333;
    }
    input, select, textarea {
      width: 100%; padding: 12px; border: 2px solid #e1e5e9;
      border-radius: 8px; font-size: 16px; transition: border-color 0.3s;
    }
    input:focus, select:focus, textarea:focus {
      outline: none; border-color: #007bff;
    }
    .btn {
      background: #28a745; color: white; padding: 12px 25px;
      border: none; border-radius: 8px; font-size: 16px; font-weight: 600;
      cursor: pointer; transition: background 0.3s; width: 100%;
    }
    .btn:hover { background: #218838; }
    .player-list {
      max-height: 500px; overflow-y: auto;
    }
    .player-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 15px; border-bottom: 1px solid #eee;
    }
    .player-info h4 { margin: 0; color: #333; }
    .player-info p { margin: 5px 0 0 0; color: #666; font-size: 14px; }
    .back-btn {
      background: #6c757d; margin-bottom: 20px; width: auto; display: inline-block;
      text-decoration: none; text-align: center;
    }
    @media (max-width: 768px) {
      .content { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="?" class="btn back-btn">← Back to Dashboard</a>
      <h1>👥 Player Management</h1>
      <p>Add and manage your squad - names, DOB, positions, everything!</p>
    </div>

    <div class="content">
      <div class="form-section">
        <h2>Add New Player</h2>
        <form id="playerForm">
          <div class="form-group">
            <label for="playerName">Full Name *</label>
            <input type="text" id="playerName" name="playerName" required
                   placeholder="e.g. John Smith">
          </div>

          <div class="form-group">
            <label for="playerDOB">Date of Birth *</label>
            <input type="date" id="playerDOB" name="playerDOB" required>
          </div>

          <div class="form-group">
            <label for="playerPosition">Position *</label>
            <select id="playerPosition" name="playerPosition" required>
              <option value="">Select Position</option>
              <option value="Goalkeeper">Goalkeeper</option>
              <option value="Defender">Defender</option>
              <option value="Midfielder">Midfielder</option>
              <option value="Forward">Forward</option>
              <option value="Utility">Utility</option>
            </select>
          </div>

          <div class="form-group">
            <label for="playerNumber">Squad Number</label>
            <input type="number" id="playerNumber" name="playerNumber" min="1" max="99"
                   placeholder="Optional">
          </div>

          <div class="form-group">
            <label for="playerEmail">Email</label>
            <input type="email" id="playerEmail" name="playerEmail"
                   placeholder="Optional - for communications">
          </div>

          <div class="form-group">
            <label for="playerPhone">Phone</label>
            <input type="tel" id="playerPhone" name="playerPhone"
                   placeholder="Optional - emergency contact">
          </div>

          <div class="form-group">
            <label for="playerNotes">Notes</label>
            <textarea id="playerNotes" name="playerNotes" rows="3"
                      placeholder="Any additional information..."></textarea>
          </div>

          <button type="submit" class="btn">➕ Add Player</button>
        </form>
      </div>

      <div class="list-section">
        <h2>Current Squad</h2>
        <div class="player-list" id="playerList">
          <div class="player-item">
            <div class="player-info">
              <h4>Loading players...</h4>
              <p>Please wait while we load your squad</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    document.getElementById('playerForm').addEventListener('submit', async function(e) {
      e.preventDefault();

      const formData = new FormData(e.target);
      formData.append('action', 'add_player');

      try {
        const response = await fetch(window.location.href.split('?')[0], {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (result.success) {
          alert('✅ Player added successfully!');
          e.target.reset();
          loadPlayers();
        } else {
          alert('❌ Error: ' + result.error);
        }
      } catch (error) {
        alert('❌ Error adding player: ' + error.message);
      }
    });

    function loadPlayers() {
      // Load actual players from Google Sheets
      google.script.run
        .withSuccessHandler(function(players) {
          const playerList = document.getElementById('playerList');

          if (players && players.length > 0) {
            playerList.innerHTML = players.map(player => \`
              <div class="player-item">
                <div class="player-info">
                  <h4>\${player.name}</h4>
                  <p>\${player.position} • Age \${player.age}\${player.number ? ' • #' + player.number : ''}</p>
                </div>
              </div>
            \`).join('');
          } else {
            playerList.innerHTML = \`
              <div class="player-item">
                <div class="player-info">
                  <h4>No players added yet</h4>
                  <p>Use the form to add your first player to the squad</p>
                </div>
              </div>
            \`;
          }
        })
        .withFailureHandler(function(error) {
          console.error('Failed to load players:', error);
          const playerList = document.getElementById('playerList');
          playerList.innerHTML = \`
            <div class="player-item">
              <div class="player-info">
                <h4>Error loading players</h4>
                <p>Please refresh the page to try again</p>
              </div>
            </div>
          \`;
        })
        .getPlayersList();
    }

    loadPlayers();
    console.log('👥 Player Management Interface Ready!');
  </script>
</body>
</html>`;

  return HtmlService.createHtmlOutput(html)
    .setTitle('Player Management - Football Club')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Handle adding a new player
 */
function handleAddPlayer(params) {
  try {
    // Get the spreadsheet
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);

    // Get or create Players sheet
    let playersSheet = spreadsheet.getSheetByName('Players');
    if (!playersSheet) {
      playersSheet = spreadsheet.insertSheet('Players');

      // Add headers
      playersSheet.getRange(1, 1, 1, 8).setValues([[
        'Name', 'Date of Birth', 'Position', 'Squad Number', 'Email', 'Phone', 'Notes', 'Added Date'
      ]]);

      // Format headers
      const headerRange = playersSheet.getRange(1, 1, 1, 8);
      headerRange.setBackground('#dc143c');
      headerRange.setFontColor('white');
      headerRange.setFontWeight('bold');
    }

    // Calculate age from DOB
    const dob = new Date(params.playerDOB);
    const today = new Date();
    const age = Math.floor((today - dob) / (365.25 * 24 * 60 * 60 * 1000));

    // Add new player
    const newRow = playersSheet.getLastRow() + 1;
    playersSheet.getRange(newRow, 1, 1, 8).setValues([[
      params.playerName || '',
      params.playerDOB || '',
      params.playerPosition || '',
      params.playerNumber || '',
      params.playerEmail || '',
      params.playerPhone || '',
      params.playerNotes || '',
      new Date()
    ]]);

    Logger.log('Player added successfully', { name: params.playerName, position: params.playerPosition });

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Player added successfully',
      playerName: params.playerName,
      age: age
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error adding player: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Create fixture management interface with dynamic configuration
 */
function createFixtureManagementInterface() {
  return renderHtml_('fixture-management', {
    titlePrefix: 'Fixture Management'
  });
}

/**
 * Legacy fixture management (DEPRECATED)
 */
function createFixtureManagementInterface_LEGACY() {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>📅 Fixture Management - Football Club</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background: #f8f9fa; padding: 20px; min-height: 100vh;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header {
      background: white; padding: 30px; border-radius: 15px; margin-bottom: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center;
    }
    .content {
      display: grid; grid-template-columns: 1fr 2fr; gap: 30px;
    }
    .form-section, .list-section {
      background: white; padding: 25px; border-radius: 15px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block; margin-bottom: 5px; font-weight: 600; color: #333;
    }
    input, select, textarea {
      width: 100%; padding: 12px; border: 2px solid #e1e5e9;
      border-radius: 8px; font-size: 16px; transition: border-color 0.3s;
    }
    input:focus, select:focus { outline: none; border-color: #007bff; }
    .btn {
      background: #007bff; color: white; padding: 12px 25px;
      border: none; border-radius: 8px; font-size: 16px; font-weight: 600;
      cursor: pointer; transition: background 0.3s; width: 100%;
    }
    .btn:hover { background: #0056b3; }
    .fixture-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 15px; border-bottom: 1px solid #eee;
    }
    .fixture-info h4 { margin: 0; color: #333; }
    .fixture-info p { margin: 5px 0 0 0; color: #666; font-size: 14px; }
    .back-btn {
      background: #6c757d; margin-bottom: 20px; width: auto; display: inline-block;
      text-decoration: none; text-align: center;
    }
    .fixture-status {
      padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: bold;
    }
    .upcoming { background: #e3f2fd; color: #1976d2; }
    .completed { background: #e8f5e8; color: #2e7d2e; }
    @media (max-width: 768px) { .content { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="?" class="btn back-btn">← Back to Dashboard</a>
      <h1>📅 Fixture Management</h1>
      <p>Add matches, set dates, venues - build your season!</p>
    </div>

    <div class="content">
      <div class="form-section">
        <h2>Add New Fixture</h2>
        <form id="fixtureForm">
          <div class="form-group">
            <label for="opposition">Opposition *</label>
            <input type="text" id="opposition" name="opposition" required
                   placeholder="e.g. Leicester City FC">
          </div>

          <div class="form-group">
            <label for="matchDate">Match Date *</label>
            <input type="date" id="matchDate" name="matchDate" required>
          </div>

          <div class="form-group">
            <label for="kickoffTime">Kick-off Time *</label>
            <input type="time" id="kickoffTime" name="kickoffTime" required>
          </div>

          <div class="form-group">
            <label for="venue">Venue *</label>
            <select id="venue" name="venue" required>
              <option value="">Select Venue</option>
              <option value="Home">Home</option>
              <option value="Away">Away</option>
              <option value="Neutral">Neutral</option>
            </select>
          </div>

          <div class="form-group">
            <label for="venueDetails">Venue Details</label>
            <input type="text" id="venueDetails" name="venueDetails"
                   placeholder="e.g. Club Sports Ground">
          </div>

          <div class="form-group">
            <label for="competition">Competition *</label>
            <select id="competition" name="competition" required>
              <option value="">Select Competition</option>
              <option value="League">League</option>
              <option value="Cup">Cup</option>
              <option value="Friendly">Friendly</option>
              <option value="Playoff">Playoff</option>
            </select>
          </div>

          <div class="form-group">
            <label for="importance">Match Importance</label>
            <select id="importance" name="importance">
              <option value="Normal">Normal</option>
              <option value="Important">Important</option>
              <option value="Derby">Derby</option>
              <option value="Cup Final">Cup Final</option>
            </select>
          </div>

          <div class="form-group">
            <label for="notes">Notes</label>
            <textarea id="notes" name="notes" rows="3"
                      placeholder="Any additional match information..."></textarea>
          </div>

          <button type="submit" class="btn">📅 Add Fixture</button>
        </form>
      </div>

      <div class="list-section">
        <h2>Upcoming Fixtures</h2>
        <div id="fixtureList">
          <div class="fixture-item">
            <div class="fixture-info">
              <h4>Loading fixtures...</h4>
              <p>Please wait while we load your fixtures</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    document.getElementById('fixtureForm').addEventListener('submit', async function(e) {
      e.preventDefault();

      const formData = new FormData(e.target);
      formData.append('action', 'add_fixture');

      try {
        const response = await fetch(window.location.href.split('?')[0], {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (result.success) {
          alert('✅ Fixture added successfully!');
          e.target.reset();
          loadFixtures();
        } else {
          alert('❌ Error: ' + result.error);
        }
      } catch (error) {
        alert('❌ Error adding fixture: ' + error.message);
      }
    });

    function loadFixtures() {
      // Load actual fixtures from Google Sheets
      google.script.run
        .withSuccessHandler(function(fixtures) {
          const fixtureList = document.getElementById('fixtureList');

          if (fixtures && fixtures.length > 0) {
            fixtureList.innerHTML = fixtures.map(fixture => \`
              <div class="fixture-item">
                <div class="fixture-info">
                  <h4>vs \${fixture.opposition}</h4>
                  <p>\${fixture.dateFormatted} • \${fixture.venue} • \${fixture.competition}</p>
                </div>
                <span class="fixture-status \${fixture.status.toLowerCase()}">\${fixture.status}</span>
              </div>
            \`).join('');
          } else {
            fixtureList.innerHTML = \`
              <div class="fixture-item">
                <div class="fixture-info">
                  <h4>No fixtures scheduled</h4>
                  <p>Use the form to add your first fixture</p>
                </div>
              </div>
            \`;
          }
        })
        .withFailureHandler(function(error) {
          console.error('Failed to load fixtures:', error);
          const fixtureList = document.getElementById('fixtureList');
          fixtureList.innerHTML = \`
            <div class="fixture-item">
              <div class="fixture-info">
                <h4>Error loading fixtures</h4>
                <p>Please refresh the page to try again</p>
              </div>
            </div>
          \`;
        })
        .getFixturesList();
    }

    // Set minimum date to today
    document.getElementById('matchDate').min = new Date().toISOString().split('T')[0];

    loadFixtures();
    console.log('📅 Fixture Management Interface Ready!');
  </script>
</body>
</html>`;

  return HtmlService.createHtmlOutput(html)
    .setTitle('Fixture Management - Football Club')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Handle adding a new fixture
 */
function handleAddFixture(params) {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);

    // Get or create Fixtures sheet
    let fixturesSheet = spreadsheet.getSheetByName('Fixtures');
    if (!fixturesSheet) {
      fixturesSheet = spreadsheet.insertSheet('Fixtures');

      // Add headers
      fixturesSheet.getRange(1, 1, 1, 9).setValues([[
        'Date', 'Opposition', 'Kick Off', 'Venue', 'Venue Details', 'Competition', 'Importance', 'Notes', 'Status'
      ]]);

      // Format headers
      const headerRange = fixturesSheet.getRange(1, 1, 1, 9);
      headerRange.setBackground('#007bff');
      headerRange.setFontColor('white');
      headerRange.setFontWeight('bold');
    }

    // Add new fixture
    const newRow = fixturesSheet.getLastRow() + 1;
    fixturesSheet.getRange(newRow, 1, 1, 9).setValues([[
      params.matchDate || '',
      params.opposition || '',
      params.kickoffTime || '',
      params.venue || '',
      params.venueDetails || '',
      params.competition || '',
      params.importance || 'Normal',
      params.notes || '',
      'Scheduled'
    ]]);

    Logger.log('Fixture added successfully', { opposition: params.opposition, date: params.matchDate });

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Fixture added successfully',
      opposition: params.opposition,
      date: params.matchDate
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error adding fixture: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Get dashboard statistics for UI with dynamic configuration
 * @returns {Object} Dashboard stats
 */
function getDashboardStats() {
  try {
    // Use config-aware sheet access
    const config = getDynamicConfig();
    const playersSheet = SheetUtils.getSheet('Players');
    const fixturesSheet = SheetUtils.getSheet('Fixtures');
    const resultsSheet = SheetUtils.getSheet('Results');

    let playerCount = 0;
    let fixtureCount = 0;
    let resultCount = 0;

    if (playersSheet) {
      const playerData = playersSheet.getDataRange().getValues();
      playerCount = Math.max(0, playerData.length - 1); // Subtract header row
    }

    if (fixturesSheet) {
      const fixtureData = fixturesSheet.getDataRange().getValues();
      fixtureCount = Math.max(0, fixtureData.length - 1);
    }

    if (resultsSheet) {
      const resultData = resultsSheet.getDataRange().getValues();
      resultCount = Math.max(0, resultData.length - 1);
    }

    return {
      playerCount: playerCount,
      fixtureCount: fixtureCount,
      resultCount: resultCount,
      lastUpdated: new Date().toISOString()
    };

  } catch (error) {
    Logger.log('Error getting dashboard stats: ' + error.toString());
    return {
      playerCount: 0,
      fixtureCount: 0,
      resultCount: 0,
      error: error.toString()
    };
  }
}

/**
 * Get players list for UI
 * @returns {Array} Array of player objects
 */
function getPlayersList() {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const playersSheet = spreadsheet.getSheetByName('Players');

    if (!playersSheet) {
      return [];
    }

    const data = playersSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return []; // No players (just headers or empty)
    }

    const headers = data[0];
    const players = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue; // Skip empty rows

      // Calculate age from DOB using UK date utilities
      let age = 'Unknown';
      if (row[1]) {
        age = calculateAge(row[1]);
      }

      players.push({
        name: row[0] || 'Unknown',
        dob: row[1] || '',
        position: row[2] || 'Unknown',
        number: row[3] || '',
        email: row[4] || '',
        phone: row[5] || '',
        notes: row[6] || '',
        age: age
      });
    }

    return players;

  } catch (error) {
    Logger.log('Error getting players list: ' + error.toString());
    return [];
  }
}

/**
 * Get fixtures list for UI
 * @returns {Array} Array of fixture objects
 */
function getFixturesList() {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const fixturesSheet = spreadsheet.getSheetByName('Fixtures');

    if (!fixturesSheet) {
      return [];
    }

    const data = fixturesSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return []; // No fixtures (just headers or empty)
    }

    const fixtures = [];
    const today = new Date();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0] || !row[1]) continue; // Skip rows without date or opposition

      const matchDate = new Date(row[0]);
      const isUpcoming = matchDate >= today;

      // Format date using UK utilities
      const dateFormatted = formatFixtureDate(matchDate);

      fixtures.push({
        date: row[0],
        opposition: row[1] || 'TBC',
        kickoff: row[2] || '',
        venue: row[3] || 'TBC',
        venueDetails: row[4] || '',
        competition: row[5] || 'League',
        importance: row[6] || 'Normal',
        notes: row[7] || '',
        status: row[8] || (isUpcoming ? 'Upcoming' : 'Completed'),
        dateFormatted: dateFormatted,
        isUpcoming: isUpcoming
      });
    }

    // Sort by date (upcoming first)
    fixtures.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA - dateB;
    });

    return fixtures;

  } catch (error) {
    Logger.log('Error getting fixtures list: ' + error.toString());
    return [];
  }
}

// ==================== DYNAMIC CONFIG TESTING ====================

/**
 * Test the dynamic configuration system
 * @returns {Object} Test results
 */
function testDynamicConfigSystem() {
  console.log('🧪 Testing Dynamic Configuration System...');

  try {
    // Test 1: Config loading
    const config = getDynamicConfig();
    console.log('✅ Config loaded:', config.TEAM_NAME);

    // Test 2: Template rendering
    const testHtml = renderHtml_('dashboard', {
      titlePrefix: 'Test Dashboard'
    });
    console.log('✅ Template rendering successful');

    // Test 3: Payload building
    const testPayload = buildConfiguredPayload({
      event_type: 'test',
      test_data: 'hello'
    });
    console.log('✅ Payload building successful');

    // Test 4: Config validation
    const validation = validateConfig();
    console.log('✅ Config validation:', validation.valid ? 'PASSED' : 'FAILED');

    return {
      success: true,
      message: 'Dynamic config system is working correctly',
      config: config
    };

  } catch (error) {
    console.error('❌ Dynamic config test failed:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Quick config setup for new customers
 * @param {Object} clubData - Club configuration data
 */
function quickConfigSetup(clubData = {}) {
  try {
    const defaults = {
      TEAM_NAME: clubData.teamName || 'Your Football Club',
      TEAM_SHORT: clubData.teamShort || 'YFC',
      LEAGUE_NAME: clubData.league || 'Your League',
      PRIMARY_COLOR: clubData.primaryColor || '#dc143c',
      SECONDARY_COLOR: clubData.secondaryColor || '#ffffff',
      BADGE_URL: clubData.badgeUrl || 'https://via.placeholder.com/100',
      TIMEZONE: 'Europe/London',
      AGE_GROUP: clubData.ageGroup || "Senior Men's",
      SEASON: '2024/25'
    };

    // Update each config value
    for (const [key, value] of Object.entries(defaults)) {
      updateConfig(key, value);
    }

    console.log('✅ Quick config setup complete');
    return { success: true, message: 'Configuration updated successfully' };

  } catch (error) {
    console.error('❌ Quick config setup failed:', error);
    return { success: false, error: error.toString() };
  }
}
