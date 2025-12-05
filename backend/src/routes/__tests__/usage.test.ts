import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../../index";

describe("Usage Routes", () => {
  it("should require authentication for getting usage", async () => {
    const request = new Request("https://example.com/api/v1/usage");
    const response = await worker.fetch(request, env);
    expect(response.status).toBe(401);
  });

  it("should require authentication for incrementing usage", async () => {
    const request = new Request("https://example.com/api/v1/usage/increment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        metric: "api_calls",
      }),
    });
    const response = await worker.fetch(request, env);
    expect(response.status).toBe(401);
  });
});
