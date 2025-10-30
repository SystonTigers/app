import { hmac256Base64Url } from "../lib/crypto";
import type { Env } from "../types/env";

export type GasAction = "provision" | "verify";

export async function gasCall(env: Env, action: GasAction, payload: Record<string, unknown>) {
  const body = JSON.stringify({ action, ...payload });
  const sig = await hmac256Base64Url(env.GAS_HMAC_SECRET, body);
  const res = await fetch(env.GAS_WEBAPP_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-signature": sig
    },
    body
  });
  if (!res.ok) {
    throw new Error(`GAS ${action} failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
