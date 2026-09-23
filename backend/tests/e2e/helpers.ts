import { env } from "cloudflare:test";
import worker from "../../src/index";

export const TENANT = "syston";

const mockCtx = {
  waitUntil: () => {},
  passThroughOnException: () => {},
  props: {},
} as unknown as ExecutionContext;

/** Call the worker like the app does. */
export async function call(
  path: string,
  opts: { method?: string; token?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<{ status: number; data: any; res: Response }> {
  const headers: Record<string, string> = { ...(opts.headers || {}) };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  let body: BodyInit | undefined;
  if (opts.body instanceof FormData) {
    body = opts.body;
  } else if (opts.body !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const res = await worker.fetch(
    new Request(`https://example.com${path}`, { method: opts.method || (body ? "POST" : "GET"), headers, body }),
    env,
    mockCtx,
  );
  const text = await res.clone().text();
  let data: any = text;
  try { data = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, data, res };
}

let counter = 0;
const unique = (prefix: string) => `${prefix}-${Date.now()}-${++counter}@example.com`;

/** Register a parent/player account through the public API and return its token. */
export async function registerMember(prefix = "member"): Promise<{ token: string; userId: string; email: string }> {
  const email = unique(prefix);
  const { status, data } = await call("/api/v1/auth/register", {
    body: { tenant_id: TENANT, email, password: "SecurePass123!", profile: { name: prefix } },
    headers: { "Idempotency-Key": `reg-${email}` },
  });
  if (status !== 201) throw new Error(`register failed ${status}: ${JSON.stringify(data)}`);
  return { token: data.data.token, userId: data.data.user.id, email };
}

/** A club admin: registered as a member, promoted in the DB (as an admin would), then logged in. */
export async function registerAdmin(prefix = "admin"): Promise<{ token: string; userId: string }> {
  const { email, userId } = await registerMember(prefix);
  await env.DB.prepare(`UPDATE auth_users SET roles = '["tenant_admin"]' WHERE id = ?`).bind(userId).run();
  const { status, data } = await call("/api/v1/auth/login", {
    body: { tenant_id: TENANT, email, password: "SecurePass123!" },
  });
  if (status !== 200) throw new Error(`admin login failed ${status}: ${JSON.stringify(data)}`);
  return { token: data.data.token, userId };
}
