import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsv, parseXlsx } from "../sheet";
import { detectColumns, findHeaderRow, isoDate, monthFirst, seasonStartYear } from "../columns";
import { matchScorer, matchScorers, parseScorers, parseSheets } from "../rows";
import { headToHead, sameOpponent } from "../../headToHead";

const opts = { clubName: "Syston Tigers U16", today: "2026-10-06" };

describe("reading spreadsheets", () => {
  it("reads CSV with quotes, commas, semicolons and line breaks in cells", () => {
    expect(parseCsv('Date,Opponent,Scorers\r\n14/09/2024,"Rovers, FC","Pat 2,\nSam"\n')).toEqual([
      ["Date", "Opponent", "Scorers"],
      ["14/09/2024", "Rovers, FC", "Pat 2,\nSam"],
    ]);
    expect(parseCsv("Date;Opponent;Score\n14/09/2024;Rovers;3-1")[1]).toEqual(["14/09/2024", "Rovers", "3-1"]);
  });

  it("reads every sheet of an Excel workbook, with Excel dates as numbers", async () => {
    const sheets = await parseXlsx(new Uint8Array(readFileSync(join(__dirname, "fixtures/results.xlsx"))));
    expect(sheets.map((s) => s.name)).toEqual(["2024-25", "2023-24", "Notes"]);
    expect(sheets[0].rows[2]).toEqual(["Date", "Opponent", "H/A", "Score", "Comp", "Goalscorers"]);
    expect(isoDate(sheets[0].rows[3][0], false, null)).toBe("2024-09-08");
  });
});

describe("working out the columns", () => {
  it("finds the header below a title row and tells look-alike columns apart by their cells", () => {
    const rows = [["Season 2024/25"], ["Date", "Against", "For", "Against", "Scorers"], ["14/09/2024", "Rovers", "3", "1", "Pat"]];
    const h = findHeaderRow(rows);
    expect(h).toBe(1);
    expect(detectColumns(rows[h], rows.slice(h + 1))).toMatchObject({ date: 0, opponent: 1, ourScore: 2, theirScore: 3, scorers: 4 });
  });

  it("reads UK, US, ISO, written and year-less dates", () => {
    expect(isoDate("14/09/2024", false, null)).toBe("2024-09-14");
    expect(isoDate("4/9/24", false, null)).toBe("2024-09-04");
    expect(isoDate("2024-09-14", false, null)).toBe("2024-09-14");
    expect(isoDate("Sun 14 Sept 2024", false, null)).toBe("2024-09-14");
    expect(isoDate("09/14/2024", true, null)).toBe("2024-09-14");
    expect(monthFirst(["09/14/2024", "10/02/2024"])).toBe(true);
    expect(monthFirst(["14/09/2024", "02/10/2024"])).toBe(false);
    // No year: from the season in the sheet's name (Aug-Dec first year, Jan-Jul second)
    expect(seasonStartYear("2023-24")).toBe(2023);
    expect(isoDate("14/09", false, 2023)).toBe("2023-09-14");
    expect(isoDate("3/2", false, 2023)).toBe("2024-02-03");
    expect(isoDate("31/02/2024", false, null)).toBeNull();
  });
});

describe("reading results and scorers", () => {
  it("reads a manager's workbook: skips postponed games, other sheets and future games", async () => {
    const sheets = await parseXlsx(new Uint8Array(readFileSync(join(__dirname, "fixtures/results.xlsx"))));
    const parsed = parseSheets(sheets, opts);
    expect(parsed.results.map((r) => [r.date, r.opponent, r.ourScore, r.theirScore, r.homeAway, r.competition])).toEqual([
      ["2024-09-08", "Thurmaston Magpies", 3, 1, "home", "League"],
      ["2024-09-15", "Rovers FC", 1, 1, "away", "Cup"],
      ["2023-09-14", "Birstall United", 0, 2, "away", "League"],
      ["2024-02-03", "Thurmaston Magpies", 4, 0, null, "League"],
    ]);
    expect(parsed.skipped).toEqual([{ where: "2024-25, row 6", reason: "no score (postponed or not played?)" }]);
    expect(parsed.ignoredSheets.map((s) => s.name)).toEqual(["Notes"]);
    expect(parsed.results[3].scorers).toEqual([{ name: "Pat Player", goals: 3 }, { name: "Former Star", goals: 1 }]);
  });

  it("puts the score our way round", () => {
    const rows = (header: string[], ...body: string[][]) => parseSheets([{ name: "S", rows: [header, ...body] }], opts).results.map((r) => [r.ourScore, r.theirScore]);
    // A W/D/L letter beats the order it was written in
    expect(rows(["Date", "Opponent", "Result"], ["14/09/2024", "Rovers", "L 3-1"])).toEqual([[1, 3]]);
    // FA style: home team, away team and home-away score
    expect(rows(["Date", "Home Team", "Away Team", "Score"], ["14/09/2024", "Rovers", "Syston Tigers U16", "1-4"])).toEqual([[4, 1]]);
    expect(rows(["Date", "Opponent", "Venue", "Home Score", "Away Score"], ["14/09/2024", "Rovers", "Away", "2", "0"])).toEqual([[0, 2]]);
  });

  it("reads the ways people write scorers", () => {
    expect(parseScorers("Smith 2, Jones (pen), J. Brown x2, OG")).toEqual({ scorers: [{ name: "Smith", goals: 2 }, { name: "Jones", goals: 1 }, { name: "J. Brown", goals: 2 }], ownGoals: 1 });
    expect(parseScorers("Smith (2) & Jones 23'")).toEqual({ scorers: [{ name: "Smith", goals: 2 }, { name: "Jones", goals: 1 }], ownGoals: 0 });
    expect(parseScorers("Smith, Smith, own goal 2")).toEqual({ scorers: [{ name: "Smith", goals: 2 }], ownGoals: 2 });
  });

  it("matches scorers to the squad by full name, surname, initial or first name, never guessing", () => {
    const squad = [{ id: "a", name: "Pat Player" }, { id: "b", name: "Sam Smith" }, { id: "c", name: "Sam Jones" }];
    expect(matchScorer("pat player", squad)).toBe("a");
    expect(matchScorer("Smith", squad)).toBe("b");
    expect(matchScorer("P. Player", squad)).toBe("a");
    expect(matchScorer("Pat", squad)).toBe("a");
    expect(matchScorer("Sam", squad)).toBeNull();
    expect(matchScorer("Former Star", squad)).toBeNull();
    const m = matchScorers({ scorers: [{ name: "Pat", goals: 2 }, { name: "Former Star", goals: 1 }], ownGoals: 0, ourScore: 3 }, squad);
    expect(m).toEqual({ scorerIds: ["a", "a"], ownGoals: 0, unmatched: [{ name: "Former Star", goals: 1 }], tooMany: false });
    expect(matchScorers({ scorers: [{ name: "Pat", goals: 4 }], ownGoals: 0, ourScore: 3 }, squad).tooMany).toBe(true);
  });
});

describe("head to head", () => {
  it("treats the FA's full name and the spreadsheet's short name as the same team, but not a different side", () => {
    expect(sameOpponent("Thurmaston Magpies U18 Thunder", "Thurmaston Magpies")).toBe(true);
    expect(sameOpponent("Thurmaston Magpies FC", "thurmaston  magpies")).toBe(true);
    expect(sameOpponent("Thurmaston Magpies Thunder", "Thurmaston Magpies Lightning")).toBe(false);
    expect(sameOpponent("Rovers FC", "FC United")).toBe(false);
  });

  it("adds up our record, newest first", () => {
    const meeting = (date: string, opponent: string, ourScore: number, theirScore: number) => ({ id: 1, date, opponent, ourScore, theirScore, competition: "League", scorers: null, homeAway: null });
    const h = headToHead("Thurmaston Magpies U18 Thunder", [
      meeting("2024-02-03", "Thurmaston Magpies", 4, 0),
      meeting("2025-09-14", "Thurmaston Magpies Thunder", 1, 1),
      meeting("2024-09-08", "Thurmaston Magpies", 1, 3),
      meeting("2024-09-15", "Rovers", 5, 0),
    ]);
    expect(h).toMatchObject({ played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 6, goalsAgainst: 4 });
    expect(h.meetings.map((m) => m.date)).toEqual(["2025-09-14", "2024-09-08", "2024-02-03"]);
  });
});
