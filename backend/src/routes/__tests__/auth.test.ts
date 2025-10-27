import { webcrypto } from "node:crypto";
import { handleAuthLogin, handleAuthRegister } from "../auth";

declare global {
  // eslint-disable-next-line no-var
  var crypto: Crypto;
}

type StoredRow = {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  roles: string;
  profile: string | null;
  created_at: number;
  updated_at: number;
};

class MockKV {
  private store = new Map<string, string>();

  async get(key: string) {
    return this.store.get(key) ?? null;
  }

  async put(key: string, value: string, _options?: unknown) {
    this.store.set(key, value);
  }

  async delete(key: string) {
    this.store.delete(key);
  }

  async list() {
    return { keys: Array.from(this.store.keys()).map((name) => ({ name })) };
  }
}

class MockPreparedStatement {
  constructor(private db: MockD1Database, private sql: string, private params: unknown[] = []) {}

  bind(...params: unknown[]) {
    this.params = params;
    return this;
  }

  async run() {
    return this.db.execute(this.sql, this.params);
  }

  async first() {
    const rows = await this.db.query(this.sql, this.params);
    return rows[0] ?? null;
  }
}

class MockD1Database {
  private rows = new Map<string, StoredRow>();

  prepare(sql: string) {
    return new MockPreparedStatement(this, sql);
  }

  async execute(sql: string, params: unknown[]) {
    const normalized = sql.trim().toUpperCase();
    if (normalized.startsWith("INSERT INTO AUTH_USERS")) {
      const [id, tenantId, email, password_hash, roles, profile, created_at, updated_at] = params as [
        string,
        string,
        string,
        string,
        string,
        string | null,
        number,
        number
      ];
      const key = `${tenantId}::${email}`;
      if (this.rows.has(key)) {
        throw new Error("UNIQUE constraint failed: auth_users.tenant_id, auth_users.email");
      }
      this.rows.set(key, {
        id,
        tenant_id: tenantId,
        email,
        password_hash,
        roles,
        profile: profile ?? null,
        created_at,
        updated_at,
      });
      return { success: true };
    }
    throw new Error(`Unsupported SQL: ${sql}`);
  }

  async query(sql: string, params: unknown[]) {
    const normalized = sql.trim().toUpperCase();
    if (normalized.startsWith("SELECT")) {
      const [tenantId, email] = params as [string, string];
      const key = `${tenantId}::${email}`;
      const row = this.rows.get(key);
      if (!row) return [];
      return [row];
    }
    throw new Error(`Unsupported SQL: ${sql}`);
  }

  getRow(tenantId: string, email: string) {
    return this.rows.get(`${tenantId}::${email}`);
  }
}

describe("auth routes", () => {
  beforeAll(() => {
    globalThis.crypto = webcrypto as unknown as Crypto;
  });

  const corsHeaders = new Headers({
    "Access-Control-Allow-Origin": "*",
    "X-Request-Id": "test",
    "X-Release": "test",
  });

  function createEnv() {
    const kv = new MockKV();
    return {
      KV_IDEMP: kv,
      DB: new MockD1Database(),
      JWT_SECRET: "test-secret",
      JWT_ISSUER: "issuer",
      JWT_AUDIENCE: "audience",
    };
  }

  async function seedTenant(env: any, tenantId: string) {
    const cfg = {
      id: tenantId,
      flags: { use_make: false, direct_yt: true },
      makeWebhookUrl: null,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    await env.KV_IDEMP.put(`tenant:${tenantId}`, JSON.stringify(cfg));
  }

  test("registers a tenant member and allows login", async () => {
    const env = createEnv();
    await seedTenant(env, "demo");

    const registerRequest = new Request("https://example.com/api/v1/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "abc123",
      },
      body: JSON.stringify({
        tenant_id: "demo",
        email: "User@Example.com",
        password: "supersecret",
        profile: { name: "Demo" },
      }),
    });

    const registerResponse = await handleAuthRegister(registerRequest, env, new Headers(corsHeaders));
    expect(registerResponse.status).toBe(201);
    const registerJson = await registerResponse.json();
    expect(registerJson.success).toBe(true);
    expect(registerJson.data.token).toBeTypeOf("string");
    expect(registerJson.data.user.email).toBe("user@example.com");

    const stored = env.DB.getRow("demo", "user@example.com");
    expect(stored?.password_hash).toBeTruthy();
    expect(stored?.password_hash).not.toContain("supersecret");

    const loginRequest = new Request("https://example.com/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tenant_id: "demo",
        email: "user@example.com",
        password: "supersecret",
      }),
    });

    const loginResponse = await handleAuthLogin(loginRequest, env, new Headers(corsHeaders));
    expect(loginResponse.status).toBe(200);
    const loginJson = await loginResponse.json();
    expect(loginJson.success).toBe(true);
    expect(loginJson.data.token).toBeTypeOf("string");
    expect(loginJson.data.user.roles).toContain("tenant_member");
  });

  test("returns cached response on idempotent retry", async () => {
    const env = createEnv();
    await seedTenant(env, "demo");

    const requestPayload = {
      tenant_id: "demo",
      email: "retry@example.com",
      password: "anothersecret",
    };

    const firstRequest = new Request("https://example.com/api/v1/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "idem-1",
      },
      body: JSON.stringify(requestPayload),
    });

    const secondRequest = new Request("https://example.com/api/v1/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "idem-1",
      },
      body: JSON.stringify(requestPayload),
    });

    const firstResponse = await handleAuthRegister(firstRequest, env, new Headers(corsHeaders));
    expect(firstResponse.status).toBe(201);
    const firstJson = await firstResponse.json();

    const secondResponse = await handleAuthRegister(secondRequest, env, new Headers(corsHeaders));
    expect(secondResponse.status).toBe(200);
    const secondJson = await secondResponse.json();
    expect(secondJson).toEqual(firstJson);
  });

  test("rejects invalid login credentials", async () => {
    const env = createEnv();
    await seedTenant(env, "demo");

    const registerRequest = new Request("https://example.com/api/v1/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tenant_id: "demo",
        email: "fail@example.com",
        password: "validpass1",
      }),
    });
    await handleAuthRegister(registerRequest, env, new Headers(corsHeaders));

    const badLogin = new Request("https://example.com/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tenant_id: "demo",
        email: "fail@example.com",
        password: "wrongpass",
      }),
    });

    const badResponse = await handleAuthLogin(badLogin, env, new Headers(corsHeaders));
    expect(badResponse.status).toBe(401);
    const badJson = await badResponse.json();
    expect(badJson.success).toBe(false);
    expect(badJson.error.code).toBe("INVALID_CREDENTIALS");
  });
});
