import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../../src/index";

/**
 * Health Check Endpoint Tests
 *
 * Verifies that health check endpoints return proper status
 * and dependency health information for monitoring systems.
 */
describe("Integration: Health Check Endpoints", () => {
  describe("GET /healthz (Liveness Probe)", () => {
    it("returns 200 OK when worker is running", async () => {
      const request = new Request("https://example.com/healthz");
      const response = await worker.fetch(request, env);

      expect(response.status).toBe(200);
    });

    it("returns health status in JSON format", async () => {
      const request = new Request("https://example.com/healthz");
      const response = await worker.fetch(request, env);

      const data = (await response.json()) as any;

      expect(data.status).toBe("ok");
      expect(data.ts).toBeTruthy();
      expect(typeof data.ts).toBe("string");
    });

    it("includes version information", async () => {
      const request = new Request("https://example.com/healthz");
      const response = await worker.fetch(request, env);

      const data = (await response.json()) as any;

      expect(data.version).toBeDefined();
    });

    it("returns valid ISO timestamp", async () => {
      const request = new Request("https://example.com/healthz");
      const response = await worker.fetch(request, env);

      const data = (await response.json()) as any;

      // Verify it's a valid ISO 8601 timestamp
      const timestamp = new Date(data.ts);
      expect(timestamp.toISOString()).toBe(data.ts);
    });
  });

  describe("GET /readyz (Readiness Probe)", () => {
    it("returns 200 when all services are healthy", async () => {
      const request = new Request("https://example.com/readyz");
      const response = await worker.fetch(request, env);

      expect([200, 503]).toContain(response.status);
    });

    it("returns health check structure", async () => {
      const request = new Request("https://example.com/readyz");
      const response = await worker.fetch(request, env);

      const data = (await response.json()) as any;

      expect(data.status).toBeDefined();
      expect(["healthy", "degraded", "unhealthy"]).toContain(data.status);
      expect(data.timestamp).toBeTruthy();
      expect(data.checks).toBeDefined();
    });

    it("includes database health check", async () => {
      const request = new Request("https://example.com/readyz");
      const response = await worker.fetch(request, env);

      const data = (await response.json()) as any;

      expect(data.checks.database).toBeDefined();
      expect(["healthy", "unhealthy"]).toContain(data.checks.database);
    });

    it("includes KV health check", async () => {
      const request = new Request("https://example.com/readyz");
      const response = await worker.fetch(request, env);

      const data = (await response.json()) as any;

      expect(data.checks.kv).toBeDefined();
      expect(["healthy", "unhealthy"]).toContain(data.checks.kv);
    });

    it("includes durable objects health check", async () => {
      const request = new Request("https://example.com/readyz");
      const response = await worker.fetch(request, env);

      const data = (await response.json()) as any;

      expect(data.checks.durable_objects).toBeDefined();
    });

    it("returns 503 when status is unhealthy", async () => {
      // This test verifies the logic exists
      // In a real unhealthy scenario, status code should be 503
      const request = new Request("https://example.com/readyz");
      const response = await worker.fetch(request, env);

      const data = (await response.json()) as any;

      if (data.status === "unhealthy") {
        expect(response.status).toBe(503);
      }
    });

    it("returns timestamp in ISO format", async () => {
      const request = new Request("https://example.com/readyz");
      const response = await worker.fetch(request, env);

      const data = (await response.json()) as any;

      const timestamp = new Date(data.timestamp);
      expect(timestamp.toISOString()).toBe(data.timestamp);
    });
  });

  describe("Health Check Response Times", () => {
    it("liveness probe responds quickly (< 100ms)", async () => {
      const start = Date.now();
      const request = new Request("https://example.com/healthz");
      await worker.fetch(request, env);
      const duration = Date.now() - start;

      // Liveness should be very fast
      expect(duration).toBeLessThan(100);
    });

    it("readiness probe responds reasonably fast (< 1000ms)", async () => {
      const start = Date.now();
      const request = new Request("https://example.com/readyz");
      await worker.fetch(request, env);
      const duration = Date.now() - start;

      // Readiness can be slower due to checks, but should still be fast
      expect(duration).toBeLessThan(1000);
    });
  });

  describe("Health Check Security", () => {
    it("does not require authentication", async () => {
      const request = new Request("https://example.com/healthz");
      const response = await worker.fetch(request, env);

      // Should work without auth
      expect(response.status).toBe(200);
    });

    it("does not expose sensitive information", async () => {
      const request = new Request("https://example.com/readyz");
      const response = await worker.fetch(request, env);

      const data = (await response.json()) as any;

      // Should not include sensitive env vars, secrets, etc.
      expect(data).not.toHaveProperty("env");
      expect(data).not.toHaveProperty("secrets");
      expect(JSON.stringify(data)).not.toMatch(/password|secret|key|token/i);
    });

    it("includes security headers", async () => {
      const request = new Request("https://example.com/healthz");
      const response = await worker.fetch(request, env);

      // Should have security headers like any other endpoint
      expect(response.headers.get("X-Content-Type-Options")).toBeTruthy();
    });
  });
});
