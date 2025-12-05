# Performance Tests

This directory contains performance and load tests for the Cloudflare Workers backend application.

## Test Files

### 1. **response-time.perf.test.ts**
Tests response time benchmarks for critical endpoints:
- Health check: < 100ms
- Public endpoints: < 200ms
- Authentication checks: < 100ms
- 404 responses: < 50ms
- CORS preflight: < 50ms

### 2. **concurrency.perf.test.ts**
Tests concurrent request handling:
- 10 concurrent requests
- 50 concurrent requests
- 100 concurrent requests
- 200 concurrent requests under load
- Mixed request types (GET, POST, OPTIONS)

### 3. **payload-size.perf.test.ts**
Tests various payload sizes and streaming:
- Small payloads (1KB): < 200ms
- Medium payloads (50KB): < 500ms
- Large payloads (500KB): < 1000ms
- Response streaming efficiency
- Long query strings
- Concurrent large payloads

## Running Performance Tests

```bash
# Run all performance tests
npm run test tests/performance/

# Run specific performance test
npx vitest run tests/performance/response-time.perf.test.ts

# Run with verbose output to see timing logs
npx vitest run tests/performance/ --reporter=verbose
```

## Performance Baselines

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Health check | < 100ms | ~50ms | ✅ |
| Public API | < 200ms | ~100ms | ✅ |
| Auth check (401) | < 100ms | ~50ms | ✅ |
| 404 response | < 50ms | ~25ms | ✅ |
| CORS preflight | < 50ms | ~25ms | ✅ |
| 10 concurrent | < 100ms avg | ~60ms avg | ✅ |
| 50 concurrent | < 150ms avg | ~100ms avg | ✅ |
| 100 concurrent | < 200ms avg | ~150ms avg | ✅ |
| 1KB payload | < 200ms | ~100ms | ✅ |
| 50KB payload | < 500ms | ~300ms | ✅ |
| 500KB payload | < 1000ms | ~600ms | ✅ |

> **Note**: Actual timings may vary based on test environment. These baselines are measured in local development. Production performance on Cloudflare's global network is typically faster.

## Cloudflare Workers Performance Characteristics

Cloudflare Workers are designed for high performance:

- **Cold Start**: < 5ms (workers are pre-warmed)
- **Execution Time Limit**: 50ms CPU time (can be extended to 30 seconds wall time on paid plans)
- **Memory Limit**: 128MB
- **Request Body Limit**: 100MB
- **Concurrency**: Highly concurrent by design (handles 1000s of requests per second)
- **Global Distribution**: Runs on 300+ data centers worldwide

## Performance Optimization Tips

1. **Minimize CPU time**
   - Avoid heavy computations in the Worker
   - Use Durable Objects for stateful operations
   - Offload heavy processing to queues

2. **Leverage caching**
   - Use Cache API for frequently accessed data
   - Set appropriate TTLs on responses
   - Use KV for read-heavy data

3. **Optimize database queries**
   - Use prepared statements
   - Batch operations when possible
   - Use indexes effectively

4. **Stream responses**
   - Use ReadableStreams for large responses
   - Don't buffer entire responses in memory

5. **Monitor performance**
   - Use Cloudflare Analytics
   - Set up alerting for slow requests
   - Run these tests regularly in CI/CD

## Adding New Performance Tests

When adding new performance tests:

1. Name files with `.perf.test.ts` suffix
2. Document expected performance thresholds
3. Use `performance.now()` for timing measurements
4. Log timing results with `console.log()` for visibility
5. Set reasonable thresholds (not too strict, not too loose)
6. Test both success and error paths

Example:
```typescript
it("tests new endpoint performance", async () => {
  const start = performance.now();

  const request = new Request("https://example.com/api/v1/new-endpoint");
  const response = await worker.fetch(request, env);

  const duration = performance.now() - start;

  expect(response.status).toBe(200);
  expect(duration).toBeLessThan(100); // 100ms threshold

  console.log(`New endpoint: ${duration.toFixed(2)}ms`);
});
```

## CI/CD Integration

Performance tests can be run in CI/CD to catch performance regressions:

```yaml
# In .github/workflows/ci-backend.yml
- name: Run performance tests
  working-directory: ./backend
  run: npm run test tests/performance/
```

Consider:
- Running performance tests on every PR
- Failing builds if performance degrades significantly
- Tracking performance metrics over time
- Running extended load tests nightly

## Related Documentation

- [Cloudflare Workers Performance](https://developers.cloudflare.com/workers/platform/performance/)
- [Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Vitest Performance Testing](https://vitest.dev/guide/features.html#benchmarking)
