// Feature flags type definitions

export interface FeatureFlags {
  // Core features
  chat: boolean;
  gallery: boolean;
  shop: boolean;
  training: boolean;
  highlights: boolean;

  // Match features
  liveMatchUpdates: boolean;
  matchDayNotifications: boolean;
  motmVoting: boolean;
  playerStats: boolean;

  // Social features
  newsFeeds: boolean;
  socialSharing: boolean;
  comments: boolean;

  // Event features
  eventRsvp: boolean;
  eventCheckin: boolean;
  calendarExport: boolean;

  // Team features
  teamInvites: boolean;
  roleManagement: boolean;
  squadManagement: boolean;

  // Payment features
  payments: boolean;
  subscriptions: boolean;

  // Graphics/Media features
  autoGraphics: boolean;
  videoHighlights: boolean;
  videoRecording: boolean;

  // Notifications
  pushNotifications: boolean;
  geoFencing: boolean;

  // Admin features
  adminPanel: boolean;
  analytics: boolean;

  // Experimental features
  offlineMode: boolean;
  betaFeatures: boolean;
}

export interface PlanFeatures {
  plan: 'free' | 'starter' | 'premium' | 'enterprise';
  features: Partial<FeatureFlags>;
  limits?: {
    maxEvents?: number;
    maxPlayers?: number;
    maxStorage?: number; // in MB
    maxMonthlyGraphics?: number;
    maxMonthlyNotifications?: number;
  };
}

export interface TenantConfig {
  tenantId: string;
  plan: 'free' | 'starter' | 'premium' | 'enterprise';
  features: Partial<FeatureFlags>;
  limits?: PlanFeatures['limits'];
  customization?: {
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
    badgeUrl?: string;
  };
  lastUpdated: number;
}

export interface FeatureFlagsContextValue {
  flags: FeatureFlags;
  config: TenantConfig | null;
  isLoading: boolean;
  error: string | null;
  isFeatureEnabled: (feature: keyof FeatureFlags) => boolean;
  hasFeature: (feature: keyof FeatureFlags) => boolean;
  refreshFlags: () => Promise<void>;
  getLimit: (limitName: keyof NonNullable<PlanFeatures['limits']>) => number | undefined;
  isWithinLimit: (limitName: keyof NonNullable<PlanFeatures['limits']>, currentValue: number) => boolean;
}
