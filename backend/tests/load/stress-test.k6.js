/**
 * Stress Test for Syston Tigers Backend API
 *
 * Tests system under heavy load to find breaking points
 *
 * Usage:
 *   k6 run tests/load/stress-test.k6.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const requestCounter = new Counter('requests_total');
const authFailures = new Counter('auth_failures');
const apiLatency = new Trend('api_latency');

const API_URL = __ENV.API_URL || 'http://localhost:8787';
const JWT_SECRET = __ENV.JWT_SECRET || 'test-secret';

export const options = {
  stages: [
    { duration: '1m', target: 50 },    // Warm up
    { duration: '2m', target: 100 },   // Load
    { duration: '2m', target: 200 },   // Stress
    { duration: '2m', target: 300 },   // Heavy stress
    { duration: '2m', target: 400 },   // Breaking point
    { duration: '5m', target: 400 },   // Sustain at breaking point
    { duration: '2m', target: 0 },     // Recovery
  ],
  thresholds: {
    'http_req_duration': ['p(99)<2000'], // 99% < 2s under stress
    'http_req_failed': ['rate<0.10'],    // Error rate < 10% under stress
    'errors': ['rate<0.15'],             // Custom error rate < 15%
  },
};

// Generate fake JWT for testing (not production!)
function generateFakeJWT() {
  // This is a simplified JWT for testing - not secure!
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: `user-${randomString(8)}`,
    tenant_id: `tenant-${randomString(8)}`,
    roles: ['tenant_member'],
    exp: Math.floor(Date.now() / 1000) + 3600,
  }));
  const signature = randomString(32);
  return `${header}.${payload}.${signature}`;
}

export default function () {
  const jwt = generateFakeJWT();

  group('Health Check - High Load', () => {
    const start = Date.now();
    const res = http.get(`${API_URL}/healthz`);
    const duration = Date.now() - start;

    apiLatency.add(duration);
    requestCounter.add(1);

    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'responds < 1s under stress': () => duration < 1000,
    });

    if (!success) errorRate.add(1);
    else errorRate.add(0);
  });

  group('Readiness Check', () => {
    const res = http.get(`${API_URL}/readyz`);
    requestCounter.add(1);

    check(res, {
      'readiness check passes': (r) => r.status === 200,
    });
  });

  // Simulate API requests with authentication
  group('Authenticated API Calls', () => {
    const headers = {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    };

    // Try to get posts (will likely fail due to fake JWT, but tests auth layer)
    const postsRes = http.get(`${API_URL}/api/v1/posts`, { headers });
    requestCounter.add(1);

    if (postsRes.status === 401 || postsRes.status === 403) {
      authFailures.add(1);
    }

    check(postsRes, {
      'auth layer responds': (r) => r.status !== 0,
      'no server errors': (r) => r.status !== 500,
    });
  });

  // Random sleep to simulate realistic user behavior
  sleep(Math.random() * 2);
}

export function handleSummary(data) {
  const passed = data.metrics.http_req_failed?.values?.rate < 0.10;

  console.log('\n=== STRESS TEST RESULTS ===\n');
  console.log(`Status: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
  console.log(`Total Requests: ${data.metrics.requests_total?.values?.count || 0}`);
  console.log(`Failed Requests: ${data.metrics.http_req_failed?.values?.count || 0}`);
  console.log(`Error Rate: ${(data.metrics.http_req_failed?.values?.rate * 100 || 0).toFixed(2)}%\n`);
  console.log(`Response Times:`);
  console.log(`  p50: ${data.metrics.http_req_duration?.values?.['p(50)']?.toFixed(2) || 0}ms`);
  console.log(`  p95: ${data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 0}ms`);
  console.log(`  p99: ${data.metrics.http_req_duration?.values?.['p(99)']?.toFixed(2) || 0}ms`);
  console.log(`  max: ${data.metrics.http_req_duration?.values?.max?.toFixed(2) || 0}ms\n`);

  return {
    'tests/load/results/stress-test-summary.json': JSON.stringify(data, null, 2),
  };
}
