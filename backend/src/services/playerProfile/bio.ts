/**
 * Player bios: written by the player themselves. To keep young players safe,
 * a bio can't include links, email addresses, phone numbers or social media
 * handles. Pure functions (tested in Node).
 */

export const MAX_BIO = 400;

const CONTACT_RULES: RegExp[] = [
  /https?:\/\//i,
  /\bwww\./i,
  /\b[\w-]+\.(com|co\.uk|uk|net|org|io|me|tv|app|link|ly)\b/i,
  /[\w.+-]+@[\w-]+\.[\w.]+/,
  /(^|\s)@[\w.]{2,}/,
  /(\+?\d[\s-]?){9,}/,
  /\b(snap(chat)?|insta(gram)?|tik ?tok|whats ?app|discord|telegram)\s*[:@-]/i,
];

/** The bio to save ("" removes it), or why it can't be saved. */
export function readBio(raw: unknown): { bio: string } | { error: string } {
  if (typeof raw !== "string") return { error: "Write something about yourself, or leave it empty to remove your bio." };
  const bio = raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n").map((l) => l.trim()).join("\n")
    .trim();
  if (bio.length > MAX_BIO) return { error: `Keep it under ${MAX_BIO} characters (that's ${bio.length}).` };
  if (CONTACT_RULES.some((rule) => rule.test(bio))) {
    return { error: "To keep everyone safe, bios can't include links, email addresses, phone numbers or social media names." };
  }
  return { bio };
}
