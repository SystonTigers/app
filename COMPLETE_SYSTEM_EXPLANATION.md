# Complete Fixture & League System - How It All Works

## ✅ What's Been Built

### **1. Fixtures & Results System** ✅
- ✅ Email/Calendar/Settings configuration in mobile app
- ✅ Triple redundancy fixture gathering (FA Emails + Website + Snippet)
- ✅ Auto-sync to backend every 5 minutes
- ✅ Real-time display in mobile app
- ✅ Pull-to-refresh functionality

### **2. League Table System** ✅
- ✅ Automatic calculation from match results
- ✅ Scrapes FA official table for comparison
- ✅ Computes GF, GA, GD from results
- ✅ Merges calculated data with FA official P, W, D, L, Pts
- ✅ Auto-updates when all match day fixtures complete
- ✅ Beautiful mobile app display

---

## How the League Table System Works

### **The Problem You Wanted Solved:**

FA website only shows: **P, W, D, L, Pts**
We need to calculate: **GF, GA, GD**

**Your requirements:**
1. Scrape results from FA website + snippet
2. Calculate full league table with GF, GA, GD
3. Compare with FA official table
4. Use FA's P, W, D, L, Pts (they're authoritative)
5. Use our calculated GF, GA, GD (we track goals)
6. Auto-update only when ALL today's fixtures are complete

---

## The Complete Flow

```
DAY 1 - Match Day
└── 14:00 - Shepshed U16 vs Anstey (3-1)
└── 14:00 - Lutterworth vs Ibstock (2-2)
└── 14:00 - Melton vs Cottesmore (1-0)
    └── All 3 fixtures complete
        └── TRIGGER: League Table Update
```

### Step 1: Apps Script Monitors Fixtures

```javascript
function autoUpdateLeagueTable() {
  // Check if ALL today's fixtures are complete
  if (areAllTodaysFixturesComplete()) {
    calculateLeagueTable(); // ✅ Trigger calculation
  } else {
    Logger.log('Not all fixtures complete - waiting...');
  }
}
```

**Trigger:** Run every hour via Google Apps Script time-based trigger

---

### Step 2: Gather Results from All Sources

**SOURCE 1: FA Website**
```javascript
scrapeWebsiteResults() {
  // Fetches: https://fulltime-league.thefa.com/results
  // Parses HTML table rows
  // Example result:
  {
    date: '15/11/2025',
    homeTeam: 'Shepshed U16',
    awayTeam: 'Anstey Nomads U16',
    homeScore: 3,
    awayScore: 1,
    competition: 'Division Four',
    source: 'website'
  }
}
```

**SOURCE 2: FA Snippet**
```javascript
scrapeSnippetResults() {
  // Fetches snippet URL (if configured)
  // Parses JSON/HTML for completed matches
  // Returns same format as website
}
```

**SOURCE 3: Email Parsing**
```javascript
parseEmailResults() {
  // Searches: from:@thefa.com subject:result
  // Extracts scores from email body
  // Returns same format
}
```

**Deduplication:** Same date + teams = single result

---

### Step 3: Calculate League Standings

```javascript
calculateStandings(results) {
  // Initialize all teams
  const standings = {
    'Shepshed U16': { P:0, W:0, D:0, L:0, GF:0, GA:0, GD:0, Pts:0 },
    'Anstey Nomads U16': { ... },
    // ...
  };

  // Process each result
  for (const result of results) {
    // Shepshed 3-1 Anstey
    standings['Shepshed U16'].P++;
    standings['Shepshed U16'].W++;
    standings['Shepshed U16'].GF += 3;
    standings['Shepshed U16'].GA += 1;
    standings['Shepshed U16'].GD += 2;
    standings['Shepshed U16'].Pts += 3;

    standings['Anstey Nomads U16'].P++;
    standings['Anstey Nomads U16'].L++;
    standings['Anstey Nomads U16'].GF += 1;
    standings['Anstey Nomads U16'].GA += 3;
    standings['Anstey Nomads U16'].GD -= 2;
    standings['Anstey Nomads U16'].Pts += 0;
  }

  // Sort by: Points DESC, GD DESC, GF DESC
  return sortedStandings;
}
```

**Result:**
```
Pos | Team         | P | W | D | L | GF | GA | GD  | Pts
1   | Shepshed U16 | 5 | 4 | 1 | 0 | 15 | 6  | +9  | 13
2   | Melton U16   | 5 | 3 | 2 | 0 | 12 | 5  | +7  | 11
3   | Anstey U16   | 5 | 2 | 1 | 2 | 8  | 9  | -1  | 7
```

---

### Step 4: Scrape FA Official Table

```javascript
scrapeFALeagueTable() {
  // Fetches: https://fulltime-league.thefa.com/table
  // Parses HTML table
  // FA ONLY shows: Pos, Team, P, W, D, L, Pts
  // FA does NOT show: GF, GA, GD

  // Example FA data:
  {
    position: 1,
    teamName: 'Shepshed U16',
    played: 5,
    won: 4,
    drawn: 1,
    lost: 0,
    points: 13
    // ❌ NO GF, GA, GD from FA
  }
}
```

---

### Step 5: Merge FA Official + Our Calculations

```javascript
mergeStandings(calculated, faOfficial) {
  // For each team:
  // - Use FA's: Position, P, W, D, L, Pts (authoritative)
  // - Use our: GF, GA, GD (we calculated from match results)

  return {
    position: faOfficial.position,        // ✅ From FA (authoritative)
    teamName: 'Shepshed U16',
    played: faOfficial.played,            // ✅ From FA
    won: faOfficial.won,                  // ✅ From FA
    drawn: faOfficial.drawn,              // ✅ From FA
    lost: faOfficial.lost,                // ✅ From FA
    goalsFor: calculated.goalsFor,        // ✅ From our calculation
    goalsAgainst: calculated.goalsAgainst,// ✅ From our calculation
    goalDifference: calculated.goalDifference, // ✅ From our calculation
    points: faOfficial.points             // ✅ From FA (authoritative)
  };
}
```

**Why this approach?**
- FA is authoritative for positions and points
- We're authoritative for goals (we track every score)
- Best of both worlds!

---

### Step 6: Sync to Backend

```javascript
syncToBackend(competition, standings) {
  // POST to: /api/v1/league/sync
  {
    tenantId: 'default',
    competition: 'Under 16 Division Four',
    standings: [
      { position: 1, teamName: 'Shepshed U16', ... },
      { position: 2, teamName: 'Melton U16', ... },
      ...
    ]
  }

  // Backend stores in D1 database
  // Mobile app reads from database
}
```

---

### Step 7: Display in Mobile App

```typescript
// LeagueTableScreen.tsx
const response = await fetch('/api/v1/league/table');
const { data } = await response.json();

// Displays:
// - Position badges (Gold/Silver/Bronze)
// - Full stats: P, W, D, L, GF, GA, GD, Pts
// - Highlights our team
// - Color-coded positions (promotion/relegation zones)
```

---

## Configuration (Customer Does It All in App!)

### Mobile App → Settings → Fixture Sync

**Team Information:**
- Team Name: `Shepshed Dynamo Youth U16`

**FA Integration:**
- FA Website URL: `https://fulltime-league.thefa.com/...`
- FA Snippet URL: `https://...` (optional)

**Email Integration:**
- ✅ Sync from FA Emails (toggle)
- Gmail Search Query: `from:@thefa.com subject:(fixture OR postponed)`
- Gmail Label: `FA/Fixtures`

**Calendar Integration:**
- ✅ Sync to Google Calendar (toggle)
- Calendar ID: `your-calendar@group.calendar.google.com`

**Auto-Sync:**
- ✅ Enable Auto Sync (toggle)
- Interval: Every 5 minutes

**Save Settings** → Stored in backend database → Apps Script reads from database

---

## Database Schema

### `league_standings` Table
```sql
CREATE TABLE league_standings (
  id INTEGER PRIMARY KEY,
  tenant_id TEXT,
  competition TEXT,
  team_name TEXT,
  position INTEGER,

  -- From FA official table
  played INTEGER,
  won INTEGER,
  drawn INTEGER,
  lost INTEGER,
  points INTEGER,

  -- Calculated from our results
  goals_for INTEGER,
  goals_against INTEGER,
  goal_difference INTEGER,

  last_updated DATETIME
);
```

### `team_results` Table
```sql
CREATE TABLE team_results (
  id INTEGER PRIMARY KEY,
  tenant_id TEXT,
  match_date TEXT,
  competition TEXT,
  opponent TEXT,
  venue TEXT,
  our_score INTEGER,
  their_score INTEGER,
  result TEXT, -- 'win', 'draw', 'loss'
  points INTEGER, -- 3, 1, 0
  source TEXT, -- 'website', 'snippet', 'email'
  verified INTEGER DEFAULT 0
);
```

---

## API Endpoints

### League Table
- **POST** `/api/v1/league/sync` - Apps Script syncs standings
- **GET** `/api/v1/league/table` - Mobile app reads standings

### Fixtures & Results
- **POST** `/api/v1/fixtures/sync` - Apps Script syncs fixtures
- **GET** `/api/v1/fixtures/upcoming` - Mobile app reads fixtures
- **GET** `/api/v1/fixtures/results` - Mobile app reads results
- **POST** `/api/v1/fixtures/results` - Submit match result

### Settings
- **GET** `/api/v1/fixtures/settings` - Mobile app reads settings
- **PUT** `/api/v1/fixtures/settings` - Mobile app saves settings
- **GET** `/api/v1/fixtures/settings/config` - Apps Script reads config

---

## Automation

### Google Apps Script Triggers

**1. Fixture Consolidation (Every 5 minutes)**
```javascript
function consolidateFixtures() {
  // Gathers fixtures from emails + website + snippet
  // Deduplicates
  // Updates Google Sheets
  // Syncs to backend
}
```

**2. League Table Auto-Update (Every hour)**
```javascript
function autoUpdateLeagueTable() {
  if (areAllTodaysFixturesComplete()) {
    calculateLeagueTable();
  }
}
```

---

## What Happens When Fixtures Complete

### Scenario: Match Day - 3 fixtures at 14:00

**13:00 - Before matches**
```
autoUpdateLeagueTable() → ❌ Fixtures not complete → Skip
```

**15:00 - 2 of 3 complete**
```
autoUpdateLeagueTable() → ❌ Not all complete → Skip
```

**16:00 - ALL 3 complete**
```
autoUpdateLeagueTable() → ✅ All complete!
  ├── scrapeFAWebsite() → Get results
  ├── parseFASnippet() → Get results
  ├── parseEmailResults() → Get results
  ├── calculateStandings() → Compute GF, GA, GD
  ├── scrapeFALeagueTable() → Get P, W, D, L, Pts
  ├── mergeStandings() → Combine both
  └── syncToBackend() → Update database
```

**Mobile App**
```
User opens League Table screen → Pulls from database → Shows updated standings
```

---

## Files Created/Modified

### Backend
- ✅ `migrations/002_add_fixture_settings.sql` - Settings table (with email/calendar fields)
- ✅ `migrations/003_add_league_tables.sql` - League standings + results tables
- ✅ `src/index.ts` - Added league endpoints + updated settings endpoint

### Apps Script
- ✅ `league-table-calculator.gs` - Complete league calculation logic
- ✅ `fixture-consolidator.gs` - Updated to fetch config from backend
- ✅ `fa-website-scraper.gs` - Scrapes FA website
- ✅ `fa-snippet-parser.gs` - Parses FA snippet

### Mobile App
- ✅ `screens/FixtureSettingsScreen.tsx` - Added email/calendar fields
- ✅ `screens/LeagueTableScreen.tsx` - Beautiful league table display

---

## Summary

### What Customer Configures (in Mobile App):
1. Team name
2. FA website URL
3. FA snippet URL (optional)
4. Email sync settings (query, label)
5. Calendar sync (ID, enable/disable)
6. Auto-sync toggle

### What Happens Automatically:
1. **Every 5 minutes:** Gather fixtures from 3 sources → Sync to backend
2. **Every hour:** Check if all today's fixtures complete → Update league table if yes
3. **On completion:**
   - Scrape results from FA website + snippet + emails
   - Calculate full standings (P, W, D, L, GF, GA, GD, Pts)
   - Scrape FA official table (P, W, D, L, Pts only)
   - Merge: Use FA's positions/points + our goals
   - Sync to backend
4. **Mobile app:** Real-time display of fixtures, results, and league table

### Customer Never Touches:
- ❌ Google Sheets
- ❌ Google Apps Script
- ❌ Database
- ❌ Backend code

**Everything configured through mobile app!** ✅

---

## Next Steps

1. Run all 3 migrations:
   ```bash
   npx wrangler d1 execute DB --file=migrations/001_create_fixtures_tables.sql
   npx wrangler d1 execute DB --file=migrations/002_add_fixture_settings.sql
   npx wrangler d1 execute DB --file=migrations/003_add_league_tables.sql
   ```

2. Deploy backend:
   ```bash
   npm run build && npx wrangler deploy
   ```

3. Copy Apps Script files (including new `league-table-calculator.gs`)

4. Set up 2 triggers in Apps Script:
   - `consolidateFixtures` - Every 5 minutes
   - `autoUpdateLeagueTable` - Every hour

5. Add `LeagueTableScreen` to mobile app navigation

6. Customer opens app → Settings → Configures everything → Done!

**The system is complete and ready to deploy!** 🚀
