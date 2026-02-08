import { API_BASE_URL, getAuthToken } from './api';

/**
 * Mobile-specific API functions for photo uploads and notifications
 */

export const mobileApi = {
    /**
     * Upload player photo
     */
    uploadPlayerPhoto: async (playerId: string, photoUri: string) => {
        const token = await getAuthToken();

        // Create form data
        const formData = new FormData();
        const response = await fetch(photoUri);
        const blob = await response.blob();

        formData.append('photo', blob as any);
        formData.append('playerId', playerId);

        const uploadResponse = await fetch(`${API_BASE_URL}/players/${playerId}/photo`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        if (!uploadResponse.ok) {
            throw new Error('Failed to upload photo');
        }

        return await uploadResponse.json();
    },

    /**
     * Delete player photo
     */
    deletePlayerPhoto: async (playerId: string) => {
        const token = await getAuthToken();

        const response = await fetch(`${API_BASE_URL}/players/${playerId}/photo`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to delete photo');
        }

        return await response.json();
    },

    /**
     * Register device for push notifications
     */
    registerPushToken: async (token: string, platform: 'ios' | 'android') => {
        const authToken = await getAuthToken();

        const response = await fetch(`${API_BASE_URL}/push/register`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token,
                platform,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to register push token');
        }

        return await response.json();
    },

    /**
     * Schedule match reminder notification
     */
    scheduleMatchReminder: async (fixtureId: string, matchTitle: string, kickoffTime: string) => {
        const token = await getAuthToken();

        const response = await fetch(`${API_BASE_URL}/mobile/notifications/match-reminder`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fixtureId,
                matchTitle,
                kickoffTime,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to schedule match reminder');
        }

        return await response.json();
    },

    /**
     * Schedule MOTM voting notification
     */
    scheduleMOTMVoting: async (fixtureId: string, matchTitle: string) => {
        const token = await getAuthToken();

        const response = await fetch(`${API_BASE_URL}/mobile/notifications/motm-voting`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fixtureId,
                matchTitle,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to schedule MOTM voting');
        }

        return await response.json();
    },
};
