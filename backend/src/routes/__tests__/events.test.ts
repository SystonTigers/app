import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../../index";

describe("Events Routes", () => {
  it("should require authentication for creating events", async () => {
    const request = new Request("https://example.com/api/v1/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Test Event",
        date: "2025-12-31",
      }),
    });

    const response = await worker.fetch(request, env);
    expect(response.status).toBe(401);
  });

  it("should require authentication for event list", async () => {
    const request = new Request("https://example.com/api/v1/events");

    const response = await worker.fetch(request, env);
    expect(response.status).toBe(401);
  });

  it("should require authentication for RSVP", async () => {
    const request = new Request("https://example.com/api/v1/events/test-id/rsvp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status: "going",
      }),
    });

    const response = await worker.fetch(request, env);
    expect(response.status).toBe(401);
  });
});
