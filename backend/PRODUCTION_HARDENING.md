# 🔒 Production Hardening Guide

**Status**: Recommended for Day 1
**Priority**: High (Rate Limiting), Medium (Others)
**Time to Implement**: 2-4 hours total

---

## 1. Rate Limiting (CRITICAL - Day 1)

### Cloudflare WAF Rules

Add these rate limiting rules in Cloudflare Dashboard → Security → WAF → Rate limiting rules:

#### Rule 1: Signup Endpoint Protection
```
Name: signup-rate-limit
Expression: (http.request.uri.path contains "/public/signup/")
Characteristics: IP Address
Period: 60 seconds
Requests: 10
Action: Block
Duration: 600 seconds (10 minutes)
```

**Why**: Prevents signup spam, credential stuffing attacks

#### Rule 2: Internal Provision Protection
```
Name: internal-provision-limit
Expression: (http.request.uri.path contains "/internal/provision/")
Characteristics: IP Address
Period: 60 seconds
Requests: 30
Action: Block
Duration: 300 seconds
```

**Why**: Prevents provisioning queue flooding

#### Rule 3: Auth Endpoint Protection
```
Name: auth-rate-limit
Expression: (http.request.uri.path contains "/public/magic/" or http.request.uri.path contains "/api/v1/auth/")
Characteristics: IP Address
Period: 60 seconds
Requests: 20
Action: Challenge (CAPTCHA)
Duration: 300 seconds
```

**Why**: Prevents credential enumeration, brute force attacks

### In-App Rate Limiting (Optional)

Add to `src/middleware/rateLimit.ts`:

```typescript
// Per-tenant rate limiting (already exists via TenantRateLimiter DO)
// Add per-endpoint limits:

const RATE_LIMITS = {
  '/public/signup/start': { requests: 3, window: 3600 }, // 3 signups per hour per IP
  '/public/signup/brand': { requests: 10, window: 60 },
  '/public/signup/starter/make': { requests: 10, window: 60 },
  '/api/v1/events': { requests: 100, window: 60 }, // 100 events per minute per tenant
};
```

---

## 2. Secret Rotation & Management

### JWT Secret Rotation (Zero-Downtime)

**Current**: Single `JWT_SECRET`
**Recommended**: Dual-key rotation

#### Implementation:

**Step 1**: Add support for `JWT_SECRET_NEXT` in `src/services/jwt.ts`:

```typescript
// Modify getJwtSecret() to try both secrets
function getJwtSecrets(env: any): Uint8Array[] {
  const secrets = [];
  if (env.JWT_SECRET) secrets.push(parseSecret(env.JWT_SECRET));
  if (env.JWT_SECRET_NEXT) secrets.push(parseSecret(env.JWT_SECRET_NEXT));
  return secrets;
}

// Modify verifyJWT() to try all secrets
export async function verifyJWT(token: string, env: any): Promise<Claims> {
  const secrets = getJwtSecrets(env);
  let lastError: any;

  for (const secret of secrets) {
    try {
      const { payload } = await jwtVerify(token, secret, {
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
        clockTolerance: 10,
      });
      return normalizeClaims(payload as RawClaims);
    } catch (error) {
      lastError = error;
      // Try next secret
    }
  }

  throw lastError; // All secrets failed
}
```

**Step 2**: Rotation procedure:
```bash
# 1. Generate new secret
NEW_SECRET=$(openssl rand -base64 48)

# 2. Add as NEXT
wrangler secret put JWT_SECRET_NEXT --env production
# Paste: $NEW_SECRET

# 3. Deploy (now accepts both secrets)
wrangler deploy --env production

# 4. Wait 24 hours (old tokens expire - 1 year for tenant tokens, but new ones issued daily)

# 5. Promote to primary
wrangler secret put JWT_SECRET --env production
# Paste: $NEW_SECRET

# 6. Remove old NEXT
wrangler secret delete JWT_SECRET_NEXT --env production
```

**Schedule**: Rotate every 90 days

### Service Account Rotation

```bash
# Google Service Account (every 6 months)
1. Create new service account in Google Cloud Console
2. Download new JSON key
3. Grant Editor access to Drive folders
4. Update secret:
   wrangler secret put GOOGLE_SERVICE_ACCOUNT_KEY --env production
5. Test: curl GAS_WEBAPP_URL with test payload
6. Revoke old service account

# Supabase (every 6 months)
1. Generate new service role key in Supabase dashboard
2. Update secret:
   wrangler secret put SUPABASE_SERVICE_ROLE --env production
3. Test: curl SUPABASE_URL with new key
4. Revoke old key
```

---

## 3. CORS & CSP Headers

### CORS Configuration

**Current**: Permissive CORS in development
**Recommended**: Strict per-environment CORS

Add to `src/middleware/cors.ts`:

```typescript
// Production CORS - strict allowlist
const PRODUCTION_ORIGINS = [
  'https://syston.app',
  'https://www.syston.app',
  'https://admin.syston.app',
];

// Development CORS - localhost only
const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'capacitor://localhost',
];

export function getAllowedOrigins(env: any): string[] {
  if (env.ENVIRONMENT === 'production') {
    return PRODUCTION_ORIGINS;
  }
  return DEV_ORIGINS;
}

// In corsHeaders():
const allowedOrigins = getAllowedOrigins(env);
const origin = request.headers.get('origin');

if (origin && allowedOrigins.includes(origin)) {
  headers.set('Access-Control-Allow-Origin', origin);
} else {
  headers.set('Access-Control-Allow-Origin', allowedOrigins[0]); // Fallback to first
}
```

### Content Security Policy

Add to `src/middleware/securityHeaders.ts`:

```typescript
export function withCSP(headers: Headers): Headers {
  headers.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'", // Needed for some analytics
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://script.google.com",
    "frame-ancestors 'none'", // Prevent clickjacking
  ].join('; '));

  return headers;
}
```

Apply to all responses:
```typescript
return new Response(body, withSecurity(withCSP({ status: 200, headers })));
```

---

## 4. Database Backups (CRITICAL)

### D1 Backup Strategy

**Recommended**: Daily automated backups

#### Option A: Scheduled Cron Worker

Create `src/cron/backup-d1.ts`:

```typescript
export async function backupD1(env: Env): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // Export critical tables
  const tables = ['tenants', 'tenant_brand', 'make_connections', 'pro_automation'];

  for (const table of tables) {
    const rows = await env.DB.prepare(`SELECT * FROM ${table}`).all();

    // Store in R2 or KV
    await env.R2_BACKUPS.put(
      `d1-backup/${timestamp}/${table}.json`,
      JSON.stringify(rows.results, null, 2)
    );

    console.log(`[Backup] ${table}: ${rows.results.length} rows`);
  }

  console.log(`[Backup] Complete: ${timestamp}`);
}
```

Add to `wrangler.toml`:

```toml
[triggers]
crons = ["0 3 * * *"]  # Every day at 3 AM UTC
```

In `src/index.ts`:

```typescript
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(backupD1(env));
  },
  // ... existing fetch handler
}
```

#### Option B: Manual Backup Script

```bash
# scripts/backup-d1.sh
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="backups/d1-$DATE"
mkdir -p "$BACKUP_DIR"

tables=("tenants" "tenant_brand" "make_connections" "pro_automation")

for table in "${tables[@]}"; do
  wrangler d1 execute DB --env production \
    --command "SELECT * FROM $table" \
    --json > "$BACKUP_DIR/$table.json"
  echo "Backed up $table"
done

echo "Backup complete: $BACKUP_DIR"

# Upload to S3/R2 (optional)
# aws s3 cp "$BACKUP_DIR" s3://backups/d1/ --recursive
```

**Schedule**: Run daily via GitHub Actions or cron

### KV Backup Strategy

```bash
# scripts/backup-kv.sh
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="backups/kv-$DATE"
mkdir -p "$BACKUP_DIR"

# List all keys
wrangler kv:key list --namespace-id $KV_IDEMP_ID --env production \
  > "$BACKUP_DIR/keys.json"

# Dump all values (be careful with size)
cat "$BACKUP_DIR/keys.json" | jq -r '.[].name' | while read key; do
  wrangler kv:key get "$key" --namespace-id $KV_IDEMP_ID --env production \
    > "$BACKUP_DIR/$(echo $key | sed 's/[\/:]/_/g').json"
done

echo "Backup complete: $BACKUP_DIR"
```

**Schedule**: Run weekly

### Restore Procedure

```bash
# Restore D1 from backup
cat backups/d1-YYYYMMDD/tenants.json | \
  jq -r '.[] | [.id, .slug, .name, .email] | @csv' | \
  while IFS=, read -r id slug name email; do
    wrangler d1 execute DB --env production --command \
      "INSERT INTO tenants (id, slug, name, email) VALUES ('$id', '$slug', '$name', '$email')"
  done

# Restore KV
for file in backups/kv-YYYYMMDD/*.json; do
  key=$(basename "$file" .json | sed 's/_/\//g')
  value=$(cat "$file")
  wrangler kv:key put "$key" "$value" --namespace-id $KV_IDEMP_ID --env production
done
```

---

## 5. Compatibility Date Management

### Current Setup
```toml
compatibility_date = "2024-11-01"
```

### Recommended: Testing Future Dates

Add to CI/CD pipeline (`.github/workflows/test.yml`):

```yaml
name: Test Future Compatibility

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday

jobs:
  test-future-compat:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Test with future date
        run: |
          # Temporarily update compatibility_date
          FUTURE_DATE=$(date -d "+90 days" +%Y-%m-%d)
          sed -i "s/compatibility_date = .*/compatibility_date = \"$FUTURE_DATE\"/" wrangler.toml

          # Run tests
          npm test

          # If tests fail, create issue
          if [ $? -ne 0 ]; then
            gh issue create --title "Compatibility date $FUTURE_DATE breaks tests" \
              --body "Tests failed with future compatibility date. Review runtime changes."
          fi
```

### Update Schedule
- Review quarterly
- Test new date in staging first
- Update production after 2 weeks of testing

---

## 6. Logging & Observability

### Log Aggregation (Recommended)

#### Option A: Logtail (Easiest)

```typescript
// src/lib/logtail.ts
export async function sendToLogtail(env: any, log: any): Promise<void> {
  if (!env.LOGTAIL_TOKEN) return;

  await fetch('https://in.logtail.com/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.LOGTAIL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(log),
  });
}

// In logJSON():
export function logJSON(data: any) {
  console.log(JSON.stringify(data));

  // Also send to Logtail in production
  if (env.ENVIRONMENT === 'production') {
    ctx.waitUntil(sendToLogtail(env, data));
  }
}
```

**Setup**:
```bash
wrangler secret put LOGTAIL_TOKEN --env production
```

#### Option B: Datadog

```typescript
// src/lib/datadog.ts
export async function sendToDatadog(env: any, log: any): Promise<void> {
  if (!env.DATADOG_API_KEY) return;

  await fetch(`https://http-intake.logs.datadoghq.com/api/v2/logs?dd-api-key=${env.DATADOG_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ddsource: 'cloudflare-workers',
      ddtags: `env:production,service:syston-backend`,
      message: log.msg,
      ...log,
    }),
  });
}
```

### Metrics (Optional)

```typescript
// Track key metrics
export async function trackMetric(env: any, metric: string, value: number, tags: Record<string, string>) {
  // Send to Analytics Engine or external service
  await fetch('https://your-metrics-endpoint.com/v1/metrics', {
    method: 'POST',
    body: JSON.stringify({ metric, value, tags, timestamp: Date.now() }),
  });
}

// Usage:
await trackMetric(env, 'signup.success', 1, { plan: 'starter' });
await trackMetric(env, 'provisioning.duration_ms', 4500, { tenant: tenantId });
```

---

## 7. Feature Flags (Quick Kill Switch)

### Implementation

```typescript
// src/lib/featureFlags.ts
export async function isFeatureEnabled(env: any, feature: string): Promise<boolean> {
  const flags = await env.KV_IDEMP.get('feature_flags', 'json') || {};
  return flags[feature] !== false; // Default: enabled
}

// Usage in routes:
if (!(await isFeatureEnabled(env, 'signup_enabled'))) {
  return json({
    success: false,
    error: { code: 'MAINTENANCE', message: 'Signups temporarily disabled' }
  }, 503, corsHdrs);
}
```

### Toggle Features

```bash
# Disable signups (emergency)
wrangler kv:key put "feature_flags" '{"signup_enabled":false}' \
  --namespace-id $KV_IDEMP_ID --env production

# Re-enable
wrangler kv:key put "feature_flags" '{"signup_enabled":true}' \
  --namespace-id $KV_IDEMP_ID --env production
```

---

## 8. Security Headers (Comprehensive)

Update `src/middleware/securityHeaders.ts`:

```typescript
export function withSecurity(opts: ResponseInit): ResponseInit {
  const headers = new Headers(opts.headers);

  // Existing headers
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Add these:
  headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  headers.set('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');

  // CSP (see Section 3)
  headers.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' https://*.supabase.co",
    "frame-ancestors 'none'",
  ].join('; '));

  return { ...opts, headers };
}
```

---

## 9. Input Validation Hardening

### Add Additional Checks

```typescript
// src/lib/validation.ts

// Email validation (beyond Zod)
export function validateEmailMX(email: string): Promise<boolean> {
  // Optional: Check MX records to verify domain accepts email
  // Prevents typo-squatting, fake domains
}

// Slug validation (prevent SQL injection, XSS)
export function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 50);
}

// Webhook URL validation
export function validateWebhookURL(url: string, allowedHosts: string[]): boolean {
  try {
    const parsed = new URL(url);

    // Must be HTTPS
    if (parsed.protocol !== 'https:') return false;

    // Must be in allowlist
    if (!allowedHosts.some(host => parsed.hostname.endsWith(host))) return false;

    // No private IPs
    if (isPrivateIP(parsed.hostname)) return false;

    return true;
  } catch {
    return false;
  }
}

function isPrivateIP(hostname: string): boolean {
  // Block 127.x, 10.x, 192.168.x, 172.16-31.x, localhost
  const privateRanges = [
    /^127\./,
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^localhost$/i,
  ];

  return privateRanges.some(range => range.test(hostname));
}
```

---

## 10. Monitoring SLOs & Alerts

### Define SLOs

```yaml
# SLOs (Service Level Objectives)
availability:
  target: 99.9%
  window: 30 days

error_rate:
  target: < 1%
  window: 1 hour

signup_latency:
  target: p95 < 500ms
  window: 5 minutes

provisioning_success:
  target: > 95%
  window: 1 day
```

### Set Up Alerts

```bash
# Cloudflare Workers Analytics
# Dashboard → Analytics → Create Alert

# Alert 1: High Error Rate
Metric: HTTP 5xx Errors
Threshold: > 10 in 5 minutes
Action: Email + PagerDuty

# Alert 2: Slow Responses
Metric: p95 Duration
Threshold: > 1000ms for 5 minutes
Action: Email

# Alert 3: Many Authorization Denials
Metric: Custom (filter logs for authz_deny)
Threshold: > 100 in 10 minutes
Action: Email (possible attack)
```

---

## Summary Checklist

### Must-Have (Day 1)
- [ ] **Rate limiting** on signup endpoints (Cloudflare WAF)
- [ ] **JWT secret rotation** procedure documented
- [ ] **CORS** restricted to production domains
- [ ] **Security headers** comprehensive
- [ ] **Daily D1 backups** automated

### Should-Have (Week 1)
- [ ] **Log aggregation** (Logtail/Datadog)
- [ ] **Feature flags** for kill switch
- [ ] **Monitoring alerts** configured
- [ ] **Weekly KV backups**
- [ ] **CSP headers** strict

### Nice-to-Have (Month 1)
- [ ] **Metrics tracking** (Analytics Engine)
- [ ] **Email MX validation**
- [ ] **Compatibility date testing** in CI
- [ ] **Vulnerability scanning** (Snyk, Dependabot)
- [ ] **Penetration testing** (external)

---

**Total Time**: 2-4 hours for Day 1 essentials
**Impact**: Significantly reduces risk of common attacks, improves observability

**Ship securely!** 🔒🚀
