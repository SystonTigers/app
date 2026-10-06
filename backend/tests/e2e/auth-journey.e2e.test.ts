import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../../src/index";
import { call } from "./helpers";

// Mock ExecutionContext for worker tests
const mockCtx = {
  waitUntil: () => { },
  passThroughOnException: () => { },
  props: {},
} as unknown as ExecutionContext;

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
        ageConfirmed: true, tenant_id: "syston",
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
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tenant_id: "syston",
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

    // Step 3: a new sign-up waits for the club to let them in
    const waiting = await worker.fetch(new Request("https://example.com/api/v1/squad", { headers: { authorization: `Bearer ${authToken}` } }), env, mockCtx);
    expect(waiting.status).toBe(403);
    expect(((await waiting.json()) as any).error.code).toBe("WAITING_FOR_APPROVAL");
    await env.DB.prepare(`UPDATE auth_users SET roles = '["tenant_member"]' WHERE email = ? AND tenant_id = 'syston'`).bind(testEmail).run();
    const status = await worker.fetch(new Request("https://example.com/api/v1/membership", { headers: { authorization: `Bearer ${authToken}` } }), env, mockCtx);
    const statusData = await status.json() as any;
    expect(statusData.data.status).toBe("member");
    authToken = statusData.data.token;

    // Step 4: Access protected resource with the new token
    const protectedRequest = new Request("https://example.com/api/v1/squad", {
      method: "GET",
      headers: {
        "authorization": `Bearer ${authToken}`,
      },
    });

    const protectedResponse = await worker.fetch(protectedRequest, env, mockCtx);
    expect(protectedResponse.status).toBe(200);

    const protectedData = await protectedResponse.json() as any;
    expect(protectedData.success).toBe(true);

    // Step 5: Verify token cannot access other tenant's resources
    const otherTenantRequest = new Request("https://example.com/api/v1/squad?tenant=other-tenant", {
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
        tenant_id: "syston",
        email: "nonexistent@example.com",
        password: "WrongPassword123!",
      }),
    });

    const response = await worker.fetch(loginRequest, env, mockCtx);
    expect(response.status).toBeGreaterThanOrEqual(400);

    const data = await response.json() as any;
    expect(data.success).toBe(false);
  });

  it("tells people with an old club-less account how to join their club", async () => {
    const bcrypt = await import("bcryptjs");
    await env.DB.prepare(`INSERT INTO users (id, email, name, password_hash, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, 1, unixepoch(), unixepoch())`)
      .bind(crypto.randomUUID(), "old-signup@example.com", "Old Signup", await bcrypt.hash("Whatever123!", 4)).run();
    // A wrong password gives nothing away
    expect((await call("/api/v1/auth/login", { body: { email: "old-signup@example.com", password: "Wrong123456!" } })).status).toBe(401);
    const { status, data } = await call("/api/v1/auth/login", { body: { email: "old-signup@example.com", password: "Whatever123!" } });
    expect(status).toBe(403);
    expect(data.error.code).toBe("NO_CLUB");
    expect(data.error.message).toMatch(/find your club in the app/);
    // The old sign-up endpoints are gone
    expect((await call("/api/v1/auth/signup", { body: { name: "X", email: "x@example.com", password: "Password123!" } })).status).toBe(404);
  });

  it("rejects access without authentication token", async () => {
    const request = new Request("https://example.com/api/v1/videos", {
      method: "GET",
    });

    const response = await worker.fetch(request, env, mockCtx);
    expect(response.status).toBe(401);
  });

  it("ignores roles sent at registration (no self-made admins)", async () => {
    const email = `sneaky-${Date.now()}@example.com`;
    const reg = await call("/api/v1/auth/register", {
      body: { ageConfirmed: true, tenant_id: "syston", email, password: "SecurePass123!", roles: ["tenant_admin"] },
      headers: { "Idempotency-Key": `sneaky-${email}` },
    });
    expect(reg.status).toBe(201);
    expect(reg.data.data.user.roles).toEqual(["pending"]);

    const attempt = await call("/api/v1/admin/fixtures", {
      token: reg.data.data.token,
      body: { opponent: "Anyone", date: "2099-01-01" },
    });
    expect(attempt.status).toBe(403);
  });

  it("rejects a forged token", async () => {
    const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
    const forged = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: "x", tenant_id: "syston", roles: ["tenant_admin"] })}.not-a-signature`;
    expect((await call("/api/v1/videos", { token: forged })).status).toBe(401);
    expect((await call("/api/v1/feed", { token: forged })).status).toBe(401);
  });

  it("asks new members to confirm they're 13 or over, or a parent or carer", async () => {
    const email = `age-${Date.now()}@example.com`;
    const refused = await call("/api/v1/auth/register", {
      body: { tenant_id: "syston", email, password: "SecurePass123!" },
      headers: { "Idempotency-Key": `age-${email}`, "CF-Connecting-IP": "198.51.100.77" },
    });
    expect(refused.status).toBe(400);
    expect(JSON.stringify(refused.data)).toMatch(/13 or over/);

    const accepted = await call("/api/v1/auth/register", {
      body: { ageConfirmed: true, tenant_id: "syston", email, password: "SecurePass123!" },
      headers: { "Idempotency-Key": `age-ok-${email}`, "CF-Connecting-IP": "198.51.100.77" },
    });
    expect(accepted.status).toBe(201);
    const row = await env.DB.prepare("SELECT profile FROM auth_users WHERE email = ?").bind(email).first<{ profile: string }>();
    expect(JSON.parse(row!.profile).ageConfirmedAt).toBeTruthy();
  });
});
