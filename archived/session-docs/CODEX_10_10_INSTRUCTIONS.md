# Codex: 10/10 Production-Ready Instructions

## Current Status: 8.5/10
You've made excellent progress. These instructions will take the system from good to **production-perfect**.

---

## CRITICAL: Functional Verification Required

### Phase 1: PROVE Everything Works (Priority: URGENT)

**1.1 Execute All QA Tests & Document Real Results**
- [ ] Run `qa/qa.selftest.gs` → `runMakeIntegrationSelfTests()` in Apps Script console
  - Capture actual execution logs (not theoretical)
  - Document hook invocation counts
  - Screenshot or paste full output into `qa/selftest-results-YYYY-MM-DD.md`

- [ ] Execute `qa/curl-cors.sh` against real staging/dev backend
  - Provide REAL values for: `API_BASE_URL`, `AUTOMATION_JWT`, `ADMIN_JWT`, `GITHUB_PAGES_ORIGIN`, `APPS_SCRIPT_ORIGIN`
  - Capture full output with actual HTTP response codes
  - Document in `qa/cors-test-results-YYYY-MM-DD.md`

- [ ] Run historical CSV import with REAL data
  - Use actual CSV file (not just sample)
  - Document: rows processed, duplicates skipped, errors encountered
  - Verify data actually appears in target sheets
  - Capture before/after row counts
  - Document in `qa/historical-import-results-YYYY-MM-DD.md`

- [ ] Test highlights export end-to-end
  - Call `exportEventsForHighlights('REAL_TENANT_ID')` with actual match data
  - Verify JSON file created in Drive with correct structure
  - Call `triggerHighlightsBot()` with real webhook URL
  - Confirm webhook receives and processes data
  - Document in `qa/highlights-test-results-YYYY-MM-DD.md`

- [ ] Edge case tests execution
  - Run `testDuplicateEditPrevention()` from `src/edge-case-tests.gs`
  - Run all test functions in that file
  - Capture pass/fail for each test
  - Document in `qa/edge-case-results-YYYY-MM-DD.md`

**Success Criteria**: Every test must have REAL execution evidence with timestamps, actual values, and screenshots where applicable.

---

### Phase 2: Fix Code Quality Issues

**2.1 Refactor Large Files (video-clips.gs is 47KB)**
- [ ] Split `src/video-clips.gs` into logical modules:
  - `src/video/clips-manager.gs` - Core VideoClipsManager class
  - `src/video/youtube-integration.gs` - YouTube upload automation
  - `src/video/drive-organization.gs` - Folder/file management
  - `src/video/graphics-generator.gs` - Overlays & banners
  - `src/video/processing-queue.gs` - FFmpeg/CloudConvert integration

- [ ] Ensure proper dependency injection (no circular dependencies)
- [ ] Add module-level JSDoc with @fileoverview for each new file
- [ ] Update `appsscript.json` if file order matters

**2.2 Eliminate Code Duplication**
- [ ] Search for duplicate utility functions across all `.gs` files
- [ ] Move shared utilities to appropriate existing files:
  - CSV parsing → `utils.gs` or new `src/util_csv.gs`
  - Drive operations → centralize in one place
  - HTTP request helpers → `util_request.gs`
- [ ] Document consolidated functions with examples

**2.3 Add Missing Unit Tests**
- [ ] Create `test/historical-import.test.gs` with:
  - CSV parsing edge cases (malformed data, missing columns, encoding issues)
  - Duplicate detection validation
  - Hash generation consistency
- [ ] Create `test/video-clips.test.gs` with:
  - Clip metadata generation
  - Drive folder creation (mock DriveApp)
  - YouTube API payload validation
- [ ] Run tests and capture results in `qa/unit-test-results.md`

---

### Phase 3: Complete Unfinished Features

**3.1 Address Feature Matrix Gaps**

Review `qa/feature_matrix.md` and fix all ❌ and ⚠️ items:

**Priority 1 (Security/Correctness):**
- [ ] **Cards/sin-bin icons** - Add icon metadata to payload builder
  - Update `processCardEvent` to include `icon_url` field
  - Document icon mapping (yellow card → ⚠️, red card → 🟥, etc.)
  - Test with real card event

**Priority 2 (Automation Gaps):**
- [ ] **Birthday automation** - Currently missing from schedulers
  - Create `src/birthdays-manager.gs` or add to `weekly-scheduler.gs`
  - Implement player birthday tracking from squad sheet
  - Add scheduled trigger (daily check at 6 AM)
  - Create payload format for birthday posts
  - Test with mock birthday data

- [ ] **Quotes character limit guard** - No validation currently
  - Add `validateQuoteLength(text, maxChars)` function
  - Implement in quote rotation logic
  - Truncate + add "..." if over limit
  - Add config for `MAX_QUOTE_CHARS` (e.g., 280 for Twitter-style)

**Priority 3 (If Time Permits):**
- [ ] **Homepage widget** - Document why it's deferred or implement basic version
- [ ] **Sponsor overlays** - Create specification document if not implementing
- [ ] **Monthly montage** - Link to external tool or create automation plan

**3.2 Complete FA League Table Automation** (Currently ❌)
- [ ] Wire up automation from Raw → Sorted → Canva Map → `table.html`
- [ ] Create `src/fa-league-table-generator.gs` or enhance existing FA snippet
- [ ] Add scheduled trigger (runs after FA snippet completes)
- [ ] Verify `table.html` generation with real data
- [ ] Test full pipeline end-to-end

---

### Phase 4: Production Deployment Readiness

**4.1 Environment Configuration Validation**
- [ ] Create `ENVIRONMENT_SETUP.md` with:
  - All required Script Properties (with examples, no real secrets)
  - All required environment variables for Workers
  - OAuth scopes needed
  - API keys required (YouTube, Make, Drive, etc.)
  - Step-by-step setup checklist

- [ ] Create validation script `src/validate-environment.gs`:
  ```javascript
  function validateEnvironment() {
    const required = [
      'BACKEND_URL',
      'MAKE_WEBHOOK_URL',
      'TENANT_ID',
      'WEBAPP_DEPLOYMENT_ID',
      // ... all required props
    ];
    const missing = [];
    required.forEach(key => {
      if (!PropertiesService.getScriptProperties().getProperty(key)) {
        missing.push(key);
      }
    });
    if (missing.length > 0) {
      throw new Error(`Missing required properties: ${missing.join(', ')}`);
    }
    return { valid: true, message: 'All required properties configured' };
  }
  ```
- [ ] Run `validateEnvironment()` and document results

**4.2 Error Handling & Logging Audit**
- [ ] Review all `try/catch` blocks - ensure they log meaningful errors
- [ ] Add error context (tenant, timestamp, user, operation)
- [ ] Ensure no swallowed errors (empty catch blocks)
- [ ] Add structured error codes for common failures:
  ```javascript
  const ErrorCodes = {
    BACKEND_UNREACHABLE: 'ERR_BACKEND_001',
    INVALID_CSV: 'ERR_IMPORT_001',
    DRIVE_QUOTA: 'ERR_DRIVE_001'
    // ...
  };
  ```
- [ ] Document error codes in `docs/ERROR_CODES.md`

**4.3 Performance & Rate Limiting**
- [ ] Add rate limit handling to all external API calls:
  - YouTube API (quota limits)
  - Make.com webhooks
  - Backend endpoints
- [ ] Implement exponential backoff where missing
- [ ] Add configurable timeouts for long-running operations
- [ ] Document performance benchmarks in `docs/PERFORMANCE.md`:
  - Historical import: X rows/minute
  - Highlights export: Y seconds per match
  - Video processing: Z clips/hour

**4.4 Security Hardening**
- [ ] Audit all user inputs for validation:
  - CSV file uploads → validate file type, size, structure
  - Manual form inputs → sanitize before processing
  - Webhook payloads → verify signatures/tokens
- [ ] Review all OAuth scopes - ensure minimum required
- [ ] Ensure sensitive data (JWTs, API keys) never logged
- [ ] Add security section to `qa/verify.md`

---

### Phase 5: Documentation Polish

**5.1 Create Missing Docs**
- [ ] `docs/ARCHITECTURE.md` - System diagram showing:
  - Apps Script → Backend → Make.com flow
  - Sheet structure and data flow
  - Trigger schedule overview
  - External dependencies (YouTube, Drive, FFmpeg)

- [ ] `docs/VIDEO_SYSTEM.md` - Complete video workflow:
  - How clips are created from goals
  - Drive folder structure
  - YouTube upload process
  - Graphics generation
  - CloudConvert/FFmpeg integration details

- [ ] `docs/HISTORICAL_IMPORT.md` - Import guide:
  - CSV format specification (with schema)
  - Column mapping
  - Duplicate detection algorithm
  - Troubleshooting common import errors

- [ ] `docs/RUNBOOK.md` - Operations guide:
  - How to investigate failed jobs
  - How to manually retry operations
  - How to check system health
  - Common maintenance tasks

**5.2 Update Existing Docs**
- [ ] Update `README.md` with links to all new docs
- [ ] Update `CONTRIBUTING.md` with new module structure
- [ ] Update `qa/verify.md` with actual test results (replace theory)

**5.3 Code Documentation**
- [ ] Ensure every exported function has JSDoc with:
  - `@param` for all parameters (with types)
  - `@returns` description
  - `@throws` for error cases
  - `@example` for complex functions
- [ ] Add inline comments for non-obvious business logic
- [ ] Document all `@testHook` invocations with purpose

---

### Phase 6: Final Validation

**6.1 End-to-End Integration Test**
- [ ] Create `qa/e2e-test-plan.md` with step-by-step manual test:
  1. Submit a goal through UI → verify Make.com receives it
  2. Import historical CSV → verify data in sheets
  3. Export highlights → verify JSON created + bot triggered
  4. Run scheduled trigger → verify posts created
  5. Generate video clip → verify Drive folder structure
- [ ] Execute EVERY step with REAL data (not mocks)
- [ ] Document actual results with screenshots in `qa/e2e-results-YYYY-MM-DD.md`

**6.2 Code Quality Checks**
- [ ] Run ESLint if configured: `npm run lint` (fix all errors)
- [ ] Check for TypeScript errors if using: `npm run type-check`
- [ ] Search for TODOs/FIXMEs - resolve or document as known issues
- [ ] Remove commented-out code blocks (unless marked as examples)
- [ ] Ensure consistent code formatting

**6.3 Deployment Dry Run**
- [ ] Test GitHub Actions CI workflow in feature branch
- [ ] Verify deployment to `WEBAPP_DEPLOYMENT_ID` succeeds
- [ ] Check deployed version with `SA_Version()` probe
- [ ] Rollback test - can you revert to previous version?
- [ ] Document deployment steps in `docs/DEPLOYMENT.md`

---

## Definition of 10/10 Complete

✅ **All tests executed with REAL data** - No theoretical/mock results
✅ **All ❌ features resolved** - Implemented or documented why deferred
✅ **All ⚠️ features completed** - No partial implementations
✅ **Zero code duplication** - Shared logic consolidated
✅ **File sizes < 15KB** - Large files split into modules
✅ **100% JSDoc coverage** - All public functions documented
✅ **Environment validation passes** - All configs validated programmatically
✅ **Error codes documented** - Comprehensive error reference
✅ **E2E test passes** - Full workflow tested with production-like data
✅ **Security audit complete** - All inputs validated, secrets protected
✅ **Performance benchmarks documented** - Know your system limits
✅ **Runbook created** - Team can operate system without you

---

## Output Format

For each phase, create a summary document:
- **What was tested/built** (specific function names, file paths)
- **Actual results** (with evidence: logs, screenshots, row counts)
- **Issues found** (if any) and how they were resolved
- **Verification steps for reviewer** (how user can confirm it works)

Create a final `QA_CERTIFICATION.md` that declares:
```
# QA Certification - [DATE]

## Certification Statement
I, Codex, certify that all functionality described in this repository has been:
1. Implemented according to specifications
2. Tested with real data and real API endpoints
3. Documented with examples and troubleshooting guides
4. Verified to work end-to-end in a staging environment

## Evidence
- [Link to test result files]
- [Link to execution logs]
- [Link to deployment verification]

## Known Limitations
[List any features intentionally deferred with justification]

## Sign-off
Codex Agent - [Timestamp]
```

---

## Priority Order

Execute in this order:
1. **Phase 1** (Prove it works) - MANDATORY FIRST
2. **Phase 2** (Code quality) - Before adding new features
3. **Phase 3** (Complete features) - Fill functional gaps
4. **Phase 4** (Production ready) - Hardening
5. **Phase 5** (Documentation) - While everything is fresh
6. **Phase 6** (Final validation) - Last step before sign-off

---

## Success Metric

When the user can:
1. Clone the repo fresh
2. Follow `ENVIRONMENT_SETUP.md`
3. Run `validateEnvironment()`
4. Execute the E2E test plan
5. See the system work end-to-end with ZERO developer intervention

Then you have achieved **10/10 functional perfection**.

---

**START WITH PHASE 1 - PROVE EVERYTHING WORKS WITH REAL DATA**
