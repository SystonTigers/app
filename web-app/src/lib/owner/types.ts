/** Shapes returned by the backend's owner API (backend/src/services/owner/*). */

export interface OwnerMoney {
  monthlyRecurringPence: number;
  payingClubs: number;
  trialPipelinePence: number;
  byPlan: Array<{ plan: string; name: string; monthlyPence: number; active: number; trial: number }>;
  recorded30dPence: number;
  stripeConnected: boolean;
}

export interface OwnerOverview {
  clubs: { total: number; trial: number; active: number; suspended: number; cancelled: number; comped: number };
  newClubs30d: number;
  trialsEndingSoon: Array<{ id: string; name: string; trialEndsAt: number }>;
  members: number;
  players: number;
  liveMatches7d: number;
  money: OwnerMoney;
  recentSignups: Array<{ id: string; name: string; createdAt: number; plan: string; status: string }>;
}

export type ClubStatus = 'trial' | 'active' | 'suspended' | 'cancelled';

export interface OwnerClub {
  id: string;
  slug: string;
  name: string;
  ownerEmail: string;
  createdAt: number | null;
  plan: string;
  planName: string;
  monthlyPence: number;
  status: ClubStatus;
  comped: boolean;
  trialEndsAt: number | null;
  trialDaysLeft: number | null;
  subscriptionStatus: string | null;
  members: number;
  staff: number;
  players: number;
  lastActiveAt: number | null;
  liveMatches: number;
  youtube: boolean;
  facebook: boolean;
  instagram: boolean;
  color: string | null;
  badgeUrl: string | null;
}

export interface OwnerClubDetail extends OwnerClub {
  staffList: Array<{ email: string; roles: string[]; lastLoginAt: number | null }>;
  fixtures: { upcoming: number; played: number };
  consent: { answered: number; players: number };
  pushDevices: number;
  graphicsPack: string | null;
  unlockedPacks: string[];
  premiumPacks: Array<{ id: string; name: string }>;
  /** Premium packs the club's plan already includes (Pro) */
  planPacks: string[];
  history: Array<{ at: number; action: string; detail: string | null; by: string | null }>;
}

export interface OwnerMember {
  email: string;
  clubId: string;
  clubName: string;
  roles: string[];
  joinedAt: number | null;
  lastLoginAt: number | null;
}

export interface OwnerAuditEntry {
  at: number;
  clubId: string | null;
  clubName: string | null;
  action: string;
  detail: string | null;
  by: string | null;
}

export type OwnerAction =
  | { action: 'extend_trial'; days: number }
  | { action: 'set_plan'; plan: 'starter' | 'pro' }
  | { action: 'comp'; on: boolean }
  | { action: 'suspend' }
  | { action: 'reactivate' }
  | { action: 'graphics'; pack: string; on: boolean };
