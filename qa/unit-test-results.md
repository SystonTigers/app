# Unit Test Results

- **Run date:** Sun Oct 5 01:45:40 UTC 2025 (UTC)
- **Execution method:** Node VM harness evaluating Apps Script sources and unit suites (`runHistoricalImportUnitTests`, `runVideoClipsUnitTests`).

## Historical Import Suite

```
{
  "name": "Historical Import CSV Processing",
  "tests": [
    {
      "name": "parses varied CSV rows and generates events",
      "status": "PASS",
      "details": "Parsed 2 records, generated 5 events"
    },
    {
      "name": "detects duplicate matches by match key hash",
      "status": "PASS",
      "details": "Duplicate rows detected: 1"
    },
    {
      "name": "produces stable match hash keys",
      "status": "PASS",
      "details": "Normalized match key: 2024-08-20#our club#rivals fc"
    }
  ],
  "passed": 3,
  "failed": 0,
  "total": 3,
  "status": "PASS"
}
```

## Video Clips Suite

```
{
  "name": "Video Clips Automation",
  "tests": [
    {
      "name": "creates goal clip metadata with buffers applied",
      "status": "PASS",
      "details": "Clip clip_1 saved with duration 40s"
    },
    {
      "name": "ensures player folders resolve with Drive context",
      "status": "PASS",
      "details": "Folder path resolved as Video Root/AlexMorgan"
    },
    {
      "name": "builds YouTube payload from stored metadata",
      "status": "PASS",
      "details": "YouTube payload ready with title \"Alex Morgan Goal vs Rivals\""
    }
  ],
  "passed": 3,
  "failed": 0,
  "total": 3,
  "status": "PASS"
}
```

- **Follow-up actions:** None required. All targeted suites passed successfully.
