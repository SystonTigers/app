# 🚀 Phase 5: Performance & Load Testing - Complete Guide

**Date**: November 4, 2025
**Status**: 📋 **READY FOR EXECUTION**

---

## 📊 EXECUTIVE SUMMARY

Phase 5 focuses on performance and load testing of the Syston Tigers backend API. This phase validates that the system can handle real-world traffic patterns including:

- **Normal Load**: Typical daily usage (10-100 users)
- **High Load**: Peak usage during events (100-500 users)
- **Stress Conditions**: Finding breaking points (400+ users)
- **Traffic Spikes**: Sudden bursts (match day scenarios)

**Test Infrastructure**: k6 (Grafana k6)
**Test Scripts Created**: 3 comprehensive load test scenarios
**Status**: Tests written, awaiting execution against deployed environment

---

## 🎯 OBJECTIVES

### Performance Testing Goals

1. **Establish Performance Baseline**
   - Measure response times under normal load
   - Identify p50, p95, p99 latencies
   - Determine throughput capabilities

2. **Find System Limits**
   - Maximum concurrent users
   - Breaking point identification
   - Resource saturation thresholds

3. **Validate Scalability**
   - Cloudflare Workers auto-scaling
   - Durable Object performance
   - Database query performance
   - KV store latency

4. **Test Real-World Scenarios**
   - Match day traffic spikes
   - Fixture checking bursts
   - API endpoint performance

---

## 📁 EXISTING TEST SCRIPTS

### Test Files Location

```
backend/
└── tests/
    └── load/
        ├── basic-load.k6.js        # Normal load testing
        ├── stress-test.k6.js       # Breaking point testing
        ├── spike-test.k6.js        # Traffic spike testing
        └── results/                # Output directory (to be created)
```

### 1. Basic Load Test (`basic-load.k6.js`)

**Purpose**: Measure system performance under normal to moderate load

**Load Pattern**:
```
30s  → Ramp up to 10 users
1m   → Sustain 10 users
30s  → Ramp up to 50 users
2m   → Sustain 50 users
30s  → Ramp up to 100 users
1m   → Sustain 100 users
30s  → Ramp down to 0 users
────────────────────────────
Total: 6 minutes
Peak: 100 concurrent users
```

**Endpoints Tested**:
- `GET /healthz` - Health check endpoint

**Metrics Collected**:
- `http_req_duration` - Response time distribution
- `http_req_failed` - Failed request rate
- `health_check_duration` - Custom health check metric
- `errors` - Custom error rate

**Success Thresholds**:
- 95% of requests < 500ms
- 99% of requests < 1000ms
- Error rate < 1%
- Custom error rate < 5%
- Health check responds < 200ms

**Usage**:
```bash
# Against local dev server
k6 run tests/load/basic-load.k6.js

# Against deployed environment
k6 run --env API_URL=https://app.team-platform-2025.workers.dev tests/load/basic-load.k6.js
```

### 2. Stress Test (`stress-test.k6.js`)

**Purpose**: Find system breaking point and validate behavior under extreme load

**Load Pattern**:
```
1m   → Warm up to 50 users
2m   → Load to 100 users
2m   → Stress to 200 users
2m   → Heavy stress to 300 users
2m   → Breaking point to 400 users
5m   → Sustain at 400 users
2m   → Recovery to 0 users
────────────────────────────
Total: 16 minutes
Peak: 400 concurrent users
```

**Endpoints Tested**:
- `GET /healthz` - Health check under stress
- `GET /readyz` - Readiness check
- `GET /api/v1/posts` - Authenticated endpoint (tests auth layer)

**Metrics Collected**:
- `http_req_duration` - Response times under stress
- `http_req_failed` - Failure rate
- `errors` - Custom error tracking
- `requests_total` - Total request counter
- `auth_failures` - Authentication failure counter
- `api_latency` - Custom API latency metric

**Success Thresholds**:
- 99% of requests < 2000ms (under stress)
- Error rate < 10% (acceptable under breaking point testing)
- Custom error rate < 15%

**Usage**:
```bash
k6 run tests/load/stress-test.k6.js
k6 run --env API_URL=https://app.team-platform-2025.workers.dev tests/load/stress-test.k6.js
```

### 3. Spike Test (`spike-test.k6.js`)

**Purpose**: Test system behavior during sudden traffic spikes (match day scenario)

**Load Pattern**:
```
1m   → Normal load (10 users)
10s  → SPIKE to 500 users  ⚡
2m   → Sustain spike (500 users)
30s  → Back to normal (10 users)
1m   → Recovery monitoring (10 users)
────────────────────────────
Total: 4.5 minutes
Peak: 500 concurrent users
Spike Duration: 10 seconds
```

**Endpoints Tested**:
- `GET /api/v1/fixtures` - Match day fixture checks
- `GET /healthz` - System health during spike

**Metrics Collected**:
- `http_req_duration` - Response times during spike
- `errors` - Error rate during spike
- `spike_recovery_time` - Custom recovery metric

**Success Thresholds**:
- 95% of requests < 1000ms (even during spike)
- Error rate < 5% during spike
- No timeouts (< 5s response time)
- No 500/502/503 errors

**Usage**:
```bash
k6 run tests/load/spike-test.k6.js
k6 run --env API_URL=https://app.team-platform-2025.workers.dev tests/load/spike-test.k6.js
```

---

## 🔧 SETUP & PREREQUISITES

### 1. Install k6

**Windows** (using Chocolatey):
```powershell
choco install k6
```

**Windows** (using winget):
```powershell
winget install k6 --source winget
```

**macOS**:
```bash
brew install k6
```

**Linux**:
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Verify Installation**:
```bash
k6 version
# Expected output: k6 v0.xx.x
```

### 2. Create Results Directory

```bash
cd backend/tests/load
mkdir -p results
```

### 3. Deploy Backend (Required)

Load tests should **NOT** be run against:
- ❌ Production environment (without explicit permission)
- ❌ Local dev server (not representative of production performance)

Load tests **SHOULD** be run against:
- ✅ Dedicated staging/testing environment
- ✅ Preview environment (with caution)
- ✅ Load testing environment (ideal)

**Deploy to Preview**:
```bash
cd backend
wrangler deploy --env preview
```

**Get Deployment URL**:
```bash
# The deployment will output a URL like:
# https://app-preview.team-platform-2025.workers.dev
```

### 4. Configure Environment Variables

Set the API URL environment variable:

```bash
# For preview environment
export API_URL=https://app-preview.team-platform-2025.workers.dev

# Or specify inline when running k6
k6 run --env API_URL=https://your-url.workers.dev tests/load/basic-load.k6.js
```

---

## 📊 EXECUTION PLAN

### Phase 5 Execution Steps

#### Step 1: Pre-Flight Checks

```bash
# Verify k6 is installed
k6 version

# Verify deployment is healthy
curl https://your-url.workers.dev/healthz

# Expected response:
# {"status":"ok","timestamp":"2025-11-04T..."}
```

#### Step 2: Run Basic Load Test (6 minutes)

```bash
cd backend/tests/load

k6 run --env API_URL=https://your-url.workers.dev basic-load.k6.js

# Monitor output for:
# - Request rate
# - Response times (p95, p99)
# - Error rates
# - Threshold violations
```

**Expected Output**:
```
✓ status is 200
✓ has status field
✓ responds < 200ms

checks.........................: 99.xx% ✓ xxxx ✗ x
http_req_duration..............: avg=xx.xxms min=xx.xxms med=xx.xxms max=xx.xxms p(95)=xx.xxms p(99)=xx.xxms
http_req_failed................: 0.xx%  ✓ x    ✗ xxxx
http_reqs......................: xxxx   xx.x/s
```

#### Step 3: Analyze Basic Load Results

```bash
# Results saved to:
# tests/load/results/basic-load-summary.json

# Review metrics:
cat tests/load/results/basic-load-summary.json | grep -A 5 "http_req_duration"
```

#### Step 4: Run Stress Test (16 minutes)

```bash
k6 run --env API_URL=https://your-url.workers.dev stress-test.k6.js

# Watch for:
# - At what user count do errors start?
# - When does latency degrade significantly?
# - Are there any crashes or 500 errors?
# - How does the system recover?
```

**Expected Observations**:
- Gradual latency increase as load grows
- Possible error rate increase above 300 users
- System should remain stable (no crashes)
- Recovery should be clean

#### Step 5: Run Spike Test (4.5 minutes)

```bash
k6 run --env API_URL=https://your-url.workers.dev spike-test.k6.js

# Monitor:
# - How quickly does system respond to spike?
# - Are there timeout errors during spike?
# - Does recovery happen quickly?
# - Are there any cascading failures?
```

**Expected Behavior**:
- Brief latency spike when load jumps
- Quick adaptation (Cloudflare auto-scaling)
- Clean recovery to normal performance

#### Step 6: Collect and Analyze All Results

```bash
# All results in:
ls -la tests/load/results/

# Files:
# - basic-load-summary.json
# - stress-test-summary.json
# - spike-test-summary.json
```

---

## 📈 METRICS & ANALYSIS

### Key Performance Indicators (KPIs)

#### 1. Response Time Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| **p50 (Median)** | < 100ms | Half of requests faster than this |
| **p95** | < 500ms | 95% of requests faster than this |
| **p99** | < 1000ms | 99% of requests faster than this |
| **Max** | < 5000ms | Worst-case response time |

#### 2. Throughput Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| **Requests/sec** | > 100 RPS | Sustained throughput |
| **Peak RPS** | > 500 RPS | Maximum throughput during spike |
| **Total Requests** | Varies | Total requests processed |

#### 3. Reliability Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| **Success Rate** | > 99% | Percentage of successful requests |
| **Error Rate** | < 1% | Percentage of failed requests |
| **Timeout Rate** | < 0.1% | Percentage of timeouts |

#### 4. Cloudflare-Specific Metrics

| Metric | Expected | Description |
|--------|----------|-------------|
| **Cold Start** | < 10ms | Workers cold start time |
| **CPU Time** | < 50ms | CPU time per request |
| **Durable Object Latency** | < 50ms | DO read/write latency |

### Analyzing Results

#### Good Performance Indicators ✅

- Flat response time curve as load increases
- Error rate remains below 1%
- p99 < 1000ms under normal load
- Quick recovery from spikes
- No memory leaks (constant memory usage)

#### Warning Signs ⚠️

- Gradual latency increase over time (memory leak?)
- Error rate > 5% under stress
- p99 > 2000ms under normal load
- Slow recovery from spikes (> 30s)

#### Critical Issues 🚨

- Complete system failure (500/502/503 errors)
- Error rate > 25%
- Response times > 10s
- Database connection exhaustion
- Durable Object failures

---

## 🎯 EXPECTED RESULTS

### Baseline Performance (Healthy System)

Based on Cloudflare Workers best practices and architecture:

#### Basic Load Test

```
Concurrent Users: 100
Duration: 6 minutes
Total Requests: ~18,000-30,000 (depends on sleep time)

Expected Results:
├── p50 response time: 50-150ms
├── p95 response time: 150-300ms
├── p99 response time: 300-500ms
├── Success rate: > 99.5%
└── Error rate: < 0.5%
```

#### Stress Test

```
Concurrent Users: 400 (peak)
Duration: 16 minutes
Total Requests: ~100,000-200,000

Expected Results:
├── p50 response time: 100-200ms
├── p95 response time: 500-800ms
├── p99 response time: 1000-1500ms
├── Success rate: > 95%
├── Error rate: < 5%
└── Breaking point: 350-450 concurrent users
```

#### Spike Test

```
Spike: 10 users → 500 users in 10 seconds
Duration: 4.5 minutes

Expected Results:
├── Pre-spike p95: 100-200ms
├── During spike p95: 500-1000ms
├── Post-spike p95: 100-200ms (recovery)
├── Success rate: > 98%
├── Recovery time: < 30 seconds
└── No cascading failures
```

---

## 🔍 TROUBLESHOOTING

### Common Issues

#### Issue 1: High Error Rates

**Symptoms**: Error rate > 5%

**Possible Causes**:
- Database connection limits
- KV store rate limiting
- Durable Object overload
- Network issues

**Investigation**:
```bash
# Check specific error codes
grep "status: 500" tests/load/results/*.json
grep "status: 502" tests/load/results/*.json
grep "status: 503" tests/load/results/*.json

# Review Cloudflare dashboard:
# - Workers analytics
# - Error logs
# - Performance metrics
```

#### Issue 2: Slow Response Times

**Symptoms**: p99 > 2000ms

**Possible Causes**:
- Database query performance
- External API calls (GAS, Supabase)
- Large JSON payloads
- Inefficient code paths

**Investigation**:
```bash
# Look for slow endpoints
k6 run --http-debug tests/load/basic-load.k6.js

# Profile specific requests
# Add timing logs to backend code
```

#### Issue 3: Spike Recovery Failure

**Symptoms**: System doesn't recover within 30s after spike

**Possible Causes**:
- Durable Object state corruption
- Connection pool exhaustion
- Memory leaks
- Cascading failures

**Investigation**:
- Check Durable Object metrics
- Monitor memory usage
- Review worker restarts
- Analyze queue depths

---

## 📊 REPORTING TEMPLATE

### Performance Test Report Structure

```markdown
# Performance Test Results - [Date]

## Test Environment
- **API URL**: https://your-url.workers.dev
- **k6 Version**: v0.xx.x
- **Test Duration**: XX minutes total
- **Date**: YYYY-MM-DD
- **Tester**: [Name]

## Executive Summary
[Brief overview of results - PASS/FAIL and key findings]

## Basic Load Test Results

### Configuration
- Duration: 6 minutes
- Peak Users: 100
- Total Requests: XXXX

### Metrics
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| p50 | XXms | < 100ms | ✅/❌ |
| p95 | XXms | < 500ms | ✅/❌ |
| p99 | XXms | < 1000ms | ✅/❌ |
| Error Rate | X.XX% | < 1% | ✅/❌ |
| Success Rate | XX.XX% | > 99% | ✅/❌ |

### Observations
- [Key findings]
- [Performance bottlenecks identified]
- [Recommendations]

## Stress Test Results

### Configuration
- Duration: 16 minutes
- Peak Users: 400
- Total Requests: XXXX

### Breaking Point Analysis
- **Breaking Point**: ~XXX concurrent users
- **Symptoms at Breaking Point**: [Description]
- **Recovery Time**: XXs

### Metrics
[Similar table to Basic Load Test]

## Spike Test Results

### Configuration
- Spike: 10 → 500 users in 10s
- Duration: 4.5 minutes

### Spike Response Analysis
- **Pre-Spike p95**: XXms
- **During Spike p95**: XXms
- **Post-Spike p95**: XXms
- **Recovery Time**: XXs

## Recommendations

### Immediate Actions Required
1. [If any critical issues found]

### Performance Optimizations
1. [Suggested improvements]
2. [Code optimizations]
3. [Infrastructure changes]

### Monitoring & Alerts
1. [Suggested alert thresholds]
2. [Monitoring dashboard updates]

## Appendix

### Raw Data
- [Link to JSON results]
- [Grafana dashboard screenshots if available]
```

---

## 🚀 ADVANCED SCENARIOS

### Custom Load Test Scenarios

#### Scenario 1: Match Day Load Test

Simulates real match day traffic pattern:

```javascript
export const options = {
  stages: [
    { duration: '10m', target: 20 },   // Pre-match browsing
    { duration: '30s', target: 300 },  // Match starts - everyone checks lineup
    { duration: '45m', target: 50 },   // During match - moderate activity
    { duration: '5m', target: 200 },   // Half-time - spike in activity
    { duration: '45m', target: 40 },   // Second half
    { duration: '10m', target: 150 },  // Full time - everyone checks results
    { duration: '5m', target: 10 },    // Wind down
  ],
};
```

#### Scenario 2: Event Creation Burst

Tests event creation under load:

```javascript
export default function () {
  const jwt = getValidJWT(); // Use real JWT

  const payload = {
    title: `Event ${Date.now()}`,
    date: new Date().toISOString(),
    location: "Home Ground",
  };

  const res = http.post(
    `${API_URL}/api/v1/events`,
    JSON.stringify(payload),
    {
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
    }
  );

  check(res, {
    'event created': (r) => r.status === 201,
    'has event ID': (r) => JSON.parse(r.body).id !== undefined,
  });
}
```

#### Scenario 3: Soak Test (Long-Running)

Tests for memory leaks and degradation over time:

```javascript
export const options = {
  stages: [
    { duration: '5m', target: 50 },      // Ramp up
    { duration: '4h', target: 50 },      // Soak for 4 hours
    { duration: '5m', target: 0 },       // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(99)<1000'], // Should stay consistent
  },
};
```

---

## 🎯 SUCCESS CRITERIA

### Phase 5 Completion Checklist

- [ ] k6 installed and verified
- [ ] Backend deployed to test environment
- [ ] Results directory created
- [ ] Basic load test executed
- [ ] Stress test executed
- [ ] Spike test executed
- [ ] All results collected
- [ ] Performance baseline documented
- [ ] Bottlenecks identified
- [ ] Recommendations documented
- [ ] Phase 5 summary created

### Performance Acceptance Criteria

**System is considered performant if**:

✅ Basic Load Test:
- p95 < 500ms
- p99 < 1000ms
- Error rate < 1%
- Success rate > 99%

✅ Stress Test:
- p99 < 2000ms under stress
- Error rate < 10% at breaking point
- Clean recovery after stress
- Breaking point > 300 concurrent users

✅ Spike Test:
- System handles 50x spike (10→500 users)
- Error rate < 5% during spike
- Recovery time < 60 seconds
- No cascading failures

---

## 📝 DELIVERABLES

### Phase 5 Deliverables

1. **Performance Baseline Document** ✅ (This file)
2. **Test Execution Results** (Pending execution)
   - `basic-load-summary.json`
   - `stress-test-summary.json`
   - `spike-test-summary.json`
3. **Performance Analysis Report** (Pending execution)
4. **Optimization Recommendations** (Based on results)
5. **Monitoring Alert Thresholds** (Derived from baseline)

---

## 🔗 RELATED DOCUMENTATION

- [PHASE_3_TEST_COVERAGE_SUMMARY.md](./PHASE_3_TEST_COVERAGE_SUMMARY.md) - API route testing
- [PHASE_2_TEST_COVERAGE_SUMMARY.md](./PHASE_2_TEST_COVERAGE_SUMMARY.md) - Admin route testing
- [COMPREHENSIVE_TESTING_STRATEGY.md](./COMPREHENSIVE_TESTING_STRATEGY.md) - Overall testing strategy
- [MONITORING_SETUP_GUIDE.md](./MONITORING_SETUP_GUIDE.md) - Production monitoring

---

## 💡 BEST PRACTICES

### Load Testing Best Practices

1. **Always Test in Non-Production**
   - Never run load tests against production without approval
   - Use dedicated testing environment
   - Coordinate with infrastructure team

2. **Start Small, Scale Gradually**
   - Begin with basic load test
   - Understand normal performance before stress testing
   - Gradually increase load to find limits

3. **Monitor System Health**
   - Watch Cloudflare dashboards during tests
   - Monitor database connections
   - Check Durable Object metrics
   - Track memory usage

4. **Repeat Tests for Consistency**
   - Run each test 2-3 times
   - Average results for baseline
   - Watch for inconsistencies

5. **Document Everything**
   - Record test conditions
   - Save all results
   - Note any anomalies
   - Track changes over time

6. **Share Results**
   - Distribute performance reports
   - Highlight critical findings
   - Propose optimizations
   - Set up monitoring alerts

---

**Generated by**: Claude Code
**Phase**: 5 of Test Coverage Expansion
**Date**: November 4, 2025
**Status**: 📋 Ready for Execution
**Prerequisites**: k6 installation, deployed test environment

**Next Steps**: Install k6, deploy to preview/staging, execute tests, analyze results
