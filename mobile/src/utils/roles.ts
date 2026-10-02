/** Which app roles are club staff (the server checks again on every change). */
export type AppRole = 'admin' | 'manager' | 'coach' | 'player' | 'parent' | 'supporter';

const STAFF = ['admin', 'manager', 'coach', 'owner'];

export function isStaffRole(role: string | null | undefined): boolean {
  return !!role && STAFF.includes(role);
}

/**
 * The role used to decide what the menu shows: supporters see what parents
 * see (without anything about children).
 */
export function menuRole(role: string | null | undefined): string {
  if (!role) return 'player';
  return role === 'supporter' ? 'parent' : role;
}
