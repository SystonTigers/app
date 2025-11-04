# 🔍 MONITORING & PRODUCTION TOOLING SETUP GUIDE

**Date**: November 4, 2025
**Purpose**: Production monitoring, error tracking, and analytics configuration

---

## 📊 OVERVIEW

This guide sets up comprehensive monitoring for your multi-tenant SaaS platform:

1. **Error Tracking** - Sentry for exceptions and crashes
2. **Performance Monitoring** - APM for API response times
3. **Analytics** - User behavior and feature usage
4. **Uptime Monitoring** - Health check and alerting
5. **Logging** - Centralized log aggregation

---

## 1. 🚨 SENTRY ERROR TRACKING

### Why Sentry?
- Real-time error tracking across mobile, backend, and web
- Source maps for readable stack traces
- Slack/email alerts for critical errors
- Performance monitoring (APM)
- Free tier: 5,000 errors/month

### Setup Instructions

#### A. Create Sentry Account
1. Go to https://sentry.io/signup/
2. Create organization: `syston-tigers` or your company name
3. Create projects:
   - **Mobile App** (React Native)
   - **Backend API** (Node.js)
   - **Web App** (Next.js/React)

#### B. Backend Setup (Cloudflare Workers)

**Install Sentry**:
```bash
cd backend
npm install @sentry/cloudflare
```

**Create `backend/src/lib/sentry.ts`**:
```typescript
import * as Sentry from '@sentry/cloudflare';

export function initSentry(env: any, ctx: ExecutionContext) {
  if (env.ENVIRONMENT !== 'production') return;

  Sentry.init({
    dsn: env.SENTRY_DSN, // Add to Wrangler secrets
    environment: env.ENVIRONMENT || 'production',
    tracesSampleRate: 0.1, // 10% of requests
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
    ],
  });
}

export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context,
  });
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}
```

**Update `backend/src/index.ts`**:
```typescript
import { initSentry, captureException } from './lib/sentry';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    initSentry(env, ctx);

    try {
      // Your router logic
      return await router.handle(request, env, ctx);
    } catch (error) {
      captureException(error as Error, {
        path: new URL(request.url).pathname,
        method: request.method,
      });
      throw error;
    }
  }
};
```

**Add Sentry DSN to secrets**:
```bash
cd backend
wrangler secret put SENTRY_DSN
# Paste your DSN from Sentry dashboard
```

---

#### C. Mobile App Setup (React Native)

**Install Sentry**:
```bash
cd mobile
npm install @sentry/react-native
npx @sentry/wizard@latest -i reactNative -p ios android
```

**Create `mobile/src/lib/sentry.ts`**:
```typescript
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

export function initSentry() {
  if (__DEV__) return; // Don't track in development

  Sentry.init({
    dsn: Constants.expoConfig?.extra?.sentryDsn,
    environment: Constants.expoConfig?.extra?.environment || 'production',
    tracesSampleRate: 0.2, // 20% of sessions
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 10000,
  });
}

export function setUser(userId: string, email?: string, tenantId?: string) {
  Sentry.setUser({
    id: userId,
    email,
    tenantId,
  });
}

export function captureError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context,
  });
}
```

**Update `mobile/app.json`**:
```json
{
  "expo": {
    "extra": {
      "sentryDsn": "YOUR_MOBILE_SENTRY_DSN",
      "environment": "production"
    }
  }
}
```

**Update `mobile/App.tsx`**:
```typescript
import { initSentry } from './src/lib/sentry';

initSentry();

function App() {
  // Your app code
}

export default Sentry.wrap(App);
```

---

#### D. Web App Setup (Next.js)

**Install Sentry**:
```bash
cd web
npx @sentry/wizard@latest -i nextjs
```

This will auto-configure Sentry for Next.js with:
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- Source maps upload

**Update `.env.local`**:
```bash
NEXT_PUBLIC_SENTRY_DSN=your_web_sentry_dsn
SENTRY_AUTH_TOKEN=your_auth_token_from_wizard
```

---

### Sentry Best Practices

1. **Tag Requests with Tenant ID**:
```typescript
Sentry.setTag('tenant_id', tenantId);
```

2. **Add User Context**:
```typescript
Sentry.setUser({ id: userId, email, username });
```

3. **Breadcrumbs for Debugging**:
```typescript
Sentry.addBreadcrumb({
  category: 'auth',
  message: 'User logged in',
  level: 'info',
});
```

4. **Performance Tracking**:
```typescript
const transaction = Sentry.startTransaction({
  name: 'POST /api/v1/posts',
  op: 'http.server',
});

// ... your code ...

transaction.finish();
```

5. **Alert Rules** (in Sentry dashboard):
   - Error rate > 1% → Slack alert
   - New error type → Email alert
   - Performance degradation → PagerDuty

---

## 2. 📈 ANALYTICS & USAGE TRACKING

### Option A: Mixpanel (Recommended)

**Why Mixpanel?**
- Event-based analytics (track user actions)
- Funnel analysis (signup → first post)
- Retention cohorts
- Free tier: 100K events/month

**Setup**:
```bash
cd mobile
npm install mixpanel-react-native
```

**Create `mobile/src/lib/analytics.ts`**:
```typescript
import { Mixpanel } from 'mixpanel-react-native';

let mixpanel: Mixpanel | null = null;

export async function initAnalytics(token: string) {
  mixpanel = new Mixpanel(token);
  await mixpanel.init();
}

export function trackEvent(event: string, properties?: Record<string, any>) {
  if (!mixpanel) return;
  mixpanel.track(event, properties);
}

export function identifyUser(userId: string, traits?: Record<string, any>) {
  if (!mixpanel) return;
  mixpanel.identify(userId);
  if (traits) mixpanel.getPeople().set(traits);
}

// Track key events
export const Events = {
  // Auth
  SIGNUP_STARTED: 'Signup Started',
  SIGNUP_COMPLETED: 'Signup Completed',
  LOGIN: 'Login',

  // Posts
  POST_CREATED: 'Post Created',
  POST_LIKED: 'Post Liked',
  POST_COMMENTED: 'Post Commented',

  // Events
  EVENT_RSVP: 'Event RSVP',
  EVENT_CHECKED_IN: 'Event Checked In',

  // Videos
  VIDEO_UPLOADED: 'Video Uploaded',
  VIDEO_WATCHED: 'Video Watched',
};
```

**Track Events**:
```typescript
// After successful signup
trackEvent(Events.SIGNUP_COMPLETED, {
  tenant_id: tenantId,
  role: userRole,
  source: 'mobile_app',
});

// After creating post
trackEvent(Events.POST_CREATED, {
  tenant_id: tenantId,
  channels: ['app', 'twitter'],
  has_image: true,
});
```

---

### Option B: PostHog (Open Source Alternative)

**Why PostHog?**
- Self-hosted option (privacy-focused)
- Session replay
- Feature flags
- A/B testing
- Free tier: 1M events/month

**Setup**:
```bash
cd mobile
npm install posthog-react-native
```

```typescript
import PostHog from 'posthog-react-native';

const posthog = await PostHog.initAsync('YOUR_API_KEY', {
  host: 'https://app.posthog.com', // or self-hosted
});

posthog.capture('Post Created', { tenant_id: tenantId });
```

---

## 3. ⏱️ UPTIME MONITORING

### UptimeRobot (Free)

**Setup**:
1. Go to https://uptimerobot.com/
2. Create monitors:
   - **Backend API Health**: `https://your-backend.workers.dev/healthz` (every 5 min)
   - **Web App**: `https://app.systontigers.co.uk` (every 5 min)
   - **Admin Console**: `https://admin.systontigers.co.uk` (every 5 min)

3. Configure alerts:
   - Email: your-email@example.com
   - Slack webhook: (optional)
   - SMS: (upgrade for SMS alerts)

4. Status page (public):
   - Create public status page
   - Share at `https://status.systontigers.co.uk`

---

### Better Uptime (Recommended for Production)

**Why Better Uptime?**
- More sophisticated checks (API response validation)
- On-call scheduling
- Incident management
- Status page with historical uptime
- Slack/PagerDuty integration

**Pricing**: $10/month for 10 monitors

**Setup**:
1. https://betteruptime.com/
2. Create monitors with assertions:
   ```yaml
   Monitor: Backend Health Check
   URL: https://your-backend.workers.dev/healthz
   Frequency: 30 seconds
   Assertion: response.status == 200 && response.json.status == "ok"
   Alert: Email + Slack after 2 failures
   ```

---

## 4. 📊 PERFORMANCE MONITORING (APM)

### Cloudflare Analytics (Built-in)

**Setup**: Automatically enabled for Workers

**Dashboard**: https://dash.cloudflare.com → Workers & Pages → Your Worker → Analytics

**Metrics**:
- Requests per second
- CPU time (p50, p95, p99)
- Errors rate
- Edge caching hit rate

**Alerts** (Cloudflare Notifications):
1. Go to Notifications in Cloudflare dashboard
2. Create alert: "Worker Errors > 1%"
3. Send to email/webhook

---

### Datadog RUM (Recommended for Mobile)

**Why Datadog?**
- Real User Monitoring (RUM) for mobile apps
- Session replay
- App performance metrics (screen load time, network requests)
- Crash reporting integration

**Setup**:
```bash
cd mobile
npm install @datadog/mobile-react-native
```

```typescript
import { DdSdkReactNative, DdSdkReactNativeConfiguration } from '@datadog/mobile-react-native';

const config = new DdSdkReactNativeConfiguration(
  'YOUR_CLIENT_TOKEN',
  'production',
  'YOUR_APPLICATION_ID',
  true, // track User interactions
  true, // track XHR Resources
  true  // track Errors
);

DdSdkReactNative.initialize(config);
```

**Pricing**: Free tier (10K sessions/month)

---

## 5. 🗂️ LOG AGGREGATION

### Option A: Cloudflare Tail (Built-in)

**Real-time logs**:
```bash
wrangler tail
```

**Stream to external service**:
```bash
wrangler tail --format json | jq .
```

---

### Option B: Logflare (Recommended)

**Why Logflare?**
- Built for Cloudflare Workers
- SQL queries on logs
- Dashboards and alerts
- Free tier: 15 GB/month

**Setup**:
1. https://logflare.app/
2. Create source: "Backend Workers"
3. Get source token

**Update `backend/wrangler.toml`**:
```toml
[[logpush]]
enabled = true
destination = "https://logflare.app/logs/source/YOUR_SOURCE_TOKEN"
```

**Or use middleware**:
```typescript
import { logJSON } from './lib/log';

router.all('*', async (request, env, ctx) => {
  const start = Date.now();
  const response = await router.handle(request, env, ctx);
  const ms = Date.now() - start;

  logJSON({
    level: 'info',
    msg: 'request_end',
    path: new URL(request.url).pathname,
    status: response.status,
    ms,
  });

  return response;
});
```

---

### Option C: Axiom (High Scale)

**Why Axiom?**
- Serverless log storage
- Lightning-fast queries
- Alerts and dashboards
- Free tier: 500 GB/month

**Setup**: https://axiom.co/

---

## 6. 🎯 MONITORING DASHBOARD

### Create Custom Dashboard (Grafana)

**Setup**:
1. Use Grafana Cloud (free tier)
2. Connect data sources:
   - Cloudflare Workers (via API)
   - Sentry (errors)
   - UptimeRobot (uptime)

**Example Dashboard**:
```yaml
Dashboard: Syston Tigers Production
Panels:
  - API Response Time (p50, p95, p99)
  - Error Rate (last 24h)
  - Requests per Minute
  - Uptime (last 7 days)
  - Active Users (mobile app)
  - Tenant Count
  - Top Errors (from Sentry)
```

---

## 7. 🔔 ALERTING STRATEGY

### Critical Alerts (Wake Up at Night)
- API uptime < 99% (5 min window)
- Error rate > 5% (5 min window)
- Mobile app crash rate > 1%
- Database (KV) errors

**Action**: PagerDuty → On-call rotation

---

### Warning Alerts (Check in Morning)
- API response time p95 > 1 second
- Error rate > 1%
- Unusual traffic spike (10x normal)
- Disk space > 80% (R2 storage)

**Action**: Slack notification

---

### Info Alerts (Weekly Review)
- New tenant signup
- High user engagement (daily active users up)
- Performance improvement detected

**Action**: Email summary

---

## 8. 📝 MONITORING CHECKLIST

### Before Launch ✅
- [ ] Sentry configured for backend, mobile, web
- [ ] Uptime monitoring on 3 endpoints
- [ ] Cloudflare Analytics reviewed
- [ ] Analytics tracking key events (signup, post, RSVP)
- [ ] Error alerts to Slack
- [ ] Status page created

### Week 1 Post-Launch 🚀
- [ ] Review Sentry errors daily
- [ ] Check uptime dashboard daily
- [ ] Monitor API response times
- [ ] Track user engagement metrics
- [ ] Set up weekly metrics email

### Month 1 Post-Launch 📊
- [ ] Analyze user funnels (signup → first post)
- [ ] Identify and fix top errors
- [ ] Optimize slow endpoints
- [ ] Set up alerting thresholds based on real data
- [ ] Create custom dashboards

---

## 9. 💰 COST ESTIMATE

| Service | Tier | Cost |
|---------|------|------|
| Sentry | Free | $0/month |
| Mixpanel | Free | $0/month (< 100K events) |
| UptimeRobot | Free | $0/month (50 monitors) |
| Cloudflare Analytics | Included | $0/month |
| Logflare | Free | $0/month (15 GB) |
| **Total** | | **$0/month** |

**Upgrade Path** (at scale):
- Sentry Team: $26/month (500K errors)
- Better Uptime: $10/month
- Mixpanel Growth: $25/month (1M events)
- Datadog RUM: $15/month (100K sessions)

**Total at scale**: ~$76/month

---

## 10. 🎓 MONITORING BEST PRACTICES

1. **Start Simple**
   - Don't over-instrument on day 1
   - Add monitoring as you encounter issues

2. **Focus on User Impact**
   - Track: Can users sign up? Can users post? Can users RSVP?
   - Not: Internal system metrics that don't affect users

3. **Alert Fatigue**
   - Only alert on actionable issues
   - Use Slack for warnings, PagerDuty for critical

4. **Weekly Review**
   - Every Monday: Review last week's errors and uptime
   - Fix top 3 issues

5. **Tag Everything**
   - Tenant ID on every log and error
   - Helps isolate issues to specific clubs

---

## 🚀 QUICK START (Next 30 Minutes)

**Bare Minimum for Launch**:

1. **Set up Sentry** (10 min):
   ```bash
   # Backend
   cd backend && npm install @sentry/cloudflare
   wrangler secret put SENTRY_DSN
   # Add initSentry() to index.ts
   ```

2. **Set up UptimeRobot** (5 min):
   - Create account
   - Add backend health check monitor
   - Add email alert

3. **Enable Cloudflare Analytics** (2 min):
   - Already enabled, just review dashboard

4. **Test Error Tracking** (5 min):
   ```bash
   # Throw test error
   curl -X POST https://your-backend.workers.dev/test-error
   # Check Sentry dashboard for error
   ```

5. **Track First Event** (5 min):
   ```typescript
   // In mobile app after signup
   Sentry.captureMessage('User signed up successfully');
   ```

**Done!** You now have basic monitoring. Expand over time.

---

## 📧 SUPPORT

Questions about monitoring setup?
- Sentry Docs: https://docs.sentry.io/
- Cloudflare Workers Logs: https://developers.cloudflare.com/workers/observability/logging/
- Mixpanel Docs: https://developer.mixpanel.com/

---

**Generated by**: Claude Code
**Date**: November 4, 2025
**Version**: 1.0
