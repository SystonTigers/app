import { describe, it, expect } from "vitest";
import { parseFaEmail } from "../faEmail/parse";
import { ourSide } from "../faEmail/apply";

// Shaped like a real FA Full-Time email; the people and numbers are made up
const REFEREE_EMAIL = `Daniel,

Please note there has been a referee appointment(s) for a fixture that could affect you:
Under 18 Division One
Sun 20 Sept 2026 14:00, Coalbrook Town Ravens U18 Ravens -v- Syston Town Juniors U18 Tigers Status: Normal
Venue: MILLBROOK RECREATION GROUND #1
Referee: Alex Example, 07000 000001 (M), ref@example.com, Assistant 1: None, Assistant 2: None, Fourth Official: None
Home Team Contact: Pat Sample; Email: pat@example.com Mob: 07000 000002
Away Team Contact: Sam Sample; Email: sam@example.com Mob: 07000 000003

Click here for full details of this fixture on Full-Time
https://fulltime.thefa.com/displayFixture.html?id=27123456

This email has been sent from the Leicestershire Youth League on Full-Time.
If you do not wish to receive emails please click here`;

describe("FA Full-Time emails", () => {
  it("reads the fixture and nothing personal", () => {
    const [f, ...rest] = parseFaEmail(REFEREE_EMAIL);
    expect(rest).toEqual([]);
    expect(f).toEqual({
      date: "2026-09-20", time: "14:00",
      homeTeam: "Coalbrook Town Ravens U18 Ravens", awayTeam: "Syston Town Juniors U18 Tigers",
      status: "scheduled", statusText: "Normal",
      venue: "MILLBROOK RECREATION GROUND #1", competition: "Under 18 Division One", faFixtureId: "27123456",
    });
    expect(JSON.stringify(f)).not.toMatch(/07000|example\.com|Alex|Pat|Sam Sample/);
  });

  it("reads several fixtures, statuses and HTML", () => {
    const html = `<p>Under 12 Cup</p><p>Sat 3 Oct 2026 10:30, Syston Town Juniors U12 -v- Rival FC U12 Status: Postponed</p>
      <p>Venue: Syston Park</p><table><tr><td>Sunday 11 October 2026 09:00, Other FC -v- Syston Town Juniors U12 Status: Cancelled</td></tr></table>
      <div>Sun 18 Oct 2026, Syston Town Juniors U12 -v- Later FC</div>`;
    const found = parseFaEmail(html);
    expect(found.map((f) => [f.date, f.time, f.homeTeam, f.awayTeam, f.status, f.venue, f.competition])).toEqual([
      ["2026-10-03", "10:30", "Syston Town Juniors U12", "Rival FC U12", "postponed", "Syston Park", "Under 12 Cup"],
      ["2026-10-11", "09:00", "Other FC", "Syston Town Juniors U12", "cancelled", null, "Under 12 Cup"],
      ["2026-10-18", null, "Syston Town Juniors U12", "Later FC", "scheduled", null, "Under 12 Cup"],
    ]);
  });

  it("ignores lines that aren't fixtures", () => {
    expect(parseFaEmail("Daniel, weekly reminder\nNothing this week\n31 Feb 2026 10:00, A -v- B")).toEqual([]);
  });

  it("works out which side is ours", () => {
    const f = { homeTeam: "Coalbrook Town Ravens U18 Ravens", awayTeam: "Syston Town Juniors U18 Tigers" };
    expect(ourSide(f, "Syston Tigers U16", null)).toBe("away");
    expect(ourSide(f, "Some Other Club", "Syston Town Juniors U18 Tigers")).toBe("away");
    expect(ourSide(f, "Unrelated", null)).toBeNull();
  });
});
