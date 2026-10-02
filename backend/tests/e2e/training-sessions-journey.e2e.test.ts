/**
 * Journey: a coach plans a training session with drills, changes it and takes
 * the register; families see the plan but can't change it or see the register.
 */
import { describe, it, expect } from "vitest";
import { call, registerAdmin, registerMember } from "./helpers";

describe("Training sessions journey", () => {
  it("plans a session, edits it and takes attendance", async () => {
    const coach = await registerAdmin("training-coach", "coach");
    const parent = await registerMember("training-parent");
    const a = (await call("/api/v1/admin/squad", { token: coach.token, body: { name: "Train Ann", number: 4 } })).data.playerId as string;
    const b = (await call("/api/v1/admin/squad", { token: coach.token, body: { name: "Train Ben", number: 5 } })).data.playerId as string;

    const create = (body: unknown, token = coach.token) => call("/api/v1/training/sessions", { token, body });
    expect((await create({ date: "2026-10-07", focus: "Passing" }, parent.token)).status).toBe(403);
    expect((await create({ date: "07/10/2026" })).status).toBe(400);
    expect((await create({ date: "2026-10-07", time: "6pm" })).status).toBe(400);
    expect((await create({ date: "2026-10-07", drills: ["lib:drill-001", "http://evil"] })).status).toBe(400);

    const made = await create({ date: "2026-10-07", time: "18:30", location: "  Main   pitch ", focus: "Passing", drills: ["lib:drill-001", "lib:drill-011", "lib:drill-001"] });
    expect(made.status).toBe(201);
    expect(made.data.data).toMatchObject({ session_date: "2026-10-07", session_time: "18:30", location: "Main pitch", focus: "Passing", drills: ["lib:drill-001", "lib:drill-011"], attendance: { present: 0, marked: 0 } });
    const id = made.data.id as string;

    // Everyone sees it
    const list = (await call("/api/v1/training/sessions", { token: parent.token })).data.data as any[];
    expect(list.find((s) => s.id === id)).toMatchObject({ focus: "Passing", team: "First Team" });

    // Edit: new time and drills; families can't
    expect((await call(`/api/v1/training/sessions/${id}`, { method: "PUT", token: parent.token, body: { focus: "x" } })).status).toBe(403);
    const edited = await call(`/api/v1/training/sessions/${id}`, { method: "PUT", token: coach.token, body: { time: "19:00", drills: ["lib:drill-011"], notes: "Bring bibs" } });
    expect(edited.data.data).toMatchObject({ session_time: "19:00", drills: ["lib:drill-011"], notes: "Bring bibs", location: "Main pitch" });
    expect((await call(`/api/v1/training/sessions/nope`, { method: "PUT", token: coach.token, body: { focus: "x" } })).status).toBe(404);

    // Register: families can't see it; coach ticks one of two
    expect((await call(`/api/v1/training/sessions/${id}/attendance`, { token: parent.token })).status).toBe(403);
    const before = (await call(`/api/v1/training/sessions/${id}/attendance`, { token: coach.token })).data.data.players as any[];
    expect(before.find((p) => p.id === a).present).toBeNull();
    const saved = await call(`/api/v1/training/sessions/${id}/attendance`, { method: "PUT", token: coach.token, body: { present: [a] } });
    expect(saved.data.data.present).toBe(1);
    const after = (await call(`/api/v1/training/sessions/${id}/attendance`, { token: coach.token })).data.data.players as any[];
    expect(after.find((p) => p.id === a).present).toBe(true);
    expect(after.find((p) => p.id === b).present).toBe(false);
    const counted = ((await call("/api/v1/training/sessions", { token: parent.token })).data.data as any[]).find((s) => s.id === id);
    expect(counted.attendance.present).toBe(1);
    expect(counted.attendance.marked).toBeGreaterThanOrEqual(2);

    // Remove
    expect((await call(`/api/v1/training/sessions/${id}`, { method: "DELETE", token: coach.token })).status).toBe(200);
    expect(((await call("/api/v1/training/sessions", { token: parent.token })).data.data as any[]).find((s) => s.id === id)).toBeUndefined();
  });
});
