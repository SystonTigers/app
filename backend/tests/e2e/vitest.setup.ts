/**
 * Vitest Setup for E2E Tests
 *
 * This file runs before E2E tests to set up the test environment.
 * It seeds the database with test fixtures and configures global mocks.
 */
import { beforeAll, afterAll } from "vitest";

/**
 * Test tenant configuration used across all E2E tests
 */
export const TEST_TENANT = {
  id: "syston",
  slug: "syston-test",
  name: "Syston Test Team",
  email: "test@systontigers.co.uk",
};

/**
 * Test user credentials
 */
export const TEST_ADMIN = {
  email: "admin@test.com",
  password: "TestPassword123!",
  id: "test_admin_user",
};

/**
 * Generate a unique test email for registration tests
 */
export function generateTestEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}

/**
 * Generate a unique idempotency key
 */
export function generateIdempotencyKey(prefix: string = "test"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Create a mock execution context for worker tests
 */
export function createMockContext(): ExecutionContext {
  return {
    waitUntil: () => {},
    passThroughOnException: () => {},
    props: {},
  } as unknown as ExecutionContext;
}

/**
 * Create standard request headers for authenticated requests
 */
export function createAuthHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };
}

/**
 * Create request with common headers for testing
 */
export function createTestRequest(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
    idempotencyKey?: string;
  } = {}
): Request {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  if (options.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }

  return new Request(`https://test.example.com${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

/**
 * Parse JSON response with error handling
 */
export async function parseResponse<T = unknown>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Failed to parse response as JSON: ${text}`);
  }
}

/**
 * Assert successful API response
 */
export function assertSuccess(data: unknown): asserts data is { success: true; data: unknown } {
  if (typeof data !== "object" || data === null) {
    throw new Error(`Expected object response, got ${typeof data}`);
  }
  if (!("success" in data) || (data as { success: boolean }).success !== true) {
    throw new Error(`Expected success: true, got ${JSON.stringify(data)}`);
  }
}

/**
 * Assert error API response
 */
export function assertError(data: unknown): asserts data is { success: false; error: unknown } {
  if (typeof data !== "object" || data === null) {
    throw new Error(`Expected object response, got ${typeof data}`);
  }
  if (!("success" in data) || (data as { success: boolean }).success !== false) {
    throw new Error(`Expected success: false, got ${JSON.stringify(data)}`);
  }
}

// Log setup
beforeAll(() => {
  console.log("🧪 E2E Test Environment Setup");
  console.log(`   Test Tenant: ${TEST_TENANT.id}`);
  console.log(`   Test Admin: ${TEST_ADMIN.email}`);
});

afterAll(() => {
  console.log("🧹 E2E Test Environment Teardown");
});
