// backend/src/services/push.ts
import type { Env } from "../types";

export async function sendFcm(env: Env, tokens: string[], payload: any) {
  if (!env.FCM_SERVER_KEY) throw new Error("FCM_SERVER_KEY missing");
  const body = {
    registration_ids: tokens,
    notification: payload.notification ?? undefined,
    data: payload.data ?? undefined,
  };
  const r = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `key=${env.FCM_SERVER_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`FCM error ${r.status}: ${t}`);
  }
  return r.json();
}

// Device token registry helpers
export async function registerDevice(env: Env, tenant: string, userId: string, platform: string, token: string) {
  const key = `tenants:${tenant}:devices:${userId}`;
  const existing = (await env.KV_IDEMP.get(key, "json")) as { platform: string; token: string }[] || [];

  // Upsert: replace if same platform, otherwise add
  const filtered = existing.filter(d => d.platform !== platform);
  filtered.push({ platform, token });

  await env.KV_IDEMP.put(key, JSON.stringify(filtered));
}

export async function getUserTokens(env: Env, tenant: string, userId: string): Promise<string[]> {
  const key = `tenants:${tenant}:devices:${userId}`;
  const devices = (await env.KV_IDEMP.get(key, "json")) as { platform: string; token: string }[] || [];
  return devices.map(d => d.token);
}

export async function sendToUser(env: Env, tenant: string, userId: string, payload: any) {
  const tokens = await getUserTokens(env, tenant, userId);
  if (tokens.length === 0) return { sent: 0 };
  return await sendFcm(env, tokens, payload);
}

export async function sendToMany(env: Env, tenant: string, userIds: string[], payload: any) {
  const allTokens: string[] = [];
  for (const userId of userIds) {
    const tokens = await getUserTokens(env, tenant, userId);
    allTokens.push(...tokens);
  }
  if (allTokens.length === 0) return { sent: 0 };
  return await sendFcm(env, allTokens, payload);
}
