import { json } from "../services/util";
import { requireTenantJWT } from "../services/auth";
import { rateLimit } from "../middleware/rateLimit";

/** Sign-up gives each club a placeholder URL until the owner picks one; those clubs aren't set up yet. */
const PLACEHOLDER_SLUG = /^club-[0-9a-f]{8}$/;

export interface ClubSummary {
  slug: string;
  name: string;
  primaryColor: string | null;
  badgeUrl: string | null;
}

/**
 * Find a club by name or web address, for the app's "Find your club" screen.
 * GET /api/v1/clubs/search?q=riverside
 * Public: club names are already public on their club pages.
 */
export async function handleSearchClubs(req: Request, env: any, corsHdrs: Headers): Promise<Response> {
  const limited = await rateLimit(req, env, { scope: "clubs:search", limit: 60, windowSeconds: 60, path: "/api/v1/clubs/search" });
  if (!limited.ok) {
    return json({ success: false, error: { code: "RATE_LIMITED", message: "Too many searches. Please wait a moment." } }, 429, corsHdrs);
  }

  const q = (new URL(req.url).searchParams.get("q") || "").trim().toLowerCase();
  if (q.length < 2) {
    return json({ success: true, data: [] }, 200, corsHdrs);
  }
  if (q.length > 60) {
    return json({ success: false, error: { code: "INVALID_REQUEST", message: "Search is too long" } }, 400, corsHdrs);
  }

  // Escape LIKE wildcards so "%" or "_" in a search don't match everything
  const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const rows = await env.DB.prepare(
    `SELECT t.slug, t.name, b.primary_color, b.badge_url
       FROM tenants t
       LEFT JOIN tenant_brand b ON b.tenant_id = t.id
      WHERE t.status IN ('trial', 'active')
        AND (LOWER(t.name) LIKE ? ESCAPE '\\' OR LOWER(t.slug) LIKE ? ESCAPE '\\')
      ORDER BY CASE WHEN LOWER(t.name) LIKE ? ESCAPE '\\' THEN 0 ELSE 1 END, t.name
      LIMIT 20`
  ).bind(pattern, pattern, `${pattern.slice(1)}`).all();

  const clubs: ClubSummary[] = (rows.results || [])
    .filter((r: any) => !PLACEHOLDER_SLUG.test(r.slug))
    .slice(0, 10)
    .map((r: any) => ({
      slug: r.slug,
      name: r.name,
      primaryColor: r.primary_color ?? null,
      badgeUrl: r.badge_url ?? null,
    }));

  return json({ success: true, data: clubs }, 200, corsHdrs);
}

/**
 * The signed-in user's profile.
 * GET /api/v1/users/me
 */
export async function handleGetMe(req: Request, env: any, corsHdrs: Headers): Promise<Response> {
  try {
    const claims = await requireTenantJWT(req, env);
    if (!claims.sub) {
      return json({ success: false, error: { code: "UNAUTHORIZED", message: "Please log in again" } }, 401, corsHdrs);
    }

    const row = await env.DB.prepare(
      `SELECT u.id, u.email, u.roles, u.profile, t.slug AS tenant_slug, t.name AS tenant_name
         FROM auth_users u
         JOIN tenants t ON t.id = u.tenant_id
        WHERE u.id = ? AND u.tenant_id = ?`
    ).bind(claims.sub, claims.tenantId).first() as any;

    if (!row) {
      return json({ success: false, error: { code: "NOT_FOUND", message: "Account not found" } }, 404, corsHdrs);
    }

    let profile: Record<string, unknown> = {};
    try {
      profile = row.profile ? JSON.parse(row.profile) : {};
    } catch {
      profile = {};
    }
    let roles: string[] = [];
    try {
      roles = JSON.parse(row.roles || "[]");
    } catch {
      roles = [];
    }

    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
    const name = str(profile.name);
    const firstName = str(profile.firstName) ?? name?.split(" ")[0];
    const lastName = str(profile.lastName) ?? (name && name.includes(" ") ? name.split(" ").slice(1).join(" ") : undefined);

    return json({
      success: true,
      user: {
        id: row.id,
        email: row.email,
        firstName,
        lastName,
        roles,
        tenant_id: claims.tenantId,
        tenant_slug: row.tenant_slug,
        tenant_name: row.tenant_name,
      },
    }, 200, corsHdrs);
  } catch (err: any) {
    if (err instanceof Response) {return err;}
    console.error(JSON.stringify({ event: "users_me", outcome: "error", error: err?.message }));
    return json({ success: false, error: { code: "SERVER_ERROR", message: "Couldn't load your profile" } }, 500, corsHdrs);
  }
}

/**
 * Update the signed-in user's name and phone.
 * PUT /api/v1/users/profile  { firstName?, lastName?, phone? }
 */
export async function handleUpdateMyProfile(req: Request, env: any, corsHdrs: Headers): Promise<Response> {
  try {
    const claims = await requireTenantJWT(req, env);
    if (!claims.sub) {
      return json({ success: false, error: { code: "UNAUTHORIZED", message: "Please log in again" } }, 401, corsHdrs);
    }
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return json({ success: false, error: { code: "INVALID_REQUEST", message: "Nothing to save" } }, 400, corsHdrs);
    }

    const updates: Record<string, string> = {};
    for (const field of ["firstName", "lastName", "phone"] as const) {
      const value = body[field];
      if (value === undefined) continue;
      if (typeof value !== "string" || value.length > (field === "phone" ? 30 : 60)) {
        return json({ success: false, error: { code: "INVALID_REQUEST", message: `${field} is not valid` } }, 400, corsHdrs);
      }
      updates[field] = value.trim();
    }
    if (Object.keys(updates).length === 0) {
      return json({ success: false, error: { code: "INVALID_REQUEST", message: "Nothing to save" } }, 400, corsHdrs);
    }

    const row = await env.DB.prepare("SELECT profile FROM auth_users WHERE id = ? AND tenant_id = ?")
      .bind(claims.sub, claims.tenantId).first() as { profile: string | null } | null;
    if (!row) {
      return json({ success: false, error: { code: "NOT_FOUND", message: "Account not found" } }, 404, corsHdrs);
    }
    let profile: Record<string, unknown> = {};
    try {
      profile = row.profile ? JSON.parse(row.profile) : {};
    } catch {
      profile = {};
    }
    const next = { ...profile, ...updates };
    const first = typeof next.firstName === "string" ? next.firstName : "";
    const last = typeof next.lastName === "string" ? next.lastName : "";
    if (first || last) next.name = `${first} ${last}`.trim();

    await env.DB.prepare("UPDATE auth_users SET profile = ?, updated_at = ? WHERE id = ? AND tenant_id = ?")
      .bind(JSON.stringify(next), Date.now(), claims.sub, claims.tenantId).run();

    return json({ success: true, user: { id: claims.sub, firstName: next.firstName, lastName: next.lastName, phone: next.phone } }, 200, corsHdrs);
  } catch (err: any) {
    if (err instanceof Response) {return err;}
    console.error(JSON.stringify({ event: "users_profile_update", outcome: "error", error: err?.message }));
    return json({ success: false, error: { code: "SERVER_ERROR", message: "Couldn't save your profile" } }, 500, corsHdrs);
  }
}
