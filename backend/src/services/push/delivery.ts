/**
 * Delivers a notification to a set of registered devices:
 * - the installable web app: Web Push (services/push/webPush.ts), and
 * - the phone app: Expo's push service (ExponentPushToken[...] tokens).
 * Tokens the services say are dead are removed from `devices`.
 *
 * Replaces the old FCM "legacy" sender (Google switched that API off in 2024).
 */
import { parseSubscription, sendWebPush, type VapidKeys } from "./webPush";

export interface PushEnv {
  DB: D1Database;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  /** Only needed if "enhanced push security" is switched on in the Expo project */
  EXPO_ACCESS_TOKEN?: string;
}

export interface PushMessage {
  title: string;
  body: string;
  /** Opened when the notification is tapped, e.g. { screen: "LiveMatch", fixtureId } */
  data?: Record<string, string>;
  /** A newer message with the same topic replaces an older undelivered one */
  topic?: string;
}

export interface DeliveryResult {
  sent: number;
  failed: number;
  removed: number;
  skipped: number;
}

const EXPO_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_BATCH = 100;
const WEB_CONCURRENCY = 20;
/** Keeps one send well inside the Workers subrequest limit */
export const MAX_DEVICES_PER_SEND = 800;

export function isExpoToken(token: string): boolean {
  return /^Expo(nent)?PushToken\[[^\]]+\]$/.test(token);
}

export function vapidKeys(env: PushEnv): VapidKeys | null {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return null;
  return { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: env.VAPID_SUBJECT || "mailto:support@boosthuddle.app" };
}

async function sendExpo(env: PushEnv, tokens: string[], msg: PushMessage): Promise<{ sent: number; failed: number; dead: string[] }> {
  let sent = 0;
  let failed = 0;
  const dead: string[] = [];
  for (let i = 0; i < tokens.length; i += EXPO_BATCH) {
    const batch = tokens.slice(i, i + EXPO_BATCH);
    const headers: Record<string, string> = { "content-type": "application/json", accept: "application/json" };
    if (env.EXPO_ACCESS_TOKEN) headers.authorization = `Bearer ${env.EXPO_ACCESS_TOKEN}`;
    try {
      const res = await fetch(EXPO_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(batch.map((to) => ({ to, title: msg.title, body: msg.body, data: msg.data ?? {}, sound: "default", channelId: "default", priority: "high" }))),
      });
      if (!res.ok) {
        failed += batch.length;
        continue;
      }
      const tickets = ((await res.json()) as { data?: { status: string; details?: { error?: string } }[] }).data ?? [];
      batch.forEach((token, n) => {
        const t = tickets[n];
        if (t?.status === "ok") sent++;
        else {
          failed++;
          if (t?.details?.error === "DeviceNotRegistered") dead.push(token);
        }
      });
    } catch {
      failed += batch.length;
    }
  }
  return { sent, failed, dead };
}

async function sendWeb(env: PushEnv, tokens: string[], msg: PushMessage): Promise<{ sent: number; failed: number; dead: string[]; skipped: number }> {
  const keys = vapidKeys(env);
  if (!keys) return { sent: 0, failed: 0, dead: [], skipped: tokens.length };
  let sent = 0;
  let failed = 0;
  const dead: string[] = [];
  const payload = { title: msg.title, body: msg.body, data: msg.data ?? {}, tag: msg.topic };
  for (let i = 0; i < tokens.length; i += WEB_CONCURRENCY) {
    const outcomes = await Promise.all(tokens.slice(i, i + WEB_CONCURRENCY).map(async (token) => {
      const sub = parseSubscription(token);
      if (!sub) return { token, outcome: "gone" as const };
      try {
        return { token, outcome: await sendWebPush(sub, payload, keys, { topic: msg.topic }) };
      } catch {
        return { token, outcome: "failed" as const };
      }
    }));
    for (const { token, outcome } of outcomes) {
      if (outcome === "sent") sent++;
      else if (outcome === "gone") dead.push(token);
      else failed++;
    }
  }
  return { sent, failed, dead, skipped: 0 };
}

/**
 * Send one message to these device tokens (as stored in devices.token).
 * Never throws: a push problem must not break the caller.
 */
export async function deliver(env: PushEnv, tokens: string[], msg: PushMessage): Promise<DeliveryResult> {
  const unique = [...new Set(tokens)].slice(0, MAX_DEVICES_PER_SEND);
  const expo = unique.filter(isExpoToken);
  const web = unique.filter((t) => t.startsWith("{"));
  const other = unique.length - expo.length - web.length;

  const [e, w] = await Promise.all([
    expo.length ? sendExpo(env, expo, msg) : Promise.resolve({ sent: 0, failed: 0, dead: [] as string[] }),
    web.length ? sendWeb(env, web, msg) : Promise.resolve({ sent: 0, failed: 0, dead: [] as string[], skipped: 0 }),
  ]);

  const dead = [...e.dead, ...w.dead];
  if (dead.length) {
    try {
      await env.DB.batch(dead.map((t) => env.DB.prepare(`DELETE FROM devices WHERE token = ?`).bind(t)));
    } catch (err) {
      console.error(JSON.stringify({ event: "push_cleanup", outcome: "failed", error: err instanceof Error ? err.message : String(err) }));
    }
  }
  return { sent: e.sent + w.sent, failed: e.failed + w.failed, removed: dead.length, skipped: other + w.skipped };
}
