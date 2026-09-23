/** Turn a club name into a web address slug: "Riverside Rovers FC" -> "riverside-rovers-fc". */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Is this team name the club at this URL? ("Syston Tigers U16" matches "syston-tigers".) */
export function isClubTeam(teamName: string | undefined | null, clubSlug: string): boolean {
  if (!teamName || !clubSlug) return false;
  return squash(teamName).includes(squash(clubSlug));
}
