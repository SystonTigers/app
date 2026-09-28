/**
 * Journey: a manager pastes the league's results copied from its website; the
 * club's table is worked out and sorted by points, then goal difference. Our
 * Match Centre result joins in straight away. Pasting a table re-sorts it.
 */
import { describe, it, expect } from "vitest";
import { call, registerAdmin, registerMember } from "./helpers";

const RESULTS = [
  "Type\tDate / Time\tHome Team\t\tAway Team\tDivision",
  "L\t06/09/26 10:30\tSyston Tigers (test)\t6 - 0\tOadby Town U18\tU18",
  "L\t06/09/26 10:30\tBirstall United U18\t1 - 0\tAnstey Nomads U18\tU18",
  "L\t13/09/26 10:30\tOadby Town U18\t2 - 1\tBirstall United U18\tU18",
  "L\t13/09/26 10:30\tAnstey Nomads U18\t3 - 0\tSyston Tigers (test)\tU18",
  "L\t16/08/26 10:30\tOld Season FC\t9 - 0\tOadby Town U18\tU18",
].join("\n");

let seq = 0;
const tap = () => `league-${Date.now()}-${++seq}`;

describe("League table", () => {
  it("works out the table from pasted results and our own games, sorted by goal difference", async () => {
    const admin = await registerAdmin("league-admin");
    const coach = await registerAdmin("league-coach", "coach");
    const member = await registerMember("league-member");

    expect((await call("/api/v1/club/league/paste", { token: member.token, body: { text: RESULTS } })).status).toBe(403);
    expect((await call("/api/v1/club/league", { method: "PUT", token: coach.token, body: { seasonStart: "2026-08-01" } })).status).toBe(403);
    await call("/api/v1/club/league", { method: "PUT", token: admin.token, body: { competition: "U18 League", seasonStart: "2026-09-01" } });

    const nothing = await call("/api/v1/club/league/paste", { token: coach.token, body: { text: "hello there" } });
    expect(nothing.status).toBe(422);

    const pasted = await call("/api/v1/club/league/paste", { token: coach.token, body: { text: RESULTS } });
    expect(pasted.status).toBe(200);
    expect(pasted.data.data).toMatchObject({ kind: "results", found: 5, added: 4, olderThanSeason: 1 });
    // Pasting the same page again adds nothing
    expect((await call("/api/v1/club/league/paste", { token: coach.token, body: { text: RESULTS } })).data.data.added).toBe(0);

    // Syston and Anstey are level on 3 points; Syston's +3 goal difference puts them top
    const table = (await call("/public/syston/table")).data;
    expect(table.meta).toMatchObject({ source: "results", competition: "U18 League" });
    expect(table.data.slice(0, 2).map((r: any) => [r.position, r.team, r.points, r.goalDifference])).toEqual([
      [1, "Syston Tigers (test)", 3, 3],
      [2, "Anstey Nomads U18", 3, 2],
    ]);

    // Our Match Centre result on a day the paste doesn't cover joins the table
    const fixtureId = (await call("/api/v1/admin/fixtures", {
      token: admin.token, body: { opponent: "Birstall", date: "2026-09-20", time: "10:30", venue: "Home", competition: "League", homeAway: "home" },
    })).data.id as string;
    await call(`/api/v1/fixtures/${fixtureId}/live/events`, { token: admin.token, body: { clientEventId: tap(), type: "kick_off" } });
    await call(`/api/v1/fixtures/${fixtureId}/live/events`, { token: admin.token, body: { clientEventId: tap(), type: "full_time" } });

    const after = await call("/api/v1/club/league", { token: coach.token });
    expect(after.data.data.settings.detectedTeam).toBe("Syston Tigers (test)");
    const syston = after.data.data.table.find((r: any) => r.team === "Syston Tigers (test)");
    expect(syston).toMatchObject({ played: 3, drawn: 1, points: 4 });
    // The 0-0 against "Birstall" counted for the league's "Birstall United U18"
    expect(after.data.data.table.find((r: any) => r.team === "Birstall United U18")).toMatchObject({ played: 3, won: 1, drawn: 1, lost: 1, points: 4 });
    expect(after.data.data.table.some((r: any) => r.team === "Birstall")).toBe(false);
  });

  it("re-sorts a pasted league table by goal difference", async () => {
    const coach = await registerAdmin("league-coach-2", "coach");
    const text = "Pos\tTeam\tP\tW\tD\tL\tF\tA\tGD\tPts\n1\tOadby Town U18\t5\t4\t0\t1\t12\t4\t8\t12\n2\tSyston Tigers (test)\t5\t4\t0\t1\t20\t5\t15\t12\n3\tBirstall United U18\t5\t1\t1\t3\t6\t14\t-8\t4";
    const pasted = await call("/api/v1/club/league/paste", { token: coach.token, body: { text } });
    expect(pasted.data.data.kind).toBe("table");
    const table = (await call("/public/syston/table")).data;
    expect(table.meta.source).toBe("table");
    expect(table.data.map((r: any) => [r.position, r.team])).toEqual([[1, "Syston Tigers (test)"], [2, "Oadby Town U18"], [3, "Birstall United U18"]]);
  });
});
