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
