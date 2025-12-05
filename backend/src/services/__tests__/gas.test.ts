import { describe, it, expect, beforeEach, vi } from "vitest";
import { gasCall, type GasAction } from "../gas";
import type { Env } from "../../types/env";

// Mock crypto module
vi.mock("../../lib/crypto", () => ({
  hmac256Base64Url: vi.fn(async () => "mock_signature_base64url"),
}));

describe("GAS Service", () => {
  let mockEnv: Env;
  let mockFetch: any;
  let hmac256Base64UrlMock: any;

  beforeEach(async () => {
    mockEnv = {
      GAS_WEBAPP_URL: "https://script.google.com/macros/s/abc123/exec",
      GAS_HMAC_SECRET: "test-hmac-secret",
    } as Env;

    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Get the mocked function
    const { hmac256Base64Url } = await import("../../lib/crypto");
    hmac256Base64UrlMock = hmac256Base64Url as any;

    vi.clearAllMocks();
  });

  describe("gasCall", () => {
    describe("Request structure", () => {
      it("should make POST request to GAS_WEBAPP_URL", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ success: true }),
        });

        await gasCall(mockEnv, "provision", { tenant: "demo" });

        expect(mockFetch).toHaveBeenCalledWith(
          "https://script.google.com/macros/s/abc123/exec",
          expect.objectContaining({
            method: "POST",
          })
        );
      });

      it("should set correct headers", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ success: true }),
        });

        await gasCall(mockEnv, "provision", { tenant: "demo" });

        const fetchCall = mockFetch.mock.calls[0];
        expect(fetchCall[1].headers).toEqual({
          "content-type": "application/json",
          "x-signature": "mock_signature_base64url",
        });
      });

      it("should include action in request body", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ success: true }),
        });

        await gasCall(mockEnv, "provision", { tenant: "demo" });

        const fetchCall = mockFetch.mock.calls[0];
        const body = JSON.parse(fetchCall[1].body) as any;

        expect(body.action).toBe("provision");
      });

      it("should merge payload into request body", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ success: true }),
        });

        await gasCall(mockEnv, "verify", {
          tenant: "demo",
          spreadsheetId: "sheet123",
          email: "user@example.com",
        });

        const fetchCall = mockFetch.mock.calls[0];
        const body = JSON.parse(fetchCall[1].body) as any;

        expect(body.action).toBe("verify");
        expect(body.tenant).toBe("demo");
        expect(body.spreadsheetId).toBe("sheet123");
        expect(body.email).toBe("user@example.com");
      });
    });

    describe("HMAC signing", () => {
      it("should sign request with HMAC-SHA256", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ success: true }),
        });

        await gasCall(mockEnv, "provision", { tenant: "demo" });

        expect(hmac256Base64UrlMock).toHaveBeenCalledWith(
          "test-hmac-secret",
          expect.any(String)
        );
      });

      it("should sign the complete request body", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ success: true }),
        });

        const payload = { tenant: "demo", spreadsheetId: "sheet123" };
        await gasCall(mockEnv, "provision", payload);

        const expectedBody = JSON.stringify({ action: "provision", ...payload });
        expect(hmac256Base64UrlMock).toHaveBeenCalledWith(
          "test-hmac-secret",
          expectedBody
        );
      });

      it("should include signature in x-signature header", async () => {
        hmac256Base64UrlMock.mockResolvedValue("custom_signature_xyz");

        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ success: true }),
        });

        await gasCall(mockEnv, "provision", { tenant: "demo" });

        const fetchCall = mockFetch.mock.calls[0];
        expect(fetchCall[1].headers["x-signature"]).toBe("custom_signature_xyz");
      });
    });

    describe("Action types", () => {
      it("should handle provision action", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ success: true, action: "provision" }),
        });

        const result: any = await gasCall(mockEnv, "provision", {
          tenant: "demo",
          spreadsheetId: "sheet123",
        });

        expect(result.action).toBe("provision");
      });

      it("should handle verify action", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ success: true, action: "verify", verified: true }),
        });

        const result: any = await gasCall(mockEnv, "verify", {
          tenant: "demo",
          email: "user@example.com",
        });

        expect(result.action).toBe("verify");
        expect(result.verified).toBe(true);
      });
    });

    describe("Response handling", () => {
      it("should return JSON response on success", async () => {
        const mockResponse = {
          success: true,
          data: {
            spreadsheetId: "sheet123",
            url: "https://docs.google.com/spreadsheets/d/sheet123",
          },
        };

        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => mockResponse,
        });

        const result: any = await gasCall(mockEnv, "provision", { tenant: "demo" });

        expect(result).toEqual(mockResponse);
      });

      it("should throw error on non-OK response", async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 400,
          statusText: "Bad Request",
        });

        await expect(
          gasCall(mockEnv, "provision", { tenant: "demo" })
        ).rejects.toThrow("GAS provision failed: 400 Bad Request");
      });

      it("should throw error on 500 response", async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        });

        await expect(
          gasCall(mockEnv, "verify", { tenant: "demo" })
        ).rejects.toThrow("GAS verify failed: 500 Internal Server Error");
      });

      it("should throw error on 403 response", async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 403,
          statusText: "Forbidden",
        });

        await expect(
          gasCall(mockEnv, "provision", { tenant: "demo" })
        ).rejects.toThrow("GAS provision failed: 403 Forbidden");
      });
    });

    describe("Error handling", () => {
      it("should handle network errors", async () => {
        mockFetch.mockRejectedValue(new Error("Network error"));

        await expect(
          gasCall(mockEnv, "provision", { tenant: "demo" })
        ).rejects.toThrow("Network error");
      });

      it("should handle invalid JSON response", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => {
            throw new Error("Invalid JSON");
          },
        });

        await expect(
          gasCall(mockEnv, "provision", { tenant: "demo" })
        ).rejects.toThrow("Invalid JSON");
      });

      it("should preserve error message from action in error", async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 400,
          statusText: "Invalid tenant",
        });

        await expect(
          gasCall(mockEnv, "provision", { tenant: "invalid" })
        ).rejects.toThrow("provision failed");
      });
    });

    describe("Edge Cases", () => {
      it("should handle empty payload", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ success: true }),
        });

        await gasCall(mockEnv, "provision", {});

        const fetchCall = mockFetch.mock.calls[0];
        const body = JSON.parse(fetchCall[1].body) as any;

        expect(body.action).toBe("provision");
        expect(Object.keys(body)).toEqual(["action"]);
      });

      it("should handle complex nested payload", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ success: true }),
        });

        const complexPayload = {
          tenant: "demo",
          config: {
            spreadsheet: {
              id: "sheet123",
              name: "Test Sheet",
            },
            permissions: ["read", "write"],
          },
          metadata: {
            createdAt: "2025-01-15T10:00:00Z",
            version: 1,
          },
        };

        await gasCall(mockEnv, "provision", complexPayload);

        const fetchCall = mockFetch.mock.calls[0];
        const body = JSON.parse(fetchCall[1].body) as any;

        expect(body.action).toBe("provision");
        expect(body.config.spreadsheet.id).toBe("sheet123");
        expect(body.metadata.version).toBe(1);
      });

      it("should handle payload with special characters", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ success: true }),
        });

        const payload = {
          tenant: "demo-tenant_123",
          name: "Test & Demo <Company>",
          email: "user+tag@example.com",
        };

        await gasCall(mockEnv, "provision", payload);

        const fetchCall = mockFetch.mock.calls[0];
        const body = JSON.parse(fetchCall[1].body) as any;

        expect(body.name).toBe("Test & Demo <Company>");
        expect(body.email).toBe("user+tag@example.com");
      });

      it("should handle different GAS_WEBAPP_URL formats", async () => {
        const customEnv = {
          ...mockEnv,
          GAS_WEBAPP_URL:
            "https://script.google.com/macros/s/different_id_xyz/exec",
        };

        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ success: true }),
        });

        await gasCall(customEnv, "verify", { tenant: "demo" });

        expect(mockFetch).toHaveBeenCalledWith(
          "https://script.google.com/macros/s/different_id_xyz/exec",
          expect.any(Object)
        );
      });
    });
  });
});
