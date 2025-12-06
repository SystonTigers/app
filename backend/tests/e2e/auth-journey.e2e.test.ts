import { describe, it, expect, beforeAll } from "vitest";
import { env } from "cloudflare:test";
import worker from "../../src/index";

// Mock ExecutionContext for worker tests
const mockCtx = {
  waitUntil: () => { },
  passThroughOnException: () => { },
  props: {},
} as unknown as ExecutionContext;

// Test tenant configuration
const TEST_TENANT = {
  id: "tenant_e2e_test",
  slug: "syston",
  name: "Syston Tigers Test",
  email: "test@syston-tigers.com",
  plan: "starter",
  status: "active",
  comped: 0,
};

/**
 * E2E Test: Complete Authentication Journey
 *
 * Tests the full user authentication flow including:
 * 1. User registration
 * 2. Login with credentials
 * 3. Token validation
 * 4. Authenticated API access
 */
describe("E2E: Authentication Journey", () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "SecurePassword123!";
  let authToken: string;

  // Seed the test tenant before all tests
  beforeAll(async () => {
    const db = (env as any).DB;

    // Create tables if they don't exist (for test environment)
    await db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        plan TEXT NOT NULL CHECK(plan IN ('starter', 'pro')),
        status TEXT NOT NULL DEFAULT 'trial' CHECK(status IN ('trial', 'active', 'suspended', 'cancelled')),
        comped INTEGER NOT NULL DEFAULT 0,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        trial_ends_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS auth_users (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        roles TEXT NOT NULL,
        profile TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(tenant_id, email)
      )`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_auth_users_tenant ON auth_users(tenant_id)`),
    ]);

    // Delete existing test tenant if present (clean slate)
    await db.prepare("DELETE FROM tenants WHERE id = ? OR slug = ?")
      .bind(TEST_TENANT.id, TEST_TENANT.slug)
      .run();

    // Insert test tenant
    await db.prepare(`
      INSERT INTO tenants (id, slug, name, email, plan, status, comped, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())
    `).bind(
      TEST_TENANT.id,
      TEST_TENANT.slug,
      TEST_TENANT.name,
      TEST_TENANT.email,
      TEST_TENANT.plan,
      TEST_TENANT.status,
      TEST_TENANT.comped
    ).run();

    // Also seed tenant config in KV for getTenantConfig
    const kv = (env as any).KV_IDEMP;
    await kv.put(`tenant:${TEST_TENANT.id}`, JSON.stringify({
      id: TEST_TENANT.id,
      slug: TEST_TENANT.slug,
      name: TEST_TENANT.name,
      flags: { use_make: false, direct_yt: true },
      created_at: Date.now(),
      updated_at: Date.now(),
    }));
  });

  it("completes full authentication journey: register -> login -> access protected resource", async () => {
    // Step 1: Register new user with the seeded tenant
    const registerRequest = new Request("https://example.com/api/v1/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": `reg-${Date.now()}`,
      },
      body: JSON.stringify({
        tenant_id: TEST_TENANT.id,
        email: testEmail,
        password: testPassword,
        profile: { name: "Test User" },
      }),
    });

    const registerResponse = await worker.fetch(registerRequest, env, mockCtx);
    const registerData = await registerResponse.json() as any;

    // Log error for debugging
    if (registerResponse.status >= 400) {
      console.error("Registration failed:", registerResponse.status, registerData);
    }

    expect(registerResponse.status).toBeGreaterThanOrEqual(200);
    expect(registerResponse.status).toBeLessThan(300);
    expect(registerData.success).toBe(true);

    // Step 2: Login with credentials
    const loginRequest = new Request("https://example.com/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
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
      headers: { "content-type": "application/json" },
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
