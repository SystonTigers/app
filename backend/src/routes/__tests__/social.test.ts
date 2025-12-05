import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../../index";

// Mock ExecutionContext for worker tests
const mockCtx = {
  waitUntil: () => { },
  passThroughOnException: () => { },
  props: {},
} as unknown as ExecutionContext;

describe("Social Media Routes", () => {
  it("should require authentication for creating social posts", async () => {
    const request = new Request("https://example.com/api/v1/social/posts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: "Test post",
        platforms: ["twitter"],
      }),
    });
    const response = await worker.fetch(request, env, mockCtx);
    expect(response.status).toBe(401);
  });

  it("should require authentication for listing social posts", async () => {
    const request = new Request("https://example.com/api/v1/social/posts");
    const response = await worker.fetch(request, env, mockCtx);
    expect(response.status).toBe(401);
  });

  it("should require authentication for deleting social posts", async () => {
    const request = new Request("https://example.com/api/v1/social/posts/test-id", {
      method: "DELETE",
    });
    const response = await worker.fetch(request, env, mockCtx);
    expect(response.status).toBe(401);
  });

  it("should require authentication for updating social config", async () => {
    const request = new Request("https://example.com/api/v1/social/config", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        twitter: { enabled: true },
      }),
    });
    const response = await worker.fetch(request, env, mockCtx);
    expect(response.status).toBe(401);
  });

  it("should require authentication for getting social config", async () => {
    const request = new Request("https://example.com/api/v1/social/config");
    const response = await worker.fetch(request, env, mockCtx);
    expect(response.status).toBe(401);
  });
});
