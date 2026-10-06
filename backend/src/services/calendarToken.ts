/**
 * Private calendar links. Each member gets their own feed address,
 * /api/v1/calendar/feed/<token>.ics, signed with JWT_SECRET for their account
 * and club. Calendar apps can't sign in, so the link is the key: it only
 * works while the account is still a member of that club, and nobody can
 * make one for someone else. Fixtures (times and grounds) are never public.
 */

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(value: string): string | null {
  try {
    return atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  } catch {
    return null;
  }
}

async function sign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`calendar:${payload}`))));
}

/** The token for this member's feed. */
export async function calendarToken(secret: string, tenantId: string, userId: string): Promise<string> {
  const payload = `${tenantId}\n${userId}`;
  return `${b64url(enc.encode(payload))}.${await sign(secret, payload)}`;
}

/** The club and account a token belongs to, or null if it's been changed or made up. */
export async function readCalendarToken(secret: string, token: string): Promise<{ tenantId: string; userId: string } | null> {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const payload = fromB64url(body);
  if (!payload || !payload.includes("\n")) return null;
  const expected = await sign(secret, payload);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  const [tenantId, userId] = payload.split("\n");
  return tenantId && userId ? { tenantId, userId } : null;
}
