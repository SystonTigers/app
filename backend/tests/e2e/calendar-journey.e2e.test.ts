/**
 * Journey: "Add fixtures to my calendar". The club's public calendar feed
 * (/public/:club/calendar.ics) lists its fixtures with UK times, the right
 * home and away, and postponed games marked; members can also download it.
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { call, registerMember } from "./helpers";

describe("Fixtures calendar", () => {
  it("serves a calendar phones can subscribe to", async () => {
    const day = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO fixtures (id, tenant_id, fixture_date, kick_off_time, opponent, venue, competition, status, home_team, away_team) VALUES ('cal-1', 'syston', ?, '10:30', 'Calendar Owls', 'Memorial Park, Syston', 'League', 'scheduled', 'Syston Tigers (test)', 'Calendar Owls')`).bind(day),
      env.DB.prepare(`INSERT INTO fixtures (id, tenant_id, fixture_date, kick_off_time, opponent, venue, competition, status, home_team, away_team) VALUES ('cal-2', 'syston', ?, '14:00', 'Calendar Hawks', 'TBC', 'Cup', 'postponed', 'Calendar Hawks', 'Syston Tigers (test)')`).bind(day),
    ]);

    const { res } = await call("/public/syston/calendar.ics");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/calendar");
    const ics = await res.clone().text();
    expect(ics).toContain("SUMMARY:Syston Tigers (test) v Calendar Owls");
    expect(ics).toContain(`DTSTART;TZID=Europe/London:${day.replace(/-/g, "")}T103000`);
    expect(ics).toContain("SUMMARY:POSTPONED: Calendar Hawks v Syston Tigers (test)");
    expect(ics).toContain("LOCATION:Memorial Park\\, Syston");

    expect((await call("/api/v1/calendar/export")).status).toBe(401);
    const parent = await registerMember("cal-parent");
    const dl = await call("/api/v1/calendar/export", { token: parent.token });
    expect(dl.status).toBe(200);
    expect(dl.res.headers.get("content-disposition")).toContain("attachment");
  });
});
