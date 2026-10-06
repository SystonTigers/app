/** Club members list helpers. No react-native imports (tested in Node). */
import { roleLabel } from './roles';

export type MemberRole = 'owner' | 'admin' | 'manager' | 'coach' | 'player' | 'parent' | 'supporter';

export interface MemberLike {
  name: string;
  email: string;
  role: MemberRole;
}

export const ROLE_INFO: Record<MemberRole, { label: string; description: string }> = {
  owner: { label: roleLabel('owner'), description: 'Set up the club. Can do everything.' },
  admin: { label: roleLabel('admin'), description: 'Everything, including who does what.' },
  manager: { label: roleLabel('manager'), description: 'Match Centre, squad, fixtures, posts and settings.' },
  coach: { label: roleLabel('coach'), description: 'Match Centre, squad, fixtures and training.' },
  player: { label: roleLabel('player'), description: 'Sees the club, fixtures and their own stats.' },
  parent: { label: roleLabel('parent'), description: 'Sees the club and answers for their children.' },
  supporter: { label: roleLabel('supporter'), description: 'Follows the club: matches, results, MOTM votes, gallery and posts.' },
};

/** Roles a club admin can give (the owner stays the owner). */
export const ASSIGNABLE_ROLES: Exclude<MemberRole, 'owner'>[] = ['admin', 'manager', 'coach', 'player', 'parent', 'supporter'];

export type MemberFilter = 'all' | 'staff' | 'player' | 'parent' | 'supporter';

const STAFF: MemberRole[] = ['owner', 'admin', 'manager', 'coach'];

export function filterMembers<T extends MemberLike>(members: T[], filter: MemberFilter, query: string): T[] {
  const q = query.trim().toLowerCase();
  return members.filter((m) => {
    if (filter === 'staff' && !STAFF.includes(m.role)) return false;
    if (filter === 'player' && m.role !== 'player') return false;
    if (filter === 'parent' && m.role !== 'parent') return false;
    if (filter === 'supporter' && m.role !== 'supporter') return false;
    return !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });
}

/** Staff first (owner, admin, manager, coach), then everyone else, by name. */
export function sortMembers<T extends MemberLike>(members: T[]): T[] {
  const order: MemberRole[] = ['owner', 'admin', 'manager', 'coach', 'player', 'parent', 'supporter'];
  return [...members].sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role) || a.name.localeCompare(b.name));
}

/** "Signed in 3 days ago" / "Never signed in" */
export function lastSeen(ms: number | null, now = Date.now()): string {
  if (!ms) return 'Never signed in';
  const days = Math.floor((now - ms) / 86_400_000);
  if (days <= 0) return 'Signed in today';
  if (days === 1) return 'Signed in yesterday';
  if (days < 31) return `Signed in ${days} days ago`;
  return `Signed in ${new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

/** What a member's linked players mean: a player's own page, or a parent's children. */
export function linkedLabel(role: MemberRole, count: number): string {
  if (!count) return '';
  if (role === 'player') return 'Linked to their player page';
  return `${count} ${count === 1 ? 'child' : 'children'} linked`;
}

export function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
}

/** "Signed up today" / "Signed up 3 days ago", for people waiting to join. */
export function signedUpLabel(ms: number | null, now = Date.now()): string {
  return lastSeen(ms, now).replace(/^Signed in/, 'Signed up').replace(/^Never signed in$/, 'Just signed up');
}
