/**
 * Fixtures API Service
 * Handles communication with backend fixtures endpoints
 */

import axios, { AxiosError } from 'axios';
import apiClient from './api';
import { HTTP_TIMEOUT, TENANT_ID } from '../config';

const API_VERSION = 'v1';

export class FixturesApiError extends Error {
  status?: number;

  constructor(message: string, status?: number, cause?: unknown) {
    super(message);
    this.name = 'FixturesApiError';
    this.status = status;
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

export interface Fixture {
  id: number;
  date: string;
  opponent: string;
  venue: string;
  competition: string;
  kickOffTime: string;
  status: string;
  source?: string;
  location?: string;
  teamName?: string;
  teamShortName?: string;
  homeTeamName?: string;
  awayTeamName?: string;
  homeScoreLabel?: string;
  awayScoreLabel?: string;
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
  teamName?: string;
  teamShortName?: string;
  homeTeamName?: string;
  awayTeamName?: string;
  homeScoreLabel?: string;
  awayScoreLabel?: string;
}

export interface FixtureQueryOptions {
  status?: string;
  limit?: number;
  from?: string;
  to?: string;
  teamId?: string;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: Record<string, unknown>;
  data?: unknown;
}

const withTenant = (payload?: unknown) => {
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
    return payload;
  }

  if ('tenant' in (payload as Record<string, unknown>)) {
    return payload;
  }

  return { tenant: TENANT_ID, ...(payload as Record<string, unknown>) };
};

const normalisePath = (path: string) => path.replace(/^\/+/, '');

const extractData = <T>(payload: any): T => {
  if (!payload) {
    throw new FixturesApiError('Empty response from fixtures service');
  }

  if (typeof payload.success === 'boolean') {
    if (!payload.success) {
      const errorPayload = payload.error ?? {};
      const message =
        typeof errorPayload === 'string'
          ? errorPayload
          : errorPayload?.message ?? 'Fixtures service returned an error';
      throw new FixturesApiError(message);
    }
    if (payload.data !== undefined) {
      return payload.data as T;
    }
  }

  if (payload.data !== undefined) {
    return payload.data as T;
  }

  return payload as T;
};

const mapAxiosError = (error: AxiosError): never => {
  const status = error.response?.status;
  const message =
    typeof error.response?.data === 'string'
      ? error.response?.data
      : (error.response?.data as any)?.error?.message ||
        (error.response?.data as any)?.error ||
        (error.response?.data as any)?.message ||
        error.message ||
        'Fixtures request failed';
  throw new FixturesApiError(message, status, error);
};

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  try {
    const response = await apiClient.request({
      url: `/api/${API_VERSION}/${normalisePath(path)}`,
      method: options.method ?? 'GET',
      params: { tenant: TENANT_ID, ...(options.params ?? {}) },
      data: withTenant(options.data),
      timeout: HTTP_TIMEOUT,
    });

    return extractData<T>(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      mapAxiosError(error);
    }

    if (error instanceof FixturesApiError) {
      throw error;
    }

    throw new FixturesApiError(
      error instanceof Error ? error.message : 'Unknown fixtures error',
      undefined,
      error
    );
  }
};

const ensureArray = <T>(value: unknown, label: string): T[] => {
  if (Array.isArray(value)) {
    return value as T[];
  }

  throw new FixturesApiError(`Unexpected ${label} response shape`);
};

/**
 * Get upcoming fixtures from backend
 */
export async function getUpcomingFixtures(options: FixtureQueryOptions = {}): Promise<Fixture[]> {
  const data = await request<unknown>('fixtures/upcoming', { params: options });
  return ensureArray<Fixture>(data, 'upcoming fixtures');
}

/**
 * Get all fixtures from backend
 */
export async function getAllFixtures(options: FixtureQueryOptions = {}): Promise<Fixture[]> {
  const data = await request<unknown>('fixtures/all', { params: options });
  return ensureArray<Fixture>(data, 'fixtures');
}

/**
 * Get recent match results from backend
 * @param limit - Max number of results to return (default: 10)
 */
export async function getRecentResults(limit: number = 10): Promise<Result[]> {
  const data = await request<unknown>('fixtures/results', {
    params: { limit },
  });
  return ensureArray<Result>(data, 'results');
}

/**
 * Add a match result to backend
 */
export async function addResult(result: Omit<Result, 'id'>): Promise<boolean> {
  await request('fixtures/results', {
    method: 'POST',
    data: { ...result },
  });
  return true;
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
