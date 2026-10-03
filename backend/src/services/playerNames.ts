/**
 * A squad player's name from a form, import row or API body: first name and
 * surname (`firstName`/`lastName` or `first_name`/`last_name`), or a single
 * `name` split at the first space. Pure functions (tested in Node).
 */

export const MAX_NAME_PART = 40;

export interface PlayerName {
  first: string;
  /** null for a player known by one name */
  last: string | null;
  /** "first last", stored in squad.name */
  full: string;
}

function part(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

/**
 * The name to save, `null` when the body has no name fields at all (an edit
 * that leaves the name alone), or why it can't be saved.
 */
export function readPlayerName(body: Record<string, unknown>): PlayerName | null | { error: string } {
  // Older screens send `name` alongside empty first/last fields; only filled-in parts count
  const hasParts = ["firstName", "lastName", "first_name", "last_name"].some((k) => part(body[k]) !== "");
  let first: string;
  let last: string;
  if (hasParts) {
    first = part(body.firstName ?? body.first_name);
    last = part(body.lastName ?? body.last_name);
  } else if (body.name !== undefined) {
    const full = part(body.name);
    const space = full.indexOf(" ");
    first = space < 0 ? full : full.slice(0, space);
    last = space < 0 ? "" : full.slice(space + 1);
  } else {
    return null;
  }
  if (!first) return { error: "Enter the player's first name." };
  if (first.length > MAX_NAME_PART || last.length > MAX_NAME_PART) return { error: `Keep each name under ${MAX_NAME_PART} characters.` };
  return { first, last: last || null, full: last ? `${first} ${last}` : first };
}

