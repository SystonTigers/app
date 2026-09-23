import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../../index";

// Mock ExecutionContext for worker tests
const mockCtx = {
  waitUntil: () => { },
  passThroughOnException: () => { },
  props: {},
} as unknown as ExecutionContext;

async function send(path: string, init?: RequestInit) {
  return worker.fetch(new Request(`https://example.com${path}`, init), env, mockCtx);
}

const jsonPost = (body: unknown, method = "POST"): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

describe("Shop Routes", () => {
  it("requires authentication to add a club product", async () => {
    const res = await send("/api/v1/shop/club-products", jsonPost({ name: "Test Product", price: 2999 }));
    expect(res.status).toBe(401);
  });

  it("requires authentication to add a personalisation phrase", async () => {
    const res = await send("/api/v1/shop/phrases", jsonPost({ phrase: "Up the Tigers" }));
    expect(res.status).toBe(401);
  });

  it("requires authentication to delete a phrase", async () => {
    const res = await send("/api/v1/shop/phrases/test-id", { method: "DELETE" });
    expect(res.status).toBe(401);
  });

  it("requires authentication for Printify product sync", async () => {
    const res = await send("/api/v1/shop/sync", jsonPost({}));
    expect(res.status).toBe(401);
  });

  it("does not expose shop orders (customer PII) without authentication", async () => {
    const res = await send("/api/v1/shop/orders", { headers: { "x-tenant": "syston-tigers" } });
    expect(res.status).toBe(401);
  });

  it("refuses to confirm an order without a Stripe session", async () => {
    const res = await send("/api/v1/shop/orders/some-order/confirm", jsonPost({}));
    expect(res.status).toBe(400);
  });

  it("lists public products only when a tenant is given", async () => {
    const res = await send("/api/v1/shop/products");
    expect(res.status).toBe(400);
  });
});
