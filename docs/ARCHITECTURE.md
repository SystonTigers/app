# System Architecture

## Overview

Multi-tenant SaaS platform for grassroots football clubs with mobile apps, automated content, and video processing.

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     USERS & CLIENTS                              │
├─────────────────────────────────────────────────────────────────┤
│  Mobile App (Expo)  │  Apps Script UI  │  Admin Console         │
│  - React Native     │  - Google Sheets │  - Tenant Management   │
│  - 5 Tabs           │  - Custom Menus  │  - Configuration       │
│  - Video Upload     │  - Web App       │  -Analytics            │
└────────┬────────────┴─────────┬────────┴────────────┬───────────┘
         │                      │                      │
         ▼                      ▼                      ▼
┌────────────────────────────────────────────────────────────────────┐
│                     API LAYER                                       │
├────────────────────────────────────────────────────────────────────┤
│  Cloudflare Workers (4 workers)                                    │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐   │
│  │ syston-      │ integration- │ data-        │ admin-       │   │
│  │ postbus      │ worker       │ manager      │ worker       │   │
│  │ (API Gateway)│ (Make.com)   │ (YouTube)    │ (Tenant CRUD)│   │
│  └──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┘   │
│         │              │              │              │             │
│         ▼              ▼              ▼              ▼             │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │           Cloudflare KV (Multi-Tenant Storage)            │    │
│  │  • tenant:{id} → config                                   │    │
│  │  • feed:{tenant}:{id} → posts                             │    │
│  │  • event:{tenant}:{id} → events                           │    │
│  │  • video:{tenant}:{id} → metadata                         │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │      R2 Storage (Media)                                   │    │
│  │  • videos/{tenant}/uploads/*.mp4                          │    │
│  │  • videos/{tenant}/processed/*.mp4                        │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────┬──────────────┬──────────────────────────────────────┘
               │              │
               ▼              ▼
    ┌──────────────────┐  ┌──────────────────┐
    │   Make.com       │  │  YouTube API v3  │
    │   Webhooks       │  │  Video Uploads   │
    └────────┬─────────┘  └──────────────────┘
             │
             ▼
    ┌──────────────────────────┐
    │  Social Media Platforms   │
    │  • X/Twitter              │
    │  • Instagram              │
    │  • Facebook               │
    └───────────────────────────┘
```

## Apps Script Architecture

```
┌──────────────────────────────────────────────────────────┐
│             Google Apps Script (Server-Side)              │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  📋 Google Sheets (Data Source)                           │
│  ├─ Fixtures                                              │
│  ├─ Results                                               │
│  ├─ Squad (with DOB for birthdays)                        │
│  ├─ Live Match Updates                                    │
│  ├─ Video Clips                                           │
│  └─ CONFIG (tenant settings)                              │
│                                                            │
│  🔧 Core Modules                                          │
│  ├─ Code.gs (entry point)                                 │
│  ├─ config.gs (configuration)                             │
│  ├─ utils.gs (shared utilities)                           │
│  └─ logger.gs (structured logging)                        │
│                                                            │
│  📤 Integration Layer                                     │
│  ├─ make-integration.gs (webhook sender)                  │
│  ├─ video-clips.gs (highlights export)                    │
│  └─ payload-builder.gs (event formatting)                 │
│                                                            │
│  ⏰ Automation Layer                                      │
│  ├─ weekly-scheduler.gs (content automation)              │
│  ├─ trigger-management-svc.gs (scheduled triggers)        │
│  └─ BirthdayAutomation class                              │
│                                                            │
│  🎬 Video Processing                                      │
│  ├─ Export match events → JSON                            │
│  ├─ Trigger highlights bot webhook                        │
│  └─ Upload finished clips to YouTube                      │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

## Video Processing Pipeline

```
PATH A: MOBILE APP
==================
Mobile App → Upload → R2 Storage → Webhook → AI Bot

PATH B: SERVER-SIDE
===================
Google Drive → Apps Script → Export JSON → AI Bot

SHARED PROCESSING
=================
highlights_bot (Python)
  ├─ Read events JSON
  ├─ AI detection (YOLOv8)
  ├─ Cut clips (FFmpeg)
  └─ Output highlights

football-highlights-processor (Docker)
  ├─ Queue management
  ├─ Parallel processing
  └─ Status tracking

Upload & Distribution
  ├─ YouTube API
  ├─ Apps Script metadata
  └─ Social media (via Make.com)
```

## Data Flow

### Match Result Posting

```
1. User enters result in Sheets
   ↓
2. Apps Script processes row
   ↓
3. Build payload with event icons
   ↓
4. Send to Make.com webhook
   ↓
5. Make.com posts to social media
   ↓
6. Update status in Sheets
```

### Video Highlights Creation

```
1. Match recorded → Upload to Drive
   ↓
2. Apps Script: exportEventsForHighlights()
   ├─ Read match events from sheets
   ├─ Generate JSON with timestamps
   └─ Save to Drive
   ↓
3. Apps Script: triggerHighlightsBot()
   ├─ Send webhook to processing server
   └─ Include video URL + events URL
   ↓
4. highlights_bot processes video
   ├─ Download video
   ├─ Read events JSON
   ├─ AI detects moments
   └─ Cut clips
   ↓
5. Upload clips to YouTube
   ├─ Apps Script YouTube integration
   └─ Update Video Clips sheet
   ↓
6. Post clips to social media
   └─ Via Make.com webhook
```

### Birthday Automation

```
Daily at 6 AM (trigger)
  ↓
BirthdayAutomation.runDaily()
  ├─ Read Squad sheet (DOB column)
  ├─ Find today's birthdays
  ├─ Check already processed
  ├─ Create birthday payload
  ├─ Send to Make.com
  └─ Mark as processed
```

## Multi-Tenancy

### Tenant Isolation

**KV Storage:**
```javascript
// Each tenant has isolated data
tenant:syston-tigers → { name, colors, webhook, ... }
feed:syston-tigers:post123 → { content, channels, ... }
event:syston-tigers:evt456 → { type, date, rsvps, ... }
```

**JWT Authentication:**
```javascript
// JWT includes tenant_id
{
  "tenant_id": "syston-tigers",
  "user_id": "user123",
  "role": "admin"
}
```

**Creating New Tenant:**
```bash
# One API call - no re-deployment
curl -X POST https://admin-worker.workers.dev/api/v1/admin/tenants \
  -H "Authorization: Bearer ADMIN_JWT" \
  -d '{"tenant_id": "new-club", "name": "New Club FC", ...}'
```

## Security

- **Apps Script**: OAuth 2.0 (Google account required)
- **Workers**: JWT authentication with tenant_id claims
- **API Keys**: Stored in Script Properties (Apps Script) and Secrets (Workers)
- **Webhooks**: Signature verification (Make.com)
- **Data**: Tenant-isolated in KV, no cross-tenant queries

## Performance

- **Batch Processing**: 250 rows per batch (configurable)
- **Caching**: KV caching for config (TTL: 1 hour)
- **Rate Limiting**: Durable Objects per tenant
- **Concurrent Processing**: 5 video jobs at once

## Monitoring

- **Apps Script**: Structured logging with logger.gs
- **Workers**: Cloudflare Analytics + Tail logs
- **Webhooks**: @testHook markers for testing
- **Video**: Processing status in KV

## Cost Estimate

- **Cloudflare Workers**: $5/month (unlimited tenants)
- **R2 Storage**: ~$1/month (50 videos)
- **Make.com**: Free tier or $9/month
- **YouTube API**: Free (quota limits)
- **VPS (video processing)**: $10/month (optional)

**Total**: $5-25/month depending on features enabled

---

**Last Updated**: 2025-10-07
**Version**: 2.0.0
