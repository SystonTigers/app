import { describe, it, expect, beforeEach, vi } from "vitest";
import { customize, getProducts, createOrder, getOrder } from "../shop";
import type { Env } from "../../env";

// Mock the printify service
vi.mock("../printify", () => ({
  PrintifyService: vi.fn().mockImplementation(() => ({
    getProducts: vi.fn().mockResolvedValue([]),
    createOrder: vi.fn().mockResolvedValue({ id: "printify_order_123" }),
  })),
  PrintifyOrderPayload: {},
}));

describe("Shop Service", () => {
  let mockEnv: Env;
  let mockKV: Map<string, string>;

  beforeEach(() => {
    mockKV = new Map();
    mockEnv = {
      PRINTIFY_API_KEY: "test-api-key",
      PRINTIFY_SHOP_ID: "test-shop-id",
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
    it("should return products from cache when Printify fails and cache exists", async () => {
      const products = [
        { id: "prod_1", name: "Team Jersey", price: 49.99 },
        { id: "prod_2", name: "Team Cap", price: 19.99 },
      ];

      mockKV.set("shop:demo:products", JSON.stringify(products));

      // Mock Printify to throw an error
      const { PrintifyService } = await import("../printify");
      (PrintifyService as any).mockImplementation(() => ({
        getProducts: vi.fn().mockRejectedValue(new Error("API Error")),
      }));

      const req = { tenant: "demo" };
      const response = await getProducts(req, mockEnv);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.products).toEqual(products);
      expect(data.source).toBe("cache");
    });

    it("should return empty array when no products and Printify fails", async () => {
      // Mock Printify to throw an error
      const { PrintifyService } = await import("../printify");
      (PrintifyService as any).mockImplementation(() => ({
        getProducts: vi.fn().mockRejectedValue(new Error("API Error")),
      }));

      const req = { tenant: "demo" };
      const response = await getProducts(req, mockEnv);

      // Should return 500 error when no cache
      expect(response.status).toBe(500);
    });

    it("should transform Printify products correctly", async () => {
      const printifyProducts = [
        {
          id: "prod_1",
          title: "Team Jersey",
          description: "Official jersey",
          images: [{ src: "https://example.com/jersey.jpg", is_default: true }],
          variants: [
            { id: 1, title: "Small", price: 4999, is_enabled: true },
            { id: 2, title: "Medium", price: 4999, is_enabled: true },
          ],
        },
      ];

      const { PrintifyService } = await import("../printify");
      (PrintifyService as any).mockImplementation(() => ({
        getProducts: vi.fn().mockResolvedValue(printifyProducts),
      }));

      const req = { tenant: "demo" };
      const response = await getProducts(req, mockEnv);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.products[0].name).toBe("Team Jersey");
      expect(data.products[0].price).toBe(49.99); // Converted from cents
    });
  });

  describe("createOrder", () => {
    it("should create order with valid data", async () => {
      const { PrintifyService } = await import("../printify");
      (PrintifyService as any).mockImplementation(() => ({
        createOrder: vi.fn().mockResolvedValue({ id: "printify_order_abc" }),
      }));

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
      expect(data.status).toBe("submitted");
      expect(data.message).toContain("Order sent to Printify");
    });

    it("should return error when product_id missing", async () => {
      const req = {
        tenant: "demo",
        json: {
          variant_id: "var_456",
          quantity: 1,
          shipping_address: { name: "John" },
        },
      };

      const response = await createOrder(req, mockEnv);
      expect(response.status).toBe(400);

      const data = await response.json() as any;
      expect(data.error).toContain("product_id");
    });

    it("should return error when variant_id missing", async () => {
      const req = {
        tenant: "demo",
        json: {
          product_id: "prod_123",
          quantity: 1,
          shipping_address: { name: "John" },
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
          shipping_address: { name: "John" },
        },
      };

      const response = await createOrder(req, mockEnv);
      expect(response.status).toBe(400);

      const data = await response.json() as any;
      expect(data.error).toContain("quantity");
    });

    it("should return error when shipping_address missing", async () => {
      const req = {
        tenant: "demo",
        json: {
          product_id: "prod_123",
          variant_id: "var_456",
          quantity: 1,
        },
      };

      const response = await createOrder(req, mockEnv);
      expect(response.status).toBe(400);

      const data = await response.json() as any;
      expect(data.error).toContain("shipping_address");
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
});
