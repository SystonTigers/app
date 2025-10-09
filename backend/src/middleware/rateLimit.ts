import { logJSON } from "../lib/log";
import type { Env } from "../types";

export interface RateLimitOptions {
  scope?: string;
  limit?: number;
  windowSeconds?: number;
  requestId?: string;
  path?: string;
}

export interface RateLimitResult {
  ok: boolean;
  remaining?: number;
  limit?: number;
  retryAfter?: number;
}

const DEFAULT_LIMIT = 60;
const DEFAULT_WINDOW = 60;
const DEFAULT_SCOPE = "global";

export async function rateLimit(
  request: Request,
  env: Env,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const environment = env.ENVIRONMENT || env.NODE_ENV || "development";
  if (environment !== "production") {
    return { ok: true };
  }

  const kv = env.RATE_LIMIT_KV;
  if (!kv) {
    return { ok: true };
  }

  const limit = options.limit ?? DEFAULT_LIMIT;
  const windowSeconds = options.windowSeconds ?? DEFAULT_WINDOW;
  const scope = options.scope ?? DEFAULT_SCOPE;
  const requestId = options.requestId;
  const path = options.path || new URL(request.url).pathname;

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const key = `rl:${scope}:${ip}`;

  try {
    const stored = await kv.get(key);
    let remaining = stored ? Number.parseInt(stored, 10) : limit;
    if (!Number.isFinite(remaining)) {
      remaining = limit;
    }

    if (remaining <= 0) {
      const retryAfter = windowSeconds;
      logJSON({
        level: "warn",
        msg: "rate_limited",
        path,
        requestId,
        status: 429
      });
      return { ok: false, remaining: 0, limit, retryAfter };
    }

    const nextRemaining = remaining - 1;
    await kv.put(key, String(nextRemaining), { expirationTtl: windowSeconds });
    return { ok: true, remaining: nextRemaining, limit };
  } catch (err: unknown) {
    logJSON({
      level: "error",
      msg: "rate_limit_error",
      status: 500,
      path,
      requestId
    });
    return { ok: true };
  }
}
