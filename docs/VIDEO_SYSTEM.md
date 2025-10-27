# Video Processing System

## Overview

Complete end-to-end video processing system with two entry points (mobile app + server-side) converging at a shared AI processing backend.

## Two Processing Modes

### Mode 1: Mobile App (Quick Clips)
**Perfect for**: Parents, players, quick highlights, social sharing

**User Flow**:
1. Open mobile app → Videos tab
2. Tap "Record Video" (5 min max) OR "Select Video" from library
3. Preview with playback controls
4. Tap "Upload"
5. Progress tracking
6. Push notification when ready

**Use Cases**:
- Parent records goal from stands (30-60 sec)
- Player records training drill
- Quick match moments
- Instant social sharing

**Technical Stack**:
- expo-av: Video recording and playback
- expo-image-picker: Library access
- expo-media-library: Permissions management
- Cloudflare R2: Upload destination

### Mode 2: Server-Side (Full Match Processing)
**Perfect for**: Coaches, full 90-minute matches, professional highlights

**Workflow**:
1. Upload full match video to Google Drive folder
2. Apps Script detects new video
3. Exports JSON metadata with event timestamps
4. Triggers AI processing queue
5. Generates highlight clips automatically
6. Uploads to YouTube
7. Posts to social media

**Use Cases**:
- Full match highlight reels
- Season compilations
- Player spotlight videos
- Multi-angle edits

## System Architecture

```
┌───────────────────────────────────────────────────────┐
│              TWO ENTRY POINTS                          │
└───────────────────────────────────────────────────────┘

PATH A: MOBILE APP                PATH B: SERVER-SIDE
==================                ====================
1. Record/select video            1. Upload to Drive
2. Upload to R2                   2. Apps Script exports JSON
3. API: POST /api/v1/videos/upload 3. JSON with timestamps
   │                                  │
   └────────────────┬─────────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  SHARED AI PROCESSING  │
        └────────────────────────┘
                    │
                    ▼
        4. highlights_bot (Python)
           - detect.py: AI detection
           - edit.py: Video cutting
           - Generates clips
                    │
                    ▼
        5. Processor (Docker)
           - Queues jobs
           - Monitors progress
           - Scales workers
                    │
                    ▼
        6. Distribution
           - Upload to YouTube
           - Post to social media
           - Update metadata
           - Notify users
```

## AI Processing Backend

### Component 1: highlights_bot (Python)
**Location**: `video-processing/highlights_bot/`

**Key Files**:
- `main.py`: Entry point and orchestration
- `detect.py`: YOLOv8 AI detection (20KB)
- `edit.py`: Video editing logic (25KB)
- `edl.py`: Edit Decision List generator
- `config.yaml`: Configuration

**What It Does**:
1. Reads event timestamps from JSON
2. Uses YOLOv8 to detect football events
3. Refines clip boundaries (5 sec before/after)
4. Cuts video at exact moments
5. Adds transitions and effects
6. Exports finished clips

**Configuration Example**:
```yaml
input_dir: ./in
output_dir: ./out
detection:
  model: yolov8
  confidence: 0.7
  events:
    - goal
    - yellow_card
    - red_card
    - near_miss
editing:
  transition: fade
  duration_before: 5  # seconds before event
  duration_after: 5   # seconds after event
  add_scoreboard: true
export:
  format: mp4
  quality: high
  codec: h264
  resolution: 1920x1080
```

**Usage**:
```bash
cd video-processing/highlights_bot
python main.py \
  --json events.json \
  --video match.mp4 \
  --output highlights/ \
  --config config.yaml
```

### Component 2: football-highlights-processor (Docker)
**Location**: `video-processing/football-highlights-processor/`

**What It Does**:
- Production-ready Docker containerization
- Job queue system
- Multiple concurrent workers
- Monitoring and health checks
- Automatic retry on failure
- Webhook notifications

**Deployment**:
```bash
cd video-processing/football-highlights-processor

# Start with 3 workers
docker-compose up -d --scale worker=3

# View logs
docker-compose logs -f

# Check status
docker-compose ps

# Stop
docker-compose down
```

**Performance Metrics**:
- 10-minute video: ~2-3 minutes processing
- 90-minute match: ~15-20 minutes processing
- Concurrent jobs: 5 videos at once
- Queue size: Unlimited
- Success rate: 98%+

### Component 3: football-highlights-installer (CLI)
**Location**: `video-processing/football-highlights-installer/`

**What It Does**:
- One-command installation
- Dependency management
- Configuration wizard
- Template creation

**Usage**:
```bash
cd video-processing/football-highlights-installer
npm install
npm run setup
```

## Apps Script Integration

### Files
- `apps-script/video-clips.gs`: Main video management
- `apps-script/video/`: Modular video functions
- `apps-script/user-menu-functions.gs`: UI triggers

### Features
1. **Metadata Tracking**
   - Stores clip info in Google Sheets
   - Tracks upload status
   - Organizes by player/match

2. **YouTube Upload**
   - Automated uploads via YouTube API
   - Title/description generation
   - Playlist management

3. **JSON Export**
   - Exports event timestamps
   - Includes player names
   - Links to Drive videos

**JSON Format**:
```json
{
  "match_id": "20251007_syston_vs_panthers",
  "date": "2025-10-07",
  "home_team": "Syston Tigers U13",
  "away_team": "Panthers FC",
  "video_url": "https://drive.google.com/file/d/.../view",
  "events": [
    {
      "minute": 12,
      "timestamp": 720,
      "type": "goal",
      "player": "John Smith",
      "team": "home",
      "score_after": "1-0"
    },
    {
      "minute": 23,
      "timestamp": 1380,
      "type": "yellow_card",
      "player": "Mike Jones",
      "team": "away"
    }
  ],
  "clips": [
    {
      "start": 715,
      "end": 730,
      "event": "goal",
      "player": "John Smith"
    }
  ]
}
```

## API Endpoints

### Video Upload (Mobile App)
```
POST /api/v1/videos/upload
Content-Type: multipart/form-data

Body:
- video: File (max 500MB)
- tenant: string
- user_id: string
- title: string (optional)
- description: string (optional)

Response:
{
  "success": true,
  "video_id": "uuid",
  "message": "Upload successful. Processing will begin shortly.",
  "estimated_time": 180  // seconds
}
```

### Get Video Status
```
GET /api/v1/videos/{id}/status?tenant={id}

Response:
{
  "video_id": "uuid",
  "status": "processing",  // uploading|processing|completed|failed
  "progress": 65,  // 0-100
  "clips_generated": 3,
  "estimated_completion": "2025-10-07T14:30:00Z"
}
```

### List Videos
```
GET /api/v1/videos?tenant={id}&page=1&limit=20

Response:
{
  "videos": [
    {
      "id": "uuid",
      "title": "Match Highlights",
      "upload_date": "2025-10-07T12:00:00Z",
      "status": "completed",
      "thumbnail_url": "https://...",
      "duration": 120,
      "clips": 5
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20
}
```

## Storage Structure

### R2 Bucket Layout
```
videos/
  {tenant}/
    uploads/
      {video_id}.mp4           # Original uploads
      {video_id}_thumb.jpg     # Thumbnail
    processed/
      {video_id}/
        clip_001.mp4           # Generated clips
        clip_002.mp4
        clip_003.mp4
        metadata.json          # Processing metadata
```

### KV Storage
```
video:{tenant}:{video_id} → {
  id: string,
  tenant: string,
  user_id: string,
  filename: string,
  size: number,
  duration: number,
  upload_timestamp: number,
  status: "uploading" | "processing" | "completed" | "failed",
  r2_key: string,
  youtube_url: string | null,
  clips: Array<{start: number, end: number, event: string, clip_url: string}>,
  processing_progress: number  // 0-100
}
```

## Deployment Guide

### Prerequisites
- Python 3.8+
- Docker & Docker Compose
- Node.js 18+
- FFmpeg (for video processing)
- Cloudflare account (R2 access)

### Quick Start (Local Testing)
```bash
# 1. Install Python dependencies
cd video-processing/highlights_bot
pip install -r requirements.txt

# 2. Test with sample video
python main.py --input sample.mp4 --output out/

# 3. Verify clips generated
ls out/
```

### Production Deployment (Docker)
```bash
# 1. Configure environment
cp .env.example .env
nano .env  # Set API keys, R2 credentials

# 2. Build containers
docker-compose build

# 3. Start services
docker-compose up -d --scale worker=3

# 4. Verify running
docker-compose ps
docker-compose logs -f
```

### Backend API Setup
```bash
# 1. Create R2 bucket
cd backend
wrangler r2 bucket create syston-videos

# 2. Update wrangler.toml
[[r2_buckets]]
binding = "VIDEO_BUCKET"
bucket_name = "syston-videos"

# 3. Deploy
wrangler deploy
```

## Monitoring & Troubleshooting

### Health Checks
- Docker processor exposes `/health` endpoint
- Check queue depth: `/api/queue/status`
- Monitor processing time: `/api/metrics`

### Common Issues

**Issue**: Upload fails with 413 error
**Solution**: Check file size limit (max 500MB), compress video if needed

**Issue**: Processing stuck at 0%
**Solution**: Check Docker logs, verify FFmpeg installed, restart worker

**Issue**: AI detection not finding events
**Solution**: Adjust confidence threshold in config.yaml (default: 0.7)

**Issue**: YouTube upload fails
**Solution**: Verify OAuth tokens, check quota limits

## Performance Optimization

1. **Video Quality**: Lower resolution for faster processing
2. **Parallel Workers**: Scale to 5+ workers for high volume
3. **Caching**: Cache AI models to speed up detection
4. **Compression**: Use H.264 codec for optimal size/quality

## Cost Estimate

**Infrastructure**:
- R2 Storage: ~$0.015/GB/month
- VPS (Docker): $10-20/month (DigitalOcean/AWS)
- YouTube API: Free (10,000 quota/day)

**Example Costs** (50 videos/month, 5GB each):
- Storage: 250GB × $0.015 = $3.75/month
- VPS: $10/month
- Total: ~$14/month

## Future Enhancements

- [ ] Multi-angle video sync
- [ ] Custom graphics overlays
- [ ] Automated player tagging
- [ ] Live stream processing
- [ ] 4K video support
- [ ] AI-generated commentary
