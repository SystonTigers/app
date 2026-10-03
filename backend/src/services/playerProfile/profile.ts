/**
 * A player's page: name, number, position, their own bio, stats for each
 * season, photos and goal clips.
 *
 * Who sees what: everyone at the club sees the name, number, position, bio and
 * stats. Photos and goal clips are shown to staff and the player's own
 * family, and to everyone else only once a parent has said yes to photos
 * (`photo_consent`) or video (`video_consent`).
 */
import { hasAnyRole, type TenantClaims } from "../auth";
import { isStaff, linkedPlayerIds } from "../playerPrivacy";
import { seasonOptions } from "../seasons/range";
import { squadStats, type PlayerStatLine } from "../squadStats";
import { playerGoalClips, type GoalClip } from "./clips";

type Env = { DB: D1Database };

export interface SeasonLine {
  id: string;
  label: string;
  current: boolean;
  appearances: number;
  goals: number;
  assists: number;
  motm: number;
  yellowCards: number;
  redCards: number;
}

export interface PlayerProfile {
  player: { id: string; name: string; firstName: string; number: number | null; position: string | null; photo: string | null };
  bio: string | null;
  bioUpdatedAt: number | null;
  /** Only the player themselves writes their bio */
  canEditBio: boolean;
  /** Staff can take a bio down (but not write one) */
  canRemoveBio: boolean;
  career: Omit<SeasonLine, "id" | "label" | "current">;
  seasons: SeasonLine[];
  photos: Array<{ id: string; url: string; type: string }>;
  clips: GoalClip[];
  /** Why photos or clips aren't shown, for the page to say so */
  hidden: { photos: boolean; clips: boolean };
}

interface SquadRow {
  id: string; name: string; first_name: string | null; number: number | null; position: string | null; bio: string | null; bio_updated_at: number | null;
  headshot_url: string | null; photo_url: string | null; photo_consent: number | null; video_consent: number | null;
}

function line(s: PlayerStatLine | undefined): Omit<SeasonLine, "id" | "label" | "current"> {
  return {
    appearances: s?.appearances ?? 0, goals: s?.goals ?? 0, assists: s?.assists ?? 0, motm: s?.motmCount ?? 0,
    yellowCards: s?.yellowCards ?? 0, redCards: s?.redCards ?? 0,
  };
}

/** The player themselves: a "player" account linked to this squad entry. */
export async function isThePlayer(env: Env, claims: TenantClaims, playerId: string): Promise<boolean> {
  if (!hasAnyRole(claims, ["player"])) return false;
  return (await linkedPlayerIds(env, claims)).has(playerId);
}

export async function playerProfile(env: Env, claims: TenantClaims, playerId: string): Promise<PlayerProfile | null> {
  const row = await env.DB.prepare(
    `SELECT id, name, first_name, number, position, bio, bio_updated_at, headshot_url, photo_url, photo_consent, video_consent
     FROM squad WHERE tenant_id = ? AND id = ?`,
  ).bind(claims.tenantId, playerId).first<SquadRow>();
  if (!row) return null;

  const staff = isStaff(claims);
  const linked = (await linkedPlayerIds(env, claims)).has(playerId);
  const family = staff || linked;
  const showPhotos = family || row.photo_consent === 1;
  const showClips = family || row.video_consent === 1;

  const seasons = await seasonOptions(env, claims.tenantId);
  const [career, ...perSeason] = await Promise.all([
    squadStats(env, claims.tenantId, null, playerId),
    ...seasons.map((s) => squadStats(env, claims.tenantId, s, playerId)),
  ]);
  const seasonLines = seasons
    .map((s, i) => ({ id: s.id, label: s.label, current: s.current, ...line(perSeason[i][0]) }))
    // Seasons with nothing recorded are left out (the current one always shows)
    .filter((s) => s.current || s.appearances || s.goals || s.assists || s.motm || s.yellowCards || s.redCards);

  const { results: images } = showPhotos
    ? await env.DB.prepare(
      `SELECT id, image_url, image_type FROM player_images WHERE tenant_id = ? AND player_id = ? ORDER BY uploaded_at DESC LIMIT 60`,
    ).bind(claims.tenantId, playerId).all<{ id: string; image_url: string; image_type: string }>()
    : { results: [] };

  return {
    player: {
      id: row.id, name: row.name, firstName: row.first_name || row.name.split(/\s+/)[0] || row.name, number: row.number, position: row.position,
      photo: showPhotos ? row.headshot_url || row.photo_url || null : null,
    },
    bio: row.bio?.trim() || null,
    bioUpdatedAt: row.bio_updated_at ?? null,
    canEditBio: linked && hasAnyRole(claims, ["player"]),
    canRemoveBio: staff,
    career: line(career[0]),
    seasons: seasonLines,
    photos: (images ?? []).map((r) => ({ id: r.id, url: r.image_url, type: r.image_type })),
    clips: showClips ? await playerGoalClips(env, claims.tenantId, playerId) : [],
    hidden: { photos: !showPhotos, clips: !showClips },
  };
}
