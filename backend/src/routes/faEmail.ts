/**
 * Fixtures from FA Full-Time emails.
 *
 *   POST /api/v1/club/fixtures/fa-email   staff: { text } the email, pasted
 *
 * Adds new fixtures and updates ones that moved, changed ground or were
 * postponed. Contact details in the email are never stored.
 */
import { json } from "../services/util";
import { requireStaff } from "../services/auth";
import { parseFaEmail } from "../services/faEmail/parse";
import { importFaFixtures } from "../services/faEmail/apply";

type Env = { DB: D1Database; [key: string]: unknown };
const MAX_TEXT = 200_000;

function fail(corsHdrs: Headers, status: number, code: string, message: string): Response {
  return json({ success: false, error: { code, message } }, status, corsHdrs);
}

export async function handleFaEmailImport(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  let tenantId: string;
  try {
    tenantId = (await requireStaff(req, env)).tenantId;
  } catch (err) {
    const status = err instanceof Response ? err.status : 401;
    return status === 403 ? fail(corsHdrs, 403, "FORBIDDEN", "Only club staff can add fixtures.") : fail(corsHdrs, 401, "UNAUTHORIZED", "Please log in again.");
  }
  const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text : "";
  if (!text.trim()) return fail(corsHdrs, 400, "EMPTY", "Paste the FA email first.");
  if (text.length > MAX_TEXT) return fail(corsHdrs, 413, "TOO_LONG", "That's too much text. Paste one email at a time.");
  const fixtures = parseFaEmail(text);
  if (!fixtures.length) {
    return fail(corsHdrs, 422, "NOTHING_FOUND", "We couldn't find a fixture in that. Copy the whole email from FA Full-Time (the line with the date and \"-v-\") and paste it again.");
  }
  try {
    const summary = await importFaFixtures(env, tenantId, fixtures);
    return json({ success: true, data: summary }, 200, corsHdrs);
  } catch (err) {
    console.error(JSON.stringify({ level: "error", msg: "fa_email_import_failed", tenantId, error: err instanceof Error ? err.message : String(err) }));
    return fail(corsHdrs, 500, "INTERNAL", "Something went wrong adding the fixtures. Please try again.");
  }
}
