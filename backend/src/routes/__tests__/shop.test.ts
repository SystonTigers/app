import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../../index";

describe("Shop Routes", () => {
  it("should require authentication for creating products", async () => {
    const request = new Request("https://example.com/api/v1/shop/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Test Product",
        price: 29.99,
      }),
    });
    const response = await worker.fetch(request, env);
    expect(response.status).toBe(401);
  });

  it("should require authentication for listing products", async () => {
    const request = new Request("https://example.com/api/v1/shop/products");
    const response = await worker.fetch(request, env);
    expect(response.status).toBe(401);
  });

  it("should require authentication for updating products", async () => {
    const request = new Request("https://example.com/api/v1/shop/products/test-id", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        price: 39.99,
      }),
    });
    const response = await worker.fetch(request, env);
    expect(response.status).toBe(401);
  });

  it("should require authentication for deleting products", async () => {
    const request = new Request("https://example.com/api/v1/shop/products/test-id", {
      method: "DELETE",
    });
    const response = await worker.fetch(request, env);
    expect(response.status).toBe(401);
  });

  it("should require authentication for Printify sync", async () => {
    const request = new Request("https://example.com/api/v1/shop/printify/sync", {
      method: "POST",
    });
    const response = await worker.fetch(request, env);
    expect(response.status).toBe(401);
  });
});
