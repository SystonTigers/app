# APP_TABS.md Implementation Plan

**Source**: APP_TABS.md
**Status**: In Progress
**Started**: October 8, 2025

---

## Current State vs Required State

### ✅ Currently Implemented (Mobile App)

**6 Tabs:**
1. **Home** - Next event + news feed ✅
2. **Calendar** - Events + RSVP ✅
3. **Fixtures** - Matches & results ✅
4. **Squad** - Team roster ✅
5. **Videos** - Upload/recording ✅
6. **Manage** - Admin dashboard ✅
   - Manage Fixtures
   - Manage Squad
   - Manage Events
   - Create Posts

### 🔴 Missing from Spec

**Public App Tabs (7 missing):**
- ❌ League Table
- ❌ Stats (player leaderboards, MOTM history)
- ❌ Gallery/Images
- ❌ Highlights
- ❌ Payments
- ❌ Shop (Printify)
- ❌ Settings (with location-aware notifications)

**Admin Features (10 missing):**
- ❌ Manage Player Images
- ❌ Manage Payments (read-only)
- ❌ Video Editor (EDL-based)
- ❌ MOTM Vote system
- ❌ Training Plans / Tactic Board
- ❌ End-of-Season Awards Voting
- ❌ Config (Club/Admin settings)
- ❌ Auto-Posts Control Matrix
- ❌ Previous Seasons Archive
- ❌ Advanced fixture wizard (with attendance polls, auto-graphics)

**Integrations (not in mobile app scope):**
- Google Sheets control panel
- Apps Script automations
- Make.com/n8n workflows
- GitHub Pages website
- XbotGo hardware integration

---

## Implementation Phases

### Phase 1: Core Public Features (Priority 1)
**Goal**: Complete the main public-facing tabs

#### 1.1 League Table Screen
- Display league standings (top 10 configurable)
- Columns: P, W, D, L, GF, GA, GD, Pts
- Team badges
- Last updated timestamp
- Pull-to-refresh
- Toggle: Full league vs Top 10

#### 1.2 Stats Screen
- Squad overview cards
- Player detail pages with:
  - Appearances, minutes, goals, assists
  - Cards (yellow/red)
  - Recent form (last 5 matches)
- Leaderboards:
  - Top scorers
  - Top assisters
  - Goals + Assists combined
  - Clean sheets (GK)
  - Most cards
- MOTM history

#### 1.3 Settings Screen (Location-Aware)
**Critical Feature** from spec!

**Profile Section:**
- Name, contact preferences
- Child/guardian link
- Language/timezone

**Notifications:**
- Master toggle
- Teams followed (multi-select)
- Match alerts per-event:
  - Pre-match (24h / 3h / 1h)
  - KO, HT, FT
  - Goals, cards
  - POTM result
  - Clips posted
- **Location-aware alerts:**
  - Use my location toggle
  - Notify only when near venue
  - Radius: 1km / 5km / 10km / custom
  - While travelling to venue (ETA reminder)
- Venue preferences: favourites, muted
- Channels: In-app push, Email, SMS
- Quiet hours: 22:00-07:00 with bypass option

---

### Phase 2: Media & Commerce (Priority 2)

#### 2.1 Gallery Screen
- Albums by match/event
- Photo upload (with consent notice)
- Throwback Thursday tag
- Request removal flow
- GDPR compliance notices

#### 2.2 Highlights Screen
- Clip playlists per match
- YouTube integration
- Inline video playback
- Goal of the Month:
  - Nominees
  - Voting window
  - Winners archive

#### 2.3 Payments Screen
- Link/embed to payment platform
- Read-only status widget
- Sponsor thank-yous

#### 2.4 Shop Screen
- Printify storefront embed/link
- Image Post Template explainer

---

### Phase 3: Enhanced Admin Features (Priority 3)

#### 3.1 Manage Player Images
- Upload/replace headshots
- Action shots
- Bulk import from Drive/folder

#### 3.2 Manage Payments
- Read-only status from payment platform
- Export CSV

#### 3.3 Video Editor
- Event EDLs from sheet
- Variants: 16:9 / 1:1 / 9:16
- Scoreboard overlay + stinger
- Auto-upload to YouTube
- URL write-back

#### 3.4 MOTM Vote System
- Create vote (window, nominees)
- Live tally
- Result publish
- Auto-post to socials

#### 3.5 Training Plans / Tactic Board
- Whiteboard with saved boards
- Attach to session
- Share with team

#### 3.6 End-of-Season Awards
- Categories management
- Nominees
- Voting window
- Publish winners
- Archive

#### 3.7 Config (Club/Admin)
- Club details, colors, badges
- Sponsor logos
- Nav/footer links
- Feature flags (enable/disable modules)
- External IDs (FA Full-Time, YouTube, Printify)
- Quiet-hour policy
- Rate limits

#### 3.8 Auto-Posts Control Matrix
**Critical automation feature!**

- Post types:
  - Fixture countdowns (T-3/2/1/Matchday)
  - Live match updates
  - Half-time, Full-time
  - League fixtures batch
  - Results summary
  - Table update
  - Postponements
  - Birthdays, Quotes
  - MOTM result
  - Highlights/Clips

- Channel toggles per post type:
  - App News Feed: On/Off
  - X: On/Off
  - Instagram: On/Off
  - Facebook: On/Off
  - TikTok: On/Off
  - Scheduled time (e.g., 07:30 local)
  - Sponsor overlay: On/Off

- Inheritance:
  1. Global defaults (club-wide)
  2. Team overrides
  3. One-off overrides at send time

---

### Phase 4: Advanced Features (Priority 4)

#### 4.1 Previous Seasons Archive
- Season picker
- Archived fixtures/results
- Historical tables
- Stats archives
- Galleries
- Posts

#### 4.2 Live Match Features
- Live ticker (latest event only)
- Auto-expire after FT window (~90 mins)
- Watch Live button (visible during match)
- Real-time score updates

#### 4.3 Advanced Fixture Wizard
- Match type: Friendly / Tournament / Charity / Other
- Opponent suggestions
- Venue map search / saved venues
- Create attendance poll
- Auto-generate graphics
- Schedule teaser

---

## Technical Implementation Details

### Navigation Updates Required

**Current: 6 tabs**
```
Home | Calendar | Fixtures | Squad | Videos | Manage
```

**Proposed: 11 tabs** (too many!)
```
Home | News | Fixtures | Table | Stats | Gallery | Highlights | Payments | Shop | Settings | Manage
```

**Recommended: Use bottom tabs + drawer navigation**

**Bottom Tabs (6):**
```
Home | Fixtures | Stats | Videos | More | Manage
```

**"More" Drawer:**
- News Feed
- League Table
- Gallery
- Highlights
- Payments
- Shop
- Settings
- Previous Seasons

### Data Models Needed

#### AutoPostsMatrix
```typescript
type ChannelKey = "x" | "ig" | "fb" | "tiktok";
type PostType = "COUNTDOWN" | "LIVE" | "HT" | "FT" | ...;

interface AutoPostConfig {
  app: boolean;
  channels: Record<ChannelKey, boolean>;
  scheduleTime?: string;
  sponsorOverlay?: boolean;
}

type AutoPostsMatrix = Record<PostType, AutoPostConfig>;
```

#### Location-Aware Notifications
```typescript
interface NotificationPreferences {
  masterToggle: boolean;
  teamsFollowed: string[];
  matchAlerts: {
    prematch24h: boolean;
    prematch3h: boolean;
    prematch1h: boolean;
    kickoff: boolean;
    halftime: boolean;
    fulltime: boolean;
    goals: boolean;
    cards: boolean;
    potm: boolean;
    clips: boolean;
  };
  locationAware: {
    enabled: boolean;
    notifyOnlyNearVenue: boolean;
    radius: number; // meters
    etaReminder: boolean;
  };
  venuePre​ferences: {
    favorites: string[];
    muted: string[];
  };
  channels: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // "22:00"
    end: string; // "07:00"
    allowUrgentBypass: boolean;
  };
}
```

#### League Table
```typescript
interface LeagueTableRow {
  position: number;
  team: string;
  teamBadge: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}
```

#### Player Stats
```typescript
interface PlayerStats {
  playerId: string;
  name: string;
  number: number;
  position: string;
  photo?: string;
  season: string;
  appearances: number;
  minutes: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  cleanSheets?: number; // for GK
  recentForm: ('W' | 'D' | 'L' | 'N')[];
  motmCount: number;
}
```

---

## Backend API Endpoints Needed

### New Endpoints for Phase 1

```
GET  /api/v1/table              # League table
GET  /api/v1/stats/squad        # Squad stats overview
GET  /api/v1/stats/player/:id   # Individual player stats
GET  /api/v1/stats/leaderboards # Top scorers, assisters, etc.
GET  /api/v1/motm/history       # MOTM winners history

GET  /api/v1/user/settings      # User preferences
PUT  /api/v1/user/settings      # Update preferences
POST /api/v1/user/location      # Update user location for geo-fencing
```

### Phase 2

```
GET  /api/v1/gallery/albums     # Photo albums
GET  /api/v1/gallery/:albumId   # Album photos
POST /api/v1/gallery/upload     # Upload photo
DELETE /api/v1/gallery/:photoId # Request removal

GET  /api/v1/highlights         # Highlight clips
GET  /api/v1/highlights/gotm    # Goal of the Month
POST /api/v1/highlights/vote    # Vote for GOTM

GET  /api/v1/payments/status    # Payment status
GET  /api/v1/shop/products      # Shop items
```

### Phase 3

```
POST /api/v1/admin/images/upload      # Player images
PUT  /api/v1/admin/config              # Club config
GET  /api/v1/admin/config              # Get config

POST /api/v1/admin/motm/create         # Create MOTM vote
POST /api/v1/admin/motm/close          # Close voting
GET  /api/v1/admin/motm/results        # Get results

POST /api/v1/admin/video/edl           # Create video from EDL
GET  /api/v1/admin/video/status/:id    # Check render status

GET  /api/v1/admin/autoposts           # Get auto-post matrix
PUT  /api/v1/admin/autoposts           # Update matrix
```

---

## Dependencies to Install

```bash
# Location services
npx expo install expo-location

# Camera/Photos (already installed)
# expo-image-picker ✅

# Video playback (already installed)
# expo-av ✅

# Web browser (for external links)
npx expo install expo-web-browser

# Secure storage (for settings)
npx expo install expo-secure-store

# Push notifications
npx expo install expo-notifications

# Maps (for venue selection)
npx expo install react-native-maps
```

---

## QA Checklist from Spec

- [ ] Location-aware notifications: geofence distance logic & permissions
- [ ] Add Friendly wizard writes correctly
- [ ] Edit/postpone/cancel flows propagate to site + socials
- [ ] Auto-posts matrix: Global → Team → One-off precedence
- [ ] Quiet hours respected except urgent types when enabled
- [ ] Table mapping pipeline produces valid output
- [ ] Live ticker shows latest only; expires after FT window
- [ ] GDPR/consent variations verified in gallery uploads
- [ ] Retry/backoff on all outbound social/media calls

---

## Implementation Timeline

### Week 1 (Oct 8-14)
- ✅ Create implementation plan
- 🔄 Build League Table screen
- 🔄 Build Stats screen
- 🔄 Build Settings screen with location-aware notifications

### Week 2 (Oct 15-21)
- Gallery screen
- Highlights screen
- Payments screen
- Shop screen

### Week 3 (Oct 22-28)
- Enhanced admin features (MOTM, video editor)
- Auto-posts control matrix
- Config management

### Week 4 (Oct 29 - Nov 4)
- Previous seasons archive
- Training plans / tactic board
- Awards voting
- Polish & testing

---

## Out of Scope (Backend/Integration Work)

These are mentioned in spec but are backend/automation work, not mobile app:

- Google Sheets control panel setup
- Apps Script triggers and functions
- Make.com/n8n workflow configuration
- GitHub Pages website generation
- Cloudflare Workers queue consumers (already built)
- XbotGo hardware integration
- Canva API integrations

---

## Questions for Clarification

1. **Navigation**: Should we use drawer navigation for the "More" section, or stick with tabs?
2. **Priority**: Which phase should we start with? (Recommend Phase 1)
3. **Backend**: Do you want me to also build the backend API endpoints, or focus on mobile UI only?
4. **Integrations**: Google Sheets, Apps Script, Make.com - are these separate projects or part of mobile app scope?

---

**Ready to start building Phase 1!**

Starting with:
1. League Table screen
2. Stats screen
3. Settings screen (location-aware notifications)
