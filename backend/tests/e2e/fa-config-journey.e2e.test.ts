/**
 * Journey: a club admin saves their FA Full-Time settings on the dashboard's
 * Fixture Import page and sees them again next visit.
 */
import { describe, it, expect } from "vitest";
import { call, registerAdmin } from "./helpers";

describe("FA Full-Time settings (GET/PUT /api/v1/fixtures/fa-config)", () => {
  it("saves the team page and name, and loads them back", async () => {
    const { token } = await registerAdmin("fa-config");

    const save = await call("/api/v1/fixtures/fa-config", {
      method: "PUT",
      token,
      body: { teamName: "Syston Tigers U12", teamPageUrl: "https://fulltime.thefa.com/displayTeam.html?id=123" },
    });
    expect(save.status).toBe(200);
    expect(save.data.success).toBe(true);

    const load = await call("/api/v1/fixtures/fa-config", { token });
    expect(load.status).toBe(200);
    expect(load.data.config).toEqual(expect.objectContaining({
      teamName: "Syston Tigers U12",
      teamPageUrl: "https://fulltime.thefa.com/displayTeam.html?id=123",
    }));
  });

  it("requires a team name", async () => {
    const { token } = await registerAdmin("fa-config-bad");
    const res = await call("/api/v1/fixtures/fa-config", { method: "PUT", token, body: { teamPageUrl: "https://example.com" } });
    expect(res.status).toBe(400);
  });
});
