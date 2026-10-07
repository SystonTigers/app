/**
 * Journey: a coach gives a player a cut-out photo (a see-through PNG of just
 * them) for the club's goal graphics. Only staff can. Ordinary photos are
 * refused. Graphics use the cut-out only once the family has said yes to
 * photos; replacing or removing it deletes the old file.
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { call, registerAdmin, registerMember } from "./helpers";
import { postPerson } from "../../src/services/social/club";

/** A 1×1 see-through PNG (colour type 6) and a 1×1 JPEG. */
const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="), (ch) => ch.charCodeAt(0));
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, ...new Array(40).fill(0)]);
const keyOf = (url: string) => decodeURIComponent(url.slice(url.indexOf("/api/v1/media/") + "/api/v1/media/".length));

describe("Player cut-outs", () => {
  it("saves, uses (with consent), replaces and removes a player's cut-out", async () => {
    const admin = await registerAdmin("cutout-admin");
    const parent = await registerMember("cutout-parent");
    const playerId = (await call("/api/v1/admin/squad", { token: admin.token, body: { name: "Cara Cutout", squadNumber: 9 } })).data.playerId as string;
    const put = (token: string, body: Uint8Array, type = "image/png") =>
      call(`/api/v1/players/${playerId}/cutout`, { method: "PUT", token, body, headers: { "content-type": type } });

    // Staff only
    expect((await call("/api/v1/squad/cutouts", { token: parent.token })).status).toBe(403);
    expect((await put(parent.token, PNG)).status).toBe(403);

    // An ordinary photo isn't a cut-out
    const jpeg = await put(admin.token, JPEG, "image/jpeg");
    expect(jpeg.status).toBe(400);
    expect(jpeg.data.error.code).toBe("NOT_A_CUTOUT");
    expect((await call(`/api/v1/players/missing-player/cutout`, { method: "PUT", token: admin.token, body: PNG, headers: { "content-type": "image/png" } })).status).toBe(404);

    const saved = await put(admin.token, PNG);
    expect(saved.status).toBe(200);
    const first = saved.data.data.cutoutUrl as string;
    expect(keyOf(first)).toMatch(new RegExp(`^players/[^/]+/${playerId}/cutout-\\d+\\.png$`));
    const served = await call(`/api/v1/media/${keyOf(first)}`);
    expect(served.status).toBe(200);
    expect(served.res.headers.get("content-type")).toBe("image/png");

    const list = (await call("/api/v1/squad/cutouts", { token: admin.token })).data.data;
    expect(list.find((p: any) => p.playerId === playerId)).toMatchObject({ name: "Cara Cutout", number: 9, cutoutUrl: first, photoConsent: null });

    // Graphics only use it once the family has said yes to photos
    const tenantId = (await env.DB.prepare(`SELECT tenant_id FROM squad WHERE id = ?`).bind(playerId).first<{ tenant_id: string }>())!.tenant_id;
    expect((await postPerson(env as never, tenantId, playerId, null))?.photoUrl).toBeNull();
    await call(`/api/v1/players/${playerId}/consent`, { method: "PUT", token: admin.token, body: { photos: true, video: false } });
    expect((await postPerson(env as never, tenantId, playerId, null))?.photoUrl).toBe(first);

    // Replacing deletes the old file
    await new Promise((r) => setTimeout(r, 5));
    const second = (await put(admin.token, PNG)).data.data.cutoutUrl as string;
    expect(second).not.toBe(first);
    expect(await (env as any).R2_MEDIA.get(keyOf(first))).toBeNull();

    // Removing it goes back to no cut-out
    expect((await call(`/api/v1/players/${playerId}/cutout`, { method: "DELETE", token: admin.token })).data.data).toEqual({ playerId, cutoutUrl: null });
    expect(await (env as any).R2_MEDIA.get(keyOf(second))).toBeNull();
    expect((await postPerson(env as never, tenantId, playerId, null))?.photoUrl).toBeNull();
  });
});
