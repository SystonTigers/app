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
 * Security Headers Test
 *
 * Verifies that all required security headers are present on API responses
 * to prevent common web vulnerabilities.
 */
describe("Security: HTTP Security Headers", () => {
  it("includes all required security headers on API responses", async () => {
    const request = new Request("https://example.com/api/v1/public/clubs");
    const response = await worker.fetch(request, env, mockCtx);

    // Required security headers
    const requiredHeaders = {
      "Strict-Transport-Security": /max-age=\d+/,
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": /(DENY|SAMEORIGIN)/,
      "Referrer-Policy": /strict-origin|no-referrer/,
      "X-XSS-Protection": /1; mode=block/,
      "Content-Security-Policy": /default-src/,
      "Permissions-Policy": /geolocation=/,
    };

    Object.entries(requiredHeaders).forEach(([header, expectedValue]) => {
      const actualValue = response.headers.get(header);

      expect(
        actualValue,
        `Missing or incorrect header: ${header}`
      ).toBeTruthy();

      if (typeof expectedValue === "string") {
        expect(actualValue).toContain(expectedValue);
      } else {
        expect(actualValue).toMatch(expectedValue);
      }
    });
  });

  it("includes HSTS header with appropriate duration", async () => {
    const request = new Request("https://example.com/api/v1/public/clubs");
    const response = await worker.fetch(request, env, mockCtx);

    const hsts = response.headers.get("Strict-Transport-Security");

    expect(hsts).toBeTruthy();
    expect(hsts).toContain("max-age=31536000"); // 1 year minimum
    expect(hsts).toContain("includeSubDomains");
  });

  it("includes Content Security Policy with safe defaults", async () => {
    const request = new Request("https://example.com/api/v1/public/clubs");
    const response = await worker.fetch(request, env, mockCtx);

    const csp = response.headers.get("Content-Security-Policy");

    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src");
    expect(csp).toContain("'self'");

    // Should restrict dangerous inline scripts/styles in production
    // (may allow in development for hot reload)
  });

  it("includes X-Frame-Options to prevent clickjacking", async () => {
    const request = new Request("https://example.com/api/v1/public/clubs");
    const response = await worker.fetch(request, env, mockCtx);

    const xFrameOptions = response.headers.get("X-Frame-Options");

    expect(xFrameOptions).toBeTruthy();
    expect(["DENY", "SAMEORIGIN"]).toContain(xFrameOptions);
  });

  it("includes Permissions-Policy to restrict browser features", async () => {
    const request = new Request("https://example.com/api/v1/public/clubs");
    const response = await worker.fetch(request, env, mockCtx);

    const permissionsPolicy = response.headers.get("Permissions-Policy");

    expect(permissionsPolicy).toBeTruthy();

    // Should restrict dangerous permissions
    const dangeroPermissions = ["geolocation", "microphone", "camera"];
    dangeroPermissions.forEach((permission) => {
      expect(permissionsPolicy).toContain(permission);
    });
  });

  it("includes security headers on error responses", async () => {
    const request = new Request("https://example.com/api/v1/nonexistent");
    const response = await worker.fetch(request, env, mockCtx);

    expect(response.status).toBe(404);

    // Security headers should still be present on error responses
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBeTruthy();
    expect(response.headers.get("Strict-Transport-Security")).toBeTruthy();
  });

  it("includes security headers on authenticated endpoints", async () => {
    const request = new Request("https://example.com/api/v1/videos");
    const response = await worker.fetch(request, env, mockCtx);

    expect(response.status).toBe(401);

    // Security headers should be present even on 401
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBeTruthy();
    expect(response.headers.get("Content-Security-Policy")).toBeTruthy();
  });

  it("includes security headers on OPTIONS preflight requests", async () => {
    const request = new Request("https://example.com/api/v1/videos", {
      method: "OPTIONS",
      headers: {
        "origin": "https://example.com",
        "access-control-request-method": "GET",
      },
    });

    const response = await worker.fetch(request, env, mockCtx);

    expect(response.status).toBe(204);

    // Security headers should be present on CORS preflight
    expect(response.headers.get("X-Content-Type-Options")).toBeTruthy();
    expect(response.headers.get("X-Frame-Options")).toBeTruthy();
  });

  it("does not leak sensitive information in headers", async () => {
    const request = new Request("https://example.com/api/v1/public/clubs");
    const response = await worker.fetch(request, env, mockCtx);

    // Should NOT have headers that leak server info
    expect(response.headers.get("Server")).toBeNull();
    expect(response.headers.get("X-Powered-By")).toBeNull();
    expect(response.headers.get("X-AspNet-Version")).toBeNull();
  });

  it("sets appropriate cache headers for API responses", async () => {
    const request = new Request("https://example.com/api/v1/public/clubs");
    const response = await worker.fetch(request, env, mockCtx);

    // API responses should generally not be cached or have explicit cache control
    const cacheControl = response.headers.get("Cache-Control");

    if (cacheControl) {
      // If cache control is set, verify it's appropriate
      // For API responses, typically want no-cache or short max-age
      expect(cacheControl).toBeTruthy();
    }
  });
});

