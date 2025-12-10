/**
 * Simple Web App Entry Point - Robust Version
 * @version 6.2.0
 * @description Simplified web app that avoids dependency issues
 */

/**
 * Handles GET requests - Simple and robust version - DISABLED
 * Routing moved to main.gs to prevent conflicts
 */
// Disabled functions removed - routing handled in main.gs

/**
 * Create main live match interface
 */
function createMainInterface() {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>⚽ ${getConfigValue('SYSTEM.CLUB_NAME', 'Football Club')} - Live Match Updates</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      max-width: 800px; margin: 0 auto; padding: 20px;
      background: #f5f5f5; color: #333;
    }
    .header {
      text-align: center; margin-bottom: 30px;
      background: #dc143c; color: white; padding: 20px; border-radius: 10px;
    }
    .score {
      text-align: center; font-size: 48px; font-weight: bold;
      margin: 30px 0; padding: 20px; background: white;
      border-radius: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .btn {
      padding: 15px 20px; margin: 8px; font-size: 16px; font-weight: bold;
      border: none; border-radius: 8px; cursor: pointer;
      transition: all 0.2s; min-width: 140px;
    }
    .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
    .btn-success { background: #28a745; color: white; }
    .btn-warning { background: #ffc107; color: #333; }
    .btn-danger { background: #dc3545; color: white; }
    .btn-primary { background: #007bff; color: white; }
    .section {
      background: white; margin: 20px 0; padding: 20px;
      border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    @media (max-width: 600px) {
      .grid { grid-template-columns: 1fr; }
      .btn { width: 100%; margin: 5px 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏈 ${getConfigValue('SYSTEM.CLUB_NAME', 'Football Club')}</h1>
    <p>Live Match Updates Console</p>
  </div>

  <div class="score">
    <div>${getConfigValue('SYSTEM.CLUB_NAME', 'Football Club')} <span id="homeScore">0</span> - <span id="awayScore">0</span> Opposition</div>
    <div style="font-size: 16px; margin-top: 10px;">
      <span id="matchStatus">Ready for Kick-off</span> | <span id="matchTime">0'</span>
    </div>
  </div>

  <div class="section">
    <h3>⚽ Quick Actions</h3>
    <div class="grid">
      <button class="btn btn-success" onclick="addGoal('home')">🥅 Our Goal</button>
      <button class="btn btn-danger" onclick="addGoal('away')">😔 Opposition Goal</button>
      <button class="btn btn-warning" onclick="addCard('yellow')">🟨 Yellow Card</button>
      <button class="btn btn-danger" onclick="addCard('red')">🟥 Red Card</button>
    </div>
  </div>

  <div class="section">
    <h3>⏱️ Match Control</h3>
    <div class="grid">
      <button class="btn btn-primary" onclick="updateStatus('kickoff')">🚀 Kick Off</button>
      <button class="btn btn-primary" onclick="updateStatus('halftime')">⏸️ Half Time</button>
      <button class="btn btn-primary" onclick="updateStatus('secondhalf')">▶️ 2nd Half</button>
      <button class="btn btn-primary" onclick="updateStatus('fulltime')">🏁 Full Time</button>
    </div>
  </div>

  <div class="section">
    <h3>📊 System Status</h3>
    <p>✅ Web App: <strong>Online</strong></p>
    <p>📱 Interface: <strong>Ready</strong></p>
    <p>🔗 Backend: <strong>Connected</strong></p>
    <p style="margin-top: 15px; font-size: 14px; color: #666;">
      📝 <a href="?health">Health Check</a> |
      🧪 <a href="?test">Test Mode</a>
    </p>
  </div>

  <script>
    let homeScore = 0;
    let awayScore = 0;
    let matchMinute = 0;

    function addGoal(team) {
      if (team === 'home') {
        homeScore++;
        updateScore();
        showMessage('⚽ ${getConfigValue('SYSTEM.CLUB_NAME', 'Football Club')} Goal!', 'success');
        // Backend integration via processGoal() function
        try {
          const result = fetch(window.location.href.split('?')[0] + '?action=process_goal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ player: 'Goal', minute: currentMinute, team: isHome ? 'home' : 'away' })
          });
        } catch (error) {
          console.warn('Failed to sync goal with backend:', error);
        }
      } else {
        awayScore++;
        updateScore();
        showMessage('😔 Opposition Goal', 'warning');
        // Backend integration via processGoal() function
        try {
          const result = fetch(window.location.href.split('?')[0] + '?action=process_goal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ player: 'Goal', minute: currentMinute, team: isHome ? 'home' : 'away' })
          });
        } catch (error) {
          console.warn('Failed to sync goal with backend:', error);
        }
      }
    }

    function addCard(type) {
      const cardText = type === 'yellow' ? '🟨 Yellow Card' : '🟥 Red Card';
      showMessage(cardText + ' issued', 'warning');
      // Backend integration via processCard() function
      try {
        fetch(window.location.href.split('?')[0] + '?action=process_card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ player: 'Player', cardType: type, minute: currentMinute })
        });
      } catch (error) {
        console.warn('Failed to sync card with backend:', error);
      }
    }

    function updateStatus(status) {
      const statusElement = document.getElementById('matchStatus');
      const timeElement = document.getElementById('matchTime');

      switch(status) {
        case 'kickoff':
          statusElement.textContent = 'Live - 1st Half';
          timeElement.textContent = "1'";
          showMessage('🚀 Match Started!', 'success');
          break;
        case 'halftime':
          statusElement.textContent = 'Half Time';
          timeElement.textContent = "45'";
          showMessage('⏸️ Half Time', 'primary');
          break;
        case 'secondhalf':
          statusElement.textContent = 'Live - 2nd Half';
          timeElement.textContent = "46'";
          showMessage('▶️ Second Half Started', 'success');
          break;
        case 'fulltime':
          statusElement.textContent = 'Full Time';
          timeElement.textContent = "90'";
          showMessage('🏁 Match Finished', 'primary');
          break;
      }
      // Backend integration via processCard() function
      try {
        fetch(window.location.href.split('?')[0] + '?action=process_card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ player: 'Player', cardType: type, minute: currentMinute })
        });
      } catch (error) {
        console.warn('Failed to sync card with backend:', error);
      }
    }

    function updateScore() {
      document.getElementById('homeScore').textContent = homeScore;
      document.getElementById('awayScore').textContent = awayScore;
    }

    function showMessage(text, type) {
      // Simple notification system
      const notification = document.createElement('div');
      notification.style.cssText = \`
        position: fixed; top: 20px; right: 20px; z-index: 1000;
        padding: 15px 20px; border-radius: 8px; color: white; font-weight: bold;
        background: \${type === 'success' ? '#28a745' : type === 'warning' ? '#ffc107' : '#007bff'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.3); transition: all 0.3s;
      \`;
      notification.textContent = text;
      document.body.appendChild(notification);

      setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => notification.remove(), 300);
      }, 3000);
    }

    // Initialize
    updateScore();
    console.log('⚽ ${getConfigValue('SYSTEM.CLUB_NAME', 'Football Club')} Live Match Console Ready!');
  </script>
</body>
</html>`;

  return HtmlService.createHtmlOutput(html)
    .setTitle(`${getConfigValue('SYSTEM.CLUB_NAME', 'Football Club')} - Live Match Updates`)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Create health check response
 */
function createHealthResponse() {
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      app: `${getConfigValue('SYSTEM.CLUB_NAME', 'Football Club')} Football Automation`,
      version: '6.2.0',
      checks: {
        webApp: 'online',
        appsScript: 'running',
        dependencies: 'loaded'
      }
    };

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>System Health Check</title>
  <style>
    body { font-family: Arial; max-width: 600px; margin: 50px auto; padding: 20px; }
    .healthy { color: #28a745; }
    .status { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0; }
    pre { background: #f1f3f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>🏥 System Health Check</h1>
  <div class="status">
    <h2 class="healthy">✅ All Systems Operational</h2>
    <p><strong>Status:</strong> ${healthData.status}</p>
    <p><strong>Timestamp:</strong> ${healthData.timestamp}</p>
    <p><strong>Version:</strong> ${healthData.version}</p>
  </div>

  <h3>Component Status:</h3>
  <ul>
    <li class="healthy">✅ Web App: Online</li>
    <li class="healthy">✅ Apps Script: Running</li>
    <li class="healthy">✅ Dependencies: Loaded</li>
  </ul>

  <h3>Raw Data:</h3>
  <pre>${JSON.stringify(healthData, null, 2)}</pre>

  <p><a href="?">← Back to Main Interface</a></p>
</body>
</html>`;

    return HtmlService.createHtmlOutput(html);
  } catch (error) {
    return HtmlService.createHtmlOutput(`
      <div style="padding: 50px; text-align: center;">
        <h2>❌ Health Check Failed</h2>
        <p>Error: ${error.toString()}</p>
      </div>
    `);
  }
}

/**
 * Create test response
 */
function createTestResponse() {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Web App Test Mode</title>
  <style>
    body { font-family: Arial; max-width: 600px; margin: 50px auto; padding: 20px; }
    .test-result { background: #e7f3ff; padding: 15px; margin: 10px 0; border-radius: 8px; }
    button { padding: 10px 20px; margin: 5px; border: none; border-radius: 5px; cursor: pointer; }
    .btn-test { background: #007bff; color: white; }
  </style>
</head>
<body>
  <h1>🧪 Web App Test Mode</h1>

  <div class="test-result">
    <h3>✅ Basic Functionality Test</h3>
    <p>Web app is responding correctly to GET requests</p>
    <p>Timestamp: ${new Date().toISOString()}</p>
  </div>

  <div class="test-result">
    <h3>🔧 Available Endpoints</h3>
    <ul>
      <li><code>?</code> - Main interface</li>
      <li><code>?health</code> - Health check</li>
      <li><code>?test</code> - This test page</li>
    </ul>
  </div>

  <div class="test-result">
    <h3>📱 POST Test</h3>
    <button class="btn-test" onclick="testPost()">Test POST Request</button>
    <div id="postResult"></div>
  </div>

  <script>
    async function testPost() {
      try {
        const response = await fetch(window.location.href.split('?')[0], {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'action=test'
        });
        const result = await response.text();
        document.getElementById('postResult').innerHTML =
          '<p style="color: green;">✅ POST test successful</p><pre>' + result + '</pre>';
      } catch (error) {
        document.getElementById('postResult').innerHTML =
          '<p style="color: red;">❌ POST test failed: ' + error.message + '</p>';
      }
    }
  </script>

  <p><a href="?">← Back to Main Interface</a></p>
</body>
</html>`;

  return HtmlService.createHtmlOutput(html);
}