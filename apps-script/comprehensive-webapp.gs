/**
 * Comprehensive Web App - Full Admin Interface
 * Complete management system for the configured club via web interface
 * @version 6.2.0
 */

// Disabled functions removed - routing handled in main.gs

/**
 * Helper to load club context values from dynamic config / static config fallback
 * @returns {{clubName: string, clubShortName: string, leagueName: string, motto: string, primaryColor: string, secondaryColor: string, badgeUrl: string, ageGroup: string}}
 */
function getClubContext_() {
  const dynamicConfig = (typeof getDynamicConfig === 'function') ? getDynamicConfig() : {};
  const fallback = (path, defaultValue = '') => (typeof getConfigValue === 'function')
    ? getConfigValue(path, defaultValue)
    : defaultValue;

  const clubName = dynamicConfig.TEAM_NAME || fallback('SYSTEM.CLUB_NAME', 'Your Football Club');
  const clubShortName = dynamicConfig.TEAM_SHORT || fallback('SYSTEM.CLUB_SHORT_NAME', clubName);
  const leagueName = dynamicConfig.LEAGUE_NAME || fallback('SYSTEM.LEAGUE', '');
  const motto = dynamicConfig.MOTTO || fallback('BRANDING.TAGLINE', '');
  const primaryColor = dynamicConfig.PRIMARY_COLOR || fallback('BRANDING.PRIMARY_COLOR', '#667eea');
  const secondaryColor = dynamicConfig.SECONDARY_COLOR || fallback('BRANDING.SECONDARY_COLOR', '#764ba2');
  const badgeUrl = dynamicConfig.BADGE_URL || fallback('BRANDING.BADGE_URL', '');
  const ageGroup = dynamicConfig.AGE_GROUP || fallback('SYSTEM.AGE_GROUP', '');

  return {
    clubName,
    clubShortName,
    leagueName,
    motto,
    primaryColor,
    secondaryColor,
    badgeUrl,
    ageGroup
  };
}

/**
 * Create main admin dashboard
 */
function createMainDashboard() {
  const club = getClubContext_();
  const subtitleParts = [club.leagueName, club.ageGroup].filter(Boolean);
  const subtitle = subtitleParts.length ? subtitleParts.join(' • ') : 'Complete Admin Dashboard';
  const mottoLine = club.motto ? `<p>${club.motto}</p>` : '';
  const badgeImage = club.badgeUrl
    ? `<img src="${club.badgeUrl}" alt="${club.clubName} badge" class="club-badge" loading="lazy" />`
    : '';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>🏈 ${club.clubName} - Admin Dashboard</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background: linear-gradient(135deg, ${club.primaryColor} 0%, ${club.secondaryColor} 100%);
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
    .club-badge {
      width: 120px;
      height: 120px;
      object-fit: contain;
      margin-bottom: 15px;
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
      ${badgeImage}
      <h1>🏈 ${club.clubName}</h1>
      <h2>${subtitle}</h2>
      ${mottoLine || '<p>Manage everything from one place - no technical skills required!</p>'}
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
        <div class="card-desc">Professional live match console with automation</div>
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
    async function loadStats() {
      try {
        // Fetch actual stats from backend
        const response = await fetch(window.location.href.split('?')[0] + '?action=dashboard_stats', {
          method: 'GET'
        });

        if (response.ok) {
          const stats = await response.json();
          if (stats.success && stats.data) {
            document.getElementById('playerCount').textContent = stats.data.players || '0';
            document.getElementById('fixtureCount').textContent = stats.data.fixtures || '0';
            document.getElementById('resultCount').textContent = stats.data.results || '0';
            return;
          }
        }

        // Fallback to placeholder values if API fails
        document.getElementById('playerCount').textContent = '-';
        document.getElementById('fixtureCount').textContent = '-';
        document.getElementById('resultCount').textContent = '-';

      } catch (error) {
        console.warn('Failed to load dashboard stats:', error);
        // Show placeholder values on error
        document.getElementById('playerCount').textContent = '-';
        document.getElementById('fixtureCount').textContent = '-';
        document.getElementById('resultCount').textContent = '-';
      }
    }

    loadStats();
    console.log('🏈 ${club.clubName} Admin Dashboard Ready!');
  </script>
</body>
</html>`;

  return HtmlService.createHtmlOutput(html)
    .setTitle(club.clubName + ' - Admin Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Create player management interface
 */
function createPlayerManagementInterface() {
  const club = getClubContext_();
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>👥 Player Management - ${club.clubName}</title>
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

    async function loadPlayers() {
      const playerList = document.getElementById('playerList');

      try {
        // Fetch player data from backend
        const response = await fetch(window.location.href.split('?')[0] + '?action=get_players', {
          method: 'GET'
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data && result.data.length > 0) {
            // Display actual players
            playerList.innerHTML = result.data.map(player => \`
              <div class="player-item">
                <div class="player-info">
                  <h4>\${player.name || 'Unknown Player'}</h4>
                  <p>\${player.position || 'Unknown'} • Age \${player.age || '?'} • #\${player.number || 'N/A'}</p>
                </div>
              </div>
            \`).join('');
            return;
          }
        }

        // No players found - show empty state
        playerList.innerHTML = \`
          <div class="player-item">
            <div class="player-info">
              <h4>No players found</h4>
              <p>Use the form to add your first player to the squad</p>
            </div>
          </div>
        \`;

      } catch (error) {
        console.warn('Failed to load players:', error);
        // Show error state
        playerList.innerHTML = \`
          <div class="player-item">
            <div class="player-info">
              <h4>Error loading players</h4>
              <p>Please refresh the page or try again later</p>
            </div>
          </div>
        \`;
      }
    }

    loadPlayers();
    console.log('👥 ${club.clubName} Player Management Interface Ready!');
  </script>
</body>
</html>`;

  return HtmlService.createHtmlOutput(html)
    .setTitle('Player Management - ' + club.clubName)
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
 * Create fixture management interface
 */
function createFixtureManagementInterface() {
  const club = getClubContext_();
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>📅 Fixture Management - ${club.clubName}</title>
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
                   placeholder="e.g. ${club.clubName} Stadium">
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

    async function loadFixtures() {
      const fixtureList = document.getElementById('fixtureList');

      try {
        // Fetch fixture data from backend
        const response = await fetch(window.location.href.split('?')[0] + '?action=get_fixtures', {
          method: 'GET'
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data && result.data.length > 0) {
            // Display actual fixtures
            fixtureList.innerHTML = result.data.map(fixture => \`
              <div class="fixture-item">
                <div class="fixture-info">
                  <h4>vs \${fixture.opponent || 'Unknown Opponent'}</h4>
                  <p>\${fixture.date || 'TBD'} • \${fixture.venue || 'TBD'} • \${fixture.competition || 'League'}</p>
                </div>
                <span class="fixture-status \${fixture.status === 'completed' ? 'completed' : 'upcoming'}">\${fixture.status === 'completed' ? 'Completed' : 'Upcoming'}</span>
              </div>
            \`).join('');
            return;
          }
        }

        // No fixtures found - show empty state
        fixtureList.innerHTML = \`
          <div class="fixture-item">
            <div class="fixture-info">
              <h4>No fixtures found</h4>
              <p>Use the form to add your first match to the season</p>
            </div>
          </div>
        \`;

      } catch (error) {
        console.warn('Failed to load fixtures:', error);
        // Show error state
        fixtureList.innerHTML = \`
          <div class="fixture-item">
            <div class="fixture-info">
              <h4>Error loading fixtures</h4>
              <p>Please refresh the page or try again later</p>
            </div>
          </div>
        \`;
      }
    }

    // Set minimum date to today
    document.getElementById('matchDate').min = new Date().toISOString().split('T')[0];

    loadFixtures();
    console.log('📅 ${club.clubName} Fixture Management Interface Ready!');
  </script>
</body>
</html>`;

  return HtmlService.createHtmlOutput(html)
    .setTitle('Fixture Management - ' + club.clubName)
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
 * Create Season Setup interface
 */
function createSeasonSetupInterface() {
  const club = getClubContext_();
  const defaultHashtags = club.clubShortName
    ? '#'+club.clubShortName.replace(/\s+/g, '') + ' #FootballClub #LocalFootball'
    : '#FootballClub #LocalFootball';
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>🏆 Season Setup - ${club.clubName}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      max-width: 1200px; margin: 0 auto; padding: 20px;
      background: #f8f9fa; color: #333;
    }
    .header {
      text-align: center; margin-bottom: 30px;
      background: #28a745; color: white; padding: 25px; border-radius: 15px;
    }
    .section {
      background: white; margin: 20px 0; padding: 25px;
      border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block; margin-bottom: 8px; font-weight: bold; color: #495057;
    }
    input, select, textarea {
      width: 100%; padding: 12px; border: 2px solid #dee2e6;
      border-radius: 8px; font-size: 16px; transition: border-color 0.2s;
    }
    input:focus, select:focus, textarea:focus {
      outline: none; border-color: #28a745;
    }
    .btn {
      padding: 12px 25px; margin: 8px; font-size: 16px; font-weight: bold;
      border: none; border-radius: 8px; cursor: pointer;
      transition: all 0.2s; text-decoration: none; display: inline-block;
    }
    .btn:hover { transform: translateY(-2px); }
    .btn-primary { background: #007bff; color: white; }
    .btn-success { background: #28a745; color: white; }
    .btn-secondary { background: #6c757d; color: white; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .status-card {
      padding: 20px; border-radius: 8px; text-align: center;
      border-left: 4px solid #28a745;
    }
    .setup-progress {
      background: #e9ecef; height: 8px; border-radius: 4px; margin: 20px 0;
    }
    .progress-bar {
      background: #28a745; height: 100%; border-radius: 4px; width: 60%;
      transition: width 0.3s;
    }
    @media (max-width: 768px) {
      .grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏆 Season Setup</h1>
    <p>Configure your season settings, league information, and team details</p>
    <div class="setup-progress">
      <div class="progress-bar"></div>
    </div>
    <p><small>Setup Progress: 60% Complete</small></p>
  </div>

  <div class="section">
    <h2>⚽ Basic Season Information</h2>
    <form id="seasonForm">
      <div class="grid">
        <div class="form-group">
          <label for="seasonName">Season Name</label>
          <input type="text" id="seasonName" name="seasonName" value="2024/25" placeholder="e.g., 2024/25">
        </div>
        <div class="form-group">
          <label for="ageGroup">Age Group</label>
          <select id="ageGroup" name="ageGroup">
            <option value="Senior">Senior Team</option>
            <option value="U18">Under 18s</option>
            <option value="U16">Under 16s</option>
            <option value="U14">Under 14s</option>
            <option value="Veterans">Veterans</option>
          </select>
        </div>
      </div>

      <div class="grid">
        <div class="form-group">
          <label for="league">League/Competition</label>
          <input type="text" id="league" name="league" placeholder="e.g., Leicester & District League Division 2">
        </div>
        <div class="form-group">
          <label for="division">Division</label>
          <input type="text" id="division" name="division" placeholder="e.g., Division 2">
        </div>
      </div>

      <div class="form-group">
        <label for="homeVenue">Home Venue</label>
        <input type="text" id="homeVenue" name="homeVenue" placeholder="e.g., ${club.clubName} Ground">
      </div>

      <div class="form-group">
        <label for="seasonObjectives">Season Objectives</label>
        <textarea id="seasonObjectives" name="seasonObjectives" rows="3" placeholder="e.g., Promotion to Division 1, Good cup run, Develop youth players"></textarea>
      </div>

      <button type="submit" class="btn btn-success">💾 Save Season Settings</button>
    </form>
  </div>

  <div class="section">
    <h2>📊 League Configuration</h2>
    <div class="grid">
      <div class="form-group">
        <label for="pointsWin">Points for Win</label>
        <input type="number" id="pointsWin" name="pointsWin" value="3" min="1" max="10">
      </div>
      <div class="form-group">
        <label for="pointsDraw">Points for Draw</label>
        <input type="number" id="pointsDraw" name="pointsDraw" value="1" min="0" max="5">
      </div>
    </div>

    <div class="grid">
      <div class="form-group">
        <label for="matchDuration">Match Duration (minutes)</label>
        <input type="number" id="matchDuration" name="matchDuration" value="90" min="60" max="120">
      </div>
      <div class="form-group">
        <label for="maxSubs">Maximum Substitutions</label>
        <input type="number" id="maxSubs" name="maxSubs" value="5" min="3" max="7">
      </div>
    </div>
  </div>

  <div class="section">
    <h2>🎨 Branding & Social Media</h2>
    <div class="grid">
      <div class="form-group">
        <label for="primaryColor">Primary Team Color</label>
        <input type="color" id="primaryColor" name="primaryColor" value="#dc143c">
      </div>
      <div class="form-group">
        <label for="secondaryColor">Secondary Color</label>
        <input type="color" id="secondaryColor" name="secondaryColor" value="#ffffff">
      </div>
    </div>

    <div class="form-group">
      <label for="clubBadge">Club Badge URL</label>
      <input type="url" id="clubBadge" name="clubBadge" placeholder="https://example.com/badge.png">
    </div>

    <div class="form-group">
      <label for="socialHashtags">Social Media Hashtags</label>
      <input type="text" id="socialHashtags" name="socialHashtags" placeholder="${defaultHashtags}">
    </div>
  </div>

  <div class="section">
    <h2>✅ Setup Status</h2>
    <div class="grid">
      <div class="status-card">
        <h4>✅ Players</h4>
        <p>15 players configured</p>
      </div>
      <div class="status-card">
        <h4>✅ Fixtures</h4>
        <p>Ready for season</p>
      </div>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="?" class="btn btn-secondary">← Back to Dashboard</a>
      <button class="btn btn-primary" onclick="completeSetup()">🚀 Complete Season Setup</button>
    </div>
  </div>

  <script>
    document.getElementById('seasonForm').addEventListener('submit', function(e) {
      e.preventDefault();

      const formData = new FormData(this);
      const seasonData = {};

      for (let [key, value] of formData.entries()) {
        seasonData[key] = value;
      }

      // Submit to backend
      fetch(window.location.href, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'season_setup',
          data: JSON.stringify(seasonData)
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert('✅ Season settings saved successfully!');
          updateProgress();
        } else {
          alert('❌ Error: ' + data.error);
        }
      })
      .catch(error => {
        alert('❌ Error saving settings: ' + error.message);
      });
    });

    function updateProgress() {
      const progressBar = document.querySelector('.progress-bar');
      progressBar.style.width = '80%';
    }

    function completeSetup() {
      if (confirm('Complete season setup? This will finalize your configuration.')) {
        alert('🎉 Season setup completed! Your automation system is ready.');
        window.location.href = '?';
      }
    }

    console.log('🏆 ${club.clubName} Season Setup Interface Ready!');
  </script>
</body>
</html>`;

  return HtmlService.createHtmlOutput(html)
    .setTitle('Season Setup - ' + club.clubName)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Create Historical Data Entry interface
 */
function createHistoricalDataInterface() {
  const club = getClubContext_();
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>📊 Historical Data Import - ${club.clubName}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      max-width: 1200px; margin: 0 auto; padding: 20px;
      background: #f8f9fa; color: #333;
    }
    .header {
      text-align: center; margin-bottom: 30px;
      background: #6610f2; color: white; padding: 25px; border-radius: 15px;
    }
    .section {
      background: white; margin: 20px 0; padding: 25px;
      border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block; margin-bottom: 8px; font-weight: bold; color: #495057;
    }
    input, select, textarea {
      width: 100%; padding: 12px; border: 2px solid #dee2e6;
      border-radius: 8px; font-size: 16px; transition: border-color 0.2s;
    }
    input:focus, select:focus, textarea:focus {
      outline: none; border-color: #6610f2;
    }
    .btn {
      padding: 12px 25px; margin: 8px; font-size: 16px; font-weight: bold;
      border: none; border-radius: 8px; cursor: pointer;
      transition: all 0.2s; text-decoration: none; display: inline-block;
    }
    .btn:hover { transform: translateY(-2px); }
    .btn-primary { background: #007bff; color: white; }
    .btn-success { background: #28a745; color: white; }
    .btn-warning { background: #ffc107; color: #333; }
    .btn-secondary { background: #6c757d; color: white; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .file-drop {
      border: 2px dashed #6610f2; padding: 40px; text-align: center;
      border-radius: 8px; background: #f8f9ff; margin: 20px 0;
      cursor: pointer; transition: all 0.2s;
    }
    .file-drop:hover {
      border-color: #5a0fc8; background: #f0f0ff;
    }
    @media (max-width: 768px) {
      .grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Historical Data Import</h1>
    <p>Import previous season data, match results, and player statistics</p>
  </div>

  <div class="section">
    <h2>📤 Bulk Data Import</h2>
    <p>Upload CSV files with your historical match data, player statistics, and season results.</p>

    <div class="file-drop" onclick="document.getElementById('csvFile').click()">
      <h3>📁 Drop CSV File Here</h3>
      <p>Or click to browse and select your data file</p>
      <p><small>Supported: CSV files up to 10MB</small></p>
    </div>

    <input type="file" id="csvFile" accept=".csv" style="display: none;">

    <button class="btn btn-success" onclick="processImport()">📊 Process Import</button>
    <button class="btn btn-warning" onclick="validateData()">✅ Validate Data</button>
  </div>

  <div class="section">
    <h2>⚽ Manual Match Entry</h2>
    <form id="manualMatchForm">
      <div class="grid">
        <div class="form-group">
          <label for="matchDate">Match Date</label>
          <input type="date" id="matchDate" name="matchDate" required>
        </div>
        <div class="form-group">
          <label for="opposition">Opposition</label>
          <input type="text" id="opposition" name="opposition" placeholder="e.g., Example FC" required>
        </div>
      </div>

      <div class="grid">
        <div class="form-group">
          <label for="homeScore">${club.clubName} Score</label>
          <input type="number" id="homeScore" name="homeScore" min="0" max="20" required>
        </div>
        <div class="form-group">
          <label for="awayScore">Opposition Score</label>
          <input type="number" id="awayScore" name="awayScore" min="0" max="20" required>
        </div>
      </div>

      <button type="submit" class="btn btn-primary">💾 Add Historical Match</button>
    </form>
  </div>

  <div style="text-align: center; margin-top: 30px;">
    <a href="?" class="btn btn-secondary">← Back to Dashboard</a>
  </div>

  <script>
    document.getElementById('manualMatchForm').addEventListener('submit', function(e) {
      e.preventDefault();

      const formData = new FormData(this);
      const matchData = {};

      for (let [key, value] of formData.entries()) {
        matchData[key] = value;
      }

      fetch(window.location.href, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'add_historical_match',
          data: JSON.stringify(matchData)
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert('✅ Historical match added successfully!');
          this.reset();
        } else {
          alert('❌ Error: ' + data.error);
        }
      })
      .catch(error => {
        alert('❌ Error adding match: ' + error.message);
      });
    });

    function getHistoricalCsvFileId() {
      const input = prompt('Enter the Google Drive file ID for the historical CSV (copy from Drive share link)');
      return input ? input.trim() : '';
    }

    function notifyUploadLimitation() {
      const fileField = document.getElementById('csvFile');
      if (fileField && fileField.files && fileField.files.length) {
        alert('ℹ️ Please upload your CSV to Google Drive and provide the file ID. Direct browser uploads are not supported yet.');
        fileField.value = '';
      }
    }

    function processImport() {
      notifyUploadLimitation();
      const fileId = getHistoricalCsvFileId();
      if (!fileId) {
        alert('❌ No file ID provided.');
        return;
      }

      google.script.run
        .withSuccessHandler(result => {
          if (result && result.success) {
            const total = (result.results.inserted || 0) + (result.results.updated || 0);
            const message = [
              `✅ Imported ${total} matches (${result.results.inserted || 0} new, ${result.results.updated || 0} updated, ${result.results.skipped || 0} unchanged).`,
              `Player events added: ${result.events.inserted || 0}.`,
              result.duplicatesInFile ? `Duplicates in file skipped: ${result.duplicatesInFile}.` : ''
            ].filter(Boolean).join('\n');
            alert(message);
          } else {
            alert('❌ Import failed: ' + (result && result.error ? result.error : 'Unknown error'));
          }
        })
        .withFailureHandler(error => {
          alert('❌ Import error: ' + (error && error.message ? error.message : error));
        })
        .importHistoricalCSV(fileId);
    }

    function validateData() {
      notifyUploadLimitation();
      const fileId = getHistoricalCsvFileId();
      if (!fileId) {
        alert('❌ No file ID provided.');
        return;
      }

      google.script.run
        .withSuccessHandler(result => {
          if (result && result.success) {
            const readyRows = result.rowsInFile || 0;
            const duplicateRows = result.duplicatesInFile || 0;
            alert(`✅ CSV looks good. ${readyRows} rows detected (duplicates skipped during import: ${duplicateRows}).`);
          } else {
            alert('❌ Validation failed: ' + (result && result.error ? result.error : 'Unknown error'));
          }
        })
        .withFailureHandler(error => {
          alert('❌ Validation error: ' + (error && error.message ? error.message : error));
        })
        .importHistoricalCSV({ fileId: fileId, dryRun: true });
    }

    document.getElementById('matchDate').max = new Date().toISOString().split('T')[0];
    console.log('📊 ${club.clubName} Historical Data Interface Ready!');
  </script>
</body>
</html>`;

  return HtmlService.createHtmlOutput(html)
    .setTitle('Historical Data Import - ' + club.clubName)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}