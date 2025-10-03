# Acceptance Checklist - Post-Deploy Verification

Run these checks after deploying to verify all hardening changes are working correctly.

## Environment
- Backend: https://syston-postbus.team-platform-2025.workers.dev
- Admin: https://admin-console.team-platform-2025.workers.dev
- Fixtures: https://syston-fixtures.team-platform-2025.workers.dev
- Setup: https://setup-console.team-platform-2025.workers.dev

## 1. Admin Diagnostics (Hidden by Default)

### Test: Default behavior
- [ ] Open admin console homepage (https://admin-console.team-platform-2025.workers.dev)
- [ ] Verify NO diagnostics link is shown (because SHOW_DIAG=false)
- [ ] Try accessing /diag?diag=1 directly
- [ ] Expected: "Diagnostics disabled" message

### Test: With SHOW_DIAG enabled
- [ ] Set SHOW_DIAG=true in admin/wrangler.toml temporarily
- [ ] Deploy: `cd admin && wrangler deploy`
- [ ] Visit /?diag=1
- [ ] Expected: Diagnostics page loads with test results
- [ ] Revert SHOW_DIAG=false and redeploy

**Status:** ✅ Pass / ❌ Fail

---

## 2. CORS Tightening

### Test: Allowed origin
```powershell
curl.exe -s -H "Origin: http://localhost:5173" -i https://syston-postbus.team-platform-2025.workers.dev/healthz
```
- [ ] Response includes `Access-Control-Allow-Origin: http://localhost:5173`

### Test: Disallowed origin
```powershell
curl.exe -s -H "Origin: https://evil.com" -i https://syston-postbus.team-platform-2025.workers.dev/healthz
```
- [ ] Response does NOT include `Access-Control-Allow-Origin: https://evil.com`
- [ ] Expected: Either `*` or different allowed origin

**Status:** ✅ Pass / ❌ Fail

---

## 3. Webhook Allowlist

### Test: Allowed Make host (EU2)
```powershell
$env:ADMIN_JWT="<your_jwt>"
'{"tenant":"test-tenant","make_webhook_url":"https://hook.eu2.make.com/test123"}' |
  curl.exe -s -X POST https://syston-postbus.team-platform-2025.workers.dev/api/v1/admin/tenant/webhook `
  -H "authorization: Bearer $env:ADMIN_JWT" `
  -H "content-type: application/json" `
  --data-binary "@-"
```
- [ ] Expected: `{"success":true,"data":{...}}`

### Test: Disallowed host
```powershell
'{"tenant":"test-tenant","make_webhook_url":"https://evil.com/webhook"}' |
  curl.exe -s -X POST https://syston-postbus.team-platform-2025.workers.dev/api/v1/admin/tenant/webhook `
  -H "authorization: Bearer $env:ADMIN_JWT" `
  -H "content-type: application/json" `
  --data-binary "@-"
```
- [ ] Expected: `{"success":false,"error":{"code":"VALIDATION","message":"Host evil.com not allowed"}}`

**Status:** ✅ Pass / ❌ Fail

---

## 4. Export Endpoints

### Test: Export tenant config
```powershell
curl.exe -s -H "authorization: Bearer $env:ADMIN_JWT" `
  https://syston-postbus.team-platform-2025.workers.dev/api/v1/admin/export/tenant/test-tenant
```
- [ ] Expected: `{"success":true,"data":{"id":"test-tenant","flags":{...}}}`

### Test: Export chat index
```powershell
curl.exe -s -H "authorization: Bearer $env:ADMIN_JWT" `
  https://syston-postbus.team-platform-2025.workers.dev/api/v1/admin/export/tenant/test-tenant/chat-index
```
- [ ] Expected: `{"success":true,"data":{"tenant":"test-tenant","rooms":[...]}}`

### Test: Export gallery index
```powershell
curl.exe -s -H "authorization: Bearer $env:ADMIN_JWT" `
  https://syston-postbus.team-platform-2025.workers.dev/api/v1/admin/export/tenant/test-tenant/gallery-index
```
- [ ] Expected: `{"success":true,"data":{"tenant":"test-tenant","albums":[...]}}`

**Status:** ✅ Pass / ❌ Fail

---

## 5. DLQ Alert Stub

### Test: Queue failure triggers DLQ (optional - requires queue failure)
- [ ] DLQ_ALERT_URL is optional, not set by default
- [ ] If set, should POST to webhook on DLQ send
- [ ] Worker should not crash if DLQ_ALERT_URL fails

**Status:** ⚠️ Manual verification needed / ✅ Pass / ❌ Fail

---

## 6. Onboarding Documentation

### Test: Files exist
- [ ] `docs/ONBOARDING_TENANT.md` exists and contains setup guide
- [ ] `docs/EMAIL_TEMPLATES/tenant_setup.md` exists with email template
- [ ] Both files have placeholder references (e.g., `{club_name}`, `{setup_link}`)

**Status:** ✅ Pass / ❌ Fail

---

## 7. Rate Limit Configuration

### Test: Config present
- [ ] `backend/wrangler.toml` has `RL_POSTS_PER_MIN = "60"`
- [ ] `backend/wrangler.toml` has `RL_UPLOADS_PER_MIN = "20"`
- [ ] `DEPLOYMENT_GUIDE.md` has section 3.6 documenting rate limits

**Status:** ✅ Pass / ❌ Fail

---

## 8. Stripe Secrets Guard

### Test: Stripe not configured
```powershell
'{"type":"test","data":{}}' |
  curl.exe -s -X POST https://syston-postbus.team-platform-2025.workers.dev/api/v1/stripe/webhook `
  -H "content-type: application/json" `
  --data-binary "@-"
```
- [ ] Expected: `{"success":false,"error":{"code":"STRIPE_DISABLED","message":"Stripe not configured"}}` (503)

**Status:** ✅ Pass / ❌ Fail

---

## 9. Existing Admin Forms Still Work

### Test: Create tenant
- [ ] Open admin console
- [ ] Use "Create Tenant" form
- [ ] Expected: Success response

### Test: Set flags
- [ ] Use "Set Flags" form (Managed or BYO-Make)
- [ ] Expected: Success response

### Test: Set webhook
- [ ] Use "Set Make Webhook" form with valid Make URL
- [ ] Expected: Success response

### Test: Generate invite
- [ ] Use "Generate Tenant Setup Link" form
- [ ] Expected: Returns valid setup URL

### Test: Create album
- [ ] Use "Gallery: Create Album" form
- [ ] Expected: Returns album data

### Test: MOTM voting
- [ ] Use "MOTM: Open Voting" form
- [ ] Expected: Voting opens successfully

### Test: Create event
- [ ] Use "Create Event" form
- [ ] Expected: Event created

**Status:** ✅ Pass / ❌ Fail

---

## 10. R2 Lifecycle Documentation

### Test: Documentation present
- [ ] `DEPLOYMENT_GUIDE.md` has section 3.5 with R2 lifecycle examples
- [ ] Section includes `wrangler r2 bucket lifecycle` commands

**Status:** ✅ Pass / ❌ Fail

---

## Summary

Total Tests: 10
Passed: ___
Failed: ___
Manual: ___

## Sign-off

- [ ] All critical tests passed
- [ ] Known issues documented (if any)
- [ ] Ready for production

**Tested by:** _________________
**Date:** _________________
**Notes:**

