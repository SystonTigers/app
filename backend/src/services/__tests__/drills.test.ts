import { describe, it, expect } from "vitest";
import { isDrillRef, legacyDescription, list, minutes, readDrillInput, readVideoLink, storedList } from "../drills";
import { linkPreview } from "../drillLinkPreview";

describe("drill references", () => {
  it("accepts built-in and club drills only", () => {
    expect(isDrillRef("lib:drill-012")).toBe(true);
    expect(isDrillRef("club:6f1c2a9e-1b2c-4d5e-8f90-123456789abc")).toBe(true);
    expect(isDrillRef("lib:../etc")).toBe(false);
    expect(isDrillRef("club:1")).toBe(false);
    expect(isDrillRef(42)).toBe(false);
  });
});

describe("reading a club drill", () => {
  const base = { name: "  Rondo 5v2 ", category: "Passing", duration: "15 min", description: "Keep the ball." };

  it("tidies text, lists and minutes", () => {
    const r = readDrillInput({
      ...base, difficulty: "advanced", players: "7", equipment: "Cones, Bibs\nBalls",
      steps: "1. Set up the square\n- Play two touch\n\n", coachingPoints: ["Open body", "  "], focus: ["passing"],
    });
    expect(r).toEqual({ value: {
      name: "Rondo 5v2", category: "Passing", durationMinutes: 15, players: "7", difficulty: "advanced",
      equipment: ["Cones", "Bibs", "Balls"], focus: ["passing"], description: "Keep the ball.", setup: null,
      steps: ["Set up the square", "Play two touch"], coachingPoints: ["Open body"],
    } });
  });

  it("explains what's missing", () => {
    expect(readDrillInput({ ...base, name: "" })).toEqual({ error: "Give the drill a name." });
    expect("error" in readDrillInput({ ...base, category: "Juggling" })).toBe(true);
    expect("error" in readDrillInput({ ...base, duration: "ages" })).toBe(true);
    expect("error" in readDrillInput({ ...base, duration: 500 })).toBe(true);
    expect("error" in readDrillInput({ ...base, description: "", steps: [] })).toBe(true);
    expect(readDrillInput({ ...base, description: "", steps: ["Go"] })).toHaveProperty("value");
  });

  it("defaults an unknown difficulty and caps long lists", () => {
    const r = readDrillInput({ ...base, difficulty: "insane", steps: Array.from({ length: 30 }, (_, i) => `Step ${i}`) });
    if (!("value" in r)) throw new Error("expected a drill");
    expect(r.value.difficulty).toBe("intermediate");
    expect(r.value.steps).toHaveLength(12);
  });

  it("reads minutes and lists", () => {
    expect(minutes("10-15 mins")).toBe(10);
    expect(minutes(0)).toBeNull();
    expect(list("a, b", 5, 10, true)).toEqual(["a", "b"]);
    expect(list("a, b", 5, 10)).toEqual(["a, b"]);
  });

  it("reads old drills that kept difficulty and players in the description", () => {
    expect(legacyDescription("Pass it.\n\nDifficulty: advanced\nPlayers: 10+")).toEqual({ description: "Pass it.", difficulty: "advanced", players: "10+" });
    expect(storedList('["a","b"]')).toEqual(["a", "b"]);
    expect(storedList("Cones")).toEqual(["Cones"]);
    expect(storedList(null)).toEqual([]);
  });
});

describe("video links", () => {
  it("accepts TikTok, Instagram and YouTube and strips tracking", () => {
    expect(readVideoLink("https://www.tiktok.com/@coachjoe/video/7312345678901234567?is_from_webapp=1&sender_device=pc"))
      .toEqual({ url: "https://www.tiktok.com/@coachjoe/video/7312345678901234567", platform: "tiktok" });
    expect(readVideoLink("https://vm.tiktok.com/ZMabc123/")).toEqual({ url: "https://vm.tiktok.com/ZMabc123/", platform: "tiktok" });
    expect(readVideoLink("https://www.instagram.com/reels/C1a2B3c4D5e/?igsh=xyz")).toEqual({ url: "https://www.instagram.com/reel/C1a2B3c4D5e/", platform: "instagram" });
    expect(readVideoLink("https://instagram.com/p/C1a2B3c4D5e")).toEqual({ url: "https://www.instagram.com/p/C1a2B3c4D5e/", platform: "instagram" });
    expect(readVideoLink("https://youtu.be/dQw4w9WgXcQ?si=abc")).toEqual({ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", platform: "youtube" });
    expect(readVideoLink("https://m.youtube.com/shorts/dQw4w9WgXcQ")).toEqual({ url: "https://www.youtube.com/shorts/dQw4w9WgXcQ", platform: "youtube" });
  });

  it("refuses anything else", () => {
    for (const bad of ["", "not a link", "javascript:alert(1)", "https://evil.com/@x/video/1", "https://www.tiktok.com/@x", "https://www.instagram.com/coachjoe/", "https://tiktok.com.evil.com/@x/video/1"]) {
      expect(readVideoLink(bad)).toBeNull();
    }
  });
});

describe("link previews", () => {
  const tiktok = { url: "https://www.tiktok.com/@coachjoe/video/7312345678901234567", platform: "tiktok" as const };
  const stored: Array<[string, number, string]> = [];
  const env = { R2_MEDIA: { put: async (key: string, body: ArrayBuffer, opts: { httpMetadata: { contentType: string } }) => { stored.push([key, body.byteLength, opts.httpMetadata.contentType]); } } as unknown as R2Bucket };

  it("keeps TikTok's title, account and a copy of the picture", async () => {
    const fake = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("https://www.tiktok.com/oembed")) return Response.json({ title: "Rondo  drill", author_name: "Coach Joe", thumbnail_url: "https://p16.tiktokcdn.com/pic.jpeg" });
      return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/jpeg" } });
    }) as typeof fetch;
    const preview = await linkPreview(env, "https://api.test/api/v1/training/drill-links", tiktok, "drills/t1/links/abc", fake);
    expect(preview).toEqual({ title: "Rondo drill", author: "Coach Joe", thumbnailUrl: "https://api.test/api/v1/media/drills/t1/links/abc.jpg" });
    expect(stored).toContainEqual(["drills/t1/links/abc.jpg", 3, "image/jpeg"]);
  });

  it("gives no preview for Instagram, when switched off, or when the site fails", async () => {
    const boom = (async () => { throw new Error("offline"); }) as typeof fetch;
    const none = { title: null, author: null, thumbnailUrl: null };
    expect(await linkPreview(env, "https://api.test/", { url: "https://www.instagram.com/p/x/", platform: "instagram" }, "k", boom)).toEqual(none);
    expect(await linkPreview({ ...env, LINK_PREVIEWS: "off" }, "https://api.test/", tiktok, "k", boom)).toEqual(none);
    expect(await linkPreview(env, "https://api.test/", tiktok, "k", boom)).toEqual(none);
    const notJson = (async () => new Response("<html>", { status: 200 })) as typeof fetch;
    expect(await linkPreview(env, "https://api.test/", tiktok, "k", notJson)).toEqual(none);
  });
});
