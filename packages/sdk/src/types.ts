// packages/sdk/src/types.ts
// Shared TypeScript types for the team platform API

/**
 * Brand Kit - White-label branding information
 */
export interface BrandKit {
  primaryColor: string;
  secondaryColor: string;
  onPrimary?: string;
  onSecondary?: string;
  clubBadge?: string;
  sponsorLogos?: string[];
  clubName?: string;
  clubShortName?: string;
}

/**
 * Fixture/Match
 */
export interface Fixture {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time?: string;
  venue?: string;
  competition?: string;
  status: 'scheduled' | 'live' | 'completed' | 'postponed' | 'cancelled';
  homeScore?: number;
  awayScore?: number;
}

/**
 * Result (completed match)
 */
export interface Result extends Fixture {
  status: 'completed';
  homeScore: number;
  awayScore: number;
  scorers?: string[];
  cards?: {
    yellow?: string[];
    red?: string[];
  };
}

/**
 * League Table Row
 */
export interface LeagueTableRow {
  position: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

/**
 * Player
 */
export interface Player {
  id: string;
  name: string;
  number?: number;
  position: string;
  photo?: string;
  stats?: {
    appearances?: number;
    goals?: number;
    assists?: number;
    yellowCards?: number;
    redCards?: number;
  };
}

/**
 * Team Stats
 */
export interface TeamStats {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
  topScorer?: {
    name: string;
    goals: number;
  };
}

/**
 * News Feed Post
 */
export interface FeedPost {
  id: string;
  content: string;
  author?: string;
  timestamp: string;
  channels?: {
    app_feed?: boolean;
    twitter?: boolean;
    instagram?: boolean;
    facebook?: boolean;
  };
  media?: string[];
  likes?: number;
  comments?: number;
}

/**
 * Event
 */
export interface Event {
  id: string;
  title: string;
  description?: string;
  type: 'match' | 'training' | 'social' | 'meeting' | 'other';
  startDate: string;
  endDate?: string;
  location?: string;
  rsvps?: {
    going: number;
    maybe: number;
    notGoing: number;
  };
}

/**
 * Live Event/Update
 */
export interface LiveEvent {
  id: string;
  matchId?: string;
  type: 'goal' | 'card' | 'substitution' | 'kickoff' | 'halftime' | 'fulltime' | 'injury' | 'other';
  minute?: number;
  player?: string;
  description: string;
  timestamp: string;
}

/**
 * Push Notification Registration
 */
export interface PushToken {
  token: string;
  platform: 'ios' | 'android' | 'web';
  userId?: string;
}

/**
 * Usage Stats
 */
export interface UsageStats {
  makeCallsRemaining?: number;
  makeCallsUsed?: number;
  makeCallsLimit?: number;
  storageUsed?: number;
  storageLimit?: number;
}

/**
 * Tenant Configuration
 */
export interface TenantConfig {
  id: string;
  name: string;
  shortName: string;
  branding: BrandKit;
  featureFlags?: {
    enableGallery?: boolean;
    enableShop?: boolean;
    enablePayments?: boolean;
    enableHighlights?: boolean;
    enableMOTMVoting?: boolean;
    enableTrainingPlans?: boolean;
    enableAwards?: boolean;
  };
}

/**
 * API Response Wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
