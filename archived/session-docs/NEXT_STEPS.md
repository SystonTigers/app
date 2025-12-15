# 📁 ARCHIVED - Superseded by Current Docs

**Status:** DUPLICATE/SUPERSEDED | **Archived:** 2025-11-28

This content is now maintained in the official documentation.

**Current Documentation:**
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) – Official architecture
- [docs/CURRENT_STATE.md](./docs/CURRENT_STATE.md) – Current snapshot
- [README.md](./README.md) – Setup & quick start
- [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) – Roadmap & next steps

---

# ORIGINAL CONTENT BELOW (MAY BE OUTDATED)


# Next Steps - Manual Tasks Required

Everything that could be automated has been done. Here's what you need to do manually:

---

## ✅ DONE (Automated)

- ✅ Backend built successfully (`dist/index.js`, `dist/queue-consumer.js`)
- ✅ Git repository initialized
- ✅ `.gitignore` created
- ✅ All documentation files created
- ✅ All worker code implemented
- ✅ GitHub Actions workflow created
- ✅ DLQ code corrected (no retries yet, sends to DLQ on first failure)

---

## 🔴 TODO (Manual Steps Required)

### 1. Set Cloudflare Secrets

These require interactive input, so you must run them:

```powershell
cd "$HOME/OneDrive/Desktop/SystonApp/backend"

# Required secrets
wrangler secret put JWT_SECRET
# Enter a strong random string (e.g., generate with: openssl rand -base64 32)

wrangler secret put ADMIN_JWT
# Enter an admin JWT token for testing (or generate one programmatically)

# YouTube OAuth (required for managed plans)
wrangler secret put YT_CLIENT_ID
# Enter your Google OAuth Client ID

wrangler secret put YT_CLIENT_SECRET
# Enter your Google OAuth Client Secret

# Optional - Stripe webhook secret (for signature verification)
wrangler secret put STRIPE_WEBHOOK_SECRET
# Enter your Stripe webhook signing secret
```

**Get YouTube OAuth credentials:**
1. Go to: https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID
3. Add authorized redirect URI: `https://syston-postbus.team-platform-2025.workers.dev/api/v1/admin/yt/callback`

---

### 2. Create Cloudflare Queues

```powershell
cd "$HOME/OneDrive/Desktop/SystonApp/backend"

wrangler queues create post-queue
wrangler queues create dead-letter
```

Verify with:
```powershell
wrangler queues list
```

---

### 3. Deploy All Workers

```powershell
# Backend (already built, just deploy)
cd "$HOME/OneDrive/Desktop/SystonApp/backend"
wrangler deploy

# Fixtures worker
cd "$HOME/OneDrive/Desktop/SystonApp/workers/fixtures"
wrangler deploy

# Admin console
cd "$HOME/OneDrive/Desktop/SystonApp/admin"
wrangler deploy

# Setup console (tenant self-serve UI)
cd "$HOME/OneDrive/Desktop/SystonApp/setup"
wrangler deploy
```

**Save the URLs** printed after each deploy!

---

### 4. Test the Deployment

Use the test commands from `CODEX_STEPS.md`:

```powershell
# Set your admin JWT
$env:ADMIN_JWT = "your-admin-jwt-here"

$ADMIN = $env:ADMIN_JWT
$BASE = "https://syston-postbus.team-platform-2025.workers.dev"

# 1. Create a test tenant
'{"id":"test-club"}' | curl.exe -s -X POST -H "authorization: Bearer $ADMIN" -H "content-type: application/json" --data-binary "@-" "$BASE/api/v1/admin/tenant/create"

# 2. Generate setup link
'{"tenant":"test-club","ttl_minutes":60}' | curl.exe -s -X POST -H "authorization: Bearer $ADMIN" -H "content-type: application/json" --data-binary "@-" "$BASE/api/v1/admin/tenant/invite"

# 3. Open the setup_url in a browser and test the tenant setup UI

# 4. Queue a test job
$job = '{"tenant":"test-club","template":"smoke","channels":["yt"],"data":{"msg":"hello"}}'
$job | curl.exe -i -X POST -H "authorization: Bearer $ADMIN" -H "content-type: application/json" -H "Idempotency-Key: test-$(Get-Random)" --data-binary "@-" "$BASE/api/v1/post"
```

---

### 5. Set Up GitHub Actions (Optional)

To enable auto-deploy on push to main:

**A. Get Cloudflare credentials:**
```powershell
wrangler whoami
```
Note your **Account ID**.

**B. Create Cloudflare API Token:**
1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use "Edit Cloudflare Workers" template
4. Copy the token

**C. Add GitHub Secrets:**
1. Go to your GitHub repo → Settings → Secrets and variables → Actions
2. Add two secrets:
   - `CF_API_TOKEN` = the token from step B
   - `CF_ACCOUNT_ID` = your account ID from step A

**D. Push to GitHub:**
```powershell
cd "$HOME/OneDrive/Desktop/SystonApp"

git add .
git commit -m "feat: initial SystonApp platform with all features"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

From now on, every push to `main` will auto-deploy all workers!

---

### 6. Configure Stripe Webhook (Optional)

If you want automatic plan management:

**A. In Stripe Dashboard:**
1. Go to: Developers → Webhooks → Add endpoint
2. URL: `https://syston-postbus.team-platform-2025.workers.dev/api/v1/stripe/webhook`
3. Events: Select `customer.subscription.created` and `customer.subscription.updated`
4. Save and copy the **Signing secret**

**B. Add the secret:**
```powershell
cd "$HOME/OneDrive/Desktop/SystonApp/backend"
wrangler secret put STRIPE_WEBHOOK_SECRET
# Paste the signing secret from Stripe
```

**C. When creating subscriptions:**
- Add metadata: `tenant` or `tenant_id` = the tenant's ID
- Name your plans: "managed", "pro", "premium" for managed plans, anything else for BYO-Make plans

---

### 7. Custom Domains (Optional)

When you're ready to use custom domains:

**A. Add DNS Records in Cloudflare:**
- `api` → CNAME → `workers.dev`
- `fixtures` → CNAME → `workers.dev`
- `admin` → CNAME → `workers.dev`
- `setup` → CNAME → `workers.dev`

**B. Uncomment routes in wrangler.toml files:**
- `backend/wrangler.toml`
- `workers/fixtures/wrangler.toml`
- `admin/wrangler.toml`
- `setup/wrangler.toml`

Replace `YOURBRAND.com` with your actual domain.

**C. Redeploy all workers:**
```powershell
cd backend && wrangler deploy
cd ../workers/fixtures && wrangler deploy
cd ../../admin && wrangler deploy
cd ../setup && wrangler deploy
```

---

## 📊 Architecture Summary

```
┌─────────────────────────────────────────┐
│           Workers (deployed)             │
├─────────────────────────────────────────┤
│ backend     → Main API + Queue Consumer │
│ fixtures    → Match fixtures cache      │
│ admin       → Admin console UI          │
│ setup       → Tenant self-serve UI      │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│         Queues (to create)              │
├─────────────────────────────────────────┤
│ post-queue    → Main job queue          │
│ dead-letter   → Failed jobs (DLQ)       │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│         KV Namespaces (exist)           │
├─────────────────────────────────────────┤
│ KV_IDEMP     → Tenant configs           │
│ KV_FIXTURES  → Cached fixtures          │
└─────────────────────────────────────────┘
```

---

## 🆘 Troubleshooting

**"Error: No namespace with ID..."**
- Run `wrangler kv:namespace list` to check KV namespaces exist
- Update IDs in `wrangler.toml` if needed

**"Error: Queue not found"**
- Run step 2 to create queues
- Verify with `wrangler queues list`

**"Unauthorized" when deploying**
- Run `wrangler login` to authenticate
- Or set `CLOUDFLARE_API_TOKEN` env var

**YouTube OAuth fails**
- Check redirect URI in Google Console matches exactly
- Verify `YT_CLIENT_ID` and `YT_CLIENT_SECRET` are set

**Logs not showing**
- Run `wrangler tail` in the backend directory
- Check Cloudflare Dashboard → Workers → Logs

---

## 📚 Documentation Reference

- `README.md` - Architecture overview
- `API_CONTRACT.md` - Complete API reference
- `SECURITY.md` - Security policies
- `DEPLOYMENT_GUIDE.md` - Deployment instructions
- `CODEX_STEPS.md` - Test commands
- `CONTRIBUTING.md` - Development guidelines

---

## ✅ Quick Checklist

- [ ] Set all secrets (step 1)
- [ ] Create queues (step 2)
- [ ] Deploy all 4 workers (step 3)
- [ ] Test with curl commands (step 4)
- [ ] Set up GitHub Actions (step 5)
- [ ] Configure Stripe webhook (step 6 - optional)
- [ ] Add custom domains (step 7 - optional)

---

**Once steps 1-3 are complete, your platform is live! 🚀**
