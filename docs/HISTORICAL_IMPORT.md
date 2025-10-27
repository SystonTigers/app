# Historical Data Import Guide

## Overview

Import past season data (fixtures, results, player stats) from CSV files into the platform. This allows you to populate historical records without manual entry.

## Supported Data Types

1. **Fixtures** - Past and future match schedules
2. **Results** - Match outcomes with scores
3. **Player Stats** - Goals, assists, appearances, cards
4. **Squad History** - Past rosters and lineups

## CSV Format Requirements

### Fixtures CSV

**Required Columns**:
- Date (DD/MM/YYYY)
- Opposition
- Venue (Home/Away)
- Competition
- Kick Off (HH:MM)

**Optional Columns**:
- Location (stadium address)
- Competition Type (League/Cup/Friendly)
- Notes

**Example**:
```csv
Date,Opposition,Venue,Competition,Kick Off,Location
07/09/2024,Panthers FC,Home,U13 League,10:00,Syston Recreation Ground
14/09/2024,Tigers United,Away,U13 League,10:30,Tigers Ground
21/09/2024,Eagles FC,Home,County Cup,11:00,Syston Recreation Ground
```

### Results CSV

**Required Columns**:
- Date (DD/MM/YYYY)
- Opposition
- Score (e.g., "3-1", "2-2")
- Competition

**Optional Columns**:
- Scorers (comma-separated names with minute)
- Yellow Cards (comma-separated names)
- Red Cards (comma-separated names)
- MOTM (Man of the Match)
- Match Report (text)

**Example**:
```csv
Date,Opposition,Score,Competition,Scorers,Yellow Cards,MOTM
07/09/2024,Panthers FC,3-1,U13 League,"John Smith 12' 45', Mike Jones 67'",Tom Brown,John Smith
14/09/2024,Tigers United,2-2,U13 League,"Sarah Lee 23', Emma Davis 78'",,Sarah Lee
21/09/2024,Eagles FC,1-0,County Cup,Mike Jones 89',"Tom Brown, Chris Wilson",Mike Jones
```

### Player Stats CSV

**Required Columns**:
- Player Name
- Goals
- Assists
- Appearances

**Optional Columns**:
- Yellow Cards
- Red Cards
- Minutes Played
- Position
- Squad Number

**Example**:
```csv
Player Name,Goals,Assists,Appearances,Yellow Cards,Red Cards,Position,Squad Number
John Smith,12,8,15,2,0,Forward,9
Mike Jones,8,5,14,1,0,Midfielder,10
Sarah Lee,15,10,16,0,0,Forward,7
Tom Brown,0,2,15,4,1,Defender,5
```

## Import Process

### Step 1: Prepare CSV File

1. **Download Template**:
   - Go to: File → Download → Template CSVs
   - Choose fixture, results, or stats template

2. **Fill Data**:
   - Enter historical data following format exactly
   - Dates must be DD/MM/YYYY format
   - Scores must be "X-Y" format (e.g., "3-1")
   - Player names must match roster exactly

3. **Validate**:
   - Check for typos in player names
   - Verify date formats
   - Ensure no missing required fields
   - Remove any empty rows at bottom

### Step 2: Upload to Google Drive

1. Open Google Drive
2. Navigate to: Syston Tigers → Data Imports
3. Upload your CSV file
4. Right-click file → Get link → Copy link
5. Extract file ID from link:
   ```
   https://drive.google.com/file/d/FILE_ID_HERE/view
   ```

### Step 3: Run Import Script

#### Option A: From Apps Script Menu

1. Open Google Sheet
2. Menu: Syston Tools → Import Data → Historical Import
3. Select data type (Fixtures/Results/Stats)
4. Paste file ID when prompted
5. Click "Import"
6. Wait for completion message

#### Option B: From Script Editor

1. Open Apps Script editor (Extensions → Apps Script)
2. Run function: `importHistoricalData()`
3. When prompted:
   - Enter file ID
   - Select data type
   - Confirm import
4. Check logs for progress

### Step 4: Verify Import

1. Check destination sheet for imported data
2. Review Import Log for any errors
3. Spot-check a few rows for accuracy
4. Verify totals match source CSV

## Import Function API

### importHistoricalData()

**Parameters**:
```javascript
{
  fileId: string,           // Google Drive file ID
  dataType: string,         // "fixtures" | "results" | "stats"
  dryRun: boolean,          // If true, validates without importing (default: false)
  skipDuplicates: boolean,  // If true, skips rows that already exist (default: true)
  updateExisting: boolean   // If true, updates existing rows (default: false)
}
```

**Example**:
```javascript
importHistoricalData({
  fileId: '1ABC123xyz...',
  dataType: 'results',
  dryRun: false,
  skipDuplicates: true,
  updateExisting: false
});
```

**Returns**:
```javascript
{
  success: true,
  imported: 45,           // Rows successfully imported
  skipped: 3,             // Duplicates skipped
  errors: [],             // Array of error objects
  duration: 12.5,         // Seconds
  log_url: 'https://...'  // Link to import log
}
```

## Data Validation

### Automatic Validation

The import script validates:
- **Date formats**: Must be DD/MM/YYYY
- **Player names**: Must exist in Roster sheet
- **Scores**: Must be "X-Y" format
- **Venues**: Must be "Home" or "Away"
- **Required fields**: Cannot be empty

### Validation Errors

**Common errors and fixes**:

| Error | Cause | Fix |
|-------|-------|-----|
| Invalid date format | Date not DD/MM/YYYY | Change to DD/MM/YYYY (e.g., 07/09/2024) |
| Player not found | Name misspelled or missing | Add to Roster first or fix spelling |
| Invalid score | Wrong format | Use "X-Y" format (e.g., "3-1") |
| Duplicate row | Already imported | Enable skipDuplicates or delete existing |
| Missing required field | Empty cell in required column | Fill in missing data |

### Dry Run Mode

Test import without actually writing data:

```javascript
importHistoricalData({
  fileId: 'YOUR_FILE_ID',
  dataType: 'results',
  dryRun: true  // Validates only, doesn't import
});
```

Output shows what **would** happen:
```
✓ 42 rows valid
✗ 3 rows have errors:
  - Row 5: Player "Jon Smith" not found (did you mean "John Smith"?)
  - Row 12: Invalid date format "9/7/2024" (use DD/MM/YYYY)
  - Row 18: Missing required field "Competition"
```

## Duplicate Handling

### Skip Duplicates (Default)

Matches existing data by key fields:
- **Fixtures**: Date + Opposition
- **Results**: Date + Opposition
- **Stats**: Player Name + Season

Duplicates are logged but not imported.

### Update Existing

Set `updateExisting: true` to overwrite:

```javascript
importHistoricalData({
  fileId: 'YOUR_FILE_ID',
  dataType: 'results',
  updateExisting: true  // Overwrites existing matches
});
```

**Use when**: Correcting errors in past imports

### Force Import (All Rows)

Set both options to false:

```javascript
importHistoricalData({
  fileId: 'YOUR_FILE_ID',
  dataType: 'results',
  skipDuplicates: false,    // Don't check for duplicates
  updateExisting: false     // Don't update, create new
});
```

**Warning**: May create duplicate records!

## Import Log

Every import creates a log entry:

**Location**: "Import Log" sheet

**Contains**:
- Timestamp
- Data type imported
- Rows processed
- Success/error count
- Errors encountered
- Duration
- File ID used

**Example**:
```
Timestamp: 2025-10-07 14:30:00
Data Type: Results
Rows Processed: 45
Successful: 42
Errors: 3
Duration: 12.5s
File ID: 1ABC123...
Error Details:
  - Row 5: Invalid date format
  - Row 12: Player not found
  - Row 18: Missing competition
```

## Performance

**Import Speed**:
- Small files (<100 rows): ~5-10 seconds
- Medium files (100-500 rows): ~30-60 seconds
- Large files (500-1000 rows): ~2-3 minutes

**Optimization Tips**:
1. Split very large files into chunks
2. Run imports during off-peak hours
3. Use dry run first to catch errors
4. Close other sheets to free memory

## Troubleshooting

### Import Stuck or Slow

**Symptoms**: Import runs for >5 minutes

**Solutions**:
1. Check file size (<1000 rows recommended)
2. Close other browser tabs
3. Run during off-peak times
4. Split into smaller files
5. Check Apps Script quotas

### "File not found" Error

**Symptoms**: ERR_SCRIPT_001

**Solutions**:
1. Verify file ID is correct (no extra characters)
2. Ensure file is in Google Drive (not local computer)
3. Check file permissions (must be accessible by script)
4. Verify file is CSV format (not Excel .xlsx)

### "Player not found" Errors

**Symptoms**: Many rows fail with player name errors

**Solutions**:
1. Check player names match Roster sheet exactly
2. Look for extra spaces or typos
3. Add missing players to Roster first
4. Use dry run to identify all mismatches

### Date Parsing Errors

**Symptoms**: Invalid date format errors

**Solutions**:
1. Use DD/MM/YYYY format (not MM/DD/YYYY or YYYY-MM-DD)
2. Include leading zeros (07/09/2024, not 7/9/2024)
3. Check for text instead of dates
4. Re-format column as Plain Text, then re-enter dates

### Duplicate Detection Not Working

**Symptoms**: Duplicates being imported

**Solutions**:
1. Verify skipDuplicates is true
2. Check key fields match exactly (dates, names)
3. Review duplicate logic in code
4. Manually delete duplicates from sheet first

## API Integration

After import, data syncs to backend:

```javascript
// Import automatically triggers backend sync
importHistoricalData({...}) → Backend API
                            → POST /api/v1/fixtures/bulk
                            → POST /api/v1/results/bulk
                            → POST /api/v1/stats/bulk
```

**Verify sync**:
1. Check backend logs (wrangler tail)
2. Test mobile app to see imported data
3. Query API directly:
   ```bash
   curl https://syston-postbus.YOUR-DOMAIN.workers.dev/api/v1/fixtures?tenant=syston-tigers
   ```

## Best Practices

1. **Always test with dry run first**
   ```javascript
   dryRun: true  // Test before actual import
   ```

2. **Backup before large imports**
   ```bash
   File → Download → CSV (current sheet)
   ```

3. **Import in order**:
   - First: Fixtures (establishes matches)
   - Second: Results (adds scores to matches)
   - Third: Player stats (links to matches)

4. **Verify incrementally**:
   - Import small batch (10-20 rows)
   - Verify success
   - Import next batch
   - Repeat

5. **Keep source CSVs**:
   - Store in Google Drive folder
   - Name with date: `results_2024_season.csv`
   - Document any manual corrections

6. **Monitor quotas**:
   - Apps Script: 6 min/execution max
   - Drive: 750 calls/hour
   - UrlFetch: 20,000 calls/day

## Advanced Usage

### Batch Import Multiple Files

```javascript
// Import full season at once
const files = [
  { fileId: 'FILE1', dataType: 'fixtures' },
  { fileId: 'FILE2', dataType: 'results' },
  { fileId: 'FILE3', dataType: 'stats' }
];

files.forEach(file => {
  importHistoricalData({
    fileId: file.fileId,
    dataType: file.dataType,
    dryRun: false,
    skipDuplicates: true
  });

  Utilities.sleep(5000);  // Wait 5s between imports
});
```

### Custom Validation Rules

Extend validation in `historical-import.gs`:

```javascript
function validateCustom(row, dataType) {
  // Add custom validation logic
  if (dataType === 'results' && row.Score === '0-0') {
    // Flag all draws for review
    return { valid: false, error: 'Draw - verify correct' };
  }
  return { valid: true };
}
```

### Import from External API

Fetch data from external source:

```javascript
function importFromAPI() {
  const response = UrlFetchApp.fetch('https://external-api.com/matches');
  const data = JSON.parse(response.getContentText());

  // Convert to CSV format
  const csv = convertToCsv(data);

  // Import
  importHistoricalData({
    fileId: csv.fileId,
    dataType: 'fixtures'
  });
}
```

## Support

**Issues**:
- Check Import Log for error details
- Review ERROR_CODES.md for error explanations
- Check Apps Script execution logs

**Help**:
- Community Forum: https://community.systonapp.com
- GitHub Issues: https://github.com/SystonTigers/app/issues
- Email: support@systonapp.com
