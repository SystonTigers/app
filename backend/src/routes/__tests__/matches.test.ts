import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../../index";

describe("Match Routes", () => {
  it("should require authentication for match updates", async () => {
    const request = new Request("https://example.com/api/v1/matches/test-match/updates");
    const response = await worker.fetch(request, env);
    expect(response.status).toBe(401);
  });
});
