import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../../src/index";

/**
 * Contract Test: Authentication API
 *
 * Validates that authentication endpoints return responses matching
 * the contract expected by the mobile application.
 *
 * These tests ensure backward compatibility - if the response structure
 * changes, these tests will fail, alerting us to potential breaking changes.
 */
describe("Contract: Authentication API", () => {
  describe("POST /api/v1/auth/register", () => {
    it("returns expected response structure on success", async () => {
      const request = new Request("https://example.com/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": `contract-test-${Date.now()}`,
        },
        body: JSON.stringify({
          tenant_id: "syston",
          email: `contract-${Date.now()}@example.com`,
          password: "SecurePassword123!",
          profile: { name: "Contract Test User" },
        }),
      });

      const response = await worker.fetch(request, env);
      const data = await response.json() as any;

      // Contract validation
      expect(data).toHaveProperty("success");
      expect(typeof data.success).toBe("boolean");

      if (data.success) {
        // Success response structure
        expect(data).toHaveProperty("data");
        expect(data.data).toHaveProperty("token");
        expect(typeof data.data.token).toBe("string");

        // Optional fields that may be present
        if (data.data.userId) {
          expect(typeof data.data.userId).toBe("string");
        }
        if (data.data.user) {
          expect(typeof data.data.user).toBe("object");
        }
      } else {
        // Error response structure
        expect(data).toHaveProperty("error");
        expect(typeof data.error).toBe("object");
        expect(data.error).toHaveProperty("code");
        expect(data.error).toHaveProperty("message");
      }
    });

    it("returns expected error structure on validation failure", async () => {
      const request = new Request("https://example.com/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": `contract-test-${Date.now()}`,
        },
        body: JSON.stringify({
          // Missing required fields
          tenant_id: "syston",
        }),
      });

      const response = await worker.fetch(request, env);
      const data = await response.json() as any;

      // Contract validation for errors
      expect(data).toHaveProperty("success");
      expect(data.success).toBe(false);
      expect(data).toHaveProperty("error");
      expect(typeof data.error).toBe("object");

      // Error must have code and message
      expect(data.error).toHaveProperty("code");
      expect(data.error).toHaveProperty("message");
      expect(typeof data.error.code).toBe("string");
      expect(typeof data.error.message).toBe("string");
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("returns expected response structure", async () => {
      const request = new Request("https://example.com/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenant_id: "syston",
          email: "test@example.com",
          password: "password123",
        }),
      });

      const response = await worker.fetch(request, env);
      const data = await response.json() as any;

      // Contract validation
      expect(data).toHaveProperty("success");
      expect(typeof data.success).toBe("boolean");

      if (data.success) {
        expect(data).toHaveProperty("data");
        expect(data.data).toHaveProperty("token");
        expect(typeof data.data.token).toBe("string");
      } else {
        expect(data).toHaveProperty("error");
        expect(data.error).toHaveProperty("code");
        expect(data.error).toHaveProperty("message");
      }
    });
  });

  describe("Protected endpoints (requires authentication)", () => {
    it("returns 401 or 404 when accessing protected routes without auth", async () => {
      const request = new Request("https://example.com/api/v1/videos");

      const response = await worker.fetch(request, env);

      // Contract: Protected routes return 401 (or 404 if route doesn't exist)
      expect([401, 404]).toContain(response.status);

      // Try to parse as JSON, but handle plain text responses
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const data = await response.json() as any;
        expect(data).toHaveProperty("success");
        expect(data.success).toBe(false);
      }
    });
  });
});
