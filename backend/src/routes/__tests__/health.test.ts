import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../../index";

// Mock ExecutionContext for worker tests
const mockCtx = {
  waitUntil: () => { },
  passThroughOnException: () => { },
  props: {},
} as unknown as ExecutionContext;

describe("Health Routes", () => {
  it("should return healthy on /healthz", async () => {
    const request = new Request("https://example.com/healthz");
    const response = await worker.fetch(request, env, mockCtx);

    expect(response.status).toBe(200);
    const data = await response.json() as any;
    expect(data.status).toBe("ok");
  });

  it("should return ready on /readyz", async () => {
    const request = new Request("https://example.com/readyz");
    const response = await worker.fetch(request, env, mockCtx);

    expect(response.status).toBe(200);
    const data = await response.json() as any;
    expect(data.status).toBe("healthy");
    expect(data.checks).toBeDefined();
    expect(data.checks.database).toBe("healthy");
    expect(data.checks.kv).toBe("healthy");
  });
});
