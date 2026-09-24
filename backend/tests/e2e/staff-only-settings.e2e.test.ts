/**
 * Parents and players can't change club settings or delete club content.
 */
import { describe, it, expect } from "vitest";
import { call, registerMember, registerAdmin } from "./helpers";

describe("Staff-only club actions", () => {
  const blocked: Array<[string, string, unknown?]> = [
    ["PUT", "/api/v1/fixtures/fa-config", { teamName: "x" }],
    ["POST", "/api/v1/fixtures/sync/all", {}],
    ["POST", "/api/v1/fixtures/sync/website", {}],
    ["PUT", "/api/v1/social/config", {}],
    ["POST", "/api/v1/gallery/albums", { name: "x" }],
    ["DELETE", "/api/v1/gallery/photos/some-photo", undefined],
    ["DELETE", "/api/v1/gallery/albums/some-album", undefined],
  ];

  it("refuses these for a parent", async () => {
    const parent = await registerMember("staffcheck-parent");
    for (const [method, path, body] of blocked) {
      const res = await call(path, { method, token: parent.token, body });
      expect([method, path, res.status]).toEqual([method, path, 403]);
    }
  });

  it("refuses these when not logged in", async () => {
    for (const [method, path, body] of blocked) {
      const res = await call(path, { method, body });
      expect([method, path, res.status]).toEqual([method, path, 401]);
    }
  });

  it("still lets club staff through", async () => {
    const admin = await registerAdmin("staffcheck-admin");
    const res = await call("/api/v1/gallery/albums", { token: admin.token, body: { name: "Season photos" } });
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(401);
  });
});
