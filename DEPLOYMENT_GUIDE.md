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
