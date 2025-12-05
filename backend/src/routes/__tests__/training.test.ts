import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../../index";

// Mock ExecutionContext for worker tests
const mockCtx = {
  waitUntil: () => { },
  passThroughOnException: () => { },
  props: {},
} as unknown as ExecutionContext;

describe("Training Routes", () => {
  it("should require authentication for creating sessions", async () => {
    const request = new Request("https://example.com/api/v1/training/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Test Session",
        date: "2025-12-31",
      }),
    });
    const response = await worker.fetch(request, env, mockCtx);
    expect(response.status).toBe(401);
  });

  it("should require authentication for listing sessions", async () => {
    const request = new Request("https://example.com/api/v1/training/sessions");
    const response = await worker.fetch(request, env, mockCtx);
    expect(response.status).toBe(401);
  });

  it("should require authentication for creating drills", async () => {
    const request = new Request("https://example.com/api/v1/training/drills", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Passing Drill",
      }),
    });
    const response = await worker.fetch(request, env, mockCtx);
    expect(response.status).toBe(401);
  });

  it("should require authentication for listing drills", async () => {
    const request = new Request("https://example.com/api/v1/training/drills");
    const response = await worker.fetch(request, env, mockCtx);
    expect(response.status).toBe(401);
  });
});
