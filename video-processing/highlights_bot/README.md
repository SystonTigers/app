# Highlights Expert - Smart Auto-Editing Bot 🎬⚽

An intelligent video processing bot that automatically creates polished football highlights from match footage and guided event data. Features smart zoom, slow-motion replays, lower-thirds graphics, and multi-format output optimized for social media.

## 🚀 Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Process a match (one-command operation)
python main.py --match in/match.mp4 --events in/events.json

# Start webhook server for Make.com integration
python webhook_handler.py --port 8080
```

## 📋 What This Bot Does

- **🔍 Intelligent Detection**: Scans full match video to find missed events using audio peaks, scene cuts, goal area activity, and celebration detection
- **🎯 Smart Editing**: Creates clips with adaptive padding, intelligent zoom tracking, slow-motion replays, and professional graphics
- **📱 Multi-Format Output**: Generates 16:9 master, 1:1 square, and 9:16 vertical variants for all social platforms
- **🎞️ Highlights Reel**: Automatically assembles clips into a complete highlights package with intro/outro
- **🔗 Make.com Integration**: Seamlessly connects with your existing Google Sheets → Apps Script → Make.com workflow

## 📁 Project Structure

```
highlights_bot/
├── main.py                 # Main orchestrator
├── detect.py              # Auto-detection engine
├── edit.py                # Video editing & rendering
├── edl.py                 # Edit Decision List processing
├── util.py                # Utilities & helpers
├── webhook_handler.py     # Make.com integration server
├── config.yaml            # Configuration (edit without code changes)
├── requirements.txt       # Dependencies
├── .consent               # Consent flag for processing
│
├── in/                    # Input files
│   ├── match.mp4         # Raw match video
│   └── events.json       # Guided events from Google Sheets
│
├── out/                   # Generated outputs
│   ├── clips/            # Individual clips (all variants)
│   ├── renders/          # Complete highlights reels
│   └── manifest.json     # Make.com integration data
│
├── assets/                # Branding assets
│   ├── intro.mp4         # Intro video
│   ├── outro.mp4         # Outro video
│   ├── Font-Bold.ttf     # Text overlay font
│   ├── home.png          # Home team badge
│   └── away.png          # Away team badge
│
├── tmp/                   # Temporary processing files
├── logs/                  # Structured run logs
└── samples/               # Test data & examples
```

## ⚙️ Configuration

Edit `config.yaml` to customize behavior without touching code:

### Match Settings
```yaml
match:
  default_half_minutes: 49        # Standard half length
  trust_status_markers: true     # Use HT/FT markers for clock sync
```

### Adaptive Padding (seconds)
```yaml
padding:
  default: { pre: 7, post: 10 }
  goal:
    pre_bonus_on_attack: 5       # Extra time for build-up play
    post_bonus_on_celebration: 8 # Extra time for celebrations
  save: { pre: 11, post: 7 }
  chance: { pre: 8, post: 8 }
  foul_or_card: { pre: 4, post: 10 }
```

### Smart Features
```yaml
zoom:
  enable: true
  min_zoom: 1.08                 # Subtle push-in
  max_zoom: 1.30                 # Maximum zoom level
  smoothing: 0.15                # EMA smoothing factor

replay:
  enable_for: ["goal","goal_like","big_save"]
  slowmo_factor: 0.5             # 50% speed
  freeze_ms: 300                 # Freeze at impact
  pip: true                      # Picture-in-picture
```

### Quality Settings
```yaml
render:
  fps: 30
  crf: 20                        # Video quality (lower = better)
  preset: veryfast               # Encoding speed
  loudnorm: true                 # Audio normalization
```

## 📊 Input Format: events.json

The bot expects guided events from your Google Sheets in this format:

```json
[
  {
    "type": "goal",
    "half": 1,
    "clock": "23:45",
    "team": "Syston",
    "player": "John Striker",
    "assist": "Mike Midfielder",
    "score": {"home": 1, "away": 0},
    "notes": "Great strike from outside the box"
  },
  {
    "type": "big_save",
    "half": 1,
    "clock": "34:12",
    "team": "Syston",
    "player": "Keeper Name",
    "notes": "Point blank save from corner"
  },
  {
    "type": "card",
    "half": 2,
    "clock": "67:30",
    "team": "Opposition",
    "player": "Opposition Player",
    "notes": "Yellow card for dissent"
  }
]
```

**Supported Event Types**: `goal`, `big_save`, `chance`, `foul`, `card`

**Status Markers**: Include `"status": "HT"`, `"status": "2H_KO"`, `"status": "FT"` for accurate clock synchronization.

## 🎯 Auto-Detection Features

The bot automatically scans your full match video to catch missed events:

### Audio Peak Detection
- Analyzes crowd noise and celebration audio
- Uses z-score analysis to find excitement peaks
- Configurable sensitivity via `audio_peak_sigma`

### Scene Cut Analysis
- Detects camera changes that often accompany goals/saves
- Histogram-based analysis for replay detection
- Tunable via `scene_cut_threshold`

### Goal Area Activity
- Uses YOLO object detection to count players in goal areas
- Identifies periods of high attacking activity
- Falls back to motion analysis if YOLO unavailable

### Celebration Detection
- Identifies celebration moments via pose heuristics
- Clusters player activity during celebration windows
- Configurable `celebration_window_s` duration

### Signal Fusion
- Promotes candidates with multiple overlapping signals
- Configurable `promote_if_signals` threshold
- Deduplicates against guided events

## 🎬 Smart Editing Features

### Intelligent Zoom & Tracking
- Tracks ball and player activity using OpenCV
- Smooth zoom movements with EMA filtering
- Respects configurable zoom limits and edge margins
- Falls back to gentle static push-in if tracking fails

### Slow-Motion Replays
- Automatic replay generation for goals and saves
- Freeze-frame at moment of impact
- Optional picture-in-picture overlay
- Configurable speed and duration

### Professional Graphics
- **Lower-thirds**: Contextual text based on event type
  - Goals: "GOAL! Player (Assist) TEAM 2-0"
  - Saves: "BIG SAVE! Keeper Name TEAM 2-0"
  - Cards: "YELLOW CARD Player Name"
- **Score bugs**: Team badges + live score in corner
- **Custom fonts**: Use your brand typography
- **Brand colors**: Configurable team colors

### Multi-Format Variants
- **16:9 Master**: Full-quality baseline
- **1:1 Square**: Instagram/Facebook optimized
- **9:16 Vertical**: Stories/TikTok/Reels format
- **Smart cropping**: Preserves action using tracking data

## 🔗 Make.com Integration

### Webhook Server
```bash
python webhook_handler.py --port 8080
```

**Endpoints**:
- `POST /` - Process match (expects JSON with `match_video`, `events_file`)
- `GET /status?run_id=123` - Check processing status
- `GET /health` - Health check

### Webhook Payload
```json
{
  "match_video": "path/to/match.mp4",
  "events_file": "path/to/events.json",
  "callback_url": "https://hook.make.com/abc123"
}
```

### Integration Flow
1. **Apps Script** exports events.json at full-time
2. **Make.com** triggers bot via webhook
3. **Bot** processes match and generates clips
4. **Callback** delivers manifest.json with file URLs
5. **Make.com** posts clips to social media using manifest data

### Output Manifest
```json
{
  "run_id": "20240925_143022",
  "highlights_reel": {
    "path": "out/renders/highlights_20240925_143022.mp4",
    "title": "Match Highlights - September 25, 2024",
    "description": "Automatically generated highlights featuring 5 key moments"
  },
  "clips": [
    {
      "name": "goal_1432_01",
      "type": "goal",
      "player": "John Striker",
      "caption": "⚽ GOAL! John Striker with an assist from Mike Midfielder | Score: 1-0 #Football #Goal",
      "files": {
        "16:9": "out/clips/goal_1432_01.mp4",
        "1:1": "out/clips/goal_1432_01_1x1.mp4",
        "9:16": "out/clips/goal_1432_01_9x16.mp4"
      }
    }
  ]
}
```

## 🧪 Testing & Validation

### Run Sample Test
```bash
# Use provided sample data
python main.py --match samples/sample_match.mp4 --events samples/sample_events.json
```

### Acceptance Criteria
- ✅ Guided events produce clips within ±1s accuracy
- ✅ Auto-detection finds at least one missed event
- ✅ Slow-motion replays include freeze and PIP
- ✅ Lower-third text renders correctly
- ✅ Score bugs display properly
- ✅ All three variant formats generated
- ✅ Highlights reel plays without A/V sync issues
- ✅ Manifest.json contains valid captions and metadata
- ✅ Processing completes within reasonable time (≤1× real-time for 90min match)

### Performance Targets
- **Tracking**: 360p for performance, apply to 1080p render
- **Encoding**: `veryfast` preset with `crf=20` quality
- **Parallelization**: 2-3 clip workers, serialized reel assembly
- **Memory**: Efficient temporary file management

## 🛠️ Installation & Setup

### Prerequisites
- **Python 3.8+**
- **FFmpeg** (system-wide installation required)
- **OpenCV** (pip install)
- **Optional**: YOLO model for enhanced detection

### Install Dependencies
```bash
pip install -r requirements.txt

# Install FFmpeg (platform-specific)
# Windows: Download from https://ffmpeg.org/
# macOS: brew install ffmpeg
# Linux: apt install ffmpeg
```

### Setup Assets
1. Add your team badges: `assets/home.png`, `assets/away.png`
2. Add intro/outro videos: `assets/intro.mp4`, `assets/outro.mp4`
3. Add brand font: `assets/Font-Bold.ttf`
4. Customize colors in `config.yaml`

### Consent Management
Create `.consent` file or include `"consent_given": true` in events.json before processing.

## 📝 Usage Examples

### Basic Processing
```bash
python main.py --match video.mp4 --events events.json
```

### Skip Variants (Faster)
```bash
python main.py --match video.mp4 --events events.json --no-variants
```

### Custom Config
```bash
python main.py --match video.mp4 --events events.json --config custom_config.yaml
```

### Webhook Server
```bash
python webhook_handler.py --port 8080 --host 0.0.0.0
```

## 🔍 Troubleshooting

### Common Issues

**"Video normalization failed"**
- Check FFmpeg installation: `ffmpeg -version`
- Verify video file format and codec
- Check file permissions and disk space

**"No events to process"**
- Validate events.json format
- Check consent flag is present
- Verify event timestamps are within video duration

**"Tracking failed"**
- YOLO model will download automatically on first run
- Falls back to basic motion detection if ML unavailable
- Check video resolution and quality

**"Audio analysis failed"**
- Install librosa for enhanced audio features: `pip install librosa`
- Falls back to basic analysis if unavailable
- Check audio track exists in video

### Debug Mode
Enable verbose logging by editing config.yaml:
```yaml
logging:
  level: DEBUG
  verbose_logging: true
```

### Performance Issues
- Reduce video resolution for processing
- Adjust `sample_interval` in detection modules
- Use `--no-variants` flag for faster testing
- Check available RAM and disk space

### Logs & Monitoring
- **Run logs**: `logs/run_YYYYMMDD_HHMMSS.json`
- **Webhook logs**: `logs/webhook_server.log`
- **Structured data**: All decisions, timings, errors tracked
- **FFmpeg output**: Captured in detailed logs

## 🚦 Production Deployment

### Docker Deployment
```dockerfile
FROM python:3.9
RUN apt-get update && apt-get install -y ffmpeg
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . /app
WORKDIR /app
EXPOSE 8080
CMD ["python", "webhook_handler.py", "--host", "0.0.0.0"]
```

### Environment Variables
```bash
export HIGHLIGHTS_CONFIG_PATH=/path/to/config.yaml
export HIGHLIGHTS_CONSENT_MODE=strict
export HIGHLIGHTS_LOG_LEVEL=INFO
```

### Scaling Considerations
- Use queue system (Redis/RabbitMQ) for multiple matches
- Consider GPU acceleration for YOLO detection
- Implement proper consent management system
- Add health checks and monitoring
- Use persistent storage for assets and outputs

## 📄 License

MIT License - Feel free to adapt for your club's needs!

## 🤝 Contributing

This bot is designed to integrate seamlessly with your existing Syston Tigers automation workflow. For custom modifications or additional features, refer to the modular architecture in the code comments.

## 📞 Support

- **Issues**: Check logs first (`logs/run_*.json`)
- **Performance**: Monitor processing times vs. video length
- **Quality**: Adjust CRF and preset values in config.yaml
- **Detection**: Tune sensitivity parameters for your match style

---

**Built for grassroots football automation** ⚽
*Bringing professional-quality highlights to every club, every match.*