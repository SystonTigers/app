# Fixture Sync System - App-Based Configuration Guide

## ✅ NEW: Configure Everything Through Mobile App

**NO manual Google Sheets or Apps Script configuration required!**

Customers configure everything through the mobile app settings screen.

---

## Architecture Overview

```
Mobile App Settings Screen
        ↓
   (saves to)
        ↓
  Backend API (D1 Database)
        ↓
   (read by)
        ↓
Google Apps Script (auto-fetches config)
        ↓
   (syncs to)
        ↓
  Backend API → Mobile App
```

**Key Point:** Settings flow FROM mobile app TO backend, then Apps Script reads FROM backend.

---

## Setup Steps

### Step 1: Deploy Backend with New Migration

```bash
cd "C:\Users\clayt\OneDrive\Desktop\Final Products\OA App\applatest\backend"

# Run BOTH migrations
npx wrangler d1 execute DB --file=migrations/001_create_fixtures_tables.sql
npx wrangler d1 execute DB --file=migrations/002_add_fixture_settings.sql

# Deploy backend
npm run build
npx wrangler deploy
```

### Step 2: Configure Google Apps Script (ONE-TIME ONLY)

Only need to set 2 properties (NOT all the fixture settings):

1. Go to https://script.google.com
2. Open your project → **Project Settings** → **Script Properties**
3. Add ONLY these 2 properties:

```
BACKEND_API_URL = https://your-backend.workers.dev
TENANT_ID = default
```

**That's it!** All other settings (team name, FA URL, etc.) are configured via mobile app.

### Step 3: Copy Apps Script Files

Copy these files to your Google Apps Script project:

- `apps-script/fa-website-scraper.gs`
- `apps-script/fa-snippet-parser.gs`
- `apps-script/fixture-consolidator.gs` (UPDATED version)
- Your existing `FA-Fixture-Sync-FIXED.gs`

### Step 4: Set Up Trigger (ONE-TIME)

1. In Google Apps Script, click **Triggers** (clock icon)
2. Click **+ Add Trigger**
3. Configure:
   - Function: `consolidateFixtures`
   - Event source: Time-driven
   - Type: Minutes timer
   - Interval: Every 5 minutes

### Step 5: Configure Via Mobile App

1. Deploy mobile app:
   ```bash
   cd "C:\Users\clayt\OneDrive\Desktop\Final Products\OA App\applatest\mobile"
   npx expo start
   ```

2. In the app, go to **Settings** → **Fixture Sync Settings**

3. Enter:
   - **Team Name**: `Shepshed Dynamo Youth U16`
   - **FA Website URL**: `https://fulltime-league.thefa.com/your-team-page`
   - **FA Snippet URL**: (optional)
   - **Enable Auto Sync**: ON
   - **Calendar ID**: (optional)

4. Click **Test Connection** to verify backend is working

5. Click **Save Settings**

### Step 6: Test End-to-End

1. In Google Apps Script, run `testFixtureConsolidator()`

2. Check execution log for:
   ```
   Success: true
   Total Fixtures: X
   Backend Synced: true
   ```

3. Check mobile app → Fixtures screen should show real data

---

## What Changed?

### Old Way (Manual Configuration)
```
❌ Set TEAM_NAME in Script Properties
❌ Set FA_WEBSITE_URL in Script Properties
❌ Set FA_SNIPPET_URL in Script Properties
❌ Customer has to access Google Apps Script
❌ Customer has to understand Script Properties
```

### New Way (App-Based Configuration)
```
✅ Customer uses mobile app settings screen
✅ Settings saved to backend database
✅ Apps Script auto-fetches settings from backend
✅ Zero manual configuration needed
✅ User-friendly UI with validation
```

---

## Configuration Flow

### When User Saves Settings in Mobile App:

1. **Mobile App** → `PUT /api/v1/fixtures/settings`
2. **Backend API** → Saves to `fixture_settings` table in D1
3. **Google Apps Script** → Fetches from `GET /api/v1/fixtures/settings/config` every 5 minutes
4. **Apps Script** → Uses settings to scrape FA website, parse emails, etc.
5. **Apps Script** → Syncs fixtures back to backend via `POST /api/v1/fixtures/sync`
6. **Mobile App** → Displays fixtures from `GET /api/v1/fixtures/upcoming`

### Database Schema (fixture_settings table):

```sql
CREATE TABLE fixture_settings (
  id INTEGER PRIMARY KEY,
  tenant_id TEXT UNIQUE,
  team_name TEXT,
  fa_website_url TEXT,
  fa_snippet_url TEXT,
  sync_enabled INTEGER,
  sync_interval_minutes INTEGER,
  calendar_id TEXT,
  created_at DATETIME,
  updated_at DATETIME
);
```

---

## API Endpoints Added

### For Mobile App (Admin):

**GET** `/api/v1/fixtures/settings?tenant_id=default`
- Fetch current settings for display in settings screen

**PUT** `/api/v1/fixtures/settings`
- Save settings from mobile app (requires admin JWT)

### For Google Apps Script (Public):

**GET** `/api/v1/fixtures/settings/config?tenant_id=default`
- Public endpoint (no auth required)
- Apps Script calls this to get configuration
- Returns: teamName, faWebsiteUrl, faSnippetUrl, syncEnabled, etc.

---

## Mobile App Settings Screen

New screen: `FixtureSettingsScreen.tsx`

**Features:**
- ✅ Team name input
- ✅ FA website URL input
- ✅ FA snippet URL input (optional)
- ✅ Auto-sync toggle (enable/disable)
- ✅ Calendar ID input (optional)
- ✅ Test connection button
- ✅ Save settings button
- ✅ Loading states
- ✅ Validation
- ✅ Help text explaining each field

**To add to navigation:**
```typescript
// In your navigation config:
<Stack.Screen
  name="FixtureSettings"
  component={FixtureSettingsScreen}
  options={{ title: 'Fixture Sync Settings' }}
/>
```

---

## Benefits

### For Customers:
- ✅ **No technical knowledge required** - Just fill in a form
- ✅ **Immediate visual feedback** - See settings update in real-time
- ✅ **Test connection** - Verify setup before saving
- ✅ **No Google Sheets access needed** - Everything in app
- ✅ **No Google Apps Script access needed** - Zero code visibility

### For Developers:
- ✅ **Centralized configuration** - Single source of truth (database)
- ✅ **Multi-tenant ready** - Each tenant has own settings
- ✅ **Auditable** - created_at/updated_at timestamps
- ✅ **Scalable** - Easy to add more settings fields
- ✅ **Version controlled** - Settings changes tracked in DB

---

## Troubleshooting

### Issue: Settings not saving

**Check:**
1. Is user authenticated with admin role?
2. Is backend deployed with migration 002?
3. Check browser console for errors

**Fix:**
```bash
# Verify table exists
npx wrangler d1 execute DB --command "SELECT * FROM fixture_settings"

# Check backend logs
npx wrangler tail
```

### Issue: Apps Script not using new settings

**Check:**
1. Is `BACKEND_API_URL` set in Script Properties?
2. Can Apps Script reach the backend?

**Fix:**
```javascript
// Test in Apps Script
function testConfigFetch() {
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty('BACKEND_API_URL') + '/api/v1/fixtures/settings/config?tenant_id=default';
  const response = UrlFetchApp.fetch(url);
  Logger.log('Status: ' + response.getResponseCode());
  Logger.log('Config: ' + response.getContentText());
}
```

### Issue: "Connection Test" fails in mobile app

**Check:**
1. Is backend URL correct in `.env`?
2. Is backend deployed?
3. Is network connectivity working?

**Fix:**
```bash
# Test backend directly
curl https://your-backend.workers.dev/api/v1/fixtures/upcoming
```

---

## Comparison: Before vs After

### Before (Manual Setup):
1. Customer creates Google Apps Script project
2. Customer copies 4+ script files
3. Customer opens Project Settings
4. Customer adds 6+ Script Properties manually
5. Customer creates time-based trigger
6. Customer grants permissions
7. **Total time: 30-45 minutes**
8. **Technical skill required: Medium-High**

### After (App-Based Setup):
1. Developer deploys backend once (5 minutes)
2. Developer copies Apps Script files once (5 minutes)
3. Developer sets 2 Script Properties once (1 minute)
4. Developer creates trigger once (1 minute)
5. **Customer opens mobile app** (10 seconds)
6. **Customer fills in settings form** (2 minutes)
7. **Customer clicks "Save"** (1 second)
8. **Total time for customer: 2 minutes**
9. **Technical skill required for customer: ZERO**

---

## Summary

✅ **Customer Experience:**
- Open app → Settings → Fill form → Save
- No Google access needed
- No technical knowledge needed
- Instant validation and feedback

✅ **Developer Setup (One-Time):**
- Deploy backend with migrations
- Copy Apps Script files
- Set 2 Script Properties (backend URL + tenant ID)
- Create 1 trigger

✅ **Configuration Location:**
- **Settings:** Mobile App → Backend Database
- **Scripts:** Google Apps Script (read-only from backend)
- **Data:** Backend Database → Mobile App

**The customer NEVER touches Google Sheets or Apps Script!**

---

## Files Modified/Created

### Backend:
- ✅ `migrations/002_add_fixture_settings.sql` (NEW)
- ✅ `src/index.ts` (UPDATED - added 3 settings endpoints)

### Apps Script:
- ✅ `fixture-consolidator.gs` (UPDATED - fetches config from backend)

### Mobile:
- ✅ `screens/FixtureSettingsScreen.tsx` (NEW - settings UI)

### Documentation:
- ✅ `UPDATED_SETUP_GUIDE.md` (This file)

---

## Next Steps

1. Run migration 002
2. Deploy backend
3. Update `fixture-consolidator.gs` in Apps Script
4. Add FixtureSettingsScreen to mobile app navigation
5. Test configuration flow end-to-end
6. Document for customers: "Open app → Settings → Configure fixtures"

**Ready to go!** 🚀
