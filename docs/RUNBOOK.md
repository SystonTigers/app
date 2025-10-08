# Operations Runbook

## Overview

This runbook provides step-by-step procedures for operating and maintaining the SystonApp platform in production.

## Daily Operations

### Morning Checks (5 minutes)
```bash
# 1. Check backend health
curl https://syston-postbus.YOUR-DOMAIN.workers.dev/health

# 2. Check video processor
docker-compose ps

# 3. Check Apps Script logs
# Open Google Apps Script → View → Logs

# 4. Verify Make.com scenarios running
# Open Make.com dashboard → Check last execution
```

**Expected Results**:
- Backend: 200 OK response
- Docker: All containers "Up"
- Apps Script: No errors in last 24h
- Make.com: Last run < 1 hour ago

### Weekly Tasks (30 minutes)

**Monday**: Review content calendar
- Check weekly scheduler ran successfully
- Verify posts scheduled for the week
- Review any failed posts

**Wednesday**: Performance check
- Check API response times
- Review video processing queue
- Check storage usage (R2)

**Friday**: Security audit
- Review access logs
- Check for failed authentication attempts
- Update secrets if needed

## Incident Response

### Severity Levels

**P0 - Critical**: Mobile app down, complete outage
**P1 - High**: Feature broken, affecting >50% users
**P2 - Medium**: Degraded performance, affecting <50% users
**P3 - Low**: Minor issue, cosmetic, no user impact

### P0: Mobile App Down

**Symptoms**: App won't load, API returns 500 errors

**Immediate Actions**:
```bash
# 1. Check backend status
wrangler tail syston-postbus

# 2. Check recent deployments
wrangler deployments list

# 3. Rollback if needed
wrangler rollback --message "Rollback due to outage"

# 4. Notify users (if >15 min)
# Post to social media: "We're experiencing technical issues..."
```

**Resolution Steps**:
1. Identify root cause (check logs)
2. Apply fix or rollback
3. Verify app loads
4. Post-mortem within 24h

**SLA**: Resolve within 1 hour

### P1: Video Upload Failing

**Symptoms**: Users report upload errors, 413/500 responses

**Debugging**:
```bash
# 1. Check R2 bucket access
wrangler r2 bucket list

# 2. Check storage quota
wrangler r2 bucket usage syston-videos

# 3. Check recent uploads
curl -H "Authorization: Bearer JWT" \
  https://syston-postbus.YOUR-DOMAIN.workers.dev/api/v1/videos?limit=10

# 4. Check Docker processor
docker-compose logs video-processor
```

**Common Causes**:
- Storage quota exceeded → Increase quota or clean old videos
- R2 bucket permissions → Fix binding in wrangler.toml
- File size limit → Increase limit in worker config
- Docker processor down → Restart containers

**Resolution**: Fix root cause, test with sample upload

**SLA**: Resolve within 4 hours

### P1: Social Media Posts Not Publishing

**Symptoms**: Posts not appearing on X/Instagram/Facebook

**Debugging**:
1. Check Make.com scenario status
2. Check webhook logs in Apps Script
3. Verify social media API tokens valid
4. Test webhook manually

```bash
# Test webhook
curl -X POST https://hook.us1.make.com/YOUR_WEBHOOK \
  -H "Content-Type: application/json" \
  -d '{
    "type": "test",
    "content": "Test post from runbook"
  }'
```

**Common Causes**:
- Expired OAuth token → Refresh in Make.com
- Webhook URL changed → Update in Apps Script config
- Rate limit hit → Wait and retry, adjust posting frequency
- Invalid content format → Check JSON structure

**Resolution**: Fix auth/config, requeue failed posts

**SLA**: Resolve within 4 hours

### P2: Video Processing Slow

**Symptoms**: Processing takes >30 min for 10-min video

**Debugging**:
```bash
# Check queue depth
curl http://localhost:8080/api/queue/status

# Check worker CPU/memory
docker stats

# Check processing logs
docker-compose logs -f worker
```

**Actions**:
- Scale workers: `docker-compose up -d --scale worker=5`
- Lower video quality in config
- Check for stuck jobs
- Restart Docker if memory leak suspected

**SLA**: Resolve within 24 hours

### P3: Birthday Post Didn't Send

**Symptoms**: Birthday automation missed a player

**Debugging**:
1. Check Apps Script logs for runDailyBirthdayAutomation
2. Verify roster sheet has correct birthdays
3. Check sent birthday log for duplicates

**Resolution**:
- Manual post if needed
- Fix roster data
- Re-run automation: `runDailyBirthdayAutomation()`

**SLA**: Resolve within 48 hours

## Deployment Procedures

### Deploy Backend Worker

**Pre-deployment**:
```bash
# 1. Run tests
cd backend
npm test

# 2. Check current version
wrangler deployments list

# 3. Backup KV data (if schema changes)
wrangler kv:key list --namespace-id=YOUR_NS_ID > kv_backup_$(date +%Y%m%d).json
```

**Deployment**:
```bash
# 1. Deploy to staging first (if available)
wrangler deploy --env staging

# 2. Test staging
curl https://syston-postbus-staging.YOUR-DOMAIN.workers.dev/health

# 3. Deploy to production
wrangler deploy

# 4. Verify deployment
curl https://syston-postbus.YOUR-DOMAIN.workers.dev/health

# 5. Monitor logs for 10 minutes
wrangler tail syston-postbus
```

**Rollback** (if issues):
```bash
wrangler rollback --message "Rollback due to [issue]"
```

### Deploy Mobile App

**Pre-deployment**:
```bash
cd mobile

# 1. Run tests
npm test

# 2. Update version in app.json
# Increment version and buildNumber

# 3. Test on physical device
npx expo start
```

**Build**:
```bash
# 1. Build for TestFlight (iOS)
eas build --profile preview --platform ios

# 2. Build for Internal Testing (Android)
eas build --profile preview --platform android

# 3. Test builds thoroughly

# 4. Build for production
eas build --profile production --platform all
```

**Submit**:
```bash
# iOS (requires Apple Developer account)
eas submit --platform ios

# Android (requires Google Play account)
eas submit --platform android
```

**Timeline**:
- TestFlight: Available in ~30 minutes
- Google Play Internal: Available in ~2 hours
- App Store review: 1-3 days
- Google Play review: Few hours to 1 day

### Deploy Apps Script

**Deployment**:
```bash
# 1. Test locally first
clasp run testAllFunctions

# 2. Push to production
clasp push

# 3. Verify deployment
clasp open
# Check version in Apps Script UI

# 4. Test critical functions
# Run weekly scheduler manually
# Run historical import with test CSV
```

**Rollback**:
```bash
# Apps Script doesn't have rollback
# Must manually revert code changes
clasp pull --versionNumber PREVIOUS_VERSION
clasp push
```

### Deploy Video Processor

**Deployment**:
```bash
cd video-processing/football-highlights-processor

# 1. Build new images
docker-compose build

# 2. Stop old containers
docker-compose down

# 3. Start new containers
docker-compose up -d --scale worker=3

# 4. Verify health
docker-compose ps
curl http://localhost:8080/health

# 5. Monitor logs
docker-compose logs -f
```

## Monitoring & Alerts

### Key Metrics

**Backend (Cloudflare)**:
- Request rate: Target <1000/min per tenant
- Error rate: Target <1%
- P95 latency: Target <200ms
- KV read/write: Monitor quota

**Video Processing**:
- Queue depth: Alert if >10
- Processing time: Alert if >2x expected
- Success rate: Alert if <95%
- Storage usage: Alert at 80% quota

**Mobile App**:
- Crash rate: Target <1%
- API error rate: Target <2%
- App load time: Target <3 seconds

### Setting Up Alerts

**Cloudflare Workers**:
1. Go to Cloudflare Dashboard
2. Workers → Triggers → Email alerts
3. Set thresholds for errors, latency

**Docker Processor**:
```bash
# Use external monitoring service (e.g., UptimeRobot)
# Monitor: http://YOUR-SERVER-IP:8080/health
# Alert on: Down, Response time >5s
```

**Make.com**:
1. Enable email notifications per scenario
2. Alert on: Execution failed, Rate limit hit

## Backup & Recovery

### Backup Procedures

**Daily Backups**:
```bash
# 1. KV data
wrangler kv:key list --namespace-id=YOUR_NS_ID > \
  backups/kv_$(date +%Y%m%d).json

# 2. Apps Script code
clasp pull
tar -czf backups/apps-script_$(date +%Y%m%d).tar.gz .
```

**Weekly Backups**:
```bash
# 1. R2 storage (videos)
wrangler r2 object list syston-videos > \
  backups/r2_inventory_$(date +%Y%m%d).txt

# 2. Database exports (if using DB in future)
# 3. Configuration files
tar -czf backups/config_$(date +%Y%m%d).tar.gz backend/wrangler.toml
```

**Backup Retention**:
- Daily: Keep 7 days
- Weekly: Keep 4 weeks
- Monthly: Keep 12 months

### Recovery Procedures

**Recover KV Data**:
```bash
# 1. Restore from backup JSON
cat backups/kv_20251007.json | while read line; do
  key=$(echo $line | jq -r '.key')
  # Restore each key individually
done
```

**Recover R2 Videos**:
```bash
# If using R2 replication (recommended)
# Videos are automatically replicated to backup bucket
# Otherwise, restore from local backup
```

**Recover Apps Script**:
```bash
# 1. Extract backup
tar -xzf backups/apps-script_20251007.tar.gz

# 2. Push to Apps Script
clasp push

# 3. Verify restoration
clasp open
```

## Maintenance Windows

**Preferred Time**: Tuesday 2-4 AM UTC (off-peak)

**Communication**:
1. Notify via social media 24h in advance
2. Show in-app banner 24h in advance
3. Send push notification 1h before
4. Update status page

**During Maintenance**:
1. Set API to maintenance mode (503 response)
2. Show maintenance page in mobile app
3. Perform upgrades/changes
4. Run smoke tests
5. Resume service
6. Monitor for 1 hour

## Security Procedures

### Rotate Secrets

**Quarterly** or if suspected compromise:

```bash
# 1. Generate new secret
NEW_SECRET=$(openssl rand -base64 32)

# 2. Update in Cloudflare
wrangler secret put JWT_SECRET
# Enter new secret

# 3. Update Apps Script properties
# Apps Script → Project Settings → Script Properties

# 4. Update Make.com webhooks
# Regenerate webhook URLs in Make.com

# 5. Test authentication
curl -H "Authorization: Bearer OLD_JWT" https://... # Should fail
curl -H "Authorization: Bearer NEW_JWT" https://... # Should succeed
```

### Access Audit

**Monthly**:
1. Review Cloudflare team members
2. Review Apps Script sharing settings
3. Review Make.com team access
4. Review GitHub repository access
5. Remove any unnecessary access

### Vulnerability Response

If security vulnerability reported:

1. **Assess severity** (use CVSS score)
2. **Immediate mitigation** if critical (disable feature, rate limit)
3. **Develop fix** and test thoroughly
4. **Deploy fix** following deployment procedures
5. **Notify users** if data exposure possible
6. **Post-mortem** within 48 hours

## Scaling Procedures

### Add New Tenant

**Time**: 5 minutes per tenant

```bash
# 1. Create tenant via API
curl -X POST https://admin-worker.YOUR-DOMAIN.workers.dev/api/v1/admin/tenants \
  -H "Authorization: Bearer ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "new-club",
    "name": "New Club FC",
    "primary_color": "#FF0000",
    "webhook_url": "https://hook.us1.make.com/NEW_WEBHOOK"
  }'

# 2. No deployment needed - tenant is live immediately

# 3. Create Make.com scenario for tenant (manual)

# 4. Verify tenant access
curl https://syston-postbus.YOUR-DOMAIN.workers.dev/api/v1/feed?tenant=new-club
```

### Scale Video Processing

**When queue >10 or processing time >2x expected**:

```bash
# Scale to 5 workers
docker-compose up -d --scale worker=5

# Or upgrade VPS if CPU/memory maxed
# DigitalOcean: Resize droplet to higher tier
```

### Increase Storage Quota

**When R2 usage >80%**:

```bash
# 1. Check current usage
wrangler r2 bucket usage syston-videos

# 2. Clean old videos (if appropriate)
# Delete videos >6 months old

# 3. Increase quota (automatic with Cloudflare billing)
# No action needed - Cloudflare charges per GB used
```

## Support Escalation

### Level 1: User Support (Response: 24h)
- Password resets
- How-to questions
- Feature requests
- General troubleshooting

### Level 2: Technical Issues (Response: 4h)
- App crashes
- Upload failures
- Sync issues
- Performance problems

### Level 3: Critical Incidents (Response: 1h)
- Complete outages
- Data loss
- Security breaches
- Major bugs affecting >50% users

### Contact Procedures

**Internal Team**:
- Slack: #syston-tigers-ops
- Email: ops@systontigers.com
- On-call phone: [NUMBER]

**External Services**:
- Cloudflare Support: support.cloudflare.com
- Expo Support: forums.expo.dev
- Make.com Support: support.make.com

## Useful Commands

```bash
# Backend
wrangler tail syston-postbus --format pretty
wrangler kv:key list --namespace-id=YOUR_NS_ID
wrangler deployments list
wrangler rollback

# Mobile App
eas build:list
eas submit --platform ios --latest
npx expo start --clear

# Video Processing
docker-compose ps
docker-compose logs -f worker
docker-compose restart worker
docker stats

# Apps Script
clasp logs
clasp run testFunction
clasp push
clasp open
```

## Change Log

All operational changes should be logged here:

| Date | Change | Author | Impact |
|------|--------|--------|--------|
| 2025-10-07 | Initial runbook created | Clayton | N/A |
| | | | |
