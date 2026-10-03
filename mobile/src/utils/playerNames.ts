/**
 * Players' first names and surnames. Players saved before the two fields
 * existed only have `name`: the first word is the first name and the rest the
 * surname, until staff save them again. No react-native imports.
 */

export interface NamedPlayer {
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export function namePartsOf(p: NamedPlayer): { first: string; last: string } {
  if (p.first_name) return { first: p.first_name, last: p.last_name ?? '' };
  const full = (p.name ?? '').replace(/\s+/g, ' ').trim();
  const space = full.indexOf(' ');
  return space < 0 ? { first: full, last: '' } : { first: full.slice(0, space), last: full.slice(space + 1) };
}

/** "Sam Smith" -> "SS"; "Mary Jane" + "Watson" -> "MW" */
export function playerInitials(p: NamedPlayer): string {
  const { first, last } = namePartsOf(p);
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || '?';
}

/**
 * A shirt number to show, or null when there isn't one (missing, blank, 0 or
 * placeholders like "--"), so screens never show "#0" or a lone "#".
 */
export function shirtNumber(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim().replace(/^#/, '');
  if (!/^\d{1,3}$/.test(s) || Number(s) === 0) return null;
  return String(Number(s));
}
