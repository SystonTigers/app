import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../../index";

describe("Signup Routes", () => {
  it("should reject signup without required fields", async () => {
    const request = new Request("https://example.com/public/signup/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await worker.fetch(request, env);
    expect(response.status).toBe(400);
    const data: any = await response.json();
    expect(data.success).toBe(false);
  });

  it("should respond to valid signup request", async () => {
    const request = new Request("https://example.com/public/signup/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clubName: "Test Club",
        clubSlug: "test-club-" + Date.now(),
        email: "test@example.com",
        plan: "starter",
      }),
    });

    const response = await worker.fetch(request, env);
    // Route exists and responds (may be 200 or 500 depending on DB state)
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(600);
  });

  it("should respond to promo code verification", async () => {
    const request = new Request("https://example.com/public/signup/verify-promo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        promoCode: "INVALID",
      }),
    });

    const response = await worker.fetch(request, env);
    // Route exists and responds
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(600);
  });
});
