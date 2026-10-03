/**
 * Journey: a supporter fills a club shop basket. They can add the club's own
 * kit and the shared catalogue, but never another club's private designs or
 * products (picked by guessing or copying their variant id).
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { TENANT } from "./helpers";
import { addToCart, createCart } from "../../src/services/cart";

const RIVAL = "shop-rivals";

/** In-memory stand-in for the KV namespace baskets live in. */
function memoryKv() {
  const store = new Map<string, string>();
  return {
    get: async (k: string) => store.get(k) ?? null,
    put: async (k: string, v: string) => { store.set(k, v); },
    delete: async (k: string) => { store.delete(k); },
  };
}

describe("Shop basket stays within the club", () => {
  it("adds the club's own and shared items, refuses another club's", async () => {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO tenants (id, slug, name, email, plan, status, created_at, updated_at)
       VALUES (?, ?, 'Rivals FC (test)', 'rivals@example.com', 'pro', 'active', unixepoch(), unixepoch())`,
    ).bind(RIVAL, RIVAL).run();
    const variants = JSON.stringify([{ id: 101, title: "M", price: 2500 }]);
    const template = (id: string, tenant: string | null) => env.DB.prepare(
      `INSERT OR REPLACE INTO printify_templates (id, tenant_id, name, base_price_gbp, printify_cost_gbp, status, variants_json)
       VALUES (?, ?, ?, 2500, 1200, 'active', ?)`,
    ).bind(id, tenant, `Hoodie ${id}`, variants);
    const now = Date.now();
    const product = (id: string, tenant: string | null) => env.DB.prepare(
      `INSERT OR REPLACE INTO products (id, tenant_id, title, handle, vendor, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'printify', 'active', ?, ?)`,
    ).bind(id, tenant, `Scarf ${id}`, `scarf-${id}`, now, now);
    const variant = (id: string, productId: string) => env.DB.prepare(
      `INSERT OR REPLACE INTO product_variants (id, product_id, title, price_gbp, created_at) VALUES (?, ?, 'One size', 1500, ?)`,
    ).bind(id, productId, now);
    await env.DB.batch([
      template("pt_own", TENANT), template("pt_shared", null), template("pt_rival", RIVAL),
      product("prod_own", TENANT), product("prod_shared", null), product("prod_rival", RIVAL),
      variant("var_own", "prod_own"), variant("var_shared", "prod_shared"), variant("var_rival", "prod_rival"),
    ]);

    const shopEnv = { DB: env.DB, KV_CARTS: memoryKv() };
    const cart = await createCart(TENANT, shopEnv);

    // The club's own items and the shared catalogue go in
    for (const id of ["v_pt_own_101", "v_pt_shared_101", "var_own", "var_shared"]) {
      await addToCart(cart.id, id, 1, shopEnv);
    }
    const filled = await addToCart(cart.id, "var_own", 1, shopEnv);
    expect(filled.items.map((i) => i.variantId).sort()).toEqual(["v_pt_own_101", "v_pt_shared_101", "var_own", "var_shared"]);

    // Another club's private design or product is refused, as if it didn't exist
    await expect(addToCart(cart.id, "v_pt_rival_101", 1, shopEnv)).rejects.toThrow("Variant not found");
    await expect(addToCart(cart.id, "var_rival", 1, shopEnv)).rejects.toThrow("Variant not found");

    // The rival club's own basket can still use them
    const rivalCart = await createCart(RIVAL, shopEnv);
    const rivalFilled = await addToCart(rivalCart.id, "v_pt_rival_101", 1, shopEnv);
    expect(rivalFilled.items).toHaveLength(1);
  });
});
