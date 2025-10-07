# 📦 Football Highlights Storage Management System

**Complete storage solution with YouTube uploads, Google Drive management, and automated 30-day cleanup.**

## 🌟 Features

### YouTube Integration
- **Immediate Upload**: All videos uploaded to YouTube immediately (unlisted by default)
- **Smart Playlists**: Automatic organization by team matches and individual players
- **Privacy Controls**: Easy switching between unlisted, private, and public
- **Resumable Uploads**: Large file support with retry logic and bandwidth optimization
- **Rich Metadata**: Auto-generated titles, descriptions, and tags

### Google Drive Management
- **30-Day Temporary Storage**: Fast access for downloads while YouTube processes
- **Smart Folder Organization**: `/Matches/{Date}` and `/Players/{PlayerName}/`
- **Automated Cleanup**: Scheduled deletion after 30 days (YouTube copy remains)
- **Storage Monitoring**: Real-time usage tracking with alerts
- **Resumable Uploads**: Chunk-based uploads for reliability

### Automated Cleanup System
- **Daily Scheduled Cleanup**: Runs at 2:00 AM with configurable timing
- **Emergency Cleanup**: Triggered at 95% storage usage
- **Manual Cleanup**: On-demand cleanup with preview option
- **Comprehensive Logging**: Full audit trail of all cleanup operations
- **Smart Retention**: Keeps YouTube archive while cleaning Drive storage

### Analytics & Monitoring
- **Real-Time Analytics**: Upload success rates, storage usage, performance metrics
- **Alert System**: Proactive notifications for storage issues and failures
- **Performance Tracking**: Upload speeds, failure rates, and system health
- **Comprehensive Reports**: Daily, weekly, and monthly storage reports
- **Interactive Dashboard**: Web-based management interface

## 🚀 Quick Start

### Environment Variables

```bash
# Google Services (required)
GOOGLE_CREDENTIALS='{"type":"service_account",...}'

# Storage Configuration (optional)
STORAGE_DEFAULT_PRIVACY=unlisted
STORAGE_ENABLE_DRIVE=true
STORAGE_ENABLE_YOUTUBE=true
STORAGE_CLEANUP_DAYS=30
STORAGE_CLEANUP_TIME=02:00
```

### Integration with Video Processing

The storage system integrates automatically with the video processing engine:

```javascript
// Video processing with automatic storage
const result = await videoProcessor.processMatchVideo({
  inputPath: '/path/to/match-video.mp4',
  clubName: 'Arsenal FC',
  opponent: 'Chelsea FC',
  matchDate: '2024-03-15',
  createPlayerHighlights: true
});

// Results include storage URLs
console.log(result.storageUrls);
// {
//   teamHighlight: 'https://youtube.com/watch?v=abc123',
//   playerHighlights: [
//     { player: 'Smith', url: 'https://youtube.com/watch?v=def456' }
//   ]
// }
```

## 📊 Storage Dashboard

Access the interactive dashboard at: `/storage/dashboard`

**Features:**
- Real-time storage usage and performance metrics
- Active alerts and resolution management
- Upload analytics with success/failure tracking
- Manual cleanup operations with preview
- Privacy management for videos and playlists

## 🔧 API Endpoints

### Storage Status
```bash
GET /storage/status
# Returns: storage usage, alerts, performance summary
```

### Generate Reports
```bash
GET /storage/report/24h   # Last 24 hours
GET /storage/report/7d    # Last 7 days
GET /storage/report/30d   # Last 30 days
```

### Alert Management
```bash
GET /storage/alerts                    # List active alerts
POST /storage/alerts/:id/resolve       # Resolve specific alert
```

### Cleanup Operations
```bash
POST /storage/cleanup/manual
{
  "olderThanDays": 30,
  "dryRun": true  // Preview without deletion
}
```

### Privacy Management
```bash
POST /storage/privacy/public/:jobId    # Make job results public
```

## 📋 Storage Workflow

### 1. Video Processing Complete
- **Team Highlight** → YouTube (unlisted) + Drive (30-day temp)
- **Player Highlights** → YouTube (unlisted) + Drive (30-day temp)
- **Individual Clips** → Drive only (30-day temp)

### 2. Automatic Organization
- **YouTube Playlists**: `⚽ Team Matches 2024-25`, `🏃 Smith - Individual Highlights`
- **Drive Folders**: `Matches/2024-03-15/`, `Players/Smith/`
- **Smart Metadata**: Auto-generated titles, descriptions, tags

### 3. Cleanup Scheduling
- **Immediate**: Schedule Drive cleanup for 30 days from upload
- **Daily Check**: Process all files due for cleanup
- **Emergency**: Trigger cleanup at 95% Drive usage
- **Preserve**: Keep YouTube copies permanently

### 4. Analytics & Alerts
- **Monitor**: Storage usage, upload performance, cleanup success
- **Alert**: High usage, upload failures, cleanup issues
- **Report**: Generate comprehensive analytics reports

## 🎛️ Configuration Options

### Upload Configuration
```javascript
const storageCoordinator = new StorageCoordinator(logger, credentials);

storageCoordinator.updateUploadConfig({
  defaultPrivacy: 'unlisted',         // Default video privacy
  enableDriveUpload: true,            // Enable Drive uploads
  enableYouTubeUpload: true,          // Enable YouTube uploads
  maxRetries: 3,                      // Upload retry attempts
  parallelUploads: false,             // Sequential vs parallel
  generateThumbnails: true,           // Auto-generate thumbnails
  organizeFolders: true               // Smart folder organization
});
```

### Cleanup Configuration
```javascript
storageCoordinator.updateCleanupConfig({
  dailyCleanupTime: '02:00',          // Daily cleanup time
  cleanupRetentionDays: 30,           // Days before cleanup
  emergencyCleanupThreshold: 95,      // Emergency trigger %
  enableNotifications: true,          // Email notifications
  timeZone: 'UTC'                     // Cleanup timezone
});
```

## 📈 Analytics & Reporting

### Storage Metrics
- **Drive Usage**: Used/total space, percentage, available space
- **YouTube Stats**: Video count, total views, subscriber count
- **Upload Performance**: Success rates, average duration, failure analysis
- **Cleanup Statistics**: Files processed, deleted, storage freed

### Performance Monitoring
- **Upload Success Rate**: Track successful vs failed uploads
- **Response Times**: Monitor upload and download performance
- **Error Tracking**: Categorize and analyze failure types
- **Trend Analysis**: Identify patterns and performance changes

### Alert System
- **Storage Alerts**: Warning (75%), Critical (90%), Emergency (95%)
- **Performance Alerts**: High failure rates, slow responses
- **System Alerts**: Service outages, API quota issues

### Comprehensive Reports
```json
{
  "timeframe": "24h",
  "storage": {
    "drive": { "usage": "45%", "available": "5.5 GB" },
    "youtube": { "videoCount": 156, "storage": "Unlimited" }
  },
  "uploads": {
    "total": 24,
    "successful": 23,
    "failed": 1,
    "successRate": "96%",
    "avgDuration": "45s"
  },
  "cleanup": {
    "runs": 1,
    "totalDeleted": 8,
    "storageFreed": "2.4 GB"
  },
  "recommendations": [
    {
      "type": "storage",
      "priority": "medium",
      "message": "Storage usage trending upward",
      "action": "Monitor usage and consider cleanup optimization"
    }
  ]
}
```

## 🔄 Folder Organization

### YouTube Structure
```
📺 YouTube Channel
├── ⚽ Arsenal FC 2024-25 Matches (Playlist)
├── ⚽ Arsenal FC vs Chelsea 2024-03-15 (Playlist)
├── 🏃 Smith - 2024-25 Highlights (Playlist)
├── 🏃 Jones - 2024-25 Highlights (Playlist)
└── 🏃 Wilson - 2024-25 Highlights (Playlist)
```

### Google Drive Structure
```
📁 Football Highlights
├── 📁 Matches/
│   ├── 📁 2024-03-15/
│   │   ├── 🎥 Arsenal_vs_Chelsea_Highlights.mp4
│   │   └── 📁 Individual_Clips/
│   │       ├── 🎬 01_Smith_Goal.mp4
│   │       └── 🎬 02_Wilson_Save.mp4
│   └── 📁 2024-03-22/
└── 📁 Players/
    ├── 📁 Smith/
    │   └── 🎥 Smith_Individual_Highlights.mp4
    └── 📁 Jones/
        └── 🎥 Jones_Individual_Highlights.mp4
```

## 🛡️ Privacy & Security

### Default Privacy Settings
- **All uploads default to "unlisted"** for privacy
- **Manual controls** to make content public when ready
- **Granular permissions** for individual videos and playlists

### Access Control
- **Service account authentication** for automated operations
- **Secure credential storage** with environment variables
- **API quota management** to prevent service interruption

### Data Protection
- **30-day retention** for temporary Drive storage
- **Permanent YouTube backup** ensures no data loss
- **Comprehensive logging** without exposing sensitive data

## 🚨 Troubleshooting

### Common Issues

1. **Upload Failures**
   - Check Google API credentials and quotas
   - Verify network connectivity and file permissions
   - Review logs for specific error messages

2. **Storage Full**
   - Run manual cleanup for older files
   - Check emergency cleanup threshold settings
   - Verify Drive quota and permissions

3. **Cleanup Not Working**
   - Check scheduled cleanup configuration
   - Verify cleanup service is running
   - Review cleanup logs for failures

### Debug Mode
```bash
# Enable detailed logging
LOG_LEVEL=debug npm start

# Check storage status
curl http://localhost:8080/storage/status

# Preview cleanup
curl -X POST http://localhost:8080/storage/cleanup/manual \
  -H "Content-Type: application/json" \
  -d '{"olderThanDays": 30, "dryRun": true}'
```

### Health Monitoring
- **Storage Dashboard**: `/storage/dashboard`
- **System Health**: `/health`
- **API Status**: `/storage/status`
- **Active Alerts**: `/storage/alerts`

## 📞 Support & Maintenance

### Monitoring Checklist
- [ ] Daily: Check storage usage and alerts
- [ ] Weekly: Review upload performance and failure rates
- [ ] Monthly: Analyze storage reports and optimization opportunities
- [ ] Quarterly: Review cleanup configuration and retention policies

### Maintenance Tasks
- **Log Rotation**: Automated log file management
- **Credential Renewal**: Service account key rotation
- **Quota Monitoring**: API usage tracking and alerts
- **Performance Optimization**: Regular analysis and tuning

---

**🎥 Complete storage solution for football highlight management**

*Automatic uploads • Smart organization • 30-day cleanup • Real-time monitoring*