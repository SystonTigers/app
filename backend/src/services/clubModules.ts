/**
 * Club extras each club switches on or off for itself: Subs and fees,
 * Signing on and the Shop. Off unless the club turns them on, so a club that
 * uses another system (TeamFeePay and the like) never sees them.
 *
 * Stored as JSON in `tenants.modules`. `moduleGate` refuses the extra's API
 * routes when it's off, before routing, so a new route can't forget it.
 */
import { json } from "./util";

export const CLUB_MODULES = ["subs", "signingOn", "shop"] as const;
export type ClubModule = (typeof CLUB_MODULES)[number];
export type ClubModules = Record<ClubModule, boolean>;

const NAMES: Record<ClubModule, string> = { subs: "Subs and fees", signingOn: "Signing on", shop: "The club shop" };

/** The stored JSON as switches (anything missing or unreadable is off). */
export function readModules(raw: string | null | undefined): ClubModules {
  let value: Record<string, unknown> = {};
  try {
    const parsed = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) value = parsed as Record<string, unknown>;
  } catch {
    // Unreadable: everything off
  }
  return Object.fromEntries(CLUB_MODULES.map((m) => [m, value[m] === true])) as ClubModules;
}

type Env = { DB: D1Database };

export async function clubModules(env: Env, tenantId: string): Promise<ClubModules> {
  const row = await env.DB.prepare(`SELECT modules FROM tenants WHERE id = ? OR slug = ?`).bind(tenantId, tenantId).first<{ modules: string | null }>();
  return readModules(row?.modules);
}

/** Switch some extras on or off; returns all of them. */
export async function setModules(env: Env, tenantId: string, changes: Partial<ClubModules>): Promise<ClubModules> {
  const next = { ...(await clubModules(env, tenantId)), ...changes };
  await env.DB.prepare(`UPDATE tenants SET modules = ? WHERE id = ?`).bind(JSON.stringify(next), tenantId).run();
  return next;
}

/** Which extra an API path belongs to (after /api/vN/), or null. */
export function moduleForPath(rest: string): ClubModule | null {
  if (/^dues(\/|$)/.test(rest)) return "subs";
  if (/^(registration|signing-on)(\/|$)/.test(rest)) return "signingOn";
  if (/^(shop|printify|personalization)(\/|$)/.test(rest)) return "shop";
  return null;
}

/** The club a request is for: its token's club, else ?tenant= (public shop pages). Not verified: routes still check the token. */
function requestClub(req: Request, url: URL): string | null {
  const header = req.headers.get("authorization") || "";
  const part = header.startsWith("Bearer ") ? header.slice(7).split(".")[1] : undefined;
  if (part) {
    try {
      const p = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))) as Record<string, unknown>;
      const id = p.tenantId ?? p.tenant_id ?? p.tenant;
      if (typeof id === "string" && id && id !== "system") return id;
    } catch {
      // Not a token we can read; the route will refuse it
    }
  }
  return url.searchParams.get("tenant");
}

/** A refusal when the request is for an extra the club has switched off, or null to carry on. */
export async function moduleGate(req: Request, env: Env, corsHdrs: Headers): Promise<Response | null> {
  const url = new URL(req.url);
  const m = /^\/api\/v\d+\/(.+)$/.exec(url.pathname);
  const module = m ? moduleForPath(m[1]) : null;
  if (!module) return null;
  const club = requestClub(req, url);
  if (!club) return null; // No club to check: the route itself refuses or finds the club another way
  if ((await clubModules(env, club))[module]) return null;
  return json({
    success: false,
    error: { code: "MODULE_OFF", module, message: `${NAMES[module]} isn't switched on for this club. A club admin can switch it on in Club Settings.` },
  }, 403, corsHdrs);
}
