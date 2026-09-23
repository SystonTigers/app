import { describe, it, expect } from "vitest";
import { rateLimit } from "../rateLimit";

function memoryKV() {
  const store = new Map<string, string>();
  return {
    store,
    get: async (k: string) => store.get(k) ?? null,
    put: async (k: string, v: string) => { store.set(k, v); },
  };
}

const req = () => new Request("https://api.test/api/v1/auth/login", { headers: { "CF-Connecting-IP": "1.2.3.4" } });

describe("rateLimit in production", () => {
  it("falls back to KV_IDEMP when RATE_LIMIT_KV isn't bound (login must work)", async () => {
    const kv = memoryKV();
    const env = { ENVIRONMENT: "production", KV_IDEMP: kv } as any;
    const res = await rateLimit(req(), env, { scope: "auth:login", limit: 2, windowSeconds: 60 });
    expect(res.ok).toBe(true);
    expect([...kv.store.keys()].some((k) => k.startsWith("rl:auth:login:"))).toBe(true);
  });

  it("blocks once the limit is used up", async () => {
    const env = { ENVIRONMENT: "production", KV_IDEMP: memoryKV() } as any;
    const opts = { scope: "auth:login", limit: 2, windowSeconds: 60 };
    expect((await rateLimit(req(), env, opts)).ok).toBe(true);
    expect((await rateLimit(req(), env, opts)).ok).toBe(true);
    expect((await rateLimit(req(), env, opts)).ok).toBe(false);
  });

  it("still fails closed if no KV is bound at all", async () => {
    const res = await rateLimit(req(), { ENVIRONMENT: "production" } as any, { scope: "auth:login" });
    expect(res.ok).toBe(false);
  });
});
