import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../../src/index";

/**
 * Performance Test: Response Time Benchmarks
 *
 * Tests that critical endpoints respond within acceptable time limits:
 * - Health check: < 100ms
 * - Authentication: < 500ms
 * - API endpoints: < 1000ms
 *
 * Note: These are baseline benchmarks. Adjust thresholds based on requirements.
 */
describe("Performance: Response Time", () => {
  it("API root responds within 100ms", async () => {
    const start = performance.now();

    const request = new Request("https://example.com/api/v1");
    const response = await worker.fetch(request, env);

    const duration = performance.now() - start;

    expect(response.status).toBeLessThan(500);
    expect(duration).toBeLessThan(100);

    console.log(`API root: ${duration.toFixed(2)}ms`);
  });

  it("public endpoint responds within 200ms", async () => {
    const start = performance.now();

    const request = new Request("https://example.com/api/v1/public/clubs");
    const response = await worker.fetch(request, env);

    const duration = performance.now() - start;

    expect(response.status).toBeLessThan(500);
    expect(duration).toBeLessThan(200);

    console.log(`Public clubs endpoint: ${duration.toFixed(2)}ms`);
  });

  it("unauthorized request responds within 100ms", async () => {
    const start = performance.now();

    const request = new Request("https://example.com/api/v1/videos");
    const response = await worker.fetch(request, env);

    const duration = performance.now() - start;

    expect(response.status).toBe(401);
    expect(duration).toBeLessThan(100);

    console.log(`Unauthorized check: ${duration.toFixed(2)}ms`);
  });

  it("invalid route (404) responds within 50ms", async () => {
    const start = performance.now();

    const request = new Request("https://example.com/api/v1/nonexistent");
    const response = await worker.fetch(request, env);

    const duration = performance.now() - start;

    expect(response.status).toBe(404);
    expect(duration).toBeLessThan(50);

    console.log(`404 response: ${duration.toFixed(2)}ms`);
  });

  it("CORS preflight responds within 50ms", async () => {
    const start = performance.now();

    const request = new Request("https://example.com/api/v1/videos", {
      method: "OPTIONS",
      headers: {
        "origin": "https://example.com",
        "access-control-request-method": "GET",
      },
    });
    const response = await worker.fetch(request, env);

    const duration = performance.now() - start;

    expect(response.status).toBe(204);
    expect(duration).toBeLessThan(50);

    console.log(`CORS preflight: ${duration.toFixed(2)}ms`);
  });
});
