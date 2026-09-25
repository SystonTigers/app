/** A club's posting setup: branding, design pack, connections and choices. */
import { DEFAULT_PACK, getPack, type Pack } from "../graphics/packs";
import { safeColor } from "../graphics/text";
import type { Brand } from "../graphics/types";
import { parseEventSettings, type EventSettings } from "./content";
import type { MetaEnv } from "./meta";

export interface SocialEnv extends MetaEnv {
  DB: D1Database;
  R2_MEDIA?: R2Bucket;
  SOCIAL_TOKEN_KEY?: string;
  R2_PUBLIC_URL?: string;
  BACKEND_URL?: string;
  WORKER_BASE_URL?: string;
}

export interface ClubSocial {
  clubName: string;
  brand: Brand;
  /** The pack posts are drawn in (a premium pack only once unlocked) */
  pack: Pack;
  /** What the club picked, even if it's a locked premium pack */
  chosenPack: string;
  unlockedPacks: string[];
  undoWindow: boolean;
  settings: EventSettings;
  connections: { facebook: { id: string; name: string | null } | null; instagram: { id: string; name: string | null } | null };
}

interface ClubRow {
  name: string;
  social_undo_window: number;
  social_events: string | null;
  graphics_pack: string | null;
  sponsor_name: string | null;
  sponsor_logo_url: string | null;
  badge_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
}

export async function loadClubSocial(env: SocialEnv, tenantId: string): Promise<ClubSocial> {
  const [club, conns, unlocks] = await Promise.all([
    env.DB.prepare(
      `SELECT t.name, t.social_undo_window, t.social_events, t.graphics_pack, t.sponsor_name, t.sponsor_logo_url,
              b.badge_url, b.primary_color, b.secondary_color
       FROM tenants t LEFT JOIN tenant_brand b ON b.tenant_id = t.id WHERE t.id = ?`,
    ).bind(tenantId).first<ClubRow>(),
    env.DB.prepare(`SELECT platform, account_id, account_name FROM social_connections WHERE tenant_id = ?`)
      .bind(tenantId).all<{ platform: string; account_id: string; account_name: string | null }>(),
    env.DB.prepare(`SELECT pack_id FROM graphics_unlocks WHERE tenant_id = ?`).bind(tenantId).all<{ pack_id: string }>(),
  ]);
  const find = (p: string) => {
    const c = (conns.results || []).find((r) => r.platform === p);
    return c ? { id: c.account_id, name: c.account_name } : null;
  };
  const unlockedPacks = (unlocks.results || []).map((u) => u.pack_id);
  const chosenPack = club?.graphics_pack || DEFAULT_PACK;
  const chosen = getPack(chosenPack);
  const pack = chosen.premium && !unlockedPacks.includes(chosen.id) ? getPack(DEFAULT_PACK) : chosen;
  const clubName = club?.name ?? "Our club";
  return {
    clubName,
    brand: {
      clubName,
      primaryColor: safeColor(club?.primary_color, "#FFD21F"),
      secondaryColor: safeColor(club?.secondary_color, "#0B0B0C"),
      badgeUrl: club?.badge_url ?? null,
      sponsorName: club?.sponsor_name ?? null,
      sponsorLogoUrl: club?.sponsor_logo_url ?? null,
    },
    pack,
    chosenPack,
    unlockedPacks,
    undoWindow: club?.social_undo_window !== 0,
    settings: parseEventSettings(club?.social_events),
    connections: { facebook: find("facebook"), instagram: find("instagram") },
  };
}

/** Squad name and photo for a player (the photo is only used if the club allows photos). */
export async function postPerson(env: SocialEnv, tenantId: string, playerId: string | null, fallbackName: string | null): Promise<{ name: string; photoUrl: string | null } | null> {
  if (!playerId) return fallbackName ? { name: fallbackName, photoUrl: null } : null;
  const row = await env.DB.prepare(`SELECT name, COALESCE(headshot_url, photo_url) AS photo FROM squad WHERE tenant_id = ? AND id = ?`)
    .bind(tenantId, playerId).first<{ name: string; photo: string | null }>();
  if (!row) return fallbackName ? { name: fallbackName, photoUrl: null } : null;
  return { name: row.name, photoUrl: row.photo };
}
