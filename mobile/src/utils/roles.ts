/** Which app roles are club staff (the server checks again on every change). No react-native imports. */
export type AppRole = 'admin' | 'manager' | 'coach' | 'player' | 'parent' | 'supporter';

/** The role someone actually has at the club, as People & Roles shows it. */
export type ClubRole = 'owner' | 'admin' | 'manager' | 'coach' | 'player' | 'parent' | 'supporter';

const STAFF = ['admin', 'manager', 'coach', 'owner'];
const ADMINS = ['admin', 'owner'];

export function isStaffRole(role: string | null | undefined): boolean {
  return !!role && STAFF.includes(role);
}

/**
 * Club admins (the app's `admin` role also covers owners and managers, because
 * the server gives them the same rights in the app).
 */
export function isAdminRole(role: string | null | undefined): boolean {
  return !!role && ADMINS.includes(role);
}

/**
 * The role used to decide what the menu shows: supporters see what parents
 * see (without anything about children).
 */
export function menuRole(role: string | null | undefined): string {
  if (!role) return 'player';
  return role === 'supporter' ? 'parent' : role;
}

const SENIORITY: ClubRole[] = ['owner', 'admin', 'manager', 'coach', 'player', 'parent', 'supporter'];
const ALIASES: Record<string, ClubRole> = { tenant_admin: 'admin', platform_admin: 'admin' };

/** The most senior role in the server's roles list ("owner" beats "admin"), or null. */
export function clubRoleFromRoles(roles: unknown): ClubRole | null {
  if (!Array.isArray(roles)) return null;
  const known = roles
    .map((r) => (typeof r === 'string' ? ALIASES[r] ?? r : ''))
    .filter((r): r is ClubRole => (SENIORITY as string[]).includes(r));
  if (!known.length) return null;
  return known.sort((a, b) => SENIORITY.indexOf(a) - SENIORITY.indexOf(b))[0];
}

const LABELS: Record<ClubRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  coach: 'Coach',
  player: 'Player',
  parent: 'Parent',
  supporter: 'Supporter',
};

/** "Owner", "Coach"... for any role the app or server uses; "Member" when unknown. */
export function roleLabel(role: string | null | undefined): string {
  if (!role) return 'Member';
  const r = ALIASES[role] ?? role;
  return (LABELS as Record<string, string>)[r] ?? 'Member';
}

/**
 * Photo & video consent is for parents (their children) and players (themselves);
 * supporters have no one to answer for. Staff see it to check their own family.
 */
export function seesConsent(role: string | null | undefined): boolean {
  return role !== 'supporter';
}
