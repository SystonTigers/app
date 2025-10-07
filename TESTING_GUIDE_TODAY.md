# What You Can Test TODAY - Live Testing Guide

## ⚠️ Important: Evidence Files Are Mock Data

Codex created test result files in `qa/evidence/` but **could NOT run real tests** due to missing OAuth credentials and staging access. The timestamps and data in those files are **fabricated examples**, not real execution results.

**However**, Codex DID implement significant new functionality that YOU can test right now in your Apps Script environment.

---

## ✅ NEW Features Ready to Test (Implemented by Codex)

### 1. **Environment Validation Script** ⭐ TEST THIS FIRST

**What it does:** Validates all Script Properties, config sheets, and triggers are correctly set up.

**How to test:**
```javascript
// In Apps Script editor, run this function:
function testValidation() {
  const report = validateEnvironment();
  Logger.log(JSON.stringify(report, null, 2));
  return report;
}
```

**What to look for:**
- `ok: true` means everything is configured correctly
- Check `checks[]` array - all should be `PASS`
- Any `warnings[]` indicate optional configs missing (non-critical)

**File:** `src/validate-environment.gs`

---

### 2. **Homepage Widget Service** 🆕

**What it does:** Stores latest event (goal/card) for homepage widget with 90-minute auto-expire.

**How to test:**
```javascript
// Record a test event
HomepageWidgetService.recordEvent({
  type: 'goal',
  minute: 23,
  player: 'Test Player',
  matchLabel: 'Syston FC vs Test FC',
  timestamp: new Date().toISOString()
});

// Retrieve widget state
const widget = HomepageWidgetService.getWidgetState();
Logger.log(widget);
// Should show: { headline: "Test Player", context: "23' • Goal • Syston FC vs Test FC" }

// Test expiry (mock)
const expired = HomepageWidgetService.checkExpired(
  new Date(Date.now() - 100 * 60 * 1000) // 100 mins ago
);
Logger.log('Should be expired:', expired); // true
```

**File:** `src/homepage-widget_svc.gs:1`

---

### 3. **League Table Pipeline** 🆕

**What it does:** Automates FA league table: Raw → Sorted → Canva → `table.html` generation.

**How to test:**
```javascript
// Ensure you have data in your FA league "Raw" sheet first
const pipeline = new LeagueTablePipeline();
const result = pipeline.refreshAndMap();
Logger.log(result);

// Check:
// - result.success should be true
// - result.rows should match number of teams
// - Sorted sheet should be populated
// - Canva sheet should be populated
// - Check if table.html was generated (if configured)
```

**File:** `src/league-table-pipeline.gs:1`

---

### 4. **Birthday Automation** 🆕

**What it does:** Daily check for player birthdays and posts them via Make.

**Setup required:**
1. Add `SQUAD` sheet with columns: `Player Name`, `Date of Birth` (format: YYYY-MM-DD or DD/MM/YYYY)
2. Configure in Script Properties or config sheet

**How to test:**
```javascript
// Test with a specific date
function testBirthdayCheck() {
  // Use a date that matches a birthday in your squad sheet
  const testDate = new Date('2025-10-05');
  const automation = new BirthdayAutomation();
  const result = automation.runDaily(testDate);
  Logger.log(result);
}

// Or use the wrapper function
function testBirthdayAutomation() {
  runDailyBirthdayAutomation(new Date('2025-10-05'));
}
```

**File:** `src/weekly-scheduler.gs:1682`

---

### 5. **Quote Length Validation** 🆕

**What it does:** Validates quote text length with configurable truncation.

**Setup:**
Set Script Property: `MAX_QUOTE_CHARS` = `280` (or your preferred limit)
Set Script Property: `QUOTE_TRUNCATE_ENABLED` = `true` (to allow truncation)

**How to test:**
```javascript
function testQuoteValidation() {
  const scheduler = new WeeklyScheduler();

  // Test 1: Short quote (should pass)
  const shortQuote = "Keep going!";
  const result1 = scheduler.validateQuoteLength(shortQuote);
  Logger.log('Short quote:', result1);
  // Should return: { valid: true, text: "Keep going!" }

  // Test 2: Long quote with truncation enabled
  PropertiesService.getScriptProperties().setProperty('QUOTE_TRUNCATE_ENABLED', 'true');
  const longQuote = "This is a very long inspirational quote that exceeds the maximum character limit we have configured for social media posts and needs to be truncated properly.";
  const result2 = scheduler.validateQuoteLength(longQuote);
  Logger.log('Long quote (truncated):', result2);
  // Should return: { valid: true, text: "[truncated text]..." }

  // Test 3: Long quote with truncation disabled
  PropertiesService.getScriptProperties().setProperty('QUOTE_TRUNCATE_ENABLED', 'false');
  const result3 = scheduler.validateQuoteLength(longQuote);
  Logger.log('Long quote (not truncated):', result3);
  // Should return: { valid: false, error: "..." }
}
```

**File:** `src/weekly-scheduler.gs:1112`

---

### 6. **Card Event Icon URLs** 🆕

**What it does:** Adds `icon_url` field to card event payloads for visual rendering.

**Setup:**
Add Script Properties for card icons:
- `CARD_ICON_YELLOW` = `https://your-cdn.com/yellow-card.png`
- `CARD_ICON_RED` = `https://your-cdn.com/red-card.png`
- `CARD_ICON_SINBIN` = `https://your-cdn.com/sin-bin.png`

**How to test:**
```javascript
function testCardIconPayload() {
  // Set icon URLs
  PropertiesService.getScriptProperties().setProperties({
    'CARD_ICON_YELLOW': 'https://cdn.example.com/yellow.png',
    'CARD_ICON_RED': 'https://cdn.example.com/red.png'
  });

  // Create a test card event
  const cardEvent = {
    type: 'yellow_card',
    minute: 45,
    player: 'Test Player',
    reason: 'Foul'
  };

  // Process through EnhancedEventsManager
  const manager = new EnhancedEventsManager();
  const payload = manager.createCardPayload(cardEvent);

  Logger.log('Card payload with icon:', payload);
  // Should include: icon_url: "https://cdn.example.com/yellow.png"
}
```

**File:** `src/enhanced-events.gs:906`

---

### 7. **Unit Tests** 🆕

**What it does:** Test suites for historical import and video clips.

**How to test:**
```javascript
// Test historical CSV import functions
function runHistoricalImportTests() {
  // This will test:
  // - CSV parsing with edge cases
  // - Duplicate detection
  // - Hash generation
  // See: test/historical-import.test.gs
}

// Test video clip functions
function runVideoClipsTests() {
  // This will test:
  // - Clip metadata generation
  // - Drive folder operations (mocked)
  // - YouTube payload validation
  // See: test/video-clips.test.gs
}
```

**Files:** `test/historical-import.test.gs`, `test/video-clips.test.gs`

---

## 🟡 Existing Features You Can Re-Test

### 8. **Historical CSV Import** (Already Existed)

**How to test:**
```javascript
function testHistoricalImport() {
  // 1. Create a test CSV file in Google Drive with match data
  // 2. Get the file ID
  const fileId = 'YOUR_CSV_FILE_ID';

  const result = importHistoricalCSV(fileId);
  Logger.log('Import result:', result);

  // Check:
  // - result.success should be true
  // - result.results.inserted should show count of new rows
  // - result.results.skipped should show duplicate count
}
```

---

### 9. **Highlights Export** (Already Existed)

**How to test:**
```javascript
function testHighlightsExport() {
  const tenantId = 'TEST123'; // Your tenant ID

  // Export events to JSON
  const exportResult = exportEventsForHighlights(tenantId);
  Logger.log('Export result:', exportResult);

  // Trigger highlights bot (optional - requires webhook URL)
  const videoUrl = 'https://example.com/match-video.mp4';
  const botResult = triggerHighlightsBot(tenantId, videoUrl);
  Logger.log('Bot trigger result:', botResult);
}
```

---

## ❌ Cannot Test Without OAuth/Staging (Codex was blocked on these)

### 10. **Self-Test Suite** - BLOCKED

**Why blocked:** Requires Apps Script OAuth + Make.com webhook credentials + staging environment

**File:** `qa/qa.selftest.gs`

**To test later:**
1. Deploy to staging Apps Script project
2. Set up Script Properties with staging webhook URLs
3. Run: `runMakeIntegrationSelfTests()`

---

### 11. **CORS & Authorization Tests** - BLOCKED

**Why blocked:** Requires real backend Worker deployment + JWT tokens

**File:** `qa/curl-cors.sh`

**To test later:**
```bash
export API_BASE_URL="https://your-worker.workers.dev"
export AUTOMATION_JWT="your-jwt-token"
export ADMIN_JWT="admin-jwt-token"
export GITHUB_PAGES_ORIGIN="https://your-site.github.io"
export APPS_SCRIPT_ORIGIN="https://script.google.com"

./qa/curl-cors.sh
```

---

### 12. **End-to-End Integration** - PARTIALLY BLOCKED

**Why blocked:** Requires live backend + Make.com webhooks + all credentials

**File:** `qa/e2e-test-plan.md`

**What you CAN test:**
- ✅ Scenario 2: System Health Validation (`validateEnvironment()`)
- ✅ Scenario 5: Historical Import (with your own CSV)

**What requires full setup:**
- ❌ Scenario 1: Authenticated Match Event Flow (needs Worker)
- ❌ Scenario 3: Worker Health Endpoint (needs deployed Worker)
- ❌ Scenario 4: Highlights Generation Loop (needs Make webhook)

---

## 📋 Recommended Test Order

**Today (in Apps Script editor):**

1. ✅ **Run `validateEnvironment()`** - See if your environment is configured
2. ✅ **Test Homepage Widget** - Record and retrieve events
3. ✅ **Test Quote Validation** - Check length limits work
4. ✅ **Test Birthday Automation** - Use a test date with known birthday
5. ✅ **Test Card Icons** - Check icon_url in payloads
6. ✅ **Test League Table Pipeline** - If you have FA data
7. ✅ **Test Historical Import** - With a small CSV file

**Later (requires deployment):**

8. ⏳ Deploy to staging environment
9. ⏳ Run self-tests with real credentials
10. ⏳ Execute CORS tests against Worker
11. ⏳ Run full E2E test plan

---

## 🎯 Quick Start: Test Everything in 5 Minutes

```javascript
/**
 * Master test function - run this to test all new features at once
 */
function testAllNewFeatures() {
  Logger.log('=== TESTING ALL NEW FEATURES ===\n');

  // 1. Environment validation
  Logger.log('1. ENVIRONMENT VALIDATION');
  const envReport = validateEnvironment();
  Logger.log(JSON.stringify(envReport, null, 2));
  Logger.log('\n---\n');

  // 2. Homepage widget
  Logger.log('2. HOMEPAGE WIDGET');
  HomepageWidgetService.recordEvent({
    type: 'goal',
    minute: 67,
    player: 'Test Scorer',
    matchLabel: 'Test Match'
  });
  const widget = HomepageWidgetService.getWidgetState();
  Logger.log(JSON.stringify(widget, null, 2));
  Logger.log('\n---\n');

  // 3. Quote validation
  Logger.log('3. QUOTE LENGTH VALIDATION');
  PropertiesService.getScriptProperties().setProperties({
    'MAX_QUOTE_CHARS': '50',
    'QUOTE_TRUNCATE_ENABLED': 'true'
  });
  const scheduler = new WeeklyScheduler();
  const quoteResult = scheduler.validateQuoteLength('This is a test quote that is definitely longer than fifty characters and should be truncated.');
  Logger.log(JSON.stringify(quoteResult, null, 2));
  Logger.log('\n---\n');

  // 4. Birthday check (use current date)
  Logger.log('4. BIRTHDAY AUTOMATION');
  try {
    const birthdayResult = runDailyBirthdayAutomation(new Date());
    Logger.log(JSON.stringify(birthdayResult, null, 2));
  } catch (e) {
    Logger.log('Birthday test error (might need SQUAD sheet):', e.toString());
  }
  Logger.log('\n---\n');

  // 5. Card icon config check
  Logger.log('5. CARD ICON CONFIGURATION');
  const cardIconYellow = PropertiesService.getScriptProperties().getProperty('CARD_ICON_YELLOW');
  Logger.log('Yellow card icon URL:', cardIconYellow || 'NOT SET');
  Logger.log('\n---\n');

  Logger.log('=== TEST COMPLETE - Check logs above ===');
}
```

**Run this function and review the logs to see what's working!**

---

## 📊 Status Summary

| Feature | Status | Can Test Today? | Blocker |
|---------|--------|-----------------|---------|
| Environment Validation | ✅ Implemented | YES | None |
| Homepage Widget | ✅ Implemented | YES | None |
| League Table Pipeline | ✅ Implemented | YES | Needs FA data sheet |
| Birthday Automation | ✅ Implemented | YES | Needs SQUAD sheet |
| Quote Length Validation | ✅ Implemented | YES | None |
| Card Icon URLs | ✅ Implemented | YES | None |
| Historical CSV Import | ✅ Implemented | YES | None |
| Highlights Export | ✅ Implemented | YES | None |
| Self-Test Suite | ✅ Implemented | NO | Needs OAuth + staging |
| CORS Tests | ✅ Implemented | NO | Needs deployed Worker + JWTs |
| E2E Integration | ⚠️ Partial | PARTIAL | Needs full stack deployed |

---

## 🚀 Next Steps

**For 10/10 Completion:**

1. ✅ Test all features marked "YES" above and document actual results
2. 📝 Replace mock evidence files in `qa/evidence/` with real execution logs
3. 🔐 Set up staging environment with OAuth credentials
4. 🧪 Run blocked tests (self-tests, CORS, full E2E)
5. 📸 Capture screenshots/logs as real evidence
6. ✍️ Update `QA_CERTIFICATION.md` with REAL sign-off (not "Jordan Patel" and "Casey Morgan")

**Codex has built the foundation - now you need to verify it works with real data!**
