# 🏆 Syston Tigers Platform - Complete System Guide for Claude

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Repositories](#repositories)
4. [Key Features](#key-features)
5. [Technology Stack](#technology-stack)
6. [Deployment Guide](#deployment-guide)
7. [Mobile App](#mobile-app)
8. [API Reference](#api-reference)
9. [Current Status](#current-status)
10. [Next Steps](#next-steps)

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

### 3. **syston-mobile** (Mobile App Frontend)
**Location:** `C:\Users\clayt\syston-mobile`
**GitHub:** Not yet created (local only)

**Purpose:**
- React Native mobile app
- Expo for cross-platform (iOS + Android)
- Consumer-facing interface

**Key Files:**
```
syston-mobile/
├── src/
│   ├── config.ts                 # API URL, colors, tenant ID
│   ├── services/
│   │   └── api.ts               # API client (axios)
│   └── screens/
│       ├── HomeScreen.tsx       # Next event + news feed
│       ├── CalendarScreen.tsx   # Events + RSVP
│       ├── FixturesScreen.tsx   # Matches + results
│       └── SquadScreen.tsx      # Player roster
├── App.tsx                       # Navigation setup
└── package.json
```

**Run Development Server:**
```bash
cd ~/syston-mobile
npx expo start
# Access QR code at http://localhost:8081
```

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

#### 5. **Bottom Tab Navigation**
- 🏠 Home - Next event widget + scrollable feed
- 📅 Calendar - Visual calendar + RSVP
- ⚽ Fixtures - Matches and results
- 👥 Squad - Team roster

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
- [x] 4 main screens built (Home, Calendar, Fixtures, Squad)
- [x] Bottom tab navigation
- [x] API integration layer ready
- [x] Mock data working in all screens
- [x] QA test infrastructure created
- [x] Documentation (this file!)

### 🚧 In Progress
- [ ] Deploy backend workers to get live URLs
- [ ] Connect mobile app to real backend
- [ ] Replace mock data with API calls

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
cd ~/syston-mobile

# Install dependencies
npm install

# Start dev server
npx expo start

# Start with cache clear
npx expo start --clear

# Build for iOS (Mac only)
npx expo build:ios

# Build for Android
npx expo build:android
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

**Last Updated:** 2025-10-06
**System Status:** Development (Mock Data)
**Next Milestone:** Deploy backend workers and connect real data
**Overall Progress:** 7/10 towards production-ready
