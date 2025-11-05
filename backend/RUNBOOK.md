# 🚨 Production Runbook

**Last Updated**: January 5, 2025
**Maintainer**: Platform Team
**Escalation**: See #platform-alerts in Slack

---

## 📞 Quick Reference

| Issue | Command | Expected Outcome |
|-------|---------|------------------|
| Check health | `curl $WORKER_URL/health` | `{"ok": true}` |
| Verify JWT | `curl $WORKER_URL/whoami -H "Authorization: Bearer JWT"` | Decoded claims |
| Watch denials | `./scripts/watch-logs.sh deny` | Real-time authz denials |
| Re-queue provision | See "Provisioning Stuck" below | 200 OK |
| Rollback | `git checkout tags/prod-YYYYMMDDHHMM && wrangler deploy --env production` | Previous version live |

---

## 🔥 Common Issues & Fixes

### 1. Signup Failed (User Visible)

**Symptoms**:
- User reports "signup failed" error
- 4xx or 5xx on `/public/signup/start`

**Diagnosis**:
```bash
# 1. Watch signup logs
./scripts/watch-logs.sh signup

# 2. Check specific tenant
TENANT_ID=tenant_123 ./scripts/watch-logs.sh tenant

# 3. Verify JWT was issued
curl $WORKER_URL/whoami -H "Authorization: Bearer USER_JWT"
```

**Common Causes**:
| Error | Cause | Fix |
|-------|-------|-----|
| `SLUG_TAKEN` | Slug already registered | User must choose different slug |
| `EMAIL_EXISTS` | Email already registered | User should login or use different email |
| `INVALID_PROMO` | Invalid promo code | Remove promo code or use valid one |
| `VALIDATION` | Invalid input | Check field formats (email, slug pattern) |

**Fix Steps**:
1. **If slug/email conflict**: User must use different values (no override)
2. **If validation error**: Check request body matches schema:
   ```json
   {
     "clubName": "string (1+ chars)",
     "clubSlug": "lowercase-alphanumeric-hyphens",
     "email": "valid@email.com",
     "plan": "starter" | "pro"
   }
   ```
3. **If 500 error**: Check D1 database connectivity, tail for exceptions
4. **Re-try with idempotency**: Same payload can be re-POSTed safely

---

### 2. Provisioning Stuck in "processing"

**Symptoms**:
- `/api/v1/tenants/:id/provision-status` returns `"status": "processing"` for > 5 minutes
- No error in logs
- User waiting indefinitely

**Diagnosis**:
```bash
# 1. Check provisioning logs
./scripts/watch-logs.sh provision

# 2. Check Durable Object logs (if available)
wrangler tail --env production | grep PROVISIONER

# 3. Check status endpoint
curl $WORKER_URL/api/v1/tenants/TENANT_ID/provision-status \
  -H "Authorization: Bearer JWT"
```

**Common Causes**:
| Cause | Indicator | Fix |
|-------|-----------|-----|
| GAS timeout | No response from `GAS_WEBAPP_URL` | Verify GAS is deployed, check credentials |
| External service down | Make.com/Sheets API unreachable | Wait for service recovery, or re-queue |
| DO state stuck | Checkpoint shows error | Re-run provisioning step |
| Missing credentials | `GOOGLE_SERVICE_ACCOUNT_KEY` missing | Set secret, restart Worker |

**Fix Steps**:

**Option A: Re-queue Provisioning** (Preferred)
```bash
# 1. Generate service JWT (from scripts/provision-tenant.js helper)
SERVICE_JWT=$(node -e "
const crypto = require('crypto');
const payload = {
  roles: ['service'],
  sub: 'service',
  iss: process.env.JWT_ISSUER || 'syston.app',
  aud: 'internal',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 300
};
const header = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
const sig = crypto.createHmac('sha256', process.env.JWT_SECRET).update(\`\${header}.\${body}\`).digest('base64url');
console.log(\`\${header}.\${body}.\${sig}\`);
")

# 2. Re-queue
curl -X POST $WORKER_URL/internal/provision/queue \
  -H "Authorization: Bearer $SERVICE_JWT" \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "tenant_123"}'

# Expected: 200 OK, provisioning restarts
```

**Option B: Manual Verification** (If provisioning actually completed)
```bash
# Check if tenant is actually working (spreadsheet created, webhook configured)
# If yes, manually update status in D1:
wrangler d1 execute DB --env production --command \
  "UPDATE tenants SET status='active', provisioned_at=unixepoch() WHERE id='tenant_123'"
```

---

### 3. Authorization Denial (403)

**Symptoms**:
- User gets 403 on endpoint they should have access to
- Logs show `authz_deny`

**Diagnosis**:
```bash
# 1. Watch denials
./scripts/watch-logs.sh deny

# 2. Check user's JWT claims
curl $WORKER_URL/whoami -H "Authorization: Bearer USER_JWT"
```

**Common Causes**:
| Error | Cause | Fix |
|-------|-------|-----|
| `role_mismatch` | User lacks required role | Verify expected roles match JWT roles |
| `tenant_mismatch` | Trying to access different tenant | User can only access their own tenant |
| `unexpected "aud" claim value` | Wrong JWT audience | Tenant-admin can't access platform routes |
| `token_revoked` | JWT has been revoked | Issue new JWT |

**Fix Steps**:
1. **Verify JWT claims** match required permissions:
   - Platform routes require `aud: "syston-admin"`, `roles: ["admin"]`
   - Tenant routes require `aud: "syston-mobile"`, `roles: ["tenant_admin", "owner"]`
2. **Check tenant ID** in JWT matches requested tenant
3. **If JWT expired**: Issue new JWT (1-year TTL for tenants)
4. **If revoked**: Remove from revocation list or issue new JWT

---

### 4. Webhook Not Triggering (Starter Plan)

**Symptoms**:
- Tenant reports content not posting
- Make.com scenario not receiving webhooks

**Diagnosis**:
```bash
# 1. Verify webhook configured
wrangler d1 execute DB --env production --command \
  "SELECT webhook_url FROM make_connections WHERE tenant_id='tenant_123'"

# 2. Check webhook calls in logs
wrangler tail --env production | grep webhook

# 3. Test webhook manually
curl -X POST "WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"test": "manual trigger"}'
```

**Common Causes**:
| Cause | Fix |
|-------|-----|
| Webhook URL wrong | Update via `/api/v1/admin/tenant/webhook` (admin only) |
| Make.com scenario paused | User must unpause in Make |
| Webhook host blocked | Add to `ALLOWED_WEBHOOK_HOSTS` in wrangler.toml |
| SSL/cert issue | Verify webhook URL uses HTTPS |

**Fix Steps**:
```bash
# Update webhook (requires platform admin JWT)
curl -X POST $WORKER_URL/api/v1/admin/tenant/webhook \
  -H "Authorization: Bearer PLATFORM_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant": "tenant_123",
    "make_webhook_url": "https://hook.us1.make.com/correct-url"
  }'
```

---

### 5. Google Sheets Not Created (Pro Plan)

**Symptoms**:
- Provisioning reports success but no spreadsheet
- Pro tenant can't see content

**Diagnosis**:
```bash
# 1. Check GAS_WEBAPP_URL is set correctly
wrangler secret list --env production

# 2. Check service account has permissions
# Verify GOOGLE_SERVICE_ACCOUNT_KEY is valid JSON

# 3. Test GAS endpoint manually
curl -X POST $GAS_WEBAPP_URL \
  -H "Content-Type: application/json" \
  -d '{"action": "provision", "tenantId": "test", "teamName": "Test"}'
```

**Common Causes**:
| Cause | Fix |
|-------|-----|
| GAS not deployed | Deploy Apps Script, update `GAS_WEBAPP_URL` |
| Service account lacks permissions | Grant `Editor` access to service account email |
| GAS timeout | Increase Apps Script timeout, retry provisioning |
| Invalid credentials | Re-download service account key, update secret |

**Fix Steps**:
1. **Verify GAS_WEBAPP_URL**: Should point to published Apps Script Web App
2. **Check service account**:
   ```bash
   # Extract service account email
   echo $GOOGLE_SERVICE_ACCOUNT_KEY | jq -r '.client_email'

   # Verify it has Editor access to Drive folder
   ```
3. **Re-queue provisioning** (see "Provisioning Stuck" above)

---

### 6. JWT Secret Compromised

**Symptoms**:
- Unauthorized JWTs being used
- Need to rotate secrets immediately

**Fix Steps** (Zero-Downtime Rotation):
```bash
# 1. Generate new secret
NEW_SECRET=$(openssl rand -base64 32)

# 2. Add as JWT_SECRET_NEXT
wrangler secret put JWT_SECRET_NEXT --env production
# Paste: $NEW_SECRET

# 3. Update verifier to accept both secrets (code change required)
# In src/services/jwt.ts:
#   const secrets = [env.JWT_SECRET, env.JWT_SECRET_NEXT].filter(Boolean);
#   // Try verifying with each secret

# 4. Deploy
wrangler deploy --env production

# 5. Wait 24 hours (allow old tokens to expire)

# 6. Promote new secret to primary
wrangler secret put JWT_SECRET --env production
# Paste: $NEW_SECRET

# 7. Remove old secret
wrangler secret delete JWT_SECRET_NEXT --env production
```

**Immediate Mitigation** (if can't wait 24h):
```bash
# Invalidate all old tokens by JWT ID (if jti tracked)
# Or: Force token cutoff by iat/nbf check
```

---

### 7. Database Connection Errors

**Symptoms**:
- 500 errors on all endpoints
- Logs show "D1 is not defined" or "Cannot read property 'prepare'"

**Diagnosis**:
```bash
# 1. Check D1 binding
wrangler d1 list

# 2. Verify binding in wrangler.toml matches
# [[env.production.d1_databases]]
# binding = "DB"
# database_id = "..."

# 3. Test query manually
wrangler d1 execute DB --env production --command "SELECT 1"
```

**Fix Steps**:
1. **Verify D1 binding** in wrangler.toml is correct
2. **Redeploy**: `wrangler deploy --env production`
3. **Check quotas**: D1 may be rate-limited (rare)
4. **Fallback**: If D1 down, return cached data or degraded service

---

### 8. High 5xx Error Rate

**Symptoms**:
- Spike in 500/502/503 errors
- Cloudflare dashboard shows increased error rate

**Diagnosis**:
```bash
# 1. Check error logs
./scripts/watch-logs.sh errors

# 2. Identify failing endpoint
wrangler tail --env production --format=json | \
  jq 'select(.logs[0].status >= 500) | .logs[0].route' | \
  sort | uniq -c | sort -rn

# 3. Check for exceptions
wrangler tail --env production --format=json | \
  jq 'select(.outcome == "exception") | .exceptions'
```

**Common Causes**:
| Cause | Fix |
|-------|-----|
| Downstream service outage | Wait for recovery, show maintenance page |
| Code regression | Rollback to last good version |
| Resource exhaustion | Scale up (Workers auto-scale, check limits) |
| Invalid configuration | Verify secrets, env vars are set |

**Fix Steps**:
```bash
# 1. Quick rollback
git checkout tags/prod-YYYYMMDDHHMM
wrangler deploy --env production

# 2. Or: Disable failing feature with flag
# (if feature flags implemented)

# 3. Alert users
# Post status update on status page
```

---

## 🚀 Deployment Procedures

### Standard Deployment

```bash
# 1. Run tests
npm test

# 2. Build
npm run build

# 3. Smoke test locally (optional)
wrangler dev
# Test /health

# 4. Deploy
wrangler deploy --env production

# 5. Verify
curl $WORKER_URL/health
./scripts/smoke-test.sh

# 6. Monitor for 10 minutes
./scripts/watch-logs.sh errors
```

### Emergency Rollback

```bash
# Option 1: Git-based rollback
git log --oneline --decorate | head -10  # Find last good commit
git checkout <commit-hash>
wrangler deploy --env production

# Option 2: Wrangler versions (if enabled)
wrangler deployments list --env production
wrangler rollback --env production --deployment-id <id>

# Verify rollback
curl $WORKER_URL/health
./scripts/smoke-test.sh
```

### Secret Rotation

```bash
# Standard rotation (no downtime required)
wrangler secret put SECRET_NAME --env production

# JWT secret rotation (see "JWT Secret Compromised" above)
```

---

## 📊 Monitoring Queries

### Count Signups Per Hour

```bash
wrangler tail --env production --format=json | \
  jq 'select(.logs[0].msg == "tenant_provision_complete") | .timestamp' | \
  cut -c1-13 | uniq -c
```

### Count Denials By Reason

```bash
wrangler tail --env production --format=json | \
  jq 'select(.logs[0].event == "authz_deny") | .logs[0].reason' | \
  sort | uniq -c | sort -rn
```

### Average Provisioning Time

```bash
# Requires timestamp diff calculation
# Track: tenant_provision_start → tenant_provision_complete
```

### Active Tenants

```bash
wrangler d1 execute DB --env production --command \
  "SELECT status, COUNT(*) FROM tenants GROUP BY status"
```

---

## 🔧 Maintenance Tasks

### Weekly
- [ ] Review authorization denial logs (check for attacks)
- [ ] Check D1 usage (approaching limits?)
- [ ] Verify backup jobs ran successfully
- [ ] Review performance metrics

### Monthly
- [ ] Rotate service credentials (Make, GAS)
- [ ] Review and prune old test tenants
- [ ] Update dependencies (`npm audit fix`)
- [ ] Test disaster recovery procedure

### Quarterly
- [ ] Rotate JWT secrets (if not automated)
- [ ] Review and update runbook
- [ ] Load test with synthetic traffic
- [ ] Security audit

---

## 📞 Escalation Paths

| Issue Severity | Response Time | Escalation |
|----------------|---------------|------------|
| P0 (Site down) | Immediate | Page on-call, CEO if needed |
| P1 (Critical feature broken) | 15 minutes | Ping platform team lead |
| P2 (Degraded) | 1 hour | Create ticket, assign |
| P3 (Minor) | Next business day | Backlog |

**On-Call Rotation**: See PagerDuty schedule
**Slack Channel**: #platform-alerts
**Status Page**: https://status.syston.app (if exists)

---

## 🧪 Testing Checklist (Pre-Deploy)

- [ ] Run full test suite: `npm test`
- [ ] Smoke test: `./scripts/smoke-test.sh`
- [ ] Manual signup test (Starter plan)
- [ ] Manual signup test (Pro plan)
- [ ] Test idempotency (re-submit signup)
- [ ] Verify JWT with `/whoami`
- [ ] Check health endpoint
- [ ] Review recent changes in git log

---

## 📚 Additional Resources

- **Architecture Docs**: `README.md`
- **Automated Signup Guide**: `AUTOMATED_SIGNUP_READY.md`
- **Security Model**: `BETA_LAUNCH_READY.md`
- **Smoke Tests**: `scripts/smoke-test.sh`
- **Log Watchers**: `scripts/watch-logs.sh`
- **Cloudflare Docs**: https://developers.cloudflare.com/workers/

---

**Remember**: Stay calm, check logs first, and rollback if unsure. 🚀
