import { describe, it, expect, beforeEach } from "vitest";
import { ensureIdempotent, setFinalIdempotent } from "../idempotency";

class MockKV {
  private store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async put(key: string, value: string, options?: any): Promise<void> {
    this.store.set(key, value);
  }

  clear() {
    this.store.clear();
  }
}

describe("idempotency service", () => {
  let mockKV: MockKV;
  let env: any;

  beforeEach(() => {
    mockKV = new MockKV();
    env = {
      KV_IDEMP: mockKV,
    };
  });

  describe("ensureIdempotent", () => {
    it("returns hit:false for first request", async () => {
      const result = await ensureIdempotent(env, "tenant-a", { data: "test" }, "explicit-key-123");
      expect(result.hit).toBe(false);
      expect(result.key).toBe("explicit-key-123");
      expect(typeof result.store).toBe("function");
    });

    it("returns hit:true with cached response for duplicate request", async () => {
      const cachedResponse = {
        status: 201,
        body: { success: true, data: { id: "test-123" } },
      };

      await setFinalIdempotent(env, "key-123", cachedResponse);

      const result = await ensureIdempotent(env, "tenant-a", {}, "key-123");
      expect(result.hit).toBe(true);
      expect(result.response.status).toBe(201);
      expect(result.response.body.data.id).toBe("test-123");
    });

    it("returns hit:false for different idempotency keys", async () => {
      await setFinalIdempotent(env, "key-123", {
        status: 200,
        body: { success: true },
      });

      const result = await ensureIdempotent(env, "tenant-a", {}, "key-456");
      expect(result.hit).toBe(false);
    });
  });

  describe("setFinalIdempotent", () => {
    it("stores response data", async () => {
      const response = {
        status: 200,
        body: { success: true, data: { message: "Created" } },
      };

      await setFinalIdempotent(env, "key-789", response);

      const stored = await ensureIdempotent(env, "tenant-a", {}, "key-789");
      expect(stored.hit).toBe(true);
      expect(stored.response.status).toBe(200);
      expect(stored.response.body.data.message).toBe("Created");
    });

    it("overwrites previous response for same key", async () => {
      await setFinalIdempotent(env, "key-abc", {
        status: 200,
        body: { value: 1 },
      });

      await setFinalIdempotent(env, "key-abc", {
        status: 201,
        body: { value: 2 },
      });

      const stored = await ensureIdempotent(env, "tenant-a", {}, "key-abc");
      expect(stored.hit).toBe(true);
      expect(stored.response.body.value).toBe(2);
    });
  });

  describe("idempotency workflow", () => {
    it("prevents duplicate processing of same request", async () => {
      // First request - no cache
      const first = await ensureIdempotent(env, "tenant-a", { action: "create" }, "workflow-key");
      expect(first.hit).toBe(false);

      // Process and cache result using the store function
      await first.store({
        status: 201,
        body: { success: true, id: "created-123" },
      });

      // Second request - returns cached
      const second = await ensureIdempotent(env, "tenant-a", { action: "create" }, "workflow-key");
      expect(second.hit).toBe(true);
      expect(second.response.status).toBe(201);
      expect(second.response.body.id).toBe("created-123");
    });
  });
});
