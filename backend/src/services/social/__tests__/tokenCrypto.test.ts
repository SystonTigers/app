import { describe, it, expect } from "vitest";
import { decryptToken, encryptToken } from "../tokenCrypto";

const KEY = btoa(String.fromCharCode(...new Uint8Array(32).map((_, i) => i)));

describe("social token encryption", () => {
  it("round-trips and never stores the token in the clear", async () => {
    const stored = await encryptToken(KEY, "EAAB-secret-page-token");
    expect(stored.startsWith("v1.")).toBe(true);
    expect(stored).not.toContain("secret-page-token");
    expect(await decryptToken(KEY, stored)).toBe("EAAB-secret-page-token");
  });

  it("refuses to work without a proper key", async () => {
    await expect(encryptToken(undefined, "x")).rejects.toThrow(/SOCIAL_TOKEN_KEY/);
    await expect(encryptToken(btoa("short"), "x")).rejects.toThrow(/32 bytes/);
  });

  it("can't be read with a different key", async () => {
    const stored = await encryptToken(KEY, "token");
    const other = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));
    await expect(decryptToken(other, stored)).rejects.toThrow();
  });
});
