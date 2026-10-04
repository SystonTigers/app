/**
 * Journey: staff tag players in a club gallery photo; the gallery shows who's
 * in it and the photo appears on each tagged player's page (for other members
 * only once a parent has said yes to photos). Removing the photo removes it
 * from player pages too.
 */
import { describe, it, expect } from "vitest";
import { call, registerAdmin, registerMember } from "./helpers";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);

function photoForm(albumId: string): FormData {
  const form = new FormData();
  form.append("file", new File([PNG], "team.png", { type: "image/png" }));
  form.append("albumId", albumId);
  return form;
}

describe("Gallery tagging journey", () => {
  it("tags players, shows them on player pages with consent, and cleans up", async () => {
    const coach = await registerAdmin("tag-coach");
    const parent = await registerMember("tag-parent");
    const pat = (await call("/api/v1/admin/squad", { token: coach.token, body: { name: "Pat Player", squadNumber: 9 } })).data.playerId as string;
    const sam = (await call("/api/v1/admin/squad", { token: coach.token, body: { name: "Sam Smith", squadNumber: 4 } })).data.playerId as string;

    const albumId = (await call("/api/v1/gallery/albums", { token: coach.token, body: { title: "Cup final", date: "2026-05-10", type: "match" } })).data.data.id as string;
    const photoId = (await call("/api/v1/gallery/upload", { token: coach.token, body: photoForm(albumId) })).data.data.id as string;
    const tag = (token: string, playerIds: unknown, id = photoId) => call(`/api/v1/gallery/photos/${id}/players`, { method: "PUT", token, body: { playerIds } });

    // Only staff tag; ids must be squad players; unknown photos are 404
    expect((await tag(parent.token, [pat])).status).toBe(403);
    expect((await tag(coach.token, "pat")).status).toBe(400);
    expect((await tag(coach.token, ["not-in-squad"])).data.error.message).toMatch(/squad/);
    expect((await tag(coach.token, [pat], "no-such-photo")).status).toBe(404);

    const tagged = await tag(coach.token, [sam, pat, pat]);
    expect(tagged.status).toBe(200);
    expect(tagged.data.data.players.map((p: { name: string }) => p.name)).toEqual(["Pat Player", "Sam Smith"]);

    // Everyone at the club sees who's in the photo
    const listed = (await call(`/api/v1/gallery/photos?albumId=${albumId}`, { token: parent.token })).data.data;
    expect(listed[0].players.map((p: { id: string }) => p.id).sort()).toEqual([pat, sam].sort());

    // Player pages: staff always; other members once photos are allowed
    const galleryOn = (photos: Array<{ id: string; type: string }>) => photos.some((p) => p.id === `gallery:${photoId}` && p.type === "gallery");
    expect(galleryOn((await call(`/api/v1/players/${pat}/profile`, { token: coach.token })).data.data.photos)).toBe(true);
    expect((await call(`/api/v1/players/${pat}/profile`, { token: parent.token })).data.data.photos).toEqual([]);
    await call(`/api/v1/players/${pat}/consent`, { method: "PUT", token: coach.token, body: { photos: true, video: false } });
    expect(galleryOn((await call(`/api/v1/players/${pat}/profile`, { token: parent.token })).data.data.photos)).toBe(true);

    // Untagging Sam takes the photo off his page
    await tag(coach.token, [pat]);
    expect(galleryOn((await call(`/api/v1/players/${sam}/profile`, { token: coach.token })).data.data.photos)).toBe(false);

    // Removing the photo removes it from Pat's page
    expect((await call(`/api/v1/gallery/photos/${photoId}`, { method: "DELETE", token: coach.token })).status).toBe(200);
    expect(galleryOn((await call(`/api/v1/players/${pat}/profile`, { token: coach.token })).data.data.photos)).toBe(false);
  });
});
