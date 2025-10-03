# Codex/Claude – Step-by-Step Test Script

## Admin JWT (already set via secret)

## 1) Create Tenant
```powershell
$ADMIN=$env:ADMIN_JWT
$BASE="https://syston-postbus.team-platform-2025.workers.dev"

'{"id":"club-xyz"}' | curl.exe -s -X POST -H "authorization: Bearer "+$ADMIN -H "content-type: application/json" --data-binary "@-" "$BASE/api/v1/admin/tenant/create"
```

## 2) Invite Link
```powershell
'{"tenant":"club-xyz","ttl_minutes":60}' | curl.exe -s -X POST -H "authorization: Bearer "+$ADMIN -H "content-type: application/json" --data-binary "@-" "$BASE/api/v1/admin/tenant/invite"
```

Open the `setup_url` in a browser.

## 3) Tenant Self-Serve via token
```powershell
$TENANT_JWT="eyJ..." # from setup link if you want to use curl instead of the page

curl.exe -s -H "authorization: Bearer $TENANT_JWT" "$BASE/api/v1/tenant/self"

'{"make_webhook_url":"https://hook.make.com/XXXX"}' | curl.exe -s -X POST -H "authorization: Bearer $TENANT_JWT" -H "content-type: application/json" --data-binary "@-" "$BASE/api/v1/tenant/self/webhook"

'{"use_make":true,"direct_yt":false}' | curl.exe -s -X POST -H "authorization: Bearer $TENANT_JWT" -H "content-type: application/json" --data-binary "@-" "$BASE/api/v1/tenant/self/flags"

curl.exe -s -X POST -H "authorization: Bearer $TENANT_JWT" "$BASE/api/v1/tenant/self/test-webhook"
```

## 4) Enqueue Job (should hit Make webhook now)
```powershell
$job='{"tenant":"club-xyz","template":"smoke","channels":["yt"],"data":{"msg":"hello"}}'
$job | curl.exe -i -X POST -H "authorization: Bearer "+$ADMIN -H "content-type: application/json" -H "Idempotency-Key: demo-$(Get-Random)" --data-binary "@-" "$BASE/api/v1/post"
```

## 5) Flip to Managed
Use Admin Console or:
```powershell
'{"tenant":"club-xyz","flags":{"use_make":false,"direct_yt":true}}' | curl.exe -s -X POST -H "authorization: Bearer "+$ADMIN -H "content-type: application/json" --data-binary "@-" "$BASE/api/v1/admin/tenant/flags"
```

Queue another job → should go direct.

## Admin JWT Smoke Test

```powershell
cd "$HOME\OneDrive\Desktop\SystonApp\backend"
# Print a token
.\scripts\print-admin-jwt.ps1 -JwtSecret "<YOUR_JWT_SECRET>"
$env:ADMIN_JWT="PASTE_TOKEN"

# Album create (should return 200/201)
$BASE="https://syston-postbus.team-platform-2025.workers.dev"
$HDR="authorization: Bearer $env:ADMIN_JWT"
'{"tenant":"test-tenant","title":"U13 v Rivals","teamId":"u13"}' |
  curl.exe -i -X POST "$BASE/api/v1/admin/gallery/albums" -H $HDR -H "content-type: application/json" --data-binary "@-"
```

## Extended Smoke Tests

### Setup Variables
```powershell
$env:ADMIN_JWT="eyJ..."  # Your admin JWT
$BASE="https://syston-postbus.team-platform-2025.workers.dev"
$TENANT="test-tenant"
```

### Test 1: Whoami (Admin)
```powershell
curl.exe -s -H "authorization: Bearer $env:ADMIN_JWT" "$BASE/api/v1/admin/whoami"
# Expected: {"success":true,"data":{"userId":"admin","roles":["admin"],...}}
```

### Test 2: Set Flags
```powershell
'{"tenant":"'+$TENANT+'","flags":{"use_make":false,"direct_yt":true}}' |
  curl.exe -s -X POST "$BASE/api/v1/admin/tenant/flags" `
  -H "authorization: Bearer $env:ADMIN_JWT" `
  -H "content-type: application/json" `
  --data-binary "@-"
# Expected: {"success":true,"data":{...}}
```

### Test 3: Set Webhook (EU2 Make Host)
```powershell
'{"tenant":"'+$TENANT+'","make_webhook_url":"https://hook.eu2.make.com/test123"}' |
  curl.exe -s -X POST "$BASE/api/v1/admin/tenant/webhook" `
  -H "authorization: Bearer $env:ADMIN_JWT" `
  -H "content-type: application/json" `
  --data-binary "@-"
# Expected: {"success":true,"data":{...}}
```

### Test 4: Create Album
```powershell
'{"tenant":"'+$TENANT+'","title":"Training Day Photos","teamId":"u13"}' |
  curl.exe -s -X POST "$BASE/api/v1/admin/gallery/albums" `
  -H "authorization: Bearer $env:ADMIN_JWT" `
  -H "content-type: application/json" `
  --data-binary "@-"
# Expected: {"ok":true,"album":{...}}
```

### Test 5: List Albums
```powershell
curl.exe -s -H "authorization: Bearer $env:ADMIN_JWT" `
  "$BASE/api/v1/gallery/albums?tenant=$TENANT"
# Expected: {"ok":true,"albums":[...]}
```

### Test 6: Create Event
```powershell
$eventData='{"tenant":"'+$TENANT+'","id":"evt_'+$(Get-Random)+'","type":"training","title":"U13 Training Session","startUtc":"2025-10-15T18:00:00Z"}'
$eventData | curl.exe -s -X POST "$BASE/api/v1/admin/events" `
  -H "authorization: Bearer $env:ADMIN_JWT" `
  -H "content-type: application/json" `
  --data-binary "@-"
# Expected: {"success":true,"data":{...}}
```

### Test 7: Create MOTM Voting
```powershell
$matchId="match_"+$(Get-Random)
$candidates='[{"id":"p1","name":"John Doe"},{"id":"p2","name":"Jane Smith"}]'
'{"tenant":"'+$TENANT+'","candidates":'+$candidates+',"maxVotesPerUser":1}' |
  curl.exe -s -X POST "$BASE/api/v1/admin/matches/$matchId/motm/open" `
  -H "authorization: Bearer $env:ADMIN_JWT" `
  -H "content-type: application/json" `
  --data-binary "@-"
# Expected: {"ok":true}
```

### Test 8: Get MOTM Tally
```powershell
curl.exe -s -H "authorization: Bearer $env:ADMIN_JWT" `
  "$BASE/api/v1/admin/matches/$matchId/motm/tally?tenant=$TENANT"
# Expected: {"ok":true,"candidates":[...],"totalVotes":0}
```

### Test 9: Export Tenant Config
```powershell
curl.exe -s -H "authorization: Bearer $env:ADMIN_JWT" `
  "$BASE/api/v1/admin/export/tenant/$TENANT"
# Expected: {"success":true,"data":{"id":"test-tenant","flags":{...}}}
```

### Test 10: Export Chat Index
```powershell
curl.exe -s -H "authorization: Bearer $env:ADMIN_JWT" `
  "$BASE/api/v1/admin/export/tenant/$TENANT/chat-index"
# Expected: {"success":true,"data":{"tenant":"test-tenant","rooms":[...]}}
```

### Test 11: Export Gallery Index
```powershell
curl.exe -s -H "authorization: Bearer $env:ADMIN_JWT" `
  "$BASE/api/v1/admin/export/tenant/$TENANT/gallery-index"
# Expected: {"success":true,"data":{"tenant":"test-tenant","albums":[...]}}
```

### Test 12: Health Check
```powershell
curl.exe -s "$BASE/healthz"
# Expected: {"ok":true,"ts":1728...}
```

## Negative Tests

### Test CORS (should reject unknown origin)
```powershell
curl.exe -s -H "Origin: https://evil.com" "$BASE/healthz" -i
# Expected: Access-Control-Allow-Origin should NOT be https://evil.com
```

### Test Invalid Webhook Host
```powershell
'{"tenant":"'+$TENANT+'","make_webhook_url":"https://evil.com/webhook"}' |
  curl.exe -s -X POST "$BASE/api/v1/admin/tenant/webhook" `
  -H "authorization: Bearer $env:ADMIN_JWT" `
  -H "content-type: application/json" `
  --data-binary "@-"
# Expected: {"success":false,"error":{"code":"VALIDATION","message":"Host evil.com not allowed"}}
```

### Test Unauthorized Access
```powershell
curl.exe -s "$BASE/api/v1/admin/whoami"
# Expected: {"success":false,"error":{"code":"UNAUTHORIZED"}} or 401
```

## Notes

- Replace `$TENANT` with your actual tenant ID
- Replace `$matchId` with actual match IDs from your tests
- All admin endpoints require `Authorization: Bearer <ADMIN_JWT>`
- Use `Get-Random` to generate unique IDs for events/matches
- Check response status codes: 200/201 = success, 400 = validation error, 401 = unauthorized, 403 = forbidden, 429 = rate limited
