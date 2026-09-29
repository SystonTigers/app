import { describe, expect, it, vi, afterEach } from "vitest";
import { b64urlToBytes, bytesToB64url, encryptPayload, parseSubscription, sendWebPush, vapidAuthorization } from "../webPush";

// RFC 8291, Appendix A
const RFC = {
  plaintext: "V2hlbiBJIGdyb3cgdXAsIEkgd2FudCB0byBiZSBhIHdhdGVybWVsb24",
  asPublic: "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8",
  asPrivate: "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw",
  uaPublic: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
  salt: "DGv6ra1nlYgDCS1FRnbzlw",
  auth: "BTBZMqHH6r4Tts7J_aSIgg",
  body:
    "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27ml" +
    "mlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPT" +
    "pK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN",
};

const sub = { endpoint: "https://push.example.com/send/abc", keys: { p256dh: RFC.uaPublic, auth: RFC.auth } };

async function newVapid() {
  const pair = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
  const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const publicRaw = new Uint8Array((await crypto.subtle.exportKey("raw", pair.publicKey)) as ArrayBuffer);
  return { keys: { publicKey: bytesToB64url(publicRaw), privateKey: jwk.d as string, subject: "mailto:test@example.com" }, verifyKey: pair.publicKey };
}

describe("web push encryption", () => {
  it("matches the RFC 8291 example byte for byte", async () => {
    const body = await encryptPayload(sub, b64urlToBytes(RFC.plaintext), {
      salt: b64urlToBytes(RFC.salt),
      serverKeys: { publicKey: b64urlToBytes(RFC.asPublic), privateKey: b64urlToBytes(RFC.asPrivate) },
    });
    expect(bytesToB64url(body)).toBe(RFC.body);
  });

  it("uses a fresh key and salt for every message", async () => {
    const a = await encryptPayload(sub, new TextEncoder().encode("hi"));
    const b = await encryptPayload(sub, new TextEncoder().encode("hi"));
    expect(bytesToB64url(a)).not.toBe(bytesToB64url(b));
    expect(a[20]).toBe(65); // key id length
  });

  it("refuses payloads that don't fit in one record", async () => {
    await expect(encryptPayload(sub, new Uint8Array(5000))).rejects.toThrow(/too large/);
  });
});

describe("subscriptions", () => {
  it("accepts what the browser gives us and rejects anything else", () => {
    expect(parseSubscription(JSON.stringify(sub))).toEqual(sub);
    expect(parseSubscription("ExponentPushToken[abc]")).toBeNull();
    expect(parseSubscription(JSON.stringify({ ...sub, endpoint: "http://insecure.example.com" }))).toBeNull();
    expect(parseSubscription(JSON.stringify({ ...sub, keys: { p256dh: RFC.uaPublic, auth: "short" } }))).toBeNull();
  });
});

describe("VAPID", () => {
  it("signs a JWT for the push service origin that verifies with the public key", async () => {
    const { keys, verifyKey } = await newVapid();
    const header = await vapidAuthorization("https://fcm.googleapis.com/fcm/send/xyz", keys, Date.UTC(2026, 8, 26, 10));
    const match = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(header);
    expect(match).not.toBeNull();
    const [, h, c, s, k] = match!;
    expect(k).toBe(keys.publicKey);
    const claims = JSON.parse(new TextDecoder().decode(b64urlToBytes(c)));
    expect(claims).toMatchObject({ aud: "https://fcm.googleapis.com", sub: "mailto:test@example.com" });
    expect(claims.exp).toBe(Date.UTC(2026, 8, 26, 22) / 1000);
    const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, verifyKey, b64urlToBytes(s), new TextEncoder().encode(`${h}.${c}`));
    expect(ok).toBe(true);
  });
});

describe("sending", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts an encrypted body and reports unsubscribed browsers as gone", async () => {
    const { keys } = await newVapid();
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 410 }))
      .mockResolvedValueOnce(new Response(null, { status: 500 }));

    expect(await sendWebPush(sub, { title: "Goal" }, keys, { topic: "score:fixture-1" })).toBe("sent");
    expect(await sendWebPush(sub, { title: "Goal" }, keys)).toBe("gone");
    expect(await sendWebPush(sub, { title: "Goal" }, keys)).toBe("failed");

    const [url, init] = fetchMock.mock.calls[0];
    const headers = init!.headers as Record<string, string>;
    expect(url).toBe(sub.endpoint);
    expect(headers["content-encoding"]).toBe("aes128gcm");
    expect(headers.topic).toBe("scorefixture-1");
    expect(headers.authorization).toMatch(/^vapid t=/);
  });
});
