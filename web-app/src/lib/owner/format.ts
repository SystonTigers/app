/** Display helpers for the owner panel (UK formats). */

export function pounds(pence: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: pence % 100 ? 2 : 0 }).format(pence / 100);
}

export function shortDate(ms: number | null | undefined): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function dateTime(ms: number | null | undefined): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** "just now", "5 min ago", "3 days ago", or the date when older than a month. */
export function ago(ms: number | null | undefined, now = Date.now()): string {
  if (!ms) return 'Never';
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return 'Just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  if (d < 31) return `${d} day${d === 1 ? '' : 's'} ago`;
  return shortDate(ms);
}

export function trialText(daysLeft: number | null): string {
  if (daysLeft === null) return '';
  if (daysLeft < 0) return `Trial ended ${-daysLeft} day${daysLeft === -1 ? '' : 's'} ago`;
  if (daysLeft === 0) return 'Trial ends today';
  return `${daysLeft} day${daysLeft === 1 ? '' : 's'} of trial left`;
}

const ROLE_NAMES: Record<string, string> = {
  owner: 'Owner', tenant_admin: 'Admin', admin: 'Admin', manager: 'Manager', coach: 'Coach', parent: 'Parent', player: 'Player', member: 'Member',
};

export function rolesText(roles: string[]): string {
  const names = Array.from(new Set(roles.map((r) => ROLE_NAMES[r] ?? r)));
  return names.join(', ') || 'Member';
}
