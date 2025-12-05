import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../../index";

// Mock ExecutionContext for worker tests
const mockCtx = {
  waitUntil: () => { },
  passThroughOnException: () => { },
  props: {},
} as unknown as ExecutionContext;

describe("Player Routes", () => {
  it("should require authentication for uploading player photo", async () => {
    const request = new Request("https://example.com/api/v1/players/test-player/photo", {
      method: "POST",
    });
    const response = await worker.fetch(request, env, mockCtx);
    expect(response.status).toBe(401);
  });

  it("should require authentication for deleting player photo", async () => {
    const request = new Request("https://example.com/api/v1/players/test-player/photo", {
      method: "DELETE",
    });
    const response = await worker.fetch(request, env, mockCtx);
    expect(response.status).toBe(401);
  });
});
