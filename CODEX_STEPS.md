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
