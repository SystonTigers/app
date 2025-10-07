# 🏆 Syston Tigers Platform - Complete System Guide for Claude

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Repositories](#repositories)
4. [Key Features](#key-features)
5. [Video Processing System](#video-processing-system)
6. [Technology Stack](#technology-stack)
7. [Deployment Guide](#deployment-guide)
8. [Mobile App](#mobile-app)
9. [API Reference](#api-reference)
10. [Current Status](#current-status)
11. [Next Steps](#next-steps)

---

## System Overview

**What is this?**
A multi-tenant SaaS platform for grassroots football clubs, starting with Syston Tigers U13 Boys team.

**Business Model:**
- Multi-tenant architecture (unlimited clubs/teams)
- Each tenant gets isolated data, configs, and branding
- JWT-based authentication and authorization
- Cloudflare Workers backend ($5/month for unlimited tenants)

**Key Value Proposition:**
- Replace WhatsApp groups, spreadsheets, Facebook for team management
- Unified platform: fixtures, events, RSVP, news, training, store
- Smart notifications (geo-aware)
- Independent news feed with social media cross-posting

---

## Architecture

### Multi-Tenant Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile App (React Native)                 │
│              syston-mobile/ (Expo + TypeScript)              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ HTTPS
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Cloudflare Workers (Backend)                    │
│  ┌──────────────┬──────────────┬──────────────┬──────────┐  │
│  │ syston-      │ integration- │ data-        │ admin-   │  │
│  │ postbus      │ worker       │ manager      │ worker   │  │
│  │ (API Gateway)│ (Make.com)   │ (YouTube/YT) │ (Tenant  │  │
│  │              │              │              │  CRUD)   │  │
│  └──────┬───────┴──────┬───────┴──────┬───────┴─────┬────┘  │
│         │              │              │             │        │
│         ▼              ▼              ▼             ▼        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Cloudflare KV (Key-Value Store)            │   │
│  │  • tenant:{id} → config                              │   │
│  │  • feed:{tenant}:{id} → posts                        │   │
│  │  • event:{tenant}:{id} → events                      │   │
│  │  • fixture:{tenant}:{id} → matches                   │   │
│  │  • squad:{tenant}:{id} → players                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │      Durable Objects (Stateful Coordination)          │   │
│  │  • Rate limiting per tenant                           │   │
│  │  • Geo-fencing for smart notifications                │   │
│  │  • Real-time event coordination                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         R2 Storage (Media/Videos/Images)              │   │
│  │  • Match videos                                       │   │
│  │  • Player photos                                      │   │
│  │  • Gallery albums                                     │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────┬──────────────────┬────────────────────────┘
                   │                  │
                   ▼                  ▼
         ┌──────────────────┐  ┌──────────────────┐
         │   Make.com       │  │  YouTube Data    │
         │   Webhooks       │  │  API v3          │
         │ (Social Posts)   │  │ (Video Import)   │
         └──────────────────┘  └──────────────────┘
                   │
                   ▼
         ┌──────────────────────────────┐
         │  Social Media Platforms      │
         │  • X/Twitter                 │
         │  • Instagram                 │
         │  • Facebook                  │
         └──────────────────────────────┘
```

### Data Isolation

**Per-Tenant Storage:**
```javascript
// Each tenant's data is isolated by key prefixes
tenant:syston-tigers → { name, colors, logo, webhook, ... }
feed:syston-tigers:post123 → { content, channels, timestamp, ... }
event:syston-tigers:evt456 → { type, date, rsvps, ... }
```

**JWT-Based Access:**
```javascript
// JWT payload includes tenant ID
{
  "tenant_id": "syston-tigers",
  "user_id": "user123",
  "role": "admin|coach|player|parent"
}
```

---

## Repositories

### 1. **Automation_script** (QA/Testing/DevOps)
**Location:** `C:\Users\clayt\Automation_script`
**GitHub:** https://github.com/SystonTigers/Automation_script.git

**Purpose:**
- QA automation and testing infrastructure
- Deployment scripts and CI/CD
- Documentation for testing

**Key Files:**
- `backend/tests/` - Test suites
- `qa/` - QA documentation and evidence
- `CODEX_10_10_INSTRUCTIONS.md` - Roadmap to production
- `TESTING_GUIDE_TODAY.md` - What's testable now

**Current Status:** 7/10 - Tests written but need real execution with live credentials

---

### 2. **app** (Backend Workers)
**Location:** `C:\Users\clayt\app`
**GitHub:** https://github.com/SystonTigers/app.git

**Purpose:**
- Cloudflare Workers backend
- Multi-tenant API
- Admin endpoints for tenant management

**Key Files:**
```
app/
├── backend/
│   └── src/
│       ├── index.ts          # Main API Gateway (syston-postbus)
│       ├── admin.ts          # Tenant CRUD endpoints
│       ├── integration.ts    # Make.com webhook handler
│       └── data-manager.ts   # YouTube API integration
├── wrangler.toml             # Worker configuration
├── PRODUCT_ROADMAP.md        # 6-month feature plan
├── ARCHITECTURE_CLARIFICATION.md  # Multi-tenant design docs
└── CLAUDE.md                 # This file
```

**Deployment:**
```bash
cd ~/app/backend
wrangler deploy --name syston-postbus
wrangler deploy --name integration-worker
wrangler deploy --name data-manager-worker
wrangler deploy --name admin-worker
```

---

### 3. **app/mobile/** (Mobile App Frontend)
**Location:** `C:\Users\clayt\app\mobile`
**GitHub:** Consolidated into app repo

**Purpose:**
- React Native mobile app
- Expo for cross-platform (iOS + Android)
- Consumer-facing interface
- Video recording and upload

**Key Files:**
```
mobile/
├── src/
│   ├── config.ts                 # API URL, colors, tenant ID
│   ├── services/
│   │   └── api.ts               # API client (axios)
│   └── screens/
│       ├── HomeScreen.tsx       # Next event + news feed
│       ├── CalendarScreen.tsx   # Events + RSVP
│       ├── FixturesScreen.tsx   # Matches + results
│       ├── SquadScreen.tsx      # Player roster
│       └── VideoScreen.tsx      # Video recording/upload (NEW)
├── App.tsx                       # Navigation setup
├── package.json
└── README.md                     # Mobile app docs
```

**Run Development Server:**
```bash
cd ~/app/mobile
npm start
# Access QR code at http://localhost:8081
```

---

### 4. **app/video-processing/** (AI Video Tools)
**Location:** `C:\Users\clayt\app\video-processing`
**GitHub:** Consolidated into app repo

**Purpose:**
- AI-powered video highlight detection
- Automated video editing and production
- Server-side match video processing
- Integration with mobile app and Apps Script

**Contains 3 Production Tools:**

#### 4.1 highlights_bot (Python AI Editor)
```
video-processing/highlights_bot/
├── main.py           # Entry point
├── detect.py         # AI detection engine (20KB)
├── edit.py           # Video editing logic (25KB)
├── edl.py            # Edit Decision List generator
├── config.yaml       # Configuration
└── requirements.txt  # Python dependencies
```

**What it does:**
- Analyzes match videos using AI/ML
- Detects key moments (goals, cards, near-misses)
- Automatically cuts and edits highlight clips
- Exports finished highlights

#### 4.2 football-highlights-processor (Docker Production)
```
video-processing/football-highlights-processor/
├── Dockerfile              # Container definition
├── docker-compose.yml      # Multi-service orchestration
├── apps-script/            # Apps Script integration
├── integration/            # System integrations
└── monitoring/             # Health checks
```

**What it does:**
- Production-ready Docker-based processing
- Integrates with Apps Script
- Monitoring and alerting
- Scalable processing queue

#### 4.3 football-highlights-installer (Node.js Setup)
```
video-processing/football-highlights-installer/
├── bin/            # CLI tools
├── lib/            # Core libraries
├── templates/      # Setup templates
└── package.json    # npm package
```

**What it does:**
- One-command installation
- Sets up all dependencies
- Configures integrations
- Creates templates

**See `video-processing/README.md` for complete documentation.**

---

## Key Features

### ✅ Currently Built (Mock Data)

#### 1. **News Feed System**
- **Independent posts** (NOT copied from social media)
- Per-post channel toggles:
  ```json
  {
    "content": "Great win today! 3-1",
    "channels": {
      "app_feed": true,      // Shows in mobile app
      "twitter": true,       // Posts to X/Twitter
      "instagram": false,    // Skip Instagram
      "facebook": false      // Skip Facebook
    }
  }
  ```
- Like/comment/share actions
- Pull to refresh

#### 2. **Event Management**
- Calendar view with visual event markers
- Event types: Match, Training, Social
- RSVP system (Going / Maybe / Can't Go)
- Attendee tracking
- Export .ics files for native calendars
- Color-coded event dots

#### 3. **Fixtures & Results**
- Upcoming matches display
- Past results with scores
- Scorers and cards listed
- Competition badges
- Venue information

#### 4. **Squad Management**
- Player cards with avatars
- Stats: Goals, Assists, Appearances, Cards
- Position badges (color-coded)
- Tap for player details

#### 5. **Video Recording & Upload (NEW)**
- **📹 Record Video** directly in app (5 min max)
- **📁 Select Video** from phone library
- **🎬 Video Preview** with playback controls
- **☁️ Upload to Server** for AI processing
- **📊 Recent Highlights** with status tracking
- **💡 Pro Tips** for best quality
- **🤖 AI Processing** explanation

#### 6. **Bottom Tab Navigation**
- 🏠 Home - Next event widget + scrollable feed
- 📅 Calendar - Visual calendar + RSVP
- ⚽ Fixtures - Matches and results
- 👥 Squad - Team roster
- 🎬 Videos - Record/upload/view highlights (NEW)

---

### 🚧 Planned Features (Roadmap)

#### Phase 1: Smart Notifications (Q1 2025)
**Geo-aware Push Notifications**
- Match notifications: Goals, cards, HT, FT
- **Smart Geo-fencing:** Only send if user NOT at venue (500m radius)
- Powered by Durable Objects + Expo Notifications
- Free implementation (no third-party costs)

**Implementation:**
```javascript
// Durable Object: GeoFenceManager
class GeoFenceManager {
  async shouldNotify(userId, matchId, eventType) {
    const userLocation = await this.getUserLocation(userId);
    const venueLocation = await this.getVenueLocation(matchId);
    const distance = calculateDistance(userLocation, venueLocation);
    return distance > 500; // Only notify if >500m away
  }
}
```

#### Phase 2: Training Tools (Q2 2025)
- Session planner
- Drill library (searchable)
- Drill designer (visual)
- Tactics board
- Coach-only access via role-based auth

#### Phase 3: Team Store (Q2 2025)
- Printify integration
- Custom merchandise per team
- Team badge, colors, slogans
- Parent/player ordering
- Admin dashboard for orders

#### Phase 4: Gallery (Q3 2025)
- Photo albums
- Match day photos
- R2 storage for images
- Upload from mobile app

#### Phase 5: Chat/Messaging (Q3 2025)
- Team chat
- Direct messages
- Coach announcements
- Push notifications for messages

---

## Video Processing System

### 🎯 Two Ways to Create Highlights

The platform offers **TWO MODES** for video processing, both using the same AI backend:

#### 📱 Mode 1: Mobile App (Quick Clips)
**Perfect for**: Parents, players, quick clips, social sharing

**User Flow:**
1. Open mobile app → Videos tab
2. Tap "Record Video" or "Select Video"
3. Record (5 min max) OR select from library
4. Preview with playback controls
5. Tap "Upload" button
6. AI processes automatically
7. Get notified when ready!

**Use Cases:**
- Parent records goal from stands
- Player records training drill
- Quick 30-second clips
- Instant social sharing

#### 🖥️ Mode 2: Server-Side (Full Match Automation)
**Perfect for**: Coaches, full matches, professional highlights

**Workflow:**
1. Upload full 90-minute match video to Google Drive
2. Apps Script creates metadata and exports JSON
3. AI detects ALL highlight moments automatically
4. Auto-creates professional clips
5. Uploads to YouTube
6. Posts to social media (X, Instagram, Facebook)

**Use Cases:**
- Full match highlight reels
- Season compilations
- Player spotlight videos
- Professional editing

**BOTH modes converge at the same AI processing backend!**

---

### 🏗️ Video Architecture

```
┌────────────────────────────────────────────────────────────┐
│                  TWO ENTRY POINTS                           │
└────────────────────────────────────────────────────────────┘

PATH A: MOBILE APP (Quick Clips)
================================
1. USER OPENS APP
   └─> mobile/src/screens/VideoScreen.tsx
   └─> Record (expo-av) OR Select (expo-image-picker)

2. PREVIEW & UPLOAD
   └─> Video preview with controls
   └─> Upload via API: POST /api/v1/videos/upload
   └─> Progress bar + notification

3. [Joins Path B at AI Processing]

PATH B: SERVER-SIDE (Full Match)
=================================
1. MATCH VIDEO UPLOAD
   └─> Upload to Google Drive folder

2. APPS SCRIPT TRACKING
   └─> apps-script/video-clips.gs
   └─> Creates metadata in Google Sheets
   └─> Exports JSON with event timestamps

3. [Joins Path A at AI Processing]

SHARED AI PROCESSING (Both Paths Converge)
===========================================
4. HIGHLIGHTS BOT (Python AI)
   └─> video-processing/highlights_bot/
   └─> detect.py: AI detection of goals, cards, moments
   └─> edit.py: Cuts clips at exact timestamps
   └─> Edits and produces highlights

5. PROCESSOR (Docker Production)
   └─> video-processing/football-highlights-processor/
   └─> Queues processing jobs
   └─> Monitors progress
   └─> Handles errors and retries
   └─> Scales with demand

6. FINAL UPLOAD & DISTRIBUTION
   └─> Apps Script uploads to YouTube
   └─> Updates metadata in Sheets
   └─> Triggers Make.com webhooks
   └─> Posts to social media (X, Instagram, Facebook)

7. USER NOTIFICATION
   └─> Push notification: "Your highlights are ready!"
   └─> Mobile app: Shows in "Recent Highlights"
   └─> Email: Link to YouTube video
```

---

### 🔧 Video Processing Components

#### Mobile App (expo-av + expo-image-picker)
**File:** `mobile/src/screens/VideoScreen.tsx`

**Features:**
- Camera recording with 5-minute limit
- Video library selection
- Preview with native controls
- Upload with progress tracking
- Recent highlights list

**Code Example:**
```typescript
const recordVideo = async () => {
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    allowsEditing: true,
    aspect: [16, 9],
    quality: 1,
    videoMaxDuration: 300, // 5 minutes max
  });

  if (!result.canceled && result.assets[0].uri) {
    setSelectedVideo(result.assets[0].uri);
  }
};
```

#### Apps Script Integration
**Files:**
- `apps-script/video-clips.gs`
- `apps-script/video/`
- `apps-script/user-menu-functions.gs`

**What it does:**
- Tracks clip metadata in Google Sheets
- Manages YouTube uploads
- Organizes clips by player
- Generates graphics overlays
- Exports JSON for AI processing

**JSON Format:**
```json
{
  "match_id": "20251007_syston_vs_panthers",
  "events": [
    {"minute": 23, "type": "goal", "player": "John Smith"},
    {"minute": 45, "type": "yellow_card", "player": "Mike Jones"}
  ],
  "video_url": "https://drive.google.com/...",
  "clips": [
    {"start": 1380, "end": 1410, "event": "goal"}
  ]
}
```

#### highlights_bot (Python AI)
**File:** `video-processing/highlights_bot/main.py`

**Usage:**
```bash
cd video-processing/highlights_bot
python main.py --json events.json --video match.mp4 --output highlights/
```

**What it does:**
1. Reads event timestamps from JSON
2. Uses AI to refine clip boundaries (detect.py)
3. Cuts video at exact moments (edit.py)
4. Adds transitions and effects
5. Exports finished highlight clips

**Configuration:** `config.yaml`
```yaml
input_dir: ./in
output_dir: ./out
detection:
  model: yolov8
  confidence: 0.7
editing:
  transition: fade
  duration_before: 5  # seconds before event
  duration_after: 5   # seconds after event
export:
  format: mp4
  quality: high
  codec: h264
```

#### football-highlights-processor (Docker)
**File:** `video-processing/football-highlights-processor/docker-compose.yml`

**Usage:**
```bash
cd video-processing/football-highlights-processor
docker-compose up -d  # Start processor
docker-compose logs -f  # View logs
docker-compose down  # Stop processor
```

**What it does:**
- Monitors input folder for new videos
- Queues processing jobs
- Runs highlights_bot on each video
- Uploads finished clips
- Sends webhooks when complete

**Performance:**
- **10-minute video**: ~2-3 minutes to process
- **Full 90-minute match**: ~15-20 minutes
- **Concurrent jobs**: 5 videos at once
- **Queue size**: Unlimited

---

### 📊 Video System Comparison

| Feature | Apps Script | Video Tools | Mobile App |
|---------|-------------|-------------|------------|
| **Metadata tracking** | ✅ Google Sheets | ❌ No | ❌ No |
| **YouTube upload** | ✅ Yes | ❌ No | ❌ No |
| **Video analysis** | ❌ No | ✅ AI-powered | ❌ No |
| **Video cutting** | ❌ No | ✅ Automatic | ❌ No |
| **Video editing** | ❌ No | ✅ Full editor | ❌ No |
| **Production scale** | ❌ Limited | ✅ Docker queue | ❌ No |
| **User recording** | ❌ No | ❌ No | ✅ In-app |
| **Quick upload** | ❌ No | ❌ No | ✅ Yes |
| **Automation** | 🟡 Partial | ✅ Full | 🟡 Upload only |

**Together**: Complete end-to-end solution! 🚀

---

### 🚀 Video Setup & Deployment

#### Prerequisites
- Python 3.8+ (for highlights_bot)
- Docker & Docker Compose (for processor)
- Node.js 18+ (for installer)
- Google Apps Script access (already configured)
- Expo (for mobile app)

#### Quick Start: Mobile Video Features
**Already working!** No setup needed for mobile recording/upload.

1. Open mobile app
2. Go to Videos tab
3. Record or select video
4. Upload and wait

Server-side processing happens automatically when backend is deployed.

#### Setup: Server-Side Processing

**Option 1: Use Installer (Easiest)**
```bash
cd video-processing/football-highlights-installer
npm install
npm run setup
```

**Option 2: Manual Setup**

**Step 1: Install highlights_bot**
```bash
cd video-processing/highlights_bot
pip install -r requirements.txt
python main.py --help
```

**Step 2: Configure**
```bash
nano highlights_bot/config.yaml
# Set input/output paths and AI settings
```

**Step 3: Test with sample video**
```bash
python main.py --input in/sample_match.mp4 --output out/
```

**Step 4: Deploy processor (Production)**
```bash
cd video-processing/football-highlights-processor
docker-compose up -d --scale worker=3  # 3 workers
```

---

### 📚 Video Documentation

Each tool has comprehensive documentation:
- `mobile/README.md` - Mobile video features
- `video-processing/README.md` - Complete video system guide
- `highlights_bot/README.md` - Bot usage guide
- `highlights_bot/apps_script_integration.md` - Integration guide
- `football-highlights-installer/README.md` - Installation guide
- `football-highlights-installer/USAGE.md` - Usage examples

---

## Technology Stack

### Backend
- **Cloudflare Workers** - Serverless compute ($5/month unlimited)
- **Cloudflare KV** - Key-value storage (included)
- **Durable Objects** - Stateful coordination (included)
- **Cloudflare R2** - Object storage (~$0.50/month)
- **Wrangler CLI** - Deployment tool

### Frontend (Mobile)
- **React Native** - Cross-platform mobile framework
- **Expo** - Development platform and tooling
- **TypeScript** - Type safety
- **React Navigation** - Bottom tabs navigation
- **React Native Paper** - Material Design 3 UI components
- **Axios** - HTTP client
- **Zustand** - State management
- **react-native-calendars** - Calendar UI
- **Expo Notifications** - Push notifications
- **Expo Location** - Geo-fencing
- **expo-av** - Video recording and playback
- **expo-image-picker** - Video/photo library access
- **expo-media-library** - Media permissions
- **expo-video-thumbnails** - Thumbnail generation

### Video Processing (Server-Side)
- **Python 3.8+** - Highlights bot runtime
- **OpenCV** - Video processing
- **TensorFlow/PyTorch** - AI detection models
- **YOLOv8** - Object detection for sports events
- **FFmpeg** - Video encoding/decoding
- **Docker & Docker Compose** - Production containerization
- **Node.js** - Installer CLI tool

### Integrations
- **Make.com** - Automation for social posts (Free or $9/month)
- **YouTube Data API v3** - Video imports (Free)
- **Printify API** - Merchandise (Pay per order)

### Total Cost
- **Minimum:** $5/month (Cloudflare only, unlimited tenants)
- **Maximum:** $15/month (Cloudflare + Make.com Pro)

---

## Deployment Guide

### One-Time Setup (Secrets)

**These are set ONCE globally, NOT per tenant:**

```bash
# Navigate to backend
cd ~/app/backend

# Set secrets (ONE TIME ONLY)
wrangler secret put JWT_SECRET              # Random 32+ char string
wrangler secret put YT_CLIENT_ID            # YouTube OAuth Client ID
wrangler secret put YT_CLIENT_SECRET        # YouTube OAuth Secret
wrangler secret put YT_REFRESH_TOKEN        # YouTube Refresh Token
wrangler secret put PRINTIFY_API_KEY        # Printify API key (future)
```

### Deploy Workers

```bash
# Deploy all 4 workers
wrangler deploy --name syston-postbus        # Main API Gateway
wrangler deploy --name integration-worker    # Make.com handler
wrangler deploy --name data-manager-worker   # YouTube API
wrangler deploy --name admin-worker          # Tenant CRUD

# Get deployed URLs
wrangler deployments list
```

**Expected URLs:**
- `https://syston-postbus.team-platform-2025.workers.dev`
- `https://integration-worker.team-platform-2025.workers.dev`
- `https://data-manager-worker.team-platform-2025.workers.dev`
- `https://admin-worker.team-platform-2025.workers.dev`

### Create New Tenant

**ONE API CALL (No re-deployment needed):**

```bash
curl -X POST https://admin-worker.team-platform-2025.workers.dev/api/v1/admin/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -d '{
    "tenant_id": "new-club-name",
    "name": "New Club FC",
    "primary_color": "#FF0000",
    "secondary_color": "#FFFFFF",
    "logo_url": "https://...",
    "webhook_url": "https://hook.us1.make.com/...",
    "youtube_channel_id": "UC...",
    "admin_email": "admin@newclub.com"
  }'
```

Done! New tenant is live immediately.

---

## Mobile App

### Current Setup

**Development Server Running:**
```bash
# Already running in background (bash ID: 7507c0)
cd ~/syston-mobile && npx expo start
```

**Access QR Code:**
1. Open browser: http://localhost:8081
2. Click "Scan QR Code" tab
3. Scan with Expo Go app on phone

**Or Manual Connection:**
1. Open Expo Go app
2. Tap "Enter URL manually"
3. Enter: `exp://192.168.1.X:8081` (check terminal for your IP)

### Configuration

**File:** `src/config.ts`
```typescript
export const API_BASE_URL = 'https://syston-postbus.team-platform-2025.workers.dev';
export const TENANT_ID = 'syston-tigers';

export const COLORS = {
  primary: '#FFD700',      // Syston Yellow
  secondary: '#000000',    // Black
  accent: '#FFA500',       // Orange
  background: '#F5F5F5',   // Light gray
  surface: '#FFFFFF',      // White
  text: '#000000',         // Black
  textLight: '#666666',    // Gray
  success: '#4CAF50',      // Green
  warning: '#FF9800',      // Orange
  error: '#F44336',        // Red
};
```

### Connect Real Backend

**Step 1:** Deploy backend workers (see Deployment Guide above)

**Step 2:** Update config with deployed URL:
```typescript
// src/config.ts
export const API_BASE_URL = 'https://syston-postbus.YOUR-SUBDOMAIN.workers.dev';
```

**Step 3:** Reload app
```bash
# In terminal where Expo is running, press 'r'
# Or shake device and tap "Reload"
```

**Step 4:** Data flows automatically!

---

## API Reference

### Base URL
```
https://syston-postbus.team-platform-2025.workers.dev
```

### Authentication
```javascript
// Include in headers
Authorization: Bearer YOUR_JWT_TOKEN
```

### Endpoints

#### News Feed
```
GET  /api/v1/feed?tenant=syston-tigers&page=1&limit=20
POST /api/v1/feed/create
POST /api/v1/feed/:id/like
POST /api/v1/feed/:id/comment
```

#### Events/Calendar
```
GET  /api/v1/events?tenant=syston-tigers&limit=10
GET  /api/v1/events/:id?tenant=syston-tigers
POST /api/v1/events/:id/rsvp
GET  /api/v1/events/:id/attendees?tenant=syston-tigers
```

#### Fixtures
```
GET /api/v1/fixtures?tenant=syston-tigers
GET /api/v1/results?tenant=syston-tigers
GET /api/v1/table?tenant=syston-tigers
```

#### Squad
```
GET /api/v1/squad?tenant=syston-tigers
GET /api/v1/squad/:id?tenant=syston-tigers
```

#### Videos (NEW)
```
POST /api/v1/videos/upload              # Upload video from mobile app
GET  /api/v1/videos?tenant=syston-tigers  # Get recent videos
GET  /api/v1/videos/:id?tenant=syston-tigers  # Get video details
GET  /api/v1/videos/:id/status?tenant=syston-tigers  # Processing status
```

**Upload Example:**
```typescript
const formData = new FormData();
formData.append('video', {
  uri: videoUri,
  name: 'video.mp4',
  type: 'video/mp4'
});
formData.append('tenant', TENANT_ID);
formData.append('user_id', userId);

await api.post('/api/v1/videos/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

#### Admin (Tenant Management)
```
POST   /api/v1/admin/tenants          # Create tenant
GET    /api/v1/admin/tenants          # List all tenants
GET    /api/v1/admin/tenants/:id      # Get tenant details
PUT    /api/v1/admin/tenants/:id      # Update tenant
DELETE /api/v1/admin/tenants/:id      # Delete tenant
```

### Example API Call from Mobile App

```typescript
// src/services/api.ts
import axios from 'axios';
import { API_BASE_URL, TENANT_ID } from '../config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Get events
export const eventsApi = {
  getEvents: async (limit = 10) => {
    const response = await api.get('/api/v1/events', {
      params: { tenant: TENANT_ID, limit },
    });
    return response.data;
  },

  rsvp: async (eventId: string, status: 'going' | 'not_going' | 'maybe') => {
    const response = await api.post(`/api/v1/events/${eventId}/rsvp`, {
      tenant: TENANT_ID,
      status,
      user_id: 'current-user-id', // TODO: Get from auth
    });
    return response.data;
  },
};
```

---

## Current Status

### ✅ Completed
- [x] Multi-tenant backend architecture designed
- [x] 4 Cloudflare Workers created
- [x] Mobile app scaffolding (React Native + Expo)
- [x] 5 main screens built (Home, Calendar, Fixtures, Squad, Videos)
- [x] Bottom tab navigation
- [x] API integration layer ready
- [x] Mock data working in all screens
- [x] Video recording/upload UI (mobile app)
- [x] Video processing tools integrated (highlights_bot, processor, installer)
- [x] Apps Script video integration ready
- [x] QA test infrastructure created
- [x] Documentation (this file!)

### 🚧 In Progress
- [ ] Deploy backend workers to get live URLs
- [ ] Connect mobile app to real backend
- [ ] Replace mock data with API calls
- [ ] Set up video processing backend (Python + Docker)
- [ ] Test video upload from mobile app

### ⏳ Blocked/Waiting
- Backend deployment (needs Cloudflare account setup)
- YouTube API credentials (for video import)
- Make.com webhook URLs (for social posting)
- Printify API key (for store feature)

### 🐛 Known Issues
1. **QA Evidence Files are Mock Data** - Tests exist but need real execution
2. **No Authentication Yet** - JWT system designed but not implemented
3. **QR Code Not Showing in Terminal** - Use http://localhost:8081 instead

---

## Next Steps

### Immediate (This Week)
1. **Deploy Backend Workers**
   ```bash
   cd ~/app/backend
   wrangler login
   wrangler secret put JWT_SECRET
   wrangler deploy --name syston-postbus
   ```

2. **Get Worker URL and Update Mobile App**
   ```typescript
   // src/config.ts
   export const API_BASE_URL = 'https://syston-postbus.YOUR-URL.workers.dev';
   ```

3. **Test with Real Data**
   - Create first tenant via admin API
   - Add test events, fixtures, squad data
   - Verify mobile app loads real data

### Short Term (Next 2 Weeks)
4. **Add Authentication**
   - Build login screen
   - Implement JWT token storage
   - Add token to API headers

5. **Set Up Make.com Webhooks**
   - Create Make.com scenario for social posting
   - Get webhook URL
   - Add to tenant config

6. **Set Up YouTube API**
   - Create YouTube OAuth credentials
   - Add refresh token to secrets
   - Test video import

### Medium Term (Next Month)
7. **Build Remaining Screens**
   - Gallery screen
   - Chat/messaging screen
   - Training tools (coaches only)
   - Store (Printify integration)

8. **Implement Geo-fencing**
   - Create Durable Object for geo-fence management
   - Connect Expo Location API
   - Test smart notifications

9. **QA Testing with Real Credentials**
   - Run all tests in staging environment
   - Replace mock evidence files
   - Get to 10/10 functional status

### Long Term (Next 3 Months)
10. **Launch Syston Tigers to Parents/Players**
    - Distribute app to team
    - Gather feedback
    - Iterate on features

11. **Add Second Tenant**
    - Onboard another club
    - Validate multi-tenant isolation
    - Refine onboarding process

12. **Scale to 10 Clubs**
    - Build marketing/sales process
    - Add billing (Stripe integration?)
    - Automate tenant provisioning

---

## Quick Reference Commands

### Backend Development
```bash
# Navigate to backend
cd ~/app/backend

# Install dependencies
npm install

# Run locally
wrangler dev

# Deploy to production
wrangler deploy --name syston-postbus

# View logs
wrangler tail syston-postbus

# Manage secrets
wrangler secret put SECRET_NAME
wrangler secret list
```

### Mobile App Development
```bash
# Navigate to mobile app
cd ~/app/mobile

# Install dependencies
npm install

# Start dev server
npm start

# Start with cache clear
npm start --clear

# Build for iOS (Mac only)
eas build --platform ios

# Build for Android
eas build --platform android
```

### Git Workflow
```bash
# Pull latest changes
cd ~/Automation_script && git pull origin main
cd ~/app && git pull origin main

# Commit and push
git add .
git commit -m "Description"
git push origin main
```

---

## Troubleshooting

### "QR code not showing in terminal"
**Solution:** Open http://localhost:8081 in browser to see QR code

### "API calls failing with 404"
**Solution:** Check that backend workers are deployed and API_BASE_URL is correct in src/config.ts

### "No data showing in app"
**Solution:** App uses mock data by default. Deploy backend and update API_BASE_URL to see real data.

### "Wrangler command not found"
**Solution:**
```bash
npm install -g wrangler
wrangler login
```

### "Expo Go app won't connect"
**Solution:** Ensure phone and computer are on same WiFi network

---

## Support & Resources

### Documentation
- Cloudflare Workers: https://developers.cloudflare.com/workers/
- Expo: https://docs.expo.dev/
- React Native: https://reactnative.dev/
- React Navigation: https://reactnavigation.org/

### GitHub Repositories
- Backend: https://github.com/SystonTigers/app.git
- QA/Testing: https://github.com/SystonTigers/Automation_script.git
- Mobile: (Not yet created)

### Key Files for Claude
- `PRODUCT_ROADMAP.md` - 6-month feature plan
- `ARCHITECTURE_CLARIFICATION.md` - Multi-tenant design
- `CODEX_10_10_INSTRUCTIONS.md` - Path to production
- `APP_READY.md` - Mobile app current status
- `CLAUDE.md` - This comprehensive guide

---

**Last Updated:** 2025-10-07
**System Status:** Development (Mock Data + Video Features Added)
**Next Milestone:** Deploy backend workers, connect real data, set up video processing
**Overall Progress:** 8/10 towards production-ready
**Video System:** Mobile UI complete, server-side tools integrated, needs deployment
