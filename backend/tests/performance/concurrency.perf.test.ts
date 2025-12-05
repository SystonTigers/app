import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../../src/index";

// Mock ExecutionContext for worker tests
const mockCtx = {
  waitUntil: () => { },
  passThroughOnException: () => { },
  props: {},
} as unknown as ExecutionContext;

/**
 * Performance Test: Concurrency & Throughput
 *
 * Tests that the Worker can handle multiple concurrent requests:
 * - 10 concurrent requests
 * - 50 concurrent requests
 * - 100 concurrent requests
 *
 * Cloudflare Workers are designed to handle high concurrency efficiently.
 */
describe("Performance: Concurrency", () => {
  it("handles 10 concurrent API requests", async () => {
    const start = performance.now();

    const requests = Array.from({ length: 10 }, () =>
      worker.fetch(new Request("https://example.com/api/v1/public/clubs"), env, mockCtx)
    );

    const responses = await Promise.all(requests);

    const duration = performance.now() - start;
    const avgDuration = duration / 10;

    expect(responses.every((r) => r.status < 500)).toBe(true);
    expect(avgDuration).toBeLessThan(100);

    console.log(
      `10 concurrent requests: ${duration.toFixed(2)}ms total, ${avgDuration.toFixed(2)}ms avg`
    );
  });

  it("handles 50 concurrent 401 responses", async () => {
    const start = performance.now();

    const requests = Array.from({ length: 50 }, () =>
      worker.fetch(new Request("https://example.com/api/v1/videos"), env, mockCtx)
    );

    const responses = await Promise.all(requests);

    const duration = performance.now() - start;
    const avgDuration = duration / 50;

    expect(responses.every((r) => r.status === 401)).toBe(true);
    expect(avgDuration).toBeLessThan(150);

    console.log(
      `50 concurrent requests: ${duration.toFixed(2)}ms total, ${avgDuration.toFixed(2)}ms avg`
    );
  });

  it("handles 100 concurrent requests without errors", async () => {
    const start = performance.now();

    const requests = Array.from({ length: 100 }, (_, i) => {
      // Mix of different endpoints
      const endpoints = [
        "https://example.com/health",
        "https://example.com/api/v1/videos",
        "https://example.com/api/v1/public/clubs",
        "https://example.com/api/v1/events",
      ];
      const endpoint = endpoints[i % endpoints.length];
      return worker.fetch(new Request(endpoint), env, mockCtx);
    });

    const responses = await Promise.all(requests);

    const duration = performance.now() - start;
    const avgDuration = duration / 100;

    // All requests should complete successfully (no 5xx errors)
    const allSuccessful = responses.every((r) => r.status < 500);
    expect(allSuccessful).toBe(true);
    expect(avgDuration).toBeLessThan(200);

    console.log(
      `100 concurrent requests: ${duration.toFixed(2)}ms total, ${avgDuration.toFixed(2)}ms avg`
    );
  });

  it("maintains performance under load (200 requests)", async () => {
    const start = performance.now();

    const requests = Array.from({ length: 200 }, () =>
      worker.fetch(new Request("https://example.com/api/v1/public/clubs"), env, mockCtx)
    );

    const responses = await Promise.all(requests);

    const duration = performance.now() - start;
    const avgDuration = duration / 200;

    expect(responses.every((r) => r.status < 500)).toBe(true);
    expect(avgDuration).toBeLessThan(250);

    console.log(
      `200 concurrent requests: ${duration.toFixed(2)}ms total, ${avgDuration.toFixed(2)}ms avg`
    );
  });

  it("handles mixed request types concurrently", async () => {
    const start = performance.now();

    // Create 30 requests of different types
    const getRequests = Array.from({ length: 10 }, () =>
      worker.fetch(new Request("https://example.com/api/v1/public/clubs"), env, mockCtx)
    );

    const postRequests = Array.from({ length: 10 }, () =>
      worker.fetch(
        new Request("https://example.com/api/v1/videos", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ test: true }),
        }),
        env,
        mockCtx
      )
    );

    const optionsRequests = Array.from({ length: 10 }, () =>
      worker.fetch(
        new Request("https://example.com/api/v1/videos", {
          method: "OPTIONS",
          headers: {
            "origin": "https://example.com",
            "access-control-request-method": "GET",
          },
        }),
        env,
        mockCtx
      )
    );

    const allRequests = [...getRequests, ...postRequests, ...optionsRequests];
    const responses = await Promise.all(allRequests);

    const duration = performance.now() - start;
    const avgDuration = duration / 30;

    // All requests should complete (status < 500)
    expect(responses.every((r) => r.status < 500)).toBe(true);
    expect(avgDuration).toBeLessThan(200);

    console.log(
      `30 mixed requests: ${duration.toFixed(2)}ms total, ${avgDuration.toFixed(2)}ms avg`
    );
  });
});
