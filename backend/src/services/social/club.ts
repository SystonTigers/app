/** A club's posting setup: branding, design pack, connections and choices. */
import { DEFAULT_PACK, getPack, packsIncludedWith, type Pack } from "../graphics/packs";
import { graphicPhotoSql } from "../consent";
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
  /** The club's own designs, if it has some (tenants.graphics_templates) */
  templateSet: string | null;
  unlockedPacks: string[];
  undoWindow: boolean;
  /** Leave the ground and kick-off time out of posts (tenants.social_hide_match_details) */
  hideMatchDetails: boolean;
  settings: EventSettings;
  connections: { facebook: { id: string; name: string | null } | null; instagram: { id: string; name: string | null } | null };
}

interface ClubRow {
  name: string;
  plan: string | null;
  social_undo_window: number;
  social_hide_match_details: number | null;
  social_events: string | null;
  graphics_pack: string | null;
  graphics_templates: string | null;
  sponsor_name: string | null;
  sponsor_logo_url: string | null;
  badge_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
}

export async function loadClubSocial(env: SocialEnv, tenantId: string): Promise<ClubSocial> {
  const [club, conns, unlocks] = await Promise.all([
    env.DB.prepare(
      `SELECT t.name, t.plan, t.social_undo_window, t.social_hide_match_details, t.social_events, t.graphics_pack, t.graphics_templates, t.sponsor_name, t.sponsor_logo_url,
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
  // Bought or given by the owner, plus everything the club's plan includes
  const unlockedPacks = [...new Set([...(unlocks.results || []).map((u) => u.pack_id), ...packsIncludedWith(club?.plan)])];
  const chosenPack = club?.graphics_pack || DEFAULT_PACK;
  const chosen = getPack(chosenPack);
  const templateSet = club?.graphics_templates ?? null;
  // Locked premium packs and other clubs' own designs fall back to the default
  const notOurs = chosen.templates && chosen.templates.id !== templateSet;
  const pack = (chosen.premium && !unlockedPacks.includes(chosen.id)) || notOurs ? getPack(DEFAULT_PACK) : chosen;
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
    templateSet,
    unlockedPacks,
    undoWindow: club?.social_undo_window !== 0,
    hideMatchDetails: club?.social_hide_match_details === 1,
    settings: parseEventSettings(club?.social_events),
    connections: { facebook: find("facebook"), instagram: find("instagram") },
  };
}

/** Squad name, shirt number and photo for a player (the photo is only used if the club allows photos). */
export async function postPerson(env: SocialEnv, tenantId: string, playerId: string | null, fallbackName: string | null): Promise<{ name: string; photoUrl: string | null; number: number | null } | null> {
  if (!playerId) return fallbackName ? { name: fallbackName, photoUrl: null, number: null } : null;
  const row = await env.DB.prepare(`SELECT name, number, ${graphicPhotoSql()} AS photo FROM squad WHERE tenant_id = ? AND id = ?`)
    .bind(tenantId, playerId).first<{ name: string; number: number | null; photo: string | null }>();
  if (!row) return fallbackName ? { name: fallbackName, photoUrl: null, number: null } : null;
  return { name: row.name, photoUrl: row.photo, number: typeof row.number === "number" ? row.number : null };
}

/** A fixture as it may appear in the club's posts: no ground or kick-off time if the club has chosen that. */
export function forPosting<T extends { time?: string | null; venue?: string | null }>(club: Pick<ClubSocial, "hideMatchDetails">, f: T): T {
  return club.hideMatchDetails ? { ...f, time: null, venue: null } : f;
}
