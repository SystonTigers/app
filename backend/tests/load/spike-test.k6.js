/**
 * Spike Test for Syston Tigers Backend API
 *
 * Tests system behavior under sudden traffic spikes
 * (e.g., match day when everyone checks fixtures at once)
 *
 * Usage:
 *   k6 run tests/load/spike-test.k6.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const spikeRecoveryTime = new Trend('spike_recovery_time');

const API_URL = __ENV.API_URL || 'http://localhost:8787';

export const options = {
  stages: [
    { duration: '1m', target: 10 },     // Normal load
    { duration: '10s', target: 500 },   // SPIKE! (match starts)
    { duration: '2m', target: 500 },    // Sustain spike
    { duration: '30s', target: 10 },    // Back to normal
    { duration: '1m', target: 10 },     // Recovery monitoring
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000'], // 95% < 1s even during spike
    'http_req_failed': ['rate<0.05'],    // Error rate < 5% during spike
  },
};

export default function () {
  const startTime = Date.now();

  group('Fixtures Check (Match Day)', () => {
    const res = http.get(`${API_URL}/api/v1/fixtures`);

    const success = check(res, {
      'fixtures endpoint responds': (r) => r.status !== 0,
      'no timeout during spike': (r) => r.timings.waiting < 5000,
      'no server errors': (r) => r.status !== 500 && r.status !== 502 && r.status !== 503,
    });

    if (!success) errorRate.add(1);
    else errorRate.add(0);

    // Measure recovery time during spike
    const responseTime = Date.now() - startTime;
    spikeRecoveryTime.add(responseTime);
  });

  group('Health Check During Spike', () => {
    const res = http.get(`${API_URL}/healthz`);

    check(res, {
      'health check stable during spike': (r) => r.status === 200,
    });
  });

  // Very short sleep to maximize load during spike
  sleep(0.1);
}

export function handleSummary(data) {
  const maxResponseTime = data.metrics.http_req_duration?.values?.max || 0;
  const errorRate = data.metrics.http_req_failed?.values?.rate || 0;

  console.log('\n=== SPIKE TEST RESULTS ===\n');
  console.log(`Max Response Time: ${maxResponseTime.toFixed(2)}ms`);
  console.log(`Error Rate During Spike: ${(errorRate * 100).toFixed(2)}%`);
  console.log(`\np95: ${data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 0}ms`);
  console.log(`p99: ${data.metrics.http_req_duration?.values?.['p(99)']?.toFixed(2) || 0}ms\n`);

  if (errorRate < 0.05 && maxResponseTime < 5000) {
    console.log('✅ System handled spike well!\n');
  } else {
    console.log('⚠️  System struggled during spike - consider scaling strategy\n');
  }

  return {
    'tests/load/results/spike-test-summary.json': JSON.stringify(data, null, 2),
  };
}
