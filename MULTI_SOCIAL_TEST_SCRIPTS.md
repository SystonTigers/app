# Multi-Social Publishing - Test Scripts

Complete PowerShell test commands for the new multi-social publishing features.

---

## Prerequisites

```powershell
$env:ADMIN_JWT = "your-admin-jwt"
$ADMIN = $env:ADMIN_JWT
$BASE = "https://syston-postbus.team-platform-2025.workers.dev"
```

---

## Test 1: Set Per-Channel Managed Flags

Enable Instagram managed mode, disable others:

```powershell
$flags = '{"tenant":"test-tenant","managed":{"yt":false,"ig":true,"fb":false,"tiktok":false,"x":false}}'
$flags | curl.exe -i -X POST "$BASE/api/v1/admin/tenant/channel/flags" -H "authorization: Bearer $ADMIN" -H "content-type: application/json" --data-binary "@-"
```

Expected:
```json
{
  "success": true,
  "data": {
    "tenant": "test-tenant",
    "flags": {
      "use_make": false,
      "direct_yt": true,
      "managed": { "yt": false, "ig": true, "fb": false, "tiktok": false, "x": false }
    }
  }
}
```

---

## Test 2: Set BYO-Make Webhook for Instagram

```powershell
$byo = '{"tenant":"test-tenant","channel":"ig","url":"https://hook.make.com/INSTAGRAM_WEBHOOK_ID"}'
$byo | curl.exe -i -X POST "$BASE/api/v1/admin/tenant/channel/webhook" -H "authorization: Bearer $ADMIN" -H "content-type: application/json" --data-binary "@-"
```

Expected:
```json
{
  "success": true,
  "data": {
    "tenant": "test-tenant",
    "channel": "ig",
    "webhook": "https://hook.make.com/INSTAGRAM_WEBHOOK_ID"
  }
}
```

---

## Test 3: Set BYO-Make Webhook for TikTok

```powershell
$byo = '{"tenant":"test-tenant","channel":"tiktok","url":"https://hook.make.com/TIKTOK_WEBHOOK_ID"}'
$byo | curl.exe -i -X POST "$BASE/api/v1/admin/tenant/channel/webhook" -H "authorization: Bearer $ADMIN" -H "content-type: application/json" --data-binary "@-"
```

---

## Test 4: Set BYO-Google (YouTube OAuth App)

Set tenant's own YouTube OAuth credentials:

```powershell
$byog = '{"tenant":"test-tenant","client_id":"123456.apps.googleusercontent.com","client_secret":"YOUR_SECRET_HERE"}'
$byog | curl.exe -i -X POST "$BASE/api/v1/admin/tenant/yt/byo-google" -H "authorization: Bearer $ADMIN" -H "content-type: application/json" --data-binary "@-"
```

Expected:
```json
{
  "success": true,
  "data": {
    "tenant": "test-tenant",
    "byo_google": true
  }
}
```

---

## Test 5: Queue Multi-Channel Job

Queue a job targeting all 5 channels:

```powershell
$job = '{"tenant":"test-tenant","template":"goal","channels":["yt","ig","fb","tiktok","x"],"data":{"title":"Derby Day Highlights","msg":"Amazing 2-1 win!","mediaUrl":"https://example.com/video.mp4"}}'
$job | curl.exe -i -X POST "$BASE/api/v1/post" -H "authorization: Bearer $ADMIN" -H "content-type: application/json" -H "Idempotency-Key: multi-test-$(Get-Random)" --data-binary "@-"
```

Expected (202 Accepted):
```json
{
  "success": true,
  "data": {
    "queued": true
  }
}
```

---

## Test 6: Queue Instagram-Only Job

Test single-channel job (will go to Make webhook if configured):

```powershell
$job = '{"tenant":"test-tenant","template":"story","channels":["ig"],"data":{"msg":"Quick update from training!"}}'
$job | curl.exe -i -X POST "$BASE/api/v1/post" -H "authorization: Bearer $ADMIN" -H "content-type: application/json" -H "Idempotency-Key: ig-only-$(Get-Random)" --data-binary "@-"
```

---

## Test 7: Enable Legacy use_make Flag

Test backward compatibility (sends ALL channels to Make webhook):

```powershell
$legacy = '{"tenant":"test-tenant","flags":{"use_make":true,"direct_yt":false}}'
$legacy | curl.exe -s -X POST "$BASE/api/v1/admin/tenant/flags" -H "authorization: Bearer $ADMIN" -H "content-type: application/json" --data-binary "@-"
```

Then queue a job:
```powershell
$job = '{"tenant":"test-tenant","template":"goal","channels":["yt","ig"],"data":{"msg":"Legacy mode test"}}'
$job | curl.exe -i -X POST "$BASE/api/v1/post" -H "authorization: Bearer $ADMIN" -H "content-type: application/json" -H "Idempotency-Key: legacy-$(Get-Random)" --data-binary "@-"
```

All channels will go to the global `makeWebhookUrl` (if set).

---

## Test 8: Test Rate Limiting (YouTube)

Queue 55 YouTube jobs to trigger rate limit (default: 50/day):

```powershell
1..55 | ForEach-Object {
    $job = "{`"tenant`":`"test-tenant`",`"template`":`"highlight`",`"channels`":[`"yt`"],`"data`":{`"title`":`"Video $_`"}}"
    $job | curl.exe -s -X POST "$BASE/api/v1/post" -H "authorization: Bearer $ADMIN" -H "content-type: application/json" -H "Idempotency-Key: yt-rate-$_" --data-binary "@-" | Out-Null
    Write-Host "Queued job $_"
}
```

After 50, subsequent jobs should return:
```json
{
  "success": false,
  "data": {
    "results": {
      "yt": {
        "status": "deferred",
        "fallback": "share",
        "suggested": ["share_native", "upload_stream"],
        "reason": "yt_quota_exhausted"
      }
    }
  }
}
```

---

## Test 9: Test Unconfigured Channel (Fallback Response)

Queue a Facebook job without configuring it:

```powershell
$job = '{"tenant":"test-tenant","template":"post","channels":["fb"],"data":{"msg":"Test FB"}}'
$job | curl.exe -i -X POST "$BASE/api/v1/post" -H "authorization: Bearer $ADMIN" -H "content-type: application/json" -H "Idempotency-Key: fb-unconfigured-$(Get-Random)" --data-binary "@-"
```

Expected (queue consumer will process, then return):
```json
{
  "success": false,
  "data": {
    "results": {
      "fb": {
        "status": "fallback_required",
        "error": "Facebook channel not configured. Enable Managed mode or set BYO-Make webhook.",
        "fallback": "share",
        "suggested": ["share_native", "upload_stream"]
      }
    },
    "fallbacks": [
      { "channel": "fb", "reason": "Facebook channel not configured..." }
    ]
  }
}
```

---

## Test 10: Verify Channel Webhooks in Make.com

After queueing jobs with BYO-Make configured:

1. Go to your Make.com scenarios
2. Check the webhook history for:
   - Instagram webhook
   - TikTok webhook
   - X webhook

Expected payload format:
```json
{
  "kind": "instagram_post",
  "tenant": "test-tenant",
  "template": "goal",
  "data": {
    "title": "Derby Day Highlights",
    "msg": "Amazing 2-1 win!",
    "mediaUrl": "https://example.com/video.mp4"
  },
  "ts": 1234567890
}
```

---

## Monitoring

### Watch Queue Consumer Logs
```powershell
cd "$HOME/OneDrive/Desktop/SystonApp/backend"
wrangler tail
```

### Check DLQ for Errors
```powershell
wrangler queues consumer dead-letter --batch-size 10
```

### Check Rate Limit Counters (KV)
```powershell
wrangler kv:key list --binding=KV_IDEMP --prefix="rate:"
```

---

## Cleanup After Testing

### Reset tenant flags to defaults
```powershell
$reset = '{"tenant":"test-tenant","flags":{"use_make":false,"direct_yt":true}}'
$reset | curl.exe -s -X POST "$BASE/api/v1/admin/tenant/flags" -H "authorization: Bearer $ADMIN" -H "content-type: application/json" --data-binary "@-"
```

### Clear rate counters (manual KV delete)
```powershell
# Get all rate keys
wrangler kv:key list --binding=KV_IDEMP --prefix="rate:" | jq -r '.[].name' | ForEach-Object {
    wrangler kv:key delete --binding=KV_IDEMP $_
}
```

---

## Expected Outcomes Summary

| Test | Channel | Config | Expected Result |
|------|---------|--------|-----------------|
| 1 | IG | Managed=true | Adapter throws "not yet implemented" → fallback |
| 2 | IG | BYO-Make webhook set | Job forwarded to Make.com |
| 3 | TikTok | BYO-Make webhook set | Job forwarded to Make.com |
| 4 | YT | BYO-Google set | YouTube OAuth will use tenant's app |
| 5 | All | Mixed | IG→Make, others→fallback |
| 6 | IG | BYO-Make | Forwarded to Make |
| 7 | All | use_make=true | All go to legacy webhook |
| 8 | YT | 55 jobs | First 50 publish, 51-55 deferred |
| 9 | FB | Not configured | Fallback response |
| 10 | IG/TikTok | BYO-Make | Webhooks receive payloads |

---

## Troubleshooting

**"Tenant not found"**
- Create tenant first: `POST /api/v1/admin/tenant/create`

**Webhook not receiving data**
- Check ALLOWED_WEBHOOK_HOSTS includes your Make.com domain
- Verify webhook URL is exactly correct
- Check Make.com webhook logs

**Rate limit not working**
- Counters are daily (reset at UTC midnight)
- Check KV with: `wrangler kv:key list --binding=KV_IDEMP --prefix="rate:"`

**All channels return "not configured"**
- BYO-Make: Set webhook per channel (Test 2, 3)
- Managed: OAuth flows not implemented yet (coming soon)

---

**All test scripts ready to run!** 🚀
