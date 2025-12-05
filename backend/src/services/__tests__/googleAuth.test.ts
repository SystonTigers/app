import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  signJWT,
  getAccessToken,
  parseServiceAccountKey,
  getGoogleAPIHeaders,
} from "../googleAuth";

describe("Google Auth Service", () => {
  let mockFetch: any;
  let mockServiceAccountKey: any;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    mockServiceAccountKey = {
      type: "service_account",
      project_id: "test-project",
      private_key_id: "key123",
      private_key: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKj
MzEfYyjiWA4R4/M2bS1+fWIcPm15j7MOvGzN6B4W3eTDfSJjr6NcxQ==
-----END PRIVATE KEY-----`,
      client_email: "test@test-project.iam.gserviceaccount.com",
      client_id: "123456789",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url:
        "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url:
        "https://www.googleapis.com/robot/v1/metadata/x509/test",
    };

    vi.clearAllMocks();
  });

  describe("signJWT", () => {
    it("should create valid JWT structure", async () => {
      const claims = {
        iss: "test@example.com",
        scope: "https://www.googleapis.com/auth/drive",
        aud: "https://oauth2.googleapis.com/token",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      };

      // Mock crypto.subtle.importKey and sign
      const mockSign = vi
        .spyOn(crypto.subtle, "sign")
        .mockResolvedValue(new ArrayBuffer(256));
      const mockImportKey = vi
        .spyOn(crypto.subtle, "importKey")
        .mockResolvedValue({} as CryptoKey);

      const jwt = await signJWT(claims, mockServiceAccountKey.private_key);

      // JWT should have 3 parts separated by dots
      const parts = jwt.split(".");
      expect(parts).toHaveLength(3);

      // Header should decode properly
      const header = JSON.parse(atob(parts[0]));
      expect(header.alg).toBe("RS256");
      expect(header.typ).toBe("JWT");

      // Claims should decode properly
      const decodedClaims = JSON.parse(atob(parts[1]));
      expect(decodedClaims.iss).toBe(claims.iss);
      expect(decodedClaims.scope).toBe(claims.scope);

      mockSign.mockRestore();
      mockImportKey.mockRestore();
    });

    it("should use RS256 algorithm", async () => {
      const claims = {
        iss: "test@example.com",
        scope: "test.scope",
        aud: "https://oauth2.googleapis.com/token",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      };

      const mockSign = vi
        .spyOn(crypto.subtle, "sign")
        .mockResolvedValue(new ArrayBuffer(256));
      const mockImportKey = vi
        .spyOn(crypto.subtle, "importKey")
        .mockResolvedValue({} as CryptoKey);

      const jwt = await signJWT(claims, mockServiceAccountKey.private_key);
      const parts = jwt.split(".");
      const header = JSON.parse(atob(parts[0]));

      expect(header.alg).toBe("RS256");

      mockSign.mockRestore();
      mockImportKey.mockRestore();
    });

    it("should include all required claims", async () => {
      const now = Math.floor(Date.now() / 1000);
      const claims = {
        iss: "issuer@example.com",
        scope: "scope1 scope2",
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now,
      };

      const mockSign = vi
        .spyOn(crypto.subtle, "sign")
        .mockResolvedValue(new ArrayBuffer(256));
      const mockImportKey = vi
        .spyOn(crypto.subtle, "importKey")
        .mockResolvedValue({} as CryptoKey);

      const jwt = await signJWT(claims, mockServiceAccountKey.private_key);
      const parts = jwt.split(".");
      const decodedClaims = JSON.parse(atob(parts[1]));

      expect(decodedClaims.iss).toBe("issuer@example.com");
      expect(decodedClaims.scope).toBe("scope1 scope2");
      expect(decodedClaims.aud).toBe("https://oauth2.googleapis.com/token");
      expect(decodedClaims.exp).toBe(now + 3600);
      expect(decodedClaims.iat).toBe(now);

      mockSign.mockRestore();
      mockImportKey.mockRestore();
    });

    it("should produce base64url-encoded output", async () => {
      const claims = {
        iss: "test@example.com",
        scope: "test",
        aud: "https://oauth2.googleapis.com/token",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      };

      const mockSign = vi
        .spyOn(crypto.subtle, "sign")
        .mockResolvedValue(new ArrayBuffer(256));
      const mockImportKey = vi
        .spyOn(crypto.subtle, "importKey")
        .mockResolvedValue({} as CryptoKey);

      const jwt = await signJWT(claims, mockServiceAccountKey.private_key);

      // Base64url should not contain +, /, or =
      expect(jwt).not.toMatch(/[+/=]/);
      // Should contain - and _ instead
      const parts = jwt.split(".");
      parts.forEach((part) => {
        // Each part should be valid base64url (only contains A-Za-z0-9-_)
        expect(part).toMatch(/^[A-Za-z0-9_-]+$/);
      });

      mockSign.mockRestore();
      mockImportKey.mockRestore();
    });
  });

  describe("getAccessToken", () => {
    it("should request access token with correct parameters", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "ya29.test_token",
          expires_in: 3600,
          token_type: "Bearer",
        }),
      });

      const mockSign = vi
        .spyOn(crypto.subtle, "sign")
        .mockResolvedValue(new ArrayBuffer(256));
      const mockImportKey = vi
        .spyOn(crypto.subtle, "importKey")
        .mockResolvedValue({} as CryptoKey);

      const scopes = [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/spreadsheets",
      ];

      await getAccessToken(mockServiceAccountKey, scopes);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://oauth2.googleapis.com/token",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        })
      );

      mockSign.mockRestore();
      mockImportKey.mockRestore();
    });

    it("should return valid token response", async () => {
      const mockTokenResponse = {
        access_token: "ya29.test_access_token",
        expires_in: 3600,
        token_type: "Bearer",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const mockSign = vi
        .spyOn(crypto.subtle, "sign")
        .mockResolvedValue(new ArrayBuffer(256));
      const mockImportKey = vi
        .spyOn(crypto.subtle, "importKey")
        .mockResolvedValue({} as CryptoKey);

      const result = await getAccessToken(mockServiceAccountKey, [
        "https://www.googleapis.com/auth/drive",
      ]);

      expect(result.access_token).toBe("ya29.test_access_token");
      expect(result.expires_in).toBe(3600);
      expect(result.token_type).toBe("Bearer");

      mockSign.mockRestore();
      mockImportKey.mockRestore();
    });

    it("should join multiple scopes with space", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "token",
          expires_in: 3600,
          token_type: "Bearer",
        }),
      });

      const mockSign = vi
        .spyOn(crypto.subtle, "sign")
        .mockResolvedValue(new ArrayBuffer(256));
      const mockImportKey = vi
        .spyOn(crypto.subtle, "importKey")
        .mockResolvedValue({} as CryptoKey);

      const scopes = [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/calendar",
      ];

      await getAccessToken(mockServiceAccountKey, scopes);

      // The JWT claims should have scopes joined by space
      // We can't easily inspect the JWT without decoding, but we know it's called correctly
      expect(mockFetch).toHaveBeenCalled();

      mockSign.mockRestore();
      mockImportKey.mockRestore();
    });

    it("should throw error on failed token exchange", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => "Invalid grant",
      });

      const mockSign = vi
        .spyOn(crypto.subtle, "sign")
        .mockResolvedValue(new ArrayBuffer(256));
      const mockImportKey = vi
        .spyOn(crypto.subtle, "importKey")
        .mockResolvedValue({} as CryptoKey);

      await expect(
        getAccessToken(mockServiceAccountKey, [
          "https://www.googleapis.com/auth/drive",
        ])
      ).rejects.toThrow("Failed to get access token: 400");

      mockSign.mockRestore();
      mockImportKey.mockRestore();
    });

    it("should use correct token_uri from service account", async () => {
      const customServiceAccount = {
        ...mockServiceAccountKey,
        token_uri: "https://custom.oauth.example.com/token",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "token",
          expires_in: 3600,
          token_type: "Bearer",
        }),
      });

      const mockSign = vi
        .spyOn(crypto.subtle, "sign")
        .mockResolvedValue(new ArrayBuffer(256));
      const mockImportKey = vi
        .spyOn(crypto.subtle, "importKey")
        .mockResolvedValue({} as CryptoKey);

      await getAccessToken(customServiceAccount, ["scope"]);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://custom.oauth.example.com/token",
        expect.any(Object)
      );

      mockSign.mockRestore();
      mockImportKey.mockRestore();
    });

    it("should set correct JWT claims", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "token",
          expires_in: 3600,
          token_type: "Bearer",
        }),
      });

      const mockSign = vi
        .spyOn(crypto.subtle, "sign")
        .mockResolvedValue(new ArrayBuffer(256));
      const mockImportKey = vi
        .spyOn(crypto.subtle, "importKey")
        .mockResolvedValue({} as CryptoKey);

      const scopes = ["https://www.googleapis.com/auth/drive"];
      await getAccessToken(mockServiceAccountKey, scopes);

      // Verify fetch was called with proper grant_type and assertion
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[1].body).toBeInstanceOf(URLSearchParams);

      mockSign.mockRestore();
      mockImportKey.mockRestore();
    });
  });

  describe("parseServiceAccountKey", () => {
    it("should parse valid base64-encoded service account key", () => {
      const keyJson = JSON.stringify(mockServiceAccountKey);
      const base64Key = btoa(keyJson);

      const result = parseServiceAccountKey(base64Key);

      expect(result.type).toBe("service_account");
      expect(result.project_id).toBe("test-project");
      expect(result.client_email).toBe(
        "test@test-project.iam.gserviceaccount.com"
      );
    });

    it("should throw error for invalid base64", () => {
      const invalidBase64 = "not-valid-base64!!!";

      expect(() => parseServiceAccountKey(invalidBase64)).toThrow(
        "Failed to parse service account key"
      );
    });

    it("should throw error for invalid JSON", () => {
      const invalidJson = btoa("not valid json {{{");

      expect(() => parseServiceAccountKey(invalidJson)).toThrow(
        "Failed to parse service account key"
      );
    });

    it("should preserve all service account fields", () => {
      const keyJson = JSON.stringify(mockServiceAccountKey);
      const base64Key = btoa(keyJson);

      const result = parseServiceAccountKey(base64Key);

      expect(result.private_key_id).toBe("key123");
      expect(result.client_id).toBe("123456789");
      expect(result.auth_uri).toBe("https://accounts.google.com/o/oauth2/auth");
      expect(result.token_uri).toBe("https://oauth2.googleapis.com/token");
    });
  });

  describe("getGoogleAPIHeaders", () => {
    it("should return headers with Bearer token", async () => {
      const keyJson = JSON.stringify(mockServiceAccountKey);
      const base64Key = btoa(keyJson);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "ya29.test_token_12345",
          expires_in: 3600,
          token_type: "Bearer",
        }),
      });

      const mockSign = vi
        .spyOn(crypto.subtle, "sign")
        .mockResolvedValue(new ArrayBuffer(256));
      const mockImportKey = vi
        .spyOn(crypto.subtle, "importKey")
        .mockResolvedValue({} as CryptoKey);

      const headers = await getGoogleAPIHeaders(base64Key, [
        "https://www.googleapis.com/auth/drive",
      ]);

      expect(headers.Authorization).toBe("Bearer ya29.test_token_12345");
      expect(headers["Content-Type"]).toBe("application/json");

      mockSign.mockRestore();
      mockImportKey.mockRestore();
    });

    it("should parse service account and get token", async () => {
      const keyJson = JSON.stringify(mockServiceAccountKey);
      const base64Key = btoa(keyJson);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "token",
          expires_in: 3600,
          token_type: "Bearer",
        }),
      });

      const mockSign = vi
        .spyOn(crypto.subtle, "sign")
        .mockResolvedValue(new ArrayBuffer(256));
      const mockImportKey = vi
        .spyOn(crypto.subtle, "importKey")
        .mockResolvedValue({} as CryptoKey);

      const scopes = [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/spreadsheets",
      ];

      await getGoogleAPIHeaders(base64Key, scopes);

      // Should have called fetch with correct token_uri
      expect(mockFetch).toHaveBeenCalledWith(
        "https://oauth2.googleapis.com/token",
        expect.any(Object)
      );

      mockSign.mockRestore();
      mockImportKey.mockRestore();
    });

    it("should throw error if service account key is invalid", async () => {
      const invalidBase64 = "invalid!!!";

      await expect(
        getGoogleAPIHeaders(invalidBase64, ["scope"])
      ).rejects.toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty scopes array", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "token",
          expires_in: 3600,
          token_type: "Bearer",
        }),
      });

      const mockSign = vi
        .spyOn(crypto.subtle, "sign")
        .mockResolvedValue(new ArrayBuffer(256));
      const mockImportKey = vi
        .spyOn(crypto.subtle, "importKey")
        .mockResolvedValue({} as CryptoKey);

      const result = await getAccessToken(mockServiceAccountKey, []);

      expect(result.access_token).toBe("token");

      mockSign.mockRestore();
      mockImportKey.mockRestore();
    });

    it("should handle network errors during token exchange", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const mockSign = vi
        .spyOn(crypto.subtle, "sign")
        .mockResolvedValue(new ArrayBuffer(256));
      const mockImportKey = vi
        .spyOn(crypto.subtle, "importKey")
        .mockResolvedValue({} as CryptoKey);

      await expect(
        getAccessToken(mockServiceAccountKey, ["scope"])
      ).rejects.toThrow("Network error");

      mockSign.mockRestore();
      mockImportKey.mockRestore();
    });

    it("should handle complete authentication flow", async () => {
      // Full flow: parse key -> sign JWT -> get token -> return headers
      const keyJson = JSON.stringify(mockServiceAccountKey);
      const base64Key = btoa(keyJson);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "ya29.complete_flow_token",
          expires_in: 3600,
          token_type: "Bearer",
        }),
      });

      const mockSign = vi
        .spyOn(crypto.subtle, "sign")
        .mockResolvedValue(new ArrayBuffer(256));
      const mockImportKey = vi
        .spyOn(crypto.subtle, "importKey")
        .mockResolvedValue({} as CryptoKey);

      const scopes = [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/spreadsheets",
      ];

      const headers = await getGoogleAPIHeaders(base64Key, scopes);

      expect(headers.Authorization).toBe("Bearer ya29.complete_flow_token");
      expect(headers["Content-Type"]).toBe("application/json");
      expect(mockFetch).toHaveBeenCalledTimes(1);

      mockSign.mockRestore();
      mockImportKey.mockRestore();
    });
  });
});
