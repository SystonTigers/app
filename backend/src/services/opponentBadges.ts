/**
 * Opponent badges for graphics. Clubs manage these on the website's
 * Opponents page (routes/opponents.ts); a club's own upload wins over the
 * shared badge library.
 */

/** "Hillside FC" and "hillside" match the same opponent. */
export function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\b(fc|f\.c\.|afc|a\.f\.c\.|football club|united|town|city)\b/gi, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
}

/**
 * The badge to show for an opponent, or null. Also adds the opponent to the
 * club's Opponents list (once) so staff can see who still needs a badge.
 */
export async function opponentBadgeUrl(env: { DB: D1Database }, tenantId: string, teamName: string): Promise<string | null> {
  const normalized = normalizeTeamName(teamName);
  if (!normalized) return null;
  const row = await env.DB.prepare(
    `SELECT COALESCE(ot.custom_badge_url, bl.badge_url) AS url
     FROM opponent_teams ot LEFT JOIN badge_library bl ON bl.id = ot.badge_library_id
     WHERE ot.tenant_id = ? AND ot.normalized_name = ?`,
  ).bind(tenantId, normalized).first<{ url: string | null }>();
  if (row) return row.url;
  await env.DB.prepare(
    `INSERT OR IGNORE INTO opponent_teams (id, tenant_id, team_name, normalized_name, status, first_seen_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'pending', unixepoch(), unixepoch(), unixepoch())`,
  ).bind(crypto.randomUUID(), tenantId, teamName.trim(), normalized).run();
  return null;
}
