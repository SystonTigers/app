/**
 * Web Push for the installable web app, with no dependencies (Web Crypto only).
 *
 * - Message encryption: RFC 8291 (aes128gcm content coding, RFC 8188).
 * - Server identification: VAPID, RFC 8292 (ES256 JWT + public key).
 *
 * Keys: VAPID_PUBLIC_KEY is the uncompressed P-256 point (65 bytes) and
 * VAPID_PRIVATE_KEY the private scalar (32 bytes), both base64url.
 * `node scripts/generate-vapid-keys.mjs` makes a pair.
 */

export interface WebPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface VapidKeys {
  publicKey: string;
  privateKey: string;
  /** mailto: or https: contact for the push service */
  subject: string;
}

/** Fixed inputs so tests can reproduce the RFC 8291 example exactly. */
export interface EncryptOverrides {
  salt?: Uint8Array;
  serverKeys?: { publicKey: Uint8Array; privateKey: Uint8Array };
}

const RECORD_SIZE = 4096;
const enc = new TextEncoder();

export function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").replace(/\s+/g, "");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToB64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concat(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(parts.reduce((n, p) => n + p.length, 0)));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  const k = await crypto.subtle.importKey("raw", concat(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, concat(data)));
}

/** HKDF with a single output block (enough for every length used here). */
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array<ArrayBuffer>> {
  const prk = await hmac(salt, ikm);
  return (await hmac(prk, concat(info, new Uint8Array([1])))).slice(0, length);
}

/** A P-256 key as a JWK from its raw public point (and private scalar). */
function p256Jwk(publicRaw: Uint8Array, privateRaw?: Uint8Array): JsonWebKey {
  if (publicRaw.length !== 65 || publicRaw[0] !== 4) throw new Error("P-256 public key must be 65 bytes, uncompressed");
  return {
    kty: "EC",
    crv: "P-256",
    x: bytesToB64url(publicRaw.slice(1, 33)),
    y: bytesToB64url(publicRaw.slice(33, 65)),
    ...(privateRaw ? { d: bytesToB64url(privateRaw) } : {}),
    ext: true,
  };
}

/** Is this a usable browser subscription (as saved by the app)? */
export function parseSubscription(raw: string): WebPushSubscription | null {
  try {
    const sub = JSON.parse(raw) as Partial<WebPushSubscription>;
    if (typeof sub.endpoint !== "string" || !sub.endpoint.startsWith("https://")) return null;
    if (typeof sub.keys?.p256dh !== "string" || typeof sub.keys?.auth !== "string") return null;
    if (b64urlToBytes(sub.keys.p256dh).length !== 65 || b64urlToBytes(sub.keys.auth).length !== 16) return null;
    return { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } };
  } catch {
    return null;
  }
}

/** Encrypt a payload for one subscription (RFC 8291). Returns the request body. */
export async function encryptPayload(sub: WebPushSubscription, plaintext: Uint8Array, overrides: EncryptOverrides = {}): Promise<Uint8Array<ArrayBuffer>> {
  const uaPublic = b64urlToBytes(sub.keys.p256dh);
  const authSecret = b64urlToBytes(sub.keys.auth);
  const salt = concat(overrides.salt ?? crypto.getRandomValues(new Uint8Array(16)));

  let serverPrivate: CryptoKey;
  let serverPublic: Uint8Array;
  if (overrides.serverKeys) {
    serverPublic = overrides.serverKeys.publicKey;
    serverPrivate = await crypto.subtle.importKey("jwk", p256Jwk(serverPublic, overrides.serverKeys.privateKey), { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
  } else {
    const pair = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
    serverPrivate = pair.privateKey;
    serverPublic = new Uint8Array((await crypto.subtle.exportKey("raw", pair.publicKey)) as ArrayBuffer);
  }

  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, serverPrivate, 256));

  const keyInfo = concat(enc.encode("WebPush: info\0"), uaPublic, serverPublic);
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32);
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  // One record: the payload then the 0x02 "last record" delimiter, no padding
  const record = concat(plaintext, new Uint8Array([2]));
  if (record.length + 16 > RECORD_SIZE) throw new Error("Push payload is too large");
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, record));

  const header = new Uint8Array(21);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, RECORD_SIZE);
  header[20] = serverPublic.length;
  return concat(header, serverPublic, cipher);
}

/** VAPID Authorization header for a push service origin (RFC 8292). */
export async function vapidAuthorization(endpoint: string, vapid: VapidKeys, now = Date.now()): Promise<string> {
  const publicRaw = b64urlToBytes(vapid.publicKey);
  const key = await crypto.subtle.importKey("jwk", p256Jwk(publicRaw, b64urlToBytes(vapid.privateKey)), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const header = bytesToB64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = bytesToB64url(enc.encode(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(now / 1000) + 12 * 3600,
    sub: vapid.subject,
  })));
  const signature = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${header}.${claims}`)));
  return `vapid t=${header}.${claims}.${bytesToB64url(signature)}, k=${vapid.publicKey}`;
}

export type WebPushOutcome = "sent" | "gone" | "failed";

/**
 * Send one message. "gone" means the browser unsubscribed (404/410): the
 * caller should forget the subscription.
 */
export async function sendWebPush(sub: WebPushSubscription, payload: unknown, vapid: VapidKeys, opts: { ttlSeconds?: number; urgency?: "normal" | "high"; topic?: string } = {}): Promise<WebPushOutcome> {
  const body = await encryptPayload(sub, enc.encode(JSON.stringify(payload)));
  const headers: Record<string, string> = {
    authorization: await vapidAuthorization(sub.endpoint, vapid),
    "content-encoding": "aes128gcm",
    "content-type": "application/octet-stream",
    ttl: String(opts.ttlSeconds ?? 3600),
    urgency: opts.urgency ?? "high",
  };
  // A newer message with the same topic replaces an undelivered older one (e.g. the score)
  if (opts.topic) headers.topic = opts.topic.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32);
  const res = await fetch(sub.endpoint, { method: "POST", headers, body });
  if (res.status === 404 || res.status === 410) return "gone";
  return res.ok ? "sent" : "failed";
}
