# Deployment Guide

## 1. Secrets (backend)
```powershell
cd backend
wrangler secret put JWT_SECRET
wrangler secret put YT_CLIENT_ID
wrangler secret put YT_CLIENT_SECRET
# optional test webhook:
# wrangler secret put MAKE_WEBHOOK_BASE
```

**Note on Webhook Host Validation:**

The `ALLOWED_WEBHOOK_HOSTS` variable in `backend/wrangler.toml` controls which webhook URLs are allowed. It supports:
- **Exact hosts:** `hook.make.com`, `webhook.site`
- **Suffix rules:** `.make.com` (matches any subdomain like `hook.eu2.make.com`, `hook.us1.make.com`)
- **Wildcard style:** `*.make.com` (same as `.make.com`)

The backend automatically adds `.make.com` suffix support, so all Make.com regions are allowed by default.

## 2. Queues
```powershell
wrangler queues create post-queue
wrangler queues create dead-letter
```

Make sure `wrangler.toml` has producers/consumers for both.

## 3. Build & Deploy
```powershell
cd backend
npm i
npm run build
wrangler deploy

cd ../workers/fixtures
wrangler deploy

cd ../../admin
wrangler deploy

cd ../setup
wrangler deploy
```



## 3.5 R2 Lifecycle Rules (Optional - Cost Optimization)

To reduce storage costs, configure R2 lifecycle rules to transition older media to Infrequent Access or delete after a retention period:

```powershell
# Transition objects to Infrequent Access after 30 days
wrangler r2 bucket lifecycle add syston-media --transition-days 30 --storage-class InfrequentAccess

# Or set expiration to delete objects after 90 days
wrangler r2 bucket lifecycle add syston-media --expiration-days 90
```

**Options:**
- `--transition-days N`: Move to Infrequent Access after N days
- `--expiration-days N`: Delete objects after N days
- Combine both for: active → cold → delete

See [Cloudflare R2 Lifecycle docs](https://developers.cloudflare.com/r2/buckets/object-lifecycles/) for more options.



## 3.6 Rate Limits (Configurable)

The platform enforces per-tenant rate limits to prevent abuse and ensure fair resource allocation.

**Default Limits (configured in `backend/wrangler.toml`):**

```powershell
RL_POSTS_PER_MIN = "60"    # Max posts per minute per tenant
RL_UPLOADS_PER_MIN = "20"  # Max uploads per minute per tenant
```

**Adjusting Limits:**

Edit `backend/wrangler.toml` to change the defaults, then redeploy:

```powershell
cd backend
wrangler deploy
```

**Response when rate limited:**
- HTTP 429 (Too Many Requests)
- JSON response: `{"success": false, "error": {"code": "RATE_LIMIT_EXCEEDED"}}`
- Headers include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

**Per-endpoint limits:**
- Chat messages: 5/second per user
- General API: Uses Durable Object-based rate limiting

## 4. Admin Console

- Open the printed URL.
- Set flags, webhooks, generate setup link, refresh fixtures.

## 5. Custom Domains (optional)

- Uncomment `routes` in each `wrangler.toml`.
- Add Cloudflare DNS CNAMEs (`api`, `fixtures`, `admin`).
- Deploy again.

## 6. GitHub Actions

- Add repo secrets: `CF_API_TOKEN`, `CF_ACCOUNT_ID`.
- Push to `main` → auto-deploy.

## 7. Generate Admin Token (no 403)

From PowerShell:
```powershell
cd "$HOME\OneDrive\Desktop\SystonApp\backend"

# Use the SAME value you set with `wrangler secret put JWT_SECRET`
# (if your original secret was base64, pass that base64 here)
.\scripts\print-admin-jwt.ps1 -JwtSecret "<YOUR_JWT_SECRET>"

# Copy the printed eyJ... token:
$env:ADMIN_JWT = "PASTE_TOKEN_HERE"

# Test an admin endpoint (example: create album)
$BASE="https://syston-postbus.team-platform-2025.workers.dev"
$HDR="authorization: Bearer $env:ADMIN_JWT"
'{"tenant":"test-tenant","title":"U13 v Rivals","teamId":"u13"}' |
  curl.exe -i -X POST "$BASE/api/v1/admin/gallery/albums" -H $HDR -H "content-type: application/json" --data-binary "@-"
```

If you still see 403:

* Decode the token on jwt.io and confirm `roles: ["admin"]`, `iss`, `aud`, `exp`.
* Ensure the **JWT_SECRET used to sign** equals the **wrangler secret** set in the worker.
