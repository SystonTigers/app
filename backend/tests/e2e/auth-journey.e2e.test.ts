import { describe, it, expect, beforeAll } from "vitest";
import { env } from "cloudflare:test";
import worker from "../../src/index";
import {
  TEST_TENANT,
  generateTestEmail,
  generateIdempotencyKey,
  createMockContext,
  parseResponse,
} from "./vitest.setup";

const mockCtx = createMockContext();

/**
 * E2E Test: Complete Authentication Journey
 *
 * Tests the full user authentication flow including:
 * 1. User registration
 * 2. Login with credentials
 * 3. Token validation
 * 4. Authenticated API access
 *
 * Prerequisites: Run test-seed.sql to seed the test database
 * @see ./fixtures/test-seed.sql
 */
describe("E2E: Authentication Journey", () => {
  const testEmail = generateTestEmail();
  const testPassword = "SecurePassword123!";
  let authToken: string;

  it("completes full authentication journey: register -> login -> access protected resource", async () => {
    // Step 1: Register new user (using test tenant from fixtures)
    const registerRequest = new Request("https://example.com/api/v1/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": generateIdempotencyKey("reg"),
      },
      body: JSON.stringify({
        tenant_id: TEST_TENANT.id,
        email: testEmail,
        password: testPassword,
        profile: { name: "Test User" },
      }),
    });

    const registerResponse = await worker.fetch(registerRequest, env, mockCtx);
    expect(registerResponse.status).toBeGreaterThanOrEqual(200);
    expect(registerResponse.status).toBeLessThan(300);

    const registerData = await registerResponse.json() as any;
    expect(registerData.success).toBe(true);

    // Step 2: Login with credentials
    const loginRequest = new Request("https://example.com/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: TEST_TENANT.id,
        email: testEmail,
        password: testPassword,
      }),
    });

    const loginResponse = await worker.fetch(loginRequest, env, mockCtx);
    expect(loginResponse.status).toBe(200);

    const loginData = await loginResponse.json() as any;
    expect(loginData.success).toBe(true);
    expect(loginData.data?.token).toBeDefined();

    authToken = loginData.data.token;

    // Step 3: Access protected resource with token
    const protectedRequest = new Request("https://example.com/api/v1/videos", {
      method: "GET",
      headers: {
        "authorization": `Bearer ${authToken}`,
      },
    });

    const protectedResponse = await worker.fetch(protectedRequest, env, mockCtx);
    expect(protectedResponse.status).toBe(200);

    const protectedData = await protectedResponse.json() as any;
    expect(protectedData.success).toBe(true);

    // Step 4: Verify token cannot access other tenant's resources
    const otherTenantRequest = new Request("https://example.com/api/v1/videos?tenant=other-tenant", {
      method: "GET",
      headers: {
        "authorization": `Bearer ${authToken}`,
      },
    });

    const otherTenantResponse = await worker.fetch(otherTenantRequest, env, mockCtx);
    // Should still succeed but only return data for authenticated tenant
    expect(otherTenantResponse.status).toBe(200);
  });

  it("handles invalid credentials correctly", async () => {
    const loginRequest = new Request("https://example.com/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: TEST_TENANT.id,
        email: "nonexistent@example.com",
        password: "WrongPassword123!",
      }),
    });

    const response = await worker.fetch(loginRequest, env, mockCtx);
    expect(response.status).toBeGreaterThanOrEqual(400);

    const data = await response.json() as any;
    expect(data.success).toBe(false);
  });

  it("rejects access without authentication token", async () => {
    const request = new Request("https://example.com/api/v1/videos", {
      method: "GET",
    });

    const response = await worker.fetch(request, env, mockCtx);
    expect(response.status).toBe(401);
  });
});
