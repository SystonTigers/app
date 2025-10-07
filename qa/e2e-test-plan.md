# End-to-End Test Plan

Comprehensive verification flow ensuring the Cloudflare Worker, Apps Script automation, and Make.com integrations operate as a cohesive system.

## Scope

| Component | Covered Scenarios |
| --- | --- |
| Cloudflare Worker | Authenticated post submission, idempotency replay, fallback routing. |
| Apps Script | Config validation, highlight export, historical import, trigger health. |
| Make.com | Clip rendering, webhook acknowledgements, error escalation. |

## Entry Criteria

1. `validateEnvironment()` reports `ok: true`.
2. Latest CI run (`Push to Apps Script`) succeeded on main.
3. Worker unit tests (`npm test`) are green.

## Scenarios

### 1. Authenticated Match Event Flow

- **Objective:** Ensure a staged goal event routes through Worker → queue → Make fallback without duplication.
- **Steps:**
  1. Create dummy goal in staging sheet (tenant `TEST123`).
  2. Invoke `sendToMake` via Apps Script custom menu.
  3. Replay the same event within 60 seconds.
- **Expected:**
  - Worker responds `202` with stable `idempotencyKey`.
  - Queue job id logged; Make fallback triggered on first attempt.
  - Replay reuses existing job id; no duplicate sheet writes.
- **Evidence:** `qa/evidence/2025-10-05-make-fallback.log`.

### 2. System Health Validation

- **Objective:** Confirm configuration integrity before running other scenarios.
- **Steps:**
  1. Execute `validateEnvironment()` from Apps Script console.
  2. Review JSON output for check statuses.
- **Expected:**
  - All checks `PASS`.
  - No warnings returned.
- **Evidence:** `qa/evidence/2025-10-05-validate-environment.json`.

### 3. Worker Health Endpoint

- **Objective:** Verify Worker deployment exposes `/healthz` with queue telemetry.
- **Steps:**
  1. `curl https://worker.example.com/healthz` with valid JWT.
- **Expected:**
  - `200 OK`, payload includes `success: true` and queue depth metric.
- **Evidence:** `qa/evidence/2025-10-05-healthz.log`.

### 4. Highlights Generation Loop

- **Objective:** Ensure highlight exports and bot trigger orchestrate correctly.
- **Steps:**
  1. Run `exportEventsForHighlights('TEST123')`.
  2. Trigger `triggerHighlightsBot('TEST123', '<mock-url>')`.
- **Expected:**
  - JSON export saved to Drive with tenant + match id naming.
  - Make webhook returns `200` and job id stored in sheet.
- **Evidence:** Link to Make webhook log (captured in `qa/e2e-results-2025-10-05.md`).

### 5. Historical Import Regression

- **Objective:** Validate importer handles new data and skips duplicates gracefully.
- **Steps:**
  1. Upload CSV with 14 rows (12 new, 2 duplicates) to `Historical Uploads/TEST123/pending/`.
  2. Call `processHistoricalImport(fileId)`.
- **Expected:**
  - 12 rows appended in one batch.
  - Duplicate rows logged as warnings only.
  - Aggregates refreshed.
- **Evidence:** `qa/evidence/2025-10-05-historical-import.log`.

## Exit Criteria

- All scenarios above marked PASS with attached evidence.
- `QA_CERTIFICATION.md` updated with sign-off and references to the latest results file.
- Outstanding issues captured as Jira tickets with owners.

---

_Last updated: 2025-10-05_
