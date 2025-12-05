import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateNonce,
  createNonceContext,
  generateCSPWithNonce,
  withSecurityNonce,
  addSecurityHeadersWithNonce,
  injectNonceIntoHtml,
  createSecureHtmlResponse,
  securityHeaders,
  NonceContext,
} from "../securityHeaders";

// Mock crypto.getRandomValues for deterministic tests
const mockGetRandomValues = vi.fn((array: Uint8Array) => {
  // Fill with predictable values for testing
  for (let i = 0; i < array.length; i++) {
    array[i] = (i * 17 + 42) % 256;
  }
  return array;
});

describe("CSP Nonce Generation", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", {
      getRandomValues: mockGetRandomValues,
    });
  });

  describe("generateNonce", () => {
    it("generates a base64-encoded nonce", () => {
      const nonce = generateNonce();

      // Should be a valid base64 string
      expect(nonce).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it("generates nonces of consistent length", () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();

      // 16 bytes = ~22 base64 chars (with padding)
      expect(nonce1.length).toBeGreaterThanOrEqual(20);
      expect(nonce1.length).toBeLessThanOrEqual(24);
      expect(nonce1.length).toBe(nonce2.length);
    });

    it("uses crypto.getRandomValues for entropy", () => {
      generateNonce();

      expect(mockGetRandomValues).toHaveBeenCalledWith(expect.any(Uint8Array));
      expect(mockGetRandomValues).toHaveBeenCalledWith(
        expect.objectContaining({ length: 16 })
      );
    });
  });

  describe("createNonceContext", () => {
    it("creates a context with raw nonce", () => {
      const context = createNonceContext();

      expect(context.nonce).toBeDefined();
      expect(typeof context.nonce).toBe("string");
      expect(context.nonce.length).toBeGreaterThan(0);
    });

    it("creates formatted script nonce directive", () => {
      const context = createNonceContext();

      expect(context.scriptNonce).toBe(`'nonce-${context.nonce}'`);
    });

    it("creates formatted style nonce directive", () => {
      const context = createNonceContext();

      expect(context.styleNonce).toBe(`'nonce-${context.nonce}'`);
    });

    it("uses the same nonce for script and style", () => {
      const context = createNonceContext();

      const scriptNonceValue = context.scriptNonce.match(
        /^'nonce-(.+)'$/
      )?.[1];
      const styleNonceValue = context.styleNonce.match(/^'nonce-(.+)'$/)?.[1];

      expect(scriptNonceValue).toBe(context.nonce);
      expect(styleNonceValue).toBe(context.nonce);
    });
  });

  describe("generateCSPWithNonce", () => {
    it("includes script-src with nonce", () => {
      const context: NonceContext = {
        nonce: "test-nonce-123",
        scriptNonce: "'nonce-test-nonce-123'",
        styleNonce: "'nonce-test-nonce-123'",
      };

      const csp = generateCSPWithNonce(context);

      expect(csp).toContain("script-src 'self' 'nonce-test-nonce-123'");
    });

    it("includes style-src with nonce", () => {
      const context: NonceContext = {
        nonce: "test-nonce-123",
        scriptNonce: "'nonce-test-nonce-123'",
        styleNonce: "'nonce-test-nonce-123'",
      };

      const csp = generateCSPWithNonce(context);

      expect(csp).toContain("style-src 'self' 'nonce-test-nonce-123'");
    });

    it("does not include unsafe-inline", () => {
      const context = createNonceContext();
      const csp = generateCSPWithNonce(context);

      expect(csp).not.toContain("'unsafe-inline'");
    });

    it("includes all required CSP directives", () => {
      const context = createNonceContext();
      const csp = generateCSPWithNonce(context);

      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("img-src 'self' https: data:");
      expect(csp).toContain("connect-src");
      expect(csp).toContain("font-src 'self' https:");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("frame-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("form-action 'self'");
      expect(csp).toContain("upgrade-insecure-requests");
    });
  });
});

describe("Nonce-Based Security Response Helpers", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", {
      getRandomValues: mockGetRandomValues,
    });
  });

  describe("withSecurityNonce", () => {
    it("returns ResponseInit with security headers", () => {
      const { init } = withSecurityNonce();

      const headers = new Headers(init.headers as HeadersInit);

      expect(headers.get("Strict-Transport-Security")).toBeTruthy();
      expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(headers.get("X-Frame-Options")).toBe("DENY");
    });

    it("returns nonce context for template use", () => {
      const { nonceContext } = withSecurityNonce();

      expect(nonceContext.nonce).toBeDefined();
      expect(nonceContext.scriptNonce).toBeDefined();
      expect(nonceContext.styleNonce).toBeDefined();
    });

    it("applies nonce-based CSP instead of unsafe-inline", () => {
      const { init, nonceContext } = withSecurityNonce();

      const headers = new Headers(init.headers as HeadersInit);
      const csp = headers.get("Content-Security-Policy");

      expect(csp).toContain(nonceContext.scriptNonce);
      expect(csp).toContain(nonceContext.styleNonce);
      expect(csp).not.toContain("'unsafe-inline'");
    });

    it("preserves existing headers from init", () => {
      const { init } = withSecurityNonce({
        headers: { "X-Custom-Header": "custom-value" },
      });

      const headers = new Headers(init.headers as HeadersInit);

      expect(headers.get("X-Custom-Header")).toBe("custom-value");
    });

    it("preserves other init properties", () => {
      const { init } = withSecurityNonce({ status: 201 });

      expect(init.status).toBe(201);
    });
  });

  describe("addSecurityHeadersWithNonce", () => {
    it("returns modified response with security headers", () => {
      const originalResponse = new Response("Hello", { status: 200 });
      const { response } = addSecurityHeadersWithNonce(originalResponse);

      expect(response.headers.get("Strict-Transport-Security")).toBeTruthy();
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });

    it("returns nonce context", () => {
      const originalResponse = new Response("Hello");
      const { nonceContext } = addSecurityHeadersWithNonce(originalResponse);

      expect(nonceContext.nonce).toBeDefined();
      expect(nonceContext.scriptNonce).toMatch(/^'nonce-.+'$/);
    });

    it("preserves response status", () => {
      const originalResponse = new Response("Not Found", { status: 404 });
      const { response } = addSecurityHeadersWithNonce(originalResponse);

      expect(response.status).toBe(404);
    });

    it("preserves response body", async () => {
      const originalResponse = new Response("Test Body");
      const { response } = addSecurityHeadersWithNonce(originalResponse);

      const body = await response.text();
      expect(body).toBe("Test Body");
    });

    it("applies nonce-based CSP", () => {
      const originalResponse = new Response("Hello");
      const { response, nonceContext } =
        addSecurityHeadersWithNonce(originalResponse);

      const csp = response.headers.get("Content-Security-Policy");
      expect(csp).toContain(nonceContext.nonce);
    });
  });

  describe("injectNonceIntoHtml", () => {
    it("replaces __CSP_NONCE__ placeholder", () => {
      const template = '<script nonce="__CSP_NONCE__">alert("hi")</script>';
      const result = injectNonceIntoHtml(template, "abc123");

      expect(result).toBe('<script nonce="abc123">alert("hi")</script>');
    });

    it("replaces multiple placeholders", () => {
      const template = `
        <script nonce="__CSP_NONCE__">...</script>
        <style nonce="__CSP_NONCE__">...</style>
      `;
      const result = injectNonceIntoHtml(template, "xyz789");

      expect(result).toContain('nonce="xyz789"');
      expect(result.match(/xyz789/g)?.length).toBe(2);
      expect(result).not.toContain("__CSP_NONCE__");
    });

    it("returns unchanged HTML if no placeholders", () => {
      const html = "<p>No placeholders here</p>";
      const result = injectNonceIntoHtml(html, "nonce123");

      expect(result).toBe(html);
    });
  });

  describe("createSecureHtmlResponse", () => {
    it("returns a Response object", () => {
      const response = createSecureHtmlResponse("<html></html>");

      expect(response).toBeInstanceOf(Response);
    });

    it("sets Content-Type to text/html", () => {
      const response = createSecureHtmlResponse("<html></html>");

      expect(response.headers.get("Content-Type")).toBe(
        "text/html; charset=utf-8"
      );
    });

    it("includes security headers", () => {
      const response = createSecureHtmlResponse("<html></html>");

      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });

    it("injects nonce into HTML template", async () => {
      const template = '<script nonce="__CSP_NONCE__">test()</script>';
      const response = createSecureHtmlResponse(template);

      const body = await response.text();
      expect(body).not.toContain("__CSP_NONCE__");
      expect(body).toMatch(/nonce="[A-Za-z0-9+/]+=*"/);
    });

    it("uses nonce in CSP header that matches HTML", async () => {
      const template = '<script nonce="__CSP_NONCE__">test()</script>';
      const response = createSecureHtmlResponse(template);

      const body = await response.text();
      const csp = response.headers.get("Content-Security-Policy");

      // Extract nonce from HTML
      const htmlNonce = body.match(/nonce="([^"]+)"/)?.[1];
      expect(htmlNonce).toBeDefined();

      // CSP should contain the same nonce
      expect(csp).toContain(`'nonce-${htmlNonce}'`);
    });

    it("preserves custom init properties", () => {
      const response = createSecureHtmlResponse("<html></html>", {
        status: 201,
      });

      expect(response.status).toBe(201);
    });

    it("does not override custom Content-Type", () => {
      const response = createSecureHtmlResponse("<html></html>", {
        headers: { "Content-Type": "text/html; charset=iso-8859-1" },
      });

      expect(response.headers.get("Content-Type")).toBe(
        "text/html; charset=iso-8859-1"
      );
    });
  });
});

describe("Security Headers Configuration", () => {
  it("production headers include HSTS with preload", () => {
    expect(securityHeaders["Strict-Transport-Security"]).toContain("preload");
    expect(securityHeaders["Strict-Transport-Security"]).toContain(
      "max-age=31536000"
    );
  });

  it("production headers deny framing", () => {
    expect(securityHeaders["X-Frame-Options"]).toBe("DENY");
  });

  it("production CSP includes unsafe-inline for backward compatibility", () => {
    // This test documents current state - nonce-based functions remove unsafe-inline
    expect(securityHeaders["Content-Security-Policy"]).toContain(
      "'unsafe-inline'"
    );
  });
});
