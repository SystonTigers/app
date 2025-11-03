# Complete Front-End Build Instructions
## Football Highlights Video Processing Platform

**Version:** 1.0
**Date:** 2025-11-03
**Target:** Google AI Studio / AI Assistant
**Objective:** Build a complete, production-ready front-end application

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Backend Capabilities](#backend-capabilities)
3. [Technical Architecture](#technical-architecture)
4. [Front-End Requirements](#front-end-requirements)
5. [Technology Stack](#technology-stack)
6. [Application Structure](#application-structure)
7. [Feature Specifications](#feature-specifications)
8. [UI/UX Design Guidelines](#uiux-design-guidelines)
9. [API Integration Points](#api-integration-points)
10. [Component Library](#component-library)
11. [Data Flow & State Management](#data-flow--state-management)
12. [Implementation Steps](#implementation-steps)

---

## 1. System Overview

### What This System Does

This is an **AI-powered football highlights video processing platform** that automatically:
- Detects key events in football matches (goals, saves, skills, cards, chances)
- Generates vertical shorts optimized for TikTok/Instagram/YouTube
- Applies AI-powered smart cropping to track the action
- Adds animated text effects and captions
- Generates platform-specific hashtags
- Creates multi-language captions (12 languages)
- Exports videos for multiple social media platforms

### User Workflow

```
Upload Video → AI Processing → Review Events → Generate Shorts → Export & Share
```

### Key Value Propositions

1. **Time Savings**: Reduces 2-3 hours of manual editing to 10-15 minutes
2. **AI-Powered**: Automatic event detection and smart cropping
3. **Multi-Platform**: One-click export for TikTok, Instagram, YouTube
4. **Global Reach**: Multi-language support for 12 languages
5. **Viral Optimization**: Trending hashtags and animated effects

---

## 2. Backend Capabilities

### Core Processing Pipeline

The backend Python system provides these capabilities:

#### **Phase 1: Event Detection**
- AI-powered event detection using:
  - Audio analysis (crowd noise, whistle detection)
  - Visual flow analysis (motion tracking)
  - Multi-signal fusion (combining audio + visual)
- Event types detected:
  - Goals
  - Saves
  - Skills/dribbles
  - Cards (yellow/red)
  - Big chances
  - Tackles
  - Assists
  - Free kicks
  - Penalties

#### **Phase 2: Video Editing**
- Automatic clip extraction around events
- Slow-motion effects
- Zoom effects
- Fade transitions
- Audio normalization (LUFS -14 for social media)

#### **Phase 3: Vertical Shorts Generation**
- **AI-Powered Smart Cropping** (YOLOv8):
  - Automatic ball/player detection
  - Dynamic action tracking
  - Smooth panning with EMA smoothing
  - Fallback to center crop if needed
- Resolution: 1080x1920 (9:16 for mobile)
- Duration: 5-15 seconds per short

#### **Phase 4: Text & Captions**
- **Animated Text Effects** (6 types):
  - `pop`: Scale up from small to large (goals)
  - `slide_in`: Slide from side (player names)
  - `bounce`: Bounce with spring effect (celebrations)
  - `typewriter`: Character-by-character reveal
  - `pulse`: Continuous pulse/throb (cards)
  - `fade_in`: Fade from transparent (subtle)
- Auto-selection based on event type
- Position controls (top, center, bottom)
- Font customization

#### **Phase 5: Hashtag Automation**
- Generates up to 30 hashtags per clip
- Platform-specific formatting:
  - **TikTok**: Space-separated with #
  - **Instagram**: Line breaks + hashtags
  - **YouTube**: Comma-separated, no # symbols
  - **Twitter**: Limited to 15 hashtags
- Categories:
  - Event hashtags (#Goal, #Save, etc.)
  - Team hashtags (#Liverpool, #LFC)
  - Player hashtags (#MohamedSalah)
  - Competition hashtags (#PremierLeague, #UCL)
  - Generic football (#Football, #Soccer)
  - Platform hashtags (#TikTok, #Reels, #Viral)

#### **Phase 6: Multi-Language Captions**
- 12 languages supported:
  - English, Spanish, Portuguese, French
  - Arabic, German, Italian, Dutch
  - Turkish, Japanese, Korean, Chinese (Simplified)
- Football-specific phrase translations
- SRT file generation
- Caption file generation per language

#### **Phase 7: Brand Overlays**
- Club badges
- Competition logos
- Watermarks
- Custom branding

#### **Phase 8: Platform Exports**
- TikTok format (1080x1920, max 60s)
- Instagram Reels (1080x1920, max 90s)
- YouTube Shorts (1080x1920, max 60s)
- Thumbnail generation

---

## 3. Technical Architecture

### Backend Structure

```
highlights_bot/
├── main.py                      # Main processing pipeline
├── detect.py                    # Event detection (visual)
├── detect_audio.py              # Audio-based detection
├── detect_flow.py               # Optical flow detection
├── detect_fusion.py             # Multi-signal fusion
├── edit.py                      # Video editing functions
├── shorts.py                    # Vertical shorts generation
├── ai_cropping.py               # AI-powered smart cropping (YOLOv8)
├── animated_text.py             # Animated text effects (6 types)
├── hashtag_generator.py         # Hashtag automation
├── multilang_captions.py        # Multi-language support
├── captions.py                  # Caption generation
├── audio.py                     # Audio processing
├── overlays.py                  # Brand overlays
├── effects.py                   # Video effects
└── config.yaml                  # Configuration file
```

### Data Flow

```
Input Video (.mp4)
    ↓
Event Detection (AI)
    ↓
Event List (JSON) → {type, timestamp, score, player, team}
    ↓
Clip Extraction
    ↓
Vertical Shorts Generation
    ├→ AI Smart Cropping (YOLOv8)
    ├→ Animated Text Effects
    ├→ Hashtag Generation
    ├→ Multi-Language Captions
    └→ Platform Export
    ↓
Output Files:
    ├── short_01.mp4, short_02.mp4, ...
    ├── short_01_hashtags_tiktok.txt
    ├── short_01_hashtags_instagram.txt
    ├── short_01_caption_en.txt
    ├── short_01_caption_es.txt
    └── thumbnails/
```

### Configuration System

The backend uses a `config.yaml` file for all settings:

```yaml
# Event Detection
detection:
  audio_threshold: 0.7
  flow_threshold: 0.6
  fusion_enabled: true
  min_event_gap: 10  # seconds

# Shorts Generation
shorts:
  count: 10
  min_score: 2.0
  resolution: [1080, 1920]

  # AI Cropping
  ai_cropping:
    enabled: true
    yolo_model: "yolov8n.pt"
    smoothing_alpha: 0.3
    priority: "ball"  # ball | players | center_of_mass

  # Animated Text
  animated_text:
    enabled: true
    font_size: 56
    position: "bottom"  # top | center | bottom
    auto_effect: true

  # Hashtags
  hashtags:
    enabled: true
    max_count: 30

  # Multi-Language
  multilang:
    enabled: true
    use_api: false  # Google Translate API
    languages:
      - en
      - es
      - pt
      - fr

# Branding
brand:
  club_badge: "brand/badges/liverpool.png"
  watermark: "brand/watermark.png"

# Export
export:
  platforms:
    - tiktok
    - instagram
    - youtube
```

---

## 4. Front-End Requirements

### Primary User Types

1. **Football Content Creators**
   - Individual creators making highlight videos
   - Need: Fast, easy-to-use interface
   - Tech skill level: Low to medium

2. **Football Clubs / Media Teams**
   - Professional content production
   - Need: Batch processing, customization
   - Tech skill level: Medium to high

3. **Social Media Managers**
   - Cross-platform posting
   - Need: Platform optimization, scheduling
   - Tech skill level: Medium

### Core User Stories

**As a content creator, I want to:**
1. Upload a football match video
2. See AI-detected events automatically
3. Review and edit the event list
4. Configure my preferences (language, platforms, branding)
5. Generate vertical shorts with one click
6. Preview shorts before exporting
7. Download shorts with hashtags and captions
8. Track my content performance

**As a football club, I want to:**
1. Upload multiple matches in batch
2. Customize branding (logos, colors, watermarks)
3. Select which events to include
4. Export in multiple languages simultaneously
5. Schedule posts to social media
6. Manage my video library

---

## 5. Technology Stack

### Recommended Stack (Modern, Production-Ready)

#### **Front-End Framework**
- **Next.js 14** (App Router)
  - Why: Server-side rendering, API routes, excellent performance
  - Alternative: React + Vite

#### **UI Framework**
- **Tailwind CSS** + **shadcn/ui**
  - Why: Modern, customizable, production-ready components
  - Alternative: Material-UI, Chakra UI

#### **State Management**
- **Zustand** or **React Query**
  - Why: Lightweight, easy to use, great for async state
  - Alternative: Redux Toolkit

#### **Video Player**
- **Plyr** or **Video.js**
  - Why: Customizable, mobile-friendly
  - Alternative: React Player

#### **Backend Communication**
- **REST API** or **WebSocket** (for real-time progress)
  - Python backend with FastAPI or Flask

#### **File Upload**
- **react-dropzone**
  - Why: Drag-and-drop, progress tracking

#### **Charts/Analytics**
- **Recharts** or **Chart.js**
  - Why: Beautiful, responsive charts

#### **Icons**
- **Lucide React** or **React Icons**

#### **Form Handling**
- **React Hook Form** + **Zod**
  - Why: Performance, validation

#### **Notifications**
- **react-hot-toast**

---

## 6. Application Structure

### File Structure

```
frontend/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication routes
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/              # Main app routes
│   │   ├── upload/               # Upload page
│   │   ├── events/               # Event review
│   │   ├── shorts/               # Shorts generation
│   │   ├── library/              # Video library
│   │   ├── settings/             # Settings
│   │   └── analytics/            # Analytics
│   ├── api/                      # API routes (proxy to Python backend)
│   │   ├── upload/
│   │   ├── detect/
│   │   ├── generate/
│   │   └── export/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── upload/
│   │   ├── VideoUploader.tsx
│   │   ├── UploadProgress.tsx
│   │   └── UploadQueue.tsx
│   ├── events/
│   │   ├── EventTimeline.tsx
│   │   ├── EventCard.tsx
│   │   ├── EventFilter.tsx
│   │   └── EventEditor.tsx
│   ├── shorts/
│   │   ├── ShortsGrid.tsx
│   │   ├── ShortPreview.tsx
│   │   ├── ShortEditor.tsx
│   │   └── ExportOptions.tsx
│   ├── player/
│   │   ├── VideoPlayer.tsx
│   │   └── Timeline.tsx
│   ├── settings/
│   │   ├── ConfigEditor.tsx
│   │   ├── BrandingUpload.tsx
│   │   └── LanguageSelector.tsx
│   └── common/
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       ├── LoadingSpinner.tsx
│       └── ErrorBoundary.tsx
├── lib/
│   ├── api.ts                    # API client
│   ├── utils.ts                  # Utility functions
│   └── constants.ts              # Constants
├── hooks/
│   ├── useUpload.ts
│   ├── useEvents.ts
│   ├── useShorts.ts
│   └── useWebSocket.ts
├── stores/
│   ├── uploadStore.ts
│   ├── eventStore.ts
│   └── configStore.ts
├── types/
│   ├── event.ts
│   ├── short.ts
│   └── config.ts
└── public/
    ├── images/
    └── icons/
```

---

## 7. Feature Specifications

### 7.1 Upload Page

**Purpose**: Upload football match videos for processing

**Components**:
- **VideoUploader**
  - Drag-and-drop area
  - File browser button
  - Support: .mp4, .mov, .avi
  - Max size: 5GB
  - Progress bar during upload
  - Queue multiple uploads

**Features**:
- [ ] Drag and drop video files
- [ ] Multiple file upload queue
- [ ] Upload progress with percentage
- [ ] Pause/resume upload
- [ ] Cancel upload
- [ ] Video preview thumbnail
- [ ] Metadata extraction (duration, resolution, size)
- [ ] Match info input form:
  - Home team
  - Away team
  - Competition
  - Date
  - Description

**API Endpoint**:
```typescript
POST /api/upload
Request: multipart/form-data
{
  video: File
  metadata: {
    homeTeam: string
    awayTeam: string
    competition: string
    date: string
  }
}
Response: {
  videoId: string
  status: "uploaded"
  url: string
}
```

---

### 7.2 Event Detection & Review

**Purpose**: Review AI-detected events and make adjustments

**Components**:
- **EventTimeline**
  - Horizontal timeline showing all events
  - Color-coded by event type
  - Zoom in/out controls
  - Current playback position indicator

- **EventCard** (for each event)
  - Event type icon (⚽ goal, 🧤 save, etc.)
  - Timestamp
  - Player name (editable)
  - Team (editable)
  - Confidence score
  - Mini video preview
  - Actions: Edit, Delete, Add to Shorts

- **EventFilter**
  - Filter by event type
  - Filter by team
  - Filter by confidence score
  - Search by player name

**Features**:
- [ ] Display all detected events in timeline
- [ ] Video player synchronized with timeline
- [ ] Click event to jump to timestamp
- [ ] Edit event details (player, team, type)
- [ ] Delete false positive events
- [ ] Manually add missed events
- [ ] Bulk select events
- [ ] Export event list as JSON/CSV
- [ ] Confidence score visualization
- [ ] Auto-play through events

**Data Structure**:
```typescript
interface Event {
  id: string
  type: 'goal' | 'save' | 'skill' | 'card' | 'chance' | 'tackle' | 'assist'
  timestamp: number        // seconds
  duration: number         // seconds
  score: number            // confidence 0-10
  player: string
  team: string
  minute: string           // match minute
  description: string
  thumbnail: string        // base64 or URL
  selected: boolean        // for shorts generation
}
```

**API Endpoints**:
```typescript
// Start event detection
POST /api/detect/start
Request: { videoId: string, config: DetectionConfig }
Response: { jobId: string }

// Get detection status (WebSocket or polling)
GET /api/detect/status/:jobId
Response: {
  status: 'processing' | 'completed' | 'failed'
  progress: number  // 0-100
  events: Event[]
}

// Update event
PUT /api/events/:eventId
Request: { player: string, team: string, type: string }
Response: { event: Event }

// Delete event
DELETE /api/events/:eventId

// Add manual event
POST /api/events
Request: Event
Response: { event: Event }
```

---

### 7.3 Shorts Generation

**Purpose**: Generate vertical shorts from selected events

**Components**:
- **ShortsConfigPanel**
  - Number of shorts to generate
  - Target platforms (TikTok, Instagram, YouTube)
  - AI cropping settings:
    - Enable/disable
    - Priority (ball, players, center)
    - Smoothing level
  - Animated text settings:
    - Enable/disable
    - Effect selection (or auto)
    - Font size
    - Position
  - Hashtag settings:
    - Enable/disable
    - Max count
  - Multi-language settings:
    - Enable/disable
    - Select languages
  - Branding:
    - Club badge upload
    - Watermark upload

- **ShortsGrid**
  - Grid of generated shorts
  - Thumbnail preview
  - Event details
  - Duration
  - Platform icons
  - Status indicator

- **ShortPreview**
  - Video player
  - Hashtags display (per platform)
  - Captions display (per language)
  - Download button
  - Share to platform buttons

**Features**:
- [ ] Select events for shorts generation
- [ ] Configure generation settings
- [ ] Real-time progress tracking
- [ ] Preview shorts before download
- [ ] Switch between different platform formats
- [ ] View generated hashtags
- [ ] View multi-language captions
- [ ] Edit hashtags before export
- [ ] Edit captions before export
- [ ] Regenerate with different settings
- [ ] Bulk download all shorts
- [ ] Share directly to platforms

**API Endpoints**:
```typescript
// Generate shorts
POST /api/generate/shorts
Request: {
  videoId: string
  eventIds: string[]
  config: ShortsConfig
}
Response: { jobId: string }

// Get generation status
GET /api/generate/status/:jobId
Response: {
  status: 'processing' | 'completed' | 'failed'
  progress: number
  shorts: Short[]
}

// Get short details
GET /api/shorts/:shortId
Response: {
  short: Short
  hashtags: { [platform: string]: string }
  captions: { [language: string]: string }
  files: {
    video: string
    thumbnail: string
    hashtags: { [platform: string]: string }
    captions: { [language: string]: string }
  }
}
```

**Data Structure**:
```typescript
interface Short {
  id: string
  eventId: string
  videoUrl: string
  thumbnailUrl: string
  duration: number
  platform: 'tiktok' | 'instagram' | 'youtube' | 'all'
  hashtags: Hashtag[]
  captions: Caption[]
  event: Event
  status: 'generating' | 'ready' | 'failed'
}

interface Hashtag {
  platform: 'tiktok' | 'instagram' | 'youtube' | 'twitter'
  tags: string[]
  formatted: string
}

interface Caption {
  language: string
  text: string
  filePath: string
}
```

---

### 7.4 Settings Page

**Purpose**: Configure user preferences and system settings

**Sections**:

#### **Detection Settings**
- Audio threshold slider (0-1)
- Flow threshold slider (0-1)
- Multi-signal fusion toggle
- Minimum event gap (seconds)

#### **Shorts Settings**
- Default number of shorts
- Minimum event score
- Target resolution dropdown
- AI Cropping:
  - Enable toggle
  - Model selection (YOLOv8n, YOLOv8s, YOLOv8m)
  - Smoothing alpha slider
  - Priority radio (ball, players, center)
- Animated Text:
  - Enable toggle
  - Font size slider
  - Position dropdown
  - Auto-effect toggle
- Hashtags:
  - Enable toggle
  - Max count slider
- Multi-Language:
  - Enable toggle
  - Language multi-select
  - Use Google Translate API toggle

#### **Branding**
- Club badge upload
- Watermark upload
- Preview uploaded images
- Delete branding assets

#### **Export Settings**
- Default platforms
- Output directory
- File naming convention

**Features**:
- [ ] Visual config editor
- [ ] Save/load config presets
- [ ] Export config as YAML
- [ ] Import config from YAML
- [ ] Reset to defaults
- [ ] Test detection with sample video
- [ ] Preview branding on sample video

---

### 7.5 Library Page

**Purpose**: Manage processed videos and shorts library

**Components**:
- **VideoLibrary**
  - Grid/list view toggle
  - Filter by date, competition, team
  - Search by description
  - Sort options

- **VideoCard**
  - Thumbnail
  - Title (teams, competition, date)
  - Duration
  - Number of events detected
  - Number of shorts generated
  - Actions: View Events, Generate Shorts, Delete

**Features**:
- [ ] View all processed videos
- [ ] Filter and search
- [ ] Reprocess video with different settings
- [ ] View event history
- [ ] Download original video
- [ ] Delete videos and associated data
- [ ] Export statistics

---

### 7.6 Analytics Page

**Purpose**: Track content performance and statistics

**Metrics to Display**:
- Total videos processed
- Total events detected (by type)
- Total shorts generated
- Most common event types
- Average shorts per video
- Processing time statistics
- Storage usage

**Charts**:
- Events over time (line chart)
- Event type distribution (pie chart)
- Shorts generation by platform (bar chart)
- Processing time trends (line chart)

---

## 8. UI/UX Design Guidelines

### Design Principles

1. **Clean & Modern**: Minimalist design with focus on video content
2. **Dark Theme**: Better for video viewing (with light theme toggle)
3. **Mobile-First**: Responsive design for all screen sizes
4. **Fast & Responsive**: Optimistic UI updates, instant feedback
5. **Accessible**: WCAG 2.1 AA compliant

### Color Scheme

**Primary Colors** (Football/Sports Theme):
- Primary: `#10b981` (Green - football pitch)
- Secondary: `#3b82f6` (Blue)
- Accent: `#f59e0b` (Amber/Gold)

**Semantic Colors**:
- Success: `#22c55e`
- Warning: `#f59e0b`
- Error: `#ef4444`
- Info: `#3b82f6`

**Event Type Colors**:
- Goal: `#22c55e` (Green)
- Save: `#3b82f6` (Blue)
- Skill: `#a855f7` (Purple)
- Card: `#f59e0b` (Yellow/Amber)
- Chance: `#06b6d4` (Cyan)

### Typography

- **Headings**: Inter or SF Pro Display
- **Body**: Inter or SF Pro Text
- **Monospace**: JetBrains Mono (for code/config)

### Spacing & Layout

- Grid: 8px base unit
- Container max-width: 1440px
- Responsive breakpoints:
  - Mobile: < 640px
  - Tablet: 640px - 1024px
  - Desktop: > 1024px

### Component Styling

**Buttons**:
- Primary: Filled with primary color
- Secondary: Outlined
- Ghost: Transparent background
- Icon: Icon-only, no background
- Sizes: sm, md, lg

**Cards**:
- Rounded corners: 8px
- Shadow: subtle drop shadow
- Hover: slight lift effect

**Forms**:
- Label above input
- Helper text below
- Error messages in red
- Success indicators in green

---

## 9. API Integration Points

### Backend API Structure

The Python backend should expose a REST API (or GraphQL) for the front-end to communicate.

**Recommended Framework**: FastAPI (Python)

**Base URL**: `http://localhost:8000/api/v1`

### API Endpoints Summary

```typescript
// Upload
POST   /api/v1/upload                  // Upload video
GET    /api/v1/uploads/:id             // Get upload status

// Event Detection
POST   /api/v1/detect/start            // Start detection
GET    /api/v1/detect/status/:jobId    // Get status
GET    /api/v1/events/:videoId         // Get all events
PUT    /api/v1/events/:eventId         // Update event
DELETE /api/v1/events/:eventId         // Delete event
POST   /api/v1/events                  // Add manual event

// Shorts Generation
POST   /api/v1/shorts/generate         // Generate shorts
GET    /api/v1/shorts/status/:jobId    // Get status
GET    /api/v1/shorts/:shortId         // Get short details
GET    /api/v1/shorts/:shortId/download // Download short
GET    /api/v1/shorts/:shortId/hashtags/:platform // Get hashtags
GET    /api/v1/shorts/:shortId/captions/:language // Get captions

// Configuration
GET    /api/v1/config                  // Get current config
PUT    /api/v1/config                  // Update config
POST   /api/v1/config/preset           // Save preset
GET    /api/v1/config/presets          // Get all presets

// Library
GET    /api/v1/library/videos          // Get all videos
GET    /api/v1/library/videos/:id      // Get video details
DELETE /api/v1/library/videos/:id      // Delete video

// Analytics
GET    /api/v1/analytics/summary       // Get summary stats
GET    /api/v1/analytics/events        // Get event statistics
GET    /api/v1/analytics/shorts        // Get shorts statistics

// Branding
POST   /api/v1/branding/upload         // Upload branding assets
DELETE /api/v1/branding/:assetId       // Delete branding asset
```

### WebSocket for Real-Time Updates

For real-time progress updates during long-running tasks:

```typescript
// Connect to WebSocket
ws://localhost:8000/ws/{jobId}

// Message format
{
  type: 'progress' | 'complete' | 'error'
  jobId: string
  progress: number  // 0-100
  message: string
  data?: any
}
```

---

## 10. Component Library

### Core Components to Build

#### **VideoUploader.tsx**
```typescript
interface VideoUploaderProps {
  onUploadComplete: (videoId: string) => void
  maxSize?: number
  acceptedFormats?: string[]
}

export function VideoUploader({ onUploadComplete, maxSize, acceptedFormats }: VideoUploaderProps) {
  // Implement drag-and-drop, progress tracking
}
```

#### **EventTimeline.tsx**
```typescript
interface EventTimelineProps {
  events: Event[]
  videoDuration: number
  currentTime: number
  onEventClick: (event: Event) => void
  onTimeChange: (time: number) => void
}

export function EventTimeline({ events, videoDuration, currentTime, onEventClick, onTimeChange }: EventTimelineProps) {
  // Implement timeline with events
}
```

#### **EventCard.tsx**
```typescript
interface EventCardProps {
  event: Event
  onEdit: (event: Event) => void
  onDelete: (eventId: string) => void
  onSelect: (eventId: string, selected: boolean) => void
}

export function EventCard({ event, onEdit, onDelete, onSelect }: EventCardProps) {
  // Display event details with actions
}
```

#### **ShortPreview.tsx**
```typescript
interface ShortPreviewProps {
  short: Short
  onDownload: (shortId: string) => void
  onShare: (shortId: string, platform: Platform) => void
}

export function ShortPreview({ short, onDownload, onShare }: ShortPreviewProps) {
  // Video player with hashtags and captions
}
```

#### **ConfigEditor.tsx**
```typescript
interface ConfigEditorProps {
  config: Config
  onUpdate: (config: Config) => void
}

export function ConfigEditor({ config, onUpdate }: ConfigEditorProps) {
  // Form-based config editor
}
```

---

## 11. Data Flow & State Management

### State Management Strategy

Use **Zustand** for global state:

```typescript
// stores/uploadStore.ts
interface UploadState {
  uploads: Upload[]
  addUpload: (upload: Upload) => void
  updateUpload: (id: string, progress: number) => void
  removeUpload: (id: string) => void
}

export const useUploadStore = create<UploadState>((set) => ({
  uploads: [],
  addUpload: (upload) => set((state) => ({ uploads: [...state.uploads, upload] })),
  updateUpload: (id, progress) => set((state) => ({
    uploads: state.uploads.map(u => u.id === id ? { ...u, progress } : u)
  })),
  removeUpload: (id) => set((state) => ({
    uploads: state.uploads.filter(u => u.id !== id)
  })),
}))
```

```typescript
// stores/eventStore.ts
interface EventState {
  events: Event[]
  selectedEventIds: string[]
  setEvents: (events: Event[]) => void
  updateEvent: (event: Event) => void
  deleteEvent: (id: string) => void
  toggleSelect: (id: string) => void
}

export const useEventStore = create<EventState>((set) => ({
  events: [],
  selectedEventIds: [],
  setEvents: (events) => set({ events }),
  updateEvent: (event) => set((state) => ({
    events: state.events.map(e => e.id === event.id ? event : e)
  })),
  deleteEvent: (id) => set((state) => ({
    events: state.events.filter(e => e.id !== id),
    selectedEventIds: state.selectedEventIds.filter(eid => eid !== id)
  })),
  toggleSelect: (id) => set((state) => ({
    selectedEventIds: state.selectedEventIds.includes(id)
      ? state.selectedEventIds.filter(eid => eid !== id)
      : [...state.selectedEventIds, id]
  })),
}))
```

### Data Fetching Strategy

Use **React Query** for server state:

```typescript
// hooks/useEvents.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useEvents(videoId: string) {
  return useQuery({
    queryKey: ['events', videoId],
    queryFn: () => fetch(`/api/events/${videoId}`).then(r => r.json())
  })
}

export function useUpdateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (event: Event) =>
      fetch(`/api/events/${event.id}`, {
        method: 'PUT',
        body: JSON.stringify(event)
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    }
  })
}
```

---

## 12. Implementation Steps

### Phase 1: Project Setup (Day 1)

1. **Initialize Next.js Project**
```bash
npx create-next-app@latest football-highlights-app --typescript --tailwind --app
cd football-highlights-app
```

2. **Install Dependencies**
```bash
# UI Components
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input label select textarea tabs dialog dropdown-menu

# State Management
npm install zustand @tanstack/react-query

# Video Player
npm install plyr-react

# File Upload
npm install react-dropzone

# Forms
npm install react-hook-form zod @hookform/resolvers

# Charts
npm install recharts

# Icons
npm install lucide-react

# Notifications
npm install react-hot-toast

# Date handling
npm install date-fns

# Utilities
npm install clsx tailwind-merge
```

3. **Setup Project Structure**
```bash
mkdir -p app/{upload,events,shorts,library,settings,analytics}
mkdir -p components/{upload,events,shorts,player,settings,common}
mkdir -p lib hooks stores types
```

4. **Create Base Layout**
- Header with logo and navigation
- Sidebar with menu items
- Main content area
- Footer

### Phase 2: Upload Feature (Day 2-3)

1. **Build VideoUploader Component**
   - Drag-and-drop zone
   - File validation
   - Progress bar
   - Queue management

2. **Build Upload Page**
   - VideoUploader component
   - Match metadata form
   - Upload queue display

3. **API Integration**
   - POST /api/upload endpoint
   - File upload with progress
   - Error handling

### Phase 3: Event Detection & Review (Day 4-6)

1. **Build Event Components**
   - EventTimeline component
   - EventCard component
   - EventFilter component
   - EventEditor modal

2. **Build Video Player**
   - Plyr integration
   - Timeline synchronization
   - Keyboard controls

3. **Build Events Page**
   - Video player
   - Event timeline below
   - Event list on side
   - Filter/search controls

4. **API Integration**
   - POST /api/detect/start
   - WebSocket for progress
   - GET /api/events/:videoId
   - PUT /api/events/:eventId

### Phase 4: Shorts Generation (Day 7-10)

1. **Build Shorts Config Panel**
   - Platform selection
   - AI cropping settings
   - Animated text settings
   - Hashtag settings
   - Multi-language settings
   - Branding uploads

2. **Build Shorts Display**
   - ShortsGrid component
   - ShortPreview component
   - Platform tabs
   - Hashtag/caption viewers

3. **Build Shorts Page**
   - Config panel
   - Generate button
   - Progress tracking
   - Shorts grid

4. **API Integration**
   - POST /api/shorts/generate
   - WebSocket for progress
   - GET /api/shorts/:shortId
   - Download endpoints

### Phase 5: Settings & Configuration (Day 11-12)

1. **Build Settings Components**
   - Detection settings form
   - Shorts settings form
   - Branding uploader
   - Config import/export

2. **Build Settings Page**
   - Tabbed interface
   - Save/reset buttons
   - Preset management

3. **API Integration**
   - GET /api/config
   - PUT /api/config

### Phase 6: Library & Analytics (Day 13-14)

1. **Build Library Components**
   - VideoLibrary grid
   - VideoCard component
   - Filters and search

2. **Build Analytics Components**
   - Stat cards
   - Charts (Recharts)

3. **Build Pages**
   - Library page
   - Analytics page

4. **API Integration**
   - GET /api/library/videos
   - GET /api/analytics/*

### Phase 7: Polish & Testing (Day 15-16)

1. **Error Handling**
   - Error boundaries
   - Toast notifications
   - Retry logic

2. **Loading States**
   - Skeleton screens
   - Loading spinners
   - Optimistic updates

3. **Responsive Design**
   - Mobile layout
   - Tablet layout
   - Desktop layout

4. **Testing**
   - Unit tests (Jest)
   - Integration tests
   - E2E tests (Playwright)

5. **Performance**
   - Code splitting
   - Image optimization
   - Lazy loading

### Phase 8: Deployment (Day 17)

1. **Build & Optimize**
```bash
npm run build
```

2. **Deploy to Vercel**
```bash
vercel deploy
```

3. **Setup Environment Variables**
   - API_URL
   - WS_URL
   - Any API keys

---

## 13. Additional Features (Nice-to-Have)

### Advanced Features

1. **Social Media Integration**
   - OAuth for TikTok, Instagram, YouTube
   - Direct posting to platforms
   - Scheduled posting

2. **Collaboration**
   - Team workspaces
   - User roles (admin, editor, viewer)
   - Comments on events
   - Approval workflow

3. **AI Enhancements**
   - Player face recognition
   - Automatic player name detection
   - Highlight quality scoring

4. **Advanced Editing**
   - Trim clips
   - Adjust timing
   - Custom text overlays
   - Music library integration

5. **Templates**
   - Saved config templates
   - Brand templates
   - Text style templates

6. **Batch Processing**
   - Process multiple videos
   - Bulk export
   - Queue management

7. **Cloud Storage**
   - S3/Google Cloud integration
   - Video CDN
   - Automatic backups

---

## 14. Success Criteria

### Functional Requirements
- ✅ Users can upload videos
- ✅ Events are detected automatically
- ✅ Users can review and edit events
- ✅ Shorts are generated with one click
- ✅ Multiple platforms supported
- ✅ Hashtags generated automatically
- ✅ Multi-language captions work
- ✅ Videos can be downloaded
- ✅ Settings are configurable

### Non-Functional Requirements
- ✅ Page load < 2 seconds
- ✅ Video upload supports 5GB files
- ✅ Real-time progress updates
- ✅ Mobile responsive
- ✅ Accessible (WCAG AA)
- ✅ Error handling throughout
- ✅ 99% uptime

### User Experience
- ✅ Intuitive navigation
- ✅ Clear visual hierarchy
- ✅ Helpful error messages
- ✅ Smooth animations
- ✅ Consistent design

---

## 15. Example Code Snippets

### Upload Page Example

```typescript
// app/upload/page.tsx
'use client'

import { useState } from 'react'
import { VideoUploader } from '@/components/upload/VideoUploader'
import { MatchMetadataForm } from '@/components/upload/MatchMetadataForm'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

export default function UploadPage() {
  const router = useRouter()
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [metadata, setMetadata] = useState({
    homeTeam: '',
    awayTeam: '',
    competition: '',
    date: new Date().toISOString().split('T')[0]
  })

  const handleUpload = async () => {
    if (!videoFile) return

    const formData = new FormData()
    formData.append('video', videoFile)
    formData.append('metadata', JSON.stringify(metadata))

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Video uploaded successfully!')
        router.push(`/events/${data.videoId}`)
      } else {
        toast.error(data.error || 'Upload failed')
      }
    } catch (error) {
      toast.error('Network error')
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Upload Match Video</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <VideoUploader
            onFileSelect={setVideoFile}
            maxSize={5 * 1024 * 1024 * 1024} // 5GB
          />
        </div>

        <div>
          <MatchMetadataForm
            metadata={metadata}
            onChange={setMetadata}
          />

          <button
            onClick={handleUpload}
            disabled={!videoFile}
            className="mt-4 w-full bg-green-600 text-white py-3 rounded-lg disabled:opacity-50"
          >
            Upload & Detect Events
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Event Timeline Example

```typescript
// components/events/EventTimeline.tsx
import { Event } from '@/types/event'

interface EventTimelineProps {
  events: Event[]
  videoDuration: number
  currentTime: number
  onEventClick: (event: Event) => void
}

export function EventTimeline({ events, videoDuration, currentTime, onEventClick }: EventTimelineProps) {
  const getEventColor = (type: string) => {
    const colors = {
      goal: 'bg-green-500',
      save: 'bg-blue-500',
      skill: 'bg-purple-500',
      card: 'bg-yellow-500',
      chance: 'bg-cyan-500'
    }
    return colors[type] || 'bg-gray-500'
  }

  const getEventIcon = (type: string) => {
    const icons = {
      goal: '⚽',
      save: '🧤',
      skill: '⭐',
      card: '🟨',
      chance: '🎯'
    }
    return icons[type] || '•'
  }

  return (
    <div className="relative h-24 bg-gray-900 rounded-lg p-4">
      {/* Timeline bar */}
      <div className="absolute bottom-4 left-4 right-4 h-2 bg-gray-700 rounded-full">
        {/* Current time indicator */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white"
          style={{ left: `${(currentTime / videoDuration) * 100}%` }}
        />

        {/* Events */}
        {events.map((event) => (
          <button
            key={event.id}
            className={`absolute -top-3 w-8 h-8 rounded-full ${getEventColor(event.type)}
                       flex items-center justify-center transform -translate-x-1/2
                       hover:scale-110 transition-transform cursor-pointer`}
            style={{ left: `${(event.timestamp / videoDuration) * 100}%` }}
            onClick={() => onEventClick(event)}
            title={`${event.type} - ${event.player} (${event.minute}')`}
          >
            <span className="text-sm">{getEventIcon(event.type)}</span>
          </button>
        ))}
      </div>

      {/* Time labels */}
      <div className="absolute top-2 left-4 right-4 flex justify-between text-xs text-gray-400">
        <span>0:00</span>
        <span>{formatTime(videoDuration)}</span>
      </div>
    </div>
  )
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
```

---

## 16. Final Checklist

Before considering the front-end complete, ensure:

### Core Features
- [ ] Video upload with progress tracking
- [ ] Event detection integration
- [ ] Event review and editing
- [ ] Shorts generation with all features
- [ ] Multi-platform export
- [ ] Settings configuration
- [ ] Video library management
- [ ] Analytics dashboard

### Quality
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Dark/light theme toggle
- [ ] Loading states everywhere
- [ ] Error handling everywhere
- [ ] Form validation
- [ ] Accessibility (keyboard navigation, screen readers)
- [ ] Performance optimization (lazy loading, code splitting)

### Integration
- [ ] All API endpoints connected
- [ ] WebSocket for real-time updates
- [ ] File uploads working
- [ ] Downloads working
- [ ] Configuration save/load working

### Polish
- [ ] Smooth animations
- [ ] Toast notifications
- [ ] Confirmation dialogs
- [ ] Empty states
- [ ] Success states
- [ ] Error states

---

## 17. Deployment Instructions

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_MAX_UPLOAD_SIZE=5368709120  # 5GB
```

### Build

```bash
npm run build
```

### Deploy to Vercel

```bash
npm install -g vercel
vercel login
vercel deploy --prod
```

### Backend Setup

Ensure the Python backend is running:

```bash
cd highlights_bot
pip install fastapi uvicorn python-multipart
uvicorn api:app --reload --port 8000
```

---

## 18. Support & Documentation

### For Users
- Create user documentation
- Video tutorials
- FAQ section
- Contact support form

### For Developers
- API documentation (Swagger/OpenAPI)
- Component storybook
- Development setup guide
- Contributing guidelines

---

## Conclusion

This comprehensive guide provides everything needed to build a production-ready front-end for the football highlights processing platform. The backend is already fully functional with all 4 enhancements:

1. ✅ AI-Powered Smart Cropping (YOLOv8)
2. ✅ Animated Text Effects (6 types)
3. ✅ Hashtag Automation (platform-specific)
4. ✅ Multi-Language Captions (12 languages)

The front-end should be intuitive, fast, and beautiful, making it easy for users to upload videos, review events, and generate viral-ready shorts with just a few clicks.

**Estimated Development Time**: 15-20 days for a complete, polished application.

**Good luck building!** 🚀⚽
