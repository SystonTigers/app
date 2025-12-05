# K6 Load Tests

This directory contains K6 load testing scripts for the Syston Tigers backend API.

## Available Tests

### 1. Basic Load Test (`basic-load.k6.js`)

A standard load test that simulates normal traffic patterns.

**Stages:**
- Ramp up to 10 users over 30 seconds
- Stay at 10 users for 1 minute
- Ramp up to 50 users over 30 seconds
- Stay at 50 users for 2 minutes
- Ramp up to 100 users over 30 seconds
- Stay at 100 users for 1 minute
- Ramp down to 0 users over 30 seconds

**Thresholds:**
- 95th percentile response time < 500ms
- 99th percentile response time < 1 second
- Error rate < 1%

### 2. Spike Test (`spike-test.k6.js`)

Tests the system's ability to handle sudden traffic spikes.

**Stages:**
- Normal load (10 users) for 1 minute
- Sudden spike to 200 users
- Maintain spike for 30 seconds
- Return to normal load

### 3. Stress Test (`stress-test.k6.js`)

Tests the system's breaking point and recovery capability.

**Stages:**
- Gradual increase from 0 to 500 users
- Sustained high load
- Gradual decrease

## Running Locally

### Prerequisites

1. Install K6:
   ```bash
   # macOS
   brew install k6

   # Windows (choco)
   choco install k6

   # Linux (Ubuntu/Debian)
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6
   ```

2. Ensure the API is running (locally or deployed)

### Run Tests

```bash
# Run against local development server
k6 run tests/load/basic-load.k6.js

# Run against staging environment
k6 run --env API_URL=https://syston-postbus-staging.team-platform-2025.workers.dev tests/load/basic-load.k6.js

# Run against production (be careful!)
k6 run --env API_URL=https://syston-postbus.team-platform-2025.workers.dev tests/load/basic-load.k6.js

# Run spike test
k6 run tests/load/spike-test.k6.js

# Run stress test
k6 run tests/load/stress-test.k6.js
```

### Custom Parameters

```bash
# Override virtual users
k6 run --vus 50 tests/load/basic-load.k6.js

# Override duration
k6 run --duration 5m tests/load/basic-load.k6.js

# Run with specific stage
k6 run --stage 30s:100 --stage 2m:100 --stage 30s:0 tests/load/basic-load.k6.js
```

## CI/CD Integration

Load tests are integrated into CI/CD via `.github/workflows/load-tests.yml`:

### Triggers

1. **Manual Dispatch**: Run tests on-demand with customizable parameters
2. **After Deployment**: Automatically runs after successful backend deployment
3. **Weekly Schedule**: Runs every Monday at 3 AM UTC

### Running via GitHub Actions

1. Go to **Actions** tab in GitHub
2. Select **Load Tests (K6)** workflow
3. Click **Run workflow**
4. Choose test type and parameters:
   - **basic**: Standard load test (default)
   - **spike**: Sudden traffic spike test
   - **stress**: Find breaking point
   - **all**: Run all tests

### Test Results

- Results are uploaded as GitHub Actions artifacts
- Retained for 30 days
- Summary displayed in workflow run page

## Writing Custom Tests

### Template

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get(`${__ENV.API_URL}/your-endpoint`);

  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
```

### Best Practices

1. **Use groups** to organize checks
2. **Add custom metrics** for specific endpoints
3. **Set realistic thresholds** based on SLAs
4. **Include think time** with `sleep()`
5. **Test authenticated endpoints** with proper tokens

## Interpreting Results

### Key Metrics

| Metric | Description | Good Value |
|--------|-------------|------------|
| `http_req_duration` | Response time | p95 < 500ms |
| `http_req_failed` | Error rate | < 1% |
| `http_reqs` | Requests/second | Depends on load |
| `vus` | Virtual users | As configured |

### Response Time Percentiles

- **p50**: Median response time
- **p90**: 90% of requests faster than this
- **p95**: Target for most SLAs
- **p99**: Tail latency (important for UX)

## Troubleshooting

### Common Issues

**"Connection refused"**
- Ensure the API is running
- Check the API_URL is correct
- Verify firewall rules

**"Threshold exceeded"**
- API is under-performing
- Check server logs for errors
- Consider scaling infrastructure

**"Rate limited"**
- Reduce VUs or add delays
- Check rate limit configuration
- Use authenticated requests

## Related Documentation

- [K6 Documentation](https://k6.io/docs/)
- [K6 Best Practices](https://k6.io/docs/testing-guides/best-practices/)
- [K6 Thresholds](https://k6.io/docs/using-k6/thresholds/)
