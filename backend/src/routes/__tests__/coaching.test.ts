import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../../index";

describe("AI Coaching Routes", () => {
  it("should require authentication for analyze mistakes", async () => {
    const request = new Request("https://example.com/api/v1/videos/test-id/analyze-mistakes", {
      method: "POST",
    });

    const response = await worker.fetch(request, env);
    expect(response.status).toBe(401);
  });

  it("should require authentication for generate drills", async () => {
    const request = new Request("https://example.com/api/v1/coaching/generate-drills", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mistakes: [],
      }),
    });

    const response = await worker.fetch(request, env);
    expect(response.status).toBe(401);
  });

  it("should require authentication for coaching sessions", async () => {
    const request = new Request("https://example.com/api/v1/coaching/sessions");

    const response = await worker.fetch(request, env);
    expect(response.status).toBe(401);
  });
});
