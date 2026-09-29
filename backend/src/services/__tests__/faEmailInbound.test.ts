import { describe, it, expect } from "vitest";
import { decodeHeaderWords, readMail } from "../faEmail/mime";
import { gmailConfirmationCode, htmlToText, tokenFromAddress } from "../faEmail/inbound";
import { parseFaEmail } from "../faEmail/parse";
import { isReminderHour, reminderMessage } from "../consentReminders";
import { hashCode, newInviteCode, normaliseCode } from "../parentLinks";

const RAW = [
  "From: donotreplyfulltime@thefa.com",
  "To: fixtures-abc234xyz9@example.org",
  "Subject: =?UTF-8?Q?Full-Time:_Leicestershire_Youth_League?=",
  "MIME-Version: 1.0",
  'Content-Type: multipart/alternative; boundary="b1"',
  "",
  "--b1",
  "Content-Type: text/plain; charset=utf-8",
  "Content-Transfer-Encoding: quoted-printable",
  "",
  "Under 18 Division One",
  "Sun 20 Sept 2026 14:00, Rival Town U18 -v- Syston Town Juniors U18 Tigers Status: Norm=",
  "al",
  "Venue: Rival Park =E2=80=93 Pitch 2",
  "--b1",
  "Content-Type: text/html; charset=utf-8",
  "Content-Transfer-Encoding: base64",
  "",
  btoa("<p>Under 18 Division One</p><p>Sun 20 Sept 2026 14:00, Rival Town U18 -v- Syston Town Juniors U18 Tigers Status: Normal</p>"),
  "--b1--",
  "",
].join("\r\n");

describe("forwarded FA emails", () => {
  it("reads a multipart email", () => {
    const mail = readMail(RAW);
    expect(decodeHeaderWords(mail.headers.subject)).toBe("Full-Time: Leicestershire Youth League");
    expect(mail.text).toContain("Status: Normal");
    expect(mail.text).toContain("Rival Park – Pitch 2");
    expect(mail.html).toContain("<p>Under 18 Division One</p>");
    const [f] = parseFaEmail(`${mail.text}\n${htmlToText(mail.html)}`);
    expect(f).toMatchObject({ date: "2026-09-20", status: "scheduled", venue: "Rival Park – Pitch 2" });
  });

  it("finds the club from the address and Gmail's confirmation code", () => {
    expect(tokenFromAddress("fixtures-abc234xyz9@example.org")).toBe("abc234xyz9");
    expect(tokenFromAddress("Club <FIXTURES-ABC234XYZ9@example.org>")).toBe("abc234xyz9");
    expect(tokenFromAddress("someone@example.org")).toBeNull();
    expect(gmailConfirmationCode("Confirmation code: 812345678\nTo allow ...")).toBe("812345678");
    expect(gmailConfirmationCode("(#812345678) Gmail Forwarding Confirmation")).toBe("812345678");
  });
});

describe("parent invite codes", () => {
  it("are long, readable and matched loosely", async () => {
    const code = newInviteCode();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(normaliseCode(" k7qm 3xrd ")).toBe("K7QM3XRD");
    expect(await hashCode("k7qm-3xrd")).toBe(await hashCode("K7QM3XRD"));
    expect(new Set(Array.from({ length: 200 }, newInviteCode)).size).toBe(200);
  });
});

describe("consent reminders", () => {
  it("only in the daytime (UK)", () => {
    expect(isReminderHour(new Date("2026-10-01T11:00:00Z"))).toBe(true); // 12:00 BST
    expect(isReminderHour(new Date("2026-10-01T06:00:00Z"))).toBe(false); // 07:00 BST
    expect(isReminderHour(new Date("2026-10-01T19:30:00Z"))).toBe(false); // 20:30 BST
  });
  it("names the children by first name", () => {
    expect(reminderMessage("Syston Tigers", "Sam Smith\u001fJo Smith", 1).body).toContain("Sam and Jo's photo");
    expect(reminderMessage("Syston Tigers", "Sam Smith", 2).title).toBe("Reminder: photo & video consent");
  });
});
