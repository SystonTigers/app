// src/lib/sdk.ts
import { API_BASE, getSessionToken } from './session';


/** Players with at least one of `by`, highest first (ties broken by `then`, then name). */
function rankPlayers(squad: any[], by: 'goals' | 'assists', then: 'goals' | 'assists', limit: number): any[] {
  const n = (p: any, k: string) => Number(p?.stats?.[k]) || 0;
  return (Array.isArray(squad) ? squad : [])
    .filter((p) => p && p.name && n(p, by) > 0)
    .sort((a, b) => n(b, by) - n(a, by) || n(b, then) - n(a, then) || String(a.name).localeCompare(String(b.name)))
    .slice(0, limit);
}

export type ProvisionCheckpoint =
  | 'seedDefaultContent'
  | 'configureRouting'
  | 'validateWebhook'
  | 'deployAutomations'
  | 'sendOwnerEmails'
  | 'markReady';

export type ProvisionStatus = 'pending' | 'running' | 'failed' | 'ready';

export type ProvisionState = {
  tenantId: string;
  status: ProvisionStatus;
  step?: ProvisionCheckpoint | null;
  steps?: Record<ProvisionCheckpoint, 'pending' | 'running' | 'done' | 'failed'>;
  error?: string | null;
};

/** Bearer header for the signed-in user (browser only). */
function authHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = getSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function http<T>(url: string, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(url, {
      ...init,
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader(),
        ...(init?.headers || {})
      }
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const error = new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
      throw error;
    }
    const data = await res.json();
    // console.log('[SDK] Response data:', data);
    return data as T;
  } catch (e) {
    console.error('API fetch failed', { url, init, error: e });
    throw e;
  }
}

export async function getProvisionStatus(tenantId: string) {
  return http<ProvisionState>(
    `${API_BASE}/api/v1/tenants/${encodeURIComponent(tenantId)}/provision-status`
  );
}

export async function updateSquad(players: any[]) {
  return http<{ success: true; count: number }>(
    `${API_BASE}/api/v1/squad`,
    { method: 'POST', body: JSON.stringify(players) }
  );
}

export async function addPlayer(player: any) {
  return http<{ success: true; id: string }>(
    `${API_BASE}/api/v1/squad/add`,
    { method: 'POST', body: JSON.stringify(player) }
  );
}

// ---- Player Transfer endpoints ----

export interface TransferCodeResult {
  transferCode: string;
  playerName: string;
  stats: {
    goals: number;
    assists: number;
    appearances: number;
    yellowCards: number;
    redCards: number;
  };
  expiresAt: string;
}

export interface TransferVerifyResult {
  valid: boolean;
  playerName: string;
  fromClub: string;
  stats: {
    goals: number;
    assists: number;
    appearances: number;
    yellowCards: number;
    redCards: number;
  };
  expiresAt: string;
}

export interface CareerStatsResult {
  playerId: string;
  playerName: string;
  hasCareerHistory: boolean;
  careerTotals: {
    goals: number;
    assists: number;
    appearances: number;
    yellowCards: number;
    redCards: number;
    clubs: number;
  };
  clubHistory: Array<{
    club: string;
    isCurrent: boolean;
    stats: {
      goals: number;
      assists: number;
      appearances: number;
      yellowCards: number;
      redCards: number;
    };
  }>;
}

export async function generateTransferCode(playerId: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  return http<TransferCodeResult>(
    `${API_BASE}/api/v1/squad/${playerId}/generate-transfer`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
  );
}

export async function verifyTransferCode(code: string) {
  return http<TransferVerifyResult>(
    `${API_BASE}/api/v1/transfers/${code.toUpperCase()}`
  );
}

export async function claimTransfer(transferCode: string, newPlayerId: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  return http<{ success: boolean; message: string; linkedStats: { goals: number; assists: number; appearances: number } }>(
    `${API_BASE}/api/v1/squad/claim-transfer`,
    { method: 'POST', body: JSON.stringify({ transferCode, newPlayerId }), headers: { Authorization: `Bearer ${token}` } }
  );
}

export async function getPlayerCareerStats(playerId: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  return http<CareerStatsResult>(
    `${API_BASE}/api/v1/squad/${playerId}/career-stats`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export async function createFixture(data: any) {
  return http<{ success: true; id: string }>(
    `${API_BASE}/api/v1/fixtures`,
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export async function deleteFixture(id: string) {
  return http<{ success: true }>(
    `${API_BASE}/api/v1/fixtures/${id}`,
    { method: 'DELETE' }
  );
}

export async function createResult(data: any) {
  return http<{ success: true; id: string }>(
    `${API_BASE}/api/v1/results`,
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export async function deleteResult(id: string) {
  return http<{ success: true }>(
    `${API_BASE}/api/v1/results/${id}`,
    { method: 'DELETE' }
  );
}

export async function createPost(data: any) {
  return http<{ success: true; id: string }>(
    `${API_BASE}/api/v1/feed`,
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export async function deletePost(id: string) {
  return http<{ success: true }>(
    `${API_BASE}/api/v1/feed/${id}`,
    { method: 'DELETE' }
  );
}

export async function updateTable(rows: any[]) {
  return http<{ success: true }>(
    `${API_BASE}/api/v1/table`,
    { method: 'POST', body: JSON.stringify(rows) }
  );
}

export async function listEvents() {
  return http<any[]>(
    `${API_BASE}/api/v1/events`,
    { method: 'GET' }
  );
}

export async function createEvent(data: any) {
  return http<{ success: true; data: { event: any } }>(
    `${API_BASE}/api/v1/events`,
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export async function deleteEvent(id: string) {
  return http<{ success: true }>(
    `${API_BASE}/api/v1/events/${id}`,
    { method: 'DELETE' }
  );
}

// ---- Compatibility shims for legacy imports ----
export type AnySDK = {
  // real endpoints
  getProvisionStatus: (tenantId: string) => Promise<ProvisionState>;

  // UI-only placeholders so pages compile & render empty states
  getBrand: () => Promise<Record<string, unknown>>;
  getBrandKit: () => Promise<Record<string, unknown>>;
  getFeed: () => Promise<Array<Record<string, unknown>>>;
  getFixtures: () => Promise<Array<Record<string, unknown>>>;
  getNextFixture: () => Promise<Record<string, unknown> | null>;
  getResults: () => Promise<Array<Record<string, unknown>>>;
  getTable: () => Promise<Array<Record<string, unknown>>>;
  getSquad: () => Promise<Array<Record<string, unknown>>>;
  getStats: () => Promise<Record<string, unknown>>;
  getLeagueTable: () => Promise<Array<Record<string, unknown>>>;
  getTopScorers: (limit?: number) => Promise<Array<Record<string, unknown>>>;
  getTopAssists: (limit?: number) => Promise<Array<Record<string, unknown>>>;
  getTeamStats: () => Promise<Record<string, unknown> | null>;
  listFixtures: () => Promise<Array<Record<string, unknown>>>;
  listFeed: (page: number, limit: number) => Promise<Array<Record<string, unknown>>>;
  listResults: () => Promise<Array<Record<string, unknown>>>;
  listLiveUpdates: (fixtureId: string) => Promise<Array<Record<string, unknown>>>;
  getPlayer: (id: string) => Promise<Record<string, unknown> | null>;

  // Shop
  getShopProducts: () => Promise<Array<Record<string, unknown>>>;
  createCart: () => Promise<{ success: boolean; cart: any }>;
  getCart: (cartId: string) => Promise<{ success: boolean; cart: any }>;
  addToCart: (cartId: string, variantId: string, quantity: number, personalization?: any) => Promise<{ success: boolean; cart: any }>;
  removeFromCart: (cartId: string, variantId: string) => Promise<{ success: boolean; cart: any }>;
  createCheckoutSession: (cartId: string, email: string) => Promise<{ success: boolean; sessionId: string; url: string }>;
  confirmShopOrder: (orderId: string, sessionId: string) => Promise<{ success: boolean; order: any }>;
  saveMatchReport: (fixtureId: string, report: any) => Promise<{ success: boolean }>;
  getMatchReport: (fixtureId: string) => Promise<{ success: boolean; events: any[] }>;
  resignTeam: (teamName: string) => Promise<{ success: boolean }>;
  autoImportFixtures: () => Promise<{ success: boolean; imported?: number; message?: string }>;
  autoCalculateTable: () => Promise<{ success: boolean; teams?: number; message?: string }>;
  // GOTM Voting
  startGOTMVoting: (month: string, year: number, goals: any[]) => Promise<{ success: boolean; votingId?: string }>;
  getGOTMVoting: (votingId?: string) => Promise<{ success: boolean; voting: any; candidates: any[] }>;
  castGOTMVote: (votingId: string, candidateId: string) => Promise<{ success: boolean }>;
  closeGOTMVoting: (votingId: string) => Promise<{ success: boolean; winner?: any }>;
  // LMS Game
  getLMSGames: (status?: 'active' | 'completed') => Promise<any[]>;
  getLMSGame: (gameId: string) => Promise<any>;
  joinLMSGame: (gameId: string) => Promise<any>;
  createLMSGame: (params: { name: string; sport?: string; competition?: string }) => Promise<any>;
  createLMSRound: (gameId: string, params: { name?: string; deadline?: number; fixtures: any[] }) => Promise<any>;
  processLMSRound: (roundId: string, fixtures: any[]) => Promise<any>;
  resetLMSGame: (gameId: string) => Promise<any>;
  submitLMSPrediction: (roundId: string, teamPicked: string, fixtureId?: string) => Promise<any>;
};

// One shared instance; hook these up to real calls later as needed
const compat: AnySDK = {
  getProvisionStatus,

  // temporary no-op implementations (return empty data so UI shows empty state)
  getBrand: async () => ({}),
  getBrandKit: async () => ({}),
  getFeed: async () => [],
  getFixtures: async () => [],
  getNextFixture: async () => null,
  getResults: async () => [],
  getTable: async () => [],
  getSquad: async () => [],
  getStats: async () => ({}),
  getLeagueTable: async () => [],
  getTopScorers: async () => [],
  getTopAssists: async () => [],
  getTeamStats: async () => null,
  listFixtures: async () => [],
  listFeed: async () => [],
  listResults: async () => [],
  listLiveUpdates: async () => [],
  getPlayer: async () => null,

  // Shop mocks
  getShopProducts: async () => [],
  createCart: async () => ({ success: true, cart: { items: [] } }),
  getCart: async () => ({ success: true, cart: { items: [] } }),
  addToCart: async () => ({ success: true, cart: { items: [] } }),
  removeFromCart: async () => ({ success: true, cart: { items: [] } }),
  createCheckoutSession: async () => ({ success: true, sessionId: 'mock', url: '#' }),
  confirmShopOrder: async () => ({ success: true, order: {} }),
  saveMatchReport: async () => ({ success: true }),
  getMatchReport: async () => ({ success: true, events: [] }),
  resignTeam: async () => ({ success: true }),
  autoImportFixtures: async () => ({ success: true, imported: 0, message: 'Mock' }),
  autoCalculateTable: async () => ({ success: true, teams: 0, message: 'Mock' }),
  // GOTM mocks
  startGOTMVoting: async () => ({ success: true, votingId: 'mock' }),
  getGOTMVoting: async () => ({ success: true, voting: null, candidates: [] }),
  castGOTMVote: async () => ({ success: true }),
  closeGOTMVoting: async () => ({ success: true, winner: null }),
  // LMS mocks
  getLMSGames: async () => [],
  getLMSGame: async () => ({ success: true, game: null, standings: [], currentRound: null }),
  joinLMSGame: async () => ({ success: true }),
  createLMSGame: async () => ({ success: true }),
  createLMSRound: async () => ({ success: true }),
  processLMSRound: async () => ({ success: true, summary: { eliminated: 0, survived: 0 } }),
  resetLMSGame: async () => ({ success: true }),
  submitLMSPrediction: async () => ({ success: true }),
};

// Client SDK implementation
/** The backend wraps responses as { success, data }; public pages want the data. */
async function publicGet<T>(url: string): Promise<T> {
  const body = await http<any>(url);
  return (body && typeof body === 'object' && !Array.isArray(body) && 'data' in body ? body.data : body) as T;
}

class ClientSDK implements AnySDK {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  // Real implementations
  async listFixtures() {
    return publicGet<any[]>(`${API_BASE}/public/${this.tenantId}/fixtures`);
  }

  async listResults() {
    return publicGet<any[]>(`${API_BASE}/public/${this.tenantId}/fixtures?status=results`);
  }

  async listFeed(page = 1, limit = 10) {
    return publicGet<any[]>(`${API_BASE}/public/${this.tenantId}/feed?page=${page}&limit=${limit}`);
  }

  async getLeagueTable() {
    return publicGet<any[]>(`${API_BASE}/public/${this.tenantId}/table`);
  }

  async getTeamStats() {
    return publicGet<any>(`${API_BASE}/public/${this.tenantId}/stats`);
  }

  /** Players ranked by goals (then assists), from the public squad list with its stats. */
  async getTopScorers(limit = 10) {
    return rankPlayers(await this.getSquad(), 'goals', 'assists', limit);
  }

  /** Players ranked by assists (then goals). */
  async getTopAssists(limit = 10) {
    return rankPlayers(await this.getSquad(), 'assists', 'goals', limit);
  }

  async getSquad() {
    return publicGet<any[]>(`${API_BASE}/public/${this.tenantId}/squad`);
  }

  async getPlayer(id: string) {
    const squad = await this.getSquad();
    return squad.find(p => p.id === id) || null;
  }

  // Shop
  async getShopProducts() {
    return http<any[]>(`${API_BASE}/api/v1/shop/products?tenant=${this.tenantId}`);
  }

  async createCart() {
    return http<{ success: true; cart: any }>(
      `${API_BASE}/api/v1/shop/cart`,
      { method: 'POST', body: JSON.stringify({ tenantId: this.tenantId }) }
    );
  }

  async getCart(cartId: string) {
    return http<{ success: true; cart: any }>(
      `${API_BASE}/api/v1/shop/cart/${cartId}`
    );
  }

  async addToCart(cartId: string, variantId: string, quantity: number, personalization?: any) {
    return http<{ success: true; cart: any }>(
      `${API_BASE}/api/v1/shop/cart/${cartId}/items`,
      { method: 'POST', body: JSON.stringify({ variantId, quantity, personalization }) }
    );
  }

  async removeFromCart(cartId: string, variantId: string) {
    return http<{ success: true; cart: any }>(
      `${API_BASE}/api/v1/shop/cart/${cartId}/items`,
      { method: 'DELETE', body: JSON.stringify({ variantId }) }
    );
  }

  async createCheckoutSession(cartId: string, email: string) {
    return http<{ success: true; sessionId: string; url: string }>(
      `${API_BASE}/api/v1/shop/checkout`,
      { method: 'POST', body: JSON.stringify({ cartId, customerEmail: email }) }
    );
  }

  async confirmShopOrder(orderId: string, sessionId: string) {
    return http<{ success: true; order: any }>(
      `${API_BASE}/api/v1/shop/orders/${orderId}/confirm`,
      { method: 'POST', body: JSON.stringify({ sessionId }) }
    );
  }

  // Match Reports
  async saveMatchReport(fixtureId: string, report: any) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    return http<{ success: boolean }>(
      `${API_BASE}/api/v1/matches/${fixtureId}/report`,
      { method: 'POST', body: JSON.stringify(report), headers: { Authorization: `Bearer ${token}` } }
    );
  }

  async getMatchReport(fixtureId: string) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    return http<{ success: boolean; events: any[] }>(
      `${API_BASE}/api/v1/matches/${fixtureId}/report`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  }

  async resignTeam(teamName: string) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    return http<{ success: boolean }>(
      `${API_BASE}/api/v1/table/resign`,
      { method: 'POST', body: JSON.stringify({ teamName }), headers: { Authorization: `Bearer ${token}` } }
    );
  }

  async autoImportFixtures() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    return http<{ success: boolean; imported?: number; message?: string }>(
      `${API_BASE}/api/v1/fixtures/auto-import`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
    );
  }

  async autoCalculateTable() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    return http<{ success: boolean; teams?: number; message?: string }>(
      `${API_BASE}/api/v1/table/auto-calculate`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
    );
  }

  // GOTM Voting
  async startGOTMVoting(month: string, year: number, goals: any[]) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    return http<{ success: boolean; votingId?: string }>(
      `${API_BASE}/api/v1/gotm/start`,
      { method: 'POST', body: JSON.stringify({ month, year, goals }), headers: { Authorization: `Bearer ${token}` } }
    );
  }

  async getGOTMVoting(votingId?: string) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    const url = votingId ? `${API_BASE}/api/v1/gotm?votingId=${votingId}` : `${API_BASE}/api/v1/gotm`;
    return http<{ success: boolean; voting: any; candidates: any[] }>(
      url,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  }

  async castGOTMVote(votingId: string, candidateId: string) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    return http<{ success: boolean }>(
      `${API_BASE}/api/v1/gotm/vote`,
      { method: 'POST', body: JSON.stringify({ votingId, candidateId }), headers: { Authorization: `Bearer ${token}` } }
    );
  }

  async closeGOTMVoting(votingId: string) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    return http<{ success: boolean; winner?: any }>(
      `${API_BASE}/api/v1/gotm/close`,
      { method: 'POST', body: JSON.stringify({ votingId }), headers: { Authorization: `Bearer ${token}` } }
    );
  }

  // LMS Game
  async getLMSGames(status?: 'active' | 'completed') {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    // An empty status means "all games" to the backend, which answers { success, games }.
    const res = await http<{ success: boolean; games?: any[] }>(
      `${API_BASE}/api/v1/lms/games?status=${status ?? ''}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return Array.isArray(res.games) ? res.games : [];
  }

  async getLMSGame(gameId: string) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    return http<any>(
      `${API_BASE}/api/v1/lms/games/${gameId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  }

  async joinLMSGame(gameId: string) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    return http<any>(
      `${API_BASE}/api/v1/lms/games/${gameId}/join`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
    );
  }

  async createLMSGame(params: { name: string; sport?: string; competition?: string }) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    return http<any>(
      `${API_BASE}/api/v1/lms/games`,
      { method: 'POST', body: JSON.stringify(params), headers: { Authorization: `Bearer ${token}` } }
    );
  }

  async createLMSRound(gameId: string, params: { name?: string; deadline?: number; fixtures: any[] }) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    return http<any>(
      `${API_BASE}/api/v1/lms/rounds`,
      { method: 'POST', body: JSON.stringify({ game_id: gameId, ...params }), headers: { Authorization: `Bearer ${token}` } }
    );
  }

  async processLMSRound(roundId: string, fixtures: any[]) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    return http<any>(
      `${API_BASE}/api/v1/lms/rounds/${roundId}/process`,
      { method: 'POST', body: JSON.stringify({ fixtures }), headers: { Authorization: `Bearer ${token}` } }
    );
  }

  async resetLMSGame(gameId: string) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    return http<any>(
      `${API_BASE}/api/v1/lms/games/${gameId}/reset`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
    );
  }

  async submitLMSPrediction(roundId: string, teamPicked: string, fixtureId?: string) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    return http<any>(
      `${API_BASE}/api/v1/lms/predictions`,
      { method: 'POST', body: JSON.stringify({ round_id: roundId, team_picked: teamPicked, fixture_id: fixtureId }), headers: { Authorization: `Bearer ${token}` } }
    );
  }

  // Fallback to compat/mocks for others
  getProvisionStatus = compat.getProvisionStatus;
  getBrand = compat.getBrand;
  getBrandKit = compat.getBrandKit;
  getFeed = this.listFeed; // Alias
  getFixtures = this.listFixtures; // Alias
  getNextFixture = async () =>
    publicGet<Record<string, unknown> | null>(`${API_BASE}/public/${this.tenantId}/fixtures/next`);
  getResults = this.listResults; // Alias
  getTable = this.getLeagueTable; // Alias
  getStats = this.getTeamStats; // Alias
  listLiveUpdates = compat.listLiveUpdates;
}

export function createClientSDK(tenant?: string): AnySDK {
  if (!tenant) return compat;
  return new ClientSDK(tenant);
}

export function getServerSDK(tenant?: string): AnySDK {
  if (!tenant) return compat;
  return new ClientSDK(tenant);
}
