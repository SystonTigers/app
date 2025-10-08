# System Architecture

## Overview

Multi-tenant SaaS platform for grassroots football clubs with mobile apps, automated content, and video processing.

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Mobile App (React Native)                     │
│              Expo · iOS/Android · Push Notifications             │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS/REST API
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Cloudflare Workers (Multi-Tenant Backend)           │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐  │
│  │ syston-      │ fixtures     │ admin        │ setup        │  │
│  │ postbus      │ worker       │ console      │ console      │  │
│  │ (API)        │              │              │              │  │
│  └──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┘  │
│         │              │              │              │           │
│         ▼              ▼              ▼              ▼           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │    Cloudflare KV (Multi-Tenant Data Store)               │   │
│  │    tenant:{id}, feed:{tenant}:{id}, event:{tenant}:{id}  │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │    R2 Storage (Media: Videos, Images, Match Footage)     │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────┬──────────────────┬─────────────────────────┬─┘
                   │                  │                         │
                   ▼                  ▼                         ▼
         ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐
         │   Apps Script    │  │  Make.com    │  │  Video Processor │
         │   (Automation)   │  │  (Social)    │  │  (Python/Docker) │
         └────────┬─────────┘  └──────┬───────┘  └────────┬─────────┘
                  │                   │                   │
                  ▼                   ▼                   ▼
         ┌────────────────────────────────────────────────────┐
         │  External Services: YouTube, X, Instagram, FB      │
         └────────────────────────────────────────────────────┘
```

## Components

### 1. Mobile App
**Tech**: React Native, Expo
**Purpose**: Consumer-facing iOS/Android app
**Features**:
- News feed with RSVP
- Calendar and events
- Fixtures and results
- Squad management
- Video recording/upload
- Push notifications (geo-aware)

### 2. Cloudflare Workers
**Tech**: Cloudflare Workers, TypeScript
**Purpose**: Serverless multi-tenant backend
**Workers**:
- `syston-postbus`: Main API gateway
- `fixtures`: Match data aggregation
- `admin-console`: Tenant management
- `setup-console`: Self-serve onboarding

**Storage**:
- **KV**: Fast key-value store for tenant configs, posts, events
- **R2**: Object storage for videos and images
- **Durable Objects**: Stateful coordination (geo-fencing, rate limiting)

### 3. Apps Script (Automation Hub)
**Tech**: Google Apps Script, JavaScript
**Purpose**: Content automation and integrations
**Files**: apps-script/ directory
**Features**:
- Weekly content scheduler
- Historical data import (CSV)
- Video highlights export (JSON)
- Birthday automation
- Drive organization
- YouTube uploads

### 4. Make.com Integration
**Tech**: Make.com (Integromat)
**Purpose**: Social media cross-posting
**Flow**: Apps Script → Webhook → Make.com → X/Instagram/Facebook

### 5. Video Processing System
**Tech**: Python, OpenCV, YOLOv8, Docker
**Purpose**: AI-powered highlight detection and editing
**Components**:
- `highlights_bot`: AI detection and editing (Python)
- `football-highlights-processor`: Docker queue system
- `football-highlights-installer`: Setup CLI

## Data Flow

### Content Publishing
```
1. Admin creates post in Apps Script
2. Apps Script → Make.com webhook
3. Make.com posts to social media
4. Apps Script → Cloudflare API
5. Mobile app fetches via API
6. Push notification sent
```

### Video Processing
```
PATH A (Mobile):
1. User records video in app
2. Upload to R2 via API
3. Trigger processing queue

PATH B (Server-Side):
1. Upload match video to Google Drive
2. Apps Script exports JSON metadata
3. Trigger processing queue

SHARED:
4. Python bot detects highlights
5. Generate clips
6. Upload to YouTube
7. Post to social media
8. Notify users
```

### Multi-Tenant Isolation
```
JWT Token: { tenant_id: "syston-tigers", user_id: "abc123", role: "admin" }
KV Keys: feed:syston-tigers:post123, event:syston-tigers:evt456
R2 Paths: videos/syston-tigers/uploads/, images/syston-tigers/gallery/
```

## Security

- **JWT Authentication**: Backend verifies all requests
- **CORS**: Configured for mobile app origins
- **Webhook Signatures**: Validated on Make.com webhooks
- **Input Sanitization**: All user inputs validated
- **Secrets Management**: Wrangler secrets (never in code)
- **Rate Limiting**: Per-tenant via Durable Objects

## Scalability

**Current**: 1 tenant (Syston Tigers)
**Target**: 100+ tenants
**Architecture**: Fully multi-tenant from day 1

**Per-Tenant Costs**: $0 (shared infrastructure)
**Total Infrastructure**: ~$15-20/month unlimited tenants

## Key Design Decisions

1. **Multi-tenant from day 1**: No migration needed when scaling
2. **Serverless-first**: No servers to manage, auto-scaling
3. **Mobile-first**: PWA considered but native app for better UX
4. **Automation hub**: Apps Script as central orchestrator
5. **Dual video modes**: Mobile quick clips + server-side full matches
