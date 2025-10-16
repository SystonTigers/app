import axios from 'axios';
import { API_BASE_URL, TENANT_ID } from '../config';

// API Client
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add tenant ID to all requests
api.interceptors.request.use((config) => {
  // TODO: Add JWT token when authentication is implemented
  // config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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
