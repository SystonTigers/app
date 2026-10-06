/**
 * Journey: the friendlies board between two clubs (app Manager zone →
 * Friendlies, website Friendlies). One club posts that it needs a game,
 * another offers one, and accepting adds the friendly to both clubs'
 * fixtures once, however often it's tapped. Other clubs' contact details
 * are never sent, and an offer with no date can't be accepted without one.
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { call, registerAdmin } from "./helpers";

const RIVALS = "friendly-rivals";

async function rivalCoach(): Promise<string> {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO tenants (id, slug, name, email, plan, status, created_at, updated_at)
     VALUES (?, ?, 'Friendly Rivals FC', 'rivals@example.com', 'pro', 'active', unixepoch(), unixepoch())`,
  ).bind(RIVALS, RIVALS).run();
  const email = `rival-${Date.now()}@example.com`;
  const reg = await call("/api/v1/auth/register", {
    body: { ageConfirmed: true, tenant_id: RIVALS, email, password: "SecurePass123!", profile: { name: "Rival Coach" } },
    headers: { "Idempotency-Key": `reg-${email}` },
  });
  expect(reg.status, JSON.stringify(reg.data)).toBe(201);
  await env.DB.prepare(`UPDATE auth_users SET roles = ? WHERE id = ?`).bind(JSON.stringify(["coach"]), reg.data.data.user.id).run();
  const login = await call("/api/v1/auth/login", { body: { tenant_id: RIVALS, email, password: "SecurePass123!" } });
  return login.data.data.token as string;
}

describe("Friendlies", () => {
  it("posts, offers and accepts once, adding the game for both clubs", async () => {
    const host = await registerAdmin("fr-host", "coach");
    const rival = await rivalCoach();

    const posted = await call("/api/v1/friendlies", { token: host.token, body: { preferred_dates: [], location_pref: "home", age_group: "U12", kit_colors: "Amber", max_travel_miles: 20, pitch_type: "3g", notes: "Any Saturday", contact_info: "07000 000000" } });
    expect(posted.status, JSON.stringify(posted.data)).toBeLessThan(300);

    const board = await call("/api/v1/friendlies", { token: rival });
    const post = board.data.data.find((r: any) => r.notes === "Any Saturday");
    expect(post).toBeTruthy();
    expect(post).not.toHaveProperty("contact_info");

    // An offer without a date can't be accepted until one is picked
    const noDate = await call(`/api/v1/friendlies/${post.id}/request`, { token: rival, body: { message: "Up for it" } });
    expect(noDate.status, JSON.stringify(noDate.data)).toBe(201);
    const again = await call(`/api/v1/friendlies/${post.id}/request`, { token: rival, body: { message: "Up for it" } });
    expect(again.data.data.id).toBe(noDate.data.data.id);
    const inbox = await call("/api/v1/friendlies/inbox", { token: host.token });
    const offer = inbox.data.data.find((m: any) => m.id === noDate.data.data.id);
    expect(offer.status).toBe("pending");
    const refused = await call(`/api/v1/friendlies/match/${offer.id}/respond`, { token: host.token, body: { action: "accept" } });
    expect(refused.status).toBe(400);
    expect(refused.data.error.code).toBe("DATE_NEEDED");

    // The rival can't answer the host's offers
    expect((await call(`/api/v1/friendlies/match/${offer.id}/respond`, { token: rival, body: { action: "accept", confirmed_date: "2031-05-10" } })).status).toBe(404);

    const accepted = await call(`/api/v1/friendlies/match/${offer.id}/respond`, { token: host.token, body: { action: "accept", confirmed_date: "2031-05-10", confirmed_kickoff: "10:30" } });
    expect(accepted.status, JSON.stringify(accepted.data)).toBe(200);
    const twice = await call(`/api/v1/friendlies/match/${offer.id}/respond`, { token: host.token, body: { action: "accept", confirmed_date: "2031-05-10" } });
    expect(twice.status).toBe(200);

    const ours = await env.DB.prepare(`SELECT * FROM fixtures WHERE tenant_id = 'syston' AND fixture_date = '2031-05-10' AND competition = 'Friendly'`).all<any>();
    const theirs = await env.DB.prepare(`SELECT * FROM fixtures WHERE tenant_id = ? AND fixture_date = '2031-05-10'`).bind(RIVALS).all<any>();
    expect(ours.results).toHaveLength(1);
    expect(theirs.results).toHaveLength(1);
    expect(ours.results[0]).toMatchObject({ opponent: "Friendly Rivals FC", home_team: "Syston Tigers (test)", away_team: "Friendly Rivals FC", kick_off_time: "10:30" });
    expect(theirs.results[0].opponent).toBe("Syston Tigers (test)");

    // The post is matched and off the board
    expect((await call("/api/v1/friendlies", { token: rival })).data.data.some((r: any) => r.id === post.id)).toBe(false);
    const sent = await call("/api/v1/friendlies/sent", { token: rival });
    expect(sent.data.data.find((m: any) => m.id === offer.id)?.status).toBe("accepted");
  });
});
