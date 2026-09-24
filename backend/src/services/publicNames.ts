/**
 * How players appear on a club's public (logged-out) pages.
 *
 * By default public pages show first name and surname initial ("Alfie S.")
 * and no photos. A club can choose to show full names and photos
 * (tenants.public_full_names = 1). Logged-in club members always see the
 * normal team sheet; this only affects /public routes.
 */

export interface PublicNamePolicy {
  fullNames: boolean;
}

// Match shorthand that can follow a scorer's name
const NOT_NAMES = new Set(["pen", "pens", "og", "x2", "x3", "fk", "hat", "trick"]);

/** "Alfie James Smith" -> "Alfie S."; "Smith 2" stays "Smith 2"; extra tokens like "(2)" or "pen" are kept. */
export function shortName(full: string): string {
  const tokens = full.trim().split(/\s+/).filter(Boolean);
  if (tokens.length <= 1) return tokens[0] ?? "";
  const [first, ...rest] = tokens;
  const nameParts = rest.filter((t) => /^[\p{L}][\p{L}'’-]*$/u.test(t) && !NOT_NAMES.has(t.toLowerCase()));
  const others = rest.filter((t) => !nameParts.includes(t));
  const last = nameParts[nameParts.length - 1];
  return [first, last ? `${last[0].toUpperCase()}.` : null, ...others].filter(Boolean).join(" ");
}

export function publicName(policy: PublicNamePolicy, full: string): string {
  return policy.fullNames ? full : shortName(full);
}

export function publicPhoto<T>(policy: PublicNamePolicy, photo: T | null | undefined): T | undefined {
  return policy.fullNames ? (photo ?? undefined) : undefined;
}

/** Scorers are typed by staff, e.g. "Alfie Smith 2, Ben Jones". */
export function publicScorers(policy: PublicNamePolicy, scorers: string[] | undefined): string[] | undefined {
  if (!scorers || policy.fullNames) return scorers;
  return scorers.map((entry) => shortName(entry));
}

export async function getPublicNamePolicy(env: { DB: D1Database }, tenantId: string): Promise<PublicNamePolicy> {
  const row = await env.DB.prepare(`SELECT public_full_names FROM tenants WHERE id = ?`)
    .bind(tenantId).first<{ public_full_names: number | null }>();
  return { fullNames: row?.public_full_names === 1 };
}
