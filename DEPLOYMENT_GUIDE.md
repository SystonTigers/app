# Complete Deployment Guide - MUST DO!

## ✅ YES, You MUST Run All Deployment Steps!

Without these steps, **nothing will work** because:
- ❌ Database tables don't exist
- ❌ API endpoints won't function
- ❌ Mobile app will get errors
- ❌ Apps Script won't have config to read

---

## NEW Features Added

### 1. **Multiple FA Snippet URLs** ✅
FA gives you **4 different snippet codes**:
- Fixtures snippet (all league fixtures)
- Results snippet (all league results)
- League table snippet
- Team-specific fixtures/results snippet

**Now supported in settings!** Each gets its own field.

### 2. **Intelligent Match-Day Scheduling** ✅

**Normal Days:**
- Syncs every hour

**Match Days:**
- After expected full-time (kick-off + 90 mins), syncs **every minute**
- Continues until all results are in
- Then exits boost mode and returns to hourly

**Example:**
```
Saturday - 3 fixtures at 14:00

13:00: Hourly sync
14:00: Hourly sync (matches start)
15:00: Hourly sync (matches still playing)
15:30: BOOST MODE ACTIVATED (90 mins after kick-off)
15:31: Sync (every minute)
15:32: Sync (every minute)
15:33: Sync (every minute)
...
15:45: All 3 results received!
15:45: League table updated
15:46: Boost mode exits
16:00: Back to hourly sync
```

**Result:** League table updates within **1-2 minutes** of final whistle! ⚡

---

## Step-by-Step Deployment

### **Step 1: Run Database Migrations** ⚠️ REQUIRED

```bash
cd "C:\Users\clayt\OneDrive\Desktop\Final Products\OA App\applatest\backend"

# Create all tables
npx wrangler d1 execute DB --file=migrations/001_create_fixtures_tables.sql
npx wrangler d1 execute DB --file=migrations/002_add_fixture_settings.sql
npx wrangler d1 execute DB --file=migrations/003_add_league_tables.sql
```

**What this does:**
- Creates `fixtures` table (stores upcoming fixtures)
- Creates `results` table (stores match results)
- Creates `fixture_settings` table (stores configuration - team name, URLs, etc.)
- Creates `league_standings` table (stores league table)
- Creates `team_results` table (stores results for calculations)
- Creates `league_snapshots` table (historical tracking)

**Verify it worked:**
```bash
npx wrangler d1 execute DB --command "SELECT name FROM sqlite_master WHERE type='table'"
```

Should show: fixtures, results, fixture_settings, league_standings, team_results, league_snapshots

---

### **Step 2: Deploy Backend** ⚠️ REQUIRED

```bash
# Build TypeScript
npm run build

# Deploy to Cloudflare
npx wrangler deploy
```

**What this does:**
- Compiles TypeScript to JavaScript
- Deploys to Cloudflare Workers
- Makes API endpoints live

**Verify it worked:**
```bash
# Test health endpoint
curl https://your-backend.workers.dev/healthz

# Should return: {"status":"ok","version":"...","ts":"..."}
```

**Get your backend URL:**
After deployment, copy the URL from the output (e.g., `https://your-app.your-subdomain.workers.dev`)

---

### **Step 3: Configure Google Apps Script** ⚠️ REQUIRED

1. Go to https://script.google.com
2. Open your project (or create new one)
3. Copy these files:
   - `apps-script/fa-website-scraper.gs`
   - `apps-script/fa-snippet-parser.gs`
   - `apps-script/fixture-consolidator.gs`
   - `apps-script/league-table-calculator.gs`
   - `apps-script/match-day-scheduler.gs` ✨ NEW
   - Your existing `FA-Fixture-Sync-FIXED.gs`

4. Set Script Properties:
   - Click ⚙️ **Project Settings**
   - Scroll to **Script Properties**
   - Click **+ Add script property**

**ONLY 2 Properties Needed:**
```
BACKEND_API_URL = https://your-backend.workers.dev
TENANT_ID = default
```

**That's it!** Everything else configured via mobile app.

---

### **Step 4: Create Apps Script Triggers** ⚠️ REQUIRED

1. Click **Triggers** (⏰ clock icon in sidebar)
2. Click **+ Add Trigger**

**Trigger 1: Smart Sync (Every Minute)**
- Function: `smartSync`
- Event source: Time-driven
- Type: Minutes timer
- Interval: **Every minute**

**This replaces the old hourly trigger!**

The `smartSync` function is intelligent:
- Normal days → Actually runs hourly
- Match days → Runs every minute after expected full-time

**Why every minute?**
- The function **decides internally** whether to sync
- On normal days, it skips 59 out of 60 runs
- On match days, it runs every minute during boost mode
- This gives instant league updates after matches!

3. Click **Save**

**Grant Permissions:**
1. Click **Run** → Select `smartSync`
2. Google will ask for permissions
3. Click **Review Permissions**
4. Select your account
5. Click **Advanced** → **Go to [Project Name]**
6. Click **Allow**

---

### **Step 5: Mobile App Configuration**

#### A. Update Settings Screen Interface

The settings screen is already updated to support:
- ✅ 4 separate FA snippet URLs
- ✅ Email configuration
- ✅ Calendar configuration
- ✅ Match-day boost settings

#### B. Add to Navigation

Add these screens to your app navigation:
```typescript
// navigation/index.tsx or similar
<Stack.Screen
  name="FixtureSettings"
  component={FixtureSettingsScreen}
  options={{ title: 'Fixture Sync Settings' }}
/>

<Stack.Screen
  name="LeagueTable"
  component={LeagueTableScreen}
  options={{ title: 'League Table' }}
/>
```

#### C. Set Backend URL

Create/edit `.env` file:
```env
EXPO_PUBLIC_API_URL=https://your-backend.workers.dev
```

#### D. Rebuild App

```bash
cd "C:\Users\clayt\OneDrive\Desktop\Final Products\OA App\applatest\mobile"
npx expo start
```

---

## Customer Configuration (In Mobile App)

Customer opens app → Settings → Fixture Sync:

### **Team Information**
- Team Name: `Shepshed Dynamo Youth U16`

### **FA Integration**
- Website URL: `https://fulltime-league.thefa.com/fixtures?...`
- Fixtures Snippet URL: `https://...` (from FA widget code)
- Results Snippet URL: `https://...` (from FA widget code)
- League Table Snippet URL: `https://...` (from FA widget code)
- Team Fixtures Snippet URL: `https://...` (from FA widget code)

**How to get snippet URLs:**
1. Go to FA Full-Time website
2. Look for "Embed" or "Widget" buttons
3. Copy the URL from each embed code
4. Paste into corresponding field

### **Email Integration**
- ✅ Sync from FA Emails
- Gmail Query: `from:@thefa.com subject:(fixture OR postponed)`
- Gmail Label: `FA/Fixtures`

### **Calendar Integration**
- ✅ Sync to Google Calendar
- Calendar ID: `your-calendar@group.calendar.google.com`

### **Match Day Boost**
- ✅ Enable Match Day Boost
- Boost Start Offset: `90` minutes (after kick-off)
- Typical Kick-off Time: `14:00`

**Save Settings** ✅

---

## Testing

### Test 1: Backend Health Check
```bash
curl https://your-backend.workers.dev/healthz
# Should return: {"status":"ok",...}
```

### Test 2: Database Tables
```bash
npx wrangler d1 execute DB --command "SELECT * FROM fixture_settings"
# Should show your default settings
```

### Test 3: Apps Script - Manual Run
1. In Apps Script, select `smartSync` function
2. Click **Run**
3. Check **Execution log** (Ctrl+Enter)
4. Should see: "Smart Sync Check" and decision logic

### Test 4: Mobile App Settings
1. Open mobile app
2. Go to Settings → Fixture Sync
3. Enter all URLs
4. Click "Test Connection"
5. Should see: "✅ Connected successfully!"

### Test 5: Fixture Sync
1. Wait for next sync (check Apps Script Executions)
2. Open mobile app → Fixtures screen
3. Pull to refresh
4. Should see real fixtures!

### Test 6: League Table
1. Wait for match day
2. After matches complete + boost mode
3. Open mobile app → League Table
4. Pull to refresh
5. Should see updated standings!

---

## Verification Checklist

- [ ] Ran all 3 database migrations
- [ ] Deployed backend successfully
- [ ] Copied all Apps Script files
- [ ] Set 2 Script Properties (BACKEND_API_URL + TENANT_ID)
- [ ] Created `smartSync` trigger (every minute)
- [ ] Granted permissions in Apps Script
- [ ] Set mobile app backend URL in `.env`
- [ ] Added LeagueTableScreen to navigation
- [ ] Customer configured settings in mobile app
- [ ] Tested backend health check
- [ ] Verified fixtures appear in app
- [ ] Monitored Apps Script executions (should see smart sync logic)

---

## How the Smart Scheduler Works

### Normal Day (No Fixtures)

```
00:00 - smartSync runs → Check: No fixtures today → Sync normally
00:01 - smartSync runs → Check: Last sync < 1 hour ago → SKIP
00:02 - smartSync runs → Check: Last sync < 1 hour ago → SKIP
...
01:00 - smartSync runs → Check: Last sync > 1 hour ago → SYNC
```

**Result:** Only syncs once per hour (efficient!)

### Match Day

```
13:00 - smartSync → Check: Fixtures at 14:00 → Not in boost mode yet → Sync normally
14:00 - smartSync → Matches start
15:00 - smartSync → Check: 60 mins after kick-off → Not in boost mode yet (needs 90 mins)
15:30 - smartSync → Check: 90 mins after kick-off → BOOST MODE ACTIVATED
15:31 - smartSync → Boost mode → Check results → Not all in → SYNC
15:32 - smartSync → Boost mode → Check results → Not all in → SYNC
15:33 - smartSync → Boost mode → Check results → Not all in → SYNC
...
15:45 - smartSync → Boost mode → Check results → ALL RESULTS IN! → SYNC + UPDATE LEAGUE TABLE
15:45 - smartSync → Mark boost mode complete
15:46 - smartSync → Boost mode complete for today → Return to hourly
```

**Result:** League table updates 1-2 minutes after final whistle! ⚡

---

## Troubleshooting

### Issue: "No tables found" when querying database

**Fix:**
```bash
# Re-run migrations
npx wrangler d1 execute DB --file=migrations/001_create_fixtures_tables.sql
npx wrangler d1 execute DB --file=migrations/002_add_fixture_settings.sql
npx wrangler d1 execute DB --file=migrations/003_add_league_tables.sql
```

### Issue: "Connection test failed" in mobile app

**Check:**
1. Is `EXPO_PUBLIC_API_URL` set in `.env`?
2. Is backend deployed?
3. Try: `curl https://your-backend.workers.dev/healthz`

### Issue: Fixtures not appearing in app

**Check:**
1. Apps Script executions (is `smartSync` running?)
2. Apps Script logs (any errors?)
3. Backend logs: `npx wrangler tail`
4. Database: `npx wrangler d1 execute DB --command "SELECT COUNT(*) FROM fixtures"`

### Issue: League table not updating after matches

**Check:**
1. Are all results in? (Check backend: `SELECT * FROM results WHERE match_date = '15/11/2025'`)
2. Apps Script logs (did boost mode activate?)
3. Did `calculateLeagueTable()` run successfully?

---

## Cost Estimate

### Cloudflare Workers (Free Tier)
- **100,000 requests/day FREE**
- Smart sync: ~1,440 requests/day (every minute)
- Mobile app API calls: ~100 requests/day
- **Total:** ~1,540 requests/day
- **Cost:** FREE ✅

### Google Apps Script (Free Tier)
- **6 minutes/execution FREE**
- **90 minutes/day FREE**
- Smart sync: ~1 sec per run = ~24 mins/day
- **Cost:** FREE ✅

### Cloudflare D1 Database (Free Tier)
- **5 GB storage FREE**
- **5 million reads/day FREE**
- Fixtures + Results + League: < 1 MB
- **Cost:** FREE ✅

**TOTAL COST: $0/month** 🎉

---

## Summary

✅ **Step 1:** Run 3 migrations (creates database tables)
✅ **Step 2:** Deploy backend (makes API live)
✅ **Step 3:** Copy Apps Script files + set 2 properties
✅ **Step 4:** Create `smartSync` trigger (every minute)
✅ **Step 5:** Configure mobile app (add screens + set backend URL)
✅ **Customer:** Opens app → Settings → Configures URLs/emails/calendar → Done!

**Smart Scheduling:**
- Normal days: Hourly sync (efficient)
- Match days: Every minute after expected full-time (instant updates!)
- League table updates within 1-2 minutes of final whistle ⚡

**Everything is automatic after initial setup!** 🚀
