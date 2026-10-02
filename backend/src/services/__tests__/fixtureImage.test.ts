import { describe, expect, it } from "vitest";
import { extractJson, fixturesFromReply, normaliseDate, normaliseTime } from "../fixtureImage/normalise";

const today = new Date("2026-10-02T12:00:00Z");

describe("fixtures read from a picture", () => {
  it("finds the JSON even with words or code fences around it", () => {
    expect(extractJson('Here you go:\n```json\n{"fixtures":[{"a":"x}"}]}\n``` hope that helps')).toEqual({ fixtures: [{ a: "x}" }] });
    expect(extractJson("no fixtures here")).toBeNull();
    expect(extractJson('{"fixtures": [')).toBeNull();
  });

  it("reads UK dates and fills in a missing year", () => {
    expect(normaliseDate("2026-10-04", today)).toBe("2026-10-04");
    expect(normaliseDate("4/10/2026", today)).toBe("2026-10-04");
    expect(normaliseDate("04.10.26", today)).toBe("2026-10-04");
    expect(normaliseDate("--10-04", today)).toBe("2026-10-04");
    expect(normaliseDate("4/10", today)).toBe("2026-10-04");
    // January's fixtures in October are next year; last week's stay this year
    expect(normaliseDate("--01-10", today)).toBe("2027-01-10");
    expect(normaliseDate("--09-27", today)).toBe("2026-09-27");
    expect(normaliseDate("31/02/2026", today)).toBeNull();
    expect(normaliseDate("next Saturday", today)).toBeNull();
  });

  it("reads kick-off times", () => {
    expect(normaliseTime("14:00")).toBe("14:00");
    expect(normaliseTime("2pm")).toBe("14:00");
    expect(normaliseTime("10.30")).toBe("10:30");
    expect(normaliseTime("12:15 am")).toBe("00:15");
    expect(normaliseTime("10")).toBeNull();
    expect(normaliseTime("25:00")).toBeNull();
    expect(normaliseTime(null)).toBeNull();
  });

  it("keeps only real fixtures and drops repeats", () => {
    const reply = JSON.stringify({
      fixtures: [
        { date: "2026-10-04", time: "10:30", home: "Syston Tigers U16", away: "Birstall United", venue: "Syston Park", competition: "Leicester League Div 1", status: "Normal" },
        { date: "2026-10-04", time: "10:30", home: "Syston Tigers U16", away: "Birstall United" },
        { date: "--10-11", time: null, home: "Coalville Town", away: "Syston Tigers U16", status: "Postponed" },
        { date: "2026-10-18", home: "Syston", away: "" },
        { date: "soon", home: "A", away: "B" },
        { date: "2026-10-25", home: "Same FC", away: "same fc" },
        "not a fixture",
      ],
    });
    const out = fixturesFromReply(reply, today);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ date: "2026-10-04", time: "10:30", homeTeam: "Syston Tigers U16", awayTeam: "Birstall United", venue: "Syston Park", competition: "Leicester League Div 1", status: "scheduled" });
    expect(out[1]).toMatchObject({ date: "2026-10-11", time: null, homeTeam: "Coalville Town", status: "postponed" });
  });

  it("accepts a bare list and ignores markup in names", () => {
    const out = fixturesFromReply('[{"date":"2026-11-01","home":"<b>Rovers</b>","away":"Town"}]', today);
    expect(out[0]).toMatchObject({ homeTeam: "Rovers", awayTeam: "Town" });
  });
});
