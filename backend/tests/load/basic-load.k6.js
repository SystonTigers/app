/**
 * Basic Load Test for Syston Tigers Backend API
 *
 * Usage:
 *   k6 run tests/load/basic-load.k6.js
 *
 * Or with environment variables:
 *   k6 run --env API_URL=https://your-api.workers.dev tests/load/basic-load.k6.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const healthCheckDuration = new Trend('health_check_duration');

// Configuration
const API_URL = __ENV.API_URL || 'http://localhost:8787';

// Load test stages
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 10 },    // Stay at 10 users
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 50 },    // Stay at 50 users
    { duration: '30s', target: 100 },  // Ramp up to 100 users
    { duration: '1m', target: 100 },   // Stay at 100 users
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    'http_req_failed': ['rate<0.01'],  // Error rate < 1%
    'errors': ['rate<0.05'],           // Custom error rate < 5%
  },
};

export default function () {
  group('Health Check', () => {
    const start = Date.now();
    const res = http.get(`${API_URL}/healthz`);
    const duration = Date.now() - start;

    healthCheckDuration.add(duration);

    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'has status field': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status === 'ok';
        } catch {
          return false;
        }
      },
      'responds < 200ms': () => duration < 200,
    });

    if (!success) {
      errorRate.add(1);
    } else {
      errorRate.add(0);
    }
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'tests/load/results/basic-load-summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const indent = options?.indent || '';
  const enableColors = options?.enableColors ?? false;

  let summary = '\n';
  summary += `${indent}Load Test Summary\n`;
  summary += `${indent}=================\n\n`;

  summary += `${indent}Requests:\n`;
  summary += `${indent}  Total: ${data.metrics.http_reqs?.values?.count || 0}\n`;
  summary += `${indent}  Failed: ${data.metrics.http_req_failed?.values?.rate || 0}%\n\n`;

  summary += `${indent}Response Times:\n`;
  summary += `${indent}  p50: ${data.metrics.http_req_duration?.values?.['p(50)']?.toFixed(2) || 0}ms\n`;
  summary += `${indent}  p95: ${data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 0}ms\n`;
  summary += `${indent}  p99: ${data.metrics.http_req_duration?.values?.['p(99)']?.toFixed(2) || 0}ms\n`;

  return summary;
}
