/**
 * Journey: staff make an album for a day out, add photos and tidy up;
 * families see the album and photos (with who added them, never an email)
 * but can't change anything. Removing an album removes its photos and files.
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { call, registerAdmin, registerMember } from "./helpers";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);

function photoForm(albumId?: string, caption?: string): FormData {
  const form = new FormData();
  form.append("file", new File([PNG], "day-out.png", { type: "image/png" }));
  if (albumId) form.append("albumId", albumId);
  if (caption) form.append("caption", caption);
  return form;
}

describe("Gallery journey", () => {
  it("creates an album, uploads, lists and removes", async () => {
    const coach = await registerAdmin("gallery-coach");
    const parent = await registerMember("gallery-parent");

    // Families can't make albums; bad albums are refused with a reason
    expect((await call("/api/v1/gallery/albums", { token: parent.token, body: { title: "Nope" } })).status).toBe(403);
    expect((await call("/api/v1/gallery/albums", { token: coach.token, body: { title: " " } })).data.error.message).toMatch(/name/);
    expect((await call("/api/v1/gallery/albums", { token: coach.token, body: { title: "X", type: "party" } })).status).toBe(400);
    expect((await call("/api/v1/gallery/albums", { token: coach.token, body: { title: "X", date: "12/05/2025" } })).status).toBe(400);

    const made = await call("/api/v1/gallery/albums", { token: coach.token, body: { title: "  Skegness   day out ", date: "2025-06-14", type: "social" } });
    expect(made.status).toBe(201);
    expect(made.data.data).toMatchObject({ title: "Skegness day out", date: "2025-06-14", type: "social", photoCount: 0 });
    const albumId = made.data.data.id as string;

    // A photo needs an album; families can't upload
    expect((await call("/api/v1/gallery/upload", { token: coach.token, body: photoForm() })).data.error.message).toMatch(/album/);
    expect((await call("/api/v1/gallery/upload", { token: parent.token, body: photoForm(albumId) })).status).toBe(403);
    const up1 = await call("/api/v1/gallery/upload", { token: coach.token, body: photoForm(albumId, "On the beach") });
    expect(up1.status).toBe(201);
    const up2 = await call("/api/v1/gallery/upload", { token: coach.token, body: photoForm(albumId) });
    expect(up2.status).toBe(201);

    // Everyone in the club sees the album with a cover and count, and who added the photos by name
    const albums = (await call("/api/v1/gallery/albums", { token: parent.token })).data.data as any[];
    const album = albums.find((a) => a.id === albumId);
    expect(album).toMatchObject({ photoCount: 2 });
    expect(album.coverPhoto).toMatch(/gallery\//);
    const photos = (await call(`/api/v1/gallery/photos?albumId=${albumId}`, { token: parent.token })).data.data as any[];
    expect(photos).toHaveLength(2);
    expect(photos.map((p) => p.uploadedBy)).toEqual(["gallery-coach", "gallery-coach"]);
    expect(JSON.stringify(photos)).not.toMatch(/@example\.com/);
    expect(photos.find((p) => p.id === up1.data.data.id).caption).toBe("On the beach");

    // Rename and re-date (staff only)
    expect((await call(`/api/v1/gallery/albums/${albumId}`, { method: "PUT", token: parent.token, body: { title: "Mine" } })).status).toBe(403);
    const renamed = await call(`/api/v1/gallery/albums/${albumId}`, { method: "PUT", token: coach.token, body: { title: "Skegness 2025", type: "throwback" } });
    expect(renamed.data.data).toMatchObject({ title: "Skegness 2025", date: "2025-06-14", type: "throwback", photoCount: 2 });
    expect((await call(`/api/v1/gallery/albums/no-such-album`, { method: "PUT", token: coach.token, body: { title: "X" } })).status).toBe(404);

    // Remove one photo, and its file goes too
    const key1 = `gallery/${"syston"}/${up1.data.data.id}.png`;
    expect(await env.R2_MEDIA.head(key1)).not.toBeNull();
    expect((await call(`/api/v1/gallery/photos/${up1.data.data.id}`, { method: "DELETE", token: parent.token })).status).toBe(403);
    expect((await call(`/api/v1/gallery/photos/${up1.data.data.id}`, { method: "DELETE", token: coach.token })).status).toBe(200);
    expect(await env.R2_MEDIA.head(key1)).toBeNull();

    // Removing the album removes the rest, files included
    const key2 = `gallery/syston/${up2.data.data.id}.png`;
    const gone = await call(`/api/v1/gallery/albums/${albumId}`, { method: "DELETE", token: coach.token });
    expect(gone.data.data.photosRemoved).toBe(1);
    expect(await env.R2_MEDIA.head(key2)).toBeNull();
    expect(((await call("/api/v1/gallery/albums", { token: parent.token })).data.data as any[]).find((a) => a.id === albumId)).toBeUndefined();
    expect((await call(`/api/v1/gallery/photos?albumId=${albumId}`, { token: parent.token })).data.data).toEqual([]);
  });
});
