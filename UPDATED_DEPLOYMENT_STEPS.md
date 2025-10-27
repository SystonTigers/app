# Updated Deployment Guide - Game-Specific Boost Mode

## What's New ✨

### 1. **Game-Specific Boost Mode**
Instead of a generic 90-minute wait, boost mode now calculates the exact expected full-time based on YOUR game format:

**Example Calculations:**
- **U16 11v11** (40 mins per half): Boost starts at 40×2 + 5 (break) + 5 (buffer) = **90 mins** after kick-off
- **U12 9v9** (30 mins per half): Boost starts at 30×2 + 5 + 5 = **70 mins** after kick-off
- **U10 7v7** (25 mins per half): Boost starts at 25×2 + 5 + 5 = **60 mins** after kick-off
- **U8 5v5** (20 mins per half): Boost starts at 20×2 + 5 + 5 = **50 mins** after kick-off

### 2. **Multiple FA Snippet URLs**
FA provides 4 different embed codes:
- Fixtures snippet (all league fixtures)
- Results snippet (all league results)
- League table snippet
- Team-specific fixtures/results snippet

Now you can configure all 4 separately!

---

## Step 1: Create D1 Database ⚠️ MUST DO FIRST

```bash
cd "C:\Users\clayt\OneDrive\Desktop\Final Products\OA App\applatest\backend"

# Create the database
npx wrangler d1 create syston-db
```

**Expected Output:**
```
✅ Successfully created DB 'syston-db'

[[d1_databases]]
binding = "DB"
database_name = "syston-db"
database_id = "a1b2c3d4-5e6f-7g8h-9i0j-k1l2m3n4o5p6"
```

**IMPORTANT:** Copy the `database_id` from the output!

---

## Step 2: Update wrangler.toml with Database ID

Open `backend/wrangler.toml` and find this section:

```toml
[[d1_databases]]
binding = "DB"
database_name = "syston-db"
database_id = "REPLACE_WITH_YOUR_DATABASE_ID"  # <-- Replace this!
```

Replace `REPLACE_WITH_YOUR_DATABASE_ID` with the actual database ID from Step 1.

**Example:**
```toml
[[d1_databases]]
binding = "DB"
database_name = "syston-db"
database_id = "a1b2c3d4-5e6f-7g8h-9i0j-k1l2m3n4o5p6"
```

---

## Step 3: Run Database Migrations ⚠️ REQUIRED

```bash
# Still in backend directory

# Migration 1: Create fixtures and results tables
npx wrangler d1 execute syston-db --file=migrations/001_create_fixtures_tables.sql

# Migration 2: Create settings table (with game format fields!)
npx wrangler d1 execute syston-db --file=migrations/002_add_fixture_settings.sql

# Migration 3: Create league standings tables
npx wrangler d1 execute syston-db --file=migrations/003_add_league_tables.sql
```

**Verify it worked:**
```bash
npx wrangler d1 execute syston-db --command "SELECT name FROM sqlite_master WHERE type='table'"
```

**Expected Output:**
```
┌──────────────────────┐
│ name                 │
├──────────────────────┤
│ fixtures             │
│ results              │
│ fixture_settings     │
│ league_standings     │
│ team_results         │
│ league_snapshots     │
└──────────────────────┘
```

**Check the settings table has game format fields:**
```bash
npx wrangler d1 execute syston-db --command "PRAGMA table_info(fixture_settings)"
```

Should see columns: `age_group`, `game_size`, `half_length`, `quarter_length`

---

## Step 4: Deploy Backend ⚠️ REQUIRED

```bash
# Build TypeScript to JavaScript
npm run build

# Deploy to Cloudflare Workers
npx wrangler deploy
```

**Expected Output:**
```
✨ Built successfully
⛅ Deploying to Cloudflare...
✨ Success! Deployed to https://syston-backend.your-subdomain.workers.dev
```

**Test it works:**
```bash
curl https://syston-backend.your-subdomain.workers.dev/healthz
```

Should return: `{"status":"ok","version":"...","ts":"..."}`

---

## Step 5: Configure Google Apps Script

### A. Copy All Script Files

1. Go to https://script.google.com
2. Open your project (or create new one)
3. Copy these 5 files:
   - `apps-script/fa-website-scraper.gs`
   - `apps-script/fa-snippet-parser.gs`
   - `apps-script/fixture-consolidator.gs`
   - `apps-script/league-table-calculator.gs`
   - `apps-script/match-day-scheduler.gs` ✨ **UPDATED** (now calculates boost time dynamically!)

### B. Set Script Properties

Click ⚙️ **Project Settings** → **Script Properties** → **+ Add script property**

**ONLY 2 Properties Needed:**
```
BACKEND_API_URL = https://syston-backend.your-subdomain.workers.dev
TENANT_ID = default
```

That's it! Everything else is configured in the mobile app.

### C. Create Trigger

1. Click **Triggers** (⏰ clock icon)
2. Click **+ Add Trigger**

**Trigger Configuration:**
- Function: `smartSync`
- Event source: Time-driven
- Type: Minutes timer
- Interval: **Every minute**

**Why every minute?**

The `smartSync` function is intelligent:
- **Normal days**: Actually runs hourly (skips 59 out of 60 runs)
- **Match days**: Runs every minute after expected full-time based on YOUR game format

### D. Grant Permissions

1. Click **Run** → Select `smartSync`
2. Click **Review Permissions** → Select your account
3. Click **Advanced** → **Go to [Project Name]**
4. Click **Allow**

---

## Step 6: Install Mobile Dependencies

The mobile app now uses `@react-native-picker/picker` for game format selection.

```bash
cd "C:\Users\clayt\OneDrive\Desktop\Final Products\OA App\applatest\mobile"

# Install picker component
npx expo install @react-native-picker/picker

# Start app
npx expo start
```

---

## Step 7: Configure in Mobile App

Open the app → Settings → Fixture Sync Settings

### **Team Information**
- Team Name: `Shepshed Dynamo Youth U16`

### **FA Integration**
- FA Website URL: `https://fulltime-league.thefa.com/...`
- Fixtures Snippet URL: `https://...` (from FA fixtures widget)
- Results Snippet URL: `https://...` (from FA results widget)
- League Table Snippet URL: `https://...` (from FA table widget)
- Team Fixtures Snippet URL: `https://...` (from FA team widget)

**How to get snippet URLs:**
1. Go to FA Full-Time website
2. Look for "Embed" or "Widget" buttons
3. Copy the URL from each embed code (there are 4 different ones!)
4. Paste into corresponding field

### **Email Integration**
- ✅ Sync from FA Emails
- Gmail Query: `from:@thefa.com subject:(fixture OR postponed)`
- Gmail Label: `FA/Fixtures`

### **Calendar Integration**
- ✅ Sync to Google Calendar
- Calendar ID: `your-calendar@group.calendar.google.com`

### **Game Format & Match Day Boost** ✨ NEW
- ✅ Enable Match Day Boost
- **Age Group**: Select your age group (e.g., U16, U14, U12)
- **Game Size**: Select format (11v11, 9v9, 7v7, 5v5)
- **Minutes Per Half**: Enter half length (e.g., 40, 30, 25, 20)
- **Minutes Per Quarter**: Leave blank if playing halves
- **Typical Kick-off Time**: `14:00` (or whatever time your matches usually start)

**Example Configurations:**

**U16 Full Pitch:**
- Age Group: U16
- Game Size: 11v11
- Minutes Per Half: 40
- Boost starts: 90 mins after kick-off

**U12 Mid-Size:**
- Age Group: U12
- Game Size: 9v9
- Minutes Per Half: 30
- Boost starts: 70 mins after kick-off

**U8 Small-Sided:**
- Age Group: U8
- Game Size: 5v5
- Minutes Per Half: 20
- Boost starts: 50 mins after kick-off

**Click "Save Settings"** ✅

---

## How Game-Specific Boost Mode Works

### Normal Day (No Fixtures)
```
00:00 - smartSync runs → No fixtures → Hourly schedule
00:01 - smartSync runs → Last sync < 1 hour → SKIP
...
01:00 - smartSync runs → Last sync > 1 hour → SYNC
```

### Match Day - U16 11v11 (40 min halves)
```
13:00 - smartSync → Fixtures at 14:00 → Not boost time yet → Hourly sync
14:00 - smartSync → Match starts → Calculate: (40×2) + 5 + 5 = 90 mins
15:00 - smartSync → 60 mins elapsed → Not boost time yet
15:30 - smartSync → 90 mins elapsed → BOOST MODE ACTIVATED
15:31 - smartSync → Check results → Not all in → SYNC
15:32 - smartSync → Check results → Not all in → SYNC
...
15:45 - smartSync → Check results → ALL RESULTS IN! → SYNC + UPDATE LEAGUE TABLE
15:45 - smartSync → Mark boost complete → Exit boost mode
16:00 - smartSync → Back to hourly schedule
```

### Match Day - U10 7v7 (25 min halves)
```
14:00 - Match starts
14:00 - Calculate: (25×2) + 5 + 5 = 60 mins
15:00 - BOOST MODE ACTIVATED (60 mins after kick-off)
15:01 - Sync every minute
...
15:10 - All results in → Update league table → Exit boost mode
```

**Result:** League table updates 1-2 minutes after final whistle, regardless of game format! ⚡

---

## Testing

### Test 1: Database Setup
```bash
npx wrangler d1 execute syston-db --command "SELECT * FROM fixture_settings"
```
Should show default settings row with game format fields.

### Test 2: Backend Health
```bash
curl https://your-backend.workers.dev/healthz
```
Should return: `{"status":"ok"}`

### Test 3: Apps Script Manual Run
1. In Apps Script, select `smartSync`
2. Click **Run**
3. Check **Execution log** (Ctrl+Enter)
4. Should see:
   - "Smart Sync Check"
   - "Game format: 11v11 / Age: U16"
   - "Half length: 40 mins"
   - "Calculated boost offset: 90 mins"

### Test 4: Mobile App Settings
1. Open mobile app
2. Go to Settings → Fixture Sync
3. Should see:
   - 4 separate FA snippet URL fields
   - Game Format & Match Day Boost section
   - Age group dropdown
   - Game size dropdown
   - Half length input
4. Configure and save
5. Click "Test Connection"
6. Should see: "✅ Connected successfully!"

---

## Troubleshooting

### Issue: "Couldn't find a D1 DB with the name or binding 'DB'"

**Fix:**
1. Make sure you ran: `npx wrangler d1 create syston-db`
2. Copy the `database_id` from the output
3. Update `wrangler.toml` with the actual database_id (not "REPLACE_WITH_YOUR_DATABASE_ID")
4. Re-run migrations

### Issue: "Picker is not defined" in mobile app

**Fix:**
```bash
cd mobile
npx expo install @react-native-picker/picker
npx expo start
```

### Issue: Boost mode not activating

**Check:**
1. Did you configure game format in mobile app settings?
2. Did you save the settings?
3. Check Apps Script execution logs:
   - Is it reading the correct half_length?
   - Is it calculating the correct boost offset?
4. Check backend: `npx wrangler d1 execute syston-db --command "SELECT age_group, game_size, half_length FROM fixture_settings"`

### Issue: League table not updating after matches

**Check:**
1. Are all results in? `SELECT * FROM results WHERE match_date = 'DD/MM/YYYY'`
2. Did boost mode activate? Check Apps Script logs
3. Did `calculateLeagueTable()` run? Check execution log

---

## Summary

✅ **Step 1:** Create D1 database → Get database_id
✅ **Step 2:** Update wrangler.toml with database_id
✅ **Step 3:** Run 3 migrations
✅ **Step 4:** Deploy backend
✅ **Step 5:** Copy Apps Script files + set 2 properties + create trigger
✅ **Step 6:** Install mobile dependencies (`@react-native-picker/picker`)
✅ **Step 7:** Configure everything in mobile app including game format

**Game-Specific Boost Mode:**
- Configure your age group, game size, and half length in the app
- Boost mode calculates exact expected full-time for YOUR game format
- No more generic 90-minute wait!
- Works for 5v5, 7v7, 9v9, 11v11 - any format!

**Multiple FA Snippet URLs:**
- Separate fields for fixtures, results, league table, and team-specific data
- Get all 4 URLs from FA website embed codes
- Better data coverage with specific sources

**Everything is automatic after initial setup!** 🚀
