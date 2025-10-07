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

  // Get player details
  getPlayer: async (playerId: string) => {
    const response = await api.get(`/api/v1/squad/${playerId}`, {
      params: { tenant: TENANT_ID },
    });
    return response.data;
  },
};

export default api;
