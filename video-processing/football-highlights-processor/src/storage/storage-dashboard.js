import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createStorageDashboard(storageCoordinator, logger) {
  const router = express.Router();

  // Serve dashboard HTML
  router.get('/', (req, res) => {
    res.send(generateDashboardHTML());
  });

  // Dashboard API endpoints
  router.get('/api/overview', async (req, res) => {
    try {
      const status = await storageCoordinator.getStorageStatus();
      res.json(status);
    } catch (error) {
      logger.error('Dashboard overview failed', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/api/analytics/:timeframe?', async (req, res) => {
    try {
      const timeframe = req.params.timeframe || '24h';
      const report = await storageCoordinator.generateStorageReport(timeframe);
      res.json(report);
    } catch (error) {
      logger.error('Dashboard analytics failed', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/api/alerts', async (req, res) => {
    try {
      const alerts = storageCoordinator.getActiveAlerts();
      res.json(alerts);
    } catch (error) {
      logger.error('Dashboard alerts failed', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/api/alerts/:alertId/resolve', async (req, res) => {
    try {
      const { alertId } = req.params;
      const resolved = await storageCoordinator.resolveAlert(alertId);
      res.json({ success: resolved });
    } catch (error) {
      logger.error('Dashboard alert resolution failed', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/api/cleanup', async (req, res) => {
    try {
      const { olderThanDays = 30, dryRun = false } = req.body;

      const result = dryRun
        ? await storageCoordinator.previewCleanup(olderThanDays)
        : await storageCoordinator.runManualCleanup(olderThanDays);

      res.json(result);
    } catch (error) {
      logger.error('Dashboard cleanup failed', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

function generateDashboardHTML() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Storage Management Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
            color: #334155;
            line-height: 1.6;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }

        .header h1 {
            color: #1e293b;
            font-size: 24px;
            margin-bottom: 8px;
        }

        .header p {
            color: #64748b;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }

        .card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .card h2 {
            color: #1e293b;
            font-size: 18px;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #e2e8f0;
        }

        .metric:last-child {
            border-bottom: none;
        }

        .metric-label {
            color: #64748b;
            font-size: 14px;
        }

        .metric-value {
            font-weight: 600;
            font-size: 16px;
        }

        .status-good { color: #10b981; }
        .status-warning { color: #f59e0b; }
        .status-critical { color: #ef4444; }

        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
            margin: 8px 0;
        }

        .progress-fill {
            height: 100%;
            transition: width 0.3s ease;
        }

        .progress-good { background: #10b981; }
        .progress-warning { background: #f59e0b; }
        .progress-critical { background: #ef4444; }

        .alert {
            padding: 12px 16px;
            border-radius: 6px;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .alert-warning {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            color: #92400e;
        }

        .alert-critical {
            background: #fee2e2;
            border: 1px solid #ef4444;
            color: #dc2626;
        }

        .btn {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s;
        }

        .btn:hover {
            background: #2563eb;
        }

        .btn-small {
            padding: 4px 8px;
            font-size: 12px;
        }

        .btn-danger {
            background: #ef4444;
        }

        .btn-danger:hover {
            background: #dc2626;
        }

        .actions {
            display: flex;
            gap: 8px;
            margin-top: 16px;
        }

        .loading {
            opacity: 0.6;
            pointer-events: none;
        }

        .hidden {
            display: none;
        }

        .timeframe-selector {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
        }

        .timeframe-btn {
            padding: 6px 12px;
            border: 1px solid #d1d5db;
            background: white;
            color: #6b7280;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }

        .timeframe-btn.active {
            background: #3b82f6;
            color: white;
            border-color: #3b82f6;
        }

        .emoji {
            font-size: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏈 Storage Management Dashboard</h1>
            <p>Monitor YouTube uploads, Google Drive storage, and automated cleanup processes</p>
        </div>

        <div class="grid">
            <!-- Storage Overview -->
            <div class="card">
                <h2><span class="emoji">💾</span> Storage Overview</h2>
                <div id="storage-overview">
                    <div class="loading">Loading storage data...</div>
                </div>
            </div>

            <!-- Upload Performance -->
            <div class="card">
                <h2><span class="emoji">📊</span> Upload Performance</h2>
                <div id="upload-performance">
                    <div class="loading">Loading performance data...</div>
                </div>
            </div>

            <!-- Active Alerts -->
            <div class="card">
                <h2><span class="emoji">🚨</span> Active Alerts</h2>
                <div id="active-alerts">
                    <div class="loading">Loading alerts...</div>
                </div>
            </div>
        </div>

        <!-- Analytics Section -->
        <div class="card">
            <h2><span class="emoji">📈</span> Analytics</h2>
            <div class="timeframe-selector">
                <button class="timeframe-btn active" data-timeframe="1h">1 Hour</button>
                <button class="timeframe-btn" data-timeframe="24h">24 Hours</button>
                <button class="timeframe-btn" data-timeframe="7d">7 Days</button>
                <button class="timeframe-btn" data-timeframe="30d">30 Days</button>
            </div>
            <div id="analytics-data">
                <div class="loading">Loading analytics...</div>
            </div>
        </div>

        <!-- Cleanup Management -->
        <div class="card">
            <h2><span class="emoji">🗑️</span> Cleanup Management</h2>
            <p style="margin-bottom: 16px; color: #64748b;">Manage Google Drive cleanup operations. Files are automatically deleted after 30 days.</p>

            <div class="actions">
                <button class="btn" onclick="previewCleanup()">Preview Cleanup</button>
                <button class="btn btn-danger" onclick="runCleanup()">Run Cleanup Now</button>
            </div>

            <div id="cleanup-results" class="hidden" style="margin-top: 16px;"></div>
        </div>
    </div>

    <script>
        let currentTimeframe = '24h';

        // Initialize dashboard
        document.addEventListener('DOMContentLoaded', function() {
            loadDashboard();

            // Set up timeframe selector
            document.querySelectorAll('.timeframe-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    currentTimeframe = this.dataset.timeframe;
                    loadAnalytics();
                });
            });

            // Refresh every 30 seconds
            setInterval(loadDashboard, 30000);
        });

        async function loadDashboard() {
            await Promise.all([
                loadStorageOverview(),
                loadUploadPerformance(),
                loadActiveAlerts(),
                loadAnalytics()
            ]);
        }

        async function loadStorageOverview() {
            try {
                const response = await fetch('/storage/dashboard/api/overview');
                const data = await response.json();

                const html = \`
                    <div class="metric">
                        <div class="metric-label">Drive Usage</div>
                        <div class="metric-value \${getStatusClass(data.storage?.drive?.usagePercent || 0)}">\${data.storage?.drive?.usage || 'Unknown'}</div>
                    </div>
                    \${data.storage?.drive ? \`
                    <div class="progress-bar">
                        <div class="progress-fill \${getProgressClass(data.storage.drive.usagePercent)}" style="width: \${data.storage.drive.usagePercent}%"></div>
                    </div>
                    \` : ''}
                    <div class="metric">
                        <div class="metric-label">YouTube Videos</div>
                        <div class="metric-value">\${data.storage?.youtube?.videoCount || 0}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Scheduled Cleanups</div>
                        <div class="metric-value">\${data.storage?.cleanup?.scheduled || 0}</div>
                    </div>
                \`;

                document.getElementById('storage-overview').innerHTML = html;
            } catch (error) {
                document.getElementById('storage-overview').innerHTML = '<div style="color: #ef4444;">Error loading storage data</div>';
            }
        }

        async function loadUploadPerformance() {
            try {
                const response = await fetch(\`/storage/dashboard/api/analytics/\${currentTimeframe}\`);
                const data = await response.json();

                const uploads = data.uploads || {};
                const successRate = uploads.total > 0 ? Math.round((uploads.successful / uploads.total) * 100) : 100;

                const html = \`
                    <div class="metric">
                        <div class="metric-label">Upload Success Rate</div>
                        <div class="metric-value \${getStatusClass(successRate)}">\${successRate}%</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Total Uploads</div>
                        <div class="metric-value">\${uploads.total || 0}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Failed Uploads</div>
                        <div class="metric-value \${uploads.failed > 0 ? 'status-warning' : ''}">\${uploads.failed || 0}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Avg Duration</div>
                        <div class="metric-value">\${Math.round((uploads.avgDuration || 0) / 1000)}s</div>
                    </div>
                \`;

                document.getElementById('upload-performance').innerHTML = html;
            } catch (error) {
                document.getElementById('upload-performance').innerHTML = '<div style="color: #ef4444;">Error loading performance data</div>';
            }
        }

        async function loadActiveAlerts() {
            try {
                const response = await fetch('/storage/dashboard/api/alerts');
                const alerts = await response.json();

                if (alerts.length === 0) {
                    document.getElementById('active-alerts').innerHTML = '<div style="color: #10b981;">✅ No active alerts</div>';
                    return;
                }

                const html = alerts.map(alert => \`
                    <div class="alert alert-\${alert.level}">
                        <div>
                            <strong>\${alert.message}</strong>
                            <div style="font-size: 12px; margin-top: 4px;">\${new Date(alert.createdAt).toLocaleString()}</div>
                        </div>
                        <button class="btn btn-small" onclick="resolveAlert('\${alert.id}')">Resolve</button>
                    </div>
                \`).join('');

                document.getElementById('active-alerts').innerHTML = html;
            } catch (error) {
                document.getElementById('active-alerts').innerHTML = '<div style="color: #ef4444;">Error loading alerts</div>';
            }
        }

        async function loadAnalytics() {
            try {
                const response = await fetch(\`/storage/dashboard/api/analytics/\${currentTimeframe}\`);
                const data = await response.json();

                const html = \`
                    <div class="grid">
                        <div>
                            <h3 style="margin-bottom: 12px;">Upload Statistics</h3>
                            <div class="metric">
                                <div class="metric-label">Total Uploads</div>
                                <div class="metric-value">\${data.uploads?.total || 0}</div>
                            </div>
                            <div class="metric">
                                <div class="metric-label">Success Rate</div>
                                <div class="metric-value">\${data.uploads?.successRate || 0}%</div>
                            </div>
                            <div class="metric">
                                <div class="metric-label">Total Size</div>
                                <div class="metric-value">\${formatBytes(data.uploads?.totalSize || 0)}</div>
                            </div>
                        </div>

                        <div>
                            <h3 style="margin-bottom: 12px;">Cleanup Statistics</h3>
                            <div class="metric">
                                <div class="metric-label">Cleanup Runs</div>
                                <div class="metric-value">\${data.cleanup?.runs || 0}</div>
                            </div>
                            <div class="metric">
                                <div class="metric-label">Files Deleted</div>
                                <div class="metric-value">\${data.cleanup?.totalDeleted || 0}</div>
                            </div>
                            <div class="metric">
                                <div class="metric-label">Storage Freed</div>
                                <div class="metric-value">\${data.cleanup?.storageFreed || '0 Bytes'}</div>
                            </div>
                        </div>
                    </div>

                    \${data.recommendations?.length > 0 ? \`
                        <div style="margin-top: 20px;">
                            <h3 style="margin-bottom: 12px;">📋 Recommendations</h3>
                            \${data.recommendations.map(rec => \`
                                <div class="alert alert-\${rec.priority === 'critical' ? 'critical' : 'warning'}">
                                    <div>
                                        <strong>\${rec.message}</strong>
                                        <div style="font-size: 12px; margin-top: 4px;">\${rec.action}</div>
                                    </div>
                                </div>
                            \`).join('')}
                        </div>
                    \` : ''}
                \`;

                document.getElementById('analytics-data').innerHTML = html;
            } catch (error) {
                document.getElementById('analytics-data').innerHTML = '<div style="color: #ef4444;">Error loading analytics</div>';
            }
        }

        async function resolveAlert(alertId) {
            try {
                const response = await fetch(\`/storage/dashboard/api/alerts/\${alertId}/resolve\`, {
                    method: 'POST'
                });

                if (response.ok) {
                    loadActiveAlerts(); // Refresh alerts
                }
            } catch (error) {
                alert('Failed to resolve alert');
            }
        }

        async function previewCleanup() {
            const days = prompt('Preview cleanup for files older than how many days?', '30');
            if (!days) return;

            try {
                const response = await fetch('/storage/dashboard/api/cleanup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ olderThanDays: parseInt(days), dryRun: true })
                });

                const result = await response.json();

                const html = \`
                    <div class="alert alert-warning">
                        <div>
                            <strong>Cleanup Preview (\${days} days)</strong>
                            <div style="margin-top: 8px;">
                                Files found: \${result.found || 0}<br>
                                Would delete: \${result.found || 0} files
                            </div>
                        </div>
                    </div>
                \`;

                document.getElementById('cleanup-results').innerHTML = html;
                document.getElementById('cleanup-results').classList.remove('hidden');
            } catch (error) {
                alert('Failed to preview cleanup');
            }
        }

        async function runCleanup() {
            if (!confirm('Are you sure you want to run cleanup now? This will permanently delete old files from Google Drive.')) {
                return;
            }

            const days = prompt('Delete files older than how many days?', '30');
            if (!days) return;

            try {
                const response = await fetch('/storage/dashboard/api/cleanup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ olderThanDays: parseInt(days), dryRun: false })
                });

                const result = await response.json();

                const html = \`
                    <div class="alert \${result.failed > 0 ? 'alert-warning' : 'alert-warning'}" style="background: #d1fae5; border-color: #10b981; color: #065f46;">
                        <div>
                            <strong>Cleanup Complete</strong>
                            <div style="margin-top: 8px;">
                                Files found: \${result.found || 0}<br>
                                Successfully deleted: \${result.deleted || 0}<br>
                                Failed: \${result.failed || 0}
                            </div>
                        </div>
                    </div>
                \`;

                document.getElementById('cleanup-results').innerHTML = html;
                document.getElementById('cleanup-results').classList.remove('hidden');

                // Refresh storage overview
                loadStorageOverview();
            } catch (error) {
                alert('Failed to run cleanup');
            }
        }

        function getStatusClass(value) {
            if (value >= 90) return 'status-critical';
            if (value >= 75) return 'status-warning';
            return 'status-good';
        }

        function getProgressClass(value) {
            if (value >= 90) return 'progress-critical';
            if (value >= 75) return 'progress-warning';
            return 'progress-good';
        }

        function formatBytes(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
    </script>
</body>
</html>
  `;
}