/**
 * Fixtures from a photo or screenshot (staff only).
 *
 *   POST /api/v1/club/fixtures/from-image         the picture's bytes → fixtures found (nothing saved)
 *   POST /api/v1/club/fixtures/from-image/apply   { fixtures: [...] } the ones staff ticked → added or updated
 *
 * Reading uses Workers AI (services/fixtureImage); the picture is never
 * stored. Saving goes through the same import as FA emails, so a fixture the
 * club already has is updated rather than added twice.
 */
import { json } from "../services/util";
import { requireStaff } from "../services/auth";
import { rateLimit } from "../middleware/rateLimit";
import { importFaFixtures, ourSide } from "../services/faEmail/apply";
import type { FaEmailFixture } from "../services/faEmail/parse";
import { loadLeagueSettings, type LeagueDb } from "../services/league/store";
import { fixturesFromReply } from "../services/fixtureImage/normalise";
import { FixtureImageError, MAX_IMAGE_BYTES, readFixturesFromImage, type ImageEnv } from "../services/fixtureImage/read";

type Env = ImageEnv & { DB: D1Database; [key: string]: unknown };

/** Pictures a club can have read per day (keeps the AI bill predictable) */
const READS_PER_DAY = 40;

function fail(corsHdrs: Headers, status: number, code: string, message: string): Response {
  return json({ success: false, error: { code, message } }, status, corsHdrs);
}

async function staffClub(req: Request, env: Env, corsHdrs: Headers): Promise<{ tenantId: string } | Response> {
  try {
    return { tenantId: (await requireStaff(req, env)).tenantId };
  } catch (err) {
    const status = err instanceof Response ? err.status : 401;
    return status === 403 ? fail(corsHdrs, 403, "FORBIDDEN", "Only club staff can add fixtures.") : fail(corsHdrs, 401, "UNAUTHORIZED", "Please log in again.");
  }
}

async function clubContext(env: Env, tenantId: string, now: Date): Promise<{ clubName: string; ourTeam: string | null }> {
  const tenant = await env.DB.prepare(`SELECT name FROM tenants WHERE id = ?`).bind(tenantId).first<{ name: string }>();
  const settings = await loadLeagueSettings(env.DB as unknown as LeagueDb, tenantId, now);
  return { clubName: tenant?.name ?? "", ourTeam: settings.ourTeam };
}

export async function handleReadFixtureImage(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const club = await staffClub(req, env, corsHdrs);
  if (club instanceof Response) return club;
  const limited = await rateLimit(req, env as never, { scope: `fixture-image:${club.tenantId}`, limit: READS_PER_DAY, windowSeconds: 86400, path: "/api/v1/club/fixtures/from-image" });
  if (!limited.ok) return fail(corsHdrs, 429, "RATE_LIMITED", "That's a lot of pictures today. Try again tomorrow, or add fixtures by hand.");

  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > MAX_IMAGE_BYTES) return fail(corsHdrs, 413, "TOO_BIG", "That picture is too big. Try a screenshot instead.");
  const bytes = new Uint8Array(await req.arrayBuffer());
  const now = new Date();
  try {
    const { clubName, ourTeam } = await clubContext(env, club.tenantId, now);
    const found = await readFixturesFromImage(env, bytes, clubName, now);
    const fixtures = found.map((f) => {
      const side = ourSide(f, clubName, ourTeam);
      return {
        date: f.date, time: f.time, home: f.homeTeam, away: f.awayTeam, venue: f.venue, competition: f.competition, status: f.status,
        // Which team is the club: null when the picture doesn't make it clear (staff choose)
        us: side,
        opponent: side === "home" ? f.awayTeam : side === "away" ? f.homeTeam : null,
      };
    });
    return json({ success: true, data: { fixtures } }, 200, corsHdrs);
  } catch (err) {
    if (err instanceof FixtureImageError) return fail(corsHdrs, err.status, err.code, err.message);
    console.error(JSON.stringify({ level: "error", msg: "fixture_image_failed", tenantId: club.tenantId, error: err instanceof Error ? err.message : String(err) }));
    return fail(corsHdrs, 500, "INTERNAL", "Something went wrong reading that picture. Please try again.");
  }
}

export async function handleApplyFixtureImage(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const club = await staffClub(req, env, corsHdrs);
  if (club instanceof Response) return club;
  const body = (await req.json().catch(() => null)) as { fixtures?: unknown } | null;
  if (!Array.isArray(body?.fixtures) || !body.fixtures.length) return fail(corsHdrs, 400, "EMPTY", "Tick at least one fixture to add.");
  const now = new Date();
  try {
    const { clubName } = await clubContext(env, club.tenantId, now);
    // The same checks as a fresh read (real dates, plain team names), one at a time
    const fixtures: FaEmailFixture[] = [];
    for (const item of body.fixtures.slice(0, 40)) {
      const [f] = fixturesFromReply(JSON.stringify({ fixtures: [item] }), now);
      if (!f) continue;
      // Staff said which team is theirs: name it after the club so it's matched as ours
      const us = (item as { us?: unknown } | null)?.us;
      if (clubName && us === "home") fixtures.push({ ...f, homeTeam: clubName });
      else if (clubName && us === "away") fixtures.push({ ...f, awayTeam: clubName });
      else fixtures.push(f);
    }
    if (!fixtures.length) return fail(corsHdrs, 400, "INVALID", "Those fixtures need a date and both teams.");
    const summary = await importFaFixtures(env, club.tenantId, fixtures, now, "photo");
    return json({ success: true, data: summary }, 200, corsHdrs);
  } catch (err) {
    console.error(JSON.stringify({ level: "error", msg: "fixture_image_apply_failed", tenantId: club.tenantId, error: err instanceof Error ? err.message : String(err) }));
    return fail(corsHdrs, 500, "INTERNAL", "Something went wrong adding the fixtures. Please try again.");
  }
}
