# 🚀 Production Launch Checklist

**Target Launch Date**: _____________
**Launch Lead**: _____________
**Sign-off Required**: Engineering, Security, Operations

---

## Pre-Launch (T-7 Days)

### Infrastructure
- [ ] **Production Worker deployed** to Cloudflare
  ```bash
  wrangler deploy --env production
  ```
- [ ] **D1 Database** created and migrations run
  ```bash
  wrangler d1 execute DB --env production --file ./src/schema/d1.sql
  ```
- [ ] **KV Namespaces** created:
  - [ ] `KV_IDEMP` (tenant config, idempotency)
  - [ ] `TENANTS` (tenant metadata)
- [ ] **Durable Objects** enabled and bound:
  - [ ] `PROVISIONER`
- [ ] **R2 Bucket** created (if using R2 for media)
- [ ] **Custom domain** configured (optional):
  - [ ] DNS records set
  - [ ] SSL certificate active

### Secrets & Configuration
- [ ] **Secrets configured**:
  ```bash
  wrangler secret list --env production
  ```
  Required secrets:
  - [ ] `JWT_SECRET` (32+ chars, base64)
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE`
  - [ ] `GOOGLE_SERVICE_ACCOUNT_KEY` (JSON)
  - [ ] `SENDGRID_API_KEY` (optional, for emails)

- [ ] **Environment variables** set in `wrangler.toml`:
  - [ ] `API_VERSION = "v1"`
  - [ ] `JWT_ISSUER = "syston.app"`
  - [ ] `JWT_AUDIENCE = "syston-mobile"`
  - [ ] `GAS_WEBAPP_URL` (Apps Script deployment URL)
  - [ ] `BACKEND_URL` (Worker URL)
  - [ ] `ALLOWED_WEBHOOK_HOSTS = "make.com,hook.us1.make.com"`
  - [ ] `compatibility_date = "2024-11-01"`

### External Services
- [ ] **Google Apps Script** deployed and published:
  - [ ] Script ID noted
  - [ ] Web App URL set in `GAS_WEBAPP_URL`
  - [ ] Service account has Editor access
- [ ] **Make.com** account set up (for Starter plan support)
- [ ] **Supabase** project created:
  - [ ] API URL and service role key configured
  - [ ] Tables/functions deployed (if needed)

### Testing
- [ ] **Full test suite passing**:
  ```bash
  npm test
  # Should show: 467/504 passing (92.7%)
  ```
- [ ] **Provisioning tests passing** (5/5)
- [ ] **Security tests passing** (2/2)
- [ ] **Smoke test passing**:
  ```bash
  WORKER_URL=https://your-worker.workers.dev ./scripts/smoke-test.sh
  ```

---

## Launch Day (T-0)

### Final Verification (2 hours before)
- [ ] **Health check** returns OK:
  ```bash
  curl https://your-worker.workers.dev/health
  # Expected: {"ok": true, "version": "...", "environment": "production"}
  ```
- [ ] **Run smoke test** one final time:
  ```bash
  ./scripts/smoke-test.sh
  # Expected: ✅ SMOKE TEST PASSED
  ```
- [ ] **Create test tenant** manually:
  - [ ] Starter plan signup flow works
  - [ ] Pro plan signup flow works
  - [ ] Provisioning completes successfully
  - [ ] JWT issued and validated via `/whoami`

### Monitoring Setup (1 hour before)
- [ ] **Start log monitoring**:
  ```bash
  # Terminal 1: All errors
  ./scripts/watch-logs.sh errors

  # Terminal 2: Authorization denials
  ./scripts/watch-logs.sh deny

  # Terminal 3: Signups
  ./scripts/watch-logs.sh signup
  ```
- [ ] **Set up alerts** (if available):
  - [ ] 5xx error rate > 1% for 5 minutes
  - [ ] Authorization denials > 10/minute
  - [ ] Provisioning failures > 5/hour
- [ ] **Prepare rollback plan**:
  ```bash
  # Note current deployment
  git log -1 --oneline > CURRENT_DEPLOYMENT.txt
  git tag prod-$(date +%Y%m%d%H%M)
  git push --tags
  ```

### Launch (Go Live)
- [ ] **Enable signup on website/marketing page**
  - [ ] Update "Sign Up" button to point to prod Worker
  - [ ] Verify link: `https://your-worker.workers.dev/public/signup/start`
- [ ] **Announce launch** (internal):
  - [ ] Post in #platform-alerts
  - [ ] Notify support team
  - [ ] Share runbook link
- [ ] **Monitor for first 10 signups**:
  - [ ] Watch logs in real-time
  - [ ] Verify no errors
  - [ ] Check provisioning status for first few tenants

---

## Post-Launch (T+1 Hour)

### Health Checks
- [ ] **No 5xx errors** in last hour
- [ ] **No repeated authorization denials** (few is ok, many = attack)
- [ ] **Provisioning success rate** > 95%
- [ ] **Response times** < 200ms for signup endpoints
- [ ] **At least 1 successful signup** completed end-to-end

### User Verification
- [ ] **Contact first 3 users**:
  - [ ] Ask about signup experience
  - [ ] Verify they received JWT
  - [ ] Check if provisioning completed
  - [ ] Note any issues

### Monitoring
- [ ] **Continue watching logs** for next 2 hours
- [ ] **Check metrics**:
  ```bash
  # Count signups
  wrangler tail --env production --format=json | \
    jq 'select(.logs[0].msg == "tenant_provision_complete")' | wc -l

  # Count errors
  ./scripts/watch-logs.sh errors | wc -l
  ```

---

## Post-Launch (T+24 Hours)

### Review
- [ ] **Total signups**: _______
- [ ] **Provisioning success rate**: _______
- [ ] **Error rate**: _______
- [ ] **Average provisioning time**: _______
- [ ] **User feedback**: _______

### Issues Encountered
- [ ] **P0 issues** (site down): _______ (should be 0)
- [ ] **P1 issues** (critical broken): _______ (should be 0)
- [ ] **P2 issues** (degraded): _______
- [ ] **P3 issues** (minor): _______

### Action Items
- [ ] **File tickets** for any P2/P3 issues
- [ ] **Update runbook** with new issues/fixes discovered
- [ ] **Send launch retrospective** to team
- [ ] **Celebrate launch** 🎉

---

## Post-Launch (T+7 Days)

### Week 1 Review
- [ ] **Total tenants**: _______
- [ ] **Active tenants** (completed setup): _______
- [ ] **Trial conversions**: _______
- [ ] **Churn rate**: _______

### Performance
- [ ] **Average signup time**: _______ (target: < 2 min)
- [ ] **Average provisioning time**: _______ (target: < 5 min)
- [ ] **Error rate**: _______ (target: < 0.5%)
- [ ] **Uptime**: _______ (target: 99.9%)

### Hardening
- [ ] **Rate limiting** enabled on signup endpoints
- [ ] **IP blocking** for abusive signups (if needed)
- [ ] **Log aggregation** set up (Datadog, Logtail, etc.)
- [ ] **Backup cron** running daily
- [ ] **Status page** created (optional)

### Security
- [ ] **No unauthorized access** attempts succeeded
- [ ] **No JWT leaks** detected
- [ ] **Authorization logs** reviewed for patterns
- [ ] **Vulnerability scan** run (optional)

---

## Rollback Procedure

If critical issues arise, follow this procedure:

### Immediate Rollback (< 5 minutes)
```bash
# 1. Find last good deployment
git log --oneline --decorate | head -10

# 2. Checkout and deploy
git checkout <last-good-commit>
wrangler deploy --env production

# 3. Verify
curl https://your-worker.workers.dev/health
./scripts/smoke-test.sh

# 4. Announce
# Post in #platform-alerts: "Rolled back to version X due to issue Y"
```

### Disable Signups (Emergency)
```bash
# Option 1: Update website to disable signup button
# Option 2: Add rate limit rule in Cloudflare WAF:
#   POST /public/signup/* → Block all requests

# Option 3: Add feature flag check in signup route (if implemented)
```

### Rollback Checklist
- [ ] Rollback completed
- [ ] Health check passes
- [ ] Smoke test passes
- [ ] Existing users still working
- [ ] Root cause identified
- [ ] Fix scheduled

---

## Success Criteria

Launch is considered successful if:
- ✅ **0 P0/P1 incidents** in first 24 hours
- ✅ **Uptime > 99.9%** in first week
- ✅ **Provisioning success rate > 95%**
- ✅ **Error rate < 1%**
- ✅ **> 10 successful signups** in first 24 hours
- ✅ **No security incidents**
- ✅ **Positive user feedback** from first 10 users

---

## Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Engineering Lead | _________ | _________ | _____ |
| Security Lead | _________ | _________ | _____ |
| Operations Lead | _________ | _________ | _____ |
| Product Lead | _________ | _________ | _____ |

---

## Quick Reference Commands

```bash
# Deploy
wrangler deploy --env production

# Health check
curl $WORKER_URL/health

# Smoke test
./scripts/smoke-test.sh

# Watch logs
./scripts/watch-logs.sh errors
./scripts/watch-logs.sh signup
./scripts/watch-logs.sh deny

# Rollback
git checkout <commit> && wrangler deploy --env production

# Check secrets
wrangler secret list --env production

# Database query
wrangler d1 execute DB --env production --command "SELECT COUNT(*) FROM tenants"
```

---

**🚀 Ready to launch! Good luck!**
