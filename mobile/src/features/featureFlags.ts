import { FeatureFlags, PlanFeatures } from './types';

// Default feature flags (all disabled)
export const DEFAULT_FEATURES: FeatureFlags = {
  // Core features
  chat: false,
  gallery: false,
  shop: false,
  training: false,
  highlights: false,

  // Match features
  liveMatchUpdates: false,
  matchDayNotifications: false,
  motmVoting: false,
  playerStats: false,

  // Social features
  newsFeeds: false,
  socialSharing: false,
  comments: false,

  // Event features
  eventRsvp: false,
  eventCheckin: false,
  calendarExport: false,

  // Team features
  teamInvites: false,
  roleManagement: false,
  squadManagement: false,

  // Payment features
  payments: false,
  subscriptions: false,

  // Graphics/Media features
  autoGraphics: false,
  videoHighlights: false,
  videoRecording: false,

  // Notifications
  pushNotifications: false,
  geoFencing: false,

  // Admin features
  adminPanel: false,
  analytics: false,

  // Experimental features
  offlineMode: false,
  betaFeatures: false,
};

// Free plan features
export const FREE_PLAN: PlanFeatures = {
  plan: 'free',
  features: {
    eventRsvp: true,
    calendarExport: true,
    newsFeeds: true,
    playerStats: true,
    squadManagement: true,
  },
  limits: {
    maxEvents: 10,
    maxPlayers: 20,
    maxStorage: 100, // 100MB
    maxMonthlyGraphics: 0,
    maxMonthlyNotifications: 0,
  },
};

// Starter plan features
export const STARTER_PLAN: PlanFeatures = {
  plan: 'starter',
  features: {
    // All free features
    ...FREE_PLAN.features,

    // Additional starter features
    liveMatchUpdates: true,
    matchDayNotifications: true,
    motmVoting: true,
    socialSharing: true,
    eventCheckin: true,
    teamInvites: true,
    roleManagement: true,
    pushNotifications: true,
    autoGraphics: true,
  },
  limits: {
    maxEvents: 50,
    maxPlayers: 50,
    maxStorage: 500, // 500MB
    maxMonthlyGraphics: 100,
    maxMonthlyNotifications: 500,
  },
};

// Premium plan features
export const PREMIUM_PLAN: PlanFeatures = {
  plan: 'premium',
  features: {
    // All starter features
    ...STARTER_PLAN.features,

    // Additional premium features
    chat: true,
    gallery: true,
    training: true,
    highlights: true,
    comments: true,
    geoFencing: true,
    videoHighlights: true,
    videoRecording: true,
    analytics: true,
  },
  limits: {
    maxEvents: 200,
    maxPlayers: 100,
    maxStorage: 2000, // 2GB
    maxMonthlyGraphics: 500,
    maxMonthlyNotifications: 2000,
  },
};

// Enterprise plan features
export const ENTERPRISE_PLAN: PlanFeatures = {
  plan: 'enterprise',
  features: {
    // All premium features
    ...PREMIUM_PLAN.features,

    // Additional enterprise features
    shop: true,
    payments: true,
    subscriptions: true,
    adminPanel: true,
    offlineMode: true,
  },
  limits: {
    maxEvents: undefined, // unlimited
    maxPlayers: undefined, // unlimited
    maxStorage: undefined, // unlimited
    maxMonthlyGraphics: undefined, // unlimited
    maxMonthlyNotifications: undefined, // unlimited
  },
};

// Get plan features by plan name
export const getPlanFeatures = (plan: PlanFeatures['plan']): PlanFeatures => {
  switch (plan) {
    case 'free':
      return FREE_PLAN;
    case 'starter':
      return STARTER_PLAN;
    case 'premium':
      return PREMIUM_PLAN;
    case 'enterprise':
      return ENTERPRISE_PLAN;
    default:
      return FREE_PLAN;
  }
};

// Merge features with defaults
export const mergeFeatures = (
  planFeatures: Partial<FeatureFlags>,
  customFeatures?: Partial<FeatureFlags>
): FeatureFlags => {
  return {
    ...DEFAULT_FEATURES,
    ...planFeatures,
    ...customFeatures,
  };
};

// Check if feature is available in plan
export const isPlanFeatureAvailable = (
  plan: PlanFeatures['plan'],
  feature: keyof FeatureFlags
): boolean => {
  const planFeatures = getPlanFeatures(plan);
  return planFeatures.features[feature] === true;
};

// Feature categories for UI grouping
export const FEATURE_CATEGORIES = {
  core: ['chat', 'gallery', 'shop', 'training', 'highlights'] as Array<keyof FeatureFlags>,
  match: ['liveMatchUpdates', 'matchDayNotifications', 'motmVoting', 'playerStats'] as Array<keyof FeatureFlags>,
  social: ['newsFeeds', 'socialSharing', 'comments'] as Array<keyof FeatureFlags>,
  events: ['eventRsvp', 'eventCheckin', 'calendarExport'] as Array<keyof FeatureFlags>,
  team: ['teamInvites', 'roleManagement', 'squadManagement'] as Array<keyof FeatureFlags>,
  payments: ['payments', 'subscriptions'] as Array<keyof FeatureFlags>,
  media: ['autoGraphics', 'videoHighlights', 'videoRecording'] as Array<keyof FeatureFlags>,
  notifications: ['pushNotifications', 'geoFencing'] as Array<keyof FeatureFlags>,
  admin: ['adminPanel', 'analytics'] as Array<keyof FeatureFlags>,
  experimental: ['offlineMode', 'betaFeatures'] as Array<keyof FeatureFlags>,
};

// Feature display names
export const FEATURE_NAMES: Record<keyof FeatureFlags, string> = {
  chat: 'Team Chat',
  gallery: 'Photo Gallery',
  shop: 'Team Store',
  training: 'Training Tools',
  highlights: 'Match Highlights',
  liveMatchUpdates: 'Live Match Updates',
  matchDayNotifications: 'Match Day Notifications',
  motmVoting: 'Man of the Match Voting',
  playerStats: 'Player Statistics',
  newsFeeds: 'News Feed',
  socialSharing: 'Social Media Sharing',
  comments: 'Comments',
  eventRsvp: 'Event RSVP',
  eventCheckin: 'Event Check-in',
  calendarExport: 'Calendar Export',
  teamInvites: 'Team Invites',
  roleManagement: 'Role Management',
  squadManagement: 'Squad Management',
  payments: 'Payments',
  subscriptions: 'Subscriptions',
  autoGraphics: 'Automatic Graphics',
  videoHighlights: 'Video Highlights',
  videoRecording: 'Video Recording',
  pushNotifications: 'Push Notifications',
  geoFencing: 'Smart Geo-fencing',
  adminPanel: 'Admin Panel',
  analytics: 'Analytics',
  offlineMode: 'Offline Mode',
  betaFeatures: 'Beta Features',
};

// Feature descriptions
export const FEATURE_DESCRIPTIONS: Record<keyof FeatureFlags, string> = {
  chat: 'Real-time team messaging and communication',
  gallery: 'Share and organize team photos',
  shop: 'Sell team merchandise and apparel',
  training: 'Access training drills and session planning',
  highlights: 'AI-powered match highlight generation',
  liveMatchUpdates: 'Real-time match scores and events',
  matchDayNotifications: 'Get notified about upcoming matches',
  motmVoting: 'Vote for man of the match after games',
  playerStats: 'Track individual player performance',
  newsFeeds: 'Stay updated with team news',
  socialSharing: 'Share content to social media',
  comments: 'Comment on posts and updates',
  eventRsvp: 'RSVP to team events',
  eventCheckin: 'Check in to events you attend',
  calendarExport: 'Export events to your calendar',
  teamInvites: 'Invite new members to the team',
  roleManagement: 'Manage team member roles and permissions',
  squadManagement: 'Manage team roster and positions',
  payments: 'Collect payments and fees',
  subscriptions: 'Subscription-based access',
  autoGraphics: 'Automatically generate match graphics',
  videoHighlights: 'AI-generated video highlights',
  videoRecording: 'Record videos in the app',
  pushNotifications: 'Receive push notifications',
  geoFencing: 'Location-aware notifications',
  adminPanel: 'Access admin dashboard',
  analytics: 'View detailed analytics',
  offlineMode: 'Use app without internet',
  betaFeatures: 'Access beta features',
};
