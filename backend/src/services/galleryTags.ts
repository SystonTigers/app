/**
 * Players tagged in club gallery photos (`photo_players`). Staff set the tags;
 * gallery lists show who's in each photo and player pages show the photos a
 * player is tagged in (photo consent applies there, as for their own photos).
 */

type Env = { DB: D1Database };

export const MAX_TAGS = 30;

export interface TaggedPlayer { id: string; name: string }

/** The player ids from a request body, or why they can't be used. */
export function readTagIds(body: Record<string, unknown>): string[] | string {
  const ids = body.playerIds;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string" || !id || id.length > 100)) return "Choose players from the squad.";
  const unique = [...new Set(ids as string[])];
  if (unique.length > MAX_TAGS) return `Tag up to ${MAX_TAGS} players in one photo.`;
  return unique;
}

const marks = (n: number) => Array.from({ length: n }, () => "?").join(",");

/**
 * Replaces the photo's tags. Returns false if the photo isn't this club's,
 * or the first id that isn't in the squad.
 */
export async function setPhotoPlayers(env: Env, tenantId: string, photoId: string, playerIds: string[], now = Date.now()): Promise<true | false | { unknown: string }> {
  const photo = await env.DB.prepare(`SELECT id FROM photos WHERE id = ? AND tenant_id = ?`).bind(photoId, tenantId).first();
  if (!photo) return false;
  if (playerIds.length) {
    const { results } = await env.DB.prepare(`SELECT id FROM squad WHERE tenant_id = ? AND id IN (${marks(playerIds.length)})`)
      .bind(tenantId, ...playerIds).all<{ id: string }>();
    const found = new Set((results ?? []).map((r) => r.id));
    const missing = playerIds.find((id) => !found.has(id));
    if (missing) return { unknown: missing };
  }
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM photo_players WHERE tenant_id = ? AND photo_id = ?`).bind(tenantId, photoId),
    ...playerIds.map((playerId) =>
      env.DB.prepare(`INSERT INTO photo_players (tenant_id, photo_id, player_id, tagged_at) VALUES (?, ?, ?, ?)`).bind(tenantId, photoId, playerId, now)),
  ]);
  return true;
}

/** Who's tagged in each of these photos, A–Z (players removed from the squad drop out). */
export async function playersInPhotos(env: Env, tenantId: string, photoIds: string[]): Promise<Map<string, TaggedPlayer[]>> {
  const out = new Map<string, TaggedPlayer[]>();
  if (!photoIds.length) return out;
  // D1 allows 100 bound values per query
  for (let i = 0; i < photoIds.length; i += 90) {
    const chunk = photoIds.slice(i, i + 90);
    const { results } = await env.DB.prepare(
      `SELECT pp.photo_id, s.id, s.name FROM photo_players pp
       JOIN squad s ON s.id = pp.player_id AND s.tenant_id = pp.tenant_id
       WHERE pp.tenant_id = ? AND pp.photo_id IN (${marks(chunk.length)}) ORDER BY s.name`,
    ).bind(tenantId, ...chunk).all<{ photo_id: string; id: string; name: string }>();
    for (const r of results ?? []) {
      const list = out.get(r.photo_id) ?? [];
      list.push({ id: r.id, name: r.name });
      out.set(r.photo_id, list);
    }
  }
  return out;
}

/** Gallery photos a player is tagged in, newest first. */
export async function taggedPhotos(env: Env, tenantId: string, playerId: string, limit = 60): Promise<Array<{ id: string; url: string }>> {
  const { results } = await env.DB.prepare(
    `SELECT p.id, p.url FROM photo_players pp JOIN photos p ON p.id = pp.photo_id AND p.tenant_id = pp.tenant_id
     WHERE pp.tenant_id = ? AND pp.player_id = ? ORDER BY p.uploaded_at DESC LIMIT ?`,
  ).bind(tenantId, playerId, limit).all<{ id: string; url: string }>();
  return results ?? [];
}

/** Removes the tags on photos being deleted. */
export function removeTagsStatement(env: Env, tenantId: string, where: { photoId: string } | { albumId: string }): D1PreparedStatement {
  return "photoId" in where
    ? env.DB.prepare(`DELETE FROM photo_players WHERE tenant_id = ? AND photo_id = ?`).bind(tenantId, where.photoId)
    : env.DB.prepare(`DELETE FROM photo_players WHERE tenant_id = ? AND photo_id IN (SELECT id FROM photos WHERE album_id = ? AND tenant_id = ?)`).bind(tenantId, where.albumId, tenantId);
}
