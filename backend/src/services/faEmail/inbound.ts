/**
 * FA Full-Time emails forwarded automatically by the club: every club gets a
 * private address, fixtures-<token>@<EMAIL_DOMAIN>, and sets its inbox
 * (Gmail, Outlook) to forward FA Full-Time emails there. The Worker's email
 * handler reads each one and adds or updates the fixtures, like a paste.
 *
 * Gmail asks the new address to confirm forwarding first: that email's
 * confirmation code is shown to staff in the club's settings.
 */
import { decodeHeaderWords, readMail } from "./mime";
import { parseFaEmail } from "./parse";
import { importFaFixtures } from "./apply";

type DB = { DB: D1Database };
export type InboundOutcome = "imported" | "nothing_found" | "not_fa" | "gmail_confirmation" | "unknown_address" | "failed";

const TOKEN_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
const MAX_RAW = 2_000_000;

export function fixtureEmailAddress(token: string, domain: string): string {
  return `fixtures-${token}@${domain}`;
}

/** The club's forwarding token, created the first time it's asked for. */
export async function fixtureEmailToken(env: DB, tenantId: string): Promise<string> {
  const row = await env.DB.prepare(`SELECT fixture_email_token FROM tenants WHERE id = ?`).bind(tenantId).first<{ fixture_email_token: string | null }>();
  if (row?.fixture_email_token) return row.fixture_email_token;
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  const token = [...bytes].map((b) => TOKEN_ALPHABET[b % TOKEN_ALPHABET.length]).join("");
  await env.DB.prepare(`UPDATE tenants SET fixture_email_token = ? WHERE id = ? AND fixture_email_token IS NULL`).bind(token, tenantId).run();
  const saved = await env.DB.prepare(`SELECT fixture_email_token FROM tenants WHERE id = ?`).bind(tenantId).first<{ fixture_email_token: string }>();
  return saved!.fixture_email_token;
}

/** "fixtures-abc123@domain" → "abc123" */
export function tokenFromAddress(to: string): string | null {
  const m = /(?:^|<|\s)fixtures-([a-z0-9]{6,20})@/i.exec(to);
  return m ? m[1].toLowerCase() : null;
}

/** HTML to lines of text, keeping line breaks where the layout had them. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d|table)>/gi, "\n")
    .replace(/<\/t[dh]>/gi, " ")
    .replace(/<a\b[^>]*href="([^"]*)"[^>]*>/gi, " $1 ")
    .replace(/<[^>]+>/g, " ");
}

/** Gmail's "confirm forwarding" email: the code to type into Gmail. */
export function gmailConfirmationCode(text: string): string | null {
  const m = /confirmation code:\s*(\d{6,12})/i.exec(text) ?? /\(#?(\d{8,12})\)/.exec(text);
  return m ? m[1] : null;
}

async function log(env: DB, tenantId: string, subject: string, outcome: InboundOutcome, counts: { found?: number; added?: number; updated?: number } = {}, detail: string | null = null, now = Date.now()) {
  await env.DB.prepare(
    `INSERT INTO fixture_email_log (id, tenant_id, received_at, subject, outcome, found, added, updated, detail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(crypto.randomUUID(), tenantId, now, subject.slice(0, 200), outcome, counts.found ?? null, counts.added ?? null, counts.updated ?? null, detail).run();
}

/** Handle one email sent to a club's fixtures address. */
export async function receiveFixtureEmail(env: DB, to: string, raw: string, now = new Date()): Promise<{ outcome: InboundOutcome; tenantId?: string }> {
  const token = tokenFromAddress(to);
  const tenant = token ? await env.DB.prepare(`SELECT id FROM tenants WHERE fixture_email_token = ?`).bind(token).first<{ id: string }>() : null;
  if (!tenant) {
    console.log(JSON.stringify({ level: "warn", msg: "fixture_email_unknown_address" }));
    return { outcome: "unknown_address" };
  }
  const tenantId = tenant.id;
  // Keep three months of history
  await env.DB.prepare(`DELETE FROM fixture_email_log WHERE tenant_id = ? AND received_at < ?`).bind(tenantId, now.getTime() - 90 * 86_400_000).run();
  try {
    const mail = readMail(raw.slice(0, MAX_RAW));
    const subject = decodeHeaderWords(mail.headers["subject"] ?? "");
    const from = (mail.headers["from"] ?? "").toLowerCase();
    const text = `${mail.text}\n${htmlToText(mail.html)}`;

    if (from.includes("forwarding-noreply@google.com")) {
      const code = gmailConfirmationCode(`${subject}\n${text}`);
      await log(env, tenantId, subject, "gmail_confirmation", {}, code, now.getTime());
      return { outcome: "gmail_confirmation", tenantId };
    }
    // Only FA Full-Time emails (sent directly or forwarded by the club's inbox)
    if (!/thefa\.com|full-time/i.test(`${from}\n${subject}\n${text.slice(0, 5000)}`)) {
      await log(env, tenantId, subject, "not_fa", {}, null, now.getTime());
      return { outcome: "not_fa", tenantId };
    }
    const fixtures = parseFaEmail(text);
    if (!fixtures.length) {
      await log(env, tenantId, subject, "nothing_found", {}, null, now.getTime());
      return { outcome: "nothing_found", tenantId };
    }
    const summary = await importFaFixtures(env, tenantId, fixtures, now);
    await log(env, tenantId, subject, "imported", summary, null, now.getTime());
    return { outcome: "imported", tenantId };
  } catch (err) {
    console.error(JSON.stringify({ level: "error", msg: "fixture_email_failed", tenantId, error: err instanceof Error ? err.message : String(err) }));
    await log(env, tenantId, "", "failed", {}, null, now.getTime()).catch(() => undefined);
    return { outcome: "failed", tenantId };
  }
}

export interface FixtureEmailLogRow { receivedAt: number; subject: string | null; outcome: InboundOutcome; found: number | null; added: number | null; updated: number | null; detail: string | null }

export async function recentFixtureEmails(env: DB, tenantId: string, limit = 10): Promise<FixtureEmailLogRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT received_at, subject, outcome, found, added, updated, detail FROM fixture_email_log WHERE tenant_id = ? ORDER BY received_at DESC LIMIT ?`,
  ).bind(tenantId, limit).all<{ received_at: number; subject: string | null; outcome: InboundOutcome; found: number | null; added: number | null; updated: number | null; detail: string | null }>();
  return (results ?? []).map((r) => ({ receivedAt: r.received_at, subject: r.subject, outcome: r.outcome, found: r.found, added: r.added, updated: r.updated, detail: r.detail }));
}
