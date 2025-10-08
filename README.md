# SystonApp – Multi-Tenant Football Team Platform

**Complete SaaS platform for grassroots football clubs** with mobile apps (React Native), Cloudflare Workers backend, automated social media, team store, and coaching tools.

---

## 🚀 Quick Start

### Prerequisites
- Cloudflare account with **Workers Paid** plan ($5/month - unlimited everything)
- Node.js 18+
- wrangler CLI: `npm install -g wrangler`

### Deploy Backend (ONE TIME ONLY)

**Set secrets** (shared across ALL tenants - you do this ONCE):
```bash
cd backend
wrangler secret put JWT_SECRET          # Strong random secret
wrangler secret put YT_CLIENT_ID        # Optional: Google OAuth
wrangler secret put YT_CLIENT_SECRET    # Optional: Google OAuth
```

**Create queues** (ONE TIME):
```bash
wrangler queues create post-queue
wrangler queues create dead-letter
```

**Deploy all workers**:
```bash
# Backend API
cd backend
npm install && npm run build && wrangler deploy

# Fixtures
cd ../workers/fixtures && wrangler deploy

# Admin Console
cd ../../admin && wrangler deploy

# Setup Console
cd ../setup && wrangler deploy
```

✅ **Done! You NEVER re-deploy or set secrets for new tenants.**

---

## 👥 Add New Tenant (1 Minute)

**One API call** to create a new club:

```bash
# Generate admin JWT (first time only)
cd backend/scripts
.\print-admin-jwt.ps1 -JwtSecret "<YOUR_JWT_SECRET>"

# Create tenant
curl -X POST \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant": "syston-tigers",
    "name": "Syston Tigers FC"
  }' \
  https://syston-postbus.YOUR_DOMAIN.workers.dev/api/v1/admin/tenant/create
```

New club is live! No deployment, no secrets, no setup.

---

## 📱 Features

**Mobile App (React Native):**
- 📰 Independent news feed (toggle: app/social per post)
- 📅 Calendar with RSVP (build our own calendar - free!)
- ⚽ Live match updates
- 🔔 Smart push notifications (geo-aware: only if NOT at match)
- 🖼️ Gallery
- 💬 Chat
- 👥 Squad & MOTM voting
- 🏃 Training tools (session planner, drill library, tactics board)
- 🛍️ Team store (Printify integration)

**Admin Console:**
- Multi-tenant management
- Feature flags
- Analytics
- Self-serve onboarding

---

## 💰 Costs (Unlimited Tenants)

| Service | Cost |
|---------|------|
| Cloudflare (Paid) | $5/month (unlimited!) |
| R2 Storage | ~$0.50/month (50 GB) |
| Make.com | Free tier or $9/month |
| Expo Push | **Free** (unlimited!) |
| Printify | Free (pay per order) |
| **TOTAL** | **$5-15/month** |

---

## 📚 Documentation

### Getting Started
- **[PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md)** - Full feature list, 6-month timeline
- **[CLAUDE.md](./CLAUDE.md)** - Complete system guide for AI assistants
- **[ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)** - Development environment setup

### Technical Documentation
- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - System architecture and design decisions
- **[API_CONTRACT.md](./API_CONTRACT.md)** - Complete API endpoints reference
- **[SECURITY.md](./SECURITY.md)** - Authentication, CORS, webhooks, security

### Operations & Production
- **[docs/RUNBOOK.md](./docs/RUNBOOK.md)** - Daily operations, incident response, deployment procedures
- **[docs/ERROR_CODES.md](./docs/ERROR_CODES.md)** - Complete error codes reference for debugging
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Step-by-step deployment instructions

### Feature-Specific Guides
- **[docs/VIDEO_SYSTEM.md](./docs/VIDEO_SYSTEM.md)** - Complete video processing system guide
- **[docs/HISTORICAL_IMPORT.md](./docs/HISTORICAL_IMPORT.md)** - Import past season data from CSV
- **[mobile/README.md](./mobile/README.md)** - Mobile app development guide
- **[video-processing/README.md](./video-processing/README.md)** - AI video processing setup

---

## 🔑 Key Concepts

**News Feed (Independent, Not Social Media Copy):**
- Create post in app
- Toggle each post: App feed? X/Twitter? Instagram? Facebook?
- Make.com posts to social if toggled
- App shows its own feed (not copied from socials)

**Smart Notifications (Geo-Aware):**
- Users at match (within 500m) → Notifications muted
- Users elsewhere → Get goal/card/HT/FT notifications
- Powered by Expo (free) + Cloudflare Durable Objects

**Calendar (Build Our Own - Free):**
- No Google Calendar API needed
- Store events in KV
- Export .ics files for native calendars
- Full control, zero cost

---

## 📅 Roadmap

**Month 1-2:** Mobile app MVP
**Month 3:** Push notifications + news feed
**Month 4:** Training tools
**Month 5:** Team store
**Month 6:** Polish & launch

See [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) for details.

---

**Built with ❤️ for grassroots football clubs**
