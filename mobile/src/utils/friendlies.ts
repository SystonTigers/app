/**
 * Friendlies board helpers (Manager zone → Friendlies). No react-native
 * imports (node test/friendlies.test.js). Same words as the website.
 */

export interface FriendlyPost {
  id: string; team_name: string; team_display_name?: string | null; location_pref: string; age_group: string | null;
  kit_colors: string | null; max_travel_miles: number | null; pitch_type: string | null; notes: string | null;
  badge_url?: string | null; pending_count?: number; status: string;
}

export interface FriendlyOffer {
  id: string; requester_team_name: string; requester_display_name?: string | null; requester_badge_url?: string | null;
  host_team_name?: string | null; proposed_date: string | null; message: string | null; status: string;
}

export type FriendliesTab = 'browse' | 'mine' | 'inbox' | 'sent';

export const TABS: Array<{ id: FriendliesTab; label: string }> = [
  { id: 'browse', label: 'Find a game' }, { id: 'mine', label: 'Our posts' }, { id: 'inbox', label: 'Offers' }, { id: 'sent', label: 'Sent' },
];

export const WHERE: Record<string, string> = { home: 'Home', away: 'Away', neutral: 'Neutral ground', any: 'Home or away' };
export const PITCH: Record<string, string> = { grass: 'Grass', '3g': '3G', '4g': '4G' };
export const AGE_GROUPS = ['U7', 'U8', 'U9', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U18', 'Adult'];
export const STATUS: Record<string, string> = { open: 'Open', matched: 'Matched', pending: 'Waiting for a reply', accepted: 'Accepted', declined: 'Declined' };

export const blankPost = () => ({ age_group: '', location_pref: 'any', kit_colors: '', max_travel_miles: '30', pitch_type: 'any', notes: '' });

/** The little tags under a club's name. */
export function postTags(p: Pick<FriendlyPost, 'age_group' | 'location_pref' | 'max_travel_miles' | 'pitch_type' | 'kit_colors'>): string[] {
  const tags: string[] = [];
  if (p.age_group) tags.push(p.age_group);
  tags.push(WHERE[p.location_pref] ?? p.location_pref);
  if (p.max_travel_miles) tags.push(`Up to ${p.max_travel_miles} miles`);
  if (p.pitch_type && PITCH[p.pitch_type]) tags.push(PITCH[p.pitch_type]);
  if (p.kit_colors) tags.push(`Kit: ${p.kit_colors}`);
  return tags;
}

/** What to send for a new post, or what's missing. */
export function postBody(form: ReturnType<typeof blankPost>): Record<string, unknown> | string {
  if (!form.age_group) return 'Pick the age group.';
  const miles = Number(form.max_travel_miles);
  return {
    preferred_dates: [],
    location_pref: form.location_pref,
    age_group: form.age_group,
    kit_colors: form.kit_colors.trim(),
    max_travel_miles: Number.isFinite(miles) && miles > 0 ? Math.min(Math.round(miles), 500) : null,
    pitch_type: form.pitch_type,
    notes: form.notes.trim(),
  };
}

export const clubName = (p: { team_display_name?: string | null; team_name?: string }) => p.team_display_name || p.team_name || 'A club';
