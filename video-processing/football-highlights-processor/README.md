# 🏈 Football Highlights Processor

**AI-powered video processing engine for football highlights with smart timing, multi-modal analysis, and automated deployment.**

## 🌟 Features

- **Smart Video Processing**: AI-powered scene analysis with TensorFlow and OpenCV
- **Multi-Format Support**: Parse 8+ different match note formats automatically
- **Intelligent Timing**: Dynamic clip extraction with context-aware timing
- **Player Highlights**: Individual player compilation videos
- **Google Drive Integration**: Large file handling and organized storage
- **Job Queue System**: Bull queues with Redis for scalable processing
- **Health Monitoring**: Comprehensive system health checks
- **Docker Ready**: Full containerization for Railway/Render deployment
- **Cloudflare Workers**: Global coordination layer for job management

## 🚀 Quick Start

### Prerequisites

1. **Install the Football Highlights System first:**
   ```bash
   npx create-football-highlights
   ```

2. **System Requirements:**
   - Node.js 18+
   - FFmpeg
   - Redis
   - Docker (for deployment)

### Installation

1. **Clone and setup:**
   ```bash
   git clone <repository-url>
   cd football-highlights-processor
   npm install
   ```

2. **Integrate with your installation:**
   ```bash
   npm run integrate
   ```

   This will:
   - Validate your installer configuration
   - Generate processor settings
   - Create deployment files
   - Test connectivity

### Development

```bash
# Start development server
npm run dev

# Run worker processes
npm run worker

# Test integration
npm run integrate
```

## 🏗️ Architecture

### Core Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Cloudflare    │────│  Main Server     │────│   Redis Queue   │
│    Workers      │    │  (Express.js)    │    │   (Bull Jobs)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
        ┌───────▼───────┐ ┌─────▼─────┐ ┌───────▼──────┐
        │ Match Notes   │ │ AI Scene  │ │ Video        │
        │ Parser        │ │ Analyzer  │ │ Processor    │
        └───────────────┘ └───────────┘ └──────────────┘
                                │
                        ┌───────▼───────┐
                        │ Google Drive  │
                        │ Manager       │
                        └───────────────┘
```

### Processing Pipeline

1. **Input Validation**: Check video file and match notes
2. **Note Parsing**: Extract actions, players, and timestamps
3. **AI Analysis**: Multi-modal scene detection (visual, audio, motion)
4. **Smart Timing**: Context-aware clip extraction
5. **Video Processing**: Generate team and player highlights
6. **Upload & Notify**: Store results and send notifications

## 📊 Video Processing Features

### AI Scene Analysis

- **Visual Detection**: Goal celebrations, card incidents, crowd reactions
- **Audio Analysis**: Crowd volume spikes, whistle detection
- **Motion Tracking**: Player movement patterns, ball tracking
- **Confidence Scoring**: 0-1 scale for highlight reliability

### Match Notes Parsing

Supports formats like:
```
15:30 - Smith goal from penalty
Smith goal 15:30
Goal by Smith at 15:30
15' Smith scores from the penalty spot
[15:30] GOAL - Smith (Penalty)
```

### Smart Timing Extraction

- **Action-Based**: Different timing rules for goals, cards, saves
- **AI-Enhanced**: Extends clips based on detected excitement
- **Context-Aware**: Considers nearby actions and scenes
- **Deduplication**: Merges overlapping highlights intelligently

## 🛠️ Configuration

### Environment Variables

```bash
# Application
NODE_ENV=production
PORT=8080
LOG_LEVEL=info

# Club Settings
CLUB_NAME="Your Club Name"
CLUB_SEASON="2024-25"
CLUB_REGION="us-east"

# Processing
WORKER_CONCURRENCY=2
PROCESSING_TIMEOUT=900000
VIDEO_QUALITY=medium
FFMPEG_PRESET=medium

# Services
REDIS_URL=redis://localhost:6379
GOOGLE_CREDENTIALS='{...}'
DRIVE_FOLDER_ID=your-folder-id

# Endpoints
PRIMARY_ENDPOINT=https://your-app.railway.app
BACKUP_ENDPOINT=https://your-app.render.com
COORDINATOR_URL=https://your-worker.your-subdomain.workers.dev
```

## 🚀 Deployment

### Docker Deployment

```bash
# Build and run
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Railway Deployment

1. Connect GitHub repository
2. Add environment variables from integration
3. Deploy automatically

### Render Deployment

1. Create new service from repository
2. Use `render.yaml` configuration
3. Set environment variables

### Cloudflare Workers

```bash
# Deploy worker
npm install -g wrangler
wrangler deploy src/integrations/cloudflare-worker.js
```

## 📈 Monitoring

### Health Checks

- **System Health**: `/health` endpoint
- **Job Dashboard**: `/admin/queues` (Bull Board)
- **Queue Stats**: `/stats` endpoint

### Logging

- **Structured Logs**: JSON format with timestamps
- **Log Levels**: debug, info, warn, error
- **File Rotation**: Automatic log management

## 🔧 API Endpoints

### Main Processing

```bash
# Process match video
POST /process
{
  "clubName": "Arsenal FC",
  "opponent": "Chelsea FC",
  "matchDate": "2024-03-15",
  "matchNotes": "15:30 - Smith goal\\n45:10 - Jones yellow card",
  "videoUrl": "https://drive.google.com/...",
  "createPlayerHighlights": true
}

# Check job status
GET /status/:jobId

# Parse notes only
POST /parse-notes
{
  "matchNotes": "15:30 - Smith goal\\n45:10 - Jones yellow card"
}
```

### System Monitoring

```bash
# System health
GET /health

# Queue statistics
GET /stats

# Job monitoring dashboard
GET /admin/queues
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Test processor components
node tests/processor.test.js

# Test integration
npm run integrate
```

## 🤝 Integration with Installer

This processor integrates seamlessly with the `create-football-highlights` installer:

1. **Automatic Configuration**: Reads installer settings
2. **Service Discovery**: Connects to deployed services
3. **Sheet Integration**: Works with Google Sheets management
4. **Deployment Sync**: Matches installer deployment choices

## 📝 Advanced Usage

### Custom AI Models

```javascript
// Override default AI analysis
const aiAnalyzer = new AIAnalyzer(logger, {
  confidenceThreshold: 0.8,
  customModels: {
    'goal-detection': './models/custom-goal-model.json'
  }
});
```

### Custom Match Notes Formats

```javascript
// Add new parsing patterns
const parser = new MatchNotesParser(logger);
parser.addCustomPattern(/(\d+:\d+)\s*-\s*(.+?)\s+(goal|score)/i, {
  timeGroup: 1,
  actionGroup: 3,
  descriptionGroup: 2
});
```

### Processing Hooks

```javascript
// Add processing callbacks
const processor = new VideoProcessor(logger);
processor.on('clipProcessed', (clip) => {
  console.log(`Processed: ${clip.description}`);
});
```

## 🚨 Troubleshooting

### Common Issues

1. **FFmpeg not found**: Install FFmpeg system-wide
2. **Redis connection failed**: Check Redis server and URL
3. **Google API errors**: Verify credentials and permissions
4. **Memory issues**: Increase Docker memory limits
5. **Processing timeouts**: Adjust timeout values

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm start

# Verbose worker output
DEBUG=* npm run worker
```

## 📚 Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new features
4. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**Built for football clubs worldwide 🌍⚽**

*Automated video editing • AI-powered highlights • 100% free forever*