/**
 * How players appear to the public: the club's web page and its social media
 * posts. Each club chooses a name style and whether photos are shown
 * (tenants.public_name_style, tenants.public_photos). Logged-in club members
 * always see the normal team sheet; this only affects public output.
 */

export type NameStyle = "full" | "first_initial" | "initial_last";

export interface PublicNamePolicy {
  style: NameStyle;
  photos: boolean;
}

export const DEFAULT_NAME_POLICY: PublicNamePolicy = { style: "first_initial", photos: false };

export function isNameStyle(value: unknown): value is NameStyle {
  return value === "full" || value === "first_initial" || value === "initial_last";
}

// Match shorthand that can follow a scorer's name
const NOT_NAMES = new Set(["pen", "pens", "og", "fk", "hat", "trick"]);

function splitName(full: string): { first: string; last: string | null; extras: string[] } {
  const tokens = full.trim().split(/\s+/).filter(Boolean);
  const [first = "", ...rest] = tokens;
  const nameParts = rest.filter((t) => /^[\p{L}][\p{L}'’-]*$/u.test(t) && !NOT_NAMES.has(t.toLowerCase()));
  const extras = rest.filter((t) => !nameParts.includes(t));
  return { first, last: nameParts[nameParts.length - 1] ?? null, extras };
}

/** "Alfie James Smith" -> "Alfie S."; "Smith 2" stays "Smith 2"; extras like "(2)" or "pen" are kept. */
export function shortName(full: string): string {
  const { first, last, extras } = splitName(full);
  return [first, last ? `${last[0].toUpperCase()}.` : null, ...extras].filter(Boolean).join(" ");
}

/** "Alfie James Smith" -> "A. Smith". */
export function initialLastName(full: string): string {
  const { first, last, extras } = splitName(full);
  if (!last) return [first, ...extras].filter(Boolean).join(" ");
  return [`${first[0]?.toUpperCase() ?? ""}.`, last, ...extras].join(" ");
}

export function publicName(policy: PublicNamePolicy, full: string): string {
  switch (policy.style) {
    case "full": return full.trim();
    case "initial_last": return initialLastName(full);
    default: return shortName(full);
  }
}

export function publicPhoto<T>(policy: PublicNamePolicy, photo: T | null | undefined): T | undefined {
  return policy.photos ? (photo ?? undefined) : undefined;
}

/** Scorers are typed by staff, e.g. "Alfie Smith 2, Ben Jones". */
export function publicScorers(policy: PublicNamePolicy, scorers: string[] | undefined): string[] | undefined {
  if (!scorers || policy.style === "full") return scorers;
  return scorers.map((entry) => publicName(policy, entry));
}

export async function getPublicNamePolicy(env: { DB: D1Database }, tenantId: string): Promise<PublicNamePolicy> {
  const row = await env.DB.prepare(`SELECT public_name_style, public_photos FROM tenants WHERE id = ?`)
    .bind(tenantId).first<{ public_name_style: string | null; public_photos: number | null }>();
  return {
    style: isNameStyle(row?.public_name_style) ? row!.public_name_style as NameStyle : DEFAULT_NAME_POLICY.style,
    photos: row?.public_photos === 1,
  };
}
