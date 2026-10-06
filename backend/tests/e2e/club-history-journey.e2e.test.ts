/**
 * Journey: the app's Club history. Fun stats and a club season's stats come
 * from the season's dates (not the old season_id column), so results added
 * for a past season show under that season and in all time, and not in
 * another season. Award lists don't carry players' photos.
 */
import { describe, it, expect } from "vitest";
import { call, registerAdmin, registerMember } from "./helpers";

describe("Club history", () => {
  it("counts each season's results and goals by date", async () => {
    const coach = await registerAdmin("ch-coach", "coach");
    const parent = await registerMember("ch-parent");
    const pat = (await call("/api/v1/admin/squad", { token: coach.token, body: { firstName: "Hattie", lastName: "Trick" } })).data.playerId as string;

    const add = async (date: string, ourScore: number, theirScore: number, scorerIds: string[] = []) => {
      const r = await call("/api/v1/results", { token: coach.token, body: { date, opponent: `History Rovers ${date}`, ourScore, theirScore, competition: "League", scorerIds } });
      expect(r.status, JSON.stringify(r.data)).toBeLessThan(300);
    };
    await add("2013-09-10", 3, 0, [pat, pat, pat]);
    await add("2013-10-01", 1, 1);
    await add("2014-09-09", 0, 2);

    const fun = async (season: string) => {
      const res = await call(`/api/v1/stats/fun?season=${season}`, { token: parent.token });
      expect(res.status, JSON.stringify(res.data)).toBe(200);
      return Object.fromEntries((res.data.data as any[]).map((s) => [s.key, s]));
    };
    const y33 = await fun("2013-14");
    expect(y33.overall_win_pct.description).toBe("1 wins from 2 matches");
    expect(y33.hattrick_count.value).toBe(1);
    expect(y33.clean_sheets.value).toBe(1);
    const y34 = await fun("2014-15");
    expect(y34.overall_win_pct.description).toBe("0 wins from 1 matches");
    expect(y34.hattrick_count.value).toBe(0);

    // The club page's public numbers agree
    const pub = await call("/public/syston/stats/fun?seasonId=2013-14");
    expect(pub.status).toBe(200);
    expect((pub.data.data as any[]).find((s) => s.key === "overall_win_pct")?.description).toBe("1 wins from 2 matches");

    expect((await call("/api/v1/stats/fun")).status).toBe(401);

    // A club season's stats use its dates too
    const started = await call("/api/v1/seasons/start-new", { token: coach.token, body: { name: "History 2014 test", startDate: "2014-08-01", copySquad: false, playerIds: [] } });
    expect(started.status, JSON.stringify(started.data)).toBe(200);
    const season = (await call("/api/v1/seasons", { token: parent.token })).data.data.find((s: any) => s.name === "History 2014 test");
    const stats = await call(`/api/v1/seasons/${season.id}/stats`, { token: parent.token });
    expect(stats.status, JSON.stringify(stats.data)).toBe(200);
    expect(stats.data.summary.played).toBeGreaterThanOrEqual(1);
    expect(stats.data.summary.lost).toBeGreaterThanOrEqual(1);

    await call(`/api/v1/seasons/${season.id}/end`, { token: coach.token, body: { awards: [{ type: "custom", award_name: "Clubman", player_id: pat }] } });
    const awards = await call(`/api/v1/seasons/${season.id}/awards`, { token: parent.token });
    expect(awards.data.data[0]).toMatchObject({ award_name: "Clubman", player_name: "Hattie Trick" });
    expect(awards.data.data[0]).not.toHaveProperty("player_photo");
  });
});
