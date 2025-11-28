# Current State – SystonApp Platform

**Last Updated:** 2025-11-28
**Status:** Active Development (Production-Ready Backend, Web App in Beta, Mobile in Development)

---

## Executive Summary

**SystonApp** is a multi-tenant SaaS platform for grassroots football clubs. The platform consists of:

1. **Backend API** – Cloudflare Workers with D1, KV, R2, Durable Objects, and Queues
2. **Web Admin Console** – Next.js 16 app for tenant management
3. **Mobile App** – React Native + Expo (iOS/Android)
4. **Apps Script Integration** – Google Apps Script for automation and legacy data management
5. **Video Processing** – Python/Docker tools for AI-powered highlight generation

The system is **multi-tenant from day one**: adding a new club requires zero code changes or deployments.

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTS & INTERFACES                      │
├─────────────────────────────────────────────────────────────┤
│  Mobile App         │  Web Admin        │  Apps Script UI   │
│  (React Native)     │  (Next.js 16)     │  (Google Sheets)  │
└────────┬────────────┴─────────┬─────────┴──────────┬────────┘
         │                      │                     │
         ▼                      ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│              CLOUDFLARE WORKERS BACKEND                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Main Worker (backend/src/index.ts)                  │   │
│  │  • REST API (v1)                                     │   │
│  │  • Authentication (JWT + Cookie)                     │   │
│  │  • Multi-tenant routing                              │   │
│  │  • Queue producers                                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Additional Workers                                   │   │
│  │  • fixtures worker (match data aggregation)          │   │
│  │  • admin worker (legacy admin console)               │   │
│  │  • setup worker (legacy onboarding)                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Storage & State                                      │   │
│  │  • D1 (SQLite): tenants, users, subscriptions, feed  │   │
│  │  • KV: tenant configs, feature flags, idempotency    │   │
│  │  • R2: media, videos, highlights                     │   │
│  │  • Queues: post-queue, highlights-queue, DLQ         │   │
│  │  • Durable Objects: rate limiting, chat, voting, geo │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────┬──────────────────┬────────────────────────┘
                   │                  │
                   ▼                  ▼
         ┌──────────────────┐  ┌──────────────────┐
         │   Apps Script    │  │  Make.com        │
         │   (Automation)   │  │  (Social Posts)  │
         └────────┬─────────┘  └──────┬───────────┘
                  │                   │
                  ▼                   ▼
         ┌────────────────────────────────────┐
         │  External Services                 │
         │  • YouTube API                     │
         │  • X/Twitter, Instagram, Facebook  │
         │  • Google Sheets                   │
         └────────────────────────────────────┘
```

---

## Components (What Actually Exists)

### 1. Backend (`/backend`)

**Tech Stack:**
- Cloudflare Workers (TypeScript)
- D1 Database (SQLite)
- KV Namespaces (3: TENANTS, FEATURE_FLAGS, KV_IDEMP)
- R2 Buckets (3: media, videos, highlights)
- Queues (3: post-queue, highlights-queue, dead-letter)
- Durable Objects (6: TenantRateLimiter, VotingRoom, ChatRoom, MatchRoom, GeoFenceManager, Provisioner)

**Main File:** `backend/src/index.ts` (181KB - handles all routes)

**Key Features:**
- RESTful API at `/api/v1/*`
- JWT authentication (signed tokens)
- Cookie-based auth for web admin
- Per-tenant data isolation
- Queue-based async processing
- Cron jobs (every 5 minutes)

**Database (D1):**
- Schema: `backend/migrations/*.sql` (13 migrations applied)
- Tables: tenants, users, subscriptions, feed_posts, events, fixtures, squad, etc.

**Deployment:**
```bash
cd backend
npx wrangler deploy                    # Deploy to production
npx wrangler dev --local --port 8787  # Run locally
```

**Environments:**
- `production`: Live environment
- `preview`: Staging/testing environment
- Local dev: Uses local D1 database

---

### 2. Web Admin Console (`/web-app`)

**Tech Stack:**
- Next.js 16 (React 19, Turbopack)
- TypeScript
- Server-side API proxy to avoid CORS
- Cookie-based authentication

**Key Pages:**
- `/admin/login` – Admin login
- `/admin` – Dashboard (stats, recent activity)
- `/admin/tenants` – Tenant management
- `/admin/promo-codes` – Promo code management
- `/signup` – Self-service tenant onboarding

**Development:**
```bash
cd web-app
npm run dev -- --turbopack   # Run on :3000
```

**API Proxy:**
- All `/api/admin/*` requests proxy to backend worker
- Automatically includes auth cookies
- No CORS issues

**Status:** ✅ Working (as of 2025-11-28 per START_HERE.md)

---

### 3. Mobile App (`/mobile`)

**Tech Stack:**
- React Native 0.81.4
- Expo 54
- React Navigation (tabs + stack)
- React Native Paper (UI)
- Zustand (state)
- Supabase client (auth)

**Screens:**
- Home: Next event + news feed
- Calendar: Event calendar with RSVP
- Fixtures: Upcoming matches and results
- Squad: Team roster
- Videos: Record/upload/view highlights
- Admin screens (coach-only)

**Development:**
```bash
cd mobile
npm start     # Start Expo dev server
```

**Status:** 🚧 In Development (UI complete, backend integration in progress)

---

### 4. Apps Script Integration (`/apps-script`)

**Purpose:**
- Legacy automation and data management
- Google Sheets as data source
- Historical data import (CSV → backend)
- Video metadata tracking
- Weekly content scheduling
- Birthday automation

**Key Files:**
- `src/Code.gs` – Main entry point
- `src/config.gs` – Configuration
- `src/make-integration.gs` – Webhook sender to Make.com
- `src/video-clips.gs` – Video export to JSON
- `src/weekly-scheduler.gs` – Content automation

**Deployment:**
```bash
cd apps-script
clasp push   # Deploy to Google Apps Script
```

**Status:** ✅ Working (provides bridge to Google Sheets data)

---

### 5. Video Processing System (`/video-processing`)

**Components:**

#### 5.1 highlights_bot (Python AI)
- **Purpose:** AI-powered highlight detection and editing
- **Tech:** Python, OpenCV, YOLOv8, FFmpeg
- **Location:** `video-processing/highlights_bot/`
- **Status:** 🚧 Not deployed (needs Python environment + dependencies)

#### 5.2 football-highlights-processor (Docker)
- **Purpose:** Production-scale video processing queue
- **Tech:** Docker Compose, multi-worker queue
- **Location:** `video-processing/football-highlights-processor/`
- **Status:** 🚧 Not deployed (needs Docker host)

#### 5.3 football-highlights-installer (Node.js)
- **Purpose:** One-command setup for video tools
- **Tech:** Node.js CLI
- **Location:** `video-processing/football-highlights-installer/`
- **Status:** 📦 Ready to use

**Deployment:**
```bash
cd video-processing/football-highlights-processor
docker-compose up -d --scale worker=3
```

**Status:** 📋 Planned (infrastructure exists, needs deployment)

---

### 6. Additional Workers (`/workers` and `/admin`, `/setup`)

**Fixtures Worker (`/workers/fixtures`):**
- Aggregates fixture data from external sources
- Deployed separately
- Called by main backend worker

**Admin Worker (`/admin`):**
- Legacy admin console (HTML-based)
- Being replaced by Next.js web-app
- Status: 🔄 Deprecated (use web-app instead)

**Setup Worker (`/setup`):**
- Legacy self-serve onboarding
- Being replaced by web-app signup flow
- Status: 🔄 Deprecated (use web-app instead)

---

## Data Flow Examples

### 1. User Creates a News Post

```
1. Admin logs in to web-app
2. POST /api/admin/feed/create
   └─> Backend validates tenant, user, permissions
   └─> Inserts into D1 (feed_posts table)
   └─> If channels include social media:
       └─> Enqueue to post-queue
       └─> Queue consumer sends to Make.com webhook
       └─> Make.com posts to X, Instagram, Facebook
3. Mobile app fetches feed
   └─> GET /api/v1/feed?tenant=syston-tigers
   └─> Returns posts from D1
```

### 2. Video Upload from Mobile App

```
1. User records video in mobile app
2. POST /api/v1/videos/upload
   └─> Upload to R2 (videos bucket)
   └─> Create metadata in D1
   └─> Enqueue to highlights-queue
3. Queue consumer triggers video processing
   └─> (Not implemented yet: would call highlights_bot)
4. Finished highlights uploaded to R2 (highlights bucket)
5. Notify user via push notification
```

### 3. Tenant Onboarding

```
1. User visits web-app/signup
2. Enters promo code (e.g., SYSTON100)
3. POST /api/admin/tenant/create
   └─> Validate promo code
   └─> Create tenant in D1
   └─> Create KV entries for config
   └─> Trigger Apps Script to create Google Sheets
   └─> Send welcome email (via Resend)
4. Tenant is live immediately (no deployment needed)
```

---

## Key Technologies

| Technology | Purpose | Cost |
|------------|---------|------|
| **Cloudflare Workers** | Serverless backend | $5/month |
| **D1 Database** | Relational data (SQLite) | Included |
| **KV** | Config, caching | Included |
| **R2** | Media storage | ~$0.50/month |
| **Queues** | Async processing | Included |
| **Durable Objects** | Stateful services | Included |
| **Next.js (Vercel)** | Admin console | Free tier OK |
| **Expo** | Mobile app dev | Free |
| **Apps Script** | Automation | Free |
| **Make.com** | Social posting | Free tier (1K ops/month) |

**Total Monthly Cost:** $5-10/month for unlimited tenants

---

## Current Tenant: Syston Tigers

**Tenant ID:** `syston-tigers`
**Plan:** Pro (Lifetime)
**Promo Code:** SYSTON100 (100% off, lifetime)
**Admin Email:** systontowntigersfc@gmail.com
**Colors:** Gold (#FFD700), Black (#000000)

**Status:** ✅ Fully configured and seeded in database

---

## Development Workflow

### Local Development

**Terminal 1: Backend**
```bash
cd backend
npx wrangler dev --local --port 8787
```

**Terminal 2: Web App**
```bash
cd web-app
npm run dev -- --turbopack    # Runs on :3000
```

**Terminal 3: Mobile App (optional)**
```bash
cd mobile
npm start                      # Expo dev server
```

### Quick Health Checks

```bash
# Backend health
curl http://localhost:8787/__meta/ping

# Web app proxy working
curl -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/admin/__meta/ping

# Database migrations applied
cd backend && npx wrangler d1 execute syston-db-local --local --command "SELECT COUNT(*) FROM tenants"
```

---

## Deployment

### Production Deployment

**Backend:**
```bash
cd backend
npm run build
npx wrangler deploy --env production
```

**Web App:**
```bash
cd web-app
npm run build
# Deploy to Vercel/Cloudflare Pages
```

**Mobile App:**
```bash
cd mobile
eas build --profile production --platform all
eas submit --platform all
```

### Secrets Management

**Backend secrets (set once globally):**
```bash
wrangler secret put JWT_SECRET --env production
wrangler secret put GAS_WEBAPP_URL --env production
wrangler secret put GAS_HMAC_SECRET --env production
wrangler secret put SUPABASE_SERVICE_ROLE --env production
wrangler secret put RESEND_API_KEY --env production
wrangler secret put GOOGLE_SERVICE_ACCOUNT_KEY --env production
```

**Web app environment variables:**
- `NEXT_PUBLIC_API_BASE=/api/admin`
- Set in Vercel/Pages dashboard

---

## Known Limitations & TODOs

### Immediate Priorities

1. **Mobile App Backend Integration** – Connect mobile app to real backend API (currently using mock data)
2. **Video Processing Deployment** – Deploy highlights_bot and processor to production
3. **Push Notifications** – Implement Expo push notifications
4. **Real-time Features** – Enable WebSocket connections for live match updates

### Security Improvements Needed

1. **JWT Storage in Mobile** – Use secure storage (react-native-keychain) instead of AsyncStorage
2. **CSRF Protection** – Add CSRF tokens to web admin forms
3. **Rate Limiting** – Enable Durable Object rate limiting per tenant
4. **Input Validation** – Add zod/yup validation on all API inputs

### Documentation Issues

- Many historical docs are outdated or duplicate CLAUDE.md
- Architecture docs reference 4 workers but code shows 1 main + 3 legacy
- Deployment guides reference non-existent workers

---

## File Structure (High-Level)

```
app/
├── backend/              # Main Cloudflare Worker
│   ├── src/
│   │   ├── index.ts      # Main API (181KB monolith)
│   │   ├── routes/       # Route handlers
│   │   ├── services/     # Business logic
│   │   ├── do/           # Durable Objects
│   │   └── lib/          # Utilities
│   ├── migrations/       # D1 database migrations (13 applied)
│   ├── tests/            # Unit & integration tests
│   └── wrangler.toml     # Worker configuration
├── web-app/              # Next.js 16 admin console
│   ├── app/              # Next.js 16 app router
│   ├── components/       # React components
│   └── lib/              # Utilities
├── mobile/               # React Native + Expo
│   ├── src/
│   │   ├── screens/      # App screens
│   │   ├── components/   # Reusable UI
│   │   └── services/     # API client
│   └── assets/           # Images, fonts
├── apps-script/          # Google Apps Script
│   └── src/              # .gs files
├── video-processing/     # Video AI tools
│   ├── highlights_bot/   # Python AI
│   ├── football-highlights-processor/  # Docker
│   └── football-highlights-installer/  # CLI
├── workers/              # Additional workers
│   └── fixtures/         # Fixture aggregation
├── admin/                # ⚠️ DEPRECATED legacy admin worker
├── setup/                # ⚠️ DEPRECATED legacy setup worker
├── docs/                 # ✅ Core documentation
│   ├── CURRENT_STATE.md  # This file
│   ├── ARCHITECTURE.md   # System architecture
│   ├── RUNBOOK.md        # Operations runbook
│   ├── ERROR_CODES.md    # Error reference
│   └── archive/          # Obsolete docs
├── CLAUDE.md             # ✅ Comprehensive AI assistant guide
├── README.md             # ✅ Quick start guide
├── PRODUCT_ROADMAP.md    # ✅ Feature roadmap
└── START_HERE.md         # ✅ Developer quick start

# All other .md files at root level are candidates for archival
```

---

## Next Steps (As of 2025-11-28)

### This Week
1. ✅ Fix web-app admin login (DONE per START_HERE.md)
2. ✅ Test tenant creation flow (DONE)
3. 🔄 Connect mobile app to backend API (IN PROGRESS)
4. 🔄 Deploy video processing infrastructure (PLANNED)

### This Month
1. Enable push notifications in mobile app
2. Implement live match updates (WebSocket via Durable Objects)
3. Add real-time chat (ChatRoom Durable Object)
4. Launch beta to Syston Tigers parents

### This Quarter
1. Onboard second tenant (validate multi-tenancy)
2. Build tenant analytics dashboard
3. Add billing integration (Stripe)
4. Scale to 10 clubs

---

## Support & Resources

**Documentation:**
- This file: Current state snapshot
- `docs/ARCHITECTURE.md`: Deep-dive into architecture
- `docs/RUNBOOK.md`: Operations and incident response
- `CLAUDE.md`: Complete system guide for AI assistants
- `README.md`: Quick start for developers

**GitHub:**
- Main repo: https://github.com/SystonTigers/app

**Cloudflare:**
- Dashboard: https://dash.cloudflare.com
- Worker logs: `wrangler tail app`

**Questions?**
- Check `docs/ERROR_CODES.md` for error reference
- Check `docs/RUNBOOK.md` for troubleshooting
- Search GitHub issues for similar problems

---

**Document Owner:** System Architecture Team
**Review Frequency:** Monthly (update as architecture evolves)
**Last Reviewed:** 2025-11-28
