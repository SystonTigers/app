/**
 * People who signed themselves up wait for staff to let them in (role
 * "pending"). Until then they can only manage their own account, use a
 * coach's code for their child, and check whether they've been approved:
 * nothing about the club's children, fixtures, training, grounds or times.
 *
 * Checked once for every request before routing, so a new route can't forget
 * it. The token's roles are read without verifying it: a token claiming to be
 * pending is only ever refused here, and every route still verifies it.
 */
import { json } from "./util";
import { PENDING_ROLE } from "./clubMembers";

/** What a waiting account may call (after /api/v1/). */
const OPEN_FOR_PENDING: Array<{ method?: string; path: RegExp }> = [
  { path: /^auth\// },
  { path: /^membership$/ },
  { method: "POST", path: /^link-child$/ },
  { path: /^users\/(me|profile)(\/alerts)?$/ },
  { method: "GET", path: /^me\/players$/ },
  { path: /^push\/(register|config)$/ },
  { method: "GET", path: /^tenants\/me$/ },
];

function tokenRoles(req: Request): string[] | null {
  const header = req.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  const part = header.slice(7).split(".")[1];
  if (!part) return null;
  try {
    const payload = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))) as { roles?: unknown; role?: unknown };
    if (Array.isArray(payload.roles)) return payload.roles.map(String);
    return typeof payload.role === "string" ? [payload.role] : [];
  } catch {
    return null;
  }
}

/** A refusal for a waiting account calling anything else, or null to carry on. */
export function membershipGate(req: Request, corsHdrs: Headers): Response | null {
  const { pathname } = new URL(req.url);
  const m = /^\/api\/v\d+\/(.+)$/.exec(pathname);
  if (!m) return null;
  const roles = tokenRoles(req);
  if (!roles || roles.length === 0 || !roles.every((r) => r === PENDING_ROLE)) return null;
  const rest = m[1].replace(/\/+$/, "");
  if (OPEN_FOR_PENDING.some((o) => (!o.method || o.method === req.method) && o.path.test(rest))) return null;
  return json({
    success: false,
    error: { code: "WAITING_FOR_APPROVAL", message: "The club's coaches need to let you in first. You'll get a message when they do." },
  }, 403, corsHdrs);
}
