export async function ensureIdempotent(env: any, tenantId: string, body: unknown, explicitKey?: string) {
  const key = explicitKey || await hashKey(tenantId, body);
  const existing = await env.KV_IDEMP.get(key);
  if (existing) return { hit: true as const, key, response: JSON.parse(existing) };
  return {
    hit: false as const,
    key,
    store: async (resp: unknown) => {
      await env.KV_IDEMP.put(key, JSON.stringify(resp), { expirationTtl: 86400 });
    }
  };
}

export async function setFinalIdempotent(env: any, key: string, resp: unknown) {
  await env.KV_IDEMP.put(key, JSON.stringify(resp), { expirationTtl: 86400 });
}

async function hashKey(tenantId: string, body: unknown) {
  const txt = tenantId + ":" + JSON.stringify(body);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt));
  return "idem:" + tenantId + ":" + [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}
