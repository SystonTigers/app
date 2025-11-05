import { describe, it, expect, beforeEach } from "vitest";
import {
  generateCsrfToken,
  validateCsrfToken,
  requireCsrfToken,
  invalidateCsrfToken,
  clearCsrfTokens,
  getCsrfTokenInfo,
} from "../csrf";

describe("CSRF Protection Service", () => {
  let mockEnv: any;
  let mockKV: Map<string, string>;

  beforeEach(() => {
    mockKV = new Map();
    mockEnv = {
      KV_IDEMP: {
        get: async (key: string) => mockKV.get(key) || null,
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

  describe("generateCsrfToken", () => {
    it("generates a cryptographically secure token", async () => {
      const { token } = await generateCsrfToken(mockEnv);

      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
      expect(token.length).toBe(64); // 32 bytes as hex = 64 characters
      expect(token).toMatch(/^[0-9a-f]{64}$/); // Hex characters only
    });

    it("generates unique tokens", async () => {
      const { token: token1 } = await generateCsrfToken(mockEnv);
      const { token: token2 } = await generateCsrfToken(mockEnv);

      expect(token1).not.toBe(token2);
    });

    it("returns cookie header with security attributes", async () => {
      const { cookieHeader } = await generateCsrfToken(mockEnv);

      expect(cookieHeader).toContain("csrf_token=");
      expect(cookieHeader).toContain("HttpOnly");
      expect(cookieHeader).toContain("Secure");
      expect(cookieHeader).toContain("SameSite=Strict");
      expect(cookieHeader).toContain("Path=/");
      expect(cookieHeader).toContain("Max-Age=3600");
    });

    it("stores token in KV when sessionId provided", async () => {
      const { token } = await generateCsrfToken(mockEnv, "user-123");

      const key = `csrf:user-123:${token}`;
      const stored = mockKV.get(key);

      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.token).toBe(token);
      expect(parsed.sessionId).toBe("user-123");
      expect(parsed.createdAt).toBeDefined();
    });

    it("does not store in KV when sessionId not provided", async () => {
      const { token } = await generateCsrfToken(mockEnv);

      // Should not store anything
      expect(mockKV.size).toBe(0);
    });

    it("handles missing KV gracefully", async () => {
      const envWithoutKV = { KV_IDEMP: null };

      const { token, cookieHeader } = await generateCsrfToken(
        envWithoutKV,
        "user-123"
      );

      expect(token).toBeTruthy();
      expect(cookieHeader).toBeTruthy();
    });
  });

  describe("validateCsrfToken", () => {
    it("validates matching tokens in header and cookie", async () => {
      const { token } = await generateCsrfToken(mockEnv);

      const req = new Request("https://example.com/api/test", {
        headers: {
          "x-csrf-token": token,
          Cookie: `csrf_token=${token}`,
        },
      });

      const valid = await validateCsrfToken(req, mockEnv);
      expect(valid).toBe(true);
    });

    it("validates matching tokens in body and cookie", async () => {
      const { token } = await generateCsrfToken(mockEnv);

      const req = new Request("https://example.com/api/test", {
        method: "POST",
        headers: {
          Cookie: `csrf_token=${token}`,
        },
      });

      const body = { csrf_token: token, other: "data" };
      const valid = await validateCsrfToken(req, mockEnv, body);

      expect(valid).toBe(true);
    });

    it("rejects when token missing from request", async () => {
      const { token } = await generateCsrfToken(mockEnv);

      const req = new Request("https://example.com/api/test", {
        headers: {
          Cookie: `csrf_token=${token}`,
        },
      });

      const valid = await validateCsrfToken(req, mockEnv);
      expect(valid).toBe(false);
    });

    it("rejects when cookie missing", async () => {
      const { token } = await generateCsrfToken(mockEnv);

      const req = new Request("https://example.com/api/test", {
        headers: {
          "x-csrf-token": token,
        },
      });

      const valid = await validateCsrfToken(req, mockEnv);
      expect(valid).toBe(false);
    });

    it("rejects when tokens do not match", async () => {
      const { token: token1 } = await generateCsrfToken(mockEnv);
      const { token: token2 } = await generateCsrfToken(mockEnv);

      const req = new Request("https://example.com/api/test", {
        headers: {
          "x-csrf-token": token1,
          Cookie: `csrf_token=${token2}`,
        },
      });

      const valid = await validateCsrfToken(req, mockEnv);
      expect(valid).toBe(false);
    });

    it("validates with stateful KV check when sessionId provided", async () => {
      const { token } = await generateCsrfToken(mockEnv, "user-123");

      const req = new Request("https://example.com/api/test", {
        headers: {
          "x-csrf-token": token,
          Cookie: `csrf_token=${token}`,
        },
      });

      const valid = await validateCsrfToken(req, mockEnv, undefined, "user-123");
      expect(valid).toBe(true);
    });

    it("rejects when token not found in KV (stateful validation)", async () => {
      const { token } = await generateCsrfToken(mockEnv, "user-123");

      // Delete the token from KV
      const key = `csrf:user-123:${token}`;
      mockKV.delete(key);

      const req = new Request("https://example.com/api/test", {
        headers: {
          "x-csrf-token": token,
          Cookie: `csrf_token=${token}`,
        },
      });

      const valid = await validateCsrfToken(req, mockEnv, undefined, "user-123");
      expect(valid).toBe(false);
    });

    it("prefers header token over body token", async () => {
      const { token: correctToken } = await generateCsrfToken(mockEnv);
      const { token: wrongToken } = await generateCsrfToken(mockEnv);

      const req = new Request("https://example.com/api/test", {
        headers: {
          "x-csrf-token": correctToken,
          Cookie: `csrf_token=${correctToken}`,
        },
      });

      const body = { csrf_token: wrongToken };
      const valid = await validateCsrfToken(req, mockEnv, body);

      // Header token is used, so validation should succeed
      expect(valid).toBe(true);
    });

    it("handles cookie with multiple values", async () => {
      const { token } = await generateCsrfToken(mockEnv);

      const req = new Request("https://example.com/api/test", {
        headers: {
          "x-csrf-token": token,
          Cookie: `other=value; csrf_token=${token}; another=test`,
        },
      });

      const valid = await validateCsrfToken(req, mockEnv);
      expect(valid).toBe(true);
    });
  });

  describe("requireCsrfToken", () => {
    it("passes through when token is valid", async () => {
      const { token } = await generateCsrfToken(mockEnv);

      const req = new Request("https://example.com/api/test", {
        headers: {
          "x-csrf-token": token,
          Cookie: `csrf_token=${token}`,
        },
      });

      // Should not throw
      await expect(requireCsrfToken(req, mockEnv)).resolves.not.toThrow();
    });

    it("throws 403 Response when token is invalid", async () => {
      const req = new Request("https://example.com/api/test", {
        headers: {
          Cookie: `csrf_token=some-token`,
        },
      });

      try {
        await requireCsrfToken(req, mockEnv);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(Response);
        const response = error as Response;
        expect(response.status).toBe(403);

        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.error.code).toBe("CSRF_VALIDATION_FAILED");
        expect(body.error.message).toContain("Invalid or missing CSRF token");
      }
    });

    it("throws 403 Response when token is missing", async () => {
      const req = new Request("https://example.com/api/test");

      try {
        await requireCsrfToken(req, mockEnv);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(Response);
        const response = error as Response;
        expect(response.status).toBe(403);
      }
    });
  });

  describe("invalidateCsrfToken", () => {
    it("deletes token from KV", async () => {
      const { token } = await generateCsrfToken(mockEnv, "user-123");

      const key = `csrf:user-123:${token}`;
      expect(mockKV.has(key)).toBe(true);

      await invalidateCsrfToken(mockEnv, "user-123", token);

      expect(mockKV.has(key)).toBe(false);
    });

    it("handles missing KV gracefully", async () => {
      const envWithoutKV = { KV_IDEMP: null };

      // Should not throw
      await expect(
        invalidateCsrfToken(envWithoutKV, "user-123", "some-token")
      ).resolves.not.toThrow();
    });

    it("handles non-existent token gracefully", async () => {
      await expect(
        invalidateCsrfToken(mockEnv, "user-123", "non-existent-token")
      ).resolves.not.toThrow();
    });
  });

  describe("clearCsrfTokens", () => {
    it("clears all tokens for a session", async () => {
      // Generate multiple tokens for same session
      await generateCsrfToken(mockEnv, "user-123");
      await generateCsrfToken(mockEnv, "user-123");
      await generateCsrfToken(mockEnv, "user-123");

      // Generate token for different session
      await generateCsrfToken(mockEnv, "user-456");

      expect(mockKV.size).toBe(4);

      await clearCsrfTokens(mockEnv, "user-123");

      // Only the user-456 token should remain
      expect(mockKV.size).toBe(1);
      const remainingKey = Array.from(mockKV.keys())[0];
      expect(remainingKey).toContain("user-456");
    });

    it("handles missing KV gracefully", async () => {
      const envWithoutKV = { KV_IDEMP: null };

      await expect(
        clearCsrfTokens(envWithoutKV, "user-123")
      ).resolves.not.toThrow();
    });

    it("handles session with no tokens", async () => {
      await expect(clearCsrfTokens(mockEnv, "user-999")).resolves.not.toThrow();
    });
  });

  describe("getCsrfTokenInfo", () => {
    it("extracts tokens from header and cookie", () => {
      const req = new Request("https://example.com/api/test", {
        headers: {
          "x-csrf-token": "token-123",
          Cookie: `csrf_token=token-123`,
        },
      });

      const info = getCsrfTokenInfo(req);

      expect(info.requestToken).toBe("token-123");
      expect(info.cookieToken).toBe("token-123");
      expect(info.match).toBe(true);
    });

    it("extracts token from body", () => {
      const req = new Request("https://example.com/api/test", {
        headers: {
          Cookie: `csrf_token=token-456`,
        },
      });

      const body = { csrf_token: "token-456" };
      const info = getCsrfTokenInfo(req, body);

      expect(info.requestToken).toBe("token-456");
      expect(info.cookieToken).toBe("token-456");
      expect(info.match).toBe(true);
    });

    it("detects token mismatch", () => {
      const req = new Request("https://example.com/api/test", {
        headers: {
          "x-csrf-token": "token-123",
          Cookie: `csrf_token=token-456`,
        },
      });

      const info = getCsrfTokenInfo(req);

      expect(info.requestToken).toBe("token-123");
      expect(info.cookieToken).toBe("token-456");
      expect(info.match).toBe(false);
    });

    it("handles missing tokens", () => {
      const req = new Request("https://example.com/api/test");

      const info = getCsrfTokenInfo(req);

      expect(info.requestToken).toBeNull();
      expect(info.cookieToken).toBeNull();
      expect(info.match).toBe(false);
    });
  });

  describe("Token Security", () => {
    it("generates tokens with sufficient entropy", async () => {
      const tokens = new Set<string>();

      // Generate 100 tokens and verify uniqueness
      for (let i = 0; i < 100; i++) {
        const { token } = await generateCsrfToken(mockEnv);
        tokens.add(token);
      }

      // All tokens should be unique
      expect(tokens.size).toBe(100);
    });

    it("tokens are hexadecimal strings", async () => {
      const { token } = await generateCsrfToken(mockEnv);

      // Should only contain hex characters (0-9, a-f)
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it("cookie has SameSite=Strict for CSRF protection", async () => {
      const { cookieHeader } = await generateCsrfToken(mockEnv);

      // SameSite=Strict prevents cookie from being sent with cross-site requests
      expect(cookieHeader).toContain("SameSite=Strict");
    });

    it("cookie is HttpOnly to prevent XSS", async () => {
      const { cookieHeader } = await generateCsrfToken(mockEnv);

      // HttpOnly prevents JavaScript access to cookie
      expect(cookieHeader).toContain("HttpOnly");
    });

    it("cookie is Secure for HTTPS only", async () => {
      const { cookieHeader } = await generateCsrfToken(mockEnv);

      // Secure flag ensures cookie is only sent over HTTPS
      expect(cookieHeader).toContain("Secure");
    });
  });
});
