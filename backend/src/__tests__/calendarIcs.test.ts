import { describe, it, expect } from "vitest";
import { buildCalendar, fold, icsText, localStamp, type CalendarFixture } from "../services/calendarIcs";

const fx = (over: Partial<CalendarFixture>): CalendarFixture => ({
  id: "f1", fixture_date: "2026-10-10", kick_off_time: "10:30", opponent: "Oadby Owls", home_team: "Syston Tigers", away_team: "Oadby Owls",
  venue: "Memorial Park, Syston", competition: "League", status: "scheduled", ...over,
});

describe("calendar file", () => {
  it("escapes text and folds long lines", () => {
    expect(icsText("A, B; C\\D\nE")).toBe("A\\, B\; C\\\\D\\nE");
    const line = `SUMMARY:${"x".repeat(100)}`;
    const folded = fold(line);
    expect(folded.split("\r\n ").join("")).toBe(line);
    expect(folded.split("\r\n")[0].length).toBe(75);
  });

  it("adds match length across midnight", () => {
    expect(localStamp("2026-10-10", "10:30")).toBe("20261010T103000");
    expect(localStamp("2026-10-10", "23:00", 120)).toBe("20261011T010000");
    expect(localStamp("nope", "10:00")).toBeNull();
  });

  it("writes home, away, untimed and postponed games", () => {
    const ics = buildCalendar("Syston Tigers", [
      fx({}),
      fx({ id: "f2", home_team: "Oadby Owls", away_team: "Syston Tigers", venue: "TBC" }),
      fx({ id: "f3", kick_off_time: null }),
      fx({ id: "f4", status: "postponed" }),
      fx({ id: "bad", fixture_date: "" }),
    ], { host: "example.test", now: new Date("2026-10-06T12:00:00Z") });
    expect(ics).toContain("BEGIN:VCALENDAR\r\n");
    expect(ics).toContain("SUMMARY:Syston Tigers v Oadby Owls");
    expect(ics).toContain("DTSTART;TZID=Europe/London:20261010T103000");
    expect(ics).toContain("LOCATION:Memorial Park\\, Syston");
    expect(ics).toContain("SUMMARY:Oadby Owls v Syston Tigers");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261010\r\nDTEND;VALUE=DATE:20261011");
    expect(ics).toContain("SUMMARY:POSTPONED: Syston Tigers v Oadby Owls");
    expect(ics).toContain("STATUS:CANCELLED");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(4);
    expect(ics.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
  });
});
