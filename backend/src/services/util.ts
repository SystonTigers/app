import { z } from "zod";
import { withSecurity } from "../middleware/securityHeaders";

export const PostReqSchema = z.object({
  tenant: z.string().min(1),
  template: z.string().min(1),
  channels: z.array(z.string().min(1)).min(1),
  data: z.record(z.any())
});

export function json(body: unknown, status = 200, headers: HeadersInit = {}) {
  const finalHeaders = new Headers({ "content-type": "application/json" });
  const extra = new Headers(headers);
  extra.forEach((value, key) => finalHeaders.set(key, value));

  const requestId = finalHeaders.get("X-Request-Id") || undefined;
  const release = finalHeaders.get("X-Release") || undefined;

  let payload = body;
  if (payload && typeof payload === "object") {
    const original = payload as Record<string, any>;
    let changed = false;
    const updated: Record<string, any> = { ...original };

    if (requestId && updated.success === false) {
      const err = updated.error;
      const normalizedError =
        err && typeof err === "object" && !Array.isArray(err)
          ? { ...err }
          : { code: "INTERNAL", message: typeof err === "string" ? err : "Unexpected error" };
      if (!normalizedError.requestId) {
        normalizedError.requestId = requestId;
      }
      updated.error = normalizedError;
      changed = true;
    }

    if (release) {
      const meta = updated.meta;
      const normalizedMeta = meta && typeof meta === "object" && !Array.isArray(meta) ? { ...meta } : {};
      if (!normalizedMeta.release) {
        normalizedMeta.release = release;
        updated.meta = normalizedMeta;
        changed = true;
      } else if (updated.meta !== normalizedMeta) {
        updated.meta = normalizedMeta;
      }
    }

    if (changed) {
      payload = updated;
    }
  }

  const bodyText = typeof payload === "string" ? payload : JSON.stringify(payload);
  return new Response(bodyText, withSecurity({ status, headers: finalHeaders }));
  return new Response(JSON.stringify(body), withSecurity({ status, headers: finalHeaders }));
}

export function cors(originList: string[] | null, reqOrigin: string | null) {
  // Default allowed origins for development (only used if CORS_ALLOWED not set)
  const defaultAllowed = new Set([
    "https://localhost:5173",
    "http://localhost:5173",
    "https://localhost:3000",
    "http://localhost:3000",
    "capacitor://localhost",
  ]);

  // If CORS_ALLOWED is set, only allow those origins; otherwise use dev defaults
  const allowed = originList
    ? new Set(originList)
    : defaultAllowed;

  const origin = reqOrigin || "";
  const allowOrigin = allowed.has(origin) ? origin : "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "content-type,authorization,Idempotency-Key,x-amz-content-sha256,x-amz-date,x-amz-acl,x-amz-meta-*",
    "Vary": "Origin"
  };
}

export function readIdempotencyKey(req: Request) {
  return req.headers.get("Idempotency-Key") || "";
}

// Additional utility helpers
export function assert(cond: any, msg = "bad request") {
  if (!cond) throw badReq(msg);
}

export function badReq(message: string) {
  return Object.assign(new Error(message), { status: 400 });
}

export function nowMs() {
  return Date.now();
}

export function expMs(ttlMinutes: number) {
  return Date.now() + ttlMinutes * 60_000;
}

export function id() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

// nanoid-like implementation (no dependency needed)
export function nanoid(size = 21) {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let id = '';
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < size; i++) {
    id += alphabet[bytes[i] % alphabet.length];
  }
  return id;
}

// KV helpers
export async function kvGetJSON<T>(kv: KVNamespace, key: string) {
  return (await kv.get(key, "json")) as T | null;
}

export async function kvPutJSON(kv: KVNamespace, key: string, value: any, opts?: KVNamespacePutOptions) {
  return kv.put(key, JSON.stringify(value), opts);
}

export async function kvListJSON<T>(kv: KVNamespace, prefix: string) {
  const list = await kv.list({ prefix, limit: 1000 });
  const rows = await Promise.all(list.keys.map((k) => kv.get(k.name, "json") as Promise<T>));
  return rows.filter(Boolean) as T[];
}
