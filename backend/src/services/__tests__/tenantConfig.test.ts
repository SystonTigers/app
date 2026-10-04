import { describe, it, expect, beforeEach } from "vitest";
import {
  getTenantConfig,
  putTenantConfig,
  ensureTenant,
} from "../tenantConfig";

class MockKV {
  private store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

describe("tenantConfig service", () => {
  let mockKV: MockKV;
  let env: any;

  beforeEach(() => {
    mockKV = new MockKV();
    env = {
      KV_IDEMP: mockKV,
    };
  });

  describe("getTenantConfig", () => {
    it("returns null for non-existent tenant", async () => {
      const config = await getTenantConfig(env, "non-existent");
      expect(config).toBeNull();
    });

    it("returns parsed config for existing tenant", async () => {
      const testConfig = {
        id: "test-tenant",
        flags: { direct_yt: false },
        creds: {},
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      await env.KV_IDEMP.put(`tenant:test-tenant`, JSON.stringify(testConfig));

      const config = await getTenantConfig(env, "test-tenant");
      expect(config).not.toBeNull();
      expect(config?.id).toBe("test-tenant");
      expect(config?.flags.direct_yt).toBe(false);
    });

    it("returns null for malformed JSON", async () => {
      await env.KV_IDEMP.put("tenant:bad-json", "not valid json {");
      const config = await getTenantConfig(env, "bad-json");
      expect(config).toBeNull();
    });
  });

  describe("putTenantConfig", () => {
    it("stores config with updated timestamp", async () => {
      const config = {
        id: "new-tenant",
        flags: { direct_yt: true },
        creds: {},
        created_at: Date.now(),
        updated_at: 0, // Will be updated
      };

      await putTenantConfig(env, config);

      const stored = await getTenantConfig(env, "new-tenant");
      expect(stored).not.toBeNull();
      expect(stored?.id).toBe("new-tenant");
      expect(stored?.updated_at).toBeGreaterThan(0);
    });
  });

  describe("ensureTenant", () => {
    it("creates new tenant if not exists", async () => {
      const config = await ensureTenant(env, "new-tenant");

      expect(config.id).toBe("new-tenant");
      expect(config.flags.direct_yt).toBe(true);
      expect(config.created_at).toBeGreaterThan(0);
    });

    it("returns existing tenant if already exists", async () => {
      const first = await ensureTenant(env, "existing-tenant");
      const second = await ensureTenant(env, "existing-tenant");

      expect(first.id).toBe(second.id);
      expect(first.created_at).toBe(second.created_at);
    });
  });

});
