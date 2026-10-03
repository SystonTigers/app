/**
 * Journey: members see our row and the teams around us; while a league game
 * is being played they see the table as it stands, which follows the live
 * score and Undo. Full time saves it for real; cup games never move it.
 */
import { describe, it, expect } from "vitest";
import { call, registerAdmin, registerMember } from "./helpers";

const RESULTS = [
  "Type\tDate / Time\tHome Team\t\tAway Team\tDivision",
  "L\t06/09/26 10:30\tAnstey Nomads U18\t3 - 0\tOadby Town U18\tU18",
  "L\t06/09/26 10:30\tSyston Tigers (test)\t1 - 1\tBirstall United U18\tU18",
  "L\t13/09/26 10:30\tOadby Town U18\t2 - 0\tBirstall United U18\tU18",
  "L\t13/09/26 10:30\tAnstey Nomads U18\t2 - 2\tSyston Tigers (test)\tU18",
].join("\n");

let seq = 0;
const tap = () => `league-live-${Date.now()}-${++seq}`;

describe("League at a glance and as it stands", () => {
  it("follows the live score of a league game and ignores cup games", async () => {
    const admin = await registerAdmin("live-table-admin");
    const member = await registerMember("live-table-member");

    expect((await call("/api/v1/league/snapshot")).status).toBe(401);

    await call("/api/v1/club/league", { method: "PUT", token: admin.token, body: { competition: "U18 League", seasonStart: "2026-09-01" } });
    expect((await call("/api/v1/club/league/paste", { token: admin.token, body: { text: RESULTS } })).status).toBe(200);

    // Anstey 4, Syston 2, Oadby 3, Birstall 1 → Anstey, Oadby, Syston, Birstall
    const quiet = (await call("/api/v1/league/snapshot", { token: member.token })).data.data;
    expect(quiet.ourTeam).toBe("Syston Tigers (test)");
    expect(quiet.live).toBeNull();
    expect(quiet.around.map((r: any) => [r.position, r.team, r.points])).toEqual([
      [1, "Anstey Nomads U18", 4], [2, "Oadby Town U18", 3], [3, "Syston Tigers (test)", 2], [4, "Birstall United U18", 1],
    ]);

    // A cup game being played doesn't make an "as it stands" table
    const cup = (await call("/api/v1/admin/fixtures", {
      token: admin.token, body: { opponent: "Oadby", date: "2026-09-27", time: "10:30", venue: "Home", competition: "County Cup", homeAway: "home" },
    })).data.id as string;
    await call(`/api/v1/fixtures/${cup}/live/events`, { token: admin.token, body: { clientEventId: tap(), type: "kick_off" } });
    await call(`/api/v1/fixtures/${cup}/live/events`, { token: admin.token, body: { clientEventId: tap(), type: "goal" } });
    expect((await call("/api/v1/league/snapshot", { token: member.token })).data.data.live).toBeNull();
    await call(`/api/v1/fixtures/${cup}/live/events`, { token: admin.token, body: { clientEventId: tap(), type: "full_time" } });

    // League game against "Oadby" (the league calls them "Oadby Town U18")
    const league = (await call("/api/v1/admin/fixtures", {
      token: admin.token, body: { opponent: "Oadby", date: "2026-09-28", time: "10:30", venue: "Home", competition: "League", homeAway: "home" },
    })).data.id as string;
    const post = (type: string) => call(`/api/v1/fixtures/${league}/live/events`, { token: admin.token, body: { clientEventId: tap(), type } });
    await post("kick_off");
    const goal = await post("goal");

    const live = (await call("/api/v1/league/snapshot", { token: member.token })).data.data.live;
    expect(live).toMatchObject({ fixtureId: league, opponentTeam: "Oadby Town U18", status: "live", ourScore: 1, theirScore: 0 });
    // Syston 5 pts go top; Oadby (3) drop to third
    expect(live.rows.map((r: any) => [r.position, r.team, r.points, r.was, r.playing])).toEqual([
      [1, "Syston Tigers (test)", 5, 3, true],
      [2, "Anstey Nomads U18", 4, 1, false],
      [3, "Oadby Town U18", 3, 2, true],
      [4, "Birstall United U18", 1, 4, false],
    ]);

    // Undo the goal: 0-0 → a point each
    const goalId = goal.data.data.events.find((e: any) => e.type === "goal")?.id;
    expect(goalId).toBeTruthy();
    await call(`/api/v1/fixtures/${league}/live/events/${goalId}`, { method: "DELETE", token: admin.token });
    const level = (await call("/api/v1/league/snapshot", { token: member.token })).data.data.live;
    expect(level.rows.find((r: any) => r.team === "Syston Tigers (test)")).toMatchObject({ points: 3, drawn: 3 });
    expect(level.rows.find((r: any) => r.team === "Oadby Town U18")).toMatchObject({ points: 4, drawn: 1 });

    // The saved table hasn't changed until full time
    expect((await call("/api/v1/league/snapshot", { token: member.token })).data.data.rows.find((r: any) => r.team === "Syston Tigers (test)").points).toBe(2);
    await post("opp_goal");
    await post("full_time");
    const done = (await call("/api/v1/league/snapshot", { token: member.token })).data.data;
    expect(done.live).toBeNull();
    expect(done.rows.find((r: any) => r.team === "Oadby Town U18")).toMatchObject({ points: 6, won: 2 });
  });
});
