/**
 * Fixtures API Service
 * Handles communication with backend fixtures endpoints
 */

// TODO: Update this with your actual backend URL
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-backend.workers.dev';
const API_VERSION = 'v1';

export interface Fixture {
  id: number;
  date: string;
  opponent: string;
  venue: string;
  competition: string;
  kickOffTime: string;
  status: string;
  source?: string;
}

export interface Result {
  id: number;
  date: string;
  opponent: string;
  homeScore: number;
  awayScore: number;
  venue: string;
  competition: string;
  scorers?: string;
}

/**
 * Get upcoming fixtures from backend
 */
export async function getUpcomingFixtures(): Promise<Fixture[]> {
  try {
    const response = await fetch(`${API_URL}/api/${API_VERSION}/fixtures/upcoming`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }

    return [];
  } catch (error) {
    console.error('Failed to fetch upcoming fixtures:', error);
    return [];
  }
}

/**
 * Get all fixtures from backend
 * @param options.status - Filter by status (scheduled, postponed, completed)
 * @param options.limit - Max number of fixtures to return
 */
export async function getAllFixtures(options?: {
  status?: string;
  limit?: number;
}): Promise<Fixture[]> {
  try {
    const params = new URLSearchParams();

    if (options?.status) {
      params.append('status', options.status);
    }

    if (options?.limit) {
      params.append('limit', options.limit.toString());
    }

    const url = `${API_URL}/api/${API_VERSION}/fixtures/all${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }

    return [];
  } catch (error) {
    console.error('Failed to fetch all fixtures:', error);
    return [];
  }
}

/**
 * Get recent match results from backend
 * @param limit - Max number of results to return (default: 10)
 */
export async function getRecentResults(limit: number = 10): Promise<Result[]> {
  try {
    const url = `${API_URL}/api/${API_VERSION}/fixtures/results?limit=${limit}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }

    return [];
  } catch (error) {
    console.error('Failed to fetch recent results:', error);
    return [];
  }
}

/**
 * Add a match result to backend
 */
export async function addResult(result: Omit<Result, 'id'>): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/${API_VERSION}/fixtures/results`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(result),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Failed to add result:', error);
    return false;
  }
}

/**
 * Format date string for display
 */
export function formatFixtureDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format time string for display
 */
export function formatKickOffTime(timeStr: string): string {
  if (!timeStr) return 'TBC';

  // Handle various time formats
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    return timeStr;
  }

  return timeStr;
}

/**
 * Get status badge color
 */
export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'scheduled':
      return '#22c55e'; // green
    case 'postponed':
      return '#ef4444'; // red
    case 'completed':
      return '#3b82f6'; // blue
    default:
      return '#6b7280'; // gray
  }
}

/**
 * Format result score for display
 */
export function formatScore(homeScore: number, awayScore: number, venue: string): string {
  if (venue.toLowerCase() === 'home') {
    return `${homeScore} - ${awayScore}`;
  } else {
    return `${awayScore} - ${homeScore}`;
  }
}

/**
 * Determine if match was won, lost, or drawn
 */
export function getResultStatus(
  homeScore: number,
  awayScore: number,
  venue: string
): 'won' | 'lost' | 'drawn' {
  const ourScore = venue.toLowerCase() === 'home' ? homeScore : awayScore;
  const theirScore = venue.toLowerCase() === 'home' ? awayScore : homeScore;

  if (ourScore > theirScore) return 'won';
  if (ourScore < theirScore) return 'lost';
  return 'drawn';
}
