/**
 * Journey: Team talk with real tokens (which carry a `roles` list). Coaches
 * see and run every section; parents only general and match-analysis, and
 * can't reach coaches' threads by id; posts show a name, never "Unknown";
 * missing logins get 401, not a server error.
 */
import { describe, it, expect } from "vitest";
import { call, registerAdmin, registerMember } from "./helpers";

describe("Team talk journey", () => {
  it("lets coaches run every section and keeps parents to theirs", async () => {
    const coach = await registerAdmin("talk-coach", "coach");
    const parent = await registerMember("talk-parent");

    expect((await call("/api/v1/discussions")).status).toBe(401);

    // Coaches can start a tactics thread; parents can't
    const tactics = await call("/api/v1/discussions", { token: coach.token, body: { category: "tactics", title: "Pressing from the front" } });
    expect(tactics.status).toBe(201);
    expect(tactics.data.data.author_name).toBe("talk-coach");
    const tacticsId = tactics.data.data.id as string;
    expect((await call("/api/v1/discussions", { token: parent.token, body: { category: "tactics", title: "My idea" } })).status).toBe(403);

    const general = await call("/api/v1/discussions", { token: parent.token, body: { category: "general", title: "Kit for Saturday?" } });
    expect(general.status).toBe(201);
    expect(general.data.data.author_name).toBe("talk-parent");
    const generalId = general.data.data.id as string;

    // Coaches see both; parents only the general one, and not the tactics thread by id
    const coachList = await call("/api/v1/discussions", { token: coach.token });
    expect(coachList.data.data.map((d: { id: string }) => d.id)).toEqual(expect.arrayContaining([tacticsId, generalId]));
    const parentList = await call("/api/v1/discussions", { token: parent.token });
    const parentIds = parentList.data.data.map((d: { id: string }) => d.id);
    expect(parentIds).toContain(generalId);
    expect(parentIds).not.toContain(tacticsId);
    expect((await call(`/api/v1/discussions/${tacticsId}`, { token: parent.token })).status).toBe(404);
    expect((await call(`/api/v1/discussions/${tacticsId}/comments`, { token: parent.token, body: { content: "Hello" } })).status).toBe(404);

    // Only coaches pin and lock; a locked thread takes no more parent comments
    expect((await call(`/api/v1/discussions/${generalId}`, { method: "PATCH", token: parent.token, body: { pinned: true } })).status).toBe(403);
    expect((await call(`/api/v1/discussions/${generalId}`, { method: "PATCH", token: coach.token, body: { pinned: true, locked: true } })).status).toBe(200);
    expect((await call(`/api/v1/discussions/${generalId}/comments`, { token: parent.token, body: { content: "Thanks" } })).status).toBe(403);
    const reply = await call(`/api/v1/discussions/${generalId}/comments`, { token: coach.token, body: { content: "Home kit, please." } });
    expect(reply.status).toBe(201);
    expect(reply.data.data.author_name).toBe("talk-coach");
  });
});
