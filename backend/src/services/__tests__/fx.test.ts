import { describe, it, expect, beforeEach, vi } from "vitest";
import { getFX } from "../fx";

describe("FX Service", () => {
  let mockFetch: any;

  beforeEach(() => {
    // Mock global fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    vi.clearAllMocks();
  });

  describe("getFX", () => {
    it("should use default parameters GBP to EUR", async () => {
      const mockResponse = {
        success: true,
        result: 1.17,
      };

      mockFetch.mockResolvedValue({
        text: async () => JSON.stringify(mockResponse),
      });

      const req = {
        url: "https://example.com/fx",
      };

      await getFX(req);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.exchangerate.host/convert?from=GBP&to=EUR"
      );
    });

    it("should use custom from and to parameters", async () => {
      const mockResponse = {
        success: true,
        result: 1.35,
      };

      mockFetch.mockResolvedValue({
        text: async () => JSON.stringify(mockResponse),
      });

      const req = {
        url: "https://example.com/fx?from=USD&to=GBP",
      };

      await getFX(req);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.exchangerate.host/convert?from=USD&to=GBP"
      );
    });

    it("should return response with correct content type", async () => {
      const mockResponse = {
        success: true,
        result: 109.5,
      };

      mockFetch.mockResolvedValue({
        text: async () => JSON.stringify(mockResponse),
      });

      const req = {
        url: "https://example.com/fx?from=USD&to=JPY",
      };

      const response = await getFX(req);

      expect(response.headers.get("content-type")).toBe("application/json");
    });

    it("should return the API response text", async () => {
      const mockResponse = {
        success: true,
        query: {
          from: "EUR",
          to: "USD",
          amount: 1,
        },
        info: {
          rate: 1.08,
        },
        result: 1.08,
      };

      mockFetch.mockResolvedValue({
        text: async () => JSON.stringify(mockResponse),
      });

      const req = {
        url: "https://example.com/fx?from=EUR&to=USD",
      };

      const response = await getFX(req);
      const text = await response.text();
      const data = JSON.parse(text);

      expect(data.result).toBe(1.08);
      expect(data.query.from).toBe("EUR");
      expect(data.query.to).toBe("USD");
    });

    it("should handle only from parameter", async () => {
      const mockResponse = {
        success: true,
        result: 1.25,
      };

      mockFetch.mockResolvedValue({
        text: async () => JSON.stringify(mockResponse),
      });

      const req = {
        url: "https://example.com/fx?from=CAD",
      };

      await getFX(req);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.exchangerate.host/convert?from=CAD&to=EUR"
      );
    });

    it("should handle only to parameter", async () => {
      const mockResponse = {
        success: true,
        result: 0.85,
      };

      mockFetch.mockResolvedValue({
        text: async () => JSON.stringify(mockResponse),
      });

      const req = {
        url: "https://example.com/fx?to=CHF",
      };

      await getFX(req);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.exchangerate.host/convert?from=GBP&to=CHF"
      );
    });

    it("should handle various currency pairs", async () => {
      const currencyPairs = [
        { from: "USD", to: "EUR" },
        { from: "JPY", to: "USD" },
        { from: "AUD", to: "NZD" },
        { from: "CAD", to: "GBP" },
        { from: "CHF", to: "SEK" },
      ];

      for (const pair of currencyPairs) {
        mockFetch.mockResolvedValue({
          text: async () => JSON.stringify({ success: true, result: 1.0 }),
        });

        const req = {
          url: `https://example.com/fx?from=${pair.from}&to=${pair.to}`,
        };

        await getFX(req);

        expect(mockFetch).toHaveBeenCalledWith(
          `https://api.exchangerate.host/convert?from=${pair.from}&to=${pair.to}`
        );
      }
    });

    it("should handle API error response", async () => {
      const mockErrorResponse = {
        success: false,
        error: {
          code: 201,
          info: "You have entered an invalid currency code.",
        },
      };

      mockFetch.mockResolvedValue({
        text: async () => JSON.stringify(mockErrorResponse),
      });

      const req = {
        url: "https://example.com/fx?from=INVALID&to=USD",
      };

      const response = await getFX(req);
      const text = await response.text();
      const data = JSON.parse(text);

      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it("should preserve full API response structure", async () => {
      const mockResponse = {
        success: true,
        query: {
          from: "GBP",
          to: "USD",
          amount: 1,
        },
        info: {
          rate: 1.27,
          timestamp: 1234567890,
        },
        historical: false,
        date: "2025-01-15",
        result: 1.27,
      };

      mockFetch.mockResolvedValue({
        text: async () => JSON.stringify(mockResponse),
      });

      const req = {
        url: "https://example.com/fx?from=GBP&to=USD",
      };

      const response = await getFX(req);
      const text = await response.text();
      const data = JSON.parse(text);

      expect(data).toEqual(mockResponse);
      expect(data.info.timestamp).toBe(1234567890);
      expect(data.date).toBe("2025-01-15");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty query parameters correctly", async () => {
      mockFetch.mockResolvedValue({
        text: async () => JSON.stringify({ success: true, result: 1.17 }),
      });

      const req = {
        url: "https://example.com/fx?",
      };

      await getFX(req);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.exchangerate.host/convert?from=GBP&to=EUR"
      );
    });

    it("should handle fetch network errors gracefully", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const req = {
        url: "https://example.com/fx?from=USD&to=EUR",
      };

      await expect(getFX(req)).rejects.toThrow("Network error");
    });

    it("should handle malformed API responses", async () => {
      mockFetch.mockResolvedValue({
        text: async () => "Invalid JSON response",
      });

      const req = {
        url: "https://example.com/fx?from=USD&to=EUR",
      };

      const response = await getFX(req);
      const text = await response.text();

      expect(text).toBe("Invalid JSON response");
      expect(response.headers.get("content-type")).toBe("application/json");
    });
  });
});
