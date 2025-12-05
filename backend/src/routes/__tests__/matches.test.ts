import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../../index";

// Mock ExecutionContext for worker tests
const mockCtx = {
  waitUntil: () => { },
  passThroughOnException: () => { },
  props: {},
} as unknown as ExecutionContext;

describe("Match Routes", () => {
  it("should require authentication for match updates", async () => {
    const request = new Request("https://example.com/api/v1/matches/test-match/updates");
    const response = await worker.fetch(request, env, mockCtx);
    expect(response.status).toBe(401);
  });
});
