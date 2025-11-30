# AI Assistant Coach - Backend Integration Guide

## New Files Created

1. `/backend/src/routes/coaching.ts` - Coaching API routes ✅
2. `/video-processing/highlights_bot/detect_mistakes.py` - AI mistake detection ✅
3. `/video-processing/highlights_bot/training_drills_ai.py` - AI drill generator ✅

---

## Backend Integration Steps

### 1. Add Import to `/backend/src/index.ts`

After the videos import (around line 60), add:

```typescript
import {
    handleAnalyzeMistakes,
    handleGetMistakes,
    handleGenerateDrills,
    handleGenerateSession,
    handleSaveTrainingSession,
    handleGetTrainingSessions,
    handleGetTrainingSession,
    handleDeleteTrainingSession
} from "./routes/coaching";
```

### 2. Add Route Registrations to `/backend/src/index.ts`

After the video routes (around line 370), add:

```typescript
// ===== COACHING & AI ASSISTANT ROUTES =====

// Analyze video for coaching opportunities
router.post("/api/:v/videos/:id/analyze-mistakes", (req, env, corsHdrs, requestId) => {
  const { id } = req.params;
  return handleAnalyzeMistakes(req, env, corsHdrs, id);
});

// Get detected mistakes for a video
router.get("/api/:v/videos/:id/mistakes", (req, env, corsHdrs, requestId) => {
  const { id } = req.params;
  return handleGetMistakes(req, env, corsHdrs, id);
});

// Generate training drills from mistakes
router.post("/api/:v/coaching/generate-drills", (req, env, corsHdrs, requestId) =>
  handleGenerateDrills(req, env, corsHdrs)
);

// Generate complete training session
router.post("/api/:v/coaching/generate-session", (req, env, corsHdrs, requestId) =>
  handleGenerateSession(req, env, corsHdrs)
);

// Save training session plan
router.post("/api/:v/coaching/sessions", (req, env, corsHdrs, requestId) =>
  handleSaveTrainingSession(req, env, corsHdrs)
);

// Get all training sessions
router.get("/api/:v/coaching/sessions", (req, env, corsHdrs, requestId) =>
  handleGetTrainingSessions(req, env, corsHdrs)
);

// Get specific training session
router.get("/api/:v/coaching/sessions/:id", (req, env, corsHdrs, requestId) => {
  const { id } = req.params;
  return handleGetTrainingSession(req, env, corsHdrs, id);
});

// Delete training session
router.delete("/api/:v/coaching/sessions/:id", (req, env, corsHdrs, requestId) => {
  const { id } = req.params;
  return handleDeleteTrainingSession(req, env, corsHdrs, id);
});
```

---

## API Endpoints Summary

### Video Mistake Analysis

#### `POST /api/v1/videos/:id/analyze-mistakes`
Trigger AI analysis to detect coaching opportunities in uploaded video.

**Request Body:**
```json
{
  "team_name": "Syston Town",
  "opponent_name": "Leicester United",
  "goals_conceded": 3,
  "final_score": "2-3"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "job_id": "coaching-1234567890-abc123",
    "status": "queued",
    "message": "AI coaching analysis started"
  }
}
```

---

#### `GET /api/v1/videos/:id/mistakes`
Get detected mistakes for a video.

**Response:**
```json
{
  "success": true,
  "data": {
    "video_id": "vid-1234567890",
    "total_mistakes": 12,
    "categories": {
      "defensive_errors": 5,
      "poor_passing": 4,
      "transition_errors": 3
    },
    "mistakes": [
      {
        "timestamp": "12:34",
        "timestamp_seconds": 754,
        "category": "defensive_errors",
        "description": "Center back left striker unmarked in the box",
        "impact": "High",
        "players_involved": ["#5 Center Back", "#3 Right Back"]
      }
    ]
  }
}
```

---

### Training Drill Generation

#### `POST /api/v1/coaching/generate-drills`
Generate training drills from detected mistakes.

**Request Body:**
```json
{
  "mistake_data": [
    {
      "category": "defensive_errors",
      "description": "Poor marking on corners",
      "impact": "High"
    }
  ],
  "num_drills": 3,
  "age_group": "Adult",
  "skill_level": "Intermediate"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "job_id": "drills-1234567890-abc123",
    "status": "queued",
    "message": "AI drill generation started"
  }
}
```

---

#### `POST /api/v1/coaching/generate-session`
Generate complete training session from mistakes.

**Request Body:**
```json
{
  "mistakes": [...],
  "session_duration": 60,
  "age_group": "Adult",
  "skill_level": "Intermediate",
  "focus_categories": ["defensive_errors", "set_piece_mistakes"]
}
```

---

### Training Session Management

#### `POST /api/v1/coaching/sessions`
Save a training session plan.

**Request Body:**
```json
{
  "name": "Defensive Shape Training",
  "match_id": "match-123",
  "session_plan": {...},
  "notes": "Focus on zonal marking",
  "scheduled_date": "2025-12-05"
}
```

---

#### `GET /api/v1/coaching/sessions`
Get all training sessions for tenant.

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [...],
    "total": 5
  }
}
```

---

#### `GET /api/v1/coaching/sessions/:id`
Get specific training session.

---

#### `DELETE /api/v1/coaching/sessions/:id`
Delete a training session.

---

## Python Integration

The backend routes queue jobs to `HIGHLIGHTS_QUEUE` with type:
- `coaching_analysis` - Runs mistake detection
- `drill_generation` - Generates training drills
- `session_generation` - Generates full training session

### Queue Consumer Handler

Add to `/backend/src/video-queue-consumer.ts`:

```typescript
async function handleCoachingAnalysis(message: any, env: any) {
  const { jobId, videoId, tenant, team_name, opponent_name, context, r2Key } = message;

  // Get video URL from R2
  const videoUrl = await env.R2_MEDIA.get(r2Key);

  // Call Python service (TODO: implement HTTP service or use exec)
  // For now, this is a placeholder
  const pythonServiceUrl = env.PYTHON_COACHING_SERVICE_URL || "http://localhost:8000";

  const response = await fetch(`${pythonServiceUrl}/analyze-mistakes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      video_url: r2Key,
      team_name,
      opponent_name,
      context,
    }),
  });

  const mistakes = await response.json();

  // Store results
  await env.KV_IDEMP.put(
    `mistakes:${tenant}:${videoId}`,
    JSON.stringify({
      video_id: videoId,
      analyzed_at: Date.now(),
      ...mistakes,
    })
  );

  // Update job status
  await env.KV_IDEMP.put(
    `coaching_job:${tenant}:${jobId}`,
    JSON.stringify({ ...message, status: "completed", completedAt: Date.now() })
  );
}
```

---

## Environment Variables Needed

Add to `.env` or Cloudflare Workers environment:

```bash
# Google Gemini AI API Key (FREE tier available!)
GEMINI_API_KEY=your-gemini-api-key-here

# Optional: Python service URL (if running as separate service)
PYTHON_COACHING_SERVICE_URL=http://localhost:8000
```

---

## Setup Instructions

### 1. Get Gemini API Key (FREE!)

1. Visit: https://aistudio.google.com/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the key

### 2. Install Python Dependencies

```bash
cd /c/dev/app-FRESH/video-processing/highlights_bot
pip install google-generativeai
```

### 3. Test Mistake Detection

```bash
export GEMINI_API_KEY=your-key-here

python detect_mistakes.py \
  --video "path/to/match.mp4" \
  --team "Syston Town" \
  --opponent "Leicester United" \
  --goals-conceded 3 \
  --score "2-3"
```

### 4. Test Drill Generation

```bash
python training_drills_ai.py \
  --mistakes mistakes_analysis.json \
  --duration 60 \
  --age-group Adult
```

---

## Testing the API

### 1. Upload a Video
```bash
curl -X POST http://localhost:8787/api/v1/videos/upload \
  -H "Authorization: Bearer YOUR_JWT" \
  -F "video=@match.mp4"
```

### 2. Analyze for Mistakes
```bash
curl -X POST http://localhost:8787/api/v1/videos/vid-123/analyze-mistakes \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "team_name": "Syston Town",
    "opponent_name": "Leicester United",
    "goals_conceded": 3,
    "final_score": "2-3"
  }'
```

### 3. Get Mistakes
```bash
curl http://localhost:8787/api/v1/videos/vid-123/mistakes \
  -H "Authorization: Bearer YOUR_JWT"
```

### 4. Generate Drills
```bash
curl -X POST http://localhost:8787/api/v1/coaching/generate-drills \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "mistake_data": [...],
    "num_drills": 3,
    "age_group": "Adult",
    "skill_level": "Intermediate"
  }'
```

---

## Next Steps

1. ✅ Add imports and routes to `index.ts`
2. ✅ Deploy backend to Cloudflare
3. ✅ Set `GEMINI_API_KEY` environment variable
4. ⏳ Create Python HTTP service (Flask/FastAPI) to handle queue messages
5. ⏳ Build frontend UI components

---

## Frontend UI Components (Next)

1. **VideoEditor Enhancement**
   - Add "Analyze for Coaching" button
   - Show detected mistake markers on timeline
   - Click marker to create coaching clip

2. **AssistantCoach Component**
   - Mistake clip library
   - Training drill generator UI
   - Session planner drag-and-drop

3. **Match Analysis Dashboard**
   - Post-match summary
   - Highlight clips + coaching clips
   - AI-generated insights
