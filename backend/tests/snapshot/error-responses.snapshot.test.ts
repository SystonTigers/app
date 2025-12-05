import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../../src/index";

/**
 * Snapshot Test: Error Responses
 *
 * These tests capture snapshots of error responses to ensure
 * they remain consistent across code changes.
 *
 * If the snapshots fail, it means the error response structure
 * has changed - review carefully as this may be a breaking change.
 */
describe("Snapshot: Error Responses", () => {
  it("snapshots 401 Unauthorized response", async () => {
    const request = new Request("https://example.com/api/v1/videos");
    const response = await worker.fetch(request, env);

    expect(response.status).toBe(401);

    // Snapshot the response structure (not exact values)
    const data = {
      status: response.status,
      contentType: response.headers.get("content-type"),
      // Note: Body might be plain text or JSON
      hasBody: true,
    };

    expect(data).toMatchSnapshot();
  });

  it("snapshots 404 Not Found response", async () => {
    const request = new Request("https://example.com/api/v1/nonexistent-endpoint");
    const response = await worker.fetch(request, env);

    expect(response.status).toBe(404);

    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      const data = await response.json() as any;

      // Normalize dynamic fields for snapshot
      const normalized = {
        success: data.success,
        error: {
          code: data.error?.code,
          message: data.error?.message,
          // Omit requestId as it's dynamic
        },
      };

      expect(normalized).toMatchSnapshot();
    } else {
      // Plain text 404
      const body = await response.text();
      expect({ status: response.status, bodyType: typeof body }).toMatchSnapshot();
    }
  });

  it("snapshots 400 Bad Request response structure", async () => {
    const request = new Request("https://example.com/api/v1/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        // Missing required fields
        tenant_id: "syston",
      }),
    });

    const response = await worker.fetch(request, env);
    expect(response.status).toBeGreaterThanOrEqual(400);

    if (response.headers.get("content-type")?.includes("application/json")) {
      const data = await response.json() as any;

      // Normalize dynamic fields
      const normalized = {
        success: data.success,
        hasError: !!data.error,
        errorFields: data.error
          ? {
              hasCode: !!data.error.code,
              hasMessage: !!data.error.message,
            }
          : null,
      };

      expect(normalized).toMatchSnapshot();
    }
  });

  it("snapshots CORS headers on error responses", async () => {
    const request = new Request("https://example.com/api/v1/videos", {
      headers: {
        "origin": "https://example.com",
      },
    });

    const response = await worker.fetch(request, env);

    const corsHeaders = {
      "access-control-allow-origin":
        response.headers.get("access-control-allow-origin"),
      "access-control-allow-methods":
        response.headers.get("access-control-allow-methods"),
      "access-control-allow-headers":
        response.headers.get("access-control-allow-headers"),
    };

    expect(corsHeaders).toMatchSnapshot();
  });

  it("snapshots OPTIONS preflight response", async () => {
    const request = new Request("https://example.com/api/v1/videos", {
      method: "OPTIONS",
      headers: {
        "origin": "https://example.com",
        "access-control-request-method": "GET",
      },
    });

    const response = await worker.fetch(request, env);
    expect(response.status).toBe(204);

    const corsHeaders = {
      status: response.status,
      "access-control-allow-origin":
        response.headers.get("access-control-allow-origin"),
      "access-control-allow-methods":
        response.headers.get("access-control-allow-methods"),
      "access-control-max-age": response.headers.get("access-control-max-age"),
    };

    expect(corsHeaders).toMatchSnapshot();
  });
});
