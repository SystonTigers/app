# 🚀 Launch Day Checklist - Final Go/No-Go

**Date:** _____________
**Sign-off:** _____________

---

## ✅ Pre-Launch (5 Minutes)

### 1. **Git Tag** 📌
```bash
cd C:/dev/app-FRESH/backend
git tag prod-$(date +%Y%m%d)
git push --tags
```
- [ ] Tag created and pushed

### 2. **Compatibility Date Lock** 🔒
```bash
# Check wrangler.toml has same compatibility_date everywhere
grep compatibility_date wrangler.toml
```
- [ ] Root, preview, and production all match
- [ ] Using recent date (e.g., `2025-01-01` or later)

### 3. **CORS Allowlist** 🌐
**File:** `backend/src/middleware/security-headers.ts`

Production origins:
```typescript
const productionOrigins = [
  'https://your-app.com',          // ⚠️ UPDATE THIS
  'https://www.your-app.com',      // ⚠️ UPDATE THIS
  'https://app.your-domain.com',   // ⚠️ UPDATE THIS
];
```

**Action Required:**
- [ ] Replace placeholder domains with ACTUAL production URLs
- [ ] Remove localhost origins from production (keep in preview only)
- [ ] Test CORS with production domain

### 4. **Security Headers** 🔐
**Files:**
- `backend/src/middleware/security-headers.ts` ✅ Created
- `backend/src/middleware/killswitch.ts` ✅ Created

**Integration:**
- [ ] Import middleware into `src/index.ts`
- [ ] Wrap all responses with `addSecurityHeaders()`
- [ ] Check kill switch on `/public/signup/*` routes
- [ ] Test headers with: `curl -I https://your-worker.workers.dev/public/signup/start`

Expected headers:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
```

### 5. **Kill Switch Setup** 🛑
```bash
# Create KV namespace
wrangler kv:namespace create "FEATURE_FLAGS"
wrangler kv:namespace create "FEATURE_FLAGS" --preview

# Enable signups (default on)
wrangler kv:key put --binding=FEATURE_FLAGS signup_enabled true
```

- [ ] KV namespace created
- [ ] `FEATURE_FLAGS` binding added to wrangler.toml
- [ ] Kill switch tested: Set to `false` → 503 response
- [ ] Kill switch tested: Set to `true` → Normal operation

**Emergency Commands:**
```bash
# INSTANT DISABLE
wrangler kv:key put --binding=FEATURE_FLAGS signup_enabled false

# RE-ENABLE
wrangler kv:key put --binding=FEATURE_FLAGS signup_enabled true
```

### 6. **Rate Limits** ⏱️

**Option A: Cloudflare WAF Rule** (Recommended)
- [ ] Dashboard → Security → WAF → Rate Limiting Rules
- [ ] Rule: `/public/signup/*` → 10 requests/minute/IP
- [ ] Rule: `/internal/provision/*` → Require service JWT (no public access)

**Option B: Worker-based** (if no WAF access)
- [ ] Add rate limiting to middleware (use KV or Durable Objects counter)

### 7. **Backups** 💾
```bash
# Add to cron job or GitHub Actions
# Daily D1 export
wrangler d1 export team-platform-db --output=backups/d1-$(date +%Y%m%d).sql

# Weekly KV backup
wrangler kv:bulk get TENANTS > backups/kv-tenants-$(date +%Y%m%d).json
```

- [ ] Backup script exists
- [ ] Scheduled to run nightly (D1) / weekly (KV)
- [ ] Backups stored in secure location (S3, R2, etc.)

### 8. **Alerting** 🚨

**Metrics to alert on:**
- 5xx rate > 0.5% over 10 minutes
- Provisioning P95 > 90 seconds
- Signup error rate > 5%

**Implementation:**
```bash
# Watch logs live
./scripts/watch-logs.sh errors

# Send to Slack/PagerDuty
# (Add wrangler tail --format json | jq '...' | curl slack-webhook)
```

- [ ] Alerting configured for critical metrics
- [ ] On-call schedule defined
- [ ] Runbook accessible

### 9. **Legal Basics** ⚖️

**Frontend pages:**
- [ ] Privacy Policy link in footer
- [ ] Terms of Service link in footer
- [ ] Support email visible on error screens

**Add to onboarding pages:**
```tsx
<footer style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
  <p>
    By signing up, you agree to our{' '}
    <a href="/terms" target="_blank">Terms of Service</a> and{' '}
    <a href="/privacy" target="_blank">Privacy Policy</a>.
  </p>
  <p>
    Need help? <a href="mailto:support@yourapp.com">support@yourapp.com</a>
  </p>
</footer>
```

### 10. **Analytics Funnel** 📊

**Events to track:**
```typescript
// Add analytics calls in onboarding pages
analytics.track('signup_started', { plan: formData.plan });
analytics.track('brand_configured', { tenant_id: tenantId });
analytics.track('plan_confirmed', { plan: formData.plan });
analytics.track('provision_complete', { tenant_id: tenantId, duration_ms });
```

- [ ] Analytics integrated (GA4, Mixpanel, etc.)
- [ ] Events firing correctly
- [ ] Funnel dashboard created

### 11. **Trial Monitoring** 🗓️

**Backend job:**
```typescript
// Add to Durable Object alarm or CRON trigger
export async function checkTrialExpirations(env: Env) {
  const threeDaysFromNow = Math.floor(Date.now() / 1000) + (3 * 24 * 60 * 60);

  const expiringSoon = await env.DB.prepare(`
    SELECT id, email, name, trial_ends_at
    FROM tenants
    WHERE trial_ends_at BETWEEN ? AND ?
    AND trial_warning_sent = 0
  `).bind(Math.floor(Date.now() / 1000), threeDaysFromNow).all();

  for (const tenant of expiringSoon.results) {
    // Send email warning
    await sendTrialExpirationEmail(tenant);

    // Mark warning sent
    await env.DB.prepare(`
      UPDATE tenants SET trial_warning_sent = 1 WHERE id = ?
    `).bind(tenant.id).run();
  }
}
```

- [ ] Trial expiration job implemented
- [ ] Email templates created
- [ ] Job scheduled (daily cron)

### 12. **Status Endpoints** 🏥

**Check existing endpoints:**
```bash
curl https://your-worker.workers.dev/health
curl https://your-worker.workers.dev/whoami
```

Expected:
```json
// /health
{ "status": "ok", "timestamp": 1234567890 }

// /whoami
{ "authenticated": false, "ip": "1.2.3.4" }
```

- [ ] Health endpoint working
- [ ] Whoami endpoint working
- [ ] (Optional) Public status page created

---

## 🧪 Final Testing (10 Minutes)

### 1. **Run Preflight Script**
```bash
export BASE=https://your-preview.workers.dev
./scripts/preflight-signup-test.sh
```

- [ ] All 4 tests pass
- [ ] Provisioning completes within 2 minutes

### 2. **Manual QA - Starter Plan**
- [ ] Open `/onboarding`
- [ ] Select "Starter" plan
- [ ] Complete all 3 steps
- [ ] Verify webhook configured
- [ ] Verify provisioning completes
- [ ] Check admin console accessible

### 3. **Manual QA - Pro Plan**
- [ ] Open `/admin/onboard`
- [ ] Select "Pro" plan
- [ ] Complete all 4 steps
- [ ] Verify Google Sheets created
- [ ] Verify provisioning completes
- [ ] Check admin console accessible

### 4. **Error Scenarios**
- [ ] Try duplicate slug → See friendly error
- [ ] Spam submit button → Only one request sent
- [ ] Kill switch: Disable signups → See 503 message
- [ ] Kill switch: Re-enable → Works again

---

## 🚀 Launch Execution

### 1. **Deploy to Production**
```bash
cd C:/dev/app-FRESH/backend
wrangler deploy --env production
```

- [ ] Deployment successful
- [ ] No errors in logs

### 2. **Smoke Test Production**
```bash
export BASE=https://your-production-worker.workers.dev
./scripts/preflight-signup-test.sh
```

- [ ] All tests pass on production

### 3. **Monitor for 1 Hour**
```bash
./scripts/watch-logs.sh errors
```

- [ ] No critical errors
- [ ] Signups completing successfully
- [ ] Provisioning within SLA

---

## 📊 Success Criteria (First 24 Hours)

- [ ] Signup success rate > 95%
- [ ] Provisioning P95 < 90 seconds
- [ ] Error rate < 1%
- [ ] No P0/P1 incidents
- [ ] Zero security incidents

---

## 🆘 Rollback Plan

**If critical issues arise:**

1. **Immediate:** Disable signups
   ```bash
   wrangler kv:key put --binding=FEATURE_FLAGS signup_enabled false
   ```

2. **Alternative:** Roll back deployment
   ```bash
   wrangler rollback --env production
   ```

3. **Communication:**
   - Update status page
   - Email affected users
   - Post to social media

---

## ✅ Post-Launch (Week 1)

- [ ] Review metrics daily
- [ ] Triage any bugs
- [ ] Collect user feedback
- [ ] Add webhook HMAC verification
- [ ] Add progress persistence
- [ ] Run full accessibility audit

---

## 🎯 Final Sign-Off

**Pre-Launch Checks:**
- [ ] All 12 pre-launch items complete
- [ ] All 4 test scenarios pass
- [ ] Security headers validated
- [ ] Kill switch tested
- [ ] Backups confirmed
- [ ] Alerting configured

**Manual QA:**
- [ ] Starter flow works
- [ ] Pro flow works
- [ ] Error handling works
- [ ] No console errors

**Go/No-Go Decision:**
- [ ] ✅ **GO** - All green, launch approved
- [ ] ⏸️ **HOLD** - Issues found, address before launch
- [ ] ❌ **NO-GO** - Critical blockers, abort launch

---

**Signed:**

**Tech Lead:** _________________ Date: _______

**QA Lead:** _________________ Date: _______

**Product Owner:** _________________ Date: _______

---

## 🚀 LAUNCH COMMAND

When all boxes checked:

```bash
# 🍾 Pop the cork!
wrangler deploy --env production

# Monitor
./scripts/watch-logs.sh

# Announce
echo "🚀 We're live!"
```

**Go time!** 🚀🥂
