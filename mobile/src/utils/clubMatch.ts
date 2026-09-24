const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Is this team name the current club? Fixture and league data often add an
 * age group ("Syston Tigers U16"), so match on the club's name or web address.
 */
export function isOurTeam(teamName: string | null | undefined, club: { name?: string; slug?: string } | null | undefined): boolean {
  if (!teamName || !club) return false;
  const team = squash(teamName);
  const name = club.name ? squash(club.name) : '';
  const slug = club.slug ? squash(club.slug) : '';
  return (!!name && (team.includes(name) || name.includes(team))) || (!!slug && team.includes(slug));
}
