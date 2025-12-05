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
 * Performance Test: Payload Size Handling
 *
 * Tests that the Worker handles various payload sizes efficiently:
 * - Small payloads (< 1KB)
 * - Medium payloads (10-100KB)
 * - Large payloads (1MB+)
 *
 * Cloudflare Workers have a 100MB request body limit.
 */
describe("Performance: Payload Size", () => {
  it("handles small JSON payload (1KB) quickly", async () => {
    const smallPayload = { data: "x".repeat(1000) };
    const start = performance.now();

    const request = new Request("https://example.com/api/v1/videos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(smallPayload),
    });

    const response = await worker.fetch(request, env, mockCtx);
    const duration = performance.now() - start;

    expect(response.status).toBeLessThan(500);
    expect(duration).toBeLessThan(200);

    console.log(`1KB payload: ${duration.toFixed(2)}ms`);
  });

  it("handles medium JSON payload (50KB) efficiently", async () => {
    const mediumPayload = { data: "x".repeat(50000) };
    const start = performance.now();

    const request = new Request("https://example.com/api/v1/videos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(mediumPayload),
    });

    const response = await worker.fetch(request, env, mockCtx);
    const duration = performance.now() - start;

    expect(response.status).toBeLessThan(500);
    expect(duration).toBeLessThan(500);

    console.log(`50KB payload: ${duration.toFixed(2)}ms`);
  });

  it("handles large JSON payload (500KB) within limits", async () => {
    const largePayload = { data: "x".repeat(500000) };
    const start = performance.now();

    const request = new Request("https://example.com/api/v1/videos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(largePayload),
    });

    const response = await worker.fetch(request, env, mockCtx);
    const duration = performance.now() - start;

    expect(response.status).toBeLessThan(500);
    expect(duration).toBeLessThan(1000);

    console.log(`500KB payload: ${duration.toFixed(2)}ms`);
  });

  it("processes response streaming efficiently", async () => {
    const start = performance.now();

    const request = new Request("https://example.com/api/v1/public/clubs");
    const response = await worker.fetch(request, env, mockCtx);

    // Measure time to get response headers
    const headersTime = performance.now() - start;

    // Measure time to read full body
    const body = await response.text();
    const totalTime = performance.now() - start;

    expect(response.status).toBeLessThan(500);
    expect(headersTime).toBeLessThan(200);
    expect(totalTime).toBeLessThan(500);

    console.log(
      `Response streaming - Headers: ${headersTime.toFixed(2)}ms, Full body: ${totalTime.toFixed(2)}ms, Body size: ${body.length} bytes`
    );
  });

  it("handles URL with long query string", async () => {
    const longQuery = "param=" + "value".repeat(100);
    const start = performance.now();

    const request = new Request(
      `https://example.com/api/v1/videos?${longQuery}`
    );
    const response = await worker.fetch(request, env, mockCtx);

    const duration = performance.now() - start;

    expect(response.status).toBeLessThan(500);
    expect(duration).toBeLessThan(200);

    console.log(`Long query string: ${duration.toFixed(2)}ms`);
  });

  it("handles multiple concurrent large payloads", async () => {
    const largePayload = { data: "x".repeat(100000) };
    const start = performance.now();

    const requests = Array.from({ length: 10 }, () =>
      worker.fetch(
        new Request("https://example.com/api/v1/videos", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(largePayload),
        }),
        env,
        mockCtx
      )
    );

    const responses = await Promise.all(requests);
    const duration = performance.now() - start;
    const avgDuration = duration / 10;

    expect(responses.every((r) => r.status < 500)).toBe(true);
    expect(avgDuration).toBeLessThan(500);

    console.log(
      `10 concurrent 100KB payloads: ${duration.toFixed(2)}ms total, ${avgDuration.toFixed(2)}ms avg`
    );
  });
});
