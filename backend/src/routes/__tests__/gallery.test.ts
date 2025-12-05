import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../../index";

// Mock ExecutionContext for worker tests
const mockCtx = {
  waitUntil: () => { },
  passThroughOnException: () => { },
  props: {},
} as unknown as ExecutionContext;

describe("Gallery Routes", () => {
  it("should require authentication for photo upload", async () => {
    const request = new Request("https://example.com/api/v1/gallery/upload", {
      method: "POST",
    });
    const response = await worker.fetch(request, env, mockCtx);
    expect(response.status).toBe(401);
  });

  it("should require authentication for listing photos", async () => {
    const request = new Request("https://example.com/api/v1/gallery/photos");
    const response = await worker.fetch(request, env, mockCtx);
    expect(response.status).toBe(401);
  });

  it("should require authentication for creating albums", async () => {
    const request = new Request("https://example.com/api/v1/gallery/albums", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Test Album",
      }),
    });
    const response = await worker.fetch(request, env, mockCtx);
    expect(response.status).toBe(401);
  });

  it("should require authentication for deleting photos", async () => {
    const request = new Request("https://example.com/api/v1/gallery/photos/test-id", {
      method: "DELETE",
    });
    const response = await worker.fetch(request, env, mockCtx);
    expect(response.status).toBe(401);
  });
});
