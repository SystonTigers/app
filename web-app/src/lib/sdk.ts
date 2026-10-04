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

/** Bearer header for the signed-in user (browser only). */
function authHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = getSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Older calls pass `Authorization: Bearer <localStorage token>`, which is
 * "Bearer null" when the session is kept under another key; drop that so the
 * real session token (authHeader) is used.
 */
function mergeHeaders(extra: HeadersInit | undefined): Headers {
  const headers = new Headers({ 'Content-Type': 'application/json', ...authHeader() });
  new Headers(extra).forEach((value, key) => {
    if (key === 'authorization' && /^Bearer\s*(null|undefined)?$/i.test(value.trim())) return;
    headers.set(key, value);
  });
  return headers;
}

async function http<T>(url: string, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(url, {
      ...init,
      credentials: 'include',
      cache: 'no-store',
      headers: mergeHeaders(init?.headers)
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

/** The backend wraps responses as { success, data }; public pages want the data. */
async function publicGet<T>(url: string): Promise<T> {
  const body = await http<any>(url);
  return (body && typeof body === 'object' && !Array.isArray(body) && 'data' in body ? body.data : body) as T;
}

/** The club's API calls used by the website's pages (public reads, shop, match reports, GOTM, Predictions). */
export class ClientSDK {
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
}

export function createClientSDK(tenant: string): ClientSDK {
  return new ClientSDK(tenant);
}

/** Same calls from a server component (public reads only). */
export function getServerSDK(tenant: string): ClientSDK {
  return new ClientSDK(tenant);
}
