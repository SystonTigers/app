# 🏆 Syston Tigers Platform - Complete System Guide for AI Assistants

**Last Updated:** 2026-01-14
**Platform Version:** 7.0.0
**Status:** Production-Ready Multi-Tenant SaaS

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Repository Structure](#repository-structure)
3. [Architecture](#architecture)
4. [Technology Stack](#technology-stack)
5. [Development Workflow](#development-workflow)
6. [API Routes Reference](#api-routes-reference)
7. [Database Schema](#database-schema)
8. [Deployment Guide](#deployment-guide)
9. [Key Conventions](#key-conventions)
10. [Testing Strategy](#testing-strategy)
11. [Troubleshooting](#troubleshooting)

---

## System Overview

### What is This?

A **complete multi-tenant SaaS platform for grassroots football clubs**. Starting with Syston Tigers U16, the platform provides:

- 📱 **Mobile App** (React Native/Expo) - iOS & Android
- 🌐 **Web Apps** - Next.js tenant-facing and admin consoles
- ☁️ **Cloudflare Workers Backend** - Serverless API
- 🎥 **Video Processing** - AI-powered highlights
- 🛍️ **E-commerce** - Team store with Printify
- 📊 **Analytics** - Usage tracking and revenue reporting
- 🔔 **Push Notifications** - Geo-aware smart notifications

### Business Model

- **Multi-tenant architecture** - Unlimited clubs on single deployment
- **Pricing tiers**: Starter (Free) → Pro (£29.99/mo) → Elite (Custom)
- **Promo codes** - Discount and lifetime access management
- **Stripe integration** - Subscription billing
- **Cost**: ~$5-15/month for entire platform (unlimited tenants)

### Key Value Proposition

Replace WhatsApp groups, spreadsheets, and Facebook with a unified platform:
- Independent news feed with social media cross-posting
- Calendar with RSVP tracking
- Live match updates with geo-aware notifications
- Training tools, tactics boards, drill library
- Team store with personalized merchandise
- Video highlights with AI processing

---

## Repository Structure

### Monorepo Layout

```
/home/user/app/
├── backend/                 # Cloudflare Workers API (main backend)
│   ├── src/
│   │   ├── index.ts        # Main API entry point
│   │   ├── routes/         # API route handlers (60+ files)
│   │   ├── services/       # Business logic services
│   │   ├── middleware/     # Auth, CORS, validation
│   │   ├── schema/         # D1 database schema
│   │   ├── do/             # Durable Objects (ChatRoom, MatchRoom, etc.)
│   │   └── cron/           # Scheduled tasks
│   ├── wrangler.toml       # Cloudflare configuration
│   └── package.json        # Backend dependencies
│
├── mobile/                  # React Native mobile app (Expo)
│   ├── src/
│   │   ├── screens/        # Screen components
│   │   ├── components/     # Reusable UI components
│   │   ├── services/       # API clients, auth
│   │   ├── i18n/           # Internationalization (en, fr, es)
│   │   └── theme/          # Colors, typography, spacing
│   ├── App.tsx             # App entry point
│   ├── app.json            # Expo configuration
│   └── package.json        # Mobile dependencies
│
├── web-app/                 # Next.js tenant-facing web app
│   ├── src/
│   │   ├── app/            # Next.js App Router pages
│   │   ├── components/     # React components
│   │   └── lib/            # Utilities, API clients
│   ├── next.config.js      # Next.js configuration
│   └── package.json        # Web app dependencies
│
├── owner-admin/             # Next.js platform admin console
│   ├── src/
│   │   └── app/
│   │       ├── (auth)/     # Login pages
│   │       └── (dashboard)/ # Admin dashboard pages
│   ├── next.config.js
│   └── package.json
│
├── web/                     # Legacy/alternate web interface
│
├── workers/                 # Specialized Cloudflare Workers
│   ├── fixtures/           # Fixture sync worker
│   ├── highlights-orchestrator/  # Video processing orchestration
│   └── highlights-uploader/      # Video upload handler
│
├── packages/                # Shared packages (monorepo)
│   ├── sdk/                # Platform SDK
│   │   ├── client.ts       # API client
│   │   └── types.ts        # SDK types
│   └── types/              # Shared TypeScript types
│       └── index.ts        # Type definitions
│
├── video-processing/        # AI video tools (Python/Docker)
│   ├── highlights_bot/     # Python AI video editor
│   ├── football-highlights-processor/  # Docker production setup
│   └── football-highlights-installer/  # CLI installer
│
├── docs/                    # Documentation
│   ├── ARCHITECTURE.md     # System architecture
│   ├── RUNBOOK.md          # Operations guide
│   └── ERROR_CODES.md      # Error reference
│
├── scripts/                 # Build and deployment scripts
├── qa/                      # QA testing and evidence
├── archive/                 # Archived code and docs
│
├── package.json            # Root workspace config
├── wrangler.toml           # Backend worker config
├── CLAUDE.md               # This file
├── PRODUCT_ROADMAP.md      # Feature roadmap
├── README.md               # Main README
└── START_HERE.md           # Quick start guide
```

---

## Architecture

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT APPLICATIONS                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Mobile App  │  │  Web App     │  │ Owner Admin  │          │
│  │  (Expo)      │  │  (Next.js)   │  │  (Next.js)   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          │         HTTPS/JSON API             │
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              CLOUDFLARE WORKERS PLATFORM                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Main Backend Worker (app)                                │  │
│  │  - API Gateway (itty-router)                              │  │
│  │  - 60+ route handlers                                     │  │
│  │  - Auth middleware (JWT, sessions, CSRF)                  │  │
│  │  - Multi-tenant isolation                                 │  │
│  └────────────────────┬──────────────────────────────────────┘  │
│                       │                                          │
│  ┌────────────────────┴──────────────────────────────────────┐  │
│  │  Specialized Workers                                       │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐            │  │
│  │  │ Fixtures   │ │ Highlights │ │ Highlights │            │  │
│  │  │ Sync       │ │ Orchestr.  │ │ Uploader   │            │  │
│  │  └────────────┘ └────────────┘ └────────────┘            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                       │                                          │
│  ┌────────────────────┴──────────────────────────────────────┐  │
│  │  Cloudflare Data Layer                                     │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │  │
│  │  │ D1 (SQL) │ │ KV Store │ │ R2 (S3)  │ │ Queues   │     │  │
│  │  │ Database │ │ (Tenants)│ │ (Media)  │ │ (Async)  │     │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘     │  │
│  │                                                             │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │ Durable Objects (Stateful)                           │  │  │
│  │  │ - ChatRoom      - MatchRoom    - VotingRoom          │  │  │
│  │  │ - GeoFenceManager - TenantRateLimiter                │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
┌──────────────────┐        ┌──────────────────┐
│  External APIs   │        │  Integrations    │
│  - Supabase      │        │  - Make.com      │
│  - Stripe        │        │  - Printify      │
│  - YouTube       │        │  - Google Apps   │
│  - eBay          │        │    Script        │
└──────────────────┘        └──────────────────┘
```

### Multi-Tenant Isolation

**Data Isolation Strategy:**

1. **D1 Database**: `team_id` column in all tables
2. **KV Storage**: Key prefixes (`tenant:${id}:...`)
3. **R2 Storage**: Folder structure (`/${tenant_id}/...`)
4. **Durable Objects**: Namespaced by tenant ID

**Request Flow:**

```typescript
// 1. Extract tenant from request
const tenant = req.headers.get('x-tenant-id') || extractFromJWT(token);

// 2. Validate tenant exists
const tenantConfig = await env.TENANTS.get(`tenant:${tenant}`);
if (!tenantConfig) return error(404, 'Tenant not found');

// 3. Filter all queries by tenant
const matches = await env.DB.prepare(
  'SELECT * FROM matches WHERE team_id = ?'
).bind(tenant).all();

// 4. All responses scoped to tenant
return json({ tenant, data: matches });
```

---

## Technology Stack

### Backend (Cloudflare Workers)

- **Runtime**: Cloudflare Workers (V8 Isolates)
- **Router**: itty-router v4
- **Auth**: jose (JWT), bcryptjs (password hashing)
- **Database**: D1 (SQLite)
- **Storage**: R2 (S3-compatible), KV (key-value)
- **Queues**: Cloudflare Queues (post-queue, highlights-queue)
- **Durable Objects**: Stateful WebSocket coordination
- **Validation**: Zod schemas
- **Build**: esbuild, wrangler CLI
- **Testing**: Vitest (unit + integration)

### Frontend - Mobile (React Native)

- **Framework**: React Native 0.81 + Expo 54
- **Language**: TypeScript 5.9
- **Navigation**: React Navigation 7 (drawer + stack + tabs)
- **State**: Zustand 5 (simple, performant)
- **UI**: React Native Paper 5 (Material Design)
- **HTTP**: Axios 1.12
- **Calendar**: react-native-calendars
- **Auth**: Expo SecureStore + Supabase
- **Push**: Expo Notifications
- **Video**: expo-av, expo-image-picker
- **Maps**: Expo Location
- **i18n**: Expo Localization (en, fr, es)

### Frontend - Web (Next.js)

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: TailwindCSS 3
- **Animation**: Framer Motion 12
- **HTTP**: SWR 2 (stale-while-revalidate)
- **Testing**: Vitest + Playwright (E2E)
- **Build**: Turbopack (Next.js built-in)

### Video Processing (Python/Docker)

- **Runtime**: Python 3.8+
- **AI**: YOLOv8, OpenCV, TensorFlow/PyTorch
- **Encoding**: FFmpeg
- **Orchestration**: Docker Compose
- **Storage**: R2 buckets (VIDEOS_BUCKET, HIGHLIGHTS_BUCKET)

### Integrations

- **Supabase**: User management, real-time subscriptions
- **Stripe**: Subscription billing, payment processing
- **Make.com**: Social media automation (X, Instagram, Facebook)
- **YouTube Data API v3**: Video uploads
- **Printify**: Print-on-demand merchandise
- **Google Apps Script**: Legacy spreadsheet automation
- **eBay**: (Future) Merchandise marketplace

### Cost Breakdown (Monthly)

| Service | Cost | Notes |
|---------|------|-------|
| Cloudflare Workers Paid | $5.00 | Unlimited requests, CPU, Durable Objects |
| R2 Storage (50GB) | $0.75 | $0.015/GB |
| D1 Database | $5.00 | 25M reads, 50M writes included |
| Queues | Free | Included in Workers plan |
| Expo Push Notifications | Free | Unlimited |
| Supabase (Free tier) | $0 | Up to 50K users |
| Make.com | $0-9 | Free tier or Core plan |
| **TOTAL** | **$10-20/mo** | **Unlimited tenants** |

---

## Development Workflow

### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/SystonTigers/app.git
cd app

# 2. Install dependencies (root + all workspaces)
npm install

# 3. Setup backend database
cd backend
npx wrangler d1 execute DB --local --file=./src/schema/d1.sql

# 4. Seed Syston Tigers tenant (optional)
npx wrangler d1 execute DB --local --file=./scripts/seed-syston.sql

# 5. Copy environment files
cp env.sample .env.local
```

### Daily Development

**Terminal 1: Backend**
```bash
cd backend
npm run dev
# Runs on http://localhost:8787
```

**Terminal 2: Web App**
```bash
cd web-app
npm run dev
# Runs on http://localhost:3000
```

**Terminal 3: Mobile App**
```bash
cd mobile
npm start
# Expo DevTools on http://localhost:8081
# Scan QR with Expo Go app
```

**Terminal 4: Owner Admin (optional)**
```bash
cd owner-admin
npm run dev
# Runs on http://localhost:3001
```

### Testing

```bash
# Backend unit tests
cd backend
npm test

# Backend test coverage
npm run test:coverage

# Web app unit tests
cd web-app
npm test

# Web app E2E tests
npm run test:e2e

# Mobile snapshot tests
cd mobile
npm test
```

### Code Quality

```bash
# Lint backend
cd backend
npm run lint

# Lint and fix
npm run lint -- --fix

# Type check (no build)
npm run typecheck
```

### Git Workflow

**Branch Strategy:**
- `main` - Production-ready code
- `develop` - Integration branch
- `claude/claude-md-*` - Feature branches (AI-generated)
- `feature/*` - Manual feature branches
- `hotfix/*` - Emergency fixes

**Commit Convention:**
```bash
# Format: <type>(<scope>): <subject>

git commit -m "feat(mobile): add video recording screen"
git commit -m "fix(backend): resolve CORS issue in admin routes"
git commit -m "docs(claude): update CLAUDE.md with monorepo structure"
git commit -m "test(backend): add unit tests for auth service"
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

---

## API Routes Reference

### Base URLs

- **Local Development**: `http://localhost:8787`
- **Preview**: `https://app-preview.team-platform-2025.workers.dev`
- **Production**: `https://syston-postbus.team-platform-2025.workers.dev`

### Route Categories

The backend has **60+ route files** organized by feature:

#### Core Routes

| Route File | Path Prefix | Description |
|------------|-------------|-------------|
| `auth.ts` | `/api/v1/auth/*` | Login, logout, password reset, JWT refresh |
| `admin.ts` | `/api/v1/admin/*` | Tenant management, feature flags, analytics |
| `health.ts` | `/__meta/*` | Health checks, ping, version |

#### Content & Social

| Route File | Path Prefix | Description |
|------------|-------------|-------------|
| `content.ts` | `/api/v1/content/*` | News feed posts, comments, likes |
| `social.ts` | `/api/v1/social/*` | Social media cross-posting |
| `discussions.ts` | `/api/v1/discussions/*` | Team discussions, threads |
| `chat.ts` | `/api/v1/chat/*` | Real-time chat (Durable Objects) |

#### Matches & Events

| Route File | Path Prefix | Description |
|------------|-------------|-------------|
| `matches.ts` | `/api/v1/matches/*` | Match CRUD operations |
| `fixtures.ts` | `/api/v1/fixtures/*` | Fixture schedule, results |
| `friendlies.ts` | `/api/v1/friendlies/*` | Friendly match management |
| `events.ts` | `/api/v1/events/*` | Match events (goals, cards, subs) |
| `calendar.ts` | `/api/v1/calendar/*` | Calendar events, RSVPs |

#### Team Management

| Route File | Path Prefix | Description |
|------------|-------------|-------------|
| `squad.ts` | `/api/v1/squad/*` | Squad roster, player details |
| `players.ts` | `/api/v1/players/*` | Player profiles, stats |
| `career-stats.ts` | `/api/v1/career-stats/*` | Player career statistics |
| `transfers.ts` | `/api/v1/transfers/*` | Player transfers, loans |
| `registration.ts` | `/api/v1/registration/*` | Player registration, onboarding |

#### Coaching & Training

| Route File | Path Prefix | Description |
|------------|-------------|-------------|
| `coaching.ts` | `/api/v1/coaching/*` | Coaching tools, session plans |
| `training.ts` | `/api/v1/training/*` | Training sessions, attendance |
| `tactics.ts` | `/api/v1/tactics/*` | Tactics boards, formations |

#### Media & Video

| Route File | Path Prefix | Description |
|------------|-------------|-------------|
| `videos.ts` | `/api/v1/videos/*` | Video uploads, highlights |
| `gallery.ts` | `/api/v1/gallery/*` | Photo galleries, albums |
| `youtube-upload.ts` | `/api/v1/youtube/*` | YouTube video uploads |
| `upload.ts` | `/api/v1/upload/*` | Generic file uploads (R2) |

#### E-commerce

| Route File | Path Prefix | Description |
|------------|-------------|-------------|
| `personalized-shop.ts` | `/api/v1/shop/*` | Personalized team store |
| `printify.ts` | `/api/v1/printify/*` | Printify integration |
| `wearables.ts` | `/api/v1/wearables/*` | Team wearables, kits |

#### Engagement

| Route File | Path Prefix | Description |
|------------|-------------|-------------|
| `motm.ts` | `/api/v1/motm/*` | Man of the Match voting |
| `gotm.ts` | `/api/v1/gotm/*` | Goal of the Month voting |
| `fun-stats.ts` | `/api/v1/fun-stats/*` | Fun player statistics |
| `match-report.ts` | `/api/v1/match-report/*` | Match reports, summaries |

#### Administration

| Route File | Path Prefix | Description |
|------------|-------------|-------------|
| `billing.ts` | `/api/v1/billing/*` | Stripe subscriptions, invoices |
| `dues.ts` | `/api/v1/dues/*` | Team dues, payments |
| `members.ts` | `/api/v1/members/*` | Member management |
| `organization.ts` | `/api/v1/organization/*` | Multi-team organizations |
| `seasons.ts` | `/api/v1/seasons/*` | Season management |

#### Integrations

| Route File | Path Prefix | Description |
|------------|-------------|-------------|
| `fa-sync.ts` | `/api/v1/fa-sync/*` | Football Association data sync |
| `opponents.ts` | `/api/v1/opponents/*` | Opponent team data |
| `import.ts` | `/api/v1/import/*` | CSV/JSON data imports |
| `provisioning.ts` | `/api/v1/provision/*` | Tenant provisioning (Durable Object) |

#### Utilities

| Route File | Path Prefix | Description |
|------------|-------------|-------------|
| `push.ts` | `/api/v1/push/*` | Push notification registration |
| `notifications.ts` | `/api/v1/notifications/*` | Notification preferences |
| `settings.ts` | `/api/v1/settings/*` | User/tenant settings |
| `usage.ts` | `/api/v1/usage/*` | Usage tracking, analytics |
| `features.ts` | `/api/v1/features/*` | Feature flag management |

### Authentication

**JWT-based authentication** with optional session cookies.

**Headers Required:**
```http
Authorization: Bearer <JWT_TOKEN>
X-Tenant-ID: syston-tigers
Content-Type: application/json
```

**Example Request:**
```bash
curl -X GET \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "X-Tenant-ID: syston-tigers" \
  https://syston-postbus.team-platform-2025.workers.dev/api/v1/squad
```

**JWT Payload:**
```json
{
  "sub": "user_123abc",
  "tenant_id": "syston-tigers",
  "role": "coach",
  "iat": 1705234567,
  "exp": 1705320967
}
```

---

## Database Schema

### Core Tables

**Teams** (`teams`)
```sql
CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  badge_url TEXT,
  colors_json TEXT,
  slogan TEXT,
  timezone TEXT DEFAULT 'Europe/London',
  plan TEXT DEFAULT 'starter',  -- starter, pro, elite
  team_code TEXT UNIQUE
);
```

**Users** (`users`)
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  role TEXT NOT NULL,  -- manager, coach, player, parent
  team_id TEXT,
  FOREIGN KEY(team_id) REFERENCES teams(id)
);
```

**Matches** (`matches`)
```sql
CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  date_utc INTEGER NOT NULL,
  venue TEXT,
  lat REAL,
  lon REAL,
  status TEXT DEFAULT 'scheduled',  -- scheduled, live, completed
  FOREIGN KEY(team_id) REFERENCES teams(id)
);
```

**Match Events** (`events`)
```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  type TEXT NOT NULL,  -- goal, assist, card_yellow, card_red, sub
  minute INTEGER,
  player_id TEXT,
  assist_id TEXT,
  payload_json TEXT,
  ts INTEGER NOT NULL,
  FOREIGN KEY(match_id) REFERENCES matches(id)
);
```

**Calendar Events** (`calendar_events`)
```sql
CREATE TABLE calendar_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  location TEXT,
  description TEXT,
  created_at INTEGER NOT NULL
);
```

**RSVPs** (`event_rsvps`)
```sql
CREATE TABLE event_rsvps (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL,  -- yes, no, maybe
  created_at INTEGER NOT NULL,
  FOREIGN KEY(event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  UNIQUE(event_id, user_id)
);
```

**Devices** (Push Notifications)
```sql
CREATE TABLE devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL,  -- ios, android
  created_at INTEGER NOT NULL
);
```

### Schema Migrations

**Location**: `backend/src/schema/d1.sql`

**Apply locally:**
```bash
cd backend
npx wrangler d1 execute DB --local --file=./src/schema/d1.sql
```

**Apply to production:**
```bash
npx wrangler d1 execute DB --env production --file=./src/schema/d1.sql
```

**Migration tracking**: Cloudflare D1 automatically tracks applied migrations.

---

## Deployment Guide

### Prerequisites

1. **Cloudflare Account** with Workers Paid plan ($5/month)
2. **Wrangler CLI** installed globally: `npm install -g wrangler`
3. **Authenticated**: `wrangler login`

### One-Time Setup

#### 1. Create Resources

```bash
# Create D1 database
wrangler d1 create syston-db

# Create KV namespaces
wrangler kv:namespace create TENANTS --env production
wrangler kv:namespace create KV_IDEMP --env production
wrangler kv:namespace create FEATURE_FLAGS --env production

# Create R2 buckets
wrangler r2 bucket create syston-media
wrangler r2 bucket create oa-videos
wrangler r2 bucket create oa-highlights

# Create queues
wrangler queues create post-queue
wrangler queues create highlights-queue
wrangler queues create dead-letter
```

#### 2. Update `wrangler.toml`

Copy the resource IDs from step 1 into `backend/wrangler.toml` under `[env.production]`.

#### 3. Set Secrets

```bash
cd backend

# Required secrets
wrangler secret put JWT_SECRET --env production
wrangler secret put SUPABASE_URL --env production
wrangler secret put SUPABASE_SERVICE_ROLE --env production
wrangler secret put STRIPE_SECRET_KEY --env production
wrangler secret put STRIPE_WEBHOOK_SECRET --env production

# Optional secrets
wrangler secret put GAS_WEBAPP_URL --env production
wrangler secret put GAS_HMAC_SECRET --env production
wrangler secret put GOOGLE_SERVICE_ACCOUNT_KEY --env production
wrangler secret put RESEND_API_KEY --env production
wrangler secret put YT_CLIENT_ID --env production
wrangler secret put YT_CLIENT_SECRET --env production
wrangler secret put YT_REFRESH_TOKEN --env production
```

#### 4. Initialize Database

```bash
# Apply schema
npx wrangler d1 execute DB --env production --file=./src/schema/d1.sql

# (Optional) Seed Syston Tigers tenant
npx wrangler d1 execute DB --env production --file=./scripts/seed-syston.sql
```

### Deploy Workers

```bash
# Deploy main backend
cd backend
npm run build
wrangler deploy --env production

# Deploy fixtures worker
cd ../workers/fixtures
wrangler deploy --env production

# Deploy highlights workers
cd ../highlights-orchestrator
wrangler deploy --env production

cd ../highlights-uploader
wrangler deploy --env production
```

### Deploy Web Apps

**Web App (Next.js):**
```bash
cd web-app
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy .next --project-name syston-web-app
```

**Owner Admin (Next.js):**
```bash
cd owner-admin
npm run build
npx wrangler pages deploy .next --project-name syston-owner-admin
```

### Mobile App

**Build for iOS:**
```bash
cd mobile
eas build --platform ios --profile production
```

**Build for Android:**
```bash
eas build --platform android --profile production
```

**Submit to App Stores:**
```bash
eas submit --platform ios
eas submit --platform android
```

### Create New Tenant

Once deployed, create tenants via API:

```bash
# Generate admin JWT
cd backend/scripts
node print-admin-jwt.js

# Create tenant
curl -X POST \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant": "new-club",
    "name": "New Football Club",
    "email": "admin@newclub.com",
    "plan": "starter"
  }' \
  https://syston-postbus.team-platform-2025.workers.dev/api/v1/admin/tenant/create
```

**That's it!** New tenant is live. No re-deployment needed.

---

## Key Conventions

### File Naming

- **Components**: PascalCase (`PlayerCard.tsx`, `MatchList.tsx`)
- **Utilities**: camelCase (`formatDate.ts`, `validateEmail.ts`)
- **Routes**: kebab-case (`career-stats.ts`, `match-report.ts`)
- **Types**: PascalCase with `.types.ts` suffix (`User.types.ts`)

### Code Organization

**Backend Route Structure:**
```typescript
// backend/src/routes/example.ts

import { IRequest } from 'itty-router';
import { Env } from '../types';

export async function handleExample(req: IRequest, env: Env) {
  // 1. Extract tenant
  const tenant = req.params.tenant;

  // 2. Validate tenant
  const tenantConfig = await env.TENANTS.get(`tenant:${tenant}`);
  if (!tenantConfig) {
    return new Response('Tenant not found', { status: 404 });
  }

  // 3. Business logic
  const data = await env.DB.prepare(
    'SELECT * FROM table WHERE team_id = ?'
  ).bind(tenant).all();

  // 4. Return response
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

**Mobile Screen Structure:**
```typescript
// mobile/src/screens/ExampleScreen.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { api } from '../services/api';

export default function ExampleScreen() {
  const theme = useTheme();
  const [data, setData] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const result = await api.get('/api/v1/example');
    setData(result.data);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.primary }]}>
        Example
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold' }
});
```

### Error Handling

**Backend:**
```typescript
// Standardized error responses
return new Response(JSON.stringify({
  error: 'ERROR_CODE',
  message: 'Human-readable message',
  details: { ... }
}), {
  status: 400,
  headers: { 'Content-Type': 'application/json' }
});
```

**Mobile:**
```typescript
try {
  const result = await api.get('/api/v1/data');
  setData(result.data);
} catch (error) {
  if (error.response?.status === 401) {
    // Redirect to login
    navigation.navigate('Login');
  } else {
    // Show error toast
    Alert.alert('Error', error.message);
  }
}
```

### Type Safety

**Shared Types** (`packages/types/index.ts`):
```typescript
export interface Match {
  id: string;
  team_id: string;
  date_utc: number;
  venue: string;
  lat?: number;
  lon?: number;
  status: 'scheduled' | 'live' | 'completed';
}

export interface Player {
  id: string;
  name: string;
  position: string;
  number: number;
  team_id: string;
}
```

**Import in backend:**
```typescript
import { Match, Player } from '@team-platform/types';
```

**Import in mobile:**
```typescript
import type { Match, Player } from '@team-platform/types';
```

### Environment Variables

**Backend** (`backend/.dev.vars`):
```bash
JWT_SECRET=local-dev-secret-min-32-chars
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE=local-service-role-key
```

**Web App** (`.env.local`):
```bash
NEXT_PUBLIC_API_BASE=/api/admin
NEXT_PUBLIC_TENANT_ID=syston-tigers
```

**Mobile** (`mobile/.env`):
```bash
EXPO_PUBLIC_API_URL=https://syston-postbus.team-platform-2025.workers.dev
EXPO_PUBLIC_TENANT_ID=syston-tigers
```

---

## Testing Strategy

### Backend Testing

**Unit Tests** (Vitest):
```bash
cd backend
npm test
```

**Test file location**: `src/routes/__tests__/route-name.test.ts`

**Example:**
```typescript
import { describe, it, expect } from 'vitest';
import { handleExample } from '../example';

describe('Example Route', () => {
  it('should return data for valid tenant', async () => {
    const req = { params: { tenant: 'test' } };
    const env = { /* mock env */ };

    const response = await handleExample(req, env);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('results');
  });
});
```

**Coverage target**: 80%

### Web App Testing

**Unit Tests** (Vitest + React Testing Library):
```bash
cd web-app
npm test
```

**E2E Tests** (Playwright):
```bash
npm run test:e2e
npm run test:e2e:ui  # Interactive mode
```

**Test file location**: `tests/e2e/feature.spec.ts`

### Mobile Testing

**Snapshot Tests**:
```bash
cd mobile
npm test
```

**Manual Testing**: Use Expo Go app on physical device

**Beta Testing**: TestFlight (iOS), Google Play Internal Testing (Android)

---

## Troubleshooting

### Common Issues

#### Backend won't start

**Symptom**: `wrangler dev` fails with binding errors

**Solution**:
```bash
# 1. Check wrangler.toml has correct database_id
# 2. Recreate local database
npx wrangler d1 execute DB --local --file=./src/schema/d1.sql

# 3. Clear wrangler cache
rm -rf .wrangler
```

#### CORS errors in browser

**Symptom**: `Access-Control-Allow-Origin` errors

**Solution**: Check middleware is applied:
```typescript
// backend/src/index.ts
import { cors } from './middleware/cors';

router.all('*', cors);  // Must be before routes
```

#### Authentication fails

**Symptom**: 401 Unauthorized responses

**Solution**:
```bash
# 1. Check JWT_SECRET is set
wrangler secret list

# 2. Verify token format
# Header: Authorization: Bearer <token>

# 3. Check token expiry
# Decode at jwt.io
```

#### Mobile app won't connect to backend

**Symptom**: Network request failed

**Solution**:
```typescript
// Check API URL in mobile/src/config.ts
export const API_BASE_URL = 'http://YOUR_IP:8787';  // Not localhost!

// Use computer's local IP, not localhost
// Find IP: ipconfig (Windows) or ifconfig (Mac/Linux)
```

#### Database queries return empty

**Symptom**: API returns `[]` for valid requests

**Solution**:
```bash
# 1. Check data exists
npx wrangler d1 execute DB --local --command "SELECT * FROM teams"

# 2. Verify team_id matches
# All queries filter by team_id/tenant_id

# 3. Re-seed if needed
npx wrangler d1 execute DB --local --file=./scripts/seed-syston.sql
```

### Debug Tools

**Backend Logs**:
```bash
# Local development
wrangler dev --log-level debug

# Production logs
wrangler tail app --env production
```

**Database Inspection**:
```bash
# Local
npx wrangler d1 execute DB --local --command "SELECT * FROM teams"

# Production
npx wrangler d1 execute DB --env production --command "SELECT * FROM teams"
```

**KV Storage**:
```bash
# List keys
wrangler kv:key list --namespace-id=<ID>

# Get value
wrangler kv:key get "tenant:syston-tigers" --namespace-id=<ID>
```

**R2 Storage**:
```bash
# List objects
wrangler r2 object list syston-media

# Download object
wrangler r2 object get syston-media/path/to/file.jpg
```

### Getting Help

1. **Check Documentation**:
   - `README.md` - Project overview
   - `START_HERE.md` - Quick start guide
   - `PRODUCT_ROADMAP.md` - Feature roadmap
   - `docs/RUNBOOK.md` - Operations guide
   - `docs/ERROR_CODES.md` - Error reference

2. **Search Issues**: Check GitHub issues for similar problems

3. **Ask Team**: Post in team chat with:
   - What you're trying to do
   - What you've tried
   - Error messages (full stack trace)
   - Environment (local/preview/production)

---

## Key Files Reference

### Must-Read Documentation

| File | Purpose |
|------|---------|
| `README.md` | Main project overview, quick start |
| `CLAUDE.md` | This file - complete AI assistant guide |
| `START_HERE.md` | Step-by-step setup for new developers |
| `PRODUCT_ROADMAP.md` | Feature roadmap, 6-month plan |
| `docs/ARCHITECTURE.md` | System architecture deep-dive |
| `docs/RUNBOOK.md` | Operations, deployment, incident response |
| `docs/ERROR_CODES.md` | Complete error code reference |

### Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Root workspace config |
| `backend/wrangler.toml` | Cloudflare Workers config |
| `mobile/app.json` | Expo/React Native config |
| `web-app/next.config.js` | Next.js web app config |
| `owner-admin/next.config.js` | Next.js admin config |

### Database & Schema

| File | Purpose |
|------|---------|
| `backend/src/schema/d1.sql` | D1 database schema |
| `backend/scripts/seed-syston.sql` | Syston Tigers seed data |
| `backend/tenant-config.json` | Default tenant configuration |

### Key Source Files

| File | Purpose |
|------|---------|
| `backend/src/index.ts` | Main API gateway (58KB) |
| `backend/src/routes/` | API route handlers (60+ files) |
| `mobile/App.tsx` | Mobile app entry point |
| `packages/types/index.ts` | Shared TypeScript types |
| `packages/sdk/client.ts` | Platform SDK |

---

## AI Assistant Guidelines

### When Working on This Codebase

1. **Always read relevant files first** - Use Read tool before making changes
2. **Respect monorepo structure** - Understand workspace dependencies
3. **Maintain type safety** - Use TypeScript strictly
4. **Follow conventions** - See "Key Conventions" section
5. **Test before committing** - Run tests locally
6. **Write clear commit messages** - Follow commit convention
7. **Update documentation** - Keep this file current

### Making Changes

**Backend Changes:**
1. Identify route file in `backend/src/routes/`
2. Read existing code
3. Make minimal, focused changes
4. Add/update tests in `__tests__/`
5. Run `npm test`
6. Update API documentation if endpoints changed

**Mobile Changes:**
1. Identify screen in `mobile/src/screens/`
2. Check theme usage for consistency
3. Update i18n files if adding text
4. Test on iOS and Android
5. Update snapshot tests if UI changed

**Database Changes:**
1. Update `backend/src/schema/d1.sql`
2. Create migration script
3. Test locally first
4. Document breaking changes
5. Update seed scripts if needed

### Common Tasks

**Add new API endpoint:**
```bash
# 1. Create or update route file
# File: backend/src/routes/new-feature.ts

# 2. Register route in index.ts
# File: backend/src/index.ts

# 3. Add tests
# File: backend/src/routes/__tests__/new-feature.test.ts

# 4. Update this documentation
# Section: API Routes Reference
```

**Add new mobile screen:**
```bash
# 1. Create screen component
# File: mobile/src/screens/NewFeatureScreen.tsx

# 2. Add navigation
# File: mobile/App.tsx

# 3. Add i18n strings
# Files: mobile/src/i18n/locales/{en,fr,es}.json

# 4. Test on device
# Command: npm start
```

**Add new database table:**
```bash
# 1. Update schema
# File: backend/src/schema/d1.sql

# 2. Apply migration locally
npx wrangler d1 execute DB --local --file=./src/schema/d1.sql

# 3. Update types
# File: packages/types/index.ts

# 4. Create seed data (optional)
# File: backend/scripts/seed-data.sql
```

---

**Last Updated:** 2026-01-14
**Maintainer:** Claude (AI Assistant)
**Status:** Production-Ready

**For questions or updates, refer to the team chat or GitHub issues.**
