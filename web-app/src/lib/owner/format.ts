/** Display helpers for the owner panel (UK formats; dates and money go through lib/format). */
import { formatDate } from '@/lib/format';

/** "Just now", "5 min ago", "3 days ago", or the date when older than a month. */
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
  return formatDate(ms);
}

export function trialText(daysLeft: number | null): string {
  if (daysLeft === null) return '';
  if (daysLeft < 0) return `Trial ended ${-daysLeft} day${daysLeft === -1 ? '' : 's'} ago`;
  if (daysLeft === 0) return 'Trial ends today';
  return `${daysLeft} day${daysLeft === 1 ? '' : 's'} of trial left`;
}

const ROLE_NAMES: Record<string, string> = {
  owner: 'Owner',
  tenant_admin: 'Admin',
  admin: 'Admin',
  manager: 'Manager',
  coach: 'Coach',
  parent: 'Parent',
  player: 'Player',
  supporter: 'Supporter',
  member: 'Member',
};

/** "Owner, Admin". tenant_member is every account's base role, so it only shows when there's nothing else. */
export function rolesText(roles: string[]): string {
  const names = Array.from(new Set(roles.filter((r) => r !== 'tenant_member').map((r) => ROLE_NAMES[r] ?? r)));
  return names.join(', ') || 'Member';
}

const PAYMENT_STATUS: Record<string, string> = {
  trialing: 'On trial',
  trial: 'On trial',
  active: 'Paying',
  past_due: 'Payment overdue',
  unpaid: 'Unpaid',
  canceled: 'Cancelled',
  cancelled: 'Cancelled',
  incomplete: 'Not finished',
  incomplete_expired: 'Never finished',
  paused: 'Paused',
};

/** The billing status in words ("trialing" -> "On trial"). */
export function paymentText(status: string | null): string {
  if (!status) return 'Not set up';
  return PAYMENT_STATUS[status] ?? status.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}
