import { describe, it, expect, beforeEach } from "vitest";
import {
  getTenantConfig,
  putTenantConfig,
  ensureTenant,
  updateFlags,
  setMakeWebhook,
  isAllowedWebhookHost
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
        flags: { use_make: true, direct_yt: false },
        creds: {},
        makeWebhookUrl: "https://example.com/webhook",
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      await env.KV_IDEMP.put(`tenant:test-tenant`, JSON.stringify(testConfig));

      const config = await getTenantConfig(env, "test-tenant");
      expect(config).not.toBeNull();
      expect(config?.id).toBe("test-tenant");
      expect(config?.flags.use_make).toBe(true);
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
        flags: { use_make: false, direct_yt: true },
        creds: {},
        makeWebhookUrl: null,
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
      expect(config.flags.use_make).toBe(false);
      expect(config.flags.direct_yt).toBe(true);
      expect(config.makeWebhookUrl).toBeNull();
      expect(config.created_at).toBeGreaterThan(0);
    });

    it("returns existing tenant if already exists", async () => {
      const first = await ensureTenant(env, "existing-tenant");
      const second = await ensureTenant(env, "existing-tenant");

      expect(first.id).toBe(second.id);
      expect(first.created_at).toBe(second.created_at);
    });
  });

  describe("updateFlags", () => {
    it("merges flags with existing config", async () => {
      await ensureTenant(env, "test-tenant");

      const updated = await updateFlags(env, "test-tenant", { use_make: true });

      expect(updated.flags.use_make).toBe(true);
      expect(updated.flags.direct_yt).toBe(true); // Original value preserved
    });

    it("creates tenant if not exists before updating", async () => {
      const config = await updateFlags(env, "new-tenant", { use_make: true });

      expect(config.id).toBe("new-tenant");
      expect(config.flags.use_make).toBe(true);
    });
  });

  describe("setMakeWebhook", () => {
    it("sets webhook URL for tenant", async () => {
      const config = await setMakeWebhook(
        env,
        "test-tenant",
        "https://hook.make.com/webhook123"
      );

      expect(config.makeWebhookUrl).toBe("https://hook.make.com/webhook123");
    });
  });

  describe("isAllowedWebhookHost", () => {
    it("returns true for exact match", () => {
      const allowed = isAllowedWebhookHost(
        "hook.make.com",
        "hook.make.com,example.com"
      );
      expect(allowed).toBe(true);
    });

    it("returns true for suffix match", () => {
      const allowed = isAllowedWebhookHost(
        "subdomain.make.com",
        ".make.com"
      );
      expect(allowed).toBe(true);
    });

    it("returns false for non-matching host", () => {
      const allowed = isAllowedWebhookHost(
        "evil.com",
        "hook.make.com,.make.com"
      );
      expect(allowed).toBe(false);
    });

    it("returns false for empty host", () => {
      const allowed = isAllowedWebhookHost("", "hook.make.com");
      expect(allowed).toBe(false);
    });

    it("returns false for empty allowed list", () => {
      const allowed = isAllowedWebhookHost("hook.make.com", "");
      expect(allowed).toBe(false);
    });

    it("handles case-insensitive matching", () => {
      const allowed = isAllowedWebhookHost(
        "Hook.Make.COM",
        "hook.make.com"
      );
      expect(allowed).toBe(true);
    });

    it("does not allow partial suffix matches", () => {
      const allowed = isAllowedWebhookHost(
        "fakemake.com",
        ".make.com"
      );
      expect(allowed).toBe(false);
    });
  });
});
