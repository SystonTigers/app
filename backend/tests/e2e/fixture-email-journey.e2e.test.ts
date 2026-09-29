/**
 * Journey: the club's inbox forwards FA Full-Time emails to its private
 * fixtures address and the fixtures appear on their own. Gmail's forwarding
 * confirmation code is shown to staff; other emails and unknown addresses are
 * ignored.
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { call, registerAdmin } from "./helpers";
import { fixtureEmailToken, receiveFixtureEmail } from "../../src/services/faEmail/inbound";

const mail = (from: string, subject: string, body: string) =>
  [`From: ${from}`, `Subject: ${subject}`, "Content-Type: text/plain; charset=utf-8", "", body].join("\r\n");

describe("Forwarded fixture emails journey", () => {
  it("adds fixtures from emails forwarded to the club's address", async () => {
    const coach = await registerAdmin("inbox-coach");
    const token = await fixtureEmailToken(env as any, "syston");
    expect(await fixtureEmailToken(env as any, "syston")).toBe(token); // stays the same
    const to = `fixtures-${token}@example.org`;

    // Without an email domain configured, staff are told it isn't switched on yet
    const settings = await call("/api/v1/club/fixture-email", { token: coach.token });
    expect(settings.status).toBe(200);
    expect(settings.data.data.address).toBeNull();

    // Gmail's forwarding confirmation: the code is kept for staff to type into Gmail
    expect((await receiveFixtureEmail(env as any, to, mail("Gmail Team <forwarding-noreply@google.com>", "(#812345678) Gmail Forwarding Confirmation", "Confirmation code: 812345678"))).outcome).toBe("gmail_confirmation");
    expect((await call("/api/v1/club/fixture-email", { token: coach.token })).data.data.gmailCode).toBe("812345678");

    // An FA email, forwarded: the fixture is added
    const fa = mail("donotreplyfulltime@thefa.com", "Full-Time: Leicestershire Youth League",
      "Under 18 Division One\r\nSat 10 Oct 2026 10:30, Syston Town Juniors U18 Tigers -v- Inbox United U18 Status: Normal\r\nVenue: Syston Park\r\nReferee: Alex Example, 07000 000001");
    expect((await receiveFixtureEmail(env as any, to, fa)).outcome).toBe("imported");
    const row = await env.DB.prepare(`SELECT fixture_date, kick_off_time, venue, source FROM fixtures WHERE tenant_id = 'syston' AND opponent = 'Inbox United U18'`).first<any>();
    expect(row).toEqual({ fixture_date: "2026-10-10", kick_off_time: "10:30", venue: "Syston Park", source: "fa_email" });
    // The same email arriving twice changes nothing
    await receiveFixtureEmail(env as any, to, fa);
    expect((await env.DB.prepare(`SELECT COUNT(*) AS c FROM fixtures WHERE opponent = 'Inbox United U18'`).first<any>()).c).toBe(1);

    // Other emails and unknown addresses are ignored
    expect((await receiveFixtureEmail(env as any, to, mail("friend@example.com", "Hello", "Sat 10 Oct 2026 10:30, A -v- B"))).outcome).toBe("not_fa");
    expect((await receiveFixtureEmail(env as any, "fixtures-notaclub99@example.org", fa)).outcome).toBe("unknown_address");

    const recent = (await call("/api/v1/club/fixture-email", { token: coach.token })).data.data.recent;
    expect(recent.map((r: any) => r.outcome)).toEqual(["not_fa", "imported", "imported", "gmail_confirmation"]);
    expect(recent[1]).toMatchObject({ subject: "Full-Time: Leicestershire Youth League", found: 1 });
  });
});
