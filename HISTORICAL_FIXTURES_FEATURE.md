# Historical Fixtures Feature

## 🎯 What This Feature Does

**Automatically posts previous season results against upcoming fixtures - but ONLY if historical data exists. If no previous meetings found, it skips the post (no spam!).**

### Key Behavior:
- ✅ **Has History**: Posts detailed head-to-head comparison with stats
- ❌ **No History**: Skips post entirely (first-time opponents)
- 🔄 **Fallback**: If no historical data, posts general team stats instead

---

## 📅 When It Runs

### Automatic Schedule
- **Every Wednesday**: As part of the weekly content calendar
- **Integration**: Built into the Bible-compliant weekly scheduler
- **Context**: "Wednesday: Player stats (Monthly) / Previous matches vs opponent"

### Manual Triggers
- `postHistoricalForNextMatch()` - Check all upcoming fixtures
- `postHistoricalForOpponent("Team Name")` - Specific opponent
- `getHistoricalDataReport()` - See which teams have history

---

## 📊 What Gets Posted

### Historical Comparison Post (when data exists):
```
🏈 Head-to-Head: Syston Tigers vs Leicester City FC

📊 Historical Record:
• Played 8: Won 3, Drew 2, Lost 3
• Goals: 12 for, 10 against (+2)
• Last meeting: 2-1 Win (15/04/2023) - Home

📈 Recent Form vs Leicester:
• 2-1 W (Apr 2023) - Home
• 0-2 L (Oct 2022) - Away
• 1-1 D (Mar 2022) - Home

⚽ Next: Sunday 29th Sept, 3:00 PM at Syston Sports Park
```

### Data Sources:
- **Results Sheet** - Current season results
- **Historical Results Sheet** - Previous seasons data
- **Previous Seasons Sheet** - Legacy data
- **All Results Sheet** - Complete historical record

---

## 🔧 Technical Implementation

### File Structure:
```
src/
├── historical-fixtures.gs          # Main historical data manager
├── weekly-scheduler.gs             # Integration point (Wednesday)
├── manual-historical-posts.gs      # Manual trigger functions
└── config.gs                      # Event type mapping
```

### Key Classes:
- `HistoricalFixturesManager` - Core functionality
- `WeeklyScheduler.getHistoricalDataForOpponent()` - Integration method

### Make.com Integration:
- **Event Type**: `historical_comparison`
- **Webhook**: Standard Make.com webhook URL
- **Payload**: Rich data with all historical stats + Canva placeholders

---

## 🎨 Canva Placeholders

### Essential Placeholders:
```javascript
{
  // Match Info
  "fixture_preview_title": "Syston Tigers vs Leicester City FC",
  "opponent_name": "Leicester City FC",
  "match_date": "2024-09-29",
  "next_match_text": "Next: Sunday 29th Sept at Syston Sports Park",

  // Historical Stats
  "has_history": true,
  "total_meetings": 8,
  "historical_stats_text": "Played 8: Won 3, Drew 2, Lost 3",
  "head_to_head_record": "3W-2D-3L",
  "wins": 3,
  "draws": 2,
  "losses": 3,
  "goals_for": 12,
  "goals_against": 10,
  "goal_difference": 2,

  // Recent Form
  "recent_form_text": "2-1 W | 0-2 L | 1-1 D",
  "recent_meetings": [
    {"result": "2-1", "date": "15/04/2023", "venue": "Home"},
    {"result": "0-2", "date": "08/10/2022", "venue": "Away"},
    {"result": "1-1", "date": "12/03/2022", "venue": "Home"}
  ],

  // Last Meeting
  "last_meeting_result": "2-1",
  "last_meeting_date": "15/04/2023",
  "last_meeting_venue": "Home",

  // Context
  "is_first_meeting": false,
  "dominant_team": "equal" // "Syston Tigers", "opponent", or "equal"
}
```

---

## 📋 Setup Requirements

### Data Structure:
Your historical data sheets should have these columns:

**Results/Historical Results Sheet:**
- `Date` - Match date
- `Opposition` - Opponent team name
- `Result` - Score (e.g., "2-1", "0-3")
- `Venue` - "Home", "Away", or venue name

### Example Data:
```
Date        | Opposition           | Result | Venue
15/04/2023  | Leicester City FC    | 2-1    | Home
08/10/2022  | Leicester City FC    | 0-2    | Away
12/03/2022  | Leicester City FC    | 1-1    | Home
05/09/2021  | Coalville Town FC    | 3-0    | Home
```

---

## 🧪 Testing

### Manual Test Functions:

```javascript
// Test the complete system
testHistoricalSystem()

// Check what data is available
getHistoricalDataReport()

// Post for next match (if historical data exists)
postHistoricalForNextMatch()

// Post for specific opponent
postHistoricalForOpponent("Leicester City FC")
```

### Validation:
1. **Data Quality**: Checks for valid dates, scores, opponent names
2. **Smart Matching**: Case-insensitive opponent name matching
3. **Form Analysis**: Sorts by date, shows most recent first
4. **Statistics**: Auto-calculates W/D/L, goals for/against

---

## 🔄 Integration Flow

### Wednesday Schedule:
```
1. WeeklyScheduler.postWednesdayStats()
2. Check: Is it monthly stats time?
   - YES: Post monthly player stats
   - NO: Continue to step 3
3. Get Sunday's upcoming match
4. WeeklyScheduler.getHistoricalDataForOpponent()
5. HistoricalFixturesManager.getHistoricalResults()
6. Check: Does historical data exist?
   - YES: Create historical comparison payload
   - NO: Return null, fallback to general stats
7. Post to Make.com with rich historical data
8. Make.com → Canva → Social Media
```

### Error Handling:
- **No Historical Data**: Gracefully skips, posts general stats
- **Missing Sheets**: Logs warning, continues with available data
- **Invalid Data**: Filters out bad records, works with valid ones
- **Network Errors**: Standard retry logic, logs failures

---

## 📈 Benefits

### For Fans:
- **Context**: See how team historically performs vs opponent
- **Excitement**: Build anticipation with head-to-head records
- **Analysis**: Recent form guide helps predict outcomes

### For Club:
- **Engagement**: Historical content drives social media interaction
- **Professional**: Shows attention to detail and club history
- **Automated**: Zero manual work once set up

### For System:
- **Smart**: Only posts when historical data adds value
- **Clean**: No spam posts for first-time opponents
- **Flexible**: Works with any amount of historical data

---

## 🎯 Success Metrics

### Content Quality:
- Posts only when historical data exists (quality over quantity)
- Rich, detailed comparisons with multiple data points
- Recent form analysis (last 3 meetings)

### Automation Level:
- Fully automated Wednesday posting
- Smart opponent detection and matching
- Graceful fallbacks for missing data

### Integration:
- Seamless Make.com webhook integration
- Full Canva template support with rich placeholders
- Bible-compliant weekly schedule integration

---

*Feature developed as part of the Bible-compliant weekly content system. Maintains the principle of posting valuable content only when it adds genuine value to fans.*