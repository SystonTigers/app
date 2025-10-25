// packages/sdk/src/index.ts
// Shared SDK client for team platform API

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import type {
  BrandKit,
  Fixture,
  Result,
  LeagueTableRow,
  Player,
  TeamStats,
  FeedPost,
  Event,
  LiveEvent,
  PushToken,
  UsageStats,
  TenantConfig,
  ApiResponse,
} from './types';

export * from './types';

export interface TeamPlatformSDKConfig {
  apiBaseUrl: string;
  tenantId: string;
  authToken?: string;
  timeout?: number;
}

export class TeamPlatformSDK {
  private client: AxiosInstance;
  private tenantId: string;

  constructor(config: TeamPlatformSDKConfig) {
    this.tenantId = config.tenantId;

    this.client = axios.create({
      baseURL: config.apiBaseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'x-tenant': config.tenantId,
      },
    });

    // Add auth token if provided
    if (config.authToken) {
      this.setAuthToken(config.authToken);
    }

    // Add request interceptor for tenant header
    this.client.interceptors.request.use((config) => {
      config.headers['x-tenant'] = this.tenantId;
      return config;
    });
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    delete this.client.defaults.headers.common['Authorization'];
  }

  /**
   * Update tenant ID
   */
  setTenant(tenantId: string): void {
    this.tenantId = tenantId;
  }

  // ==================== BRAND API ====================

  /**
   * Get brand kit for current tenant
   */
  async getBrand(): Promise<BrandKit> {
    const response = await this.client.get<ApiResponse<BrandKit>>('/api/v1/brand');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to get brand');
    }
    return response.data.data;
  }

  /**
   * Update brand kit (admin only)
   */
  async setBrand(brand: Partial<BrandKit>): Promise<BrandKit> {
    const response = await this.client.post<ApiResponse<BrandKit>>('/api/v1/brand', brand);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to set brand');
    }
    return response.data.data;
  }

  // ==================== FIXTURES & RESULTS ====================

  /**
   * Get upcoming fixtures
   */
  async listFixtures(): Promise<Fixture[]> {
    const response = await this.client.get('/api/v1/fixtures');
    return response.data?.fixtures || response.data || [];
  }

  /**
   * Get past results
   */
  async listResults(): Promise<Result[]> {
    const response = await this.client.get('/api/v1/results');
    return response.data?.results || response.data || [];
  }

  /**
   * Get league table
   */
  async getLeagueTable(league?: string, season?: string): Promise<LeagueTableRow[]> {
    const params: any = {};
    if (league) params.league = league;
    if (season) params.season = season;

    const response = await this.client.get('/api/v1/table', { params });
    return response.data?.table || response.data || [];
  }

  // ==================== SQUAD ====================

  /**
   * Get team squad
   */
  async getSquad(): Promise<Player[]> {
    const response = await this.client.get('/api/v1/squad');
    return response.data?.squad || response.data || [];
  }

  /**
   * Get player details
   */
  async getPlayer(playerId: string): Promise<Player> {
    const response = await this.client.get(`/api/v1/squad/${playerId}`);
    return response.data?.player || response.data;
  }

  /**
   * Get top scorers
   */
  async getTopScorers(limit?: number): Promise<Player[]> {
    const params = limit ? { limit } : {};
    const response = await this.client.get('/api/v1/stats/top-scorers', { params });
    return response.data?.topScorers || response.data || [];
  }

  // ==================== STATS ====================

  /**
   * Get team statistics
   */
  async getTeamStats(): Promise<TeamStats> {
    const response = await this.client.get('/api/v1/stats/team');
    return response.data?.stats || response.data;
  }

  /**
   * Get player statistics
   */
  async getPlayerStats(): Promise<Player[]> {
    const response = await this.client.get('/api/v1/stats/players');
    return response.data?.players || response.data || [];
  }

  // ==================== FEED/POSTS ====================

  /**
   * Get news feed posts
   */
  async listFeed(page: number = 1, limit: number = 20): Promise<FeedPost[]> {
    const response = await this.client.get('/api/v1/feed', {
      params: { page, limit },
    });
    return response.data?.posts || response.data || [];
  }

  /**
   * Create a new post (admin only)
   */
  async createPost(content: string, channels?: any, media?: string[]): Promise<FeedPost> {
    const response = await this.client.post('/api/v1/feed/create', {
      content,
      channels,
      media,
    });
    return response.data?.post || response.data;
  }

  // ==================== EVENTS ====================

  /**
   * Get list of events
   */
  async listEvents(limit?: number): Promise<Event[]> {
    const params = limit ? { limit } : {};
    const response = await this.client.get('/api/v1/events', { params });
    return response.data?.events || response.data || [];
  }

  /**
   * Get event details
   */
  async getEvent(eventId: string): Promise<Event> {
    const response = await this.client.get(`/api/v1/events/${eventId}`);
    return response.data?.event || response.data;
  }

  /**
   * Create event (admin only)
   */
  async createEvent(event: Partial<Event>): Promise<Event> {
    const response = await this.client.post('/api/v1/events', event);
    return response.data?.event || response.data;
  }

  /**
   * Delete event (admin only)
   */
  async deleteEvent(eventId: string): Promise<void> {
    await this.client.delete(`/api/v1/events/${eventId}`);
  }

  // ==================== LIVE EVENTS ====================

  /**
   * Get live events/updates
   */
  async listLive(): Promise<LiveEvent[]> {
    const response = await this.client.get('/api/v1/events/live');
    return response.data?.events || response.data || [];
  }

  /**
   * Post a live event (admin only)
   */
  async postLive(event: Partial<LiveEvent>): Promise<LiveEvent> {
    const response = await this.client.post('/api/v1/events/live', event);
    return response.data?.event || response.data;
  }

  // ==================== PUSH NOTIFICATIONS ====================

  /**
   * Register push notification token
   */
  async registerPush(token: PushToken): Promise<void> {
    await this.client.post('/api/v1/push/register', token);
  }

  /**
   * Send push notification (admin only)
   */
  async sendPush(title: string, body: string, data?: any): Promise<void> {
    await this.client.post('/api/v1/push/send', { title, body, data });
  }

  /**
   * Unregister push notification token
   */
  async unregisterPush(token: string): Promise<void> {
    await this.client.post('/api/v1/push/unregister', { token });
  }

  /**
   * Get push notification history
   */
  async getPushHistory(): Promise<any[]> {
    const response = await this.client.get('/api/v1/push/history');
    return response.data?.history || response.data || [];
  }

  // ==================== USAGE ====================

  /**
   * Get usage statistics
   */
  async getUsage(): Promise<UsageStats> {
    const response = await this.client.get('/api/v1/usage');
    return response.data?.usage || response.data;
  }

  /**
   * Check if Make.com automation is allowed
   */
  async canUseMake(): Promise<boolean> {
    const response = await this.client.get('/api/v1/usage/make/allowed');
    return response.data?.allowed || false;
  }

  /**
   * Increment Make.com usage counter
   */
  async incrementMake(): Promise<void> {
    await this.client.post('/api/v1/usage/make/increment');
  }

  // ==================== TENANT CONFIG ====================

  /**
   * Get tenant configuration
   */
  async getTenantConfig(): Promise<TenantConfig> {
    const response = await this.client.get('/api/v1/tenant/config');
    return response.data?.config || response.data;
  }
}

/**
 * Create SDK instance
 */
export function createSDK(config: TeamPlatformSDKConfig): TeamPlatformSDK {
  return new TeamPlatformSDK(config);
}

export default TeamPlatformSDK;
