# 🎯 Live Match Features - Backend Implementation

**Date:** 2025-10-25
**Status:** ✅ **COMPLETE** - All routes implemented, migration created

---

## 📋 Summary

Implemented complete backend support for live match features including:
- YouTube livestream integration
- Real-time match state management
- Live text commentary/ticker system
- Match minute tracking with running clock
- Cleanup utilities for stale data

---

## 🗄️ Database Changes

### Migration File
**Location:** `backend/migrations/004_add_live_match_features.sql`

### New Columns Added to `fixtures` Table

```sql
-- YouTube livestream columns
youtube_live_id TEXT                    -- YouTube video ID for livestream
youtube_status TEXT                     -- 'live' | 'upcoming' | 'offline'
youtube_scheduled_start TEXT            -- ISO timestamp for scheduled start

-- Live match state columns
home_team TEXT                          -- Explicit home team name
away_team TEXT                          -- Explicit away team name
current_minute INTEGER DEFAULT 0        -- Current match minute
home_score INTEGER DEFAULT 0            -- Home team score
away_score INTEGER DEFAULT 0            -- Away team score
match_status TEXT DEFAULT 'scheduled'   -- 'scheduled' | 'live' | 'halftime' | 'ft'
```

### New Table: `live_updates`

```sql
CREATE TABLE live_updates (
  id TEXT PRIMARY KEY,                  -- update-{timestamp}-{random}
  match_id TEXT NOT NULL,               -- Foreign key to fixtures.id
  minute INTEGER NOT NULL,              -- Match minute
  type TEXT NOT NULL,                   -- 'goal' | 'card' | 'subs' | 'info'
  text TEXT NOT NULL,                   -- Display text
  scorer TEXT,                          -- Goal scorer (for type='goal')
  assist TEXT,                          -- Assist provider (for type='goal')
  card TEXT,                            -- 'yellow' | 'red' | 'sinbin' (for type='card')
  player TEXT,                          -- Player name (for type='card')
  score_so_far TEXT,                    -- e.g., "2-1" (for type='goal')
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES fixtures(id) ON DELETE CASCADE
);
```

### New Indexes

```sql
-- Optimize live updates queries
CREATE INDEX idx_live_updates_match ON live_updates(match_id, created_at DESC);
CREATE INDEX idx_live_updates_type ON live_updates(type);

-- Optimize fixture queries
CREATE INDEX idx_fixtures_youtube ON fixtures(youtube_status, youtube_scheduled_start);
CREATE INDEX idx_fixtures_match_status ON fixtures(match_status);
```

---

## 🛣️ API Routes Implemented

### 1. GET `/api/v1/fixtures/next`

**Purpose:** Get next upcoming fixture with YouTube livestream metadata and match state

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "match-123",
    "kickoffIso": "2025-10-25T14:00:00Z",
    "homeTeam": "Syston Tigers",
    "awayTeam": "Leicester Panthers",
    "opponent": "Leicester Panthers",
    "homeAway": "H",
    "venue": "Syston Recreation Ground",
    "competition": "County League",
    "status": "live",
    "score": {
      "home": 2,
      "away": 1
    },
    "minute": 34,
    "youtubeLiveId": "dQw4w9WgXcQ",
    "youtubeStatus": "live",
    "youtubeScheduledStart": "2025-10-25T14:00:00Z"
  }
}
```

**Logic:**
- Returns next scheduled fixture (date >= today, not postponed)
- Ordered by date ASC, kick_off_time ASC
- Includes all match state and YouTube metadata
- Returns `null` if no upcoming fixtures

---

### 2. GET `/api/v1/live-updates?matchId={id}`

**Purpose:** Get all live text updates for a specific match

**Query Parameters:**
- `matchId` (required) - Match ID to fetch updates for

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "update-1730000000000-abc123",
      "matchId": "match-123",
      "minute": 12,
      "type": "goal",
      "text": "GOAL! Smith opens the scoring!",
      "scorer": "J. Smith",
      "assist": null,
      "card": null,
      "player": null,
      "scoreSoFar": "1-0",
      "createdAt": "2025-10-25T14:12:00Z"
    },
    {
      "id": "update-1730000360000-def456",
      "matchId": "match-123",
      "minute": 18,
      "type": "card",
      "text": "Yellow card for Jones",
      "scorer": null,
      "assist": null,
      "card": "yellow",
      "player": "A. Jones",
      "scoreSoFar": null,
      "createdAt": "2025-10-25T14:18:00Z"
    }
  ]
}
```

**Logic:**
- Returns all updates for match in chronological order (ASC)
- Returns empty array if no updates found
- Returns 400 error if matchId parameter missing

---

### 3. POST `/api/v1/live-updates`

**Purpose:** Post a new live update (goal, card, substitution, info)

**Request Body:**
```json
{
  "matchId": "match-123",
  "minute": 34,
  "type": "goal",
  "text": "GOAL! Smith with a brilliant strike!",
  "scorer": "J. Smith",
  "assist": "M. Wilson",
  "scoreSoFar": "2-1"
}
```

**Required Fields:**
- `matchId` (string)
- `minute` (number)
- `type` ('goal' | 'card' | 'subs' | 'info')
- `text` (string)

**Optional Fields (type-specific):**

For `type='goal'`:
- `scorer` (string)
- `assist` (string)
- `scoreSoFar` (string, e.g., "2-1")

For `type='card'`:
- `card` ('yellow' | 'red' | 'sinbin')
- `player` (string)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "update-1730001600000-ghi789",
    "matchId": "match-123",
    "minute": 34,
    "type": "goal",
    "text": "GOAL! Smith with a brilliant strike!",
    "scorer": "J. Smith",
    "assist": "M. Wilson",
    "card": null,
    "player": null,
    "scoreSoFar": "2-1",
    "createdAt": "2025-10-25T14:34:00Z"
  }
}
```

**Validation:**
- Returns 400 if required fields missing
- Returns 400 if type not in valid list
- Returns 400 if card type invalid
- Generates unique ID: `update-{timestamp}-{random}`

---

### 4. POST `/api/v1/matches/:id/state`

**Purpose:** Update match state (kickoff, halftime, fulltime)

**Path Parameter:**
- `:id` - Match ID

**Request Body:**
```json
{
  "status": "live",
  "minute": 0,
  "score": {
    "home": 0,
    "away": 0
  }
}
```

**Required Fields:**
- `status` ('scheduled' | 'live' | 'halftime' | 'ft')

**Optional Fields:**
- `minute` (number) - Current match minute
- `score` (object) - Current score
  - `home` (number)
  - `away` (number)

**Response:**
```json
{
  "success": true,
  "data": {
    "ok": true
  }
}
```

**Logic:**
- Updates `match_status` column
- Optionally updates `current_minute`
- Optionally updates `home_score` and `away_score`
- Updates `updated_at` timestamp
- Returns 400 if status invalid

**Use Cases:**
- **Kickoff:** `{status: "live", minute: 0, score: {home: 0, away: 0}}`
- **Halftime:** `{status: "halftime", minute: 45}`
- **Fulltime:** `{status: "ft", minute: 90, score: {home: 3, away: 1}}`

---

### 5. POST `/api/v1/live-updates/cleanup`

**Purpose:** Clean up stale live updates

**Request Body (Optional):**
```json
{
  "matchId": "match-123"
}
```

**Scenarios:**

**A. Clean specific match:**
```bash
POST /api/v1/live-updates/cleanup
Body: {"matchId": "match-123"}
```
Removes ALL updates for the specified match.

**B. Clean stale matches:**
```bash
POST /api/v1/live-updates/cleanup
Body: {}
```
Removes all updates for matches where:
- `match_status = 'ft'` (fulltime)
- `updated_at < 90 minutes ago`

**Response:**
```json
{
  "success": true,
  "data": {
    "removed": 42
  }
}
```

**Use Cases:**
- **After match ends:** Admin cleans up specific match
- **Scheduled cleanup:** Cron job removes stale updates from old matches

---

## 🔧 Running the Migration

### Prerequisites
- Cloudflare account with Workers & D1 enabled
- Wrangler CLI installed: `npm install -g wrangler`
- Logged in: `wrangler login`

### Apply Migration

```bash
cd backend

# Run migration on remote database
wrangler d1 migrations apply syston-db --remote

# Verify migration applied
wrangler d1 execute syston-db --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
```

### Expected Output

```
✅ Successfully applied 1 migration
   - 004_add_live_match_features.sql

Tables created:
   - fixtures (updated with 9 new columns)
   - live_updates (new table)

Indexes created:
   - idx_live_updates_match
   - idx_live_updates_type
   - idx_fixtures_youtube
   - idx_fixtures_match_status
```

---

## 🚀 Deployment

### 1. Build Backend

```bash
cd backend
npm install
npm run build
```

### 2. Deploy to Cloudflare

```bash
wrangler deploy
```

### 3. Verify Deployment

```bash
# Check worker status
wrangler tail syston-backend

# Test fixtures/next endpoint
curl https://syston-backend.YOUR_SUBDOMAIN.workers.dev/api/v1/fixtures/next

# Test live-updates endpoint (should return 400 - matchId required)
curl https://syston-backend.YOUR_SUBDOMAIN.workers.dev/api/v1/live-updates
```

---

## 🧪 Testing

### Test Data Setup

```bash
# Insert test fixture with YouTube and match state
wrangler d1 execute syston-db --remote --command "
INSERT INTO fixtures (
  id, fixture_date, kick_off_time, opponent, venue, competition,
  home_team, away_team, match_status, current_minute, home_score, away_score,
  youtube_live_id, youtube_status, youtube_scheduled_start
) VALUES (
  'test-match-1',
  DATE('now', '+1 day'),
  '14:00:00',
  'Leicester Panthers',
  'Syston Recreation Ground',
  'County League',
  'Syston Tigers',
  'Leicester Panthers',
  'scheduled',
  0,
  0,
  0,
  'dQw4w9WgXcQ',
  'upcoming',
  DATETIME('now', '+1 day', '14:00:00')
);
"

# Insert test live update
wrangler d1 execute syston-db --remote --command "
INSERT INTO live_updates (
  id, match_id, minute, type, text, scorer, score_so_far
) VALUES (
  'test-update-1',
  'test-match-1',
  23,
  'goal',
  'GOAL! Smith opens the scoring!',
  'J. Smith',
  '1-0'
);
"
```

### API Tests

```bash
# 1. Get next fixture
curl https://syston-backend.YOUR_SUBDOMAIN.workers.dev/api/v1/fixtures/next

# 2. Get live updates
curl "https://syston-backend.YOUR_SUBDOMAIN.workers.dev/api/v1/live-updates?matchId=test-match-1"

# 3. Post live update
curl -X POST https://syston-backend.YOUR_SUBDOMAIN.workers.dev/api/v1/live-updates \
  -H "Content-Type: application/json" \
  -d '{
    "matchId": "test-match-1",
    "minute": 34,
    "type": "goal",
    "text": "GOAL! Davies equalizes!",
    "scorer": "K. Davies",
    "scoreSoFar": "1-1"
  }'

# 4. Set match state to live
curl -X POST https://syston-backend.YOUR_SUBDOMAIN.workers.dev/api/v1/matches/test-match-1/state \
  -H "Content-Type: application/json" \
  -d '{
    "status": "live",
    "minute": 0,
    "score": {"home": 0, "away": 0}
  }'

# 5. Cleanup match
curl -X POST https://syston-backend.YOUR_SUBDOMAIN.workers.dev/api/v1/live-updates/cleanup \
  -H "Content-Type: application/json" \
  -d '{"matchId": "test-match-1"}'
```

---

## 📱 Mobile App Integration

The mobile app is already configured to use these endpoints via the SDK:

```typescript
// Get next fixture
const fixture = await sdk.getNextFixture();

// Get live updates
const updates = await sdk.listLiveUpdates('match-123');

// Post live update
await sdk.postLiveUpdate({
  matchId: 'match-123',
  minute: 34,
  type: 'goal',
  text: 'GOAL!',
  scorer: 'J. Smith',
  scoreSoFar: '2-1'
});

// Set match state
await sdk.setMatchState('match-123', {
  status: 'live',
  minute: 0,
  score: { home: 0, away: 0 }
});

// Cleanup
await sdk.cleanupLive('match-123');
```

---

## 🔒 Security Considerations

### Authentication
- Live update POST routes should require authentication
- Consider adding role-based access (only staff can post updates)
- Add to `requireJWT` or `requireAdmin` middleware

**Example:**
```typescript
// In index.ts, add auth check:
if (url.pathname === `/api/${v}/live-updates` && req.method === "POST") {
  // Add authentication
  const user = await requireJWT(req, env).catch(() => null);
  if (!user || !hasRole(user, "staff")) {
    return json({ success: false, error: { code: "FORBIDDEN" } }, 403, corsHdrs);
  }

  // ... rest of route logic
}
```

### Rate Limiting
- Add rate limiting to POST routes to prevent spam
- Use existing `rateLimit` middleware
- Suggested limits:
  - Live updates: 60 per minute per tenant
  - Match state: 20 per minute per tenant

---

## 📊 Performance Optimization

### Database Indexes
All critical indexes are created by migration:
- `idx_live_updates_match` - Fast lookups by match_id
- `idx_live_updates_type` - Filter by event type
- `idx_fixtures_youtube` - YouTube stream status queries
- `idx_fixtures_match_status` - Active match queries

### Query Optimization
- Use `LIMIT 1` for next fixture query
- Use indexed columns in WHERE clauses
- Order by indexed columns where possible

### Cleanup Strategy
- Run cleanup daily via cron job
- Only remove updates from matches >90 minutes after FT
- Consider archiving to R2 instead of deleting

---

## 🐛 Troubleshooting

### "Table already exists" Error
Migration was already run. Check with:
```bash
wrangler d1 execute syston-db --remote --command ".schema live_updates"
```

### "No upcoming fixtures" (null response)
- Check fixture data exists: `SELECT * FROM fixtures WHERE fixture_date >= DATE('now');`
- Verify `status != 'postponed'`
- Check `kick_off_time` is set

### "matchId parameter required" Error
- Ensure query parameter is included: `?matchId=match-123`
- Check URL encoding

### Migration fails on duplicate column
- Columns already exist from previous migration
- Either:
  - Drop columns manually
  - Or use `ALTER TABLE IF NOT EXISTS` (not supported in SQLite)
  - Or rename migration file to prevent re-run

---

## 📝 Next Steps

1. **Add Authentication:**
   - Implement JWT validation on POST routes
   - Add role-based access control

2. **Add Rate Limiting:**
   - Apply rate limits to POST endpoints
   - Monitor usage patterns

3. **Set Up Cron Cleanup:**
   - Schedule daily cleanup job
   - Monitor removed count

4. **Add Monitoring:**
   - Log all live update posts
   - Track API usage per tenant
   - Alert on errors

5. **Test with Real Data:**
   - Create real fixtures
   - Test mobile app integration
   - Verify offline queue

---

## ✅ Implementation Checklist

- [x] Create database migration
- [x] Add 9 new columns to fixtures table
- [x] Create live_updates table
- [x] Create database indexes
- [x] Implement GET /fixtures/next
- [x] Implement GET /live-updates
- [x] Implement POST /live-updates
- [x] Implement POST /matches/:id/state
- [x] Implement POST /live-updates/cleanup
- [x] Add comprehensive validation
- [x] Add error handling and logging
- [x] Document all endpoints
- [x] Create test data examples
- [x] Update SDK (already complete)
- [x] Update mobile app (already complete)
- [ ] Run migration on production database
- [ ] Deploy backend to Cloudflare
- [ ] Test with mobile app
- [ ] Add authentication/authorization
- [ ] Add rate limiting
- [ ] Set up cron cleanup job

---

**Implementation:** Complete ✅
**Testing:** Pending 🟡
**Deployment:** Ready 🚀

