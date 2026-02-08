import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Offline storage utilities for caching data
 */

export const storage = {
    /**
     * Save data to cache
     */
    set: async (key: string, value: any) => {
        try {
            const jsonValue = JSON.stringify(value);
            await AsyncStorage.setItem(key, jsonValue);
        } catch (error) {
            console.error('Storage set error:', error);
        }
    },

    /**
     * Get data from cache
     */
    get: async (key: string) => {
        try {
            const jsonValue = await AsyncStorage.getItem(key);
            return jsonValue != null ? JSON.parse(jsonValue) : null;
        } catch (error) {
            console.error('Storage get error:', error);
            return null;
        }
    },

    /**
     * Remove data from cache
     */
    remove: async (key: string) => {
        try {
            await AsyncStorage.removeItem(key);
        } catch (error) {
            console.error('Storage remove error:', error);
        }
    },

    /**
     * Clear all cached data
     */
    clear: async () => {
        try {
            await AsyncStorage.clear();
        } catch (error) {
            console.error('Storage clear error:', error);
        }
    },
};

// Cache keys
export const CACHE_KEYS = {
    FIXTURES: 'cache_fixtures',
    SQUAD: 'cache_squad',
    NEWS: 'cache_news',
    LEAGUE_TABLE: 'cache_league_table',
    LAST_SYNC: 'cache_last_sync',
};

/**
 * Cache with expiry
 */
export const cacheWithExpiry = {
    set: async (key: string, value: any, expiryMinutes: number = 60) => {
        const item = {
            value,
            expiry: Date.now() + expiryMinutes * 60 * 1000,
        };
        await storage.set(key, item);
    },

    get: async (key: string) => {
        const item = await storage.get(key);
        if (!item) return null;

        if (Date.now() > item.expiry) {
            await storage.remove(key);
            return null;
        }

        return item.value;
    },
};
