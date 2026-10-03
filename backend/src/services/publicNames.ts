/**
 * How players appear to the public: the club's web page and its social media
 * posts. Each club chooses a name style and whether photos are shown
 * (tenants.public_name_style, tenants.public_photos). Logged-in club members
 * always see the normal team sheet; this only affects public output.
 */

/** "Sam Smith" | "Sam S." | "S. Smith" | "Sam" | "Smith" */
export const NAME_STYLES = ["full", "first_initial", "initial_last", "first", "last"] as const;
export type NameStyle = (typeof NAME_STYLES)[number];

/** A squad player's name as staff entered it: "Mary Jane" + "Van Dijk". */
export interface NameParts {
  first: string;
  last: string | null;
}

export interface PublicNamePolicy {
  style: NameStyle;
  photos: boolean;
  /**
   * The club's players by full name (see nameKey), so two-word first names
   * and surnames split where staff split them. Names not found here are split
   * at the first space and the last word.
   */
  names?: Map<string, NameParts>;
}

export const DEFAULT_NAME_POLICY: PublicNamePolicy = { style: "first_initial", photos: false };

export function isNameStyle(value: unknown): value is NameStyle {
  return typeof value === "string" && (NAME_STYLES as readonly string[]).includes(value);
}

// Match shorthand that can follow a scorer's name
const NOT_NAMES = new Set(["pen", "pens", "og", "fk", "hat", "trick"]);

/** "  Mary  JANE watson " -> "mary jane watson" */
export function nameKey(full: string): string {
  return full.trim().replace(/\s+/g, " ").toLowerCase();
}

const NAME_WORD = /^[\p{L}][\p{L}'’.-]*$/u;

function splitName(full: string, names?: Map<string, NameParts>): { first: string; last: string | null; extras: string[] } {
  const tokens = full.trim().split(/\s+/).filter(Boolean);
  if (names?.size) {
    // The name is the leading words; anything after ("2", "pen", "(og)") is kept as extras
    let n = tokens.length;
    while (n > 0 && (!NAME_WORD.test(tokens[n - 1]) || NOT_NAMES.has(tokens[n - 1].toLowerCase()))) n--;
    const known = names.get(nameKey(tokens.slice(0, n).join(" ")));
    if (known) return { first: known.first, last: known.last, extras: tokens.slice(n) };
  }
  const [first = "", ...rest] = tokens;
  const nameParts = rest.filter((t) => /^[\p{L}][\p{L}'’-]*$/u.test(t) && !NOT_NAMES.has(t.toLowerCase()));
  const extras = rest.filter((t) => !nameParts.includes(t));
  return { first, last: nameParts[nameParts.length - 1] ?? null, extras };
}

/** "Alfie James Smith" -> "Alfie S."; "Smith 2" stays "Smith 2"; extras like "(2)" or "pen" are kept. */
export function shortName(full: string, names?: Map<string, NameParts>): string {
  const { first, last, extras } = splitName(full, names);
  return [first, last ? `${last[0].toUpperCase()}.` : null, ...extras].filter(Boolean).join(" ");
}

/** "Alfie James Smith" -> "A. Smith". */
export function initialLastName(full: string, names?: Map<string, NameParts>): string {
  const { first, last, extras } = splitName(full, names);
  if (!last) return [first, ...extras].filter(Boolean).join(" ");
  return [`${first[0]?.toUpperCase() ?? ""}.`, last, ...extras].join(" ");
}

/** "Alfie James Smith" -> "Alfie"; extras like "2" or "pen" are kept. */
export function firstName(full: string, names?: Map<string, NameParts>): string {
  const { first, extras } = splitName(full, names);
  return [first, ...extras].filter(Boolean).join(" ");
}

/** "Alfie James Smith" -> "Smith" (just the first name when there's no surname). */
export function lastName(full: string, names?: Map<string, NameParts>): string {
  const { first, last, extras } = splitName(full, names);
  return [last ?? first, ...extras].filter(Boolean).join(" ");
}

export function publicName(policy: PublicNamePolicy, full: string): string {
  switch (policy.style) {
    case "full": return full.trim();
    case "initial_last": return initialLastName(full, policy.names);
    case "first": return firstName(full, policy.names);
    case "last": return lastName(full, policy.names);
    default: return shortName(full, policy.names);
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
  const [row, squad] = await Promise.all([
    env.DB.prepare(`SELECT public_name_style, public_photos FROM tenants WHERE id = ?`)
      .bind(tenantId).first<{ public_name_style: string | null; public_photos: number | null }>(),
    env.DB.prepare(`SELECT name, first_name, last_name FROM squad WHERE tenant_id = ? AND first_name IS NOT NULL`)
      .bind(tenantId).all<{ name: string; first_name: string; last_name: string | null }>(),
  ]);
  const names = new Map<string, NameParts>();
  for (const p of squad.results ?? []) names.set(nameKey(p.name), { first: p.first_name, last: p.last_name || null });
  return {
    style: isNameStyle(row?.public_name_style) ? row!.public_name_style as NameStyle : DEFAULT_NAME_POLICY.style,
    photos: row?.public_photos === 1,
    names,
  };
}
