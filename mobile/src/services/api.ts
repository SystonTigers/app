import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError } from 'axios';
import { API_BASE_URL, TENANT_ID } from '../config';

export const AUTH_STORAGE_KEYS = {
  token: 'auth_token',
  refreshToken: 'auth_refresh_token',
  userId: 'user_id',
  role: 'user_role',
  firstName: 'user_firstName',
  lastName: 'user_lastName',
  email: 'user_email',
} as const;

export interface AuthUser {
  id: string;
  role: string;
  firstName?: string;
  lastName?: string;
  email?: string;
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
  const entries: [string, string][] = [
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

  await AsyncStorage.multiSet(entries);

  if (!refreshToken) {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
  }
};

const clearAuthStorage = async () => {
  await AsyncStorage.multiRemove([
    AUTH_STORAGE_KEYS.token,
    AUTH_STORAGE_KEYS.refreshToken,
    AUTH_STORAGE_KEYS.userId,
    AUTH_STORAGE_KEYS.role,
    AUTH_STORAGE_KEYS.firstName,
    AUTH_STORAGE_KEYS.lastName,
    AUTH_STORAGE_KEYS.email,
  ]);
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
    'member';

  const firstName = sanitizeString(userData?.firstName ?? userData?.givenName ?? responseData.firstName);
  const lastName = sanitizeString(userData?.lastName ?? userData?.familyName ?? responseData.lastName);
  const email = sanitizeString(userData?.email ?? responseData.email);

  return {
    token,
    refreshToken: refreshToken ?? undefined,
    user: {
      id: userId,
      role,
      firstName,
      lastName,
      email,
    },
  };
};

const handleAuthError = (error: unknown, fallbackMessage: string): never => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<any>;
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
}

const readAuthFromStorage = async (): Promise<AuthResult | null> => {
  const entries = await AsyncStorage.multiGet([
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
  login: async ({ email, password }: LoginParams): Promise<AuthResult> => {
    const payload = {
      tenant: TENANT_ID,
      email: email.trim().toLowerCase(),
      password,
    };

    try {
      const response = await api.post('/api/v1/auth/login', payload);
      const authResult = extractAuthResult(response.data);
      await persistAuthResult(authResult);
      return authResult;
    } catch (error) {
      handleAuthError(error, 'Unable to sign in. Please check your credentials.');
    }
  },

  register: async (params: RegisterParams): Promise<AuthResult> => {
    const payload: Record<string, string> = {
      tenant: TENANT_ID,
      firstName: params.firstName.trim(),
      lastName: params.lastName.trim(),
      email: params.email.trim().toLowerCase(),
      password: params.password,
      role: params.role,
    };

    const phone = sanitizeString(params.phone);
    const playerName = sanitizeString(params.playerName);
    const promoCode = sanitizeString(params.promoCode);

    if (phone) {
      payload.phone = phone;
    }

    if (playerName) {
      payload.playerName = playerName;
    }

    if (promoCode) {
      payload.promoCode = promoCode;
    }

    try {
      const response = await api.post('/api/v1/auth/register', payload);
      const authResult = extractAuthResult(response.data);
      await persistAuthResult(authResult);
      return authResult;
    } catch (error) {
      handleAuthError(error, 'Unable to complete registration.');
    }
  },

  logout: async ({ revokeRemote = false } = {}): Promise<void> => {
    if (revokeRemote) {
      try {
        await api.post('/api/v1/auth/logout', { tenant: TENANT_ID });
      } catch (error) {
        console.warn('Failed to revoke session on server', error);
      }
    }

    await clearAuthStorage();
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
  (headers as Record<string, string>)['x-tenant'] = TENANT_ID;

  try {
    const token = await AsyncStorage.getItem(AUTH_STORAGE_KEYS.token);
    if (token) {
      (headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.warn('Failed to read auth token from storage', error);
  }

  config.headers = headers as typeof config.headers;
  return config;
});

export const apiClient = api;

// API Functions

export const feedApi = {
  // Get news feed posts
  getPosts: async (page = 1, limit = 20) => {
    const response = await api.get(`/api/v1/feed`, {
      params: { tenant: TENANT_ID, page, limit },
    });
    return response.data;
  },

  // Create new post
  createPost: async (content: string, channels: any, media?: string[]) => {
    const response = await api.post('/api/v1/feed/create', {
      tenant: TENANT_ID,
      content,
      channels,
      media,
    });
    return response.data;
  },

  // Like a post
  likePost: async (postId: string) => {
    const response = await api.post(`/api/v1/feed/${postId}/like`, {
      tenant: TENANT_ID,
    });
    return response.data;
  },
};

export const eventsApi = {
  // Get upcoming events
  getEvents: async (limit = 10) => {
    const response = await api.get('/api/v1/events', {
      params: { tenant: TENANT_ID, limit },
    });
    return response.data;
  },

  // Create event (admin)
  createEvent: async (event: any) => {
    const response = await api.post('/api/v1/events', {
      tenant: TENANT_ID,
      ...event,
    });
    return response.data;
  },

  // Update event (admin)
  updateEvent: async (id: string, updates: any) => {
    const response = await api.put(`/api/v1/events/${id}`, {
      tenant: TENANT_ID,
      ...updates,
    });
    return response.data;
  },

  // Delete event (admin)
  deleteEvent: async (id: string) => {
    const response = await api.delete(`/api/v1/events/${id}`, {
      params: { tenant: TENANT_ID },
    });
    return response.data;
  },

  // Get event details
  getEvent: async (eventId: string) => {
    const response = await api.get(`/api/v1/events/${eventId}`, {
      params: { tenant: TENANT_ID },
    });
    return response.data;
  },

  // RSVP to event
  rsvp: async (eventId: string, status: 'going' | 'not_going' | 'maybe') => {
    const response = await api.post(`/api/v1/events/${eventId}/rsvp`, {
      tenant: TENANT_ID,
      status,
      user_id: 'current-user-id', // TODO: Get from auth
    });
    return response.data;
  },

  // Get event attendees
  getAttendees: async (eventId: string) => {
    const response = await api.get(`/api/v1/events/${eventId}/attendees`, {
      params: { tenant: TENANT_ID },
    });
    return response.data;
  },
};

export const fixturesApi = {
  // Get upcoming fixtures
  getFixtures: async () => {
    const response = await api.get('/api/v1/fixtures', {
      params: { tenant: TENANT_ID },
    });
    return response.data;
  },

  // Create fixture (admin)
  createFixture: async (fixture: any) => {
    const response = await api.post('/api/v1/admin/fixtures', {
      tenant: TENANT_ID,
      ...fixture,
    });
    return response.data;
  },

  // Update fixture (admin)
  updateFixture: async (id: string, updates: any) => {
    const response = await api.put(`/api/v1/admin/fixtures/${id}`, {
      tenant: TENANT_ID,
      ...updates,
    });
    return response.data;
  },

  // Delete fixture (admin)
  deleteFixture: async (id: string) => {
    const response = await api.delete(`/api/v1/admin/fixtures/${id}`, {
      params: { tenant: TENANT_ID },
    });
    return response.data;
  },

  // Get results
  getResults: async () => {
    const response = await api.get('/api/v1/results', {
      params: { tenant: TENANT_ID },
    });
    return response.data;
  },

  // Get league table
  getLeagueTable: async () => {
    const response = await api.get('/api/v1/table', {
      params: { tenant: TENANT_ID },
    });
    return response.data;
  },
};

export const squadApi = {
  // Get squad list
  getSquad: async () => {
    const response = await api.get('/api/v1/squad', {
      params: { tenant: TENANT_ID },
    });
    return response.data;
  },

  // Create player (admin)
  createPlayer: async (player: any) => {
    const response = await api.post('/api/v1/admin/squad', {
      tenant: TENANT_ID,
      ...player,
    });
    return response.data;
  },

  // Update player (admin)
  updatePlayer: async (id: string, updates: any) => {
    const response = await api.put(`/api/v1/admin/squad/${id}`, {
      tenant: TENANT_ID,
      ...updates,
    });
    return response.data;
  },

  // Delete player (admin)
  deletePlayer: async (id: string) => {
    const response = await api.delete(`/api/v1/admin/squad/${id}`, {
      params: { tenant: TENANT_ID },
    });
    return response.data;
  },

  // Get player details
  getPlayer: async (playerId: string) => {
    const response = await api.get(`/api/v1/squad/${playerId}`, {
      params: { tenant: TENANT_ID },
    });
    return response.data;
  },
};

export const playerImagesApi = {
  // Get all player images
  listImages: async (playerId?: string, type?: 'headshot' | 'action') => {
    const response = await api.get('/api/v1/admin/player-images', {
      params: { tenant: TENANT_ID, playerId, type },
    });
    return response.data;
  },

  // Get single player image
  getImage: async (imageId: string) => {
    const response = await api.get(`/api/v1/admin/player-images/${imageId}`, {
      params: { tenant: TENANT_ID },
    });
    return response.data;
  },

  // Create player image
  createImage: async (data: {
    playerId: string;
    playerName: string;
    type: 'headshot' | 'action';
    imageUrl: string;
    r2Key: string;
    metadata?: any;
  }) => {
    const response = await api.post('/api/v1/admin/player-images', {
      tenant: TENANT_ID,
      ...data,
    });
    return response.data;
  },

  // Update player image
  updateImage: async (imageId: string, updates: any) => {
    const response = await api.patch(`/api/v1/admin/player-images/${imageId}`, {
      tenant: TENANT_ID,
      ...updates,
    });
    return response.data;
  },

  // Delete player image
  deleteImage: async (imageId: string) => {
    const response = await api.delete(`/api/v1/admin/player-images/${imageId}`, {
      params: { tenant: TENANT_ID },
    });
    return response.data;
  },
};

export const autoPostsMatrixApi = {
  // Get auto-posts matrix
  getMatrix: async () => {
    const response = await api.get('/api/v1/admin/auto-posts-matrix', {
      params: { tenant: TENANT_ID },
    });
    return response.data;
  },

  // Update auto-posts matrix
  updateMatrix: async (matrix: any) => {
    const response = await api.put('/api/v1/admin/auto-posts-matrix', {
      tenant: TENANT_ID,
      matrix,
    });
    return response.data;
  },

  // Reset matrix to defaults
  resetMatrix: async () => {
    const response = await api.post('/api/v1/admin/auto-posts-matrix/reset', {
      tenant: TENANT_ID,
    });
    return response.data;
  },
};

export const clubConfigApi = {
  // Get club config
  getConfig: async () => {
    const response = await api.get('/api/v1/admin/club-config', {
      params: { tenant: TENANT_ID },
    });
    return response.data;
  },

  // Update entire config
  updateConfig: async (config: any) => {
    const response = await api.put('/api/v1/admin/club-config', {
      tenant: TENANT_ID,
      config,
    });
    return response.data;
  },

  // Update specific section
  updateSection: async (section: string, data: any) => {
    const response = await api.patch(`/api/v1/admin/club-config/${section}`, {
      tenant: TENANT_ID,
      data,
    });
    return response.data;
  },

  // Upload club badge
  uploadBadge: async (file: any) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/api/v1/admin/club-config/upload-badge?tenant=${TENANT_ID}`, formData, {
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
    const response = await api.post(`/api/v1/admin/club-config/upload-sponsor?tenant=${TENANT_ID}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export const motmApi = {
  // Open voting for a match
  openVoting: async (matchId: string, data: {
    nominees: { candidateId: string; name: string }[];
    votingWindow: { start: string; end: string };
    autoPostEnabled: boolean;
  }) => {
    const response = await api.post(`/api/v1/admin/matches/${matchId}/motm/open`, {
      tenant: TENANT_ID,
      ...data,
    });
    return response.data;
  },

  // Close voting
  closeVoting: async (matchId: string) => {
    const response = await api.post(`/api/v1/admin/matches/${matchId}/motm/close`, {
      tenant: TENANT_ID,
    });
    return response.data;
  },

  // Get vote tally
  getTally: async (matchId: string) => {
    const response = await api.get(`/api/v1/admin/matches/${matchId}/motm/tally`, {
      params: { tenant: TENANT_ID },
    });
    return response.data;
  },

  // Cast a vote (public endpoint)
  castVote: async (matchId: string, candidateId: string) => {
    const response = await api.post(`/api/v1/matches/${matchId}/motm/vote`, {
      tenant: TENANT_ID,
      candidateId,
    });
    return response.data;
  },
};

export const liveMatchApi = {
  // Get live match data
  getLiveMatch: async (matchId: string) => {
    const response = await api.get(`/api/v1/matches/${matchId}/live`, {
      params: { tenant: TENANT_ID },
    });
    return response.data;
  },

  // Update live match event (admin)
  updateLiveMatch: async (matchId: string, event: any) => {
    const response = await api.post(`/api/v1/admin/matches/${matchId}/live`, {
      tenant: TENANT_ID,
      ...event,
    });
    return response.data;
  },

  // Get live match events
  getLiveEvents: async (matchId: string) => {
    const response = await api.get(`/api/v1/matches/${matchId}/live/events`, {
      params: { tenant: TENANT_ID },
    });
    return response.data;
  },

  // Get live match tally/stats
  getTally: async (matchId: string) => {
    const response = await api.get(`/api/v1/admin/matches/${matchId}/live/tally`, {
      params: { tenant: TENANT_ID },
    });
    return response.data;
  },

  // Open live match (admin)
  openMatch: async (matchId: string) => {
    const response = await api.post(`/api/v1/admin/matches/${matchId}/live/open`, {
      tenant: TENANT_ID,
    });
    return response.data;
  },

  // Record live match event (admin)
  recordEvent: async (matchId: string, event: any) => {
    const response = await api.post(`/api/v1/admin/matches/${matchId}/live/event`, {
      tenant: TENANT_ID,
      ...event,
    });
    return response.data;
  },

  // Close live match (admin)
  closeMatch: async (matchId: string) => {
    const response = await api.post(`/api/v1/admin/matches/${matchId}/live/close`, {
      tenant: TENANT_ID,
    });
    return response.data;
  },
};

export default api;
