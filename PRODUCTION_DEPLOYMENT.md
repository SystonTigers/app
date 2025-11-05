# 🚀 Production Deployment Checklist

**Status**: Ready to Ship
**Date**: 2025-11-05
**Environment**: Production

---

## ✅ Pre-Deployment Verification

### 1. Environment Variables

```bash
# Verify production flags
cd backend

# Confirm these are set correctly in wrangler.toml
grep -A5 "env.production.vars" wrangler.toml
# Should show:
# DRY_RUN = "false"
# MAKE_VALIDATE_STRICT = "true"
```

### 2. Secrets Check

```bash
# Ensure JWT_SECRET is set (required for magic links)
wrangler secret list --env production

# If not set, add it:
wrangler secret put JWT_SECRET --env production
# (Paste a strong random string, e.g., openssl rand -base64 32)
```

### 3. Preview Validation

```bash
# Confirm preview tests are passing
export BASE=https://app-preview.team-platform-2025.workers.dev
./scripts/preflight-signup-test.sh

# Expected: ✅ ALL TESTS PASSED
```

---

## 📦 Production Migration

### Step 1: Apply Fixtures Multi-Tenant Migration

```bash
cd backend

# Apply migration (transactional - safe to retry)
wrangler d1 migrations apply syston-db --env production --remote

# Or run manually:
wrangler d1 execute syston-db --env production --remote \
  --file=migrations/011_fixtures_multitenant_prod.sql
```

**Rollback (if needed):**
```bash
wrangler d1 execute syston-db --env production --remote \
  --command="DROP TABLE fixtures; ALTER TABLE fixtures_old RENAME TO fixtures;"
```

### Step 2: Verify Migration

```bash
# Check table structure
wrangler d1 execute syston-db --env production --remote \
  --command="SELECT sql FROM sqlite_master WHERE name='fixtures';"

# Should show tenant_id TEXT NOT NULL
```

---

## 🚀 Deployment

### Deploy Backend Worker

```bash
cd backend

# Build and deploy
wrangler deploy --env production

# Expected output:
# ✅ Uploaded app (production)
# ✅ Worker Startup Time: <20ms
```

### Verify Health

```bash
curl -s https://app.team-platform-2025.workers.dev/health | jq .

# Expected:
# { "success": true, ... }
```

---

## 🧪 Smoke Test

### Test 1: Starter Plan End-to-End

```bash
# Set production base URL
export BASE=https://app.team-platform-2025.workers.dev

# Run smoke test
./scripts/preflight-signup-test.sh

# OR manual test:
SLUG="prod-test-$(date +%s)"
curl -X POST "$BASE/public/signup/start" \
  -H "content-type: application/json" \
  -d "{\"clubName\":\"Prod Test\",\"clubSlug\":\"$SLUG\",\"email\":\"test@prod.com\",\"plan\":\"starter\"}"

# Should return: { "success": true, "tenant": {...}, "jwt": "..." }
```

### Test 2: Check Provisioning

```bash
# Get JWT and tenant ID from smoke test
JWT="<paste-jwt>"
TENANT_ID="<paste-tenant-id>"

# Poll status
curl -s "$BASE/api/v1/tenants/$TENANT_ID/provision-status" \
  -H "authorization: Bearer $JWT" | jq .

# Expected: { "status": "complete", "reason": null }
```

---

## 📊 Monitoring (First Hour)

### Watch Live Provisioning Logs

```bash
# Terminal 1: Filter for provisioning feature
wrangler tail --env production --format=json \
  | jq -r 'select(.logs[]? | select(.feature=="provision"))'

# Expected log sequence:
# {"level":"info","msg":"Queue request","tenantId":"...","plan":"starter"}
# {"level":"info","msg":"State transition","state":"processing"}
# {"level":"info","msg":"Seeding default content"}
# {"level":"info","msg":"Configuring routing"}
# {"level":"info","msg":"Provision complete","duration_ms":287}
```

### Monitor Error Rate

```bash
# Terminal 2: Watch for errors
wrangler tail --env production --format=json \
  | jq -r 'select(.outcome == "exception" or .logs[]? | select(.level=="error"))'

# Should be silent (no errors)
```

### Check Metrics

```bash
# Get provision status for first 5 signups
curl -s "$BASE/api/v1/admin/metrics/provisioning" \
  -H "Authorization: Bearer $ADMIN_JWT" | jq .

# Expected:
# { "total": 5, "complete": 5, "failed": 0, "p95_duration_ms": 320 }
```

---

## 🚨 Emergency Procedures

### Kill Provisioning (if issues detected)

```bash
# Disable all new signups instantly
wrangler kv key put --binding=FEATURE_FLAGS signup_enabled false \
  --env production --remote

# Verify
curl -X POST "$BASE/public/signup/start" \
  -H "content-type: application/json" \
  -d '{"clubName":"Test","clubSlug":"test","email":"t@t.com","plan":"starter"}'

# Should return: { "success": false, "error": { "code": "SIGNUPS_DISABLED" } }
```

### Re-Enable Signups

```bash
wrangler kv key put --binding=FEATURE_FLAGS signup_enabled true \
  --env production --remote
```

### Rollback Deployment

```bash
# Rollback to previous version
wrangler rollback --env production

# Or deploy specific version:
wrangler versions deploy <version-id> --env production
```

### Rollback Migration

```bash
# Restore old fixtures table
wrangler d1 execute syston-db --env production --remote \
  --command="DROP TABLE fixtures; ALTER TABLE fixtures_old RENAME TO fixtures;"
```

---

## 📈 Success Metrics (First 24h)

| Metric | Target | Alert If |
|--------|--------|----------|
| Signup success rate | >95% | <90% |
| Provisioning P95 | <2s | >5s |
| Provision failures | <1% | >5% |
| 5xx error rate | <0.5% | >1% |
| Kill switch response time | <100ms | >500ms |

---

## ✅ Post-Deployment Validation

### Checklist

- [ ] Migration applied successfully
- [ ] Worker deployed (check Cloudflare dashboard)
- [ ] Health endpoint returns 200
- [ ] Smoke test: Starter plan → complete
- [ ] Smoke test: Pro plan → complete
- [ ] Logs show structured provisioning events
- [ ] No errors in tail logs (first 10 min)
- [ ] Kill switch tested (disable → 503, enable → 200)
- [ ] CORS working (test from your frontend domain)
- [ ] Security headers present (CSP, HSTS)

### Validation Commands

```bash
# 1. Health check
curl -s https://app.team-platform-2025.workers.dev/health

# 2. CORS preflight
curl -i -X OPTIONS https://app.team-platform-2025.workers.dev/public/signup/start \
  -H "Origin: https://your-frontend-app.pages.dev"

# Should include: Access-Control-Allow-Origin

# 3. Security headers
curl -I https://app.team-platform-2025.workers.dev/health

# Should include:
# Strict-Transport-Security: max-age=31536000
# Content-Security-Policy: ...
# X-Frame-Options: DENY

# 4. Kill switch
wrangler kv key put --binding=FEATURE_FLAGS signup_enabled false --env production --remote
curl -X POST https://app.team-platform-2025.workers.dev/public/signup/start \
  -H "content-type: application/json" \
  -d '{"clubName":"Test","clubSlug":"test","email":"t@t.com","plan":"starter"}'
# Should return 503 with SIGNUPS_DISABLED

# Re-enable
wrangler kv key put --binding=FEATURE_FLAGS signup_enabled true --env production --remote
```

---

## 🎯 Day 1 Monitoring Dashboard

**Watch these endpoints:**

1. **Signup rate**: `/public/signup/start` requests/min
2. **Provision completion rate**: `provision_state='complete'` count
3. **Error rate**: 5xx responses, provision failures
4. **P95 latency**: Provisioning duration_ms
5. **Kill switch status**: FEATURE_FLAGS.signup_enabled

**Alerting thresholds:**
- Provision failure rate > 5%
- P95 provisioning time > 5s
- 5xx rate > 1%
- Any `level:"error"` logs with `feature:"provision"`

---

## 📅 Week 1 Polish (Post-Launch)

- [ ] Add Webhook HMAC verification (flip MAKE_VALIDATE_STRICT back on)
- [ ] Implement progress persistence (localStorage in frontend)
- [ ] Set up automated metrics collection (provisioning_duration_ms)
- [ ] Clean up old fixtures_old table after validation
- [ ] Add alerting for provision failures (email/Slack)
- [ ] Document manual retry procedure for stuck provisions

---

## 📞 On-Call Contacts

**P0 (Site Down):**
- Check: wrangler status
- Rollback: wrangler rollback --env production

**P1 (Signups Failing):**
- Kill switch: wrangler kv key put signup_enabled false
- Check logs: wrangler tail --env production

**P2 (Provisioning Slow):**
- Monitor: provision_state != 'complete' after 10s
- Check DO health: Review logs for step failures

---

## 🍾 Final Verification

Run this complete end-to-end test:

```bash
#!/bin/bash
# prod-verify.sh

export BASE=https://app.team-platform-2025.workers.dev

echo "1. Health check..."
curl -s $BASE/health | jq -e '.success'

echo "2. Starter signup..."
RESULT=$(curl -s -X POST $BASE/public/signup/start \
  -H "content-type: application/json" \
  -d "{\"clubName\":\"Prod Verify\",\"clubSlug\":\"prod-verify-$(date +%s)\",\"email\":\"verify@prod.com\",\"plan\":\"starter\"}")

JWT=$(echo $RESULT | jq -r '.jwt')
TENANT=$(echo $RESULT | jq -r '.tenant.id')

echo "3. Brand..."
curl -s -X POST $BASE/public/signup/brand \
  -H "authorization: Bearer $JWT" \
  -H "content-type: application/json" \
  -d '{"primaryColor":"#FF5722","secondaryColor":"#000000"}' | jq -e '.success'

echo "4. Make webhook..."
curl -s -X POST $BASE/public/signup/starter/make \
  -H "authorization: Bearer $JWT" \
  -H "content-type: application/json" \
  -d '{"webhookUrl":"https://hook.us1.make.com/prod-verify","webhookSecret":"supersecret123"}' | jq -e '.success'

echo "5. Wait for provisioning..."
sleep 3

STATUS=$(curl -s $BASE/api/v1/tenants/$TENANT/provision-status \
  -H "authorization: Bearer $JWT" | jq -r '.data.status')

if [ "$STATUS" == "complete" ]; then
  echo "✅ PRODUCTION VERIFIED - All systems go!"
  exit 0
else
  echo "❌ PROVISIONING FAILED: $STATUS"
  exit 1
fi
```

---

**When all checks pass: 🚀 YOU'RE LIVE!**

Pop the cork. Monitor for 1 hour. Then celebrate. 🍾
