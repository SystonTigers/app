/**
 * Encrypts social media access tokens before they're stored (AES-GCM with the
 * SOCIAL_TOKEN_KEY secret, 32 random bytes in base64). A database leak alone
 * then can't be used to post as a club.
 */

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

async function importKey(secret: string | undefined): Promise<CryptoKey> {
  if (!secret) throw new Error("SOCIAL_TOKEN_KEY is not set");
  const raw = fromBase64(secret);
  if (raw.length !== 32) throw new Error("SOCIAL_TOKEN_KEY must be 32 bytes (base64)");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

/** Returns "v1.<iv>.<ciphertext>" in base64. */
export async function encryptToken(secret: string | undefined, token: string): Promise<string> {
  const key = await importKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(token)));
  return `v1.${toBase64(iv)}.${toBase64(data)}`;
}

export async function decryptToken(secret: string | undefined, stored: string): Promise<string> {
  const [version, iv, data] = stored.split(".");
  if (version !== "v1" || !iv || !data) throw new Error("Unrecognised stored token");
  const key = await importKey(secret);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(iv) }, key, fromBase64(data));
  return new TextDecoder().decode(plain);
}
