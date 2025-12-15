# Fixture Sync System - Setup Guide

## Overview

This system automatically gathers fixtures from 3 sources (FA emails, FA website, FA snippet) and syncs them to your mobile app via Cloudflare backend.

---

## Step 1: Google Apps Script Configuration

### 1.1 Copy All Scripts to Google Apps Script

1. Go to https://script.google.com
2. Create a new project or open existing one
3. Copy these files:
   - `fa-website-scraper.gs`
   - `fa-snippet-parser.gs`
   - `fixture-consolidator.gs`
   - Your existing `FA-Fixture-Sync-FIXED.gs`

### 1.2 Configure Script Properties

Go to **Project Settings** → **Script Properties** and add:

```
BACKEND_API_URL = https://your-backend.workers.dev
BACKEND_API_TOKEN = your-secret-token (optional)
TEAM_NAME = Shepshed Dynamo Youth U16
FIXTURES_SHEET_NAME = Fixtures
FA_WEBSITE_URL = https://fulltime-league.thefa.com/your-team-fixtures
FA_SNIPPET_URL = (optional - if FA provides embed code)
```

### 1.3 Set Up Time-Based Triggers

1. In Google Apps Script, click **Triggers** (clock icon in left sidebar)
2. Click **+ Add Trigger**

**Trigger 1: Fixture Consolidation (Every 5 minutes)**
- Choose function: `consolidateFixtures`
- Event source: Time-driven
- Type: Minutes timer
- Interval: Every 5 minutes

**Trigger 2: Test Function (Run once to verify)**
- Choose function: `testFixtureConsolidator`
- Event source: Time-driven
- Type: Minutes timer
- Interval: Every hour
- **Note:** Remove this after testing

### 1.4 Grant Permissions

1. Run any function manually (e.g., `testFixtureConsolidator`)
2. Google will ask for permissions
3. Click **Review Permissions**
4. Select your Google account
5. Click **Advanced** → **Go to [Project Name] (unsafe)**
6. Click **Allow**

---

## Step 2: Cloudflare Backend Setup

### 2.1 Run Database Migration

```bash
cd "C:\Users\clayt\OneDrive\Desktop\Final Products\OA App\applatest\backend"

# Create the fixtures tables in D1
npx wrangler d1 execute DB --file=migrations/001_create_fixtures_tables.sql
```

### 2.2 Deploy Backend

```bash
npm run build
npx wrangler deploy
```

### 2.3 Verify Deployment

Test the endpoints:

```bash
# Test fixtures sync endpoint (should return error about empty fixtures array)
curl -X POST https://your-backend.workers.dev/api/v1/fixtures/sync \
  -H "Content-Type: application/json" \
  -d '{"fixtures":[]}'

# Test upcoming fixtures endpoint (should return empty array initially)
curl https://your-backend.workers.dev/api/v1/fixtures/upcoming
```

---

## Step 3: Mobile App Configuration

### 3.1 Set Backend URL

Edit `.env` file in mobile app directory:

```env
EXPO_PUBLIC_API_URL=https://your-backend.workers.dev
```

### 3.2 Rebuild Mobile App

```bash
cd "C:\Users\clayt\OneDrive\Desktop\Final Products\OA App\applatest\mobile"

# Install dependencies if needed
npm install

# Start development server
npx expo start
```

---

## Step 4: Testing End-to-End

### 4.1 Test Google Apps Script

1. Open Google Apps Script
2. Run `testFixtureConsolidator` function
3. Check **Execution log** (Ctrl+Enter) for:
   ```
   === Fixture Consolidation Test ===
   Success: true
   Total Fixtures: X
   Email: X
   Website: X
   Snippet: X
   Sheet Updated: X
   Backend Synced: true
   ```

### 4.2 Verify Google Sheets

1. Open your Google Sheets
2. Find the "Fixtures" tab (auto-created)
3. Should contain columns:
   - Date
   - Opponent
   - Venue
   - Competition
   - Kick-off Time
   - Status
   - Source
   - Last Updated

### 4.3 Verify Backend Database

```bash
# Query fixtures table
npx wrangler d1 execute DB --command "SELECT * FROM fixtures ORDER BY fixture_date ASC"

# Query results table
npx wrangler d1 execute DB --command "SELECT * FROM results ORDER BY match_date DESC"
```

### 4.4 Test Mobile App

1. Open app on device/emulator
2. Navigate to **Fixtures** screen
3. Pull down to refresh
4. Should see:
   - Loading indicator
   - Real fixtures from backend
   - Recent results (if any)

---

## Step 5: Monitoring & Maintenance

### 5.1 View Google Apps Script Logs

1. Open Google Apps Script
2. Click **Executions** in left sidebar
3. View success/failure of automated runs
4. Click any execution to see detailed logs

### 5.2 View Backend Logs

```bash
cd "C:\Users\clayt\OneDrive\Desktop\Final Products\OA App\applatest\backend"
npx wrangler tail --format pretty
```

### 5.3 Manual Sync

If fixtures aren't updating, manually trigger sync:

**Google Apps Script:**
```javascript
// Run this function manually
consolidateFixtures();
```

**Or via Backend API:**
```bash
curl -X POST https://your-backend.workers.dev/api/v1/admin/fixtures/refresh \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Troubleshooting

### Issue: "No upcoming fixtures" in mobile app

**Check:**
1. Are fixtures in Google Sheets? (Check "Fixtures" tab)
2. Are fixtures in D1 database? (Run query above)
3. Is backend URL correct in mobile app `.env`?
4. Are there actually upcoming fixtures? (Check `fixture_date >= DATE('now')`)

**Fix:**
```bash
# Check backend logs
npx wrangler tail

# Manually sync from Google Apps Script
# Run consolidateFixtures() function
```

### Issue: "Backend Synced: false" in script logs

**Check:**
1. Is `BACKEND_API_URL` set in Script Properties?
2. Is backend deployed and running?
3. Check for HTTP errors in Apps Script execution log

**Fix:**
```javascript
// Test backend connection
function testBackendConnection() {
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty('BACKEND_API_URL') + '/api/v1/fixtures/upcoming';
  const response = UrlFetchApp.fetch(url);
  Logger.log('Status: ' + response.getResponseCode());
  Logger.log('Body: ' + response.getContentText());
}
```

### Issue: Duplicate fixtures appearing

**Cause:** Deduplication key (date + opponent) not matching

**Fix:**
```javascript
// Check consolidator deduplication logic
// Team names must match exactly after normalization
// Run testFixtureConsolidator() to see deduplication in action
```

### Issue: Website scraping returns 0 fixtures

**Check:**
1. Is `FA_WEBSITE_URL` correct in Script Properties?
2. Has FA changed their HTML structure?

**Fix:**
```javascript
// Test website scraper
function testWebsiteScraper() {
  const scraper = new FAWebsiteScraper();
  const fixtures = scraper.scrapeFixtures();
  Logger.log('Found ' + fixtures.length + ' fixtures from website');
  Logger.log(JSON.stringify(fixtures, null, 2));
}
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Google Apps Script                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  FA Emails   │  │  FA Website  │  │  FA Snippet  │      │
│  │   Parser     │  │   Scraper    │  │   Parser     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                   ┌────────▼────────┐                        │
│                   │  Consolidator   │                        │
│                   │  (Deduplicate)  │                        │
│                   └────────┬────────┘                        │
│                            │                                 │
│              ┌─────────────┴─────────────┐                   │
│              │                           │                   │
│      ┌───────▼────────┐         ┌───────▼────────┐          │
│      │ Google Sheets  │         │ Backend API    │          │
│      │  (Fixtures)    │         │  POST /sync    │          │
│      └────────────────┘         └───────┬────────┘          │
└─────────────────────────────────────────┼────────────────────┘
                                          │
                              ┌───────────▼───────────┐
                              │ Cloudflare Worker     │
                              │  ┌─────────────────┐  │
                              │  │   D1 Database   │  │
                              │  │  - fixtures     │  │
                              │  │  - results      │  │
                              │  └─────────────────┘  │
                              └───────────┬───────────┘
                                          │
                                ┌─────────▼─────────┐
                                │   Mobile App      │
                                │  (React Native)   │
                                │                   │
                                │  GET /upcoming    │
                                │  GET /results     │
                                └───────────────────┘
```

---

## Next Steps

1. ✅ Run database migration
2. ✅ Deploy backend
3. ✅ Configure Google Apps Script properties
4. ✅ Set up time-based triggers
5. ✅ Test `consolidateFixtures()` manually
6. ✅ Verify fixtures in Google Sheets
7. ✅ Verify fixtures in D1 database
8. ✅ Configure mobile app `.env`
9. ✅ Test mobile app
10. ✅ Monitor for 24 hours

---

## Support

If you encounter issues:
1. Check execution logs in Google Apps Script
2. Check backend logs: `npx wrangler tail`
3. Verify all Script Properties are set correctly
4. Test each component individually using test functions
5. Check that FA website structure hasn't changed

---

**System Status:**
- ✅ Phase 1: Google Apps Script (COMPLETE)
- ✅ Phase 2: Backend API (COMPLETE)
- ✅ Phase 3: Mobile App (COMPLETE)
- ⏳ Phase 4: Automation (READY TO SET UP)

**Ready to go live!** Follow the steps above to enable automated fixture syncing.
