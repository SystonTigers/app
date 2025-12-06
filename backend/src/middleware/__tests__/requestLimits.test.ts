import { describe, it, expect } from "vitest";
import {
  validateUrlLength,
  validateContentLength,
  validateRequestSize,
  getLimitForContentType,
  readBodyWithLimit,
  readJsonWithLimit,
  PayloadTooLargeError,
  InvalidJsonError,
  DEFAULT_LIMITS,
} from "../requestLimits";

describe("Request Limits Middleware", () => {
  describe("validateUrlLength", () => {
    it("allows URLs within limit", () => {
      const req = new Request("https://example.com/api/v1/test");
      const result = validateUrlLength(req);
      expect(result).toBeNull();
    });

    it("rejects URLs exceeding limit", () => {
      const longPath = "a".repeat(3000);
      const req = new Request(`https://example.com/${longPath}`);
      const result = validateUrlLength(req);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(414);
    });

    it("uses custom limit when provided", () => {
      const req = new Request("https://example.com/short");
      const result = validateUrlLength(req, 10);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(414);
    });
  });

  describe("validateContentLength", () => {
    it("allows requests within limit", () => {
      const req = new Request("https://example.com/api", {
        method: "POST",
        headers: { "Content-Length": "1000" },
      });

      const result = validateContentLength(req, DEFAULT_LIMITS.JSON_BODY);
      expect(result).toBeNull();
    });

    it("rejects requests exceeding limit", () => {
      const req = new Request("https://example.com/api", {
        method: "POST",
        headers: { "Content-Length": "999999999" },
      });

      const result = validateContentLength(req, DEFAULT_LIMITS.JSON_BODY);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(413);
    });

    it("allows requests without Content-Length header", () => {
      const req = new Request("https://example.com/api", {
        method: "POST",
      });

      const result = validateContentLength(req, DEFAULT_LIMITS.JSON_BODY);
      expect(result).toBeNull();
    });

    it("rejects invalid Content-Length header", () => {
      const req = new Request("https://example.com/api", {
        method: "POST",
        headers: { "Content-Length": "invalid" },
      });

      const result = validateContentLength(req, DEFAULT_LIMITS.JSON_BODY);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(400);
    });

    it("rejects negative Content-Length", () => {
      const req = new Request("https://example.com/api", {
        method: "POST",
        headers: { "Content-Length": "-100" },
      });

      const result = validateContentLength(req, DEFAULT_LIMITS.JSON_BODY);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(400);
    });
  });

  describe("getLimitForContentType", () => {
    it("returns JSON limit for application/json", () => {
      const limit = getLimitForContentType("application/json");
      expect(limit).toBe(DEFAULT_LIMITS.JSON_BODY);
    });

    it("returns image limit for image content types", () => {
      expect(getLimitForContentType("image/jpeg")).toBe(DEFAULT_LIMITS.IMAGE_UPLOAD);
      expect(getLimitForContentType("image/png")).toBe(DEFAULT_LIMITS.IMAGE_UPLOAD);
      expect(getLimitForContentType("image/webp")).toBe(DEFAULT_LIMITS.IMAGE_UPLOAD);
    });

    it("returns video limit for video content types", () => {
      expect(getLimitForContentType("video/mp4")).toBe(DEFAULT_LIMITS.VIDEO_UPLOAD);
      expect(getLimitForContentType("video/webm")).toBe(DEFAULT_LIMITS.VIDEO_UPLOAD);
    });

    it("returns form data limit for multipart", () => {
      const limit = getLimitForContentType("multipart/form-data; boundary=----WebKitFormBoundary");
      expect(limit).toBe(DEFAULT_LIMITS.FORM_DATA);
    });

    it("returns document limit for PDF", () => {
      const limit = getLimitForContentType("application/pdf");
      expect(limit).toBe(DEFAULT_LIMITS.DOCUMENT_UPLOAD);
    });

    it("returns default limit for null content type", () => {
      const limit = getLimitForContentType(null);
      expect(limit).toBe(DEFAULT_LIMITS.JSON_BODY);
    });
  });

  describe("validateRequestSize", () => {
    it("validates JSON requests with default limit", () => {
      const req = new Request("https://example.com/api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": "500",
        },
      });

      const result = validateRequestSize(req);
      expect(result).toBeNull();
    });

    it("rejects oversized JSON requests", () => {
      const req = new Request("https://example.com/api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": String(2 * 1024 * 1024), // 2MB
        },
      });

      const result = validateRequestSize(req);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(413);
    });

    it("uses custom limit when provided", () => {
      const req = new Request("https://example.com/api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": "1000",
        },
      });

      const result = validateRequestSize(req, 500);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(413);
    });

    it("validates image uploads with appropriate limit", () => {
      const req = new Request("https://example.com/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Length": String(5 * 1024 * 1024), // 5MB
        },
      });

      const result = validateRequestSize(req);
      expect(result).toBeNull(); // Within 10MB limit
    });

    it("rejects oversized image uploads", () => {
      const req = new Request("https://example.com/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Length": String(15 * 1024 * 1024), // 15MB
        },
      });

      const result = validateRequestSize(req);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(413);
    });
  });

  describe("readBodyWithLimit", () => {
    it("reads body within limit", async () => {
      const body = JSON.stringify({ test: "data" });
      const req = new Request("https://example.com/api", {
        method: "POST",
        body,
      });

      const buffer = await readBodyWithLimit(req, 1024);
      const text = new TextDecoder().decode(buffer);

      expect(text).toBe(body);
    });

    it("throws PayloadTooLargeError for oversized body", async () => {
      const body = "x".repeat(1000);
      const req = new Request("https://example.com/api", {
        method: "POST",
        body,
      });

      await expect(readBodyWithLimit(req, 100)).rejects.toThrow(PayloadTooLargeError);
    });

    it("returns empty buffer for requests without body", async () => {
      const req = new Request("https://example.com/api");

      const buffer = await readBodyWithLimit(req, 1024);
      expect(buffer.byteLength).toBe(0);
    });
  });

  describe("readJsonWithLimit", () => {
    it("parses valid JSON within limit", async () => {
      const data = { name: "test", value: 123 };
      const req = new Request("https://example.com/api", {
        method: "POST",
        body: JSON.stringify(data),
      });

      const result = await readJsonWithLimit(req, 1024);
      expect(result).toEqual(data);
    });

    it("throws InvalidJsonError for invalid JSON", async () => {
      const req = new Request("https://example.com/api", {
        method: "POST",
        body: "not valid json",
      });

      await expect(readJsonWithLimit(req, 1024)).rejects.toThrow(InvalidJsonError);
    });

    it("throws PayloadTooLargeError for oversized JSON", async () => {
      const data = { largeArray: "x".repeat(1000) };
      const req = new Request("https://example.com/api", {
        method: "POST",
        body: JSON.stringify(data),
      });

      await expect(readJsonWithLimit(req, 100)).rejects.toThrow(PayloadTooLargeError);
    });
  });

  describe("Error classes", () => {
    it("PayloadTooLargeError has correct properties", () => {
      const error = new PayloadTooLargeError(1024);

      expect(error.status).toBe(413);
      expect(error.code).toBe("PAYLOAD_TOO_LARGE");
      expect(error.maxSize).toBe(1024);
    });

    it("PayloadTooLargeError.toResponse returns valid response", async () => {
      const error = new PayloadTooLargeError(1024);
      const response = error.toResponse();

      expect(response.status).toBe(413);
      expect(response.headers.get("X-Max-Size")).toBe("1024");

      const data: any = await response.json();
      expect(data.error.code).toBe("PAYLOAD_TOO_LARGE");
    });

    it("InvalidJsonError has correct properties", () => {
      const error = new InvalidJsonError();

      expect(error.status).toBe(400);
      expect(error.code).toBe("INVALID_JSON");
    });

    it("InvalidJsonError.toResponse returns valid response", async () => {
      const error = new InvalidJsonError();
      const response = error.toResponse();

      expect(response.status).toBe(400);

      const data: any = await response.json();
      expect(data.error.code).toBe("INVALID_JSON");
    });
  });

  describe("DEFAULT_LIMITS", () => {
    it("has reasonable default values", () => {
      expect(DEFAULT_LIMITS.JSON_BODY).toBe(1024 * 1024); // 1MB
      expect(DEFAULT_LIMITS.IMAGE_UPLOAD).toBe(10 * 1024 * 1024); // 10MB
      expect(DEFAULT_LIMITS.VIDEO_UPLOAD).toBe(100 * 1024 * 1024); // 100MB
      expect(DEFAULT_LIMITS.DOCUMENT_UPLOAD).toBe(25 * 1024 * 1024); // 25MB
      expect(DEFAULT_LIMITS.FORM_DATA).toBe(50 * 1024 * 1024); // 50MB
      expect(DEFAULT_LIMITS.URL_LENGTH).toBe(2048);
      expect(DEFAULT_LIMITS.HEADER_SIZE).toBe(16 * 1024); // 16KB
    });
  });
});
