import axios, { AxiosError } from 'axios';
import type { LiveMatchView, NewLiveEvent, SocialPost } from '../utils/liveMatch';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../config';

import { AUTH_STORAGE_KEYS, authStorage, type AuthStorageKey } from './authStorage';
import { getTenantId } from './club';

// Re-exported for existing imports
export { AUTH_STORAGE_KEYS };

export interface AuthUser {
  id: string;
  role: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  /** Web address of the user's club, when the server says. */
  clubSlug?: string;
}

export interface AuthResult {
  token: string;
  refreshToken?: string;
  user: AuthUser;
}

export class AuthError extends Error {
  fieldErrors: Record<string, string>;

  constructor(message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = 'AuthError';
    this.fieldErrors = fieldErrors;
  }
}

const sanitizeString = (value?: string | null) => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

const persistAuthResult = async ({ token, refreshToken, user }: AuthResult) => {
  const entries: [AuthStorageKey, string][] = [
    [AUTH_STORAGE_KEYS.token, token],
    [AUTH_STORAGE_KEYS.userId, user.id],
    [AUTH_STORAGE_KEYS.role, user.role],
  ];

  if (user.firstName) {
    entries.push([AUTH_STORAGE_KEYS.firstName, user.firstName]);
  }

  if (user.lastName) {
    entries.push([AUTH_STORAGE_KEYS.lastName, user.lastName]);
  }

  if (user.email) {
    entries.push([AUTH_STORAGE_KEYS.email, user.email]);
  }

  if (refreshToken) {
    entries.push([AUTH_STORAGE_KEYS.refreshToken, refreshToken]);
  }

  await authStorage.multiSet(entries);

  if (!refreshToken) {
    await authStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
  }
};

const clearAuthStorage = async () => {
  await authStorage.clear();
};

const extractAuthResult = (responseData: any): AuthResult => {
  if (!responseData) {
    throw new AuthError('Empty response from authentication service');
  }

  if (typeof responseData.success === 'boolean') {
    if (!responseData.success) {
      const errorPayload = responseData.error ?? {};
      const message =
        typeof errorPayload === 'string'
          ? errorPayload
          : sanitizeString(errorPayload.message) ?? 'Authentication failed';
      const fieldErrors =
        errorPayload && typeof errorPayload === 'object' && errorPayload.fields
          ? (errorPayload.fields as Record<string, string>)
          : {};
      throw new AuthError(message, fieldErrors);
    }
    responseData = responseData.data ?? responseData.result ?? responseData;
  }

  const token =
    sanitizeString(responseData.token) ||
    sanitizeString(responseData.jwt) ||
    sanitizeString(responseData.accessToken) ||
    sanitizeString(responseData.idToken);

  if (!token) {
    throw new AuthError('Authentication token missing from response');
  }

  const refreshToken =
    sanitizeString(responseData.refreshToken) ||
    sanitizeString(responseData.refresh_token) ||
    sanitizeString(responseData.refresh);

  const userData = responseData.user ?? responseData.profile ?? responseData;
  const userId =
    sanitizeString(userData?.id) ||
    sanitizeString(userData?.userId) ||
    sanitizeString(responseData.userId);

  if (!userId) {
    throw new AuthError('User identifier missing from response');
  }

  const role =
    sanitizeString(userData?.role) ||
    sanitizeString(responseData.role) ||
    sanitizeString(userData?.userRole) ||
    roleFromRoles(userData?.roles) ||
    'parent';

  const firstName = sanitizeString(userData?.firstName ?? userData?.givenName ?? responseData.firstName);
  const lastName = sanitizeString(userData?.lastName ?? userData?.familyName ?? responseData.lastName);
  const email = sanitizeString(userData?.email ?? responseData.email);
  const profile = userData?.profile && typeof userData.profile === 'object' ? userData.profile : {};
  const clubSlug = sanitizeString(userData?.tenant_slug);

  return {
    token,
    refreshToken: refreshToken ?? undefined,
    user: {
      id: userId,
      role,
      firstName: firstName ?? sanitizeString(profile.firstName) ?? sanitizeString(profile.name)?.split(' ')[0],
      lastName: lastName ?? sanitizeString(profile.lastName),
      email,
      clubSlug,
    },
  };
};

/** The backend sends a roles list; the app works with a single role. */
export const roleFromRoles = (roles: unknown): AuthUser['role'] | undefined => {
  if (!Array.isArray(roles)) return undefined;
  if (roles.some((r) => ['owner', 'tenant_admin', 'admin', 'platform_admin', 'manager'].includes(r))) return 'admin';
  if (roles.includes('coach')) return 'coach';
  if (roles.includes('player')) return 'player';
  return 'parent';
};

/** Login found the email in more than one club: the user has to pick one. */
export class MultipleClubsError extends Error {
  clubs: { id: string; name: string; slug: string }[];

  constructor(clubs: { id: string; name: string; slug: string }[]) {
    super('Your email is registered with more than one club. Choose the club to log in to.');
    this.name = 'MultipleClubsError';
    this.clubs = clubs;
  }
}

const handleAuthError = (error: unknown, fallbackMessage: string): never => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<any>;
    if (!axiosError.response) {
      throw new AuthError("We couldn't reach the server. Check your connection and try again.");
    }
    const errorData = axiosError.response?.data;

    if (errorData) {
      const candidate =
        typeof errorData?.success === 'boolean' || errorData?.error
          ? errorData
          : { success: false, error: errorData };

      try {
        extractAuthResult(candidate);
      } catch (err) {
        if (err instanceof AuthError) {
          throw err;
        }
      }
    }

    const message =
      sanitizeString((axiosError.response?.data as any)?.error?.message) ||
      sanitizeString((axiosError.response?.data as any)?.error) ||
      sanitizeString((axiosError.response?.data as any)?.message) ||
      sanitizeString(axiosError.message);

    throw new AuthError(message ?? fallbackMessage);
  }

  if (error instanceof AuthError) {
    throw error;
  }

  throw new AuthError(fallbackMessage);
};

export interface LoginParams {
  email: string;
  password: string;
  /** Club to log in to, when the email belongs to more than one. */
  clubId?: string;
}

export interface RegisterParams {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  phone?: string;
  playerName?: string;
  promoCode?: string;
  /** The person confirmed they're 13 or over, or a parent or carer */
  ageConfirmed: boolean;
}

const readAuthFromStorage = async (): Promise<AuthResult | null> => {
  const entries = await authStorage.multiGet([
    AUTH_STORAGE_KEYS.token,
    AUTH_STORAGE_KEYS.refreshToken,
    AUTH_STORAGE_KEYS.userId,
    AUTH_STORAGE_KEYS.role,
    AUTH_STORAGE_KEYS.firstName,
    AUTH_STORAGE_KEYS.lastName,
    AUTH_STORAGE_KEYS.email,
  ]);

  const map = Object.fromEntries(entries) as Record<string, string | null>;
  const token = sanitizeString(map[AUTH_STORAGE_KEYS.token]);
  const userId = sanitizeString(map[AUTH_STORAGE_KEYS.userId]);
  const role = sanitizeString(map[AUTH_STORAGE_KEYS.role]);

  if (!token || !userId || !role) {
    return null;
  }

  return {
    token,
    refreshToken: sanitizeString(map[AUTH_STORAGE_KEYS.refreshToken]) ?? undefined,
    user: {
      id: userId,
      role,
      firstName: sanitizeString(map[AUTH_STORAGE_KEYS.firstName]),
      lastName: sanitizeString(map[AUTH_STORAGE_KEYS.lastName]),
      email: sanitizeString(map[AUTH_STORAGE_KEYS.email]),
    },
  };
};

export const authApi = {
  login: async ({ email, password, clubId }: LoginParams): Promise<AuthResult> => {
    // With no club chosen the server finds the user's club from their email
    const club = clubId || getTenantId();
    const payload = {
      ...(club ? { tenant_id: club } : {}),
      email: email.trim().toLowerCase(),
      password,
    };

    try {
      const response = await api.post('/api/v1/auth/login', payload);
      if (response.data?.multipleTenants && Array.isArray(response.data.tenants)) {
        throw new MultipleClubsError(response.data.tenants);
      }
      const authResult = extractAuthResult(response.data);
      await persistAuthResult(authResult);
      return authResult;
    } catch (error) {
      if (error instanceof MultipleClubsError) throw error;
      handleAuthError(error, 'Unable to sign in. Please check your credentials.');
      throw error; // TypeScript doesn't know handleAuthError throws
    }
  },

  register: async (params: RegisterParams): Promise<AuthResult> => {
    const club = getTenantId();
    if (!club) {
      throw new AuthError('Choose your club first.');
    }
    const email = params.email.trim().toLowerCase();
    const profile: Record<string, string> = {
      firstName: params.firstName.trim(),
      lastName: params.lastName.trim(),
      name: `${params.firstName.trim()} ${params.lastName.trim()}`.trim(),
      // What the person says they are; the server always creates a plain member
      requestedRole: params.role,
    };
    const phone = sanitizeString(params.phone);
    const playerName = sanitizeString(params.playerName);
    if (phone) profile.phone = phone;
    if (playerName) profile.playerName = playerName;

    try {
      const response = await api.post(
        '/api/v1/auth/register',
        { tenant_id: club, email, password: params.password, profile, ageConfirmed: params.ageConfirmed },
        // Retrying the same sign-up (e.g. after a dropped connection) mustn't create two accounts
        { headers: { 'Idempotency-Key': `register:${club}:${email}` } },
      );
      const authResult = extractAuthResult(response.data);
      await persistAuthResult(authResult);
      return authResult;
    } catch (error) {
      handleAuthError(error, 'Unable to complete registration.');
      throw error; // TypeScript doesn't know handleAuthError throws
    }
  },

  forgotPassword: async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await api.post('/api/v1/auth/request-password-reset', {
        email: email.trim().toLowerCase(),
      });
      return response.data;
    } catch (error) {
      handleAuthError(error, 'Failed to send reset code.');
      throw error;
    }
  },

  logout: async ({ revokeRemote = false } = {}): Promise<void> => {
    if (revokeRemote) {
      try {
        await api.post('/api/v1/auth/logout', { tenant: getTenantId() });
      } catch (error) {
        console.warn('Failed to revoke session on server', error);
      }
    }

    await clearAuthStorage();
  },

  deleteAccount: async (): Promise<void> => {
    try {
      const response = await api.delete('/api/v1/auth/account', {
        data: { tenant: getTenantId() },
      });

      // Clear all local storage after successful deletion
      await clearAuthStorage();

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || error.response?.data?.message || 'Failed to delete account';
        throw new Error(message);
      }
      throw new Error('Unable to delete account. Please try again.');
    }
  },

  getStoredAuth: async (): Promise<AuthResult | null> => readAuthFromStorage(),
};

// API Client
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add tenant ID and auth headers to all requests
api.interceptors.request.use(async (config) => {
  const headers = config.headers ?? {};
  (headers as Record<string, string>)['x-tenant'] = getTenantId();

  try {
    const token = await authStorage.getToken();
    if (token) {
      (headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.warn('Failed to read auth token from storage', error);
  }

  config.headers = headers as typeof config.headers;
  return config;
});

// Session expiry: when an authenticated request comes back 401 the stored
// token is no longer valid. Clear it and tell listeners (AuthContext) so the
// app returns to the login screen instead of failing every call silently.
type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

/** Subscribe to "session expired" events. Returns an unsubscribe function. */
export const onUnauthorized = (listener: UnauthorizedListener): (() => void) => {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const sentToken = Boolean((error.config?.headers as Record<string, unknown> | undefined)?.Authorization);
    if (error.response?.status === 401 && sentToken) {
      try {
        await authStorage.clear();
      } catch (clearError) {
        console.warn('Failed to clear auth storage after 401', clearError);
      }
      unauthorizedListeners.forEach((listener) => listener());
    }
    return Promise.reject(error);
  }
);

export const apiClient = api;

// API Functions

export const feedApi = {
  // Get news feed posts
  getPosts: async (page = 1, limit = 20) => {
    const response = await api.get(`/api/v1/feed`, {
      params: { tenant: getTenantId(), page, limit },
    });
    return response.data;
  },

  // Create new post
  createPost: async (content: string, channels: any, media?: string[]) => {
    const response = await api.post('/api/v1/feed/create', {
      tenant: getTenantId(),
      content,
      channels,
      media,
    });
    return response.data;
  },
};

// Content Moderation API
export const reportContent = async (params: {
  contentType: 'post' | 'comment' | 'message';
  contentId: string;
  reason: string;
}) => {
  const response = await api.post('/api/v1/content/report', {
    tenant: getTenantId(),
    ...params,
  });
  return response.data;
};

export const eventsApi = {
  // Get upcoming events
  getEvents: async (limit = 10) => {
    const response = await api.get('/api/v1/events', {
      params: { tenant: getTenantId(), limit },
    });
    return response.data;
  },

  // Create event (admin)
  createEvent: async (event: any) => {
    const response = await api.post('/api/v1/events', {
      tenant: getTenantId(),
      ...event,
    });
    return response.data;
  },

  // Update event (admin)
  updateEvent: async (id: string, updates: any) => {
    const response = await api.put(`/api/v1/events/${id}`, {
      tenant: getTenantId(),
      ...updates,
    });
    return response.data;
  },

  // Delete event (admin)
  deleteEvent: async (id: string) => {
    const response = await api.delete(`/api/v1/events/${id}`, {
      params: { tenant: getTenantId() },
    });
    return response.data;
  },

  // Get event details
  getEvent: async (eventId: string) => {
    const response = await api.get(`/api/v1/events/${eventId}`, {
      params: { tenant: getTenantId() },
    });
    return response.data;
  },

  // RSVP to event
  rsvp: async (eventId: string, status: 'going' | 'not_going' | 'maybe') => {
    const userId = await authStorage.getItem(AUTH_STORAGE_KEYS.userId) || '';
    const response = await api.post(`/api/v1/events/${eventId}/rsvp`, {
      tenant: getTenantId(),
      status,
      user_id: userId,
    });
    return response.data;
  },

  // Get event attendees
  getAttendees: async (eventId: string) => {
    const response = await api.get(`/api/v1/events/${eventId}/attendees`, {
      params: { tenant: getTenantId() },
    });
    return response.data;
  },
};

export const fixturesApi = {
  // Get upcoming fixtures
  getFixtures: async () => {
    const response = await api.get('/api/v1/fixtures', {
      params: { tenant: getTenantId() },
    });
    return response.data;
  },

  // Create fixture (admin)
  createFixture: async (fixture: any) => {
    const response = await api.post('/api/v1/admin/fixtures', {
      tenant: getTenantId(),
      ...fixture,
    });
    return response.data;
  },

  // Update fixture (admin)
  updateFixture: async (id: string, updates: any) => {
    const response = await api.put(`/api/v1/admin/fixtures/${id}`, {
      tenant: getTenantId(),
      ...updates,
    });
    return response.data;
  },

  // Delete fixture (admin)
  deleteFixture: async (id: string) => {
    const response = await api.delete(`/api/v1/admin/fixtures/${id}`, {
      params: { tenant: getTenantId() },
    });
    return response.data;
  },

  // Get results
  getResults: async () => {
    const response = await api.get('/api/v1/results', {
      params: { tenant: getTenantId() },
    });
    return response.data;
  },

  // Get league table
  getLeagueTable: async () => {
    const response = await api.get('/api/v1/table', {
      params: { tenant: getTenantId() },
    });
    return response.data;
  },
};

export const squadApi = {
  // Get squad list
  getSquad: async () => {
    const response = await api.get('/api/v1/squad', {
      params: { tenant: getTenantId() },
    });
    return response.data;
  },

  // Create player (admin)
  createPlayer: async (player: any) => {
    const response = await api.post('/api/v1/admin/squad', {
      tenant: getTenantId(),
      ...player,
    });
    return response.data;
  },

  // Update player (admin)
  updatePlayer: async (id: string, updates: any) => {
    const response = await api.put(`/api/v1/admin/squad/${id}`, {
      tenant: getTenantId(),
      ...updates,
    });
    return response.data;
  },

  // Delete player (admin)
  deletePlayer: async (id: string) => {
    const response = await api.delete(`/api/v1/admin/squad/${id}`, {
      params: { tenant: getTenantId() },
    });
    return response.data;
  },

  // Get player details
  getPlayer: async (playerId: string) => {
    const response = await api.get(`/api/v1/squad/${playerId}`, {
      params: { tenant: getTenantId() },
    });
    return response.data;
  },
};

export const playerImagesApi = {
  // Get all player images
  listImages: async (playerId?: string, type?: 'headshot' | 'action') => {
    const response = await api.get('/api/v1/admin/player-images', {
      params: { tenant: getTenantId(), playerId, type },
    });
    return response.data;
  },

  // Create player image
  createImage: async (data: {
    playerId: string;
    playerName: string;
    type: 'headshot' | 'action';
    imageUri: string;
  }) => {
    const formData = new FormData();
    formData.append('playerId', data.playerId);
    formData.append('playerName', data.playerName);
    formData.append('type', data.type);

    // Append photo
    const filename = data.imageUri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('photo', {
      uri: data.imageUri,
      name: filename,
      type,
    } as any);

    const response = await api.post('/api/v1/admin/player-images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      params: { tenant: getTenantId() },
    });
    return response.data;
  },

  // Delete player image
  deleteImage: async (imageId: string) => {
    const response = await api.delete(`/api/v1/admin/player-images/${imageId}`, {
      params: { tenant: getTenantId() },
    });
    return response.data;
  },
};

export const autoPostsMatrixApi = {
  // Get auto-posts matrix
  getMatrix: async () => {
    const response = await api.get('/api/v1/admin/auto-posts-matrix', {
      params: { tenant: getTenantId() },
    });
    return response.data;
  },

  // Update auto-posts matrix
  updateMatrix: async (matrix: any) => {
    const response = await api.put('/api/v1/admin/auto-posts-matrix', {
      tenant: getTenantId(),
      matrix,
    });
    return response.data;
  },

  // Reset matrix to defaults
  resetMatrix: async () => {
    const response = await api.post('/api/v1/admin/auto-posts-matrix/reset', {
      tenant: getTenantId(),
    });
    return response.data;
  },
};

export const clubConfigApi = {
  // Get club config
  getConfig: async () => {
    const response = await api.get('/api/v1/admin/club-config', {
      params: { tenant: getTenantId() },
    });
    return response.data;
  },

  // Update entire config
  updateConfig: async (config: any) => {
    const response = await api.put('/api/v1/admin/club-config', {
      tenant: getTenantId(),
      config,
    });
    return response.data;
  },

  // Update specific section
  updateSection: async (section: string, data: any) => {
    const response = await api.patch(`/api/v1/admin/club-config/${section}`, {
      tenant: getTenantId(),
      data,
    });
    return response.data;
  },

  // Upload club badge
  uploadBadge: async (file: any) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/api/v1/admin/club-config/upload-badge?tenant=${getTenantId()}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Upload sponsor logo
  uploadSponsor: async (file: any) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/api/v1/admin/club-config/upload-sponsor?tenant=${getTenantId()}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export interface GotmVotingResponse {
  success: boolean;
  data?: {
    voting: { id: string; month: string; year: number; status: string } | null;
    candidates: Array<Record<string, any>>;
  };
  error?: string;
}

/** Push notification token registration (backend: /api/v1/push/register). */
export const pushApi = {
  registerToken: async (token: string): Promise<{ success: boolean; error?: string }> => {
    const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
    const response = await api.post('/api/v1/push/register', { tenant: getTenantId(), token, platform });
    return response.data;
  },
};

/** Goal of the Month voting (backend: /api/v1/gotm). */
export const gotmApi = {
  // Current open voting (or a specific one) with its candidates
  getVoting: async (votingId?: string): Promise<GotmVotingResponse> => {
    const response = await api.get('/api/v1/gotm', {
      params: votingId ? { votingId } : undefined,
    });
    const body = response.data || {};
    // Backend returns { success, voting, candidates } at the top level
    return {
      success: !!body.success,
      data: { voting: body.voting ?? null, candidates: body.candidates ?? [] },
      error: body.error,
    };
  },

  // Cast a vote for a candidate
  castVote: async (votingId: string, candidateId: string): Promise<{ success: boolean; error?: string }> => {
    const response = await api.post('/api/v1/gotm/vote', { votingId, candidateId });
    return response.data;
  },
};

export interface MotmNominee {
  playerId: string;
  name: string;
  number: number | null;
  photoUrl: string | null;
}

export interface MotmVote {
  matchId: string;
  match: { id: string; opponent: string; date: string; ourScore: number | null; theirScore: number | null } | null;
  status: 'draft' | 'active' | 'closed';
  votingOpen: boolean;
  opensAt: string | null;
  closesAt: string | null;
  nominees: MotmNominee[];
  userVote: string | null;
  winners: MotmNominee[];
  /** Only for staff, or once voting has closed */
  results: { player_id: string; player_name: string | null; vote_count: number }[] | null;
  totalVotes: number | null;
}

export interface MotmSessionSummary {
  match_id: string;
  status: 'draft' | 'active' | 'closed';
  voting_start_at: string | null;
  voting_end_at: string | null;
  opponent: string | null;
  date: string | null;
  vote_count: number;
  nominee_count: number;
  votingOpen: boolean;
  winners: string[];
}

/** The server's message for a failed request, or a fallback. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { error?: unknown; message?: unknown } } })?.response?.data;
  const err = data?.error;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && typeof (err as { message?: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  if (typeof data?.message === 'string') return data.message;
  return fallback;
}

export const motmApi = {
  /** Staff: open (or re-open) a vote with nominees; closes 48h later unless a window is given. */
  openVoting: async (matchId: string, data: {
    nominees?: string[];
    votingWindow?: { start?: string; end?: string };
    autoPostEnabled?: boolean;
    status?: 'draft' | 'active';
  }): Promise<{ success: boolean; data: MotmVote }> => {
    const response = await api.post(`/api/v1/admin/matches/${matchId}/motm/open`, data);
    return response.data;
  },

  /** Staff: every vote for the club */
  listSessions: async (): Promise<{ success: boolean; data: MotmSessionSummary[] }> => {
    const response = await api.get('/api/v1/admin/motm/sessions');
    return response.data;
  },

  /** Staff: close the vote and announce the winner */
  closeVoting: async (matchId: string): Promise<{ success: boolean; data: { winners: MotmNominee[]; post: SocialPost | null } }> => {
    const response = await api.post(`/api/v1/admin/matches/${matchId}/motm/close`, {});
    return response.data;
  },

  /** Staff: one vote with nominees and live tally */
  getVote: async (matchId: string): Promise<{ success: boolean; data: MotmVote }> => {
    const response = await api.get(`/api/v1/motm/${matchId}`);
    return response.data;
  },

  /** Members: open votes and recent winners */
  listOpen: async (): Promise<{ success: boolean; data: { open: MotmVote[]; recent: MotmVote[] } }> => {
    const response = await api.get('/api/v1/motm/open');
    return response.data;
  },

  /** Members: vote (or change vote) for a nominee */
  castVote: async (matchId: string, candidateId: string): Promise<{ success: boolean }> => {
    const response = await api.post(`/api/v1/matches/${matchId}/motm/vote`, { candidateId });
    return response.data;
  },
};

export interface LineupPlayer { playerId: string; name: string; number: number | null; position: string | null }
export interface Lineup { teamSize: number; clubDefaultTeamSize: number; starters: LineupPlayer[]; subs: LineupPlayer[] }

/** Starting line-ups (see backend routes/lineup.ts). */
export const lineupApi = {
  get: async (fixtureId: string): Promise<{ success: boolean; data: Lineup }> => {
    const response = await api.get(`/api/v1/fixtures/${fixtureId}/lineup`);
    return response.data;
  },

  /** Staff: save the team. makeClubDefault remembers the team size for next time. */
  save: async (fixtureId: string, body: { teamSize: number; starters: string[]; subs: string[]; makeClubDefault?: boolean }): Promise<{ success: boolean; data: Lineup }> => {
    const response = await api.put(`/api/v1/fixtures/${fixtureId}/lineup`, body);
    return response.data;
  },

  /** Staff: post the team news (club app, and Facebook/Instagram if connected) */
  publish: async (fixtureId: string): Promise<{ success: boolean; data: { newPost: SocialPost } }> => {
    const response = await api.post(`/api/v1/fixtures/${fixtureId}/lineup/publish`, {});
    return response.data;
  },
};

/** Automatic posts: the phone sends the graphic it drew. */
export const socialApi = {
  uploadGraphic: async (postId: string, jpeg: Blob): Promise<{ success: boolean; data: SocialPost }> => {
    const response = await api.post(`/api/v1/social/jobs/${postId}/graphic`, jpeg, { headers: { 'Content-Type': 'image/jpeg' } });
    return response.data;
  },
};

/** Live match updates (see backend routes/liveMatch.ts). Types are in utils/liveMatch.ts. */
export const liveApi = {
  /** Matches with live activity in the last 12 hours */
  list: async (): Promise<{ success: boolean; data: LiveMatchView[] }> => {
    const response = await api.get('/api/v1/live');
    return response.data;
  },

  get: async (fixtureId: string): Promise<{ success: boolean; data: LiveMatchView }> => {
    const response = await api.get(`/api/v1/fixtures/${fixtureId}/live`);
    return response.data;
  },

  /** Staff: record what happened. Reuse clientEventId when retrying so it's only counted once. */
  record: async (fixtureId: string, event: NewLiveEvent): Promise<{ success: boolean; data: LiveMatchView }> => {
    const response = await api.post(`/api/v1/fixtures/${fixtureId}/live/events`, event);
    return response.data;
  },

  /** Staff: undo an update */
  undo: async (fixtureId: string, eventId: string): Promise<{ success: boolean; data: LiveMatchView }> => {
    const response = await api.delete(`/api/v1/fixtures/${fixtureId}/live/events/${eventId}`);
    return response.data;
  },
};

export const shopApi = {
  // Get personalized shop products
  getProducts: async () => {
    const response = await api.get('/api/v1/shop/personalized', {
      params: { tenant: getTenantId() },
    });
    return response.data;
  },

  // Create Cart
  createCart: async () => {
    const response = await api.post('/api/v1/shop/cart', {
      tenantId: getTenantId(),
    });
    return response.data;
  },

  // Get Cart
  getCart: async (cartId: string) => {
    const response = await api.get(`/api/v1/shop/cart/${cartId}`);
    return response.data;
  },

  // Add to Cart
  addToCart: async (cartId: string, variantId: string, quantity: number, personalization?: any) => {
    const response = await api.post(`/api/v1/shop/cart/${cartId}/items`, {
      variantId,
      quantity,
      personalization,
    });
    return response.data;
  },

  // Checkout
  createCheckoutSession: async (cartId: string, email: string) => {
    const response = await api.post('/api/v1/shop/checkout', {
      cartId,
      customerEmail: email,
    });
    return response.data;
  },
};



// ===== Chat API =====
export const chatApi = {
  listRooms: async () => {
    const response = await api.get('/api/v1/chat/rooms');
    return response.data;
  },
  createRoom: async (data: { roomId: string; name: string; type?: string }) => {
    const response = await api.post('/api/v1/chat/rooms', data);
    return response.data;
  },
  getHistory: async (roomId: string, cursor?: string, limit = 50) => {
    const response = await api.get(`/api/v1/chat/${roomId}/history`, {
      params: { cursor, limit },
    });
    return response.data;
  },
  sendMessage: async (roomId: string, text: string) => {
    const response = await api.post(`/api/v1/chat/${roomId}/send`, { text });
    return response.data;
  },
};

// ===== Training API =====
export const trainingApi = {
  listSessions: async () => {
    const response = await api.get('/api/v1/training/sessions', {
      params: { tenant: getTenantId() },
    });
    return response.data;
  },
  listDrills: async () => {
    const response = await api.get('/api/v1/training/drills', {
      params: { tenant: getTenantId() },
    });
    return response.data;
  },
};

// ===== Videos API =====
export const videosApi = {
  list: async () => {
    const response = await api.get('/api/v1/videos');
    return response.data;
  },
  get: async (id: string) => {
    const response = await api.get(`/api/v1/videos/${id}`);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/api/v1/videos/${id}`);
    return response.data;
  },
};

// ===== Wearables / GPS API =====
export const wearablesApi = {
  // A player's recent sessions, built from their per-session fitness metrics
  // (GET /wearables/metrics/:playerId). There is no club-wide session list.
  listSessions: async (playerId?: string) => {
    if (!playerId) {
      return { success: true, data: [] };
    }
    const response = await api.get(`/api/v1/wearables/metrics/${encodeURIComponent(playerId)}`, {
      params: { limit: 20 },
    });
    const metrics: any[] = Array.isArray(response.data?.data) ? response.data.data : [];
    return {
      success: true,
      data: metrics.map((m) => ({
        id: m.sessionId || m.id,
        sessionDate: m.capturedAt ? new Date(m.capturedAt).toISOString() : '',
        entryMethod: 'automatic',
        metrics: m,
      })),
    };
  },
  getSession: async (sessionId: string) => {
    const response = await api.get(`/api/v1/wearables/sessions/${sessionId}`);
    return response.data;
  },
  getGPSTrack: async (sessionId: string) => {
    const response = await api.get(`/api/v1/wearables/sessions/${sessionId}/gps-track`);
    return response.data;
  },
  getPlayerSummary: async (playerId: string) => {
    const response = await api.get(`/api/v1/wearables/summary/${playerId}`);
    return response.data;
  },
  manualEntry: async (data: any) => {
    const response = await api.post('/api/v1/wearables/manual', {
      tenant: getTenantId(),
      ...data,
    });
    return response.data;
  },
};

// ===== Stats API =====
export const statsApi = {
  getPlayerStats: async () => {
    const response = await api.get('/api/v1/stats/players', {
      params: { tenant: getTenantId() },
    });
    return response.data;
  },
};

// ===== Dues / Payments API =====
export const duesApi = {
  listRequests: async () => {
    const response = await api.get('/api/v1/dues/requests');
    return response.data;
  },
  getRequestStatus: async (id: string) => {
    const response = await api.get(`/api/v1/dues/requests/${id}/status`);
    return response.data;
  },
};

export const usersApi = {
  // Update profile
  updateProfile: async (data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  }) => {
    const response = await api.put('/api/v1/users/profile', {
      tenant: getTenantId(),
      ...data,
    });
    return response.data;
  },

  // Change password
  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
  }) => {
    const response = await api.post('/api/v1/users/change-password', {
      tenant: getTenantId(),
      ...data,
    });
    return response.data;
  },

  // Get current user profile
  getProfile: async () => {
    const response = await api.get('/api/v1/users/me', {
      params: { tenant: getTenantId() },
    });
    return response.data;
  },
};

export const galleryApi = {
  // Get all albums (unwrapped from the { success, data } envelope)
  getAlbums: async () => {
    const response = await api.get('/api/v1/gallery/albums', {
      params: { tenant: getTenantId() },
    });
    return Array.isArray(response.data?.data) ? response.data.data : [];
  },

  // Get photos in album (unwrapped from the { success, data } envelope)
  getPhotos: async (albumId: string) => {
    const response = await api.get('/api/v1/gallery/photos', {
      params: { tenant: getTenantId(), albumId },
    });
    return Array.isArray(response.data?.data) ? response.data.data : [];
  },

  // Upload photo
  uploadPhoto: async (data: {
    imageUri: string;
    caption?: string;
    albumId?: string;
    tags?: string[];
  }) => {
    const formData = new FormData();
    const filename = data.imageUri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
      uri: data.imageUri,
      name: filename,
      type,
    } as any);

    if (data.caption) formData.append('caption', data.caption);
    if (data.albumId) formData.append('albumId', data.albumId);
    if (data.tags) formData.append('tags', JSON.stringify(data.tags));

    const response = await api.post(`/api/v1/gallery/upload?tenant=${getTenantId()}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Create album (helper for seeding/admin)
  createAlbum: async (data: any) => {
    const response = await api.post('/api/v1/gallery/albums', {
      tenant: getTenantId(),
      ...data,
    });
    return response.data;
  },
};

export default api;

// Export convenience function for account deletion
export const deleteAccount = authApi.deleteAccount;

