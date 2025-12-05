import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../../index";

// Mock ExecutionContext for worker tests
const mockCtx = {
  waitUntil: () => { },
  passThroughOnException: () => { },
  props: {},
} as unknown as ExecutionContext;

describe("Video Routes", () => {
  it("should require authentication for video list", async () => {
    const request = new Request("https://example.com/api/v1/videos");

    const response = await worker.fetch(request, env, mockCtx);
    expect(response.status).toBe(401);
  });

  it("should require authentication for video upload", async () => {
    const request = new Request("https://example.com/api/v1/videos/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filename: "test.mp4",
        size: 1000,
      }),
    });

    const response = await worker.fetch(request, env, mockCtx);
    expect(response.status).toBe(401);
  });

  it("should require authentication for video deletion", async () => {
    const request = new Request("https://example.com/api/v1/videos/test-id", {
      method: "DELETE",
    });

    const response = await worker.fetch(request, env, mockCtx);
    expect(response.status).toBe(401);
  });
});
