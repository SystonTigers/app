# Product Roadmap - Multi-Tenant Football Team Platform

## 🎯 Vision

**A complete SaaS platform for grassroots football clubs** with mobile apps, independent news feed, automated social media, e-commerce, coaching tools, and fan engagement - all managed through a single multi-tenant backend.

---

## 💰 Infrastructure & Costs

### ✅ Cloudflare (PAID Plan)
- **Workers Paid**: $5/month (unlimited requests, CPU time)
- **Durable Objects**: Included (unlimited)
- **KV**: Included (unlimited reads, 1M writes)
- **Queues**: Included (unlimited)
- **R2 Storage**: $0.015/GB/month (cheap media storage)
- **Total**: ~$5-10/month for entire platform

### ✅ Free Services
- **Google Apps Script**: Free (automation)
- **Google Sheets**: Free (data storage)
- **Make.com**: Free tier (1,000 ops/month) → Upgrade $9/month if needed
- **Printify**: Free to connect (pay per order)
- **Stripe**: Free (2.9% + $0.30 per transaction)

### 🎯 Target: $15-20/month total platform cost (unlimited tenants)

---

## 📱 Phase 1: Mobile App Frontend (NEW)

**Status**: Not started | **Priority**: P0 | **Timeline**: 4-6 weeks

### Technology Stack
- **Framework**: **React Native (Expo)** - Recommended
  - Why: Free, better performance, huge ecosystem, Expo Go for testing
  - Push notifications: Expo Notifications (free, unlimited)
  - No Apple Developer account needed for testing
- **State Management**: Zustand (simpler than Redux)
- **UI Library**: React Native Paper (Material Design)
- **Calendar**: **Build our own** (see below)

---

## 🏠 Home Screen Layout (Corrected Understanding)

### Top Section: Next Event Widget
```
┌─────────────────────────────────────────┐
│  NEXT EVENT                              │
│  ⚽ Match vs Leicester Panthers          │
│  📅 Saturday, 10 Nov • 2:00 PM          │
│  📍 Syston Recreation Ground             │
│                                          │
│  [✓ I'm Attending] [✗ Can't Make It]   │
└─────────────────────────────────────────┘
```

**Features**:
- Shows NEXT upcoming event (training, match, or social)
- RSVP buttons (updates attendance in backend)
- Tap to see full event details
- "Add to Calendar" button (downloads .ics file)

### Bottom Section: Independent News Feed (Scrollable)

```
┌─────────────────────────────────────────┐
│  📰 TEAM NEWS FEED                       │
│                                          │
│  ┌─────────────────────────────────┐   │
│  │ 🎉 Great win today! 3-1          │   │
│  │ Well done lads! 💪               │   │
│  │ Posted to: X, Instagram, Feed    │   │
│  │ 2 hours ago • 12 likes           │   │
│  └─────────────────────────────────┘   │
│                                          │
│  ┌─────────────────────────────────┐   │
│  │ 📸 Match photos now available!   │   │
│  │ [Gallery preview images]          │   │
│  │ Posted to: Feed only              │   │
│  │ 5 hours ago • 8 likes            │   │
│  └─────────────────────────────────┘   │
│                                          │
│  ┌─────────────────────────────────┐   │
│  │ ⚽ Training tonight at 6 PM       │   │
│  │ Don't forget your boots!          │   │
│  │ Posted to: X, Feed                │   │
│  │ Yesterday • 15 likes              │   │
│  └─────────────────────────────────┘   │
│                                          │
│  [Load more...]                          │
└─────────────────────────────────────────┘
```

---

## 📰 News Feed System (How It Works)

### Creating a Post (Admin/Coach Interface)

**Post Creation Form**:
```
┌─────────────────────────────────────────┐
│  CREATE POST                             │
│                                          │
│  Message:                                │
│  [Text input box]                        │
│                                          │
│  Attach:                                 │
│  [ ] Photo  [ ] Video  [ ] Poll          │
│                                          │
│  Post to:                                │
│  [✓] App News Feed                       │
│  [✓] X/Twitter                           │
│  [✓] Instagram                           │
│  [ ] Facebook                            │
│  [ ] TikTok                              │
│                                          │
│  [Cancel]  [Schedule]  [Post Now]        │
└─────────────────────────────────────────┘
```

### Backend Flow

1. **User creates post** → `POST /api/v1/feed/create`
   ```json
   {
     "tenant": "syston-tigers",
     "content": "Great win today! 3-1",
     "media": ["photo-url-1", "photo-url-2"],
     "channels": {
       "app_feed": true,
       "twitter": true,
       "instagram": true,
       "facebook": false
     }
   }
   ```

2. **Backend processes**:
   - If `app_feed: true` → Store in KV `feed:{tenant}:{post_id}`
   - If `twitter: true` → Send to Make.com queue → Post to X/Twitter
   - If `instagram: true` → Send to Make.com queue → Post to Instagram
   - etc.

3. **App fetches feed**: `GET /api/v1/feed?tenant=syston-tigers`
   - Returns posts where `app_feed: true`
   - Paginated (20 posts per page)
   - Sorted by timestamp (newest first)

### Post Toggle Examples

**Example 1: Match result (post everywhere)**
- ✅ App feed
- ✅ X/Twitter
- ✅ Instagram
- ✅ Facebook

**Example 2: Internal team message (app only)**
- ✅ App feed
- ❌ X/Twitter
- ❌ Instagram
- ❌ Facebook

**Example 3: Training reminder (app + X)**
- ✅ App feed
- ✅ X/Twitter
- ❌ Instagram
- ❌ Facebook

---

## 📅 Calendar System (Build Our Own - Free!)

### Why Build vs Use API?

**Build Our Own** ✅ (Recommended)
- **Cost**: Free
- **Control**: Full customization
- **Privacy**: All data in our KV
- **Offline**: Works without internet
- **Features**: Exactly what we need

**Use Google Calendar API** ❌
- **Cost**: Free but has quotas
- **Complexity**: OAuth, API limits
- **Dependency**: External service
- **Overkill**: Too many features we don't need

### Custom Calendar Features

#### 1. Event Storage (KV)
```javascript
// KV key: event:{tenant}:{event_id}
{
  "id": "evt-001",
  "tenant": "syston-tigers",
  "type": "match",          // match, training, social
  "title": "vs Leicester Panthers",
  "date": "2025-11-10",
  "time": "14:00",
  "location": "Syston Recreation Ground",
  "description": "U13 League Match",
  "attendees": {
    "going": ["user-1", "user-2"],
    "not_going": ["user-3"],
    "maybe": ["user-4"]
  }
}
```

#### 2. Calendar UI (React Native)
- **Month view**: Shows all events in a month
- **Week view**: Shows events for the week
- **Day view**: Shows events for a single day
- **List view**: Scrollable list of upcoming events

**Libraries** (Free):
- `react-native-calendars` - Calendar grid component
- Or build simple custom calendar (just grid + date logic)

#### 3. Export to Native Calendars

**Generate .ics file** (iCalendar format):
```javascript
// When user taps "Add to Calendar"
const icsContent = `
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:Syston vs Leicester Panthers
DTSTART:20251110T140000Z
DTEND:20251110T154000Z
LOCATION:Syston Recreation Ground
DESCRIPTION:U13 League Match
END:VEVENT
END:VCALENDAR
`;

// Download .ics file → Opens in Apple Calendar / Google Calendar
```

**User flow**:
1. User taps "Add to Calendar" on event
2. App generates .ics file
3. OS opens native calendar app
4. Event added to user's personal calendar

---

## 🔔 Phase 2: Smart Push Notifications (NEW)

**Status**: Not started | **Priority**: P1 | **Timeline**: 2-3 weeks

### Geo-Location Based Match Notifications

**Using Cloudflare Durable Objects** (Free with paid plan!)

#### How It Works:

1. **Match starts** → Backend creates Durable Object for match
   - Stores venue location (lat/lng)
   - Geo-fence radius (500m)

2. **Goal scored** → Notification triggered
   - Fetch all users subscribed to team
   - For each user:
     - Check last known location
     - If OUTSIDE fence → Send notification
     - If INSIDE fence → Skip

3. **User location updates**:
   - App sends location every 5 minutes during matches
   - `POST /api/v1/notifications/location`
   - Durable Object updates user location in memory

#### Technical Implementation

**Expo Push Notifications** (Free, unlimited):
```javascript
// Get user's push token (one-time)
const token = await Notifications.getExpoPushTokenAsync();

// Send to backend
POST /api/v1/users/push-token
{
  "user_id": "user-123",
  "push_token": "ExponentPushToken[xxx]"
}
```

**Backend sends notification**:
```javascript
// Cloudflare Worker
POST https://exp.host/--/api/v2/push/send
{
  "to": ["ExponentPushToken[xxx]"],
  "title": "GOAL! ⚽",
  "body": "John Smith scores! Syston 1-0",
  "data": {
    "match_id": "match-123",
    "event": "goal"
  }
}
```

**Notification Types**:
- ⚽ **Goal** - "GOAL! John Smith 23'"
- 🟨 **Yellow card** - "Yellow card - Mike Johnson"
- 🟥 **Red card** - "RED CARD! - Tom Wilson"
- ⏱️ **Half-time** - "HALF-TIME: Syston 2-0"
- 🏁 **Full-time** - "FULL-TIME: Syston 3-1!"
- 📅 **Match reminder** - "Match starts in 1 hour"
- 🏋️ **Training reminder** - "Training tonight at 6 PM"

**Privacy Controls**:
- ✅ User can disable location sharing → receives all notifications
- ✅ User can disable notifications entirely
- ✅ User can choose notification types (goals only, all events, etc.)

---

## 🏃 Phase 3: Training & Coaching Tools (NEW)

**Status**: Not started | **Priority**: P2 | **Timeline**: 3-4 weeks

### 1. Session Planner

**Create Training Session**:
```
┌─────────────────────────────────────────┐
│  NEW TRAINING SESSION                    │
│                                          │
│  Date: [10 Nov 2025]                    │
│  Time: [18:00 - 19:30]                  │
│  Team: [U13 Boys]                       │
│  Focus: [Passing & Movement]            │
│                                          │
│  SESSION PLAN (90 mins):                 │
│  ┌─────────────────────────────────┐   │
│  │ 1. Warm-up (10 mins)             │   │
│  │    [Drill: Dynamic stretches]     │   │
│  ├─────────────────────────────────┤   │
│  │ 2. Technical (30 mins)            │   │
│  │    [Drill: Passing triangles]     │   │
│  ├─────────────────────────────────┤   │
│  │ 3. Tactical (30 mins)             │   │
│  │    [Drill: 5v5 possession]        │   │
│  ├─────────────────────────────────┤   │
│  │ 4. Game (15 mins)                 │   │
│  │    [Drill: Small-sided game]      │   │
│  ├─────────────────────────────────┤   │
│  │ 5. Cool-down (5 mins)             │   │
│  │    [Drill: Static stretches]      │   │
│  └─────────────────────────────────┘   │
│                                          │
│  [+ Add Drill]  [Save]  [Share]         │
└─────────────────────────────────────────┘
```

### 2. Drill Library (Pre-seeded)

**100+ Drills Included**:
- Warm-up drills (10)
- Passing drills (20)
- Shooting drills (15)
- Dribbling drills (15)
- Defending drills (15)
- Tactical drills (10)
- Fitness drills (10)
- Cool-down drills (5)

**Drill Format**:
```json
{
  "id": "drill-001",
  "name": "Passing Triangles",
  "category": "passing",
  "duration": "10-15 mins",
  "players": "6-12",
  "equipment": ["6 cones", "2 balls"],
  "description": "Players form triangles and pass in sequence...",
  "diagram_url": "https://r2/drills/passing-triangles.png",
  "difficulty": "beginner",
  "focus": ["passing", "movement", "communication"]
}
```

### 3. Drill Designer (Visual Editor)

**Using HTML5 Canvas** (Free, built-in):
- Drag-and-drop pitch editor
- Add: Players (⚽), Cones (🔴), Balls (⚪), Goals (🥅)
- Draw: Movement paths (→), Passing lines (--→), Dribbling (~~~→)
- Save as image (PNG) to R2 storage
- Share with other coaches

**Storage**:
- Custom drills: `drill:{tenant}:{drill_id}` (KV)
- Diagrams: `drills/{tenant}/{drill_id}.png` (R2)

### 4. Tactics Board

**Formation Editor**:
- Choose formation: 4-4-2, 4-3-3, 3-5-2, etc.
- Position players on pitch
- Add player names/numbers
- Show roles (DM, CAM, ST, etc.)
- Save as formation template

**Set Pieces**:
- Corners (attacking/defending)
- Free kicks (short/long)
- Throw-ins
- Kick-offs

**Storage**: `tactic:{tenant}:{tactic_id}` (KV)

---

## 🛍️ Phase 4: Team Store (Printify Integration) (NEW)

**Status**: Not started | **Priority**: P2 | **Timeline**: 3-4 weeks

### Printify API (Free to integrate, pay per order)

**Product Types**:
- **Apparel**: T-shirts, hoodies, sweatshirts, training kits
- **Accessories**: Water bottles, bags, hats, socks
- **Merchandise**: Posters, stickers, phone cases, mugs

### Design System

**1. Pre-made Templates** (Auto-generated):
- **Template 1**: Team badge centered
- **Template 2**: Team name + badge
- **Template 3**: Player name + number (back)
- **Template 4**: Team slogan
- **Template 5**: Custom text

**2. Design Editor** (In-app):
```
┌─────────────────────────────────────────┐
│  DESIGN YOUR PRODUCT                     │
│                                          │
│  Product: [Hoodie ▼]                     │
│  Color: [Yellow ▼]                       │
│                                          │
│  ┌─────────────────────┐                │
│  │                      │                │
│  │    SYSTON TIGERS     │  ← Preview    │
│  │      [Badge]         │                │
│  │                      │                │
│  └─────────────────────┘                │
│                                          │
│  Elements:                               │
│  [✓] Team Badge                          │
│  [✓] Team Name                           │
│  [ ] Player Name                         │
│  [ ] Player Number                       │
│  [ ] Custom Text                         │
│                                          │
│  Position: [Front ▼]                     │
│                                          │
│  [Add to Cart - £24.99]                 │
└─────────────────────────────────────────┘
```

### Shopping Flow

1. **Browse products** → Category view
2. **Customize** → Design editor
3. **Add to cart** → Size/quantity selection
4. **Checkout** → Stripe payment
5. **Order placed** → Printify fulfillment
6. **Tracking** → Order status updates

**Pricing Example**:
- Printify base cost: £10
- Tenant markup (30%): £3
- Selling price: £13
- Tenant profit: £3 per sale
- Platform commission (optional): 10% of profit = £0.30

### Admin Controls

**Store Settings**:
```json
{
  "tenant": "syston-tigers",
  "printify_api_key": "xxx",
  "store_enabled": true,
  "markup_percentage": 30,
  "featured_products": ["prod-1", "prod-2"],
  "team_colors": {
    "primary": "#FFD700",    // Yellow
    "secondary": "#000000"   // Black
  }
}
```

**Orders Dashboard**:
- View all orders
- Order status (processing, shipped, delivered)
- Revenue tracking
- Best-selling products

---

## 🗂️ Complete Feature List

### Mobile App Screens

#### 1. Authentication & Onboarding
- [ ] Login screen (email/password)
- [ ] Team selection (if user in multiple teams)
- [ ] Push notification permission
- [ ] Location permission (for match notifications)

#### 2. Home (Tab 1)
- [ ] Next event widget (RSVP buttons)
- [ ] News feed (scrollable, independent posts)
- [ ] Post creation (admin/coaches only)
- [ ] Channel toggles (app/X/Instagram/Facebook)
- [ ] Like/comment on posts
- [ ] Share posts

#### 3. Calendar (Tab 2)
- [ ] Month/week/day/list views
- [ ] Upcoming events list
- [ ] Event details
- [ ] RSVP (attending/not attending/maybe)
- [ ] Add to native calendar (.ics export)
- [ ] Filter by type (matches/training/social)

#### 4. Fixtures & Results (Tab 3)
- [ ] Upcoming fixtures
- [ ] Past results
- [ ] Match details (score, scorers, cards)
- [ ] League table
- [ ] Match stats (if available)

#### 5. Live Match (Tab 4 - during matches)
- [ ] Live score
- [ ] Event timeline (goals, cards, subs)
- [ ] Match stats
- [ ] Push notifications (geo-aware)

#### 6. Squad (Tab 5)
- [ ] Team roster
- [ ] Player profiles
- [ ] Player stats (goals, assists, appearances, cards)
- [ ] MOTM voting (during/after matches)

#### 7. Gallery
- [ ] Match albums
- [ ] Photo viewer
- [ ] Upload photos (with permission)
- [ ] Download/share photos

#### 8. Chat
- [ ] Team chat room
- [ ] Direct messages
- [ ] Group chats (by team/age group)
- [ ] File sharing

#### 9. Training (Coaches Only)
- [ ] Session planner
- [ ] Drill library (browse 100+ drills)
- [ ] Drill designer (visual editor)
- [ ] Tactics board
- [ ] Session history
- [ ] Attendance tracking

#### 10. Store
- [ ] Browse products (apparel, accessories, merch)
- [ ] Product customization
- [ ] Shopping cart
- [ ] Checkout (Stripe)
- [ ] Order history
- [ ] Order tracking

#### 11. Profile & Settings
- [ ] User profile
- [ ] Notification settings
- [ ] Privacy settings (location sharing)
- [ ] App preferences
- [ ] Logout

---

## 🏗️ Backend API Endpoints (New)

### News Feed
- `GET /api/v1/feed?tenant={id}` - Fetch posts (paginated)
- `POST /api/v1/feed/create` - Create post with channel toggles
- `POST /api/v1/feed/{id}/like` - Like post
- `POST /api/v1/feed/{id}/comment` - Comment on post
- `DELETE /api/v1/feed/{id}` - Delete post (admin only)

### Calendar & Events
- `GET /api/v1/events?tenant={id}` - List events
- `POST /api/v1/events` - Create event
- `PUT /api/v1/events/{id}` - Update event
- `POST /api/v1/events/{id}/rsvp` - RSVP (attending/not/maybe)
- `GET /api/v1/events/{id}/attendees` - Get attendee list
- `GET /api/v1/events/{id}/ics` - Generate .ics file

### Push Notifications
- `POST /api/v1/notifications/register` - Register push token
- `POST /api/v1/notifications/location` - Update user location
- `POST /api/v1/notifications/send` - Send notification (internal)
- `POST /api/v1/notifications/preferences` - Update notification settings

### Training & Coaching
- `GET /api/v1/coaching/drills` - List drills (seeded + custom)
- `POST /api/v1/coaching/drills` - Create custom drill
- `GET /api/v1/coaching/sessions` - List training sessions
- `POST /api/v1/coaching/sessions` - Create session
- `PUT /api/v1/coaching/sessions/{id}` - Update session
- `POST /api/v1/coaching/tactics` - Save tactic/formation

### Team Store
- `GET /api/v1/store/products` - List products (Printify sync)
- `POST /api/v1/store/cart` - Add to cart
- `GET /api/v1/store/cart` - Get cart
- `POST /api/v1/store/checkout` - Create Stripe checkout session
- `GET /api/v1/store/orders` - List user orders
- `POST /api/v1/store/webhooks/printify` - Printify order updates
- `GET /api/v1/admin/store/orders` - Admin: all orders
- `GET /api/v1/admin/store/revenue` - Admin: revenue stats

---

## 📊 Database Schema (KV)

```javascript
// News Feed
feed:{tenant}:{post_id} → {
  id, tenant, content, media[],
  channels: {app_feed, twitter, instagram, facebook},
  timestamp, author, likes[], comments[]
}

// Events/Calendar
event:{tenant}:{event_id} → {
  id, tenant, type, title, date, time, location,
  description, attendees: {going[], not_going[], maybe[]}
}

// Push Notifications
user:{user_id}:push_token → "ExponentPushToken[xxx]"
user:{user_id}:location → {lat, lng, timestamp}

// Training
drill:{drill_id} → {id, name, category, diagram_url, description}
drill:{tenant}:{drill_id} → {custom drills}
session:{tenant}:{session_id} → {id, date, team, drills[], notes}
tactic:{tenant}:{tactic_id} → {id, formation, positions[], instructions}

// Store
product:{tenant}:{product_id} → {printify_id, name, price, markup}
cart:{user_id} → {items: [{product, quantity, customization}]}
order:{tenant}:{order_id} → {id, user, items, status, tracking}
```

---

## 🚀 Automated Tenant Onboarding (Future)

### Current (Manual):
1. Admin creates tenant via curl
2. Admin sets up Google Sheet manually
3. Admin deploys Apps Script manually
4. Tenant configures via setup console

### Target (Automated):
1. **Tenant visits signup page** → Fills form
2. **Payment** → Stripe checkout (if paid plan)
3. **Backend auto-provisions**:
   - Creates tenant in KV
   - Creates Google Sheet from template (Apps Script API)
   - Deploys Apps Script (clasp programmatically)
   - Sends welcome email
4. **Tenant logs into app** → Ready to use!

---

## 📅 6-Month Roadmap

### Month 1-2: Mobile App MVP
- **Week 1-2**: Project setup, authentication, home screen
  - Expo setup, navigation, login flow
  - Next event widget
  - News feed UI (mock data)
- **Week 3-4**: Calendar & Events
  - Custom calendar UI
  - Event list/details
  - RSVP functionality
  - .ics export
- **Week 5-6**: Fixtures, Results, Squad
  - Fixture list
  - League table
  - Player profiles
  - MOTM voting
- **Week 7-8**: Gallery & Chat
  - Photo albums
  - Image viewer
  - Chat rooms
  - Testing & bug fixes

### Month 3: Notifications & Feed Backend
- **Week 9-10**: Push notifications
  - Expo push setup
  - Geo-fencing logic (Durable Objects)
  - Notification types (goals, cards, HT, FT)
- **Week 11-12**: News feed backend
  - Feed API endpoints
  - Channel toggles (app/social)
  - Make.com integration for social posting

### Month 4: Training Tools
- **Week 13-14**: Session planner & drill library
  - Drill database (seed 100+ drills)
  - Session builder UI
  - Drill search/filter
- **Week 15-16**: Drill designer & tactics
  - Canvas-based drill editor
  - Formation editor
  - Set pieces designer

### Month 5: Team Store
- **Week 17-18**: Printify integration
  - Product catalog sync
  - Product listing UI
  - Customization options
- **Week 19-20**: Shopping cart & checkout
  - Cart management
  - Stripe checkout
  - Order tracking

### Month 6: Polish & Launch
- **Week 21-22**: Admin features
  - Store admin dashboard
  - Revenue tracking
  - Automated onboarding (if time)
- **Week 23-24**: Testing & production launch
  - Beta testing with 2-3 teams
  - Bug fixes
  - Performance optimization
  - App Store / Google Play submission

---

## 💰 Pricing (When Ready for Multi-Tenant)

### Free Tier
- 1 team
- Basic features (feed, calendar, fixtures)
- Make.com required (BYO webhook)
- 100 posts/month
- 1 GB R2 storage

### Pro Tier (£29/month)
- 3 teams
- All features (training, store, notifications)
- Direct social integrations
- Unlimited posts
- 10 GB R2 storage
- Priority support

### Enterprise (£99/month)
- Unlimited teams
- White-label app
- Custom domain
- Dedicated support
- 100 GB R2 storage
- API access

---

## 🎯 Success Metrics

- **User Engagement**: DAU/MAU > 30%
- **Notification CTR**: > 40% (goals/cards)
- **Event RSVP Rate**: > 60%
- **Store Conversion**: > 5%
- **30-day Retention**: > 70%
- **NPS**: > 50

---

## 📝 Immediate Next Steps (This Week)

### 1. Set Up Mobile App Project
```bash
# Install Expo CLI
npm install -g expo-cli

# Create new Expo project
npx create-expo-app syston-mobile --template blank-typescript

# Navigate to project
cd syston-mobile

# Install dependencies
npm install @react-navigation/native @react-navigation/bottom-tabs
npm install react-native-paper zustand axios
npm install expo-notifications expo-location
npm install react-native-calendars

# Start development server
npx expo start
```

### 2. Deploy Backend Workers
```bash
# Set secrets (ONE TIME ONLY)
cd ~/app/backend
wrangler secret put JWT_SECRET
wrangler secret put YT_CLIENT_ID
wrangler secret put YT_CLIENT_SECRET

# Create queues (ONE TIME ONLY)
wrangler queues create post-queue
wrangler queues create dead-letter

# Deploy all workers
wrangler deploy
cd ../workers/fixtures && wrangler deploy
cd ../../admin && wrangler deploy
cd ../setup && wrangler deploy
```

### 3. Create First Tenant (Syston Tigers)
```bash
# Generate admin JWT
cd ~/app/backend
.\scripts\print-admin-jwt.ps1 -JwtSecret "<YOUR_JWT_SECRET>"

# Create tenant
curl -X POST \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant": "syston-tigers",
    "name": "Syston Tigers FC",
    "flags": {"use_make": true, "direct_yt": false},
    "make_webhook_url": "https://hook.make.com/YOUR_WEBHOOK"
  }' \
  https://syston-postbus.YOUR_DOMAIN.workers.dev/api/v1/admin/tenant/create
```

### 4. Design Mobile App Screens (Figma/Sketch)
- Home screen (next event + feed)
- Calendar views
- News feed post creation
- Event details
- Store product page

---

**Last Updated**: 2025-10-06
**Owner**: Clayton
**Status**: Planning → Ready to Build
**Next Milestone**: Mobile app MVP (2 months)
