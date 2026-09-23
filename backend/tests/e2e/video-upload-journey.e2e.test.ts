import { describe, it, expect } from "vitest";
import { call, registerMember } from "./helpers";

/**
 * E2E: Video - upload a clip from the phone (multipart, as VideoScreen does),
 * list it, play it back through the media URL, delete it.
 */
describe("E2E: Video Upload Journey", () => {
  it("uploads, lists, plays back (with Range) and deletes a clip", async () => {
    const member = await registerMember("video");

    const bytes = new Uint8Array(4096).map((_, i) => i % 256);
    const form = new FormData();
    form.append("video", new File([bytes], "video.mp4", { type: "video/mp4" }));
    form.append("title", "Great goal");

    const upload = await call("/api/v1/videos/upload", { token: member.token, body: form });
    expect(upload.status).toBe(201);
    const { id, videoUrl } = upload.data.data;
    expect(videoUrl).toContain("/api/v1/media/videos/");

    const list = await call("/api/v1/videos", { token: member.token });
    expect(list.status).toBe(200);
    expect(list.data.data.find((v: any) => v.id === id)).toMatchObject({ title: "Great goal" });

    // Players request byte ranges
    const path = new URL(videoUrl).pathname;
    const ranged = await call(path, { headers: { range: "bytes=0-99" } });
    expect(ranged.status).toBe(206);
    expect(ranged.res.headers.get("content-range")).toBe("bytes 0-99/4096");
    expect((await ranged.res.arrayBuffer()).byteLength).toBe(100);

    const del = await call(`/api/v1/videos/${id}`, { token: member.token, method: "DELETE" });
    expect(del.status).toBe(200);
    expect((await call(path)).status).toBe(404);
  });

  it("accepts a YouTube link instead of a file", async () => {
    const member = await registerMember("video-link");
    const res = await call("/api/v1/videos/upload", {
      token: member.token,
      body: { title: "Full match", youtubeUrl: "https://youtu.be/abc123" },
    });
    expect(res.status).toBe(201);
  });

  it("rejects bad uploads with a clear 4xx", async () => {
    const member = await registerMember("video-bad");

    const noTitle = await call("/api/v1/videos/upload", { token: member.token, body: { videoUrl: "https://x" } });
    expect(noTitle.status).toBe(400);

    const form = new FormData();
    form.append("video", new File([new Uint8Array(10)], "notes.txt", { type: "text/plain" }));
    const wrongType = await call("/api/v1/videos/upload", { token: member.token, body: form });
    expect(wrongType.status).toBe(400);
  });

  it("requires sign-in", async () => {
    expect((await call("/api/v1/videos")).status).toBe(401);
  });
});
