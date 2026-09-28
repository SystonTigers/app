import { describe, it, expect } from "vitest";
import { detectDateOrder, findDate, parseLeaguePaste } from "../parse";

const TODAY = new Date("2026-09-28T12:00:00Z");

describe("reading pasted league results", () => {
  it("reads FA Full-Time style rows copied from the results page (tabs)", () => {
    const text = [
      "Type\tDate / Time\tHome Team\t\tAway Team\tDivision",
      "L\t27/09/26 10:30\tSyston Town Juniors U18 Tigers\t3 - 1\tBirstall United U18\tU18 Sponsored by D&J Mobile Catering Ltd",
      "L\t27/09/26 10:30\tAnstey Nomads U18\t0 - 0\tOadby Town U18\tU18 Sponsored by D&J Mobile Catering Ltd",
      "L\t20/09/26 10:30\tOadby Town U18\tP - P\tSyston Town Juniors U18 Tigers\tU18",
    ].join("\n");
    const parsed = parseLeaguePaste(text, TODAY);
    expect(parsed.kind).toBe("results");
    if (parsed.kind !== "results") return;
    expect(parsed.results).toEqual([
      { date: "2026-09-27", home: "Syston Town Juniors U18 Tigers", away: "Birstall United U18", homeScore: 3, awayScore: 1 },
      { date: "2026-09-27", home: "Anstey Nomads U18", away: "Oadby Town U18", homeScore: 0, awayScore: 0 },
    ]);
    expect(parsed.skipped).toBe(1);
  });

  it("reads results grouped under date headings with single spaces", () => {
    const text = "Saturday 27 September 2026\nRovers U18 2 - 4 Wanderers U18\nCity Youth 1-1 Rangers\n\nSunday, Oct 5\nRangers 3 – 0 Rovers U18 (HT 1-0)";
    const parsed = parseLeaguePaste(text, TODAY);
    expect(parsed.kind).toBe("results");
    if (parsed.kind !== "results") return;
    expect(parsed.results.map((r) => `${r.date} ${r.home} ${r.homeScore}-${r.awayScore} ${r.away}`)).toEqual([
      "2026-09-27 Rovers U18 2-4 Wanderers U18",
      "2026-09-27 City Youth 1-1 Rangers",
      "2026-10-05 Rangers 3-0 Rovers U18",
    ]);
  });

  it("understands US month-first dates when the text proves it", () => {
    expect(detectDateOrder("9/27/2026 and 10/4/2026")).toBe("mdy");
    expect(detectDateOrder("27/09/2026")).toBe("dmy");
    expect(findDate("9/27/2026 FC Dallas 2 - 1 Solar", "mdy", TODAY)?.date).toBe("2026-09-27");
    expect(findDate("Sat 4 Oct", "dmy", TODAY)?.date).toBe("2026-10-04");
    expect(findDate("4th January", "dmy", TODAY)?.date).toBe("2027-01-04");
  });

  it("ignores kick-off times that look like scores", () => {
    const parsed = parseLeaguePaste("04/10/26\t10:30\tRovers\tv\tTown", TODAY);
    expect(parsed.kind).toBe("none");
  });
});

describe("reading a pasted league table", () => {
  it("reads a table with a header and works out goal difference", () => {
    const text = [
      "Pos\tTeam\tP\tW\tD\tL\tF\tA\tGD\tPts",
      "1\tOadby Town U18\t5\t4\t0\t1\t12\t4\t8\t12",
      "2\tSyston Town Juniors U18 Tigers\t5\t4\t0\t1\t20\t5\t15\t12",
      "3\tBirstall United U18\t5\t1\t1\t3\t6\t14\t-8\t4",
    ].join("\n");
    const parsed = parseLeaguePaste(text, TODAY);
    expect(parsed.kind).toBe("table");
    if (parsed.kind !== "table") return;
    expect(parsed.rows[1]).toEqual({ team: "Syston Town Juniors U18 Tigers", played: 5, won: 4, drawn: 0, lost: 1, goalsFor: 20, goalsAgainst: 5, goalDifference: 15, points: 12 });
  });

  it("reads a table copied with single spaces and no header", () => {
    const text = "1 Oadby Town U18 5 4 0 1 12 4 12\n2 Syston Tigers 5 4 0 1 20 5 12\n3 Birstall 5 1 1 3 6 14 4";
    const parsed = parseLeaguePaste(text, TODAY);
    expect(parsed.kind).toBe("table");
    if (parsed.kind !== "table") return;
    expect(parsed.rows.map((r) => [r.team, r.goalDifference])).toEqual([["Oadby Town U18", 8], ["Syston Tigers", 15], ["Birstall", -8]]);
  });

  it("rejects rows whose numbers don't add up", () => {
    expect(parseLeaguePaste("1 A Team 5 9 0 1 12 4 12\n2 B Team 5 1 1 1 3 3 3\n3 C Team 2 1 1 1 1 1 1", TODAY).kind).toBe("none");
  });
});

describe("the FA Full-Time results feed as copied from the page", () => {
  const rows = [
    ["AFC Barwell U18 Lions", "1", "-", "1", "Stoneygate Lions U18 Blues", "BARWELL CRICKET AND SPORTS CLUB"],
    ["Syston Town Juniors U18 Tigers", "7", "-", "0", "Anstey Nomads U18 Nomads", "MEMORIAL PARK (SYSTON)"],
    ["Carib Sport & Social Football Club", "0", "-", "5", "Barwell United FC U18", "VICTORIA PARK (LEICESTER)"],
  ];
  const expected = [
    { date: "2026-09-27", home: "AFC Barwell U18 Lions", away: "Stoneygate Lions U18 Blues", homeScore: 1, awayScore: 1 },
    { date: "2026-09-27", home: "Syston Town Juniors U18 Tigers", away: "Anstey Nomads U18 Nomads", homeScore: 7, awayScore: 0 },
    { date: "2026-09-27", home: "Carib Sport & Social Football Club", away: "Barwell United FC U18", homeScore: 0, awayScore: 5 },
  ];

  it("reads tab-separated cells with the venue column", () => {
    const text = ["Sun 27 Sept 2026 14:00", ...rows.map((r) => r.join("\t")), "League | Table"].join("\n");
    const parsed = parseLeaguePaste(text, TODAY);
    expect(parsed).toEqual({ kind: "results", results: expected, skipped: 0 });
  });

  it("reads single-spaced text and drops the capitalised venue", () => {
    const text = ["Sun 27 Sept 2026 14:00", ...rows.map((r) => r.join(" "))].join("\n");
    const parsed = parseLeaguePaste(text, TODAY);
    expect(parsed).toEqual({ kind: "results", results: expected, skipped: 0 });
  });
});
