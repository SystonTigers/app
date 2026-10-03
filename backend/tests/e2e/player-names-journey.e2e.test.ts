/**
 * Journey: staff enter players with a first name and surname, so the club's
 * name style splits two-word names properly on public pages and posts.
 * Older screens that send one `name` still work.
 */
import { describe, it, expect } from "vitest";
import { call, registerAdmin, registerMember } from "./helpers";

describe("Player first names and surnames", () => {
  it("stores both parts and uses them for the club's name style", async () => {
    const owner = await registerAdmin("pn-owner");
    const parent = await registerMember("pn-parent");

    expect((await call("/api/v1/admin/squad", { token: owner.token, body: { firstName: "", lastName: "Van Dijk" } })).status).toBe(400);
    const vvd = await call("/api/v1/admin/squad", { token: owner.token, body: { firstName: " Virgil ", lastName: "Van  Dijk", squadNumber: 41, position: "Defender" } });
    expect(vvd.status).toBe(200);
    const mj = await call("/api/v1/admin/squad", { token: owner.token, body: { firstName: "Mary Jane", lastName: "Watson", squadNumber: 42 } });
    const old = await call("/api/v1/admin/squad", { token: owner.token, body: { name: "Sam Oldscreen", squadNumber: 43 } });

    const squad = (await call("/api/v1/squad", { token: parent.token })).data.data;
    const row = (id: string) => squad.find((p: any) => p.id === id);
    expect(row(vvd.data.playerId)).toMatchObject({ name: "Virgil Van Dijk", first_name: "Virgil", last_name: "Van Dijk" });
    expect(row(old.data.playerId)).toMatchObject({ name: "Sam Oldscreen", first_name: "Sam", last_name: "Oldscreen" });

    const publicName = async (number: number) => (await call("/public/syston/squad")).data.data.find((p: any) => p.number === number)?.name;
    await call("/api/v1/tenants/me", { method: "PATCH", token: owner.token, body: { publicNameStyle: "initial_last" } });
    expect(await publicName(41)).toBe("V. Van Dijk");
    await call("/api/v1/tenants/me", { method: "PATCH", token: owner.token, body: { publicNameStyle: "first_initial" } });
    expect(await publicName(42)).toBe("Mary Jane W.");

    // Editing the parts updates the full name too
    const edited = await call(`/api/v1/admin/squad/${mj.data.playerId}`, { method: "PUT", token: owner.token, body: { firstName: "Mary", lastName: "Jane-Watson" } });
    expect(edited.status).toBe(200);
    const after = (await call("/api/v1/squad", { token: parent.token })).data.data.find((p: any) => p.id === mj.data.playerId);
    expect(after).toMatchObject({ name: "Mary Jane-Watson", first_name: "Mary", last_name: "Jane-Watson" });
    expect(await publicName(42)).toBe("Mary J.");

    // Changing only the number leaves the name alone
    await call(`/api/v1/admin/squad/${mj.data.playerId}`, { method: "PUT", token: owner.token, body: { squadNumber: 44 } });
    expect(await publicName(44)).toBe("Mary J.");
  });
});
