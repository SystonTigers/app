/**
 * Players' first names and surnames. Players saved before the two fields
 * existed only have `name`: the first word is the first name and the rest the
 * surname, until staff save them again (same rule as the app and server).
 */
export interface NamedPlayer {
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
}

export function namePartsOf(p: NamedPlayer): { first_name: string; last_name: string } {
    if (p.first_name) return { first_name: p.first_name, last_name: p.last_name ?? '' };
    const full = (p.name ?? '').replace(/\s+/g, ' ').trim();
    const space = full.indexOf(' ');
    return space < 0 ? { first_name: full, last_name: '' } : { first_name: full.slice(0, space), last_name: full.slice(space + 1) };
}

/** The full name kept in `name`: "first last". */
export function fullName(first: string, last: string): string {
    return [first.trim(), last.trim()].filter(Boolean).join(' ');
}
