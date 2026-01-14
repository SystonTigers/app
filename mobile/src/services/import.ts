import { apiClient } from './api';

/**
 * Import API Service
 * Handles CSV bulk imports for various data types
 */

export interface ImportResult {
    success: boolean;
    imported?: number;
    total?: number;
    errors?: string[];
    error?: string;
}

export interface ImportCounts {
    players: number;
    fixtures: number;
    matches: number;
    match_events: number;
}

/**
 * Get seasons list
 */
export async function getSeasons(): Promise<any[]> {
    try {
        const response = await apiClient.get('/api/v1/seasons');
        if (response.data.success) {
            return response.data.data || [];
        }
        return [];
    } catch (error) {
        console.error('Failed to get seasons:', error);
        return [];
    }
}

/**
 * Import players from CSV
 */
export async function importPlayers(csvContent: string, seasonId?: string): Promise<ImportResult> {
    const url = seasonId ? `/api/v1/import/players?seasonId=${seasonId}` : '/api/v1/import/players';
    const response = await apiClient.post(url, csvContent, {
        headers: { 'Content-Type': 'text/csv' },
    });
    return response.data;
}

/**
 * Import fixtures from CSV
 */
export async function importFixtures(csvContent: string, seasonId?: string): Promise<ImportResult> {
    const url = seasonId ? `/api/v1/import/fixtures?seasonId=${seasonId}` : '/api/v1/import/fixtures';
    const response = await apiClient.post(url, csvContent, {
        headers: { 'Content-Type': 'text/csv' },
    });
    return response.data;
}

/**
 * Import results from CSV
 */
export async function importResults(csvContent: string, seasonId?: string): Promise<ImportResult> {
    const url = seasonId ? `/api/v1/import/results?seasonId=${seasonId}` : '/api/v1/import/results';
    const response = await apiClient.post(url, csvContent, {
        headers: { 'Content-Type': 'text/csv' },
    });
    return response.data;
}

/**
 * Import match events from CSV
 */
export async function importMatchEvents(csvContent: string, seasonId?: string): Promise<ImportResult> {
    const url = seasonId ? `/api/v1/import/match-events?seasonId=${seasonId}` : '/api/v1/import/match-events';
    const response = await apiClient.post(url, csvContent, {
        headers: { 'Content-Type': 'text/csv' },
    });
    return response.data;
}

/**
 * Get current import status/counts
 */
export async function getImportStatus(): Promise<ImportCounts | null> {
    try {
        const response = await apiClient.get('/api/v1/import/status');
        if (response.data.success) {
            return response.data.counts;
        }
        return null;
    } catch (error) {
        console.error('Failed to get import status:', error);
        return null;
    }
}

/**
 * Get template download URL
 */
export function getTemplateUrl(type: string): string {
    return `${apiClient.defaults.baseURL}/api/v1/import/template/${type}`;
}
