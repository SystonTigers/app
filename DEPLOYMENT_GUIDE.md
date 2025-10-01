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
