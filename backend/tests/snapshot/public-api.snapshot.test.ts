import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../../src/index";

/**
 * Snapshot Test: Public API Responses
 *
 * These tests capture snapshots of public API responses to ensure
 * they remain consistent. Public APIs are especially critical as
 * they're consumed by external clients.
 */
describe("Snapshot: Public API", () => {
  it("snapshots public clubs endpoint response structure", async () => {
    const request = new Request("https://example.com/api/v1/public/clubs");
    const response = await worker.fetch(request, env);

    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      const data = await response.json() as any;

      // Normalize the snapshot to focus on structure, not data
      const normalized = {
        status: response.status,
        success: data.success,
        hasData: !!data.data,
        dataType: typeof data.data,
        isArray: Array.isArray(data.data),
      };

      expect(normalized).toMatchSnapshot();
    } else {
      // Handle plain text responses (like 404)
      const normalized = {
        status: response.status,
        contentType: contentType,
        responseType: "plain-text",
      };

      expect(normalized).toMatchSnapshot();
    }
  });

  it("snapshots response headers for public endpoints", async () => {
    const request = new Request("https://example.com/api/v1/public/clubs");
    const response = await worker.fetch(request, env);

    const headers = {
      "content-type": response.headers.get("content-type"),
      "cache-control": response.headers.get("cache-control"),
      "access-control-allow-origin":
        response.headers.get("access-control-allow-origin"),
    };

    expect(headers).toMatchSnapshot();
  });

  it("snapshots API version in response", async () => {
    const request = new Request("https://example.com/api/v1/public/clubs");
    const response = await worker.fetch(request, env);

    // API version should be in URL structure
    const urlStructure = {
      hasApiPrefix: request.url.includes("/api/"),
      hasVersionPrefix: request.url.includes("/v1/"),
      responseStatus: response.status,
    };

    expect(urlStructure).toMatchSnapshot();
  });
});
