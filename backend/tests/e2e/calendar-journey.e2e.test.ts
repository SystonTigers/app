/**
 * Journey: "Add fixtures to my calendar". Match times and grounds are never
 * public: each member gets their own private feed link, which stops working
 * when they leave the club and can't be made up or changed.
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { call, registerMember } from "./helpers";

describe("Fixtures calendar", () => {
  it("gives each member a private feed", async () => {
    const day = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO fixtures (id, tenant_id, fixture_date, kick_off_time, opponent, venue, competition, status, home_team, away_team) VALUES ('cal-1', 'syston', ?, '10:30', 'Calendar Owls', 'Memorial Park, Syston', 'League', 'scheduled', 'Syston Tigers (test)', 'Calendar Owls')`).bind(day),
      env.DB.prepare(`INSERT INTO fixtures (id, tenant_id, fixture_date, kick_off_time, opponent, venue, competition, status, home_team, away_team) VALUES ('cal-2', 'syston', ?, '14:00', 'Calendar Hawks', 'TBC', 'Cup', 'postponed', 'Calendar Hawks', 'Syston Tigers (test)')`).bind(day),
    ]);

    // No public feed any more
    const open = await call("/public/syston/calendar.ics");
    expect(String(open.data)).not.toContain("BEGIN:VCALENDAR");

    expect((await call("/api/v1/calendar/link")).status).toBe(401);
    const parent = await registerMember("cal-parent");
    const link = await call("/api/v1/calendar/link", { token: parent.token });
    expect(link.status).toBe(200);
    const url = new URL(link.data.data.url);
    expect(url.pathname).toMatch(/^\/api\/v1\/calendar\/feed\/.+\.ics$/);

    const { res } = await call(url.pathname);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/calendar");
    const ics = await res.clone().text();
    expect(ics).toContain("SUMMARY:Syston Tigers (test) v Calendar Owls");
    expect(ics).toContain(`DTSTART;TZID=Europe/London:${day.replace(/-/g, "")}T103000`);
    expect(ics).toContain("SUMMARY:POSTPONED: Calendar Hawks v Syston Tigers (test)");

    // A changed token doesn't work
    const tampered = url.pathname.replace(/.(\.ics)$/, (m) => (m[0] === "A" ? "B" : "A") + ".ics");
    expect((await call(tampered)).status).toBe(404);
    expect((await call("/api/v1/calendar/feed/not-a-token.ics")).status).toBe(404);

    // Leaving the club ends it
    await env.DB.prepare(`DELETE FROM auth_users WHERE id = ?`).bind(parent.userId).run();
    expect((await call(url.pathname)).status).toBe(404);

    const other = await registerMember("cal-other");
    const dl = await call("/api/v1/calendar/export", { token: other.token });
    expect(dl.status).toBe(200);
    expect(dl.res.headers.get("content-disposition")).toContain("attachment");
  });
});
