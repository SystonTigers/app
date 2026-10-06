/**
 * Journey: the manager uploads last seasons' results from a spreadsheet.
 * The preview says what will happen, saving adds the results with goals for
 * squad players, uploading again changes nothing, re-uploading after adding
 * an old player to the squad fills in their goals, and the Home screen's
 * head to head shows our record against the next opponent. Results from
 * Match Centre or the form are never changed by an upload.
 */
import { describe, it, expect } from "vitest";
import { call, registerAdmin, registerMember } from "./helpers";

/** src/services/resultsImport/__tests__/fixtures/results.xlsx: sheets 2024-25 and 2023-24, and a Notes sheet */
const XLSX = "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";

const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)));

describe("Uploading old results from a spreadsheet", () => {
  it("previews, saves once, fills in goals later and feeds the head to head", async () => {
    const coach = await registerAdmin("ri-coach", "coach");
    const parent = await registerMember("ri-parent");
    const pat = (await call("/api/v1/admin/squad", { token: coach.token, body: { firstName: "Pat", lastName: "Player" } })).data.playerId as string;
    const goals = async (season: string) => (await call(`/api/v1/stats/players?season=${season}`, { token: parent.token })).data.data.find((p: any) => p.id === pat)?.goals ?? 0;
    const upload = (body: unknown, preview = false) => call(`/api/v1/results/import${preview ? "?preview=1" : ""}`, { token: coach.token, body });
    const file = { fileName: "Tigers results.xlsx", data: XLSX };

    // Only staff
    expect((await call("/api/v1/results/import?preview=1", { token: parent.token, body: file })).status).toBe(403);
    // Something that isn't results
    const notResults = await upload({ fileName: "kit.csv", data: b64("Name,Size\nPat,M") }, true);
    expect(notResults.status).toBe(400);
    expect(notResults.data.error.message).toMatch(/date, who you played and the score/);

    // A result added in the app on one of the same days is left alone
    expect((await call("/api/v1/results", { token: coach.token, body: { date: "2024-09-15", opponent: "Rovers FC", ourScore: 2, theirScore: 0, competition: "Cup" } })).status).toBe(200);

    const preview = await upload(file, true);
    expect(preview.status).toBe(200);
    expect(preview.data.data.counts).toEqual({ new: 3, update: 0, unchanged: 0, exists: 1, skipped: 1 });
    expect(preview.data.data.unmatchedNames).toEqual([{ name: "Sam Smith", goals: 1 }, { name: "Former Star", goals: 1 }].sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name)));
    expect(preview.data.data.ignoredSheets.map((s: any) => s.name)).toEqual(["Notes"]);
    // Preview saved nothing
    expect(await goals("2024-25")).toBe(0);

    const saved = await upload(file);
    expect(saved.status).toBe(200);
    expect(saved.data.data).toMatchObject({ added: 3, updated: 0, exists: 1 });
    expect(await goals("2024-25")).toBe(2);
    expect(await goals("2023-24")).toBe(3);
    const list = (await call("/api/v1/results?season=2024-25", { token: parent.token })).data.data;
    expect(list.find((r: any) => r.opponent === "Thurmaston Magpies")).toMatchObject({ homeScore: 3, awayScore: 1, homeAway: "home", scorers: "Pat Player 2, Sam Smith", scorersFrom: "picked" });
    expect(list.find((r: any) => r.opponent === "Rovers FC")).toMatchObject({ homeScore: 2, awayScore: 0 });

    // The same file again changes nothing
    const again = await upload(file, true);
    expect(again.data.data.counts).toMatchObject({ new: 0, update: 0, unchanged: 3, exists: 1 });
    expect((await upload(file)).data.data).toMatchObject({ added: 0 });
    expect(await goals("2024-25")).toBe(2);

    // Sam joins the squad; uploading again gives him his goal
    const sam = (await call("/api/v1/admin/squad", { token: coach.token, body: { firstName: "Sam", lastName: "Smith" } })).data.playerId as string;
    expect((await upload(file, true)).data.data.counts).toMatchObject({ new: 0, update: 1, unchanged: 2 });
    await upload(file);
    const samGoals = (await call("/api/v1/stats/players?season=2024-25", { token: parent.token })).data.data.find((p: any) => p.id === sam)?.goals ?? 0;
    expect(samGoals).toBe(1);

    // Head to head for the FA's longer name
    const h2h = await call(`/api/v1/results/head-to-head?opponent=${encodeURIComponent("Thurmaston Magpies U18 Thunder")}`, { token: parent.token });
    expect(h2h.status).toBe(200);
    expect(h2h.data.data).toMatchObject({ played: 2, won: 2, drawn: 0, lost: 0, goalsFor: 7, goalsAgainst: 1 });
    expect(h2h.data.data.meetings.map((m: any) => m.date)).toEqual(["2024-09-08", "2024-02-03"]);
    expect((await call("/api/v1/results/head-to-head?opponent=Thurmaston", {})).status).toBe(401);
  });

  it("reads a CSV sent as the request body too", async () => {
    const coach = await registerAdmin("ri-csv", "coach");
    const res = await call("/api/v1/results/import?preview=1", {
      token: coach.token,
      body: new TextEncoder().encode("Date,Opponent,For,Against\n01/03/2025,Csv Wanderers,2,1\n"),
      headers: { "content-type": "text/csv" },
    });
    expect(res.status).toBe(200);
    expect(res.data.data.results[0]).toMatchObject({ date: "2025-03-01", opponent: "Csv Wanderers", ourScore: 2, theirScore: 1, status: "new" });
  });
});
