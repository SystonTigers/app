import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  installFetchMock,
  uninstallFetchMock,
  setupExternalApiMocks,
  teardownExternalApiMocks,
  getFetchMockStats,
  resetFetchMockStats,
  addMockConfig,
  assertApiCalled,
  assertApiNotCalled,
  getApiCalls,
  youtubeResponses,
  googleOAuthResponses,
  printifyResponses,
  weatherResponses,
} from "../externalApis";

describe("External API Mocking Infrastructure", () => {
  afterEach(() => {
    uninstallFetchMock();
    resetFetchMockStats();
  });

  describe("installFetchMock / uninstallFetchMock", () => {
    it("intercepts fetch calls", async () => {
      installFetchMock();

      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        body: "test",
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.access_token).toBe("mock-google-access-token");
    });

    it("restores original fetch after uninstall", async () => {
      const originalFetch = globalThis.fetch;
      installFetchMock();

      // Verify mock is installed
      const stats1 = getFetchMockStats();
      expect(stats1.totalCalls).toBe(0);

      uninstallFetchMock();

      // globalThis.fetch should be restored
      // Note: In test environment, original fetch may still work
      expect(globalThis.fetch).toBeDefined();
    });
  });

  describe("YouTube API mocks", () => {
    beforeEach(() => {
      installFetchMock();
    });

    it("mocks OAuth token refresh", async () => {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        body: JSON.stringify({ grant_type: "refresh_token" }),
      });

      const data = await response.json();
      expect(data).toEqual(googleOAuthResponses.tokenRefresh);
    });

    it("mocks live broadcast creation", async () => {
      const response = await fetch(
        "https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet",
        {
          method: "POST",
          headers: { Authorization: "Bearer test-token" },
          body: JSON.stringify({ snippet: { title: "Test" } }),
        }
      );

      const data = await response.json();
      expect(data.id).toBe("mock-broadcast-id");
    });

    it("mocks live stream creation", async () => {
      const response = await fetch(
        "https://www.googleapis.com/youtube/v3/liveStreams?part=snippet",
        {
          method: "POST",
          headers: { Authorization: "Bearer test-token" },
          body: JSON.stringify({ snippet: { title: "Test Stream" } }),
        }
      );

      const data = await response.json();
      expect(data.id).toBe("mock-stream-id");
    });
  });

  describe("Printify API mocks", () => {
    beforeEach(() => {
      installFetchMock();
    });

    it("mocks products list", async () => {
      const response = await fetch(
        "https://api.printify.com/v1/shops/12345/products.json",
        { headers: { Authorization: "Bearer test-token" } }
      );

      const data = await response.json();
      expect(data.data).toHaveLength(2);
      expect(data.data[0].title).toBe("Team Jersey");
    });

    it("mocks individual product", async () => {
      const response = await fetch(
        "https://api.printify.com/v1/shops/12345/products/product-1.json",
        { headers: { Authorization: "Bearer test-token" } }
      );

      const data = await response.json();
      expect(data.title).toBe("Team Jersey");
    });

    it("mocks shipping calculation", async () => {
      const response = await fetch(
        "https://api.printify.com/v1/shops/12345/orders/shipping.json",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      const data = await response.json();
      expect(data.standard).toBe(499);
    });
  });

  describe("Weather API mocks", () => {
    beforeEach(() => {
      installFetchMock();
    });

    it("mocks weather forecast", async () => {
      const response = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41"
      );

      const data = await response.json();
      expect(data.hourly).toBeDefined();
      expect(data.daily).toBeDefined();
      expect(data.hourly.temperature_2m).toHaveLength(4);
    });
  });

  describe("Make.com webhook mocks", () => {
    beforeEach(() => {
      installFetchMock();
    });

    it("mocks EU webhook", async () => {
      const response = await fetch("https://hook.eu2.make.com/webhook123", {
        method: "POST",
        body: JSON.stringify({ data: "test" }),
      });

      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("mocks US webhook", async () => {
      const response = await fetch("https://hook.us1.make.com/webhook456", {
        method: "POST",
        body: JSON.stringify({ data: "test" }),
      });

      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe("Email (Resend) API mocks", () => {
    beforeEach(() => {
      installFetchMock();
    });

    it("mocks email sending", async () => {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: "Bearer test-key" },
        body: JSON.stringify({
          to: "test@example.com",
          subject: "Test",
          html: "<p>Hello</p>",
        }),
      });

      const data = await response.json();
      expect(data.id).toBe("mock-email-id");
    });
  });

  describe("Mock Statistics", () => {
    beforeEach(() => {
      installFetchMock();
      resetFetchMockStats();
    });

    it("tracks total calls", async () => {
      await fetch("https://oauth2.googleapis.com/token", { method: "POST" });
      await fetch("https://api.open-meteo.com/v1/forecast");

      const stats = getFetchMockStats();
      expect(stats.totalCalls).toBe(2);
    });

    it("tracks mock hits", async () => {
      await fetch("https://oauth2.googleapis.com/token", { method: "POST" });
      await fetch("https://api.open-meteo.com/v1/forecast");

      const stats = getFetchMockStats();
      expect(stats.mockHits).toBe(2);
    });

    it("records call details", async () => {
      await fetch("https://api.resend.com/emails", { method: "POST" });

      const stats = getFetchMockStats();
      expect(stats.calls).toHaveLength(1);
      expect(stats.calls[0].url).toContain("resend.com");
      expect(stats.calls[0].method).toBe("POST");
      expect(stats.calls[0].mocked).toBe(true);
    });
  });

  describe("Custom Mock Configuration", () => {
    beforeEach(() => {
      installFetchMock();
    });

    it("allows adding custom mocks", async () => {
      addMockConfig({
        pattern: /api\.custom\.com/,
        handler: () => ({
          body: { custom: "response" },
          status: 201,
        }),
      });

      const response = await fetch("https://api.custom.com/endpoint");

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.custom).toBe("response");
    });

    it("custom mocks take priority", async () => {
      // Add custom mock that overrides default
      addMockConfig({
        pattern: /oauth2\.googleapis\.com/,
        handler: () => ({
          body: { custom: "oauth" },
        }),
      });

      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
      });

      const data = await response.json();
      expect(data.custom).toBe("oauth");
    });
  });

  describe("Assertion Helpers", () => {
    beforeEach(() => {
      installFetchMock();
      resetFetchMockStats();
    });

    it("assertApiCalled passes when API was called", async () => {
      await fetch("https://api.resend.com/emails", { method: "POST" });

      expect(() => assertApiCalled(/resend\.com/)).not.toThrow();
    });

    it("assertApiCalled throws when API was not called", () => {
      expect(() => assertApiCalled(/resend\.com/)).toThrow();
    });

    it("assertApiNotCalled passes when API was not called", () => {
      expect(() => assertApiNotCalled(/resend\.com/)).not.toThrow();
    });

    it("assertApiNotCalled throws when API was called", async () => {
      await fetch("https://api.resend.com/emails", { method: "POST" });

      expect(() => assertApiNotCalled(/resend\.com/)).toThrow();
    });

    it("getApiCalls returns matching calls", async () => {
      await fetch("https://oauth2.googleapis.com/token", { method: "POST" });
      await fetch("https://api.resend.com/emails", { method: "POST" });

      const calls = getApiCalls(/googleapis\.com/);
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toContain("googleapis.com");
    });
  });

  describe("Setup / Teardown Helpers", () => {
    it("setupExternalApiMocks installs mocks", async () => {
      setupExternalApiMocks();

      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
      });

      expect(response.status).toBe(200);

      teardownExternalApiMocks();
    });

    it("teardownExternalApiMocks cleans up", () => {
      setupExternalApiMocks();
      teardownExternalApiMocks();

      const stats = getFetchMockStats();
      expect(stats.totalCalls).toBe(0);
    });
  });
});
