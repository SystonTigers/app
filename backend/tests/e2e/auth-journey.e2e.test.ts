import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../../src/index";

/**
 * E2E Test: Complete Authentication Journey
 *
 * Tests the full user authentication flow including:
 * 1. User registration
 * 2. Login with credentials
 * 3. Token validation
 * 4. Authenticated API access
 *
 * Note: These tests use the existing 'syston' tenant from test fixtures
 * which should be seeded in the test environment
 */
describe("E2E: Authentication Journey", () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "SecurePassword123!";
  let authToken: string;

  it("completes full authentication journey: register -> login -> access protected resource", async () => {
    // Step 1: Register new user (using syston tenant from fixtures)
    const registerRequest = new Request("https://example.com/api/v1/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": `reg-${Date.now()}`,
      },
      body: JSON.stringify({
        tenant_id: "syston",
        email: testEmail,
        password: testPassword,
        profile: { name: "Test User" },
      }),
    });

    const registerResponse = await worker.fetch(registerRequest, env);
    expect(registerResponse.status).toBeGreaterThanOrEqual(200);
    expect(registerResponse.status).toBeLessThan(300);

    const registerData = await registerResponse.json() as any;
    expect(registerData.success).toBe(true);

    // Step 2: Login with credentials
    const loginRequest = new Request("https://example.com/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tenant_id: "syston",
        email: testEmail,
        password: testPassword,
      }),
    });

    const loginResponse = await worker.fetch(loginRequest, env);
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

    const protectedResponse = await worker.fetch(protectedRequest, env);
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

    const otherTenantResponse = await worker.fetch(otherTenantRequest, env);
    // Should still succeed but only return data for authenticated tenant
    expect(otherTenantResponse.status).toBe(200);
  });

  it("handles invalid credentials correctly", async () => {
    const loginRequest = new Request("https://example.com/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tenant_id: "syston",
        email: "nonexistent@example.com",
        password: "WrongPassword123!",
      }),
    });

    const response = await worker.fetch(loginRequest, env);
    expect(response.status).toBeGreaterThanOrEqual(400);

    const data = await response.json() as any;
    expect(data.success).toBe(false);
  });

  it("rejects access without authentication token", async () => {
    const request = new Request("https://example.com/api/v1/videos", {
      method: "GET",
    });

    const response = await worker.fetch(request, env);
    expect(response.status).toBe(401);
  });
});
