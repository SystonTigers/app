import { describe, it, expect, vi } from "vitest";
import { handleGetMedia, keyFromMediaUrl, MediaError, mediaUrl, validateImage } from "../media";

const img = (type: string, size = 100) => new File([new Uint8Array(size)], "p", { type });

describe("media service", () => {
  it("accepts common image types and rejects others", () => {
    expect(validateImage(img("image/jpeg")).ext).toBe("jpg");
    expect(validateImage(img("image/png")).ext).toBe("png");
    expect(() => validateImage(img("application/pdf"))).toThrow(MediaError);
    expect(() => validateImage(null)).toThrow("No image file provided");
    expect(() => validateImage("not a file")).toThrow(MediaError);
  });

  it("rejects empty and oversized files", () => {
    expect(() => validateImage(img("image/png", 0))).toThrow("empty");
    try {
      validateImage(img("image/png", 11 * 1024 * 1024));
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as MediaError).status).toBe(413);
    }
  });

  it("builds worker URLs without a public bucket and round-trips the key", () => {
    const url = mediaUrl({}, "https://api.example.com/api/v1/gallery/upload", "gallery/t1/abc.jpg");
    expect(url).toBe("https://api.example.com/api/v1/media/gallery/t1/abc.jpg");
    expect(keyFromMediaUrl({}, url)).toBe("gallery/t1/abc.jpg");
  });

  it("uses R2_PUBLIC_URL when configured", () => {
    const env = { R2_PUBLIC_URL: "https://media.example.com/" };
    const url = mediaUrl(env, "https://api.example.com/x", "gallery/t1/abc.jpg");
    expect(url).toBe("https://media.example.com/gallery/t1/abc.jpg");
    expect(keyFromMediaUrl(env, url)).toBe("gallery/t1/abc.jpg");
    expect(keyFromMediaUrl(env, "https://elsewhere.com/x.jpg")).toBeNull();
  });

  it("only serves whitelisted prefixes", async () => {
    const get = vi.fn();
    const env = { R2_MEDIA: { get } as unknown as R2Bucket };

    const res1 = await handleGetMedia(new Request("https://api/api/v1/media/documents/t1/secret.pdf"), env);
    expect(res1.status).toBe(404);
    const res2 = await handleGetMedia(new Request("https://api/api/v1/media/gallery/../documents/x"), env);
    expect(res2.status).toBe(404);
    expect(get).not.toHaveBeenCalled();
  });

  it("streams a stored gallery object with caching headers", async () => {
    const object = {
      body: "IMG",
      httpEtag: '"e1"',
      writeHttpMetadata: (h: Headers) => h.set("content-type", "image/jpeg"),
    };
    const env = { R2_MEDIA: { get: vi.fn(async () => object) } as unknown as R2Bucket };

    const res = await handleGetMedia(new Request("https://api/api/v1/media/gallery/t1/a.jpg"), env);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("cache-control")).toContain("max-age");
    expect(await res.text()).toBe("IMG");
  });
});
