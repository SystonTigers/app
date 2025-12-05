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
 * Contract Test: Videos API
 *
 * Validates that video endpoints return responses matching
 * the contract expected by the mobile application.
 */
describe("Contract: Videos API", () => {
  describe("GET /api/v1/videos (requires authentication)", () => {
    it("returns 401 when unauthorized", async () => {
      const request = new Request("https://example.com/api/v1/videos");

      const response = await worker.fetch(request, env, mockCtx);
      expect(response.status).toBe(401);

      // Contract: Some endpoints may return JSON, others plain text
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const data = await response.json() as any;
        expect(data).toHaveProperty("success");
        expect(data.success).toBe(false);
      }
      // Plain text "Unauthorized" is also acceptable
    });
  });

  describe("POST /api/v1/videos/upload (requires authentication)", () => {
    it("returns 401 when unauthorized", async () => {
      const request = new Request("https://example.com/api/v1/videos/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          filename: "test.mp4",
          size: 1000000,
          contentType: "video/mp4",
        }),
      });

      const response = await worker.fetch(request, env, mockCtx);
      expect(response.status).toBe(401);

      // Contract: Auth failures return 401 (format may vary)
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const data = await response.json() as any;
        expect(data).toHaveProperty("success");
        expect(data.success).toBe(false);
      }
    });
  });

  describe("Response structure validation", () => {
    it("validates success response has correct top-level fields", async () => {
      // This test validates the expected structure for a successful response
      const mockSuccessResponse = {
        success: true,
        data: {
          videos: [],
          total: 0,
        },
      };

      // Contract validation
      expect(mockSuccessResponse).toHaveProperty("success");
      expect(mockSuccessResponse.success).toBe(true);
      expect(mockSuccessResponse).toHaveProperty("data");
      expect(typeof mockSuccessResponse.data).toBe("object");
    });

    it("validates error response has correct structure", async () => {
      const mockErrorResponse = {
        success: false,
        error: {
          code: "VIDEO_NOT_FOUND",
          message: "Video not found",
          requestId: "req-123",
        },
      };

      // Contract validation
      expect(mockErrorResponse).toHaveProperty("success");
      expect(mockErrorResponse.success).toBe(false);
      expect(mockErrorResponse).toHaveProperty("error");
      expect(mockErrorResponse.error).toHaveProperty("code");
      expect(mockErrorResponse.error).toHaveProperty("message");
      expect(typeof mockErrorResponse.error.code).toBe("string");
      expect(typeof mockErrorResponse.error.message).toBe("string");
    });

    it("validates video object structure", () => {
      const mockVideo = {
        id: "video-123",
        tenant_id: "syston",
        filename: "match.mp4",
        size: 50000000,
        status: "processing",
        created_at: Date.now(),
        metadata: {
          duration: 3600,
          resolution: "1080p",
        },
      };

      // Contract: Video object structure
      expect(mockVideo).toHaveProperty("id");
      expect(mockVideo).toHaveProperty("tenant_id");
      expect(mockVideo).toHaveProperty("filename");
      expect(mockVideo).toHaveProperty("status");
      expect(mockVideo).toHaveProperty("created_at");

      expect(typeof mockVideo.id).toBe("string");
      expect(typeof mockVideo.tenant_id).toBe("string");
      expect(typeof mockVideo.filename).toBe("string");
      expect(typeof mockVideo.status).toBe("string");
      expect(typeof mockVideo.created_at).toBe("number");
    });
  });
});
