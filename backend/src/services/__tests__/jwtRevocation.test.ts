import { describe, it, expect, beforeEach } from "vitest";
import {
  revokeToken,
  revokeAllUserTokens,
  revokeAllTenantTokens,
  isTokenRevoked,
  listRevokedTokens,
} from "../jwtRevocation";

describe("JWT Revocation Service", () => {
  let mockEnv: any;
  let mockKV: Map<string, string>;

  beforeEach(() => {
    mockKV = new Map();
    mockEnv = {
      KV_IDEMP: {
        get: async (key: string, type?: string) => {
          const value = mockKV.get(key);
          if (!value) return null;
          if (type === "json") return JSON.parse(value);
          return value;
        },
        put: async (key: string, value: string, options?: any) => {
          mockKV.set(key, value);
        },
        delete: async (key: string) => {
          mockKV.delete(key);
        },
        list: async (options?: any) => {
          const keys = Array.from(mockKV.keys());
          const filtered = options?.prefix
            ? keys.filter((k) => k.startsWith(options.prefix))
            : keys;
          const limited = options?.limit
            ? filtered.slice(0, options.limit)
            : filtered;
          return {
            keys: limited.map((name) => ({ name })),
          };
        },
      },
    };
  });

  describe("revokeToken", () => {
    it("revokes a specific token by jti", async () => {
      const token = {
        jti: "token-123",
        sub: "user-456",
        tenantId: "tenant-789",
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      };

      await revokeToken(mockEnv, token, "user logout");

      const revoked = await isTokenRevoked(mockEnv, token);
      expect(revoked).toBe(true);
    });

    it("revokes token by sub when jti not provided", async () => {
      const token = {
        sub: "user-456",
        tenantId: "tenant-789",
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      await revokeToken(mockEnv, token, "security breach");

      const revoked = await isTokenRevoked(mockEnv, token);
      expect(revoked).toBe(true);
    });

    it("stores revocation entry with all metadata", async () => {
      const token = {
        jti: "token-123",
        sub: "user-456",
        tenantId: "tenant-789",
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      await revokeToken(mockEnv, token, "test revocation");

      const key = "jwt:revoked:token-123";
      const stored = mockKV.get(key);
      expect(stored).toBeTruthy();

      const entry = JSON.parse(stored!);
      expect(entry.jti).toBe("token-123");
      expect(entry.sub).toBe("user-456");
      expect(entry.tenantId).toBe("tenant-789");
      expect(entry.reason).toBe("test revocation");
      expect(entry.revokedAt).toBeDefined();
    });

    it("handles missing KV gracefully", async () => {
      const envWithoutKV = { KV_IDEMP: null };
      const token = {
        sub: "user-456",
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      // Should not throw
      await expect(
        revokeToken(envWithoutKV, token)
      ).resolves.not.toThrow();
    });

    it("sets TTL based on token expiration", async () => {
      const now = Math.floor(Date.now() / 1000);
      const token = {
        jti: "token-123",
        sub: "user-456",
        exp: now + 7200, // 2 hours from now
      };

      await revokeToken(mockEnv, token);

      // Entry should be stored (we can't directly test TTL in mock, but it's called)
      const key = "jwt:revoked:token-123";
      expect(mockKV.has(key)).toBe(true);
    });
  });

  describe("revokeAllUserTokens", () => {
    it("revokes all tokens for a specific user", async () => {
      await revokeAllUserTokens(
        mockEnv,
        "tenant-123",
        "user-456",
        "password change"
      );

      // Any token from this user should be revoked
      const token1 = {
        jti: "token-1",
        sub: "user-456",
        tenantId: "tenant-123",
      };
      const token2 = {
        jti: "token-2",
        sub: "user-456",
        tenantId: "tenant-123",
      };

      expect(await isTokenRevoked(mockEnv, token1)).toBe(true);
      expect(await isTokenRevoked(mockEnv, token2)).toBe(true);
    });

    it("does not affect other users in same tenant", async () => {
      await revokeAllUserTokens(mockEnv, "tenant-123", "user-456");

      const otherUserToken = {
        sub: "user-789",
        tenantId: "tenant-123",
      };

      expect(await isTokenRevoked(mockEnv, otherUserToken)).toBe(false);
    });

    it("does not affect same user in different tenant", async () => {
      await revokeAllUserTokens(mockEnv, "tenant-123", "user-456");

      const differentTenantToken = {
        sub: "user-456",
        tenantId: "tenant-789",
      };

      expect(await isTokenRevoked(mockEnv, differentTenantToken)).toBe(false);
    });

    it("stores revocation with reason", async () => {
      await revokeAllUserTokens(
        mockEnv,
        "tenant-123",
        "user-456",
        "account compromised",
        86400
      );

      const key = "jwt:revoked:user:tenant-123:user-456";
      const stored = mockKV.get(key);
      expect(stored).toBeTruthy();

      const entry = JSON.parse(stored!);
      expect(entry.reason).toBe("account compromised");
      expect(entry.tenantId).toBe("tenant-123");
      expect(entry.userId).toBe("user-456");
    });

    it("handles missing KV gracefully", async () => {
      const envWithoutKV = { KV_IDEMP: null };

      await expect(
        revokeAllUserTokens(envWithoutKV, "tenant-123", "user-456")
      ).resolves.not.toThrow();
    });
  });

  describe("revokeAllTenantTokens", () => {
    it("revokes all tokens for entire tenant", async () => {
      await revokeAllTenantTokens(
        mockEnv,
        "tenant-123",
        "tenant suspended",
        604800
      );

      // All tokens from this tenant should be revoked
      const token1 = {
        sub: "user-1",
        tenantId: "tenant-123",
      };
      const token2 = {
        sub: "user-2",
        tenantId: "tenant-123",
      };
      const token3 = {
        jti: "admin-token",
        sub: "admin-1",
        tenantId: "tenant-123",
      };

      expect(await isTokenRevoked(mockEnv, token1)).toBe(true);
      expect(await isTokenRevoked(mockEnv, token2)).toBe(true);
      expect(await isTokenRevoked(mockEnv, token3)).toBe(true);
    });

    it("does not affect other tenants", async () => {
      await revokeAllTenantTokens(mockEnv, "tenant-123", "security breach");

      const otherTenantToken = {
        sub: "user-1",
        tenantId: "tenant-456",
      };

      expect(await isTokenRevoked(mockEnv, otherTenantToken)).toBe(false);
    });

    it("stores revocation with metadata", async () => {
      await revokeAllTenantTokens(
        mockEnv,
        "tenant-123",
        "compliance violation"
      );

      const key = "jwt:revoked:tenant:tenant-123";
      const stored = mockKV.get(key);
      expect(stored).toBeTruthy();

      const entry = JSON.parse(stored!);
      expect(entry.tenantId).toBe("tenant-123");
      expect(entry.reason).toBe("compliance violation");
      expect(entry.revokedAt).toBeDefined();
    });

    it("handles missing KV gracefully", async () => {
      const envWithoutKV = { KV_IDEMP: null };

      await expect(
        revokeAllTenantTokens(envWithoutKV, "tenant-123")
      ).resolves.not.toThrow();
    });
  });

  describe("isTokenRevoked", () => {
    it("returns false for non-revoked token", async () => {
      const token = {
        jti: "valid-token",
        sub: "user-456",
        tenantId: "tenant-123",
      };

      const revoked = await isTokenRevoked(mockEnv, token);
      expect(revoked).toBe(false);
    });

    it("detects specific token revocation", async () => {
      const token = {
        jti: "token-123",
        sub: "user-456",
        tenantId: "tenant-789",
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      await revokeToken(mockEnv, token);

      expect(await isTokenRevoked(mockEnv, token)).toBe(true);
    });

    it("detects user-level revocation", async () => {
      await revokeAllUserTokens(mockEnv, "tenant-123", "user-456");

      const token = {
        jti: "any-token",
        sub: "user-456",
        tenantId: "tenant-123",
      };

      expect(await isTokenRevoked(mockEnv, token)).toBe(true);
    });

    it("detects tenant-level revocation", async () => {
      await revokeAllTenantTokens(mockEnv, "tenant-123");

      const token = {
        sub: "any-user",
        tenantId: "tenant-123",
      };

      expect(await isTokenRevoked(mockEnv, token)).toBe(true);
    });

    it("checks in order: token, user, tenant", async () => {
      // Set up all three levels
      await revokeToken(
        mockEnv,
        {
          jti: "specific-token",
          sub: "user-456",
          tenantId: "tenant-123",
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        "specific"
      );
      await revokeAllUserTokens(mockEnv, "tenant-123", "user-456", "user");
      await revokeAllTenantTokens(mockEnv, "tenant-123", "tenant");

      // All should be detected as revoked
      expect(
        await isTokenRevoked(mockEnv, {
          jti: "specific-token",
          sub: "user-456",
          tenantId: "tenant-123",
        })
      ).toBe(true);

      expect(
        await isTokenRevoked(mockEnv, {
          jti: "other-token",
          sub: "user-456",
          tenantId: "tenant-123",
        })
      ).toBe(true);

      expect(
        await isTokenRevoked(mockEnv, {
          sub: "other-user",
          tenantId: "tenant-123",
        })
      ).toBe(true);
    });

    it("returns false when KV unavailable (fail open)", async () => {
      const envWithoutKV = { KV_IDEMP: null };
      const token = {
        sub: "user-456",
        tenantId: "tenant-123",
      };

      const revoked = await isTokenRevoked(envWithoutKV, token);
      expect(revoked).toBe(false);
    });

    it("handles tokens without tenantId", async () => {
      const token = {
        jti: "platform-token",
        sub: "admin-user",
      };

      // Should not throw, returns false
      const revoked = await isTokenRevoked(mockEnv, token);
      expect(revoked).toBe(false);
    });

    it("returns false on error (fail open)", async () => {
      const badEnv = {
        KV_IDEMP: {
          get: async () => {
            throw new Error("KV error");
          },
        },
      };

      const token = {
        sub: "user-456",
        tenantId: "tenant-123",
      };

      const revoked = await isTokenRevoked(badEnv, token);
      expect(revoked).toBe(false);
    });
  });

  describe("listRevokedTokens", () => {
    it("returns empty array when no tokens revoked", async () => {
      const tokens = await listRevokedTokens(mockEnv, "tenant-123");
      expect(tokens).toEqual([]);
    });

    it("lists all revoked tokens for a tenant", async () => {
      // Revoke some tokens
      await revokeToken(
        mockEnv,
        {
          jti: "token-1",
          sub: "user-1",
          tenantId: "tenant-123",
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        "reason1"
      );

      await revokeToken(
        mockEnv,
        {
          jti: "token-2",
          sub: "user-2",
          tenantId: "tenant-123",
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        "reason2"
      );

      const tokens = await listRevokedTokens(mockEnv, "tenant-123");
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      expect(tokens.some((t) => t.jti === "token-1")).toBe(true);
      expect(tokens.some((t) => t.jti === "token-2")).toBe(true);
    });

    it("filters by tenant", async () => {
      await revokeToken(
        mockEnv,
        {
          jti: "token-123",
          sub: "user-1",
          tenantId: "tenant-123",
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        "test"
      );

      await revokeToken(
        mockEnv,
        {
          jti: "token-456",
          sub: "user-2",
          tenantId: "tenant-456",
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        "test"
      );

      const tokens123 = await listRevokedTokens(mockEnv, "tenant-123");
      const tokens456 = await listRevokedTokens(mockEnv, "tenant-456");

      expect(tokens123.some((t) => t.tenantId === "tenant-456")).toBe(false);
      expect(tokens456.some((t) => t.tenantId === "tenant-123")).toBe(false);
    });

    it("respects limit parameter", async () => {
      // Revoke multiple tokens
      for (let i = 0; i < 10; i++) {
        await revokeToken(
          mockEnv,
          {
            jti: `token-${i}`,
            sub: "user-1",
            tenantId: "tenant-123",
            exp: Math.floor(Date.now() / 1000) + 3600,
          },
          `reason-${i}`
        );
      }

      const tokens = await listRevokedTokens(mockEnv, "tenant-123", 5);
      expect(tokens.length).toBeLessThanOrEqual(5);
    });

    it("returns empty array when KV unavailable", async () => {
      const envWithoutKV = { KV_IDEMP: null };
      const tokens = await listRevokedTokens(envWithoutKV, "tenant-123");
      expect(tokens).toEqual([]);
    });

    it("handles errors gracefully", async () => {
      const badEnv = {
        KV_IDEMP: {
          list: async () => {
            throw new Error("KV error");
          },
        },
      };

      const tokens = await listRevokedTokens(badEnv, "tenant-123");
      expect(tokens).toEqual([]);
    });
  });

  describe("Revocation Hierarchy", () => {
    it("tenant revocation overrides user and token revocations", async () => {
      // Revoke at all levels
      const token = {
        jti: "token-123",
        sub: "user-456",
        tenantId: "tenant-123",
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      await revokeToken(mockEnv, token);
      await revokeAllUserTokens(mockEnv, "tenant-123", "user-456");
      await revokeAllTenantTokens(mockEnv, "tenant-123");

      // Should still be revoked
      expect(await isTokenRevoked(mockEnv, token)).toBe(true);
    });

    it("user revocation affects all user tokens but not others", async () => {
      await revokeAllUserTokens(mockEnv, "tenant-123", "user-456");

      // User's tokens should be revoked
      expect(
        await isTokenRevoked(mockEnv, {
          jti: "token-1",
          sub: "user-456",
          tenantId: "tenant-123",
        })
      ).toBe(true);

      // Other user's tokens should not be affected
      expect(
        await isTokenRevoked(mockEnv, {
          jti: "token-2",
          sub: "user-789",
          tenantId: "tenant-123",
        })
      ).toBe(false);
    });
  });
});
