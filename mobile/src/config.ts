// Environment variables.
// Expo only inlines EXPO_PUBLIC_* when read as a literal `process.env.EXPO_PUBLIC_X`
// at build time - a dynamic `process.env[key]` lookup is always undefined in a
// release build. So each value is read statically below and passed in here.
const envOr = (value: string | undefined, fallback: string = ''): string =>
  typeof value === 'string' && value !== '' ? value : fallback;

// API Configuration
export const API_BASE_URL = envOr(process.env.EXPO_PUBLIC_API_BASE, 'https://syston-postbus.team-platform-2025.workers.dev');
export const TENANT_ID = envOr(process.env.EXPO_PUBLIC_TENANT_ID, 'syston-tigers');

// Club Branding Defaults
export const DEFAULT_CLUB_NAME = envOr(process.env.EXPO_PUBLIC_CLUB_NAME, 'Home Club');
export const DEFAULT_CLUB_SHORT_NAME = envOr(process.env.EXPO_PUBLIC_CLUB_SHORT_NAME, '');

// Supabase Configuration
export const SUPABASE_URL = envOr(process.env.EXPO_PUBLIC_SUPABASE_URL, '');
export const SUPABASE_ANON_KEY = envOr(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, '');

// App Configuration
export const APP_VERSION = envOr(process.env.EXPO_PUBLIC_APP_VERSION, '1.0.0');
export const GEO_FENCE_RADIUS = parseInt(envOr(process.env.EXPO_PUBLIC_GEO_FENCE_RADIUS, '500'), 10); // meters

// Feature Flags (loaded dynamically from API)
export const ENABLE_OFFLINE_MODE = envOr(process.env.EXPO_PUBLIC_ENABLE_OFFLINE, 'false') === 'true';
export const ENABLE_DEBUG_MODE = envOr(process.env.EXPO_PUBLIC_DEBUG_MODE, 'false') === 'true';

// Environment detection
export const IS_DEV = envOr(process.env.NODE_ENV, 'development') === 'development';
export const IS_PROD = envOr(process.env.NODE_ENV, 'development') === 'production';

// Colors (Neutral defaults - overridden by brand API at runtime)
// These provide a professional base until club branding is loaded
export const COLORS = {
  primary: '#00FFFF',      // Electric Cyan
  secondary: '#C0C0C0',    // Brushed Chrome
  accent: '#00FFFF',       // Cyan
  background: '#0B0D0F',   // Obsidian
  surface: 'rgba(11, 13, 15, 0.7)', // Glass/Obsidian
  text: '#FFFFFF',
  textLight: '#C0C0C0',    // Chrome
  error: '#FF0055',
  success: '#00FFFF',
  warning: '#F59E0B',
};

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH_SIGNUP: '/auth/signup',
  AUTH_LOGIN: '/auth/login',

  // Tenant
  TENANT_CONFIG: '/tenant/config',

  // Events
  EVENTS_LIST: '/events',
  EVENTS_GET: (id: string) => `/events/${id}`,
  EVENTS_RSVP: (id: string) => `/events/${id}/rsvp`,
  EVENTS_CHECKIN: (id: string) => `/events/${id}/checkin`,

  // Matches
  FIXTURES_NEXT: '/fixtures/next',
  MATCHES_GET: (id: string) => `/matches/${id}`,
  MATCHES_EVENTS: (id: string) => `/matches/${id}/events`,

  // League
  LEAGUE_TABLE: '/league/table',

  // Stats
  STATS_TEAM: '/stats/team',
  STATS_PLAYERS: '/stats/players',
  STATS_TOP_SCORERS: '/stats/top-scorers',

  // Live
  LIVE_GET: '/events/live',
  LIVE_POST: '/events/live',

  // Push
  PUSH_REGISTER: '/push/register',
  PUSH_SEND: '/push/send',

  // Weather
  WEATHER: '/weather',

  // Shop
  SHOP_PRODUCTS: '/shop/products',
  SHOP_ORDERS: '/shop/orders',
};

// HTTP Configuration
export const HTTP_TIMEOUT = parseInt(envOr(process.env.EXPO_PUBLIC_HTTP_TIMEOUT, '30000'), 10); // 30 seconds
export const HTTP_RETRY_ATTEMPTS = parseInt(envOr(process.env.EXPO_PUBLIC_HTTP_RETRY, '3'), 10);

// Validation helper
export const validateConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!API_BASE_URL || API_BASE_URL.includes('yourdomain.com')) {
    errors.push('EXPO_PUBLIC_API_BASE is not configured');
  }

  if (!SUPABASE_URL || SUPABASE_URL.includes('YOUR_SUPABASE')) {
    errors.push('EXPO_PUBLIC_SUPABASE_URL is not configured');
  }

  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('REPLACE')) {
    errors.push('EXPO_PUBLIC_SUPABASE_ANON_KEY is not configured');
  }

  if (!TENANT_ID) {
    errors.push('EXPO_PUBLIC_TENANT_ID is not configured');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// Log configuration on startup (dev only)
if (IS_DEV && ENABLE_DEBUG_MODE) {
  console.log('App Configuration:', {
    API_BASE_URL,
    TENANT_ID,
    SUPABASE_URL: SUPABASE_URL ? '***configured***' : 'missing',
    SUPABASE_ANON_KEY: SUPABASE_ANON_KEY ? '***configured***' : 'missing',
    APP_VERSION,
    GEO_FENCE_RADIUS,
    ENABLE_OFFLINE_MODE,
    ENABLE_DEBUG_MODE,
  });
}
