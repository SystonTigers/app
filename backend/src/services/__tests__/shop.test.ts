import { describe, it, expect, beforeEach, vi } from "vitest";
import { customize, getProducts, createOrder, getOrder } from "../shop";
import type { Env } from "../../env";

describe("Shop Service", () => {
  let mockEnv: Env;
  let mockKV: Map<string, string>;

  beforeEach(() => {
    mockKV = new Map();
    mockEnv = {
      KV: {
        get: vi.fn(async (key: string, type?: string) => {
          const value = mockKV.get(key);
          if (!value) return null;
          return type === "json" ? JSON.parse(value) : value;
        }),
        put: vi.fn(async (key: string, value: string) => {
          mockKV.set(key, value);
        }),
      },
    } as any;

    vi.clearAllMocks();
  });

  describe("customize", () => {
    it("should customize product with all params provided", async () => {
      const req = {
        tenant: "demo",
        json: {
          product_id: "prod_123",
          badge_url: "https://example.com/badge.png",
          team_name: "Demo FC",
          colors: { primary: "#FF0000", secondary: "#0000FF" },
          slogan: "Victory United",
        },
      };

      const response = await customize(req, mockEnv);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.product_id).toBe("prod_123");
      expect(data.custom_product_id).toBeTruthy();
      expect(data.customization.badge_url).toBe("https://example.com/badge.png");
      expect(data.customization.team_name).toBe("Demo FC");
      expect(data.customization.colors.primary).toBe("#FF0000");
      expect(data.customization.slogan).toBe("Victory United");
      expect(data.preview_url).toContain(data.custom_product_id);
    });

    it("should use config defaults when params not provided", async () => {
      mockKV.set(
        "team:demo:config",
        JSON.stringify({
          badge_url: "https://example.com/default-badge.png",
          name: "Demo Team",
          colors: { primary: "#00FF00" },
          slogan: "Default Slogan",
        })
      );

      const req = {
        tenant: "demo",
        json: {
          product_id: "prod_456",
        },
      };

      const response = await customize(req, mockEnv);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.customization.badge_url).toBe(
        "https://example.com/default-badge.png"
      );
      expect(data.customization.team_name).toBe("Demo Team");
      expect(data.customization.colors.primary).toBe("#00FF00");
      expect(data.customization.slogan).toBe("Default Slogan");
    });

    it("should return error when product_id missing", async () => {
      const req = {
        tenant: "demo",
        json: {
          badge_url: "https://example.com/badge.png",
        },
      };

      const response = await customize(req, mockEnv);
      expect(response.status).toBe(400);

      const data = await response.json() as any;
      expect(data.error).toBe("product_id required");
    });

    it("should generate unique custom_product_id", async () => {
      const req = {
        tenant: "demo",
        json: { product_id: "prod_789" },
      };

      const response1 = await customize(req, mockEnv);
      const data1 = await response1.json() as any;

      const response2 = await customize(req, mockEnv);
      const data2 = await response2.json() as any;

      expect(data1.custom_product_id).not.toBe(data2.custom_product_id);
    });
  });

  describe("getProducts", () => {
    it("should return products when they exist", async () => {
      const products = [
        { id: "prod_1", name: "Team Jersey", price: 49.99 },
        { id: "prod_2", name: "Team Cap", price: 19.99 },
      ];

      mockKV.set("shop:demo:products", JSON.stringify(products));

      const req = { tenant: "demo" };
      const response = await getProducts(req, mockEnv);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.products).toEqual(products);
      expect(data.products).toHaveLength(2);
    });

    it("should return empty array when no products", async () => {
      const req = { tenant: "demo" };
      const response = await getProducts(req, mockEnv);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.products).toEqual([]);
    });

    it("should isolate products by tenant", async () => {
      mockKV.set(
        "shop:tenant1:products",
        JSON.stringify([{ id: "prod_1", name: "Tenant 1 Jersey" }])
      );
      mockKV.set(
        "shop:tenant2:products",
        JSON.stringify([{ id: "prod_2", name: "Tenant 2 Jersey" }])
      );

      const req1 = { tenant: "tenant1" };
      const response1 = await getProducts(req1, mockEnv);
      const data1 = await response1.json() as any;

      const req2 = { tenant: "tenant2" };
      const response2 = await getProducts(req2, mockEnv);
      const data2 = await response2.json() as any;

      expect(data1.products[0].name).toBe("Tenant 1 Jersey");
      expect(data2.products[0].name).toBe("Tenant 2 Jersey");
    });
  });

  describe("createOrder", () => {
    it("should create order with valid data", async () => {
      const req = {
        tenant: "demo",
        json: {
          product_id: "prod_123",
          variant_id: "var_456",
          quantity: 2,
          shipping_address: {
            name: "John Doe",
            street: "123 Main St",
            city: "Demo City",
          },
        },
      };

      const response = await createOrder(req, mockEnv);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.order_id).toBeTruthy();
      expect(data.status).toBe("pending");
      expect(data.message).toContain("Order created");
    });

    it("should store order in KV with correct key", async () => {
      const req = {
        tenant: "demo",
        json: {
          product_id: "prod_123",
          variant_id: "var_456",
          quantity: 1,
        },
      };

      await createOrder(req, mockEnv);

      // Verify KV.put was called with correct key format
      expect(mockEnv.KV.put).toHaveBeenCalled();
      const putCall = (mockEnv.KV.put as any).mock.calls[0];
      expect(putCall[0]).toMatch(/^order:demo:[a-f0-9-]+$/);

      // Verify stored data
      const storedData = JSON.parse(putCall[1]);
      expect(storedData.product_id).toBe("prod_123");
      expect(storedData.variant_id).toBe("var_456");
      expect(storedData.quantity).toBe(1);
      expect(storedData.status).toBe("pending");
      expect(storedData.created_at).toBeTypeOf("number");
    });

    it("should return error when product_id missing", async () => {
      const req = {
        tenant: "demo",
        json: {
          variant_id: "var_456",
          quantity: 1,
        },
      };

      const response = await createOrder(req, mockEnv);
      expect(response.status).toBe(400);

      const data = await response.json() as any;
      expect(data.error).toContain("product_id");
      expect(data.error).toContain("required");
    });

    it("should return error when variant_id missing", async () => {
      const req = {
        tenant: "demo",
        json: {
          product_id: "prod_123",
          quantity: 1,
        },
      };

      const response = await createOrder(req, mockEnv);
      expect(response.status).toBe(400);

      const data = await response.json() as any;
      expect(data.error).toContain("variant_id");
    });

    it("should return error when quantity missing", async () => {
      const req = {
        tenant: "demo",
        json: {
          product_id: "prod_123",
          variant_id: "var_456",
        },
      };

      const response = await createOrder(req, mockEnv);
      expect(response.status).toBe(400);

      const data = await response.json() as any;
      expect(data.error).toContain("quantity");
    });
  });

  describe("getOrder", () => {
    it("should return order when it exists", async () => {
      const order = {
        order_id: "order_123",
        product_id: "prod_456",
        variant_id: "var_789",
        quantity: 1,
        status: "pending",
        created_at: Date.now(),
      };

      mockKV.set("order:demo:order_123", JSON.stringify(order));

      const req = {
        tenant: "demo",
        url: "https://example.com/orders/order_123",
      };

      const response = await getOrder(req, mockEnv);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.order).toEqual(order);
    });

    it("should return 404 when order not found", async () => {
      const req = {
        tenant: "demo",
        url: "https://example.com/orders/nonexistent",
      };

      const response = await getOrder(req, mockEnv);
      expect(response.status).toBe(404);

      const data = await response.json() as any;
      expect(data.error).toBe("Order not found");
    });

    it("should isolate orders by tenant", async () => {
      mockKV.set(
        "order:tenant1:order_abc",
        JSON.stringify({ order_id: "order_abc", product_id: "prod_1" })
      );
      mockKV.set(
        "order:tenant2:order_abc",
        JSON.stringify({ order_id: "order_abc", product_id: "prod_2" })
      );

      const req1 = {
        tenant: "tenant1",
        url: "https://example.com/orders/order_abc",
      };
      const response1 = await getOrder(req1, mockEnv);
      const data1 = await response1.json() as any;

      const req2 = {
        tenant: "tenant2",
        url: "https://example.com/orders/order_abc",
      };
      const response2 = await getOrder(req2, mockEnv);
      const data2 = await response2.json() as any;

      expect(data1.order.product_id).toBe("prod_1");
      expect(data2.order.product_id).toBe("prod_2");
    });
  });

  describe("Edge Cases", () => {
    it("should handle complete shop workflow", async () => {
      // 1. Get products (empty initially)
      const getProductsReq = { tenant: "demo" };
      const productsResp = await getProducts(getProductsReq, mockEnv);
      const productsData = await productsResp.json() as any;
      expect(productsData.products).toEqual([]);

      // 2. Customize product
      const customizeReq = {
        tenant: "demo",
        json: {
          product_id: "prod_123",
          team_name: "Demo FC",
          slogan: "Victory",
        },
      };
      const customizeResp = await customize(customizeReq, mockEnv);
      const customizeData = await customizeResp.json() as any;
      expect(customizeData.custom_product_id).toBeTruthy();

      // 3. Create order
      const createOrderReq = {
        tenant: "demo",
        json: {
          product_id: customizeData.product_id,
          variant_id: "var_456",
          quantity: 2,
        },
      };
      const orderResp = await createOrder(createOrderReq, mockEnv);
      const orderData = await orderResp.json() as any;
      expect(orderData.order_id).toBeTruthy();

      // 4. Get order
      const getOrderReq = {
        tenant: "demo",
        url: `https://example.com/orders/${orderData.order_id}`,
      };
      const retrievedResp = await getOrder(getOrderReq, mockEnv);
      const retrievedData = await retrievedResp.json() as any;
      expect(retrievedData.order.order_id).toBe(orderData.order_id);
      expect(retrievedData.order.quantity).toBe(2);
    });
  });
});
