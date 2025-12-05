import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../../index";

describe("MOTM (Man of the Match) Routes", () => {
  it("should require authentication for initializing vote", async () => {
    const request = new Request("https://example.com/api/v1/motm/test-match");
    const response = await worker.fetch(request, env);
    expect(response.status).toBe(401);
  });

  it("should require authentication for casting vote", async () => {
    const request = new Request("https://example.com/api/v1/motm/test-match/vote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        playerId: "player-123",
      }),
    });
    const response = await worker.fetch(request, env);
    expect(response.status).toBe(401);
  });

  it("should require authentication for getting results", async () => {
    const request = new Request("https://example.com/api/v1/motm/test-match/results");
    const response = await worker.fetch(request, env);
    expect(response.status).toBe(401);
  });
});
