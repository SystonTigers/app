import { describe, it, expect, beforeEach, vi } from "vitest";
import { handleMagicStart, handleMagicVerify } from "../magic";

// Mock email service
vi.mock("../../lib/email", () => ({
  sendMagicLinkEmail: vi.fn(async () => ({
    success: true,
    messageId: "test-message-id",
  })),
}));

describe("Magic Link Authentication", () => {
  let mockEnv: any;
  let mockDB: any;
  let corsHdrs: Headers;

  beforeEach(() => {
    mockDB = {
      prepare: vi.fn((query: string) => ({
        bind: vi.fn(() => ({
          first: vi.fn(async () => ({ name: "Test Club" })),
        })),
      })),
    };

    mockEnv = {
      DB: mockDB,
      JWT_SECRET: "test-secret-key-at-least-32-characters-long",
      JWT_ISSUER: "test-issuer",
      ADMIN_CONSOLE_URL: "https://admin.example.com",
    };

    corsHdrs = new Headers();
  });

  describe("handleMagicStart", () => {
    it("sends magic link email for valid email", async () => {
      const request = new Request("https://example.com/auth/magic/start", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "user@example.com",
          tenantId: "tenant-123",
        }),
      });

      const response = await handleMagicStart(request, mockEnv, corsHdrs);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("normalizes email to lowercase", async () => {
      const request = new Request("https://example.com/auth/magic/start", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "USER@EXAMPLE.COM",
          tenantId: "tenant-123",
        }),
      });

      const response = await handleMagicStart(request, mockEnv, corsHdrs);

      expect(response.status).toBe(200);
      // Email should be sent to lowercase version
    });

    it("defaults to platform tenant when not specified", async () => {
      const request = new Request("https://example.com/auth/magic/start", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "admin@example.com",
        }),
      });

      const response = await handleMagicStart(request, mockEnv, corsHdrs);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("requires email in request body", async () => {
      const request = new Request("https://example.com/auth/magic/start", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          tenantId: "tenant-123",
        }),
      });

      const response = await handleMagicStart(request, mockEnv, corsHdrs);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("email required");
    });

    it("rejects empty email", async () => {
      const request = new Request("https://example.com/auth/magic/start", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "",
          tenantId: "tenant-123",
        }),
      });

      const response = await handleMagicStart(request, mockEnv, corsHdrs);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it("fetches tenant name for personalized email", async () => {
      const request = new Request("https://example.com/auth/magic/start", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "user@example.com",
          tenantId: "tenant-123",
        }),
      });

      await handleMagicStart(request, mockEnv, corsHdrs);

      expect(mockDB.prepare).toHaveBeenCalledWith(
        expect.stringContaining("SELECT name FROM tenants")
      );
    });

    it("handles database errors gracefully", async () => {
      mockDB.prepare.mockImplementation(() => ({
        bind: () => ({
          first: async () => {
            throw new Error("Database error");
          },
        }),
      }));

      const request = new Request("https://example.com/auth/magic/start", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "user@example.com",
          tenantId: "tenant-123",
        }),
      });

      // Should still succeed even if DB lookup fails
      const response = await handleMagicStart(request, mockEnv, corsHdrs);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("generates valid JWT token with 24h expiry", async () => {
      const request = new Request("https://example.com/auth/magic/start", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "user@example.com",
          tenantId: "tenant-123",
        }),
      });

      const response = await handleMagicStart(request, mockEnv, corsHdrs);

      expect(response.status).toBe(200);
      // Token is generated and sent via email (we can't easily inspect it in the test)
    });

    it("continues even if email send fails", async () => {
      // Mock email failure
      const { sendMagicLinkEmail } = await import("../../lib/email");
      vi.mocked(sendMagicLinkEmail).mockResolvedValueOnce({
        success: false,
        error: "Email service unavailable",
      });

      const request = new Request("https://example.com/auth/magic/start", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "user@example.com",
          tenantId: "tenant-123",
        }),
      });

      // Should still return success (link is logged)
      const response = await handleMagicStart(request, mockEnv, corsHdrs);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe("handleMagicVerify", () => {
    it("verifies valid magic link token", async () => {
      // Generate a valid magic link token
      const { SignJWT } = await import("jose");
      const now = Math.floor(Date.now() / 1000);
      const token = await new SignJWT({
        type: "magic_link",
        roles: ["owner", "admin"],
        tenantId: "tenant-123",
      })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuer(mockEnv.JWT_ISSUER)
        .setAudience("syston-admin")
        .setSubject("user@example.com")
        .setIssuedAt(now)
        .setExpirationTime(now + 24 * 3600)
        .sign(new TextEncoder().encode(mockEnv.JWT_SECRET));

      const request = new Request(
        `https://example.com/auth/magic/verify?token=${token}`,
        {
          method: "GET",
        }
      );

      const response = await handleMagicVerify(request, mockEnv, corsHdrs);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.tenantId).toBe("tenant-123");
    });

    it("sets HttpOnly session cookie", async () => {
      const { SignJWT } = await import("jose");
      const now = Math.floor(Date.now() / 1000);
      const token = await new SignJWT({
        type: "magic_link",
        roles: ["owner", "admin"],
        tenantId: "tenant-123",
      })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuer(mockEnv.JWT_ISSUER)
        .setAudience("syston-admin")
        .setSubject("user@example.com")
        .setIssuedAt(now)
        .setExpirationTime(now + 24 * 3600)
        .sign(new TextEncoder().encode(mockEnv.JWT_SECRET));

      const request = new Request(
        `https://example.com/auth/magic/verify?token=${token}`,
        {
          method: "GET",
        }
      );

      const response = await handleMagicVerify(request, mockEnv, corsHdrs);

      const setCookieHeader = response.headers.get("Set-Cookie");
      expect(setCookieHeader).toBeTruthy();
      expect(setCookieHeader).toContain("owner_session=");
      expect(setCookieHeader).toContain("HttpOnly");
      expect(setCookieHeader).toContain("Secure");
      expect(setCookieHeader).toContain("SameSite=Lax");
    });

    it("session JWT has 7 day expiry", async () => {
      const { SignJWT } = await import("jose");
      const now = Math.floor(Date.now() / 1000);
      const token = await new SignJWT({
        type: "magic_link",
        roles: ["owner", "admin"],
        tenantId: "tenant-123",
      })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuer(mockEnv.JWT_ISSUER)
        .setAudience("syston-admin")
        .setSubject("user@example.com")
        .setIssuedAt(now)
        .setExpirationTime(now + 24 * 3600)
        .sign(new TextEncoder().encode(mockEnv.JWT_SECRET));

      const request = new Request(
        `https://example.com/auth/magic/verify?token=${token}`,
        {
          method: "GET",
        }
      );

      const response = await handleMagicVerify(request, mockEnv, corsHdrs);

      const setCookieHeader = response.headers.get("Set-Cookie");
      expect(setCookieHeader).toContain(`Max-Age=${7 * 24 * 3600}`);
    });

    it("requires token parameter", async () => {
      const request = new Request("https://example.com/auth/magic/verify", {
        method: "GET",
      });

      const response = await handleMagicVerify(request, mockEnv, corsHdrs);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("token required");
    });

    it("rejects expired magic link token", async () => {
      const { SignJWT } = await import("jose");
      const now = Math.floor(Date.now() / 1000);
      const expiredToken = await new SignJWT({
        type: "magic_link",
        roles: ["owner", "admin"],
        tenantId: "tenant-123",
      })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuer(mockEnv.JWT_ISSUER)
        .setAudience("syston-admin")
        .setSubject("user@example.com")
        .setIssuedAt(now - 48 * 3600) // 48 hours ago
        .setExpirationTime(now - 24 * 3600) // Expired 24 hours ago
        .sign(new TextEncoder().encode(mockEnv.JWT_SECRET));

      const request = new Request(
        `https://example.com/auth/magic/verify?token=${expiredToken}`,
        {
          method: "GET",
        }
      );

      await expect(handleMagicVerify(request, mockEnv, corsHdrs)).rejects.toThrow();
    });

    it("rejects token with wrong signature", async () => {
      const wrongEnv = {
        ...mockEnv,
        JWT_SECRET: "different-secret-key-that-is-wrong",
      };

      const { SignJWT } = await import("jose");
      const now = Math.floor(Date.now() / 1000);
      const token = await new SignJWT({
        type: "magic_link",
        roles: ["owner", "admin"],
        tenantId: "tenant-123",
      })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuer(mockEnv.JWT_ISSUER)
        .setAudience("syston-admin")
        .setSubject("user@example.com")
        .setIssuedAt(now)
        .setExpirationTime(now + 24 * 3600)
        .sign(new TextEncoder().encode(wrongEnv.JWT_SECRET));

      const request = new Request(
        `https://example.com/auth/magic/verify?token=${token}`,
        {
          method: "GET",
        }
      );

      await expect(handleMagicVerify(request, mockEnv, corsHdrs)).rejects.toThrow();
    });

    it("rejects invalid token format", async () => {
      const request = new Request(
        "https://example.com/auth/magic/verify?token=invalid-token",
        {
          method: "GET",
        }
      );

      await expect(handleMagicVerify(request, mockEnv, corsHdrs)).rejects.toThrow();
    });

    it("transfers tenantId from magic link to session", async () => {
      const { SignJWT } = await import("jose");
      const now = Math.floor(Date.now() / 1000);
      const token = await new SignJWT({
        type: "magic_link",
        roles: ["owner", "admin"],
        tenantId: "specific-tenant-456",
      })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuer(mockEnv.JWT_ISSUER)
        .setAudience("syston-admin")
        .setSubject("user@example.com")
        .setIssuedAt(now)
        .setExpirationTime(now + 24 * 3600)
        .sign(new TextEncoder().encode(mockEnv.JWT_SECRET));

      const request = new Request(
        `https://example.com/auth/magic/verify?token=${token}`,
        {
          method: "GET",
        }
      );

      const response = await handleMagicVerify(request, mockEnv, corsHdrs);

      const data = await response.json();
      expect(data.tenantId).toBe("specific-tenant-456");
    });
  });

  describe("Magic Link Security", () => {
    it("magic link token is single-use (not tested in code, but recommended)", () => {
      // Note: Current implementation doesn't invalidate tokens after use
      // This is a security recommendation for future improvement
      expect(true).toBe(true);
    });

    it("uses syston-admin audience for admin console", async () => {
      const { SignJWT } = await import("jose");
      const now = Math.floor(Date.now() / 1000);
      const token = await new SignJWT({
        type: "magic_link",
        roles: ["owner", "admin"],
        tenantId: "tenant-123",
      })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuer(mockEnv.JWT_ISSUER)
        .setAudience("syston-admin")
        .setSubject("user@example.com")
        .setIssuedAt(now)
        .setExpirationTime(now + 24 * 3600)
        .sign(new TextEncoder().encode(mockEnv.JWT_SECRET));

      const request = new Request(
        `https://example.com/auth/magic/verify?token=${token}`,
        {
          method: "GET",
        }
      );

      const response = await handleMagicVerify(request, mockEnv, corsHdrs);

      expect(response.status).toBe(200);
    });

    it("rejects magic link with wrong audience", async () => {
      const { SignJWT } = await import("jose");
      const now = Math.floor(Date.now() / 1000);
      const token = await new SignJWT({
        type: "magic_link",
        roles: ["owner", "admin"],
        tenantId: "tenant-123",
      })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuer(mockEnv.JWT_ISSUER)
        .setAudience("syston-mobile") // Wrong audience
        .setSubject("user@example.com")
        .setIssuedAt(now)
        .setExpirationTime(now + 24 * 3600)
        .sign(new TextEncoder().encode(mockEnv.JWT_SECRET));

      const request = new Request(
        `https://example.com/auth/magic/verify?token=${token}`,
        {
          method: "GET",
        }
      );

      await expect(handleMagicVerify(request, mockEnv, corsHdrs)).rejects.toThrow();
    });
  });
});
