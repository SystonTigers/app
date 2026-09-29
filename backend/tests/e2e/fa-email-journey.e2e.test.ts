/**
 * Journey: the manager pastes an FA Full-Time email and the fixture appears
 * in the club's fixtures. Pasting it again changes nothing; a later email
 * about the same match (postponed, new date) updates it. Contact details in
 * the email are never stored.
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { call, registerAdmin, registerMember } from "./helpers";

// Made-up people and numbers in the FA's email layout
const email = (date: string, status: string, venue = "MILLBROOK RECREATION GROUND #1") => `Daniel,
Please note there has been a referee appointment(s) for a fixture that could affect you:
Under 18 Division One
${date} 14:00, Emailton Rovers U18 -v- Syston Town Juniors U18 Tigers Status: ${status}
Venue: ${venue}
Referee: Alex Example, 07000 000001 (M), ref@example.com
Home Team Contact: Pat Sample; Email: pat@example.com Mob: 07000 000002`;

describe("FA email fixtures journey", () => {
  it("adds and updates fixtures from pasted FA emails", async () => {
    const coach = await registerAdmin("fa-email-coach");
    const parent = await registerMember("fa-email-parent");
    const paste = (text: string, token = coach.token) => call("/api/v1/club/fixtures/fa-email", { token, body: { text } });
    const row = () => env.DB.prepare(
      `SELECT fixture_date, kick_off_time, opponent, home_team, venue, competition, status, source FROM fixtures WHERE tenant_id = 'syston' AND opponent = 'Emailton Rovers U18'`,
    ).all<any>();

    expect((await paste(email("Sun 20 Sept 2026", "Normal"), parent.token)).status).toBe(403);
    expect((await paste("Hello, nothing here")).status).toBe(422);

    const first = await paste(email("Sun 20 Sept 2026", "Normal"));
    expect(first.status).toBe(200);
    expect(first.data.data).toMatchObject({ found: 1, added: 1, updated: 0 });
    expect(first.data.data.lines[0]).toMatchObject({ opponent: "Emailton Rovers U18", homeAway: "away", action: "added" });
    let rows = (await row()).results;
    expect(rows).toEqual([{
      fixture_date: "2026-09-20", kick_off_time: "14:00", opponent: "Emailton Rovers U18", home_team: "Emailton Rovers U18",
      venue: "MILLBROOK RECREATION GROUND #1", competition: "Under 18 Division One", status: "scheduled", source: "fa_email",
    }]);

    // Nothing personal was stored anywhere on the fixture
    const all = await env.DB.prepare(`SELECT * FROM fixtures WHERE tenant_id = 'syston' AND opponent = 'Emailton Rovers U18'`).first<any>();
    expect(JSON.stringify(all)).not.toMatch(/07000|example\.com|Alex|Pat Sample/);

    // The same email again: nothing changes
    expect((await paste(email("Sun 20 Sept 2026", "Normal"))).data.data).toMatchObject({ added: 0, updated: 0, unchanged: 1 });

    // Postponed, then rearranged to a new date at a new ground
    const off = await paste(email("Sun 20 Sept 2026", "Postponed"));
    expect(off.data.data.lines[0]).toMatchObject({ action: "updated", changes: ["postponed"] });
    const moved = await paste(email("Sun 4 Oct 2026", "Normal", "Emailton Park"));
    expect(moved.data.data.lines[0]).toMatchObject({ action: "updated", changes: ["date", "ground", "back on"] });
    rows = (await row()).results;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ fixture_date: "2026-10-04", venue: "Emailton Park", status: "scheduled" });

    // A match that doesn't involve us is left alone
    const other = await paste("Sat 3 Oct 2026 10:00, Other Town U18 -v- Another United U18 Status: Normal");
    expect(other.data.data).toMatchObject({ found: 1, added: 0, notOurs: 1 });
  });
});
