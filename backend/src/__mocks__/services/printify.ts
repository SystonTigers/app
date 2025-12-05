/**
 * Mock Printify Service
 *
 * Use this mock in tests to avoid real Printify API calls.
 * Import with: vi.mock("../services/printify");
 */

import { vi } from "vitest";

// Mock product data
const mockProducts = [
  {
    id: "mock-product-1",
    title: "Team Jersey",
    description: "Official team jersey",
    images: [{ src: "https://example.com/jersey.jpg", is_default: true }],
    variants: [
      { id: 101, title: "S / Black", price: 2999, is_enabled: true },
      { id: 102, title: "M / Black", price: 2999, is_enabled: true },
      { id: 103, title: "L / Black", price: 2999, is_enabled: true },
    ],
  },
  {
    id: "mock-product-2",
    title: "Training Kit",
    description: "Training equipment",
    images: [{ src: "https://example.com/training.jpg", is_default: true }],
    variants: [{ id: 201, title: "One Size", price: 1999, is_enabled: true }],
  },
];

export const mockGetProducts = vi.fn().mockResolvedValue(mockProducts);
export const mockGetProduct = vi.fn().mockImplementation((productId: string) => {
  const product = mockProducts.find((p) => p.id === productId);
  if (!product) {
    return Promise.reject(new Error("Product not found"));
  }
  return Promise.resolve(product);
});

export const mockCreateOrder = vi.fn().mockResolvedValue({
  id: "mock-order-id",
  external_id: "test-external-id",
  status: "pending",
  created_at: new Date().toISOString(),
});

export const mockCalculateShipping = vi.fn().mockResolvedValue({
  standard: 499,
  express: 999,
});

/**
 * Mock PrintifyService class
 */
export class PrintifyService {
  private token: string;
  private shopId: string;

  constructor(env: { PRINTIFY_API_TOKEN?: string; PRINTIFY_SHOP_ID?: string }) {
    if (!env.PRINTIFY_API_TOKEN || !env.PRINTIFY_SHOP_ID) {
      throw new Error("Printify configuration missing");
    }
    this.token = env.PRINTIFY_API_TOKEN;
    this.shopId = env.PRINTIFY_SHOP_ID;
  }

  getProducts = mockGetProducts;
  getProduct = mockGetProduct;
  createOrder = mockCreateOrder;
  calculateShipping = mockCalculateShipping;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Set up Printify mock with custom products
 */
export function mockPrintifyProducts(products: typeof mockProducts): void {
  mockGetProducts.mockResolvedValue(products);
  mockGetProduct.mockImplementation((productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return Promise.reject(new Error("Product not found"));
    }
    return Promise.resolve(product);
  });
}

/**
 * Set up Printify mock to fail
 */
export function mockPrintifyFailure(error: string = "Printify API error"): void {
  mockGetProducts.mockRejectedValue(new Error(error));
  mockGetProduct.mockRejectedValue(new Error(error));
  mockCreateOrder.mockRejectedValue(new Error(error));
  mockCalculateShipping.mockRejectedValue(new Error(error));
}

/**
 * Reset Printify mocks to default behavior
 */
export function resetPrintifyMocks(): void {
  mockGetProducts.mockReset();
  mockGetProduct.mockReset();
  mockCreateOrder.mockReset();
  mockCalculateShipping.mockReset();

  mockGetProducts.mockResolvedValue(mockProducts);
  mockGetProduct.mockImplementation((productId: string) => {
    const product = mockProducts.find((p) => p.id === productId);
    if (!product) {
      return Promise.reject(new Error("Product not found"));
    }
    return Promise.resolve(product);
  });
  mockCreateOrder.mockResolvedValue({
    id: "mock-order-id",
    external_id: "test-external-id",
    status: "pending",
    created_at: new Date().toISOString(),
  });
  mockCalculateShipping.mockResolvedValue({
    standard: 499,
    express: 999,
  });
}
